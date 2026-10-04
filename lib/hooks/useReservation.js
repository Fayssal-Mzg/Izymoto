"use client";

import { handleSuccessfulPayment } from "../services/paymentService";
import {
  identifierZone,
  estimerPrix,
  calculerPrixCourse,
} from "@/lib/pricing";
import { useAuth } from "@/contexts/AuthContext";
import {
  sendClientConfirmationEmail,
  sendDevisEmails,
} from "@/lib/emails/confirmationEmail";
import { saveBooking } from "@/lib/firebase/bookings";
import { getDoc, doc, setDoc, getFirestore } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

// Types en commentaires pour documentation (pas d'interfaces en .js)
// ReservationDetails: { depart, arrivee, distance, duree, prix, originLat, originLng, destLat, destLng }
// BookingData: ReservationDetails + { name, phone, reservationDate, notes, prioriteReservation, prixFinal }
// Le prix affiché vient de lib/pricing (même module que le serveur). Le serveur le
// recalcule à chaque paiement à partir des paramètres de la course (adresses, distance,
// coordonnées, date, priorité) et renvoie 409 PRICE_CHANGED en cas d'écart.

// ReservationStep: "form" | "devis" | "guest_info" | "reservation" | "payment" | "confirmation" | "devis_sent"

// Persistance brouillon — l'utilisateur retrouve son tunnel exactement où il
// l'a laissé après un refresh / une fermeture d'onglet. Une seule clé, écriture
// debouncée, expiration 24 h. Ne couvre PAS les étapes payment/confirmation
// (sensible : on ne veut pas réinjecter un paiement en cours).
const DRAFT_KEY = "izymoto.reservation.draft.v1";
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
const RESTORABLE_STEPS = new Set(["form", "devis"]);

const readDraft = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
      window.localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const writeDraft = (payload) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ ...payload, savedAt: Date.now() })
    );
  } catch {
    // quota dépassé / mode privé : on ignore silencieusement, l'UX continue.
  }
};

const clearDraft = () => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* noop */
  }
};

// Coordonnées d'itinéraire stockées dans un objet (reservationDetails) → { originLat, ... } | null.
const extractCoords = (src) => {
  if (!src) return null;
  const { originLat, originLng, destLat, destLng } = src;
  return [originLat, originLng, destLat, destLng].every(
    (v) => typeof v === "number" && Number.isFinite(v)
  )
    ? { originLat, originLng, destLat, destLng }
    : null;
};

