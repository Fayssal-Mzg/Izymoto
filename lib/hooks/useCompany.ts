"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { useAuth } from "@/contexts/AuthContext";

export interface CompanyInfo {
  id: string;
  name: string;
  walletBalanceCents: number;
  cumulativeRechargedCents: number;
  ownerUid: string;
  memberCount: number;
}

export interface CompanyMembership {
  role: "owner" | "member";
  status: "active" | "removed";
  monthlyBudgetCents: number;
  spentThisPeriodCents: number;
  budgetPeriodKey: string;
}

export interface UseCompanyResult {
  company: CompanyInfo | null;
  membership: CompanyMembership | null;
  isOwner: boolean;
  /** Budget mensuel restant en € (null = illimité ou pas de société). */
  remainingBudgetEur: number | null;
  loading: boolean;
}

function currentPeriodKey(): string {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "00";
  return `${y}-${m}`;
}

// Résout la société de l'utilisateur connecté en temps réel (solde partagé +
// son adhésion/budget). Les reads supposent des règles Firestore autorisant un
// membre à lire SA société (voir firestore.rules).
export function useCompany(): UseCompanyResult {
  const { user, loading: authLoading } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [userResolved, setUserResolved] = useState(false);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [membership, setMembership] = useState<CompanyMembership | null>(null);

  // 1) Écoute users/{uid} pour récupérer companyId.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setCompanyId(null);
      setUserResolved(true);
      return;
    }
    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        const data = snap.data() as { companyId?: string } | undefined;
        setCompanyId(data?.companyId ?? null);
        setUserResolved(true);
      },
      () => setUserResolved(true)
    );
    return () => unsub();
  }, [user, authLoading]);

  // 2) Écoute la société + l'adhésion quand companyId est connu.
  useEffect(() => {
    if (!user || !companyId) {
      setCompany(null);
      setMembership(null);
      return;
    }
    const unsubCompany = onSnapshot(
      doc(db, "companies", companyId),
      (snap) => {
        if (!snap.exists()) {
          setCompany(null);
          return;
        }
        const d = snap.data() as any;
        setCompany({
          id: snap.id,
          name: d.name,
          walletBalanceCents: d.walletBalanceCents ?? 0,
          cumulativeRechargedCents: d.cumulativeRechargedCents ?? 0,
          ownerUid: d.ownerUid,
          memberCount: d.memberCount ?? 1,
        });
      },
      () => setCompany(null)
    );
    const unsubMember = onSnapshot(
      doc(db, "companies", companyId, "members", user.uid),
      (snap) => {
        if (!snap.exists()) {
          setMembership(null);
          return;
        }
        const d = snap.data() as any;
        setMembership({
          role: d.role,
          status: d.status,
          monthlyBudgetCents: d.monthlyBudgetCents ?? 0,
          spentThisPeriodCents: d.spentThisPeriodCents ?? 0,
          budgetPeriodKey: d.budgetPeriodKey ?? "",
        });
      },
      () => setMembership(null)
    );
    return () => {
      unsubCompany();
      unsubMember();
    };
  }, [user, companyId]);

  const activeMembership =
    membership && membership.status === "active" ? membership : null;

  let remainingBudgetEur: number | null = null;
  if (activeMembership && activeMembership.monthlyBudgetCents > 0) {
    const spent =
      activeMembership.budgetPeriodKey === currentPeriodKey()
        ? activeMembership.spentThisPeriodCents
        : 0;
    remainingBudgetEur =
      Math.max(0, activeMembership.monthlyBudgetCents - spent) / 100;
  }

  const loading = authLoading || (!!user && !userResolved);

  return {
    company: activeMembership ? company : null,
    membership: activeMembership,
    isOwner: activeMembership?.role === "owner",
    remainingBudgetEur,
    loading,
  };
}
