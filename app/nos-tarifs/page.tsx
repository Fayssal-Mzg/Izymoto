import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { ArrowRight, Phone, ShieldCheck, Clock, BadgeEuro } from "lucide-react";
import Halo from "@/components/Halo";
import FaqSection from "@/components/FaqSection";
import ForfaitCards from "@/components/ForfaitCards";

export const metadata: Metadata = {
  title: "Tarif taxi moto Paris — Prix moto-taxi fixes dès 46€ | Izymoto",
  description:
    "Tarif taxi moto à Paris : grille complète des prix moto-taxi Izymoto. Forfaits Paris ↔ aéroports CDG/Orly, Paris ↔ Paris, mise à disposition. Tarifs fixes, sans surprise.",
  alternates: { canonical: "/nos-tarifs" },
  openGraph: {
    title: "Tarif taxi moto Paris — Prix moto-taxi Izymoto",
    description:
      "Grille tarifaire moto-taxi à Paris : forfaits aéroports, mise à disposition, majorations. Prix fixes annoncés avant la course.",
    url: "/nos-tarifs",
  },
};

const SITE_URL = "https://izymoto.com";

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${SITE_URL}/nos-tarifs#service`,
  name: "Taxi moto / Moto-taxi Izymoto",
  serviceType: "Moto-taxi",
  provider: { "@id": `${SITE_URL}/#business` },
  areaServed: { "@type": "Place", name: "Paris, Île-de-France" },
  url: `${SITE_URL}/nos-tarifs`,
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Tarifs taxi moto Izymoto",
    itemListElement: [
      { "@type": "Offer", name: "Paris ↔ Paris", price: 46, priceCurrency: "EUR" },
      { "@type": "Offer", name: "Paris ↔ Orly", price: 76, priceCurrency: "EUR" },
      { "@type": "Offer", name: "Paris ↔ Roissy CDG", price: 99, priceCurrency: "EUR" },
      { "@type": "Offer", name: "Paris ↔ La Défense", price: 50, priceCurrency: "EUR" },
      { "@type": "Offer", name: "Paris ↔ Le Bourget", price: 65, priceCurrency: "EUR" },
      { "@type": "Offer", name: "Paris ↔ Disneyland", price: 110, priceCurrency: "EUR" },
      { "@type": "Offer", name: "Mise à disposition 1h", price: 95, priceCurrency: "EUR" },
    ],
  },
};

