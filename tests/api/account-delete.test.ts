// Lot 2.2 : suppression complète de compte (/api/account/delete, /api/admin/user/delete).
// Émulateurs Firestore + Auth, Stripe mocké. Storage : testé seulement si l'émulateur Storage
// répond (lancé par `npm test`, pas par `npm run test:api`) ; sinon ces cas sont ignorés.
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const stripeMock = vi.hoisted(() => ({
  customers: { del: vi.fn() },
  paymentIntents: { capture: vi.fn(), create: vi.fn(), retrieve: vi.fn(), cancel: vi.fn() },
}));
vi.mock("@/lib/stripe-server", () => ({ stripe: stripeMock }));

import { POST as deleteSelf } from "@/app/api/account/delete/route";
import { POST as deleteByAdmin } from "@/app/api/admin/user/delete/route";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin-server";
import { createAuthUser, createVerifiedAuthUser, jsonRequest, resetEmulators, seedUserDoc, signInAgain, type TestUser } from "./helpers";

const db = () => getAdminFirestore();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let n = 0;
const uniqueEmail = (p: string) => `${p}-${++n}@test.dev`;

const self = (token?: string, body?: unknown) => deleteSelf(jsonRequest("/api/account/delete", { token, body }));
const adminDel = (token: string | undefined, body: unknown) =>
  deleteByAdmin(jsonRequest("/api/admin/user/delete", { token, body }));

const get = async (path: string) => await db().doc(path).get();
const exists = async (path: string) => (await get(path)).exists;
const authUserExists = (uid: string) => getAdminAuth().getUser(uid).then(() => true, () => false);

const ANON_RE = /^supprime_[0-9a-f]{24}$/;
// Ancienne formule déterministe (supprimée) : le pseudonyme ne doit plus en découler.
const legacyAnon = (uid: string) =>
  `supprime_${createHash("sha256").update(`izymoto-account:${uid}`).digest("hex").slice(0, 20)}`;

// Stockage : l'émulateur est-il joignable ?
const STORAGE_HOST = "127.0.0.1:9199";
const storageUp = await fetch(`http://${STORAGE_HOST}/`).then(() => true, () => false);
if (storageUp) process.env.FIREBASE_STORAGE_EMULATOR_HOST = STORAGE_HOST;
const BUCKET = "demo-izymoto.appspot.com";

// JWT non signé (accepté par l'émulateur Auth) avec un auth_time choisi. L'émulateur pose
// validSince à la création du compte : on le ramène à 1, sinon un jeton à auth_time ancien
// serait rejeté comme « révoqué » avant le contrôle de fraîcheur.
async function forgeToken(uid: string, authTimeSecondsAgo: number): Promise<string> {
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
  const r = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/projects/demo-izymoto/accounts:update`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer owner" },
    body: JSON.stringify({ localId: uid, validSince: "1" }),
  });
  if (!r.ok) throw new Error(`accounts:update KO (${r.status})`);
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "none", typ: "JWT" })}.${b64({
    iss: "https://securetoken.google.com/demo-izymoto",
    aud: "demo-izymoto",
    auth_time: now - authTimeSecondsAgo,
    user_id: uid,
    sub: uid,
    iat: now - 10,
    exp: now + 3600,
    firebase: { identities: {}, sign_in_provider: "password" },
  })}.`;
}

const PERSONAL_BOOKING = {
  name: "Jean Dupont",
  phone: "+33612345678",
  email: "jean@test.dev",
  notes: "Sonner deux fois",
  dateFormatted: "lundi 5 octobre 2026 à 14:00",
  originLat: 48.8556,
  originLng: 2.3606,
  destLat: 48.7262,
  destLng: 2.3652,
  userName: "Jean Dupont",
  clientName: "Jean Dupont",
  adresseDomicile: "3 impasse Secrète",
  whatever: "champ inconnu",
  depart: "10 Rue de Rivoli, 75001 Paris",
  arrivee: "Aéroport d'Orly, 94390 Orly",
  prix: 76,
  status: "completed",
  paymentStatus: "captured",
  paymentId: "pi_1",
  amountCaptured: 7600,
  walletAmountCents: 0,
  cardAmountCents: 7600,
  isPaid: true,
  commissionRate: 0.2,
  platformShareCents: 1520,
  driverShareCents: 6080,
  companyId: "coZ",
  serverFinalized: true,
  driverId: "chauffeur-externe",
  reservationDate: Timestamp.fromMillis(Date.UTC(2026, 9, 5, 12, 0)),
  createdAt: Timestamp.fromMillis(Date.UTC(2026, 9, 1, 12, 0)),
};
const KEPT_SCALARS = [
  "prix", "status", "paymentStatus", "paymentId", "amountCaptured", "walletAmountCents", "cardAmountCents",
  "isPaid", "commissionRate", "platformShareCents", "driverShareCents", "companyId", "serverFinalized", "driverId",
] as const;
const PERSONAL_FIELDS = [
  "name", "phone", "email", "notes", "dateFormatted", "originLat", "originLng", "destLat", "destLng",
  "userName", "clientName", "adresseDomicile", "whatever",
];

