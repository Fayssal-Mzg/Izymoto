"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Wallet,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Loader2,
  Receipt,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/lib/hooks/useWallet";
import {
  useWalletTransactions,
  type WalletTransactionItem,
} from "@/lib/hooks/useWalletTransactions";
import { formatEuro } from "@/lib/wallet/tiers";
import type { WalletTransactionType } from "@/lib/wallet/server";

const TX_LABELS: Record<WalletTransactionType, string> = {
  recharge: "Recharge",
  debit: "Débit",
  refund: "Remboursement",
  bonus_adjustment: "Ajustement bonus",
};

function txMeta(type: WalletTransactionType) {
  switch (type) {
    case "recharge":
      return {
        Icon: ArrowUpRight,
        sign: "+",
        bg: "bg-emerald-50",
        ring: "ring-emerald-200",
        text: "text-emerald-700",
      };
    case "debit":
      return {
        Icon: ArrowDownLeft,
        sign: "−",
        bg: "bg-red-50",
        ring: "ring-red-200",
        text: "text-red-700",
      };
    case "refund":
      return {
        Icon: RotateCcw,
        sign: "+",
        bg: "bg-blue-50",
        ring: "ring-blue-200",
        text: "text-blue-700",
      };
    case "bonus_adjustment":
      return {
        Icon: Sparkles,
        sign: "+",
        bg: "bg-amber-50",
        ring: "ring-amber-200",
        text: "text-amber-700",
      };
  }
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TransactionRow({ tx }: { tx: WalletTransactionItem }) {
  const meta = txMeta(tx.type);
  const { Icon, sign, bg, ring, text } = meta;
  const amountEur = tx.amountCents / 100;

  return (
    <div className="flex items-start gap-4 py-4 border-b border-gray-100 last:border-b-0">
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-full ${bg} ring-1 ${ring} flex items-center justify-center`}
      >
        <Icon className={`h-5 w-5 ${text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-medium text-gray-900 truncate">
            {tx.description || TX_LABELS[tx.type]}
          </p>
          <p className={`font-semibold tabular-nums ${text}`}>
            {sign}
            {formatEuro(amountEur)}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 mt-1 text-xs text-gray-500">
          <span>
            {formatDate(tx.createdAt)} · {formatTime(tx.createdAt)}
          </span>
          <span className="tabular-nums">
            Solde : {formatEuro(tx.balanceAfterCents / 100)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ProfilPortefeuillePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { balanceEur, cumulativeRechargedCents, loading: walletLoading } =
    useWallet();
  const { transactions, loading: txLoading } = useWalletTransactions(50);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/connexion?redirectTo=/profil/portefeuille");
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const cumulativeEur =
    cumulativeRechargedCents !== null ? cumulativeRechargedCents / 100 : null;

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-50 py-10">
      <div className="max-w-4xl mx-auto px-4">
        <Link
          href="/profil"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au profil
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Mon portefeuille
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-black text-white rounded-2xl p-6 relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 100% 0%, rgba(251, 191, 36, 0.4), transparent 50%)",
              }}
            />
            <div className="relative">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-400 mb-3">
                <Wallet className="h-4 w-4" />
                Solde disponible
              </div>
              <div className="text-4xl md:text-5xl font-bold tabular-nums">
                {walletLoading || balanceEur === null ? (
                  <span className="inline-flex items-center gap-2 text-base text-gray-300">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement…
                  </span>
                ) : (
                  formatEuro(balanceEur)
                )}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Utilisable sur tous nos services. Validité 24 mois.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500 mb-3">
              <TrendingUp className="h-4 w-4" />
              Total rechargé à vie
            </div>
            <div className="text-4xl md:text-5xl font-bold tabular-nums text-gray-900">
              {walletLoading || cumulativeEur === null ? (
                <span className="inline-flex items-center gap-2 text-base text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement…
                </span>
              ) : (
                formatEuro(cumulativeEur)
              )}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Cumul de toutes vos recharges (hors bonus).
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <Link
            href="/portefeuille#paliers"
            className="inline-flex items-center justify-center gap-2 bg-amber-400 text-black font-semibold px-6 py-3 rounded-lg hover:bg-amber-300 transition-colors"
          >
            <Wallet className="h-4 w-4" />
            Recharger mon portefeuille
          </Link>
          <Link
            href="/portefeuille"
            className="inline-flex items-center justify-center gap-2 border border-gray-300 text-gray-900 font-semibold px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Voir tous les paliers
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">
              Historique des transactions
            </h2>
          </div>

          <div className="px-6">
            {txLoading ? (
              <div className="py-12 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-gray-500 mb-4">
                  Aucune transaction pour le moment.
                </p>
                <Link
                  href="/portefeuille#paliers"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-black hover:underline"
                >
                  Effectuer ma première recharge
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div>
                {transactions.map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} />
                ))}
              </div>
            )}
          </div>

          {transactions.length >= 50 && (
            <div className="px-6 py-4 border-t border-gray-100 text-xs text-gray-500 text-center">
              Affichage des 50 transactions les plus récentes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
