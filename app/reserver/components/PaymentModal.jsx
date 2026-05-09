"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/lib/hooks/useWallet";
import { formatEuro } from "@/lib/wallet/tiers";
import { handleSuccessfulPayment } from "@/lib/services/paymentService";
import {
  sendClientConfirmationEmail,
  sendAdminNotificationEmail,
} from "@/lib/emails/confirmationEmail";
import { getStripe } from "@/lib/stripe";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { doc, setDoc, getDoc, getFirestore } from "firebase/firestore";
import Link from "next/link";
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
  LogIn,
  Wallet,
  Sparkles,
  AlertTriangle,
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
          <label
            htmlFor="payment-phone"
            className="block text-sm font-medium text-gray-700"
          >
            Numéro de téléphone <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
            <input
              id="payment-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
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
      } else if (
        paymentIntent &&
        (paymentIntent.status === "requires_capture" ||
          paymentIntent.status === "succeeded")
      ) {
        // requires_capture = flux hold/capture (auth gelée, capture manuelle plus tard)
        // succeeded = flux auto-capture (compat si on bascule un jour)
        console.log(
          "💳 Paiement autorisé avec ID:",
          paymentIntent.id,
          "status:",
          paymentIntent.status
        );

        await onSuccess(paymentIntent.id);
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

// Écran de choix entre paiement portefeuille ou CB.
// Affiché uniquement si l'user a un solde wallet > 0. Si solde >= prix, le
// bouton wallet est actif. Sinon, il est désactivé avec un lien "Recharger".
function PaymentMethodChoice({
  prixFinal,
  walletBalanceEur,
  onChooseWallet,
  onChooseCard,
  onCancel,
}) {
  const [animateIn, setAnimateIn] = useState(false);
  useEffect(() => {
    setAnimateIn(true);
  }, []);

  const balanceSuffisant = walletBalanceEur >= prixFinal;
  const manque = Math.max(0, prixFinal - walletBalanceEur);

  return (
    <div
      className={`p-6 space-y-4 transition-all duration-300 ${
        animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">
          Comment souhaitez-vous régler ?
        </h3>
        <p className="text-gray-600 text-sm">
          Montant : <span className="font-semibold">{Math.round(prixFinal)}€</span>
        </p>
      </div>

      <button
        type="button"
        onClick={onChooseWallet}
        disabled={!balanceSuffisant}
        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
          balanceSuffisant
            ? "border-amber-400 bg-amber-50 hover:bg-amber-100 cursor-pointer"
            : "border-gray-200 bg-gray-50 cursor-not-allowed opacity-70"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              balanceSuffisant ? "bg-black" : "bg-gray-300"
            }`}
          >
            <Wallet
              className={`h-5 w-5 ${
                balanceSuffisant ? "text-amber-400" : "text-white"
              }`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-gray-900">
                Mon portefeuille
              </span>
              {balanceSuffisant && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  <Sparkles className="h-3 w-3" />
                  Aucun frais CB
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600 mt-0.5">
              Solde : {formatEuro(walletBalanceEur)}
            </div>
            {!balanceSuffisant && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-orange-700">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>
                  Solde insuffisant ({formatEuro(manque)} manquants).{" "}
                  <Link
                    href="/portefeuille#paliers"
                    target="_blank"
                    className="font-semibold underline"
                  >
                    Recharger
                  </Link>
                </span>
              </div>
            )}
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={onChooseCard}
        className="w-full text-left p-4 rounded-xl border-2 border-gray-200 hover:border-gray-400 transition-all"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <CreditCard className="h-5 w-5 text-gray-700" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900">
              Carte bancaire
            </div>
            <div className="text-sm text-gray-600 mt-0.5">
              Visa, Mastercard, Amex
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400 self-center" />
        </div>
      </button>

      <button
        type="button"
        onClick={onCancel}
        className="w-full py-3 px-4 border border-gray-300 bg-white text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
      >
        Retour
      </button>
    </div>
  );
}

// Formulaire de confirmation pour le paiement par portefeuille.
// Pas de Stripe ici : on appelle /api/wallet/debit-for-booking qui débite
// atomiquement le wallet et crée le booking dans la même transaction.
function WalletPaymentForm({
  prixFinal,
  bookingData,
  phoneNumber,
  userName,
  walletBalanceEur,
  user,
  reservationDate,
  onSuccess,
  onCancel,
  onBack,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [animateIn, setAnimateIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setAnimateIn(true);
  }, []);

  const balanceAfter = walletBalanceEur - prixFinal;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const clientToken =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `wallet-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    try {
      const date = new Date(reservationDate);
      const formattedDate = `${date.toLocaleDateString()} à ${date.toLocaleTimeString()}`;

      const fullBookingData = {
        depart: bookingData.depart,
        arrivee: bookingData.arrivee,
        distance: bookingData.distance,
        duree: bookingData.duree,
        prix: prixFinal,
        amountAuthorized: prixFinal,
        amountCaptured: prixFinal,
        name: userName || user.displayName || "",
        phone: phoneNumber,
        notes: bookingData.notes || "",
        prioriteReservation: bookingData.prioriteReservation || false,
        reservationDate: date,
        dateFormatted: formattedDate,
        email: user.email,
      };

      const response = await fetch("/api/wallet/debit-for-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          amountCents: Math.round(prixFinal * 100),
          bookingData: fullBookingData,
          clientToken,
          description: `Course du ${formattedDate} (${bookingData.depart} → ${bookingData.arrivee})`,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erreur lors du paiement par portefeuille");
      }

      // Met à jour les infos user (nom + téléphone) en parallèle, comme le
      // fait le flux Stripe via paymentService.handleSuccessfulPayment.
      try {
        const db = getFirestore();
        await setDoc(
          doc(db, "users", user.uid),
          {
            displayName: userName || user.displayName,
            phoneNumber: phoneNumber,
          },
          { merge: true }
        );
      } catch (e) {
        console.warn("Impossible de mettre à jour le profil utilisateur :", e);
      }

      const emailData = {
        ...fullBookingData,
        bookingId: data.bookingId,
        reservationId: data.reservationId,
        clientName: userName || user.displayName || user.email,
        paymentMethod: "wallet",
        paymentStatus: "paid_wallet",
        isPaid: true,
        status: "confirmed",
      };

      try {
        await sendClientConfirmationEmail(emailData);
      } catch (e) {
        console.warn("Email client KO :", e);
      }
      try {
        await sendAdminNotificationEmail(emailData);
      } catch (e) {
        console.warn("Email admin KO :", e);
      }

      toast.success("Réservation confirmée — paiement par portefeuille !");

      onSuccess({
        id: data.bookingId,
        reservationId: data.reservationId,
        ...fullBookingData,
        paymentMethod: "wallet",
      });
      router.push("/paiement-reussi");
    } catch (err) {
      console.error("Erreur paiement wallet:", err);
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`p-6 space-y-5 transition-all duration-300 ${
        animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <div className="flex items-center p-3 bg-green-50 border border-green-100 rounded-lg">
        <Check className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
        <span className="text-green-700 text-sm">
          Numéro enregistré : {phoneNumber}
        </span>
      </div>

      <div className="rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 p-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-amber-800 font-semibold mb-3">
          <Wallet className="h-4 w-4" />
          Paiement par portefeuille
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-700">Solde actuel</span>
            <span className="font-semibold tabular-nums">
              {formatEuro(walletBalanceEur)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">Montant de la course</span>
            <span className="font-semibold tabular-nums text-red-700">
              −{formatEuro(prixFinal)}
            </span>
          </div>
          <div className="flex justify-between border-t border-amber-200 pt-2 mt-2">
            <span className="font-bold text-gray-900">Solde restant</span>
            <span className="font-bold text-lg tabular-nums">
              {formatEuro(balanceAfter)}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border-l-4 border-red-400 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onBack}
          className="py-3 px-4 border border-gray-300 bg-white text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex-1"
          disabled={isLoading}
        >
          Retour
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="py-3 px-4 bg-amber-400 text-black rounded-lg font-bold hover:bg-amber-300 transition-colors flex-1 flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {isLoading ? (
            <div className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full" />
          ) : (
            <Wallet className="h-5 w-5" />
          )}
          <span>
            {isLoading ? "Traitement…" : `Payer ${Math.round(prixFinal)}€`}
          </span>
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
  // null tant que l'user n'a pas choisi (ou auto-décidé). "wallet" ou "card".
  const [paymentMethod, setPaymentMethod] = useState(null);

  const { user } = useAuth();
  const { balanceEur, loading: walletLoading } = useWallet();
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

  // Auto-sélectionne CB si pas de solde wallet ou solde insuffisant.
  // Si solde >= prix, on laisse l'user choisir (paymentMethod reste null).
  useEffect(() => {
    if (!user || !phoneVerified) return;
    if (walletLoading) return;
    if (paymentMethod !== null) return;
    if (balanceEur === null || balanceEur < prixFinal) {
      setPaymentMethod("card");
    }
  }, [user, phoneVerified, walletLoading, balanceEur, prixFinal, paymentMethod]);

  // Crée le PaymentIntent Stripe uniquement quand l'user choisit CB.
  useEffect(() => {
    if (
      user &&
      phoneVerified &&
      paymentMethod === "card" &&
      !clientSecret
    ) {
      createPaymentIntent();
    }
  }, [phoneVerified, prixFinal, user, paymentMethod, clientSecret]);

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
    if (paymentMethod === null) return "Mode de paiement";
    if (paymentMethod === "wallet") return "Paiement portefeuille";
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
          ) : paymentMethod === null ? (
            walletLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin h-8 w-8 border-3 border-black border-t-transparent rounded-full mb-4"></div>
                <p className="text-gray-600">Vérification du portefeuille…</p>
              </div>
            ) : (
              <PaymentMethodChoice
                prixFinal={prixFinal}
                walletBalanceEur={balanceEur ?? 0}
                onChooseWallet={() => setPaymentMethod("wallet")}
                onChooseCard={() => setPaymentMethod("card")}
                onCancel={onCancel}
              />
            )
          ) : paymentMethod === "wallet" ? (
            <WalletPaymentForm
              prixFinal={prixFinal}
              bookingData={bookingData}
              phoneNumber={phoneNumber}
              userName={name}
              walletBalanceEur={balanceEur ?? 0}
              user={user}
              reservationDate={reservationDate}
              onSuccess={onSuccess}
              onCancel={onCancel}
              onBack={() => setPaymentMethod(null)}
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