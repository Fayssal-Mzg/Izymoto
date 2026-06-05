"use client";

import { Bike } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Écran de chargement d'entrée : une moto traverse l'écran de gauche à droite
 * sur fond navy (au lieu d'un flash blanc agressif). Monté une seule fois via
 * le layout racine — ne se redéclenche pas sur les navigations client.
 */
export default function SiteLoader() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDone(true), 1550);
    return () => clearTimeout(t);
  }, []);

  if (done) return null;

  return (
    <div
      aria-hidden
      className="animate-loader-out fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-navy-950"
    >
      {/* Halo de marque */}
      <div className="bg-luxury-radial pointer-events-none absolute inset-0 opacity-70" />

      {/* Moto qui traverse */}
      <div className="animate-moto-cross absolute left-0 top-1/2 -translate-y-1/2">
        <div className="relative">
          <span className="absolute right-full top-1/2 mr-1 h-1 w-24 -translate-y-1/2 rounded-full bg-gradient-to-l from-mint-400/60 to-transparent" />
          <Bike className="h-16 w-16 text-mint-400 drop-shadow-[0_0_18px_rgba(45,212,191,0.6)] md:h-20 md:w-20" />
        </div>
      </div>

      {/* Wordmark */}
      <p className="select-none text-2xl font-bold uppercase tracking-[0.4em] text-white/90 md:text-3xl">
        Izy<span className="text-mint-400">moto</span>
      </p>
    </div>
  );
}
