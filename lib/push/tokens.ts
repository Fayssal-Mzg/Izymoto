import { createHash } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin-server";

// Appareils de notification (lot 2.3, M2c). Collections RÉSERVÉES AU SERVEUR (aucune
// règle d'ouverture : refus par défaut) :
// - pushDevices/{uid}/devices/{empreinte du jeton} : appareils d'un compte ;
// - pushTokens/{empreinte} -> { uid } : un jeton n'appartient qu'à un compte ;
// - pushEvents/{clé} : anti-doublon des envois ; pushReceipts/{ticket} : accusés d'Expo à relever.

export const PUSH_DEVICES = "pushDevices";
export const PUSH_TOKENS = "pushTokens";
export const PUSH_EVENTS = "pushEvents";
export const PUSH_RECEIPTS = "pushReceipts";
export const MAX_DEVICES_PER_ACCOUNT = 10;

export class PushRegistrationError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = "PushRegistrationError";
  }
}

export type PushApp = "chauffeur" | "client";
export type PushPlatform = "ios" | "android";

export interface PushRegistration {
  token: string;
  platform: PushPlatform;
  app: PushApp;
}

const TOKEN_RE = /^Expo(?:nent)?PushToken\[[A-Za-z0-9_-]{8,100}\]$/;

export const isExpoPushToken = (v: unknown): v is string => typeof v === "string" && TOKEN_RE.test(v);

export const tokenHash = (token: string): string => createHash("sha256").update(token).digest("hex");

// Corps de requête -> enregistrement validé (tout autre champ est ignoré), ou null.
export function parseRegistration(body: unknown): PushRegistration | null {
  const b = (body ?? {}) as Record<string, unknown>;
  if (!isExpoPushToken(b.token)) return null;
  if (b.platform !== "ios" && b.platform !== "android") return null;
  if (b.app !== "chauffeur" && b.app !== "client") return null;
  return { token: b.token, platform: b.platform, app: b.app };
}

const devicesOf = (uid: string) => getAdminFirestore().collection(PUSH_DEVICES).doc(uid).collection("devices");

// Enregistre (ou rafraîchit) un appareil pour `uid`. Dans la même transaction : le jeton
// est retiré de l'ancien compte s'il en avait un autre, et le plus ancien appareil du
// compte est retiré au-delà de MAX_DEVICES_PER_ACCOUNT.
export async function registerDevice(uid: string, reg: PushRegistration): Promise<void> {
  const db = getAdminFirestore();
  const hash = tokenHash(reg.token);
  const tokenRef = db.collection(PUSH_TOKENS).doc(hash);
  const deviceRef = devicesOf(uid).doc(hash);
  await db.runTransaction(async (tx) => {
    const [tokenSnap, deviceSnap, allDevices, userSnap] = await Promise.all([
      tx.get(tokenRef),
      tx.get(deviceRef),
      tx.get(devicesOf(uid)),
      tx.get(db.collection("users").doc(uid)),
    ]);
    // Suppression de compte en cours (pseudonyme posé, pas d'échec enregistré) : aucun nouvel appareil.
    const user = userSnap.data();
    if (user?.deletionPseudonym && !user.deletionFailedAt) {
      throw new PushRegistrationError(409, "ACCOUNT_DELETING", "Suppression du compte en cours : l'appareil ne peut pas être enregistré.");
    }
    const now = Timestamp.now();
    const previousOwner = tokenSnap.data()?.uid;
    if (typeof previousOwner === "string" && previousOwner !== uid) {
      tx.delete(devicesOf(previousOwner).doc(hash));
      // Traçabilité d'un jeton qui change de compte (empreinte seulement, jamais le jeton).
      tx.set(db.collection("auditLogs").doc(), {
        actorUid: uid,
        actorRole: "user",
        action: "push.token_reassigned",
        previousOwner,
        newOwner: uid,
        tokenHash: hash,
        at: now,
      });
    }
    if (deviceSnap.exists) {
      tx.update(deviceRef, { platform: reg.platform, app: reg.app, lastSeenAt: now });
    } else {
      const others = allDevices.docs
        .filter((d) => d.id !== hash)
        .sort((a, b) => (a.data().createdAt?.toMillis?.() ?? 0) - (b.data().createdAt?.toMillis?.() ?? 0));
      for (const old of others.slice(0, Math.max(0, others.length - (MAX_DEVICES_PER_ACCOUNT - 1)))) {
        tx.delete(old.ref);
        tx.delete(db.collection(PUSH_TOKENS).doc(old.id));
      }
      tx.set(deviceRef, { token: reg.token, platform: reg.platform, app: reg.app, createdAt: now, lastSeenAt: now });
    }
    tx.set(tokenRef, { uid, updatedAt: now });
  });
}

// Désinscription : ne touche que les appareils du compte appelant.
export async function unregisterDevice(uid: string, token: string): Promise<void> {
  const db = getAdminFirestore();
  const hash = tokenHash(token);
  const tokenRef = db.collection(PUSH_TOKENS).doc(hash);
  await db.runTransaction(async (tx) => {
    const tokenSnap = await tx.get(tokenRef);
    tx.delete(devicesOf(uid).doc(hash));
    if (tokenSnap.data()?.uid === uid) tx.delete(tokenRef);
  });
}

// Jeton refusé par Expo (DeviceNotRegistered) : retiré du compte qui le portait.
export async function removeTokenByHash(hash: string): Promise<void> {
  const db = getAdminFirestore();
  const tokenRef = db.collection(PUSH_TOKENS).doc(hash);
  const owner = (await tokenRef.get()).data()?.uid;
  const batch = db.batch();
  if (typeof owner === "string") batch.delete(devicesOf(owner).doc(hash));
  batch.delete(tokenRef);
  await batch.commit();
}

// Suppression de compte : tous les appareils du compte et leurs entrées d'index.
export async function deletePushDataForUid(uid: string): Promise<void> {
  const db = getAdminFirestore();
  const snap = await devicesOf(uid).get();
  for (let i = 0; i < snap.docs.length; i += 200) {
    const batch = db.batch();
    for (const d of snap.docs.slice(i, i + 200)) {
      batch.delete(d.ref);
      const tokenRef = db.collection(PUSH_TOKENS).doc(d.id);
      batch.delete(tokenRef);
    }
    await batch.commit();
  }
  await db.collection(PUSH_DEVICES).doc(uid).delete();
  // Index orphelins éventuels (appareil déjà retiré mais index resté) pointant vers ce compte.
  const orphans = await db.collection(PUSH_TOKENS).where("uid", "==", uid).get();
  if (!orphans.empty) {
    const batch = db.batch();
    for (const d of orphans.docs) batch.delete(d.ref);
    await batch.commit();
  }
}

export interface PushTarget {
  uid: string;
  token: string;
  hash: string;
}

// Appareils des comptes donnés pour l'appli demandée.
export async function devicesForUids(uids: string[], app: PushApp): Promise<PushTarget[]> {
  const out: PushTarget[] = [];
  const snaps = await Promise.all([...new Set(uids)].map(async (uid) => ({ uid, snap: await devicesOf(uid).get() })));
  for (const { uid, snap } of snaps) {
    for (const d of snap.docs) {
      const data = d.data();
      if (data.app === app && isExpoPushToken(data.token)) out.push({ uid, token: data.token, hash: d.id });
    }
  }
  return out;
}
