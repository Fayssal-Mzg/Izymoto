import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/api/cronAuth";
import { processPushReceipts, purgePushEvents } from "@/lib/push/receipts";

// lot 2.3 : tâche quotidienne (Vercel Cron, voir vercel.json) — relève les accusés
// d'Expo (jetons d'appareil désinscrits) et purge les clés anti-doublon de plus de 30 jours.
// Même protection que /api/cron/deferred-holds : « Authorization: Bearer <CRON_SECRET> ».

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const receipts = await processPushReceipts().catch((err) => {
    console.error("[cron push-receipts] relevé impossible:", err);
    return { checked: 0, removedTokens: 0 };
  });
  const purgedEvents = await purgePushEvents().catch((err) => {
    console.error("[cron push-receipts] purge impossible:", err);
    return 0;
  });
  console.log("[cron push-receipts]", receipts, `clés purgées : ${purgedEvents}`);
  return NextResponse.json({ ...receipts, purgedEvents });
}
