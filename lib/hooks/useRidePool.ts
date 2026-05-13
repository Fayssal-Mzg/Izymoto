"use client";

import { useEffect, useState } from "react";
import {
  subscribePool,
  subscribeDriverRides,
  type PoolRide,
} from "@/lib/firebase/dispatch";

// Pool de courses en attente d'un chauffeur (temps réel).
export function useRidePool(enabled: boolean): {
  rides: PoolRide[];
  loading: boolean;
  error: string | null;
} {
  const [rides, setRides] = useState<PoolRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setRides([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribePool(
      (newRides) => {
        setRides(newRides);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(
          err.message.includes("index")
            ? "Configuration Firestore en cours (index). Réessaie dans 1-2 min."
            : "Impossible de charger les courses."
        );
        setLoading(false);
      }
    );
    return () => unsub();
  }, [enabled]);

  return { rides, loading, error };
}

// Courses attribuées à un chauffeur (en cours + historique).
export function useDriverRides(driverId: string | null): {
  rides: any[];
  loading: boolean;
} {
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!driverId) {
      setRides([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeDriverRides(driverId, (r) => {
      setRides(r);
      setLoading(false);
    });
    return () => unsub();
  }, [driverId]);

  return { rides, loading };
}
