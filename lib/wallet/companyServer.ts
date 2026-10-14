import { Timestamp, type Transaction } from "firebase-admin/firestore";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin-server";
import { syncRidePoolInTx } from "@/lib/rides/pool";
import { WalletError, getWalletBalance } from "@/lib/wallet/server";

// Cœur serveur du portefeuille ENTREPRISE (partagé entre collaborateurs).
// Calqué sur lib/wallet/server.ts : runTransaction + idempotence via docId.
//
// Modèle :
//   companies/{companyId}                        → solde partagé
//   companies/{companyId}/members/{uid}          → membre + budget mensuel
//   companyInvitations/{token}                   → invitation (voir lib/company/invitations.ts)
//   walletTransactions/{id}  (réutilisé)         → ledger { companyId, actorUid, ... }
//
// Réserve : ne JAMAIS importer ce fichier côté client (Admin SDK = bypass rules).

const COMPANIES = "companies";
const MEMBERS = "members";
const WALLET_TX = "walletTransactions";
const BOOKINGS = "bookings";
const USERS = "users";

export type CompanyMemberRole = "owner" | "member";
export type CompanyMemberStatus = "active" | "removed";

export interface CompanyDoc {
  name: string;
  slug: string;
  ownerUid: string;
  adminUids: string[];
  walletBalanceCents: number;
  cumulativeRechargedCents: number;
  currency: "EUR";
  billingEmail: string | null;
  siret: string | null;
  address: string | null;
  memberCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CompanyMemberDoc {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: CompanyMemberRole;
  status: CompanyMemberStatus;
  // 0 = budget illimité (puise tant que le solde société le permet).
  monthlyBudgetCents: number;
  spentThisPeriodCents: number;
  budgetPeriodKey: string; // "YYYY-MM" (Europe/Paris)
  invitedAt: Timestamp;
  joinedAt: Timestamp | null;
}

// Clé de période courante "YYYY-MM" en fuseau Europe/Paris (reset budget lazy).
export function currentPeriodKey(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "00";
  return `${year}-${month}`;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Budget mensuel restant d'un membre, en tenant compte du reset de période.
export function remainingBudgetCents(
  member: Pick<
    CompanyMemberDoc,
    "monthlyBudgetCents" | "spentThisPeriodCents" | "budgetPeriodKey"
  >,
  period: string = currentPeriodKey()
): number | null {
  if (!member.monthlyBudgetCents || member.monthlyBudgetCents <= 0) return null; // illimité
  const spent =
    member.budgetPeriodKey === period ? member.spentThisPeriodCents : 0;
  return Math.max(0, member.monthlyBudgetCents - spent);
}

export interface CreateCompanyParams {
  ownerUid: string;
  ownerEmail: string | null;
  ownerDisplayName: string | null;
  name: string;
  billingEmail?: string | null;
  siret?: string | null;
  address?: string | null;
}

export interface CreateCompanyResult {
  companyId: string;
}

// Crée une société + son membre owner + rattache l'owner dans users/{uid}.
// Échoue si l'utilisateur appartient déjà à une société.
export async function createCompany(
  params: CreateCompanyParams
): Promise<CreateCompanyResult> {
  const { ownerUid, ownerEmail, ownerDisplayName, name } = params;
  const trimmedName = (name || "").trim();
  if (!trimmedName) {
    throw new WalletError("INVALID_AMOUNT", "Le nom de la société est requis");
  }

  const db = getAdminFirestore();
  const userRef = db.collection(USERS).doc(ownerUid);
  const companyRef = db.collection(COMPANIES).doc();
  const memberRef = companyRef.collection(MEMBERS).doc(ownerUid);

  await db.runTransaction(async (tx: Transaction) => {
    const userSnap = await tx.get(userRef);
    const existingCompanyId = userSnap.exists
      ? (userSnap.data() as { companyId?: string }).companyId
      : undefined;
    if (existingCompanyId) {
      throw new WalletError(
        "CONFLICT",
        "Vous appartenez déjà à une société"
      );
    }

    const now = Timestamp.now();
    const companyDoc: CompanyDoc = {
      name: trimmedName,
      slug: slugify(trimmedName),
      ownerUid,
      adminUids: [ownerUid],
      walletBalanceCents: 0,
      cumulativeRechargedCents: 0,
      currency: "EUR",
      billingEmail: params.billingEmail?.trim() || ownerEmail || null,
      siret: params.siret?.trim() || null,
      address: params.address?.trim() || null,
      memberCount: 1,
      createdAt: now,
      updatedAt: now,
    };
    tx.set(companyRef, companyDoc);

    const memberDoc: CompanyMemberDoc = {
      uid: ownerUid,
      email: ownerEmail,
      displayName: ownerDisplayName,
      role: "owner",
      status: "active",
      monthlyBudgetCents: 0,
      spentThisPeriodCents: 0,
      budgetPeriodKey: currentPeriodKey(),
      invitedAt: now,
      joinedAt: now,
    };
    tx.set(memberRef, memberDoc);

    tx.set(
      userRef,
      { companyId: companyRef.id, companyRole: "owner" },
      { merge: true }
    );
  });

  return { companyId: companyRef.id };
}

export interface CreditCompanyWalletParams {
  companyId: string;
  amountCents: number;
  type: "recharge" | "bonus_adjustment";
  description: string;
  // ID idempotent (event Stripe ou id admin). Sert de docId au ledger.
  eventId: string;
  tierId?: string;
  paymentIntentId?: string;
  checkoutSessionId?: string;
  adminUid?: string;
  adminEmail?: string | null;
  reason?: string;
  isRecharge?: boolean;
}

// Crédite le solde société de façon idempotente (docId ledger = eventId).
export async function creditCompanyWallet(
  params: CreditCompanyWalletParams
): Promise<{ credited: boolean; balanceAfterCents: number }> {
  const {
    companyId,
    amountCents,
    type,
    description,
    eventId,
    isRecharge = true,
  } = params;

  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    throw new WalletError("INVALID_AMOUNT", "amountCents doit être positif");
  }

  const db = getAdminFirestore();
  const companyRef = db.collection(COMPANIES).doc(companyId);
  const txRef = db.collection(WALLET_TX).doc(eventId);

  return db.runTransaction(async (tx: Transaction) => {
    const existing = await tx.get(txRef);
    if (existing.exists) {
      const data = existing.data() as { balanceAfterCents: number };
      return { credited: false, balanceAfterCents: data.balanceAfterCents };
    }

    const companySnap = await tx.get(companyRef);
    if (!companySnap.exists) {
      throw new WalletError("WALLET_NOT_FOUND", "Société introuvable");
    }
    const company = companySnap.data() as CompanyDoc;
    const now = Timestamp.now();
    const newBalance = (company.walletBalanceCents ?? 0) + amountCents;
    const newCumulative = isRecharge
      ? (company.cumulativeRechargedCents ?? 0) + amountCents
      : company.cumulativeRechargedCents ?? 0;

    tx.update(companyRef, {
      walletBalanceCents: newBalance,
      cumulativeRechargedCents: newCumulative,
      updatedAt: now,
    });

    tx.set(txRef, {
      companyId,
      type,
      amountCents,
      balanceAfterCents: newBalance,
      description,
      createdAt: now,
      ...(params.tierId ? { tierId: params.tierId } : {}),
      ...(params.paymentIntentId
        ? { paymentIntentId: params.paymentIntentId }
        : {}),
      ...(params.checkoutSessionId
        ? { checkoutSessionId: params.checkoutSessionId }
        : {}),
      ...(params.adminUid ? { adminUid: params.adminUid } : {}),
      ...(params.adminEmail ? { adminEmail: params.adminEmail } : {}),
      ...(params.reason ? { reason: params.reason } : {}),
    });

    return { credited: true, balanceAfterCents: newBalance };
  });
}

export interface DebitCompanyForBookingParams {
  companyId: string;
  actorUid: string;
  actorEmail: string | null;
  amountCents: number;
  bookingData: Record<string, unknown>;
  clientToken: string;
  description?: string;
}

export interface DebitCompanyResult {
  bookingId: string;
  reservationId: string;
  balanceAfterCents: number;
}

function genReservationId(): string {
  return `CMD-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
}

// Lit member + applique le budget, débite la société, crée le booking et le
// ledger — le tout dans une transaction. Idempotent via clientToken (docId tx).
function applyCompanyDebit(
  tx: Transaction,
  opts: {
    companyId: string;
    actorUid: string;
    actorEmail: string | null;
    amountCents: number;
    period: string;
    companyData: CompanyDoc;
    memberRef: FirebaseFirestore.DocumentReference;
    memberData: CompanyMemberDoc;
    companyRef: FirebaseFirestore.DocumentReference;
  }
): number {
  const {
    amountCents,
    period,
    companyData,
    memberRef,
    memberData,
    companyRef,
  } = opts;

  // Budget mensuel (avec reset lazy de période).
  const previousSpent =
    memberData.budgetPeriodKey === period ? memberData.spentThisPeriodCents : 0;
  if (memberData.monthlyBudgetCents && memberData.monthlyBudgetCents > 0) {
    if (previousSpent + amountCents > memberData.monthlyBudgetCents) {
      throw new WalletError(
        "BUDGET_EXCEEDED",
        "Budget mensuel dépassé pour ce collaborateur"
      );
    }
  }

  if ((companyData.walletBalanceCents ?? 0) < amountCents) {
    throw new WalletError(
      "INSUFFICIENT_BALANCE",
      "Solde entreprise insuffisant"
    );
  }

  const now = Timestamp.now();
  const newBalance = companyData.walletBalanceCents - amountCents;

  tx.update(companyRef, { walletBalanceCents: newBalance, updatedAt: now });
  tx.update(memberRef, {
    spentThisPeriodCents: previousSpent + amountCents,
    budgetPeriodKey: period,
  });

  return newBalance;
}

export async function debitCompanyWalletForBooking(
  params: DebitCompanyForBookingParams
): Promise<DebitCompanyResult> {
  const {
    companyId,
    actorUid,
    actorEmail,
    amountCents,
    bookingData,
    clientToken,
    description,
  } = params;

  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    throw new WalletError("INVALID_AMOUNT", "amountCents doit être positif");
  }

  const db = getAdminFirestore();
  const companyRef = db.collection(COMPANIES).doc(companyId);
  const memberRef = companyRef.collection(MEMBERS).doc(actorUid);
  const txRef = db.collection(WALLET_TX).doc(clientToken);
  const bookingRef = db.collection(BOOKINGS).doc();
  const reservationId = genReservationId();
  const period = currentPeriodKey();

  return db.runTransaction(async (tx: Transaction) => {
    const existingTx = await tx.get(txRef);
    if (existingTx.exists) {
      const e = existingTx.data() as any;
      // Ledger d'un autre appelant ou d'une autre société : aucune divulgation.
      if (e.actorUid !== actorUid || e.companyId !== companyId) {
        throw new WalletError("CONFLICT", "Opération déjà enregistrée");
      }
      return {
        bookingId: e.bookingId ?? "",
        reservationId: e.reservationId ?? "",
        balanceAfterCents: e.balanceAfterCents,
      };
    }

    const companySnap = await tx.get(companyRef);
    if (!companySnap.exists) {
      throw new WalletError("WALLET_NOT_FOUND", "Société introuvable");
    }
    const memberSnap = await tx.get(memberRef);
    if (!memberSnap.exists) {
      throw new WalletError("FORBIDDEN", "Vous n'êtes pas membre de cette société");
    }
    const memberData = memberSnap.data() as CompanyMemberDoc;
    if (memberData.status !== "active") {
      throw new WalletError("FORBIDDEN", "Accès société révoqué");
    }

    const companyData = companySnap.data() as CompanyDoc;
    const newBalance = applyCompanyDebit(tx, {
      companyId,
      actorUid,
      actorEmail,
      amountCents,
      period,
      companyData,
      memberRef,
      memberData,
      companyRef,
    });

    const now = Timestamp.now();
    const bookingDoc = {
      ...bookingData,
      userId: actorUid,
      companyId,
      actorUid,
      paidBy: "company",
      reservationId,
      paymentMethod: "wallet",
      paymentStatus: "paid_wallet",
      walletAmountCents: amountCents,
      isPaid: true,
      status: "awaiting_driver",
      createdAt: now,
    };
    tx.set(bookingRef, bookingDoc);
    // lot 2.1 : la course entre au pool des chauffeurs dans la même transaction.
    syncRidePoolInTx(tx, bookingRef.id, bookingDoc);

    tx.set(txRef, {
      companyId,
      actorUid,
      actorEmail: actorEmail || undefined,
      type: "debit",
      amountCents,
      balanceAfterCents: newBalance,
      description: description || `Course ${reservationId}`,
      bookingId: bookingRef.id,
      reservationId,
      createdAt: now,
    });

    return { bookingId: bookingRef.id, reservationId, balanceAfterCents: newBalance };
  });
}

export interface DebitCompanyForHybridBookingParams {
  companyId: string;
  actorUid: string;
  actorEmail: string | null;
  walletAmountCents: number;
  cardAmountCents: number;
  paymentIntentId: string;
  bookingData: Record<string, unknown>;
  /** Inutilisé : l'idempotence hybride est dérivée du PaymentIntent. */
  clientToken?: string;
  description?: string;
}

export async function debitCompanyWalletForHybridBooking(
  params: DebitCompanyForHybridBookingParams
): Promise<DebitCompanyResult> {
  const {
    companyId,
    actorUid,
    actorEmail,
    walletAmountCents,
    cardAmountCents,
    paymentIntentId,
    bookingData,
    description,
  } = params;

  if (!Number.isFinite(walletAmountCents) || walletAmountCents <= 0) {
    throw new WalletError("INVALID_AMOUNT", "walletAmountCents doit être positif");
  }
  if (!Number.isFinite(cardAmountCents) || cardAmountCents <= 0) {
    throw new WalletError("INVALID_AMOUNT", "cardAmountCents doit être positif");
  }

  const db = getAdminFirestore();
  const companyRef = db.collection(COMPANIES).doc(companyId);
  const memberRef = companyRef.collection(MEMBERS).doc(actorUid);
  // Un PaymentIntent = une seule course : clé de ledger dérivée du PaymentIntent.
  const txRef = db.collection(WALLET_TX).doc(`hybrid_${paymentIntentId}`);
  const bookingRef = db.collection(BOOKINGS).doc();
  const reservationId = genReservationId();
  const period = currentPeriodKey();
  const totalCents = walletAmountCents + cardAmountCents;

  return db.runTransaction(async (tx: Transaction) => {
    const existingTx = await tx.get(txRef);
    if (existingTx.exists) {
      const e = existingTx.data() as any;
      // Ledger d'un autre appelant ou d'une autre société : aucune divulgation.
      if (e.actorUid !== actorUid || e.companyId !== companyId) {
        throw new WalletError("CONFLICT", "Opération déjà enregistrée");
      }
      return {
        bookingId: e.bookingId ?? "",
        reservationId: e.reservationId ?? "",
        balanceAfterCents: e.balanceAfterCents,
      };
    }

    const companySnap = await tx.get(companyRef);
    if (!companySnap.exists) {
      throw new WalletError("WALLET_NOT_FOUND", "Société introuvable");
    }
    const memberSnap = await tx.get(memberRef);
    if (!memberSnap.exists) {
      throw new WalletError("FORBIDDEN", "Vous n'êtes pas membre de cette société");
    }
    const memberData = memberSnap.data() as CompanyMemberDoc;
    if (memberData.status !== "active") {
      throw new WalletError("FORBIDDEN", "Accès société révoqué");
    }

    const companyData = companySnap.data() as CompanyDoc;
    // Le budget mensuel s'applique sur le total de la course (part société +
    // part carte), cohérent avec un plafond de dépenses pro.
    const newBalance = applyCompanyDebit(tx, {
      companyId,
      actorUid,
      actorEmail,
      amountCents: walletAmountCents,
      period,
      companyData,
      memberRef,
      memberData,
      companyRef,
    });

    const now = Timestamp.now();
    const bookingDoc = {
      ...bookingData,
      userId: actorUid,
      companyId,
      actorUid,
      paidBy: "company",
      reservationId,
      paymentMethod: "hybrid",
      paymentStatus: "authorized",
      paymentId: paymentIntentId,
      walletAmountCents,
      cardAmountCents,
      amountAuthorized: cardAmountCents / 100,
      prix: totalCents / 100,
      isPaid: false,
      status: "awaiting_driver",
      createdAt: now,
    };
    tx.set(bookingRef, bookingDoc);
    // lot 2.1 : la course entre au pool des chauffeurs dans la même transaction.
    syncRidePoolInTx(tx, bookingRef.id, bookingDoc);

    tx.set(txRef, {
      companyId,
      actorUid,
      actorEmail: actorEmail || undefined,
      type: "debit",
      amountCents: walletAmountCents,
      balanceAfterCents: newBalance,
      description:
        description ||
        `Course ${reservationId} (part entreprise — hybride wallet+CB)`,
      bookingId: bookingRef.id,
      paymentIntentId,
      reservationId,
      createdAt: now,
    });

    return { bookingId: bookingRef.id, reservationId, balanceAfterCents: newBalance };
  });
}

// ---- Gestion des membres (owner) ----

export interface CompanyContext {
  companyId: string;
  company: CompanyDoc;
  member: CompanyMemberDoc;
  isOwner: boolean;
}

// Résout la société d'un utilisateur depuis son uid (jamais depuis le body).
export async function getCompanyContextForUser(
  uid: string
): Promise<CompanyContext | null> {
  const db = getAdminFirestore();
  const userSnap = await db.collection(USERS).doc(uid).get();
  if (!userSnap.exists) return null;
  const companyId = (userSnap.data() as { companyId?: string }).companyId;
  if (!companyId) return null;

  const [companySnap, memberSnap] = await Promise.all([
    db.collection(COMPANIES).doc(companyId).get(),
    db.collection(COMPANIES).doc(companyId).collection(MEMBERS).doc(uid).get(),
  ]);
  if (!companySnap.exists || !memberSnap.exists) return null;

  const company = companySnap.data() as CompanyDoc;
  const member = memberSnap.data() as CompanyMemberDoc;
  if (member.status !== "active") return null;

  return {
    companyId,
    company,
    member,
    isOwner: member.role === "owner",
  };
}

// Montant réellement dépensable par l'appelant (centimes), calculé côté serveur :
// société (solde plafonné par le budget mensuel restant du membre) si membre actif,
// sinon portefeuille personnel. Même règle que useSpendableWallet côté écran.
export async function getSpendableCentsForUser(uid: string): Promise<number> {
  const ctx = await getCompanyContextForUser(uid).catch(() => null);
  if (!ctx) return getWalletBalance(uid);
  const balance = ctx.company.walletBalanceCents ?? 0;
  const remaining = remainingBudgetCents(ctx.member);
  return Math.max(0, remaining === null ? balance : Math.min(balance, remaining));
}

function assertOwner(ctx: CompanyContext | null): asserts ctx is CompanyContext {
  if (!ctx) throw new WalletError("FORBIDDEN", "Aucune société rattachée");
  if (!ctx.isOwner) {
    throw new WalletError("FORBIDDEN", "Action réservée à l'administrateur de la société");
  }
}

export async function adjustCompanyMemberBudget(params: {
  ownerUid: string;
  memberUid: string;
  monthlyBudgetCents: number;
}): Promise<void> {
  const { ownerUid, memberUid, monthlyBudgetCents } = params;
  if (!Number.isFinite(monthlyBudgetCents) || monthlyBudgetCents < 0) {
    throw new WalletError("INVALID_AMOUNT", "Budget invalide");
  }
  const ctx = await getCompanyContextForUser(ownerUid);
  assertOwner(ctx);

  const db = getAdminFirestore();
  const memberRef = db
    .collection(COMPANIES)
    .doc(ctx.companyId)
    .collection(MEMBERS)
    .doc(memberUid);
  const snap = await memberRef.get();
  if (!snap.exists) throw new WalletError("FORBIDDEN", "Membre introuvable");
  await memberRef.update({ monthlyBudgetCents });
}

export interface CompanyOverviewMember {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: CompanyMemberRole;
  status: CompanyMemberStatus;
  monthlyBudgetCents: number;
  spentThisPeriodCents: number;
  remainingBudgetCents: number | null;
}

export interface CompanyOverviewInvitation {
  token: string;
  email: string;
  monthlyBudgetCents: number;
  createdAtMs: number;
  expiresAtMs: number;
}

export interface CompanyOverview {
  companyId: string;
  name: string;
  walletBalanceCents: number;
  cumulativeRechargedCents: number;
  isOwner: boolean;
  myBudgetCents: number;
  myRemainingBudgetCents: number | null;
  members: CompanyOverviewMember[];
  pendingInvitations: CompanyOverviewInvitation[];
}

// Vue complète pour l'espace entreprise self-service. Owner : tous les membres
// + invitations en attente. Membre : son adhésion uniquement.
export async function getCompanyOverview(
  uid: string
): Promise<CompanyOverview | null> {
  const ctx = await getCompanyContextForUser(uid);
  if (!ctx) return null;
  const db = getAdminFirestore();
  const period = currentPeriodKey();

  const myRemaining = remainingBudgetCents(ctx.member, period);

  let members: CompanyOverviewMember[] = [];
  let pendingInvitations: CompanyOverviewInvitation[] = [];

  if (ctx.isOwner) {
    const membersSnap = await db
      .collection(COMPANIES)
      .doc(ctx.companyId)
      .collection(MEMBERS)
      .get();
    members = membersSnap.docs
      .map((d) => d.data() as CompanyMemberDoc)
      .filter((m) => m.status === "active")
      .map((m) => ({
        uid: m.uid,
        email: m.email,
        displayName: m.displayName,
        role: m.role,
        status: m.status,
        monthlyBudgetCents: m.monthlyBudgetCents,
        spentThisPeriodCents:
          m.budgetPeriodKey === period ? m.spentThisPeriodCents : 0,
        remainingBudgetCents: remainingBudgetCents(m, period),
      }));

    const invitesSnap = await db
      .collection("companyInvitations")
      .where("companyId", "==", ctx.companyId)
      .where("status", "==", "pending")
      .get();
    pendingInvitations = invitesSnap.docs.map((d) => {
      const data = d.data() as any;
      return {
        token: d.id,
        email: data.email,
        monthlyBudgetCents: data.monthlyBudgetCents ?? 0,
        createdAtMs: (data.createdAt as Timestamp)?.toMillis?.() ?? 0,
        expiresAtMs: (data.expiresAt as Timestamp)?.toMillis?.() ?? 0,
      };
    });
  }

  return {
    companyId: ctx.companyId,
    name: ctx.company.name,
    walletBalanceCents: ctx.company.walletBalanceCents ?? 0,
    cumulativeRechargedCents: ctx.company.cumulativeRechargedCents ?? 0,
    isOwner: ctx.isOwner,
    myBudgetCents: ctx.member.monthlyBudgetCents,
    myRemainingBudgetCents: myRemaining,
    members,
    pendingInvitations,
  };
}

export async function removeCompanyMember(params: {
  ownerUid: string;
  memberUid: string;
}): Promise<{ sessionsRevoked: boolean }> {
  const { ownerUid, memberUid } = params;
  const ctx = await getCompanyContextForUser(ownerUid);
  assertOwner(ctx);
  if (memberUid === ctx.company.ownerUid) {
    throw new WalletError("FORBIDDEN", "Impossible de retirer le propriétaire");
  }

  const db = getAdminFirestore();
  const companyRef = db.collection(COMPANIES).doc(ctx.companyId);
  const memberRef = companyRef.collection(MEMBERS).doc(memberUid);
  const userRef = db.collection(USERS).doc(memberUid);

  await db.runTransaction(async (tx: Transaction) => {
    const memberSnap = await tx.get(memberRef);
    if (!memberSnap.exists) {
      throw new WalletError("WALLET_NOT_FOUND", "Membre introuvable");
    }
    if ((memberSnap.data() as CompanyMemberDoc).status !== "active") {
      throw new WalletError("CONFLICT", "Ce membre n'est plus actif");
    }
    // Le rattachement vidé doit bien être celui de CETTE société.
    const userSnap = await tx.get(userRef);
    if ((userSnap.data() as { companyId?: string } | undefined)?.companyId !== ctx.companyId) {
      throw new WalletError("CONFLICT", "Ce membre n'est pas rattaché à votre société");
    }
    const companySnap = await tx.get(companyRef);
    const company = companySnap.data() as CompanyDoc;
    tx.update(memberRef, { status: "removed" });
    tx.update(companyRef, {
      memberCount: Math.max(1, (company.memberCount ?? 1) - 1),
      updatedAt: Timestamp.now(),
    });
    tx.set(
      userRef,
      { companyId: null, companyRole: null },
      { merge: true }
    );
  });

  // Retrait déjà acté : on coupe les sessions du membre. Un échec n'annule pas
  // le retrait (l'accès société est de toute façon coupé côté Firestore :
  // users/{uid}.companyId vidé), il est seulement journalisé.
  try {
    await getAdminAuth().revokeRefreshTokens(memberUid);
    return { sessionsRevoked: true };
  } catch (e) {
    console.error(
      "[company/member/remove] révocation des sessions échouée:",
      e instanceof Error ? e.message : "erreur inconnue"
    );
    return { sessionsRevoked: false };
  }
}
