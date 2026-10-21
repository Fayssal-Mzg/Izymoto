// Lot 2.3 (SENSIBLE) : notifications push, socle (M2c). Couvre : /api/push/register et
// /unregister, sendPush (Expo simulé par un mock de fetch), les événements branchés
// (nouvelle course sur chaque chemin d'entrée au pool, acceptée / démarrée / terminée,
// paiement à confirmer), l'anti-doublon, la résilience aux pannes d'Expo, les jetons
// DeviceNotRegistered, la tâche quotidienne et l'effacement à la suppression de compte.
// Émulateurs Firestore + Auth ; Stripe et Resend mockés ; aucun appel réel à Expo.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Query, Timestamp } from "firebase-admin/firestore";

const stripeMock = vi.hoisted(() => ({
  paymentIntents: { create: vi.fn(), retrieve: vi.fn(), cancel: vi.fn(), confirm: vi.fn() },
  setupIntents: { retrieve: vi.fn() },
  webhooks: { constructEvent: vi.fn() },
  customers: { del: vi.fn() },
}));
vi.mock("@/lib/stripe-server", () => ({ stripe: stripeMock }));
vi.mock("@/lib/emails/reviewRequestEmail", () => ({ sendReviewRequestEmail: vi.fn() }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: vi.fn().mockResolvedValue({ data: { id: "email_test" }, error: null }) };
  },
}));

import { POST as registerRoute } from "@/app/api/push/register/route";
import { POST as unregisterRoute } from "@/app/api/push/unregister/route";
import { POST as ridesRoute } from "@/app/api/rides/[action]/route";
import { POST as finalizeCard } from "@/app/api/finalize-card-booking/route";
import { POST as finalizeDeferred } from "@/app/api/finalize-deferred-booking/route";
import { POST as debitForBooking } from "@/app/api/wallet/debit-for-booking/route";
import { POST as finalizeHybrid } from "@/app/api/wallet/finalize-hybrid-booking/route";
import { POST as webhook } from "@/app/api/webhooks/stripe/route";
import { GET as cronPushReceipts } from "@/app/api/cron/push-receipts/route";
import { GET as cronDeferredHolds } from "@/app/api/cron/deferred-holds/route";
import { getAdminFirestore } from "@/lib/firebase/admin-server";
import { deleteAccount } from "@/lib/account/deleteAccount";
import { placeDeferredHold } from "@/lib/payments/deferredHold";
import { refreshRidePool } from "@/lib/rides/pool";
import { notifyRidesAvailable } from "@/lib/push/events";
import { processPushReceipts } from "@/lib/push/receipts";
import { sendPush } from "@/lib/push/send";
import { registerDevice, tokenHash } from "@/lib/push/tokens";
import {
  createAuthUser,
  jsonRequest,
  piCreatedNow,
  resetEmulators,
  rideMeta,
  seedUserDoc,
  validRide,
  VALID_RIDE_TOTAL_CENTS,
} from "./helpers";

const db = () => getAdminFirestore();
const DAY = 24 * 60 * 60 * 1000;
const CRON_SECRET = "cron-secret-de-test";

let n = 0;
const uniqueEmail = (p: string) => `${p}-${++n}@test.dev`;
let tokSeq = 0;
const newPushToken = () => `ExponentPushToken[tok${String(++tokSeq).padStart(6, "0")}abcdef]`;

// ---------------------------------------------------------------- Expo simulé
type ExpoMode = "ok" | "down" | "slow" | "http500" | "badjson" | "notRegistered";
interface ExpoCall {
  url: string;
  headers: Record<string, string>;
  body: any;
}
const realFetch = globalThis.fetch;
let expoMode: ExpoMode = "ok";
let expoCalls: ExpoCall[] = [];
let unregisteredTokens = new Set<string>();
let receiptsAnswer: Record<string, unknown> = {};
let ticketSeq = 0;
let onSend: (() => Promise<void>) | null = null;

function installExpo() {
  vi.stubGlobal("fetch", async (input: any, init?: any) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url.startsWith("https://exp.host/")) return realFetch(input, init);
    expoCalls.push({ url, headers: init?.headers ?? {}, body: JSON.parse(init.body) });
    if (expoMode === "down") throw new TypeError("fetch failed");
    if (expoMode === "slow") {
      return new Promise((_, reject) =>
        init.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))
      );
    }
    if (expoMode === "http500") return new Response("boom", { status: 500 });
    if (expoMode === "badjson") return new Response("pas du json", { status: 200 });
    if (url.endsWith("/send") && onSend) await onSend();
    if (url.endsWith("/getReceipts")) return Response.json({ data: receiptsAnswer });
    const tickets = (init.body ? JSON.parse(init.body) : []).map((m: { to: string }) =>
      expoMode === "notRegistered" && unregisteredTokens.has(m.to)
        ? { status: "error", message: "not registered", details: { error: "DeviceNotRegistered" } }
        : { status: "ok", id: `ticket-${++ticketSeq}` }
    );
    return Response.json({ data: tickets });
  });
}

const sendCalls = () => expoCalls.filter((c) => c.url.endsWith("/send"));
const sentMessages = () => sendCalls().flatMap((c) => c.body as Array<Record<string, any>>);
const sentTokens = () => sentMessages().map((m) => m.to as string).sort();

// ---------------------------------------------------------------- acteurs
interface Actor {
  uid: string;
  idToken: string;
  email: string;
}

const reg = (token: string | undefined, body: unknown) => registerRoute(jsonRequest("/api/push/register", { token, body }));
const unreg = (token: string | undefined, body: unknown) => unregisterRoute(jsonRequest("/api/push/unregister", { token, body }));

async function addDevice(u: Actor, app: "chauffeur" | "client", pushToken = newPushToken()): Promise<string> {
  const res = await reg(u.idToken, { token: pushToken, platform: "android", app });
  expect(res.status).toBe(200);
  return pushToken;
}

async function mkClient(label: string, withDevice = true): Promise<Actor & { push: string }> {
  const u = await createAuthUser(uniqueEmail(label));
  await seedUserDoc(u.uid, { email: u.email, isAdmin: false, role: "client" });
  return { ...u, push: withDevice ? await addDevice(u, "client") : "" };
}

async function mkDriver(
  label: string,
  over: { status?: string; availability?: string; noDoc?: boolean; phone?: string; app?: "chauffeur" | "client" } = {}
): Promise<Actor & { push: string }> {
  const u = await createAuthUser(uniqueEmail(label));
  await seedUserDoc(u.uid, { email: u.email, isAdmin: false, role: "driver" });
  if (!over.noDoc) {
    await db().collection("drivers").doc(u.uid).set({
      uid: u.uid,
      status: over.status ?? "active",
      availability: over.availability ?? "online",
      ...(over.phone ? { phone: over.phone } : {}),
    });
  }
  return { ...u, push: await addDevice(u, over.app ?? "chauffeur") };
}

const PII = {
  name: "Jean Dupont",
  phone: "+33612345678",
  email: "jean.dupont@test.dev",
  notes: "Code porte 4567, sonner chez Dupont",
  depart: "10 Rue de Rivoli, 75001 Paris",
  arrivee: "Aéroport d'Orly, 94390 Orly",
};
const PII_FRAGMENTS = ["Jean", "Dupont", "612345678", "0612345678", "jean.dupont", "4567", "Rivoli", "sonner", "10 Rue"];

