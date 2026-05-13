import type { Metadata } from "next";
import Link from "next/link";
import ArticleLayout from "@/components/blog/ArticleLayout";

export const metadata: Metadata = {
  title: "Prix taxi moto Paris-CDG : combien ça coûte vraiment ? | Izymoto",
  description:
    "Combien coûte un taxi moto de Paris à Roissy CDG ? Guide complet 2026 : tarif fixe, comparatif VTC/taxi/RER B, suppléments et astuces pour optimiser le prix.",
  alternates: { canonical: "/blog/prix-taxi-moto-paris-cdg" },
  openGraph: {
    title: "Prix taxi moto Paris-CDG : combien ça coûte vraiment ?",
    description:
      "Tarif taxi moto Paris ↔ Roissy CDG : guide complet 2026 (forfaits, comparatif VTC, astuces).",
    url: "/blog/prix-taxi-moto-paris-cdg",
    type: "article",
  },
};

const H2 = "text-2xl md:text-3xl font-bold mt-10 mb-4";
const H3 = "text-xl md:text-2xl font-bold mt-8 mb-3";
const P = "mb-4 leading-relaxed";
const UL = "list-disc pl-6 mb-4 space-y-2";
const TABLE = "min-w-full bg-white border border-gray-200 shadow-sm mb-6";

