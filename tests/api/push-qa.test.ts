// Lot 2.3 — compléments QA (notifications push) : chemin entreprise, rejeux croisés
// (finalisation + webhook, libération + webhook), concurrence, tâches cron (secret,
// production sans EXPO_ACCESS_TOKEN, non-régression de deferred-holds), jetons réattribués,
// comptes supprimés. Expo simulé ; aucun appel réel.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Timestamp } from "firebase-admin/firestore";

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
import { POST as debitForBooking } from "@/app/api/wallet/debit-for-booking/route";
import { POST as finalizeHybrid } from "@/app/api/wallet/finalize-hybrid-booking/route";
import { POST as webhook } from "@/app/api/webhooks/stripe/route";
import { GET as cronPushReceipts } from "@/app/api/cron/push-receipts/route";
import { GET as cronDeferredHolds } from "@/app/api/cron/deferred-holds/route";
import { getAdminFirestore } from "@/lib/firebase/admin-server";
import { deleteAccount } from "@/lib/account/deleteAccount";
import { refreshRidePool } from "@/lib/rides/pool";
import { notifyRidesAvailable } from "@/lib/push/events";
import { sendPush } from "@/lib/push/send";
import { tokenHash } from "@/lib/push/tokens";
import {
  createAuthUser,
  jsonRequest,
  piCreatedNow,
  resetEmulators,
  rideMeta,
  seedUserDoc,
  validRide,
  VALID_RIDE_TOTAL_CENTS,
  type TestUser,
} from "./helpers";

const db = () => getAdminFirestore();
const DAY = 24 * 60 * 60 * 1000;
const CRON_SECRET = "cron-secret-de-test";

let n = 0;
const uniqueEmail = (p: string) => `${p}-qa${++n}@test.dev`;
let tokSeq = 0;
const newPushToken = () => `ExponentPushToken[qa${String(++tokSeq).padStart(6, "0")}abcdef]`;

// ---------------------------------------------------------------- Expo simulé
type ExpoMode = "ok" | "http500";
let expoMode: ExpoMode = "ok";
let expoCalls: Array<{ url: string; headers: Record<string, string>; body: any }> = [];
const realFetch = globalThis.fetch;
let ticketSeq = 0;

function installExpo() {
  vi.stubGlobal("fetch", async (input: any, init?: any) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url.startsWith("https://exp.host/")) return realFetch(input, init);
    expoCalls.push({ url, headers: init?.headers ?? {}, body: JSON.parse(init.body) });
    if (expoMode === "http500") return new Response("boom", { status: 500 });
    if (url.endsWith("/getReceipts")) return Response.json({ data: {} });
    const tickets = (JSON.parse(init.body) as unknown[]).map(() => ({ status: "ok", id: `qa-ticket-${++ticketSeq}` }));
    return Response.json({ data: tickets });
  });
}
const sendCalls = () => expoCalls.filter((c) => c.url.endsWith("/send"));
const sentMessages = () => sendCalls().flatMap((c) => c.body as Array<Record<string, any>>);
const sentTokens = () => sentMessages().map((m) => m.to as string).sort();

// ---------------------------------------------------------------- acteurs
const reg = (token: string | undefined, body: unknown) => registerRoute(jsonRequest("/api/push/register", { token, body }));
const unreg = (token: string | undefined, body: unknown) => unregisterRoute(jsonRequest("/api/push/unregister", { token, body }));

async function addDevice(u: TestUser, app: "chauffeur" | "client", pushToken = newPushToken()): Promise<string> {
  expect((await reg(u.idToken, { token: pushToken, platform: "android", app })).status).toBe(200);
  return pushToken;
}
async function mkDriver(label: string, over: { availability?: string } = {}) {
  const u = await createAuthUser(uniqueEmail(label));
  await seedUserDoc(u.uid, { email: u.email, isAdmin: false, role: "driver" });
  await db().collection("drivers").doc(u.uid).set({ uid: u.uid, status: "active", availability: over.availability ?? "online" });
  return { ...u, push: await addDevice(u, "chauffeur") };
}
async function mkClient(label: string) {
  const u = await createAuthUser(uniqueEmail(label));
  await seedUserDoc(u.uid, { email: u.email, isAdmin: false, role: "client" });
  return { ...u, push: await addDevice(u, "client") };
}

