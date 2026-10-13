import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  cleanupCancelledDeferredHolds,
  dueDeferredHolds,
  placeDeferredHold,
  type HoldOutcome,
} from "@/lib/payments/deferredHold";

// lot 1.1 : tâche quotidienne (Vercel Cron, voir vercel.json) qui pose les empreintes
// des courses enregistrées avec une carte dont le départ approche, relance celles
// refusées la veille, puis annule les paiements restés ouverts sur des courses annulées.
// Vercel envoie « Authorization: Bearer <CRON_SECRET> » ; tout autre appel est refusé.

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const now = new Date();
  const ids = await dueDeferredHolds(now);
  const counts: Record<HoldOutcome, number> = {
    authorized: 0,
    action_required: 0,
    retry: 0,
    skipped: 0,
    released: 0,
  };
  // Séquentiel : quelques courses par jour, et un échec n'arrête pas les suivantes.
  for (const id of ids) {
    try {
      counts[await placeDeferredHold(id, now)] += 1;
    } catch (err) {
      console.error(`[cron deferred-holds] échec pour ${id}:`, err);
      counts.retry += 1;
    }
  }
  const holdsCleaned = await cleanupCancelledDeferredHolds();
  console.log(`[cron deferred-holds] ${ids.length} réservation(s) :`, counts, `courses annulées nettoyées : ${holdsCleaned}`);
  return NextResponse.json({ processed: ids.length, ...counts, holdsCleaned });
}
