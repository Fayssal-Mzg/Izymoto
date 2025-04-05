"use client";

import ConfirmationModal from "@/app/reserver/components/ConfirmationModal";
import DevisModal from "@/app/reserver/components/DevisModal";
// Import des composants de la page de réservation
import MapContainer from "@/app/reserver/components/MapContainer";
import PaymentModal from "@/app/reserver/components/PaymentModal";
import ReservationModal from "@/app/reserver/components/ReservationModal";
import SearchForm from "@/app/reserver/components/SearchForm";
import { identifierZone, estimerPrix } from "@/app/reserver/utils/pricingUtils";
import { useAuth } from "@/contexts/AuthContext";
import { saveBooking } from "@/lib/firebase/bookings";
import { cn } from "@/lib/utils";
import { useJsApiLoader } from "@react-google-maps/api";
import { Clock, Shield, Award, Star } from "lucide-react";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { useInView } from "react-intersection-observer";

// Bibliothèques Google Maps nécessaires
const libraries = ["places"];

export default function Home() {
  // États pour les données de réservation
  const [depart, setDepart] = useState("");
  const [arrivee, setArrivee] = useState("");
  const [directions, setDirections] =
    useState<google.maps.DirectionsResult | null>(null);
  const [prix, setPrix] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [duree, setDuree] = useState<number | null>(null);

  // États pour les modaux
  const [showDevisModal, setShowDevisModal] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  // États pour les options et détails
  const [prioriteReservation, setPrioriteReservation] = useState(false);
  const [prixFinal, setPrixFinal] = useState(0);
  const [reservationDate, setReservationDate] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [reservationId, setReservationId] = useState("");
  const [formattedReservationDate, setFormattedReservationDate] = useState("");
  const { user, reservationDetails, clearReservationDetails } = useAuth();

  useEffect(() => {
    if (reservationDetails) {
      // Pré-remplir les champs avec les données existantes
      setDepart(reservationDetails.depart);
      setArrivee(reservationDetails.arrivee);
      setPrix(reservationDetails.prix);
      setDistance(reservationDetails.distance);
      setDuree(reservationDetails.duree);

      // Afficher automatiquement le modal de devis (optionnel)
      const timer = setTimeout(() => {
        setShowDevisModal(true);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [reservationDetails]);

  // Référence pour l'animation au défilement
  const { ref: featuresRef, inView: featuresInView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  // Animation pour les témoignages
  const { ref: testimonialsRef, inView: testimonialsInView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  // Chargement de l'API Google Maps
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  // Calcul de l'itinéraire
  const calculateRoute = () => {
    // Si nous avons déjà toutes les données nécessaires, ouvrir directement le modal
    if (depart && arrivee && prix && distance && duree) {
      setShowDevisModal(true);
      return;
    }

    // Sinon, procéder au calcul normal
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
          setPrixFinal(prixEstime);

          setShowDevisModal(true);
        } else {
          console.error(`Erreur lors du calcul de l'itinéraire: ${status}`);
        }
      }
    );
  };

  // Gestionnaires pour les transitions entre modaux
  const proceedToReservation = () => {
    setPrixFinal(prioriteReservation ? prix + 20 : prix);
    setShowDevisModal(false);
    setShowReservationModal(true);
  };

  const proceedToPayment = () => {
    if (!name || !phone || !reservationDate) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    setShowReservationModal(false);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async (paymentId) => {
    // Générer l'ID et formater la date comme avant
    const randomId = Math.random().toString(36).substring(2, 10).toUpperCase();
    setReservationId(randomId);

    const date = new Date(reservationDate);
    const formattedDate =
      date.toLocaleDateString() + " à " + date.toLocaleTimeString();
    setFormattedReservationDate(formattedDate);

    // Ajouter la sauvegarde dans Firestore
    if (user) {
      try {
        // Préparer l'objet de réservation avec toutes les données nécessaires
        const bookingWithPayment = {
          ...bookingData,
          paymentId,
          reservationId: randomId,
          reservationDate: date,
          dateFormatted: formattedDate,
          status: "confirmed",
          price: prixFinal,
        };

        // Appeler la fonction pour sauvegarder dans Firestore
        await saveBooking(bookingWithPayment, user.uid);
        console.log("Réservation enregistrée avec succès:", randomId);
        clearReservationDetails();
      } catch (error) {
        console.error(
          "Erreur lors de l'enregistrement de la réservation:",
          error
        );
        // On continue malgré l'erreur pour ne pas bloquer l'utilisateur
      }
    } else {
      console.log("Utilisateur non connecté, réservation non enregistrée");
    }

    // Continuer comme avant
    setShowPaymentModal(false);
    setShowConfirmationModal(true);
  };

  const resetForm = () => {
    setDepart("");
    setArrivee("");
    setDirections(null);
    setPrix(null);
    setDistance(null);
    setDuree(null);
    setPrioriteReservation(false);
    setPrixFinal(0);
    setReservationDate("");
    setName("");
    setPhone("");
    setNotes("");
  };

  const bookingData = {
    depart,
    arrivee,
    prix: prixFinal,
    distance,
    duree,
    name,
    phone,
    reservationDate,
    notes,
    prioriteReservation,
  };

  return (
    <main className="bg-background min-h-screen">
      {/* Section principale avec carte et formulaire superposé en bas */}
      <section className="relative h-[calc(100vh-140px-64px)] bg-white">
        {/* Conteneur de la carte Google Maps (occupe tout l'espace) */}
        <div className="absolute inset-0">
          <MapContainer isLoaded={isLoaded} directions={directions} />
        </div>

        {/* Formulaire de recherche fixé en bas */}
        <div className="absolute bottom-0 left-0 right-0 w-full bg-black/80 backdrop-blur-sm py-4 md:py-6 z-10">
          <div className="container mx-auto px-4">
            <div className="max-w-lg mx-auto md:max-w-none">
              <h1 className="text-xl md:text-2xl font-medium mb-4 text-white text-center md:text-left">
                Réserver un trajet
              </h1>
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
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section caractéristiques */}
      <section
        ref={featuresRef}
        className={cn(
          "py-20 bg-white transition-all duration-1000 transform",
          featuresInView
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-20"
        )}
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-medium mb-3">
              Pourquoi choisir IzyMoto
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              Un service de qualité pour vos déplacements à Paris et en région
              parisienne
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Feature 1 */}
            <div className="p-6 rounded-lg transition-all duration-300 hover:shadow-lg">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center mr-4">
                  <Clock className="h-6 w-6 text-black" />
                </div>
                <h3 className="text-xl font-medium">Rapidité</h3>
              </div>
              <p className="text-gray-600">
                Évitez les embouteillages parisiens et gagnez un temps précieux
                grâce à nos moto-taxis.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-lg transition-all duration-300 hover:shadow-lg">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center mr-4">
                  <Shield className="h-6 w-6 text-black" />
                </div>
                <h3 className="text-xl font-medium">Sécurité</h3>
              </div>
              <p className="text-gray-600">
                Des chauffeurs expérimentés et un équipement de protection
                complet pour votre sécurité.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-lg transition-all duration-300 hover:shadow-lg">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center mr-4">
                  <Award className="h-6 w-6 text-black" />
                </div>
                <h3 className="text-xl font-medium">Fiabilité</h3>
              </div>
              <p className="text-gray-600">
                Service ponctuel et professionnel disponible 7j/7 pour tous vos
                déplacements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section témoignages */}
      <section
        ref={testimonialsRef}
        className={cn(
          "py-20 bg-gray-50",
          testimonialsInView ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-medium mb-12 text-center">
            Ce que disent nos clients
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Témoignage 1 */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center mb-4">
                <div className="mr-4">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold">
                    S
                  </div>
                </div>
                <div>
                  <h4 className="font-medium">Sophie M.</h4>
                  <div className="flex text-amber-400">
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                  </div>
                </div>
              </div>
              <p className="text-gray-600">
                "Service impeccable ! Chauffeur ponctuel et courtois. Parfait
                pour éviter les embouteillages et arriver à l'heure à mes
                rendez-vous."
              </p>
            </div>

            {/* Témoignage 2 */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center mb-4">
                <div className="mr-4">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold">
                    T
                  </div>
                </div>
                <div>
                  <h4 className="font-medium">Thomas L.</h4>
                  <div className="flex text-amber-400">
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                  </div>
                </div>
              </div>
              <p className="text-gray-600">
                "Je prends régulièrement IzyMoto pour me rendre à l'aéroport.
                Toujours à l'heure, jamais de stress. Je recommande vivement !"
              </p>
            </div>

            {/* Témoignage 3 */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center mb-4">
                <div className="mr-4">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold">
                    L
                  </div>
                </div>
                <div>
                  <h4 className="font-medium">Laura D.</h4>
                  <div className="flex text-amber-400">
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                  </div>
                </div>
              </div>
              <p className="text-gray-600">
                "Gain de temps considérable dans Paris. Chauffeurs
                professionnels et équipement de qualité. C'est désormais mon
                mode de transport favori."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section CTA */}
      <section className="py-20 bg-black text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-medium mb-6">
            Prêt à gagner du temps dans Paris ?
          </h2>

          <p className="text-gray-300 max-w-2xl mx-auto mb-10">
            Évitez les embouteillages et arrivez à destination rapidement avec
            notre service de moto-taxi premium.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/reserver"
              className="bg-white text-black px-6 py-3 rounded-lg font-medium inline-flex items-center hover:bg-gray-100 transition duration-300"
            >
              Réserver maintenant
            </Link>

            <Link
              href="/nos-tarifs"
              className="px-6 py-3 border border-white/40 rounded-lg font-medium hover:bg-white/10 transition duration-300"
            >
              Voir nos tarifs
            </Link>
          </div>

          <div className="mt-16 flex flex-col sm:flex-row justify-center items-center gap-8 md:gap-16">
            <div className="flex flex-col items-center">
              <div className="text-3xl font-medium mb-2">7J/7</div>
              <p className="text-gray-400">Disponibilité</p>
            </div>
            <div className="hidden sm:block w-px h-16 bg-gray-800"></div>
            <div className="flex flex-col items-center">
              <div className="text-3xl font-medium mb-2">15 MIN</div>
              <p className="text-gray-400">Délai moyen</p>
            </div>
            <div className="hidden sm:block w-px h-16 bg-gray-800"></div>
            <div className="flex flex-col items-center">
              <div className="text-3xl font-medium mb-2">100%</div>
              <p className="text-gray-400">Satisfaction</p>
            </div>
          </div>
        </div>
      </section>
      {showDevisModal && (
        <DevisModal
          depart={depart}
          arrivee={arrivee}
          distance={distance}
          duree={duree}
          prix={prix}
          prioriteReservation={prioriteReservation}
          setPrioriteReservation={setPrioriteReservation}
          onCancel={() => {
            // Fermer le modal
            setShowDevisModal(false);

            // Toujours réinitialiser les données du formulaire, quelle que soit leur origine
            resetForm();

            // Si des données étaient stockées dans le contexte, les effacer également
            if (reservationDetails) {
              clearReservationDetails();
            }
          }}
          onProceed={proceedToReservation}
        />
      )}
      {showReservationModal && (
        <ReservationModal
          reservationDate={reservationDate}
          setReservationDate={setReservationDate}
          name={name}
          setName={setName}
          phone={phone}
          setPhone={setPhone}
          notes={notes}
          setNotes={setNotes}
          onCancel={() => {
            setShowReservationModal(false);
            setShowDevisModal(true);
          }}
          onProceed={proceedToPayment}
        />
      )}

      {showPaymentModal && (
        <PaymentModal
          prixFinal={prixFinal}
          bookingData={bookingData}
          reservationDate={reservationDate}
          onSuccess={handlePaymentSuccess}
          onCancel={() => {
            setShowPaymentModal(false);
            setShowReservationModal(true);
          }}
        />
      )}

      {showConfirmationModal && (
        <ConfirmationModal
          reservationId={reservationId}
          formattedReservationDate={formattedReservationDate}
          depart={depart}
          arrivee={arrivee}
          onClose={() => {
            setShowConfirmationModal(false);
            resetForm();
          }}
        />
      )}
    </main>
  );
}
