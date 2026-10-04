import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { stripe } from "@/lib/stripe-server";
import { requireAuth, AdminAuthError, getAdminFirestore } from "@/lib/firebase/admin-server";
import { pickBookingFields } from "@/lib/api/identity";
import {
  quoteOrResponse,
  checkDisplayedPrice,
  priceChangedBody,
} from "@/lib/api/pricing";
import {
  PAYMENT_INTENT_ID_RE,
  acquireClaim,
  abandonClaim,
  finishClaimInTransaction,
  readClaim,
  rejectClaim,
} from "@/lib/payments/claims";

// Finalise une course payée par carte seule, APRÈS confirmPayment côté client
// (PaymentIntent en requires_capture = empreinte posée). La réservation est créée
// ici, par le serveur : prix et amountAuthorized viennent du calcul serveur, jamais
// du client. Un PaymentIntent = une seule course.
//
// Concurrence : un verrou `paymentClaims/<pi>` est pris AVANT tout recalcul. Seul le
// détenteur peut créer la réservation (`bookings/card_<pi>`, dans la même transaction
// que le passage du verrou à « done ») ou libérer l'empreinte (après avoir posé
// « rejected »). Une requête concurrente reçoit 409 IN_PROGRESS sans effet.
// Idempotent : rejeu après succès -> même bookingId, sans recalcul ni annulation.

const BOOKINGS = "bookings";

