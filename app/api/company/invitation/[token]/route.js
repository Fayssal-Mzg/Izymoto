import { NextResponse } from "next/server";
import { getInvitation } from "@/lib/company/invitations";

// Aperçu public d'une invitation (pour la page d'acceptation).
// Pas d'auth : ne renvoie que le nom de société + email cible + statut.

export async function GET(_request, { params }) {
  const token = params?.token;
  if (!token) {
    return NextResponse.json({ error: "Token manquant" }, { status: 400 });
  }
  try {
    const invitation = await getInvitation(token);
    if (!invitation) {
      return NextResponse.json({ invitation: null }, { status: 404 });
    }
    return NextResponse.json({ invitation });
  } catch (err) {
    console.error("[company/invitation/preview] erreur:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
