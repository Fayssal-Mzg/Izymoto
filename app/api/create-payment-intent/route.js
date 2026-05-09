import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe-server";

// Fourchette acceptable pour un trajet moto-taxi (en €). Bloque les tentatives
// de manipulation côté client (ex: amount=0.50€).
const MIN_AMOUNT_EUR = 30;
const MAX_AMOUNT_EUR = 1000;

// Stripe minimum pour une charge EUR : 0.50€ = 50 centimes.
const STRIPE_MIN_CHARGE_CENTS = 50;

export async function POST(request) {
  try {
    const { amount, metadata, walletAmountCents } = await request.json();

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

    const totalCents = Math.round(amount * 100);
    const walletCents =
      typeof walletAmountCents === "number" &&
      Number.isFinite(walletAmountCents) &&
      walletAmountCents > 0
        ? Math.round(walletAmountCents)
        : 0;

    if (walletCents >= totalCents) {
      return NextResponse.json(
        {
          error:
            "walletAmountCents >= total : utiliser /api/wallet/debit-for-booking",
        },
        { status: 400 }
      );
    }
    if (walletCents > 0 && totalCents - walletCents < STRIPE_MIN_CHARGE_CENTS) {
      return NextResponse.json(
        {
          error: `Le reste à payer en CB serait inférieur au minimum Stripe (0,50€). Couvrez tout en portefeuille ou ajustez la part wallet.`,
        },
        { status: 400 }
      );
    }

    const cardAmountCents = totalCents - walletCents;
    const isHybrid = walletCents > 0;

    // Modèle "Uber" : on autorise les fonds sans débiter (`capture_method: manual`),
    // l'admin déclenche la capture après la course via /api/capture-payment.
    // TODO: réactiver `payment_method_options.card.request_incremental_authorization: "if_available"`
    // une fois l'équipe spécialisée Stripe (escalade John, 2026-05-08) confirme l'activation IC.
    // En attendant, on peut capturer pour MOINS que l'autorisé, mais pas augmenter le hold.
    const paymentIntent = await stripe.paymentIntents.create({
      amount: cardAmountCents,
      currency: "eur",
      capture_method: "manual",
      // Stripe metadata: valeurs string uniquement, max 500 chars. On stringify
      // les objets/arrays (ex. detailsMajorations), on coerce le reste en string.
      // On y ajoute la part wallet pour traçabilité + reconnaissance par le webhook.
      metadata: {
        ...Object.fromEntries(
          Object.entries(metadata || {})
            .map(([k, v]) => {
              if (v === null || v === undefined) return null;
              const str = typeof v === "object" ? JSON.stringify(v) : String(v);
              if (!str) return null;
              return [k, str.length > 500 ? str.slice(0, 500) : str];
            })
            .filter(Boolean)
        ),
        ...(isHybrid && {
          paymentMode: "hybrid",
          walletAmountCents: String(walletCents),
          totalAmountCents: String(totalCents),
        }),
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      cardAmountCents,
      walletAmountCents: walletCents,
      totalAmountCents: totalCents,
      isHybrid,
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return NextResponse.json(
      { error: "Error creating payment intent: " + error.message },
      { status: 500 }
    );
  }
}
