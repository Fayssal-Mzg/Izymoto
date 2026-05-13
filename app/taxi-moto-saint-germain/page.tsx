import type { Metadata } from "next";
import SeoLandingPage from "@/components/seo/SeoLandingPage";

export const metadata: Metadata = {
  title: "Taxi moto Saint-Germain-des-Prés — Moto-taxi Paris 6e | Izymoto",
  description:
    "Taxi moto Saint-Germain-des-Prés (Paris 6e) : moto-taxi pour hôtels, restos étoilés et shopping luxe rive gauche. Transferts CDG, Orly. Tarif fixe, 24h/24.",
  alternates: { canonical: "/taxi-moto-saint-germain" },
  openGraph: {
    title: "Taxi moto Saint-Germain-des-Prés — Izymoto",
    description: "Service taxi moto / moto-taxi dans le 6e arrondissement, rive gauche.",
    url: "/taxi-moto-saint-germain",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      slug="taxi-moto-saint-germain"
      serviceName="Taxi moto Saint-Germain-des-Prés"
      areaServed="Saint-Germain-des-Prés, Paris 6e"
      h1="Taxi moto Saint-Germain-des-Prés : moto-taxi rive gauche dès 50€"
      intro="Izymoto est votre service de taxi moto à Saint-Germain-des-Prés et dans le 6e arrondissement : Odéon, Saint-Sulpice, Mabillon, Sèvres-Babylone, Luxembourg. Quartier prisé pour ses hôtels de charme (Lutetia, L'Hôtel, Relais Christine), ses restos étoilés et son shopping luxe (rue du Cherche-Midi, rue de Sèvres), notre moto-taxi vous évite les ralentissements du boulevard Saint-Germain et du carrefour de l'Odéon."
      priceFrom={50}
      highlights={[
        "Prise en charge devant les hôtels et palaces du 6e (Lutetia, L'Hôtel, Relais Christine, Esprit Saint-Germain)",
        "Le taxi moto file là où le boulevard Saint-Germain et la rue de Rennes sont bloqués",
        "Service moto-taxi rive gauche : Saint-Germain, Odéon, Saint-Sulpice, Luxembourg",
      ]}
      routes={[
        { label: "Saint-Germain ↔ Roissy CDG", price: "85€", duration: "30–40 min" },
        { label: "Saint-Germain ↔ Orly", price: "75€", duration: "20–30 min" },
        { label: "Saint-Germain ↔ La Défense", price: "65€", duration: "15–25 min" },
        { label: "Saint-Germain ↔ Gare de Lyon", price: "50€", duration: "10–15 min" },
        { label: "Saint-Germain ↔ Gare Montparnasse", price: "50€", duration: "10–15 min" },
      ]}
      faq={[
        {
          question: "Le taxi moto vient-il devant les hôtels de Saint-Germain ?",
          answer:
            "Oui, le chauffeur moto-taxi se présente devant l'entrée principale du Lutetia, de L'Hôtel, du Relais Christine, de l'Esprit Saint-Germain ou de tout autre établissement du 6e. Coordination directe avec la conciergerie possible.",
        },
        {
          question: "Combien coûte un taxi moto de Saint-Germain à Orly ?",
          answer:
            "À partir de 75€ en tarif fixe pour un trajet de 20 à 30 minutes. Le 6e est l'un des arrondissements les mieux placés pour rejoindre Orly via la porte d'Orléans ou l'A6a.",
        },
        {
          question: "Quel est le délai pour avoir un taxi moto dans le 6e ?",
          answer:
            "15 minutes en moyenne. Pour les départs business du matin ou les retours après dîner étoilé, vous pouvez réserver à l'avance pour une prise en charge ponctuelle.",
        },
        {
          question: "Le moto-taxi est-il adapté pour les sorties resto / théâtre dans le 6e ?",
          answer:
            "Oui, beaucoup de clients utilisent Izymoto pour les sorties au Théâtre de l'Odéon ou les dîners rive gauche : pas d'attente pour trouver un taxi sur le boulevard Saint-Germain, prise en charge devant l'établissement.",
        },
      ]}
    />
  );
}
