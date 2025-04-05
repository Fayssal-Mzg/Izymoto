"use client";

import { Autocomplete } from "@react-google-maps/api";
import { MapPin, ArrowRight, Calendar, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

interface HomeSearchFormProps {
  isLoaded: boolean;
}

const HomeSearchForm: React.FC<HomeSearchFormProps> = ({ isLoaded }) => {
  const router = useRouter();

  // États pour les adresses et date
  const [depart, setDepart] = useState("");
  const [arrivee, setArrivee] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reservationDate, setReservationDate] = useState("");
  const [reservationTime, setReservationTime] = useState("");

  // Références pour les composants Autocomplete
  const [departRef, setDepartRef] =
    useState<google.maps.places.Autocomplete | null>(null);
  const [arriveeRef, setArriveeRef] =
    useState<google.maps.places.Autocomplete | null>(null);

  // Gestionnaire pour l'adresse de départ
  const onDepartLoad = (autocomplete: google.maps.places.Autocomplete) => {
    setDepartRef(autocomplete);
  };

  // Gestionnaire pour l'adresse d'arrivée
  const onArriveeLoad = (autocomplete: google.maps.places.Autocomplete) => {
    setArriveeRef(autocomplete);
  };

  // Gestionnaire pour la sélection d'une adresse
  const onDepartChanged = () => {
    if (departRef) {
      const place = departRef.getPlace();
      if (place.formatted_address) {
        setDepart(place.formatted_address);
      }
    }
  };

  const onArriveeChanged = () => {
    if (arriveeRef) {
      const place = arriveeRef.getPlace();
      if (place.formatted_address) {
        setArrivee(place.formatted_address);
      }
    }
  };

  // Soumission du formulaire
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation simple
    if (!depart || !arrivee) {
      alert("Veuillez entrer une adresse de départ et d'arrivée.");
      return;
    }

    // Construction de l'URL avec paramètres
    const params = new URLSearchParams();
    params.append("depart", depart);
    params.append("arrivee", arrivee);

    if (reservationDate && reservationTime) {
      const dateTime = `${reservationDate}T${reservationTime}`;
      params.append("datetime", dateTime);
    }

    // Redirection vers la page de réservation complète
    router.push(`/reserver?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Adresse de départ */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <MapPin className="h-5 w-5" />
        </div>
        {isLoaded ? (
          <Autocomplete
            onLoad={onDepartLoad}
            onPlaceChanged={onDepartChanged}
            restrictions={{ country: "fr" }}
          >
            <input
              type="text"
              placeholder="Adresse de départ"
              value={depart}
              onChange={(e) => setDepart(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 pl-10 focus:outline-none focus:ring-2 focus:ring-black/40"
              required
            />
          </Autocomplete>
        ) : (
          <input
            type="text"
            placeholder="Adresse de départ"
            className="w-full border border-gray-300 rounded-lg p-3 pl-10 focus:outline-none focus:ring-2 focus:ring-black/40"
            disabled
          />
        )}
      </div>

      {/* Adresse d'arrivée */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <MapPin className="h-5 w-5" />
        </div>
        {isLoaded ? (
          <Autocomplete
            onLoad={onArriveeLoad}
            onPlaceChanged={onArriveeChanged}
            restrictions={{ country: "fr" }}
          >
            <input
              type="text"
              placeholder="Adresse d'arrivée"
              value={arrivee}
              onChange={(e) => setArrivee(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 pl-10 focus:outline-none focus:ring-2 focus:ring-black/40"
              required
            />
          </Autocomplete>
        ) : (
          <input
            type="text"
            placeholder="Adresse d'arrivée"
            className="w-full border border-gray-300 rounded-lg p-3 pl-10 focus:outline-none focus:ring-2 focus:ring-black/40"
            disabled
          />
        )}
      </div>

      {/* Planning ou immédiat */}
      <div className="flex items-center space-x-4 text-sm">
        <button
          type="button"
          className={`py-2 px-4 rounded-full ${
            !showDatePicker
              ? "bg-black text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          onClick={() => setShowDatePicker(false)}
        >
          Maintenant
        </button>
        <button
          type="button"
          className={`py-2 px-4 rounded-full ${
            showDatePicker
              ? "bg-black text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          onClick={() => setShowDatePicker(true)}
        >
          Planifier
        </button>
      </div>

      {/* Planification conditionnelle */}
      {showDatePicker && (
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Calendar className="h-5 w-5" />
            </div>
            <input
              type="date"
              value={reservationDate}
              onChange={(e) => setReservationDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full border border-gray-300 rounded-lg p-3 pl-10 focus:outline-none focus:ring-2 focus:ring-black/40"
            />
          </div>
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Clock className="h-5 w-5" />
            </div>
            <input
              type="time"
              value={reservationTime}
              onChange={(e) => setReservationTime(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 pl-10 focus:outline-none focus:ring-2 focus:ring-black/40"
            />
          </div>
        </div>
      )}

      {/* Bouton de soumission */}
      <button
        type="submit"
        className="w-full bg-black text-white p-3 rounded-lg font-medium flex items-center justify-center hover:bg-gray-800 transition duration-300"
      >
        Réserver
        <ArrowRight className="ml-2 h-4 w-4" />
      </button>
    </form>
  );
};

export default HomeSearchForm;
