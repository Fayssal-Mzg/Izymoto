// lib/emails/confirmationEmail.ts

import emailjs from "@emailjs/browser";
import { Resend } from "resend";

// Définir les clés en premier pour qu'elles soient disponibles partout
const PRIMARY_USER_PUBLIC_KEY = "xRIZqWvmMaxkLXdi1";
const RESEND_API_KEY = "re_fq1DoEwi_DpatwxecusQGGY3BCxJCH24N";

// Fonction pour créer une instance Resend de manière sécurisée
function createResendInstance() {
  // Utiliser directement la constante RESEND_API_KEY
  const apiKey = RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      "RESEND_API_KEY is not set. Email sending via Resend will not work."
    );
    return null;
  }
  return new Resend(apiKey);
}

// Initialiser Resend uniquement côté client
const resend = typeof window !== "undefined" ? createResendInstance() : null;

function getEnvVar(key: string, defaultValue: string = ""): string {
  // Test temporaire avec valeurs en dur - VERSION CORRIGÉE TYPESCRIPT
  const hardcodedVars: Record<string, string> = {
    NEXT_PUBLIC_EMAILJS_PUBLIC_KEY: "xRIZqWvmMaxkLXdi1",
    NEXT_PUBLIC_EMAILJS_SERVICE_ID: "service_ycl34xv",
    NEXT_PUBLIC_EMAILJS_CLIENT_TEMPLATE_ID: "template_47csinh",
    NEXT_PUBLIC_EMAILJS_ADMIN_TEMPLATE_ID: "template_6uzak99",
  };

  if (hardcodedVars[key]) {
    console.log(`Using hardcoded value for ${key}`);
    return hardcodedVars[key];
  }

  // Reste de votre code...
  if (typeof process === "undefined" || typeof process.env === "undefined") {
    console.warn(`Process environment not available for: ${key}`);
    return defaultValue;
  }

  const value = process.env[key];
  if (!value) {
    console.warn(`Environment variable ${key} is not defined, using default`);
    return defaultValue;
  }
  return value;
}
// Initialisation EmailJS avec gestion d'erreur
if (typeof window !== "undefined") {
  try {
    const publicKey = getEnvVar(
      "NEXT_PUBLIC_EMAILJS_PUBLIC_KEY",
      PRIMARY_USER_PUBLIC_KEY
    );
    emailjs.init(publicKey);
    console.log("EmailJS initialized successfully with primary account");
  } catch (error) {
    console.error("EmailJS initialization error:", error);
  }
}

// Interface pour les données de réservation
interface EmailBookingData {
  clientName: string;
  bookingId: string;
  depart: string;
  arrivee: string;
  date: string;
  heure: string;
  prix: number | string;
  distance: number | string;
  duree?: string;
  email: string;
  phone?: string;
  isPaid?: boolean;
  notes?: string;
  prioriteReservation?: boolean;
  paymentId?: string; // Ajout du payment_id pour le template admin
  company_name?: string; // Ajout pour le template admin
}

/**
 * Prépare les données de réservation pour l'envoi d'emails
 */
export function prepareEmailData(bookingData: any): EmailBookingData {
  console.log("⚙️ PRÉPARATION DONNÉES EMAIL - Données reçues:", {
    name: bookingData.name,
    phone: bookingData.phone,
    email: bookingData.email,
    bookingId: bookingData.bookingId,
    paymentId: bookingData.paymentId,
  });

  let dateStr = "";
  let heureStr = "";

  // Traitement de la date
  if (bookingData.reservationDate) {
    const date = new Date(bookingData.reservationDate);
    dateStr = date.toLocaleDateString();
    heureStr = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } else if (bookingData.dateFormatted) {
    const parts = bookingData.dateFormatted.split(" à ");
    dateStr = parts[0];
    heureStr = parts.length > 1 ? parts[1] : "";
  }

  // Ajout de valeurs par défaut et fallback plus robustes
  const result = {
    clientName:
      bookingData.name ||
      bookingData.userName ||
      bookingData.clientName ||
      "Client",

    bookingId:
      bookingData.reservationId ||
      bookingData.bookingId ||
      `CMD-${Date.now().toString().substring(8)}`,

    depart: bookingData.depart || "",
    arrivee: bookingData.arrivee || "",

    date: dateStr,
    heure: heureStr,

    duree: bookingData.duree || "",

    prix:
      typeof bookingData.prix === "number"
        ? bookingData.prix.toFixed(2)
        : bookingData.prix || "0",

    distance:
      typeof bookingData.distance === "number"
        ? bookingData.distance.toFixed(2)
        : bookingData.distance || "0",

    email: bookingData.email || bookingData.to || "contact@izymoto.com", // Fallback email

    phone: bookingData.phone || bookingData.phoneNumber || "Non communiqué",

    isPaid: bookingData.isPaid || false,

    notes: bookingData.notes || "Aucune note",

    prioriteReservation: bookingData.prioriteReservation || false,

    paymentId: bookingData.paymentId || bookingData.paymentIntentId || "",

    company_name: "IzyMoto",
  };

  console.log("⚙️ PRÉPARATION DONNÉES EMAIL - Résultat:", {
    clientName: result.clientName,
    phone: result.phone,
    email: result.email,
    bookingId: result.bookingId,
    paymentId: result.paymentId,
    isPaid: result.isPaid,
  });

  return result;
}

