import type { Metadata } from "next";
import SeoLandingPage from "@/components/seo/SeoLandingPage";

export const metadata: Metadata = {
  title: "Moto-taxi Paris ↔ Aéroport CDG (Roissy) — Tarif fixe dès 80€",
  description:
    "Transfert moto-taxi Paris–Roissy CDG en 25 à 40 minutes. Tarif fixe dès 80€, attente 15 min incluse, 24h/24. Évitez les embouteillages de l'A1. Réservation en ligne.",
  alternates: { canonical: "/moto-taxi-aeroport-cdg" },
  openGraph: {
    title: "Moto-taxi Paris ↔ CDG — Izymoto",
    description: "Transfert moto-taxi Paris–Roissy CDG dès 80€, 24h/24.",
    url: "/moto-taxi-aeroport-cdg",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      slug="moto-taxi-aeroport-cdg"
      serviceName="Moto-taxi Paris ↔ Aéroport CDG"
      areaServed="Aéroport Paris-Charles-de-Gaulle"
      h1="Moto-taxi Paris ↔ Aéroport CDG (Roissy) : tarif fixe dès 80€"
      intro="Le moto-taxi Izymoto vous emmène de Paris à l'aéroport Roissy-Charles-de-Gaulle (CDG) en 25 à 40 minutes selon votre point de départ, contre 45 à 90 minutes en voiture aux heures de pointe. Tarif fixe dès 80€, suivi de vol inclus, et attente de 15 minutes offerte à l'arrivée."
      priceFrom={80}
      highlights={[
        "Évite les bouchons de l'A1 et du périphérique nord (gain de 20–40 minutes en heure de pointe)",
        "Suivi de votre vol en temps réel — le chauffeur ajuste l'heure de prise en charge si retard",
        "Point de rendez-vous porte 6 ou 8 du terminal (CDG 1, 2A, 2B, 2C, 2D, 2E, 2F, 2G ou T3)",
      ]}
      routes={[
        { label: "Paris 1er ↔ CDG", price: "80€", duration: "30–40 min" },
        { label: "Paris 8e (Champs-Élysées) ↔ CDG", price: "80€", duration: "25–35 min" },
        { label: "Paris 16e ↔ CDG", price: "90€", duration: "30–45 min" },
        { label: "La Défense ↔ CDG", price: "95€", duration: "30–45 min" },
        { label: "Disneyland Paris ↔ CDG", price: "120€", duration: "35–50 min" },
      ]}
      faq={[
        {
          question: "Combien coûte un moto-taxi de Paris à Roissy CDG ?",
          answer:
            "À partir de 80€ en tarif fixe pour un trajet Paris intra-muros vers CDG. Le prix exact dépend de votre arrondissement de départ et du terminal d'arrivée.",
        },
        {
          question: "Combien de temps dure le trajet Paris–CDG en moto-taxi ?",
          answer:
            "Entre 25 et 40 minutes selon votre point de départ et l'horaire. Aux heures de pointe, le moto-taxi est environ 30 minutes plus rapide qu'une voiture.",
        },
        {
          question: "Comment retrouver mon chauffeur moto-taxi à CDG ?",
          answer:
            "Le chauffeur vous attend au point de rendez-vous moto-taxi du terminal (généralement porte 6 ou 8 selon le terminal). Vous recevez par SMS le numéro et la photo du chauffeur.",
        },
        {
          question: "Que se passe-t-il si mon vol a du retard à l'arrivée ?",
          answer:
            "Le numéro de vol est suivi en temps réel via le formulaire de réservation. Le chauffeur ajuste sa prise en charge automatiquement, sans frais supplémentaires.",
        },
        {
          question: "Puis-je transporter une valise en moto-taxi vers CDG ?",
          answer:
            "Oui, jusqu'à une valise cabine (max 8 kg) + un sac à dos / sac à main. Pour de plus gros bagages, prévenez à la réservation : nous proposons un service avec top-case ou valise relais.",
        },
        {
          question: "Le moto-taxi vers CDG est-il disponible la nuit ?",
          answer:
            "Oui, le service Izymoto fonctionne 24h/24, 7j/7, y compris pour les vols très matinaux (avant 6h) ou tardifs.",
        },
      ]}
    />
  );
}