async function seedWaiting(id: string, over: Record<string, unknown> = {}, sync = true) {
  await db().collection("bookings").doc(id).set({
    userId: "passager-1",
    status: "awaiting_driver",
    paymentStatus: "authorized",
    prix: 80,
    distance: 20,
    duree: 35,
    reservationId: `CMD-${id}`,
    prioriteReservation: false,
    reservationDate: Timestamp.fromDate(new Date("2026-12-01T13:30:00Z")), // 14 h 30 à Paris
    createdAt: Timestamp.now(),
    ...PII,
    ...over,
  });
  if (sync) await refreshRidePool(id);
}

const booking = async (id: string) => (await db().collection("bookings").doc(id).get()).data()!;
const ride = (action: string, token: string | undefined, body: Record<string, unknown>) =>
  ridesRoute(jsonRequest(`/api/rides/${action}`, { token, body }), { params: { action } });
const exists = async (path: string) => (await db().doc(path).get()).exists;
const count = async (col: string) => (await db().collection(col).get()).size;

function assertNoPii(messages: Array<Record<string, any>>, extra: string[] = []) {
  for (const m of messages) {
    const text = JSON.stringify({ title: m.title, body: m.body, data: m.data });
    for (const frag of [...PII_FRAGMENTS, ...extra]) expect(text, frag).not.toContain(frag);
    expect(Object.keys(m.data).sort()).toEqual(["bookingId", "type"]);
  }
}