const PII_FRAGMENTS = ["Jean", "Dupont", "612345678", "jean.dupont", "4567", "Rivoli", "sonner", "10 Rue", "Société", "coA"];
function assertNoPii(extra: string[] = []) {
  for (const m of sentMessages()) {
    const text = JSON.stringify({ title: m.title, body: m.body, data: m.data });
    for (const frag of [...PII_FRAGMENTS, ...extra]) expect(text, frag).not.toContain(frag);
    expect(Object.keys(m.data).sort()).toEqual(["bookingId", "type"]);
  }
}

async function seedWaiting(id: string, over: Record<string, unknown> = {}, sync = true) {
  await db().collection("bookings").doc(id).set({
    userId: "passager-1",
    status: "awaiting_driver",
    paymentStatus: "authorized",
    paymentId: `pi_${id}`,
    prix: 80,
    distance: 20,
    duree: 35,
    reservationId: `CMD-${id}`,
    prioriteReservation: false,
    reservationDate: Timestamp.fromDate(new Date("2026-12-01T13:30:00Z")),
    createdAt: Timestamp.now(),
    name: "Jean Dupont",
    phone: "+33612345678",
    email: "jean.dupont@test.dev",
    notes: "Code porte 4567, sonner chez Dupont",
    depart: "10 Rue de Rivoli, 75001 Paris",
    arrivee: "Aéroport d'Orly, 94390 Orly",
    ...over,
  });
  if (sync) await refreshRidePool(id);
}

const ride = (action: string, token: string | undefined, body: Record<string, unknown>) =>
  ridesRoute(jsonRequest(`/api/rides/${action}`, { token, body }), { params: { action } });
const exists = async (path: string) => (await db().doc(path).get()).exists;
const count = async (col: string) => (await db().collection(col).get()).size;
const wait = (ms = 5) => new Promise((r) => setTimeout(r, ms));

const webhookCall = (id: string, type = "payment_intent.amount_capturable_updated", obj: Record<string, unknown> = {}) => {
  const event = { id, type, data: { object: { amount: 7600, metadata: {}, ...obj } } };
  stripeMock.webhooks.constructEvent.mockReturnValue(event);
  return webhook(new Request("http://localhost/api/webhooks/stripe", { method: "POST", headers: { "stripe-signature": "t=1,v1=x" }, body: JSON.stringify(event) }));
};

async function seedCompany(companyId: string, balanceCents: number, members: Array<{ user: TestUser; role: "owner" | "member" }>) {
  await db().collection("companies").doc(companyId).set({
    name: `Société ${companyId}`,
    ownerUid: members.find((m) => m.role === "owner")?.user.uid,
    walletBalanceCents: balanceCents,
    cumulativeRechargedCents: balanceCents,
    currency: "EUR",
    memberCount: members.length,
  });
  for (const m of members) {
    await db().collection("companies").doc(companyId).collection("members").doc(m.user.uid).set({
      uid: m.user.uid, email: m.user.email, displayName: null, role: m.role, status: "active",
      monthlyBudgetCents: 0, spentThisPeriodCents: 0, budgetPeriodKey: "1970-01",
    });
    await seedUserDoc(m.user.uid, { email: m.user.email, companyId, companyRole: m.role });
  }
}

