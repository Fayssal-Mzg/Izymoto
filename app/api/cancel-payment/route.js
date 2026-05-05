import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe-server";

// Annule une autorisation gelée. Le client n'est jamais débité, le hold
// disparaît de sa CB sous quelques minutes (selon réseau).
//
// TODO commit suivant : protéger l'endpoint par vérif Firebase ID token admin.
export async function POST(request) {
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