const faqList = [
  {
    question: "Combien coûte un taxi moto à Paris ?",
    answer:
      "Un trajet en taxi moto dans Paris démarre à 46€ en tarif fixe pour un Paris ↔ Paris standard. Les transferts aéroport coûtent à partir de 76€ pour Orly et 99€ pour Roissy CDG. Tous les tarifs sont annoncés avant la course, sans surprise.",
  },
  {
    question: "Comment est calculé le prix d'un taxi moto Izymoto ?",
    answer:
      "Nos tarifs sont des forfaits fixes par trajet, calculés à partir des distances et zones les plus demandées (Paris intra-muros, aéroports CDG / Orly / Beauvais, gares parisiennes, La Défense, Disneyland). Pour un trajet hors zone forfaitaire, nous appliquons une prise en charge de 30€ + 3€ / km, arrondi par paliers de 5€.",
  },
  {
    question: "Le tarif annoncé est-il garanti, même en cas d'embouteillage ?",
    answer:
      "Oui : le prix est fixe et garanti, peu importe le temps de trajet réel. C'est l'un des principaux avantages du taxi moto Izymoto par rapport à un taxi traditionnel au compteur.",
  },
  {
    question: "Y a-t-il des suppléments à prévoir sur le tarif moto-taxi ?",
    answer:
      "Quatre majorations possibles, toutes annoncées avant la course : soir / matin tôt (+20€ entre 6h-7h et 20h-23h), nuit (+40€ entre 23h-6h), week-end et jours fériés (+20€), réservation à moins de 2h (+20€).",
  },
  {
    question: "Combien coûte un taxi moto Paris-CDG ?",
    answer:
      "Le forfait Paris ↔ Roissy CDG est à 99€ tarif fixe. Pour un trajet depuis le 8e arrondissement aux heures de pointe, vous gagnez en moyenne 30 minutes par rapport à un VTC ou taxi classique.",
  },
  {
    question: "Combien coûte un taxi moto Paris-Orly ?",
    answer:
      "Le forfait Paris ↔ Orly est à 76€ tarif fixe. Tous les terminaux Orly (1, 2, 3, 4) sont desservis 24h/24, 7j/7.",
  },
  {
    question: "Existe-t-il un tarif moto-taxi à l'heure ?",
    answer:
      "Oui, la mise à disposition est à 95€ pour 1 heure, 320€ pour 4 heures et 580€ pour une journée de 8 heures. Idéal pour les déplacements multi-rendez-vous, les tournages, ou les VIP.",
  },
  {
    question: "Le taxi moto est-il moins cher qu'un VTC ?",
    answer:
      "Pour un trajet Paris ↔ CDG aux heures de pointe : un taxi moto coûte 99€ pour 25-40 min de trajet, un VTC entre 60€ et 100€ pour 45-90 min. Le taxi moto n'est pas systématiquement moins cher, mais offre un gain de temps majeur (30-45 min) qui justifie l'écart pour un voyage business ou un avion à attraper.",
  },
  {
    question: "Quels moyens de paiement Izymoto accepte ?",
    answer:
      "Paiement en ligne sécurisé par carte bancaire (Visa, Mastercard, American Express) lors de la réservation, ou directement au chauffeur (CB ou espèces). Pour les comptes professionnels, facturation entreprise mensuelle sur demande.",
  },
  {
    question: "Que se passe-t-il en cas d'annulation ?",
    answer:
      "Annulation gratuite jusqu'à 2 heures avant la course. Au-delà, une majoration de 100% s'applique. L'attente offerte est de 5 minutes après l'heure de prise en charge, et 20 minutes après l'atterrissage pour les arrivées aéroport.",
  },
  {
    question: "Proposez-vous des tarifs spéciaux pour trajets récurrents ?",
    answer:
      "Oui : pour les trajets quotidiens domicile-bureau ou les comptes entreprise, nous proposons des formules d'abonnement avec tarif préférentiel. Devis sur demande à contact@izymoto.com.",
  },
];

