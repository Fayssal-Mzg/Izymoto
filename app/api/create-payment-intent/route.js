import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe-server";
import { requireAuth, AdminAuthError } from "@/lib/firebase/admin-server";
import { pickPaymentIntentMetadata } from "@/lib/api/identity";
import { quoteOrResponse, checkDisplayedPrice } from "@/lib/api/pricing";
import { getSpendableCentsForUser } from "@/lib/wallet/companyServer";

// Stripe minimum pour une charge EUR : 0.50€ = 50 centimes.
const STRIPE_MIN_CHARGE_CENTS = 50;

export async function POST(request) {
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
    // lot 0.3 : le montant est recalculé par le serveur à partir des paramètres de
    // la course (metadata : adresses, distance, coordonnées, date, priorité). Tout
    // montant envoyé par le client (amount, amountCents, prix...) est ignoré ;
    // displayedTotalCents (prix affiché) sert uniquement à détecter un écart (409).
    const body = await request.json();
    const { metadata, walletAmountCents } = body;

    const { quote, response } = quoteOrResponse(metadata);
    if (response) return response;
    const mismatch = checkDisplayedPrice(body, quote);
    if (mismatch) return mismatch;

    const totalCents = quote.totalCents;
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
          code: "WALLET_COVERS_TOTAL",
          totalAmountCents: totalCents,
        },
        { status: 400 }
      );
    }
    if (walletCents > 0) {
      // La part portefeuille annoncée ne peut pas dépasser le solde dépensable réel
      // (société plafonnée par le budget, sinon portefeuille personnel).
      const spendableCents = await getSpendableCentsForUser(auth.uid);
      if (walletCents > spendableCents) {
        return NextResponse.json(
          {
            error: "Solde portefeuille insuffisant pour la part annoncée.",
            code: "INSUFFICIENT_BALANCE",
          },
          { status: 402 }
        );
      }
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
      // Stripe metadata (strings). Clés descriptives en liste blanche (aucune donnée
      // personnelle : le webhook ne lit pas ces métadonnées), puis clés serveur posées
      // APRÈS la copie, donc non écrasables : propriétaire, mode, parts wallet/total.
      metadata: {
        ...Object.fromEntries(
          Object.entries({
            ...pickPaymentIntentMetadata(metadata),
            // Valeurs validées par le serveur (priment sur celles du client).
            depart: quote.depart,
            arrivee: quote.arrivee,
            ...(quote.distanceKm !== null ? { distance: quote.distanceKm } : {}),
            ...(quote.reservationDateIso ? { reservationDate: quote.reservationDateIso } : {}),
            prioriteReservation: quote.prioriteReservation,
          }).map(([k, v]) => [k, String(v)])
        ),
        userId: auth.uid,
        paymentMode: isHybrid ? "hybrid" : "card",
        walletAmountCents: String(walletCents),
        totalAmountCents: String(totalCents),
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
      { error: "Erreur lors de la création du paiement" },
      { status: 500 }
    );
  }
}
