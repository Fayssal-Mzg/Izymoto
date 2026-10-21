import { NextResponse } from "next/server";
import { requireRecentAuth, AdminAuthError, getAdminFirestore } from "@/lib/firebase/admin-server";
import { AccountDeletionError, deleteAccount } from "@/lib/account/deleteAccount";

// lot 2.2 : POST /api/admin/user/delete { uid } — suppression complète d'un compte
// par l'admin (demande RGPD reçue par e-mail). Mêmes refus et même pseudonymisation
// que « Supprimer mon compte ». Action irréversible : connexion récente exigée ;
// jamais un autre administrateur, ni l'admin lui-même.

const UID_RE = /^[A-Za-z0-9_-]{1,128}$/;

export async function POST(request: Request) {
  let admin;
  try {
    admin = await requireRecentAuth(request);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      const code = err.message === "Reconnexion requise" ? "RECENT_LOGIN_REQUIRED" : undefined;
      return NextResponse.json({ error: err.message, ...(code ? { code } : {}) }, { status: err.status });
    }
    return NextResponse.json({ error: "Erreur d'authentification" }, { status: 500 });
  }
  const db = getAdminFirestore();
  if ((await db.collection("users").doc(admin.uid).get()).data()?.isAdmin !== true) {
    return NextResponse.json({ error: "Accès admin requis" }, { status: 403 });
  }
  const { uid } = (await request.json().catch(() => ({}))) as { uid?: unknown };
  if (typeof uid !== "string" || !UID_RE.test(uid) || uid.startsWith("supprime_")) {
    return NextResponse.json({ error: "Utilisateur invalide" }, { status: 400 });
  }
  if (uid === admin.uid) {
    return NextResponse.json({ error: "Un administrateur ne peut pas supprimer son propre compte ici." }, { status: 400 });
  }
  if ((await db.collection("users").doc(uid).get()).data()?.isAdmin === true) {
    return NextResponse.json({ error: "Retirez d'abord les droits d'administrateur de ce compte." }, { status: 409 });
  }
  try {
    await deleteAccount(uid, { uid: admin.uid, role: "admin" });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (err instanceof AccountDeletionError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("[admin/user/delete] erreur:", err);
    return NextResponse.json({ error: "Suppression impossible" }, { status: 500 });
  }
}
