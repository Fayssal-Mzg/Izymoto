// Environnement de test : AUCUN identifiant réel. Tout est forcé vers l'émulateur
// et le projet de démonstration, quelles que soient les variables du poste.
import { generateKeyPairSync } from "node:crypto";

process.env.GCLOUD_PROJECT = "demo-izymoto";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

// Garde : les tests ne doivent jamais viser autre chose qu'un émulateur local
// et un projet de démonstration.
const isLocal = (hostPort: string | undefined) =>
  /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(hostPort ?? "");
if (!isLocal(process.env.FIREBASE_AUTH_EMULATOR_HOST) || !isLocal(process.env.FIRESTORE_EMULATOR_HOST)) {
  throw new Error("Tests : les hôtes d'émulateurs doivent être 127.0.0.1 ou localhost.");
}
if (!process.env.GCLOUD_PROJECT?.startsWith("demo-")) {
  throw new Error("Tests : le projectId doit commencer par demo-.");
}

// firebase-admin (cert()) exige une clé PEM syntaxiquement valide : on en
// génère une jetable. L'émulateur Auth n'en vérifie pas la signature.
const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
process.env.FIREBASE_ADMIN_PROJECT_ID = "demo-izymoto";
process.env.FIREBASE_ADMIN_CLIENT_EMAIL = "test@demo-izymoto.iam.gserviceaccount.com";
process.env.FIREBASE_ADMIN_PRIVATE_KEY = privateKey;

// Valeurs factices : les modules Stripe / Resend sont de toute façon mockés.
process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
process.env.RESEND_API_KEY = "re_dummy";
