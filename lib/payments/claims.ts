import { randomUUID } from "node:crypto";
import { Timestamp, type Transaction } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin-server";

// Verrou par PaymentIntent (collection `paymentClaims`, Admin SDK uniquement).
// Un PaymentIntent ne donne lieu qu'à UNE finalisation : seule la requête qui détient
// le verrou (requestId) peut créer la réservation OU libérer l'empreinte. Une requête
// concurrente reçoit « in_progress » sans effet ; un verrou « rejected » interdit toute
// création ultérieure ; un verrou « done » rend la finalisation idempotente.

const CLAIMS = "paymentClaims";
// Un verrou « finalizing » plus vieux que ce délai (requête morte) peut être repris.
// Le détenteur d'origine perd alors son droit : chaque écriture revérifie requestId.
const LEASE_MS = 2 * 60 * 1000;

export const PAYMENT_INTENT_ID_RE = /^pi_[A-Za-z0-9]+$/;

export type ClaimState = "finalizing" | "done" | "rejected";

export interface ClaimDoc {
  userId: string;
  kind: "card" | "hybrid";
  state: ClaimState;
  requestId: string;
  bookingId?: string;
  reservationId?: string;
  leaseUntil: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ClaimResult =
  | { kind: "acquired"; requestId: string }
  | { kind: "done"; bookingId: string; reservationId: string }
  | { kind: "in_progress" }
  | { kind: "rejected" }
  | { kind: "forbidden" };

const claimRef = (paymentIntentId: string) =>
  getAdminFirestore().collection(CLAIMS).doc(paymentIntentId);

export async function acquireClaim(
  paymentIntentId: string,
  userId: string,
  kind: "card" | "hybrid"
): Promise<ClaimResult> {
  const db = getAdminFirestore();
  const ref = claimRef(paymentIntentId);
  const requestId = randomUUID();
  return db.runTransaction(async (tx: Transaction): Promise<ClaimResult> => {
    const snap = await tx.get(ref);
    const now = Timestamp.now();
    const fresh = {
      userId,
      kind,
      state: "finalizing" as ClaimState,
      requestId,
      leaseUntil: Timestamp.fromMillis(now.toMillis() + LEASE_MS),
      createdAt: now,
      updatedAt: now,
    };
    if (!snap.exists) {
      tx.create(ref, fresh);
      return { kind: "acquired", requestId };
    }
    const c = snap.data() as ClaimDoc;
    if (c.userId !== userId || c.kind !== kind) return { kind: "forbidden" };
    if (c.state === "done") {
      return { kind: "done", bookingId: c.bookingId ?? "", reservationId: c.reservationId ?? "" };
    }
    if (c.state === "rejected") return { kind: "rejected" };
    if (c.leaseUntil.toMillis() > now.toMillis()) return { kind: "in_progress" };
    tx.update(ref, { requestId, leaseUntil: fresh.leaseUntil, updatedAt: now });
    return { kind: "acquired", requestId };
  });
}

// Passe le verrou à « rejected » (uniquement par son détenteur). Renvoie true si le
// détenteur a bien posé le rejet : lui seul peut alors libérer l'empreinte.
export async function rejectClaim(paymentIntentId: string, requestId: string): Promise<boolean> {
  const db = getAdminFirestore();
  const ref = claimRef(paymentIntentId);
  return db.runTransaction(async (tx: Transaction) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return false;
    const c = snap.data() as ClaimDoc;
    if (c.requestId !== requestId || c.state !== "finalizing") return false;
    tx.update(ref, { state: "rejected", updatedAt: Timestamp.now() });
    return true;
  });
}

// Marque le verrou « done » (réservation créée ailleurs, ex. transaction du portefeuille).
export async function completeClaim(
  paymentIntentId: string,
  requestId: string,
  result: { bookingId: string; reservationId: string }
): Promise<void> {
  await claimRef(paymentIntentId).update({
    state: "done",
    bookingId: result.bookingId,
    reservationId: result.reservationId,
    updatedAt: Timestamp.now(),
  });
}

// Revérifie dans une transaction que `requestId` détient encore le verrou, puis laisse
// l'appelant écrire (réservation) et marque « done » dans la MÊME transaction.
export async function finishClaimInTransaction<T>(
  paymentIntentId: string,
  requestId: string,
  work: (tx: Transaction) => Promise<{ result: T; bookingId: string; reservationId: string } | null>
): Promise<{ ok: true; result: T } | { ok: false }> {
  const db = getAdminFirestore();
  const ref = claimRef(paymentIntentId);
  return db.runTransaction(async (tx: Transaction) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { ok: false as const };
    const c = snap.data() as ClaimDoc;
    if (c.requestId !== requestId || c.state !== "finalizing") return { ok: false as const };
    const out = await work(tx);
    if (!out) return { ok: false as const };
    tx.update(ref, {
      state: "done",
      bookingId: out.bookingId,
      reservationId: out.reservationId,
      updatedAt: Timestamp.now(),
    });
    return { ok: true as const, result: out.result };
  });
}

// Lecture seule (rejeu après capture/annulation : le PaymentIntent n'est plus en
// requires_capture mais une finalisation réussie reste restituable à son propriétaire).
export async function readClaim(paymentIntentId: string): Promise<ClaimDoc | null> {
  const snap = await claimRef(paymentIntentId).get();
  return snap.exists ? (snap.data() as ClaimDoc) : null;
}

// Libère le verrou sans rejeter (échec transitoire, prix affiché périmé...) pour
// permettre une nouvelle tentative. Sans effet si l'appelant n'est plus détenteur.
export async function abandonClaim(paymentIntentId: string, requestId: string): Promise<void> {
  const db = getAdminFirestore();
  const ref = claimRef(paymentIntentId);
  await db.runTransaction(async (tx: Transaction) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const c = snap.data() as ClaimDoc;
    if (c.requestId === requestId && c.state === "finalizing") tx.delete(ref);
  });
}
