import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/api/cronAuth";
import {
  cleanupCancelledDeferredHolds,
  dueDeferredHolds,
  placeDeferredHold,
  type HoldOutcome,
} from "@/lib/payments/deferredHold";
import { reconcileRidePool } from "@/lib/rides/pool";

// lot 1.1 : tâche quotidienne (Vercel Cron, voir vercel.json) qui pose les empreintes
// des courses enregistrées avec une carte dont le départ approche, relance celles
// refusées la veille, puis annule les paiements restés ouverts sur des courses annulées.
// lot 2.1 : réconcilie aussi le pool des chauffeurs (ridePool) avec les réservations.
// Vercel envoie « Authorization: Bearer <CRON_SECRET> » ; tout autre appel est refusé.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  // Lancement manuel (mise en production) : ?mode=pool ne fait QUE la réconciliation
  // du pool, sans toucher aux empreintes ; &backfill=1 reprend aussi l'historique
  // des chauffeurs (une seule fois, après le déploiement du lot 2.1).
  const params = new URL(request.url).searchParams;
  const backfillHistory = params.get("backfill") === "1";
  if (params.get("mode") === "pool") {
    const pool = await reconcileRidePool({ backfillHistory });
    return NextResponse.json({ mode: "pool", pool });
  }

  const now = new Date();
  // Chaque étape est isolée : une panne de l'une n'empêche pas les suivantes.
  const ids = await dueDeferredHolds(now).catch((err) => {
    console.error("[cron deferred-holds] lecture des empreintes dues impossible:", err);
    return [] as string[];
  });
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
  const holdsCleaned = await cleanupCancelledDeferredHolds().catch((err) => {
    console.error("[cron deferred-holds] nettoyage impossible:", err);
    return 0;
  });
  const pool = await reconcileRidePool({ backfillHistory }).catch((err) => {
    console.error("[cron deferred-holds] réconciliation du pool impossible:", err);
    return { added: 0, removed: 0 };
  });
  console.log(`[cron deferred-holds] ${ids.length} réservation(s) :`, counts, `courses annulées nettoyées : ${holdsCleaned}`, "pool :", pool);
  return NextResponse.json({ processed: ids.length, ...counts, holdsCleaned, pool });
}
