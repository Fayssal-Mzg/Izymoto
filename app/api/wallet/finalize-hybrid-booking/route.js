import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe-server";
import { requireAuth, AdminAuthError } from "@/lib/firebase/admin-server";
import { pickBookingFields } from "@/lib/api/identity";
import {
  quoteOrResponse,
  checkDisplayedPrice,
  priceChangedBody,
} from "@/lib/api/pricing";
import { checkReservationTiming, finalizationReferenceTime } from "@/lib/pricing";
import {
  debitWalletForHybridBooking,
  hybridLedgerExists,
  WalletError,
} from "@/lib/wallet/server";
import {
  getCompanyContextForUser,
  debitCompanyWalletForHybridBooking,
} from "@/lib/wallet/companyServer";
import {
  PAYMENT_INTENT_ID_RE,
  acquireClaim,
  abandonClaim,
  completeClaim,
  readClaim,
  rejectClaim,
} from "@/lib/payments/claims";

// Finalise un booking hybride (wallet + CB) après confirmation 3DS côté client.
// Le PaymentIntent est déjà en hold (status requires_capture). On débite le
// wallet de la part fixée et on crée le booking dans une transaction atomique.
// Si le débit échoue (solde insuffisant entre temps), on cancel le PI pour
// libérer le hold CB côté Stripe.
//
// Concurrence (lot 0.3) : un verrou `paymentClaims/<pi>` est pris AVANT tout recalcul.
// Seul son détenteur peut débiter/créer la réservation ou libérer l'empreinte (après
// avoir posé « rejected »). Une requête concurrente reçoit 409 IN_PROGRESS sans effet.
// Rejeu après succès : réponse idempotente (ledger hybrid_<pi>), sans annulation.

const conflict = (code, error) =>
  NextResponse.json({ error, code }, { status: 409 });

