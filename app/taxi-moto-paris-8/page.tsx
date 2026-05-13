import type { Metadata } from "next";
import SeoLandingPage from "@/components/seo/SeoLandingPage";

export const metadata: Metadata = {
  title: "Taxi moto Paris 8 — Moto-taxi Champs-Élysées dès 50€ | Izymoto",
  description:
    "Taxi moto à Paris 8e (Champs-Élysées, Madeleine, Étoile) : moto-taxi premium pour cadres et hôtels du 8e. Transferts CDG, Orly, gares. Tarif fixe, 24h/24.",
  alternates: { canonical: "/taxi-moto-paris-8" },
  openGraph: {
    title: "Taxi moto Paris 8e — Izymoto",
    description: "Service taxi moto / moto-taxi dans le 8e arrondissement de Paris.",
    url: "/taxi-moto-paris-8",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      slug="taxi-moto-paris-8"
      serviceName="Taxi moto Paris 8e"
      areaServed="Paris 8e arrondissement"
      h1="Taxi moto Paris 8e : moto-taxi premium Champs-Élysées dès 50€"
      intro="Izymoto est votre service de taxi moto dans le 8e arrondissement de Paris : Champs-Élysées, Madeleine, Saint-Lazare, Étoile, Monceau, Faubourg-Saint-Honoré. Idéal pour les cadres dirigeants, les voyageurs business et les hôtels du quartier, notre moto-taxi vous évite les embouteillages de la place de la Concorde, du rond-point des Champs-Élysées et du boulevard Haussmann."
      priceFrom={50}
      highlights={[
        "Le taxi moto file là où les voitures bloquent : Concorde, rond-point Champs-Élysées, Haussmann, Saint-Lazare",
        "Prise en charge devant les grands hôtels du 8e (Le Bristol, Plaza Athénée, George V, Crillon, Royal Monceau)",
        "Service moto-taxi entreprise avec facturation pour les sièges sociaux du 8e",
      ]}
      routes={[
        { label: "Paris 8e ↔ Roissy CDG", price: "80€", duration: "25–35 min" },
        { label: "Paris 8e ↔ Orly", price: "80€", duration: "25–35 min" },
        { label: "Paris 8e ↔ La Défense", price: "55€", duration: "10–20 min" },
        { label: "Paris 8e ↔ Gare de Lyon", price: "50€", duration: "15–25 min" },
        { label: "Paris 8e ↔ Gare du Nord", price: "50€", duration: "10–20 min" },
      ]}
      faq={[
        {
          question: "Où le chauffeur taxi moto me prend-il en charge dans le 8e ?",
          answer:
            "Devant n'importe quel hôtel, bureau ou point de rendez-vous du 8e : Champs-Élysées, Madeleine, Saint-Lazare, place Vendôme (limitrophe), Faubourg-Saint-Honoré. Le point exact est confirmé par SMS au moment de la course.",
        },
        {
          question: "Combien coûte un taxi moto du 8e arrondissement à CDG ?",
          answer:
            "À partir de 80€ en tarif fixe pour un trajet d'environ 25 à 35 minutes. Le 8e est l'un des arrondissements les mieux placés pour rejoindre CDG par l'A1 ou la porte de la Chapelle.",
        },
        {
          question: "Le service moto-taxi du 8e est-il disponible la nuit ?",
          answer:
            "Oui, 24h/24, 7j/7. Très utilisé par les hôtels du 8e pour les arrivées tardives ou les départs très matinaux vers les aéroports.",
        },
        {
          question: "Izymoto propose-t-il un contrat entreprise pour les sièges sociaux du 8e ?",
          answer:
            "Oui : facturation entreprise mensuelle, comptes pro multi-utilisateurs, trajets récurrents pour cadres dirigeants. Beaucoup d'entreprises du 8e (banques, conseil, luxe) utilisent ce service. Demande à contact@izymoto.com.",
        },
      ]}
    />
  );
}
