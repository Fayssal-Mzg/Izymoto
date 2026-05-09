import { Timestamp, type Transaction } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin-server";
import { getTierById, type WalletTier } from "@/lib/wallet/tiers";

export type WalletTransactionType =
  | "recharge"
  | "debit"
  | "refund"
  | "bonus_adjustment";

export interface WalletDoc {
  userId: string;
  balanceCents: number;
  cumulativeRechargedCents: number;
  currency: "EUR";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface WalletTransactionDoc {
  userId: string;
  type: WalletTransactionType;
  amountCents: number;
  balanceAfterCents: number;
  description: string;
  tierId?: string;
  paymentIntentId?: string;
  checkoutSessionId?: string;
  bookingId?: string;
  stripeEventId?: string;
  createdAt: Timestamp;
}

const WALLETS = "wallets";
const WALLET_TX = "walletTransactions";

export async function getWalletBalance(userId: string): Promise<number> {
  const db = getAdminFirestore();
  const snap = await db.collection(WALLETS).doc(userId).get();
  if (!snap.exists) return 0;
  return (snap.data() as WalletDoc).balanceCents ?? 0;
}

export interface CreditWalletParams {
  userId: string;
  amountCents: number;
  type: WalletTransactionType;
  description: string;
  tierId?: string;
  paymentIntentId?: string;
  checkoutSessionId?: string;
  stripeEventId: string;
  isRecharge?: boolean;
}

// Crédite le wallet de manière idempotente : on utilise l'eventId Stripe comme
// docId de la transaction-ledger. Si l'event est redélivré, on skip.
export async function creditWallet(
  params: CreditWalletParams
): Promise<{ credited: boolean; balanceAfterCents: number }> {
  const {
    userId,
    amountCents,
    type,
    description,
    tierId,
    paymentIntentId,
    checkoutSessionId,
    stripeEventId,
    isRecharge = true,
  } = params;

  if (amountCents <= 0) {
    throw new Error("creditWallet: amountCents must be positive");
  }

  const db = getAdminFirestore();
  const walletRef = db.collection(WALLETS).doc(userId);
  const txRef = db.collection(WALLET_TX).doc(stripeEventId);

  return db.runTransaction(async (tx: Transaction) => {
    const txSnap = await tx.get(txRef);
    if (txSnap.exists) {
      const existing = txSnap.data() as WalletTransactionDoc;
      return {
        credited: false,
        balanceAfterCents: existing.balanceAfterCents,
      };
    }

    const walletSnap = await tx.get(walletRef);
    const now = Timestamp.now();
    const previousBalance = walletSnap.exists
      ? ((walletSnap.data() as WalletDoc).balanceCents ?? 0)
      : 0;
    const previousCumulative = walletSnap.exists
      ? ((walletSnap.data() as WalletDoc).cumulativeRechargedCents ?? 0)
      : 0;

    const newBalance = previousBalance + amountCents;
    const newCumulative = isRecharge
      ? previousCumulative + amountCents
      : previousCumulative;

    if (walletSnap.exists) {
      tx.update(walletRef, {
        balanceCents: newBalance,
        cumulativeRechargedCents: newCumulative,
        updatedAt: now,
      });
    } else {
      tx.set(walletRef, {
        userId,
        balanceCents: newBalance,
        cumulativeRechargedCents: newCumulative,
        currency: "EUR",
        createdAt: now,
        updatedAt: now,
      } satisfies WalletDoc);
    }

    const txDoc: WalletTransactionDoc = {
      userId,
      type,
      amountCents,
      balanceAfterCents: newBalance,
      description,
      stripeEventId,
      createdAt: now,
      ...(tierId ? { tierId } : {}),
      ...(paymentIntentId ? { paymentIntentId } : {}),
      ...(checkoutSessionId ? { checkoutSessionId } : {}),
    };
    tx.set(txRef, txDoc);

    return { credited: true, balanceAfterCents: newBalance };
  });
}

export function buildRechargeDescription(tier: WalletTier): string {
  return `Recharge ${tier.name} : ${tier.rechargeAmount} € + ${tier.bonusAmount} € de bonus`;
}

export function getTierOrThrow(tierId: string): WalletTier {
  const tier = getTierById(tierId);
  if (!tier) {
    throw new Error(`Unknown tier id: ${tierId}`);
  }
  return tier;
}

export interface DebitWalletForBookingParams {
  userId: string;
  amountCents: number;
  bookingData: Record<string, unknown>;
  clientToken: string;
  description?: string;
}

export interface DebitWalletForBookingResult {
  bookingId: string;
  reservationId: string;
  balanceAfterCents: number;
}

export class WalletError extends Error {
  code: "INSUFFICIENT_BALANCE" | "WALLET_NOT_FOUND" | "INVALID_AMOUNT";
  constructor(code: WalletError["code"], message: string) {
    super(message);
    this.code = code;
    this.name = "WalletError";
  }
}

const BOOKINGS = "bookings";

// Débite atomiquement le wallet et crée le booking associé dans la même
// transaction Firestore. Idempotent via `clientToken` : si la même requête est
// rejouée (retry réseau, double-clic), on retourne le résultat de la première
// exécution sans débiter une seconde fois.
//
// Utilise le clientToken comme docId de walletTransactions pour garantir l'unicité.
export async function debitWalletForBooking(
  params: DebitWalletForBookingParams
): Promise<DebitWalletForBookingResult> {
  const { userId, amountCents, bookingData, clientToken, description } = params;

  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    throw new WalletError("INVALID_AMOUNT", "amountCents doit être positif");
  }

