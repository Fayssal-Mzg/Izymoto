import { FieldValue, Timestamp, type DocumentData } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin-server";
import { COMMISSION_RATE, phoneKey, sharesFor, syncDriverHistoryInTx, syncRidePoolInTx } from "@/lib/rides/pool";
import { notifyRideAvailable, notifyRideStatus } from "@/lib/push/events";

// Actions du chauffeur sur une course (lot 2.1) : exécutées par le serveur, en
// transaction, le chauffeur étant identifié par son jeton. Mêmes règles métier que
// l'ancien lib/firebase/dispatch.ts, désormais hors de portée du navigateur.

export type RideAction = "accept" | "start" | "complete" | "release";

export class RideActionError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = "RideActionError";
  }
}

const fail = (status: number, code: string, message: string): never => {
  throw new RideActionError(status, code, message);
};

const BOOKING_ID_RE = /^[A-Za-z0-9_-]{1,200}$/;

// Journal d'audit des actions sensibles (D-012), écrit dans la même transaction.
function audit(
  tx: FirebaseFirestore.Transaction,
  entry: { actorUid: string; actorRole: "driver" | "admin"; action: string; bookingId: string; details?: DocumentData }
) {
  tx.set(getAdminFirestore().collection("auditLogs").doc(), { ...entry, at: Timestamp.now() });
}

export async function runRideAction(
  driverUid: string,
  action: RideAction,
  bookingId: unknown,
  reason?: unknown
): Promise<{ status: string }> {
  if (typeof bookingId !== "string" || !BOOKING_ID_RE.test(bookingId)) {
    fail(400, "INVALID_BOOKING", "Course invalide.");
  }
  const id = bookingId as string;
  const db = getAdminFirestore();
  const rideRef = db.collection("bookings").doc(id);
  const driverRef = db.collection("drivers").doc(driverUid);

  let committed: { ride: DocumentData; at: Timestamp } | null = null;
  const result = await db.runTransaction(async (tx) => {
    const [rideSnap, driverSnap] = await Promise.all([tx.get(rideRef), tx.get(driverRef)]);
    const ride = rideSnap.data();
    const driver = driverSnap.data();
    if (!ride) return fail(404, "NOT_FOUND", "Cette course n'existe plus.");
    if (!driver || driver.status !== "active") {
      return fail(403, "DRIVER_NOT_ACTIVE", "Votre compte chauffeur n'est pas validé.");
    }
    const now = Timestamp.now();
    let changes: DocumentData;

    if (action === "accept") {
      if (driver.availability !== "online") {
        fail(409, "DRIVER_OFFLINE", "Vous devez être en service pour accepter une course.");
      }
      if (ride.status !== "awaiting_driver" || ride.driverId) {
        fail(409, "ALREADY_TAKEN", "Cette course a déjà été acceptée.");
      }
      if (ride.paymentStatus === "failed" || ride.paymentStatus === "released") {
        fail(409, "NOT_AVAILABLE", "Cette course n'est plus disponible.");
      }
      // D-003 : un chauffeur ne prend pas sa propre course (même compte ou même téléphone).
      const ridePhone = phoneKey(ride.phone);
      if (ride.userId === driverUid || (ridePhone !== null && ridePhone === phoneKey(driver.phone))) {
        fail(403, "OWN_RIDE", "Vous ne pouvez pas accepter votre propre course.");
      }
      changes = {
        driverId: driverUid,
        driverAcceptedAt: now,
        status: "assigned",
        commissionRate: COMMISSION_RATE,
        ...sharesFor(ride.prix),
        updatedAt: now,
      };
    } else {
      if (ride.driverId !== driverUid) fail(403, "NOT_YOUR_RIDE", "Cette course ne vous est pas attribuée.");
      if (action === "start") {
        if (ride.status !== "assigned") fail(409, "BAD_STATE", "La course n'est pas dans le bon état.");
        changes = { status: "in_progress", driverStartedAt: now, updatedAt: now };
      } else if (action === "complete") {
        if (ride.status !== "assigned" && ride.status !== "in_progress") {
          fail(409, "BAD_STATE", "La course n'est pas dans le bon état.");
        }
        changes = { status: "completed_by_driver", driverCompletedAt: now, updatedAt: now };
      } else {
        if (ride.status !== "assigned") {
          fail(409, "BAD_STATE", "Une course déjà démarrée doit être annulée par l'admin.");
        }
        const text = typeof reason === "string" ? reason.trim().slice(0, 500) : "";
        if (!text) fail(400, "REASON_REQUIRED", "Indiquez le motif de la libération.");
        // Le motif reste dans le journal d'audit : le passager lit sa réservation.
        changes = {
          driverId: null,
          driverAcceptedAt: null,
          status: "awaiting_driver",
          driverReleaseReason: FieldValue.delete(),
          commissionRate: FieldValue.delete(),
          platformShareCents: FieldValue.delete(),
          driverShareCents: FieldValue.delete(),
          updatedAt: now,
        };
      }
    }

    tx.update(rideRef, changes!);
    const finalRide: DocumentData = { ...ride };
    for (const [k, v] of Object.entries(changes!)) {
      if (v instanceof FieldValue) delete finalRide[k];
      else finalRide[k] = v;
    }
    syncRidePoolInTx(tx, id, finalRide);
    syncDriverHistoryInTx(tx, id, ride, finalRide);
    audit(tx, {
      actorUid: driverUid,
      actorRole: "driver",
      action: `ride.${action}`,
      bookingId: id,
      ...(action === "release" ? { details: { reason: String(reason).trim().slice(0, 500) } } : {}),
    });
    committed = { ride: finalRide, at: now };
    return { status: finalRide.status as string };
  });

  // Après la validation de la transaction : les notifications n'altèrent jamais la réponse.
  if (committed) {
    const { ride, at } = committed as { ride: DocumentData; at: Timestamp };
    if (action === "accept") await notifyRideStatus("ride_accepted", id, ride, at);
    else if (action === "start") await notifyRideStatus("ride_started", id, ride, at);
    else if (action === "complete") await notifyRideStatus("ride_completed", id, ride, at);
    else await notifyRideAvailable(id, { excludeUids: [driverUid] });
  }
  return result;
}

