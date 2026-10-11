// Hotfix routes API (portage du lot 0.2 sur main) : jeton obligatoire, identité prise du jeton,
// increment-authorization réservé à l'admin, send-devis échappé et invité -> admin seulement.
// Stripe et Resend simulés ; vrais jetons émis par l'émulateur Auth (projet demo-izymoto).
//
// Commande (depuis la racine du dépôt) :
//   npx firebase emulators:exec --only firestore,auth --project demo-izymoto "npx vitest run --config docs/incident/tests/vitest.config.mjs"
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { Timestamp } from "firebase-admin/firestore";

const { stripeMock, sendMail } = vi.hoisted(() => ({
  stripeMock: {
    paymentIntents: {
      create: vi.fn(),
      retrieve: vi.fn(),
      cancel: vi.fn(async () => ({})),
      incrementAuthorization: vi.fn(async (id, { amount }) => ({ id, status: "requires_capture", amount })),
    },
  },
  sendMail: vi.fn(async () => ({ data: { id: "mail_1" } })),
}));
vi.mock("@/lib/stripe-server", () => ({ stripe: stripeMock }));
vi.mock("resend", () => ({ Resend: class { emails = { send: (...a) => sendMail(...a) }; } }));

import { POST as debit } from "@/app/api/wallet/debit-for-booking/route.js";
import { POST as finalizeHybrid } from "@/app/api/wallet/finalize-hybrid-booking/route.js";
import { POST as createPI } from "@/app/api/create-payment-intent/route.js";
import { POST as incrementAuth } from "@/app/api/increment-authorization/route.js";
import { POST as sendDevis } from "@/app/api/send-devis/route.js";
import { getAdminFirestore, getAdminAuth } from "@/lib/firebase/admin-server";

const PROJECT = "demo-izymoto";
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const FS_HOST = process.env.FIRESTORE_EMULATOR_HOST;
const adb = () => getAdminFirestore();

async function createAuthUser(email) {
  const res = await fetch(`http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "Passw0rd!test", returnSecureToken: true }),
  });
  if (!res.ok) throw new Error(`signUp émulateur KO ${res.status}`);
  const j = await res.json();
  return { uid: j.localId, email, idToken: j.idToken };
}

// Marque l'email vérifié puis se reconnecte pour obtenir un jeton portant email_verified=true.
async function verifyEmail(user) {
  await getAdminAuth().updateUser(user.uid, { emailVerified: true });
  const res = await fetch(`http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: user.email, password: "Passw0rd!test", returnSecureToken: true }),
  });
  return { ...user, idToken: (await res.json()).idToken };
}

