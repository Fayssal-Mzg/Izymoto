import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import {
  Building2,
  Receipt,
  Users,
  Repeat,
  Zap,
  TrendingUp,
  Headset,
  ArrowRight,
  Phone,
  Briefcase,
  Plane,
  CalendarClock,
} from "lucide-react";
import Halo from "@/components/Halo";
import FaqSection from "@/components/FaqSection";
import WalletTiersSection from "@/components/wallet/WalletTiersSection";

export const metadata: Metadata = {
  title: "Taxi moto entreprise Paris — Solutions grands comptes | Izymoto",
  description:
    "Izymoto accompagne les entreprises franciliennes : compte grand compte, facturation mensuelle consolidée, budgets collaborateurs, trajets récurrents et transferts aéroports prioritaires.",
  alternates: { canonical: "/entreprise" },
  openGraph: {
    title: "Izymoto Entreprises — Le taxi moto des équipes franciliennes",
    description:
      "Compte entreprise, facturation mensuelle, budgets collaborateurs et jusqu'à 20 % de bonus sur vos recharges. Demandez votre devis grand compte.",
    url: "https://izymoto.com/entreprise",
    type: "website",
  },
};

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Taxi moto entreprise — Izymoto",
  serviceType: "Transport moto-taxi pour entreprises et grands comptes",
  provider: {
    "@type": "TaxiService",
    name: "Izymoto",
    url: "https://izymoto.com",
    telephone: "+33649502525",
  },
  areaServed: ["Paris", "Île-de-France", "La Défense"],
  audience: {
    "@type": "BusinessAudience",
    name: "Entreprises, TPE, PME et grands comptes",
  },
  description:
    "Service de moto-taxi dédié aux entreprises : facturation mensuelle consolidée, comptes multi-collaborateurs avec budgets individuels, trajets récurrents domicile-bureau et transferts aéroports prioritaires.",
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Accueil", item: "https://izymoto.com" },
    { "@type": "ListItem", position: 2, name: "Entreprises", item: "https://izymoto.com/entreprise" },
  ],
};

const advantages = [
  {
    icon: Receipt,
    title: "Facturation consolidée",
    description:
      "Une facture à chaque recharge et un récapitulatif consolidé des trajets de vos équipes sur demande. TVA récupérable, zéro note de frais pour vos collaborateurs.",
  },
  {
    icon: Users,
    title: "Compte multi-collaborateurs",
    description:
      "Invitez vos collaborateurs sur le compte entreprise et attribuez à chacun un budget mensuel individuel. Vous gardez la visibilité sur l'ensemble des dépenses.",
  },
  {
    icon: Repeat,
    title: "Trajets récurrents",
    description:
      "Domicile–bureau, inter-sites, navettes La Défense : mettez en place des trajets réguliers à tarif préférentiel, avec le même niveau de service à chaque course.",
  },
  {
    icon: Zap,
    title: "Prise en charge prioritaire",
    description:
      "Vos collaborateurs sont pris en charge en priorité, en moyenne sous 15 minutes dans Paris. Suivi de vol inclus pour les arrivées CDG et Orly.",
  },
  {
    icon: TrendingUp,
    title: "Jusqu'à 20 % de bonus",
    description:
      "Plus votre recharge est importante, plus le bonus offert est élevé : de 5 % pour une TPE à 20 % pour l'offre grand compte à 25 000 €.",
  },
  {
    icon: Headset,
    title: "Interlocuteur dédié",
    description:
      "Un contact unique pour l'ouverture du compte, les demandes spécifiques et le suivi de votre activité. Contrats sur mesure pour les grands comptes.",
  },
];

const useCases = [
  {
    icon: Briefcase,
    title: "Cadres & dirigeants",
    description:
      "Rendez-vous clients enchaînés, comités, déplacements inter-sites : vos équipes traversent Paris en 2 à 3 fois moins de temps qu'en voiture.",
    href: "/moto-taxi-la-defense",
    linkLabel: "Taxi moto La Défense",
  },
  {
    icon: Plane,
    title: "Transferts aéroports",
    description:
      "CDG ou Orly en moins de 30 minutes depuis Paris, suivi de vol inclus. Vos collaborateurs et invités ne ratent plus jamais un avion.",
    href: "/aeroports",
    linkLabel: "Transferts aéroports",
  },
  {
    icon: CalendarClock,
    title: "Événements & roadshows",
    description:
      "Salons, séminaires, roadshows investisseurs : mise à disposition à l'heure (80€/h) pour des journées à timing serré, avec un ou plusieurs pilotes.",
    href: "/nos-tarifs",
    linkLabel: "Voir les tarifs",
  },
];