async function seedBooking(id: string, userId: string, over: Record<string, unknown> = {}) {
  await db().collection("bookings").doc(id).set({ ...PERSONAL_BOOKING, userId, ...over });
}

async function snapshotAll(): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  for (const c of [
    "users", "wallets", "bookings", "drivers", "stripeCustomers", "walletTransactions",
    "companies", "paymentClaims", "auditLogs", "companyInvitations",
  ]) {
    const s = await db().collection(c).get();
    for (const d of s.docs) out[`${c}/${d.id}`] = d.data();
  }
  const m = await db().collectionGroup("members").get();
  for (const d of m.docs) out[d.ref.path] = d.data();
  const r = await db().collectionGroup("rides").get();
  for (const d of r.docs) out[d.ref.path] = d.data();
  return JSON.parse(JSON.stringify(out));
}
// Valeurs seules (sans les identifiants de documents, qui sont la clé et non une donnée).
const valuesDump = async () => JSON.stringify(Object.values(await snapshotAll()));
const withoutAudit = (s: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(s).filter(([k]) => !k.startsWith("auditLogs/")));

beforeEach(async () => {
  await resetEmulators();
  delete process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  stripeMock.customers.del.mockReset().mockResolvedValue({ deleted: true });
});
afterEach(() => {
  delete process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
});

async function client(prefix = "cl", verified = false): Promise<TestUser> {
  const email = uniqueEmail(prefix);
  const u = verified ? await createVerifiedAuthUser(email) : await createAuthUser(email);
  await seedUserDoc(u.uid, { email: u.email, displayName: "Jean Dupont", phone: "+33612345678" });
  return u;
}
async function makeAdmin(): Promise<TestUser> {
  const a = await createAuthUser(uniqueEmail("admin"));
  await seedUserDoc(a.uid, { email: a.email, isAdmin: true });
  return a;
}

describe("authentification de /api/account/delete", () => {
  it("sans jeton -> 401 UNAUTHENTICATED, rien supprimé", async () => {
    const u = await client();
    const res = await self();
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("UNAUTHENTICATED");
    expect(await exists(`users/${u.uid}`)).toBe(true);
    expect(await authUserExists(u.uid)).toBe(true);
  });

  it("jeton invalide -> 401", async () => {
    expect((await self("n-importe-quoi")).status).toBe(401);
  });

  it("jeton à auth_time ancien (> 5 min) -> 401 RECENT_LOGIN_REQUIRED, rien supprimé", async () => {
    const u = await client();
    const res = await self(await forgeToken(u.uid, 3600));
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("RECENT_LOGIN_REQUIRED");
    expect(await exists(`users/${u.uid}`)).toBe(true);
    expect(await authUserExists(u.uid)).toBe(true);
  });

  it("témoin : le même jeton forgé avec auth_time récent est accepté", async () => {
    const u = await client();
    expect((await self(await forgeToken(u.uid, 30))).status).toBe(200);
    expect(await authUserExists(u.uid)).toBe(false);
  });

  it("limite : auth_time à 6 min refusé, à 4 min accepté", async () => {
    const a = await client("lim-a");
    expect((await self(await forgeToken(a.uid, 6 * 60))).status).toBe(401);
    expect((await self(await forgeToken(a.uid, 4 * 60))).status).toBe(200);
  });

  it("compte administrateur -> 409 ADMIN_ACCOUNT, rien modifié", async () => {
    const a = await makeAdmin();
    await seedBooking("ba", a.uid, { status: "completed" });
    const before = await snapshotAll();
    const res = await self(a.idToken);
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("ADMIN_ACCOUNT");
    expect(await snapshotAll()).toEqual(before);
    expect(await authUserExists(a.uid)).toBe(true);
  });
});