async function reset() {
  await fetch(`http://${AUTH_HOST}/emulator/v1/projects/${PROJECT}/accounts`, { method: "DELETE" });
  await fetch(`http://${FS_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: "DELETE" });
}

const req = (path, body, token, extraHeaders = {}) => {
  const headers = { "content-type": "application/json", ...extraHeaders };
  if (token) headers.authorization = `Bearer ${token}`;
  return new Request(`http://localhost${path}`, { method: "POST", headers, body: JSON.stringify(body) });
};

const seedWallet = (uid, balanceCents) =>
  adb().collection("wallets").doc(uid).set({
    userId: uid, balanceCents, cumulativeRechargedCents: balanceCents, currency: "EUR",
    createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
  });
const balance = async (uid) => (await adb().collection("wallets").doc(uid).get()).data().balanceCents;
const bookingsOf = async (uid) => (await adb().collection("bookings").where("userId", "==", uid).get()).docs.map((d) => d.data());

const ride = { depart: "Paris 75008", arrivee: "Orly 94390", distance: 18, duree: 30, name: "Alice", phone: "+33600000001", notes: "", prioriteReservation: false, reservationDate: "2026-12-01T10:00:00Z" };

let alice, bob, admin;
beforeEach(async () => {
  await reset();
  vi.clearAllMocks();
  sendMail.mockImplementation(async () => ({ data: { id: "mail_1" } }));
  alice = await createAuthUser("alice@test.dev");
  bob = await createAuthUser("bob@test.dev");
  admin = await createAuthUser("admin@test.dev");
  await adb().collection("users").doc(admin.uid).set({ isAdmin: true });
  await adb().collection("users").doc(alice.uid).set({ isAdmin: false });
});

describe("wallet/debit-for-booking", () => {
  const body = (extra = {}) => ({ amountCents: 8000, bookingData: ride, clientToken: "tok-1", ...extra });

  it("sans jeton -> 401, jeton invalide -> 401, aucun débit", async () => {
    await seedWallet(alice.uid, 10000);
    expect((await debit(req("/api/wallet/debit-for-booking", body({ userId: alice.uid })))).status).toBe(401);
    expect((await debit(req("/api/wallet/debit-for-booking", body({ userId: alice.uid }), "forge"))).status).toBe(401);
    expect(await balance(alice.uid)).toBe(10000);
  });

  it("userId du corps ignoré : Bob ne peut pas débiter le portefeuille d'Alice", async () => {
    await seedWallet(alice.uid, 10000);
    const res = await debit(req("/api/wallet/debit-for-booking", body({ userId: alice.uid }), bob.idToken));
    expect(res.status).toBe(404); // Bob n'a pas de portefeuille
    expect(await balance(alice.uid)).toBe(10000);
    expect(await bookingsOf(alice.uid)).toHaveLength(0);
  });

  it("débite le titulaire du jeton ; champs injectés ignorés ; email = jeton", async () => {
    await seedWallet(alice.uid, 10000);
    const res = await debit(req("/api/wallet/debit-for-booking", body({
      bookingData: { ...ride, email: "autre@x.dev", status: "completed", driverId: "d1", paymentStatus: "captured", userId: bob.uid, companyId: "c1", prix: 1 },
    }), alice.idToken));
    expect(res.status).toBe(200);
    expect(await balance(alice.uid)).toBe(2000);
    const [b] = await bookingsOf(alice.uid);
    expect(b.email).toBe("alice@test.dev");
    expect(b.status).toBe("awaiting_driver");
    expect(b.paymentStatus).toBe("paid_wallet");
    expect(b.prix).toBe(80);
    expect(b.driverId).toBeUndefined();
    expect(b.companyId).toBeUndefined();
  });

  it("montant hors fourchette 30–1000 € ou non entier -> 400, aucun débit", async () => {
    await seedWallet(alice.uid, 200000);
    for (const amountCents of [1, 0.5, 2999, 100001, 4000.5, "8000"]) {
      const res = await debit(req("/api/wallet/debit-for-booking", body({ amountCents }), alice.idToken));
      expect(res.status).toBe(400);
    }
    expect(await balance(alice.uid)).toBe(200000);
  });

  it("clientToken invalide ou réservé (hybrid_) -> 400", async () => {
    await seedWallet(alice.uid, 10000);
    for (const clientToken of ["", "a b", "x".repeat(101), "hybrid_pi_1", "evt/1"]) {
      const res = await debit(req("/api/wallet/debit-for-booking", body({ clientToken }), alice.idToken));
      expect(res.status).toBe(400);
    }
    expect(await balance(alice.uid)).toBe(10000);
  });

  it("rejeu : même clientToken par le titulaire -> un seul débit ; par un autre -> 409 sans fuite", async () => {
    await seedWallet(alice.uid, 10000);
    await seedWallet(bob.uid, 10000);
    const r1 = await debit(req("/api/wallet/debit-for-booking", body(), alice.idToken));
    const r2 = await debit(req("/api/wallet/debit-for-booking", body(), alice.idToken));
    expect((await r1.json()).bookingId).toBe((await r2.json()).bookingId);
    expect(await balance(alice.uid)).toBe(2000);
    const r3 = await debit(req("/api/wallet/debit-for-booking", body(), bob.idToken));
    expect(r3.status).toBe(409);
    const j3 = await r3.json();
    expect(j3.bookingId).toBeUndefined();
    expect(j3.balanceAfterCents).toBeUndefined();
    expect(await balance(bob.uid)).toBe(10000);
  });
});

describe("wallet/finalize-hybrid-booking", () => {
  const piOf = (userId, extra = {}) => ({
    id: "pi_h1", status: "requires_capture", amount: 3000,
    metadata: { userId, paymentMode: "hybrid", walletAmountCents: "5000", totalAmountCents: "8000" }, ...extra,
  });
  const body = (extra = {}) => ({ paymentIntentId: "pi_h1", walletAmountCents: 5000, cardAmountCents: 3000, bookingData: ride, ...extra });

  it("sans jeton -> 401, aucun appel Stripe", async () => {
    const res = await finalizeHybrid(req("/api/wallet/finalize-hybrid-booking", body({ userId: alice.uid })));
    expect(res.status).toBe(401);
    expect(stripeMock.paymentIntents.retrieve).not.toHaveBeenCalled();
  });

  it("PaymentIntent d'un autre compte -> 403, ni débit ni annulation", async () => {
    await seedWallet(bob.uid, 10000);
    stripeMock.paymentIntents.retrieve.mockResolvedValue(piOf(alice.uid));
    const res = await finalizeHybrid(req("/api/wallet/finalize-hybrid-booking", body(), bob.idToken));
    expect(res.status).toBe(403);
    expect(await balance(bob.uid)).toBe(10000);
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
  });

  it("PaymentIntent sans metadata.userId (créé avant le correctif) -> 403", async () => {
    await seedWallet(alice.uid, 10000);
    stripeMock.paymentIntents.retrieve.mockResolvedValue(piOf(undefined));
    expect((await finalizeHybrid(req("/api/wallet/finalize-hybrid-booking", body(), alice.idToken))).status).toBe(403);
  });

  it("part portefeuille ou mode incohérents avec le PaymentIntent -> 409, aucun débit", async () => {
    await seedWallet(alice.uid, 10000);
    stripeMock.paymentIntents.retrieve.mockResolvedValue(piOf(alice.uid));
    expect((await finalizeHybrid(req("/api/wallet/finalize-hybrid-booking", body({ walletAmountCents: 100 }), alice.idToken))).status).toBe(409);
    stripeMock.paymentIntents.retrieve.mockResolvedValue(piOf(alice.uid, { metadata: { userId: alice.uid, paymentMode: "card", walletAmountCents: "5000", totalAmountCents: "8000" } }));
    expect((await finalizeHybrid(req("/api/wallet/finalize-hybrid-booking", body(), alice.idToken))).status).toBe(409);
    expect(await balance(alice.uid)).toBe(10000);
  });

  it("un PaymentIntent = une seule course, même avec des clientToken différents", async () => {
    await seedWallet(alice.uid, 20000);
    stripeMock.paymentIntents.retrieve.mockResolvedValue(piOf(alice.uid));
    const r1 = await finalizeHybrid(req("/api/wallet/finalize-hybrid-booking", body({ clientToken: "a" }), alice.idToken));
    const r2 = await finalizeHybrid(req("/api/wallet/finalize-hybrid-booking", body({ clientToken: "b" }), alice.idToken));
    expect(r1.status).toBe(200);
    expect((await r1.json()).bookingId).toBe((await r2.json()).bookingId);
    expect(await balance(alice.uid)).toBe(15000);
    const list = await bookingsOf(alice.uid);
    expect(list).toHaveLength(1);
    expect(list[0].email).toBe("alice@test.dev");
    expect(list[0].paymentId).toBe("pi_h1");
    expect((await adb().collection("walletTransactions").doc("hybrid_pi_h1").get()).exists).toBe(true);
  });
});

describe("create-payment-intent", () => {
  beforeEach(() => {
    stripeMock.paymentIntents.create.mockImplementation(async (p) => ({ id: "pi_new", client_secret: "sec", ...p }));
  });

  it("sans jeton -> 401, aucun PaymentIntent créé", async () => {
    const res = await createPI(req("/api/create-payment-intent", { amount: 80, metadata: ride }));
    expect(res.status).toBe(401);
    expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
  });

  it("métadonnées : propriétaire = jeton, clés réservées non écrasables, aucune donnée perso", async () => {
    const res = await createPI(req("/api/create-payment-intent", {
      amount: 80,
      walletAmountCents: 5000,
      metadata: { ...ride, userId: bob.uid, paymentMode: "card", walletAmountCents: "1", intent: "wallet_recharge", email: "x@y.z" },
    }, alice.idToken));
    expect(res.status).toBe(200);
    const { metadata, amount } = stripeMock.paymentIntents.create.mock.calls[0][0];
    expect(amount).toBe(3000);
    expect(metadata.userId).toBe(alice.uid);
    expect(metadata.paymentMode).toBe("hybrid");
    expect(metadata.walletAmountCents).toBe("5000");
    expect(metadata.totalAmountCents).toBe("8000");
    expect(metadata.intent).toBeUndefined();
    expect(metadata.name).toBeUndefined();
    expect(metadata.phone).toBeUndefined();
    expect(metadata.email).toBeUndefined();
    expect(metadata.depart).toBe("Paris 75008");
  });

  it("carte seule : paymentMode card ; erreur Stripe non renvoyée au client", async () => {
    await createPI(req("/api/create-payment-intent", { amount: 80, metadata: ride }, alice.idToken));
    expect(stripeMock.paymentIntents.create.mock.calls[0][0].metadata.paymentMode).toBe("card");
    stripeMock.paymentIntents.create.mockRejectedValueOnce(new Error("sk_live_secret detail"));
    const res = await createPI(req("/api/create-payment-intent", { amount: 80, metadata: ride }, alice.idToken));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("sk_live");
  });
});

describe("increment-authorization (admin uniquement)", () => {
  const body = { paymentIntentId: "pi_1", amount: 120 };

  it("sans jeton -> 401 ; client -> 403 ; aucun appel Stripe", async () => {
    expect((await incrementAuth(req("/api/increment-authorization", body))).status).toBe(401);
    expect((await incrementAuth(req("/api/increment-authorization", body, alice.idToken))).status).toBe(403);
    expect((await incrementAuth(req("/api/increment-authorization", body, bob.idToken))).status).toBe(403); // pas de fiche users
    expect(stripeMock.paymentIntents.incrementAuthorization).not.toHaveBeenCalled();
  });

  it("admin -> 200", async () => {
    const res = await incrementAuth(req("/api/increment-authorization", body, admin.idToken));
    expect(res.status).toBe(200);
    expect(stripeMock.paymentIntents.incrementAuthorization).toHaveBeenCalledWith("pi_1", { amount: 12000 });
  });
});

describe("send-devis", () => {
  const devis = (extra = {}) => ({
    name: "Alice", email: "victime@ailleurs.dev", depart: "Paris", arrivee: "Orly", prix: 80, distance: 18,
    reservationId: "DEV-1", notes: "", prioriteReservation: false, phone: "+33600000001", ...extra,
  });

  it("invité : un seul email, vers contact@izymoto.com uniquement", async () => {
    const res = await sendDevis(req("/api/send-devis", devis()));
    expect(res.status).toBe(200);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0].to).toEqual(["contact@izymoto.com"]);
    expect(sendMail.mock.calls[0][0].html).toContain("victime@ailleurs.dev");
  });

  it("connecté, email vérifié : devis envoyé à l'email du jeton (email du corps ignoré) + admin", async () => {
    const verified = await verifyEmail(alice);
    const res = await sendDevis(req("/api/send-devis", devis(), verified.idToken));
    expect(res.status).toBe(200);
    const recipients = sendMail.mock.calls.map((c) => c[0].to[0]);
    expect(recipients).toEqual(["alice@test.dev", "contact@izymoto.com"]);
  });

  it("connecté, email non vérifié : admin seulement (pas de relais vers une adresse non prouvée)", async () => {
    const res = await sendDevis(req("/api/send-devis", devis(), alice.idToken));
    expect(res.status).toBe(200);
    expect(sendMail.mock.calls.map((c) => c[0].to[0])).toEqual(["contact@izymoto.com"]);
  });

  it("jeton invalide -> 401, aucun email", async () => {
    expect((await sendDevis(req("/api/send-devis", devis(), "forge"))).status).toBe(401);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("HTML échappé, sujet sans retour à la ligne", async () => {
    await sendDevis(req("/api/send-devis", devis({
      name: '<img src=x onerror="alert(1)">', notes: "<script>x</script>", depart: "<a href='http://evil'>clic</a>",
      prix: "<b>0</b>", distance: "<i>", reservationId: "DEV-1\r\nBcc: x@y.z",
    })));
    const { html, subject } = sendMail.mock.calls[0][0];
    expect(html).not.toMatch(/<img|<script|<a href|<b>0|<i>/);
    expect(html).toContain("&lt;script&gt;");
    expect(subject).not.toMatch(/[\r\n]/);
  });

  it("email invalide -> 400", async () => {
    for (const email of ["", "pas-un-email", "a@b", "a@b.c<script>", "x".repeat(250) + "@a.fr"]) {
      expect((await sendDevis(req("/api/send-devis", devis({ email })))).status).toBe(400);
    }
    expect(sendMail).not.toHaveBeenCalled();
  });
});