const steps = [
  {
    step: "01",
    title: "Ouvrez votre compte entreprise",
    description:
      "Choisissez un palier de recharge ou demandez un devis sur mesure. Activation sous 24h, sans engagement de durée.",
  },
  {
    step: "02",
    title: "Invitez vos collaborateurs",
    description:
      "Chaque collaborateur réserve lui-même ses trajets dans la limite du budget mensuel que vous lui attribuez.",
  },
  {
    step: "03",
    title: "Recevez une facture unique",
    description:
      "Un récapitulatif mensuel consolidé est envoyé à votre comptabilité. Aucune avance de frais pour vos équipes.",
  },
];

const faqItems = [
  {
    q: "Comment fonctionne la facturation entreprise ?",
    a: "Vous rechargez un solde entreprise et vos collaborateurs réservent sans payer individuellement. Une facture est émise à chaque recharge et un récapitulatif consolidé de tous les trajets est disponible sur demande auprès de votre interlocuteur dédié, avec TVA détaillée.",
  },
  {
    q: "Peut-on attribuer un budget différent à chaque collaborateur ?",
    a: "Oui. Depuis l'espace grand compte, l'administrateur invite ses collaborateurs et attribue à chacun un budget mensuel individuel. Les budgets sont modifiables à tout moment et les dépenses sont visibles en temps réel.",
  },
  {
    q: "Y a-t-il un engagement de durée ?",
    a: "Non. Les recharges sont sans engagement et le crédit est valable 24 mois, prolongé à chaque nouvelle recharge. Pour les grands comptes, des contrats annuels avec conditions négociées sont possibles si vous le souhaitez.",
  },
  {
    q: "Que se passe-t-il au-delà du palier Enterprise à 25 000 € ?",
    a: "Au-delà de 25 000 € de recharge, nous construisons une offre sur mesure : bonus négocié, interlocuteur dédié, reporting personnalisé et engagements de niveau de service. Contactez-nous pour un devis grand compte.",
  },
  {
    q: "Proposez-vous des trajets réguliers domicile–bureau ?",
    a: "Oui. Nous mettons en place des trajets récurrents (quotidiens ou hebdomadaires) à tarif préférentiel, par exemple domicile–La Défense ou inter-sites. Le même pilote peut être affecté à un collaborateur pour plus de régularité.",
  },
  {
    q: "Vos pilotes peuvent-ils prendre en charge nos clients et invités ?",
    a: "Bien sûr. Accueil personnalisé en gare ou à l'aéroport avec pancarte, équipement complet fourni (casque, gants, kit hygiénique) et tenue soignée. Le trajet est imputé sur le compte de votre entreprise.",
  },
];

