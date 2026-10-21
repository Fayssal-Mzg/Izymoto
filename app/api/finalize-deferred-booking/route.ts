import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe-server";
import { requireAuth, AdminAuthError, getAdminFirestore } from "@/lib/firebase/admin-server";
import { pickBookingFields } from "@/lib/api/identity";
import { quoteOrResponse, checkDisplayedPrice, priceChangedBody } from "@/lib/api/pricing";
import { finalizationReferenceTime } from "@/lib/pricing";
import {
  SETUP_INTENT_ID_RE,
  holdScheduledFor,
  isDeferredHold,
} from "@/lib/payments/deferredHold";
import { refreshRidePoolSafe, syncRidePoolInTx } from "@/lib/rides/pool";
import { notifyRidesAvailable } from "@/lib/push/events";

// lot 1.1 : finalise une course lointaine payée par carte, APRÈS confirmSetup côté
// client (SetupIntent « succeeded » = carte enregistrée, 3-D Secure fait). Aucune
// somme n'est encore bloquée : l'empreinte sera posée par la tâche quotidienne
// (`/api/cron/deferred-holds`) HOLD_LEAD_DAYS jours avant le départ.
// Un SetupIntent = une seule course (`bookings/deferred_<seti>`, créé en transaction).

const genReservationId = () =>
  `CMD-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

const conflict = (code: string, error: string) =>
  NextResponse.json({ error, code }, { status: 409 });

// Carte enregistrée pour une réservation refusée : on la détache du client Stripe,
// sauf si un appel concurrent a entre-temps créé la réservation avec cette carte.
async function detachCard(seti: Stripe.SetupIntent, bookingRef: FirebaseFirestore.DocumentReference) {
  const pm = typeof seti.payment_method === "string" ? seti.payment_method : seti.payment_method?.id;
  if (!pm || (await bookingRef.get()).exists) return;
  try {
    await stripe.paymentMethods.detach(pm);
  } catch (err) {
    console.error("[finalize-deferred-booking] échec détachement carte:", err);
  }
}

export async function POST(request: Request) {
  let auth;
  try {
    auth = await requireAuth(request);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erreur d'authentification" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { setupIntentId, bookingData: rawBookingData } = body ?? {};
    const userId = auth.uid;

    if (typeof setupIntentId !== "string" || !SETUP_INTENT_ID_RE.test(setupIntentId)) {
      return NextResponse.json(
        { error: "setupIntentId manquant ou invalide", code: "INVALID_SETUP_INTENT" },
        { status: 400 }
      );
    }
    if (!rawBookingData || typeof rawBookingData !== "object") {
      return NextResponse.json({ error: "bookingData manquant" }, { status: 400 });
    }

    let seti: Stripe.SetupIntent;
    try {
      seti = await stripe.setupIntents.retrieve(setupIntentId);
    } catch {
      return NextResponse.json({ error: "Enregistrement de carte introuvable côté Stripe" }, { status: 404 });
    }
    // Propriétaire : metadata.userId posée par create-payment-intent depuis le jeton.
    if (seti.metadata?.userId !== userId) {
      return NextResponse.json({ error: "Ce paiement n'appartient pas à votre compte" }, { status: 403 });
    }
    const totalCents = Number(seti.metadata?.totalAmountCents);
    if (seti.metadata?.paymentMode !== "card_deferred" || !Number.isInteger(totalCents) || totalCents <= 0) {
      return conflict("SETUP_INTENT_INCONSISTENT", "Enregistrement de carte incohérent avec une réservation");
    }

    const db = getAdminFirestore();
    const bookingRef = db.collection("bookings").doc(`deferred_${setupIntentId}`);

    const replay = async () => {
      const snap = await bookingRef.get();
      const b = snap.data();
      if (!b || b.serverFinalized !== true || b.userId !== userId || b.setupIntentId !== setupIntentId) {
        return conflict("BOOKING_INCONSISTENT", "Réservation incohérente avec ce paiement");
      }
      return NextResponse.json({ bookingId: bookingRef.id, reservationId: b.reservationId ?? "" });
    };

    if ((await bookingRef.get()).exists) return replay();

    if (seti.status !== "succeeded") {
      return conflict(
        "SETUP_INTENT_STATE",
        `Carte non enregistrée : ${seti.status} (attendu : succeeded)`
      );
    }

    // Recalcul à l'instant de l'enregistrement de la carte s'il date d'au plus 30 min.
    const { quote, failure } = quoteOrResponse(
      rawBookingData,
      undefined,
      finalizationReferenceTime(seti.created)
    );
    if (failure) {
      await detachCard(seti, bookingRef);
      return NextResponse.json({ error: failure.error, code: failure.code }, { status: failure.status });
    }
    if (quote.totalCents !== totalCents) {
      await detachCard(seti, bookingRef);
      return NextResponse.json(priceChangedBody(quote, totalCents), { status: 409 });
    }
    const md = seti.metadata || {};
    if (
      md.depart !== quote.depart ||
      md.arrivee !== quote.arrivee ||
      md.reservationDate !== quote.reservationDateIso ||
      md.prioriteReservation !== String(quote.prioriteReservation)
    ) {
      await detachCard(seti, bookingRef);
      return conflict("RIDE_MISMATCH", "Les paramètres de la course ne correspondent pas au paiement.");
    }
    // La course doit toujours relever de l'empreinte différée (sinon : paiement immédiat).
    if (!quote.reservationDateIso || !isDeferredHold(quote.reservationDateIso)) {
      await detachCard(seti, bookingRef);
      return conflict("DEFERRED_NOT_ALLOWED", "Cette course doit être payée immédiatement. Veuillez recommencer le paiement.");
    }
    const mismatch = checkDisplayedPrice(body, quote);
    if (mismatch) return mismatch;

    const reservationId = genReservationId();
    const booking: Record<string, unknown> = {
      ...pickBookingFields(rawBookingData),
      userId,
      email: auth.email ?? null,
      depart: quote.depart,
      arrivee: quote.arrivee,
      prioriteReservation: quote.prioriteReservation,
      reservationDate: Timestamp.fromDate(new Date(quote.reservationDateIso)),
      prix: quote.total,
      setupIntentId,
      paymentMethod: "card",
      paymentStatus: "card_saved",
      deferredHold: true,
      holdScheduledFor: Timestamp.fromDate(holdScheduledFor(quote.reservationDateIso)),
      holdAttempts: 0,
      // Posé par la tâche quotidienne une fois une course annulée nettoyée (paiement ouvert annulé).
      holdCleanedAt: null,
      reservationId,
      accountType: "registered",
      // La course est proposée aux chauffeurs dès maintenant ; l'empreinte suivra.
      status: "awaiting_driver",
      isPaid: false,
      serverFinalized: true,
      createdAt: Timestamp.now(),
    };
    if (quote.distanceKm !== null) booking.distance = quote.distanceKm;
    else delete booking.distance;

    const created = await db.runTransaction(async (tx) => {
      const snap = await tx.get(bookingRef);
      if (snap.exists) return false;
      tx.set(bookingRef, booking);
      // lot 2.1 : la course entre au pool des chauffeurs dans la même transaction.
      syncRidePoolInTx(tx, bookingRef.id, booking);
      return true;
    });
    if (!created) return replay();
    await refreshRidePoolSafe(bookingRef.id);
    await notifyRidesAvailable(bookingRef.id);
    return NextResponse.json({ bookingId: bookingRef.id, reservationId });
  } catch (err) {
    console.error("[finalize-deferred-booking] erreur:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
