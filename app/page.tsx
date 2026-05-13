"use client";
import Image from "next/image";
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
        {/* Hero Section - Mobile Optimized */}
        <section
          ref={heroRef}
          className={cn(
            "relative bg-slate-900 text-white py-6 md:py-0",
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
            <div className="flex flex-col md:flex-row items-center md:items-start md:mt-8">
              <div className="w-full md:w-1/2 mb-8 md:mb-0 md:pt-10">
                <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 leading-tight">
                  <span className="text-gold-400">
                    Taxi moto à Paris
                  </span>{" "}
                  — moto-taxi premium 24/7 en Île-de-France
                </h1>
                <p className="text-base md:text-lg text-gray-300 max-w-lg mb-6">
                  Déplacez-vous rapidement et confortablement à Paris avec
                  votre taxi moto Izymoto. Transferts aéroports, gares et
                  trajets business — tarif fixe dès 50€.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <a
                    href="#reservation"
                    className="bg-black text-white font-medium text-base px-6 py-3 rounded-lg inline-flex items-center justify-center group hover:bg-gray-800 transition-colors duration-300 w-full sm:w-auto"
                  >
                    <span>Réserver maintenant</span>
                    <ArrowRight className="ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform duration-300" />
                  </a>
                  <a
                    href="#tarifs"
                    className="border border-gray-400 text-white font-medium text-base px-6 py-3 rounded-lg inline-flex items-center justify-center hover:bg-white/10 transition-colors duration-300 w-full sm:w-auto"
                  >
                    <span>Nos tarifs</span>
                  </a>
                </div>
              </div>
              <div className="w-full md:w-1/2 md:pl-8">
                <div className="relative md:max-w-md md:mx-auto">
                  <Image
                    src="/taxi-paris.jpg"
                    alt="Taxi moto Izymoto à Paris — moto-taxi premium pour transferts et trajets"
                    className="rounded-lg shadow-2xl w-full h-auto"
                    width={700}
                    height={450}
                    priority
                    style={{ maxHeight: "60vh" }}
                  />
                  <div className="absolute -bottom-4 -right-4 bg-black text-white py-2 px-4 rounded-lg shadow-lg text-sm hidden sm:block">
                    <div className="flex items-center gap-2">
                      <Clock size={16} />
                      <span>Service 24/7</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Reservation Section - Mobile Optimized */}
        <section id="reservation" className="relative bg-white py-10 md:py-16">
          <div className="container mx-auto px-4 md:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-3">
                Réservez votre trajet
              </h2>
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
            "py-12 md:py-24 bg-white transition-all duration-1000 transform",
            featuresInView
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-20"
          )}
        >
          <div className="container mx-auto px-4">
            <div className="text-center mb-10 md:mb-20">
              <Star className="inline-block h-6 w-6 md:h-8 md:w-8 text-black mb-3" />
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 relative overflow-hidden">
                <span className="inline-block transform hover:scale-110 transition-transform duration-300">
                  Pourquoi
                </span>{" "}
                <span className="inline-block transform hover:scale-110 transition-transform duration-300">
                  choisir
                </span>{" "}
                <span className="inline-block text-black transform hover:scale-110 transition-transform duration-300">
                  IZYMOTO
                </span>
              </h2>
              <div className="w-16 h-1 bg-black mx-auto mb-4"></div>
              <p className="text-base md:text-lg text-gray-600 max-w-xl mx-auto italic">
                Un service d'exception pour ceux qui valorisent leur temps et
                leur confort
              </p>
            </div>

            {/* Responsive Card Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              <div className="md:col-span-6 md:col-start-1 bg-gray-50 p-6 rounded-lg shadow-sm hover:shadow transition-shadow duration-300">
                <div className="flex items-start space-x-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">RAPIDITÉ</h3>
                    <p className="text-gray-700">
                      Gagnez un temps précieux en évitant les embouteillages
                      parisiens. Notre service vous garantit l'arrivée la plus
                      rapide possible avec des chauffeurs qui connaissent
                      parfaitement la ville.
                    </p>
                  </div>
                </div>
              </div>

              <div className="md:col-span-6 md:col-start-7 bg-gray-50 p-6 rounded-lg shadow-sm hover:shadow transition-shadow duration-300">
                <div className="flex items-start space-x-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                    <ThumbsUp className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">CONFORT</h3>
                    <p className="text-gray-700">
                      Équipement premium et pilotes expérimentés pour votre
                      sécurité et confort pendant tout le trajet. Nos véhicules
                      sont récents, spacieux et toujours impeccables.
                    </p>
                  </div>
                </div>
              </div>

              <div className="md:col-span-12 bg-gray-50 p-6 rounded-lg shadow-sm hover:shadow transition-shadow duration-300">
                <div className="flex items-start space-x-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">FIABILITÉ</h3>
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
        <section id="tarifs" className="py-12 md:py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3">
                Nos <span className="text-black">tarifs</span>
              </h2>
              <div className="w-16 h-1 bg-black mx-auto mb-4"></div>
              <p className="text-base md:text-lg text-gray-600 max-w-xl mx-auto">
                Des prix compétitifs et transparents pour tous vos déplacements
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Tarif 1 */}
              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col h-full">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Bike size={20} className="text-black" />
                    <h3 className="text-xl font-bold">
                      TRANSFERT AÉROPORT EN MOTO
                    </h3>
                  </div>
                  <div className="w-12 h-1 bg-black"></div>
                </div>
                <div className="text-3xl font-bold mb-4 text-black">
                  A PARTIR DE 80€
                </div>
                <p className="text-gray-600 mb-6 flex-grow">
                  Transport depuis ou vers les aéroports de Paris (Orly, CDG).
                  Tarif fixe sans surprises.
                </p>
                <ul className="mb-6 space-y-2">
                  <li className="flex items-center">
                    <svg
                      className="h-5 w-5 text-black mr-2"
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
                  <li className="flex items-center">
                    <svg
                      className="h-5 w-5 text-black mr-2"
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
                  <li className="flex items-center">
                    <svg
                      className="h-5 w-5 text-black mr-2"
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
                  className="bg-black text-white font-medium rounded-lg py-3 px-6 text-center hover:bg-gray-800 transition-colors duration-300 mt-auto w-full"
                >
                  Réserver
                </a>
              </div>

              {/* Tarif 2 */}
              <div className="bg-black text-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col h-full relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-white text-black py-1 px-3 text-xs font-medium rounded-bl-lg">
                  POPULAIRE
                </div>
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Bike size={20} className="text-white" />
                    <h3 className="text-xl font-bold">TRAJET EN VILLE</h3>
                  </div>
                  <div className="w-12 h-1 bg-white"></div>
                </div>
                <div className="text-3xl font-bold mb-4 text-white">
                  {" "}
                  A PARTIR DE 50€
                </div>
                <p className="text-gray-300 mb-6 flex-grow">
                  Déplacements depuis Paris dans toute la France. Tarif de base
                  pour des trajets jusqu'à 10km.
                </p>
                <ul className="mb-6 space-y-2">
                  <li className="flex items-center">
                    <svg
                      className="h-5 w-5 text-white mr-2"
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
                  <li className="flex items-center">
                    <svg
                      className="h-5 w-5 text-white mr-2"
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
                  <li className="flex items-center">
                    <svg
                      className="h-5 w-5 text-white mr-2"
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
                  className="bg-white text-black font-medium rounded-lg py-3 px-6 text-center hover:bg-gray-200 transition-colors duration-300 mt-auto w-full"
                >
                  Réserver
                </a>
              </div>

              {/* Tarif 3 */}
              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col h-full">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={20} className="text-black" />
                    <h3 className="text-xl font-bold">MISE À DISPOSITION</h3>
                  </div>
                  <div className="w-12 h-1 bg-black"></div>
                </div>
                <div className="text-3xl font-bold mb-4 text-black">80€/h</div>
                <p className="text-gray-600 mb-6 flex-grow">
                  Chauffeur à votre disposition pour plusieurs heures ou toute
                  la journée. Idéal pour les visites ou événements.
                </p>
                <ul className="mb-6 space-y-2">
                  <li className="flex items-center">
                    <svg
                      className="h-5 w-5 text-black mr-2"
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
                  <li className="flex items-center">
                    <svg
                      className="h-5 w-5 text-black mr-2"
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
                  <li className="flex items-center">
                    <svg
                      className="h-5 w-5 text-black mr-2"
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
                  className="bg-black text-white font-medium rounded-lg py-3 px-6 text-center hover:bg-gray-800 transition-colors duration-300 mt-auto w-full"
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
            "py-12 md:py-20 bg-white",
            aboutInView ? "opacity-100" : "opacity-0",
            "transition-opacity duration-1000"
          )}
        >
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row items-center gap-10">
              <div className="lg:w-1/2">
                <div className="relative">
                  <img
                    src="/about-izymoto.jpg"
                    alt="L'équipe de chauffeurs professionnels IZYMOTO"
                    className="rounded-lg shadow-lg w-full h-auto"
                    loading="lazy"
                  />
                  <div className="absolute -bottom-4 -right-4 bg-black text-white py-2 px-4 rounded-lg shadow-lg hidden sm:flex items-center space-x-2">
                    <Award size={18} />
                    <span className="text-sm">Service certifié</span>
                  </div>
                </div>
              </div>
              <div className="lg:w-1/2">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
                  À <span className="text-black">propos</span> de nous
                </h2>
                <div className="w-16 h-1 bg-black mb-6"></div>
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
                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg">
                  <Award className="h-8 w-8 text-black" />
                  <p className="text-gray-700">
                    Service certifié par le décret n°2010-1223 du 11 Octobre
                    2010
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section - Mobile Optimized */}
        <section
          ref={ctaRef}
          className={cn(
            "relative py-16 md:py-32 bg-black text-white overflow-hidden transition-all duration-1000",
            ctaInView ? "opacity-100" : "opacity-0"
          )}
        >
          <div className="container mx-auto px-4 text-center relative z-10">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
              Prêt à <span className="text-white">voyager avec classe</span> ?
            </h2>

            <p className="text-base md:text-xl text-gray-300 max-w-2xl mx-auto mb-10">
              Réservez votre course et découvrez le luxe de se déplacer
              rapidement et confortablement dans toute la France.
            </p>

            <a
              href="#reservation"
              className="bg-white text-black font-medium rounded-lg text-lg px-8 py-4 inline-flex items-center justify-center group hover:bg-gray-100 transition-colors duration-300 w-full sm:w-auto"
            >
              <span>Réserver un trajet</span>
              <ArrowRight className="ml-3 h-5 w-5 transform group-hover:translate-x-2 transition-transform duration-300" />
            </a>

            <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-8">
              <div className="flex flex-col items-center p-4 bg-white/10 rounded-lg">
                <div className="text-3xl font-bold text-white mb-2">7J/7</div>
                <p className="text-white/70">Disponibilité</p>
              </div>
              <div className="flex flex-col items-center p-4 bg-white/10 rounded-lg">
                <div className="text-3xl font-bold text-white mb-2">15 MIN</div>
                <p className="text-white/70">Délai moyen</p>
              </div>
              <div className="flex flex-col items-center p-4 bg-white/10 rounded-lg">
                <div className="text-3xl font-bold text-white mb-2">100%</div>
                <p className="text-white/70">Satisfaction</p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section - Mobile Optimized */}
        <section id="contact" className="py-12 md:py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8">
              <h2 className="text-3xl sm:text-4xl font-bold mb-3">
                Contactez-nous
              </h2>
              <div className="w-16 h-1 bg-black mx-auto mb-4"></div>
              <p className="text-base text-gray-600 max-w-xl mx-auto">
                Une question ou besoin d'assistance ? Notre équipe est à votre
                disposition
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-6 rounded-lg hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center">
                    <Phone className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Téléphone</h3>
                    <p className="text-gray-700">+33 6 49 50 25 25</p>
                  </div>
                </div>
                <a
                  href="tel:+33649502525"
                  className="text-sm text-black hover:underline mt-2 inline-block"
                >
                  Appeler maintenant
                </a>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center">
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
                    <h3 className="text-lg font-bold">Email</h3>
                    <p className="text-gray-700">contact@izymoto.com</p>
                  </div>
                </div>
                <a
                  href="mailto:contact@izymoto.com"
                  className="text-sm text-black hover:underline mt-2 inline-block"
                >
                  Envoyer un email
                </a>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Adresse</h3>
                    <p className="text-gray-700">
                      25 Rue de Ponthieu, Paris 8eme
                    </p>
                  </div>
                </div>
                <a
                  href="https://maps.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-black hover:underline mt-2 inline-block"
                >
                  Voir sur la carte
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Social Section - Mobile Optimized */}
        <section className="py-10 md:py-16 bg-gray-50">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 inline-block relative">
              <span className="relative z-10">Suivez-nous</span>
              <span className="absolute bottom-0 left-0 w-full h-1 bg-black transform scale-x-0 hover:scale-x-100 transition-transform duration-500"></span>
            </h2>

            <p className="text-base text-gray-600 max-w-xl mx-auto mb-8">
              Suivez-nous sur les réseaux sociaux pour rester informé de nos
              actualités, promotions et services
            </p>

            <div className="flex justify-center space-x-8 md:space-x-16">
              <a
                href="https://www.facebook.com/zaouiazeddine"
                className="social-icon group"
                aria-label="Facebook"
              >
                <div className="bg-white p-4 rounded-full shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-110">
                  <Facebook className="h-6 w-6 md:h-8 md:w-8 text-black" />
                </div>
                <span className="block mt-2 text-sm">Facebook</span>
              </a>
              <a
                href="https://www.instagram.com/izymoto_taxi/"
                className="social-icon group"
                aria-label="Instagram"
              >
                <div className="bg-white p-4 rounded-full shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-110">
                  <Instagram className="h-6 w-6 md:h-8 md:w-8 text-black" />
                </div>
                <span className="block mt-2 text-sm">Instagram</span>
              </a>
              <a
                href="https://www.linkedin.com/in/azeddine-zaouia-a6640788/"
                className="social-icon group"
                aria-label="LinkedIn"
              >
                <div className="bg-white p-4 rounded-full shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-110">
                  <Linkedin className="h-6 w-6 md:h-8 md:w-8 text-black" />
                </div>
                <span className="block mt-2 text-sm">LinkedIn</span>
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
