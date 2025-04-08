// app/reserver/page.tsx
"use client";

import ConfirmationModal from "@/app/reserver/components/ConfirmationModal";
import DevisModal from "@/app/reserver/components/DevisModal";
import MapContainer from "@/app/reserver/components/MapContainer";
import PaymentModal from "@/app/reserver/components/PaymentModal";
import ReservationModal from "@/app/reserver/components/ReservationModal";
import SearchForm from "@/app/reserver/components/SearchForm";
import { identifierZone, estimerPrix } from "@/app/reserver/utils/pricingUtils";
import { useAuth } from "@/contexts/AuthContext";
import { saveBooking } from "@/lib/firebase/bookings";
import { useJsApiLoader } from "@react-google-maps/api";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";

// Bibliothèques Google Maps nécessaires
const libraries = ["places"];

export default function ReservationPage() {
  const router = useRouter();
  const { user, reservationDetails, clearReservationDetails } = useAuth();

  // États pour les données de réservation
  const [depart, setDepart] = useState("");
  const [arrivee, setArrivee] = useState("");
  const [directions, setDirections] = useState(null);
  const [prix, setPrix] = useState(null);
  const [distance, setDistance] = useState(null);
  const [duree, setDuree] = useState(null);

  // États pour les options de réservation
  const [prioriteReservation, setPrioriteReservation] = useState(false);
  const [prixFinal, setPrixFinal] = useState(0);
  const [reservationDate, setReservationDate] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  // États pour la confirmation
  const [reservationId, setReservationId] = useState("");
  const [formattedReservationDate, setFormattedReservationDate] = useState("");

  // États pour les modaux
  const [currentStep, setCurrentStep] = useState("form"); // form, devis, reservation, payment, confirmation

  // Chargement de l'API Google Maps
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  // Récupérer les détails de réservation si disponibles
  useEffect(() => {
    if (reservationDetails) {
      // Pré-remplir les champs avec les données existantes
      setDepart(reservationDetails.depart);
      setArrivee(reservationDetails.arrivee);
      setPrix(reservationDetails.prix);
      setDistance(reservationDetails.distance);
      setDuree(reservationDetails.duree);

      // Passer automatiquement à l'étape du devis
      setCurrentStep("devis");
    }
  }, [reservationDetails]);

  // Vérifier si l'utilisateur est connecté et rediriger si nécessaire
  useEffect(() => {
    // Cette vérification est faite pour les étapes qui nécessitent d'être connecté
    if ((currentStep === "reservation" || currentStep === "payment") && !user) {
      // Sauvegarder les détails avant la redirection
      const details = {
        depart,
        arrivee,
        distance,
        duree,
        prix,
      };

      // Enregistrer les détails dans le contexte d'authentification
      if (depart && arrivee && prix) {
        clearReservationDetails(); // Nettoyage préventif
        setTimeout(() => {
          // Utilisation d'un timeout pour éviter les problèmes de timing
          console.log("Sauvegarde des détails avant redirection:", details);
          localStorage.setItem("pendingReservation", JSON.stringify(details));
          router.push("/connexion");
        }, 100);
      }
    }
  }, [currentStep, user, depart, arrivee, distance, duree, prix, router]);

  // Calcul de l'itinéraire
  const calculateRoute = () => {
    // Si nous avons déjà toutes les données nécessaires, ouvrir directement le modal
    if (depart && arrivee && prix && distance && duree) {
      setCurrentStep("devis");
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

          setCurrentStep("devis");
        } else {
          console.error(`Erreur lors du calcul de l'itinéraire: ${status}`);
        }
      }
    );
  };

  // Gestionnaires pour les transitions entre modaux
  const proceedToReservation = () => {
    setPrixFinal(prioriteReservation ? prix + 20 : prix);

    // Vérifier si l'utilisateur est connecté
    if (!user) {
      // Sauvegarder les détails avant de rediriger
      const details = {
        depart,
        arrivee,
        distance,
        duree,
        prix: prioriteReservation ? prix + 20 : prix,
      };
      localStorage.setItem("pendingReservation", JSON.stringify(details));
      router.push("/connexion");
    } else {
      setCurrentStep("reservation");
    }
  };

  const proceedToPayment = () => {
    if (!name || !reservationDate) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    setCurrentStep("payment");
  };

  const handlePaymentSuccess = async (paymentId) => {
    // Générer l'ID et formater la date
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
    }

    setCurrentStep("confirmation");
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
    setCurrentStep("form");
    clearReservationDetails();
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
      {/* Section principale avec carte et formulaire */}
      <section className="relative min-h-[calc(100vh-140px)] bg-white">
        {/* Conteneur de la carte Google Maps */}
        <div className="absolute inset-0">
          <MapContainer isLoaded={isLoaded} directions={directions} />
        </div>

        {/* Formulaire de recherche superposé */}
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
          onCancel={() => {
            setCurrentStep("form");
            if (reservationDetails) {
              clearReservationDetails();
            }
          }}
          onProceed={proceedToReservation}
        />
      )}

      {currentStep === "reservation" && (
        <ReservationModal
          reservationDate={reservationDate}
          setReservationDate={setReservationDate}
          name={name}
          setName={setName}
          phone={phone} // Gardé par compatibilité mais ne sera pas affiché
          setPhone={setPhone} // Gardé par compatibilité mais ne sera pas utilisé
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
    </main>
  );
}
