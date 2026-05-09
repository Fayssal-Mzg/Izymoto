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
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Solde
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total rechargé
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mise à jour
                  </th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      Aucun portefeuille trouvé.
                    </td>
                  </tr>
                ) : (
                  filtered.map((w) => (
                    <tr key={w.uid} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {w.displayName || "Sans nom"}
                        </div>
                        <div className="text-xs text-gray-400">
                          UID : {w.uid.substring(0, 10)}…
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {w.email || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-right tabular-nums">
                        {formatEuro(w.balanceCents / 100)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right tabular-nums">
                        {formatEuro(w.cumulativeRechargedCents / 100)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(w.updatedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <Link
                          href={`/admin/wallets/${w.uid}`}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Détail
                          <ChevronRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
