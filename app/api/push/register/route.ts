import { NextResponse } from "next/server";
import { AdminAuthError, requireAuth } from "@/lib/firebase/admin-server";
import { PushRegistrationError, parseRegistration, registerDevice } from "@/lib/push/tokens";

// lot 2.3 : POST /api/push/register { token, platform, app } — appareil de notification
// du compte appelant. Le compte est celui du jeton Firebase ; tout autre champ est ignoré.

export async function POST(request: Request) {
  let auth;
  try {
    auth = await requireAuth(request);
  } catch (err) {
    if (err instanceof AdminAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Erreur d'authentification" }, { status: 500 });
  }
  const reg = parseRegistration(await request.json().catch(() => null));
  if (!reg) {
    return NextResponse.json({ error: "Appareil invalide.", code: "INVALID_DEVICE" }, { status: 400 });
  }
  try {
    await registerDevice(auth.uid, reg);
    return NextResponse.json({ registered: true });
  } catch (err) {
    if (err instanceof PushRegistrationError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    console.error("[push/register] erreur:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