export default function EntreprisePage() {
  return (
    <div className="bg-white">
      <Script
        id="entreprise-service-jsonld"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <Script
        id="entreprise-breadcrumb-jsonld"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-950 text-white">
        <Halo />
        <div className="relative z-10 container mx-auto px-4 md:px-6 lg:px-8 py-16 md:py-24 lg:py-28">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-mint-400/10 border border-mint-400/40 text-mint-300 text-xs font-semibold tracking-widest uppercase mb-6">
              <Building2 className="h-3.5 w-3.5" />
              Solutions entreprises & grands comptes
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6">
              Le taxi moto des
              <br />
              <span className="text-mint-400">entreprises franciliennes</span>
            </h1>
            <p className="text-base md:text-lg text-white/80 max-w-2xl mx-auto mb-8">
              Faites gagner des heures à vos équipes : compte entreprise,
              facturation mensuelle consolidée, budgets collaborateurs et
              prise en charge prioritaire dans tout Paris et l'Île-de-France.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 bg-mint-400 text-navy-950 font-semibold px-7 py-3.5 rounded-lg hover:bg-mint-300 transition-colors duration-300 shadow-[0_10px_30px_-10px_rgba(45,212,191,0.6)]"
              >
                Demander un devis entreprise
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#offres-entreprise"
                className="inline-flex items-center justify-center gap-2 border border-white/30 text-white font-semibold px-7 py-3.5 rounded-lg hover:border-mint-400 hover:bg-white/5 hover:text-mint-300 transition-colors duration-300"
              >
                Voir les offres
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-4 md:gap-8 mt-14 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-mint-400">15 min</div>
                <div className="text-xs md:text-sm text-white/60 mt-1">
                  Prise en charge moyenne
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-mint-400">1</div>
                <div className="text-xs md:text-sm text-white/60 mt-1">
                  Facture mensuelle unique
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-mint-400">+20%</div>
                <div className="text-xs md:text-sm text-white/60 mt-1">
                  Bonus grand compte
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Avantages */}
      <section className="py-16 md:py-24 bg-cream-50">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 text-navy-950">
              Pensé pour les équipes, pas pour les notes de frais
            </h2>
            <div className="w-16 h-1 bg-mint-400 mx-auto mb-4" />
            <p className="text-base md:text-lg text-navy-600 max-w-2xl mx-auto">
              Tout ce qu'un office manager, un DAF ou une assistante de
              direction attend d'un service de transport professionnel.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
            {advantages.map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl p-8 border border-navy-100 hover:border-mint-300 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-full bg-navy-950 flex items-center justify-center mb-5">
                  <item.icon className="h-6 w-6 text-mint-400" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-navy-950">{item.title}</h3>
                <p className="text-navy-600 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cas d'usage */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 text-navy-950">
              Vos cas d'usage
            </h2>
            <div className="w-16 h-1 bg-mint-400 mx-auto mb-4" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
            {useCases.map((item) => (
              <div
                key={item.title}
                className="flex flex-col bg-cream-50 rounded-2xl p-8 border border-navy-100"
              >
                <item.icon className="h-8 w-8 text-mint-600 mb-4" />
                <h3 className="text-lg font-bold mb-3 text-navy-950">{item.title}</h3>
                <p className="text-navy-600 text-sm leading-relaxed mb-5 flex-1">
                  {item.description}
                </p>
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-mint-600 hover:text-mint-700 transition-colors"
                >
                  {item.linkLabel}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Paliers entreprises */}
      <div id="offres-entreprise">
        <WalletTiersSection defaultAudience="business" />
      </div>

      {/* Comment ça marche */}
      <section className="py-16 md:py-24 bg-cream-50">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 text-navy-950">
              Comment ça marche
            </h2>
            <div className="w-16 h-1 bg-mint-400 mx-auto mb-4" />
            <p className="text-base md:text-lg text-navy-600 max-w-xl mx-auto">
              Votre compte entreprise opérationnel en 24h.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 max-w-5xl mx-auto">
            {steps.map((item) => (
              <div
                key={item.step}
                className="relative bg-white rounded-2xl p-8 border border-navy-100 hover:shadow-lg transition-shadow duration-300"
              >
                <div className="absolute top-6 right-6 text-5xl font-bold text-navy-50 leading-none">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold mb-3 text-navy-950">{item.title}</h3>
                <p className="text-navy-600 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FaqSection
        items={faqItems}
        title="Questions fréquentes — Entreprises"
        subtitle="Facturation, budgets, engagement : tout est transparent"
        jsonLdId="faq-entreprise"
        className="bg-white"
      />

      {/* CTA final */}
      <section className="relative overflow-hidden bg-navy-950 py-16 md:py-24 text-white">
        <Halo />
        <div className="relative z-10 container mx-auto px-4 md:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-5">
              Parlons de votre mobilité d'entreprise
            </h2>
            <p className="text-white/80 text-base md:text-lg mb-10 max-w-xl mx-auto">
              Devis sous 24h, ouverture de compte sans engagement. Pour les
              grands comptes, nous construisons une offre sur mesure avec un
              interlocuteur dédié.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 bg-mint-400 text-navy-950 font-semibold px-7 py-3.5 rounded-lg hover:bg-mint-300 transition-colors duration-300"
              >
                Demander un devis
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="tel:+33649502525"
                className="inline-flex items-center justify-center gap-2 border border-white/30 text-white font-semibold px-7 py-3.5 rounded-lg hover:bg-white/10 transition-colors duration-300"
              >
                <Phone className="h-4 w-4" />
                06 49 50 25 25
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
