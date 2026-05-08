import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe-server";
import { db } from "@/lib/firebaseConfig";
import { collection, query, where, getDocs, updateDoc, doc, Timestamp } from "firebase/firestore";
import {
  creditWallet,
  buildRechargeDescription,
  getTierOrThrow,
} from "@/lib/wallet/server";

// Webhook Stripe — source unique de vérité pour les transitions de statut.
// Côtés client/admin appellent les endpoints (capture/cancel/increment) puis
// Stripe nous renvoie ici l'événement officiel ; on met à jour Firestore.
//
// Évents traités :
// Bookings (capture manuelle) :
// - payment_intent.amount_capturable_updated : autorisation prête (post-3DS),
//   on passe la résa en "authorized" (= hold actif, pas encore débité).
// - payment_intent.succeeded : capture réussie → "captured" (= argent reçu).
// - payment_intent.canceled : hold libéré → "released".
// - payment_intent.payment_failed : auth refusée → "failed".
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

const updateBookingByPaymentIntent = async (paymentIntentId, fields) => {
  const q = query(
    collection(db, "bookings"),
    where("paymentId", "==", paymentIntentId)
  );
  const snap = await getDocs(q);
  if (snap.empty) {
    console.warn(`[stripe-webhook] aucune réservation trouvée pour paymentId=${paymentIntentId}`);
    return;
  }
  for (const docSnap of snap.docs) {
    await updateDoc(doc(db, "bookings", docSnap.id), {
      ...fields,
      paymentUpdatedAt: Timestamp.now(),
    });
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
        if (!userId || !tierId) {
          console.error(
            "[stripe-webhook] metadata wallet incomplète sur la session :",
            obj.id
          );
          break;
        }
        const tier = getTierOrThrow(tierId);
        const totalCreditCents = tier.totalCredit * 100;
        const result = await creditWallet({
          userId,
          amountCents: totalCreditCents,
          type: "recharge",
          description: buildRechargeDescription(tier),
          tierId,
          paymentIntentId:
            typeof obj.payment_intent === "string" ? obj.payment_intent : undefined,
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
        await updateBookingByPaymentIntent(obj.id, {
          paymentStatus: "authorized",
          amountAuthorized: obj.amount / 100,
        });
        break;

      case "payment_intent.succeeded":
        if (isWalletRecharge) break; // déjà géré par checkout.session.completed
        await updateBookingByPaymentIntent(obj.id, {
          paymentStatus: "captured",
          amountCaptured: obj.amount_received / 100,
          status: "completed",
        });
        break;

      case "payment_intent.canceled":
        if (isWalletRecharge) break;
        await updateBookingByPaymentIntent(obj.id, {
          paymentStatus: "released",
          status: "cancelled",
        });
        break;

      case "payment_intent.payment_failed":
        if (isWalletRecharge) break;
        await updateBookingByPaymentIntent(obj.id, {
          paymentStatus: "failed",
          paymentFailureMessage:
            obj.last_payment_error?.message || "Paiement refusé",
        });
        break;

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
