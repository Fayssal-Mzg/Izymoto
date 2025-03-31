// app/reserver/page.jsx
"use client";

import ConfirmationModal from "./components/ConfirmationModal";
import DevisModal from "./components/DevisModal";
import MapContainer from "./components/MapContainer";
import PaymentModal from "./components/PaymentModal";
import ReservationModal from "./components/ReservationModal";
import SearchForm from "./components/SearchForm";
import { identifierZone, estimerPrix } from "./utils/pricingUtils";
import { useAuth } from "@/contexts/AuthContext";
import { saveBooking } from "@/lib/firebase/bookings";
import { useJsApiLoader } from "@react-google-maps/api";
import { useState } from "react";

// Bibliothèques Google Maps nécessaires
const libraries = ["places"];

export default function ReserverPage() {
  // États pour les données de réservation
  const [depart, setDepart] = useState("");
  const [arrivee, setArrivee] = useState("");
  const [directions, setDirections] = useState(null);
  const [prix, setPrix] = useState(null);
  const [distance, setDistance] = useState(null);
  const [duree, setDuree] = useState(null);

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

  // Récupérer l'utilisateur connecté
  const { user } = useAuth();

  // Chargement de l'API Google Maps
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  // Calcul de l'itinéraire
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
    <div className="relative w-full h-[calc(100vh-120px)] overflow-hidden">
      {/* Google Maps */}
      <MapContainer isLoaded={isLoaded} directions={directions} />

      {/* Formulaire de recherche - ajustement de la position */}
      <div className="absolute bottom-0 left-0 w-full bg-black/80 backdrop-blur-md p-4 text-white flex flex-col space-y-4">
        <h2 className="text-center text-xl font-semibold">
          Réserver un trajet
        </h2>

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

      {/* Modaux */}
      {showDevisModal && (
        <DevisModal
          depart={depart}
          arrivee={arrivee}
          distance={distance}
          duree={duree}
          prix={prix}
          prioriteReservation={prioriteReservation}
          setPrioriteReservation={setPrioriteReservation}
          onCancel={() => setShowDevisModal(false)}
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
          reservationDate={reservationDate} // Ajoutez cette prop
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
    </div>
  );
}
