import { Timestamp } from "firebase-admin/firestore";
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

  return db.runTransaction(async (tx) => {
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
