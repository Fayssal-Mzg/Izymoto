import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe-server";

// Fourchette acceptable pour un trajet moto-taxi (en €). Bloque les tentatives
// de manipulation côté client (ex: amount=0.50€).
const MIN_AMOUNT_EUR = 30;
const MAX_AMOUNT_EUR = 1000;

export async function POST(request) {
  try {
    const { amount, metadata } = await request.json();

    if (
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount < MIN_AMOUNT_EUR ||
      amount > MAX_AMOUNT_EUR
    ) {
      return NextResponse.json(
        {
          error: `Montant invalide. Doit être un nombre compris entre ${MIN_AMOUNT_EUR}€ et ${MAX_AMOUNT_EUR}€.`,
        },
        { status: 400 }
      );
    }

    // Modèle "Uber" : on autorise les fonds sans débiter (`capture_method: manual`),
    // l'admin déclenche la capture après la course via /api/capture-payment.
    // `request_incremental_authorization: if_available` permet d'ajouter des frais
    // (attente, péage, pourboire) avant capture si le réseau le supporte (Visa/MC
    // toutes catégories). Stripe applique le fallback silencieusement sinon.
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "eur",
      capture_method: "manual",
      payment_method_options: {
        card: {
          request_incremental_authorization: "if_available",
        },
      },
      metadata: {
        ...(metadata || {}),
        // Stripe stocke metadata en strings — on aplatit les valeurs non-string.
        ...(metadata?.depart && { depart: String(metadata.depart) }),
        ...(metadata?.arrivee && { arrivee: String(metadata.arrivee) }),
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return NextResponse.json(
      { error: "Error creating payment intent: " + error.message },
      { status: 500 }
    );
  }
}
