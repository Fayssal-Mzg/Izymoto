"use client";

import { useWallet } from "@/lib/hooks/useWallet";
import { useCompany } from "@/lib/hooks/useCompany";

export interface UseSpendableWalletResult {
  /** Origine du solde dépensable. */
  source: "company" | "personal";
  /** Solde du portefeuille (société si membre, sinon perso), en €. */
  balanceEur: number | null;
  /** Montant réellement dépensable = min(solde, budget mensuel restant), en €. */
  spendableEur: number | null;
  /** Budget mensuel restant (société plafonnée), sinon null (illimité). */
  remainingBudgetEur: number | null;
  /** Nom de la société quand source === "company". */
  companyName: string | null;
  loading: boolean;
}

// Solde « dépensable » pour la bannière et le tunnel de réservation.
// - Membre d'une entreprise → portefeuille société, plafonné par le budget mensuel.
// - Sinon → portefeuille personnel (comportement historique).
export function useSpendableWallet(): UseSpendableWalletResult {
  const personal = useWallet();
  const { company, membership, remainingBudgetEur, loading: companyLoading } =
    useCompany();

  const loading = personal.loading || companyLoading;

  if (company && membership) {
    const balanceEur = company.walletBalanceCents / 100;
    const spendableEur =
      remainingBudgetEur === null
        ? balanceEur
        : Math.min(balanceEur, remainingBudgetEur);
    return {
      source: "company",
      balanceEur,
      spendableEur,
      remainingBudgetEur,
      companyName: company.name,
      loading,
    };
  }

  return {
    source: "personal",
    balanceEur: personal.balanceEur,
    spendableEur: personal.balanceEur,
    remainingBudgetEur: null,
    companyName: null,
    loading,
  };
}
