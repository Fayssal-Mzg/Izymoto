"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  Receipt,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  Sparkles,
  Mail,
  User,
  Hash,
} from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import {
  getAllWallets,
  getUserWalletTransactions,
} from "@/lib/firebase/admin";
import { formatEuro } from "@/lib/wallet/tiers";

const TX_LABELS = {
  recharge: "Recharge",
  debit: "Débit",
  refund: "Remboursement",
  bonus_adjustment: "Ajustement",
};

function txMeta(type) {
  switch (type) {
    case "recharge":
      return { Icon: ArrowUpRight, sign: "+", color: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-200" };
    case "debit":
      return { Icon: ArrowDownLeft, sign: "−", color: "text-red-700", bg: "bg-red-50", ring: "ring-red-200" };
    case "refund":
      return { Icon: RotateCcw, sign: "+", color: "text-blue-700", bg: "bg-blue-50", ring: "ring-blue-200" };
    case "bonus_adjustment":
      return { Icon: Sparkles, sign: "+", color: "text-amber-700", bg: "bg-amber-50", ring: "ring-amber-200" };
    default:
      return { Icon: Receipt, sign: "", color: "text-gray-700", bg: "bg-gray-50", ring: "ring-gray-200" };
  }
}

function formatDateTime(d) {
  if (!d) return "—";
  return `${d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })} · ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
}

export default function AdminWalletDetailPage() {
  const params = useParams();
  const uid = params?.uid;
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchAll = async () => {
    if (!uid) return;
    try {
      setIsLoading(true);
      setNotFound(false);
      const [allWallets, txs] = await Promise.all([
        getAllWallets(),
        getUserWalletTransactions(uid, 100),
      ]);
      const found = allWallets.find((w) => w.uid === uid);
      if (!found) {
        setNotFound(true);
        setWallet(null);
        setTransactions([]);
      } else {
        setWallet(found);
        setTransactions(txs);
      }
    } catch (err) {
      console.error("Erreur lors du chargement du portefeuille:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const stats = useMemo(() => {
    if (!wallet) return null;
    return {
      balanceEur: wallet.balanceCents / 100,
      cumulativeEur: wallet.cumulativeRechargedCents / 100,
      txCount: transactions.length,
    };
  }, [wallet, transactions]);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#ffc107]"></div>
        </div>
      </AdminLayout>
    );
  }

  if (notFound || !wallet) {
    return (
      <AdminLayout>
        <div className="p-6">
          <Link
            href="/admin/wallets"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux portefeuilles
          </Link>
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">
              Aucun portefeuille trouvé pour cet utilisateur.
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <Link
          href="/admin/wallets"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux portefeuilles
        </Link>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Wallet className="h-6 w-6 text-[#ffc107]" />
              Portefeuille de {wallet.displayName || "utilisateur sans nom"}
            </h1>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <Mail size={14} />
                {wallet.email || "—"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Hash size={14} />
                {wallet.uid}
              </span>
            </div>
          </div>
          <button
            onClick={fetchAll}
            className="p-2 bg-blue-100 rounded-full hover:bg-blue-200 transition-colors"
            disabled={isLoading}
            title="Recharger"
          >
            <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-black text-white p-5 rounded-lg shadow relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 100% 0%, rgba(251, 191, 36, 0.4), transparent 50%)",
              }}
            />
            <div className="relative">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-400">
                <Wallet size={14} />
                Solde disponible
              </div>
              <div className="text-3xl font-bold mt-1 tabular-nums">
                {formatEuro(stats.balanceEur)}
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg shadow">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500">
              <TrendingUp size={14} />
              Total rechargé
            </div>
            <div className="text-3xl font-bold mt-1 tabular-nums">
              {formatEuro(stats.cumulativeEur)}
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg shadow">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500">
              <Receipt size={14} />
              Transactions
            </div>
            <div className="text-3xl font-bold mt-1 tabular-nums">
              {stats.txCount}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-gray-700" />
            <h2 className="text-lg font-semibold">
              Historique des transactions
            </h2>
          </div>

          {transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Aucune transaction pour ce portefeuille.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Solde après
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Référence
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((tx) => {
                  const meta = txMeta(tx.type);
                  const { Icon, sign, color, bg, ring } = meta;
                  const ref =
                    tx.paymentIntentId ||
                    tx.checkoutSessionId ||
                    tx.bookingId ||
                    tx.stripeEventId ||
                    "—";
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${bg} ring-1 ${ring} ${color}`}
                        >
                          <Icon size={12} />
                          {TX_LABELS[tx.type] || tx.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">
                        {tx.description || "—"}
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-right tabular-nums ${color}`}
                      >
                        {sign}
                        {formatEuro(tx.amountCents / 100)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right tabular-nums">
                        {formatEuro(tx.balanceAfterCents / 100)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                        {formatDateTime(tx.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 font-mono">
                        {ref.length > 20 ? `${ref.substring(0, 20)}…` : ref}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {transactions.length >= 100 && (
          <p className="text-xs text-gray-500 mt-4 text-center">
            Affichage des 100 dernières transactions.
          </p>
        )}
      </div>
    </AdminLayout>
  );
}
