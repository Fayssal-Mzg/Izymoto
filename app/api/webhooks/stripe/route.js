import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe-server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin-server";
import {
  creditWallet,
  buildRechargeDescription,
  getTierOrThrow,
  refundWalletForBooking,
} from "@/lib/wallet/server";
import { creditCompanyWallet } from "@/lib/wallet/companyServer";
import { sendReviewRequestEmail } from "@/lib/emails/reviewRequestEmail";
import { recordAuthorizedHold } from "@/lib/payments/deferredHold";
import { refreshRidePoolSafe } from "@/lib/rides/pool";
import { notifyRidesAvailable } from "@/lib/push/events";

// Webhook Stripe — source unique de vérité pour les transitions de statut.
// Côtés client/admin appellent les endpoints (capture/cancel/increment) puis
// Stripe nous renvoie ici l'événement officiel ; on met à jour Firestore.
//
// Évents traités :
// Bookings (capture manuelle) :
// - payment_intent.amount_capturable_updated : autorisation prête (post-3DS),
//   on passe la résa en "authorized" (= hold actif, pas encore débité).
// - payment_intent.succeeded : capture réussie → "captured" (= argent reçu).
// - payment_intent.canceled : hold libéré → "released". Pour les bookings
//   hybrid (wallet+CB), on refund la part wallet (idempotent via event.id).
// - payment_intent.payment_failed : auth refusée → "failed". Idem refund wallet
//   si hybrid.
//
// Wallet (capture immédiate, Checkout Session) :
// - checkout.session.completed (mode=payment, metadata.intent=wallet_recharge) :
//   crédit du wallet + écriture dans le ledger walletTransactions, idempotent
//   via l'event.id Stripe.

export const dynamic = "force-dynamic"; // pas de cache, c'est un endpoint POST