// Paiement encore actif : annuler ou supprimer la course sans libérer l'empreinte ni
// rembourser le portefeuille laisserait le client débité. L'empreinte se libère par
// « Annuler le hold » (cancel-payment) ; le portefeuille par « Ajuster le solde ».
const ACTIVE_PAYMENT = new Set(["authorized", "paid_wallet", "captured"]);

// Changement de statut par l'admin (boutons de la liste des réservations).
export const ADMIN_STATUSES = new Set(["pending", "confirmed", "completed", "cancelled"]);

export async function adminSetBookingStatus(
  adminUid: string,
  bookingId: unknown,
  status: unknown,
  refundConfirmed = false
): Promise<void> {
  if (typeof bookingId !== "string" || !BOOKING_ID_RE.test(bookingId)) {
    fail(400, "INVALID_BOOKING", "Réservation invalide.");
  }
  if (typeof status !== "string" || !ADMIN_STATUSES.has(status)) {
    fail(400, "INVALID_STATUS", "Statut non autorisé.");
  }
  const db = getAdminFirestore();
  const ref = db.collection("bookings").doc(bookingId as string);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const b = snap.data();
    if (!b) return fail(404, "NOT_FOUND", "Réservation introuvable.");
    if (status === "cancelled" && b.paymentStatus === "authorized") {
      fail(409, "HOLD_ACTIVE", "Paiement par carte en attente : utilisez « Annuler le hold » dans la fiche de la réservation.");
    }
    // Course déjà payée (portefeuille, carte encaissée) : l'admin confirme avoir remboursé.
    if (status === "cancelled" && ACTIVE_PAYMENT.has(b.paymentStatus) && !refundConfirmed) {
      fail(
        409,
        "REFUND_REQUIRED",
        "Course déjà payée : remboursez le client (Portefeuilles → Ajuster le solde, ou remboursement Stripe), puis confirmez l'annulation."
      );
    }
    const changes = { status, updatedAt: Timestamp.now() };
    tx.update(ref, changes);
    syncRidePoolInTx(tx, ref.id, { ...b, ...changes });
    syncDriverHistoryInTx(tx, ref.id, b, { ...b, ...changes });
    audit(tx, {
      actorUid: adminUid,
      actorRole: "admin",
      action: "booking.status",
      bookingId: ref.id,
      details: { from: b.status ?? null, to: status, paymentStatus: b.paymentStatus ?? null, refundConfirmed },
    });
  });
}

export async function adminDeleteBooking(adminUid: string, bookingId: unknown): Promise<void> {
  if (typeof bookingId !== "string" || !BOOKING_ID_RE.test(bookingId)) {
    fail(400, "INVALID_BOOKING", "Réservation invalide.");
  }
  const db = getAdminFirestore();
  const ref = db.collection("bookings").doc(bookingId as string);
  await db.runTransaction(async (tx) => {
    const b = (await tx.get(ref)).data();
    if (!b) return;
    if (ACTIVE_PAYMENT.has(b.paymentStatus)) {
      fail(409, "PAYMENT_ACTIVE", "Paiement actif : annulez ou remboursez avant de supprimer la réservation.");
    }
    tx.delete(ref);
    syncRidePoolInTx(tx, ref.id, undefined);
    syncDriverHistoryInTx(tx, ref.id, b, undefined);
    audit(tx, {
      actorUid: adminUid,
      actorRole: "admin",
      action: "booking.delete",
      bookingId: ref.id,
      details: { status: b.status ?? null, paymentStatus: b.paymentStatus ?? null, prix: b.prix ?? null },
    });
  });
}
