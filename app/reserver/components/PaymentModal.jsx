// app/reserver/components/PaymentModal.jsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import {
  sendClientConfirmationEmail,
  sendAdminNotificationEmail,
} from "@/lib/emails/confirmationEmail";
import { saveBooking } from "@/lib/firebase/bookings";
import { getStripe } from "@/lib/stripe";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { getAuth } from "firebase/auth";
import { doc, setDoc, getDoc, getFirestore } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";

// Stripe initialization
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

// Composant de connexion nécessaire
function LoginRedirect({ bookingData }) {
  const router = useRouter();
  const { setReservationDetails } = useAuth();

  const handleSaveAndRedirect = () => {
    // Sauvegarder les détails dans le contexte d'authentification
    const reservationInfo = {
      depart: bookingData.depart,
      arrivee: bookingData.arrivee,
      distance: bookingData.distance,
      duree: bookingData.duree,
      prix: bookingData.prix,
    };

    setReservationDetails(reservationInfo);

    // Rediriger vers la page de connexion
    router.push("/connexion");
  };

  return (
    <div className="space-y-6 text-center p-4">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-16 w-16 text-blue-500 mx-auto"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>

      <h3 className="text-xl font-bold">Connexion requise</h3>

      <p className="text-gray-600">
        Vous devez être connecté pour finaliser votre réservation. Vos
        informations de trajet seront sauvegardées.
      </p>

      <div className="flex space-x-3 pt-4">
        <button
          onClick={handleSaveAndRedirect}
          className="flex-1 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          Se connecter
        </button>
      </div>
    </div>
  );
}

// Composant de vérification du numéro de téléphone
function PhoneVerification({ onVerified, onCancel, initialPhone }) {
  const [phoneNumber, setPhoneNumber] = useState(initialPhone || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const handleVerifyPhone = async (e) => {
    e.preventDefault();
    setError(null);

    if (!phoneNumber || phoneNumber.trim() === "") {
      setError("Le numéro de téléphone est obligatoire");
      return;
    }

    // Vérifier le format du numéro
    const phoneRegex = /^(\+33|0)[1-9](\d{2}){4}$/;
    const formattedPhone = phoneNumber.startsWith("+")
      ? phoneNumber
      : `+33${
          phoneNumber.startsWith("0") ? phoneNumber.substring(1) : phoneNumber
        }`;

    if (
      !phoneRegex.test(formattedPhone.replace(/\s/g, "")) &&
      !phoneRegex.test(phoneNumber.replace(/\s/g, ""))
    ) {
      setError(
        "Format de numéro invalide. Exemple valide: 0612345678 ou +33612345678"
      );
      return;
    }

    setIsLoading(true);
    try {
      // Sauvegarder le numéro dans Firestore
      const db = getFirestore();
      await setDoc(
        doc(db, "users", user.uid),
        {
          phoneNumber: formattedPhone,
          phoneVerified: true,
        },
        { merge: true }
      );

      // Notifier l'utilisateur du succès
      toast.success("Numéro de téléphone enregistré avec succès");

      // Informer le composant parent que le numéro est vérifié
      onVerified(formattedPhone);
    } catch (err) {
      console.error("Erreur lors de l'enregistrement du numéro:", err);
      setError("Une erreur est survenue lors de l'enregistrement du numéro");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <h3 className="text-lg font-medium">Numéro de téléphone</h3>

      <p className="text-gray-600 text-sm">
        Veuillez fournir votre numéro de téléphone pour permettre au chauffeur
        de vous contacter.
      </p>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleVerifyPhone} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Numéro de téléphone*
          </label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+33 6 12 34 56 78"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-base"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Format: +33612345678 ou 0612345678
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition text-sm"
            disabled={isLoading}
          >
            Retour
          </button>
          <button
            type="submit"
            className="flex-1 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm"
            disabled={isLoading}
          >
            {isLoading ? "Traitement..." : "Continuer"}
          </button>
        </div>
      </form>
    </div>
  );
}

// Composant de formulaire Stripe
function CheckoutForm({
  clientSecret,
  prixFinal,
  onSuccess,
  onCancel,
  phoneNumber,
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsLoading(true);
    setError(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          // Ne pas utiliser return_url ici pour gérer la redirection manuellement
          payment_method_data: {
            billing_details: {
              phone: phoneNumber,
            },
          },
        },
        redirect: "if_required",
      });

      if (error) {
        setError(error.message);
        // Rediriger vers la page d'annulation si c'est une erreur d'abandon de paiement
        if (
          error.type === "card_error" &&
          error.code === "payment_intent_canceled"
        ) {
          router.push("/paiement-annule");
        }
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        // Traiter le succès du paiement
        await onSuccess(paymentIntent.id);
        // Rediriger vers la page de succès après le traitement
        router.push("/paiement-reussi");
      }
    } catch (err) {
      setError("Une erreur est survenue lors du traitement du paiement.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div className="bg-green-50 p-3 rounded-md border border-green-200 mb-4">
        <div className="flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-green-500 mr-2"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-green-700 text-sm">
            Numéro enregistré: {phoneNumber}
          </span>
        </div>
      </div>

      <PaymentElement />

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="bg-gray-50 p-4 rounded-md">
        <div className="flex justify-between font-bold">
          <span>Montant total :</span>
          <span>{Math.round(prixFinal)}€</span>
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition text-sm"
          disabled={isLoading}
        >
          Retour
        </button>
        <button
          type="submit"
          disabled={!stripe || !elements || isLoading}
          className="flex-1 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition flex justify-center items-center text-sm"
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Traitement...
            </span>
          ) : (
            <span>Payer {Math.round(prixFinal)}€</span>
          )}
        </button>
      </div>
    </form>
  );
}

