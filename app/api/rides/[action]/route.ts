import { NextResponse } from "next/server";
import { requireAuth, AdminAuthError } from "@/lib/firebase/admin-server";
import { RideActionError, runRideAction, type RideAction } from "@/lib/rides/actions";

// lot 2.1 : POST /api/rides/{accept|start|complete|release} { bookingId, reason? }.
// Le chauffeur est identifié par son jeton ; toute la logique est dans lib/rides/actions.

const ACTIONS = new Set<RideAction>(["accept", "start", "complete", "release"]);

export async function POST(request: Request, { params }: { params: { action: string } }) {
  if (!ACTIONS.has(params.action as RideAction)) {
    return NextResponse.json({ error: "Action inconnue" }, { status: 404 });
  }
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
    const body = (await request.json().catch(() => ({}))) as { bookingId?: unknown; reason?: unknown };
    const result = await runRideAction(auth.uid, params.action as RideAction, body.bookingId, body.reason);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof RideActionError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error(`[rides/${params.action}] erreur:`, err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
