import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { ArrowRight, Phone, ShieldCheck, Clock, BadgeEuro } from "lucide-react";

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

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqList.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

export default function NosTarifs() {
  return (
    <>
      <Script
        id="ld-service-tarifs"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <Script
        id="ld-faq-tarifs"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <section className="bg-slate-900 text-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <nav aria-label="Fil d'ariane" className="text-sm text-gray-400 mb-4">
            <Link href="/" className="hover:text-white">Accueil</Link>
            <span className="mx-2">/</span>
            <span className="text-white">Nos tarifs</span>
          </nav>
          <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
            Tarif taxi moto à Paris : prix fixes moto-taxi Izymoto
          </h1>
          <p className="text-base md:text-lg text-gray-300 max-w-3xl">
            Tous nos prix de taxi moto à Paris sont des forfaits fixes, annoncés
            avant la course. Pas de compteur, pas de surprise. Voici la grille
            complète de nos tarifs moto-taxi pour les principaux trajets et la
            mise à disposition.
          </p>
          <div className="text-sm text-gray-400 mt-4">
            Dernière mise à jour le 5 mai 2026.
          </div>
        </div>
      </section>

      <section className="py-10 md:py-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <div className="bg-gray-50 p-5 rounded-lg flex items-start gap-3">
              <BadgeEuro className="h-6 w-6 text-black flex-shrink-0 mt-1" />
              <div>
                <div className="font-semibold">Tarif fixe</div>
                <div className="text-sm text-gray-600">Prix annoncé avant la course, garanti même en cas de trafic.</div>
              </div>
            </div>
            <div className="bg-gray-50 p-5 rounded-lg flex items-start gap-3">
              <Clock className="h-6 w-6 text-black flex-shrink-0 mt-1" />
              <div>
                <div className="font-semibold">Attente offerte</div>
                <div className="text-sm text-gray-600">5 min après l'heure prévue, 20 min après l'atterrissage avion.</div>
              </div>
            </div>
            <div className="bg-gray-50 p-5 rounded-lg flex items-start gap-3">
              <ShieldCheck className="h-6 w-6 text-black flex-shrink-0 mt-1" />
              <div>
                <div className="font-semibold">Équipement inclus</div>
                <div className="text-sm text-gray-600">Casque, gants, blouson et sur-pantalon fournis et désinfectés.</div>
              </div>
            </div>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold mb-4">Forfaits taxi moto par trajet</h2>
          <p className="text-gray-700 mb-6 max-w-3xl">
            Les forfaits ci-dessous couvrent les trajets les plus demandés depuis
            Paris : transferts aéroports (Orly, Roissy CDG, Beauvais, Le Bourget),
            quartiers d'affaires (La Défense), parcs et destinations
            (Disneyland Paris). Pour un trajet hors zone forfaitaire, voir les
            conditions plus bas.
          </p>
          <div className="overflow-x-auto mb-12">
            <table className="min-w-full bg-white border border-gray-200 shadow-sm">
              <thead className="bg-black text-white">
                <tr>
                  <th className="py-3 px-4 text-left">Trajet</th>
                  <th className="py-3 px-4 text-right">Tarif fixe (EUR)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-gray-50 border-b"><td className="py-3 px-4">Paris ↔ Paris</td><td className="py-3 px-4 text-right font-semibold">46 €</td></tr>
                <tr className="hover:bg-gray-50 border-b"><td className="py-3 px-4">Paris ↔ Orly</td><td className="py-3 px-4 text-right font-semibold">76 €</td></tr>
                <tr className="hover:bg-gray-50 border-b"><td className="py-3 px-4">Paris ↔ Roissy CDG</td><td className="py-3 px-4 text-right font-semibold">99 €</td></tr>
                <tr className="hover:bg-gray-50 border-b"><td className="py-3 px-4">Paris ↔ La Défense</td><td className="py-3 px-4 text-right font-semibold">50 €</td></tr>
                <tr className="hover:bg-gray-50 border-b"><td className="py-3 px-4">Paris ↔ Le Bourget</td><td className="py-3 px-4 text-right font-semibold">65 €</td></tr>
                <tr className="hover:bg-gray-50 border-b"><td className="py-3 px-4">Paris ↔ Petite couronne (92, 93, 94)</td><td className="py-3 px-4 text-right font-semibold">70 €</td></tr>
                <tr className="hover:bg-gray-50 border-b"><td className="py-3 px-4">La Défense ↔ Orly</td><td className="py-3 px-4 text-right font-semibold">99 €</td></tr>
                <tr className="hover:bg-gray-50 border-b"><td className="py-3 px-4">La Défense ↔ Roissy CDG</td><td className="py-3 px-4 text-right font-semibold">99 €</td></tr>
                <tr className="hover:bg-gray-50 border-b"><td className="py-3 px-4">Orly ↔ Roissy CDG</td><td className="py-3 px-4 text-right font-semibold">139 €</td></tr>
                <tr className="hover:bg-gray-50 border-b"><td className="py-3 px-4">Paris ↔ Disneyland Paris</td><td className="py-3 px-4 text-right font-semibold">110 €</td></tr>
                <tr className="hover:bg-gray-50 border-b"><td className="py-3 px-4">Beauvais ↔ Paris</td><td className="py-3 px-4 text-right font-semibold">180 €</td></tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold mb-4">Mise à disposition : tarif moto-taxi à l'heure</h2>
          <p className="text-gray-700 mb-6 max-w-3xl">
            La mise à disposition permet de réserver votre chauffeur taxi moto
            sur une durée fixe, pour enchaîner plusieurs rendez-vous,
            accompagner un client VIP ou couvrir un événement. Le chauffeur
            reste à votre disposition pendant toute la période.
          </p>
          <div className="overflow-x-auto mb-12">
            <table className="min-w-full bg-white border border-gray-200 shadow-sm">
              <thead className="bg-black text-white">
                <tr>
                  <th className="py-3 px-4 text-left">Durée</th>
                  <th className="py-3 px-4 text-right">Tarif (EUR)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-gray-50 border-b"><td className="py-3 px-4">1 heure</td><td className="py-3 px-4 text-right font-semibold">95 €</td></tr>
                <tr className="hover:bg-gray-50 border-b"><td className="py-3 px-4">4 heures</td><td className="py-3 px-4 text-right font-semibold">320 €</td></tr>
                <tr className="hover:bg-gray-50 border-b"><td className="py-3 px-4">8 heures (journée)</td><td className="py-3 px-4 text-right font-semibold">580 €</td></tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold mb-4">Majorations & conditions</h2>
          <p className="text-gray-700 mb-6 max-w-3xl">
            Quelques majorations peuvent s'appliquer selon l'horaire et le
            délai de réservation. Elles sont systématiquement annoncées dans
            le devis avant la confirmation, pas de mauvaise surprise.
          </p>
          <div className="overflow-x-auto mb-8">
            <table className="min-w-full bg-white border border-gray-200 shadow-sm">
              <thead className="bg-black text-white">
                <tr>
                  <th className="py-3 px-4 text-left">Situation</th>
                  <th className="py-3 px-4 text-right">Supplément</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-gray-50 border-b"><td className="py-3 px-4">Soir / matin tôt (6h-7h ou 20h-23h)</td><td className="py-3 px-4 text-right">+20 €</td></tr>
                <tr className="hover:bg-gray-50 border-b"><td className="py-3 px-4">Nuit (23h-6h)</td><td className="py-3 px-4 text-right">+40 €</td></tr>
                <tr className="hover:bg-gray-50 border-b"><td className="py-3 px-4">Week-end et jours fériés</td><td className="py-3 px-4 text-right">+20 €</td></tr>
                <tr className="hover:bg-gray-50 border-b"><td className="py-3 px-4">Réservation à moins de 2h</td><td className="py-3 px-4 text-right">+20 €</td></tr>
                <tr className="hover:bg-gray-50 border-b"><td className="py-3 px-4">Annulation à moins de 2 heures</td><td className="py-3 px-4 text-right">+100 %</td></tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold mb-4">Conditions tarifaires</h2>
          <ul className="list-disc pl-5 space-y-2 text-gray-700 mb-12 max-w-3xl">
            <li>Tarifs applicables hors conditions exceptionnelles et grands évènements.</li>
            <li>Trajet hors zone forfaitaire : prise en charge 30€ + 3€/km, arrondi par paliers de 5€.</li>
            <li>Attente offerte : 5 minutes après l'heure de prise en charge.</li>
            <li>Aéroports : 20 minutes d'attente offertes après l'atterrissage, puis 1€ / minute.</li>
            <li>Réservation prioritaire : +20€ (prise en charge sous 15 min).</li>
            <li>Trajet récurrent : formule d'abonnement possible — devis sur demande à contact@izymoto.com.</li>
          </ul>

          <h2 className="text-2xl md:text-3xl font-bold mb-4">Taxi moto, VTC ou taxi classique : combien ça coûte vraiment ?</h2>
          <p className="text-gray-700 mb-6 max-w-3xl">
            Sur un trajet Paris → Roissy CDG aux heures de pointe, voici un
            ordre de grandeur des prix et temps de trajet observés (chiffres
            indicatifs, variables selon la demande).
          </p>
          <div className="overflow-x-auto mb-12">
            <table className="min-w-full bg-white border border-gray-200 shadow-sm">
              <thead className="bg-black text-white">
                <tr>
                  <th className="py-3 px-4 text-left">Mode</th>
                  <th className="py-3 px-4 text-right">Prix moyen</th>
                  <th className="py-3 px-4 text-right">Temps trajet (heure de pointe)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-gray-50 border-b">
                  <td className="py-3 px-4 font-semibold">Taxi moto Izymoto</td>
                  <td className="py-3 px-4 text-right">99 € (fixe)</td>
                  <td className="py-3 px-4 text-right">25–40 min</td>
                </tr>
                <tr className="hover:bg-gray-50 border-b">
                  <td className="py-3 px-4">VTC standard</td>
                  <td className="py-3 px-4 text-right">60–100 € (variable)</td>
                  <td className="py-3 px-4 text-right">45–90 min</td>
                </tr>
                <tr className="hover:bg-gray-50 border-b">
                  <td className="py-3 px-4">Taxi parisien (au compteur)</td>
                  <td className="py-3 px-4 text-right">55–80 € (forfait) + suppléments</td>
                  <td className="py-3 px-4 text-right">45–90 min</td>
                </tr>
                <tr className="hover:bg-gray-50 border-b">
                  <td className="py-3 px-4">RER B + correspondance</td>
                  <td className="py-3 px-4 text-right">11,80 €</td>
                  <td className="py-3 px-4 text-right">50–70 min</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500 italic mb-12">
            Le taxi moto n'est pas systématiquement le moins cher, mais reste
            l'option la plus rapide aux heures de pointe et garantit l'arrivée
            à l'heure pour un avion ou un rendez-vous critique.
          </p>

          <h2 className="text-2xl md:text-3xl font-bold mb-6">Questions fréquentes sur les tarifs taxi moto</h2>
          <div className="space-y-3 mb-12">
            {faqList.map((item, i) => (
              <details key={i} className="bg-gray-50 rounded-lg p-5 group">
                <summary className="font-semibold cursor-pointer list-none flex justify-between items-center">
                  <span>{item.question}</span>
                  <span className="text-2xl text-black group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-gray-700 leading-relaxed">{item.answer}</p>
              </details>
            ))}
          </div>

          <section className="bg-gray-50 p-6 rounded-lg mb-8">
            <h2 className="text-xl font-semibold mb-4">Règlement des prestations</h2>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>Paiement en ligne sécurisé (CB) lors de la réservation, ou directement au chauffeur (CB / espèces).</li>
              <li>Cartes Visa, Mastercard et American Express acceptées.</li>
              <li>Facturation entreprise sur demande pour les comptes pro.</li>
            </ul>
          </section>

          <p className="text-sm text-gray-600 italic mb-8">
            Tous nos chauffeurs sont certifiés par le décret n° 2010-1223 du 11
            octobre 2010 applicable au 1er avril 2011. Tarifs applicables hors
            conditions exceptionnelles (grève, catastrophe naturelle…) et
            grands évènements.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-black text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Réservez votre taxi moto au tarif annoncé
          </h2>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            Devis instantané, prix fixe, chauffeur en route en 15 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/reserver"
              className="bg-white text-black font-medium text-lg px-8 py-4 rounded-lg inline-flex items-center justify-center hover:bg-gray-200"
            >
              Obtenir mon devis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <a
              href="tel:+33649502525"
              className="border border-white text-white font-medium text-lg px-8 py-4 rounded-lg inline-flex items-center justify-center hover:bg-white/10"
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