/**
 * Emails de Devis via Resend
 */
export const sendDevisEmail = async (bookingData: any) => {
  try {
    // Au lieu d'appeler Resend directement, utiliser l'API route existante
    const response = await fetch("/api/send-devis", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: bookingData.name || bookingData.userName || "",
        email: bookingData.email || bookingData.to || "",
        depart: bookingData.depart || "",
        arrivee: bookingData.arrivee || "",
        prix: bookingData.prix,
        distance: bookingData.distance,
        reservationId:
          bookingData.reservationId ||
          `DEV-${Date.now().toString().substring(8)}`,
        notes: bookingData.notes || "",
        prioriteReservation: bookingData.prioriteReservation || false,
        phone: bookingData.phone || "",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Erreur lors de l'envoi de l'email");
    }

    const result = await response.json();
    console.log("Email de devis envoyé avec succès via l'API route", result);
    return result.clientEmail; // Retourner uniquement l'email client
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email de devis", error);
    throw error;
  }
};

// L'API route envoie déjà les deux emails (client et admin) en une seule fois
export const sendDevisAdminEmail = async (bookingData: any) => {
  console.log(
    "L'email admin est déjà envoyé par l'API route, pas besoin d'appel séparé"
  );
  return { success: true };
};

/**
 * Email client via EmailJS
 */
