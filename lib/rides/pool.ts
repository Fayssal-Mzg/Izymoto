import { Timestamp, type DocumentData, type Transaction } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin-server";
import { identifierZone } from "@/lib/pricing";

// Pool des courses à prendre (lot 2.1, fin de l'écart D-010).
// `ridePool/{bookingId}` est une copie RÉDUITE de la course, écrite uniquement par le
// serveur et lue par les chauffeurs validés en service. Elle ne contient aucune
// donnée personnelle du passager : ni nom, ni téléphone, ni e-mail, ni adresse
// exacte, ni notes — seulement la zone de départ et d'arrivée.

export const COMMISSION_RATE = 0.2;
export const RIDE_POOL = "ridePool";

const POLE_LABELS: Record<string, string> = {
  roissy: "Aéroport Roissy-CDG",
  orly: "Aéroport d'Orly",
  leBourget: "Aéroport du Bourget",
  beauvais: "Aéroport de Beauvais",
  disneyland: "Disneyland Paris",
  laDefense: "La Défense",
};

// Départements : table FERMÉE. Aucun texte saisi par le passager n'est jamais
// recopié dans le pool (l'adresse est libre : rue, nom, téléphone pourraient y figurer).
const DEPARTEMENTS: Record<string, string> = {
  "60": "Oise (60)",
  "77": "Seine-et-Marne (77)",
  "78": "Yvelines (78)",
  "91": "Essonne (91)",
  "92": "Hauts-de-Seine (92)",
  "93": "Seine-Saint-Denis (93)",
  "94": "Val-de-Marne (94)",
  "95": "Val-d'Oise (95)",
};

// Libellé de zone d'une adresse : pôle, arrondissement de Paris ou département.
// Construit uniquement à partir du code postal et de tables fixes.
export function zoneLabel(address: unknown): string {
  if (typeof address !== "string" || !address.trim()) return "Zone non précisée";
  const zone = identifierZone(address);
  if (zone && POLE_LABELS[zone]) return POLE_LABELS[zone];
  const cps = address.match(/\b\d{5}\b/g) ?? [];
  if (cps.length !== 1) return "Zone non précisée";
  const cp = cps[0];
  if (cp.startsWith("75")) {
    // 75116 = Paris 16e (partie nord) ; sinon 750XX = arrondissement XX.
    const arr = cp === "75116" ? 16 : Number(cp.slice(3));
    if (arr >= 1 && arr <= 20) return `Paris ${arr === 1 ? "1er" : `${arr}e`}`;
    return "Paris";
  }
  return DEPARTEMENTS[cp.slice(0, 2)] ?? "Hors Île-de-France";
}

// Date de la course en Timestamp (les courses portefeuille l'enregistrent en texte ISO).
export function asTimestamp(value: unknown): Timestamp | null {
  if (value instanceof Timestamp) return value;
  if (typeof value === "string" || value instanceof Date) {
    const d = new Date(value as string);
    return Number.isNaN(d.getTime()) ? null : Timestamp.fromDate(d);
  }
  return null;
}

// Téléphone ramené à ses 9 derniers chiffres (+33 6…, 06…, 0033 6… comparables).
export const phoneKey = (v: unknown): string | null => {
  const digits = typeof v === "string" ? v.replace(/\D/g, "") : "";
  return digits.length >= 9 ? digits.slice(-9) : null;
};

// Une course est « à prendre » si elle attend un chauffeur, n'en a pas, et que son
// paiement n'est ni échoué ni libéré.
export function isPoolEligible(b: DocumentData | undefined): boolean {
  return (
    !!b &&
    b.status === "awaiting_driver" &&
    !b.driverId &&
    b.paymentStatus !== "failed" &&
    b.paymentStatus !== "released"
  );
}

export function sharesFor(prix: unknown): { platformShareCents: number; driverShareCents: number } {
  const totalCents = Math.round(Number(prix ?? 0) * 100);
  const platformShareCents = Math.round(totalCents * COMMISSION_RATE);
  return { platformShareCents, driverShareCents: totalCents - platformShareCents };
}

// Entrée du pool : liste blanche explicite des champs exposés aux chauffeurs.
export function poolEntryFor(bookingId: string, b: DocumentData) {
  return {
    bookingId,
    reservationId: typeof b.reservationId === "string" ? b.reservationId : bookingId.slice(0, 8),
    departZone: zoneLabel(b.depart),
    arriveeZone: zoneLabel(b.arrivee),
    reservationDate: asTimestamp(b.reservationDate),
    createdAt: asTimestamp(b.createdAt) ?? Timestamp.now(),
    distance: typeof b.distance === "number" ? b.distance : null,
    duree: typeof b.duree === "number" ? b.duree : null,
    prix: Number(b.prix ?? 0),
    driverShareCents: sharesFor(b.prix).driverShareCents,
    prioriteReservation: b.prioriteReservation === true,
    updatedAt: Timestamp.now(),
  };
}

