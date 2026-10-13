import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireAdmin, AdminAuthError } from "@/lib/firebase/admin-server";
import { creditCompanyWallet } from "@/lib/wallet/companyServer";
import { WalletError } from "@/lib/wallet/server";

// Crédit manuel admin du solde d'une société (après virement / facture, ou
// geste commercial).
// - Auth : ID token Firebase + isAdmin.
// - Body : { companyId, amountEur, reason, asRecharge?: boolean }
//   asRecharge=true (défaut) → type "recharge" (compte dans le cumul rechargé)
//   asRecharge=false         → type "bonus_adjustment" (crédit offert, hors cumul)

const MAX_CREDIT_EUR = 100000;

export async function POST(request) {
  let admin;
  try {
    admin = await requireAdmin(request);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[admin/company/credit] erreur auth:", err);
    return NextResponse.json({ error: "Erreur d'authentification" }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const { companyId, amountEur, reason, asRecharge = true } = body;

  if (!companyId || typeof companyId !== "string") {
    return NextResponse.json({ error: "companyId manquant" }, { status: 400 });
  }
  if (
    typeof amountEur !== "number" ||
    !Number.isFinite(amountEur) ||
    amountEur <= 0 ||
    amountEur > MAX_CREDIT_EUR
  ) {
    return NextResponse.json(
      { error: `amountEur doit être entre 0 et ${MAX_CREDIT_EUR}€` },
      { status: 400 }
    );
  }
  if (!reason || typeof reason !== "string" || !reason.trim()) {
    return NextResponse.json({ error: "Un motif est obligatoire" }, { status: 400 });
  }

  try {
    const eventId = `admin_company_${randomBytes(12).toString("hex")}`;
    const result = await creditCompanyWallet({
      companyId,
      amountCents: Math.round(amountEur * 100),
      type: asRecharge ? "recharge" : "bonus_adjustment",
      description: reason.trim(),
      eventId,
      adminUid: admin.uid,
      adminEmail: admin.email,
      reason: reason.trim(),
      isRecharge: Boolean(asRecharge),
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof WalletError) {
      const status = err.code === "WALLET_NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    console.error("[admin/company/credit] erreur:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
