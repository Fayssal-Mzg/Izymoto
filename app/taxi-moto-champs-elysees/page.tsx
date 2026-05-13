import type { Metadata } from "next";
import SeoLandingPage from "@/components/seo/SeoLandingPage";

export const metadata: Metadata = {
  title: "Taxi moto Champs-Élysées — Moto-taxi Avenue & hôtels | Izymoto",
  description:
    "Taxi moto Champs-Élysées : moto-taxi pour hôtels et boutiques de l'Avenue (Le Royal Monceau, Fouquet's, George V, Plaza). Transferts CDG, Orly. Tarif fixe, 24h/24.",
  alternates: { canonical: "/taxi-moto-champs-elysees" },
  openGraph: {
    title: "Taxi moto Champs-Élysées — Izymoto",
    description: "Service taxi moto / moto-taxi sur l'Avenue des Champs-Élysées et alentours.",
    url: "/taxi-moto-champs-elysees",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      slug="taxi-moto-champs-elysees"
      serviceName="Taxi moto Champs-Élysées"
      areaServed="Champs-Élysées, Paris 8e"
      h1="Taxi moto Champs-Élysées : moto-taxi premium Avenue & hôtels"
      intro="Izymoto est le service de taxi moto privilégié des hôtels, boutiques et clients VIP de l'Avenue des Champs-Élysées. Que vous descendiez au George V, au Fouquet's, au Royal Monceau ou au Plaza Athénée (limitrophe), notre moto-taxi vous attend devant l'établissement et vous emmène en un temps record vers les aéroports, gares ou rendez-vous business — en évitant les ralentissements de l'Étoile et de la Concorde."
      priceFrom={50}
      highlights={[
        "Prise en charge devant tous les grands hôtels des Champs-Élysées (George V, Fouquet's, Royal Monceau, Plaza Athénée)",
        "Le taxi moto évite les bouchons de l'Étoile, Concorde et George-V",
        "Service moto-taxi VIP avec discrétion totale et chauffeurs anglophones disponibles",
      ]}
      routes={[
        { label: "Champs-Élysées ↔ Roissy CDG", price: "80€", duration: "25–35 min" },
        { label: "Champs-Élysées ↔ Orly", price: "80€", duration: "25–35 min" },
        { label: "Champs-Élysées ↔ La Défense", price: "55€", duration: "10–20 min" },
        { label: "Champs-Élysées ↔ Gare du Nord", price: "55€", duration: "10–20 min" },
        { label: "Champs-Élysées ↔ Disneyland Paris", price: "115€", duration: "35–55 min" },
      ]}
      faq={[
        {
          question: "Le taxi moto vient-il directement devant mon hôtel des Champs-Élysées ?",
          answer:
            "Oui, le chauffeur moto-taxi se présente devant l'entrée principale de votre hôtel (George V, Fouquet's, Royal Monceau, Plaza Athénée, etc.) à l'horaire convenu. Coordination directe avec la conciergerie possible.",
        },
        {
          question: "Combien coûte un taxi moto des Champs-Élysées à CDG ?",
          answer:
            "À partir de 80€ en tarif fixe pour un trajet de 25 à 35 minutes. Aux heures de pointe (en fin d'après-midi), le taxi moto fait gagner 30 à 45 minutes par rapport à un VTC.",
        },
        {
          question: "Vos chauffeurs taxi moto parlent-ils anglais ?",
          answer:
            "Oui, plusieurs de nos chauffeurs parlent anglais, ce qui est apprécié de la clientèle internationale des hôtels des Champs-Élysées. Précisez votre préférence à la réservation.",
        },
        {
          question: "Avez-vous un partenariat avec les hôtels des Champs-Élysées ?",
          answer:
            "Oui, nous travaillons avec plusieurs conciergeries d'hôtels 4 et 5 étoiles. Les hôtels intéressés par un partenariat peuvent nous contacter à contact@izymoto.com pour une convention dédiée.",
        },
      ]}
    />
  );
}
