// app/reserver/components/DevisModal.jsx
"use client";

export default function DevisModal({
  depart,
  arrivee,
  distance,
  duree,
  prix,
  prioriteReservation,
  setPrioriteReservation,
  onCancel,
  onProceed,
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-[#ffc107] p-4">
          <h3 className="text-xl font-bold text-black">Votre devis</h3>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex justify-between">
            <span className="font-medium">De :</span>
            <span className="text-right">{depart}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">À :</span>
            <span className="text-right">{arrivee}</span>
          </div>
          <div className="border-t border-gray-200 my-2"></div>
          <div className="flex justify-between">
            <span>Distance :</span>
            <span>{distance.toFixed(1)} km</span>
          </div>
          <div className="flex justify-between">
            <span>Durée estimée :</span>
            <span>
              {Math.floor(duree / 60)}h
              {duree % 60 > 0 ? ` ${duree % 60}min` : ""}
            </span>
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span>Prix total :</span>
            <span>{Math.round(prix)}€</span>
          </div>

          <div className="border-t border-gray-200 my-2"></div>

          {/* Options supplémentaires */}
          <div>
            <h4 className="font-medium mb-2">Options supplémentaires</h4>
            <label className="flex items-center space-x-2 mb-2">
              <input
                type="checkbox"
                className="rounded text-[#ffc107]"
                checked={prioriteReservation}
                onChange={(e) => setPrioriteReservation(e.target.checked)}
              />
              <span>Réservation prioritaire (+20€)</span>
            </label>
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              onClick={onCancel}
              className="flex-1 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition"
            >
              Annuler
            </button>
            <button
              onClick={onProceed}
              className="flex-1 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition"
            >
              Réserver maintenant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
