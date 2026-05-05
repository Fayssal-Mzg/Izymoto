import type { Metadata } from "next";
import SeoLandingPage from "@/components/seo/SeoLandingPage";

export const metadata: Metadata = {
  title: "Moto-taxi Disneyland Paris — Transferts dès 110€",
  description:
    "Transfert moto-taxi vers Disneyland Paris (Marne-la-Vallée) depuis Paris, CDG, Orly. Tarif fixe, gain de temps, prise en charge devant les hôtels Disney. 7j/7.",
  alternates: { canonical: "/moto-taxi-disneyland" },
  openGraph: {
    title: "Moto-taxi Disneyland Paris — Izymoto",
    description: "Transfert moto-taxi vers Disneyland Paris dès 110€.",
    url: "/moto-taxi-disneyland",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      slug="moto-taxi-disneyland"
      serviceName="Moto-taxi Disneyland Paris"
      areaServed="Disneyland Paris, Marne-la-Vallée"
      h1="Moto-taxi vers Disneyland Paris : transferts rapides dès 110€"
      intro="Izymoto vous transporte de Paris ou des aéroports vers Disneyland Paris (Marne-la-Vallée) en évitant les ralentissements de l'A4. Idéal pour un retour tardif après une journée au parc, ou un transfert direct depuis CDG / Orly avec correspondance vol."
      priceFrom={110}
      highlights={[
        "Évite les bouchons de l'A4 (gain de 20 à 40 min en sortie de parc le soir)",
        "Prise en charge devant les hôtels Disney ou la Gare de Marne-la-Vallée Chessy",
        "Service nocturne pour les retours après fermeture du parc",
      ]}
      routes={[
        { label: "Paris intra-muros ↔ Disneyland", price: "110€", duration: "30–50 min" },
        { label: "CDG ↔ Disneyland", price: "120€", duration: "35–50 min" },
        { label: "Orly ↔ Disneyland", price: "130€", duration: "40–55 min" },
        { label: "La Défense ↔ Disneyland", price: "120€", duration: "35–50 min" },
        { label: "Gare du Nord ↔ Disneyland", price: "115€", duration: "35–50 min" },
      ]}
      faq={[
        {
          question: "Combien coûte un moto-taxi de Paris à Disneyland ?",
          answer:
            "À partir de 110€ en tarif fixe pour un trajet de 30 à 50 minutes selon le trafic.",
        },
        {
          question: "Le moto-taxi est-il disponible la nuit après la fermeture du parc ?",
          answer:
            "Oui, Izymoto opère 24h/24, 7j/7, y compris les soirs de spectacles spéciaux ou de fermeture tardive.",
        },
        {
          question: "Puis-je voyager en moto-taxi avec un enfant pour aller à Disneyland ?",
          answer:
            "Le transport en moto-taxi est autorisé pour les passagers à partir de 5 ans selon la réglementation française. Pour les familles avec enfants plus jeunes, contactez-nous : nous proposons une alternative berline.",
        },
        {
          question: "Où le chauffeur me récupère-t-il à Disneyland ?",
          answer:
            "Devant n'importe quel hôtel Disney, à la Gare de Marne-la-Vallée Chessy, ou à la sortie principale du parc Disney Village. Le point est confirmé à la réservation.",
        },
      ]}
    />
  );
}
