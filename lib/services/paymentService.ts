// services/paymentService.ts

import {
  sendAdminNotificationEmail,
  sendClientConfirmationEmail, // On l'importe mais on ne l'utilisera pas encore
} from "@/lib/emails/confirmationEmail";
// Ajout du @ pour les chemins absolus
import { User } from "firebase/auth";
import { doc, getFirestore, setDoc } from "firebase/firestore";
import { toast } from "react-toastify";

// Le serveur a recalculé un prix différent de celui affiché (409 PRICE_CHANGED) et
// libéré l'empreinte carte : aucune réservation n'a été créée.
export class PriceChangedError extends Error {
  data: any;
  constructor(data: any) {
    super(data?.error || "Le prix de la course a changé.");
    this.name = "PriceChangedError";
    this.data = data;
  }
}

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
  rideParams,
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
  /** Paramètres de la course (adresses, distance, coordonnées, date brute, priorité) : le serveur recalcule le prix. */
  rideParams: Record<string, unknown>;
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

    // lot 0.3 : la réservation est créée par le SERVEUR (prix et amountAuthorized
    // recalculés, un PaymentIntent = une course). Aucune écriture client.
    // lot 1.1 : « seti_… » = carte enregistrée pour une course lointaine (empreinte différée).
    const isDeferred = paymentId.startsWith("seti_");
    const idToken = await user.getIdToken();
    const response = await fetch(isDeferred ? "/api/finalize-deferred-booking" : "/api/finalize-card-booking", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        ...(isDeferred ? { setupIntentId: paymentId } : { paymentIntentId: paymentId }),
        displayedTotalCents: Math.round(prixFinal * 100),
        bookingData: {
          ...rideParams,
          name,
          phone,
          notes: notes || "",
          dateFormatted: formattedDate,
        },
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (response.status === 409 && result?.code === "PRICE_CHANGED") {
      throw new PriceChangedError(result);
    }
    if (!response.ok) {
      throw new Error(result?.error || "Erreur lors de la finalisation de la réservation");
    }
    const reservationId: string = result.reservationId;

    // Préparer les données de réservation
    // En manual capture : le client a autorisé les fonds (hold actif), mais
    // le débit ne se déclenchera qu'à la capture admin post-course.
    // - status = "confirmed" : la course est planifiée
    // - paymentStatus = "authorized" : fonds gelés, pas encore capturés
    // Le webhook Stripe basculera paymentStatus → "captured" après capture.
    const fullBookingData = {
      userId: user.uid,
      depart: bookingData.depart,
      arrivee: bookingData.arrivee,
      distance: bookingData.distance,
      duree: bookingData.duree,
      prix: prixFinal,
      amountAuthorized: prixFinal,
      name,
      phone,
      notes: notes || "",
      prioriteReservation: prioriteReservation || false,
      paymentId,
      reservationId,
      reservationDate: date,
      dateFormatted: formattedDate,
      status: "confirmed",
      paymentStatus: isDeferred ? "card_saved" : "authorized",
      createdAt: new Date(),
      email: user.email,
      isPaid: false, // pas encore capturé — pour les templates emails
    };
    console.log("Données de réservation complètes préparées:", {
      depart: fullBookingData.depart,
      arrivee: fullBookingData.arrivee,
      phone: fullBookingData.phone,
      email: fullBookingData.email,
      reservationId: fullBookingData.reservationId,
    });

    const savedBooking = { id: result.bookingId, ...fullBookingData };
    console.log("Réservation créée par le serveur avec ID:", savedBooking.id);

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
    if (error instanceof PriceChangedError) throw error;
    console.error(
      "Erreur globale lors de la finalisation de la réservation:",
      error
    );
    toast.error("Une erreur est survenue lors de la confirmation.");
    throw error;
  }
}