beforeEach(async () => {
  await resetEmulators();
  expoMode = "ok";
  expoCalls = [];
  unregisteredTokens = new Set();
  receiptsAnswer = {};
  onSend = null;
  process.env.CRON_SECRET = CRON_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_dummy";
  delete process.env.EXPO_ACCESS_TOKEN;
  for (const group of Object.values(stripeMock)) for (const fn of Object.values(group)) fn.mockReset();
  stripeMock.paymentIntents.cancel.mockResolvedValue({ id: "pi_x", status: "canceled" });
  installExpo();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// ================================================================ enregistrement
describe("/api/push/register et /unregister", () => {
  const good = () => ({ token: newPushToken(), platform: "ios", app: "client" });

  it("sans jeton Firebase -> 401, rien d'écrit", async () => {
    expect((await reg(undefined, good())).status).toBe(401);
    expect((await reg("jeton.invalide", good())).status).toBe(401);
    expect((await unreg(undefined, { token: newPushToken() })).status).toBe(401);
    expect(await count("pushTokens")).toBe(0);
  });

  it.each([
    ["jeton Expo mal formé", { token: "pas-un-jeton", platform: "ios", app: "client" }],
    ["jeton absent", { platform: "ios", app: "client" }],
    ["jeton FCM brut", { token: "fcm:APA91bH-abcdefgh", platform: "ios", app: "client" }],
    ["plateforme inconnue", { token: "ExponentPushToken[abcdefgh1234]", platform: "web", app: "client" }],
    ["appli inconnue", { token: "ExponentPushToken[abcdefgh1234]", platform: "ios", app: "admin" }],
    ["corps vide", {}],
  ])("%s -> 400", async (_label, body) => {
    const u = await createAuthUser(uniqueEmail("bad"));
    const res = await reg(u.idToken, body);
    expect(res.status).toBe(400);
    expect(await count("pushTokens")).toBe(0);
  });

  it("corps non JSON -> 400 ; unregister avec jeton mal formé -> 400", async () => {
    const u = await createAuthUser(uniqueEmail("nojson"));
    const res = await registerRoute(
      new Request("http://localhost/api/push/register", { method: "POST", headers: { authorization: `Bearer ${u.idToken}` }, body: "pas du json" })
    );
    expect(res.status).toBe(400);
    expect((await unreg(u.idToken, { token: "x" })).status).toBe(400);
  });

  it("enregistre pour SOI seulement : un uid ou userId dans le corps est ignoré", async () => {
    const me = await createAuthUser(uniqueEmail("me"));
    const victim = await createAuthUser(uniqueEmail("victim"));
    const body = { ...good(), uid: victim.uid, userId: victim.uid, driverId: victim.uid };
    expect((await reg(me.idToken, body)).status).toBe(200);
    const hash = tokenHash(body.token);
    const mine = await db().doc(`pushDevices/${me.uid}/devices/${hash}`).get();
    expect(mine.data()).toMatchObject({ token: body.token, platform: "ios", app: "client" });
    expect(mine.data()?.createdAt).toBeTruthy();
    expect((await db().doc(`pushTokens/${hash}`).get()).data()?.uid).toBe(me.uid);
    expect(await count(`pushDevices/${victim.uid}/devices`)).toBe(0);
  });

  it("idempotent : deux appels avec le même jeton = un seul appareil", async () => {
    const me = await createAuthUser(uniqueEmail("idem"));
    const body = good();
    await reg(me.idToken, body);
    await reg(me.idToken, body);
    expect(await count(`pushDevices/${me.uid}/devices`)).toBe(1);
    expect(await count("pushTokens")).toBe(1);
  });

  it("un même jeton enregistré par un second compte disparaît du premier", async () => {
    const a = await createAuthUser(uniqueEmail("a"));
    const b = await createAuthUser(uniqueEmail("b"));
    const body = good();
    await reg(a.idToken, body);
    await reg(b.idToken, body);
    const hash = tokenHash(body.token);
    expect(await exists(`pushDevices/${a.uid}/devices/${hash}`)).toBe(false);
    expect(await exists(`pushDevices/${b.uid}/devices/${hash}`)).toBe(true);
    expect((await db().doc(`pushTokens/${hash}`).get()).data()?.uid).toBe(b.uid);
    // L'ancien compte ne reçoit plus rien sur ce téléphone.
    await sendPush([a.uid], "client", { title: "t", body: "b", data: { type: "ride_started", bookingId: "x" } });
    expect(sendCalls()).toHaveLength(0);
  });

  it("unregister : retire l'appareil du compte appelant, jamais celui d'un autre compte", async () => {
    const a = await createAuthUser(uniqueEmail("ua"));
    const b = await createAuthUser(uniqueEmail("ub"));
    const bodyA = good();
    const bodyB = good();
    await reg(a.idToken, bodyA);
    await reg(b.idToken, bodyB);
    // A tente de désinscrire le jeton de B : sans effet sur B.
    expect((await unreg(a.idToken, { token: bodyB.token })).status).toBe(200);
    expect(await exists(`pushDevices/${b.uid}/devices/${tokenHash(bodyB.token)}`)).toBe(true);
    expect(await exists(`pushTokens/${tokenHash(bodyB.token)}`)).toBe(true);
    // A désinscrit le sien.
    expect((await unreg(a.idToken, { token: bodyA.token })).status).toBe(200);
    expect(await exists(`pushDevices/${a.uid}/devices/${tokenHash(bodyA.token)}`)).toBe(false);
    expect(await exists(`pushTokens/${tokenHash(bodyA.token)}`)).toBe(false);
  });

  it("10 appareils au plus par compte : le plus ancien est retiré", async () => {
    const me = await createAuthUser(uniqueEmail("max"));
    const tokens: string[] = [];
    for (let i = 0; i < 11; i += 1) {
      const body = good();
      tokens.push(body.token);
      expect((await reg(me.idToken, body)).status).toBe(200);
    }
    expect(await count(`pushDevices/${me.uid}/devices`)).toBe(10);
    expect(await exists(`pushDevices/${me.uid}/devices/${tokenHash(tokens[0])}`)).toBe(false);
    expect(await exists(`pushTokens/${tokenHash(tokens[0])}`)).toBe(false);
    expect(await exists(`pushDevices/${me.uid}/devices/${tokenHash(tokens[10])}`)).toBe(true);
  });
});

// ================================================================ nouvelle course : public
describe("nouvelle course : bon public, à lui seul", () => {
  it("chauffeurs validés en service seulement ; jamais hors service, non validé, supprimé, sans fiche, ni l'appli client", async () => {
    const d1 = await mkDriver("ok1");
    const d2 = await mkDriver("ok2");
    await mkDriver("offline", { availability: "offline" });
    await mkDriver("pending", { status: "pending" });
    await mkDriver("deleted", { status: "deleted" });
    await mkDriver("nodoc", { noDoc: true });
    await mkDriver("clientapp", { app: "client" });
    await seedWaiting("b1");
    await notifyRidesAvailable("b1");
    expect(sentTokens()).toEqual([d1.push, d2.push].sort());
    expect(sendCalls()).toHaveLength(1);
  });

  it("jamais le passager de la course (D-003), ni un chauffeur ayant son téléphone", async () => {
    const other = await mkDriver("other");
    const passenger = await mkDriver("passenger"); // compte chauffeur qui réserve une course
    await mkDriver("samephone", { phone: "06 12 34 56 78" });
    await seedWaiting("b1", { userId: passenger.uid });
    await notifyRidesAvailable("b1");
    expect(sentTokens()).toEqual([other.push]);
  });

  it("course non éligible (confirmée, paiement échoué) ou absente : rien", async () => {
    await mkDriver("ok");
    await seedWaiting("b1", { status: "confirmed" }, false);
    await seedWaiting("b2", { paymentStatus: "failed" }, false);
    await notifyRidesAvailable("b1", "b2", "absente", undefined, null);
    expect(sendCalls()).toHaveLength(0);
  });

  it("texte : zones, date, part chauffeur ; données = type + bookingId seulement ; aucune donnée personnelle", async () => {
    const d = await mkDriver("txt");
    await seedWaiting("b1");
    await notifyRidesAvailable("b1");
    const [m] = sentMessages();
    expect(m.to).toBe(d.push);
    expect(m.title).toBe("Nouvelle course");
    expect(m.body).toBe("Paris 1er → Aéroport d'Orly, 1 déc. 14 h 30 — 64,00 € pour vous");
    expect(m.data).toEqual({ type: "ride_available", bookingId: "b1" });
    assertNoPii(sentMessages());
  });

  it("rejeu (double appel) : une seule notification", async () => {
    await mkDriver("rejeu");
    await seedWaiting("b1");
    await notifyRidesAvailable("b1");
    await notifyRidesAvailable("b1");
    await Promise.all([notifyRidesAvailable("b1"), notifyRidesAvailable("b1")]);
    expect(sendCalls()).toHaveLength(1);
    expect(await count("pushEvents")).toBe(1);
  });

  it("libération puis remise au pool : nouvelle notification, sans le chauffeur qui a libéré", async () => {
    const d1 = await mkDriver("d1");
    const d2 = await mkDriver("d2");
    await seedWaiting("b1");
    expect((await ride("accept", d1.idToken, { bookingId: "b1" })).status).toBe(200);
    expect(sendCalls()).toHaveLength(0); // l'acceptation ne notifie pas les chauffeurs (passager sans appareil)
    await new Promise((r) => setTimeout(r, 5));
    expect((await ride("release", d1.idToken, { bookingId: "b1", reason: "Imprévu" })).status).toBe(200);
    expect(sentTokens()).toEqual([d2.push]);
    // Un rejeu de la remise au pool n'envoie rien de plus.
    await notifyRidesAvailable("b1");
    expect(sendCalls()).toHaveLength(1);
    // Une seconde libération (nouvelle acceptation par d2, puis libération) renvoie une notification.
    await new Promise((r) => setTimeout(r, 5));
    expect((await ride("accept", d2.idToken, { bookingId: "b1" })).status).toBe(200);
    await new Promise((r) => setTimeout(r, 5));
    expect((await ride("release", d2.idToken, { bookingId: "b1", reason: "Imprévu" })).status).toBe(200);
    expect(sendCalls()).toHaveLength(2);
    expect(sendCalls()[1].body.map((m: any) => m.to)).toEqual([d1.push]);
  });
});

// ================================================================ chemins d'entrée au pool
describe("nouvelle course : chaque chemin d'entrée au pool", () => {
  const cardMeta = (uid: string) => ({
    userId: uid,
    paymentMode: "card",
    walletAmountCents: "0",
    totalAmountCents: String(VALID_RIDE_TOTAL_CENTS),
    ...rideMeta(validRide()),
  });
  const bookingData = () => ({ ...validRide(), name: "Jean Dupont", phone: "+33612345678", notes: "Code 4567" });

  it("finalize-card-booking : notifie les chauffeurs, pas le passager, sans donnée personnelle", async () => {
    const d = await mkDriver("fc-d");
    const u = await createAuthUser(uniqueEmail("fc-u"));
    await db().collection("drivers").doc(u.uid).set({ status: "active", availability: "online" });
    await addDevice(u, "chauffeur"); // le passager a aussi un appareil chauffeur : il doit être exclu
    stripeMock.paymentIntents.retrieve.mockResolvedValue({
      id: "pi_ok", status: "requires_capture", created: piCreatedNow(), amount: VALID_RIDE_TOTAL_CENTS, metadata: cardMeta(u.uid),
    });
    const res = await finalizeCard(jsonRequest("/api/finalize-card-booking", { token: u.idToken, body: { paymentIntentId: "pi_ok", bookingData: bookingData() } }));
    expect(res.status).toBe(200);
    expect(sentTokens()).toEqual([d.push]);
    expect(sentMessages()[0].data).toEqual({ type: "ride_available", bookingId: "card_pi_ok" });
    assertNoPii(sentMessages(), [u.email]);
    // Rejeu de la finalisation : aucune notification de plus.
    await finalizeCard(jsonRequest("/api/finalize-card-booking", { token: u.idToken, body: { paymentIntentId: "pi_ok", bookingData: bookingData() } }));
    expect(sendCalls()).toHaveLength(1);
  });

  it("finalize-deferred-booking : notifie les chauffeurs", async () => {
    const d = await mkDriver("fd-d");
    const u = await createAuthUser(uniqueEmail("fd-u"));
    const ride_ = validRide();
    stripeMock.setupIntents.retrieve.mockResolvedValue({
      id: "seti_ok", status: "succeeded", created: piCreatedNow(), customer: "cus_test", payment_method: "pm_test",
      metadata: { userId: u.uid, paymentMode: "card_deferred", totalAmountCents: String(VALID_RIDE_TOTAL_CENTS), ...rideMeta(ride_) },
    });
    const res = await finalizeDeferred(
      jsonRequest("/api/finalize-deferred-booking", { token: u.idToken, body: { setupIntentId: "seti_ok", bookingData: { ...ride_, name: "Jean Dupont", phone: "+33612345678" } } })
    );
    expect(res.status).toBe(200);
    expect(sentTokens()).toEqual([d.push]);
    assertNoPii(sentMessages());
  });

  it("wallet/debit-for-booking : notifie les chauffeurs", async () => {
    const d = await mkDriver("wd-d");
    const u = await createAuthUser(uniqueEmail("wd-u"));
    await db().collection("wallets").doc(u.uid).set({ userId: u.uid, balanceCents: 10000, cumulativeRechargedCents: 10000, currency: "EUR" });
    const res = await debitForBooking(
      jsonRequest("/api/wallet/debit-for-booking", { token: u.idToken, body: { amountCents: 7600, clientToken: "tok-push", bookingData: validRide() } })
    );
    expect(res.status).toBe(200);
    expect(sentTokens()).toEqual([d.push]);
    // Rejeu avec le même clientToken : réponse identique, pas de seconde notification.
    await debitForBooking(
      jsonRequest("/api/wallet/debit-for-booking", { token: u.idToken, body: { amountCents: 7600, clientToken: "tok-push", bookingData: validRide() } })
    );
    expect(sendCalls()).toHaveLength(1);
  });

  it("wallet/finalize-hybrid-booking : notifie les chauffeurs", async () => {
    const d = await mkDriver("hy-d");
    const u = await createAuthUser(uniqueEmail("hy-u"));
    await db().collection("wallets").doc(u.uid).set({ userId: u.uid, balanceCents: 10000, cumulativeRechargedCents: 10000, currency: "EUR" });
    stripeMock.paymentIntents.retrieve.mockResolvedValue({
      id: "pi_hy", status: "requires_capture", created: piCreatedNow(), amount: 5600,
      metadata: { userId: u.uid, paymentMode: "hybrid", walletAmountCents: "2000", totalAmountCents: String(VALID_RIDE_TOTAL_CENTS), ...rideMeta(validRide()) },
    });
    const res = await finalizeHybrid(
      jsonRequest("/api/wallet/finalize-hybrid-booking", {
        token: u.idToken,
        body: { paymentIntentId: "pi_hy", walletAmountCents: 1, cardAmountCents: 1, clientToken: "tok-hy", bookingData: validRide() },
      })
    );
    expect(res.status).toBe(200);
    expect(sentTokens()).toEqual([d.push]);
  });

  describe("webhook Stripe", () => {
    const send = (type: string, object: Record<string, unknown>, id = `evt_${type}_${object.id}`) => {
      const event = { id, type, data: { object } };
      stripeMock.webhooks.constructEvent.mockReturnValue(event);
      return webhook(
        new Request("http://localhost/api/webhooks/stripe", { method: "POST", headers: { "stripe-signature": "t=1,v1=mockee" }, body: JSON.stringify(event) })
      );
    };

    it("amount_capturable_updated : notifie une fois ; un événement rejoué n'envoie rien de plus", async () => {
      const d = await mkDriver("wh-d");
      await seedWaiting("b1", { status: "confirmed", paymentStatus: "pending", paymentId: "pi_cap" }, false);
      expect((await send("payment_intent.amount_capturable_updated", { id: "pi_cap", amount: 8000, metadata: {} })).status).toBe(200);
      expect(sentTokens()).toEqual([d.push]);
      expect((await send("payment_intent.amount_capturable_updated", { id: "pi_cap", amount: 8000, metadata: {} }, "evt_rejeu")).status).toBe(200);
      expect((await send("payment_intent.amount_capturable_updated", { id: "pi_cap", amount: 8000, metadata: {} }, "evt_rejeu2")).status).toBe(200);
      expect(sendCalls()).toHaveLength(1);
    });

    it("course déjà assignée : aucune notification « nouvelle course »", async () => {
      await mkDriver("wh-d2");
      await seedWaiting("b1", { status: "assigned", driverId: "chauffeur-1", paymentId: "pi_adv" }, false);
      await send("payment_intent.amount_capturable_updated", { id: "pi_adv", amount: 8000, metadata: {} });
      expect(sendCalls()).toHaveLength(0);
    });

    it("annulation / échec / capture : aucune notification chauffeur", async () => {
      await mkDriver("wh-d3");
      await seedWaiting("b1", { paymentId: "pi_can" });
      await send("payment_intent.canceled", { id: "pi_can", metadata: {} });
      expect(sendCalls()).toHaveLength(0);
    });
  });
});

// ================================================================ événements client
describe("course acceptée / démarrée / terminée : le client de la course seulement", () => {
  it("chaque transition notifie le client (appli client), une fois, sans donnée personnelle", async () => {
    const driver = await mkDriver("drv");
    const passenger = await mkClient("pax");
    const bystander = await mkClient("bystander"); // client d'une autre course
    await seedWaiting("b1", { userId: passenger.uid });
    // Le passager a aussi un appareil « chauffeur » : il ne doit recevoir que l'appli client.
    const paxDriverApp = await addDevice(passenger, "chauffeur");

    expect((await ride("accept", driver.idToken, { bookingId: "b1" })).status).toBe(200);
    expect(sentTokens()).toEqual([passenger.push]);
    expect(sentMessages()[0]).toMatchObject({ title: "Course acceptée", body: "Votre course du 1 déc. est acceptée : votre chauffeur se prépare." });
    expect(sentMessages()[0].data).toEqual({ type: "ride_accepted", bookingId: "b1" });

    await new Promise((r) => setTimeout(r, 5));
    expect((await ride("start", driver.idToken, { bookingId: "b1" })).status).toBe(200);
    expect(sentMessages()[1]).toMatchObject({ to: passenger.push, body: "Votre course a démarré.", data: { type: "ride_started", bookingId: "b1" } });

    await new Promise((r) => setTimeout(r, 5));
    expect((await ride("complete", driver.idToken, { bookingId: "b1" })).status).toBe(200);
    expect(sentMessages()[2]).toMatchObject({ to: passenger.push, body: "Course terminée. Merci d'avoir choisi Izymoto.", data: { type: "ride_completed", bookingId: "b1" } });

    expect(sendCalls()).toHaveLength(3);
    const all = sentTokens();
    expect(all).not.toContain(bystander.push);
    expect(all).not.toContain(paxDriverApp);
    expect(all).not.toContain(driver.push);
    assertNoPii(sentMessages(), [passenger.email, driver.email]);
  });

  it("action refusée (course déjà prise, mauvais chauffeur) : aucune notification", async () => {
    const d1 = await mkDriver("r1");
    const d2 = await mkDriver("r2");
    const passenger = await mkClient("pax2");
    await seedWaiting("b1", { userId: passenger.uid });
    await ride("accept", d1.idToken, { bookingId: "b1" });
    expect((await ride("accept", d2.idToken, { bookingId: "b1" })).status).toBe(409);
    expect((await ride("start", d2.idToken, { bookingId: "b1" })).status).toBe(403);
    expect((await ride("accept", d1.idToken, { bookingId: "b1" })).status).toBe(409);
    expect(sendCalls()).toHaveLength(1);
  });

  it("course d'un invité (userId « guest_ ») ou sans userId : aucune notification", async () => {
    const driver = await mkDriver("g-drv");
    await seedWaiting("g1", { userId: "guest_abc123" });
    await seedWaiting("g2", { userId: null });
    for (const id of ["g1", "g2"]) {
      expect((await ride("accept", driver.idToken, { bookingId: id })).status).toBe(200);
      expect((await ride("start", driver.idToken, { bookingId: id })).status).toBe(200);
      expect((await ride("complete", driver.idToken, { bookingId: id })).status).toBe(200);
    }
    expect(sendCalls()).toHaveLength(0);
  });

  it("client sans appareil enregistré : réponse normale, aucun appel à Expo", async () => {
    const driver = await mkDriver("nd-drv");
    const passenger = await mkClient("nd-pax", false);
    await seedWaiting("b1", { userId: passenger.uid });
    expect((await ride("accept", driver.idToken, { bookingId: "b1" })).status).toBe(200);
    expect(expoCalls).toHaveLength(0);
  });
});

// ================================================================ paiement à confirmer
describe("paiement à confirmer : notification au client, en plus de l'e-mail, dédoublonnée", () => {
  async function seedSaved(id: string, uid: string) {
    await db().collection("bookings").doc(id).set({
      userId: uid,
      email: "client@test.dev",
      name: "Client Test",
      depart: PII.depart,
      arrivee: PII.arrivee,
      prix: 76,
      reservationId: "CMD-TEST",
      reservationDate: Timestamp.fromDate(new Date("2026-12-01T13:30:00Z")),
      setupIntentId: "seti_saved",
      paymentMethod: "card",
      paymentStatus: "card_saved",
      deferredHold: true,
      holdScheduledFor: Timestamp.fromMillis(Date.now() - 1000),
      holdAttempts: 0,
      status: "awaiting_driver",
      serverFinalized: true,
    });
  }

  it("première relance refusée : une notification ; la relance du lendemain n'en renvoie pas", async () => {
    const client = await mkClient("pay");
    const other = await mkClient("pay-other");
    await seedSaved("d1", client.uid);
    stripeMock.setupIntents.retrieve.mockResolvedValue({ id: "seti_saved", status: "requires_payment_method", customer: "cus_1", payment_method: "pm_1" });
    stripeMock.paymentIntents.create.mockResolvedValue({ id: "pi_inu", status: "requires_payment_method", amount: 7600 });
    stripeMock.paymentIntents.retrieve.mockResolvedValue({ id: "pi_inu", status: "requires_payment_method", amount: 7600 });

    expect(await placeDeferredHold("d1")).toBe("action_required");
    expect(sentTokens()).toEqual([client.push]);
    expect(sentMessages()[0]).toMatchObject({
      title: "Paiement à confirmer",
      body: "Action requise : confirmez le paiement de votre course du 1 déc.",
      data: { type: "payment_action_required", bookingId: "d1" },
    });
    assertNoPii(sentMessages(), ["client@test.dev", "Client Test"]);
    expect(sentTokens()).not.toContain(other.push);

    expect(await placeDeferredHold("d1", new Date(Date.now() + DAY))).toBe("action_required");
    expect(sendCalls()).toHaveLength(1);
  });

  it("réservation sans compte (invité) : aucune notification", async () => {
    await seedSaved("d2", "guest_xyz");
    stripeMock.setupIntents.retrieve.mockResolvedValue({ id: "seti_saved", status: "requires_payment_method", customer: "cus_1", payment_method: "pm_1" });
    stripeMock.paymentIntents.create.mockResolvedValue({ id: "pi_inu2", status: "requires_payment_method", amount: 7600 });
    expect(await placeDeferredHold("d2")).toBe("action_required");
    expect(sendCalls()).toHaveLength(0);
  });
});

// ================================================================ Expo en panne
describe("Expo en panne, lent ou en erreur : les routes répondent comme avant", () => {
  const modes: ExpoMode[] = ["down", "http500"];

  it.each(modes)("mode %s : accepter, démarrer, terminer", async (mode) => {
    expoMode = mode;
    const driver = await mkDriver("pan-drv");
    const passenger = await mkClient("pan-pax");
    await seedWaiting("b1", { userId: passenger.uid });
    expect(await (await ride("accept", driver.idToken, { bookingId: "b1" })).json()).toEqual({ status: "assigned" });
    expect(await (await ride("start", driver.idToken, { bookingId: "b1" })).json()).toEqual({ status: "in_progress" });
    expect(await (await ride("complete", driver.idToken, { bookingId: "b1" })).json()).toEqual({ status: "completed_by_driver" });
    expect((await booking("b1")).status).toBe("completed_by_driver");
    expect(expoCalls.length).toBeGreaterThan(0); // l'envoi a bien été tenté
  });

  it.each(modes)("mode %s : webhook et finalisation de paiement", async (mode) => {
    expoMode = mode;
    await mkDriver("pan-d2");
    await seedWaiting("b1", { status: "confirmed", paymentStatus: "pending", paymentId: "pi_cap" }, false);
    const event = { id: "evt_1", type: "payment_intent.amount_capturable_updated", data: { object: { id: "pi_cap", amount: 8000, metadata: {} } } };
    stripeMock.webhooks.constructEvent.mockReturnValue(event);
    const res = await webhook(new Request("http://localhost/api/webhooks/stripe", { method: "POST", headers: { "stripe-signature": "t=1,v1=x" }, body: JSON.stringify(event) }));
    expect(res.status).toBe(200);
    expect((await booking("b1")).status).toBe("awaiting_driver");

    const u = await createAuthUser(uniqueEmail("pan-u"));
    stripeMock.paymentIntents.retrieve.mockResolvedValue({
      id: "pi_f", status: "requires_capture", created: piCreatedNow(), amount: VALID_RIDE_TOTAL_CENTS,
      metadata: { userId: u.uid, paymentMode: "card", walletAmountCents: "0", totalAmountCents: String(VALID_RIDE_TOTAL_CENTS), ...rideMeta(validRide()) },
    });
    const fin = await finalizeCard(jsonRequest("/api/finalize-card-booking", { token: u.idToken, body: { paymentIntentId: "pi_f", bookingData: validRide() } }));
    expect(fin.status).toBe(200);
    expect((await fin.json()).bookingId).toBe("card_pi_f");
  });

  it("mode lent (> 3 s) : l'appel est abandonné après 3 s et la route répond normalement", async () => {
    expoMode = "slow";
    const driver = await mkDriver("slow-drv");
    const passenger = await mkClient("slow-pax");
    await seedWaiting("b1", { userId: passenger.uid });
    const t0 = Date.now();
    const res = await ride("accept", driver.idToken, { bookingId: "b1" });
    const elapsed = Date.now() - t0;
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "assigned" });
    expect(elapsed).toBeGreaterThanOrEqual(2900);
    expect(elapsed).toBeLessThan(6000);
  });

  it("sendPush ne lève jamais : panne d'Expo -> résumé en échec", async () => {
    expoMode = "down";
    const d = await mkDriver("sp");
    const summary = await sendPush([d.uid], "chauffeur", { title: "t", body: "b", data: { type: "ride_available", bookingId: "x" } });
    expect(summary).toMatchObject({ attempted: 1, accepted: 0, failed: true });
    expect(await exists(`pushTokens/${tokenHash(d.push)}`)).toBe(true); // un échec réseau ne retire pas le jeton
  });
});

