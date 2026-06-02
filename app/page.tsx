"use client";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

import ConfirmationModal from "@/app/reserver/components/ConfirmationModal";
import DevisModal from "@/app/reserver/components/DevisModal";
import UnifiedUserModal from "@/app/reserver/components/UnifiedUserModal"; // NOUVEAU
import DevisSentModal from "@/app/reserver/components/DevisSentModal"; // NOUVEAU
import { MapWrapper } from "@/app/reserver/components/MapWrapper";
import PaymentModal from "@/app/reserver/components/PaymentModal";
import ReservationForm from "@/components/reservation/ReservationForm";
import { ReservationProvider } from "@/contexts/ReservationContext";
import { useReservation } from "@/lib/hooks/useReservation";
import { cn } from "@/lib/utils";
import PerformanceMonitor from "@/components/PerformanceMonitor";
import {
  Star,
  ArrowRight,
  Facebook,
  Instagram,
  Linkedin,
  MapPin,
  Phone,
  Clock,
  Shield,
  ThumbsUp,
  Award,
  Calendar,
  Bike,
} from "lucide-react";
import Head from "next/head";
import React, { useState, useEffect } from "react";
import { useInView } from "react-intersection-observer";

export default function Home() {
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    const header = document.querySelector("header");
    if (header) {
      setHeaderHeight(header.offsetHeight);

      const updateHeaderHeight = () => {
        setHeaderHeight(header.offsetHeight);
      };

      window.addEventListener("resize", updateHeaderHeight);
      return () => {
        window.removeEventListener("resize", updateHeaderHeight);
      };
    }
  }, []);

  // Sections animation references
  const { ref: heroRef, inView: heroInView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const { ref: featuresRef, inView: featuresInView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const { ref: ctaRef, inView: ctaInView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const { ref: testimonialsRef, inView: testimonialsInView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const { ref: aboutRef, inView: aboutInView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <MapWrapper>
      <div className="bg-background overflow-x-hidden min-h-screen">
        {/* 🚀 App Teaser Hero — "Bientôt disponible" product reveal */}
        <section
          aria-label="Application Izymoto — bientôt disponible"
          className="relative overflow-hidden bg-navy-950 text-white"
        >
          {/* Halos mint en fond */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-luxury-radial opacity-70"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-mint-400/20 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-mint-600/15 blur-3xl"
          />

          <div className="container relative mx-auto px-4 py-14 md:py-20 lg:py-24 md:px-6 lg:px-8">
            <div className="grid items-center gap-10 md:gap-12 lg:gap-16 md:grid-cols-2">
              {/* Colonne texte */}
              <div className="order-2 md:order-1">
                <span className="inline-flex items-center gap-2 rounded-full border border-mint-400/40 bg-mint-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-mint-300">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-mint-400" />
                  </span>
                  Bientôt disponible
                </span>

                <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
                  Notre app arrive,{" "}
                  <span className="text-mint-400">réservez en 30 secondes.</span>
                </h1>

                <p className="mt-5 max-w-lg text-base text-white/80 md:text-lg">
                  L'application Izymoto débarque sur iOS et Android.
                  Moto-taxi à Paris, n'importe où, n'importe quand —
                  rapide, fiable, partout en Île-de-France.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <a
                    href="#reservation"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-mint-400 px-6 py-3 text-base font-semibold text-navy-950 shadow-[0_10px_30px_-10px_rgba(45,212,191,0.6)] transition-all duration-300 hover:bg-mint-300 hover:shadow-[0_15px_40px_-10px_rgba(45,212,191,0.8)] hover:-translate-y-0.5"
                  >
                    Réserver dès maintenant
                    <ArrowRight className="h-5 w-5" />
                  </a>
                  <a
                    href="mailto:contact@izymoto.com?subject=Pr%C3%A9-inscription%20app%20Izymoto"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/25 px-6 py-3 text-base font-medium text-white transition-colors duration-300 hover:border-mint-400 hover:bg-white/5 hover:text-mint-300"
                  >
                    M'avertir au lancement
                  </a>
                </div>

                <div className="mt-8 flex items-center gap-5 text-sm text-white/60">
                  <div className="flex items-center gap-2">
                    <span className="text-mint-400">★</span> 4,9/5 avis clients
                  </div>
                  <span className="h-1 w-1 rounded-full bg-white/30" />
                  <div>Service 24h/24, 7j/7</div>
                </div>
              </div>

              {/* Colonne affiche */}
              <div className="order-1 md:order-2">
                <div className="relative mx-auto max-w-xl">
                  {/* Cadre avec lueur mint */}
                  <div className="absolute -inset-2 rounded-2xl bg-gradient-to-tr from-mint-400/40 via-mint-300/20 to-transparent blur-xl" />
                  <div className="relative overflow-hidden rounded-2xl ring-1 ring-white/10 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)] float-animation">
                    <Image
                      src="/app-teaser.png"
                      alt="Application Izymoto — bientôt disponible sur l'App Store et Google Play"
                      width={1356}
                      height={736}
                      className="block w-full h-auto"
                      priority
                    />
                  </div>

                  {/* Icône app détachée — bottom-left */}
                  <div className="absolute -bottom-6 -left-4 sm:-bottom-8 sm:-left-8 rotate-[-6deg] transition-transform duration-500 hover:rotate-0 hover:scale-105">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-[28%] bg-mint-400/40 blur-2xl" />
                      <Image
                        src="/app-icon.png"
                        alt="Icône de l'app Izymoto"
                        width={120}
                        height={120}
                        className="relative h-20 w-20 sm:h-28 sm:w-28 rounded-[28%] shadow-2xl ring-2 ring-white/20"
                      />
                    </div>
                  </div>

                  {/* Pastille "v1.0 — Été 2026" — top-right */}
                  <div className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 rotate-[8deg]">
                    <div className="rounded-full bg-white text-navy-950 px-4 py-1.5 text-xs font-bold uppercase tracking-widest shadow-lg">
                      v1.0 · Été 2026
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Séparateur dégradé vers l'hero suivant */}
          <div
            aria-hidden
            className="h-px w-full bg-gradient-to-r from-transparent via-mint-400/40 to-transparent"
          />
        </section>

        {/* Hero Section - Mobile Optimized */}
        <section
          ref={heroRef}
          className={cn(
            "relative bg-navy-950 text-white py-6 md:py-0",
            heroInView ? "opacity-100" : "opacity-0",
            "transition-opacity duration-1000"
          )}
          style={{
            minHeight: `calc(100vh - ${headerHeight}px)`,
            display: "flex",
            alignItems: "center",
          }}
        >
          <div className="container mx-auto px-4 md:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center md:mt-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-mint-400/40 bg-mint-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-mint-300 mb-6">
                <Clock size={14} />
                Service 24h/24 · 7j/7
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 leading-tight">
                <span className="text-mint-400">
                  Taxi moto à Paris
                </span>{" "}
                — moto-taxi premium 24/7 en Île-de-France
              </h1>
              <p className="text-base md:text-lg text-white/80 max-w-2xl mx-auto mb-8">
                Déplacez-vous rapidement et confortablement à Paris avec
                votre taxi moto Izymoto. Transferts aéroports, gares et
                trajets business — tarif fixe dès 50€.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="#reservation"
                  className="bg-mint-400 text-navy-950 font-semibold text-base px-6 py-3 rounded-lg inline-flex items-center justify-center group hover:bg-mint-300 transition-colors duration-300 w-full sm:w-auto shadow-[0_10px_30px_-10px_rgba(45,212,191,0.6)]"
                >
                  <span>Réserver maintenant</span>
                  <ArrowRight className="ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform duration-300" />
                </a>
                <a
                  href="#tarifs"
                  className="border border-white/30 text-white font-medium text-base px-6 py-3 rounded-lg inline-flex items-center justify-center hover:border-mint-400 hover:bg-white/5 hover:text-mint-300 transition-colors duration-300 w-full sm:w-auto"
                >
                  <span>Nos tarifs</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Reservation Section - Mobile Optimized */}
        <section id="reservation" className="relative bg-cream-50 py-10 md:py-16">
          <div className="container mx-auto px-4 md:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-3 text-navy-950">
                Réservez votre <span className="text-mint-600">taxi moto</span> à Paris
              </h2>
              <div className="w-16 h-1 bg-mint-400 mx-auto mb-4"></div>
              <p className="text-base text-gray-600 max-w-xl mx-auto">
                Indiquez votre point de départ et d'arrivée pour obtenir un
                tarif instantané
              </p>
            </div>
            <ReservationProvider>
              <HomeReservationSection />
            </ReservationProvider>
          </div>
        </section>

        {/* Features Section - Mobile Optimized */}
        <section
          id="services"
          ref={featuresRef}
          className={cn(
            "py-12 md:py-24 bg-cream-50 transition-all duration-1000 transform",
            featuresInView
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-20"
          )}
        >
          <div className="container mx-auto px-4">
            <div className="text-center mb-10 md:mb-20">
              <Star className="inline-block h-6 w-6 md:h-8 md:w-8 text-mint-600 mb-3" />
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 relative overflow-hidden text-navy-950">
                <span className="inline-block transform hover:scale-110 transition-transform duration-300">
                  Pourquoi
                </span>{" "}
                <span className="inline-block transform hover:scale-110 transition-transform duration-300">
                  choisir
                </span>{" "}
                <span className="inline-block text-mint-600 transform hover:scale-110 transition-transform duration-300">
                  IZYMOTO
                </span>
              </h2>
              <div className="w-16 h-1 bg-mint-400 mx-auto mb-4"></div>
              <p className="text-base md:text-lg text-gray-600 max-w-xl mx-auto italic">
                Un service d'exception pour ceux qui valorisent leur temps et
                leur confort
              </p>
            </div>

            {/* Responsive Card Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              <div className="md:col-span-6 md:col-start-1 bg-mint-50/50 border border-mint-100 p-6 rounded-lg shadow-sm hover:shadow-md hover:border-mint-300 transition-all duration-300">
                <div className="flex items-start space-x-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-mint-600 flex items-center justify-center flex-shrink-0 shadow-[0_8px_20px_-6px_rgba(15,148,136,0.55)]">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-navy-950">SERVICE RAPIDE</h3>
                    <p className="text-gray-700">
                      Gagnez un temps précieux en évitant les embouteillages
                      parisiens. Notre service vous garantit l'arrivée la plus
                      rapide possible avec des chauffeurs qui connaissent
                      parfaitement la ville.
                    </p>
                  </div>
                </div>
              </div>

              <div className="md:col-span-6 md:col-start-7 bg-mint-50/50 border border-mint-100 p-6 rounded-lg shadow-sm hover:shadow-md hover:border-mint-300 transition-all duration-300">
                <div className="flex items-start space-x-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-mint-600 flex items-center justify-center flex-shrink-0 shadow-[0_8px_20px_-6px_rgba(15,148,136,0.55)]">
                    <ThumbsUp className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-navy-950">CONFORT PREMIUM</h3>
                    <p className="text-gray-700">
                      Équipement premium et pilotes expérimentés pour votre
                      sécurité et confort pendant tout le trajet. Nos véhicules
                      sont récents, spacieux et toujours impeccables.
                    </p>
                  </div>
                </div>
              </div>

              <div className="md:col-span-12 bg-mint-50/50 border border-mint-100 p-6 rounded-lg shadow-sm hover:shadow-md hover:border-mint-300 transition-all duration-300">
                <div className="flex items-start space-x-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-mint-600 flex items-center justify-center flex-shrink-0 shadow-[0_8px_20px_-6px_rgba(15,148,136,0.55)]">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-navy-950">FIABILITÉ 24/7</h3>
                    <p className="text-gray-700">
                      Service ponctuel et professionnel, disponible 7j/7. Nos
                      chauffeurs sont formés pour vous offrir une expérience
                      sans faille. Réservez en toute confiance pour vos trajets
                      importants.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tarifs Section - Mobile Optimized */}
        <section id="tarifs" className="py-12 md:py-20 bg-cream-100">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 text-navy-950">
                Nos <span className="text-mint-600">tarifs taxi moto</span>
              </h2>
              <div className="w-16 h-1 bg-mint-400 mx-auto mb-4"></div>
              <p className="text-base md:text-lg text-gray-600 max-w-xl mx-auto">
                Des prix compétitifs et transparents pour tous vos déplacements
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Tarif 1 */}
              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg hover:ring-1 hover:ring-mint-400/40 transition-all duration-300 flex flex-col h-full">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Bike size={20} className="text-mint-600" />
                    <h3 className="text-xl font-bold text-navy-950">
                      TRANSFERT AÉROPORT EN MOTO
                    </h3>
                  </div>
                  <div className="w-12 h-1 bg-mint-400"></div>
                </div>
                <div className="text-3xl font-bold mb-4 text-navy-950">
                  A PARTIR DE 80€
                </div>
                <p className="text-gray-600 mb-6 flex-grow">
                  Transport depuis ou vers les aéroports de Paris (Orly, CDG).
                  Tarif fixe sans surprises.
                </p>
                <ul className="mb-6 space-y-2">
                  <li className="flex items-center text-gray-700">
                    <svg
                      className="h-5 w-5 text-mint-600 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                    Accueil personnalisé
                  </li>
                  <li className="flex items-center text-gray-700">
                    <svg
                      className="h-5 w-5 text-mint-600 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                    Attente incluse (15 min)
                  </li>
                  <li className="flex items-center text-gray-700">
                    <svg
                      className="h-5 w-5 text-mint-600 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                    Aide avec les bagages
                  </li>
                </ul>
                <a
                  href="#reservation"
                  className="bg-navy-950 text-white font-semibold rounded-lg py-3 px-6 text-center hover:bg-navy-800 transition-colors duration-300 mt-auto w-full"
                >
                  Réserver
                </a>
              </div>

              {/* Tarif 2 — POPULAIRE */}
              <div className="bg-navy-950 text-white p-6 rounded-lg shadow-xl ring-2 ring-mint-400/50 hover:ring-mint-400 transition-all duration-300 flex flex-col h-full relative overflow-hidden md:-translate-y-2">
                <div className="absolute top-0 right-0 bg-mint-400 text-navy-950 py-1 px-3 text-xs font-bold uppercase tracking-wider rounded-bl-lg">
                  Populaire
                </div>
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Bike size={20} className="text-mint-400" />
                    <h3 className="text-xl font-bold">TRAJET EN VILLE EN MOTO-TAXI</h3>
                  </div>
                  <div className="w-12 h-1 bg-mint-400"></div>
                </div>
                <div className="text-3xl font-bold mb-4 text-mint-400">
                  A PARTIR DE 50€
                </div>
                <p className="text-white/75 mb-6 flex-grow">
                  Déplacements depuis Paris dans toute la France. Tarif de base
                  pour des trajets jusqu'à 10km.
                </p>
                <ul className="mb-6 space-y-2">
                  <li className="flex items-center text-white/90">
                    <svg
                      className="h-5 w-5 text-mint-400 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                    Ponctualité garantie
                  </li>
                  <li className="flex items-center text-white/90">
                    <svg
                      className="h-5 w-5 text-mint-400 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                    Confort premium
                  </li>
                  <li className="flex items-center text-white/90">
                    <svg
                      className="h-5 w-5 text-mint-400 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                    Équipement fourni
                  </li>
                </ul>
                <a
                  href="#reservation"
                  className="bg-mint-400 text-navy-950 font-semibold rounded-lg py-3 px-6 text-center hover:bg-mint-300 transition-colors duration-300 mt-auto w-full shadow-[0_10px_30px_-10px_rgba(45,212,191,0.6)]"
                >
                  Réserver
                </a>
              </div>

              {/* Tarif 3 */}
              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg hover:ring-1 hover:ring-mint-400/40 transition-all duration-300 flex flex-col h-full">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={20} className="text-mint-600" />
                    <h3 className="text-xl font-bold text-navy-950">MISE À DISPOSITION MOTO-TAXI</h3>
                  </div>
                  <div className="w-12 h-1 bg-mint-400"></div>
                </div>
                <div className="text-3xl font-bold mb-4 text-navy-950">80€/h</div>
                <p className="text-gray-600 mb-6 flex-grow">
                  Chauffeur à votre disposition pour plusieurs heures ou toute
                  la journée. Idéal pour les visites ou événements.
                </p>
                <ul className="mb-6 space-y-2">
                  <li className="flex items-center text-gray-700">
                    <svg
                      className="h-5 w-5 text-mint-600 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                    Arrêts multiples
                  </li>
                  <li className="flex items-center text-gray-700">
                    <svg
                      className="h-5 w-5 text-mint-600 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                    Facturation à l'heure
                  </li>
                  <li className="flex items-center text-gray-700">
                    <svg
                      className="h-5 w-5 text-mint-600 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                    Service personnalisé
                  </li>
                </ul>
                <a
                  href="#reservation"
                  className="bg-navy-950 text-white font-semibold rounded-lg py-3 px-6 text-center hover:bg-navy-800 transition-colors duration-300 mt-auto w-full"
                >
                  Réserver
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* About Us Section - Mobile Optimized */}
        <section
          id="about"
          ref={aboutRef}
          className={cn(
            "py-12 md:py-20 bg-cream-50",
            aboutInView ? "opacity-100" : "opacity-0",
            "transition-opacity duration-1000"
          )}
        >
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full border border-mint-500/30 bg-mint-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-mint-700 mb-5">
                <Award size={14} />
                Service certifié
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
                À <span className="text-mint-600">propos</span> d'Izymoto, taxi moto à Paris
              </h2>
              <div className="w-16 h-1 bg-mint-400 mb-6"></div>
                <p className="text-gray-700 mb-4">
                  IZYMOTO est né d'une vision simple : offrir un service de
                  transport haut de gamme, fiable et accessible à Paris. Fondée
                  par des passionnés d'excellence du service, notre entreprise
                  s'est rapidement fait un nom dans le secteur exigeant du
                  transport de passager parisien.
                </p>
                <p className="text-gray-700 mb-4">
                  Notre flotte moderne de véhicules premium et nos chauffeurs
                  expérimentés sont à votre disposition pour tous vos
                  déplacements : transferts aéroport, trajets d'affaires,
                  soirées spéciales ou visites touristiques.
                </p>
                <p className="text-gray-700 mb-6">
                  La satisfaction de nos clients est notre priorité absolue.
                </p>
                <div className="flex items-center gap-4 bg-mint-50 p-4 rounded-lg border border-mint-100">
                  <Award className="h-8 w-8 text-mint-600" />
                  <p className="text-gray-700">
                    Service certifié par le décret n°2010-1223 du 11 Octobre
                    2010
                  </p>
                </div>
            </div>
          </div>
        </section>

        {/* Trajets populaires (maillage interne SEO) */}
        <section
          aria-labelledby="trajets-populaires-heading"
          className="py-12 md:py-16 bg-cream-50 border-t border-cream-200"
        >
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-8">
              <h2
                id="trajets-populaires-heading"
                className="text-2xl md:text-4xl font-bold mb-3 text-navy-950"
              >
                Nos trajets en <span className="text-mint-600">taxi moto à Paris</span>
              </h2>
              <div className="w-16 h-1 bg-mint-400 mx-auto mb-4" aria-hidden="true"></div>
              <p className="text-base text-gray-600 max-w-2xl mx-auto">
                Découvrez nos pages dédiées par destination, aéroport, gare ou
                quartier parisien pour réserver votre moto-taxi en quelques clics.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">
                  Aéroports & gares
                </h3>
                <ul className="space-y-2">
                  <li>
                    <Link href="/moto-taxi-aeroport-cdg" className="text-gray-700 hover:text-mint-700 hover:underline text-sm">
                      Taxi moto Aéroport CDG
                    </Link>
                  </li>
                  <li>
                    <Link href="/moto-taxi-aeroport-orly" className="text-gray-700 hover:text-mint-700 hover:underline text-sm">
                      Taxi moto Aéroport Orly
                    </Link>
                  </li>
                  <li>
                    <Link href="/moto-taxi-gare-du-nord" className="text-gray-700 hover:text-mint-700 hover:underline text-sm">
                      Taxi moto Gare du Nord
                    </Link>
                  </li>
                  <li>
                    <Link href="/moto-taxi-gare-de-lyon" className="text-gray-700 hover:text-mint-700 hover:underline text-sm">
                      Taxi moto Gare de Lyon
                    </Link>
                  </li>
                  <li>
                    <Link href="/moto-taxi-disneyland" className="text-gray-700 hover:text-mint-700 hover:underline text-sm">
                      Taxi moto Disneyland Paris
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">
                  Quartiers parisiens
                </h3>
                <ul className="space-y-2">
                  <li>
                    <Link href="/moto-taxi-paris" className="text-gray-700 hover:text-mint-700 hover:underline text-sm">
                      Taxi moto Paris (tous arrondissements)
                    </Link>
                  </li>
                  <li>
                    <Link href="/taxi-moto-paris-8" className="text-gray-700 hover:text-mint-700 hover:underline text-sm">
                      Taxi moto Paris 8e
                    </Link>
                  </li>
                  <li>
                    <Link href="/taxi-moto-paris-16" className="text-gray-700 hover:text-mint-700 hover:underline text-sm">
                      Taxi moto Paris 16e
                    </Link>
                  </li>
                  <li>
                    <Link href="/taxi-moto-champs-elysees" className="text-gray-700 hover:text-mint-700 hover:underline text-sm">
                      Taxi moto Champs-Élysées
                    </Link>
                  </li>
                  <li>
                    <Link href="/taxi-moto-bastille" className="text-gray-700 hover:text-mint-700 hover:underline text-sm">
                      Taxi moto Bastille
                    </Link>
                  </li>
                  <li>
                    <Link href="/taxi-moto-saint-germain" className="text-gray-700 hover:text-mint-700 hover:underline text-sm">
                      Taxi moto Saint-Germain
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">
                  Business & ressources
                </h3>
                <ul className="space-y-2">
                  <li>
                    <Link href="/moto-taxi-la-defense" className="text-gray-700 hover:text-mint-700 hover:underline text-sm">
                      Taxi moto La Défense
                    </Link>
                  </li>
                  <li>
                    <Link href="/portefeuille" className="text-gray-700 hover:text-mint-700 hover:underline text-sm">
                      Portefeuille entreprise
                    </Link>
                  </li>
                  <li>
                    <Link href="/nos-tarifs" className="text-gray-700 hover:text-mint-700 hover:underline text-sm">
                      Tarifs taxi moto Paris
                    </Link>
                  </li>
                  <li>
                    <Link href="/aeroports" className="text-gray-700 hover:text-mint-700 hover:underline text-sm">
                      Tous nos transferts aéroports
                    </Link>
                  </li>
                  <li>
                    <Link href="/blog/prix-taxi-moto-paris-cdg" className="text-gray-700 hover:text-mint-700 hover:underline text-sm">
                      Prix taxi moto Paris ↔ CDG
                    </Link>
                  </li>
                  <li>
                    <Link href="/blog/taxi-moto-vs-vtc-paris" className="text-gray-700 hover:text-mint-700 hover:underline text-sm">
                      Taxi moto vs VTC à Paris
                    </Link>
                  </li>
                  <li>
                    <Link href="/blog/comment-reserver-taxi-moto-paris" className="text-gray-700 hover:text-mint-700 hover:underline text-sm">
                      Comment réserver un taxi moto
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section - Mobile Optimized */}
        <section
          ref={ctaRef}
          className={cn(
            "relative py-16 md:py-32 bg-navy-950 text-white overflow-hidden transition-all duration-1000",
            ctaInView ? "opacity-100" : "opacity-0"
          )}
        >
          {/* Halos mint en fond */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-mint-400/15 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-mint-600/10 blur-3xl"
          />

          <div className="container mx-auto px-4 text-center relative z-10">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
              Prêt à <span className="text-mint-400">réserver votre moto-taxi</span> ?
            </h2>

            <p className="text-base md:text-xl text-white/80 max-w-2xl mx-auto mb-10">
              Réservez votre course et découvrez le luxe de se déplacer
              rapidement et confortablement dans toute la France.
            </p>

            <a
              href="#reservation"
              className="bg-mint-400 text-navy-950 font-semibold rounded-lg text-lg px-8 py-4 inline-flex items-center justify-center group hover:bg-mint-300 transition-colors duration-300 w-full sm:w-auto shadow-[0_15px_40px_-10px_rgba(45,212,191,0.6)]"
            >
              <span>Réserver un trajet</span>
              <ArrowRight className="ml-3 h-5 w-5 transform group-hover:translate-x-2 transition-transform duration-300" />
            </a>

            <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-8">
              <div className="flex flex-col items-center p-4 bg-white/5 border border-mint-400/20 rounded-lg backdrop-blur-sm">
                <div className="text-3xl font-bold text-mint-400 mb-2">7J/7</div>
                <p className="text-white/70">Disponibilité</p>
              </div>
              <div className="flex flex-col items-center p-4 bg-white/5 border border-mint-400/20 rounded-lg backdrop-blur-sm">
                <div className="text-3xl font-bold text-mint-400 mb-2">15 MIN</div>
                <p className="text-white/70">Délai moyen</p>
              </div>
              <div className="flex flex-col items-center p-4 bg-white/5 border border-mint-400/20 rounded-lg backdrop-blur-sm">
                <div className="text-3xl font-bold text-mint-400 mb-2">100%</div>
                <p className="text-white/70">Satisfaction</p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section - Mobile Optimized */}
        <section id="contact" className="py-12 md:py-16 bg-cream-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8">
              <h2 className="text-3xl sm:text-4xl font-bold mb-3 text-navy-950">
                Contactez-<span className="text-mint-600">nous</span>
              </h2>
              <div className="w-16 h-1 bg-mint-400 mx-auto mb-4"></div>
              <p className="text-base text-gray-600 max-w-xl mx-auto">
                Une question ou besoin d'assistance ? Notre équipe est à votre
                disposition
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-mint-50/40 border border-mint-100 p-6 rounded-lg hover:shadow-md hover:border-mint-300 transition-all duration-300">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-full bg-mint-600 flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(15,148,136,0.55)]">
                    <Phone className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-navy-950">Téléphone</h3>
                    <p className="text-gray-700">+33 6 49 50 25 25</p>
                  </div>
                </div>
                <a
                  href="tel:+33649502525"
                  className="text-sm font-semibold text-mint-700 hover:text-mint-600 hover:underline mt-2 inline-block"
                >
                  Appeler maintenant
                </a>
              </div>

              <div className="bg-mint-50/40 border border-mint-100 p-6 rounded-lg hover:shadow-md hover:border-mint-300 transition-all duration-300">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-full bg-mint-600 flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(15,148,136,0.55)]">
                    <svg
                      className="h-5 w-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-navy-950">Email</h3>
                    <p className="text-gray-700">contact@izymoto.com</p>
                  </div>
                </div>
                <a
                  href="mailto:contact@izymoto.com"
                  className="text-sm font-semibold text-mint-700 hover:text-mint-600 hover:underline mt-2 inline-block"
                >
                  Envoyer un email
                </a>
              </div>

              <div className="bg-mint-50/40 border border-mint-100 p-6 rounded-lg hover:shadow-md hover:border-mint-300 transition-all duration-300">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-full bg-mint-600 flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(15,148,136,0.55)]">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-navy-950">Adresse</h3>
                    <p className="text-gray-700">
                      25 Rue de Ponthieu, Paris 8eme
                    </p>
                  </div>
                </div>
                <a
                  href="https://maps.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-mint-700 hover:text-mint-600 hover:underline mt-2 inline-block"
                >
                  Voir sur la carte
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Social Section - Mobile Optimized */}
        <section className="py-10 md:py-16 bg-cream-100">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 inline-block relative text-navy-950">
              <span className="relative z-10">Suivez-<span className="text-mint-600">nous</span></span>
              <span className="absolute bottom-0 left-0 w-full h-1 bg-mint-400 transform scale-x-0 hover:scale-x-100 transition-transform duration-500"></span>
            </h2>

            <p className="text-base text-gray-600 max-w-xl mx-auto mb-8">
              Suivez-nous sur les réseaux sociaux pour rester informé de nos
              actualités, promotions et services
            </p>

            <div className="flex justify-center space-x-8 md:space-x-16">
              <a
                href="https://www.facebook.com/Izymoto/"
                className="social-icon group"
                aria-label="Facebook"
              >
                <div className="bg-white p-4 rounded-full shadow-md hover:shadow-lg hover:bg-mint-50 transition-all duration-300 transform hover:scale-110">
                  <Facebook className="h-6 w-6 md:h-8 md:w-8 text-mint-600" />
                </div>
                <span className="block mt-2 text-sm text-navy-950">Facebook</span>
              </a>
              <a
                href="https://www.instagram.com/izymoto_paris"
                className="social-icon group"
                aria-label="Instagram"
              >
                <div className="bg-white p-4 rounded-full shadow-md hover:shadow-lg hover:bg-mint-50 transition-all duration-300 transform hover:scale-110">
                  <Instagram className="h-6 w-6 md:h-8 md:w-8 text-mint-600" />
                </div>
                <span className="block mt-2 text-sm text-navy-950">Instagram</span>
              </a>
              <a
                href="https://www.linkedin.com/in/azeddine-zaouia-a6640788/"
                className="social-icon group"
                aria-label="LinkedIn"
              >
                <div className="bg-white p-4 rounded-full shadow-md hover:shadow-lg hover:bg-mint-50 transition-all duration-300 transform hover:scale-110">
                  <Linkedin className="h-6 w-6 md:h-8 md:w-8 text-mint-600" />
                </div>
                <span className="block mt-2 text-sm text-navy-950">LinkedIn</span>
              </a>
            </div>
          </div>
        </section>

        {/* Performance Monitor Integration */}
        {showPerformanceMonitor && <PerformanceMonitor />}

        {/* Performance Monitor Button - Only visible in development */}
        {process.env.NODE_ENV === "development" && (
          <button
            onClick={() => setShowPerformanceMonitor(!showPerformanceMonitor)}
            className="fixed bottom-20 right-4 z-50 bg-black text-white p-2 rounded-full shadow-lg hover:bg-gray-800 transition-colors"
            title={
              showPerformanceMonitor
                ? "Masquer le moniteur"
                : "Afficher le moniteur de performance"
            }
            aria-label="Toggle Performance Monitor"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
          </button>
        )}
      </div>
    </MapWrapper>
  );
}

