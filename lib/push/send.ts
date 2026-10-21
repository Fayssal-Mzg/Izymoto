import { Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin-server";
import { PUSH_RECEIPTS, devicesForUids, removeTokenByHash, type PushApp, type PushTarget } from "@/lib/push/tokens";

// Envoi vers l'API HTTP d'Expo (lot 2.3, D-017) : Android (FCM) et iPhone (APNs).
// `sendPush` ne lève JAMAIS d'exception : une panne d'Expo ne doit changer la réponse
// d'aucune route. À appeler après la validation de la transaction, jamais dedans.

export const EXPO_SEND_URL = "https://exp.host/--/api/v2/push/send";
export const EXPO_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts";
export const EXPO_BATCH_SIZE = 100;
export const EXPO_TIMEOUT_MS = 3000;

export interface PushMessage {
  title: string;
  body: string;
  // Données techniques seulement : jamais d'information personnelle.
  data: { type: string; bookingId: string };
}

export interface PushSummary {
  attempted: number;
  accepted: number;
  removed: number;
  failed: boolean;
  // Une réponse HTTP 2xx d'Expo est arrivée (même si sa lecture a échoué) : l'envoi a peut-être eu lieu.
  responded: boolean;
}

interface ExpoTicket {
  status?: string;
  id?: string;
  details?: { error?: string };
}

export function expoHeaders(): Record<string, string> | null {
  const token = process.env.EXPO_ACCESS_TOKEN;
  if (!token && process.env.NODE_ENV === "production") {
    console.error("[push] EXPO_ACCESS_TOKEN absent en production : aucune notification envoyée.");
    return null;
  }
  return {
    accept: "application/json",
    "content-type": "application/json",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

export async function sendPush(uids: string[], app: PushApp, message: PushMessage): Promise<PushSummary> {
  const summary: PushSummary = { attempted: 0, accepted: 0, removed: 0, failed: false, responded: false };
  const timer = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    if (uids.length === 0) return summary;
    const headers = expoHeaders();
    if (!headers) return { ...summary, failed: true };
    const targets = await devicesForUids(uids, app);
    summary.attempted = targets.length;
    if (targets.length === 0) return summary;

    // Le délai de 3 s ne court que pour les appels vers Expo : une lecture Firestore lente
    // ne doit pas annuler l'envoi.
    timeout = setTimeout(() => timer.abort(), EXPO_TIMEOUT_MS);
    const batches: PushTarget[][] = [];
    for (let i = 0; i < targets.length; i += EXPO_BATCH_SIZE) batches.push(targets.slice(i, i + EXPO_BATCH_SIZE));
    await Promise.all(
      batches.map(async (batch) => {
        try {
          const res = await fetch(EXPO_SEND_URL, {
            method: "POST",
            headers,
            signal: timer.signal,
            body: JSON.stringify(
              batch.map((t) => ({ to: t.token, title: message.title, body: message.body, data: message.data, sound: "default", priority: "high" }))
            ),
          });
          if (!res.ok) throw new Error(`Expo a répondu ${res.status}`);
          summary.responded = true;
          const tickets = ((await res.json()) as { data?: ExpoTicket[] }).data ?? [];
          await handleTickets(batch, tickets, summary);
        } catch (err) {
          summary.failed = true;
          console.error("[push] envoi vers Expo impossible:", err instanceof Error ? err.message : err);
        }
      })
    );
  } catch (err) {
    summary.failed = true;
    console.error("[push] envoi impossible:", err instanceof Error ? err.message : err);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
  return summary;
}

async function handleTickets(batch: PushTarget[], tickets: ExpoTicket[], summary: PushSummary) {
  const receipts: Array<{ id: string; hash: string }> = [];
  for (let i = 0; i < batch.length; i += 1) {
    const ticket = tickets[i];
    if (!ticket) continue;
    if (ticket.status === "ok") {
      summary.accepted += 1;
      if (ticket.id) receipts.push({ id: ticket.id, hash: batch[i].hash });
    } else if (ticket.details?.error === "DeviceNotRegistered") {
      await removeTokenByHash(batch[i].hash).catch((err) => console.error("[push] jeton non retiré:", err));
      summary.removed += 1;
    }
  }
  if (receipts.length > 0) {
    const db = getAdminFirestore();
    const wb = db.batch();
    for (const r of receipts) wb.set(db.collection(PUSH_RECEIPTS).doc(r.id), { tokenHash: r.hash, createdAt: Timestamp.now() });
    await wb.commit().catch((err) => console.error("[push] accusés non enregistrés:", err));
  }
}