describe("refus (409) : rien n'est modifié", () => {
  async function expectRefusal(u: TestUser, code: string) {
    const before = await snapshotAll();
    const res = await self(u.idToken);
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe(code);
    expect(await snapshotAll()).toEqual(before);
    expect(await authUserExists(u.uid)).toBe(true);
    expect(stripeMock.customers.del).not.toHaveBeenCalled();
    // Le jeton n'a pas été révoqué par un refus : le même jeton refuse encore pour la même raison.
    expect((await self(u.idToken)).status).toBe(409);
    // Même refus côté admin.
    const admin = await makeAdmin();
    const before2 = await snapshotAll();
    const r2 = await adminDel(admin.idToken, { uid: u.uid });
    expect(r2.status).toBe(409);
    expect((await r2.json()).code).toBe(code);
    expect(await snapshotAll()).toEqual(before2);
  }

  for (const status of ["pending", "confirmed", "awaiting_driver", "assigned", "in_progress"]) {
    it(`réservation client en statut ${status} -> ACTIVE_RIDE`, async () => {
      const u = await client();
      await seedBooking("b1", u.uid, { status, paymentStatus: "captured" });
      await db().collection("stripeCustomers").doc(u.uid).set({ customerId: "cus_1" });
      await expectRefusal(u, "ACTIVE_RIDE");
    });
  }

  for (const paymentStatus of ["authorized", "card_saved", "hold_in_progress", "action_required"]) {
    it(`course terminée mais paiement ${paymentStatus} -> ACTIVE_RIDE`, async () => {
      const u = await client();
      await seedBooking("b1", u.uid, { status: "completed", paymentStatus });
      await expectRefusal(u, "ACTIVE_RIDE");
    });
  }

  for (const status of ["assigned", "in_progress", "completed_by_driver"]) {
    it(`course chauffeur ${status} non encaissée -> ACTIVE_DRIVER_RIDE (fiche chauffeur intacte)`, async () => {
      const u = await client("drv");
      await db().collection("drivers").doc(u.uid).set({ status: "approved", availability: "online", phone: "+33699999999" });
      await seedBooking("b1", "autre-client", { driverId: u.uid, status, paymentStatus: "authorized" });
      await expectRefusal(u, "ACTIVE_DRIVER_RIDE");
      expect((await get(`drivers/${u.uid}`)).data()).toMatchObject({ status: "approved", availability: "online" });
    });
  }

  it("témoin : course chauffeur completed_by_driver déjà encaissée -> suppression autorisée, driverId remplacé", async () => {
    const u = await client("drv");
    await seedBooking("b1", "autre-client", { driverId: u.uid, status: "completed_by_driver", paymentStatus: "captured" });
    expect((await self(u.idToken)).status).toBe(200);
    expect((await get("bookings/b1")).data()?.driverId).toMatch(ANON_RE);
  });

  it("solde portefeuille > 0 -> BALANCE_POSITIVE", async () => {
    const u = await client();
    await db().collection("wallets").doc(u.uid).set({ balanceCents: 1 });
    await expectRefusal(u, "BALANCE_POSITIVE");
  });

  it("propriétaire de société avec un autre membre actif -> COMPANY_HAS_MEMBERS", async () => {
    const u = await client("own");
    await db().collection("companies").doc("coA").set({ ownerUid: u.uid, walletBalanceCents: 0, memberCount: 2, status: "active" });
    const members = db().collection("companies").doc("coA").collection("members");
    await members.doc(u.uid).set({ uid: u.uid, email: u.email, role: "owner", status: "active" });
    await members.doc("collab").set({ uid: "collab", email: "c@test.dev", role: "member", status: "active" });
    await db().collection("users").doc(u.uid).update({ companyId: "coA", companyRole: "owner" });
    await expectRefusal(u, "COMPANY_HAS_MEMBERS");
  });

  it("propriétaire seul avec solde société > 0 -> COMPANY_BALANCE_POSITIVE", async () => {
    const u = await client("own");
    await db().collection("companies").doc("coA").set({ ownerUid: u.uid, walletBalanceCents: 500, memberCount: 1, status: "active" });
    await db().collection("companies").doc("coA").collection("members").doc(u.uid).set({ uid: u.uid, email: u.email, role: "owner", status: "active" });
    await db().collection("users").doc(u.uid).update({ companyId: "coA", companyRole: "owner" });
    await expectRefusal(u, "COMPANY_BALANCE_POSITIVE");
  });

  it("témoin : ancien membre 'removed' et solde 0 n'empêchent pas la suppression du propriétaire", async () => {
    const u = await client("own");
    await db().collection("companies").doc("coA").set({ ownerUid: u.uid, walletBalanceCents: 0, memberCount: 1, status: "active" });
    const members = db().collection("companies").doc("coA").collection("members");
    await members.doc(u.uid).set({ uid: u.uid, email: u.email, role: "owner", status: "active" });
    await members.doc("ancien").set({ uid: "ancien", email: "a@test.dev", role: "member", status: "removed" });
    await db().collection("users").doc(u.uid).update({ companyId: "coA", companyRole: "owner" });
    expect((await self(u.idToken)).status).toBe(200);
  });
});