export default function NosTarifs() {
  return (
    <>
      <Script
        id="ld-service-tarifs"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-950 text-white py-12 md:py-16">
        <Halo />
        <div className="relative z-10 container mx-auto px-4">
          <nav aria-label="Fil d'ariane" className="text-sm text-white/50 mb-4">
            <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
            <span className="mx-2">/</span>
            <span className="text-white">Nos tarifs</span>
          </nav>
          <h1 className="text-3xl md:text-5xl font-bold uppercase tracking-tight mb-4 leading-tight">
            Tarif taxi moto à Paris : prix fixes moto-taxi Izymoto
          </h1>
          <p className="text-base md:text-lg text-white/80 max-w-3xl">
            Tous nos prix de taxi moto à Paris sont des forfaits fixes, annoncés
            avant la course. Pas de compteur, pas de surprise. Voici la grille
            complète de nos tarifs moto-taxi pour les principaux trajets et la
            mise à disposition.
          </p>
          <div className="text-sm text-white/40 mt-4">
            Dernière mise à jour le 5 mai 2026.
          </div>
        </div>
      </section>

      {/* Section ForfaitCards */}
      <section className="py-12 md:py-16 bg-cream-50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-tight text-navy-950 text-center mb-8">
            Réservez votre trajet
          </h2>
          <ForfaitCards ctaHref="/#reservation" />
        </div>
      </section>

      {/* Tableaux tarifaires */}
      <section className="py-10 md:py-12 bg-white">
        <div className="container mx-auto px-4 max-w-5xl">

          {/* Encarts garanties */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <div className="bg-white border border-navy-100 rounded-xl shadow-sm p-5 flex items-start gap-3">
              <BadgeEuro className="h-6 w-6 text-mint-600 flex-shrink-0 mt-1" />
              <div>
                <div className="font-semibold text-navy-950">Tarif fixe</div>
                <div className="text-sm text-navy-600">Prix annoncé avant la course, garanti même en cas de trafic.</div>
              </div>
            </div>
            <div className="bg-white border border-navy-100 rounded-xl shadow-sm p-5 flex items-start gap-3">
              <Clock className="h-6 w-6 text-mint-600 flex-shrink-0 mt-1" />
              <div>
                <div className="font-semibold text-navy-950">Attente offerte</div>
                <div className="text-sm text-navy-600">5 min après l'heure prévue, 20 min après l'atterrissage avion.</div>
              </div>
            </div>
            <div className="bg-white border border-navy-100 rounded-xl shadow-sm p-5 flex items-start gap-3">
              <ShieldCheck className="h-6 w-6 text-mint-600 flex-shrink-0 mt-1" />
              <div>
                <div className="font-semibold text-navy-950">Équipement inclus</div>
                <div className="text-sm text-navy-600">Casque, gants, blouson et sur-pantalon fournis et désinfectés.</div>
              </div>
            </div>
          </div>

          {/* Tableau 1 : forfaits par trajet */}
          <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-tight text-navy-950 mb-4">
            Forfaits taxi moto par trajet
          </h2>
          <p className="text-navy-600 mb-6 max-w-3xl">
            Les forfaits ci-dessous couvrent les trajets les plus demandés depuis
            Paris : transferts aéroports (Orly, Roissy CDG, Beauvais, Le Bourget),
            quartiers d'affaires (La Défense), parcs et destinations
            (Disneyland Paris). Pour un trajet hors zone forfaitaire, voir les
            conditions plus bas.
          </p>
          <div className="overflow-x-auto mb-12">
            <table className="min-w-full bg-white border border-navy-100 rounded-xl shadow-sm overflow-hidden">
              <thead className="bg-navy-950 text-white">
                <tr>
                  <th className="py-3 px-4 text-left font-semibold">Trajet</th>
                  <th className="py-3 px-4 text-right font-semibold">Tarif fixe (EUR)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-cream-100 border-b border-navy-100"><td className="py-3 px-4 text-navy-950">Paris ↔ Paris</td><td className="py-3 px-4 text-right font-semibold text-mint-600">46 €</td></tr>
                <tr className="hover:bg-cream-100 border-b border-navy-100"><td className="py-3 px-4 text-navy-950">Paris ↔ Orly</td><td className="py-3 px-4 text-right font-semibold text-mint-600">76 €</td></tr>
                <tr className="hover:bg-cream-100 border-b border-navy-100"><td className="py-3 px-4 text-navy-950">Paris ↔ Roissy CDG</td><td className="py-3 px-4 text-right font-semibold text-mint-600">99 €</td></tr>
                <tr className="hover:bg-cream-100 border-b border-navy-100"><td className="py-3 px-4 text-navy-950">Paris ↔ La Défense</td><td className="py-3 px-4 text-right font-semibold text-mint-600">50 €</td></tr>
                <tr className="hover:bg-cream-100 border-b border-navy-100"><td className="py-3 px-4 text-navy-950">Paris ↔ Le Bourget</td><td className="py-3 px-4 text-right font-semibold text-mint-600">65 €</td></tr>
                <tr className="hover:bg-cream-100 border-b border-navy-100"><td className="py-3 px-4 text-navy-950">Paris ↔ Petite couronne (92, 93, 94)</td><td className="py-3 px-4 text-right font-semibold text-mint-600">70 €</td></tr>
                <tr className="hover:bg-cream-100 border-b border-navy-100"><td className="py-3 px-4 text-navy-950">La Défense ↔ Orly</td><td className="py-3 px-4 text-right font-semibold text-mint-600">99 €</td></tr>
                <tr className="hover:bg-cream-100 border-b border-navy-100"><td className="py-3 px-4 text-navy-950">La Défense ↔ Roissy CDG</td><td className="py-3 px-4 text-right font-semibold text-mint-600">99 €</td></tr>
                <tr className="hover:bg-cream-100 border-b border-navy-100"><td className="py-3 px-4 text-navy-950">Orly ↔ Roissy CDG</td><td className="py-3 px-4 text-right font-semibold text-mint-600">139 €</td></tr>
                <tr className="hover:bg-cream-100 border-b border-navy-100"><td className="py-3 px-4 text-navy-950">Paris ↔ Disneyland Paris</td><td className="py-3 px-4 text-right font-semibold text-mint-600">110 €</td></tr>
                <tr className="hover:bg-cream-100"><td className="py-3 px-4 text-navy-950">Beauvais ↔ Paris</td><td className="py-3 px-4 text-right font-semibold text-mint-600">180 €</td></tr>
              </tbody>
            </table>
          </div>

          {/* Tableau 2 : mise à disposition */}
          <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-tight text-navy-950 mb-4">
            Mise à disposition : tarif moto-taxi à l'heure
          </h2>
          <p className="text-navy-600 mb-6 max-w-3xl">
            La mise à disposition permet de réserver votre chauffeur taxi moto
            sur une durée fixe, pour enchaîner plusieurs rendez-vous,
            accompagner un client VIP ou couvrir un événement. Le chauffeur
            reste à votre disposition pendant toute la période.
          </p>
          <div className="overflow-x-auto mb-12">
            <table className="min-w-full bg-white border border-navy-100 rounded-xl shadow-sm overflow-hidden">
              <thead className="bg-navy-950 text-white">
                <tr>
                  <th className="py-3 px-4 text-left font-semibold">Durée</th>
                  <th className="py-3 px-4 text-right font-semibold">Tarif (EUR)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-cream-100 border-b border-navy-100"><td className="py-3 px-4 text-navy-950">1 heure</td><td className="py-3 px-4 text-right font-semibold text-mint-600">95 €</td></tr>
                <tr className="hover:bg-cream-100 border-b border-navy-100"><td className="py-3 px-4 text-navy-950">4 heures</td><td className="py-3 px-4 text-right font-semibold text-mint-600">320 €</td></tr>
                <tr className="hover:bg-cream-100"><td className="py-3 px-4 text-navy-950">8 heures (journée)</td><td className="py-3 px-4 text-right font-semibold text-mint-600">580 €</td></tr>
              </tbody>
            </table>
          </div>

          {/* Tableau 3 : majorations & conditions */}
          <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-tight text-navy-950 mb-4">
            Majorations & conditions
          </h2>
          <p className="text-navy-600 mb-6 max-w-3xl">
            Quelques majorations peuvent s'appliquer selon l'horaire et le
            délai de réservation. Elles sont systématiquement annoncées dans
            le devis avant la confirmation, pas de mauvaise surprise.
          </p>
          <div className="overflow-x-auto mb-8">
            <table className="min-w-full bg-white border border-navy-100 rounded-xl shadow-sm overflow-hidden">
              <thead className="bg-navy-950 text-white">
                <tr>
                  <th className="py-3 px-4 text-left font-semibold">Situation</th>
                  <th className="py-3 px-4 text-right font-semibold">Supplément</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-cream-100 border-b border-navy-100"><td className="py-3 px-4 text-navy-950">Soir / matin tôt (6h-7h ou 20h-23h)</td><td className="py-3 px-4 text-right font-semibold text-mint-600">+20 €</td></tr>
                <tr className="hover:bg-cream-100 border-b border-navy-100"><td className="py-3 px-4 text-navy-950">Nuit (23h-6h)</td><td className="py-3 px-4 text-right font-semibold text-mint-600">+40 €</td></tr>
                <tr className="hover:bg-cream-100 border-b border-navy-100"><td className="py-3 px-4 text-navy-950">Week-end et jours fériés</td><td className="py-3 px-4 text-right font-semibold text-mint-600">+20 €</td></tr>
                <tr className="hover:bg-cream-100 border-b border-navy-100"><td className="py-3 px-4 text-navy-950">Réservation à moins de 2h</td><td className="py-3 px-4 text-right font-semibold text-mint-600">+20 €</td></tr>
                <tr className="hover:bg-cream-100"><td className="py-3 px-4 text-navy-950">Annulation à moins de 2 heures</td><td className="py-3 px-4 text-right font-semibold text-mint-600">+100 %</td></tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-tight text-navy-950 mb-4">
            Conditions tarifaires
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-navy-600 mb-12 max-w-3xl">
            <li>Tarifs applicables hors conditions exceptionnelles et grands évènements.</li>
            <li>Trajet hors zone forfaitaire : prise en charge 30€ + 3€/km, arrondi par paliers de 5€.</li>
            <li>Attente offerte : 5 minutes après l'heure de prise en charge.</li>
            <li>Aéroports : 20 minutes d'attente offertes après l'atterrissage, puis 1€ / minute.</li>
            <li>Réservation prioritaire : +20€ (prise en charge sous 15 min).</li>
            <li>Trajet récurrent : formule d'abonnement possible — devis sur demande à contact@izymoto.com.</li>
          </ul>

          {/* Tableau comparatif */}
          <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-tight text-navy-950 mb-4">
            Taxi moto, VTC ou taxi classique : combien ça coûte vraiment ?
          </h2>
          <p className="text-navy-600 mb-6 max-w-3xl">
            Sur un trajet Paris → Roissy CDG aux heures de pointe, voici un
            ordre de grandeur des prix et temps de trajet observés (chiffres
            indicatifs, variables selon la demande).
          </p>
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full bg-white border border-navy-100 rounded-xl shadow-sm overflow-hidden">
              <thead className="bg-navy-950 text-white">
                <tr>
                  <th className="py-3 px-4 text-left font-semibold">Mode</th>
                  <th className="py-3 px-4 text-right font-semibold">Prix moyen</th>
                  <th className="py-3 px-4 text-right font-semibold">Temps trajet (heure de pointe)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-cream-100 border-b border-navy-100">
                  <td className="py-3 px-4 font-semibold text-navy-950">Taxi moto Izymoto</td>
                  <td className="py-3 px-4 text-right text-mint-600 font-semibold">99 € (fixe)</td>
                  <td className="py-3 px-4 text-right text-navy-950">25–40 min</td>
                </tr>
                <tr className="hover:bg-cream-100 border-b border-navy-100">
                  <td className="py-3 px-4 text-navy-950">VTC standard</td>
                  <td className="py-3 px-4 text-right text-navy-950">60–100 € (variable)</td>
                  <td className="py-3 px-4 text-right text-navy-950">45–90 min</td>
                </tr>
                <tr className="hover:bg-cream-100 border-b border-navy-100">
                  <td className="py-3 px-4 text-navy-950">Taxi parisien (au compteur)</td>
                  <td className="py-3 px-4 text-right text-navy-950">55–80 € (forfait) + suppléments</td>
                  <td className="py-3 px-4 text-right text-navy-950">45–90 min</td>
                </tr>
                <tr className="hover:bg-cream-100">
                  <td className="py-3 px-4 text-navy-950">RER B + correspondance</td>
                  <td className="py-3 px-4 text-right text-navy-950">11,80 €</td>
                  <td className="py-3 px-4 text-right text-navy-950">50–70 min</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-navy-600/70 italic mb-12">
            Le taxi moto n'est pas systématiquement le moins cher, mais reste
            l'option la plus rapide aux heures de pointe et garantit l'arrivée
            à l'heure pour un avion ou un rendez-vous critique.
          </p>

          {/* Règlement des prestations */}
          <section className="bg-cream-50 border border-navy-100 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold uppercase tracking-tight text-navy-950 mb-4">
              Règlement des prestations
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-navy-600">
              <li>Paiement en ligne sécurisé (CB) lors de la réservation, ou directement au chauffeur (CB / espèces).</li>
              <li>Cartes Visa, Mastercard et American Express acceptées.</li>
              <li>Facturation entreprise sur demande pour les comptes pro.</li>
            </ul>
          </section>

          <p className="text-sm text-navy-600/60 italic mb-8">
            Tous nos chauffeurs sont certifiés par le décret n° 2010-1223 du 11
            octobre 2010 applicable au 1er avril 2011. Tarifs applicables hors
            conditions exceptionnelles (grève, catastrophe naturelle…) et
            grands évènements.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <FaqSection
        items={faqList.map((item) => ({ q: item.question, a: item.answer }))}
        title="Questions fréquentes sur les tarifs taxi moto"
        jsonLdId="faq-tarifs"
      />

      {/* CTA final */}
      <section className="relative overflow-hidden bg-navy-950 text-white py-12 md:py-16">
        <Halo />
        <div className="relative z-10 container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold uppercase tracking-tight mb-4">
            Réservez votre taxi moto au tarif annoncé
          </h2>
          <p className="text-white/80 mb-8 max-w-2xl mx-auto">
            Devis instantané, prix fixe, chauffeur en route en 15 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/reserver"
              className="bg-mint-400 text-navy-950 font-semibold text-lg px-8 py-4 rounded-lg inline-flex items-center justify-center hover:bg-mint-300 transition-colors"
            >
              Obtenir mon devis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <a
              href="tel:+33649502525"
              className="border border-white/30 text-white font-semibold text-lg px-8 py-4 rounded-lg inline-flex items-center justify-center hover:border-mint-400 hover:text-mint-300 transition-colors"
            >
              <Phone className="mr-2 h-5 w-5" />
              +33 6 49 50 25 25
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
