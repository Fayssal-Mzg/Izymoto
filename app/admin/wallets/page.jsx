"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { Wallet, Search, RefreshCw, ChevronRight } from "lucide-react";
import AdminLayout from "../components/AdminLayout";
import { getAllWallets } from "@/lib/firebase/admin";
import { formatEuro } from "@/lib/wallet/tiers";

function formatDate(d) {
  if (!d) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AdminWalletsPage() {
  const [wallets, setWallets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchWallets = async () => {
    try {
      setIsLoading(true);
      const rows = await getAllWallets();
      setWallets(rows);
    } catch (error) {
      console.error("Erreur lors du chargement des portefeuilles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return wallets;
    return wallets.filter((w) => {
      return (
        (w.email && w.email.toLowerCase().includes(term)) ||
        (w.displayName && w.displayName.toLowerCase().includes(term)) ||
        w.uid.toLowerCase().includes(term)
      );
    });
  }, [wallets, searchTerm]);

  const totals = useMemo(() => {
    const totalBalance = wallets.reduce((sum, w) => sum + w.balanceCents, 0);
    const totalRecharged = wallets.reduce(
      (sum, w) => sum + w.cumulativeRechargedCents,
      0
    );
    return {
      count: wallets.length,
      balanceEur: totalBalance / 100,
      rechargedEur: totalRecharged / 100,
    };
  }, [wallets]);

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Wallet className="h-6 w-6 text-[#ffc107]" />
            Portefeuilles
          </h1>
          <button
            onClick={fetchWallets}
            className="p-2 bg-blue-100 rounded-full hover:bg-blue-200 transition-colors"
            disabled={isLoading}
            title="Recharger"
          >
            <RefreshCw
              size={20}
              className={isLoading ? "animate-spin" : ""}
            />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-5 rounded-lg shadow">
            <div className="text-xs uppercase tracking-wider text-gray-500">
              Comptes actifs
            </div>
            <div className="text-2xl font-bold mt-1 tabular-nums">
              {totals.count}
            </div>
          </div>
          <div className="bg-white p-5 rounded-lg shadow">
            <div className="text-xs uppercase tracking-wider text-gray-500">
              Solde total en circulation
            </div>
            <div className="text-2xl font-bold mt-1 tabular-nums">
              {formatEuro(totals.balanceEur)}
            </div>
          </div>
          <div className="bg-white p-5 rounded-lg shadow">
            <div className="text-xs uppercase tracking-wider text-gray-500">
              Total rechargé (cumulé)
            </div>
            <div className="text-2xl font-bold mt-1 tabular-nums">
              {formatEuro(totals.rechargedEur)}
            </div>
          </div>
        </div>

        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Rechercher par email, nom ou UID…"
            className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            Aucun portefeuille trouvé.
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((w) => (
              <li key={w.uid}>
                <Link
                  href={`/admin/wallets/${w.uid}`}
                  className="block bg-white border border-gray-200 rounded-xl p-4 lg:p-5 hover:border-amber-400 hover:shadow-sm transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                    {/* Bloc utilisateur */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {w.displayName || "Sans nom"}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {w.email || "—"}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 font-mono truncate">
                        {w.uid}
                      </div>
                    </div>

                    {/* Bloc montants + date — responsive */}
                    <div className="flex flex-row md:flex-col md:items-end items-baseline justify-between gap-3 md:gap-1 md:min-w-[180px]">
                      <div>
                        <div className="text-xs uppercase tracking-wider text-gray-400">
                          Solde
                        </div>
                        <div className="text-lg font-bold tabular-nums text-gray-900">
                          {formatEuro(w.balanceCents / 100)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">
                          Cumul :{" "}
                          <span className="font-semibold tabular-nums">
                            {formatEuro(w.cumulativeRechargedCents / 100)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          MàJ {formatDate(w.updatedAt)}
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="hidden md:block h-5 w-5 text-gray-300 flex-shrink-0" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminLayout>
  );
}
