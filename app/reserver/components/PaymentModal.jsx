// app/reserver/components/PaymentModal.jsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { saveBooking } from "@/lib/firebase/bookings";
import { getStripe } from "@/lib/stripe";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useState, useEffect } from "react";

// Gardez votre initialisation de Stripe
const stripePromise = loadStripe(
  "pk_test_51R7yIDCaUgDUSBsLiD906SbJVNEXT_PUBLIC_STRIPE_PUBLISHABLE_KEYwgeMdKCxgNkqo35X4XW1MymxdqEQHD7cEbc19GWzP4zm3lQHoAlAFHYmfXzFjPp00QCyxMS4Q"
);

// Composant de formulaire Stripe
function CheckoutForm({ clientSecret, prixFinal, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsLoading(true);
    setError(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/confirmation`,
        },
        redirect: "if_required",
      });

      if (error) {
        setError(error.message);
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        onSuccess(paymentIntent.id);
      }
    } catch (err) {
      setError("Une erreur est survenue lors du traitement du paiement.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-md">{error}</div>
      )}

      <div className="bg-gray-50 p-4 rounded-md">
        <div className="flex justify-between font-bold">
          <span>Montant total :</span>
          <span>{Math.round(prixFinal)}€</span>
        </div>
      </div>

      <div className="flex space-x-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition"
          disabled={isLoading}
        >
          Retour
        </button>
        <button
          type="submit"
          disabled={!stripe || isLoading}
          className="flex-1 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition flex justify-center items-center"
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

// Modal complet
export default function PaymentModal({
  prixFinal,
  bookingData,
  onSuccess,
  onCancel,
  reservationDate,
}) {
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState(null);

  // Ajoutez ceci pour accéder à l'utilisateur connecté
  const { user } = useAuth();

  useEffect(() => {
    // Créer l'intention de paiement au chargement du modal
    const createPaymentIntent = async () => {
      try {
        console.log(
          "Tentative de création d'intention de paiement (TEST MODE)"
        );

        const response = await fetch("/api/create-payment-intent", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: prixFinal,
            metadata: bookingData,
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

    createPaymentIntent();
  }, [prixFinal, bookingData]);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-[#ffc107] p-4">
          <h3 className="text-xl font-bold text-black">
            Paiement sécurisé (MODE TEST)
          </h3>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-md mb-4">
              {error}
            </div>
          )}

          {clientSecret ? (
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
                onSuccess={onSuccess} // Transmission directe de la callback du parent
                onCancel={onCancel}
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
