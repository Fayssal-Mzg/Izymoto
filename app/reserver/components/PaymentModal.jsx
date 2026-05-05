"use client";

import { useAuth } from "@/contexts/AuthContext";
import { handleSuccessfulPayment } from "@/lib/services/paymentService";
import { getStripe } from "@/lib/stripe";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { doc, setDoc, getDoc, getFirestore } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { 
  LockKeyhole, 
  ChevronRight, 
  Phone, 
  User, 
  X, 
  CreditCard, 
  Check,
  ArrowRight,
  LogIn
} from "lucide-react";

// Composant de connexion redesigné
function LoginRedirect({ bookingData }) {
  const router = useRouter();
  const { setReservationDetails } = useAuth();
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    setAnimateIn(true);
  }, []);

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
    <div className={`space-y-6 p-6 text-center transition-all duration-300 ${
      animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
    }`}>
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
        <LockKeyhole className="h-8 w-8 text-gray-600" />
      </div>

      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Connexion requise</h3>
        <p className="text-gray-600">
          Vous devez être connecté pour finaliser votre réservation. Vos
          informations de trajet seront sauvegardées.
        </p>
      </div>

      <button
        onClick={handleSaveAndRedirect}
        className="w-full py-3 px-4 bg-black text-white rounded-lg font-medium transition-all duration-300 hover:bg-gray-800 flex items-center justify-center"
      >
        <LogIn className="mr-2 h-5 w-5" />
        <span>Se connecter</span>
      </button>
    </div>
  );
}

