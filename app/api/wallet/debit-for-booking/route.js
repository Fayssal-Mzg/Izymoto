import { NextResponse } from "next/server";
import { requireAuth, AdminAuthError } from "@/lib/firebase/admin-server";
import { pickBookingFields } from "@/lib/api/identity";
import { debitWalletForBooking, WalletError } from "@/lib/wallet/server";

// Débite le wallet d'un user pour payer une course (cas "tout wallet").
// Crée le booking dans la même transaction Firestore atomique.
// Idempotent via clientToken (UUID généré côté front).
// L'utilisateur débité est toujours celui du jeton Firebase, jamais du corps.

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
    const { amountCents, bookingData: rawBookingData, clientToken, description } = body;
    const userId = auth.uid;

    // Même fourchette que create-payment-intent (30 € – 1000 €) en attendant le prix serveur.
    if (!Number.isInteger(amountCents) || amountCents < 3000 || amountCents > 100000) {
      return NextResponse.json(
        { error: "amountCents invalide" },
        { status: 400 }
      );
    }
    if (!rawBookingData || typeof rawBookingData !== "object") {
      return NextResponse.json(
        { error: "bookingData manquant" },
        { status: 400 }
      );
    }
    // Liste blanche des champs client ; email = jeton. Le prix enregistré est le
    // montant réellement débité (la part chauffeur doit correspondre à ce qui a été payé).
    const bookingData = {
      ...pickBookingFields(rawBookingData),
      email: auth.email,
      prix: amountCents / 100,
      amountAuthorized: amountCents / 100,
      amountCaptured: amountCents / 100,
    };
    // Le préfixe "hybrid_" est réservé aux ledgers hybrides (clé dérivée du PaymentIntent).
    if (
      !clientToken ||
      typeof clientToken !== "string" ||
      !/^[A-Za-z0-9_-]{1,100}$/.test(clientToken) ||
      clientToken.startsWith("hybrid_")
    ) {
      return NextResponse.json(
        { error: "clientToken manquant ou invalide (idempotence)" },
        { status: 400 }
      );
    }

    const result = await debitWalletForBooking({
      userId,
      amountCents,
      bookingData,
      clientToken,
      description,
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof WalletError) {
      const status =
        err.code === "INSUFFICIENT_BALANCE"
          ? 402
          : err.code === "WALLET_NOT_FOUND"
          ? 404
          : err.code === "CONFLICT"
          ? 409
          : 400;
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status }
      );
    }
    console.error("[wallet/debit-for-booking] erreur:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
