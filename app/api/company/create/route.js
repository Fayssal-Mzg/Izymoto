import { NextResponse } from "next/server";
import { requireAuth, AdminAuthError } from "@/lib/firebase/admin-server";
import { createCompany } from "@/lib/wallet/companyServer";
import { WalletError } from "@/lib/wallet/server";

// Crée une société pour l'utilisateur connecté (qui en devient owner).
// Body : { name, billingEmail?, siret?, address? }

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

  const { name, billingEmail, siret, address } = body || {};
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Le nom de la société est requis" }, { status: 400 });
  }

  try {
    const result = await createCompany({
      ownerUid: auth.uid,
      ownerEmail: auth.email,
      ownerDisplayName: null,
      name,
      billingEmail: billingEmail ?? auth.email,
      siret,
      address,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof WalletError) {
      const status = err.code === "CONFLICT" ? 409 : 400;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    console.error("[company/create] erreur:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
