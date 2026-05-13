import type { Metadata } from "next";
import SeoLandingPage from "@/components/seo/SeoLandingPage";

export const metadata: Metadata = {
  title: "Taxi moto Paris 16 — Moto-taxi Passy, Auteuil, Trocadéro | Izymoto",
  description:
    "Taxi moto à Paris 16e (Passy, Auteuil, Trocadéro, Porte Maillot) : moto-taxi premium pour résidents et entreprises du 16e. Transferts CDG, Orly. Tarif fixe.",
  alternates: { canonical: "/taxi-moto-paris-16" },
  openGraph: {
    title: "Taxi moto Paris 16e — Izymoto",
    description: "Service taxi moto / moto-taxi dans le 16e arrondissement de Paris.",
    url: "/taxi-moto-paris-16",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      slug="taxi-moto-paris-16"
      serviceName="Taxi moto Paris 16e"
      areaServed="Paris 16e arrondissement"
      h1="Taxi moto Paris 16e : moto-taxi Passy, Auteuil, Trocadéro dès 55€"
      intro="Izymoto est votre service de taxi moto dans le 16e arrondissement de Paris : Passy, Auteuil, Trocadéro, Porte Maillot, Chaillot, Muette, Étoile. Quartier résidentiel haut de gamme et axe d'affaires majeur (CCI, Maison de la Radio, sièges sociaux), notre moto-taxi vous emmène à La Défense, CDG ou Orly en évitant le pont de Neuilly et la porte Maillot."
      priceFrom={55}
      highlights={[
        "Le taxi moto évite les bouchons pont de Neuilly, Porte Maillot, axe Foch et A14",
        "Idéal pour rejoindre La Défense en 10-15 min depuis Auteuil ou Passy",
        "Prise en charge à domicile dans tout le 16e, y compris villas et résidences sécurisées",
      ]}
      routes={[
        { label: "Paris 16e ↔ La Défense", price: "55€", duration: "10–20 min" },
        { label: "Paris 16e ↔ Roissy CDG", price: "85€", duration: "30–45 min" },
        { label: "Paris 16e ↔ Orly", price: "85€", duration: "30–40 min" },
        { label: "Paris 16e ↔ Gare Saint-Lazare", price: "50€", duration: "10–20 min" },
        { label: "Paris 16e ↔ Versailles", price: "75€", duration: "20–35 min" },
      ]}
      faq={[
        {
          question: "Où le chauffeur taxi moto me prend-il en charge dans le 16e ?",
          answer:
            "Devant votre adresse exacte (immeuble, villa, résidence) dans n'importe quelle rue du 16e : Passy, Auteuil, Trocadéro, Muette, Boulainvilliers, La Tour, etc. Le point est confirmé par SMS au moment de la course.",
        },
        {
          question: "Combien coûte un taxi moto du 16e arrondissement à La Défense ?",
          answer:
            "À partir de 55€ en tarif fixe pour 10 à 20 minutes de trajet. C'est le meilleur compromis temps / prix depuis Auteuil ou Passy aux heures de pointe.",
        },
        {
          question: "Le moto-taxi est-il adapté aux résidences sécurisées du 16e ?",
          answer:
            "Oui, le chauffeur vous attend à l'entrée de la résidence ou au point convenu (gardien, parking visiteurs). Discrétion garantie, pas de stationnement bloqué.",
        },
        {
          question: "Comment réserver un taxi moto régulier pour mes trajets bureau ?",
          answer:
            "Beaucoup de cadres du 16e utilisent Izymoto pour leurs trajets domicile-bureau réguliers vers La Défense ou le 8e. Formule d'abonnement disponible avec tarif préférentiel — devis sur demande.",
        },
      ]}
    />
  );
}
