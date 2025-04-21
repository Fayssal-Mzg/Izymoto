import Stripe from "stripe";

// Récupération de la clé secrète depuis les variables d'environnement
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

/**
 * Initialisation de l'instance Stripe côté serveur
 * À utiliser uniquement dans les routes API
 */
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2023-10-16", // Utilisez la dernière version stable disponible
});

// Log pour vérifier le mode d'utilisation (test ou production)
if (stripeSecretKey) {
  console.log(
    "Stripe API initialisée en mode:",
    stripeSecretKey.startsWith("sk_test") ? "TEST" : "PRODUCTION"
  );
} else {
  console.error("ATTENTION: La clé secrète Stripe n'est pas définie");
}

// Exporter l'instance et la clé webhook pour les routes API
export { stripe, stripeWebhookSecret };
