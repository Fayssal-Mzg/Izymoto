import { Timestamp } from "firebase-admin/firestore";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe-server";
import { getAdminFirestore } from "@/lib/firebase/admin-server";
import { refreshRidePoolSafe } from "@/lib/rides/pool";
import {
  sendHoldActionRequiredEmail,
  sendHoldAdminAlertEmail,
} from "@/lib/emails/holdActionRequiredEmail";

// Empreinte différée (lot 1.1). Une empreinte carte en ligne n'est valable que
// 7 jours : pour une course lointaine, on enregistre la carte à la réservation
// (SetupIntent, usage off_session) et l'empreinte est posée par la tâche
// quotidienne HOLD_LEAD_DAYS jours avant le départ.

const DAY_MS = 24 * 60 * 60 * 1000;

/** À partir de ce délai avant le départ, la carte est enregistrée au lieu d'être bloquée. */
export const DEFERRED_MIN_DAYS = 5;
/** L'empreinte est posée ce nombre de jours avant le départ. */
export const HOLD_LEAD_DAYS = 3;
/** Une tentative interrompue (verrou) peut être reprise après ce délai. */
const HOLD_LOCK_MS = 10 * 60 * 1000;
/** Après un refus, nouvelle tentative sur la carte enregistrée au passage suivant. */
const RETRY_AFTER_MS = 20 * 60 * 60 * 1000;

// Message stocké sur la réservation (lisible par le chauffeur assigné) : jamais le
// motif bancaire brut du client.
const HOLD_ERROR_MESSAGE = "Empreinte refusée ou confirmation demandée par la banque";

// Statuts de course pour lesquels on tente encore de poser l'empreinte.
const ACTIVE_RIDE = new Set(["awaiting_driver", "assigned", "in_progress"]);

export const SETUP_INTENT_ID_RE = /^seti_[A-Za-z0-9]+$/;

export const isDeferredHold = (reservationDateIso: string | null, now: Date = new Date()): boolean =>
  reservationDateIso !== null &&
  new Date(reservationDateIso).getTime() - now.getTime() >= DEFERRED_MIN_DAYS * DAY_MS;

export const holdScheduledFor = (reservationDateIso: string): Date =>
  new Date(new Date(reservationDateIso).getTime() - HOLD_LEAD_DAYS * DAY_MS);

// Client Stripe d'un compte Izymoto. Stocké dans `stripeCustomers/{uid}`, collection
// sans accès client (règles : refus par défaut), pour qu'aucun utilisateur ne puisse
// se rattacher au client Stripe d'un autre.
export async function getOrCreateStripeCustomer(uid: string, email: string | null): Promise<string> {
  const ref = getAdminFirestore().collection("stripeCustomers").doc(uid);
  const snap = await ref.get();
  const existing = snap.exists ? (snap.data()?.customerId as string | undefined) : undefined;
  if (existing) return existing;
  const customer = await stripe.customers.create(
    { ...(email ? { email } : {}), metadata: { userId: uid } },
    { idempotencyKey: `customer-${uid}` }
  );
  await ref.set({ customerId: customer.id, createdAt: Timestamp.now() });
  return customer.id;
}

const idOf = (v: string | { id: string } | null | undefined) => (typeof v === "string" ? v : v?.id ?? null);

const captureBeforeOf = (pi: Stripe.PaymentIntent) => {
  const charge = pi.latest_charge as Stripe.Charge | string | null;
  const ts = typeof charge === "object" && charge ? charge.payment_method_details?.card?.capture_before : undefined;
  return ts ? Timestamp.fromMillis(ts * 1000) : null;
};

