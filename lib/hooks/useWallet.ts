"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { useAuth } from "@/contexts/AuthContext";

export interface UseWalletResult {
  balanceCents: number | null;
  balanceEur: number | null;
  cumulativeRechargedCents: number | null;
  loading: boolean;
  hasWallet: boolean;
}

export function useWallet(): UseWalletResult {
  const { user, loading: authLoading } = useAuth();
  const [balanceCents, setBalanceCents] = useState<number | null>(null);
  const [cumulativeRechargedCents, setCumulativeRechargedCents] = useState<
    number | null
  >(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setBalanceCents(null);
      setCumulativeRechargedCents(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = onSnapshot(
      doc(db, "wallets", user.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setBalanceCents(data.balanceCents ?? 0);
          setCumulativeRechargedCents(data.cumulativeRechargedCents ?? 0);
        } else {
          setBalanceCents(0);
          setCumulativeRechargedCents(0);
        }
        setLoading(false);
      },
      (err) => {
        console.error("[useWallet] snapshot error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user, authLoading]);

  return {
    balanceCents,
    balanceEur: balanceCents !== null ? balanceCents / 100 : null,
    cumulativeRechargedCents,
    loading,
    hasWallet: balanceCents !== null && balanceCents > 0,
  };
}
