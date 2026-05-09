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
    // TODO: réactiver `payment_method_options.card.request_incremental_authorization: "if_available"`
    // une fois l'équipe spécialisée Stripe (escalade John, 2026-05-08) confirme l'activation IC.
    // En attendant, on peut capturer pour MOINS que l'autorisé, mais pas augmenter le hold.
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "eur",
      capture_method: "manual",
      // Stripe metadata: valeurs string uniquement, max 500 chars. On stringify
      // les objets/arrays (ex. detailsMajorations), on coerce le reste en string.
      metadata: Object.fromEntries(
        Object.entries(metadata || {})
          .map(([k, v]) => {
            if (v === null || v === undefined) return null;
            const str = typeof v === "object" ? JSON.stringify(v) : String(v);
            if (!str) return null;
            return [k, str.length > 500 ? str.slice(0, 500) : str];
          })
          .filter(Boolean)
      ),
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
