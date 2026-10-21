import { NextResponse } from "next/server";
import { requireRecentAuth, AdminAuthError, getAdminFirestore } from "@/lib/firebase/admin-server";
import { AccountDeletionError, deleteAccount } from "@/lib/account/deleteAccount";

// lot 2.2 : POST /api/account/delete — suppression complète de SON compte.
// Le compte est celui du jeton (jamais un uid du corps) ; connexion de moins de
// 5 minutes exigée : l'écran redemande le mot de passe ou la connexion Google/Apple.

export async function POST(request: Request) {
  let auth;
  try {
    auth = await requireRecentAuth(request);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      const code =
        err.message === "Reconnexion requise" ? "RECENT_LOGIN_REQUIRED" : err.status === 401 ? "UNAUTHENTICATED" : "UNAVAILABLE";
      return NextResponse.json({ error: err.message, code }, { status: err.status });
    }
    return NextResponse.json({ error: "Erreur d'authentification" }, { status: 500 });
  }
  // Un compte administrateur ne se supprime pas lui-même (évite de perdre le dernier admin).
  if ((await getAdminFirestore().collection("users").doc(auth.uid).get()).data()?.isAdmin === true) {
    return NextResponse.json(
      { error: "Un compte administrateur ne peut pas être supprimé depuis cet écran : contactez un autre administrateur.", code: "ADMIN_ACCOUNT" },
      { status: 409 }
    );
  }
  try {
    await deleteAccount(auth.uid, { uid: auth.uid, role: "self" });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (err instanceof AccountDeletionError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("[account/delete] erreur:", err);
    return NextResponse.json({ error: "La suppression n'a pas pu aboutir. Réessayez ou contactez-nous." }, { status: 500 });
  }
}
