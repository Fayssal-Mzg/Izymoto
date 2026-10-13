import { NextResponse } from "next/server";
import { getInvitation } from "@/lib/company/invitations";

// Aperçu public d'une invitation (pour la page d'acceptation).
// Pas d'auth (le token de 192 bits fait office de secret) : ne renvoie que le
// nom de société, l'email cible MASQUÉ (j***@domaine.com) et le statut.

function maskEmail(email) {
  if (typeof email !== "string" || !email.includes("@")) return "";
  const [local, domain] = email.split("@");
  return `${local.slice(0, 1)}***@${domain}`;
}

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
    return NextResponse.json({
      invitation: { ...invitation, email: maskEmail(invitation.email) },
    });
  } catch (err) {
    console.error("[company/invitation/preview] erreur:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
