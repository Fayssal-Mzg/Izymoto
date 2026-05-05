import type { Metadata } from "next";
import SeoLandingPage from "@/components/seo/SeoLandingPage";

export const metadata: Metadata = {
  title: "Moto-taxi Paris ↔ Aéroport Orly — Tarif fixe dès 80€, 7j/7",
  description:
    "Transfert moto-taxi Paris–Orly en 20 à 35 minutes. Tarif fixe dès 80€, attente 15 min incluse, 24h/24. Orly Sud (T1, T2, T3) et Orly Ouest (T4). Réservation en ligne.",
  alternates: { canonical: "/moto-taxi-aeroport-orly" },
  openGraph: {
    title: "Moto-taxi Paris ↔ Orly — Izymoto",
    description: "Transfert moto-taxi Paris–Orly dès 80€, 24h/24.",
    url: "/moto-taxi-aeroport-orly",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      slug="moto-taxi-aeroport-orly"
      serviceName="Moto-taxi Paris ↔ Aéroport Orly"
      areaServed="Aéroport Paris-Orly"
      h1="Moto-taxi Paris ↔ Orly : transfert rapide dès 80€"
      intro="Izymoto vous transporte de Paris à l'aéroport d'Orly en 20 à 35 minutes — environ 25 minutes plus rapide qu'une voiture aux heures de pointe sur l'A6 et le périphérique sud. Tarif fixe dès 80€, tous terminaux desservis (Orly 1, 2, 3, 4)."
      priceFrom={80}
      highlights={[
        "Évite les ralentissements de l'A6 et de la porte d'Italie",
        "Tous les terminaux Orly desservis (Orly 1, 2, 3, 4)",
        "Suivi de vol pour les arrivées : le chauffeur s'adapte aux retards sans surcoût",
      ]}
      routes={[
        { label: "Paris 8e ↔ Orly", price: "80€", duration: "25–35 min" },
        { label: "Paris 15e (Montparnasse) ↔ Orly", price: "75€", duration: "20–30 min" },
        { label: "Paris 13e ↔ Orly", price: "70€", duration: "20–30 min" },
        { label: "Versailles ↔ Orly", price: "95€", duration: "25–40 min" },
        { label: "Disneyland ↔ Orly", price: "130€", duration: "40–55 min" },
      ]}
      faq={[
        {
          question: "Combien coûte un moto-taxi de Paris à Orly ?",
          answer:
            "À partir de 80€ en tarif fixe depuis Paris intra-muros. Le tarif est confirmé avant le départ et inclut l'attente de 15 minutes à l'arrivée.",
        },
        {
          question: "Combien de temps dure le trajet Paris–Orly en moto-taxi ?",
          answer:
            "Entre 20 et 35 minutes selon votre arrondissement de départ. C'est en moyenne 25 minutes plus rapide qu'une voiture aux heures de pointe.",
        },
        {
          question: "Quels terminaux d'Orly sont desservis ?",
          answer:
            "Tous : Orly 1, Orly 2, Orly 3 et Orly 4. Le terminal de prise en charge est demandé lors de la réservation pour vous récupérer au plus près de votre porte.",
        },
        {
          question: "Le service est-il disponible pour un vol très matinal à Orly ?",
          answer:
            "Oui, Izymoto opère 24h/24. Pour un vol à 6h, prévoyez la prise en charge environ 1h15 avant le décollage depuis Paris.",
        },
        {
          question: "Que se passe-t-il si mon vol arrive en retard à Orly ?",
          answer:
            "Nous suivons votre numéro de vol en temps réel et ajustons l'arrivée du chauffeur. Aucun frais supplémentaire pour un retard imputable à la compagnie aérienne.",
        },
      ]}
    />
  );
}
