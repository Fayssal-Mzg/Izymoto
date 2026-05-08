import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// Init Admin SDK en lazy + singleton.
// Utilisé côté serveur uniquement (route handlers, webhooks).
// Bypasse les rules Firestore — donc ne JAMAIS exposer ce fichier au client.

let cachedApp: App | null = null;
let cachedDb: Firestore | null = null;

function getAdminApp(): App {
  if (cachedApp) return cachedApp;

  const existing = getApps()[0];
  if (existing) {
    cachedApp = existing;
    return existing;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !rawPrivateKey) {
    throw new Error(
      "Firebase Admin : env vars manquantes (FIREBASE_ADMIN_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY)."
    );
  }

  // Les retours à la ligne dans le .env sont escapés en \n littéraux.
  // Format attendu pour la PRIVATE_KEY : guillemets simples, \n littéraux.
  // Ex: FIREBASE_ADMIN_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----\nMII...\n-----END PRIVATE KEY-----\n'
  const privateKey = rawPrivateKey.replace(/\\n/g, "\n");

  cachedApp = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  return cachedApp;
}

export function getAdminFirestore(): Firestore {
  if (cachedDb) return cachedDb;
  cachedDb = getFirestore(getAdminApp());
  return cachedDb;
}
