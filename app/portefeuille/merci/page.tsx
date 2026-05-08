import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Sparkles, ArrowRight, Wallet } from "lucide-react";
import { stripe } from "@/lib/stripe-server";
import { getTierById, formatEuro } from "@/lib/wallet/tiers";

export const metadata: Metadata = {
  title: "Recharge confirmée — Portefeuille Izymoto",
  description: "Votre portefeuille Izymoto a été rechargé avec succès.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { session_id?: string };
}

async function fetchSession(sessionId: string | undefined) {
  if (!sessionId) return null;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return session;
  } catch (err) {
    console.error("[merci] retrieve session error:", err);
    return null;
  }
}

export default async function MerciPage({ searchParams }: PageProps) {
  const session = await fetchSession(searchParams.session_id);
  const tierId = session?.metadata?.tierId;
  const tier = tierId ? getTierById(tierId) : undefined;
  const isPaid = session?.payment_status === "paid";

  return (
    <div className="bg-white min-h-[calc(100vh-200px)]">
      <section className="relative bg-black text-white overflow-hidden">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 30%, rgba(251, 191, 36, 0.4), transparent 50%)",
          }}
        />
        <div className="relative container mx-auto px-4 md:px-6 py-16 md:py-20">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-400/10 border border-amber-400/30 mb-6">
              <CheckCircle2 className="h-10 w-10 text-amber-400" />
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              {isPaid ? "Recharge confirmée" : "Paiement en cours de validation"}
            </h1>
            <p className="text-base md:text-lg text-gray-300 max-w-xl mx-auto">
              {isPaid
                ? "Merci ! Votre portefeuille est crédité. Vous pouvez utiliser votre solde dès votre prochaine réservation."
                : "Votre paiement est en cours de validation par notre prestataire. Le crédit apparaîtra sur votre portefeuille dans quelques instants."}
            </p>
          </div>
        </div>
      </section>

      {tier && (
        <section className="py-12 md:py-16 bg-gray-50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-200 p-8 md:p-10 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <Wallet className="h-6 w-6 text-black" />
                <h2 className="text-xl md:text-2xl font-bold">
                  Récapitulatif de votre recharge
                </h2>
              </div>

              <div className="space-y-3 text-sm md:text-base mb-8">
                <div className="flex items-baseline justify-between border-b border-gray-100 pb-3">
                  <span className="text-gray-600">Palier choisi</span>
                  <span className="font-semibold uppercase tracking-wider">
                    {tier.name}
                  </span>
                </div>
                <div className="flex items-baseline justify-between border-b border-gray-100 pb-3">
                  <span className="text-gray-600">Montant payé</span>
                  <span className="font-semibold tabular-nums">
                    {formatEuro(tier.rechargeAmount)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between border-b border-gray-100 pb-3">
                  <span className="text-gray-600 inline-flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    Bonus offert ({tier.bonusPercent}%)
                  </span>
                  <span className="font-semibold tabular-nums text-amber-700">
                    +{formatEuro(tier.bonusAmount)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between pt-2">
                  <span className="text-base font-bold">Crédit total</span>
                  <span className="text-2xl md:text-3xl font-bold tabular-nums">
                    {formatEuro(tier.totalCredit)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-xs text-gray-600">
                Une facture a été générée et vous sera transmise par email.
                Crédit valable 24 mois à compter de cette recharge.
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              Prêt à voyager ?
            </h3>
            <p className="text-gray-600 mb-8">
              Réservez votre premier trajet : le montant sera automatiquement
              débité de votre portefeuille.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/#reservation"
                className="inline-flex items-center justify-center gap-2 bg-black text-white font-semibold px-7 py-3.5 rounded-lg hover:bg-gray-800 transition-colors duration-300"
              >
                Réserver un trajet
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/portefeuille"
                className="inline-flex items-center justify-center gap-2 border border-gray-300 text-black font-semibold px-7 py-3.5 rounded-lg hover:bg-gray-50 transition-colors duration-300"
              >
                Retour au portefeuille
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
