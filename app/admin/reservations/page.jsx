"use client";

import AdminLayout from "../components/AdminLayout";
import ReservationDetailsModal from "./components/ReservationDetailsModal";
import ReservationsTable from "./components/ReservationsTable";
import {
  getAllBookings,
  updateBookingStatus,
  deleteBooking,
  generateInvoicePDF,
} from "@/lib/firebase/admin";
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
      setBookings(
        bookings.map((booking) =>
          booking.id === bookingId ? { ...booking, status: newStatus } : booking
        )
      );

      if (selectedBooking && selectedBooking.id === bookingId) {
        setSelectedBooking({ ...selectedBooking, status: newStatus });
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
    }
  };

  const handleDelete = async (bookingId) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette réservation ?")) {
      try {
        await deleteBooking(bookingId);
        setBookings(bookings.filter((booking) => booking.id !== bookingId));

        if (selectedBooking && selectedBooking.id === bookingId) {
          setShowDetailsModal(false);
        }
      } catch (error) {
        console.error(
          "Erreur lors de la suppression de la réservation:",
          error
        );
      }
    }
  };

  const handleGenerateInvoice = async (booking) => {
    try {
      const { pdfUrl } = await generateInvoicePDF(booking);
      window.open(pdfUrl, "_blank");
    } catch (error) {
      console.error("Erreur lors de la génération de la facture:", error);
      alert("Impossible de générer la facture");
    }
  };

  const openDetailsModal = (booking) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestion des réservations</h1>

        {/* Filtre de statut */}
        <div className="flex space-x-2">
          <select
            className="px-4 py-2 border rounded"
            onChange={(e) => {
              // Logique de filtrage des réservations
            }}
          >
            <option value="">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="confirmed">Confirmé</option>
            <option value="completed">Terminé</option>
          </select>
        </div>
      </div>

      <ReservationsTable
        bookings={bookings}
        onStatusChange={handleStatusChange}
        onViewDetails={openDetailsModal}
        onGenerateInvoice={handleGenerateInvoice}
      />

      {showDetailsModal && selectedBooking && (
        <ReservationDetailsModal
          booking={selectedBooking}
          onClose={() => setShowDetailsModal(false)}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          onGenerateInvoice={handleGenerateInvoice}
        />
      )}
    </AdminLayout>
  );
}
