import type { Metadata } from "next";
import SeoLandingPage from "@/components/seo/SeoLandingPage";

export const metadata: Metadata = {
  title: "Moto-taxi Gare de Lyon — TGV Sud-Est | Dès 50€",
  description:
    "Moto-taxi à la Gare de Lyon : transferts rapides vers Paris, aéroports, La Défense. Idéal TGV pour Lyon, Marseille, Genève. Tarif fixe dès 50€, 7j/7.",
  alternates: { canonical: "/moto-taxi-gare-de-lyon" },
  openGraph: {
    title: "Moto-taxi Gare de Lyon — Izymoto",
    description: "Service moto-taxi à la Gare de Lyon, 24h/24.",
    url: "/moto-taxi-gare-de-lyon",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      slug="moto-taxi-gare-de-lyon"
      serviceName="Moto-taxi Gare de Lyon"
      areaServed="Gare de Lyon, Paris 12e"
      h1="Moto-taxi Gare de Lyon : transfert rapide dès 50€"
      intro="Izymoto vous accompagne depuis ou vers la Gare de Lyon en quelques minutes. Idéal pour vos TGV vers Lyon, Marseille, Nice, Genève ou Zurich, et pour vos correspondances aéroport. Prise en charge en 15 minutes, tarif fixe."
      priceFrom={50}
      highlights={[
        "Prise en charge devant la Tour de l'Horloge ou parc de stationnement deux-roues",
        "Connexion rapide vers Bercy, Châtelet, La Défense",
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
          question: "Où retrouver mon chauffeur moto-taxi à la Gare de Lyon ?",
          answer:
            "Point de rendez-vous standard : devant la Tour de l'Horloge (façade principale, côté rue de Bercy / boulevard Diderot). Vous recevez un SMS avec la photo et le numéro du chauffeur.",
        },
        {
          question: "Combien coûte un moto-taxi entre la Gare de Lyon et Orly ?",
          answer:
            "À partir de 70€ en tarif fixe pour un trajet d'environ 20 à 30 minutes — l'un des transferts gare-aéroport les plus rapides de Paris.",
        },
        {
          question: "Le service est-il disponible pour les TGV très matinaux ?",
          answer:
            "Oui, Izymoto fonctionne 24h/24. Pour un TGV à 6h30, vous pouvez réserver une prise en charge dès 5h45 sans surcoût de nuit.",
        },
        {
          question: "Avez-vous un service pour les correspondances Gare de Lyon ↔ Gare du Nord ?",
          answer:
            "Oui, c'est un trajet courant pour les voyageurs avec correspondance internationale. Comptez 50€ et 10 à 20 minutes selon le trafic.",
        },
      ]}
    />
  );
}
