// components/reservation/ReservationProcess.tsx
"use client";

import ConfirmationModal from "@/app/reserver/components/ConfirmationModal";
import DevisModal from "@/app/reserver/components/DevisModal";
import GuestInformationModal from "@/app/reserver/components/GuestInformationModal";
import MapContainer from "@/app/reserver/components/MapContainer";
import { MapWrapper } from "@/app/reserver/components/MapWrapper";
import PaymentModal from "@/app/reserver/components/PaymentModal";
import ReservationModal from "@/app/reserver/components/ReservationModal";
import SearchForm from "@/app/reserver/components/SearchForm";
import ReservationForm from "@/components/reservation/ReservationForm";
import { useReservation } from "@/lib/hooks/useReservation";
import React from "react";

export default function ReservationProcess({
  isStandalone = true,
  customContainerClass = "",
}) {
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
  } = useReservation();

  return (
    <MapWrapper>
      <main className={`bg-background min-h-screen ${customContainerClass}`}>
        {isStandalone ? (
          // Affichage pour la page /reserver - Plein écran avec carte en fond
          <section className="relative min-h-[calc(100vh-70px)] bg-white">
            {/* Conteneur de la carte Google Maps */}
            <div className="absolute inset-0">
              <div className="h-full w-full">
                {
                  <div className="h-full w-full">
                    <MapContainer directions={directions} />
                  </div>
                }
              </div>
            </div>

            {/* Formulaire de recherche superposé */}
            <div className="absolute bottom-0 left-0 right-0 w-full bg-black/80 backdrop-blur-sm py-4 md:py-6 z-10">
              <div className="container mx-auto px-4">
                <div className="max-w-lg mx-auto md:max-w-none">
                  <h1 className="text-xl md:text-2xl font-medium mb-4 text-white text-center md:text-left">
                    Réserver un trajet
                  </h1>
                  <SearchForm
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
        ) : (
          // Affichage simple pour la page d'accueil
          <ReservationForm
            isSimplified={true}
            customContainerClass="container mx-auto px-4 py-8"
          />
        )}

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
        {currentStep === "guest_info" && (
          <GuestInformationModal
            onSubmit={(
              guestData:
                | { email?: string; phone?: string; name?: string }
                | undefined
            ) => {
              handleRequestDevis(guestData);
            }}
            onCancel={() => setCurrentStep("devis")}
          />
        )}
      </main>
    </MapWrapper>
  );
}
