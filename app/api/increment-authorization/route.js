import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe-server";
import { requireAdmin, AdminAuthError } from "@/lib/firebase/admin-server";

// Augmente le montant autorisé d'un PaymentIntent confirmé avant capture.
// Utilisé pour ajouter des frais d'attente, péages, suppléments tardifs.
// Stripe limite à 10 incréments max et 500% du montant initial.
//
// `amount` = nouveau montant TOTAL autorisé (pas l'incrément). Stripe Inc auth
// API attend la nouvelle valeur cible, pas un delta.
//
// Opération back-office : aucun appelant côté client dans le dépôt (cf. capture-payment).
// Auth : ID token Firebase + users/{uid}.isAdmin === true.
export async function POST(request) {
  try {
    await requireAdmin(request);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[increment-authorization] erreur auth:", err);
    return NextResponse.json(
      { error: "Erreur d'authentification" },
      { status: 500 }
    );
  }

  try {
    const { paymentIntentId, amount } = await request.json();

    if (!paymentIntentId || typeof paymentIntentId !== "string") {
      return NextResponse.json(
        { error: "paymentIntentId manquant ou invalide" },
        { status: 400 }
      );
    }
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "amount (nouveau total) doit être strictement positif" },
        { status: 400 }
      );
    }

    const paymentIntent = await stripe.paymentIntents.incrementAuthorization(
      paymentIntentId,
      { amount: Math.round(amount * 100) }
    );

    return NextResponse.json({
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      amountAuthorized: paymentIntent.amount / 100,
    });
  } catch (error) {
    console.error("Error incrementing authorization:", error);
    return NextResponse.json(
      { error: "Error incrementing authorization: " + error.message },
      { status: 500 }
    );
  }
}
