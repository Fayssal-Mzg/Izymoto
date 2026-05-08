"use client";

import Link from "next/link";
import { Wallet } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/lib/hooks/useWallet";
import { formatEuro } from "@/lib/wallet/tiers";

// Badge compact affiché dans le Header desktop quand l'utilisateur est connecté.
// Cliquable pour aller sur /portefeuille. Caché si pas connecté ou en cours
// de chargement (pour ne pas faire flasher l'UI).
export default function HeaderWalletBadge() {
  const { user, loading: authLoading } = useAuth();
  const { balanceEur, loading: walletLoading } = useWallet();

  if (authLoading || !user) return null;
  if (walletLoading || balanceEur === null) return null;

  return (
    <Link
      href="/portefeuille"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/15 text-white text-xs font-semibold hover:bg-white/10 transition-colors duration-200"
      title="Voir mon portefeuille"
    >
      <Wallet className="h-3.5 w-3.5 text-amber-400" />
      <span className="tabular-nums">{formatEuro(balanceEur)}</span>
    </Link>
  );
}
