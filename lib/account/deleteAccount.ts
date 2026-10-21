import { randomBytes } from "node:crypto";
import { FieldValue, Timestamp, type DocumentData, type Query } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin-server";
import { stripe } from "@/lib/stripe-server";
import { zoneLabel } from "@/lib/rides/pool";
import { deletePushDataForUid } from "@/lib/push/tokens";

// Suppression complète d'un compte (lot 2.2, D-015). Décisions de Fayssal :
// - refus tant qu'un solde portefeuille est positif (remboursement via contact@) ;
// - courses passées et mouvements CONSERVÉS pour la comptabilité mais PSEUDONYMISÉS
//   (aucune donnée identifiante : nom, téléphone, e-mail, notes, adresse exacte).
// Déroulé : contrôle → verrou (sessions coupées, fiche chauffeur hors service) →
// nouveau contrôle → effacement. Chaque étape est relançable ; le compte de
// connexion est supprimé en DERNIER.

export class AccountDeletionError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = "AccountDeletionError";
  }
}

const refuse = (code: string, message: string): never => {
  throw new AccountDeletionError(409, code, message);
};

const CLIENT_ACTIVE_STATUSES = new Set(["pending", "confirmed", "awaiting_driver", "assigned", "in_progress"]);
const ACTIVE_PAYMENTS = new Set(["authorized", "card_saved", "hold_in_progress", "action_required"]);
const DRIVER_OPEN_STATUSES = new Set(["assigned", "in_progress", "completed_by_driver"]);

// Champs CONSERVÉS sur une course pseudonymisée (liste blanche) : montants, dates,
// statuts, références de paiement, zones. Tout autre champ est supprimé.
const BOOKING_KEPT_FIELDS = [
  "status", "paymentStatus", "paymentMethod", "paymentId", "setupIntentId",
  "prix", "amountAuthorized", "amountCaptured", "walletAmountCents", "cardAmountCents", "isPaid",
  "reservationId", "reservationDate", "createdAt", "updatedAt", "paymentUpdatedAt",
  "distance", "duree", "prioriteReservation", "accountType", "companyId", "paidBy",
  "driverId", "commissionRate", "platformShareCents", "driverShareCents",
  "driverAcceptedAt", "driverStartedAt", "driverCompletedAt",
  "deferredHold", "holdScheduledFor", "captureBefore", "serverFinalized",
];

export interface DeletionCheck {
  uid: string;
  email: string | null;
  companyId: string | null;
  isCompanyOwner: boolean;
}

// Vérifications préalables : aucune écriture.
export async function checkAccountDeletable(uid: string): Promise<DeletionCheck> {
  const db = getAdminFirestore();
  const [asClient, asDriver, wallet, user, authUser] = await Promise.all([
    db.collection("bookings").where("userId", "==", uid).get(),
    db.collection("bookings").where("driverId", "==", uid).get(),
    db.collection("wallets").doc(uid).get(),
    db.collection("users").doc(uid).get(),
    getAdminAuth().getUser(uid).catch(() => null),
  ]);

  for (const d of asClient.docs) {
    const b = d.data();
    if (CLIENT_ACTIVE_STATUSES.has(b.status) || ACTIVE_PAYMENTS.has(b.paymentStatus)) {
      refuse(
        "ACTIVE_RIDE",
        "Une course est en cours ou à venir sur votre compte. Attendez qu'elle soit terminée, ou contactez-nous pour l'annuler, avant de supprimer votre compte."
      );
    }
  }
  for (const d of asDriver.docs) {
    const b = d.data();
    // Course terminée par le chauffeur mais pas encore encaissée : ses gains doivent
    // pouvoir lui être rattachés.
    if (DRIVER_OPEN_STATUSES.has(b.status) && b.paymentStatus !== "captured") {
      refuse(
        "ACTIVE_DRIVER_RIDE",
        "Vous avez une course en cours ou pas encore réglée : terminez-la ou contactez-nous avant de supprimer votre compte."
      );
    }
  }
  if ((wallet.data()?.balanceCents ?? 0) > 0) {
    refuse(
      "BALANCE_POSITIVE",
      "Il reste un solde sur votre portefeuille. Utilisez-le ou écrivez à contact@izymoto.com pour un remboursement avant de supprimer votre compte."
    );
  }

  const companyId = (user.data()?.companyId as string | undefined) ?? null;
  let isCompanyOwner = false;
  if (companyId) {
    const company = (await db.collection("companies").doc(companyId).get()).data();
    if (company && company.ownerUid === uid) {
      isCompanyOwner = true;
      const members = await db.collection("companies").doc(companyId).collection("members").where("status", "==", "active").get();
      if (members.docs.some((m) => m.id !== uid)) {
        refuse("COMPANY_HAS_MEMBERS", "Votre société a encore des collaborateurs : retirez-les avant de supprimer votre compte.");
      }
      if ((company.walletBalanceCents ?? 0) > 0) {
        refuse(
          "COMPANY_BALANCE_POSITIVE",
          "Il reste un solde sur le portefeuille de votre société. Écrivez à contact@izymoto.com pour le remboursement avant de supprimer votre compte."
        );
      }
    }
  }
  // E-mail utilisé pour retrouver devis invités et invitations : seulement s'il est
  // VÉRIFIÉ (sinon un compte créé avec l'adresse d'un tiers effacerait ses données).
  const email = authUser?.emailVerified === true && authUser.email ? authUser.email.toLowerCase() : null;
  return { uid, email, companyId, isCompanyOwner };
}

