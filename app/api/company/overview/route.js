import { NextResponse } from "next/server";
import { requireAuth, AdminAuthError } from "@/lib/firebase/admin-server";
import { getCompanyOverview } from "@/lib/wallet/companyServer";

// Vue de l'espace entreprise pour l'utilisateur connecté.
// Retourne null (200, { company: null }) s'il n'appartient à aucune société.

export async function GET(request) {
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
    const overview = await getCompanyOverview(auth.uid);
    return NextResponse.json({ company: overview });
  } catch (err) {
    console.error("[company/overview] erreur:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