describe("suppression complète d'un client", () => {
  async function setupFull() {
    const u = await client("cl", true); // e-mail vérifié : devis invités et invitations rattachables
    await db().collection("wallets").doc(u.uid).set({ balanceCents: 0, cumulativeRechargedCents: 5000 });
    await db().collection("stripeCustomers").doc(u.uid).set({ customerId: "cus_42", email: u.email });
    await seedBooking("b1", u.uid, { actorUid: u.uid });
    await seedBooking("b2", u.uid, { status: "cancelled", paymentStatus: "refunded", prix: 50 });
    // Devis invités envoyés avec son e-mail (userId guest_*) et celui d'un autre.
    await db().collection("bookings").doc("g1").set({
      ...PERSONAL_BOOKING, userId: "guest_abc", accountType: "guest", email: u.email, status: "pending", paymentStatus: "pending",
    });
    await db().collection("bookings").doc("g2").set({
      ...PERSONAL_BOOKING, userId: "guest_def", accountType: "guest", email: "autre@test.dev", phone: "+33711111111", status: "pending", paymentStatus: "pending",
    });
    // Course où il est chauffeur : le passager (autre client) ne doit pas être touché.
    await db().collection("bookings").doc("dr1").set({
      ...PERSONAL_BOOKING, userId: "client-x", name: "Passager Autre", phone: "+33700000000", email: "passager@test.dev",
      driverId: u.uid, status: "completed", paymentStatus: "captured",
    });
    await db().collection("walletTransactions").doc("t1").set({
      userId: u.uid, type: "recharge", amountCents: 5000, createdAt: Timestamp.fromMillis(1_700_000_000_000),
      actorUid: u.uid, actorEmail: u.email,
    });
    await db().collection("walletTransactions").doc("t2").set({
      userId: "societe-x", type: "debit", amountCents: -2000, actorUid: u.uid, actorEmail: u.email,
    });
    await db().collection("paymentClaims").doc("pc1").set({ userId: u.uid, paymentIntentId: "pi_1" });
    await db().collection("auditLogs").doc("a1").set({ action: "wallet.adjust", actorUid: u.uid, at: Timestamp.now() });
    await db().collection("auditLogs").doc("a2").set({ action: "wallet.adjust", actorUid: "quelquun-d-autre", at: Timestamp.now() });
    const inv = db().collection("companyInvitations");
    await inv.doc("inv1").set({ email: u.email, status: "pending", companyId: "coZ" });
    await inv.doc("inv2").set({ email: u.email, status: "accepted", companyId: "coZ" });
    await inv.doc("inv2b").set({ email: u.email, status: "revoked", companyId: "coZ" });
    await inv.doc("inv3").set({ email: "autre@test.dev", status: "pending", companyId: "coZ" });
    await inv.doc("inv4").set({ email: "x@test.dev", status: "accepted", companyId: "coZ", acceptedByUid: u.uid });
    await inv.doc("inv5").set({ email: "y@test.dev", status: "pending", companyId: "coZ", invitedByUid: u.uid });
    return u;
  }

  it("supprime/anonymise toutes les données identifiantes, conserve montants, dates, statuts", async () => {
    const u = await setupFull();
    const res = await self(u.idToken);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: true });

    expect(await exists(`users/${u.uid}`)).toBe(false);
    expect(await exists(`wallets/${u.uid}`)).toBe(false);
    expect(await exists(`stripeCustomers/${u.uid}`)).toBe(false);
    expect(stripeMock.customers.del).toHaveBeenCalledWith("cus_42");
    expect(await authUserExists(u.uid)).toBe(false);

    const b1 = (await get("bookings/b1")).data()!;
    const anon = b1.userId as string;
    expect(anon).toMatch(ANON_RE);
    expect(anon).not.toBe(legacyAnon(u.uid));
    expect(anon).not.toContain(u.uid);

    for (const id of ["b1", "b2"]) {
      const b = (await get(`bookings/${id}`)).data()!;
      expect(b.userId).toBe(anon);
      for (const f of PERSONAL_FIELDS) expect(b, `champ ${f} sur ${id}`).not.toHaveProperty(f);
      expect(b.depart).toBe("Paris 1er");
      expect(typeof b.arrivee).toBe("string");
      expect(b.arrivee).not.toMatch(/Orly,/);
      expect(b.pseudonymizedAt).toBeTruthy();
      expect((b.reservationDate as Timestamp).toMillis()).toBe(Date.UTC(2026, 9, 5, 12, 0));
      expect((b.createdAt as Timestamp).toMillis()).toBe(Date.UTC(2026, 9, 1, 12, 0));
    }
    // Liste blanche : montants, statuts, références de paiement conservés à l'identique.
    for (const f of KEPT_SCALARS) {
      if (f === "status" || f === "paymentStatus" || f === "prix") continue;
      expect(b1[f], `champ conservé ${f}`).toEqual((PERSONAL_BOOKING as Record<string, unknown>)[f]);
    }
    expect(b1).toMatchObject({ prix: 76, status: "completed", paymentStatus: "captured" });
    expect(b1.actorUid).toBe(anon);
    const b2 = (await get("bookings/b2")).data()!;
    expect(b2).toMatchObject({ prix: 50, status: "cancelled", paymentStatus: "refunded" });
    // Aucune clé hors liste blanche + champs ajoutés.
    const allowed = new Set([...KEPT_SCALARS, "reservationDate", "createdAt", "userId", "actorUid", "depart", "arrivee", "pseudonymizedAt"]);
    for (const k of Object.keys(b2)) expect(allowed.has(k as never), `clé inattendue ${k}`).toBe(true);

    // Devis invité de son e-mail : pseudonymisé ; celui d'un autre : intact.
    const g1 = (await get("bookings/g1")).data()!;
    expect(g1.userId).toBe(anon);
    for (const f of PERSONAL_FIELDS) expect(g1, `champ ${f} sur g1`).not.toHaveProperty(f);
    expect(g1.accountType).toBe("guest");
    expect((await get("bookings/g2")).data()).toMatchObject({ userId: "guest_def", email: "autre@test.dev", name: "Jean Dupont" });

    // Course comme chauffeur : seul driverId change, le passager est intact.
    const dr1 = (await get("bookings/dr1")).data()!;
    expect(dr1.driverId).toBe(anon);
    expect(dr1.driverPseudonymizedAt).toBeTruthy();
    expect(dr1).toMatchObject({
      userId: "client-x", name: "Passager Autre", phone: "+33700000000", email: "passager@test.dev",
      depart: PERSONAL_BOOKING.depart, arrivee: PERSONAL_BOOKING.arrivee, notes: "Sonner deux fois", prix: 76,
    });

    const t1 = (await get("walletTransactions/t1")).data()!;
    expect(t1).toMatchObject({ userId: anon, actorUid: anon, amountCents: 5000, type: "recharge" });
    expect(t1).not.toHaveProperty("actorEmail");
    expect((t1.createdAt as Timestamp).toMillis()).toBe(1_700_000_000_000);
    const t2 = (await get("walletTransactions/t2")).data()!;
    expect(t2).toMatchObject({ userId: "societe-x", actorUid: anon, amountCents: -2000 });
    expect(t2).not.toHaveProperty("actorEmail");

    expect((await get("paymentClaims/pc1")).data()?.userId).toBe(anon);
    expect((await get("auditLogs/a1")).data()?.actorUid).toBe(anon);
    expect((await get("auditLogs/a2")).data()?.actorUid).toBe("quelquun-d-autre");

    // Invitations : toutes celles à son e-mail (tout statut) et acceptées par lui supprimées.
    for (const id of ["inv1", "inv2", "inv2b", "inv4"]) expect(await exists(`companyInvitations/${id}`), id).toBe(false);
    expect(await exists("companyInvitations/inv3")).toBe(true);
    expect((await get("companyInvitations/inv5")).data()).toMatchObject({ invitedByUid: anon, status: "pending" });

    const audits = await db().collection("auditLogs").where("action", "==", "account.delete").get();
    expect(audits.size).toBe(1);
    expect(audits.docs[0].data()).toMatchObject({ actorRole: "self", actorUid: anon, subject: anon });

    // Balayage global : ni l'uid, ni l'e-mail, ni nom/téléphone/notes/adresse du client supprimé.
    const dump = await valuesDump();
    for (const needle of [u.uid, u.email, "+33612345678", "jean@test.dev", "Sonner deux fois", "Rivoli", "impasse Secrète"]) {
      // Le passager de dr1 (autre client) garde ses propres données, dont les notes/adresses de la course.
      if (["Sonner deux fois", "Rivoli", "impasse Secrète"].includes(needle)) continue;
      expect(dump.includes(needle), `résidu : ${needle}`).toBe(false);
    }
  });

  it("l'ancien jeton est révoqué ; second appel -> 401 sans effet, Stripe appelé une seule fois", async () => {
    const u = await setupFull();
    expect((await self(u.idToken)).status).toBe(200);
    const after = await snapshotAll();
    expect((await self(u.idToken)).status).toBe(401);
    expect(await snapshotAll()).toEqual(after);
    expect(stripeMock.customers.del).toHaveBeenCalledTimes(1);
  });

  it("Stripe : client déjà supprimé (resource_missing) toléré", async () => {
    const u = await setupFull();
    stripeMock.customers.del.mockRejectedValue(Object.assign(new Error("No such customer"), { code: "resource_missing" }));
    expect((await self(u.idToken)).status).toBe(200);
    expect(await exists(`stripeCustomers/${u.uid}`)).toBe(false);
    expect(await authUserExists(u.uid)).toBe(false);
  });

  it("Stripe : autre erreur -> 500, compte Auth conservé, relance (nouvelle connexion) OK avec le MÊME pseudonyme", async () => {
    const u = await setupFull();
    await sleep(1100); // validSince (révocation) est à la seconde : le jeton doit lui être antérieur
    stripeMock.customers.del.mockRejectedValueOnce(Object.assign(new Error("boom"), { code: "api_error" }));
    const res = await self(u.idToken);
    expect(res.status).toBe(500);
    expect(await authUserExists(u.uid)).toBe(true);
    expect(await exists(`stripeCustomers/${u.uid}`)).toBe(true);
    const profile = (await get(`users/${u.uid}`)).data()!;
    expect(profile.deletionPseudonym).toMatch(ANON_RE);
    const firstAnon = (await get("bookings/b1")).data()!.userId;
    expect(firstAnon).toBe(profile.deletionPseudonym);
    // Verrou : les sessions ont été coupées dès le début.
    expect((await self(u.idToken)).status).toBe(401);

    await sleep(1100); // validSince est à la seconde
    const fresh = await signInAgain(u.email);
    expect((await self(fresh.idToken)).status).toBe(200);
    expect(await authUserExists(u.uid)).toBe(false);
    expect((await get("bookings/b1")).data()!.userId).toBe(firstAnon);
    const audit = (await db().collection("auditLogs").where("action", "==", "account.delete").get()).docs[0].data();
    expect(audit.subject).toBe(firstAnon);
    expect((await valuesDump()).includes(u.uid)).toBe(false);
  });

  it("deux suppressions de comptes différents : pseudonymes différents", async () => {
    const a = await client("a");
    const b = await client("b");
    await seedBooking("ba", a.uid, {});
    await seedBooking("bb", b.uid, {});
    expect((await self(a.idToken)).status).toBe(200);
    expect((await self(b.idToken)).status).toBe(200);
    const pa = (await get("bookings/ba")).data()!.userId;
    const pb = (await get("bookings/bb")).data()!.userId;
    expect(pa).toMatch(ANON_RE);
    expect(pb).toMatch(ANON_RE);
    expect(pa).not.toBe(pb);
  });

  it("client sans donnée annexe (profil seul) -> supprimé, pas d'appel Stripe", async () => {
    const u = await client();
    expect((await self(u.idToken)).status).toBe(200);
    expect(stripeMock.customers.del).not.toHaveBeenCalled();
    expect(await authUserExists(u.uid)).toBe(false);
  });

  it("le corps est ignoré : impossible de supprimer un autre compte via /api/account/delete", async () => {
    const a = await client("a");
    const b = await client("b");
    await seedBooking("bb", b.uid);
    const res = await self(a.idToken, { uid: b.uid, userId: b.uid });
    expect(res.status).toBe(200);
    expect(await authUserExists(a.uid)).toBe(false);
    expect(await authUserExists(b.uid)).toBe(true);
    expect(await exists(`users/${b.uid}`)).toBe(true);
    expect((await get("bookings/bb")).data()).toMatchObject({ userId: b.uid, name: "Jean Dupont" });
  });

  it("e-mail NON vérifié : devis invités et invitations de cet e-mail ne sont PAS touchés (données potentielles d'un tiers)", async () => {
    const u = await client("nv", false);
    await db().collection("bookings").doc("g1").set({
      ...PERSONAL_BOOKING, userId: "guest_abc", accountType: "guest", email: u.email, status: "pending", paymentStatus: "pending",
    });
    await db().collection("companyInvitations").doc("inv1").set({ email: u.email, status: "accepted", companyId: "coZ" });
    expect((await self(u.idToken)).status).toBe(200);
    expect((await get("bookings/g1")).data()).toMatchObject({ userId: "guest_abc", email: u.email, name: "Jean Dupont" });
    expect((await get("companyInvitations/inv1")).data()).toMatchObject({ email: u.email, status: "accepted" });
    expect(await authUserExists(u.uid)).toBe(false);
  });

  it("sans compte Auth (relance admin), l'e-mail du profil n'est PAS utilisé : invitations/devis intacts", async () => {
    const admin = await makeAdmin();
    const ghostUid = "ghost-uid-1";
    await seedUserDoc(ghostUid, { email: "ghost@test.dev" });
    await db().collection("companyInvitations").doc("ig").set({ email: "ghost@test.dev", status: "accepted", companyId: "coZ" });
    await db().collection("bookings").doc("gg").set({
      ...PERSONAL_BOOKING, userId: "guest_g", accountType: "guest", email: "ghost@test.dev", status: "pending", paymentStatus: "pending",
    });
    expect((await adminDel(admin.idToken, { uid: ghostUid })).status).toBe(200);
    expect(await exists("companyInvitations/ig")).toBe(true);
    expect((await get("bookings/gg")).data()).toMatchObject({ userId: "guest_g", email: "ghost@test.dev" });
    expect(await exists(`users/${ghostUid}`)).toBe(false);
  });
});