export default function Article() {
  return (
    <ArticleLayout
      slug="prix-taxi-moto-paris-cdg"
      title="Prix taxi moto Paris-CDG : combien ça coûte vraiment en 2026 ?"
      description="Tarif d'un taxi moto Paris-Roissy CDG : forfaits Izymoto, comparatif avec VTC, taxi classique et RER B, suppléments et astuces pour optimiser le coût."
      publishedAt="2026-05-13"
      readMinutes={7}
      intro="Le taxi moto est devenu une option incontournable pour rejoindre Roissy Charles-de-Gaulle depuis Paris. Mais combien ça coûte vraiment, et est-ce justifié par rapport à un VTC ou un taxi traditionnel ? Voici le guide complet 2026 sur le prix d'un taxi moto Paris-CDG."
      faq={[
        {
          question: "Combien coûte un taxi moto Paris-CDG en 2026 ?",
          answer:
            "À partir de 80€ en tarif fixe chez Izymoto pour un trajet Paris intra-muros ↔ Roissy CDG. Aucun supplément kilométrique, prix garanti même en cas de bouchons.",
        },
        {
          question: "Le taxi moto est-il plus cher qu'un VTC pour aller à CDG ?",
          answer:
            "Pas systématiquement. Un VTC peut coûter entre 60€ et 100€ pour le même trajet, mais le prix varie en surge pricing aux heures de pointe. Le taxi moto reste à prix fixe quoi qu'il arrive.",
        },
        {
          question: "Y a-t-il des suppléments à prévoir pour un Paris-CDG en taxi moto ?",
          answer:
            "Oui, 4 majorations possibles : +20€ en soirée (20h-23h) ou matin tôt (6h-7h), +40€ la nuit (23h-6h), +20€ pour réservation de dernière minute (-2h), +20€ week-end et jours fériés.",
        },
        {
          question: "Quel est le moyen le moins cher pour aller à CDG ?",
          answer:
            "Le RER B reste imbattable côté prix (11,80€) mais il faut compter 50 à 70 min avec changements et bagages. Pour un confort + rapidité, le taxi moto est le meilleur compromis aux heures de pointe.",
        },
      ]}
    >
      <p className={P}>
        Vous avez un avion à attraper à Roissy CDG, un client à accueillir au terminal 2E, ou vous rentrez d'un long-courrier épuisé : la question du transport entre Paris et l'aéroport revient à chaque fois. Et avec elle, celle du <strong>prix d'un taxi moto Paris-CDG</strong>.
      </p>

      <p className={P}>
        Dans cet article, on vous donne <strong>tous les tarifs réels</strong> (forfaits, suppléments, conditions), on les compare aux autres modes de transport, et on vous explique <strong>dans quels cas le taxi moto vaut son prix</strong> — et dans quels cas un autre choix est plus malin.
      </p>

      <h2 className={H2}>Le tarif Izymoto Paris ↔ Roissy CDG en 2026</h2>

      <p className={P}>
        Chez <Link href="/" className="text-black underline hover:no-underline">Izymoto</Link>, le tarif d'un taxi moto Paris-CDG est <strong>fixe</strong> et annoncé avant la course. Pas de compteur, pas de mauvaise surprise à l'arrivée.
      </p>

      <h3 className={H3}>Forfaits selon le point de départ</h3>

      <div className="overflow-x-auto">
        <table className={TABLE}>
          <thead className="bg-black text-white">
            <tr>
              <th className="py-3 px-4 text-left">Trajet</th>
              <th className="py-3 px-4 text-right">Tarif fixe</th>
              <th className="py-3 px-4 text-right">Durée estimée</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b"><td className="py-3 px-4">Paris 1er ↔ CDG</td><td className="py-3 px-4 text-right font-semibold">80 €</td><td className="py-3 px-4 text-right">30–40 min</td></tr>
            <tr className="border-b"><td className="py-3 px-4">Paris 8e (Champs-Élysées) ↔ CDG</td><td className="py-3 px-4 text-right font-semibold">80 €</td><td className="py-3 px-4 text-right">25–35 min</td></tr>
            <tr className="border-b"><td className="py-3 px-4">Paris 16e ↔ CDG</td><td className="py-3 px-4 text-right font-semibold">90 €</td><td className="py-3 px-4 text-right">30–45 min</td></tr>
            <tr className="border-b"><td className="py-3 px-4">La Défense ↔ CDG</td><td className="py-3 px-4 text-right font-semibold">95 €</td><td className="py-3 px-4 text-right">30–45 min</td></tr>
            <tr className="border-b"><td className="py-3 px-4">Disneyland Paris ↔ CDG</td><td className="py-3 px-4 text-right font-semibold">120 €</td><td className="py-3 px-4 text-right">35–50 min</td></tr>
          </tbody>
        </table>
      </div>

      <p className={P}>
        Le forfait inclut <strong>la prise en charge à domicile</strong>, <strong>15 minutes d'attente offertes</strong> (20 min en aéroport après l'atterrissage), <strong>l'équipement passager complet</strong> (casque, gants, blouson, sur-pantalon) et le suivi du vol en temps réel pour les arrivées.
      </p>

      <h2 className={H2}>Suppléments à prévoir sur le tarif</h2>

      <p className={P}>
        Quatre majorations possibles, toutes annoncées dans le devis avant la confirmation :
      </p>

      <ul className={UL}>
        <li><strong>Soir / matin tôt (6h-7h ou 20h-23h)</strong> : +20€</li>
        <li><strong>Nuit (23h-6h)</strong> : +40€</li>
        <li><strong>Week-end et jours fériés</strong> : +20€</li>
        <li><strong>Réservation à moins de 2h</strong> (course immédiate) : +20€</li>
      </ul>

      <p className={P}>
        Concrètement : un Paris 8e ↔ CDG à 5h30 du matin un dimanche coûtera <strong>80 + 40 (nuit) + 20 (week-end) = 140€</strong>. Sans majoration, un trajet en pleine journée de semaine reste à 80€.
      </p>

      <h2 className={H2}>Comparatif : taxi moto, VTC, taxi, RER B</h2>

      <p className={P}>
        Pour vous aider à choisir, voici les ordres de grandeur observés sur un <strong>Paris ↔ CDG aux heures de pointe</strong> (chiffres indicatifs 2026) :
      </p>

      <div className="overflow-x-auto">
        <table className={TABLE}>
          <thead className="bg-black text-white">
            <tr>
              <th className="py-3 px-4 text-left">Mode</th>
              <th className="py-3 px-4 text-right">Prix moyen</th>
              <th className="py-3 px-4 text-right">Durée heure de pointe</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b"><td className="py-3 px-4 font-semibold">Taxi moto Izymoto</td><td className="py-3 px-4 text-right">80 € (fixe)</td><td className="py-3 px-4 text-right">25–40 min</td></tr>
            <tr className="border-b"><td className="py-3 px-4">VTC standard</td><td className="py-3 px-4 text-right">60–100 € (variable)</td><td className="py-3 px-4 text-right">45–90 min</td></tr>
            <tr className="border-b"><td className="py-3 px-4">VTC premium (Berline)</td><td className="py-3 px-4 text-right">90–150 €</td><td className="py-3 px-4 text-right">45–90 min</td></tr>
            <tr className="border-b"><td className="py-3 px-4">Taxi parisien (forfait CDG)</td><td className="py-3 px-4 text-right">55–62 € + suppléments</td><td className="py-3 px-4 text-right">45–90 min</td></tr>
            <tr className="border-b"><td className="py-3 px-4">RER B + correspondances</td><td className="py-3 px-4 text-right">11,80 €</td><td className="py-3 px-4 text-right">50–70 min</td></tr>
          </tbody>
        </table>
      </div>

      <p className={P}>
        Le constat : <strong>le taxi moto n'est pas le moins cher</strong>, mais c'est <strong>de loin le plus rapide</strong> aux heures de pointe. Sur un trajet où un VTC met 1h30 (bouchons A1 + porte de la Chapelle), le taxi moto fait 30 minutes en filtrant entre les voitures.
      </p>

      <h2 className={H2}>Quand le taxi moto vaut-il son prix ?</h2>

      <p className={P}>
        Trois cas où le taxi moto est <strong>objectivement le meilleur choix</strong> :
      </p>

      <ul className={UL}>
        <li><strong>Vol à attraper</strong> avec arrivée tardive prévue : le taxi moto garantit que vous ne raterez pas votre avion, même en cas de bouchon improbable.</li>
        <li><strong>Rendez-vous business critique à votre arrivée</strong> : pas de temps perdu en taxi bloqué sur le périphérique.</li>
        <li><strong>Voyage léger</strong> (cabine + sac à dos) : pas besoin d'un grand coffre, autant gagner 30-45 minutes.</li>
      </ul>

      <p className={P}>
        En revanche, le taxi moto n'est <strong>pas adapté</strong> si vous voyagez avec plusieurs valises lourdes, en famille avec un enfant de moins de 5 ans, ou par très mauvais temps (pluie battante prolongée).
      </p>

      <h2 className={H2}>Astuces pour optimiser le coût</h2>

      <ul className={UL}>
        <li><strong>Réservez 2 à 24h à l'avance</strong> pour éviter la majoration "dernière minute" de +20€.</li>
        <li><strong>Privilégiez les créneaux hors heures de pointe</strong> (départ avant 7h ou entre 10h-16h) — vous évitez les bouchons et donc les retards éventuels.</li>
        <li><strong>Compte entreprise</strong> : si vous voyagez régulièrement, Izymoto propose une facturation mensuelle et des tarifs préférentiels (devis sur demande).</li>
        <li><strong>Groupe</strong> : si vous êtes 2 voyageurs avec bagages, un VTC peut être plus économique. Une seule personne en pressé ? Taxi moto.</li>
      </ul>

      <h2 className={H2}>Réservation et conditions</h2>

      <p className={P}>
        Réservation en ligne sur <Link href="/reserver" className="text-black underline hover:no-underline">izymoto.com/reserver</Link> (devis instantané) ou par téléphone au <a href="tel:+33649502525" className="text-black underline hover:no-underline">+33 6 49 50 25 25</a>.
      </p>

      <p className={P}>
        Paiement <strong>en ligne sécurisé</strong> (CB) lors de la réservation, ou directement au chauffeur (CB / espèces). Annulation gratuite jusqu'à 2 heures avant la course.
      </p>

      <p className={P}>
        Pour plus de détails sur les tarifs complets et les autres trajets, consultez notre <Link href="/nos-tarifs" className="text-black underline hover:no-underline">grille tarifaire</Link> ou la page dédiée <Link href="/moto-taxi-aeroport-cdg" className="text-black underline hover:no-underline">taxi moto Paris ↔ CDG</Link>.
      </p>
    </ArticleLayout>
  );
}
