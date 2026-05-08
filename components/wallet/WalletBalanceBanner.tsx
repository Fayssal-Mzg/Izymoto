"use client";

import Link from "next/link";
import { Wallet, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/lib/hooks/useWallet";
import { formatEuro } from "@/lib/wallet/tiers";

export default function WalletBalanceBanner() {
  const { user, loading: authLoading } = useAuth();
  const { balanceEur, loading: walletLoading } = useWallet();

  if (authLoading) return null;

  if (!user) {
    return (
      <section className="bg-gray-50 border-y border-gray-200">
        <div className="container mx-auto px-4 md:px-6 py-4 md:py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <Wallet className="h-4 w-4" />
              <span>
                Connectez-vous pour visualiser votre solde et recharger en un
                clic.
              </span>
            </div>
            <Link
              href={`/connexion?redirectTo=${encodeURIComponent(
                "/portefeuille"
              )}`}
              className="inline-flex items-center gap-1.5 font-semibold text-black hover:underline"
            >
              Se connecter
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-black text-white border-y border-amber-400/20">
      <div className="container mx-auto px-4 md:px-6 py-5 md:py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-400">
                Solde de votre portefeuille
              </div>
              <div className="text-2xl md:text-3xl font-bold tabular-nums">
                {walletLoading || balanceEur === null ? (
                  <span className="inline-flex items-center gap-2 text-base text-gray-300">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement...
                  </span>
                ) : (
                  formatEuro(balanceEur)
                )}
              </div>
            </div>
          </div>
          <Link
            href="#paliers"
            className="inline-flex items-center gap-2 bg-amber-400 text-black font-semibold px-5 py-2.5 rounded-lg hover:bg-amber-300 transition-colors duration-200 text-sm"
          >
            Recharger
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
