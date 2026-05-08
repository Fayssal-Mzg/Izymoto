import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe-server";
import { getTierById } from "@/lib/wallet/tiers";

// Crée une Stripe Checkout Session pour la recharge d'un wallet.
// - Capture immédiate (différent du flow booking qui est en manual capture).
// - L'utilisateur est redirigé vers la page Stripe puis revient sur /portefeuille/merci.
// - Le crédit effectif du wallet se fait dans le webhook (checkout.session.completed)
//   pour ne créditer qu'après confirmation par Stripe (anti-fraude).

export async function POST(request) {
  try {
    const { tierId, userId, userEmail } = await request.json();

    if (!tierId || typeof tierId !== "string") {
      return NextResponse.json(
        { error: "tierId manquant ou invalide" },
        { status: 400 }
      );
    }

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "userId manquant : l'utilisateur doit être connecté" },
        { status: 401 }
      );
    }

    const tier = getTierById(tierId);
    if (!tier) {
      return NextResponse.json(
        { error: `Palier inconnu : ${tierId}` },
        { status: 400 }
      );
    }

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://izymoto.com";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: tier.rechargeAmount * 100,
            product_data: {
              name: `Portefeuille Izymoto — Palier ${tier.name}`,
              description: `Recharge ${tier.rechargeAmount} € + ${tier.bonusAmount} € de bonus offert (${tier.bonusPercent}%) — Crédit total : ${tier.totalCredit} €`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/portefeuille/merci?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/portefeuille?cancelled=1`,
      customer_email: userEmail || undefined,
      client_reference_id: userId,
      metadata: {
        intent: "wallet_recharge",
        tierId: tier.id,
        userId,
        rechargeAmountCents: String(tier.rechargeAmount * 100),
        bonusAmountCents: String(tier.bonusAmount * 100),
        totalCreditCents: String(tier.totalCredit * 100),
      },
      payment_intent_data: {
        metadata: {
          intent: "wallet_recharge",
          tierId: tier.id,
          userId,
        },
      },
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("[wallet/create-checkout] erreur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la session de paiement" },
      { status: 500 }
    );
  }
}
