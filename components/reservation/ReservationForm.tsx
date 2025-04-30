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
    handleReservation,
    calculateRoute,
  } = useReservation();

  // Vérifier si les API Maps sont chargées
  const isLoaded = typeof window !== "undefined" && !!window.google?.maps;

  return (
    <div
      className={cn(
        "grid grid-cols-1 lg:grid-cols-2 gap-8 items-start",
        customContainerClass
      )}
    >
      {/* Colonne de gauche - Formulaire */}
      <div className={cn("w-full flex flex-col", customFormClass)}>
        <div className="w-full max-w-md">
          <h1 className="text-2xl md:text-4xl font-bold mb-4 text-black">
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
              resetRouteData=""
              calculateRoute={calculateRoute}
              customInputClass="w-full bg-gray-100 border-none focus:ring-2 focus:ring-black py-3 px-4 rounded-lg"
              customButtonClass="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition-colors"
              onReserverClick={handleReservation} // Passer handleReservation comme prop
            />
          </div>
        </div>
      </div>

      {/* Colonne de droite - Carte (visible uniquement sur grands écrans ou après calcul) */}
      <div className={cn(
        "w-full", 
        customMapClass,
        // Cacher la carte sur mobile sauf si un prix est calculé
        !prix ? "hidden lg:block" : ""
      )}>
        {isLoaded && (
          <div className="p-0 sm:p-4">
            <div className="h-[300px] sm:h-[400px] lg:h-[500px] w-full rounded-md overflow-hidden">
<MapContainer directions={directions} userLocation={null} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}