// lib/firebase/dispatch.ts
// Pool de courses FCFS sans géolocalisation (côté navigateur).
//
// Flow (lot 2.1) :
// 1. Le serveur crée la course et, quand elle attend un chauffeur, en publie une
//    version SANS données personnelles dans `ridePool/{bookingId}` (zone de départ et
//    d'arrivée, date, prix, part chauffeur).
// 2. Les chauffeurs validés en service lisent `ridePool` en temps réel.
// 3. Accepter / démarrer / terminer / libérer passent par /api/rides/* : le serveur
//    vérifie le chauffeur, verrouille la course (premier qui accepte) et met le pool à jour.
//    L'adresse exacte et le téléphone du passager ne sont lisibles qu'après acceptation.

import { db } from "@/lib/firebaseConfig";
import { getAuth } from "firebase/auth";
import { collection, query, where, onSnapshot, Unsubscribe, orderBy } from "firebase/firestore";

export const COMMISSION_RATE = 0.2;

export interface PoolRide {
  id: string;
  reservationId: string;
  departZone: string;
  arriveeZone: string;
  distance: number;
  duree: number;
  prix: number;
  driverShareCents: number;
  prioriteReservation: boolean;
  reservationDate: Date | null;
  createdAt: Date | null;
}

function coerceDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "object" && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }
  return null;
}

function hydrateRide(id: string, data: any): PoolRide {
  const prix = Number(data.prix ?? 0);
  return {
    id,
    reservationId: data.reservationId ?? id.substring(0, 6),
    departZone: data.departZone ?? "",
    arriveeZone: data.arriveeZone ?? "",
    distance: data.distance ?? 0,
    duree: data.duree ?? 0,
    prix,
    driverShareCents:
      typeof data.driverShareCents === "number"
        ? data.driverShareCents
        : Math.round(prix * 100 * (1 - COMMISSION_RATE)),
    prioriteReservation: data.prioriteReservation === true,
    reservationDate: coerceDate(data.reservationDate),
    createdAt: coerceDate(data.createdAt),
  };
}

// Pool partagé : courses à prendre, version réduite écrite par le serveur.
export function subscribePool(
  onUpdate: (rides: PoolRide[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, "ridePool"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => onUpdate(snap.docs.map((d) => hydrateRide(d.id, d.data()))),
    (err) => {
      console.error("[dispatch] subscribePool error:", err);
      onError?.(err);
    }
  );
}

// Courses d'un chauffeur. Deux sources (lot 2.1, « Qui voit quoi ») :
// - courses EN COURS (assigned / in_progress) : réservation complète dans `bookings`
//   (adresse exacte, téléphone du passager) ;
// - historique : copie réduite `driverRides/{uid}/rides` (zones, date, statut, gains),
//   sans aucune coordonnée du passager.
export function subscribeDriverRides(
  driverId: string,
  onUpdate: (rides: any[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  let active: any[] = [];
  let history: any[] = [];
  const emit = () => {
    const activeIds = new Set(active.map((r) => r.id));
    const merged = [...active, ...history.filter((r) => !activeIds.has(r.id))];
    merged.sort((a, b) => (b.createdAt?.getTime?.() ?? 0) - (a.createdAt?.getTime?.() ?? 0));
    onUpdate(merged);
  };
  const handleError = (err: Error) => {
    console.error("[dispatch] subscribeDriverRides error:", err);
    onError?.(err);
  };

  const unsubActive = onSnapshot(
    query(
      collection(db, "bookings"),
      where("driverId", "==", driverId),
      where("status", "in", ["assigned", "in_progress"]),
      orderBy("createdAt", "desc")
    ),
    (snap) => {
      active = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: coerceDate(d.data().createdAt),
        reservationDate: coerceDate(d.data().reservationDate),
        driverAcceptedAt: coerceDate(d.data().driverAcceptedAt),
      }));
      emit();
    },
    handleError
  );

  const unsubHistory = onSnapshot(
    query(collection(db, "driverRides", driverId, "rides"), orderBy("createdAt", "desc")),
    (snap) => {
      history = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          // Libellés de zone à la place des adresses (aucune coordonnée du passager).
          depart: data.departZone ?? "",
          arrivee: data.arriveeZone ?? "",
          createdAt: coerceDate(data.createdAt),
          reservationDate: coerceDate(data.reservationDate),
        };
      });
      emit();
    },
    handleError
  );

  return () => {
    unsubActive();
    unsubHistory();
  };
}

export class RideUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RideUnavailableError";
  }
}

// Appel d'une action de course côté serveur. Les erreurs métier (course déjà prise,
// mauvais état…) remontent en RideUnavailableError avec le message du serveur.
async function rideAction(action: "accept" | "start" | "complete" | "release", rideId: string, reason?: string) {
  const user = getAuth().currentUser;
  if (!user) throw new RideUnavailableError("Session expirée : reconnectez-vous.");
  const res = await fetch(`/api/rides/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
    body: JSON.stringify({ bookingId: rideId, ...(reason !== undefined ? { reason } : {}) }),
  });
  if (res.ok) return;
  const data = await res.json().catch(() => ({}));
  if (res.status >= 400 && res.status < 500) {
    throw new RideUnavailableError(data.error || "Action impossible sur cette course.");
  }
  throw new Error(data.error || "Erreur serveur");
}

// Le paramètre driverId est conservé pour les appelants : le serveur identifie le
// chauffeur par son jeton, jamais par une valeur envoyée par le navigateur.
export async function acceptRide(rideId: string, _driverId?: string): Promise<void> {
  await rideAction("accept", rideId);
}

export async function startRide(rideId: string, _driverId?: string): Promise<void> {
  await rideAction("start", rideId);
}

export async function completeRide(rideId: string, _driverId?: string): Promise<void> {
  await rideAction("complete", rideId);
}

export async function releaseRide(rideId: string, _driverId: string, reason: string): Promise<void> {
  await rideAction("release", rideId, reason);
}
