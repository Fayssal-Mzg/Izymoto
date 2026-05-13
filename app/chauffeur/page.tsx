"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Power,
  TrendingUp,
  ListChecks,
  Route,
  ArrowRight,
  Wallet,
  Loader2,
} from "lucide-react";
import DriverLayout from "@/components/chauffeur/DriverLayout";
import { useDriver } from "@/lib/hooks/useDriver";
import { useRidePool, useDriverRides } from "@/lib/hooks/useRidePool";
import { setDriverAvailability } from "@/lib/firebase/drivers";

export default function DriverDashboard() {
  return (
    <DriverLayout>
      <DashboardContent />
    </DriverLayout>
  );
}

function DashboardContent() {
  const { driver, loading } = useDriver();
  const isActive = driver?.status === "active";
  const isOnline = driver?.availability === "online";
  const { rides: poolRides } = useRidePool(isActive);
  const { rides: myRides } = useDriverRides(isActive && driver ? driver.uid : null);
  const [toggling, setToggling] = useState(false);

  const activeRides = myRides.filter((r) =>
    ["assigned", "in_progress"].includes(r.status)
  );
  const completedRides = myRides.filter((r) =>
    ["completed_by_driver", "completed"].includes(r.status)
  );
  const earningsCents = completedRides.reduce(
    (s, r) => s + (r.driverShareCents ?? 0),
    0
  );

  const handleToggle = async () => {
    if (!driver) return;
    setToggling(true);
    try {
      await setDriverAvailability(
        driver.uid,
        isOnline ? "offline" : "online"
      );
    } finally {
      setToggling(false);
    }
  };

  if (loading || !driver) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Bonjour {driver.firstName || "chauffeur"}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Vue d'ensemble de votre activité.
        </p>
      </div>

      {/* Bandeau on/off — seulement si statut actif */}
      {isActive && (
        <div
          className={`relative overflow-hidden rounded-2xl p-5 mb-6 ${
            isOnline
              ? "bg-emerald-600 text-white"
              : "bg-slate-900 text-slate-200"
          }`}
        >
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ring-2 ${
                  isOnline
                    ? "bg-white/10 ring-white/40"
                    : "bg-amber-400/10 ring-amber-400/30"
                }`}
              >
                <Power
                  className={`h-6 w-6 ${
                    isOnline ? "text-white" : "text-amber-400"
                  }`}
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider opacity-70">
                  Statut
                </p>
                <p className="text-xl sm:text-2xl font-bold">
                  {isOnline ? "En service" : "Hors service"}
                </p>
                <p className="text-xs opacity-70 mt-0.5">
                  {isOnline
                    ? "Vous voyez les courses dispo en temps réel."
                    : "Activez le service pour voir les courses disponibles."}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggle}
              disabled={toggling}
              className={`px-5 py-2.5 text-sm font-semibold rounded-md transition-colors disabled:opacity-50 ${
                isOnline
                  ? "bg-white text-emerald-700 hover:bg-emerald-50"
                  : "bg-amber-400 text-black hover:bg-amber-300"
              }`}
            >
              {toggling && (
                <Loader2 className="inline h-4 w-4 mr-1.5 animate-spin" />
              )}
              {isOnline ? "Passer hors service" : "Démarrer le service"}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard
          icon={ListChecks}
          label="Pool"
          value={isActive && isOnline ? poolRides.length : "—"}
          helper={isActive && isOnline ? "Courses dispo" : "Service inactif"}
        />
        <StatCard
          icon={Route}
          label="En cours"
          value={activeRides.length}
          helper="Courses actives"
        />
        <StatCard
          icon={TrendingUp}
          label="Terminées"
          value={driver.stats.totalRides + completedRides.length}
          helper="Total courses"
        />
        <StatCard
          icon={Wallet}
          label="Gains"
          value={`${(earningsCents / 100).toFixed(0)}€`}
          helper="Cumul brut"
          accent
        />
      </div>

      {isActive && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ActionCard
            href="/chauffeur/courses"
            title="Voir le pool"
            description={`${poolRides.length} course${poolRides.length > 1 ? "s" : ""} en attente`}
            icon={ListChecks}
            disabled={!isOnline}
          />
          <ActionCard
            href="/chauffeur/mes-courses"
            title="Mes courses"
            description={`${activeRides.length} en cours · ${completedRides.length} terminée${completedRides.length > 1 ? "s" : ""}`}
            icon={Route}
          />
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  helper,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  helper: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-4 ${
        accent
          ? "bg-slate-900 text-white"
          : "bg-white border border-slate-200"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-[10px] uppercase tracking-wider ${
            accent ? "text-slate-400" : "text-slate-500"
          }`}
        >
          {label}
        </span>
        <Icon
          className={`h-4 w-4 ${accent ? "text-amber-400" : "text-slate-400"}`}
        />
      </div>
      <div
        className={`text-2xl font-bold tabular-nums ${
          accent ? "text-white" : "text-slate-900"
        }`}
      >
        {value}
      </div>
      <div
        className={`text-[10px] mt-0.5 ${
          accent ? "text-slate-400" : "text-slate-500"
        }`}
      >
        {helper}
      </div>
    </div>
  );
}

function ActionCard({
  href,
  title,
  description,
  icon: Icon,
  disabled,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}) {
  const inner = (
    <>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
          <Icon className="h-5 w-5 text-amber-700" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-slate-400" />
    </>
  );

  const className = `flex items-center justify-between gap-3 p-4 rounded-xl border transition-all ${
    disabled
      ? "bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed"
      : "bg-white border-slate-200 hover:border-amber-400 hover:shadow-sm"
  }`;

  if (disabled) {
    return <div className={className}>{inner}</div>;
  }
  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}
