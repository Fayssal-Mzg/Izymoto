import {
  sendAdminNotificationEmail,
  sendClientConfirmationEmail,
} from "../emails/confirmationEmail";
import { saveBooking } from "../firebase/bookings";
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
    };

    // Sauvegarder la réservation
    const savedBooking = await saveBooking(fullBookingData, user.uid);

    // Préparer les données pour les emails
    const emailData = {
      ...fullBookingData,
      bookingId: savedBooking.id,
      clientName: name || user.displayName || user.email,
      isPaid: true,
    };

    // Envoyer les emails de confirmation
    await Promise.all([
      sendClientConfirmationEmail(emailData),
      sendAdminNotificationEmail(emailData),
    ]);

    // Afficher une notification de succès
    toast.success("Réservation confirmée !");

    // Appeler le callback de succès si fourni
    if (onSuccess) {
      onSuccess(savedBooking);
    }

    return savedBooking;
  } catch (error) {
    console.error("Erreur lors de la finalisation de la réservation", error);
    toast.error("Une erreur est survenue lors de la confirmation.");
    throw error;
  }
}
