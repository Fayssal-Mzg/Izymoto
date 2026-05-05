"use client";

import ConfirmationModal from "@/app/reserver/components/ConfirmationModal";
import DevisModal from "@/app/reserver/components/DevisModal";
import UnifiedUserModal from "@/app/reserver/components/UnifiedUserModal"; // NOUVEAU - Remplace GuestInformationModal et ReservationModal
import MapContainer from "@/app/reserver/components/MapContainer";
import { MapWrapper } from "@/app/reserver/components/MapWrapper";
import PaymentModal from "@/app/reserver/components/PaymentModal";
import SearchForm from "@/app/reserver/components/SearchForm";
import { useReservation } from "@/lib/hooks/useReservation";
import { ChevronUp } from "lucide-react";
import React, { useState, useEffect } from "react";

// Définir une interface pour l'objet de localisation
interface LocationData {
  lat: number;
  lng: number;
}

// Définir l'interface des props du composant
interface ReservationProcessProps {
  isStandalone?: boolean;
  customContainerClass?: string;
}

// Interface pour les données utilisateur
interface UserData {
  name: string;
  phone: string;
  email: string;
  reservationDate?: string;
  notes?: string;
}

export default function ReservationProcess({
  isStandalone = true,
  customContainerClass = "",
}: ReservationProcessProps) {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [formExpanded, setFormExpanded] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(
    null
  );
  const [email, setEmail] = useState("");
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
    notes,
    setNotes,
    reservationId,
    formattedReservationDate,
    currentStep,
    setCurrentStep,
    bookingData,
    proceedToReservation,
    proceedToPayment,
    handlePaymentSuccess,
    resetForm,
    calculateRoute,
    handleRequestDevis,
    resetRouteData,
  } = useReservation();

  // Surveillance du défilement pour montrer/cacher le bouton de retour en haut
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fonction pour revenir en haut de la page
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Détection de la géolocalisation pour mobile
  useEffect(() => {
    if (isStandalone && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Créer un objet typé explicitement
          const location: LocationData = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          // Puis mettre à jour l'état
          setCurrentLocation(location);
        },
        () => {
          /* Silencieusement échouer */
        }
      );
    }
  }, [isStandalone]);

  return (
    <MapWrapper>
      <main className={`bg-background min-h-screen ${customContainerClass}`}>
        {isStandalone ? (
          // Affichage pour la page /reserver - Optimisé pour mobile
          <section className="relative flex flex-col min-h-[calc(100vh-70px)]">
            {/* Conteneur de la carte responsive - Plus grand sur mobile pour faciliter l'interaction */}
            <div className="relative flex-grow h-[60vh] md:h-[50vh] lg:absolute lg:inset-0">
              <div className="h-full w-full">
                <MapContainer
                  directions={directions}
                  userLocation={currentLocation}
                  showFullScreen={true}
                />
              </div>
            </div>

            {/* Formulaire de recherche - Plein écran sur mobile, superposé sur desktop */}
            <div className="relative lg:absolute bottom-0 left-0 right-0 w-full bg-black/90 backdrop-blur-md shadow-lg transition-all duration-300">
              {/* Barre de titre avec bouton d'expansion/réduction sur mobile */}
              <div
                className="px-4 py-3 flex items-center justify-between cursor-pointer lg:cursor-default"
                onClick={() => setFormExpanded(!formExpanded)}
              >
                <h1 className="text-xl font-medium text-white">
                  Réserver un trajet
                </h1>
                <button
                  className="lg:hidden rounded-full bg-white/10 p-1.5 transition-transform duration-300"
                  aria-label={
                    formExpanded
                      ? "Réduire le formulaire"
                      : "Développer le formulaire"
                  }
                >
                  <ChevronUp
                    size={18}
                    className={`text-white transform transition-transform duration-300 ${formExpanded ? "" : "rotate-180"}`}
                  />
                </button>
              </div>

              {/* Formulaire avec animation d'expansion/réduction */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out
                ${formExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0 lg:max-h-[1000px] lg:opacity-100"}
              `}
              >
                <div className="container mx-auto px-4 py-4">
                  <div className="max-w-md mx-auto lg:max-w-none">
                    <SearchForm
                      depart={depart}
                      setDepart={setDepart}
                      arrivee={arrivee}
                      setArrivee={setArrivee}
                      prix={prix}
                      prixBase={prixBase}
                      detailsMajorations={detailsMajorations}
                      distance={distance}
                      duree={duree}
                      calculateRoute={calculateRoute}
                      resetRouteData={resetRouteData}
                      onReserverClick={() => {
                        if (prix !== null) {
                          proceedToReservation();
                        }
                      }}
                      customInputClass="bg-white/10 text-white placeholder-white/60 focus:bg-white/20"
                      customButtonClass="bg-white text-black hover:bg-gray-100"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : (
          // Affichage simple pour la page d'accueil (inchangé)
          <div className="container mx-auto px-4 py-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 text-center">
              Réservez votre trajet
            </h2>
            <p className="text-base text-gray-600 max-w-xl mx-auto text-center mb-8">
              Indiquez votre point de départ et d'arrivée pour obtenir un tarif
              instantané
            </p>
            <SearchForm
              depart={depart}
              setDepart={setDepart}
              arrivee={arrivee}
              setArrivee={setArrivee}
              prix={prix}
              prixBase={prixBase}
              detailsMajorations={detailsMajorations}
              distance={distance}
              duree={duree}
              calculateRoute={calculateRoute}
              resetRouteData={resetRouteData}
              onReserverClick={() => {
                if (prix !== null) {
                  proceedToReservation();
                }
              }}
            />
          </div>
        )}

        {/* Modals pour le processus de réservation */}
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
            onProceed={proceedToReservation}
            onRequestDevis={handleRequestDevis}
            reservationDate={reservationDate}
            setReservationDate={setReservationDate}
          />
        )}

        {/* CORRIGÉ : UnifiedUserModal avec cast TypeScript pour les informations d'invité (devis) */}
        {currentStep === "guest_info" && (
          <UnifiedUserModal
            {...({
              type: "devis",
              onSubmit: (userData: UserData) => {
                console.log("✅ Données invité reçues :", userData);
                handleRequestDevis(userData);
              },
              onCancel: () => setCurrentStep("devis"),
            } as any)}
          />
        )}

        {/* CORRIGÉ : UnifiedUserModal avec cast TypeScript pour les réservations */}
        {currentStep === "reservation" && (
          <UnifiedUserModal
            {...({
              type: "reservation",
              reservationDate: reservationDate,
              setReservationDate: setReservationDate,
              notes: notes,
              setNotes: setNotes,
              onSubmit: (userData: UserData) => {
                console.log("✅ Données de réservation reçues :", userData);
                setName(userData.name);
                setPhone(userData.phone);
                setEmail(userData.email);
                if (userData.notes) setNotes(userData.notes);
                proceedToPayment();
              },
              onCancel: () => setCurrentStep("devis"),
            } as any)}
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

        {/* Bouton pour remonter en haut - Visible après défilement sur mobile */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-5 right-5 z-30 bg-black text-white p-3 rounded-full shadow-lg hover:bg-gray-800 transition-colors"
            aria-label="Retour en haut"
          >
            <ChevronUp size={20} />
          </button>
        )}
      </main>
    </MapWrapper>
  );
}
