import type { Metadata } from "next";
import SeoLandingPage from "@/components/seo/SeoLandingPage";

export const metadata: Metadata = {
  title: "Taxi moto Bastille — Moto-taxi sortie soir & nuit | Izymoto",
  description:
    "Taxi moto Bastille (Paris 11e, 4e, 12e) : moto-taxi pour sorties soir, restos, clubs, retours nuit. Transferts gares et aéroports. Tarif fixe, 24h/24, 7j/7.",
  alternates: { canonical: "/taxi-moto-bastille" },
  openGraph: {
    title: "Taxi moto Bastille — Izymoto",
    description: "Service taxi moto / moto-taxi autour de Bastille et de la rive droite.",
    url: "/taxi-moto-bastille",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      slug="taxi-moto-bastille"
      serviceName="Taxi moto Bastille"
      areaServed="Bastille, Paris 11e / 4e / 12e"
      h1="Taxi moto Bastille : moto-taxi sortie soir, restos & nuit dès 50€"
      intro="Izymoto est votre taxi moto à Bastille et autour : rue de la Roquette, rue de Lappe, Faubourg-Saint-Antoine, Marais (4e), Aligre, Ledru-Rollin (12e). Idéal pour rentrer après un dîner, sortir d'un club ou attraper un train de nuit à Gare de Lyon, notre moto-taxi opère 24h/24, 7j/7. Plus rapide et plus sûr qu'un retour en voiture après une soirée."
      priceFrom={50}
      highlights={[
        "Service moto-taxi de nuit : retour rapide après une soirée Bastille, République ou Marais",
        "Prise en charge devant tous les bars, restos et clubs (rue de la Roquette, rue de Lappe, Charonne)",
        "Connexion express Bastille → Gare de Lyon en 5 minutes pour les TGV de nuit",
      ]}
      routes={[
        { label: "Bastille ↔ Gare de Lyon", price: "50€", duration: "5–10 min" },
        { label: "Bastille ↔ Gare du Nord", price: "50€", duration: "10–20 min" },
        { label: "Bastille ↔ Roissy CDG", price: "85€", duration: "30–40 min" },
        { label: "Bastille ↔ Orly", price: "80€", duration: "25–35 min" },
        { label: "Bastille ↔ La Défense", price: "65€", duration: "20–30 min" },
      ]}
      faq={[
        {
          question: "Le taxi moto Izymoto fonctionne-t-il la nuit à Bastille ?",
          answer:
            "Oui, 24h/24, 7j/7. C'est même l'un de nos créneaux les plus demandés autour de Bastille : sortie de restos, fin de soirée, retours après concerts à l'Opéra Bastille.",
        },
        {
          question: "Combien coûte un taxi moto de Bastille à CDG la nuit ?",
          answer:
            "À partir de 85€ en tarif fixe en journée, avec une majoration nuit (+40€) entre 23h et 6h. Le tarif est confirmé avant la course, sans surprise.",
        },
        {
          question: "Le moto-taxi est-il plus sûr qu'un retour à pied tard le soir ?",
          answer:
            "Pour rentrer du Marais, de Bastille ou d'Oberkampf à 2h-4h du matin, le taxi moto est une alternative rapide et sécurisée : pas d'attente sur le trottoir, pas de marche dans des rues désertes. Le chauffeur vous prend en charge devant l'établissement.",
        },
        {
          question: "Puis-je avoir un taxi moto pour un TGV de nuit à Gare de Lyon ?",
          answer:
            "Oui, c'est même l'un des trajets les plus courants depuis Bastille. Comptez 5 à 10 minutes de trajet et 50€ de forfait. Réservation possible jusqu'à 30 minutes avant le départ du train.",
        },
      ]}
    />
  );
}
