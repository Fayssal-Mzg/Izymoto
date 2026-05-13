"use client";

import { useState } from "react";
import { Loader2, Calendar, Phone, AlertCircle, Play, CheckCircle2, RotateCcw } from "lucide-react";
import DriverLayout from "@/components/chauffeur/DriverLayout";
import { useDriver } from "@/lib/hooks/useDriver";
import { useDriverRides } from "@/lib/hooks/useRidePool";
import {
  startRide,
  completeRide,
  releaseRide,
  RideUnavailableError,
} from "@/lib/firebase/dispatch";

const STATUS_META: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
  assigned: { label: "À démarrer", bg: "bg-amber-50", text: "text-amber-800", dot: "bg-amber-500" },
  in_progress: { label: "En cours", bg: "bg-blue-50", text: "text-blue-800", dot: "bg-blue-500" },
  completed_by_driver: { label: "Terminée", bg: "bg-emerald-50", text: "text-emerald-800", dot: "bg-emerald-500" },
  completed: { label: "Capturée", bg: "bg-emerald-100", text: "text-emerald-900", dot: "bg-emerald-600" },
  cancelled: { label: "Annulée", bg: "bg-red-50", text: "text-red-800", dot: "bg-red-500" },
};

export default function MyRidesPage() {
  return (
    <DriverLayout>
      <RidesContent />
    </DriverLayout>
  );
}

function RidesContent() {
  const { driver, loading } = useDriver();
  const { rides, loading: ridesLoading } = useDriverRides(driver?.uid ?? null);

  if (loading || !driver) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const active = rides.filter((r) =>
    ["assigned", "in_progress"].includes(r.status)
  );
  const past = rides.filter((r) =>
    ["completed_by_driver", "completed", "cancelled"].includes(r.status)
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Mes courses
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Vos courses en cours et votre historique.
        </p>
      </div>

      {ridesLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        </div>
      ) : rides.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center">
          <p className="text-sm text-slate-500">
            Aucune course pour le moment. Acceptez une course depuis le pool.
          </p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <section className="mb-7">
              <h2 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">
                En cours ({active.length})
              </h2>
              <div className="space-y-3">
                {active.map((r) => (
                  <RideCard key={r.id} ride={r} driverId={driver.uid} />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">
                Historique ({past.length})
              </h2>
              <div className="space-y-3">
                {past.map((r) => (
                  <RideCard key={r.id} ride={r} driverId={driver.uid} readonly />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function RideCard({
  ride,
  driverId,
  readonly,
}: {
  ride: any;
  driverId: string;
  readonly?: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const meta = STATUS_META[ride.status] ?? {
    label: ride.status,
    bg: "bg-slate-100",
    text: "text-slate-700",
    dot: "bg-slate-400",
  };

  const driverShareEur = (ride.driverShareCents ?? Math.round(ride.prix * 80)) / 100;

  const run = async (action: "start" | "complete" | "release") => {
    setBusy(action);
    setError(null);
    try {
      if (action === "start") await startRide(ride.id, driverId);
      else if (action === "complete") await completeRide(ride.id, driverId);
      else if (action === "release") {
        const reason = prompt("Motif de libération de la course ?");
        if (!reason) {
          setBusy(null);
          return;
        }
        await releaseRide(ride.id, driverId, reason);
      }
    } catch (err: any) {
      setError(
        err instanceof RideUnavailableError ? err.message : "Échec de l'action."
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider">
            Course #{ride.reservationId || ride.id.substring(0, 6)}
          </p>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold mt-1 ${meta.bg} ${meta.text}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Votre part</div>
          <div className="text-lg font-bold tabular-nums text-emerald-700">
            {driverShareEur.toFixed(2)}€
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 mb-3">
        <div className="flex flex-col items-center pt-1.5 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <div className="w-px h-6 bg-slate-300 my-1" />
          <div className="w-2 h-2 rounded-full bg-red-500" />
        </div>
        <div className="flex-1 min-w-0 space-y-2 text-sm">
          <div className="break-words text-slate-900">{ride.depart}</div>
          <div className="break-words text-slate-900">{ride.arrivee}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mb-3">
        {ride.reservationDate && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {ride.reservationDate.toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}{" "}
            ·{" "}
            {ride.reservationDate.toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
        {ride.phone && ride.status !== "cancelled" && (
          <a
            href={`tel:${ride.phone}`}
            className="inline-flex items-center gap-1 text-amber-700 hover:underline font-medium"
          >
            <Phone className="h-3.5 w-3.5" />
            {ride.phone}
          </a>
        )}
      </div>

      {error && (
        <div className="mb-3 flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!readonly && (
        <div className="flex flex-col sm:flex-row gap-2">
          {ride.status === "assigned" && (
            <>
              <button
                onClick={() => run("start")}
                disabled={busy !== null}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {busy === "start" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Démarrer
              </button>
              <button
                onClick={() => run("release")}
                disabled={busy !== null}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-md hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                {busy === "release" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                Libérer
              </button>
            </>
          )}
          {ride.status === "in_progress" && (
            <button
              onClick={() => run("complete")}
              disabled={busy !== null}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {busy === "complete" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Marquer terminée
            </button>
          )}
        </div>
      )}
    </div>
  );
}