describe("chauffeur", () => {
  async function setupDriver() {
    const u = await client("drv");
    await db().collection("drivers").doc(u.uid).set({
      status: "approved", availability: "online", firstName: "Paul", lastName: "Martin",
      phone: "+33699999999", iban: "FR7612345678901234567890123", email: u.email,
    });
    await db().collection("driverRides").doc(u.uid).collection("rides").doc("r1").set({ departZone: "Paris 1er", prix: 76 });
    await seedBooking("b1", "client-x", { driverId: u.uid, status: "completed", paymentStatus: "captured" });
    return u;
  }

  it("fiche chauffeur et bucket Storage non configuré -> 500 STORAGE_NOT_CONFIGURED, rien modifié, jeton toujours valide", async () => {
    const u = await setupDriver();
    const before = await snapshotAll();
    const res = await self(u.idToken);
    expect(res.status).toBe(500);
    expect((await res.json()).code).toBe("STORAGE_NOT_CONFIGURED");
    expect(await snapshotAll()).toEqual(before);
    expect(await authUserExists(u.uid)).toBe(true);
    // Pas de verrou posé : le jeton n'est pas révoqué (même réponse, pas 401).
    expect((await self(u.idToken)).status).toBe(500);
    expect((await get(`drivers/${u.uid}`)).data()).toMatchObject({ status: "approved", availability: "online" });
  });

  it("fiche chauffeur déjà 'deleted' (relance) sans bucket -> 500 STORAGE_NOT_CONFIGURED, rien modifié", async () => {
    const u = await client("drv");
    await db().collection("drivers").doc(u.uid).set({ status: "deleted", availability: "offline", deletedAt: Timestamp.now() });
    const before = await snapshotAll();
    const res = await self(u.idToken);
    expect(res.status).toBe(500);
    expect((await res.json()).code).toBe("STORAGE_NOT_CONFIGURED");
    expect(await snapshotAll()).toEqual(before);
    expect(await authUserExists(u.uid)).toBe(true);
  });

  it.skipIf(!storageUp)("fiche réduite à deleted/offline, driverRides et fichiers Storage supprimés, driverId anonymisé", async () => {
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = BUCKET;
    const u = await setupDriver();
    const bucket = getStorage().bucket(BUCKET);
    await bucket.file(`drivers/${u.uid}/iban.pdf`).save("contenu");
    await bucket.file(`drivers/${u.uid}/permis.jpg`).save("contenu");
    await bucket.file("drivers/autre-chauffeur/iban.pdf").save("contenu");

    expect((await self(u.idToken)).status).toBe(200);
    const d = (await get(`drivers/${u.uid}`)).data()!;
    expect(Object.keys(d).sort()).toEqual(["availability", "deletedAt", "status"]);
    expect(d).toMatchObject({ status: "deleted", availability: "offline" });
    expect((await db().collection("driverRides").doc(u.uid).collection("rides").get()).size).toBe(0);
    expect((await bucket.file(`drivers/${u.uid}/iban.pdf`).exists())[0]).toBe(false);
    expect((await bucket.file(`drivers/${u.uid}/permis.jpg`).exists())[0]).toBe(false);
    expect((await bucket.file("drivers/autre-chauffeur/iban.pdf").exists())[0]).toBe(true);

    const b = (await get("bookings/b1")).data()!;
    expect(b.driverId).toMatch(ANON_RE);
    expect(b.driverPseudonymizedAt).toBeTruthy();
    expect(b).toMatchObject({ userId: "client-x", prix: 76, name: "Jean Dupont" });
    const dump = await valuesDump();
    for (const needle of [u.uid, "FR76", "Paul", "+33699999999"]) expect(dump.includes(needle), needle).toBe(false);
    expect(await authUserExists(u.uid)).toBe(false);
  });
});

