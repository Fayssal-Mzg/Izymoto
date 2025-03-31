import { NextResponse } from "next/server";
import Stripe from "stripe";

// Clé secrète Stripe (jamais exposée au client)
const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY ||
    "sk_test_51R7yIDCaUgDUSBsLLAI9oaoForefWsiWKp9egmiYeWdWFk4FaSfWIFBM4ExzI6sop8EuN0hkBAQsPYHKCfXLy9Y000uMqkesEC"
);

export async function POST(request) {
  try {
    const { amount, metadata } = await request.json();

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
