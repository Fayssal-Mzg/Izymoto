import type { Metadata } from "next";
import SeoLandingPage from "@/components/seo/SeoLandingPage";

export const metadata: Metadata = {
  title: "Moto-taxi La Défense — Trajets business dès 50€",
  description:
    "Moto-taxi La Défense : transferts rapides depuis ou vers Paris, aéroports CDG/Orly, gares. Idéal pour rendez-vous d'affaires. Tarif fixe, facturation entreprise, 7j/7.",
  alternates: { canonical: "/moto-taxi-la-defense" },
  openGraph: {
    title: "Moto-taxi La Défense — Izymoto",
    description: "Service moto-taxi pour le quartier d'affaires La Défense.",
    url: "/moto-taxi-la-defense",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      slug="moto-taxi-la-defense"
      serviceName="Moto-taxi La Défense"
      areaServed="La Défense, Hauts-de-Seine"
      h1="Moto-taxi La Défense : trajets business rapides dès 50€"
      intro="Izymoto est le partenaire moto-taxi des cadres et collaborateurs de La Défense. Évitez les bouchons du pont de Neuilly et de l'A14, gagnez 30 à 45 minutes sur vos trajets aéroport et arrivez détendu à votre rendez-vous. Service pro avec facturation entreprise et trajets récurrents."
      priceFrom={50}
      highlights={[
        "Évite les ralentissements pont de Neuilly / A14 / périphérique ouest",
        "Service entreprise : compte pro, facturation, trajets récurrents",
        "Prise en charge devant les principales tours (Total, EDF, Majunga, First, etc.)",
      ]}
      routes={[
        { label: "La Défense ↔ Paris intra-muros", price: "50€", duration: "10–25 min" },
        { label: "La Défense ↔ CDG", price: "95€", duration: "30–45 min" },
        { label: "La Défense ↔ Orly", price: "100€", duration: "30–45 min" },
        { label: "La Défense ↔ Gare du Nord", price: "60€", duration: "15–25 min" },
        { label: "La Défense ↔ Gare de Lyon", price: "65€", duration: "20–30 min" },
      ]}
      faq={[
        {
          question: "Où retrouver mon chauffeur moto-taxi à La Défense ?",
          answer:
            "Le chauffeur peut vous prendre en charge devant n'importe quelle tour ou au parvis. Le point exact est confirmé par SMS au moment de la prise en charge.",
        },
        {
          question: "Izymoto propose-t-il un service entreprise pour La Défense ?",
          answer:
            "Oui : compte entreprise, facturation mensuelle, trajets récurrents pour cadres dirigeants, contrats spécifiques. Demande à contact@izymoto.com.",
        },
        {
          question: "Combien de temps pour aller de La Défense à CDG en moto-taxi ?",
          answer:
            "Entre 30 et 45 minutes selon le trafic, contre 50 à 90 minutes en voiture aux heures de pointe.",
        },
        {
          question: "Puis-je réserver pour un trajet quotidien domicile–La Défense ?",
          answer:
            "Oui, nous proposons des forfaits trajet régulier avec tarif préférentiel. Contactez-nous pour un devis personnalisé.",
        },
      ]}
    />
  );
}
