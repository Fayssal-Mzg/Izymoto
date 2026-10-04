import { NextResponse } from "next/server";
import { requireAuth, AdminAuthError } from "@/lib/firebase/admin-server";
import { acceptInvitation } from "@/lib/company/invitations";
import { WalletError } from "@/lib/wallet/server";

// Accepte une invitation (utilisateur connecté). Body : { token }

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

  const { token } = body || {};
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token manquant" }, { status: 400 });
  }

  try {
    const result = await acceptInvitation({
      token,
      uid: auth.uid,
      email: auth.email,
      emailVerified: auth.emailVerified,
      displayName: null,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof WalletError) {
      const status =
        err.code === "CONFLICT"
          ? 409
          : err.code === "FORBIDDEN" ||
            err.code === "EMAIL_MISMATCH" ||
            err.code === "EMAIL_NOT_VERIFIED"
          ? 403
          : 400;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    console.error("[company/invitation/accept] erreur:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
