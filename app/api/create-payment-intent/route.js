import { NextResponse } from "next/server";
import Stripe from "stripe";

// Clé secrète Stripe (jamais exposée au client)
const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY ||
    "sk_test_51R7yIDCaUgDUSBsLLAI9oaoForefWsiWKp9egmiYeWdWFk4FaSfWIFBM4ExzI6sop8EuN0hkBAQsPYHKCfXLy9Y000uMqkesEC"
);

// Fourchette acceptable pour un trajet moto-taxi (en €). Bloque les tentatives
// de manipulation côté client (ex: amount=0.50€). La vérification d'identité
// par token Firebase Admin sera ajoutée avec le refactor Stripe (commit C).
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

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "eur",
      metadata: metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return NextResponse.json(
      { error: "Error creating payment intent: " + error.message },
      { status: 500 }
    );
  }
}
