import type { Metadata } from "next";
import SeoLandingPage from "@/components/seo/SeoLandingPage";

export const metadata: Metadata = {
  title: "Taxi moto Paris 24/7 — Moto-taxi premium dès 50€ | Izymoto",
  description:
    "Taxi moto à Paris 24h/24, 7j/7. Service moto-taxi premium dès 50€, tarif fixe, chauffeurs professionnels, équipement fourni. Réservation en ligne ou +33 6 49 50 25 25.",
  alternates: { canonical: "/moto-taxi-paris" },
  openGraph: {
    title: "Taxi moto Paris 24/7 — Izymoto",
    description: "Taxi moto et moto-taxi premium à Paris. Tarif fixe dès 50€, 7j/7.",
    url: "/moto-taxi-paris",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      slug="moto-taxi-paris"
      serviceName="Taxi moto à Paris"
      areaServed="Paris"
      h1="Taxi moto à Paris : moto-taxi premium 24/7 dès 50€"
      intro="Izymoto est votre service de taxi moto à Paris (aussi appelé moto-taxi). Que ce soit pour un rendez-vous d'affaires, un transfert aéroport ou un trajet inter-quartiers, nos chauffeurs vous emmènent en évitant les embouteillages, avec un tarif fixe annoncé à l'avance et un équipement de sécurité complet fourni. Réservez votre taxi moto Paris en quelques clics, 24h/24."
      priceFrom={50}
      highlights={[
        "Le taxi moto évite les embouteillages parisiens (gain de temps de 40 à 60 % vs voiture aux heures de pointe)",
        "Tarif fixe annoncé avant la course — pas de mauvaise surprise à l'arrivée",
        "Chauffeurs moto-taxi professionnels formés à la conduite défensive et à l'accueil clientèle",
      ]}
      routes={[
        { label: "Paris ↔ Paris (intra-muros)", price: "65€", duration: "10–25 min" },
        { label: "Paris ↔ La Défense", price: "60€", duration: "15–25 min" },
        { label: "Paris ↔ Aéroport CDG", price: "80€", duration: "25–40 min" },
        { label: "Paris ↔ Aéroport Orly", price: "80€", duration: "20–35 min" },
        { label: "Mise à disposition (à l'heure)", price: "80€/h", duration: "Flexible" },
      ]}
      faq={[
        {
          question: "Combien coûte un taxi moto à Paris ?",
          answer:
            "Un trajet en taxi moto dans Paris démarre à 50€ pour un parcours intra-muros jusqu'à 10 km. Les transferts aéroport (CDG, Orly) sont à partir de 80€. Tous les tarifs sont fixes et annoncés avant la course.",
        },
        {
          question: "Quelle est la différence entre taxi moto et moto-taxi ?",
          answer:
            "Aucune : ce sont deux orthographes du même service. « Taxi moto » (sans tiret) est l'usage courant, « moto-taxi » est le terme officiel utilisé dans la réglementation française (décret n°2010-1223). Izymoto opère sous statut moto-taxi homologué.",
        },
        {
          question: "Quel est le délai pour avoir un taxi moto à Paris ?",
          answer:
            "Le délai moyen de prise en charge est de 15 minutes. Pour les réservations programmées, vous indiquez l'heure et le chauffeur arrive ponctuellement.",
        },
        {
          question: "L'équipement de sécurité est-il fourni ?",
          answer:
            "Oui : casque, gants, blouson et sur-pantalon adaptés à la météo sont fournis et désinfectés entre chaque course.",
        },
        {
          question: "Le taxi moto est-il plus rapide qu'un VTC à Paris ?",
          answer:
            "Aux heures de pointe (8h–10h et 17h–20h), un taxi moto est en moyenne 40 à 60 % plus rapide qu'une voiture grâce au filtrage et à la circulation entre les files.",
        },
        {
          question: "Comment réserver un taxi moto à Paris ?",
          answer:
            "Via le formulaire en ligne sur izymoto.com (devis instantané), par téléphone au +33 6 49 50 25 25, ou par email à contact@izymoto.com.",
        },
        {
          question: "Quels modes de paiement acceptez-vous ?",
          answer:
            "Paiement en ligne sécurisé (carte bancaire) lors de la réservation, ou directement au chauffeur (CB, espèces). Facturation entreprise possible sur demande.",
        },
      ]}
    />
  );
}
