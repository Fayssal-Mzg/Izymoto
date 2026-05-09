import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe-server";
import { requireAdmin, AdminAuthError } from "@/lib/firebase/admin-server";

// Annule une autorisation gelée. Le client n'est jamais débité, le hold
// disparaît de sa CB sous quelques minutes (selon réseau).
//
// Pour les bookings hybrid (wallet + CB) : le webhook Stripe se charge
// automatiquement de refund la part wallet (cf. webhooks/stripe/route.js).
//
// Auth : ID token Firebase + check users/{uid}.isAdmin === true.
export async function POST(request) {
  try {
    await requireAdmin(request);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[cancel-payment] erreur auth:", err);
    return NextResponse.json(
      { error: "Erreur d'authentification" },
      { status: 500 }
    );
  }

  try {
    const { paymentIntentId, cancellationReason } = await request.json();

    if (!paymentIntentId || typeof paymentIntentId !== "string") {
      return NextResponse.json(
        { error: "paymentIntentId manquant ou invalide" },
        { status: 400 }
      );
    }

    const cancelParams = {};
    if (
      cancellationReason &&
      ["duplicate", "fraudulent", "requested_by_customer", "abandoned"].includes(
        cancellationReason
      )
    ) {
      cancelParams.cancellation_reason = cancellationReason;
    }

    const paymentIntent = await stripe.paymentIntents.cancel(
      paymentIntentId,
      cancelParams
    );

    return NextResponse.json({
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    });
  } catch (error) {
    console.error("Error canceling payment:", error);
    return NextResponse.json(
      { error: "Error canceling payment: " + error.message },
      { status: 500 }
    );
  }
}
