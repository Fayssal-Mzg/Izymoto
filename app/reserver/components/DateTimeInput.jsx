"use client";

import { useState, useEffect } from "react";

export default function DateTimeInput({
  reservationDate,
  setReservationDate,
  prioriteReservation,
  setPrioriteReservation,
}) {
  const [error, setError] = useState("");

  // Fonction pour obtenir la date/heure minimale (maintenant + 15min)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 15);
    return now.toISOString().slice(0, 16);
  };

  // Fonction pour obtenir la date/heure maximale (1 an à partir de maintenant)
  const getMaxDateTime = () => {
    const now = new Date();
    now.setFullYear(now.getFullYear() + 1);
    return now.toISOString().slice(0, 16);
  };

  // Validation de la date
  const validateDateTime = (dateTimeString) => {
    const selectedDate = new Date(dateTimeString);
    const now = new Date();
    now.setMinutes(now.getMinutes() + 15);

    // Vérification de la date minimale
    if (selectedDate <= now) {
      setError("La réservation doit être au moins 15 minutes dans le futur.");
      return false;
    }

    // Vérification de la date maximale (1 an)
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    if (selectedDate > maxDate) {
      setError(
        "La réservation ne peut pas être programmée plus d'un an à l'avance."
      );
      return false;
    }

    // Vérification de la réservation dans l'heure
    const diffInHours = (selectedDate - now) / (1000 * 60 * 60);
    if (diffInHours < 1 && !prioriteReservation) {
      setError(
        "Pour une réservation dans l'heure, l'option priorité est obligatoire."
      );
      return false;
    }

    setError("");
    return true;
  };

  // Pré-remplissage de la date du jour
  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 15);
    const defaultDateTime = now.toISOString().slice(0, 16);
    setReservationDate(defaultDateTime);
  }, []);

  // Gestion du changement de date
  const handleDateChange = (e) => {
    const newDateTime = e.target.value;
    setReservationDate(newDateTime);
    validateDateTime(newDateTime);
  };

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="reservationDateTime"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Date et heure de départ*
        </label>
        <input
          type="datetime-local"
          id="reservationDateTime"
          value={reservationDate || ""}
          onChange={handleDateChange}
          className={`block w-full p-2 border rounded-md text-base ${
            error
              ? "border-red-500 focus:ring-red-500 focus:border-red-500"
              : "border-gray-300"
          }`}
          min={getMinDateTime()}
          max={getMaxDateTime()}
          required
        />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>

      {/* Bloc d'alerte pour réservation dans l'heure */}
      {((reservationDate &&
        (new Date(reservationDate) - new Date()) / (1000 * 60 * 60) < 1) ||
        error?.includes("dans l'heure")) && (
        <div className="border border-yellow-300 bg-yellow-50 p-3 rounded-md">
          <div className="flex items-start">
            <input
              type="checkbox"
              id="priority"
              checked={prioriteReservation}
              onChange={() => setPrioriteReservation(!prioriteReservation)}
              className="mt-1 mr-3"
              required
            />
            <div>
              <label
                htmlFor="priority"
                className="font-medium block mb-1 text-sm text-yellow-700"
              >
                Option priorité (+20€) OBLIGATOIRE
              </label>
              <p className="text-yellow-600 text-xs">
                Pour une réservation dans l'heure, vous devez sélectionner
                l'option prioritaire garantissant l'arrivée d'un chauffeur dans
                les meilleurs délais.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
