import type { Metadata } from "next";
import Link from "next/link";
import {
  Wallet,
  Sparkles,
  ShieldCheck,
  Clock,
  ArrowRight,
  CreditCard,
  TrendingUp,
} from "lucide-react";
import WalletTiersSection from "@/components/wallet/WalletTiersSection";
import WalletBalanceBanner from "@/components/wallet/WalletBalanceBanner";

export const metadata: Metadata = {
  title: "Portefeuille Izymoto — Rechargez et profitez de bonus exclusifs",
  description:
    "Créez votre portefeuille Izymoto, rechargez à votre rythme et bénéficiez jusqu'à 20 % de bonus offert. Transparent, sans engagement, valable 24 mois.",
  alternates: { canonical: "/portefeuille" },
  openGraph: {
    title: "Portefeuille Izymoto — Bonus jusqu'à 20 % à chaque recharge",
    description:
      "Rechargez votre portefeuille Izymoto et économisez sur tous vos trajets moto-taxi. Offre particuliers et grands comptes.",
    url: "https://izymoto.com/portefeuille",
    type: "website",
  },
};

export default function PortefeuillePage() {
  return (
    <div className="bg-white">
      <section className="relative bg-black text-white overflow-hidden">
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(251, 191, 36, 0.3), transparent 40%), radial-gradient(circle at 80% 70%, rgba(251, 191, 36, 0.15), transparent 50%)",
          }}
        />
        <div className="relative container mx-auto px-4 md:px-6 lg:px-8 py-16 md:py-24 lg:py-28">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-semibold tracking-wider uppercase mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              Nouveau — bonus jusqu'à 20 %
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6">
              Votre portefeuille Izymoto.
              <br />
              <span className="text-amber-400">Économisez à chaque trajet.</span>
            </h1>
            <p className="text-base md:text-lg text-gray-300 max-w-2xl mx-auto mb-8">
              Rechargez votre solde une seule fois, profitez d'un bonus immédiat
              et voyagez sans payer à chaque course. Pour vous, ou pour toute
              votre équipe.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="#paliers"
                className="inline-flex items-center justify-center gap-2 bg-amber-400 text-black font-semibold px-7 py-3.5 rounded-lg hover:bg-amber-300 transition-colors duration-300"
              >
                Voir les paliers
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#comment-ca-marche"
                className="inline-flex items-center justify-center gap-2 border border-white/30 text-white font-semibold px-7 py-3.5 rounded-lg hover:bg-white/10 transition-colors duration-300"
              >
                Comment ça marche
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-4 md:gap-8 mt-14 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-amber-400">
                  +20%
                </div>
                <div className="text-xs md:text-sm text-gray-400 mt-1">
                  Bonus maximum
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-amber-400">
                  24 mois
                </div>
                <div className="text-xs md:text-sm text-gray-400 mt-1">
                  Validité du crédit
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-amber-400">
                  0€
                </div>
                <div className="text-xs md:text-sm text-gray-400 mt-1">
                  Frais de gestion
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <WalletBalanceBanner />

      <WalletTiersSection />

      <section id="comment-ca-marche" className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3">
              Comment ça marche
            </h2>
            <div className="w-16 h-1 bg-black mx-auto mb-4" />
            <p className="text-base md:text-lg text-gray-600 max-w-xl mx-auto">
              Trois étapes, zéro contrainte.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
            {[
              {
                icon: CreditCard,
                step: "01",
                title: "Rechargez en un clic",
                description:
                  "Choisissez votre palier et payez par carte bancaire en moins d'une minute. Aucun engagement.",
              },
              {
                icon: Sparkles,
                step: "02",
                title: "Recevez votre bonus",
                description:
                  "Le bonus est crédité instantanément sur votre portefeuille. Plus vous rechargez, plus le bonus est élevé.",
              },
              {
                icon: Wallet,
                step: "03",
                title: "Voyagez sans paiement",
                description:
                  "À chaque réservation, le montant est automatiquement déduit de votre solde. Plus de carte à sortir.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative bg-white rounded-2xl p-8 border border-gray-200 hover:shadow-lg transition-shadow duration-300"
              >
                <div className="absolute top-6 right-6 text-5xl font-bold text-gray-100 leading-none">
                  {item.step}
                </div>
                <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center mb-5">
                  <item.icon className="h-6 w-6 text-amber-400" />
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3">
              Une transparence totale
            </h2>
            <div className="w-16 h-1 bg-black mx-auto mb-4" />
            <p className="text-base md:text-lg text-gray-600 max-w-xl mx-auto">
              Pas de petites lignes. Vos questions, nos réponses.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {[
              {
                q: "Quelle est la durée de validité du crédit ?",
                a: "Votre solde est valable 24 mois à compter de la dernière recharge. Toute nouvelle recharge prolonge automatiquement la validité de l'ensemble du solde.",
              },
              {
                q: "Que se passe-t-il si je n'utilise pas tout mon solde ?",
                a: "Le solde restant reste disponible jusqu'à expiration. Le montant initialement payé est remboursable sur demande pendant les 14 jours suivant la recharge (hors bonus offert).",
              },
              {
                q: "Le bonus est-il utilisable sur tous les services ?",
                a: "Oui. Bonus et solde principal sont utilisés indistinctement pour tous nos services : transferts aéroport, trajets en ville, mises à disposition à l'heure, à toute heure du jour et de la nuit.",
              },
              {
                q: "Puis-je partager mon portefeuille avec mes proches ou collaborateurs ?",
                a: "Pour les particuliers, le portefeuille est personnel. Pour les entreprises, l'admin peut inviter ses collaborateurs et leur attribuer un budget mensuel individuel depuis l'espace grand compte.",
              },
              {
                q: "Comment sont gérées les factures et la TVA ?",
                a: "Une facture détaillée est émise à chaque recharge. Pour les entreprises, un récapitulatif mensuel consolidé peut être envoyé automatiquement à votre service comptabilité.",
              },
            ].map((item) => (
              <details
                key={item.q}
                className="group bg-gray-50 rounded-xl border border-gray-200 overflow-hidden hover:border-black transition-colors duration-200"
              >
                <summary className="flex items-center justify-between gap-4 p-5 md:p-6 cursor-pointer list-none">
                  <span className="font-semibold text-base md:text-lg">
                    {item.q}
                  </span>
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-white border border-gray-300 flex items-center justify-center group-open:rotate-45 transition-transform duration-200">
                    <span className="text-lg leading-none">+</span>
                  </span>
                </summary>
                <div className="px-5 md:px-6 pb-5 md:pb-6 text-gray-600 text-sm md:text-base leading-relaxed">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section
        id="portefeuille-cta"
        className="py-16 md:py-24 bg-black text-white"
      >
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-5">
              Prêt à économiser sur vos trajets ?
            </h2>
            <p className="text-gray-300 text-base md:text-lg mb-10 max-w-xl mx-auto">
              La recharge en ligne arrive très prochainement. En attendant, nos
              équipes activent votre portefeuille manuellement sur simple
              demande.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 max-w-2xl mx-auto">
              {[
                { icon: ShieldCheck, label: "Paiement 100% sécurisé" },
                { icon: Clock, label: "Activation sous 24h" },
                { icon: TrendingUp, label: "Bonus dès 100€" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-center gap-2 text-sm text-gray-300"
                >
                  <item.icon className="h-4 w-4 text-amber-400 flex-shrink-0" />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 bg-amber-400 text-black font-semibold px-7 py-3.5 rounded-lg hover:bg-amber-300 transition-colors duration-300"
              >
                Activer mon portefeuille
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="tel:+33649502525"
                className="inline-flex items-center justify-center gap-2 border border-white/30 text-white font-semibold px-7 py-3.5 rounded-lg hover:bg-white/10 transition-colors duration-300"
              >
                Nous appeler
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
