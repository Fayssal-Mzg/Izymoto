import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe-server";
import { requireAuth, AdminAuthError } from "@/lib/firebase/admin-server";
import { pickBookingFields } from "@/lib/api/identity";
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
    const body = await request.json();
    const {
      paymentIntentId,
      walletAmountCents,
      cardAmountCents,
      bookingData: rawBookingData,
      description,
    } = body;
    const userId = auth.uid;

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
    if (!rawBookingData || typeof rawBookingData !== "object") {
      return NextResponse.json(
        { error: "bookingData manquant" },
        { status: 400 }
      );
    }
    const bookingData = {
      ...pickBookingFields(rawBookingData),
      email: auth.email,
    };

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
    // Le PaymentIntent doit avoir été créé pour cet utilisateur (metadata.userId
    // posée par create-payment-intent depuis le jeton). Sinon 403, sans rien annuler.
    if (pi.metadata?.userId !== userId) {
      return NextResponse.json(
        { error: "Ce paiement n'appartient pas à votre compte" },
        { status: 403 }
      );
    }
    // Métadonnées posées par le serveur (create-payment-intent) : le PaymentIntent
    // doit être un hybride dont la part wallet et le total correspondent.
    if (
      pi.metadata?.paymentMode !== "hybrid" ||
      pi.metadata?.walletAmountCents !== String(walletAmountCents) ||
      pi.metadata?.totalAmountCents !== String(pi.amount + walletAmountCents)
    ) {
      return NextResponse.json(
        { error: "PaymentIntent incohérent avec la part portefeuille demandée" },
        { status: 409 }
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
        description,
      });
      return NextResponse.json(result);
    } catch (err) {
      if (err instanceof WalletError && err.code === "CONFLICT") {
        // Ledger déjà au nom d'un autre appelant : aucun effet, PaymentIntent intact.
        return NextResponse.json({ error: err.message, code: err.code }, { status: 409 });
      }
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
