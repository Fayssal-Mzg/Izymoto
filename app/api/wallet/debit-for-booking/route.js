import { NextResponse } from "next/server";
import { debitWalletForBooking, WalletError } from "@/lib/wallet/server";

// Débite le wallet d'un user pour payer une course (cas "tout wallet").
// Crée le booking dans la même transaction Firestore atomique.
// Idempotent via clientToken (UUID généré côté front).

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, amountCents, bookingData, clientToken, description } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "userId manquant" },
        { status: 400 }
      );
    }
    if (!amountCents || !Number.isFinite(amountCents) || amountCents <= 0) {
      return NextResponse.json(
        { error: "amountCents invalide" },
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
        { error: "clientToken manquant (idempotence)" },
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
