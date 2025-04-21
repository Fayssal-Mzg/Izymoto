import { loadStripe } from "@stripe/stripe-js";

// Récupération de la clé publique depuis les variables d'environnement
const stripePublishableKey =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";

// Initialisation de Stripe côté client
let stripePromise = null;

/**
 * Initialise et retourne l'instance Stripe côté client
 * Peut être utilisé dans les composants avec Elements
 */
export const getStripe = () => {
  if (!stripePromise && stripePublishableKey) {
    try {
      stripePromise = loadStripe(stripePublishableKey);
      console.log(
        "Stripe initialisé en mode:",
        stripePublishableKey.startsWith("pk_test") ? "TEST" : "PRODUCTION"
      );
    } catch (error) {
      console.error("Erreur lors de l'initialisation de Stripe:", error);
    }
  }

  if (!stripePromise) {
    console.error("La clé publique Stripe n'est pas définie correctement");
  }

  return stripePromise;
};
