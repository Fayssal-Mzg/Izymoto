import type { Metadata } from "next";
import SeoLandingPage from "@/components/seo/SeoLandingPage";

export const metadata: Metadata = {
  title: "Taxi moto La Défense — Moto-taxi business dès 50€ | Izymoto",
  description:
    "Taxi moto La Défense : moto-taxi premium pour trajets business, transferts CDG/Orly, gares. Idéal pour vos rendez-vous d'affaires. Tarif fixe, facturation entreprise, 7j/7.",
  alternates: { canonical: "/moto-taxi-la-defense" },
  openGraph: {
    title: "Taxi moto La Défense — Izymoto",
    description: "Service taxi moto / moto-taxi pour le quartier d'affaires La Défense.",
    url: "/moto-taxi-la-defense",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      slug="moto-taxi-la-defense"
      serviceName="Taxi moto La Défense"
      areaServed="La Défense, Hauts-de-Seine"
      h1="Taxi moto La Défense : moto-taxi business rapide dès 50€"
      intro="Izymoto est le partenaire taxi moto des cadres et collaborateurs de La Défense. Évitez les bouchons du pont de Neuilly et de l'A14, gagnez 30 à 45 minutes sur vos trajets aéroport et arrivez détendu à votre rendez-vous. Service moto-taxi pro avec facturation entreprise et trajets récurrents."
      priceFrom={50}
      highlights={[
        "Le taxi moto évite les ralentissements pont de Neuilly / A14 / périphérique ouest",
        "Service entreprise : compte pro, facturation, trajets récurrents en moto-taxi",
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
          question: "Où retrouver mon chauffeur taxi moto à La Défense ?",
          answer:
            "Le chauffeur moto-taxi peut vous prendre en charge devant n'importe quelle tour ou au parvis. Le point exact est confirmé par SMS au moment de la prise en charge.",
        },
        {
          question: "Izymoto propose-t-il un service taxi moto entreprise pour La Défense ?",
          answer:
            "Oui : compte entreprise, facturation mensuelle, trajets récurrents pour cadres dirigeants, contrats spécifiques. Demande à contact@izymoto.com.",
        },
        {
          question: "Combien de temps pour aller de La Défense à CDG en taxi moto ?",
          answer:
            "Entre 30 et 45 minutes selon le trafic en taxi moto, contre 50 à 90 minutes en voiture aux heures de pointe.",
        },
        {
          question: "Puis-je réserver un taxi moto pour un trajet quotidien domicile–La Défense ?",
          answer:
            "Oui, nous proposons des forfaits trajet régulier en moto-taxi avec tarif préférentiel. Contactez-nous pour un devis personnalisé.",
        },
      ]}
    />
  );
}