// ================================================================ jeton, lots, configuration
describe("envoi : lots, jeton d'accès, jetons désinscrits", () => {
  it("lots de 100 appareils", async () => {
    const d = await mkDriver("lots");
    const batch = db().batch();
    for (let i = 0; i < 229; i += 1) {
      const token = newPushToken();
      batch.set(db().doc(`pushDevices/${d.uid}/devices/${tokenHash(token)}`), { token, platform: "ios", app: "chauffeur", createdAt: Timestamp.now(), lastSeenAt: Timestamp.now() });
    }
    await batch.commit();
    await seedWaiting("b1");
    await notifyRidesAvailable("b1");
    expect(sendCalls().map((c) => c.body.length).sort((a, b) => a - b)).toEqual([30, 100, 100]);
  });

  it("DeviceNotRegistered : le jeton est supprimé, les autres restent", async () => {
    expoMode = "notRegistered";
    const d1 = await mkDriver("nr1");
    const d2 = await mkDriver("nr2");
    unregisteredTokens.add(d1.push);
    await seedWaiting("b1");
    await notifyRidesAvailable("b1");
    expect(await exists(`pushDevices/${d1.uid}/devices/${tokenHash(d1.push)}`)).toBe(false);
    expect(await exists(`pushTokens/${tokenHash(d1.push)}`)).toBe(false);
    expect(await exists(`pushDevices/${d2.uid}/devices/${tokenHash(d2.push)}`)).toBe(true);
  });

  it("production sans EXPO_ACCESS_TOKEN : log d'erreur, aucun envoi, la route répond normalement", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const driver = await mkDriver("prod-drv");
    const passenger = await mkClient("prod-pax");
    await seedWaiting("b1", { userId: passenger.uid });
    expect((await ride("accept", driver.idToken, { bookingId: "b1" })).status).toBe(200);
    expect(expoCalls).toHaveLength(0);
    expect(err.mock.calls.some((c) => String(c[0]).includes("EXPO_ACCESS_TOKEN"))).toBe(true);
    err.mockRestore();
  });

  it("jeton d'accès Expo : en-tête Authorization Bearer quand il est configuré", async () => {
    vi.stubEnv("EXPO_ACCESS_TOKEN", "expo-secret-test");
    const d = await mkDriver("auth");
    await seedWaiting("b1");
    await notifyRidesAvailable("b1");
    expect(sendCalls()[0].headers.authorization).toBe("Bearer expo-secret-test");
    expect(sendCalls()[0].url).toBe("https://exp.host/--/api/v2/push/send");
    expect(d.push).toBeTruthy();
  });
});

