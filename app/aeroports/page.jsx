// app/aeroports/page.jsx
"use client";

import Image from "next/image";
import Link from "next/link";

export default function AeroportsPage() {
  return (
    <div className="bg-black text-white">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center">
        <div className="absolute inset-0 opacity-50">
          <Image
            src="/aeroport-banner.png"
            alt="Taxi moto aéroports Paris"
            fill
            className="object-cover"
            priority
          />
        </div>

        <div className="relative z-10 text-center px-4 max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
            Taxi Moto Vers les Aéroports de Paris
          </h1>
          <p className="text-xl md:text-2xl mb-10 text-gray-300">
            Transport rapide et professionnel directement vers votre
            destination. Évitez les embouteillages, arrivez sereinement.
          </p>
          <Link
            href="/reserver"
            className="bg-white text-black px-10 py-4 rounded-full text-lg font-semibold 
            hover:bg-gray-200 transition-colors duration-300 
            inline-flex items-center gap-2 group"
          >
            Réservez maintenant
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 group-hover:translate-x-1 transition-transform"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </Link>
        </div>
      </section>

      {/* Services Aéroport Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">
            Nos Services Aéroport
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Charles de Gaulle (CDG)",
                description:
                  "Transfert direct et efficace entre Paris et l'aéroport CDG.",
                price: "100€",
                image: "/travel.png",
              },
              {
                name: "Orly (ORY)",
                description: "Connexion rapide entre Paris et l'aéroport Orly.",
                price: "80€",
                image: "/travel2.png",
              },
              {
                name: "Beauvais (BVA)",
                description:
                  "Service de taxi moto premium vers l'aéroport de Beauvais.",
                price: "150€",
                image: "/travel4.png",
              },
            ].map((airport) => (
              <div
                key={airport.name}
                className="bg-white/10 rounded-2xl overflow-hidden 
                transition-all duration-300 hover:bg-white/20 
                hover:scale-105 transform"
              >
                <div className="h-64 relative">
                  <Image
                    src={airport.image}
                    alt={`${airport.name} Airport`}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-bold mb-4">{airport.name}</h3>
                  <p className="text-gray-300 mb-4">{airport.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-3xl font-bold text-white">
                      À partir de {airport.price}
                    </span>
                    <Link
                      href="/reserver"
                      className="bg-white text-black px-6 py-2 rounded-full 
                      hover:bg-gray-200 transition-colors"
                    >
                      Réserver
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Avantages Section */}
      <section className="py-20 px-4 bg-white/5">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">
            Pourquoi Choisir Nos Services
          </h2>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                icon: "clock",
                title: "Gain de Temps",
                description:
                  "Évitez les embouteillages et réduisez considérablement votre temps de trajet.",
              },
              {
                icon: "shield",
                title: "Ponctualité Garantie",
                description:
                  "Arrivez à l'heure pour votre vol, sans stress ni incertitude.",
              },
              {
                icon: "tag",
                title: "Tarification Fixe",
                description:
                  "Connaissez le prix exact de votre trajet à l'avance, sans surprise.",
              },
              {
                icon: "star",
                title: "Confort Premium",
                description:
                  "Profitez d'un service personnalisé et d'un équipement de haute qualité.",
              },
            ].map((advantage) => (
              <div
                key={advantage.title}
                className="text-center bg-white/10 p-6 rounded-2xl 
                transition-all duration-300 hover:bg-white/20"
              >
                <div
                  className="w-16 h-16 bg-white/20 rounded-full mx-auto mb-6 
                flex items-center justify-center"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    {advantage.icon === "clock" && (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    )}
                    {advantage.icon === "shield" && (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    )}
                    {advantage.icon === "tag" && (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    )}
                    {advantage.icon === "star" && (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                      />
                    )}
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-4">{advantage.title}</h3>
                <p className="text-gray-400">{advantage.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Témoignages Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">
            Ce Que Disent Nos Clients
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Jean-Philippe M.",
                quote:
                  "J'utilise IzyMoto pour mes trajets CDG chaque semaine. Toujours ponctuels et professionnels, ils m'ont fait économiser des heures. Service impeccable !",
                location: "Paris",
              },
              {
                name: "Claire B.",
                quote:
                  "Une expérience de taxi moto haut de gamme. Je recommande vivement pour vos trajets vers Orly. Très fiable !",
                location: "Paris",
              },
              {
                name: "Michaël R.",
                quote:
                  "Je suis fan du service. Le trajet vers Beauvais était rapide et confortable, je reviendrai !",
                location: "Paris",
              },
            ].map((testimonial) => (
              <div
                key={testimonial.name}
                className="bg-white/10 rounded-xl p-6 transition-all duration-300 hover:bg-white/20"
              >
                <p className="text-gray-300 mb-4">"{testimonial.quote}"</p>
                <div className="font-bold text-white">{testimonial.name}</div>
                <div className="text-gray-500">{testimonial.location}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
