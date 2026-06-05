"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { useReservation } from "@/lib/hooks/useReservation";
import Halo from "@/components/Halo";
import RouteMarquee from "@/components/RouteMarquee";

const airports = [
  {
    name: "Charles de Gaulle (CDG)",
    description: "Transfert direct entre Paris et l'aéroport de Roissy-CDG, en évitant les embouteillages.",
    price: "100€",
    slug: "/moto-taxi-aeroport-cdg",
  },
  {
    name: "Orly (ORY)",
    description: "Connexion rapide entre Paris et l'aéroport d'Orly, au sud de la capitale.",
    price: "80€",
    slug: "/moto-taxi-aeroport-orly",
  },
  {
    name: "Beauvais (BVA)",
    description: "Service de moto-taxi pour l'aéroport de Beauvais, au départ ou à l'arrivée.",
    price: "150€",
    slug: null,
  },
];

export default function AeroportsPage() {
  const { navigateToReservation } = useReservation();

  return (
    <div className="bg-cream-50 text-navy-950">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-navy-950 text-white min-h-[60vh] flex items-center justify-center">
        <Halo />
        <div className="relative z-10 text-center px-4 max-w-3xl py-24">
          <h1 className="font-bold uppercase tracking-tight text-4xl md:text-6xl mb-6 text-white">
            Taxi Moto vers les Aéroports de Paris
          </h1>
          <p className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Transport rapide et professionnel vers CDG, Orly et Beauvais. Évitez les embouteillages, arrivez sereinement à l'heure pour votre vol.
          </p>
          <a
            href="/#reservation"
            onClick={navigateToReservation}
            className="inline-flex items-center gap-2 bg-mint-400 text-navy-950 font-bold uppercase tracking-tight px-10 py-4 rounded-full text-lg hover:bg-mint-300 transition-colors duration-200 cursor-pointer"
          >
            Réservez maintenant
          </a>
        </div>
      </section>

      {/* ── Marquee ── */}
      <RouteMarquee />

      {/* ── Cartes aéroports ── */}
      <section className="py-20 px-4 bg-cream-50">
        <div className="container mx-auto max-w-5xl">
          <h2 className="font-bold uppercase tracking-tight text-3xl md:text-4xl text-navy-950 text-center mb-4">
            Nos Services Aéroport
          </h2>
          <p className="text-navy-600 text-center mb-14 max-w-xl mx-auto">
            Tarifs fixes, chauffeur professionnel, prise en charge à l'adresse de votre choix.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {airports.map((airport) => (
              <div
                key={airport.name}
                className="bg-white border border-navy-100 rounded-xl shadow-sm flex flex-col p-6"
              >
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-5 h-5 text-mint-600 shrink-0" />
                  <h3 className="font-bold uppercase tracking-tight text-navy-950 text-lg">
                    {airport.name}
                  </h3>
                </div>
                <p className="text-navy-600 text-sm mb-6 flex-1">
                  {airport.description}
                </p>
                <p className="text-2xl font-bold text-navy-950 mb-4">
                  À partir de {airport.price}
                </p>
                <a
                  href="/#reservation"
                  onClick={navigateToReservation}
                  className="block w-full text-center bg-navy-950 text-white font-bold uppercase tracking-tight py-3 rounded-lg hover:bg-navy-800 transition-colors duration-200 cursor-pointer"
                >
                  Réserver
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="relative overflow-hidden bg-navy-950 text-white">
        <Halo />
        <div className="relative z-10 text-center px-4 py-20 max-w-2xl mx-auto">
          <h2 className="font-bold uppercase tracking-tight text-3xl md:text-4xl text-white mb-4">
            Prêt à réserver votre transfert ?
          </h2>
          <p className="text-white/80 mb-8">
            Réservez en ligne en 2 minutes ou appelez-nous directement au{" "}
            <a href="tel:+33649502525" className="text-mint-400 hover:underline font-semibold">
              +33 6 49 50 25 25
            </a>
            .
          </p>
          <a
            href="/#reservation"
            onClick={navigateToReservation}
            className="inline-flex items-center gap-2 bg-mint-400 text-navy-950 font-bold uppercase tracking-tight px-10 py-4 rounded-full text-lg hover:bg-mint-300 transition-colors duration-200 cursor-pointer"
          >
            Réserver maintenant
          </a>
        </div>
      </section>

    </div>
  );
}
