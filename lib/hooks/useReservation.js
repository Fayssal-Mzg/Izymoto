"use client";

import { handleSuccessfulPayment } from "../services/paymentService";
import { identifierZone, estimerPrix } from "@/app/reserver/utils/pricingUtils";
import { useAuth } from "@/contexts/AuthContext";
import {
  sendClientConfirmationEmail,
  sendDevisEmails,
} from "@/lib/emails/confirmationEmail";
import { saveBooking } from "@/lib/firebase/bookings";
import { getDoc, doc, setDoc, getFirestore } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

// Types en commentaires pour documentation (pas d'interfaces en .js)
// ReservationDetails: { depart, arrivee, distance, duree, prix }
// BookingData: ReservationDetails + { name, phone, reservationDate, notes, prioriteReservation, prixFinal }

// ReservationStep: "form" | "devis" | "guest_info" | "reservation" | "payment" | "confirmation" | "devis_sent"

export function useReservation() {
  // États pour les données de base de la réservation
  const [depart, setDepart] = useState("");
  const [arrivee, setArrivee] = useState("");
  const [directions, setDirections] = useState(null);
  const [prix, setPrix] = useState(null);
  const [distance, setDistance] = useState(null);
  const [duree, setDuree] = useState(null);
  const [calculCompleted, setCalculCompleted] = useState(false);

  // États pour les options de réservation
  const [prioriteReservation, setPrioriteReservation] = useState(false);
  const [prixFinal, setPrixFinal] = useState(0);
  const [reservationDate, setReservationDate] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState("");

  // États pour la confirmation
  const [reservationId, setReservationId] = useState("");
  const [formattedReservationDate, setFormattedReservationDate] = useState("");

  // État pour suivre l'étape courante
  const [currentStep, setCurrentStep] = useState("form");

  // Hooks externes
  const {
    user,
    setReservationDetails,
    reservationDetails,
    clearReservationDetails,
  } = useAuth();
  const router = useRouter();

  // Récupérer les détails de réservation si disponibles au démarrage
  useEffect(() => {
    if (reservationDetails) {
      setDepart(reservationDetails.depart);
      setArrivee(reservationDetails.arrivee);
      setPrix(reservationDetails.prix);
      setDistance(reservationDetails.distance);
      setDuree(reservationDetails.duree);
      setCalculCompleted(true);

      if (
        reservationDetails.depart &&
        reservationDetails.arrivee &&
        reservationDetails.prix
      ) {
        setCurrentStep("devis");
      }
    }

    if (user?.email) {
      setEmail(user.email);
    }
  }, [reservationDetails, user]);

  // Vérifier l'authentification pour les étapes qui nécessitent d'être connecté
  useEffect(() => {
    if ((currentStep === "reservation" || currentStep === "payment") && !user) {
      saveCurrentDetails();
      router.push("/connexion");
    }
  }, [currentStep, user, router]);

  // Fonction de navigation vers la section réservation
  const navigateToReservation = (e) => {
    if (e) {
      e.preventDefault();
    }

    resetForm();

    const currentPath = window.location.pathname;

    if (currentPath === "/") {
      scrollToReservation();
    } else {
      router.push("/");
      setTimeout(() => {
        scrollToReservation();
      }, 100);
    }
  };

  // Fonction pour scroller vers la section réservation
  const scrollToReservation = () => {
    const reservationSection = document.getElementById("reservation");
    if (reservationSection) {
      reservationSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  // Sauvegarde les détails actuels dans le contexte et localStorage
  const saveCurrentDetails = () => {
    if (depart && arrivee) {
      const details = {
        depart,
        arrivee,
        distance,
        duree,
        prix,
      };

      console.log("Sauvegarde des détails:", details);
      setReservationDetails(details);
      localStorage.setItem("pendingReservation", JSON.stringify(details));
    }
  };

  const calculateRoute = () => {
    if (!depart || !arrivee || !window.google) {
      setDirections(null);
      setPrix(null);
      setDistance(null);
      setDuree(null);
      setCalculCompleted(false);
      return;
    }

    setDirections(null);
    setPrix(null);
    setDistance(null);
    setDuree(null);
    setCalculCompleted(false);

    const directionsService = new google.maps.DirectionsService();

    directionsService.route(
      {
        origin: depart,
        destination: arrivee,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirections(result);

          const route = result.routes[0];
          const leg = route.legs[0];

          if (leg && leg.distance && leg.duration) {
            const distanceEnMetres = leg.distance.value;
            const distanceEnKm = distanceEnMetres / 1000;
            const dureeEnMinutes = Math.ceil(leg.duration.value / 60);

            setDistance(distanceEnKm);
            setDuree(dureeEnMinutes);

            const departZone = identifierZone(depart);
            const arriveeZone = identifierZone(arrivee);

            const prixEstime = estimerPrix(
              departZone,
              arriveeZone,
              distanceEnKm
            );

            setPrix(prixEstime);
            setPrixFinal(prixEstime);

            setCalculCompleted(true);
            setCurrentStep("devis");
          } else {
            console.error(
              "Les données de distance ou de durée sont manquantes"
            );
            resetRouteCalculation();
          }
        } else {
          console.error(`Erreur lors du calcul de l'itinéraire: ${status}`);
          resetRouteCalculation();
        }
      }
    );
  };

  const resetRouteCalculation = () => {
    setDirections(null);
    setPrix(null);
    setDistance(null);
    setDuree(null);
    setCalculCompleted(false);
    setCurrentStep("form");
  };

  const handleReservation = () => {
    saveCurrentDetails();

    if (!user) {
      setCurrentStep("guest_info");
    } else {
      setCurrentStep("devis");
    }
  };

  const proceedToReservation = () => {
    setPrixFinal(prioriteReservation ? (prix || 0) + 20 : prix || 0);
    setCurrentStep("reservation");
  };

  // ✅ FONCTION CORRIGÉE AVEC API EMAIL
  const handleRequestDevis = async (guestData) => {
    console.log("📨 guestData reçu :", guestData);
    try {
      if (!reservationDate) {
        alert("Veuillez sélectionner une date et heure pour votre course");
        return;
      }

      let userPhone = phone;
      if (user) {
        try {
          const userDoc = await getDoc(doc(getFirestore(), "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            userPhone = userData.phoneNumber || phone;
          }
        } catch (error) {
          console.error(
            "Erreur lors de la récupération du numéro de téléphone:",
            error
          );
        }
      }

      const finalName = guestData?.name || name || "Client";
      const finalPhone = guestData?.phone || userPhone || phone;
      const finalEmail = guestData?.email || email;

      setName(finalName);
      setPhone(finalPhone);
      setEmail(finalEmail);

      if (!finalEmail || !finalPhone || !finalName || finalName === "Client") {
        console.log("Données manquantes, redirection vers guest_info");
        setCurrentStep("guest_info");
        return;
      }

      const randomId = `DEV-${Math.random()
        .toString(36)
        .substring(2, 10)
        .toUpperCase()}`;

      setReservationId(randomId);

      const selectedDate = new Date(reservationDate);
      const formattedDate = `${selectedDate.toLocaleDateString()} à ${selectedDate.toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      )}`;

      setFormattedReservationDate(formattedDate);

      const devisData = {
        userId: user ? user.uid : "guest",
        depart,
        arrivee,
        distance,
        duree,
        prix: prioriteReservation ? (prix || 0) + 20 : prix || 0,
        prioriteReservation,
        status: "devis",
        reservationId: randomId,
        email: finalEmail,
        phone: finalPhone,
        name: finalName,
        notes: notes || "",
        reservationDate: reservationDate,
        dateFormatted: formattedDate,
        createdAt: new Date(),
      };

      await saveBooking(devisData, user ? user.uid : "guest");

      // ✅ CORRECTION : Utiliser votre API qui fonctionnait
      try {
        console.log("📧 Envoi du devis par API :", devisData.email);

        const response = await fetch("/api/send-devis", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: finalName,
            email: finalEmail,
            phone: finalPhone,
            depart,
            arrivee,
            prix: devisData.prix,
            distance,
            duree,
            reservationId: randomId,
            notes: notes || "",
            prioriteReservation,
            reservationDate,
          }),
        });

        if (!response.ok) {
          throw new Error(`Erreur API: ${response.status}`);
        }

        const result = await response.json();
        console.log("✅ Email envoyé avec succès:", result);
      } catch (emailError) {
        console.error("❌ Erreur lors de l'envoi du devis:", emailError);
      }

      setCurrentStep("devis_sent");
    } catch (error) {
      console.error("Erreur lors de la demande de devis:", error);
    }
  };

  const proceedToPayment = () => {
    if (!name || !reservationDate) {
      return false;
    }

    setCurrentStep("payment");
    return true;
  };

  const handlePaymentSuccess = async (paymentId) => {
    if (!user) return;

    console.log(
      "🔄 useReservation - handlePaymentSuccess appelé. Pas besoin de traiter à nouveau"
    );

    clearReservationDetails();
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
    setEmail("");
    setCurrentStep("form");
    clearReservationDetails();
  };

  const resetRouteData = () => {
    setDepart("");
    setArrivee("");
    setDistance(null);
    setDuree(null);
    setPrix(null);
  };

  const bookingData = {
    depart,
    arrivee,
    distance,
    duree,
    prix,
    name,
    phone,
    reservationDate,
    notes,
    prioriteReservation,
    prixFinal,
  };

  return {
    // États
    depart,
    setDepart,
    arrivee,
    setArrivee,
    directions,
    prix,
    distance,
    duree,
    calculCompleted,
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

    // Actions
    calculateRoute,
    handleReservation,
    proceedToReservation,
    proceedToPayment,
    handlePaymentSuccess,
    handleRequestDevis,
    resetForm,
    saveCurrentDetails,
    setPrixFinal,
    resetRouteData,
    navigateToReservation,
  };
}
