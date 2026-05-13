"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bike,
  Search,
  RefreshCw,
  Loader2,
  Hourglass,
  CheckCircle2,
  XCircle,
  PauseCircle,
  ChevronRight,
} from "lucide-react";
import AdminLayout from "../components/AdminLayout";
import {
  listDrivers,
  type DriverProfile,
  type DriverStatus,
} from "@/lib/firebase/drivers";

const STATUS_FILTERS: { id: DriverStatus | "all"; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "pending", label: "En attente" },
  { id: "active", label: "Validés" },
  { id: "suspended", label: "Suspendus" },
  { id: "rejected", label: "Refusés" },
];

const STATUS_META: Record<
  DriverStatus,
  { label: string; bg: string; text: string; Icon: any }
> = {
  pending: { label: "En attente", bg: "bg-amber-50", text: "text-amber-800", Icon: Hourglass },
  active: { label: "Actif", bg: "bg-emerald-50", text: "text-emerald-800", Icon: CheckCircle2 },
  suspended: { label: "Suspendu", bg: "bg-orange-50", text: "text-orange-800", Icon: PauseCircle },
  rejected: { label: "Refusé", bg: "bg-red-50", text: "text-red-800", Icon: XCircle },
};

export default function AdminDriversPage() {
  return (
    <AdminLayout>
      <DriversList />
    </AdminLayout>
  );
}

function DriversList() {
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DriverStatus | "all">("all");
  const [search, setSearch] = useState("");

  const fetch = async () => {
    try {
      setLoading(true);
      const data = await listDrivers();
      setDrivers(data);
    } catch (err) {
      console.error("[admin chauffeurs] fetch:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  const filtered = useMemo(() => {
    let list = drivers;
    if (filter !== "all") list = list.filter((d) => d.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.email.toLowerCase().includes(q) ||
          d.firstName.toLowerCase().includes(q) ||
          d.lastName.toLowerCase().includes(q) ||
          d.moto.plate.toLowerCase().includes(q)
      );
    }
    return list;
  }, [drivers, filter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: drivers.length };
    drivers.forEach((d) => {
      c[d.status] = (c[d.status] ?? 0) + 1;
    });
    return c;
  }, [drivers]);

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Bike className="h-6 w-6 text-amber-500" />
            Chauffeurs
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Validation des dossiers et gestion de la flotte.
          </p>
        </div>
        <button
          onClick={fetch}
          disabled={loading}
          className="p-2 bg-blue-100 rounded-full hover:bg-blue-200 transition-colors"
          aria-label="Rafraîchir"
        >
          <RefreshCw
            size={18}
            className={loading ? "animate-spin" : ""}
          />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                active
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {f.label}
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] tabular-nums ${
                  active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                {counts[f.id] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Recherche par email, nom, plaque…"
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500 text-sm">
          Aucun chauffeur trouvé pour ce filtre.
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((d) => (
            <DriverRow key={d.uid} driver={d} />
          ))}
        </ul>
      )}
    </div>
  );
}

function DriverRow({ driver }: { driver: DriverProfile }) {
  const meta = STATUS_META[driver.status];
  const fullName =
    driver.firstName || driver.lastName
      ? `${driver.firstName} ${driver.lastName}`.trim()
      : driver.email;

  return (
    <li>
      <Link
        href={`/admin/chauffeurs/${driver.uid}`}
        className="flex items-center gap-3 sm:gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-amber-400 hover:shadow-sm transition-all"
      >
        <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
          <Bike className="h-5 w-5 text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {fullName}
            </p>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${meta.bg} ${meta.text}`}
            >
              <meta.Icon className="h-3 w-3" />
              {meta.label}
            </span>
          </div>
          <p className="text-xs text-gray-500 truncate">{driver.email}</p>
          <div className="text-xs text-gray-400 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
            {driver.moto.plate && <span>{driver.moto.plate}</span>}
            {driver.moto.brand && (
              <span>
                {driver.moto.brand} {driver.moto.model}
              </span>
            )}
            {driver.createdAt && (
              <span>
                Inscrit le{" "}
                {driver.createdAt.toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
      </Link>
    </li>
  );
}