async function forEachDoc(query: Query, apply: (batch: FirebaseFirestore.WriteBatch, doc: FirebaseFirestore.QueryDocumentSnapshot) => void) {
  const db = getAdminFirestore();
  const snap = await query.get();
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = db.batch();
    for (const d of snap.docs.slice(i, i + 400)) apply(batch, d);
    await batch.commit();
  }
  return snap.size;
}

// Course réduite à la liste blanche ; adresses ramenées à la zone.
function pseudonymizedBooking(b: DocumentData, anon: string, uid: string, now: Timestamp) {
  const kept: DocumentData = {};
  for (const f of BOOKING_KEPT_FIELDS) if (b[f] !== undefined) kept[f] = b[f];
  return {
    ...kept,
    userId: b.userId === uid ? anon : typeof b.userId === "string" && b.userId.startsWith("guest_") ? anon : b.userId,
    ...(b.actorUid ? { actorUid: b.actorUid === uid ? anon : b.actorUid } : {}),
    depart: zoneLabel(b.depart),
    arrivee: zoneLabel(b.arrivee),
    pseudonymizedAt: now,
  };
}

export async function deleteAccount(
  uid: string,
  actor: { uid: string; role: "self" | "admin" }
): Promise<{ bookings: number; transactions: number }> {
  const db = getAdminFirestore();
  const userRef = db.collection("users").doc(uid);
  const driverRef = db.collection("drivers").doc(uid);

  // 1. Contrôle sans effet.
  const first = await checkAccountDeletable(uid);

  // Les documents chauffeur (IBAN, pièces) DOIVENT pouvoir être effacés.
  const driverSnap = await driverRef.get();
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (driverSnap.exists && !bucketName) {
    throw new AccountDeletionError(500, "STORAGE_NOT_CONFIGURED", "Suppression impossible pour le moment. Contactez-nous.");
  }

  // 2. Verrou : sessions coupées (toutes les routes vérifient la révocation) et fiche
  //    chauffeur hors service (plus d'acceptation possible), puis nouveau contrôle.
  //    Un échec de révocation arrête tout (sinon le verrou serait sans effet).
  await getAdminAuth().revokeRefreshTokens(uid).catch((err) => {
    if ((err as { code?: string })?.code !== "auth/user-not-found") throw err;
  });
  // Appareils de notification effacés d'abord : plus aucune notification pendant ni après.
  await deletePushDataForUid(uid);
  const previousDriver = driverSnap.data();
  if (driverSnap.exists && previousDriver?.status !== "deleted") {
    await driverRef.update({ availability: "offline", status: "deleted" });
  }
  let check: DeletionCheck;
  try {
    check = await checkAccountDeletable(uid);
  } catch (err) {
    // Une course est apparue entre-temps : on rétablit la fiche chauffeur.
    if (driverSnap.exists && previousDriver?.status !== "deleted") {
      await driverRef.update({ availability: previousDriver?.availability ?? "offline", status: previousDriver?.status ?? "pending" });
    }
    throw err;
  }
  const email = check.email ?? first.email;

  // Pseudonyme ALÉATOIRE (non calculable à partir de l'uid), mémorisé sur le profil
  // tant qu'il existe pour qu'une relance réutilise le même.
  const existingAnon = (await userRef.get()).data()?.deletionPseudonym as string | undefined;
  const anon = existingAnon ?? `supprime_${randomBytes(12).toString("hex")}`;
  // `deletionFailedAt` retiré : suppression en cours (le webhook rembourse alors les recharges).
  if ((await userRef.get()).exists) {
    await userRef.update({ deletionPseudonym: anon, deletionFailedAt: FieldValue.delete() });
  }
  const now = Timestamp.now();
  try {
    return await eraseAccountData({ uid, anon, now, email, check, actor, userRef, driverRef, driverExists: driverSnap.exists, bucketName });
  } catch (err) {
    // Échec en cours de route : le compte reste utilisable (recharges créditées) et
    // la suppression peut être relancée avec le même pseudonyme.
    await userRef.update({ deletionFailedAt: Timestamp.now() }).catch(() => undefined);
    throw err;
  }
}

