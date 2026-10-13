import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe-server";
import { requireAuth, AdminAuthError, getAdminFirestore } from "@/lib/firebase/admin-server";
import { recordAuthorizedHold } from "@/lib/payments/deferredHold";

// lot 1.1 : page « Confirmer le paiement » (/paiement/confirmer/[bookingId]).
// L'empreinte différée a échoué (refus ou authentification demandée) : le client
// propriétaire récupère le client_secret du PaymentIntent pour le confirmer en
// session. Une fois l'empreinte posée (requires_capture), la réservation repasse
// en « authorized » (le webhook le fait aussi ; ce chemin évite d'attendre).

const BOOKING_ID_RE = /^deferred_seti_[A-Za-z0-9]+$/;

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
    const { bookingId } = (await request.json().catch(() => ({}))) as { bookingId?: unknown };
    if (typeof bookingId !== "string" || !BOOKING_ID_RE.test(bookingId)) {
      return NextResponse.json({ error: "Réservation invalide" }, { status: 400 });
    }
    const ref = getAdminFirestore().collection("bookings").doc(bookingId);
    const snap = await ref.get();
    const b = snap.data();
    // Même réponse pour « absente » et « pas à vous » : pas d'énumération.
    if (!b || b.userId !== auth.uid || b.deferredHold !== true) {
      return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
    }
    const summary = {
      reservationId: b.reservationId ?? "",
      depart: b.depart ?? "",
      arrivee: b.arrivee ?? "",
      reservationDate: b.reservationDate?.toDate?.().toISOString() ?? null,
      amountCents: Math.round(Number(b.prix) * 100),
    };

    if (b.status === "cancelled") {
      return NextResponse.json({ state: "cancelled", ...summary });
    }
    if (b.paymentStatus === "authorized" || b.paymentStatus === "captured") {
      return NextResponse.json({ state: "authorized", ...summary });
    }
    if (b.paymentStatus !== "action_required" || typeof b.paymentId !== "string") {
      // Carte enregistrée, empreinte pas encore due ou en cours : rien à faire.
      return NextResponse.json({ state: "pending", ...summary });
    }

    const pi = await stripe.paymentIntents.retrieve(b.paymentId, { expand: ["latest_charge"] });
    if (pi.metadata?.bookingId !== bookingId || pi.metadata?.userId !== auth.uid) {
      return NextResponse.json({ error: "Paiement incohérent avec la réservation" }, { status: 409 });
    }
    if (pi.status === "requires_capture") {
      if (pi.amount !== summary.amountCents) {
        return NextResponse.json({ error: "Montant incohérent avec la réservation" }, { status: 409 });
      }
      // Transactionnel : une course annulée entre-temps voit son empreinte libérée.
      const outcome = await recordAuthorizedHold(ref, pi);
      return NextResponse.json({ state: outcome === "authorized" ? "authorized" : "cancelled", ...summary });
    }
    if (pi.status === "requires_payment_method" || pi.status === "requires_action" || pi.status === "requires_confirmation") {
      return NextResponse.json({ state: "action_required", clientSecret: pi.client_secret, ...summary });
    }
    return NextResponse.json({ state: "unavailable", ...summary });
  } catch (err) {
    console.error("[deferred-hold] erreur:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