  const db = getAdminFirestore();
  const walletRef = db.collection(WALLETS).doc(userId);
  const txRef = db.collection(WALLET_TX).doc(clientToken);
  const bookingRef = db.collection(BOOKINGS).doc();
  const reservationId = `CMD-${Math.random()
    .toString(36)
    .substring(2, 10)
    .toUpperCase()}`;

  return db.runTransaction(async (tx: Transaction) => {
    const existingTxSnap = await tx.get(txRef);
    if (existingTxSnap.exists) {
      const existing = existingTxSnap.data() as WalletTransactionDoc;
      return {
        bookingId: existing.bookingId ?? "",
        reservationId: (existing as any).reservationId ?? "",
        balanceAfterCents: existing.balanceAfterCents,
      };
    }

    const walletSnap = await tx.get(walletRef);
    if (!walletSnap.exists) {
      throw new WalletError(
        "WALLET_NOT_FOUND",
        "Aucun portefeuille trouvé pour cet utilisateur"
      );
    }

    const wallet = walletSnap.data() as WalletDoc;
    if (wallet.balanceCents < amountCents) {
      throw new WalletError(
        "INSUFFICIENT_BALANCE",
        `Solde insuffisant : ${wallet.balanceCents} cents disponibles, ${amountCents} requis`
      );
    }

    const now = Timestamp.now();
    const newBalance = wallet.balanceCents - amountCents;

    tx.update(walletRef, {
      balanceCents: newBalance,
      updatedAt: now,
    });

    tx.set(bookingRef, {
      ...bookingData,
      userId,
      reservationId,
      paymentMethod: "wallet",
      paymentStatus: "paid_wallet",
      walletAmountCents: amountCents,
      isPaid: true,
      status: "confirmed",
      createdAt: now,
    });

    const txDoc: WalletTransactionDoc & { reservationId?: string } = {
      userId,
      type: "debit",
      amountCents,
      balanceAfterCents: newBalance,
      description: description || `Course ${reservationId}`,
      bookingId: bookingRef.id,
      reservationId,
      createdAt: now,
    };
    tx.set(txRef, txDoc);

    return {
      bookingId: bookingRef.id,
      reservationId,
      balanceAfterCents: newBalance,
    };
  });
}

export interface DebitWalletForHybridBookingParams {
  userId: string;
  walletAmountCents: number;
  cardAmountCents: number;
  paymentIntentId: string;
  bookingData: Record<string, unknown>;
  clientToken: string;
  description?: string;
}

