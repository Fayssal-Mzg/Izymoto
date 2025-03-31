import { loadStripe } from "@stripe/stripe-js";

// Clé publique Stripe (visible côté client)
const stripePublishableKey =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  "pk_test_51R7yIDCaUgDUSBsLiD906SbJVNEXT_PUBLIC_STRIPE_PUBLISHABLE_KEYwgeMdKCxgNkqo35X4XW1MymxdqEQHD7cEbc19GWzP4zm3lQHoAlAFHYmfXzFjPp00QCyxMS4Q";

// Initialisation de Stripe côté client
let stripePromise;
export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(stripePublishableKey);
  }
  return stripePromise;
};