// Modal complet avec scrolling interne
export default function PaymentModal({
  prixFinal,
  bookingData,
  onSuccess,
  onCancel,
  reservationDate,
}) {
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState(null);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");

  // Accéder à l'utilisateur connecté
  const { user } = useAuth();
  const router = useRouter();

  // Vérifier si l'utilisateur a déjà un numéro de téléphone vérifié
  useEffect(() => {
    if (!user) {
      // Si l'utilisateur n'est pas connecté, ne pas continuer
      return;
    }

    const checkExistingPhoneNumber = async () => {
      try {
        // Vérifier si l'utilisateur a déjà un numéro enregistré dans Firestore
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, "users", user.uid));

        if (userDoc.exists() && userDoc.data().phoneNumber) {
          setPhoneNumber(userDoc.data().phoneNumber);
          setPhoneVerified(true);
        } else if (bookingData && bookingData.phone) {
          // Utiliser le téléphone du formulaire précédent comme valeur initiale
          setPhoneNumber(bookingData.phone);
        }
      } catch (err) {
        console.error("Erreur lors de la vérification du numéro:", err);
      }
    };

    checkExistingPhoneNumber();
  }, [user, bookingData]);

  useEffect(() => {
    // Ne créer l'intention de paiement que si l'utilisateur est connecté et a vérifié son téléphone
    if (user && phoneVerified) {
      createPaymentIntent();
    }
  }, [phoneVerified, prixFinal, user]);

  const handlePaymentSuccess = async (paymentIntentId) => {
    try {
      // Générer un numéro de commande
      const reservationId = `CMD-${Math.random()
        .toString(36)
        .substring(2, 10)
        .toUpperCase()}`;

      // Vérifier et préparer l'email
      const emailToUse =
        user.email || bookingData.email || "contact@izymoto.com";

      // Sauvegarde de la réservation avec le numéro de commande
      const savedBooking = await saveBooking(
        {
          ...bookingData,
          paymentIntentId,
          status: "paid",
          reservationId,
          name,
          phone: phoneNumber,
          email: emailToUse, // Ajout explicite de l'email
        },
        user.uid
      );

      // Préparer les données pour les emails
      const emailData = {
        bookingId: savedBooking.id,
        reservationId,
        clientName: name || user.displayName || user.email,
        email: emailToUse, // Utiliser l'email vérifié
        ...bookingData,
        prix: prixFinal,
        phone: phoneNumber,
        paymentIntentId,
        duree: bookingData.duree,
        isPaid: true,
      };

      // Envoi des emails en parallèle
      await Promise.all([
        sendClientConfirmationEmail(emailData),
        sendAdminNotificationEmail(emailData),
      ]);

      // Notifier l'utilisateur du succès
      toast.success("Réservation confirmée !");

      // Appeler onSuccess du parent pour finaliser le processus
      onSuccess(savedBooking);

      // La redirection est gérée dans le CheckoutForm
    } catch (error) {
      console.error("Erreur lors de la finalisation de la réservation", error);
      toast.error("Une erreur est survenue lors de la confirmation.");
    }
  };

  // Créer l'intention de paiement
  const createPaymentIntent = async () => {
    try {
      console.log("Tentative de création d'intention de paiement");

      // Ajouter le numéro de téléphone aux métadonnées
      const bookingWithPhone = {
        ...bookingData,
        phone: phoneNumber, // Remplacer par le numéro vérifié
      };

      const response = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: prixFinal,
          metadata: bookingWithPhone,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Erreur lors de la création du paiement"
        );
      }

      const data = await response.json();
      console.log("Intention de paiement créée avec succès");
      setClientSecret(data.clientSecret);
    } catch (error) {
      console.error("Erreur:", error);
      setError(
        error.message ||
          "Une erreur est survenue lors de la création du paiement"
      );
    }
  };

  const handlePhoneVerified = (phone) => {
    setPhoneVerified(true);
    setPhoneNumber(phone);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-lg w-full h-full sm:h-auto sm:w-full sm:max-w-md mx-auto flex flex-col sm:max-h-[90vh]">
        <div className="bg-[#ffc107] p-4 rounded-t-lg flex-shrink-0">
          <h3 className="text-xl font-bold text-black">
            {!user
              ? "Connexion requise"
              : !phoneVerified
              ? "Information de contact"
              : "Paiement sécurisé"}
          </h3>
        </div>

        {/* Conteneur avec scrolling */}
        <div className="overflow-y-auto flex-grow">
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-md m-4 text-sm">
              {error}
            </div>
          )}

          {!user ? (
            // Si l'utilisateur n'est pas connecté
            <LoginRedirect bookingData={bookingData} />
          ) : !phoneVerified ? (
            // Si l'utilisateur est connecté mais n'a pas encore vérifié son téléphone
            <PhoneVerification
              onVerified={handlePhoneVerified}
              onCancel={onCancel}
              initialPhone={phoneNumber}
            />
          ) : clientSecret ? (
            // Si l'utilisateur est connecté, a vérifié son téléphone et l'intention de paiement est créée
            <Elements
              stripe={getStripe()}
              options={{
                clientSecret,
                appearance: {
                  theme: "stripe",
                  variables: {
                    colorPrimary: "#ffc107",
                  },
                },
              }}
            >
              <CheckoutForm
                clientSecret={clientSecret}
                prixFinal={prixFinal}
                onSuccess={handlePaymentSuccess}
                onCancel={onCancel}
                phoneNumber={phoneNumber}
              />
            </Elements>
          ) : (
            <div className="flex flex-col items-center justify-center h-40">
              <svg
                className="animate-spin h-8 w-8 text-[#ffc107] mb-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <p className="text-gray-600">
                Initialisation du paiement en mode test...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
