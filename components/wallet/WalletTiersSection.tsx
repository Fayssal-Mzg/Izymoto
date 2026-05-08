"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Building2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  getTiersByAudience,
  type WalletAudience,
  type WalletTier,
} from "@/lib/wallet/tiers";
import TierCard from "@/components/wallet/TierCard";

const PENDING_TIER_KEY = "izymoto_pending_recharge_tier";

export default function WalletTiersSection() {
  const [audience, setAudience] = useState<WalletAudience>("individual");
  const [loadingTierId, setLoadingTierId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const tiers = getTiersByAudience(audience);

  const startCheckout = async (tier: WalletTier) => {
    if (!user) return;
    setLoadingTierId(tier.id);
    setError(null);
    try {
      const res = await fetch("/api/wallet/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tierId: tier.id,
          userId: user.uid,
          userEmail: user.email,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Création de la session impossible");
      }
      window.location.href = data.url;
    } catch (err) {
      console.error("[wallet] checkout error:", err);
      setError(
        err instanceof Error ? err.message : "Une erreur est survenue, réessayez."
      );
      setLoadingTierId(null);
    }
  };

  const handleSelect = async (tier: WalletTier) => {
    setError(null);
    if (authLoading) return;

    if (!user) {
      try {
        sessionStorage.setItem(PENDING_TIER_KEY, tier.id);
      } catch {
        /* navigation privée stricte */
      }
      router.push(
        `/connexion?redirectTo=${encodeURIComponent("/portefeuille#paliers")}`
      );
      return;
    }

    await startCheckout(tier);
  };

  // Au retour d'un login (user vient d'être set), si on a un tier en attente
  // dans sessionStorage, on relance automatiquement le checkout. Le user a
  // l'impression d'une bascule fluide.
  useEffect(() => {
    if (!user || authLoading) return;
    let pendingTierId: string | null = null;
    try {
      pendingTierId = sessionStorage.getItem(PENDING_TIER_KEY);
    } catch {
      return;
    }
    if (!pendingTierId) return;
    const tier = [...getTiersByAudience("individual"), ...getTiersByAudience("business")].find(
      (t) => t.id === pendingTierId
    );
    if (!tier) return;
    try {
      sessionStorage.removeItem(PENDING_TIER_KEY);
    } catch {
      /* noop */
    }
    setAudience(tier.audience);
    void startCheckout(tier);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  return (
    <section id="paliers" className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3">
            Choisissez votre palier
          </h2>
          <div className="w-16 h-1 bg-black mx-auto mb-4" />
          <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
            Plus vous rechargez, plus votre bonus est important. Crédit
            utilisable sur l'ensemble de nos services, sans contrainte.
          </p>
        </div>

        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center bg-gray-100 rounded-full p-1.5 shadow-inner">
            <button
              type="button"
              onClick={() => setAudience("individual")}
              className={cn(
                "inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold tracking-wide transition-all duration-300",
                audience === "individual"
                  ? "bg-black text-white shadow-md"
                  : "text-gray-600 hover:text-black"
              )}
              aria-pressed={audience === "individual"}
            >
              <User className="h-4 w-4" />
              Particuliers
            </button>
            <button
              type="button"
              onClick={() => setAudience("business")}
              className={cn(
                "inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold tracking-wide transition-all duration-300",
                audience === "business"
                  ? "bg-black text-white shadow-md"
                  : "text-gray-600 hover:text-black"
              )}
              aria-pressed={audience === "business"}
            >
              <Building2 className="h-4 w-4" />
              Entreprises
            </button>
          </div>
        </div>

        {error && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        <div
          className={cn(
            "grid gap-6 md:gap-8 max-w-7xl mx-auto",
            audience === "individual"
              ? "sm:grid-cols-2 lg:grid-cols-4"
              : "sm:grid-cols-2 lg:grid-cols-3"
          )}
        >
          {tiers.map((tier) => (
            <TierCard
              key={tier.id}
              tier={tier}
              onSelect={handleSelect}
              loading={loadingTierId === tier.id}
            />
          ))}
        </div>

        <p className="text-center text-xs text-gray-500 mt-10 max-w-2xl mx-auto">
          Crédit valable 24 mois à compter de la recharge. Le bonus est offert
          sous forme de crédit, utilisable comme votre solde principal mais non
          remboursable. Paiement 100% sécurisé via Stripe. Aucun frais caché.
        </p>
      </div>
    </section>
  );
}
