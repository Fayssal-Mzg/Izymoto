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
  SlidersHorizontal,
  Shield,
} from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import AdminWalletAdjustModal from "../components/AdminWalletAdjustModal";
import {
  getWalletByUid,
  getAllWallets,
  getUserWalletTransactions,
} from "@/lib/firebase/admin";
import { formatEuro } from "@/lib/wallet/tiers";

const TX_LABELS = {
  recharge: "Recharge",
  debit: "Débit course",
  refund: "Remboursement",
  bonus_adjustment: "Crédit admin",
  admin_debit: "Débit admin",
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
      return { Icon: Shield, sign: "+", color: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-200" };
    case "admin_debit":
      return { Icon: Shield, sign: "−", color: "text-red-700", bg: "bg-red-50", ring: "ring-red-200" };
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
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  const [txError, setTxError] = useState(null);

  const fetchAll = async () => {
    if (!uid) return;
    try {
      setIsLoading(true);
      setNotFound(false);
      setTxError(null);

      // Lecture du wallet (lecture directe + fallback liste complète si null)
      let found = await getWalletByUid(uid).catch(() => null);
      if (!found) {
        const allWallets = await getAllWallets().catch(() => []);
        found = allWallets.find((w) => w.uid === uid) || null;
      }
      if (!found) {
        setNotFound(true);
        setWallet(null);
        setTransactions([]);
        return;
      }
      setWallet(found);

      // Lecture des transactions séparément — si l'index Firestore composite
      // (userId + createdAt desc) manque, on ne plante pas la page.
      try {
        const txs = await getUserWalletTransactions(uid, 100);
        setTransactions(txs);
      } catch (err) {
        console.warn("[wallet detail] échec chargement transactions :", err);
        setTransactions([]);
        setTxError(
          err?.message?.includes("index")
            ? "Index Firestore manquant — l'historique sera disponible une fois l'index créé (1-2 min)."
            : "Impossible de charger l'historique des transactions."
        );
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdjustModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400 text-black font-semibold rounded-lg hover:bg-amber-300 transition-colors text-sm"
            >
              <SlidersHorizontal size={16} />
              Ajuster le solde
            </button>
            <button
              onClick={fetchAll}
              className="p-2 bg-blue-100 rounded-full hover:bg-blue-200 transition-colors"
              disabled={isLoading}
              title="Recharger"
            >
              <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
            </button>
          </div>
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

          {txError ? (
            <div className="p-8 text-center">
              <p className="text-orange-700 text-sm font-semibold mb-2">
                ⚠️ {txError}
              </p>
              <p className="text-xs text-gray-500">
                L'index est créé automatiquement au premier query. Recharge la
                page dans 1-2 min.
              </p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Aucune transaction pour ce portefeuille.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {transactions.map((tx) => {
                const meta = txMeta(tx.type);
                const { Icon, sign, color, bg, ring } = meta;
                const isAdminAdjustment =
                  tx.type === "bonus_adjustment" || tx.type === "admin_debit";
                const ref = isAdminAdjustment
                  ? tx.adminEmail || tx.adminUid || "—"
                  : tx.paymentIntentId ||
                    tx.checkoutSessionId ||
                    tx.bookingId ||
                    tx.stripeEventId ||
                    "—";
                const refDisplay =
                  ref.length > 28 ? `${ref.substring(0, 28)}…` : ref;
                return (
                  <li
                    key={tx.id}
                    className="p-4 lg:p-5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3 lg:gap-4">
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-full ${bg} ring-1 ${ring} flex items-center justify-center`}
                      >
                        <Icon size={18} className={color} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-2 mb-0.5">
                          <span
                            className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${bg} ring-1 ${ring} ${color}`}
                          >
                            {TX_LABELS[tx.type] || tx.type}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDateTime(tx.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 break-words">
                          {tx.description || "—"}
                        </p>
                        <p
                          className={`text-xs font-mono mt-1 truncate ${
                            isAdminAdjustment
                              ? "text-emerald-700"
                              : "text-gray-400"
                          }`}
                          title={
                            isAdminAdjustment
                              ? `Ajustement par ${ref}`
                              : `Référence : ${ref}`
                          }
                        >
                          {isAdminAdjustment ? "👤 " : ""}
                          {refDisplay}
                        </p>
                      </div>

                      <div className="flex flex-col items-end flex-shrink-0">
                        <span
                          className={`font-semibold tabular-nums text-base ${color}`}
                        >
                          {sign}
                          {formatEuro(tx.amountCents / 100)}
                        </span>
                        <span className="text-xs text-gray-500 tabular-nums mt-0.5">
                          Solde : {formatEuro(tx.balanceAfterCents / 100)}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {transactions.length >= 100 && (
          <p className="text-xs text-gray-500 mt-4 text-center">
            Affichage des 100 dernières transactions.
          </p>
        )}
      </div>

      {showAdjustModal && (
        <AdminWalletAdjustModal
          walletUser={wallet}
          onClose={() => setShowAdjustModal(false)}
          onSuccess={fetchAll}
        />
      )}
    </AdminLayout>
  );
}
