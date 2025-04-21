"use client";

import DateTimeInput from "./DateTimeInput";
import { useState, useEffect } from "react";

export default function DevisModal({
  depart,
  arrivee,
  distance,
  duree,
  prix,
  prioriteReservation,
  setPrioriteReservation,
  reservationDate,
  setReservationDate,
  onCancel,
  onProceed,
  onRequestDevis,
}) {
  // État pour gérer les erreurs de validation
  const [validationError, setValidationError] = useState("");

  // Validation avant de passer à onRequestDevis
  const validateAndRequestDevis = () => {
    if (!reservationDate) {
      setValidationError(
        "Veuillez sélectionner une date et heure pour votre course"
      );
      return;
    }

    // Vérification de la date
    const selectedDate = new Date(reservationDate);
    const now = new Date();
    now.setMinutes(now.getMinutes() + 15);

    // Vérification de la réservation dans l'heure
    const diffInHours = (selectedDate - now) / (1000 * 60 * 60);
    if (diffInHours < 1 && !prioriteReservation) {
      setValidationError(
        "Pour une réservation dans l'heure, l'option priorité est obligatoire"
      );
      return;
    }

    // Réinitialiser l'erreur si tout est correct
    setValidationError("");

    // Utiliser la fonction passée en prop directement
    onRequestDevis();
  };

  // Fonction de validation pour le bouton Réserver
  const handleProceed = () => {
    if (!reservationDate) {
      setValidationError(
        "Veuillez sélectionner une date et heure pour votre course"
      );
      return;
    }

    const selectedDate = new Date(reservationDate);
    const now = new Date();
    now.setMinutes(now.getMinutes() + 15);

    // Vérification de la réservation dans l'heure
    const diffInHours = (selectedDate - now) / (1000 * 60 * 60);
    if (diffInHours < 1 && !prioriteReservation) {
      setValidationError(
        "Pour une réservation dans l'heure, l'option priorité est obligatoire"
      );
      return;
    }

    // Réinitialiser l'erreur si tout est correct
    setValidationError("");
    onProceed();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-lg w-full h-full sm:h-auto sm:w-full sm:max-w-md mx-auto flex flex-col sm:max-h-[90vh]">
        <div className="bg-[#ffc107] p-4 rounded-t-lg flex-shrink-0">
          <h3 className="text-xl font-bold text-black">Votre devis</h3>
        </div>

        {/* Conteneur avec scrolling */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-grow">
          <div className="space-y-4">
            <div className="mb-6">
              <p className="text-gray-700 mb-1 text-sm">
                <span className="font-medium">De :</span> {depart}
              </p>
              <p className="text-gray-700 text-sm">
                <span className="font-medium">À :</span> {arrivee}
              </p>
            </div>

            {/* Nouveau composant de gestion de date et heure */}
            <DateTimeInput
              reservationDate={reservationDate}
              setReservationDate={setReservationDate}
              prioriteReservation={prioriteReservation}
              setPrioriteReservation={setPrioriteReservation}
            />

            {/* Affichage des erreurs de validation */}
            {validationError && (
              <div
                className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded relative"
                role="alert"
              >
                <span className="block sm:inline">{validationError}</span>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-md space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Distance estimée :</span>
                <span className="font-medium">
                  {Math.round(distance * 10) / 10} km
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Durée estimée :</span>
                <span className="font-medium">{duree} min</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Prix de base :</span>
                <span className="font-medium">{Math.round(prix)}€</span>
              </div>
            </div>

            {/* Section Option Priorité */}
            <div className="border border-gray-200 rounded-md p-4">
              <div className="flex items-start mb-3">
                <input
                  type="checkbox"
                  id="priority"
                  checked={prioriteReservation}
                  onChange={() => setPrioriteReservation(!prioriteReservation)}
                  className="mt-1 mr-3"
                />
                <div>
                  <label
                    htmlFor="priority"
                    className="font-medium block mb-1 text-sm"
                  >
                    Option priorité (+20€)
                  </label>
                  <p className="text-gray-600 text-xs">
                    Service prioritaire : votre course sera traitée en priorité,
                    garantissant l'arrivée d'un chauffeur dans les meilleurs
                    délais.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-md">
              <div className="flex justify-between text-base font-medium">
                <span>Prix total :</span>
                <span>
                  {Math.round(prix + (prioriteReservation ? 20 : 0))}€
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                TVA incluse. Paiement sécurisé en ligne.
              </p>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                onClick={onCancel}
                className="flex-1 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition text-sm"
              >
                Annuler
              </button>
              <button
                onClick={handleProceed}
                className="flex-1 py-2 bg-[#ffc107] text-black rounded-md hover:bg-[#e5ad06] transition text-sm"
              >
                Réserver
              </button>
              {onRequestDevis && (
                <button
                  onClick={validateAndRequestDevis}
                  className="flex-1 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition text-sm"
                >
                  Demander un devis
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
