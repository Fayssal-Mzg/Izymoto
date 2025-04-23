// app/page.tsx
"use client";

import ConfirmationModal from "@/app/reserver/components/ConfirmationModal";
import DevisModal from "@/app/reserver/components/DevisModal";
import GuestInformationModal from "@/app/reserver/components/GuestInformationModal";
import { MapWrapper } from "@/app/reserver/components/MapWrapper";
import PaymentModal from "@/app/reserver/components/PaymentModal";
import ReservationModal from "@/app/reserver/components/ReservationModal";
import ReservationForm from "@/components/reservation/ReservationForm";
import { ReservationProvider } from "@/contexts/ReservationContext";
import { useReservation } from "@/lib/hooks/useReservation";
import { cn } from "@/lib/utils";
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
} from "lucide-react";
import Head from "next/head";
import React from "react";
import { useInView } from "react-intersection-observer";

// Google Maps libraries
const libraries = ["places"] as any[];

export default function Home() {
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
      {/* SEO Metadata */}
      <Head>
        <title>
          IZYMOTO | Service de transport VTC et navette aéroports Paris
        </title>

        <meta
          name="description"
          content="IZYMOTO vous propose des services de transport privé et professionnel à Paris. Réservez en ligne, tarifs compétitifs pour vos trajets aéroports et navettes personnalisées."
        />
        <link rel="canonical" href="https://izymoto.com/" />

        {/* Open Graph Tags */}
        <meta
          property="og:title"
          content="IZYMOTO | Service de transport VTC Paris"
        />
        <meta
          property="og:description"
          content="Service de transport privé à Paris et navettes aéroports - Réservez en ligne"
        />
        <meta
          property="og:image"
          content="https://izymoto.com/images/voiture-izymoto.jpg"
        />
        <meta property="og:url" content="https://izymoto.com" />
        <meta property="og:type" content="website" />

        {/* Twitter Cards */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@IZYMOTO" />
        <meta
          name="twitter:title"
          content="IZYMOTO | Service de transport VTC Paris"
        />
        <meta
          name="twitter:description"
          content="Service de transport privé à Paris et navettes aéroports - Réservez en ligne"
        />
        <meta
          name="twitter:image"
          content="https://izymoto.com/images/voiture-izymoto.jpg"
        />

        {/* Structured Data - LocalBusiness Schema */}
        <script type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              "name": "IZYMOTO",
              "image": "https://izymoto.com/images/logo.jpg",
              "url": "https://izymoto.com",
              "telephone": "+33 652753521",
              "address": {
                "@type": "PostalAddress",
                "streetAddress": "1 Rue de Paris",
                "addressLocality": "Paris",
                "postalCode": "75001",
                "addressCountry": "FR"
              },
              "openingHoursSpecification": {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": [
                  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
                ],
                "opens": "00:00",
                "closes": "23:59"
              },
              "priceRange": "€€",
              "description": "Service de transport VTC à Paris et navettes aéroports"
            }
          `}
        </script>
      </Head>

      <main className="bg-background overflow-x-hidden min-h-screen">
        {/* Reservation Section */}
        <section id="reservation" className="relative bg-white py-16">
          <div className="container mx-auto px-4 md:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-4xl md:text-5xl font-bebas mb-3">
                Réservez votre trajet en quelques clics
              </h2>
              <p className="text-lg font-playfair text-gray-600 max-w-xl mx-auto">
                Indiquez votre point de départ et d'arrivée pour obtenir un
                tarif instantané
              </p>
            </div>
            <ReservationProvider>
              <HomeReservationSection />
            </ReservationProvider>
          </div>
        </section>
        {/* Hero Section with intro text */}
        <section
          ref={heroRef}
          className={cn(
            "relative bg-slate-900 text-white py-20",
            heroInView ? "opacity-100" : "opacity-0",
            "transition-opacity duration-1000"
          )}
        >
          <div className="container mx-auto px-4 md:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 mb-10 md:mb-0">
                <h1 className="text-5xl md:text-7xl font-bebas mb-4">
                  <span className="text-gold-400">Transport VTC</span> de
                  qualité à Paris
                </h1>
                <p className="text-xl font-playfair text-gray-300 max-w-lg mb-8">
                  Déplacez-vous rapidement et confortablement dans Paris avec
                  notre service de VTC premium. Navettes aéroports, déplacements
                  professionnels ou sorties nocturnes.
                </p>
                <div className="flex flex-wrap gap-4">
                  <a
                    href="#reservation"
                    className="bg-gold-500 text-white font-bebas text-xl px-8 py-3 inline-flex items-center group hover:bg-gold-400 transition-colors duration-300"
                  >
                    <span>RÉSERVER MAINTENANT</span>
                    <ArrowRight className="ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform duration-300" />
                  </a>
                  <a
                    href="#tarifs"
                    className="border border-gold-500 text-gold-400 font-bebas text-xl px-8 py-3 inline-flex items-center hover:bg-gold-500/10 transition-colors duration-300"
                  >
                    <span>NOS TARIFS</span>
                  </a>
                </div>
              </div>
              <div className="md:w-1/2">
                <img
                  src="/taxi-paris.jpg"
                  alt="Voiture IZYMOTO de service VTC premium à Paris"
                  className="rounded-lg shadow-2xl"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section
          id="services"
          ref={featuresRef}
          className={cn(
            "py-24 bg-white transition-all duration-1000 transform",
            featuresInView
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-20"
          )}
        >
          <div className="container mx-auto px-4">
            <div className="text-center mb-20">
              <Star className="inline-block h-8 w-8 text-gold-500 mb-3" />
              <h2 className="text-5xl md:text-6xl font-bebas mb-3 relative overflow-hidden">
                <span className="inline-block transform hover:scale-110 transition-transform duration-300">
                  POURQUOI
                </span>{" "}
                <span className="inline-block transform hover:scale-110 transition-transform duration-300">
                  CHOISIR
                </span>{" "}
                <span className="inline-block text-primary transform hover:scale-110 transition-transform duration-300">
                  IZYMOTO
                </span>
              </h2>
              <div className="luxury-divider"></div>
              <p className="text-lg font-playfair text-gray-600 max-w-xl mx-auto italic">
                Un service d'exception pour ceux qui valorisent leur temps et
                leur confort
              </p>
            </div>

            {/* Asymmetric Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16">
              <div className="md:col-span-5 md:col-start-2 feature-card group">
                <div className="flex items-center mb-4">
                  <div
                    className="w-12 h-12 rounded-full bg-gold-100 flex items-center justify-center mr-4 
                               group-hover:bg-gold-200 transition-colors duration-300"
                  >
                    <Clock className="h-6 w-6 text-gold-600" />
                  </div>
                  <h3 className="text-4xl font-bebas hover-intense inline-block">
                    RAPIDITÉ
                  </h3>
                </div>
                <p className="text-xl font-playfair text-gray-700 max-w-md pl-16">
                  Gagnez un temps précieux en évitant les embouteillages
                  parisiens. Notre service vous garantit l'arrivée la plus
                  rapide possible avec des chauffeurs qui connaissent
                  parfaitement la ville.
                </p>
              </div>

              <div className="md:col-span-5 md:col-start-7 md:mt-32 feature-card group">
                <div className="flex items-center mb-4">
                  <div
                    className="w-12 h-12 rounded-full bg-gold-100 flex items-center justify-center mr-4
                               group-hover:bg-gold-200 transition-colors duration-300"
                  >
                    <ThumbsUp className="h-6 w-6 text-gold-600" />
                  </div>
                  <h3 className="text-4xl font-bebas hover-intense inline-block">
                    CONFORT
                  </h3>
                </div>
                <p className="text-xl font-playfair text-gray-700 max-w-md pl-16">
                  Équipement premium et pilotes expérimentés pour votre sécurité
                  et confort pendant tout le trajet. Nos véhicules sont récents,
                  spacieux et toujours impeccables.
                </p>
              </div>

              <div className="md:col-span-8 md:col-start-3 md:mt-16 feature-card group">
                <div className="flex items-center mb-4">
                  <div
                    className="w-12 h-12 rounded-full bg-gold-100 flex items-center justify-center mr-4
                               group-hover:bg-gold-200 transition-colors duration-300"
                  >
                    <Shield className="h-6 w-6 text-gold-600" />
                  </div>
                  <h3 className="text-4xl font-bebas hover-intense inline-block">
                    FIABILITÉ
                  </h3>
                </div>
                <p className="text-xl font-playfair text-gray-700 max-w-lg pl-16">
                  Service ponctuel et professionnel, disponible 7j/7. Nos
                  chauffeurs sont formés pour vous offrir une expérience sans
                  faille. Réservez en toute confiance pour vos trajets
                  importants.
                </p>
              </div>
            </div>
          </div>

          {/* Artistic Elements */}
          <div className="hidden md:block absolute right-0 -bottom-20 w-64 h-64 rounded-full bg-gradient-to-br from-gold-200/20 to-transparent transform -translate-x-1/2 translate-y-1/2 animate-rotate-slow"></div>
        </section>

        {/* Tarifs Section */}
        <section id="tarifs" className="py-20 bg-slate-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bebas mb-3">
                NOS <span className="text-primary">TARIFS</span>
              </h2>
              <div className="luxury-divider"></div>
              <p className="text-lg font-playfair text-gray-600 max-w-xl mx-auto">
                Des prix compétitifs et transparents pour tous vos déplacements
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Tarif 1 */}
              <div className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col h-full">
                <div className="mb-6">
                  <h3 className="text-3xl font-bebas mb-2">NAVETTE AÉROPORT</h3>
                  <div className="w-12 h-1 bg-gold-400"></div>
                </div>
                <div className="text-5xl font-bebas mb-6 text-primary">50€</div>
                <p className="text-lg text-gray-600 mb-6 flex-grow">
                  Transport depuis ou vers les aéroports de Paris (CDG, Orly).
                  Tarif fixe sans surprises.
                </p>
                <ul className="mb-8 space-y-2">
                  <li className="flex items-center">
                    <svg
                      className="h-5 w-5 text-gold-500 mr-2"
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
                      className="h-5 w-5 text-gold-500 mr-2"
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
                    Attente incluse (30 min)
                  </li>
                  <li className="flex items-center">
                    <svg
                      className="h-5 w-5 text-gold-500 mr-2"
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
                  className="text-gold-500 border border-gold-500 font-bebas py-3 px-6 text-center hover:bg-gold-500 hover:text-white transition-colors duration-300 mt-auto"
                >
                  RÉSERVER
                </a>
              </div>

              {/* Tarif 2 */}
              <div className="bg-slate-900 text-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col h-full relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-gold-500 text-white py-1 px-4 font-bebas text-sm">
                  POPULAIRE
                </div>
                <div className="mb-6">
                  <h3 className="text-3xl font-bebas mb-2">TRAJET EN VILLE</h3>
                  <div className="w-12 h-1 bg-gold-400"></div>
                </div>
                <div className="text-5xl font-bebas mb-6 text-gold-400">
                  30€
                </div>
                <p className="text-lg text-gray-300 mb-6 flex-grow">
                  Déplacements dans Paris et proche banlieue. Tarif de base pour
                  des trajets jusqu'à 10km.
                </p>
                <ul className="mb-8 space-y-2">
                  <li className="flex items-center">
                    <svg
                      className="h-5 w-5 text-gold-500 mr-2"
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
                      className="h-5 w-5 text-gold-500 mr-2"
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
                      className="h-5 w-5 text-gold-500 mr-2"
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
                    Bouteille d'eau offerte
                  </li>
                </ul>
                <a
                  href="#reservation"
                  className="bg-gold-500 text-white font-bebas py-3 px-6 text-center hover:bg-gold-400 transition-colors duration-300 mt-auto"
                >
                  RÉSERVER
                </a>
              </div>

              {/* Tarif 3 */}
              <div className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col h-full">
                <div className="mb-6">
                  <h3 className="text-3xl font-bebas mb-2">
                    MISE À DISPOSITION
                  </h3>
                  <div className="w-12 h-1 bg-gold-400"></div>
                </div>
                <div className="text-5xl font-bebas mb-6 text-primary">
                  75€/h
                </div>
                <p className="text-lg text-gray-600 mb-6 flex-grow">
                  Chauffeur à votre disposition pour plusieurs heures ou toute
                  la journée. Idéal pour les visites ou événements.
                </p>
                <ul className="mb-8 space-y-2">
                  <li className="flex items-center">
                    <svg
                      className="h-5 w-5 text-gold-500 mr-2"
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
                      className="h-5 w-5 text-gold-500 mr-2"
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
                      className="h-5 w-5 text-gold-500 mr-2"
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
                  className="text-gold-500 border border-gold-500 font-bebas py-3 px-6 text-center hover:bg-gold-500 hover:text-white transition-colors duration-300 mt-auto"
                >
                  RÉSERVER
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* About Us Section */}
        <section
          id="about"
          ref={aboutRef}
          className={cn(
            "py-20 bg-white",
            aboutInView ? "opacity-100" : "opacity-0",
            "transition-opacity duration-1000"
          )}
        >
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="md:w-1/2">
                <img
                  src="/about-izymoto.jpg"
                  alt="L'équipe de chauffeurs professionnels IZYMOTO"
                  className="rounded-lg shadow-xl"
                />
              </div>
              <div className="md:w-1/2">
                <h2 className="text-5xl font-bebas mb-6">
                  À <span className="text-primary">PROPOS</span> DE NOUS
                </h2>
                <div className="w-24 h-1 bg-gold-400 mb-6"></div>
                <p className="text-lg text-gray-700 mb-6">
                  IZYMOTO est né d'une vision simple : offrir un service de
                  transport haut de gamme, fiable et accessible à Paris. Fondée
                  par des passionnés d'automobile et d'excellence du service,
                  notre entreprise s'est rapidement fait un nom dans le secteur
                  exigeant du VTC parisien.
                </p>
                <p className="text-lg text-gray-700 mb-6">
                  Notre flotte moderne de véhicules premium et nos chauffeurs
                  expérimentés sont à votre disposition pour tous vos
                  déplacements : transferts aéroport, trajets d'affaires,
                  soirées spéciales ou visites touristiques.
                </p>
                <p className="text-lg text-gray-700 mb-6">
                  La satisfaction de nos clients est notre priorité absolue,
                  comme en témoignent nos excellentes évaluations et notre taux
                  élevé de clients fidèles.
                </p>
                <div className="flex items-center gap-4">
                  <Award className="h-10 w-10 text-gold-500" />
                  <p className="italic text-lg text-gray-600">
                    Service certifié et régulièrement contrôlé
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section with Luxury Design */}
        <section
          ref={ctaRef}
          className={cn(
            "relative py-32 bg-gray-900 text-white overflow-hidden transition-all duration-1000",
            ctaInView ? "opacity-100" : "opacity-0"
          )}
        >
          {/* Luxury background overlay */}
          <div className="absolute inset-0 bg-luxury-radial opacity-20"></div>

          <div className="container mx-auto px-4 text-center relative z-10">
            <h2 className="text-6xl md:text-7xl font-bebas mb-6 transform hover:skew-x-2 transition-transform duration-500">
              PRÊT À <span className="text-gold-400">VOYAGER AVEC CLASSE</span>{" "}
              ?
            </h2>

            <p className="text-xl font-playfair italic text-gray-300 max-w-2xl mx-auto mb-10">
              Réservez votre course et découvrez le luxe de se déplacer
              rapidement et confortablement dans Paris
            </p>

            <a
              href="#reservation"
              className="bg-gold-500 text-white font-bebas text-2xl px-12 py-4 inline-flex items-center group hover:bg-gold-400 transition-colors duration-300"
            >
              <span>RÉSERVER UN TRAJET</span>
              <ArrowRight className="ml-3 h-6 w-6 transform group-hover:translate-x-2 transition-transform duration-300" />
            </a>

            <div className="mt-16 flex flex-col md:flex-row justify-center items-center gap-8 md:gap-16">
              <div className="flex flex-col items-center">
                <div className="text-5xl font-bebas text-gold-400 mb-2">
                  7J/7
                </div>
                <p className="font-playfair text-white/70">Disponibilité</p>
              </div>
              <div className="w-0.5 h-16 bg-gold-700/30 hidden md:block"></div>
              <div className="flex flex-col items-center">
                <div className="text-5xl font-bebas text-gold-400 mb-2">
                  15 MIN
                </div>
                <p className="font-playfair text-white/70">Délai moyen</p>
              </div>
              <div className="w-0.5 h-16 bg-gold-700/30 hidden md:block"></div>
              <div className="flex flex-col items-center">
                <div className="text-5xl font-bebas text-gold-400 mb-2">
                  100%
                </div>
                <p className="font-playfair text-white/70">Satisfaction</p>
              </div>
            </div>
          </div>

          {/* Luxury decorative elements */}
          <div className="absolute top-1/3 left-1/4 w-64 h-1 bg-gold-500/20 transform -rotate-45"></div>
          <div className="absolute bottom-1/3 right-1/4 w-64 h-1 bg-gold-500/20 transform rotate-45"></div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bebas mb-3">CONTACTEZ-NOUS</h2>
              <div className="luxury-divider"></div>
              <p className="text-lg font-playfair text-gray-600 max-w-xl mx-auto">
                Une question ou besoin d'assistance ? Notre équipe est à votre
                disposition
              </p>
            </div>

            <div className="flex flex-col md:flex-row justify-center gap-12">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gold-100 flex items-center justify-center">
                  <Phone className="h-6 w-6 text-gold-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-1">Téléphone</h3>
                  <p className="text-gray-700">+33 6 52 75 35 21</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gold-100 flex items-center justify-center">
                  <svg
                    className="h-6 w-6 text-gold-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-1">Email</h3>
                  <p className="text-gray-700">contact@izymoto.com</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gold-100 flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-gold-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-1">Adresse</h3>
                  <p className="text-gray-700">
                    31 rue des Etudiants 92026, Courbevoie
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social Section with Luxury Interactive Elements */}
        <section className="py-16 bg-slate-50">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bebas mb-8 inline-block relative">
              <span className="relative z-10">SUIVEZ-NOUS</span>
              <span className="absolute bottom-0 left-0 w-full h-1 bg-gold-400 transform scale-x-0 hover:scale-x-100 transition-transform duration-500"></span>
            </h2>

            <p className="text-lg font-playfair text-gray-600 max-w-xl mx-auto mb-10">
              Suivez-nous sur les réseaux sociaux pour rester informé de nos
              actualités, promotions et services
            </p>

            <div className="flex justify-center space-x-10 md:space-x-16">
              <a
                href="https://facebook.com/izymoto"
                className="social-icon group"
              >
                <span className="sr-only">Facebook</span>
                <div className="relative">
                  <Facebook className="h-10 w-10 text-gray-700 hover:text-blue-600 transition-colors duration-300" />
                  <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs font-playfair opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Facebook
                  </span>
                </div>
              </a>
              <a
                href="https://instagram.com/izymoto_paris"
                className="social-icon group"
              >
                <span className="sr-only">Instagram</span>
                <div className="relative">
                  <Instagram className="h-10 w-10 text-gray-700 hover:text-pink-600 transition-colors duration-300" />
                  <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs font-playfair opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Instagram
                  </span>
                </div>
              </a>
              <a
                href="https://linkedin.com/company/izymoto"
                className="social-icon group"
              >
                <span className="sr-only">LinkedIn</span>
                <div className="relative">
                  <Linkedin className="h-10 w-10 text-gray-700 hover:text-blue-700 transition-colors duration-300" />
                  <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs font-playfair opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    LinkedIn
                  </span>
                </div>
              </a>
            </div>
          </div>
        </section>

        {/* Footer with contact info and links */}
        <footer className="bg-slate-900 text-white py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
              {/* Logo and intro */}
              <div className="md:col-span-1">
                <img
                  src="/Izymoto1.svg"
                  alt="Logo IZYMOTO"
                  className="h-12 mb-4"
                />
                <p className="text-gray-400 mb-4">
                  Service de transport VTC premium à Paris et en Île-de-France.
                  Navettes aéroports, trajets professionnels et sorties.
                </p>
              </div>

              {/* Quick Links */}
              <div className="md:col-span-1">
                <h3 className="text-xl font-bebas mb-6">LIENS RAPIDES</h3>
                <ul className="space-y-3">
                  <li>
                    <a
                      href="#reservation"
                      className="text-gray-400 hover:text-gold-400 transition-colors duration-300"
                    >
                      Réserver
                    </a>
                  </li>
                  <li>
                    <a
                      href="#tarifs"
                      className="text-gray-400 hover:text-gold-400 transition-colors duration-300"
                    >
                      Nos tarifs
                    </a>
                  </li>
                  <li>
                    <a
                      href="#services"
                      className="text-gray-400 hover:text-gold-400 transition-colors duration-300"
                    >
                      Services
                    </a>
                  </li>
                  <li>
                    <a
                      href="#about"
                      className="text-gray-400 hover:text-gold-400 transition-colors duration-300"
                    >
                      À propos
                    </a>
                  </li>
                  <li>
                    <a
                      href="#contact"
                      className="text-gray-400 hover:text-gold-400 transition-colors duration-300"
                    >
                      Contact
                    </a>
                  </li>
                </ul>
              </div>

              {/* Contact Info */}
              <div className="md:col-span-1">
                <h3 className="text-xl font-bebas mb-6">CONTACT</h3>
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <Phone className="h-5 w-5 text-gold-400 mt-1 mr-3 flex-shrink-0" />
                    <span className="text-gray-400">+33 652753521</span>
                  </li>
                  <li className="flex items-start">
                    <svg
                      className="h-5 w-5 text-gold-400 mt-1 mr-3 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="text-gray-400">contact@izymoto.com</span>
                  </li>
                  <li className="flex items-start">
                    <MapPin className="h-5 w-5 text-gold-400 mt-1 mr-3 flex-shrink-0" />
                    <span className="text-gray-400">
                      1 Rue de Paris, 75001 Paris
                    </span>
                  </li>
                </ul>
              </div>

              {/* Newsletter */}
              <div className="md:col-span-1">
                <h3 className="text-xl font-bebas mb-6">NEWSLETTER</h3>
                <p className="text-gray-400 mb-4">
                  Inscrivez-vous pour recevoir nos offres spéciales
                </p>
                <form className="flex flex-col space-y-4">
                  <input
                    type="email"
                    placeholder="Votre email"
                    className="bg-slate-800 border border-slate-700 px-4 py-2 focus:outline-none focus:border-gold-400 transition-colors duration-300"
                  />
                  <button
                    type="submit"
                    className="bg-gold-500 text-white font-bebas px-4 py-2 hover:bg-gold-400 transition-colors duration-300"
                  >
                    S'INSCRIRE
                  </button>
                </form>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-500 text-sm mb-4 md:mb-0">
                © {new Date().getFullYear()} IZYMOTO. Tous droits réservés.
              </p>
              <div className="flex space-x-6">
                <a
                  href="/mentions-legales"
                  className="text-gray-500 hover:text-gold-400 text-sm transition-colors duration-300"
                >
                  Mentions légales
                </a>
                <a
                  href="/politique-de-confidentialite"
                  className="text-gray-500 hover:text-gold-400 text-sm transition-colors duration-300"
                >
                  Politique de confidentialité
                </a>
                <a
                  href="/cgv"
                  className="text-gray-500 hover:text-gold-400 text-sm transition-colors duration-300"
                >
                  CGV
                </a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </MapWrapper>
  );
}

// Composant HomeReservationSection mis à jour pour la page d'accueil
function HomeReservationSection() {
  const {
    depart,
    setDepart,
    arrivee,
    setArrivee,
    directions,
    prix,
    distance,
    duree,
    prioriteReservation,
    setPrioriteReservation,
    prixFinal,
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
    proceedToReservation,
    proceedToPayment,
    handlePaymentSuccess,
    handleRequestDevis,
    resetForm,
  } = useReservation();

  return (
    <>
      <ReservationForm customContainerClass="gap-8 md:gap-12 items-center" />

      {/* Modals pour le processus de réservation */}
      {currentStep === "devis" && (
        <DevisModal
          depart={depart}
          arrivee={arrivee}
          distance={distance}
          duree={duree}
          prix={prix}
          prioriteReservation={prioriteReservation}
          setPrioriteReservation={setPrioriteReservation}
          onCancel={() => setCurrentStep("form")}
          onProceed={proceedToReservation}
          onRequestDevis={handleRequestDevis}
          reservationDate={reservationDate}
          setReservationDate={setReservationDate}
        />
      )}

      {currentStep === "guest_info" && (
        <GuestInformationModal
          onSubmit={(
            guestData:
              | {
                  email?: string;
                  phone?: string;
                  name?: string;
                  notes?: string;
                }
              | undefined
          ) => {
            handleRequestDevis(guestData);
          }}
          onCancel={() => setCurrentStep("devis")}
        />
      )}

      {currentStep === "reservation" && (
        <ReservationModal
          reservationDate={reservationDate}
          setReservationDate={setReservationDate}
          name={name}
          setName={setName}
          phone={phone}
          setPhone={setPhone}
          notes={notes}
          setNotes={setNotes}
          onCancel={() => setCurrentStep("devis")}
          onProceed={proceedToPayment}
        />
      )}

      {currentStep === "payment" && (
        <PaymentModal
          prixFinal={prixFinal}
          bookingData={bookingData}
          reservationDate={reservationDate}
          onSuccess={handlePaymentSuccess}
          onCancel={() => setCurrentStep("reservation")}
        />
      )}

      {currentStep === "confirmation" && (
        <ConfirmationModal
          reservationId={reservationId}
          formattedReservationDate={formattedReservationDate}
          depart={depart}
          arrivee={arrivee}
          onClose={resetForm}
        />
      )}
    </>
  );
}
