import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

// Init Admin SDK en lazy + singleton.
// Utilisé côté serveur uniquement (route handlers, webhooks).
// Bypasse les rules Firestore — donc ne JAMAIS exposer ce fichier au client.

let cachedApp: App | null = null;
let cachedDb: Firestore | null = null;
let cachedAuth: Auth | null = null;

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

export function getAdminAuth(): Auth {
  if (cachedAuth) return cachedAuth;
  cachedAuth = getAuth(getAdminApp());
  return cachedAuth;
}

export interface AdminContext {
  uid: string;
  email: string | null;
  emailVerified: boolean;
}

// Vérifie l'ID token Firebase d'une requête entrante et confirme que l'user
// est admin (users/{uid}.isAdmin === true). Throw une erreur typée sinon.
//
// Usage :
//   try { const admin = await requireAdmin(request); ... }
//   catch (err) { if (err instanceof AdminAuthError) return err.toResponse(); throw err; }
export class AdminAuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "AdminAuthError";
  }
}

// Vérifie l'ID token Firebase et retourne l'identité, SANS exiger isAdmin.
// Pour les routes "membre connecté" (espace entreprise). Les droits métier
// (owner d'une société, etc.) sont vérifiés ensuite côté serveur depuis l'uid.
// Distingue un jeton refusé (401) d'une panne technique (503, réseau ou service
// Auth indisponible). Les messages restent génériques.
const TECHNICAL_AUTH_CODES = new Set([
  "auth/internal-error",
  "auth/network-request-failed",
  "auth/insufficient-permission",
  "auth/service-unavailable",
  "auth/quota-exceeded",
]);

function toTokenError(e: unknown): AdminAuthError {
  const code =
    typeof (e as { code?: unknown })?.code === "string"
      ? ((e as { code: string }).code)
      : "";
  if (code.startsWith("auth/") && !TECHNICAL_AUTH_CODES.has(code)) {
    return new AdminAuthError("Token invalide ou expiré", 401);
  }
  console.error("[auth] vérification du jeton impossible:", code || "erreur technique");
  return new AdminAuthError("Service momentanément indisponible", 503);
}

export async function requireAuth(request: Request): Promise<AdminContext> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AdminAuthError("Token manquant", 401);
  }
  const token = authHeader.substring("Bearer ".length).trim();
  if (!token) {
    throw new AdminAuthError("Token vide", 401);
  }
  try {
    // checkRevoked=true : un jeton émis avant revokeRefreshTokens() est refusé
    // immédiatement (un appel réseau supplémentaire vers Firebase Auth par requête).
    const decoded = await getAdminAuth().verifyIdToken(token, true);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      emailVerified: decoded.email_verified === true,
    };
  } catch (e) {
    throw toTokenError(e);
  }
}

export async function requireAdmin(
  request: Request
): Promise<AdminContext> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AdminAuthError("Token manquant", 401);
  }
  const token = authHeader.substring("Bearer ".length).trim();
  if (!token) {
    throw new AdminAuthError("Token vide", 401);
  }

  let decoded;
  try {
    decoded = await getAdminAuth().verifyIdToken(token, true);
  } catch (e) {
    throw toTokenError(e);
  }

  const uid = decoded.uid;
  const email = decoded.email ?? null;

  const userSnap = await getAdminFirestore().collection("users").doc(uid).get();
  if (!userSnap.exists) {
    throw new AdminAuthError("Utilisateur introuvable", 403);
  }
  const userData = userSnap.data() as { isAdmin?: boolean } | undefined;
  if (!userData?.isAdmin) {
    throw new AdminAuthError("Accès admin requis", 403);
  }

  return { uid, email, emailVerified: decoded.email_verified === true };
}