beforeEach(async () => {
  await resetEmulators();
  expoMode = "ok";
  expoCalls = [];
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

// ================================================================ chemin entreprise
describe("QA : chemin entreprise (debitCompanyWalletForBooking)", () => {
  it("un membre réserve avec le solde société : les chauffeurs en service sont notifiés, pas le membre, rien de personnel", async () => {
    const owner = await createAuthUser(uniqueEmail("owner"));
    const member = await createAuthUser(uniqueEmail("member"));
    await seedCompany("coA", 20000, [{ user: owner, role: "owner" }, { user: member, role: "member" }]);
    // Le membre est aussi chauffeur en service avec un appareil chauffeur : il est le passager, donc exclu.
    await db().collection("drivers").doc(member.uid).set({ uid: member.uid, status: "active", availability: "online" });
    await addDevice(member, "chauffeur");
    const d = await mkDriver("co-drv");
    const offline = await mkDriver("co-off", { availability: "offline" });

    const res = await debitForBooking(
      jsonRequest("/api/wallet/debit-for-booking", { token: member.idToken, body: { clientToken: "tok-co-push", bookingData: validRide() } })
    );
    expect(res.status).toBe(200);
    const { bookingId } = await res.json();
    expect((await db().collection("bookings").doc(bookingId).get()).data()?.companyId).toBe("coA"); // bien le chemin société
    expect(sentTokens()).toEqual([d.push]);
    expect(sentTokens()).not.toContain(offline.push);
    expect(sentMessages()[0].data).toEqual({ type: "ride_available", bookingId });
    assertNoPii([member.email, owner.email]);

    // Rejeu (même clientToken) : réponse identique, aucune notification de plus.
    const again = await debitForBooking(
      jsonRequest("/api/wallet/debit-for-booking", { token: member.idToken, body: { clientToken: "tok-co-push", bookingData: validRide() } })
    );
    expect(again.status).toBe(200);
    expect(sendCalls()).toHaveLength(1);
  });

  it("solde société insuffisant : refus, aucune notification", async () => {
    const owner = await createAuthUser(uniqueEmail("owner2"));
    await seedCompany("coA", 100, [{ user: owner, role: "owner" }]);
    await mkDriver("co-drv2");
    const res = await debitForBooking(
      jsonRequest("/api/wallet/debit-for-booking", { token: owner.idToken, body: { clientToken: "tok-co-poor", bookingData: validRide() } })
    );
    expect(res.status).toBe(402);
    expect(expoCalls).toHaveLength(0);
  });
});

// ================================================================ rejeux croisés
describe("QA : rejeux croisés, un seul envoi", () => {
  it("finalize-card-booking puis webhook amount_capturable_updated du même paiement : une seule notification", async () => {
    const d = await mkDriver("x-d");
    const u = await createAuthUser(uniqueEmail("x-u"));
    stripeMock.paymentIntents.retrieve.mockResolvedValue({
      id: "pi_x1", status: "requires_capture", created: piCreatedNow(), amount: VALID_RIDE_TOTAL_CENTS,
      metadata: { userId: u.uid, paymentMode: "card", walletAmountCents: "0", totalAmountCents: String(VALID_RIDE_TOTAL_CENTS), ...rideMeta(validRide()) },
    });
    const fin = await finalizeCard(jsonRequest("/api/finalize-card-booking", { token: u.idToken, body: { paymentIntentId: "pi_x1", bookingData: validRide() } }));
    expect(fin.status).toBe(200);
    expect(sentTokens()).toEqual([d.push]);
    expect((await webhookCall("evt_x1", "payment_intent.amount_capturable_updated", { id: "pi_x1" })).status).toBe(200);
    expect((await webhookCall("evt_x1", "payment_intent.amount_capturable_updated", { id: "pi_x1" })).status).toBe(200); // même identifiant d'événement
    expect(sendCalls()).toHaveLength(1);
  });

  it("libération puis rejeu du webhook : pas de seconde notification « nouvelle course »", async () => {
    const d1 = await mkDriver("rel-1");
    const d2 = await mkDriver("rel-2");
    await seedWaiting("b1");
    expect((await ride("accept", d1.idToken, { bookingId: "b1" })).status).toBe(200);
    await wait();
    expect((await ride("release", d1.idToken, { bookingId: "b1", reason: "Imprévu" })).status).toBe(200);
    expect(sentTokens()).toEqual([d2.push]);
    expect((await webhookCall("evt_rel", "payment_intent.amount_capturable_updated", { id: "pi_b1" })).status).toBe(200);
    expect(sendCalls()).toHaveLength(1);
  });

  it("hybride : rejeu de la finalisation (même PaymentIntent) : une seule notification", async () => {
    const d = await mkDriver("hy2-d");
    const u = await createAuthUser(uniqueEmail("hy2-u"));
    await db().collection("wallets").doc(u.uid).set({ userId: u.uid, balanceCents: 10000, cumulativeRechargedCents: 10000, currency: "EUR" });
    stripeMock.paymentIntents.retrieve.mockResolvedValue({
      id: "pi_hy2", status: "requires_capture", created: piCreatedNow(), amount: 5600,
      metadata: { userId: u.uid, paymentMode: "hybrid", walletAmountCents: "2000", totalAmountCents: String(VALID_RIDE_TOTAL_CENTS), ...rideMeta(validRide()) },
    });
    const call = () =>
      finalizeHybrid(
        jsonRequest("/api/wallet/finalize-hybrid-booking", {
          token: u.idToken,
          body: { paymentIntentId: "pi_hy2", clientToken: "tok-hy2", bookingData: validRide() },
        })
      );
    expect((await call()).status).toBe(200);
    expect(sentTokens()).toEqual([d.push]);
    expect((await call()).status).toBe(200);
    expect(sendCalls()).toHaveLength(1);
  });

  it("deux chauffeurs acceptent en même temps : un seul gagne, le client n'est notifié qu'une fois", async () => {
    const d1 = await mkDriver("race-1");
    const d2 = await mkDriver("race-2");
    const pax = await mkClient("race-pax");
    await seedWaiting("b1", { userId: pax.uid });
    const [r1, r2] = await Promise.all([ride("accept", d1.idToken, { bookingId: "b1" }), ride("accept", d2.idToken, { bookingId: "b1" })]);
    expect([r1.status, r2.status].sort()).toEqual([200, 409]);
    expect(sendCalls()).toHaveLength(1);
    expect(sentTokens()).toEqual([pax.push]);
  });

  it("filet de sécurité (deferred-holds ?mode=pool) : réconcilie le pool mais n'envoie aucune notification (comportement documenté)", async () => {
    await mkDriver("rec-d");
    await seedWaiting("b1", {}, false); // éligible mais absente du pool
    const res = await cronDeferredHolds(new Request("http://localhost/api/cron/deferred-holds?mode=pool", { headers: { authorization: `Bearer ${CRON_SECRET}` } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ mode: "pool", pool: { added: 1, removed: 0 } });
    expect(await exists("ridePool/b1")).toBe(true);
    expect(expoCalls).toHaveLength(0);
  });
});

// ================================================================ jetons
describe("QA : jetons réattribués et appareils", () => {
  const body = () => ({ token: newPushToken(), platform: "ios", app: "client" });

  it("A a perdu le jeton au profit de B : le unregister de A (déconnexion tardive) ne retire pas celui de B", async () => {
    const a = await createAuthUser(uniqueEmail("ra"));
    const b = await createAuthUser(uniqueEmail("rb"));
    const shared = body();
    await reg(a.idToken, shared);
    await reg(b.idToken, shared);
    expect((await unreg(a.idToken, { token: shared.token })).status).toBe(200);
    const hash = tokenHash(shared.token);
    expect(await exists(`pushDevices/${b.uid}/devices/${hash}`)).toBe(true);
    expect((await db().doc(`pushTokens/${hash}`).get()).data()?.uid).toBe(b.uid);
  });

  it("unregister d'un jeton inconnu : 200, rien d'écrit", async () => {
    const a = await createAuthUser(uniqueEmail("unk"));
    expect((await unreg(a.idToken, { token: newPushToken() })).status).toBe(200);
    expect(await count("pushTokens")).toBe(0);
  });

  it("ré-enregistrement du même jeton avec une autre appli : l'envoi suit la nouvelle appli, un seul appareil", async () => {
    const u = await createAuthUser(uniqueEmail("swap"));
    const t = newPushToken();
    await reg(u.idToken, { token: t, platform: "ios", app: "client" });
    await reg(u.idToken, { token: t, platform: "ios", app: "chauffeur" });
    expect(await count(`pushDevices/${u.uid}/devices`)).toBe(1);
    const msg = { title: "t", body: "b", data: { type: "ride_started", bookingId: "x" } };
    await sendPush([u.uid], "client", msg);
    expect(sendCalls()).toHaveLength(0);
    await sendPush([u.uid], "chauffeur", msg);
    expect(sentTokens()).toEqual([t]);
  });

  it("un client qui déclare l'appli « chauffeur » ne reçoit jamais « nouvelle course » (pas de fiche chauffeur validée)", async () => {
    const pretender = await createAuthUser(uniqueEmail("pretend"));
    await seedUserDoc(pretender.uid, { email: pretender.email, role: "client" });
    await addDevice(pretender, "chauffeur");
    const d = await mkDriver("real");
    await seedWaiting("b1");
    await notifyRidesAvailable("b1");
    expect(sentTokens()).toEqual([d.push]);
  });

  it("uid jamais enregistré ou liste vide : aucun appel à Expo", async () => {
    await sendPush([], "client", { title: "t", body: "b", data: { type: "x", bookingId: "x" } });
    await sendPush(["inconnu"], "client", { title: "t", body: "b", data: { type: "x", bookingId: "x" } });
    expect(expoCalls).toHaveLength(0);
  });
});

// ================================================================ comptes supprimés
describe("QA : comptes supprimés", () => {
  it("chauffeur supprimé : plus de « nouvelle course » ; client supprimé : plus de notification", async () => {
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", "demo-izymoto.appspot.com");
    const gone = await mkDriver("gone");
    const stay = await mkDriver("stay");
    const client = await mkClient("gone-client");
    await deleteAccount(gone.uid, { uid: gone.uid, role: "self" });
    await deleteAccount(client.uid, { uid: client.uid, role: "self" });
    await seedWaiting("b1");
    await notifyRidesAvailable("b1");
    expect(sentTokens()).toEqual([stay.push]);
    await sendPush([client.uid], "client", { title: "t", body: "b", data: { type: "ride_started", bookingId: "b1" } });
    expect(sendCalls()).toHaveLength(1);
  });
});

// ================================================================ cron push-receipts
describe("QA : /api/cron/push-receipts", () => {
  const call = (secret?: string) =>
    cronPushReceipts(new Request("http://localhost/api/cron/push-receipts", { headers: secret ? { authorization: `Bearer ${secret}` } : {} }));
  const seedStale = async () => {
    await db().collection("pushEvents").doc("ride_available:vieux:1").set({ createdAt: Timestamp.fromMillis(Date.now() - 31 * DAY) });
    await db().collection("pushReceipts").doc("rc-vieux").set({ tokenHash: "h", createdAt: Timestamp.fromMillis(Date.now() - 3 * DAY) });
  };

  it("mauvais secret / sans secret : 401, aucune purge, aucun appel à Expo", async () => {
    await seedStale();
    expect((await call()).status).toBe(401);
    expect((await call("mauvais")).status).toBe(401);
    expect((await call(CRON_SECRET + "x")).status).toBe(401);
    expect(await exists("pushEvents/ride_available:vieux:1")).toBe(true);
    expect(await exists("pushReceipts/rc-vieux")).toBe(true);
    expect(expoCalls).toHaveLength(0);
  });

  it("CRON_SECRET non configuré : même un en-tête « Bearer undefined » ou vide est refusé, sans effet", async () => {
    await seedStale();
    delete process.env.CRON_SECRET;
    expect((await call("undefined")).status).toBe(401);
    expect((await call("")).status).toBe(401);
    expect(await exists("pushEvents/ride_available:vieux:1")).toBe(true);
  });

  it("bon secret en production SANS EXPO_ACCESS_TOKEN : 200, purge faite, aucun appel Expo, accusés conservés", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await seedStale();
    const res = await call(CRON_SECRET);
    expect(res.status).toBe(200);
    expect((await res.json()).purgedEvents).toBe(1);
    expect(expoCalls).toHaveLength(0);
    expect(await exists("pushReceipts/rc-vieux")).toBe(true);
    err.mockRestore();
  });

  it("Expo répond 500 aux accusés : 200, accusés conservés pour le lendemain", async () => {
    expoMode = "http500";
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await db().collection("pushReceipts").doc("rc-1").set({ tokenHash: "h", createdAt: Timestamp.fromMillis(Date.now() - 3 * 60 * 60 * 1000) });
    const res = await call(CRON_SECRET);
    expect(res.status).toBe(200);
    expect(await exists("pushReceipts/rc-1")).toBe(true);
    err.mockRestore();
  });

  it("accusé jamais publié par Expo et plus vieux que 2 jours : abandonné ; plus récent : conservé", async () => {
    await db().collection("pushReceipts").doc("rc-vieux").set({ tokenHash: "h", createdAt: Timestamp.fromMillis(Date.now() - 3 * DAY) });
    await db().collection("pushReceipts").doc("rc-recent").set({ tokenHash: "h", createdAt: Timestamp.fromMillis(Date.now() - 3 * 60 * 60 * 1000) });
    expect((await call(CRON_SECRET)).status).toBe(200);
    expect(await exists("pushReceipts/rc-vieux")).toBe(false);
    expect(await exists("pushReceipts/rc-recent")).toBe(true);
  });
});

describe("QA : /api/cron/deferred-holds après extraction de cronAuth", () => {
  const call = (secret?: string) =>
    cronDeferredHolds(new Request("http://localhost/api/cron/deferred-holds", { headers: secret ? { authorization: `Bearer ${secret}` } : {} }));

  it("sans secret / mauvais secret : 401 ; bon secret : 200 avec le même format de réponse", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("mauvais")).status).toBe(401);
    delete process.env.CRON_SECRET;
    expect((await call("undefined")).status).toBe(401);
    process.env.CRON_SECRET = CRON_SECRET;
    const res = await call(CRON_SECRET);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ processed: 0, authorized: 0, action_required: 0, retry: 0, skipped: 0, released: 0, holdsCleaned: 0, pool: { added: 0, removed: 0 } });
  });
});
