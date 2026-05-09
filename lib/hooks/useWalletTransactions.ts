"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { useAuth } from "@/contexts/AuthContext";
import type { WalletTransactionType } from "@/lib/wallet/server";

export interface WalletTransactionItem {
  id: string;
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
  createdAt: Date;
}

export interface UseWalletTransactionsResult {
  transactions: WalletTransactionItem[];
  loading: boolean;
  error: string | null;
}

// Snapshot temps réel des transactions du user connecté.
// Index Firestore composite requis : (userId asc, createdAt desc) — Firestore
// propose un lien de création au premier query si manquant.
export function useWalletTransactions(
  max: number = 50
): UseWalletTransactionsResult {
  const { user, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<WalletTransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, "walletTransactions"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(max)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: WalletTransactionItem[] = snap.docs.map((d) => {
          const data = d.data();
          const ts = data.createdAt as Timestamp | undefined;
          return {
            id: d.id,
            userId: data.userId,
            type: data.type,
            amountCents: data.amountCents,
            balanceAfterCents: data.balanceAfterCents,
            description: data.description,
            tierId: data.tierId,
            paymentIntentId: data.paymentIntentId,
            checkoutSessionId: data.checkoutSessionId,
            bookingId: data.bookingId,
            stripeEventId: data.stripeEventId,
            createdAt: ts ? ts.toDate() : new Date(),
          };
        });
        setTransactions(items);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error("[useWalletTransactions] snapshot error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user, authLoading, max]);

  return { transactions, loading, error };
}
