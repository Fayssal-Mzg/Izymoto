// app/reserver/components/ReservationModal.jsx
"use client";

export default function ReservationModal({
  reservationDate,
  setReservationDate,
  name,
  setName,
  phone,
  setPhone,
  notes,
  setNotes,
  onCancel,
  onProceed,
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-[#ffc107] p-4">
          <h3 className="text-xl font-bold text-black">
            Finaliser votre réservation
          </h3>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <div>
              <label
                htmlFor="date"
                className="block text-sm font-medium text-gray-700"
              >
                Date et heure
              </label>
              <input
                type="datetime-local"
                id="date"
                value={reservationDate}
                onChange={(e) => setReservationDate(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Nom complet
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                placeholder="Votre nom"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700"
              >
                Téléphone
              </label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                placeholder="Votre numéro de téléphone"
              />
            </div>
            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-gray-700"
              >
                Instructions particulières
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="Instructions pour le chauffeur..."
              />
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              onClick={onCancel}
              className="flex-1 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition"
            >
              Retour
            </button>
            <button
              onClick={onProceed}
              className="flex-1 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition"
            >
              Procéder au paiement
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
