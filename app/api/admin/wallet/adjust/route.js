import { NextResponse } from "next/server";
import { adjustWalletAdmin, WalletError } from "@/lib/wallet/server";
import { requireAdmin, AdminAuthError } from "@/lib/firebase/admin-server";

// Ajustement manuel admin du solde wallet d'un user.
// - Auth : ID token Firebase + check users/{uid}.isAdmin === true.
// - Body : { userId, amountEur, direction: "credit" | "debit", reason }
// - Retour : { balanceAfterCents, transactionId }

const MAX_ADJUSTMENT_EUR = 10000;

export async function POST(request) {
  let admin;
  try {
    admin = await requireAdmin(request);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[admin/wallet/adjust] erreur auth:", err);
    return NextResponse.json({ error: "Erreur d'authentification" }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const { userId, amountEur, direction, reason } = body;

  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId manquant" }, { status: 400 });
  }
  if (
    typeof amountEur !== "number" ||
    !Number.isFinite(amountEur) ||
    amountEur <= 0 ||
    amountEur > MAX_ADJUSTMENT_EUR
  ) {
    return NextResponse.json(
      { error: `amountEur doit être entre 0 et ${MAX_ADJUSTMENT_EUR}€` },
      { status: 400 }
    );
  }
  if (direction !== "credit" && direction !== "debit") {
    return NextResponse.json(
      { error: "direction doit être 'credit' ou 'debit'" },
      { status: 400 }
    );
  }
  if (!reason || typeof reason !== "string" || !reason.trim()) {
    return NextResponse.json(
      { error: "Un motif est obligatoire" },
      { status: 400 }
    );
  }

  try {
    const result = await adjustWalletAdmin({
      userId,
      amountCents: Math.round(amountEur * 100),
      direction,
      reason: reason.trim(),
      adminUid: admin.uid,
      adminEmail: admin.email,
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
    console.error("[admin/wallet/adjust] erreur:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
