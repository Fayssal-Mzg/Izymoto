// components/reservation/ReservationForm.tsx
"use client";

import MapContainer from "@/app/reserver/components/MapContainer";
import SearchForm from "@/app/reserver/components/SearchForm";
import { useReservation } from "@/lib/hooks/useReservation";
import { cn } from "@/lib/utils";
import React from "react";

interface ReservationFormProps {
  isSimplified?: boolean;
  customContainerClass?: string;
  customFormClass?: string;
  customMapClass?: string;
  showDetails?: boolean;
  onDetailsClose?: () => void;
}

export default function ReservationForm({
  isSimplified = false,
  customContainerClass = "",
  customFormClass = "",
  customMapClass = "",
  showDetails = true,
  onDetailsClose,
}: ReservationFormProps) {
  const {
    depart,
    setDepart,
    arrivee,
    setArrivee,
    directions,
    prix,
    distance,
    duree,
    calculCompleted,
    handleReservation, // Utiliser le nom de fonction original de votre hook
    calculateRoute,
  } = useReservation();

  // Vérifier si les API Maps sont chargées (normalement depuis un hook parent)
  const isLoaded = typeof window !== "undefined" && !!window.google?.maps;

  return (
    <div
      className={cn(
        "grid md:grid-cols-2 gap-8 items-start",
        customContainerClass
      )}
    >
      {/* Colonne de gauche - Formulaire */}
      <div className={cn("w-full flex flex-col", customFormClass)}>
        <div className="w-full max-w-md">
          <h1 className="text-4xl font-bold mb-4 text-black">
            {isSimplified ? "Votre trajet" : "Où souhaitez-vous être déposé ?"}
          </h1>

          <div className="space-y-4">
            <SearchForm
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
          {showDetails && prix && distance && duree && (
            <div className="mt-6 p-4 bg-gray-100 rounded-lg">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Détails du trajet</h2>
                {onDetailsClose && (
                  <button
                    onClick={onDetailsClose}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <span className="sr-only">Fermer</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </div>

              <div className="space-y-2 mt-2">
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
      <div className={cn("w-full", customMapClass)}>
        {isLoaded && (
          <div className="p-4">
            <div className="h-[500px] w-full rounded-md overflow-hidden">
              <MapContainer directions={directions} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
