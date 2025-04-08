// app/reserver/components/ReservationModal.jsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useState, useEffect, useRef } from "react";

export default function ReservationModal({
  reservationDate,
  setReservationDate,
  name,
  setName,
  phone, // Gardé pour compatibilité mais non utilisé
  setPhone, // Gardé pour compatibilité mais non utilisé
  notes,
  setNotes,
  onCancel,
  onProceed,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const dataFetchedRef = useRef(false);

  // Récupérer les données utilisateur depuis Firestore UNE SEULE FOIS
  useEffect(() => {
    // Vérifier si les données ont déjà été récupérées
    if (dataFetchedRef.current) return;

    const fetchUserData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const userDoc = await getDoc(doc(db, "users", user.uid));

        if (userDoc.exists()) {
          const userData = userDoc.data();

          // Pré-remplir le nom s'il est disponible et non déjà défini
          if (!name && (userData.displayName || user.displayName)) {
            setName(userData.displayName || user.displayName);
          }
        } else if (user.displayName && !name) {
          // Fallback to Auth user data if Firestore doc doesn't exist
          setName(user.displayName);
        }

        // Marquer que les données ont été récupérées
        dataFetchedRef.current = true;
      } catch (err) {
        console.error(
          "Erreur lors de la récupération des données utilisateur:",
          err
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]); // Ne dépendez que de user, pas de name

  // Validation du formulaire
  const handleProceed = () => {
    setError("");

    // Vérification des champs obligatoires
    if (!name || !name.trim()) {
      setError("Le nom complet est obligatoire");
      return;
    }

    if (!reservationDate) {
      setError("La date et l'heure sont obligatoires");
      return;
    }

    // Vérifier que la date est dans le futur
    const selectedDate = new Date(reservationDate);
    const currentDate = new Date();

    if (selectedDate <= currentDate) {
      setError("La date de réservation doit être dans le futur");
      return;
    }

    // Si tout est valide, procéder au paiement
    onProceed();
  };

  // Obtenir la date/heure minimale (maintenant + 15min)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 15);
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-lg w-full h-full sm:h-auto sm:w-full sm:max-w-md mx-auto flex flex-col sm:max-h-[90vh]">
        <div className="bg-[#ffc107] p-4 rounded-t-lg flex-shrink-0">
          <h3 className="text-xl font-bold text-black">
            Finaliser votre réservation
          </h3>
        </div>

        {/* Conteneur avec scrolling */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-grow">
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-md mb-4 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-4">
              <svg
                className="animate-spin h-6 w-6 text-gray-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="date"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Date et heure*
                </label>
                <input
                  type="datetime-local"
                  id="date"
                  value={reservationDate}
                  onChange={(e) => setReservationDate(e.target.value)}
                  className="block w-full p-2 border border-gray-300 rounded-md text-base"
                  min={getMinDateTime()}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Nom complet*
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full p-2 border border-gray-300 rounded-md text-base"
                  placeholder="Votre nom"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="notes"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Instructions particulières
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="block w-full p-2 border border-gray-300 rounded-md text-base"
                  rows={3}
                  placeholder="Instructions pour le chauffeur..."
                />
              </div>

              <div className="pt-2">
                <p className="text-xs text-gray-500 mb-4">
                  * Champs obligatoires
                </p>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition text-sm"
                  >
                    Retour
                  </button>
                  <button
                    type="button"
                    onClick={handleProceed}
                    className="flex-1 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition text-sm"
                  >
                    Continuer
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
