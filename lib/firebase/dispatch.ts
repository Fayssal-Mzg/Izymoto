// lib/firebase/dispatch.ts
// Pool de courses FCFS sans géolocalisation.
//
// Flow :
// 1. Côté client : booking créé → paiement authorized → status = "awaiting_driver"
// 2. Chauffeurs en service (status=active, availability=online) voient le pool
//    via un onSnapshot où status == "awaiting_driver" && !driverId
// 3. acceptRide() est une transaction Firestore qui verrouille la course au
//    premier qui clique. Les autres reçoivent une erreur "déjà attribuée".

import { db } from "@/lib/firebaseConfig";
import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  runTransaction,
  Timestamp,
  Unsubscribe,
  orderBy,
} from "firebase/firestore";

export const COMMISSION_RATE = 0.2;

export interface PoolRide {
  id: string;
  reservationId: string;
  depart: string;
  arrivee: string;
  distance: number;
  duree: number;
  prix: number;
  reservationDate: Date | null;
  createdAt: Date | null;
  name?: string;
  phone?: string;
  notes?: string;
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
  return {
    id,
    reservationId: data.reservationId ?? id.substring(0, 6),
    depart: data.depart ?? "",
    arrivee: data.arrivee ?? "",
    distance: data.distance ?? 0,
    duree: data.duree ?? 0,
    prix: data.prix ?? 0,
    reservationDate: coerceDate(data.reservationDate),
    createdAt: coerceDate(data.createdAt),
    name: data.name,
    phone: data.phone,
    notes: data.notes,
  };
}

// Pool partagé : toutes les courses qui attendent un chauffeur.
// On filtre côté requête pour ne pas exposer les autres statuts.
export function subscribePool(
  onUpdate: (rides: PoolRide[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, "bookings"),
    where("status", "==", "awaiting_driver"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(
    q,
    (snap) => {
      const rides = snap.docs.map((d) => hydrateRide(d.id, d.data()));
      onUpdate(rides);
    },
    (err) => {
      console.error("[dispatch] subscribePool error:", err);
      onError?.(err);
    }
  );
}

// Courses acceptées par un chauffeur (assigned / in_progress / completed).
export function subscribeDriverRides(
  driverId: string,
  onUpdate: (rides: any[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, "bookings"),
    where("driverId", "==", driverId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(
    q,
    (snap) => {
      const rides = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: coerceDate(d.data().createdAt),
        reservationDate: coerceDate(d.data().reservationDate),
        driverAcceptedAt: coerceDate(d.data().driverAcceptedAt),
      }));
      onUpdate(rides);
    },
    (err) => {
      console.error("[dispatch] subscribeDriverRides error:", err);
      onError?.(err);
    }
  );
}

export class RideUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RideUnavailableError";
  }
}

// Acceptation FCFS : transaction Firestore qui garantit qu'une seule
// acceptation aboutit, même si deux chauffeurs cliquent au même instant.
export async function acceptRide(
  rideId: string,
  driverId: string
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const rideRef = doc(db, "bookings", rideId);
    const driverRef = doc(db, "drivers", driverId);

    const rideSnap = await tx.get(rideRef);
    if (!rideSnap.exists()) {
      throw new RideUnavailableError("Cette course n'existe plus.");
    }
    const ride = rideSnap.data();
    if (ride.status !== "awaiting_driver" || ride.driverId) {
      throw new RideUnavailableError("Cette course a déjà été acceptée.");
    }

    const driverSnap = await tx.get(driverRef);
    if (!driverSnap.exists()) {
      throw new RideUnavailableError("Profil chauffeur introuvable.");
    }
    const driver = driverSnap.data();
    if (driver.status !== "active") {
      throw new RideUnavailableError(
        "Votre compte n'est pas encore validé. Patientez la validation administrateur."
      );
    }
    if (driver.availability !== "online") {
      throw new RideUnavailableError(
        "Vous devez être en service pour accepter une course."
      );
    }

    const prix = Number(ride.prix ?? 0);
    const platformCents = Math.round(prix * COMMISSION_RATE * 100);
    const driverCents = Math.round(prix * 100) - platformCents;

    tx.update(rideRef, {
      driverId,
      driverAcceptedAt: Timestamp.now(),
      status: "assigned",
      commissionRate: COMMISSION_RATE,
      platformShareCents: platformCents,
      driverShareCents: driverCents,
      updatedAt: Timestamp.now(),
    });
  });
}

// Le chauffeur démarre la course (en route vers le client / course en cours).
export async function startRide(rideId: string, driverId: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const rideRef = doc(db, "bookings", rideId);
    const snap = await tx.get(rideRef);
    if (!snap.exists()) throw new RideUnavailableError("Course introuvable.");
    const ride = snap.data();
    if (ride.driverId !== driverId) {
      throw new RideUnavailableError("Cette course ne vous est pas attribuée.");
    }
    if (ride.status !== "assigned") {
      throw new RideUnavailableError("La course n'est pas dans le bon état.");
    }
    tx.update(rideRef, {
      status: "in_progress",
      driverStartedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  });
}

// Le chauffeur marque la course terminée. L'admin gardera la main sur la
// capture Stripe finale (déjà en place dans le back-office).
export async function completeRide(
  rideId: string,
  driverId: string
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const rideRef = doc(db, "bookings", rideId);
    const snap = await tx.get(rideRef);
    if (!snap.exists()) throw new RideUnavailableError("Course introuvable.");
    const ride = snap.data();
    if (ride.driverId !== driverId) {
      throw new RideUnavailableError("Cette course ne vous est pas attribuée.");
    }
    if (ride.status !== "in_progress" && ride.status !== "assigned") {
      throw new RideUnavailableError("La course n'est pas dans le bon état.");
    }
    tx.update(rideRef, {
      status: "completed_by_driver",
      driverCompletedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  });
}

// Cas exceptionnel : un chauffeur libère une course qu'il avait acceptée.
// On la replace dans le pool, et la prochaine acceptation gagne.
export async function releaseRide(
  rideId: string,
  driverId: string,
  reason: string
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const rideRef = doc(db, "bookings", rideId);
    const snap = await tx.get(rideRef);
    if (!snap.exists()) throw new RideUnavailableError("Course introuvable.");
    const ride = snap.data();
    if (ride.driverId !== driverId) {
      throw new RideUnavailableError("Cette course ne vous est pas attribuée.");
    }
    if (ride.status !== "assigned") {
      throw new RideUnavailableError(
        "Une course déjà démarrée doit être annulée par l'admin."
      );
    }
    tx.update(rideRef, {
      driverId: null,
      driverAcceptedAt: null,
      status: "awaiting_driver",
      driverReleaseReason: reason,
      updatedAt: Timestamp.now(),
    });
  });
}
