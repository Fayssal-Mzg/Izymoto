"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useDriver } from "@/lib/hooks/useDriver";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

// Garde la zone /chauffeur : redirige vers /chauffeur/inscription si
// non connecté OU non chauffeur. Si le wizard d'inscription est en cours
// (pas de fiche), on laisse l'utilisateur sur la page d'inscription.
export default function DriverGuard({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isDriver, loading: driverLoading } = useDriver();
  const router = useRouter();
  const pathname = usePathname();

  const isOnSignup = pathname === "/chauffeur/inscription";
  const isOnLogin = pathname === "/chauffeur/connexion";
  const isPublicRoute = isOnSignup || isOnLogin;

  useEffect(() => {
    if (authLoading || driverLoading) return;
    if (isPublicRoute) return;
    if (!user) {
      router.replace("/chauffeur/connexion");
      return;
    }
    if (!isDriver) {
      router.replace("/chauffeur/inscription");
    }
  }, [user, isDriver, authLoading, driverLoading, isPublicRoute, router]);

  if (authLoading || driverLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-400" />
      </div>
    );
  }

  if (!isPublicRoute && (!user || !isDriver)) {
    return null;
  }

  return <>{children}</>;
}
