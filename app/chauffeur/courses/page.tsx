"use client";

import { Loader2, PowerOff, Inbox, Hourglass } from "lucide-react";
import DriverLayout from "@/components/chauffeur/DriverLayout";
import { useDriver } from "@/lib/hooks/useDriver";
import { useRidePool } from "@/lib/hooks/useRidePool";
import RidePoolCard from "@/components/chauffeur/RidePoolCard";
import { setDriverAvailability } from "@/lib/firebase/drivers";
import { useState } from "react";

export default function CoursesPoolPage() {
  return (
    <DriverLayout>
      <PoolContent />
    </DriverLayout>
  );
}

function PoolContent() {
  const { driver, loading } = useDriver();
  const isActive = driver?.status === "active";
  const isOnline = driver?.availability === "online";
  const { rides, loading: poolLoading, error } = useRidePool(
    isActive && isOnline
  );
  const [toggling, setToggling] = useState(false);

  const goOnline = async () => {
    if (!driver) return;
    setToggling(true);
    try {
      await setDriverAvailability(driver.uid, "online");
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
          Courses disponibles
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Le premier qui accepte la course la verrouille. Plus de précipitation,
          plus de gains.
        </p>
      </div>

      {!isActive ? (
        <EmptyState
          icon={Hourglass}
          title="Compte en attente de validation"
          description="Vous pourrez voir les courses dès que votre dossier sera validé par notre équipe."
        />
      ) : !isOnline ? (
        <div className="rounded-2xl bg-slate-900 text-white p-8 text-center">
          <PowerOff className="h-10 w-10 text-slate-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold mb-1">Vous êtes hors service</h2>
          <p className="text-sm text-slate-400 mb-5">
            Activez le service pour recevoir les courses en temps réel.
          </p>
          <button
            onClick={goOnline}
            disabled={toggling}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-400 text-black text-sm font-semibold rounded-md hover:bg-amber-300 transition-colors disabled:opacity-50"
          >
            {toggling && <Loader2 className="h-4 w-4 animate-spin" />}
            Démarrer le service
          </button>
        </div>
      ) : poolLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-orange-50 border border-orange-200 p-6 text-center text-sm text-orange-800">
          {error}
        </div>
      ) : rides.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Aucune course pour le moment"
          description="Le pool se met à jour en temps réel. Restez en ligne, les nouvelles courses apparaîtront ici."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {rides.map((ride) => (
            <RidePoolCard
              key={ride.id}
              ride={ride}
              driverId={driver.uid}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center">
      <Icon className="h-10 w-10 text-slate-400 mx-auto mb-3" />
      <h2 className="text-base font-semibold text-slate-900 mb-1">{title}</h2>
      <p className="text-sm text-slate-500 max-w-md mx-auto">{description}</p>
    </div>
  );
}