// ================================================================ tâche quotidienne
describe("/api/cron/push-receipts", () => {
  const call = (secret?: string) =>
    cronPushReceipts(new Request("http://localhost/api/cron/push-receipts", { headers: secret ? { authorization: `Bearer ${secret}` } : {} }));

  it("refuse tout appel sans le secret, avec un mauvais secret, ou si CRON_SECRET n'est pas configuré", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("mauvais")).status).toBe(401);
    delete process.env.CRON_SECRET;
    expect((await call("undefined")).status).toBe(401);
    expect((await call("")).status).toBe(401);
  });

  it("la tâche existante reste protégée de la même façon", async () => {
    expect((await cronDeferredHolds(new Request("http://localhost/api/cron/deferred-holds"))).status).toBe(401);
  });

  it("accusés différés : un jeton DeviceNotRegistered est supprimé, l'accusé traité est effacé", async () => {
    const d1 = await mkDriver("rc1");
    const d2 = await mkDriver("rc2");
    await seedWaiting("b1");
    await notifyRidesAvailable("b1");
    expect(await count("pushReceipts")).toBe(2);
    const receipts = await db().collection("pushReceipts").get();
    const bad = receipts.docs.find((r) => r.data().tokenHash === tokenHash(d1.push))!;
    const good = receipts.docs.find((r) => r.data().tokenHash === tokenHash(d2.push))!;
    receiptsAnswer = {
      [bad.id]: { status: "error", details: { error: "DeviceNotRegistered" } },
      [good.id]: { status: "ok" },
    };
    // Les accusés ne sont relevés qu'après 15 minutes.
    expect(await processPushReceipts()).toEqual({ checked: 0, removedTokens: 0 });
    const later = new Date(Date.now() + 60 * 60 * 1000);
    expect(await processPushReceipts(later)).toEqual({ checked: 2, removedTokens: 1 });
    expect(await exists(`pushTokens/${tokenHash(d1.push)}`)).toBe(false);
    expect(await exists(`pushDevices/${d1.uid}/devices/${tokenHash(d1.push)}`)).toBe(false);
    expect(await exists(`pushTokens/${tokenHash(d2.push)}`)).toBe(true);
    expect(await count("pushReceipts")).toBe(0);
  });

  it("purge les clés anti-doublon de plus de 30 jours, garde les récentes", async () => {
    await db().collection("pushEvents").doc("ride_available:vieux:1").set({ createdAt: Timestamp.fromMillis(Date.now() - 31 * DAY) });
    await db().collection("pushEvents").doc("ride_available:recent:1").set({ createdAt: Timestamp.fromMillis(Date.now() - 29 * DAY) });
    const res = await call(CRON_SECRET);
    expect(res.status).toBe(200);
    expect((await res.json()).purgedEvents).toBe(1);
    expect(await exists("pushEvents/ride_available:vieux:1")).toBe(false);
    expect(await exists("pushEvents/ride_available:recent:1")).toBe(true);
  });
});