// Next.js App Router : on lit le body brut pour la vérif de signature.
async function readRawBody(req) {
  const reader = req.body.getReader();
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

const findBookingsByPaymentIntent = async (paymentIntentId) => {
  const snap = await getAdminFirestore()
    .collection("bookings")
    .where("paymentId", "==", paymentIntentId)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

const updateBookingByPaymentIntent = async (paymentIntentId, fields) => {
  const bookings = await findBookingsByPaymentIntent(paymentIntentId);
  if (bookings.length === 0) {
    console.warn(`[stripe-webhook] aucune réservation trouvée pour paymentId=${paymentIntentId}`);
    return [];
  }
  await Promise.all(
    bookings.map((b) =>
      getAdminFirestore().collection("bookings").doc(b.id).update({
        ...fields,
        paymentUpdatedAt: Timestamp.now(),
      })
    )
  );
  // lot 2.1 : une course capturée, annulée ou en échec quitte le pool des chauffeurs.
  await refreshRidePoolSafe(...bookings.map((b) => b.id));
  return bookings;
};

// Demande d'avis Google envoyée après capture réussie. Idempotent via le flag
// reviewRequestEmailSentAt posé sur le booking : si Stripe redélivre
// payment_intent.succeeded, on skip. Tout échec est loggué sans casser le
// webhook (le retour 200 reste essentiel pour ne pas que Stripe ré-essaie).
const sendReviewRequestsForBookings = async (bookings) => {
  for (const b of bookings) {
    if (b.reviewRequestEmailSentAt) continue;
    if (!b.email || typeof b.email !== "string" || !b.email.includes("@")) continue;
    try {
      await sendReviewRequestEmail({
        to: b.email,
        clientName: b.name || b.userName || b.clientName,
        bookingId: b.reservationId || b.id,
        depart: b.depart,
        arrivee: b.arrivee,
      });
      await getAdminFirestore().collection("bookings").doc(b.id).update({
        reviewRequestEmailSentAt: Timestamp.now(),
      });
    } catch (err) {
      console.error(
        `[stripe-webhook] échec envoi demande d'avis pour booking ${b.id}:`,
        err
      );
    }
  }
};

// Refund de la part wallet pour les bookings hybrid quand le PI Stripe est
// canceled ou failed. Idempotent via l'event.id Stripe.
const refundHybridBookings = async (bookings, eventId) => {
  for (const b of bookings) {
    if (b.paymentMethod !== "hybrid") continue;
    if (!b.userId || !b.walletAmountCents) continue;
    try {
      await refundWalletForBooking({
        userId: b.userId,
        amountCents: b.walletAmountCents,
        bookingId: b.id,
        refundEventId: `${b.id}:${eventId}`,
        description: `Annulation course ${b.reservationId || b.id} — remboursement part portefeuille`,
      });
    } catch (err) {
      console.error(
        `[stripe-webhook] échec refund wallet pour booking ${b.id}:`,
        err
      );
      // Ne pas throw : on a déjà mis à jour le booking, le refund peut être
      // rejoué manuellement si besoin. Logue pour suivi.
    }
  }
};

export async function POST(request) {
  const sig = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json(
      { error: "Webhook signature ou secret manquant" },
      { status: 400 }
    );
  }

  let event;
  try {
    const rawBody = await readRawBody(request);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] signature invalide:", err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  const obj = event.data.object;
  const isWalletRecharge =
    obj?.metadata?.intent === "wallet_recharge" ||
    obj?.payment_intent_data?.metadata?.intent === "wallet_recharge";

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        // Wallet uniquement : on crédite le solde côté Firestore.
        if (obj?.metadata?.intent !== "wallet_recharge") break;
        if (obj?.payment_status !== "paid") {
          console.warn(
            `[stripe-webhook] checkout.session.completed mais payment_status=${obj?.payment_status}, on attend.`
          );
          break;
        }
        const userId = obj.metadata?.userId;
        const tierId = obj.metadata?.tierId;
        const companyId = obj.metadata?.companyId;
        if (!userId || !tierId) {
          console.error(
            "[stripe-webhook] metadata wallet incomplète sur la session :",
            obj.id
          );
          break;
        }
        const tier = getTierOrThrow(tierId);
        const totalCreditCents = tier.totalCredit * 100;
        const paymentIntentId =
          typeof obj.payment_intent === "string" ? obj.payment_intent : undefined;

        // lot 2.2 : recharge payée après la suppression du compte (session ouverte
        // avant) ou pour une société fermée : on rembourse au lieu de créditer.
        {
          const db = getAdminFirestore();
          const target = companyId
            ? await db.collection("companies").doc(companyId).get()
            : await db.collection("users").doc(userId).get();
          // Profil absent, suppression en cours (pseudonyme posé et pas d'échec signalé)
          // ou société fermée.
          const gone =
            !target.exists ||
            (companyId
              ? target.data()?.status === "closed"
              : Boolean(target.data()?.deletionPseudonym) && !target.data()?.deletionFailedAt);
          if (gone) {
            console.error(`[stripe-webhook] recharge ${obj.id} pour un compte supprimé ou une société fermée : remboursement.`);
            if (paymentIntentId) {
              await stripe.refunds.create(
                { payment_intent: paymentIntentId },
                { idempotencyKey: `refund-deleted-${obj.id}` }
              );
            }
            break;
          }
        }

        // Recharge entreprise → solde société. Sinon → wallet perso.
        const result = companyId
          ? await creditCompanyWallet({
              companyId,
              amountCents: totalCreditCents,
              type: "recharge",
              description: buildRechargeDescription(tier),
              eventId: event.id,
              tierId,
              paymentIntentId,
              checkoutSessionId: obj.id,
              isRecharge: true,
            })
          : await creditWallet({
              userId,
              amountCents: totalCreditCents,
              type: "recharge",
              description: buildRechargeDescription(tier),
              tierId,
              paymentIntentId,
              checkoutSessionId: obj.id,
              stripeEventId: event.id,
              isRecharge: true,
            });
        if (!result.credited) {
          console.log(
            `[stripe-webhook] event ${event.id} déjà traité — skip idempotent.`
          );
        }
        break;
      }

      case "payment_intent.amount_capturable_updated":
        if (isWalletRecharge) break; // wallet = capture immédiate, pas de hold
        // Le hold est actif côté Stripe → la course peut désormais être
        // proposée au pool des chauffeurs (FCFS). Au stade "amount_capturable_updated"
        // la course n'a jamais pu être acceptée (booking encore en "pending"),
        // donc pas de conflit avec un éventuel statut assigned.
        // lot 0.3 : l'événement peut être redélivré / arriver après l'acceptation par
        // un chauffeur : on ne repasse en "awaiting_driver" que les réservations qui
        // n'ont pas encore avancé (jamais assigned, in_progress, completed...).
        {
          const bookings = await findBookingsByPaymentIntent(obj.id);
          if (bookings.length === 0) {
            console.warn(`[stripe-webhook] aucune réservation trouvée pour paymentId=${obj.id}`);
          }
          const NOT_YET_DISPATCHED = new Set([undefined, null, "", "pending", "confirmed", "awaiting_driver"]);
          // Un événement tardif ou rejoué ne doit pas faire revenir en arrière un paiement
          // déjà capturé, annulé, libéré, remboursé, échoué ou autrement avancé.
          // lot 1.1 : une empreinte différée confirmée par le client (après refus ou
          // authentification) passe aussi de « action_required » à « authorized ».
          const NOT_YET_AUTHORIZED = new Set([
            undefined, null, "", "pending", "authorized", "hold_in_progress", "action_required",
          ]);
          // lot 1.1 : empreinte différée — même écriture que la tâche quotidienne
          // (transaction, date limite de capture, libération si la course est annulée).
          const deferred = bookings.filter(
            (b) => b.deferredHold === true && NOT_YET_AUTHORIZED.has(b.paymentStatus)
          );
          if (deferred.length > 0) {
            const pi = await stripe.paymentIntents.retrieve(obj.id, { expand: ["latest_charge"] });
            for (const b of deferred) {
              await recordAuthorizedHold(getAdminFirestore().collection("bookings").doc(b.id), pi);
            }
          }
          await Promise.all(
            bookings
              .filter((b) => NOT_YET_AUTHORIZED.has(b.paymentStatus) && b.deferredHold !== true)
              .map((b) =>
                getAdminFirestore().collection("bookings").doc(b.id).update({
                  paymentStatus: "authorized",
                  amountAuthorized: obj.amount / 100,
                  ...(NOT_YET_DISPATCHED.has(b.status) ? { status: "awaiting_driver" } : {}),
                  paymentUpdatedAt: Timestamp.now(),
                })
              )
          );
          // lot 2.1 : la course autorisée entre dans le pool des chauffeurs.
          await refreshRidePoolSafe(...bookings.map((b) => b.id));
          await notifyRidesAvailable(...bookings.map((b) => b.id));
        }
        break;

      case "payment_intent.succeeded": {
        if (isWalletRecharge) break; // déjà géré par checkout.session.completed
        const captured = await updateBookingByPaymentIntent(obj.id, {
          paymentStatus: "captured",
          amountCaptured: obj.amount_received / 100,
          status: "completed",
        });
        await sendReviewRequestsForBookings(captured);
        break;
      }

      case "payment_intent.canceled": {
        if (isWalletRecharge) break;
        const bookings = await updateBookingByPaymentIntent(obj.id, {
          paymentStatus: "released",
          status: "cancelled",
        });
        await refundHybridBookings(bookings, event.id);
        break;
      }

      case "payment_intent.payment_failed": {
        if (isWalletRecharge) break;
        const message = obj.last_payment_error?.message || "Paiement refusé";
        // lot 1.1 : l'échec d'une empreinte différée attend la confirmation du client
        // (« action_required ») au lieu d'être définitif ; la tâche et la page de
        // confirmation ont déjà posé ce statut, l'événement ne fait que le confirmer.
        const all = await findBookingsByPaymentIntent(obj.id);
        const deferred = all.filter((b) => b.deferredHold === true);
        await Promise.all(
          deferred
            // hold_in_progress : la tâche détient le verrou et posera elle-même le statut.
            .filter((b) => b.paymentStatus === "action_required")
            .map((b) =>
              getAdminFirestore().collection("bookings").doc(b.id).update({
                paymentStatus: "action_required",
                // Jamais le motif bancaire brut : le document est lu par le chauffeur assigné.
                holdLastError: "Empreinte refusée ou confirmation demandée par la banque",
                paymentUpdatedAt: Timestamp.now(),
              })
            )
        );
        if (all.length === deferred.length) break;
        const bookings = await updateBookingByPaymentIntent(obj.id, {
          paymentStatus: "failed",
          paymentFailureMessage: message,
        });
        await refundHybridBookings(bookings, event.id);
        break;
      }

      default:
        // évent ignoré (on ne s'abonne pas à tout)
        break;
    }
  } catch (err) {
    console.error(`[stripe-webhook] erreur traitement ${event.type}:`, err);
    // On répond 500 pour que Stripe retente — l'event sera redélivré.
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
