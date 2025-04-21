import { Check, Clock, X, MoreHorizontal, FileText } from "lucide-react";

export default function ReservationsTable({
  bookings,
  onStatusChange,
  onViewDetails,
  onGenerateInvoice,
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
    <div className="bg-white shadow rounded-lg">
      <div className="p-4 border-b">
        <h2 className="text-lg font-medium">Toutes les réservations</h2>
      </div>

      {bookings.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          Aucune réservation trouvée.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trajet
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prix
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {booking.name}
                    </div>
                    <div className="text-sm text-gray-500">{booking.phone}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900 truncate max-w-xs">
                      De: {booking.depart.substring(0, 30)}...
                    </div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">
                      À: {booking.arrivee.substring(0, 30)}...
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {new Date(booking.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {booking.prix}€
                  </td>
                  <td className="px-4 py-4">
                    {getStatusBadge(booking.status)}
                  </td>
                  <td className="px-4 py-4 text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => onStatusChange(booking.id, "completed")}
                        className="text-green-600 hover:text-green-900"
                        title="Marquer comme terminée"
                      >
                        <Check className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => onStatusChange(booking.id, "pending")}
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Marquer comme en attente"
                      >
                        <Clock className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => onStatusChange(booking.id, "cancelled")}
                        className="text-red-600 hover:text-red-900"
                        title="Marquer comme annulée"
                      >
                        <X className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => onViewDetails(booking)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Voir les détails"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </button>

                      {booking.status === "completed" && (
                        <button
                          onClick={() => onGenerateInvoice(booking)}
                          className="text-gold-600 hover:text-gold-900"
                          title="Générer la facture"
                        >
                          <FileText className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