// ================================================================ suppression de compte
describe("suppression de compte : appareils de notification effacés", () => {
  it("plus de pushDevices/{uid} ni d'entrée pushTokens vers ce compte ; les autres comptes restent", async () => {
    const me = await mkClient("del");
    const second = await addDevice(me, "chauffeur");
    const other = await mkClient("del-other");
    // Index orphelin (appareil déjà retiré) pointant encore vers ce compte.
    await db().doc("pushTokens/orphelin").set({ uid: me.uid, updatedAt: Timestamp.now() });
    expect(await count(`pushDevices/${me.uid}/devices`)).toBe(2);

    await deleteAccount(me.uid, { uid: me.uid, role: "self" });

    expect(await count(`pushDevices/${me.uid}/devices`)).toBe(0);
    expect(await exists(`pushDevices/${me.uid}`)).toBe(false);
    expect(await exists(`pushTokens/${tokenHash(me.push)}`)).toBe(false);
    expect(await exists(`pushTokens/${tokenHash(second)}`)).toBe(false);
    expect((await db().collection("pushTokens").where("uid", "==", me.uid).get()).size).toBe(0);
    expect(await exists(`pushDevices/${other.uid}/devices/${tokenHash(other.push)}`)).toBe(true);
    expect(await exists(`pushTokens/${tokenHash(other.push)}`)).toBe(true);
  });
});

