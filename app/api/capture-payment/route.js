import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe-server";

// Capture les fonds gelés. Appelé depuis le back-office admin une fois la
// course terminée. Le montant capturé peut être différent du montant autorisé :
// - inférieur (geste commercial / course écourtée) → Stripe libère le surplus
// - supérieur → uniquement si une incrément a été faite avant via
//   /api/increment-authorization (Stripe refuse sinon)
//
// TODO commit suivant : protéger l'endpoint par vérif Firebase ID token admin.
export async function POST(request) {
  try {
    const { paymentIntentId, amountToCapture } = await request.json();

    if (!paymentIntentId || typeof paymentIntentId !== "string") {
      return NextResponse.json(
        { error: "paymentIntentId manquant ou invalide" },
        { status: 400 }
      );
    }

    const captureParams = {};
    if (typeof amountToCapture === "number" && Number.isFinite(amountToCapture)) {
      if (amountToCapture <= 0) {
        return NextResponse.json(
          { error: "amountToCapture doit être strictement positif" },
          { status: 400 }
        );
      }
      captureParams.amount_to_capture = Math.round(amountToCapture * 100);
    }

    const paymentIntent = await stripe.paymentIntents.capture(
      paymentIntentId,
      captureParams
    );

    return NextResponse.json({
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      amountCaptured: paymentIntent.amount_received / 100,
    });
  } catch (error) {
    console.error("Error capturing payment:", error);
    return NextResponse.json(
      { error: "Error capturing payment: " + error.message },
      { status: 500 }
    );
  }
}
