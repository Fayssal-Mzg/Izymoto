import type { Metadata } from "next";
import SeoLandingPage from "@/components/seo/SeoLandingPage";

export const metadata: Metadata = {
  title: "Taxi moto Disneyland Paris — Moto-taxi dès 110€ | Izymoto",
  description:
    "Taxi moto Disneyland Paris (Marne-la-Vallée) depuis Paris, CDG, Orly. Service moto-taxi premium, tarif fixe, prise en charge devant les hôtels Disney. 7j/7.",
  alternates: { canonical: "/moto-taxi-disneyland" },
  openGraph: {
    title: "Taxi moto Disneyland Paris — Izymoto",
    description: "Taxi moto / moto-taxi vers Disneyland Paris dès 110€.",
    url: "/moto-taxi-disneyland",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      slug="moto-taxi-disneyland"
      serviceName="Taxi moto Disneyland Paris"
      areaServed="Disneyland Paris, Marne-la-Vallée"
      h1="Taxi moto Disneyland Paris : moto-taxi rapide dès 110€"
      intro="Izymoto vous transporte de Paris ou des aéroports vers Disneyland Paris (Marne-la-Vallée) en taxi moto, en évitant les ralentissements de l'A4. Idéal pour un retour tardif après une journée au parc, ou un transfert direct depuis CDG / Orly avec correspondance vol. Votre moto-taxi vous attend devant les hôtels Disney."
      priceFrom={110}
      highlights={[
        "Le taxi moto évite les bouchons de l'A4 (gain de 20 à 40 min en sortie de parc le soir)",
        "Prise en charge devant les hôtels Disney ou la Gare de Marne-la-Vallée Chessy",
        "Service moto-taxi nocturne pour les retours après fermeture du parc",
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
          question: "Combien coûte un taxi moto de Paris à Disneyland ?",
          answer:
            "À partir de 110€ en tarif fixe pour un trajet de 30 à 50 minutes selon le trafic en taxi moto.",
        },
        {
          question: "Le taxi moto est-il disponible la nuit après la fermeture du parc Disney ?",
          answer:
            "Oui, Izymoto opère 24h/24, 7j/7 en moto-taxi, y compris les soirs de spectacles spéciaux ou de fermeture tardive.",
        },
        {
          question: "Puis-je voyager en taxi moto avec un enfant pour aller à Disneyland ?",
          answer:
            "Le transport en taxi moto (moto-taxi) est autorisé pour les passagers à partir de 5 ans selon la réglementation française. Pour les familles avec enfants plus jeunes, contactez-nous : nous proposons une alternative berline.",
        },
        {
          question: "Où le chauffeur moto-taxi me récupère-t-il à Disneyland ?",
          answer:
            "Devant n'importe quel hôtel Disney, à la Gare de Marne-la-Vallée Chessy, ou à la sortie principale du parc Disney Village. Le point est confirmé à la réservation.",
        },
      ]}
    />
  );
}
