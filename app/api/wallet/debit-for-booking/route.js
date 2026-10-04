import { NextResponse } from "next/server";
import { debitWalletForBooking, WalletError } from "@/lib/wallet/server";
import {
  getCompanyContextForUser,
  debitCompanyWalletForBooking,
} from "@/lib/wallet/companyServer";

function walletErrorStatus(code) {
  switch (code) {
    case "INSUFFICIENT_BALANCE":
    case "BUDGET_EXCEEDED":
      return 402;
    case "WALLET_NOT_FOUND":
      return 404;
    case "FORBIDDEN":
      return 403;
    default:
      return 400;
  }
}

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

    // Source de paiement résolue côté serveur depuis l'uid : société si l'user
    // est membre actif d'une entreprise, sinon wallet perso.
    const company = await getCompanyContextForUser(userId).catch(() => null);

    const result = company
      ? await debitCompanyWalletForBooking({
          companyId: company.companyId,
          actorUid: userId,
          actorEmail: company.member.email ?? null,
          amountCents,
          bookingData,
          clientToken,
          description,
        })
      : await debitWalletForBooking({
          userId,
          amountCents,
          bookingData,
          clientToken,
          description,
        });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof WalletError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: walletErrorStatus(err.code) }
      );
    }
    console.error("[wallet/debit-for-booking] erreur:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
