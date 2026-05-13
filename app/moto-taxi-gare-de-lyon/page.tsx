import type { Metadata } from "next";
import SeoLandingPage from "@/components/seo/SeoLandingPage";

export const metadata: Metadata = {
  title: "Taxi moto Gare de Lyon — Moto-taxi TGV dès 50€ | Izymoto",
  description:
    "Taxi moto Gare de Lyon : moto-taxi transferts rapides vers Paris, aéroports, La Défense. Idéal TGV Lyon, Marseille, Genève. Tarif fixe dès 50€, 7j/7.",
  alternates: { canonical: "/moto-taxi-gare-de-lyon" },
  openGraph: {
    title: "Taxi moto Gare de Lyon — Izymoto",
    description: "Service taxi moto / moto-taxi à la Gare de Lyon, 24h/24.",
    url: "/moto-taxi-gare-de-lyon",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      slug="moto-taxi-gare-de-lyon"
      serviceName="Taxi moto Gare de Lyon"
      areaServed="Gare de Lyon, Paris 12e"
      h1="Taxi moto Gare de Lyon : moto-taxi rapide dès 50€"
      intro="Izymoto vous accompagne depuis ou vers la Gare de Lyon en taxi moto en quelques minutes. Idéal pour vos TGV vers Lyon, Marseille, Nice, Genève ou Zurich, et pour vos correspondances aéroport. Prise en charge en 15 minutes, tarif fixe, votre moto-taxi vous attend devant la Tour de l'Horloge."
      priceFrom={50}
      highlights={[
        "Prise en charge devant la Tour de l'Horloge ou parc de stationnement deux-roues",
        "Connexion taxi moto rapide vers Bercy, Châtelet, La Défense",
        "Suivi en temps réel pour ne jamais rater son TGV",
      ]}
      routes={[
        { label: "Gare de Lyon ↔ Paris intra-muros", price: "50€", duration: "10–25 min" },
        { label: "Gare de Lyon ↔ La Défense", price: "65€", duration: "20–30 min" },
        { label: "Gare de Lyon ↔ CDG", price: "85€", duration: "30–45 min" },
        { label: "Gare de Lyon ↔ Orly", price: "70€", duration: "20–30 min" },
        { label: "Gare de Lyon ↔ Gare du Nord", price: "50€", duration: "10–20 min" },
      ]}
      faq={[
        {
          question: "Où retrouver mon chauffeur taxi moto à la Gare de Lyon ?",
          answer:
            "Point de rendez-vous standard : devant la Tour de l'Horloge (façade principale, côté rue de Bercy / boulevard Diderot). Vous recevez un SMS avec la photo et le numéro du chauffeur moto-taxi.",
        },
        {
          question: "Combien coûte un taxi moto entre la Gare de Lyon et Orly ?",
          answer:
            "À partir de 70€ en tarif fixe pour un trajet d'environ 20 à 30 minutes — l'un des transferts gare-aéroport les plus rapides de Paris en taxi moto.",
        },
        {
          question: "Le service moto-taxi est-il disponible pour les TGV très matinaux ?",
          answer:
            "Oui, Izymoto fonctionne 24h/24. Pour un TGV à 6h30, vous pouvez réserver une prise en charge taxi moto dès 5h45 sans surcoût de nuit.",
        },
        {
          question: "Avez-vous un service de taxi moto pour les correspondances Gare de Lyon ↔ Gare du Nord ?",
          answer:
            "Oui, c'est un trajet courant pour les voyageurs avec correspondance internationale. Comptez 50€ et 10 à 20 minutes selon le trafic.",
        },
      ]}
    />
  );
}