// À appeler dans la transaction qui modifie la course, avec son état FINAL.
export function syncRidePoolInTx(tx: Transaction, bookingId: string, finalBooking: DocumentData | undefined) {
  const ref = getAdminFirestore().collection(RIDE_POOL).doc(bookingId);
  if (isPoolEligible(finalBooking)) tx.set(ref, poolEntryFor(bookingId, finalBooking!));
  else tx.delete(ref);
}

// Historique du chauffeur (`driverRides/{driverUid}/rides/{bookingId}`) : copie
// réduite écrite par le serveur. Le chauffeur ne lit la réservation complète
// (téléphone, adresse exacte) que pendant la course ; ensuite, seulement ceci.
export const DRIVER_RIDES = "driverRides";

export function driverHistoryEntryFor(bookingId: string, b: DocumentData) {
  return {
    bookingId,
    reservationId: typeof b.reservationId === "string" ? b.reservationId : bookingId.slice(0, 8),
    departZone: zoneLabel(b.depart),
    arriveeZone: zoneLabel(b.arrivee),
    reservationDate: asTimestamp(b.reservationDate),
    createdAt: asTimestamp(b.createdAt) ?? Timestamp.now(),
    status: typeof b.status === "string" ? b.status : "",
    paymentStatus: typeof b.paymentStatus === "string" ? b.paymentStatus : null,
    prix: Number(b.prix ?? 0),
    driverShareCents: typeof b.driverShareCents === "number" ? b.driverShareCents : sharesFor(b.prix).driverShareCents,
    updatedAt: Timestamp.now(),
  };
}

// À appeler dans la transaction qui modifie la course : retire l'entrée de l'ancien
// chauffeur (libération, réattribution) et écrit celle du chauffeur actuel.
export function syncDriverHistoryInTx(
  tx: Transaction,
  bookingId: string,
  before: DocumentData | undefined,
  after: DocumentData | undefined
) {
  const db = getAdminFirestore();
  const previous = typeof before?.driverId === "string" ? before.driverId : null;
  const current = typeof after?.driverId === "string" ? after.driverId : null;
  if (previous && previous !== current) {
    tx.delete(db.collection(DRIVER_RIDES).doc(previous).collection("rides").doc(bookingId));
  }
  if (current && after) {
    tx.set(db.collection(DRIVER_RIDES).doc(current).collection("rides").doc(bookingId), driverHistoryEntryFor(bookingId, after));
  }
}

// Pour les écritures hors transaction (webhook, finalisations) : relit la course et
// met le pool et l'historique du chauffeur à jour de façon atomique.
export async function refreshRidePool(bookingId: string): Promise<void> {
  const db = getAdminFirestore();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(db.collection("bookings").doc(bookingId));
    syncRidePoolInTx(tx, bookingId, snap.data());
    syncDriverHistoryInTx(tx, bookingId, undefined, snap.data());
  });
}

// Variante qui n'échoue jamais : la course et le paiement priment ; un écart du
// pool est rattrapé par reconcileRidePool (tâche quotidienne).
export async function refreshRidePoolSafe(...bookingIds: Array<string | null | undefined>): Promise<void> {
  for (const id of bookingIds) {
    if (!id) continue;
    try {
      await refreshRidePool(id);
    } catch (err) {
      console.error(`[ridePool] synchronisation impossible pour ${id}:`, err);
    }
  }
}

// Filet de sécurité (tâche quotidienne) : ajoute les courses à prendre absentes du
// pool et retire les entrées dont la course n'est plus à prendre.
export async function reconcileRidePool(
  { backfillHistory = false }: { backfillHistory?: boolean } = {}
): Promise<{ added: number; removed: number }> {
  const db = getAdminFirestore();
  const [waiting, pool] = await Promise.all([
    db.collection("bookings").where("status", "==", "awaiting_driver").get(),
    db.collection(RIDE_POOL).get(),
  ]);
  const eligible = new Set(waiting.docs.filter((d) => isPoolEligible(d.data())).map((d) => d.id));
  const inPool = new Set(pool.docs.map((d) => d.id));
  let added = 0;
  let removed = 0;
  for (const id of eligible) if (!inPool.has(id)) { await refreshRidePool(id); added += 1; }
  for (const id of inPool) if (!eligible.has(id)) { await refreshRidePool(id); removed += 1; }
  // Reprise de l'historique des chauffeurs (courses attribuées avant le lot 2.1) :
  // uniquement à la demande (une fois après la mise en production), pas chaque jour.
  if (backfillHistory) {
    const assigned = await db.collection("bookings").where("driverId", "!=", null).get();
    for (const d of assigned.docs) {
      const existing = await db.collection(DRIVER_RIDES).doc(d.data().driverId).collection("rides").doc(d.id).get();
      if (!existing.exists) await refreshRidePool(d.id);
    }
  }
  return { added, removed };
}
