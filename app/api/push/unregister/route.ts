import { NextResponse } from "next/server";
import { AdminAuthError, requireAuth } from "@/lib/firebase/admin-server";
import { isExpoPushToken, unregisterDevice } from "@/lib/push/tokens";

// lot 2.3 : POST /api/push/unregister { token } — retire l'appareil du compte appelant
// (déconnexion dans l'appli). Un jeton rattaché à un autre compte n'est jamais touché.

export async function POST(request: Request) {
  let auth;
  try {
    auth = await requireAuth(request);
  } catch (err) {
    if (err instanceof AdminAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Erreur d'authentification" }, { status: 500 });
  }
  const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
  if (!isExpoPushToken(body?.token)) {
    return NextResponse.json({ error: "Appareil invalide.", code: "INVALID_DEVICE" }, { status: 400 });
  }
  try {
    await unregisterDevice(auth.uid, body!.token as string);
    return NextResponse.json({ unregistered: true });
  } catch (err) {
    console.error("[push/unregister] erreur:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
