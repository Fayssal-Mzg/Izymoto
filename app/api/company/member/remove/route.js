import { NextResponse } from "next/server";
import { requireAuth, AdminAuthError } from "@/lib/firebase/admin-server";
import { removeCompanyMember } from "@/lib/wallet/companyServer";
import { WalletError } from "@/lib/wallet/server";

// Retire un collaborateur de la société (owner uniquement). Body : { memberUid }

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

  const { memberUid } = body || {};
  if (!memberUid || typeof memberUid !== "string") {
    return NextResponse.json({ error: "memberUid manquant" }, { status: 400 });
  }

  try {
    const { sessionsRevoked } = await removeCompanyMember({
      ownerUid: auth.uid,
      memberUid,
    });
    return NextResponse.json({ ok: true, sessionsRevoked });
  } catch (err) {
    if (err instanceof WalletError) {
      const status =
        err.code === "FORBIDDEN" ? 403 : err.code === "WALLET_NOT_FOUND" ? 404 : err.code === "CONFLICT" ? 409 : 400;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    console.error("[company/member/remove] erreur:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
