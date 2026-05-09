"use client";

import Link from "next/link";
import AdminLayout from "./components/AdminLayout";
import {
  getAdminStats,
  getAllWallets,
  getAllBookings,
} from "@/lib/firebase/admin";
import { formatEuro } from "@/lib/wallet/tiers";
import { useState, useEffect } from "react";
import {
  CalendarClock,
  Users,
  TrendingUp,
  Wallet,
  Sparkles,
  ArrowRight,
  Clock,
  ChevronRight,
  CreditCard,
} from "lucide-react";

const STATUS_META = {
  confirmed: { label: "Confirmée", bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  pending: { label: "En attente", bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-500" },
  completed: { label: "Terminée", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  cancelled: { label: "Annulée", bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
};

function getStatusMeta(status) {
  return (
    STATUS_META[status] || {
      label: status,
      bg: "bg-gray-50",
      text: "text-gray-700",
      dot: "bg-gray-400",
    }
  );
}

function formatRelativeDate(d) {
  const date = new Date(d);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatCard({ icon: Icon, label, value, accent, helper, dark = false }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 ${
        dark ? "bg-black text-white" : "bg-white border border-gray-100"
      }`}
    >
      {dark && (
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 100% 0%, rgba(251, 191, 36, 0.4), transparent 50%)",
          }}
        />
      )}
      <div className="relative">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span
            className={`text-xs uppercase tracking-wider ${
              dark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {label}
          </span>
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              dark
                ? "bg-amber-400/10 ring-1 ring-amber-400/30"
                : `${accent || "bg-gray-100"}`
            }`}
          >
            <Icon
              className={`h-4 w-4 ${
                dark ? "text-amber-400" : "text-gray-700"
              }`}
            />
          </div>
        </div>
        <div
          className={`text-3xl font-bold tabular-nums ${
            dark ? "text-white" : "text-gray-900"
          }`}
        >
          {value}
        </div>
        {helper && (
          <div
            className={`text-xs mt-1 ${
              dark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {helper}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [walletStats, setWalletStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsData, wallets, bookings] = await Promise.all([
          getAdminStats(),
          getAllWallets(),
          getAllBookings(),
        ]);
        setStats(statsData);

        const totalBalance = wallets.reduce((s, w) => s + w.balanceCents, 0);
        const totalRecharged = wallets.reduce(
          (s, w) => s + w.cumulativeRechargedCents,
          0
        );
        setWalletStats({
          count: wallets.length,
          balanceEur: totalBalance / 100,
          rechargedEur: totalRecharged / 100,
        });

        setRecentBookings(bookings.slice(0, 5));
      } catch (error) {
        console.error("Erreur lors du chargement du tableau de bord:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAll();
  }, []);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ffc107]"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="px-2 sm:px-4 lg:px-6 max-w-7xl mx-auto">
        <div className="mb-6 lg:mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Tableau de bord
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Vue d'ensemble de l'activité Izymoto.
          </p>
        </div>

        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3 px-1">
            Activité courses
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <StatCard
              icon={CalendarClock}
              label="Réservations"
              value={stats?.totalBookings || 0}
              accent="bg-blue-50"
              helper="Toutes périodes confondues"
            />
            <StatCard
              icon={Clock}
              label="Aujourd'hui"
              value={stats?.todayBookings || 0}
              accent="bg-purple-50"
              helper={
                stats?.todayBookings === 1
                  ? "1 nouvelle course"
                  : `${stats?.todayBookings || 0} nouvelles courses`
              }
            />
            <StatCard
              icon={Users}
              label="Utilisateurs"
              value={stats?.totalUsers || 0}
              accent="bg-emerald-50"
              helper="Comptes actifs"
            />
            <StatCard
              icon={TrendingUp}
              label="Chiffre d'affaires"
              value={`${(stats?.totalRevenue || 0).toFixed(0)}€`}
              accent="bg-amber-50"
              helper="Total brut"
            />
          </div>
        </section>

        <section className="mb-8">
          <div className="flex items-baseline justify-between mb-3 px-1">
            <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
              Portefeuilles
            </h2>
            <Link
              href="/admin/wallets"
              className="text-xs font-semibold text-gray-700 hover:text-black inline-flex items-center gap-1"
            >
              Tout voir
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4">
            <StatCard
              icon={Wallet}
              label="Solde en circulation"
              value={formatEuro(walletStats?.balanceEur || 0)}
              dark
              helper="Crédit utilisable par les clients"
            />
            <StatCard
              icon={Sparkles}
              label="Total rechargé"
              value={formatEuro(walletStats?.rechargedEur || 0)}
              accent="bg-amber-50"
              helper="Cumul historique"
            />
            <StatCard
              icon={Users}
              label="Comptes wallet"
              value={walletStats?.count || 0}
              accent="bg-blue-50"
              helper={
                walletStats?.count === 1
                  ? "1 utilisateur"
                  : `${walletStats?.count || 0} utilisateurs`
              }
            />
          </div>
        </section>

        <section>
          <div className="flex items-baseline justify-between mb-3 px-1">
            <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
              Réservations récentes
            </h2>
            <Link
              href="/admin/reservations"
              className="text-xs font-semibold text-gray-700 hover:text-black inline-flex items-center gap-1"
            >
              Tout voir
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            {recentBookings.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                Aucune réservation pour le moment.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentBookings.map((booking) => {
                  const statusMeta = getStatusMeta(booking.status);
                  const isWallet = booking.paymentMethod === "wallet";
                  return (
                    <li key={booking.id}>
                      <Link
                        href="/admin/reservations"
                        className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 p-4 hover:bg-gray-50 transition-colors"
                      >
                        {/* Client + trajet */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-sm font-semibold text-gray-900 truncate">
                              {booking.name || "—"}
                            </span>
                            <span className="font-mono text-xs text-gray-400">
                              #{booking.reservationId || booking.id.substring(0, 6)}
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="flex flex-col items-center pt-1 flex-shrink-0">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <div className="w-px h-3 bg-gray-300 my-0.5" />
                              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            </div>
                            <div className="flex-1 min-w-0 text-xs text-gray-600 space-y-0.5">
                              <div className="truncate">{booking.depart || "—"}</div>
                              <div className="truncate">{booking.arrivee || "—"}</div>
                            </div>
                          </div>
                        </div>

                        {/* Meta */}
                        <div className="flex flex-row md:flex-col md:items-end items-center justify-between gap-2 md:gap-1.5 md:min-w-[140px]">
                          <div className="flex flex-wrap gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${statusMeta.bg} ${statusMeta.text}`}
                            >
                              <span className={`w-1 h-1 rounded-full ${statusMeta.dot}`} />
                              {statusMeta.label}
                            </span>
                            {isWallet ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                                <Wallet className="h-3 w-3" />
                                Wallet
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs">
                                <CreditCard className="h-3 w-3" />
                                CB
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-base font-bold tabular-nums text-gray-900">
                              {Number(booking.prix || 0).toFixed(0)}€
                            </span>
                            <span className="text-xs text-gray-400 hidden md:inline">
                              {formatRelativeDate(booking.createdAt)}
                            </span>
                          </div>
                        </div>

                        <ArrowRight className="hidden md:block h-4 w-4 text-gray-300 flex-shrink-0" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
