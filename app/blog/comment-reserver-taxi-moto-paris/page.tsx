import type { Metadata } from "next";
import Link from "next/link";
import ArticleLayout from "@/components/blog/ArticleLayout";

export const metadata: Metadata = {
  title: "Comment réserver un taxi moto à Paris : guide complet 2026 | Izymoto",
  description:
    "Guide pas-à-pas pour réserver un taxi moto à Paris : options de réservation, délais, infos à fournir, paiement. Tout pour un voyage sans stress.",
  alternates: { canonical: "/blog/comment-reserver-taxi-moto-paris" },
  openGraph: {
    title: "Comment réserver un taxi moto à Paris : guide complet 2026",
    description:
      "Guide complet : réserver un taxi moto Izymoto à Paris en ligne, par téléphone, à l'avance ou en urgence.",
    url: "/blog/comment-reserver-taxi-moto-paris",
    type: "article",
  },
};

const H2 = "text-2xl md:text-3xl font-bold mt-10 mb-4";
const H3 = "text-xl md:text-2xl font-bold mt-8 mb-3";
const P = "mb-4 leading-relaxed";
const UL = "list-disc pl-6 mb-4 space-y-2";
const OL = "list-decimal pl-6 mb-4 space-y-2";

export default function Article() {
  return (
    <ArticleLayout
      slug="comment-reserver-taxi-moto-paris"
      title="Comment réserver un taxi moto à Paris : guide complet 2026"
      description="Étapes simples pour réserver un taxi moto à Paris : en ligne, par téléphone, à l'avance ou en urgence. Délais, infos à fournir, paiement, conditions."
      publishedAt="2026-05-13"
      readMinutes={6}
      intro="Première fois que vous réservez un taxi moto à Paris ? Voici le guide pas-à-pas pour le faire en 3 minutes, savoir quand anticiper, quoi indiquer au moment de la commande, et comment payer en toute sécurité."
      faq={[
        {
          question: "Comment réserver un taxi moto Izymoto à Paris ?",
          answer:
            "Trois options : 1) En ligne sur izymoto.com (devis instantané + paiement CB sécurisé), 2) Par téléphone au +33 6 49 50 25 25, 3) Par email à contact@izymoto.com pour les courses programmées à l'avance ou les comptes entreprise.",
        },
        {
          question: "Combien de temps à l'avance dois-je réserver ?",
          answer:
            "Pour une course immédiate, prévoyez 15 minutes de délai de prise en charge. Pour un trajet aéroport ou un horaire précis, réservez au moins 2 heures à l'avance pour éviter la majoration de dernière minute (+20€).",
        },
        {
          question: "Puis-je réserver un taxi moto à Paris pour plus tard ce soir ?",
          answer:
            "Oui, Izymoto opère 24h/24, 7j/7. Vous pouvez réserver à l'avance via le formulaire en ligne en précisant la date et l'heure exactes. Le chauffeur arrive ponctuellement.",
        },
        {
          question: "Comment paie-t-on un taxi moto ?",
          answer:
            "Paiement en ligne sécurisé par carte bancaire (Visa, Mastercard, American Express) au moment de la réservation, ou directement au chauffeur (CB ou espèces). Facturation entreprise possible pour les comptes pro.",
        },
        {
          question: "Que se passe-t-il en cas d'annulation ou de retard de vol ?",
          answer:
            "Annulation gratuite jusqu'à 2 heures avant la course. Au-delà, majoration de 100%. Pour les arrivées aéroport, votre vol est suivi en temps réel : le chauffeur s'adapte automatiquement aux retards sans frais supplémentaires.",
        },
      ]}
    >
      <p className={P}>
        Réserver un taxi moto à Paris est rapide, mais quelques points méritent d'être connus pour <strong>éviter les frais de dernière minute</strong> et <strong>garantir un service nickel</strong>. On vous explique tout.
      </p>

      <h2 className={H2}>Les 3 options de réservation</h2>

      <h3 className={H3}>1. En ligne sur izymoto.com (le plus rapide)</h3>

      <p className={P}>
        Le formulaire de réservation prend <strong>2 minutes</strong> et vous donne un <strong>devis instantané</strong>. C'est l'option recommandée pour 95% des trajets.
      </p>

      <p className={P}>Étapes :</p>

      <ol className={OL}>
        <li>Allez sur <Link href="/reserver" className="text-black underline hover:no-underline">izymoto.com/reserver</Link></li>
        <li>Indiquez votre <strong>adresse de départ et d'arrivée</strong> (le système calcule automatiquement le forfait fixe).</li>
        <li>Choisissez la <strong>date et l'heure</strong> (immédiat ou programmé).</li>
        <li>Renseignez vos <strong>coordonnées</strong> (nom, prénom, téléphone, email).</li>
        <li>Pour les aéroports : précisez votre <strong>numéro de vol</strong> (pour le suivi auto).</li>
        <li><strong>Payez en ligne</strong> par CB (paiement sécurisé Stripe) ou choisissez "paiement au chauffeur".</li>
        <li>Vous recevez une <strong>confirmation immédiate par SMS et email</strong>.</li>
      </ol>

      <h3 className={H3}>2. Par téléphone au +33 6 49 50 25 25</h3>

      <p className={P}>
        Idéal si vous préférez parler à quelqu'un (notamment pour les <strong>cas particuliers</strong> : enfant en bas âge à transporter, bagages volumineux, contrat entreprise, course très complexe). Disponible 24h/24, 7j/7.
      </p>

      <h3 className={H3}>3. Par email à contact@izymoto.com</h3>

      <p className={P}>
        Pour les <strong>réservations programmées à l'avance</strong> (plusieurs jours/semaines), les <strong>devis entreprise</strong> ou les trajets récurrents (domicile-bureau quotidiens). Réponse sous 1h en heures ouvrables.
      </p>

      <h2 className={H2}>Quand réserver : le bon timing</h2>

      <div className="bg-gray-50 p-5 rounded-lg mb-6">
        <p className={`${P} mb-0`}>
          <strong>Règle simple :</strong> réservez au minimum <strong>2 heures avant</strong> votre course pour éviter la majoration "dernière minute" de +20€.
        </p>
      </div>

      <ul className={UL}>
        <li><strong>Course immédiate</strong> (départ sous 15 minutes) : possible mais +20€ de majoration. Prise en charge en 15 min sur Paris intra-muros.</li>
        <li><strong>Course du jour</strong> (2h à 24h à l'avance) : tarif standard, aucune majoration.</li>
        <li><strong>Course programmée</strong> (24h+ à l'avance) : tarif standard, possibilité de réserver pour n'importe quel jour de l'année.</li>
        <li><strong>Vol matinal</strong> (départ avant 7h) : majoration +20€ "matin tôt" applicable entre 6h-7h. Réservez la veille.</li>
        <li><strong>Vol nocturne</strong> (entre 23h et 6h) : majoration +40€ "nuit". Réservez avec marge.</li>
      </ul>

      <h2 className={H2}>Quelles informations fournir à la réservation</h2>

      <p className={P}>Pour que le service soit fluide, prévoyez ces 6 infos :</p>

      <ol className={OL}>
        <li><strong>Adresse de départ précise</strong> (numéro + rue + code porte si nécessaire).</li>
        <li><strong>Adresse d'arrivée précise</strong> (hôtel, terminal d'aéroport, numéro de quai gare).</li>
        <li><strong>Date et heure exactes</strong> de la prise en charge.</li>
        <li><strong>Numéro de téléphone mobile</strong> joignable jusqu'au début de la course.</li>
        <li><strong>Pour un aéroport en arrivée :</strong> numéro de vol (suivi automatique des retards).</li>
        <li><strong>Spécificités éventuelles :</strong> valise (oui/non), bagage volumineux, passager mineur, exigence langue anglaise, etc.</li>
      </ol>

      <h2 className={H2}>Tarif et paiement</h2>

      <p className={P}>
        Le tarif est <strong>annoncé avant la confirmation</strong> et reste fixe quoi qu'il arrive (bouchons, déviation, attente). Les tarifs forfaitaires sont consultables sur la page <Link href="/nos-tarifs" className="text-black underline hover:no-underline">Nos tarifs</Link>.
      </p>

      <h3 className={H3}>Modes de paiement acceptés</h3>

      <ul className={UL}>
        <li><strong>Carte bancaire en ligne</strong> (Visa, Mastercard, American Express) — sécurisé via Stripe</li>
        <li><strong>Carte bancaire au chauffeur</strong> (TPE mobile à bord)</li>
        <li><strong>Espèces au chauffeur</strong> (faire l'appoint si possible)</li>
        <li><strong>Facturation entreprise</strong> (mensuelle, à demander à l'inscription du compte pro)</li>
      </ul>

      <h2 className={H2}>Le jour J : ce qui se passe</h2>

      <ol className={OL}>
        <li><strong>~30 minutes avant</strong> la prise en charge, vous recevez un SMS avec le <strong>nom et la photo du chauffeur</strong>, ainsi que sa marque de moto.</li>
        <li><strong>15 minutes avant</strong>, le chauffeur quitte sa zone d'attente et roule vers vous. Vous pouvez le contacter directement.</li>
        <li>À l'arrivée, le chauffeur vous remet l'<strong>équipement complet</strong> : casque adapté à votre taille, gants, blouson de protection, et sur-pantalon (selon météo).</li>
        <li>Briefing rapide : posture, communication par intercom (si équipé), signalement en cas d'inconfort.</li>
        <li>Vous arrivez à destination, le chauffeur récupère l'équipement.</li>
      </ol>

      <h2 className={H2}>Cas particuliers</h2>

      <h3 className={H3}>Annulation</h3>
      <p className={P}>
        Gratuite jusqu'à <strong>2 heures avant</strong> la course. Au-delà, frais de 100% (l'intégralité du forfait). Annulation directement via le lien dans votre email de confirmation, ou par téléphone.
      </p>

      <h3 className={H3}>Retard de vol à l'arrivée</h3>
      <p className={P}>
        Aucun frais supplémentaire. Votre numéro de vol est suivi en temps réel, le chauffeur ajuste automatiquement l'heure de prise en charge. Attente offerte de <strong>20 minutes</strong> après l'atterrissage.
      </p>

      <h3 className={H3}>Trajets récurrents</h3>
      <p className={P}>
        Pour les déplacements professionnels réguliers (domicile-bureau, tournée commerciale, etc.), Izymoto propose des <strong>formules d'abonnement</strong> avec tarifs préférentiels. Contactez contact@izymoto.com pour un devis.
      </p>

      <h2 className={H2}>Pour aller plus loin</h2>

      <ul className={UL}>
        <li>Voir les tarifs détaillés : <Link href="/nos-tarifs" className="text-black underline hover:no-underline">grille tarifaire complète</Link></li>
        <li>Comparer taxi moto et VTC : <Link href="/blog/taxi-moto-vs-vtc-paris" className="text-black underline hover:no-underline">Taxi moto vs VTC à Paris</Link></li>
        <li>Prix Paris-CDG : <Link href="/blog/prix-taxi-moto-paris-cdg" className="text-black underline hover:no-underline">Combien coûte un taxi moto Paris-CDG</Link></li>
        <li>Réserver un taxi moto pour CDG : <Link href="/moto-taxi-aeroport-cdg" className="text-black underline hover:no-underline">page dédiée CDG</Link></li>
        <li>Réserver un taxi moto pour Orly : <Link href="/moto-taxi-aeroport-orly" className="text-black underline hover:no-underline">page dédiée Orly</Link></li>
      </ul>
    </ArticleLayout>
  );
}
