"use client";

import { useState } from "react";
import { User, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getTiersByAudience,
  type WalletAudience,
  type WalletTier,
} from "@/lib/wallet/tiers";
import TierCard from "@/components/wallet/TierCard";

export default function WalletTiersSection() {
  const [audience, setAudience] = useState<WalletAudience>("individual");
  const tiers = getTiersByAudience(audience);

  const handleSelect = (tier: WalletTier) => {
    const target = document.getElementById("portefeuille-cta");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("izymoto_selected_tier", tier.id);
      } catch {
        // sessionStorage indisponible (navigation privée stricte) — silencieux
      }
    }
  };

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

        <div
          className={cn(
            "grid gap-6 md:gap-8 max-w-7xl mx-auto",
            audience === "individual"
              ? "sm:grid-cols-2 lg:grid-cols-4"
              : "sm:grid-cols-2 lg:grid-cols-3"
          )}
        >
          {tiers.map((tier) => (
            <TierCard key={tier.id} tier={tier} onSelect={handleSelect} />
          ))}
        </div>

        <p className="text-center text-xs text-gray-500 mt-10 max-w-2xl mx-auto">
          Crédit valable 24 mois à compter de la recharge. Le bonus est offert
          sous forme de crédit, utilisable comme votre solde principal mais non
          remboursable. Aucun frais caché, aucune commission.
        </p>
      </div>
    </section>
  );
}
