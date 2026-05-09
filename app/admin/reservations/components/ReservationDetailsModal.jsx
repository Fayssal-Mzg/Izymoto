import {
  X,
  User,
  Phone,
  Calendar,
  MapPin,
  Wallet,
  CreditCard,
  Sparkles,
} from "lucide-react";

export default function ReservationDetailsModal({
  booking,
  onClose,
  onStatusChange,
  onDelete,
}) {
  const getStatusBadge = (status) => {
    switch (status) {
      case "confirmed":
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
            Confirmée
          </span>
        );
      case "pending":
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
            En attente
          </span>
        );
      case "cancelled":
        return (
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
            Annulée
          </span>
        );
      case "completed":
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
            Terminée
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl mx-4">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-medium">
            Détails de la réservation #
            {booking.reservationId || booking.id.substring(0, 8)}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-500 uppercase text-xs mb-2">
                Informations client
              </h4>
              <div className="space-y-3">
                <div className="flex items-start">
                  <User className="h-5 w-5 mr-2 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium">{booking.name}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Phone className="h-5 w-5 mr-2 text-gray-400 mt-0.5" />
                  <div>
                    <p>{booking.phone}</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-500 uppercase text-xs mb-2">
                Détails de la réservation
              </h4>
              <div className="space-y-3">
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 mr-2 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Date de réservation</p>
                    <p>{new Date(booking.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="p-1 rounded-full bg-green-100 mr-2">
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Statut</p>
                    <p>{getStatusBadge(booking.status)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="font-medium text-gray-500 uppercase text-xs mb-2">
              Détails du trajet
            </h4>
            <div className="space-y-3">
              <div className="flex items-start">
                <MapPin className="h-5 w-5 mr-2 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">De</p>
                  <p>{booking.depart}</p>
                </div>
              </div>
              <div className="flex items-start">
                <MapPin className="h-5 w-5 mr-2 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">À</p>
                  <p>{booking.arrivee}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="font-medium text-gray-500 uppercase text-xs mb-2">
              Paiement
            </h4>
            <div className="bg-gray-50 p-4 rounded space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {booking.paymentMethod === "wallet" ? (
                  <>
                    <Wallet className="h-5 w-5 text-amber-600" />
                    <span className="font-semibold text-amber-800">
                      Portefeuille
                    </span>
                    <span className="text-sm text-gray-600">
                      — {booking.prix}€ débités au moment de la réservation
                    </span>
                  </>
                ) : booking.paymentMethod === "hybrid" ? (
                  <>
                    <Sparkles className="h-5 w-5 text-amber-600" />
                    <span className="font-semibold text-amber-800">Hybride</span>
                    <span className="text-sm text-gray-600">
                      — wallet +{" "}
                      {booking.paymentStatus === "captured" ? "CB capturée" : "CB en hold"}
                    </span>
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5 text-gray-600" />
                    <span className="font-semibold text-gray-800">
                      Carte bancaire
                    </span>
                    {booking.paymentStatus && (
                      <span className="text-xs text-gray-500 ml-2">
                        ({booking.paymentStatus})
                      </span>
                    )}
                  </>
                )}
              </div>

              {booking.paymentMethod === "hybrid" && (
                <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white rounded p-2 border border-amber-200">
                    <div className="text-xs uppercase tracking-wider text-amber-700 flex items-center gap-1">
                      <Wallet className="h-3 w-3" /> Portefeuille
                    </div>
                    <div className="font-semibold tabular-nums mt-0.5">
                      {((booking.walletAmountCents || 0) / 100).toFixed(2)}€
                    </div>
                  </div>
                  <div className="bg-white rounded p-2 border border-gray-200">
                    <div className="text-xs uppercase tracking-wider text-gray-600 flex items-center gap-1">
                      <CreditCard className="h-3 w-3" /> Carte
                    </div>
                    <div className="font-semibold tabular-nums mt-0.5">
                      {((booking.cardAmountCents || 0) / 100).toFixed(2)}€
                    </div>
                  </div>
                </div>
              )}

              {(booking.paymentMethod === "card" ||
                booking.paymentMethod === "hybrid") &&
                booking.paymentId && (
                  <p className="text-xs text-gray-400 font-mono pt-1">
                    ID Stripe : {booking.paymentId}
                  </p>
                )}
            </div>
          </div>

          <div className="mt-6">
            <h4 className="font-medium text-gray-500 uppercase text-xs mb-2">
              Informations supplémentaires
            </h4>
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-sm">
                {booking.notes || "Aucune note supplémentaire."}
              </p>
            </div>
          </div>

          <div className="mt-8 flex justify-between">
            <button
              onClick={() => {
                onDelete(booking.id);
              }}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Supprimer
            </button>

            <div className="space-x-2">
              <button
                onClick={() => onStatusChange(booking.id, "completed")}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Terminer
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
