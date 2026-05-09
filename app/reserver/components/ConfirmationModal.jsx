// app/reserver/components/ConfirmationModal.jsx
"use client";

import { Clipboard, Check } from "lucide-react";
import { useState } from "react";

export default function ConfirmationModal({
  reservationId,
  formattedReservationDate,
  depart,
  arrivee,
  onClose,
}) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    const text = `Réservation #${reservationId}\nDate: ${formattedReservationDate}\nDe: ${depart}\nÀ: ${arrivee}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-lg w-full h-full sm:h-auto sm:w-full sm:max-w-md md:sm:max-w-lg mx-auto flex flex-col sm:max-h-[90vh]">
        <div className="bg-green-600 p-4 sm:rounded-t-lg flex-shrink-0">
          <h3 className="text-xl font-bold text-white">
            Réservation confirmée !
          </h3>
        </div>

        {/* Conteneur avec scrolling */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-gray-600 text-sm">
              Votre chauffeur moto viendra vous chercher à l'adresse indiquée.
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-md space-y-3 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Numéro de réservation :
                </p>
                <p className="text-sm">{reservationId}</p>
              </div>
              <button
                onClick={copyToClipboard}
                className="flex items-center justify-center p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                title="Copier les détails"
              >
                {copied ? (
                  <Check className="h-5 w-5 text-green-500" />
                ) : (
                  <Clipboard className="h-5 w-5" />
                )}
              </button>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">
                Date et heure :
              </p>
              <p className="text-sm">{formattedReservationDate}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Départ :</p>
              <p className="text-sm">{depart}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Arrivée :</p>
              <p className="text-sm">{arrivee}</p>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
            <div className="flex">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="text-blue-800 text-sm font-medium mb-1">
                  Informations importantes
                </p>
                <p className="text-blue-700 text-xs">
                  Vous recevrez un SMS de confirmation avec les coordonnées de
                  votre chauffeur 15 minutes avant votre course.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer fixe — bouton toujours visible */}
        <div className="p-4 border-t border-gray-100 flex-shrink-0 bg-white sm:rounded-b-lg">
          <button
            onClick={onClose}
            className="w-full py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition text-sm font-medium"
          >
            Terminer
          </button>
        </div>
      </div>
    </div>
  );
}
