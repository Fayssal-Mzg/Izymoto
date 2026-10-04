import { NextResponse } from "next/server";
import { requireAuth, AdminAuthError } from "@/lib/firebase/admin-server";
import { adjustCompanyMemberBudget } from "@/lib/wallet/companyServer";
import { WalletError } from "@/lib/wallet/server";

// Modifie le budget mensuel d'un collaborateur (owner uniquement).
// Body : { memberUid, monthlyBudgetEur }  (0 = illimité)

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

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const { memberUid, monthlyBudgetEur } = body || {};
  if (!memberUid || typeof memberUid !== "string") {
    return NextResponse.json({ error: "memberUid manquant" }, { status: 400 });
  }
  if (typeof monthlyBudgetEur !== "number" || !Number.isFinite(monthlyBudgetEur) || monthlyBudgetEur < 0) {
    return NextResponse.json({ error: "Budget invalide" }, { status: 400 });
  }

  try {
    await adjustCompanyMemberBudget({
      ownerUid: auth.uid,
      memberUid,
      monthlyBudgetCents: Math.round(monthlyBudgetEur * 100),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof WalletError) {
      const status = err.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    console.error("[company/member/budget] erreur:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
