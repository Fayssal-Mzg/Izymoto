"use client";

import { Bike } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Barre d'action « Réserver » fixée en bas d'écran sur mobile uniquement.
 * Masquée là où elle n'a pas de sens (tunnel de réservation, espaces dédiés,
 * écrans d'auth).
 */
const HIDDEN_PREFIXES = [
  "/reserver",
  "/admin",
  "/chauffeur",
  "/connexion",
  "/inscription",
  "/paiement",
];

export default function MobileReserveBar() {
  const pathname = usePathname();

  if (pathname && HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-navy-800 bg-navy-950/95 p-3 backdrop-blur md:hidden">
      <Link
        href="/#reservation"
        className="flex w-full items-center justify-center gap-2 rounded-full bg-mint-400 px-6 py-3 text-sm font-semibold uppercase tracking-wider text-navy-950 shadow-lg shadow-mint-400/20 transition-colors hover:bg-mint-300"
      >
        <Bike className="h-4 w-4" />
        Réserver un trajet
      </Link>
    </div>
  );
}