// Empreinte posée (requires_capture) : passage en « authorized », sauf si la course a
// été annulée entre-temps — l'empreinte est alors libérée aussitôt.
export async function recordAuthorizedHold(
  ref: FirebaseFirestore.DocumentReference,
  pi: Stripe.PaymentIntent
): Promise<"authorized" | "released"> {
  const outcome = await getAdminFirestore().runTransaction(async (tx) => {
    const cur = (await tx.get(ref)).data();
    if (!cur) return "missing" as const;
    if (cur.status === "cancelled") return "cancelled" as const;
    if (cur.paymentStatus === "authorized" || cur.paymentStatus === "captured") return "authorized" as const;
    const captureBefore = captureBeforeOf(pi);
    tx.update(ref, {
      paymentId: pi.id,
      paymentStatus: "authorized",
      amountAuthorized: pi.amount / 100,
      ...(captureBefore ? { captureBefore } : {}),
      holdLockUntil: null,
      holdLastError: null,
      holdNextRetryAt: null,
      paymentUpdatedAt: Timestamp.now(),
    });
    return "authorized" as const;
  });
  if (outcome === "authorized") return "authorized";
  // Course annulée (ou supprimée) : l'empreinte ne doit pas rester bloquée.
  try {
    await stripe.paymentIntents.cancel(pi.id);
  } catch (err) {
    console.error(`[deferred-hold] empreinte d'une course annulée non libérée (${pi.id}):`, err);
  }
  if (outcome === "cancelled") {
    await ref.update({ paymentStatus: "released", holdLockUntil: null, paymentUpdatedAt: Timestamp.now() });
  }
  return "released";
}

export type HoldOutcome = "authorized" | "action_required" | "retry" | "skipped" | "released";

// Erreur Stripe rattachée à un PaymentIntent (refus de carte, authentification exigée).
const paymentIntentOfError = (err: unknown): Stripe.PaymentIntent | null => {
  const pi = (err as { raw?: { payment_intent?: Stripe.PaymentIntent } })?.raw?.payment_intent;
  return pi && typeof pi.id === "string" ? pi : null;
};

