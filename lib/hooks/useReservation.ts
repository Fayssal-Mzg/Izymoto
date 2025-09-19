"use client";

import { handleSuccessfulPayment } from "../services/paymentService";
import { identifierZone, estimerPrix } from "@/app/reserver/utils/pricingUtils";
import { useAuth } from "@/contexts/AuthContext";
import {
  sendClientConfirmationEmail,
  sendDevisEmails, // Utilisez la fonction combinée au lieu de sendDevisEmail
} from "@/lib/emails/confirmationEmail";
import { saveBooking } from "@/lib/firebase/bookings";
import { getDoc, doc, setDoc, getFirestore } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export interface ReservationDetails {
  depart: string;
  arrivee: string;
  distance: number | null;
  duree: number | null;
  prix: number | null;
}

export interface BookingData extends ReservationDetails {
  name: string;
  phone: string;
  reservationDate: string;
  notes: string;
  prioriteReservation: boolean;
  prixFinal: number;
}

type ReservationStep =
  | "form"
  | "devis"
  | "guest_info"
  | "reservation"
  | "payment"
  | "confirmation";

export function useReservation() {
  // États pour les données de base de la réservation
  const [depart, setDepart] = useState("");
  const [arrivee, setArrivee] = useState("");
  const [directions, setDirections] =
    useState<google.maps.DirectionsResult | null>(null);
  const [prix, setPrix] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [duree, setDuree] = useState<number | null>(null);
  const [calculCompleted, setCalculCompleted] = useState(false);

  // États pour les options de réservation
  const [prioriteReservation, setPrioriteReservation] = useState(false);
  const [prixFinal, setPrixFinal] = useState(0);
  const [reservationDate, setReservationDate] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState(""); // Nouveau: état pour l'email du client non connecté

  // États pour la confirmation
  const [reservationId, setReservationId] = useState("");
  const [formattedReservationDate, setFormattedReservationDate] = useState("");

  // État pour suivre l'étape courante
  const [currentStep, setCurrentStep] = useState<ReservationStep>("form");

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

      // Si on a des détails complets, on peut passer directement au devis
      if (
        reservationDetails.depart &&
        reservationDetails.arrivee &&
        reservationDetails.prix
      ) {
        setCurrentStep("devis");
      }
    }

    // Si l'utilisateur est connecté, pré-remplir l'email
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
  const navigateToReservation = (e?: React.MouseEvent<HTMLAnchorElement>) => {
    if (e) {
      e.preventDefault();
    }

    // Réinitialiser le formulaire
    resetForm();

    // Vérifier si on est déjà sur la page d'accueil
    const currentPath = window.location.pathname;

    if (currentPath === "/") {
      // Si on est déjà sur la page d'accueil, scroller directement
      scrollToReservation();
    } else {
      // Si on est sur une autre page, naviguer d'abord vers l'accueil
      router.push("/");
      // Attendre que la navigation soit terminée puis scroller
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
      const details: ReservationDetails = {
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
    // Vérifier que les champs de départ et d'arrivée sont remplis et que Google Maps est disponible
    if (!depart || !arrivee || !window.google) {
      // Réinitialiser les états si les champs sont incomplets
      setDirections(null);
      setPrix(null);
      setDistance(null);
      setDuree(null);
      setCalculCompleted(false);
      return;
    }

    // Réinitialiser les états avant le nouveau calcul
    setDirections(null);
    setPrix(null);
    setDistance(null);
    setDuree(null);
    setCalculCompleted(false);

    // Créer le service de directions de Google Maps
    const directionsService = new google.maps.DirectionsService();

    // Lancer le calcul d'itinéraire
    directionsService.route(
      {
        origin: depart,
        destination: arrivee,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          // Mettre à jour les directions
          setDirections(result);

          const route = result.routes[0];
          const leg = route.legs[0];

          // Vérifier que distance et durée existent
          if (leg && leg.distance && leg.duration) {
            const distanceEnMetres = leg.distance.value;
            const distanceEnKm = distanceEnMetres / 1000;
            const dureeEnMinutes = Math.ceil(leg.duration.value / 60);

            // Mettre à jour les états de distance et durée
            setDistance(distanceEnKm);
            setDuree(dureeEnMinutes);

            // Identifier les zones de départ et d'arrivée
            const departZone = identifierZone(depart);
            const arriveeZone = identifierZone(arrivee);

            // Estimer le prix
            const prixEstime = estimerPrix(
              departZone,
              arriveeZone,
              distanceEnKm
            );

            // Mettre à jour les prix
            setPrix(prixEstime);
            setPrixFinal(prixEstime);

            // Marquer le calcul comme terminé
            setCalculCompleted(true);

            // Passer automatiquement à l'étape de devis
            setCurrentStep("devis");
          } else {
            console.error(
              "Les données de distance ou de durée sont manquantes"
            );
            // Réinitialiser les états en cas d'erreur
            resetRouteCalculation();
          }
        } else {
          console.error(`Erreur lors du calcul de l'itinéraire: ${status}`);
          // Réinitialiser les états en cas d'erreur
          resetRouteCalculation();
        }
      }
    );
  };

  // Fonction pour réinitialiser le calcul de route
  const resetRouteCalculation = () => {
    setDirections(null);
    setPrix(null);
    setDistance(null);
    setDuree(null);
    setCalculCompleted(false);
    setCurrentStep("form");
  };

  // Handler pour la page d'accueil - réservation simple
  const handleReservation = () => {
    // Sauvegarder les détails de la course
    saveCurrentDetails();

    // Si aucun utilisateur n'est connecté
    if (!user) {
      // Passer à l'étape de collecte d'informations invité
      setCurrentStep("guest_info");
    } else {
      // Si utilisateur connecté, aller directement à l'étape de devis
      setCurrentStep("devis");
    }
  };

  // Modifiez la fonction proceedToReservation pour ne plus rediriger automatiquement les utilisateurs non connectés
  const proceedToReservation = () => {
    // Mettre à jour le prix final en fonction de l'option de priorité
    setPrixFinal(prioriteReservation ? (prix || 0) + 20 : prix || 0);

    // Passer directement à l'étape de réservation pour tous les utilisateurs
    setCurrentStep("reservation");
  };

  // Modifiez la fonction handleRequestDevis pour gérer correctement les invités
  // Fonction handleRequestDevis modifiée à mettre dans useReservation.ts

  const handleRequestDevis = async (guestData?: {
    email?: string;
    phone?: string;
    name?: string;
  }) => {
    console.log("📨 guestData reçu :", guestData);
    try {
      // Vérifier si une date de réservation a été sélectionnée
      if (!reservationDate) {
        alert("Veuillez sélectionner une date et heure pour votre course");
        return;
      }

      // Si l'utilisateur est connecté, essayer de récupérer son numéro de téléphone
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

      // Vérifier si nous avons les informations requises pour un invité
      if (
        !user &&
        (!guestData?.email || !guestData?.phone || !guestData?.name)
      ) {
        // Si l'utilisateur n'est pas connecté et que nous n'avons pas les données invité
        // Passer à l'étape de collecte d'informations invité
        setCurrentStep("guest_info");
        return;
      }

      // Mettre à jour les informations si fournies
      if (guestData) {
        setEmail(guestData.email || email);
        setPhone(guestData.phone || phone);
        setName(guestData.name || name);
      }

      // Générer un identifiant unique pour le devis
      const randomId = `DEV-${Math.random()
        .toString(36)
        .substring(2, 10)
        .toUpperCase()}`;

      // Important: mettre à jour l'état reservationId pour l'afficher dans le modal de confirmation
      setReservationId(randomId);

      // Formater la date de réservation pour l'affichage
      const selectedDate = new Date(reservationDate);
      const formattedDate = `${selectedDate.toLocaleDateString()} à ${selectedDate.toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      )}`;

      // Important: mettre à jour l'état formattedReservationDate pour l'afficher dans le modal
      setFormattedReservationDate(formattedDate);

      // Préparer les données de devis
      const devisData = {
        userId: user ? user.uid : "guest", // Utilisez l'ID utilisateur si connecté, sinon "guest"
        depart,
        arrivee,
        distance,
        duree,
        prix: prioriteReservation ? (prix || 0) + 20 : prix || 0,
        prioriteReservation,
        status: "devis",
        reservationId: randomId, // Utiliser l'ID généré
        email: guestData?.email || email || "",
        phone: guestData?.phone || phone || "",
        name: guestData?.name || name || "Client",
        notes: notes || "",
        reservationDate: reservationDate, // Ajouter la date de réservation
        dateFormatted: formattedDate,
        createdAt: new Date(),
      };

      // Sauvegarder le devis dans la base de données
      // Passez l'ID utilisateur si connecté, sinon "guest"
      await saveBooking(devisData, user ? user.uid : "guest");

      // Tenter d'envoyer les emails, mais ne pas bloquer le processus en cas d'échec
      try {
        console.log("📧 Email utilisé pour envoi du devis :", devisData.email);
        await sendDevisEmails(devisData);
      } catch (emailError) {
        console.warn(
          "Erreur lors de l'envoi des emails, mais le devis a été enregistré:",
          emailError
        );
        // Ne pas bloquer le processus
      }

      // Passer à l'étape de confirmation, même si l'envoi d'email a échoué
      setCurrentStep("confirmation");
    } catch (error) {
      console.error("Erreur lors de la demande de devis:", error);
      // Ici vous pourriez ajouter un état pour afficher une erreur à l'utilisateur
    }
  };

  const proceedToPayment = () => {
    if (!name || !reservationDate) {
      return false; // Indique une validation en échec
    }

    setCurrentStep("payment");
    return true; // Validation réussie
  };

  const handlePaymentSuccess = async (paymentId: string) => {
    if (!user) return;

    // Pour éviter les doublons, vérifie si le paiement est déjà traité
    console.log(
      "🔄 useReservation - handlePaymentSuccess appelé. Pas besoin de traiter à nouveau"
    );

    // Au lieu d'appeler handleSuccessfulPayment une seconde fois, fais simplement :
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
    // Logique pour réinitialiser les données de route
    setDepart("");
    setArrivee("");
    setDistance(null);
    setDuree(null);
    setPrix(null);
    // Autres réinitialisations nécessaires
  };

  // Préparation des données complètes de réservation
  const bookingData: BookingData = {
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
    navigateToReservation, // Nouvelle fonction ajoutée
  };
}
