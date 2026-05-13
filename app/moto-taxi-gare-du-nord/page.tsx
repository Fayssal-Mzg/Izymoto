import type { Metadata } from "next";
import SeoLandingPage from "@/components/seo/SeoLandingPage";

export const metadata: Metadata = {
  title: "Taxi moto Gare du Nord — Eurostar & Thalys dès 50€ | Izymoto",
  description:
    "Taxi moto Gare du Nord : moto-taxi prise en charge porte 18, transferts vers Paris, CDG, Orly. Idéal Eurostar, Thalys, TGV. Tarif fixe dès 50€, 24h/24.",
  alternates: { canonical: "/moto-taxi-gare-du-nord" },
  openGraph: {
    title: "Taxi moto Gare du Nord — Izymoto",
    description: "Service taxi moto / moto-taxi à la Gare du Nord, 24h/24.",
    url: "/moto-taxi-gare-du-nord",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      slug="moto-taxi-gare-du-nord"
      serviceName="Taxi moto Gare du Nord"
      areaServed="Gare du Nord, Paris 10e"
      h1="Taxi moto Gare du Nord : Eurostar, Thalys & transferts dès 50€"
      intro="Izymoto vous récupère ou vous dépose à la Gare du Nord en taxi moto en quelques minutes. Idéal pour vos correspondances Eurostar (Londres), Thalys (Bruxelles, Amsterdam, Cologne) ou TGV. Point de rendez-vous porte principale ou parking deux-roues, prise en charge en 15 minutes par votre moto-taxi Izymoto."
      priceFrom={50}
      highlights={[
        "Point de prise en charge clair : sortie principale ou parking deux-roues rue du Faubourg-Saint-Denis",
        "Idéal pour rattraper un Eurostar serré — le taxi moto filtre les embouteillages",
        "Tarif fixe et paiement en ligne anticipé pour les voyageurs business",
      ]}
      routes={[
        { label: "Gare du Nord ↔ Paris intra-muros", price: "50€", duration: "10–25 min" },
        { label: "Gare du Nord ↔ La Défense", price: "60€", duration: "15–25 min" },
        { label: "Gare du Nord ↔ CDG", price: "75€", duration: "25–35 min" },
        { label: "Gare du Nord ↔ Orly", price: "85€", duration: "30–45 min" },
        { label: "Gare du Nord ↔ Disneyland", price: "120€", duration: "40–55 min" },
      ]}
      faq={[
        {
          question: "Où retrouver mon chauffeur taxi moto à la Gare du Nord ?",
          answer:
            "Le point de rendez-vous standard est la sortie principale, rue de Dunkerque. Pour les voyageurs Eurostar, nous vous attendons à la sortie du terminal Eurostar (côté rue de Dunkerque).",
        },
        {
          question: "Combien de temps avant mon Eurostar dois-je réserver mon moto-taxi ?",
          answer:
            "Comptez 30 minutes minimum pour l'enregistrement Eurostar + 5 minutes pour rejoindre le quai. Réservez votre taxi moto pour arriver à la gare 35–45 minutes avant le départ.",
        },
        {
          question: "Le service taxi moto Gare du Nord est-il disponible la nuit ?",
          answer:
            "Oui, 24h/24, 7j/7, y compris pour les Thalys de nuit ou les arrivées tardives.",
        },
        {
          question: "Combien coûte un taxi moto de la Gare du Nord à CDG ?",
          answer:
            "À partir de 75€ en tarif fixe pour un trajet d'environ 25 à 35 minutes selon le trafic.",
        },
        {
          question: "Puis-je avoir un taxi moto pour un trajet professionnel régulier depuis la Gare du Nord ?",
          answer:
            "Oui, Izymoto propose un service entreprise avec facturation, comptes pro et trajets récurrents en moto-taxi. Contactez-nous à contact@izymoto.com.",
        },
      ]}
    />
  );
}