async function eraseAccountData(p: {
  uid: string;
  anon: string;
  now: Timestamp;
  email: string | null;
  check: DeletionCheck;
  actor: { uid: string; role: "self" | "admin" };
  userRef: FirebaseFirestore.DocumentReference;
  driverRef: FirebaseFirestore.DocumentReference;
  driverExists: boolean;
  bucketName: string | undefined;
}): Promise<{ bookings: number; transactions: number }> {
  const { uid, anon, now, email, check, actor, userRef, driverRef, bucketName } = p;
  const db = getAdminFirestore();
  const driverSnap = { exists: p.driverExists };

  // 3. Courses du client (dont devis invités envoyés avec son e-mail) et du chauffeur.
  let bookings = await forEachDoc(db.collection("bookings").where("userId", "==", uid), (batch, d) =>
    batch.set(d.ref, pseudonymizedBooking(d.data(), anon, uid, now))
  );
  if (email) {
    bookings += await forEachDoc(
      db.collection("bookings").where("email", "==", email).where("accountType", "==", "guest"),
      (batch, d) => batch.set(d.ref, pseudonymizedBooking(d.data(), anon, uid, now))
    );
  }
  // Courses réalisées comme chauffeur : elles appartiennent à d'autres clients, on ne
  // remplace que l'identifiant du chauffeur.
  bookings += await forEachDoc(db.collection("bookings").where("driverId", "==", uid), (batch, d) =>
    batch.update(d.ref, { driverId: anon, driverPseudonymizedAt: now })
  );

  // 4. Mouvements de portefeuille, verrous de paiement, journal d'audit.
  const transactions =
    (await forEachDoc(db.collection("walletTransactions").where("userId", "==", uid), (batch, d) =>
      batch.update(d.ref, { userId: anon, pseudonymizedAt: now })
    )) +
    (await forEachDoc(db.collection("walletTransactions").where("actorUid", "==", uid), (batch, d) =>
      batch.update(d.ref, { actorUid: anon, actorEmail: FieldValue.delete(), pseudonymizedAt: now })
    ));
  await forEachDoc(db.collection("paymentClaims").where("userId", "==", uid), (batch, d) => batch.update(d.ref, { userId: anon }));
  await forEachDoc(db.collection("auditLogs").where("actorUid", "==", uid), (batch, d) => batch.update(d.ref, { actorUid: anon }));
  // Changements de propriétaire d'un jeton de notification (lot 2.3) : même pseudonyme.
  for (const field of ["previousOwner", "newOwner"]) {
    await forEachDoc(db.collection("auditLogs").where(field, "==", uid), (batch, d) => batch.update(d.ref, { [field]: anon }));
  }

  // 5. Invitations : toutes celles adressées à son e-mail ou acceptées par lui sont
  //    supprimées ; celles qu'il a envoyées gardent la trace sans son identité.
  if (email) await forEachDoc(db.collection("companyInvitations").where("email", "==", email), (batch, d) => batch.delete(d.ref));
  await forEachDoc(db.collection("companyInvitations").where("acceptedByUid", "==", uid), (batch, d) => batch.delete(d.ref));
  await forEachDoc(db.collection("companyInvitations").where("invitedByUid", "==", uid), (batch, d) =>
    batch.update(d.ref, { invitedByUid: anon })
  );

  // 6. Société : départ du collaborateur, ou fermeture de la société du propriétaire seul.
  if (check.companyId) {
    const companyRef = db.collection("companies").doc(check.companyId);
    const memberRef = companyRef.collection("members").doc(uid);
    await db.runTransaction(async (tx) => {
      const [company, member] = await Promise.all([tx.get(companyRef), tx.get(memberRef)]);
      if (member.exists) {
        const m = member.data()!;
        const wasActive = m.status === "active";
        // Le document membre était rangé sous l'uid : il est recréé sous le pseudonyme
        // (rôle, budget, dépenses), sans e-mail ni nom, et l'original est supprimé.
        tx.set(companyRef.collection("members").doc(anon), {
          uid: anon,
          role: m.role ?? "member",
          status: "removed",
          monthlyBudgetCents: m.monthlyBudgetCents ?? 0,
          spentThisPeriodCents: m.spentThisPeriodCents ?? 0,
          budgetPeriodKey: m.budgetPeriodKey ?? null,
          invitedAt: m.invitedAt ?? null,
          joinedAt: m.joinedAt ?? null,
          removedAt: now,
        });
        tx.delete(memberRef);
        if (company.exists && wasActive && !check.isCompanyOwner) {
          tx.update(companyRef, { memberCount: Math.max(1, (company.data()?.memberCount ?? 1) - 1), updatedAt: now });
        }
      }
      if (company.exists && check.isCompanyOwner) {
        tx.update(companyRef, {
          ownerUid: anon,
          adminUids: [],
          billingEmail: null,
          memberCount: 0,
          status: "closed",
          closedAt: now,
          updatedAt: now,
        });
      }
    });
    if (check.isCompanyOwner) {
      // Invitations encore ouvertes de la société fermée : révoquées.
      await forEachDoc(
        db.collection("companyInvitations").where("companyId", "==", check.companyId).where("status", "==", "pending"),
        (batch, d) => batch.update(d.ref, { status: "revoked" })
      );
    }
  }

  // 7. Chauffeur : fiche réduite au statut « supprimé », historique, IBAN et pièces effacés.
  if (driverSnap.exists) {
    await driverRef.set({ status: "deleted", availability: "offline", deletedAt: now });
    await forEachDoc(db.collection("driverRides").doc(uid).collection("rides"), (batch, d) => batch.delete(d.ref));
    if (bucketName) await getStorage().bucket(bucketName).deleteFiles({ prefix: `drivers/${uid}/` });
  }

  // 8. Client Stripe et cartes enregistrées.
  const customerRef = db.collection("stripeCustomers").doc(uid);
  const customerId = (await customerRef.get()).data()?.customerId as string | undefined;
  if (customerId) {
    try {
      await stripe.customers.del(customerId);
    } catch (err) {
      if ((err as { code?: string })?.code !== "resource_missing") throw err;
    }
    await customerRef.delete();
  }

  // 9. Portefeuille et profil. Le solde est revérifié dans la transaction : une
  //    recharge arrivée pendant la suppression n'est jamais effacée en silence.
  await db.runTransaction(async (tx) => {
    const walletRef = db.collection("wallets").doc(uid);
    const wallet = await tx.get(walletRef);
    if ((wallet.data()?.balanceCents ?? 0) > 0) {
      throw new AccountDeletionError(
        409,
        "BALANCE_POSITIVE",
        "Un crédit vient d'arriver sur votre portefeuille. Écrivez à contact@izymoto.com pour le remboursement."
      );
    }
    tx.delete(walletRef);
    tx.delete(userRef);
  });

  // 10. Journal (sans donnée identifiante), puis compte de connexion en dernier.
  await db.collection("auditLogs").add({
    action: "account.delete",
    actorRole: actor.role,
    actorUid: actor.role === "self" ? anon : actor.uid,
    subject: anon,
    details: { bookings, transactions },
    at: now,
  });
  // Un appareil enregistré pendant la suppression ne doit pas survivre au compte.
  await deletePushDataForUid(uid);
  await getAdminAuth().deleteUser(uid).catch((err) => {
    if ((err as { code?: string })?.code !== "auth/user-not-found") throw err;
  });
  return { bookings, transactions };
}