// ================================================================ passe de corrections (relectures sécurité / QA)
describe("délai de 3 s et lecture des appareils", () => {
  it("une lecture Firestore lente (3,3 s) n'annule pas l'envoi : le délai ne court que pour Expo", async () => {
    const d = await mkDriver("lent");
    const original = Query.prototype.get;
    const spy = vi.spyOn(Query.prototype, "get").mockImplementation(async function (this: Query, ...args: []) {
      await new Promise((r) => setTimeout(r, 3300));
      return original.apply(this, args);
    });
    try {
      const summary = await sendPush([d.uid], "chauffeur", { title: "t", body: "b", data: { type: "ride_available", bookingId: "x" } });
      expect(summary).toMatchObject({ attempted: 1, accepted: 1, failed: false });
      expect(sentTokens()).toEqual([d.push]);
    } finally {
      spy.mockRestore();
    }
  });

  it("les appareils de plusieurs destinataires sont lus en parallèle", async () => {
    const drivers = [await mkDriver("par1"), await mkDriver("par2"), await mkDriver("par3")];
    const original = Query.prototype.get;
    const spy = vi.spyOn(Query.prototype, "get").mockImplementation(async function (this: Query, ...args: []) {
      await new Promise((r) => setTimeout(r, 800));
      return original.apply(this, args);
    });
    try {
      const t0 = Date.now();
      const summary = await sendPush(drivers.map((x) => x.uid), "chauffeur", { title: "t", body: "b", data: { type: "ride_available", bookingId: "x" } });
      expect(summary.accepted).toBe(3);
      expect(Date.now() - t0).toBeLessThan(1800);
    } finally {
      spy.mockRestore();
    }
  });
});

describe("envoi échoué en entier : la clé anti-doublon est libérée", () => {
  it("« nouvelle course » : Expo en panne -> aucune clé conservée ; un rejeu renvoie, puis plus rien", async () => {
    const d = await mkDriver("rel");
    await seedWaiting("b1");
    expoMode = "down";
    await notifyRidesAvailable("b1");
    expect(await count("pushEvents")).toBe(0);
    expoMode = "ok";
    expoCalls = [];
    await notifyRidesAvailable("b1");
    expect(sentTokens()).toEqual([d.push]);
    expect(await count("pushEvents")).toBe(1);
    await notifyRidesAvailable("b1");
    expect(sendCalls()).toHaveLength(1);
  });

  it("événement client : erreur 500 d'Expo -> clé libérée ; jeton désinscrit seul -> clé conservée", async () => {
    const driver = await mkDriver("rel-drv");
    const pax = await mkClient("rel-pax");
    await seedWaiting("b1", { userId: pax.uid });
    expoMode = "http500";
    await ride("accept", driver.idToken, { bookingId: "b1" });
    expect(await count("pushEvents")).toBe(0);
    expoMode = "notRegistered";
    unregisteredTokens.add(pax.push);
    await ride("start", driver.idToken, { bookingId: "b1" });
    expect(await count("pushEvents")).toBe(1);
  });
});

describe("suppression de compte : appareil enregistré pendant la suppression", () => {
  it("un register qui arrive en cours d'effacement ne laisse aucun pushDevices orphelin", async () => {
    const me = await mkClient("race");
    await db().collection("stripeCustomers").doc(me.uid).set({ customerId: "cus_race" });
    const late = newPushToken();
    let refusal: unknown = null;
    stripeMock.customers.del.mockImplementation(async () => {
      // Depuis la dernière passe, l'enregistrement est refusé pendant la suppression (409).
      await registerDevice(me.uid, { token: late, platform: "ios", app: "client" }).catch((e) => (refusal = e));
      return { deleted: true };
    });
    await deleteAccount(me.uid, { uid: me.uid, role: "self" });
    expect(refusal).toMatchObject({ status: 409, code: "ACCOUNT_DELETING" });
    expect(stripeMock.customers.del).toHaveBeenCalled();
    expect(await count(`pushDevices/${me.uid}/devices`)).toBe(0);
    expect(await exists(`pushTokens/${tokenHash(late)}`)).toBe(false);
    expect((await db().collection("pushTokens").where("uid", "==", me.uid).get()).size).toBe(0);
  });
});

describe("paiement à confirmer : dédoublonnage persistant", () => {
  async function seedSaved(id: string, uid: string, over: Record<string, unknown> = {}) {
    await db().collection("bookings").doc(id).set({
      userId: uid, email: "client@test.dev", name: "Client Test", depart: PII.depart, arrivee: PII.arrivee, prix: 76,
      reservationId: "CMD-TEST", reservationDate: Timestamp.fromDate(new Date(Date.now() + 10 * DAY)), setupIntentId: "seti_saved",
      paymentMethod: "card", paymentStatus: "card_saved", deferredHold: true, holdScheduledFor: Timestamp.fromMillis(Date.now() - 1000),
      holdAttempts: 0, status: "awaiting_driver", serverFinalized: true, ...over,
    });
  }
  const refuse = () => {
    stripeMock.setupIntents.retrieve.mockResolvedValue({ id: "seti_saved", status: "requires_payment_method", customer: "cus_1", payment_method: "pm_1" });
    stripeMock.paymentIntents.create.mockResolvedValue({ id: "pi_inu", status: "requires_payment_method", amount: 7600 });
    stripeMock.paymentIntents.retrieve.mockResolvedValue({ id: "pi_inu", status: "requires_payment_method", amount: 7600 });
  };

  it("holdActionPushSentAt posé après l'envoi, bail levé", async () => {
    const client = await mkClient("hp1");
    await seedSaved("d1", client.uid);
    refuse();
    await placeDeferredHold("d1");
    const b = await booking("d1");
    expect(b.holdActionPushSentAt).toBeTruthy();
    expect(b.holdActionPushClaimUntil).toBeNull();
    expect(sendCalls()).toHaveLength(1);
  });

  it("rattrapage : Expo en panne au premier passage -> renvoyé à la relance suivante, puis une seule fois", async () => {
    const client = await mkClient("hp2");
    await seedSaved("d1", client.uid);
    refuse();
    expoMode = "down";
    await placeDeferredHold("d1");
    let b = await booking("d1");
    expect(b.holdActionPushSentAt).toBeUndefined();
    expect(b.holdActionPushClaimUntil).toBeNull();
    expoMode = "ok";
    expoCalls = [];
    await placeDeferredHold("d1", new Date(Date.now() + DAY));
    expect(sentTokens()).toEqual([client.push]);
    b = await booking("d1");
    expect(b.holdActionPushSentAt).toBeTruthy();
    await placeDeferredHold("d1", new Date(Date.now() + 2 * DAY));
    expect(sendCalls()).toHaveLength(1);
  });

  it("rattrapage : déjà « action_required » sans trace d'envoi (processus arrêté avant) -> envoyé à la relance", async () => {
    const client = await mkClient("hp3");
    await seedSaved("d1", client.uid, { paymentStatus: "action_required", paymentId: "pi_inu", holdNextRetryAt: Timestamp.fromMillis(Date.now() - 1000) });
    refuse();
    await placeDeferredHold("d1");
    expect(sentTokens()).toEqual([client.push]);
  });

  it("bail en cours (appel simultané) : aucun envoi ; déjà envoyé : aucun envoi", async () => {
    const client = await mkClient("hp4");
    await seedSaved("d1", client.uid, { holdActionPushClaimUntil: Timestamp.fromMillis(Date.now() + 5 * 60 * 1000) });
    await seedSaved("d2", client.uid, { holdActionPushSentAt: Timestamp.now() });
    refuse();
    await placeDeferredHold("d1");
    await placeDeferredHold("d2");
    expect(sendCalls()).toHaveLength(0);
  });
});

