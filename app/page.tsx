"use client";

import MapContainer from "@/app/reserver/components/MapContainer";
import SearchForm from "@/app/reserver/components/SearchForm";
import { identifierZone, estimerPrix } from "@/app/reserver/utils/pricingUtils";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useJsApiLoader } from "@react-google-maps/api";
import { ArrowRight, Facebook, Instagram, Linkedin, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { useInView } from "react-intersection-observer";

const Home = () => {
  // Etat de calcule de la route

  const [depart, setDepart] = useState("");
  const [arrivee, setArrivee] = useState("");
  const [directions, setDirections] =
    useState<google.maps.DirectionsResult | null>(null);
  const [prix, setPrix] = useState(null);
  const [distance, setDistance] = useState(null);
  const [duree, setDuree] = useState(null);
  const { user, setReservationDetails } = useAuth();
  const router = useRouter();

  const [calculCompleted, setCalculCompleted] = useState(false);

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

  // Google Maps libraries
  const libraries = ["places"];

  // Chargement de l'API Google Maps
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const calculateRoute = () => {
    if (!depart || !arrivee) return;

    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin: depart,
        destination: arrivee,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
          setDirections(result);

          const route = result.routes[0];
          const leg = route.legs[0];
          const distanceEnMetres = leg.distance.value;
          const distanceEnKm = distanceEnMetres / 1000;
          const dureeEnMinutes = Math.ceil(leg.duration.value / 60);

          setDistance(distanceEnKm);
          setDuree(dureeEnMinutes);

          const departZone = identifierZone(depart);
          const arriveeZone = identifierZone(arrivee);

          const prixEstime = estimerPrix(departZone, arriveeZone, distanceEnKm);
          setPrix(prixEstime);

          // Marquer le calcul comme complété pour afficher le bouton
          setCalculCompleted(true);
        } else {
          console.error(`Erreur lors du calcul de l'itinéraire: ${status}`);
        }
      }
    );
  };
  const handleReservation = () => {
    console.log("handleReservation appelé");
    console.log("Données:", { depart, arrivee, distance, duree, prix });

    const details = {
      depart,
      arrivee,
      distance,
      duree,
      prix,
    };

    console.log("Détails à enregistrer:", details);

    try {
      // Enregistrer les détails dans le contexte d'authentification
      setReservationDetails(details);

      // Stockage de secours dans localStorage
      localStorage.setItem("pendingReservation", JSON.stringify(details));

      console.log("Détails enregistrés avec succès");

      // Vérifier si l'utilisateur est déjà connecté
      if (user) {
        console.log("Utilisateur déjà connecté, redirection vers /reserver");
        router.push("/reserver");
      } else {
        console.log("Utilisateur non connecté, redirection vers /connexion");
        router.push("/connexion");
      }
    } catch (error) {
      console.error("Erreur lors de l'enregistrement des détails:", error);
    }
  };
  return (
    <main className="bg-background overflow-x-hidden min-h-screen">
      {/* Reservation Section */}
      <section className="relative bg-white">
        <div className="container mx-auto px-20 md:px-40 py-12 grid md:grid-cols-2 gap-8 items-start">
          {/* Colonne de gauche - Formulaire */}
          <div className="w-full flex flex-col">
            <div className="w-full max-w-md">
              <h1 className="text-4xl font-bold mb-4 text-black">
                Où souhaitez-vous être déposé ?
              </h1>

              <div className="space-y-4">
                <SearchForm
                  isLoaded={isLoaded}
                  depart={depart}
                  setDepart={setDepart}
                  arrivee={arrivee}
                  setArrivee={setArrivee}
                  prix={prix}
                  distance={distance}
                  duree={duree}
                  calculateRoute={calculateRoute}
                  customInputClass="w-full bg-gray-100 border-none focus:ring-2 focus:ring-black py-3 px-4 rounded-lg"
                  customButtonClass="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition-colors text-left pl-4"
                />
              </div>

              {/* Affichage des détails du trajet */}
              {prix && (
                <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                  <h2 className="text-xl font-bold mb-4">Détails du trajet</h2>
                  <div className="space-y-2">
                    <p>Départ: {depart}</p>
                    <p>Arrivée: {arrivee}</p>
                    <p>Distance: {distance?.toFixed(2)} km</p>
                    <p>Durée estimée: {duree} minutes</p>
                    <p>Prix estimé: {prix.toFixed(2)} €</p>
                  </div>

                  {/* Bouton de réservation qui apparaît après le calcul */}
                  {calculCompleted && (
                    <button
                      onClick={handleReservation}
                      className="mt-4 w-full bg-primary text-white py-3 rounded-lg hover:bg-primary-dark transition-colors"
                    >
                      Réserver cette course
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Colonne de droite - Carte */}
          <div className="w-full">
            {isLoaded && (
              <div className="p-4 ">
                <div className="h-[500px] w-full rounded-md overflow-hidden">
                  <MapContainer isLoaded={isLoaded} directions={directions} />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
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
              Un service d'exception pour ceux qui valorisent leur temps
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
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-gold-600"
                  >
                    <path
                      d="M12 8V12L15 15"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
                <h3 className="text-4xl font-bebas hover-intense inline-block">
                  RAPIDITÉ
                </h3>
              </div>
              <p className="text-xl font-playfair text-gray-700 max-w-md pl-16">
                Gagnez un temps précieux en évitant les embouteillages
                parisiens. Notre service vous garantit l'arrivée la plus rapide
                possible.
              </p>
            </div>

            <div className="md:col-span-5 md:col-start-7 md:mt-32 feature-card group">
              <div className="flex items-center mb-4">
                <div
                  className="w-12 h-12 rounded-full bg-gold-100 flex items-center justify-center mr-4
                               group-hover:bg-gold-200 transition-colors duration-300"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-gold-600"
                  >
                    <path
                      d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3 className="text-4xl font-bebas hover-intense inline-block">
                  CONFORT
                </h3>
              </div>
              <p className="text-xl font-playfair text-gray-700 max-w-md pl-16">
                Équipement premium et pilotes expérimentés pour votre sécurité
                et confort pendant tout le trajet.
              </p>
            </div>

            <div className="md:col-span-8 md:col-start-3 md:mt-16 feature-card group">
              <div className="flex items-center mb-4">
                <div
                  className="w-12 h-12 rounded-full bg-gold-100 flex items-center justify-center mr-4
                               group-hover:bg-gold-200 transition-colors duration-300"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-gold-600"
                  >
                    <path
                      d="M22 12H18L15 21L9 3L6 12H2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3 className="text-4xl font-bebas hover-intense inline-block">
                  FIABILITÉ
                </h3>
              </div>
              <p className="text-xl font-playfair text-gray-700 max-w-lg pl-16">
                Service ponctuel et professionnel, disponible 7j/7. Nos
                chauffeurs sont formés pour vous offrir une expérience sans
                faille.
              </p>
            </div>
          </div>
        </div>

        {/* Artistic Elements */}
        <div className="hidden md:block absolute right-0 -bottom-20 w-64 h-64 rounded-full bg-gradient-to-br from-gold-200/20 to-transparent transform -translate-x-1/2 translate-y-1/2 animate-rotate-slow"></div>
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
            PRÊT À <span className="text-gold-400">VOYAGER AVEC CLASSE</span> ?
          </h2>

          <p className="text-xl font-playfair italic text-gray-300 max-w-2xl mx-auto mb-10">
            Réservez votre course et découvrez le luxe de se déplacer rapidement
            et confortablement dans Paris
          </p>

          <a
            href="/reserver"
            className="bg-gold-500 text-white font-bebas text-2xl px-12 py-4 inline-flex items-center group hover:bg-gold-400 transition-colors duration-300"
          >
            <span>RÉSERVER UN TRAJET</span>
            <ArrowRight className="ml-3 h-6 w-6 transform group-hover:translate-x-2 transition-transform duration-300" />
          </a>

          <div className="mt-16 flex flex-col md:flex-row justify-center items-center gap-8 md:gap-16">
            <div className="flex flex-col items-center">
              <div className="text-5xl font-bebas text-gold-400 mb-2">7J/7</div>
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
              <div className="text-5xl font-bebas text-gold-400 mb-2">100%</div>
              <p className="font-playfair text-white/70">Satisfaction</p>
            </div>
          </div>
        </div>

        {/* Luxury decorative elements */}
        <div className="absolute top-1/3 left-1/4 w-64 h-1 bg-gold-500/20 transform -rotate-45"></div>
        <div className="absolute bottom-1/3 right-1/4 w-64 h-1 bg-gold-500/20 transform rotate-45"></div>
      </section>

      {/* Social Section with Luxury Interactive Elements */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bebas mb-12 inline-block relative">
            <span className="relative z-10">SUIVEZ-NOUS</span>
            <span className="absolute bottom-0 left-0 w-full h-1 bg-gold-400 transform scale-x-0 hover:scale-x-100 transition-transform duration-500"></span>
          </h2>

          <div className="flex justify-center space-x-10 md:space-x-16">
            <a href="https://facebook.com" className="social-icon group">
              <span className="sr-only">Facebook</span>
              <div className="relative">
                <Facebook className="h-8 w-8" />
                <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs font-playfair opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  Facebook
                </span>
              </div>
            </a>
            <a href="https://instagram.com" className="social-icon group">
              <span className="sr-only">Instagram</span>
              <div className="relative">
                <Instagram className="h-8 w-8" />
                <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs font-playfair opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  Instagram
                </span>
              </div>
            </a>
            <a href="https://linkedin.com" className="social-icon group">
              <span className="sr-only">LinkedIn</span>
              <div className="relative">
                <Linkedin className="h-8 w-8" />
                <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs font-playfair opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  LinkedIn
                </span>
              </div>
            </a>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Home;