describe("société", () => {
  it("membre simple : status removed, email/displayName supprimés, memberCount -1, société ouverte", async () => {
    const owner = await client("own");
    const mem = await client("mem");
    await db().collection("companies").doc("coA").set({ ownerUid: owner.uid, walletBalanceCents: 1000, memberCount: 2, status: "active", billingEmail: "fact@test.dev" });
    const members = db().collection("companies").doc("coA").collection("members");
    await members.doc(owner.uid).set({ uid: owner.uid, email: owner.email, role: "owner", status: "active" });
    await members.doc(mem.uid).set({ uid: mem.uid, email: mem.email, displayName: "Marie Collab", role: "member", status: "active", spentThisPeriodCents: 1200 });
    await db().collection("users").doc(mem.uid).update({ companyId: "coA", companyRole: "member" });

    expect((await self(mem.idToken)).status).toBe(200);
    expect(await exists(`companies/coA/members/${mem.uid}`)).toBe(false);
    const removed = (await members.get()).docs.filter((d) => d.id !== owner.uid);
    expect(removed).toHaveLength(1);
    const m = removed[0].data();
    expect(removed[0].id).toMatch(ANON_RE);
    expect(m.uid).toBe(removed[0].id);
    expect(m.status).toBe("removed");
    expect(m).not.toHaveProperty("email");
    expect(m).not.toHaveProperty("displayName");
    expect(m).toMatchObject({ role: "member", spentThisPeriodCents: 1200 });
    expect(m.removedAt).toBeTruthy();
    const c = (await get("companies/coA")).data()!;
    expect(c).toMatchObject({ memberCount: 1, status: "active", walletBalanceCents: 1000, ownerUid: owner.uid });
    expect(await authUserExists(owner.uid)).toBe(true);
    expect((await valuesDump()).includes(mem.uid)).toBe(false);
  });

  it("propriétaire seul : société closed, ownerUid anonymisé, billingEmail null, invitations pending révoquées", async () => {
    const owner = await client("own");
    await db().collection("companies").doc("coA").set({
      ownerUid: owner.uid, adminUids: [owner.uid], walletBalanceCents: 0, memberCount: 1, status: "active", billingEmail: "fact@test.dev", name: "ACME",
    });
    await db().collection("companies").doc("coA").collection("members").doc(owner.uid)
      .set({ uid: owner.uid, email: owner.email, displayName: "Patron", role: "owner", status: "active" });
    await db().collection("users").doc(owner.uid).update({ companyId: "coA", companyRole: "owner" });
    const inv = db().collection("companyInvitations");
    await inv.doc("p1").set({ email: "nouveau@test.dev", status: "pending", companyId: "coA", invitedByUid: owner.uid });
    await inv.doc("a1").set({ email: "ancien@test.dev", status: "accepted", companyId: "coA", invitedByUid: owner.uid });
    await inv.doc("o1").set({ email: "nouveau2@test.dev", status: "pending", companyId: "coOther" });

    expect((await self(owner.idToken)).status).toBe(200);
    const c = (await get("companies/coA")).data()!;
    expect(c).toMatchObject({ status: "closed", billingEmail: null, memberCount: 0, adminUids: [] });
    expect(c.ownerUid).toMatch(ANON_RE);
    expect(await exists(`companies/coA/members/${owner.uid}`)).toBe(false);
    const mDoc = await get(`companies/coA/members/${c.ownerUid}`);
    expect(mDoc.exists).toBe(true);
    const m = mDoc.data()!;
    expect(m).toMatchObject({ status: "removed", role: "owner", uid: c.ownerUid });
    expect(m).not.toHaveProperty("email");
    expect(m).not.toHaveProperty("displayName");
    expect((await get("companyInvitations/p1")).data()).toMatchObject({ status: "revoked", invitedByUid: c.ownerUid });
    expect((await get("companyInvitations/a1")).data()).toMatchObject({ status: "accepted", invitedByUid: c.ownerUid });
    expect((await get("companyInvitations/o1")).data()?.status).toBe("pending");
    const dump = await valuesDump();
    expect(dump.includes(owner.uid)).toBe(false);
    expect(dump.includes("fact@test.dev")).toBe(false);
    expect(await authUserExists(owner.uid)).toBe(false);
  });
});

