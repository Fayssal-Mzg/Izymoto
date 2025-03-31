// app/reserver/components/ConfirmationModal.jsx
"use client";

export default function ConfirmationModal({
  reservationId,
  formattedReservationDate,
  depart,
  arrivee,
  onClose,
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-green-600 p-4 text-white">
          <h3 className="text-xl font-bold">Réservation confirmée !</h3>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-green-100 p-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          <p className="text-center text-lg">
            Votre réservation a été confirmée !
          </p>
          <p className="text-center text-gray-600">
            Un email de confirmation a été envoyé à votre adresse email.
          </p>

          <div className="bg-gray-50 p-4 rounded-md space-y-2">
            <p className="font-medium">Détails de la réservation:</p>
            <p>
              <span className="font-medium">Référence:</span> {reservationId}
            </p>
            <p>
              <span className="font-medium">Date:</span>{" "}
              {formattedReservationDate}
            </p>
            <p>
              <span className="font-medium">De:</span> {depart}
            </p>
            <p>
              <span className="font-medium">À:</span> {arrivee}
            </p>
          </div>

          <div className="flex justify-center mt-6">
            <button
              onClick={onClose}
              className="py-2 px-6 bg-[#ffc107] text-black rounded-md hover:bg-yellow-500 transition"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
