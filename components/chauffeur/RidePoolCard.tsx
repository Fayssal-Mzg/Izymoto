"use client";

import { useState } from "react";
import { MapPin, Clock, Route, Euro, Loader2, AlertCircle } from "lucide-react";
import { acceptRide, COMMISSION_RATE, type PoolRide, RideUnavailableError } from "@/lib/firebase/dispatch";

export default function RidePoolCard({
  ride,
  driverId,
  disabled,
  onAccepted,
}: {
  ride: PoolRide;
  driverId: string;
  disabled?: boolean;
  onAccepted?: () => void;
}) {
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const driverShare = ride.prix * (1 - COMMISSION_RATE);

  const handleAccept = async () => {
    setError(null);
    setAccepting(true);
    try {
      await acceptRide(ride.id, driverId);
      onAccepted?.();
    } catch (err: any) {
      if (err instanceof RideUnavailableError) {
        setError(err.message);
      } else {
        setError("Échec de l'acceptation. Réessayez.");
      }
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 hover:border-amber-400 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider">
            Course #{ride.reservationId}
          </p>
          {ride.reservationDate && (
            <p className="text-sm font-semibold text-slate-900 mt-0.5 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              {ride.reservationDate.toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "short",
              })}{" "}
              ·{" "}
              {ride.reservationDate.toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Votre part</div>
          <div className="text-xl font-bold tabular-nums text-emerald-700">
            {driverShare.toFixed(2)}€
          </div>
          <div className="text-[10px] text-slate-400 tabular-nums">
            sur {ride.prix.toFixed(2)}€
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

      <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
        {ride.distance > 0 && (
          <span className="inline-flex items-center gap-1">
            <Route className="h-3.5 w-3.5" />
            {ride.distance.toFixed(1)} km
          </span>
        )}
        {ride.duree > 0 && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            ~{Math.round(ride.duree)} min
          </span>
        )}
      </div>

      {error && (
        <div className="mb-3 flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={handleAccept}
        disabled={accepting || disabled}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-400 text-black text-sm font-semibold rounded-md hover:bg-amber-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {accepting && <Loader2 className="h-4 w-4 animate-spin" />}
        Accepter cette course
      </button>
    </div>
  );
}
