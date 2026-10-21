import { Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin-server";
import { EXPO_RECEIPTS_URL, expoHeaders } from "@/lib/push/send";
import { PUSH_EVENTS, PUSH_RECEIPTS, removeTokenByHash } from "@/lib/push/tokens";

// Tâche quotidienne (lot 2.3) : accusés différés d'Expo (jetons désinscrits) et purge
// des clés anti-doublon de plus de 30 jours.

const MIN_AGE_MS = 15 * 60 * 1000; // Expo : accusés disponibles après ~15 minutes
const MAX_AGE_MS = 2 * 24 * 60 * 60 * 1000; // au-delà, un accusé jamais publié est abandonné
const EVENTS_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const PAGE = 1000; // limite d'Expo par appel getReceipts
const FETCH_TIMEOUT_MS = 10000;

interface ExpoReceipt {
  status?: string;
  details?: { error?: string };
}

export async function processPushReceipts(now: Date = new Date()): Promise<{ checked: number; removedTokens: number }> {
  const db = getAdminFirestore();
  const result = { checked: 0, removedTokens: 0 };
  const headers = expoHeaders();
  if (!headers) return result;

  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  for (let page = 0; page < 10; page += 1) {
    let q = db
      .collection(PUSH_RECEIPTS)
      .where("createdAt", "<=", Timestamp.fromMillis(now.getTime() - MIN_AGE_MS))
      .orderBy("createdAt")
      .limit(PAGE);
    if (cursor) q = q.startAfter(cursor);
    const snap = await q.get();
    if (snap.empty) break;
    cursor = snap.docs[snap.docs.length - 1];

    let receipts: Record<string, ExpoReceipt> = {};
    try {
      const res = await fetch(EXPO_RECEIPTS_URL, {
        method: "POST",
        headers,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        body: JSON.stringify({ ids: snap.docs.map((d) => d.id) }),
      });
      if (!res.ok) throw new Error(`Expo a répondu ${res.status}`);
      receipts = ((await res.json()) as { data?: Record<string, ExpoReceipt> }).data ?? {};
    } catch (err) {
      console.error("[push-receipts] relevé des accusés impossible:", err instanceof Error ? err.message : err);
      break;
    }

    for (const d of snap.docs) {
      const receipt = receipts[d.id];
      const age = now.getTime() - (d.data().createdAt?.toMillis?.() ?? 0);
      if (!receipt && age < MAX_AGE_MS) continue;
      result.checked += 1;
      if (receipt?.details?.error === "DeviceNotRegistered" && typeof d.data().tokenHash === "string") {
        await removeTokenByHash(d.data().tokenHash).catch((err) => console.error("[push-receipts] jeton non retiré:", err));
        result.removedTokens += 1;
      }
      await d.ref.delete();
    }
    if (snap.size < PAGE) break;
  }
  return result;
}

export async function purgePushEvents(now: Date = new Date()): Promise<number> {
  const db = getAdminFirestore();
  const cutoff = Timestamp.fromMillis(now.getTime() - EVENTS_RETENTION_MS);
  let purged = 0;
  for (;;) {
    const snap = await db.collection(PUSH_EVENTS).where("createdAt", "<", cutoff).limit(400).get();
    if (snap.empty) break;
    const batch = db.batch();
    for (const d of snap.docs) batch.delete(d.ref);
    await batch.commit();
    purged += snap.size;
  }
  return purged;
}
