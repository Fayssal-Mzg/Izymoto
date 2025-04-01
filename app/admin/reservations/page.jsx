"use client";

import AdminLayout from "../components/AdminLayout";
import ReservationDetailsModal from "./components/ReservationDetailsModal";
import ReservationsTable from "./components/ReservationsTable";
import {
  getAllBookings,
  updateBookingStatus,
  deleteBooking,
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
      // Mettre à jour l'interface utilisateur
      setBookings(
        bookings.map((booking) =>
          booking.id === bookingId ? { ...booking, status: newStatus } : booking
        )
      );

      // Si le booking est actuellement sélectionné, mettre à jour son statut
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
        // Mettre à jour l'interface utilisateur
        setBookings(bookings.filter((booking) => booking.id !== bookingId));

        // Si le booking supprimé était affiché dans le modal, fermer le modal
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
      <h1 className="text-2xl font-bold mb-6">Gestion des réservations</h1>

      <ReservationsTable
        bookings={bookings}
        onStatusChange={handleStatusChange}
        onViewDetails={openDetailsModal}
      />

      {showDetailsModal && selectedBooking && (
        <ReservationDetailsModal
          booking={selectedBooking}
          onClose={() => setShowDetailsModal(false)}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      )}
    </AdminLayout>
  );
}
