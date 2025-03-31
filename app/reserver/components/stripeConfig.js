// app/reserver/components/stripeConfig.js
import { loadStripe } from "@stripe/stripe-js";

// Fonction pour obtenir l'instance Stripe
let stripePromise;
export function getStripeInstance() {
  if (!stripePromise) {
    stripePromise = loadStripe(NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
}
