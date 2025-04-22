// services/paymentService.ts

import {
  sendAdminNotificationEmail,
  sendClientConfirmationEmail, // On l'importe mais on ne l'utilisera pas encore
} from "@/lib/emails/confirmationEmail";
// Ajout du @ pour les chemins absolus
import { saveBooking } from "@/lib/firebase/bookings";
// Ajout du @ pour les chemins absolus
import { User } from "firebase/auth";
import { doc, getFirestore, setDoc } from "firebase/firestore";
import { toast } from "react-toastify";

export async function handleSuccessfulPayment({
  user,
  bookingData,
  paymentId,
  name,
  phone,
  prixFinal,
  reservationDate,
  notes,
  prioriteReservation,
  onSuccess,
}: {
  user: User;
  bookingData: any;
  paymentId: string;
  name: string;
  phone: string;
  prixFinal: number;
  reservationDate: string;
  notes?: string;
  prioriteReservation?: boolean;
  onSuccess?: (booking: any) => void;
}) {
  try {
    console.log("=== DÉBUT PROCESSUS DE PAIEMENT ===");
    console.log("Données initiales:", {
      userId: user.uid,
      email: user.email,
      name,
      phone,
      paymentId,
      reservationDate,
    });

    // Générer un ID de réservation unique
    const reservationId = `CMD-${Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase()}`;

    // Formater la date de réservation
    const date = new Date(reservationDate);
    const formattedDate = `${date.toLocaleDateString()} à ${date.toLocaleTimeString()}`;

    // Mettre à jour le profil utilisateur
    const db = getFirestore();
    await setDoc(
      doc(db, "users", user.uid),
      {
        displayName: name || user.displayName,
        phoneNumber: phone,
      },
      { merge: true }
    );
    console.log("Profil utilisateur mis à jour avec phoneNumber:", phone);

    // Préparer les données de réservation
    const fullBookingData = {
      userId: user.uid,
      depart: bookingData.depart,
      arrivee: bookingData.arrivee,
      distance: bookingData.distance,
      duree: bookingData.duree,
      prix: prixFinal,
      name,
      phone,
      notes: notes || "",
      prioriteReservation: prioriteReservation || false,
      paymentId,
      reservationId,
      reservationDate: date,
      dateFormatted: formattedDate,
      status: "confirmed",
      createdAt: new Date(),
      email: user.email,
      isPaid: true, // Important pour le template des emails
    };
    console.log("Données de réservation complètes préparées:", {
      depart: fullBookingData.depart,
      arrivee: fullBookingData.arrivee,
      phone: fullBookingData.phone,
      email: fullBookingData.email,
      reservationId: fullBookingData.reservationId,
    });

    // Sauvegarder la réservation
    const savedBooking = await saveBooking(fullBookingData, user.uid);
    console.log("Réservation sauvegardée avec ID:", savedBooking.id);

    // Préparer les données pour les emails
    const emailData = {
      ...fullBookingData,
      bookingId: savedBooking.id,
      clientName: name || user.displayName || user.email,
      isPaid: true,
    };
    console.log("Données préparées pour les emails:", {
      bookingId: emailData.bookingId,
      clientName: emailData.clientName,
      phone: emailData.phone,
      email: emailData.email,
      isPaid: emailData.isPaid,
    });

    // Envoyer les emails séparément pour tracer les problèmes
    console.log("==========================================");
    console.log("DÉBUT ENVOI EMAIL CLIENT");
    try {
      const clientEmailResult = await sendClientConfirmationEmail(emailData);
      console.log("Email client envoyé avec succès ✓", {
        phone: emailData.phone,
        to: emailData.email,
      });
    } catch (emailError) {
      console.error("ÉCHEC envoi email client ✗", emailError);
    }

    console.log("==========================================");
    console.log("DÉBUT ENVOI EMAIL ADMIN");
    try {
      const adminEmailResult = await sendAdminNotificationEmail(emailData);
      console.log("Email admin envoyé avec succès ✓", {
        phone: emailData.phone,
        clientName: emailData.clientName,
      });
    } catch (emailError) {
      console.error("ÉCHEC envoi email admin ✗", emailError);
    }

    console.log("==========================================");

    // Afficher une notification de succès
    toast.success("Réservation confirmée !");

    // Appeler le callback de succès si fourni
    if (onSuccess) {
      onSuccess(savedBooking);
    }

    console.log("=== FIN PROCESSUS DE PAIEMENT ===");
    return savedBooking;
  } catch (error) {
    console.error(
      "Erreur globale lors de la finalisation de la réservation:",
      error
    );
    toast.error("Une erreur est survenue lors de la confirmation.");
    throw error;
  }
}