// Pose l'empreinte d'une réservation à empreinte différée.
// - Verrou transactionnel (`hold_in_progress`) : jamais deux tentatives simultanées.
// - Le PaymentIntent est créé SANS confirmation et son id enregistré avant toute
//   confirmation : une reprise (coupure, réponse perdue) réutilise ce même
//   PaymentIntent au lieu d'en créer un second.
// - Après un refus (« action_required »), une nouvelle tentative a lieu au passage
//   suivant, tant que le client n'a pas confirmé lui-même.
export async function placeDeferredHold(bookingId: string, now: Date = new Date()): Promise<HoldOutcome> {
  const db = getAdminFirestore();
  const ref = db.collection("bookings").doc(bookingId);

  const locked = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const b = snap.data();
    if (!b || b.deferredHold !== true) return null;
    const t = now.getTime();
    // Course terminée par un autre moyen, ou départ passé depuis plus d'un jour sans
    // empreinte : on abandonne (« failed ») pour ne plus bloquer la carte du client.
    const departure = b.reservationDate?.toMillis?.() ?? 0;
    if (
      b.paymentStatus !== "authorized" &&
      b.paymentStatus !== "captured" &&
      (!ACTIVE_RIDE.has(b.status) || departure < t - DAY_MS)
    ) {
      if (b.status !== "cancelled" && b.paymentStatus !== "failed") {
        tx.update(ref, {
          paymentStatus: "failed",
          holdLastError: "Empreinte abandonnée : course passée ou terminée sans paiement garanti",
          holdLockUntil: null,
          paymentUpdatedAt: Timestamp.now(),
        });
        return { abandoned: b as FirebaseFirestore.DocumentData };
      }
      return null;
    }
    const eligible =
      b.paymentStatus === "card_saved" ||
      (b.paymentStatus === "hold_in_progress" && (!b.holdLockUntil || b.holdLockUntil.toMillis() < t)) ||
      (b.paymentStatus === "action_required" && (!b.holdNextRetryAt || b.holdNextRetryAt.toMillis() <= t));
    if (!eligible) return null;
    tx.update(ref, {
      paymentStatus: "hold_in_progress",
      holdLockUntil: Timestamp.fromMillis(t + HOLD_LOCK_MS),
      holdAttempts: (typeof b.holdAttempts === "number" ? b.holdAttempts : 0) + 1,
    });
    return { booking: b };
  });
  if (!locked) return "skipped";
  if ("abandoned" in locked && locked.abandoned) {
    await abandonHold(ref, locked.abandoned);
    return "skipped";
  }
  const b = locked.booking as FirebaseFirestore.DocumentData;
  // En cas de panne technique, on revient à l'état précédent pour réessayer plus tard.
  const unlock = async () => {
    await ref.update({
      paymentStatus: b.paymentStatus === "action_required" ? "action_required" : "card_saved",
      holdLockUntil: null,
    });
    return "retry" as const;
  };

  const amountCents = Math.round(Number(b.prix) * 100);
  const metadata = {
    userId: String(b.userId),
    bookingId,
    paymentMode: "card",
    deferredHold: "true",
    totalAmountCents: String(amountCents),
  };

  let seti: Stripe.SetupIntent;
  try {
    seti = await stripe.setupIntents.retrieve(b.setupIntentId);
  } catch (err) {
    console.error(`[deferred-hold] SetupIntent illisible pour ${bookingId}:`, err);
    return unlock();
  }
  const customer = idOf(seti.customer);
  const savedCard = idOf(seti.payment_method);
  const cardUsable = seti.status === "succeeded" && !!customer && !!savedCard;

  try {
    let pi: Stripe.PaymentIntent;
    if (typeof b.paymentId === "string" && b.paymentId.startsWith("pi_")) {
      pi = await stripe.paymentIntents.retrieve(b.paymentId, { expand: ["latest_charge"] });
    } else {
      if (!(amountCents > 0)) return unlock();
      pi = await stripe.paymentIntents.create(
        {
          amount: amountCents,
          currency: "eur",
          capture_method: "manual",
          ...(customer ? { customer } : {}),
          payment_method_types: ["card"],
          metadata,
        },
        { idempotencyKey: `deferred-hold-${bookingId}` }
      );
      await ref.update({ paymentId: pi.id });
    }

    if (pi.status === "requires_capture") {
      return recordAuthorizedHold(ref, pi);
    }
    if (pi.status === "canceled" || pi.status === "succeeded" || pi.status === "processing") {
      console.error(`[deferred-hold] PaymentIntent ${pi.id} dans un état inattendu : ${pi.status}`);
      await markActionRequired(ref, b, now);
      return "action_required";
    }
    // Carte enregistrée inutilisable : le client confirmera ce PaymentIntent en session.
    if (!cardUsable) {
      await markActionRequired(ref, b, now);
      return "action_required";
    }
    const confirmed = await stripe.paymentIntents.confirm(
      pi.id,
      { payment_method: savedCard!, off_session: true, expand: ["latest_charge"] },
      { idempotencyKey: `deferred-hold-confirm-${bookingId}-${b.holdAttempts ?? 0}` }
    );
    if (confirmed.status === "requires_capture") return recordAuthorizedHold(ref, confirmed);
    await markActionRequired(ref, b, now);
    return "action_required";
  } catch (err) {
    if (paymentIntentOfError(err)) {
      await markActionRequired(ref, b, now);
      return "action_required";
    }
    // Panne technique (réseau, Stripe indisponible) : nouvelle tentative au prochain passage.
    console.error(`[deferred-hold] échec technique pour ${bookingId}:`, err);
    return unlock();
  }
}

// Course abandonnée sans empreinte (« failed ») : on ferme le paiement resté ouvert
// (une confirmation tardive du client ne doit plus rien bloquer) et on prévient
// l'admin, car la course a pu être réalisée sans être payée.
async function abandonHold(ref: FirebaseFirestore.DocumentReference, b: FirebaseFirestore.DocumentData) {
  // lot 2.1 : une course sans paiement garanti n'est plus proposée aux chauffeurs.
  await refreshRidePoolSafe(ref.id);
  if (typeof b.paymentId === "string" && b.paymentId.startsWith("pi_")) {
    try {
      const pi = await stripe.paymentIntents.retrieve(b.paymentId);
      if (pi.status !== "canceled" && pi.status !== "succeeded") await stripe.paymentIntents.cancel(pi.id);
    } catch (err) {
      console.error(`[deferred-hold] paiement ouvert non annulé pour ${ref.id}:`, err);
    }
  }
  try {
    await sendHoldAdminAlertEmail({
      clientName: b.name,
      bookingId: ref.id,
      reservationId: b.reservationId,
      depart: b.depart,
      arrivee: b.arrivee,
      reservationDate: b.reservationDate?.toDate?.() ?? null,
      amountEur: Number(b.prix),
      abandoned: true,
    });
  } catch (err) {
    console.error(`[deferred-hold] alerte d'abandon non envoyée pour ${ref.id}:`, err);
  }
}