// Composant de vérification du numéro de téléphone redesigné
function PhoneVerification({ onVerified, onCancel, initialPhone }) {
  const [phoneNumber, setPhoneNumber] = useState(initialPhone || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    setAnimateIn(true);
  }, []);

  const handleVerifyPhone = async (e) => {
    e.preventDefault();
    setError(null);

    if (!phoneNumber || phoneNumber.trim() === "") {
      setError("Le numéro de téléphone est obligatoire");
      return;
    }

    // Regex unifiée avec UnifiedUserModal — accepte +33 / 0033 / 0 avec ou sans
    // séparateurs (espaces, points, tirets).
    const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
    const cleaned = phoneNumber.replace(/\s/g, "");
    const formattedPhone = cleaned.startsWith("+")
      ? cleaned
      : cleaned.startsWith("00")
      ? `+${cleaned.substring(2)}`
      : `+33${cleaned.startsWith("0") ? cleaned.substring(1) : cleaned}`;

    if (!phoneRegex.test(phoneNumber)) {
      setError(
        "Format de numéro invalide. Exemple valide: 06 12 34 56 78 ou +33 6 12 34 56 78"
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
    <div className={`p-6 space-y-6 transition-all duration-300 ${
      animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
    }`}>
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Numéro de téléphone</h3>
        <p className="text-gray-600 text-sm">
          Veuillez fournir votre numéro de téléphone pour permettre au chauffeur de vous contacter.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border-l-4 border-red-400 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleVerifyPhone} className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Numéro de téléphone <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+33 6 12 34 56 78"
              className="w-full p-3 pl-10 border border-gray-300 rounded-lg text-base focus:ring-black focus:border-black transition-all"
              required
            />
          </div>
          <p className="text-xs text-gray-500">
            Format: +33612345678 ou 0612345678
          </p>
        </div>

        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="py-3 px-4 border border-gray-300 bg-white text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex-1 text-center"
            disabled={isLoading}
          >
            Retour
          </button>
          <button
            type="submit"
            className="py-3 px-4 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors flex-1 text-center flex items-center justify-center space-x-2 group"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              <>
                <span>Continuer</span>
                <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// Formulaire de paiement redesigné
function CheckoutForm({
  clientSecret,
  prixFinal,
  onSuccess,
  onCancel,
  phoneNumber,
  userName,
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    setAnimateIn(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsLoading(true);
    setError(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          payment_method_data: {
            billing_details: {
              phone: phoneNumber,
              name: userName,
            },
          },
        },
        redirect: "if_required",
      });

      if (error) {
        setError(error.message);
        if (
          error.type === "card_error" &&
          error.code === "payment_intent_canceled"
        ) {
          router.push("/paiement-annule");
        }
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        console.log("💳 Paiement confirmé avec ID:", paymentIntent.id);
        
        // Traiter le succès du paiement
        await onSuccess(paymentIntent.id);

        // Rediriger vers la page de succès après le traitement
        router.push("/paiement-reussi");
      }
    } catch (err) {
      setError("Une erreur est survenue lors du traitement du paiement.");
      console.error("❌ Erreur lors du traitement de paiement:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`p-6 space-y-6 transition-all duration-300 ${
      animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
    }`}>
      <div className="flex items-center p-3 bg-green-50 border border-green-100 rounded-lg">
        <Check className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
        <span className="text-green-700 text-sm">
          Numéro enregistré: {phoneNumber}
        </span>
      </div>

      <div className="bg-white p-3 rounded-lg border border-gray-200">
        <PaymentElement />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border-l-4 border-red-400 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-700">Montant total</span>
          <span className="font-bold text-xl text-black">{Math.round(prixFinal)}€</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="py-3 px-4 border border-gray-300 bg-white text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex-1 text-center"
          disabled={isLoading}
        >
          Retour
        </button>
        <button
          type="submit"
          disabled={!stripe || !elements || isLoading}
          className="py-3 px-4 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors flex-1 text-center flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
          ) : (
            <CreditCard className="mr-2 h-5 w-5" />
          )}
          <span>{isLoading ? "Traitement..." : `Payer ${Math.round(prixFinal)}€`}</span>
        </button>
      </div>
    </form>
  );
}

// Modal complet redesigné
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
  const [name, setName] = useState("");
  const [animateIn, setAnimateIn] = useState(false);

  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setAnimateIn(true);
  }, []);

  // Vérifier si l'utilisateur a déjà un numéro de téléphone vérifié
  useEffect(() => {
    if (!user) return;

    const checkExistingPhoneNumber = async () => {
      try {
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, "users", user.uid));

        if (userDoc.exists()) {
          if (userDoc.data().phoneNumber) {
            setPhoneNumber(userDoc.data().phoneNumber);
            setPhoneVerified(true);
          }

          if (userDoc.data().displayName) {
            setName(userDoc.data().displayName);
          } else if (user.displayName) {
            setName(user.displayName);
          }
        }

        if (bookingData) {
          if (bookingData.phone && !phoneNumber) {
            setPhoneNumber(bookingData.phone);
          }

          if (bookingData.name && (!name || name === "")) {
            setName(bookingData.name);
          }
        }
      } catch (err) {
        console.error("Erreur lors de la vérification du numéro:", err);
      }
    };

    checkExistingPhoneNumber();
  }, [user, bookingData]);

  useEffect(() => {
    if (user && phoneVerified) {
      createPaymentIntent();
    }
  }, [phoneVerified, prixFinal, user]);

  const handlePaymentSuccess = async (paymentIntentId) => {
    try {
      await handleSuccessfulPayment({
        user,
        bookingData,
        paymentId: paymentIntentId,
        name: name || user.displayName || "",
        phone: phoneNumber,
        prixFinal,
        reservationDate,
        notes: bookingData.notes || "",
        prioriteReservation: bookingData.prioriteReservation || false,
        onSuccess: (savedBooking) => {
          onSuccess(savedBooking);
        },
      });

      toast.success("Réservation confirmée !");
    } catch (error) {
      console.error("Erreur lors de la finalisation de la réservation", error);
      toast.error("Une erreur est survenue lors de la confirmation.");
    }
  };

  const createPaymentIntent = async () => {
    try {
      const bookingWithPhone = {
        ...bookingData,
        phone: phoneNumber,
        name: name,
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

  // Choisir le titre en fonction de l'étape
  const getModalTitle = () => {
    if (!user) return "Connexion requise";
    if (!phoneVerified) return "Information de contact";
    return "Paiement sécurisé";
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-xl w-full max-w-md mx-auto shadow-2xl transform transition-all duration-300 ${
        animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`} style={{ maxHeight: '90vh' }}>
        {/* Header avec bouton de fermeture */}
        <div className="relative border-b border-gray-100 p-6">
          <div className="flex items-center">
            {!user ? (
              <LogIn className="text-gray-800 mr-3 h-5 w-5" />
            ) : !phoneVerified ? (
              <Phone className="text-gray-800 mr-3 h-5 w-5" />
            ) : (
              <CreditCard className="text-gray-800 mr-3 h-5 w-5" />
            )}
            <h3 className="text-xl font-bold text-gray-900">
              {getModalTitle()}
            </h3>
          </div>
          
          {phoneVerified && phoneNumber && (
            <p className="text-sm text-gray-500 mt-1 ml-8">
              Téléphone: {phoneNumber}
            </p>
          )}
          
          <button 
            onClick={onCancel}
            className="absolute right-6 top-6 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Conteneur avec scrolling */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
          {error && (
            <div className="mx-6 mt-6 p-3 bg-red-50 border-l-4 border-red-400 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {!user ? (
            <LoginRedirect bookingData={bookingData} />
          ) : !phoneVerified ? (
            <PhoneVerification
              onVerified={handlePhoneVerified}
              onCancel={onCancel}
              initialPhone={phoneNumber}
            />
          ) : clientSecret ? (
            <Elements
              stripe={getStripe()}
              options={{
                clientSecret,
                appearance: {
                  theme: "stripe",
                  variables: {
                    colorPrimary: "#000000",
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
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
                userName={name}
              />
            </Elements>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-3 border-black border-t-transparent rounded-full mb-4"></div>
              <p className="text-gray-600">
                Initialisation du paiement...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}