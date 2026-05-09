import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe-server";
import {
  debitWalletForHybridBooking,
  WalletError,
} from "@/lib/wallet/server";

// Finalise un booking hybride (wallet + CB) après confirmation 3DS côté client.
// Le PaymentIntent est déjà en hold (status requires_capture). On débite le
// wallet de la part fixée et on crée le booking dans une transaction atomique.
// Si le débit échoue (solde insuffisant entre temps), on cancel le PI pour
// libérer le hold CB côté Stripe.

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      userId,
      paymentIntentId,
      walletAmountCents,
      cardAmountCents,
      bookingData,
      clientToken,
      description,
    } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "userId manquant" },
        { status: 400 }
      );
    }
    if (!paymentIntentId || typeof paymentIntentId !== "string") {
      return NextResponse.json(
        { error: "paymentIntentId manquant" },
        { status: 400 }
      );
    }
    if (
      !walletAmountCents ||
      !Number.isFinite(walletAmountCents) ||
      walletAmountCents <= 0
    ) {
      return NextResponse.json(
        { error: "walletAmountCents invalide" },
        { status: 400 }
      );
    }
    if (
      !cardAmountCents ||
      !Number.isFinite(cardAmountCents) ||
      cardAmountCents <= 0
    ) {
      return NextResponse.json(
        { error: "cardAmountCents invalide" },
        { status: 400 }
      );
    }
    if (!bookingData || typeof bookingData !== "object") {
      return NextResponse.json(
        { error: "bookingData manquant" },
        { status: 400 }
      );
    }
    if (!clientToken || typeof clientToken !== "string") {
      return NextResponse.json(
        { error: "clientToken manquant" },
        { status: 400 }
      );
    }

    // Vérifie que le PI existe et est dans un état attendu (requires_capture).
    let pi;
    try {
      pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (e) {
      return NextResponse.json(
        { error: "PaymentIntent introuvable côté Stripe" },
        { status: 404 }
      );
    }
    if (pi.status !== "requires_capture") {
      return NextResponse.json(
        {
          error: `PaymentIntent dans un état incompatible : ${pi.status} (attendu: requires_capture)`,
        },
        { status: 409 }
      );
    }
    if (pi.amount !== cardAmountCents) {
      return NextResponse.json(
        {
          error: `Montant CB du PI (${pi.amount}) ne correspond pas à cardAmountCents (${cardAmountCents})`,
        },
        { status: 409 }
      );
    }

    try {
      const result = await debitWalletForHybridBooking({
        userId,
        walletAmountCents,
        cardAmountCents,
        paymentIntentId,
        bookingData,
        clientToken,
        description,
      });
      return NextResponse.json(result);
    } catch (err) {
      if (err instanceof WalletError) {
        // Solde insuffisant (race condition) : on cancel le PI pour libérer
        // le hold CB côté Stripe — l'user peut recommencer.
        try {
          await stripe.paymentIntents.cancel(paymentIntentId);
        } catch (cancelErr) {
          console.error(
            "[finalize-hybrid-booking] échec cancel PI après erreur wallet:",
            cancelErr
          );
        }
        const status =
          err.code === "INSUFFICIENT_BALANCE"
            ? 402
            : err.code === "WALLET_NOT_FOUND"
            ? 404
            : 400;
        return NextResponse.json(
          { error: err.message, code: err.code },
          { status }
        );
      }
      throw err;
    }
  } catch (err) {
    console.error("[finalize-hybrid-booking] erreur:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
