"use client";

import Link from "next/link";
import { Wallet, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSpendableWallet } from "@/lib/hooks/useSpendableWallet";
import { formatEuro } from "@/lib/wallet/tiers";

// Badge compact affiché dans le Header desktop quand l'utilisateur est connecté.
// Membre d'une entreprise → solde société (+ budget restant si plafonné).
// Sinon → solde perso. Cliquable vers le bon espace. Caché si pas connecté ou
// en cours de chargement (pour ne pas faire flasher l'UI).
export default function HeaderWalletBadge() {
  const { user, loading: authLoading } = useAuth();
  const { source, balanceEur, remainingBudgetEur, loading } =
    useSpendableWallet();

  if (authLoading || !user) return null;
  if (loading || balanceEur === null) return null;

  const isCompany = source === "company";

  return (
    <Link
      href={isCompany ? "/profil/entreprise" : "/portefeuille"}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/15 text-white text-xs font-semibold hover:bg-white/10 transition-colors duration-200"
      title={isCompany ? "Portefeuille entreprise" : "Voir mon portefeuille"}
    >
      {isCompany ? (
        <Building2 className="h-3.5 w-3.5 text-mint-400" />
      ) : (
        <Wallet className="h-3.5 w-3.5 text-amber-400" />
      )}
      <span className="tabular-nums">{formatEuro(balanceEur)}</span>
      {isCompany && remainingBudgetEur !== null && (
        <span className="text-white/50 tabular-nums">
          · {formatEuro(remainingBudgetEur)} dispo
        </span>
      )}
    </Link>
  );
}