async function markActionRequired(
  ref: FirebaseFirestore.DocumentReference,
  b: FirebaseFirestore.DocumentData,
  now: Date
) {
  await ref.update({
    paymentStatus: "action_required",
    holdLastError: HOLD_ERROR_MESSAGE,
    holdLockUntil: null,
    holdNextRetryAt: Timestamp.fromMillis(now.getTime() + RETRY_AFTER_MS),
    paymentUpdatedAt: Timestamp.now(),
  });
  const details = {
    clientName: b.name,
    bookingId: ref.id,
    reservationId: b.reservationId,
    depart: b.depart,
    arrivee: b.arrivee,
    reservationDate: b.reservationDate?.toDate?.() ?? null,
    amountEur: Number(b.prix),
  };
  if (!b.holdActionEmailSentAt && typeof b.email === "string" && b.email.includes("@")) {
    try {
      await sendHoldActionRequiredEmail({ to: b.email, ...details });
      await ref.update({ holdActionEmailSentAt: Timestamp.now() });
    } catch (err) {
      console.error(`[deferred-hold] e-mail client non envoyé pour ${ref.id}:`, err);
    }
  }
  if (!b.holdAdminAlertSentAt) {
    try {
      await sendHoldAdminAlertEmail(details);
      await ref.update({ holdAdminAlertSentAt: Timestamp.now() });
    } catch (err) {
      console.error(`[deferred-hold] alerte admin non envoyée pour ${ref.id}:`, err);
    }
  }
}

// Réservations dont l'empreinte est due (départ dans HOLD_LEAD_DAYS jours ou moins),
// y compris celles à reprendre après un refus.
export async function dueDeferredHolds(now: Date = new Date()): Promise<string[]> {
  const snap = await getAdminFirestore()
    .collection("bookings")
    .where("paymentStatus", "in", ["card_saved", "hold_in_progress", "action_required"])
    .where("holdScheduledFor", "<=", Timestamp.fromDate(now))
    .get();
  return snap.docs.filter((d) => d.data().deferredHold === true).map((d) => d.id);
}

// Course différée annulée avant l'empreinte (ou pendant l'attente de confirmation du
// client) : on annule le PaymentIntent encore ouvert pour que rien ne puisse plus être
// bloqué. La carte reste enregistrée (D-013 : conservée pour les prochaines courses).
export async function cleanupCancelledDeferredHolds(): Promise<number> {
  const snap = await getAdminFirestore()
    .collection("bookings")
    .where("deferredHold", "==", true)
    .where("status", "==", "cancelled")
    .where("holdCleanedAt", "==", null)
    .get();
  let cleaned = 0;
  for (const d of snap.docs) {
    const b = d.data();
    // Empreinte posée : c'est l'admin qui la libère (« Annuler le hold »).
    if (b.paymentStatus === "authorized") continue;
    try {
      if (typeof b.paymentId === "string" && b.paymentId.startsWith("pi_")) {
        const pi = await stripe.paymentIntents.retrieve(b.paymentId);
        if (pi.status !== "canceled" && pi.status !== "succeeded") {
          await stripe.paymentIntents.cancel(pi.id);
        }
      }
      await d.ref.update({ holdCleanedAt: Timestamp.now() });
      cleaned += 1;
    } catch (err) {
      console.error(`[deferred-hold] nettoyage impossible pour ${d.id}:`, err);
    }
  }
  return cleaned;
}