const genReservationId = () =>
  `CMD-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

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
    const { paymentIntentId, bookingData: rawBookingData } = body;
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
      return NextResponse.json({ error: "bookingData manquant" }, { status: 400 });
    }

    let pi;
    try {
      pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (e) {
      return NextResponse.json(
        { error: "PaymentIntent introuvable côté Stripe" },
        { status: 404 }
      );
    }
    // Propriétaire : metadata.userId posée par create-payment-intent depuis le jeton.
    // 403 avant tout effet de bord.
    if (pi.metadata?.userId !== userId) {
      return NextResponse.json(
        { error: "Ce paiement n'appartient pas à votre compte" },
        { status: 403 }
      );
    }
    if (
      pi.metadata?.paymentMode !== "card" ||
      !Number.isInteger(pi.amount) ||
      pi.amount <= 0 ||
      pi.metadata?.totalAmountCents !== String(pi.amount)
    ) {
      return conflict("PAYMENT_INTENT_INCONSISTENT", "PaymentIntent incohérent avec une réservation par carte");
    }

    const db = getAdminFirestore();
    const bookingRef = db.collection(BOOKINGS).doc(`card_${paymentIntentId}`);

    // Rejeu : n'est accepté que si la réservation porte les marqueurs posés par le
    // serveur (serverFinalized) et correspond à ce PaymentIntent, ce propriétaire et ce montant.
    const replay = async (claim) => {
      const snap = await bookingRef.get();
      const b = snap.exists ? snap.data() : null;
      if (
        !b ||
        b.serverFinalized !== true ||
        b.userId !== userId ||
        b.paymentId !== paymentIntentId ||
        Math.round(Number(b.prix) * 100) !== pi.amount
      ) {
        return conflict("BOOKING_INCONSISTENT", "Réservation incohérente avec ce paiement");
      }
      return NextResponse.json({
        bookingId: bookingRef.id,
        reservationId: b.reservationId ?? claim.reservationId ?? "",
      });
    };

    if (pi.status !== "requires_capture") {
      // Pas d'empreinte active : seule une finalisation déjà réussie est restituable.
      const claim = await readClaim(paymentIntentId);
      if (claim && claim.state === "done" && claim.userId === userId) return replay(claim);
      return conflict(
        "PAYMENT_INTENT_STATE",
        `PaymentIntent dans un état incompatible : ${pi.status} (attendu: requires_capture)`
      );
    }

    const claim = await acquireClaim(paymentIntentId, userId, "card");
    if (claim.kind === "forbidden") {
      return conflict("CONFLICT", "Opération déjà enregistrée");
    }
    if (claim.kind === "in_progress") {
      return conflict("IN_PROGRESS", "Finalisation déjà en cours pour ce paiement. Réessayez dans un instant.");
    }
    if (claim.kind === "rejected") {
      return conflict("PAYMENT_REJECTED", "Ce paiement a été refusé : aucune réservation ne peut lui être rattachée.");
    }
    if (claim.kind === "done") return replay(claim);

    held = { paymentIntentId, requestId: claim.requestId };

    // Refus définitif : on pose « rejected » (seul le détenteur y parvient) PUIS on
    // libère l'empreinte. Perdre le verrou = pas d'annulation, pas d'effet.
    const rejectAndRelease = async () => {
      const mine = await rejectClaim(paymentIntentId, held.requestId);
      if (!mine) return null;
      held = null;
      try {
        await stripe.paymentIntents.cancel(paymentIntentId);
        return true;
      } catch (cancelErr) {
        console.error("[finalize-card-booking] échec cancel PI:", cancelErr);
        return false;
      }
    };
    const lostLock = () =>
      conflict("IN_PROGRESS", "Finalisation déjà en cours pour ce paiement. Réessayez dans un instant.");

    // Recalcul à l'instant de création de l'empreinte (source Stripe) : un 3DS lent ne
    // change ni les majorations « moins de 2 h » ni les règles de délai.
    const { quote, response: quoteResponse, failure } = quoteOrResponse(
      rawBookingData,
      undefined,
      new Date(pi.created * 1000)
    );
    if (failure) {
      const released = await rejectAndRelease();
      if (released === null) return lostLock();
      return NextResponse.json(
        { error: failure.error, code: failure.code, holdReleased: released },
        { status: failure.status }
      );
    }
    if (pi.amount !== quote.totalCents) {
      const released = await rejectAndRelease();
      if (released === null) return lostLock();
      return NextResponse.json(priceChangedBody(quote, pi.amount, released), { status: 409 });
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
      // Prix affiché périmé mais empreinte valide : on libère le verrou pour réessayer.
      await abandonClaim(paymentIntentId, held.requestId);
      held = null;
      return mismatch;
    }

    const reservationId = genReservationId();
    const reservationDate = quote.reservationDateIso
      ? Timestamp.fromDate(new Date(quote.reservationDateIso))
      : null;
    const booking = {
      ...pickBookingFields(rawBookingData),
      userId,
      email: auth.email ?? null,
      depart: quote.depart,
      arrivee: quote.arrivee,
      prioriteReservation: quote.prioriteReservation,
      reservationDate,
      prix: quote.total,
      amountAuthorized: quote.total,
      paymentId: paymentIntentId,
      paymentMethod: "card",
      paymentStatus: "authorized",
      reservationId,
      accountType: "registered",
      // Empreinte posée : la course entre au pool des chauffeurs (équivalent de ce que
      // le webhook amount_capturable_updated écrit ; évite qu'une réservation créée
      // après l'événement reste bloquée en "confirmed").
      status: "awaiting_driver",
      isPaid: false,
      // Marqueur posé uniquement par ce serveur (le rejeu l'exige).
      serverFinalized: true,
      createdAt: Timestamp.now(),
    };
    if (quote.distanceKm !== null) booking.distance = quote.distanceKm;
    else delete booking.distance;

    let planted = false;
    const done = await finishClaimInTransaction(paymentIntentId, held.requestId, async (tx) => {
      const snap = await tx.get(bookingRef);
      if (snap.exists) {
        planted = true; // document pré-existant non posé par ce flux : on n'écrase rien
        return null;
      }
      tx.set(bookingRef, booking);
      return { result: null, bookingId: bookingRef.id, reservationId };
    });
    if (!done.ok) {
      if (planted) {
        await rejectClaim(paymentIntentId, held.requestId);
        held = null;
        return conflict("CONFLICT", "Opération déjà enregistrée");
      }
      held = null;
      return lostLock();
    }
    held = null;
    return NextResponse.json({ bookingId: bookingRef.id, reservationId });
  } catch (err) {
    console.error("[finalize-card-booking] erreur:", err);
    if (held) {
      // Échec technique : on libère le verrou pour autoriser un nouvel essai.
      try {
        await abandonClaim(held.paymentIntentId, held.requestId);
      } catch (e) {
        console.error("[finalize-card-booking] échec libération verrou:", e);
      }
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
