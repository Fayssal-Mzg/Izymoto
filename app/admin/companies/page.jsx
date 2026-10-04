"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { Building2, Search, RefreshCw, ChevronRight, Users } from "lucide-react";
import AdminLayout from "../components/AdminLayout";
import { getAllCompanies } from "@/lib/firebase/admin";
import { formatEuro } from "@/lib/wallet/tiers";

function formatDate(d) {
  if (!d) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
      const rows = await getAllCompanies();
      setCompanies(rows);
    } catch (error) {
      console.error("Erreur lors du chargement des sociétés:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return companies;
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.billingEmail && c.billingEmail.toLowerCase().includes(term)) ||
        c.id.toLowerCase().includes(term)
    );
  }, [companies, searchTerm]);

  const totals = useMemo(() => {
    const balance = companies.reduce((s, c) => s + c.walletBalanceCents, 0);
    const recharged = companies.reduce(
      (s, c) => s + c.cumulativeRechargedCents,
      0
    );
    return {
      count: companies.length,
      balanceEur: balance / 100,
      rechargedEur: recharged / 100,
    };
  }, [companies]);

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Building2 className="h-6 w-6 text-[#ffc107]" />
            Sociétés
          </h1>
          <button
            onClick={fetchCompanies}
            className="p-2 bg-blue-100 rounded-full hover:bg-blue-200 transition-colors"
            disabled={isLoading}
            title="Recharger"
          >
            <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-5 rounded-lg shadow">
            <div className="text-xs uppercase tracking-wider text-gray-500">
              Sociétés actives
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
            placeholder="Rechercher par nom, email ou ID…"
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
            Aucune société trouvée.
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/companies/${c.id}`}
                  className="block bg-white border border-gray-200 rounded-xl p-4 lg:p-5 hover:border-amber-400 hover:shadow-sm transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {c.name}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {c.billingEmail || "—"}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 inline-flex items-center gap-1">
                        <Users size={12} /> {c.memberCount} membre
                        {c.memberCount > 1 ? "s" : ""}
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col md:items-end items-baseline justify-between gap-3 md:gap-1 md:min-w-[180px]">
                      <div>
                        <div className="text-xs uppercase tracking-wider text-gray-400">
                          Solde
                        </div>
                        <div className="text-lg font-bold tabular-nums text-gray-900">
                          {formatEuro(c.walletBalanceCents / 100)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">
                          Cumul :{" "}
                          <span className="font-semibold tabular-nums">
                            {formatEuro(c.cumulativeRechargedCents / 100)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          MàJ {formatDate(c.updatedAt)}
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