export function useReservation() {
  // États pour les données de base de la réservation
  const [depart, setDepart] = useState("");
  const [arrivee, setArrivee] = useState("");
  const [directions, setDirections] = useState(null);
  const [prixBase, setPrixBase] = useState(null); // forfait pur (zone↔zone)
  const [prix, setPrix] = useState(null); // prixBase + majorations horaires/week-end
  const [detailsMajorations, setDetailsMajorations] = useState([]);
  const [distance, setDistance] = useState(null);
  const [duree, setDuree] = useState(null);
  // Coordonnées de départ/arrivée de l'itinéraire Google : transmises au serveur,
  // qui en tire une borne basse de la distance (hors forfait).
  const [routeCoords, setRouteCoords] = useState(null); // { originLat, originLng, destLat, destLng }
  const [calculCompleted, setCalculCompleted] = useState(false);

  // États pour les options de réservation
  const [prioriteReservation, setPrioriteReservation] = useState(false);
  const [prixFinal, setPrixFinal] = useState(0); // prix + supplément priorité
  // Trajet hors forfait (ou zone indéterminée) : prix indicatif seulement, le paiement
  // en ligne est refusé par le serveur (QUOTE_REQUIRED) -> parcours « Demander un devis ».
  const [requiresQuote, setRequiresQuote] = useState(false);
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

  // Indique que l'hydratation initiale est terminée — la persistance ne s'active
  // qu'après pour ne pas écraser le draft pendant le rendu initial.
  const hydratedRef = useRef(false);

  // Hooks externes
  const {
    user,
    setReservationDetails,
    reservationDetails,
    clearReservationDetails,
  } = useAuth();
  const router = useRouter();

  // Hydratation initiale : draft localStorage > reservationDetails (AuthContext).
  // Le draft contient TOUT le tunnel (depart, arrivee, date, options, infos persos),
  // alors que reservationDetails ne couvre que le post-redirect connexion.
  useEffect(() => {
    const draft = readDraft();
    if (draft) {
      if (draft.depart) setDepart(draft.depart);
      if (draft.arrivee) setArrivee(draft.arrivee);
      if (draft.distance != null) setDistance(draft.distance);
      if (draft.duree != null) setDuree(draft.duree);
      if (draft.routeCoords) setRouteCoords(draft.routeCoords);
      if (draft.prixBase != null) setPrixBase(draft.prixBase);
      if (draft.reservationDate) setReservationDate(draft.reservationDate);
      if (draft.prioriteReservation) setPrioriteReservation(true);
      if (draft.name) setName(draft.name);
      if (draft.phone) setPhone(draft.phone);
      if (draft.email) setEmail(draft.email);
      if (draft.notes) setNotes(draft.notes);
      if (draft.depart && draft.arrivee && draft.prixBase != null) {
        setCalculCompleted(true);
      }
      // Ne restaure que des steps "sûrs" — pas payment/confirmation/devis_sent.
      if (draft.currentStep && RESTORABLE_STEPS.has(draft.currentStep)) {
        setCurrentStep(draft.currentStep);
      }
    } else if (reservationDetails) {
      setDepart(reservationDetails.depart);
      setArrivee(reservationDetails.arrivee);
      setPrixBase(reservationDetails.prix);
      setDistance(reservationDetails.distance);
      setDuree(reservationDetails.duree);
      setRouteCoords(extractCoords(reservationDetails));
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

    hydratedRef.current = true;
    // Volontairement vide : on n'hydrate qu'une fois au mount. Le draft suit
    // ensuite, AuthContext.reservationDetails reste un fallback ponctuel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Synchronise l'email quand l'auth state change après mount (login délayé).
  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);
  }, [user, email]);

  // Pont entre instances de useReservation via AuthContext.reservationDetails.
  // app/page.tsx et ReservationForm créent chacun leur propre instance ; quand
  // SearchForm appelle handleReservation → saveCurrentDetails → setReservationDetails,
  // cet effet propage les valeurs à l'instance qui rend les modals (DevisModal,
  // UnifiedUserModal). Sans lui, "Réserver cette course" semble ne rien faire.
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (!reservationDetails) return;

    setDepart(reservationDetails.depart);
    setArrivee(reservationDetails.arrivee);
    if (reservationDetails.distance != null) setDistance(reservationDetails.distance);
    if (reservationDetails.duree != null) setDuree(reservationDetails.duree);
    if (reservationDetails.prix != null) setPrixBase(reservationDetails.prix);
    const savedCoords = extractCoords(reservationDetails);
    if (savedCoords) setRouteCoords(savedCoords);

    if (
      reservationDetails.depart &&
      reservationDetails.arrivee &&
      reservationDetails.prix &&
      currentStep === "form"
    ) {
      setCurrentStep("devis");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservationDetails]);

  // Persistance debouncée 300 ms. Une seule écriture par burst de modifs.
  // Skip durant l'hydratation initiale et sur les steps sensibles.
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (currentStep === "confirmation" || currentStep === "devis_sent") {
      clearDraft();
      return;
    }

    const handle = setTimeout(() => {
      writeDraft({
        depart,
        arrivee,
        distance,
        duree,
        routeCoords,
        prixBase,
        reservationDate,
        prioriteReservation,
        name,
        phone,
        email,
        notes,
        currentStep,
      });
    }, 300);

    return () => clearTimeout(handle);
  }, [
    depart,
    arrivee,
    distance,
    duree,
    routeCoords,
    prixBase,
    reservationDate,
    prioriteReservation,
    name,
    phone,
    email,
    notes,
    currentStep,
  ]);

  // Prix affiché = module partagé lib/pricing (le même que celui du serveur) :
  // forfait ou hors-forfait + majorations (heure/jour À PARIS, moins de 2 h) +
  // supplément priorité. Le serveur le recalcule de toute façon au paiement.
  useEffect(() => {
    if (prixBase == null || !depart || !arrivee) {
      setPrix(null);
      setDetailsMajorations([]);
      setPrixFinal(0);
      setRequiresQuote(false);
      return;
    }

    const course = calculerPrixCourse({
      depart,
      arrivee,
      distanceKm: distance,
      reservationDate: reservationDate || null,
      prioriteReservation,
    });

    if (course.prixBase !== prixBase) setPrixBase(course.prixBase);
    setPrix(course.prix);
    setDetailsMajorations(course.majorations);
    setPrixFinal(course.total);
    setRequiresQuote(course.horsForfait);
  }, [prixBase, depart, arrivee, distance, reservationDate, prioriteReservation]);

  // Vérifier l'authentification pour les étapes qui nécessitent d'être connecté
  useEffect(() => {
    if ((currentStep === "reservation" || currentStep === "payment") && !user) {
      saveCurrentDetails();
      router.push("/connexion");
    }
  }, [currentStep, user, router]);

  // Fonction de navigation vers la section réservation.
  // Par défaut : purge tout (intention "nouvelle réservation").
  // Avec { preserveDraft: true } : garde le draft (utilisé après login pour
  // que l'user retrouve son tunnel exactement où il l'a laissé).
  const navigateToReservation = (eventOrOptions) => {
    let preserveDraft = false;
    if (eventOrOptions) {
      if (typeof eventOrOptions.preventDefault === "function") {
        eventOrOptions.preventDefault();
      } else if (typeof eventOrOptions === "object") {
        preserveDraft = !!eventOrOptions.preserveDraft;
      }
    }

    if (!preserveDraft) {
      resetForm();
    }

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

  // Sauvegarde les détails actuels dans le contexte d'auth (qui persiste lui-même
  // dans localStorage via setReservationDetails). Pas de double écriture ici.
  const saveCurrentDetails = () => {
    if (depart && arrivee) {
      setReservationDetails({ depart, arrivee, distance, duree, prix, ...(routeCoords || {}) });
    }
  };

  const calculateRoute = () => {
    if (!depart || !arrivee || !window.google) {
      setDirections(null);
      setPrixBase(null);
      setDistance(null);
      setDuree(null);
      setRouteCoords(null);
      setCalculCompleted(false);
      return;
    }

    setDirections(null);
    setPrixBase(null);
    setDistance(null);
    setDuree(null);
    setRouteCoords(null);
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
            setRouteCoords(
              leg.start_location && leg.end_location
                ? {
                    originLat: leg.start_location.lat(),
                    originLng: leg.start_location.lng(),
                    destLat: leg.end_location.lat(),
                    destLng: leg.end_location.lng(),
                  }
                : null
            );

            const departZone = identifierZone(depart);
            const arriveeZone = identifierZone(arrivee);

            // Prix de base déterministe (forfait ou fallback arrondi).
            // Les majorations sont appliquées par le useEffect dédié dès que
            // la date est connue.
            const base = estimerPrix(departZone, arriveeZone, distanceEnKm);
            setPrixBase(base);

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
    setPrixBase(null);
    setDistance(null);
    setDuree(null);
    setRouteCoords(null);
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
    if (requiresQuote) {
      // Hors forfait : pas de paiement en ligne, on reste sur l'écran du devis.
      setCurrentStep("devis");
      return;
    }
    // prixFinal est maintenant maintenu à jour par le useEffect dédié.
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
        prix: prixFinal || 0,
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

      // Connecté : devis écrit ici (règles : status "devis", userId == uid). Invité :
      // enregistré par /api/send-devis (Admin SDK), aucune écriture Firestore client.
      if (user) {
        await saveBooking(devisData, user.uid);
      }

      // ✅ CORRECTION : Utiliser votre API qui fonctionnait
      try {
        console.log("📧 Envoi du devis par API :", devisData.email);

        // Jeton joint si connecté ; l'invité (non connecté) reste autorisé.
        const idToken = user ? await user.getIdToken() : null;
        const response = await fetch("/api/send-devis", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
          body: JSON.stringify({
            name: finalName,
            email: finalEmail,
            phone: finalPhone,
            depart,
            arrivee,
            distance,
            duree,
            ...(routeCoords || {}),
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
    if (!name || !reservationDate || requiresQuote) {
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

    // Nettoyage explicite des deux storages — le useEffect de persistance le
    // fait aussi via le setCurrentStep("confirmation") en dessous, mais ici
    // c'est ceinture+bretelles : si l'user a payé via wallet/hybrid sans
    // passer par le step confirmation, le draft serait sinon zombie 24h.
    clearReservationDetails();
    clearDraft();
    setCurrentStep("confirmation");
  };

  const resetForm = () => {
    setDepart("");
    setArrivee("");
    setDirections(null);
    setPrixBase(null);
    setPrix(null);
    setDetailsMajorations([]);
    setDistance(null);
    setDuree(null);
    setRouteCoords(null);
    setPrioriteReservation(false);
    setPrixFinal(0);
    setReservationDate("");
    setName("");
    setPhone("");
    setNotes("");
    setEmail("");
    setCurrentStep("form");
    clearReservationDetails();
    clearDraft();
  };

  const resetRouteData = () => {
    setDepart("");
    setArrivee("");
    setDistance(null);
    setDuree(null);
    setRouteCoords(null);
    setPrixBase(null);
    setPrix(null);
    setDetailsMajorations([]);
  };

  const bookingData = {
    depart,
    arrivee,
    distance,
    duree,
    prix,
    prixBase,
    detailsMajorations,
    name,
    phone,
    reservationDate,
    notes,
    prioriteReservation,
    prixFinal,
    // Coordonnées de l'itinéraire (paramètres de prix vérifiés par le serveur).
    ...(routeCoords || {}),
  };

  return {
    // États
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
    calculCompleted,
    prioriteReservation,
    setPrioriteReservation,
    prixFinal,
    requiresQuote,
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
