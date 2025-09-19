"use client";

import { cn } from "@/lib/utils";
import {
  Briefcase,
  Users,
  Target,
  Award,
  CheckCircle,
  Star,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { useInView } from "react-intersection-observer";
import { useReservation } from "@/lib/hooks/useReservation";

export default function AboutPage() {
  const { ref: missionRef, inView: missionInView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const { ref: valuesRef, inView: valuesInView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const { ref: teamRef, inView: teamInView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const { navigateToReservation } = useReservation();

  return (
    <div className="bg-white">
      {/* En-tête */}
      <section className="relative py-20 bg-black text-white">
        <div className="absolute inset-0 opacity-30">
          <Image
            src="/moto.jpg"
            alt="Moto taxi background"
            fill
            className="object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 to-black/40" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              À propos d'IzyMoto
            </h1>
            <p className="text-xl text-gray-300">
              Révolutionner la mobilité urbaine depuis 2025
            </p>
          </div>
        </div>
      </section>

      {/* Notre histoire */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">
              Notre histoire
            </h2>
            <div className="prose prose-lg mx-auto">
              <p>
                Fondée en 2025, IzyMoto est née d'une vision simple mais
                ambitieuse : offrir une solution rapide, sûre et élégante aux
                problèmes de mobilité urbaine dans Paris.
              </p>
              <p>
                Tout a commencé lorsque notre fondateur, bloqué dans les
                embouteillages parisiens pour la énième fois, a vu une moto se
                faufiler avec aisance entre les véhicules. Ce jour-là, l'idée
                d'IzyMoto a germé : pourquoi ne pas créer un service de taxi
                moto premium qui allie efficacité et confort ?
              </p>
              <p>
                Après des mois de préparation, de recrutement des meilleurs
                pilotes et d'acquisition d'une flotte de motos haut de gamme,
                IzyMoto a officiellement démarré ses moteurs en janvier 2025.
                Notre croissance fulgurante depuis lors témoigne de la
                pertinence de notre concept et de la qualité de notre service.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Notre mission */}
      <section
        ref={missionRef}
        className={cn(
          "py-20 bg-gray-100 transition-all duration-1000 transform",
          missionInView
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-20"
        )}
      >
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Briefcase className="h-12 w-12 mx-auto mb-6 text-primary" />
            <h2 className="text-3xl font-bold mb-8">Notre mission</h2>
            <p className="text-xl mb-8">
              Nous sommes déterminés à révolutionner les déplacements urbains en
              offrant une alternative rapide, sécurisée et éco-responsable aux
              modes de transport traditionnels.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <Target className="h-8 w-8 mb-4 text-primary" />
                <h3 className="text-xl font-bold mb-2">Efficacité</h3>
                <p>
                  Vous faire gagner un temps précieux en évitant les
                  embouteillages et en optimisant chaque trajet.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <CheckCircle className="h-8 w-8 mb-4 text-primary" />
                <h3 className="text-xl font-bold mb-2">Qualité</h3>
                <p>
                  Offrir un service impeccable avec des pilotes expérimentés et
                  des équipements premium.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Nos valeurs */}
      <section
        ref={valuesRef}
        className={cn(
          "py-20 transition-all duration-1000 transform",
          valuesInView
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-20"
        )}
      >
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-12 text-center">
              Nos valeurs
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Award className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Excellence</h3>
                <p className="text-gray-600">
                  Nous visons l'excellence dans chaque aspect de notre service,
                  de la ponctualité à la courtoisie.
                </p>
              </div>
              <div className="text-center">
                <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Sécurité</h3>
                <p className="text-gray-600">
                  La sécurité de nos clients est notre priorité absolue, sans
                  compromis.
                </p>
              </div>
              <div className="text-center">
                <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Respect</h3>
                <p className="text-gray-600">
                  Nous respectons nos clients, nos collaborateurs et les règles
                  de la route.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Nos chiffres */}
      <section className="py-20 bg-black text-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-center">
            IzyMoto en chiffres
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                25+
              </div>
              <p className="text-lg">Pilotes experts</p>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                5000+
              </div>
              <p className="text-lg">Courses réalisées</p>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                98%
              </div>
              <p className="text-lg">Clients satisfaits</p>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                15 min
              </div>
              <p className="text-lg">Délai moyen d'arrivée</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary/10">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">
            Prêt à rejoindre la révolution IzyMoto ?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Essayez notre service de taxi moto premium et découvrez une nouvelle
            façon de vous déplacer dans Paris.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="#reservation"
              onClick={navigateToReservation}
              className="bg-primary text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-primary/90 transition-colors cursor-pointer"
            >
              Réserver maintenant
            </a>
            <Link
              href="/contact"
              className="bg-white text-primary border border-primary px-8 py-3 rounded-lg font-bold text-lg hover:bg-gray-50 transition-colors"
            >
              Nous contacter
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// Composant Shield pour l'icône de bouclier
function Shield({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
