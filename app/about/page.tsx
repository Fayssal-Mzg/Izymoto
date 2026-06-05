"use client";

import { cn } from "@/lib/utils";
import {
  Briefcase,
  Users,
  Target,
  Award,
  CheckCircle,
  User,
} from "lucide-react";
import Link from "next/link";
import React from "react";
import { useInView } from "react-intersection-observer";
import { useReservation } from "@/lib/hooks/useReservation";
import Halo from "@/components/Halo";

export default function AboutPage() {
  const { ref: missionRef, inView: missionInView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const { ref: valuesRef, inView: valuesInView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const { ref: founderRef, inView: founderInView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const { navigateToReservation } = useReservation();

  return (
    <div className="bg-cream-50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-950 text-white py-24">
        <Halo />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-bold uppercase tracking-tight text-5xl md:text-6xl mb-6">
              À propos d'Izymoto
            </h1>
            <p className="text-xl text-white/75 max-w-xl mx-auto">
              Le moto-taxi parisien conçu pour vous faire arriver à l'heure,
              à chaque course.
            </p>
          </div>
        </div>
      </section>

      {/* Notre histoire */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-bold uppercase tracking-tight text-3xl text-navy-950 mb-8 text-center">
              Notre histoire
            </h2>
            <div className="space-y-5 text-navy-600 text-lg leading-relaxed">
              <p>
                Fondée en 2025, Izymoto est née d'un constat simple : se
                déplacer vite et sereinement à Paris reste un défi quotidien.
                Embouteillages, retards, stress — la moto est la réponse
                évidente, à condition de la rendre accessible et fiable pour
                tous.
              </p>
              <p>
                Nous avons bâti Izymoto autour d'une flotte de pilotes
                professionnels, de standards de sécurité stricts et d'une
                expérience de réservation pensée pour aller à l'essentiel :
                votre départ, à l'heure.
              </p>
              <p>
                Depuis son lancement, le service couvre Paris et toute
                l'Île-de-France — trajets en ville, transferts aéroports
                (CDG, Orly), gares et mises à disposition à l'heure.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Notre mission */}
      <section
        ref={missionRef}
        className={cn(
          "py-20 bg-cream-50 transition-all duration-1000 transform",
          missionInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
        )}
      >
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Briefcase className="h-10 w-10 mx-auto mb-5 text-mint-600" />
            <h2 className="font-bold uppercase tracking-tight text-3xl text-navy-950 mb-8">
              Notre mission
            </h2>
            <p className="text-lg text-navy-600 mb-10 max-w-xl mx-auto">
              Offrir une mobilité urbaine rapide, sécurisée et sans friction
              aux Parisiens qui ne peuvent pas se permettre d'attendre.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <div className="bg-white border border-navy-100 rounded-xl p-6">
                <Target className="h-7 w-7 mb-4 text-mint-600" />
                <h3 className="font-bold text-navy-950 text-lg mb-2">Efficacité</h3>
                <p className="text-navy-600">
                  Vous faire gagner un temps précieux en évitant les
                  embouteillages et en optimisant chaque trajet.
                </p>
              </div>
              <div className="bg-white border border-navy-100 rounded-xl p-6">
                <CheckCircle className="h-7 w-7 mb-4 text-mint-600" />
                <h3 className="font-bold text-navy-950 text-lg mb-2">Qualité</h3>
                <p className="text-navy-600">
                  Un service impeccable avec des pilotes expérimentés et des
                  équipements aux normes les plus strictes.
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
          "py-20 bg-white transition-all duration-1000 transform",
          valuesInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
        )}
      >
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-bold uppercase tracking-tight text-3xl text-navy-950 mb-12 text-center">
              Nos valeurs
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center border border-navy-100 rounded-xl p-8 bg-cream-50">
                <div className="bg-mint-600/10 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-5">
                  <Award className="h-7 w-7 text-mint-600" />
                </div>
                <h3 className="font-bold text-navy-950 text-lg mb-2">Excellence</h3>
                <p className="text-navy-600">
                  Nous visons l'excellence à chaque course : ponctualité,
                  tenue et courtoisie sans exception.
                </p>
              </div>
              <div className="text-center border border-navy-100 rounded-xl p-8 bg-cream-50">
                <div className="bg-mint-600/10 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-5">
                  <Shield className="h-7 w-7 text-mint-600" />
                </div>
                <h3 className="font-bold text-navy-950 text-lg mb-2">Sécurité</h3>
                <p className="text-navy-600">
                  La sécurité de nos clients est notre priorité absolue —
                  équipements fournis, pilotes certifiés, zéro compromis.
                </p>
              </div>
              <div className="text-center border border-navy-100 rounded-xl p-8 bg-cream-50">
                <div className="bg-mint-600/10 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-5">
                  <Users className="h-7 w-7 text-mint-600" />
                </div>
                <h3 className="font-bold text-navy-950 text-lg mb-2">Respect</h3>
                <p className="text-navy-600">
                  Respect du client, de nos pilotes et des règles de la route
                  — la confiance se construit course après course.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Izymoto en chiffres */}
      <section className="relative overflow-hidden bg-navy-950 text-white py-20">
        <Halo />
        <div className="container mx-auto px-4 relative z-10">
          <h2 className="font-bold uppercase tracking-tight text-3xl text-center mb-12">
            Izymoto en chiffres
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-bold text-mint-400 mb-2">
                25+
              </div>
              <p className="text-white/75">Pilotes experts</p>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-mint-400 mb-2">
                5 000+
              </div>
              <p className="text-white/75">Courses réalisées</p>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-mint-400 mb-2">
                98 %
              </div>
              <p className="text-white/75">Clients satisfaits</p>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-mint-400 mb-2">
                15 min
              </div>
              <p className="text-white/75">Délai moyen d'arrivée</p>
            </div>
          </div>
        </div>
      </section>

      {/* Le fondateur */}
      <section
        ref={founderRef}
        className={cn(
          "py-20 bg-white transition-all duration-1000 transform",
          founderInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
        )}
      >
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-bold uppercase tracking-tight text-3xl text-navy-950 mb-12 text-center">
              Le fondateur
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              {/* Colonne photo */}
              <div className="flex justify-center">
                {/* TODO: remplacer par la vraie photo d'Azzedine Zaouia dans /public */}
                <div className="aspect-square w-full max-w-xs rounded-xl bg-cream-100 border border-navy-100 flex flex-col items-center justify-center gap-3">
                  <User className="h-16 w-16 text-navy-300" />
                  <span className="text-sm text-navy-400">Photo à venir</span>
                </div>
              </div>
              {/* Colonne texte */}
              <div className="space-y-5">
                <h3 className="font-bold text-navy-950 text-2xl">
                  Azzedine Zaouia
                  <span className="block text-base font-normal text-mint-600 mt-1">
                    Fondateur
                  </span>
                </h3>
                <p className="text-navy-600 leading-relaxed">
                  Passionné de mobilité urbaine parisienne, Azzedine a fondé
                  Izymoto avec une conviction simple : la moto est le moyen
                  de transport le plus adapté aux contraintes du quotidien
                  parisien, à condition d'être proposé avec les mêmes
                  standards de fiabilité et de service qu'un taxi haut de
                  gamme.
                </p>
                <p className="text-navy-600 leading-relaxed">
                  Sa volonté est de bâtir un service de proximité ancré dans
                  le territoire — des pilotes qui connaissent Paris par cœur,
                  une équipe disponible et une expérience pensée pour les
                  Parisiens qui bougent vite.
                </p>
                <blockquote className="border-l-2 border-mint-600 pl-5 text-navy-600 italic">
                  "Offrir un trajet rapide, sûr et humain, à chaque course."
                </blockquote>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-navy-950 text-white py-20">
        <Halo />
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="font-bold uppercase tracking-tight text-3xl mb-5">
            Prêt à voyager avec Izymoto ?
          </h2>
          <p className="text-white/75 text-lg mb-10 max-w-xl mx-auto">
            Réservez votre moto-taxi en quelques secondes et découvrez une
            nouvelle façon de vous déplacer dans Paris.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="#reservation"
              onClick={navigateToReservation}
              className="bg-mint-400 text-navy-950 px-8 py-3 rounded-lg font-bold text-lg hover:bg-mint-400/90 transition-colors cursor-pointer"
            >
              Réserver maintenant
            </a>
            <Link
              href="/contact"
              className="bg-transparent text-white border border-white/40 px-8 py-3 rounded-lg font-bold text-lg hover:bg-white/10 transition-colors"
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