describe("jeton qui change de compte : journal d'audit", () => {
  it("auditLogs : ancien et nouveau propriétaire, empreinte seulement ; rien pour une première inscription ou le même compte", async () => {
    const a = await createAuthUser(uniqueEmail("au-a"));
    const b = await createAuthUser(uniqueEmail("au-b"));
    const token = newPushToken();
    const body = { token, platform: "ios", app: "client" };
    const logs = async () => (await db().collection("auditLogs").where("action", "==", "push.token_reassigned").get()).docs.map((d) => d.data());
    await reg(a.idToken, body);
    await reg(a.idToken, body);
    expect(await logs()).toHaveLength(0);
    await reg(b.idToken, body);
    const entries = await logs();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ previousOwner: a.uid, newOwner: b.uid, actorUid: b.uid, tokenHash: tokenHash(token) });
    expect(JSON.stringify(entries[0])).not.toContain(token);
    await reg(b.idToken, body);
    expect(await logs()).toHaveLength(1);
  });
});

describe("suppression de compte : journal d'audit des jetons réattribués", () => {
  it("previousOwner, newOwner et actorUid sont pseudonymisés avec le même pseudonyme", async () => {
    const a = await mkClient("ap-a", false);
    const b = await mkClient("ap-b", false);
    const token = newPushToken();
    const body = { token, platform: "ios", app: "client" };
    await reg(a.idToken, body);
    await reg(b.idToken, body); // a -> b
    await reg(a.idToken, body); // b -> a
    const logs = async () => (await db().collection("auditLogs").where("action", "==", "push.token_reassigned").get()).docs.map((d) => d.data());
    expect(await logs()).toHaveLength(2);

    await deleteAccount(a.uid, { uid: a.uid, role: "self" });

    const entries = await logs();
    const anon = (await db().collection("auditLogs").where("action", "==", "account.delete").get()).docs[0].data().subject as string;
    expect(anon).toMatch(/^supprime_[0-9a-f]{24}$/);
    const aToB = entries.find((e) => e.newOwner === b.uid)!;
    const bToA = entries.find((e) => e.previousOwner === b.uid)!;
    expect(aToB).toMatchObject({ previousOwner: anon, newOwner: b.uid, actorUid: b.uid });
    expect(bToA).toMatchObject({ previousOwner: b.uid, newOwner: anon, actorUid: anon });
    expect(JSON.stringify(entries)).not.toContain(a.uid);
  });
});

describe("dernière passe : clés, bail, suppression en cours", () => {
  it("réponse 200 d'Expo illisible : la clé est conservée, un rejeu n'envoie rien de plus", async () => {
    await mkDriver("bj");
    await seedWaiting("b1");
    expoMode = "badjson";
    await notifyRidesAvailable("b1");
    expect(sendCalls()).toHaveLength(1);
    expect(await count("pushEvents")).toBe(1);
    expoMode = "ok";
    await notifyRidesAvailable("b1");
    expect(sendCalls()).toHaveLength(1);
  });

  it("libération avec Expo en panne : la clé « nouvelle course » est conservée, le chauffeur qui a libéré n'est jamais notifié par un rattrapage", async () => {
    const d1 = await mkDriver("lib1");
    await mkDriver("lib2");
    await seedWaiting("b1");
    await ride("accept", d1.idToken, { bookingId: "b1" });
    await new Promise((r) => setTimeout(r, 5));
    expoMode = "down";
    expect((await ride("release", d1.idToken, { bookingId: "b1", reason: "Imprévu" })).status).toBe(200);
    const keys = async () => (await db().collection("pushEvents").get()).docs.map((d) => d.id).filter((k) => k.startsWith("ride_available:"));
    expect(await keys()).toHaveLength(1);
    expoMode = "ok";
    expoCalls = [];
    await notifyRidesAvailable("b1"); // rattrapage sans exclusion
    expect(sendCalls()).toHaveLength(0);
  });

  it("bail du paiement à confirmer calculé sur l'horloge réelle, pas sur le paramètre now", async () => {
    const client = await mkClient("lease");
    await db().collection("bookings").doc("d1").set({
      userId: client.uid, email: "c@test.dev", name: "C", depart: PII.depart, arrivee: PII.arrivee, prix: 76, reservationId: "CMD-L",
      reservationDate: Timestamp.fromDate(new Date(Date.now() + 10 * DAY)), setupIntentId: "seti_saved", paymentMethod: "card",
      paymentStatus: "card_saved", deferredHold: true, holdAttempts: 0, status: "awaiting_driver", serverFinalized: true,
    });
    stripeMock.setupIntents.retrieve.mockResolvedValue({ id: "seti_saved", status: "requires_payment_method", customer: "cus_1", payment_method: "pm_1" });
    stripeMock.paymentIntents.create.mockResolvedValue({ id: "pi_inu", status: "requires_payment_method", amount: 7600 });
    let claim = 0;
    onSend = async () => {
      claim = (await booking("d1")).holdActionPushClaimUntil?.toMillis() ?? 0;
    };
    await placeDeferredHold("d1", new Date(Date.now() - 3 * DAY));
    expect(claim).toBeGreaterThan(Date.now() + 9 * 60 * 1000);
    expect(claim).toBeLessThan(Date.now() + 11 * 60 * 1000);
  });

  it("enregistrement refusé (409) pendant une suppression de compte ; accepté si la suppression a échoué ou n'existe pas", async () => {
    const u = await createAuthUser(uniqueEmail("deleting"));
    const body = { token: newPushToken(), platform: "ios", app: "client" };
    await db().collection("users").doc(u.uid).set({ deletionPseudonym: "supprime_abc" });
    const res = await reg(u.idToken, body);
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("ACCOUNT_DELETING");
    expect(await count("pushTokens")).toBe(0);
    expect(await count(`pushDevices/${u.uid}/devices`)).toBe(0);
    await db().collection("users").doc(u.uid).set({ deletionPseudonym: "supprime_abc", deletionFailedAt: Timestamp.now() });
    expect((await reg(u.idToken, body)).status).toBe(200);
    const other = await createAuthUser(uniqueEmail("normal"));
    expect((await reg(other.idToken, { ...body, token: newPushToken() })).status).toBe(200);
  });
});