// Pendant hybride de debitWalletForBooking : débite la part wallet et crée le
// booking après confirmation 3DS Stripe. Le PaymentIntent est déjà en hold
// (status requires_capture), la capture admin déclenchera le débit CB final.
//
// En cas d'erreur de débit (solde insuffisant entre temps), le caller doit
// cancel le PaymentIntent Stripe pour libérer le hold CB.
export async function debitWalletForHybridBooking(
  params: DebitWalletForHybridBookingParams
): Promise<DebitWalletForBookingResult> {
  const {
    userId,
    walletAmountCents,
    cardAmountCents,
    paymentIntentId,
    bookingData,
    clientToken,
    description,
  } = params;

  if (!Number.isFinite(walletAmountCents) || walletAmountCents <= 0) {
    throw new WalletError("INVALID_AMOUNT", "walletAmountCents doit être positif");
  }
  if (!Number.isFinite(cardAmountCents) || cardAmountCents <= 0) {
    throw new WalletError("INVALID_AMOUNT", "cardAmountCents doit être positif");
  }

  const db = getAdminFirestore();
  const walletRef = db.collection(WALLETS).doc(userId);
  const txRef = db.collection(WALLET_TX).doc(clientToken);
  const bookingRef = db.collection(BOOKINGS).doc();
  const reservationId = `CMD-${Math.random()
    .toString(36)
    .substring(2, 10)
    .toUpperCase()}`;
  const totalCents = walletAmountCents + cardAmountCents;

  return db.runTransaction(async (tx: Transaction) => {
    const existingTxSnap = await tx.get(txRef);
    if (existingTxSnap.exists) {
      const existing = existingTxSnap.data() as WalletTransactionDoc;
      return {
        bookingId: existing.bookingId ?? "",
        reservationId: (existing as any).reservationId ?? "",
        balanceAfterCents: existing.balanceAfterCents,
      };
    }

    const walletSnap = await tx.get(walletRef);
    if (!walletSnap.exists) {
      throw new WalletError(
        "WALLET_NOT_FOUND",
        "Aucun portefeuille trouvé pour cet utilisateur"
      );
    }

    const wallet = walletSnap.data() as WalletDoc;
    if (wallet.balanceCents < walletAmountCents) {
      throw new WalletError(
        "INSUFFICIENT_BALANCE",
        `Solde insuffisant : ${wallet.balanceCents} cents, ${walletAmountCents} requis`
      );
    }

    const now = Timestamp.now();
    const newBalance = wallet.balanceCents - walletAmountCents;

    tx.update(walletRef, {
      balanceCents: newBalance,
      updatedAt: now,
    });

    tx.set(bookingRef, {
      ...bookingData,
      userId,
      reservationId,
      paymentMethod: "hybrid",
      paymentStatus: "authorized",
      paymentId: paymentIntentId,
      walletAmountCents,
      cardAmountCents,
      amountAuthorized: cardAmountCents / 100,
      prix: totalCents / 100,
      isPaid: false,
      status: "confirmed",
      createdAt: now,
    });

    const txDoc: WalletTransactionDoc & { reservationId?: string } = {
      userId,
      type: "debit",
      amountCents: walletAmountCents,
      balanceAfterCents: newBalance,
      description:
        description ||
        `Course ${reservationId} (part portefeuille — hybride wallet+CB)`,
      bookingId: bookingRef.id,
      paymentIntentId,
      reservationId,
      createdAt: now,
    };
    tx.set(txRef, txDoc);

    return {
      bookingId: bookingRef.id,
      reservationId,
      balanceAfterCents: newBalance,
    };
  });
}

// Re-crédite le wallet après annulation d'un booking payé par wallet.
// Idempotent via `refundEventId` (généralement bookingId+":refund").
export interface RefundWalletForBookingParams {
  userId: string;
  amountCents: number;
  bookingId: string;
  refundEventId: string;
  description?: string;
}

export async function refundWalletForBooking(
  params: RefundWalletForBookingParams
): Promise<{ refunded: boolean; balanceAfterCents: number }> {
  const { userId, amountCents, bookingId, refundEventId, description } = params;

  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    throw new WalletError("INVALID_AMOUNT", "amountCents doit être positif");
  }

  const db = getAdminFirestore();
  const walletRef = db.collection(WALLETS).doc(userId);
  const txRef = db.collection(WALLET_TX).doc(refundEventId);

  return db.runTransaction(async (tx: Transaction) => {
    const existing = await tx.get(txRef);
    if (existing.exists) {
      const data = existing.data() as WalletTransactionDoc;
      return { refunded: false, balanceAfterCents: data.balanceAfterCents };
    }

    const walletSnap = await tx.get(walletRef);
    if (!walletSnap.exists) {
      throw new WalletError(
        "WALLET_NOT_FOUND",
        "Aucun portefeuille trouvé pour cet utilisateur"
      );
    }

    const wallet = walletSnap.data() as WalletDoc;
    const now = Timestamp.now();
    const newBalance = wallet.balanceCents + amountCents;

    tx.update(walletRef, { balanceCents: newBalance, updatedAt: now });

    tx.set(txRef, {
      userId,
      type: "refund",
      amountCents,
      balanceAfterCents: newBalance,
      description: description || `Remboursement annulation course`,
      bookingId,
      createdAt: now,
    } satisfies WalletTransactionDoc);

    return { refunded: true, balanceAfterCents: newBalance };
  });
}
