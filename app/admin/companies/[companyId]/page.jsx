"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Wallet,
  TrendingUp,
  Users,
  Receipt,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  Shield,
  Mail,
  Hash,
  Crown,
  SlidersHorizontal,
} from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import AdminCompanyCreditModal from "../components/AdminCompanyCreditModal";
import {
  getCompanyById,
  getCompanyMembers,
  getCompanyTransactions,
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

export default function AdminCompanyDetailPage() {
  const params = useParams();
  const companyId = params?.companyId;
  const [company, setCompany] = useState(null);
  const [members, setMembers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [txError, setTxError] = useState(null);
  const [showCreditModal, setShowCreditModal] = useState(false);

  const fetchAll = async () => {
    if (!companyId) return;
    try {
      setIsLoading(true);
      setNotFound(false);
      setTxError(null);

      const found = await getCompanyById(companyId).catch(() => null);
      if (!found) {
        setNotFound(true);
        setCompany(null);
        setMembers([]);
        setTransactions([]);
        return;
      }
      setCompany(found);

      const mem = await getCompanyMembers(companyId).catch(() => []);
      setMembers(mem);

      try {
        const txs = await getCompanyTransactions(companyId, 100);
        setTransactions(txs);
      } catch (err) {
        console.warn("[company detail] échec chargement transactions:", err);
        setTransactions([]);
        setTxError(
          err?.message?.includes("index")
            ? "Index Firestore manquant — l'historique sera disponible une fois l'index créé (1-2 min)."
            : "Impossible de charger l'historique des transactions."
        );
      }
    } catch (err) {
      console.error("Erreur chargement société:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const stats = useMemo(() => {
    if (!company) return null;
    return {
      balanceEur: company.walletBalanceCents / 100,
      cumulativeEur: company.cumulativeRechargedCents / 100,
      memberCount: members.length,
    };
  }, [company, members]);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#ffc107]"></div>
        </div>
      </AdminLayout>
    );
  }

  if (notFound || !company) {
    return (
      <AdminLayout>
        <div className="p-6">
          <Link
            href="/admin/companies"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux sociétés
          </Link>
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">Aucune société trouvée.</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <Link
          href="/admin/companies"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux sociétés
        </Link>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Building2 className="h-6 w-6 text-[#ffc107]" />
              {company.name}
            </h1>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <Mail size={14} />
                {company.billingEmail || "—"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Hash size={14} />
                {company.id}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreditModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400 text-black font-semibold rounded-lg hover:bg-amber-300 transition-colors text-sm"
            >
              <SlidersHorizontal size={16} />
              Créditer le solde
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
              <Users size={14} />
              Collaborateurs
            </div>
            <div className="text-3xl font-bold mt-1 tabular-nums">
              {stats.memberCount}
            </div>
          </div>
        </div>

        {/* Membres */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-700" />
            <h2 className="text-lg font-semibold">Collaborateurs</h2>
          </div>
          {members.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Aucun collaborateur.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {members.map((m) => (
                <li
                  key={m.uid}
                  className="p-4 lg:px-6 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 truncate flex items-center gap-1.5">
                      {m.role === "owner" && (
                        <Crown className="h-3.5 w-3.5 text-amber-500" />
                      )}
                      {m.displayName || m.email || m.uid}
                    </div>
                    <div className="text-sm text-gray-500 truncate">{m.email}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-gray-400 uppercase tracking-wider">
                      Budget / mois
                    </div>
                    <div className="font-semibold tabular-nums text-gray-900">
                      {m.monthlyBudgetCents > 0
                        ? formatEuro(m.monthlyBudgetCents / 100)
                        : "Illimité"}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Historique consolidé */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-gray-700" />
            <h2 className="text-lg font-semibold">Historique consolidé</h2>
          </div>

          {txError ? (
            <div className="p-8 text-center">
              <p className="text-orange-700 text-sm font-semibold mb-2">⚠️ {txError}</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Aucune transaction pour cette société.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {transactions.map((tx) => {
                const { Icon, sign, color, bg, ring } = txMeta(tx.type);
                const actor = tx.adminEmail || tx.userId || "—";
                const actorDisplay =
                  actor.length > 28 ? `${actor.substring(0, 28)}…` : actor;
                return (
                  <li key={tx.id} className="p-4 lg:p-5 hover:bg-gray-50 transition-colors">
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
                        <p className="text-xs font-mono mt-1 truncate text-gray-400">
                          {actorDisplay}
                        </p>
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0">
                        <span className={`font-semibold tabular-nums text-base ${color}`}>
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
      </div>

      {showCreditModal && (
        <AdminCompanyCreditModal
          company={company}
          onClose={() => setShowCreditModal(false)}
          onSuccess={fetchAll}
        />
      )}
    </AdminLayout>
  );
}