// FONCTION REFACTORISÉE : HomeReservationSection avec UnifiedUserModal
function HomeReservationSection() {
  const {
    depart,
    setDepart,
    arrivee,
    setArrivee,
    directions,
    prix,
    prixBase,
    detailsMajorations,
    distance,
    duree,
    prioriteReservation,
    setPrioriteReservation,
    prixFinal,
    setPrixFinal,
    reservationDate,
    setReservationDate,
    name,
    setName,
    phone,
    setPhone,
    email,
    setEmail,
    notes,
    setNotes,
    reservationId,
    formattedReservationDate,
    currentStep,
    setCurrentStep,
    bookingData,
    calculateRoute,
    handleReservation,
    proceedToReservation,
    proceedToPayment,
    handlePaymentSuccess,
    handleRequestDevis,
    resetForm,
  } = useReservation();

  // État local pour stocker les infos client pour le devis
  const [clientInfo, setClientInfo] = useState<any>(null);

  return (
    <>
      <ReservationForm customContainerClass="gap-6 md:gap-8 items-center" />

      {currentStep === "devis" && (
        <DevisModal
          depart={depart}
          arrivee={arrivee}
          distance={distance}
          duree={duree}
          prixBase={prixBase}
          prix={prix}
          prixFinal={prixFinal}
          detailsMajorations={detailsMajorations}
          prioriteReservation={prioriteReservation}
          setPrioriteReservation={setPrioriteReservation}
          onCancel={() => setCurrentStep("form")}
          onClose={resetForm}
          onProceed={proceedToReservation}
          onRequestDevis={handleRequestDevis}
          reservationDate={reservationDate}
          setReservationDate={setReservationDate}
        />
      )}

      {currentStep === "guest_info" && (
        <UnifiedUserModal
          {...({
            type: "devis",
            onSubmit: (userData: any) => {
              console.log("GuestInfo submitted", userData);
              setClientInfo(userData);
              handleRequestDevis(userData);
            },
            onCancel: () => {
              console.log("Cancel clicked in GuestInfoModal");
              setCurrentStep("devis");
            },
            onClose: resetForm,
          } as any)}
        />
      )}

      {/* CORRIGÉ : UnifiedUserModal pour réservation avec cast TypeScript */}
      {currentStep === "reservation" && (
        <UnifiedUserModal
          {...({
            type: "reservation",
            reservationDate: reservationDate,
            setReservationDate: setReservationDate,
            notes: notes,
            setNotes: setNotes,
            onSubmit: (userData: any) => {
              console.log("Proceed clicked in ReservationModal");
              setName(userData.name);
              setPhone(userData.phone);
              setEmail(userData.email);
              if (userData.notes) setNotes(userData.notes);
              proceedToPayment();
            },
            onCancel: () => {
              console.log("Cancel clicked in ReservationModal");
              setCurrentStep("devis");
            },
            onClose: resetForm,
          } as any)}
        />
      )}

      {currentStep === "payment" && (
        <PaymentModal
          prixFinal={prixFinal}
          bookingData={bookingData}
          reservationDate={reservationDate}
          onSuccess={(paymentId: any) => {
            console.log("Payment success", paymentId);
            handlePaymentSuccess(paymentId);
          }}
          onCancel={() => {
            console.log("Cancel clicked in PaymentModal");
            setCurrentStep("reservation");
          }}
          onClose={resetForm}
        />
      )}

      {currentStep === "confirmation" && (
        <ConfirmationModal
          reservationId={reservationId}
          formattedReservationDate={formattedReservationDate}
          depart={depart}
          arrivee={arrivee}
          onClose={() => {
            console.log("Close clicked in ConfirmationModal");
            resetForm();
          }}
        />
      )}

      {/* NOUVEAU : Modal de confirmation devis envoyé */}
      {currentStep === "devis_sent" && clientInfo && (
        <DevisSentModal
          clientEmail={clientInfo.email}
          depart={depart}
          arrivee={arrivee}
          onClose={() => {
            console.log("Close clicked in DevisSentModal");
            resetForm();
          }}
        />
      )}
    </>
  );
}