export const sendClientConfirmationEmail = async (bookingData: any) => {
  console.log("📧 ENVOI EMAIL CLIENT - Données entrantes:", {
    phone: bookingData.phone,
    email: bookingData.email,
    name: bookingData.name || bookingData.clientName,
  });

  try {
    const emailData = prepareEmailData(bookingData);

    // Récupérer l'email de manière plus robuste
    const recipientEmail =
      bookingData.email ||
      bookingData.to ||
      emailData.email ||
      "contact@izymoto.com";

    // Validation stricte de l'email
    if (!recipientEmail || !recipientEmail.includes("@")) {
      console.error("Email client invalide:", recipientEmail);
      return; // Ou utilisez un email par défaut
    }

    const serviceId = getEnvVar(
      "NEXT_PUBLIC_EMAILJS_SERVICE_ID",
      "service_ycl34xv"
    );
    const templateId = getEnvVar(
      "NEXT_PUBLIC_EMAILJS_CLIENT_TEMPLATE_ID",
      "template_47csinh"
    );

    // Convertir tous les paramètres en chaînes de caractères pour le template client
    const templateParams = {
      client_name: String(emailData.clientName),
      order_id: String(emailData.bookingId),
      depart: String(emailData.depart),
      arrivee: String(emailData.arrivee),
      date: String(emailData.date),
      heure: String(emailData.heure),
      prix: String(emailData.prix),
      distance: String(emailData.distance),
      client_email: String(recipientEmail),
      phone: String(emailData.phone || ""),
      payment_status: emailData.isPaid
        ? "Payé en ligne"
        : "À régler au chauffeur",
    };

    console.log("📧 ENVOI EMAIL CLIENT - Paramètres du template:", {
      client_name: templateParams.client_name,
      phone: templateParams.phone,
      client_email: templateParams.client_email,
      payment_status: templateParams.payment_status,
    });

    // Filtrer les valeurs undefined ou null
    const cleanedParams = Object.fromEntries(
      Object.entries(templateParams).filter(([_, v]) => v != null)
    );

    const response = await emailjs.send(serviceId, templateId, cleanedParams);

    console.log("📧 EMAIL CLIENT ENVOYÉ avec succès", response);
    return response;
  } catch (error) {
    console.error("❌ ÉCHEC ENVOI EMAIL CLIENT:", error);

    // Log plus détaillé de l'erreur
    if (error instanceof Error) {
      console.error("Détails de l'erreur:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
    }

    throw error;
  }
};

/**
 * Email admin via EmailJS
 */
export const sendAdminNotificationEmail = async (bookingData: any) => {
  console.log("📧 ENVOI EMAIL ADMIN - Données entrantes:", {
    phone: bookingData.phone,
    email: bookingData.email,
    name: bookingData.name || bookingData.clientName,
    paymentId: bookingData.paymentId || bookingData.paymentIntentId,
  });

  try {
    const emailData = prepareEmailData(bookingData);

    const serviceId = getEnvVar(
      "NEXT_PUBLIC_EMAILJS_SERVICE_ID",
      "service_ycl34xv"
    );
    const templateId = getEnvVar(
      "NEXT_PUBLIC_EMAILJS_ADMIN_TEMPLATE_ID",
      "template_6uzak99"
    );

    // Paramètres pour le template admin
    const templateParams = {
      client_name: String(emailData.clientName),
      booking_id: String(emailData.bookingId),
      depart: String(emailData.depart),
      arrivee: String(emailData.arrivee),
      date: String(emailData.date),
      heure: String(emailData.heure),
      prix: String(emailData.prix),
      distance: String(emailData.distance),
      duree: emailData.duree ? String(emailData.duree) : "",
      client_email: String(emailData.email),
      client_phone: String(emailData.phone || "Non communiqué"),
      payment_status: emailData.isPaid
        ? "Payé en ligne"
        : "À régler au chauffeur",
      notes: String(emailData.notes || "Aucune note spécifique"),
      payment_id: String(emailData.paymentId || ""),
      company_name: String(emailData.company_name || "IzyMoto"),
      reservation_number: String(emailData.bookingId),
    };

    console.log("📧 ENVOI EMAIL ADMIN - Paramètres du template:", {
      client_name: templateParams.client_name,
      client_phone: templateParams.client_phone,
      client_email: templateParams.client_email,
      payment_id: templateParams.payment_id,
      payment_status: templateParams.payment_status,
    });

    // Filtrer les valeurs undefined ou null
    const cleanedParams = Object.fromEntries(
      Object.entries(templateParams).filter(([_, v]) => v != null)
    );

    const response = await emailjs.send(serviceId, templateId, cleanedParams);

    console.log("📧 EMAIL ADMIN ENVOYÉ avec succès", response);
    return response;
  } catch (error) {
    console.error("❌ ÉCHEC ENVOI EMAIL ADMIN:", error);
    throw error;
  }
};

/**
 * Envoie les emails de devis (client et admin)
 */
export const sendDevisEmails = async (bookingData: any): Promise<boolean> => {
  console.log("Envoi des emails de devis pour:", {
    phone: bookingData.phone,
    email: bookingData.email,
  });

  try {
    await sendDevisEmail(bookingData);
    return true;
  } catch (error) {
    console.warn(
      "Erreur lors de l'envoi des emails de devis, mais on continue:",
      error
    );
    // Même si les emails échouent, considérer l'opération comme réussie pour ne pas bloquer le flux
    return true;
  }
};

/**
 * Fonction principale de confirmation d'emails
 */
export const sendConfirmationEmails = async (
  bookingData: any
): Promise<boolean> => {
  console.log("📧 CONFIRMATION EMAILS - Données initiales reçues:", {
    phone: bookingData.phone,
    email: bookingData.email,
    name: bookingData.name || bookingData.clientName,
    paymentId: bookingData.paymentId,
  });

  try {
    // Envoyer l'email au client via EmailJS
    await sendClientConfirmationEmail(bookingData);

    // Envoyer l'email à l'administrateur via EmailJS
    await sendAdminNotificationEmail(bookingData);

    return true;
  } catch (error) {
    console.error(
      "❌ Erreur lors de l'envoi des emails de confirmation:",
      error
    );
    return false;
  }
};