export async function POST(request) {
  let auth;
  try {
    auth = await requireAuth(request);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erreur d'authentification" }, { status: 500 });
  }

  let held = null; // { paymentIntentId, requestId } tant que ce verrou nous appartient
  try {
    const body = await request.json();
    // lot 0.3 : walletAmountCents / cardAmountCents du corps sont IGNORÉS. Les deux
    // parts se déduisent du PaymentIntent posé par le serveur (metadata + amount) et
    // leur somme doit être égale au total recalculé par le serveur.
    const { paymentIntentId, bookingData: rawBookingData, description } = body;
    const userId = auth.uid;

    if (
      typeof paymentIntentId !== "string" ||
      !PAYMENT_INTENT_ID_RE.test(paymentIntentId)
    ) {
      return NextResponse.json(
        { error: "paymentIntentId manquant ou invalide", code: "INVALID_PAYMENT_INTENT" },
        { status: 400 }
      );
    }
    if (!rawBookingData || typeof rawBookingData !== "object") {
      return NextResponse.json(
        { error: "bookingData manquant" },
        { status: 400 }
      );
    }

    // Vérifie que le PI existe et est dans un état attendu (requires_capture).
    let pi;
    try {
      pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (e) {
      return NextResponse.json(
        { error: "PaymentIntent introuvable côté Stripe" },
        { status: 404 }
      );
    }
    // Le PaymentIntent doit avoir été créé pour cet utilisateur (metadata.userId
    // posée par create-payment-intent depuis le jeton). Sinon 403, sans rien annuler.
    if (pi.metadata?.userId !== userId) {
      return NextResponse.json(
        { error: "Ce paiement n'appartient pas à votre compte" },
        { status: 403 }
      );
    }
    // Métadonnées posées par le serveur (create-payment-intent) : le PaymentIntent
    // doit être un hybride dont la part wallet et le total sont cohérents.
    const walletAmountCents = Number(pi.metadata?.walletAmountCents);
    const cardAmountCents = pi.amount;
    if (
      pi.metadata?.paymentMode !== "hybrid" ||
      !Number.isInteger(walletAmountCents) ||
      walletAmountCents <= 0 ||
      !Number.isInteger(cardAmountCents) ||
      cardAmountCents <= 0 ||
      pi.metadata?.totalAmountCents !== String(cardAmountCents + walletAmountCents)
    ) {
      return conflict("PAYMENT_INTENT_INCONSISTENT", "PaymentIntent incohérent avec une réservation hybride");
    }

    // Source de paiement résolue côté serveur : société si membre actif, sinon perso.
    const company = await getCompanyContextForUser(userId).catch(() => null);
    const runDebit = (bookingData) =>
      company
        ? debitCompanyWalletForHybridBooking({
            companyId: company.companyId,
            actorUid: userId,
            actorEmail: company.member.email ?? null,
            walletAmountCents,
            cardAmountCents,
            paymentIntentId,
            bookingData,
            description,
          })
        : debitWalletForHybridBooking({
            userId,
            walletAmountCents,
            cardAmountCents,
            paymentIntentId,
            bookingData,
            description,
          });
    // Rejeu : la transaction du portefeuille renvoie le résultat existant (ledger du
    // PaymentIntent) sans rien débiter, et vérifie le propriétaire.
    const replay = async () =>
      NextResponse.json(await runDebit({ ...pickBookingFields(rawBookingData), email: auth.email }));

    try {
      if (pi.status !== "requires_capture") {
        const claim = await readClaim(paymentIntentId);
        if (claim && claim.state === "done" && claim.userId === userId) return await replay();
        return conflict(
          "PAYMENT_INTENT_STATE",
          `PaymentIntent dans un état incompatible : ${pi.status} (attendu: requires_capture)`
        );
      }

      const claim = await acquireClaim(paymentIntentId, userId, "hybrid");
      if (claim.kind === "forbidden") return conflict("CONFLICT", "Opération déjà enregistrée");
      if (claim.kind === "in_progress") {
        return conflict("IN_PROGRESS", "Finalisation déjà en cours pour ce paiement. Réessayez dans un instant.");
      }
      if (claim.kind === "rejected") {
        return conflict("PAYMENT_REJECTED", "Ce paiement a été refusé : aucune réservation ne peut lui être rattachée.");
      }
      if (claim.kind === "done") return await replay();

      held = { paymentIntentId, requestId: claim.requestId };

      // Reprise après incident : le débit/la réservation existent déjà (ledger) mais le
      // verrou n'a pas été clos. Réponse idempotente, jamais d'annulation.
      if (await hybridLedgerExists(paymentIntentId)) {
        const result = await runDebit({ ...pickBookingFields(rawBookingData), email: auth.email });
        await completeClaim(paymentIntentId, held.requestId, {
          bookingId: result.bookingId,
          reservationId: result.reservationId,
        });
        held = null;
        return NextResponse.json(result);
      }

      // Refus définitif : « rejected » posé par le détenteur PUIS libération de l'empreinte.
      const rejectAndRelease = async () => {
        const mine = await rejectClaim(paymentIntentId, held.requestId);
        if (!mine) return null;
        held = null;
        try {
          await stripe.paymentIntents.cancel(paymentIntentId);
          return true;
        } catch (cancelErr) {
          console.error("[finalize-hybrid-booking] échec cancel PI:", cancelErr);
          return false;
        }
      };
      const lostLock = () =>
        conflict("IN_PROGRESS", "Finalisation déjà en cours pour ce paiement. Réessayez dans un instant.");

      // Recalcul à l'instant de création de l'empreinte (source Stripe) si elle date
      // d'au plus 30 min ; au-delà : heure actuelle.
      const { quote, failure: quoteFailure } = quoteOrResponse(
        rawBookingData,
        undefined,
        finalizationReferenceTime(pi.created)
      );
      // Dans tous les cas, les règles de délai sont aussi vérifiées à l'heure actuelle.
      const failure =
        quoteFailure ??
        (quote.reservationDateIso
          ? checkReservationTiming(
              new Date(quote.reservationDateIso),
              quote.prioriteReservation,
              new Date()
            )
          : null);
      if (failure) {
        const released = await rejectAndRelease();
        if (released === null) return lostLock();
        return NextResponse.json(
          { error: failure.error, code: failure.code, holdReleased: released },
          { status: failure.status }
        );
      }
      if (cardAmountCents + walletAmountCents !== quote.totalCents) {
        // Le prix a changé entre la création du paiement et la finalisation :
        // on ne débite pas un autre montant en silence.
        const released = await rejectAndRelease();
        if (released === null) return lostLock();
        return NextResponse.json(
          priceChangedBody(quote, cardAmountCents + walletAmountCents, released),
          { status: 409 }
        );
      }
      // Les paramètres de la course doivent être ceux qui ont servi à créer le paiement.
      const md = pi.metadata || {};
      if (
        md.depart !== quote.depart ||
        md.arrivee !== quote.arrivee ||
        md.reservationDate !== quote.reservationDateIso ||
        md.prioriteReservation !== String(quote.prioriteReservation)
      ) {
        const released = await rejectAndRelease();
        if (released === null) return lostLock();
        return NextResponse.json(
          {
            error: "Les paramètres de la course ne correspondent pas au paiement.",
            code: "RIDE_MISMATCH",
            holdReleased: released,
          },
          { status: 409 }
        );
      }
      const mismatch = checkDisplayedPrice(body, quote);
      if (mismatch) {
        // Prix affiché périmé mais empreinte valide : verrou libéré pour réessayer.
        await abandonClaim(paymentIntentId, held.requestId);
        held = null;
        return mismatch;
      }

      const bookingData = {
        ...pickBookingFields(rawBookingData),
        depart: quote.depart,
        arrivee: quote.arrivee,
        prioriteReservation: quote.prioriteReservation,
        ...(quote.reservationDateIso ? { reservationDate: quote.reservationDateIso } : {}),
        email: auth.email,
      };
      if (quote.distanceKm !== null) bookingData.distance = quote.distanceKm;
      else delete bookingData.distance;

      try {
        const result = await runDebit(bookingData);
        await completeClaim(paymentIntentId, held.requestId, {
          bookingId: result.bookingId,
          reservationId: result.reservationId,
        });
        held = null;
        return NextResponse.json(result);
      } catch (err) {
        if (err instanceof WalletError && err.code === "CONFLICT") {
          // Ledger déjà au nom d'un autre appelant : aucun effet, PaymentIntent intact.
          await abandonClaim(paymentIntentId, held.requestId);
          held = null;
          return NextResponse.json({ error: err.message, code: err.code }, { status: 409 });
        }
        if (err instanceof WalletError) {
          // Solde insuffisant / budget dépassé (race) : on libère le hold CB côté
          // Stripe (après avoir posé « rejected ») — l'user peut recommencer.
          const released = await rejectAndRelease();
          const status =
            err.code === "INSUFFICIENT_BALANCE" || err.code === "BUDGET_EXCEEDED"
              ? 402
              : err.code === "WALLET_NOT_FOUND"
              ? 404
              : err.code === "FORBIDDEN"
              ? 403
              : 400;
          return NextResponse.json(
            { error: err.message, code: err.code, holdReleased: released === true },
            { status }
          );
        }
        throw err;
      }
    } catch (err) {
      if (err instanceof WalletError && err.code === "CONFLICT") {
        // Rejeu ou reprise : ledger d'un autre appelant. On libère le verrou s'il nous
        // appartient (sans effet sinon) avant de répondre.
        if (held) {
          await abandonClaim(held.paymentIntentId, held.requestId).catch(() => {});
          held = null;
        }
        return NextResponse.json({ error: err.message, code: err.code }, { status: 409 });
      }
      throw err;
    }
  } catch (err) {
    console.error("[finalize-hybrid-booking] erreur:", err);
    if (held) {
      try {
        await abandonClaim(held.paymentIntentId, held.requestId);
      } catch (e) {
        console.error("[finalize-hybrid-booking] échec libération verrou:", e);
      }
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