describe("/api/admin/user/delete", () => {
  it("sans jeton -> 401", async () => {
    expect((await adminDel(undefined, { uid: "x" })).status).toBe(401);
  });

  it("connexion ancienne (> 5 min) d'un admin -> 401 RECENT_LOGIN_REQUIRED, cible intacte", async () => {
    const a = await makeAdmin();
    const target = await client("tg");
    const res = await adminDel(await forgeToken(a.uid, 3600), { uid: target.uid });
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("RECENT_LOGIN_REQUIRED");
    expect(await authUserExists(target.uid)).toBe(true);
    expect(await exists(`users/${target.uid}`)).toBe(true);
  });

  it("témoin : même jeton forgé récent d'un admin -> accepté", async () => {
    const a = await makeAdmin();
    const target = await client("tg");
    expect((await adminDel(await forgeToken(a.uid, 30), { uid: target.uid })).status).toBe(200);
  });

  it("non-admin (connexion récente) -> 403, cible intacte", async () => {
    const user = await client("na");
    const target = await client("tg");
    const res = await adminDel(user.idToken, { uid: target.uid });
    expect(res.status).toBe(403);
    expect(await authUserExists(target.uid)).toBe(true);
    expect(await exists(`users/${target.uid}`)).toBe(true);
  });

  it("auto-suppression -> 400, compte admin intact", async () => {
    const a = await makeAdmin();
    const res = await adminDel(a.idToken, { uid: a.uid });
    expect(res.status).toBe(400);
    expect(await authUserExists(a.uid)).toBe(true);
    expect(await exists(`users/${a.uid}`)).toBe(true);
  });

  it("cible administrateur -> 409, cible intacte", async () => {
    const a = await makeAdmin();
    const other = await makeAdmin();
    const before = await snapshotAll();
    const res = await adminDel(a.idToken, { uid: other.uid });
    expect(res.status).toBe(409);
    expect(await snapshotAll()).toEqual(before);
    expect(await authUserExists(other.uid)).toBe(true);
  });

  it("uid commençant par supprime_ (pseudonyme) -> 400", async () => {
    const a = await makeAdmin();
    const res = await adminDel(a.idToken, { uid: "supprime_" + "a".repeat(24) });
    expect(res.status).toBe(400);
  });

  for (const bad of [undefined, null, 42, "", "a/b", "x".repeat(129), { $ne: 1 }, ["a"]]) {
    it(`uid invalide ${JSON.stringify(bad) ?? "absent"} -> 400`, async () => {
      const a = await makeAdmin();
      const res = await adminDel(a.idToken, bad === undefined ? {} : { uid: bad });
      expect(res.status).toBe(400);
    });
  }

  it("suppression d'un tiers -> 200, audit en rôle admin, admin conservé", async () => {
    const a = await makeAdmin();
    const target = await client("tg");
    await seedBooking("bt", target.uid);
    await db().collection("wallets").doc(target.uid).set({ balanceCents: 0 });
    const res = await adminDel(a.idToken, { uid: target.uid });
    expect(res.status).toBe(200);
    expect(await authUserExists(target.uid)).toBe(false);
    expect(await exists(`users/${target.uid}`)).toBe(false);
    expect(await exists(`wallets/${target.uid}`)).toBe(false);
    const b = (await get("bookings/bt")).data()!;
    expect(b.userId).toMatch(ANON_RE);
    expect(b.prix).toBe(76);
    const audit = (await db().collection("auditLogs").where("action", "==", "account.delete").get()).docs[0].data();
    expect(audit).toMatchObject({ actorRole: "admin", actorUid: a.uid, subject: b.userId });
    expect(await authUserExists(a.uid)).toBe(true);
    expect(await exists(`users/${a.uid}`)).toBe(true);
  });

  it("idempotence : second appel sur le même uid -> 200, données métier inchangées", async () => {
    const a = await makeAdmin();
    const target = await client("tg");
    await seedBooking("bt", target.uid);
    expect((await adminDel(a.idToken, { uid: target.uid })).status).toBe(200);
    const after = await snapshotAll();
    const second = await adminDel(a.idToken, { uid: target.uid });
    expect(second.status).toBe(200);
    expect(withoutAudit(await snapshotAll())).toEqual(withoutAudit(after));
    expect(await authUserExists(a.uid)).toBe(true);
  });

  it("uid inexistant -> pas de 500", async () => {
    const a = await makeAdmin();
    const res = await adminDel(a.idToken, { uid: "uid-qui-nexiste-pas" });
    expect(res.status).toBeLessThan(500);
  });
});
