"use client";

import { Check, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEuro, type WalletTier } from "@/lib/wallet/tiers";

interface TierCardProps {
  tier: WalletTier;
  onSelect?: (tier: WalletTier) => void;
  loading?: boolean;
}

export default function TierCard({ tier, onSelect, loading }: TierCardProps) {
  const isPopular = tier.popular;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl p-6 md:p-8 min-w-0 transition-all duration-300",
        "hover:shadow-2xl hover:-translate-y-1",
        isPopular
          ? "bg-black text-white border-2 border-black md:scale-105"
          : "bg-white text-black border border-gray-200 hover:border-black"
      )}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-amber-400 text-black text-xs font-bold tracking-wider rounded-full uppercase shadow-lg">
          <span className="inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Populaire
          </span>
        </div>
      )}

      <div className="mb-2">
        <h3
          className={cn(
            "text-lg font-bold uppercase tracking-wider",
            isPopular ? "text-amber-400" : "text-black"
          )}
        >
          {tier.name}
        </h3>
        <p
          className={cn(
            "text-sm mt-1",
            isPopular ? "text-gray-300" : "text-gray-600"
          )}
        >
          {tier.tagline}
        </p>
      </div>

      <div className="my-6 space-y-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span
            className={cn(
              "text-sm",
              isPopular ? "text-gray-400" : "text-gray-500"
            )}
          >
            Vous payez
          </span>
          <span className="text-2xl font-bold tabular-nums tracking-tight">
            {formatEuro(tier.rechargeAmount)}
          </span>
        </div>

        <div
          className={cn(
            "inline-flex items-start gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold max-w-full",
            isPopular
              ? "bg-amber-400/10 text-amber-400 border border-amber-400/30"
              : "bg-amber-50 text-amber-700 border border-amber-200"
          )}
        >
          <Sparkles className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span className="leading-snug">
            +{formatEuro(tier.bonusAmount)} offerts ({tier.bonusPercent}%)
          </span>
        </div>

        <div className="pt-3">
          <div
            className={cn(
              "text-xs uppercase tracking-wider mb-1",
              isPopular ? "text-gray-400" : "text-gray-500"
            )}
          >
            Crédit total disponible
          </div>
          <div className="flex items-baseline">
            <span
              className={cn(
                "font-bold leading-none tabular-nums tracking-tight",
                tier.totalCredit >= 10000
                  ? "text-3xl md:text-4xl"
                  : "text-4xl md:text-5xl"
              )}
            >
              {formatEuro(tier.totalCredit)}
            </span>
          </div>
        </div>
      </div>

      <p
        className={cn(
          "text-sm mb-6 flex items-start gap-2",
          isPopular ? "text-gray-300" : "text-gray-600"
        )}
      >
        <Check
          className={cn(
            "h-4 w-4 mt-0.5 flex-shrink-0",
            isPopular ? "text-amber-400" : "text-black"
          )}
        />
        <span>{tier.equivalent}</span>
      </p>

      <button
        type="button"
        onClick={() => onSelect?.(tier)}
        disabled={loading}
        className={cn(
          "mt-auto w-full py-3 px-6 rounded-lg font-semibold text-sm tracking-wider transition-colors duration-200 inline-flex items-center justify-center gap-2",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          isPopular
            ? "bg-amber-400 text-black hover:bg-amber-300"
            : "bg-black text-white hover:bg-gray-800"
        )}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Redirection...
          </>
        ) : (
          "Choisir ce palier"
        )}
      </button>
    </div>
  );
}
