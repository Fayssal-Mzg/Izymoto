// app/admin/reservations/page.jsx
"use client";

import AdminLayout from "../components/AdminLayout";
import {
  getAllBookings,
  updateBookingStatus,
  deleteBooking,
} from "@/lib/firebase/admin";
import {
  Check,
  Clock,
  X,
  MoreHorizontal,
  Calendar,
  MapPin,
  User,
  Phone,
} from "lucide-react";
import { useState, useEffect } from "react";

export default function ReservationsPage() {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      const bookingsData = await getAllBookings();
      setBookings(bookingsData);
    } catch (error) {
      console.error("Erreur lors du chargement des réservations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      await updateBookingStatus(bookingId, newStatus);
      // Mettre à jour l'interface utilisateur
      setBookings(
        bookings.map((booking) =>
          booking.id === bookingId ? { ...booking, status: newStatus } : booking
        )
      );
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
    }
  };

  const handleDelete = async (bookingId) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette réservation ?")) {
      try {
        await deleteBooking(bookingId);
        // Mettre à jour l'interface utilisateur
        setBookings(bookings.filter((booking) => booking.id !== bookingId));
      } catch (error) {
        console.error(
          "Erreur lors de la suppression de la réservation:",
          error
        );
      }
    }
  };

  const openDetailsModal = (booking) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

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

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ffc107]"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Gestion des réservations</h1>

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
                      <div className="text-sm text-gray-500">
                        {booking.phone}
                      </div>
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
                          onClick={() =>
                            handleStatusChange(booking.id, "completed")
                          }
                          className="text-green-600 hover:text-green-900"
                          title="Marquer comme terminée"
                        >
                          <Check className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() =>
                            handleStatusChange(booking.id, "pending")
                          }
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Marquer comme en attente"
                        >
                          <Clock className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() =>
                            handleStatusChange(booking.id, "cancelled")
                          }
                          className="text-red-600 hover:text-red-900"
                          title="Marquer comme annulée"
                        >
                          <X className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => openDetailsModal(booking)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Voir les détails"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de détails de réservation */}
      {showDetailsModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-medium">
                Détails de la réservation #
                {selectedBooking.reservationId ||
                  selectedBooking.id.substring(0, 8)}
              </h3>
              <button
                onClick={() => setShowDetailsModal(false)}
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
                        <p className="font-medium">{selectedBooking.name}</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <Phone className="h-5 w-5 mr-2 text-gray-400 mt-0.5" />
                      <div>
                        <p>{selectedBooking.phone}</p>
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
                        <p className="text-sm text-gray-500">
                          Date de réservation
                        </p>
                        <p>
                          {new Date(selectedBooking.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="p-1 rounded-full bg-green-100 mr-2">
                        <div className="h-3 w-3 rounded-full bg-green-500"></div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Statut</p>
                        <p>{getStatusBadge(selectedBooking.status)}</p>
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
                      <p>{selectedBooking.depart}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 mr-2 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">À</p>
                      <p>{selectedBooking.arrivee}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-medium text-gray-500 uppercase text-xs mb-2">
                  Informations supplémentaires
                </h4>
                <div className="bg-gray-50 p-4 rounded">
                  <p className="text-sm">
                    {selectedBooking.notes || "Aucune note supplémentaire."}
                  </p>
                </div>
              </div>

              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => {
                    handleDelete(selectedBooking.id);
                    setShowDetailsModal(false);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Supprimer
                </button>

                <div className="space-x-2">
                  <button
                    onClick={() => {
                      handleStatusChange(selectedBooking.id, "completed");
                      setSelectedBooking({
                        ...selectedBooking,
                        status: "completed",
                      });
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Terminer
                  </button>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
