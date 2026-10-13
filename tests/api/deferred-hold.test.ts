// Lot 1.1 (SENSIBLE) : empreinte différée. Une empreinte carte n'est valable que 7 jours :
// pour une course à 5 jours ou plus, la carte est enregistrée (SetupIntent) et l'empreinte
// est posée par la tâche quotidienne 3 jours avant le départ. Routes couvertes :
// create-payment-intent, finalize-deferred-booking, cron/deferred-holds, deferred-hold,
// webhook (payment_failed / amount_capturable_updated). Stripe et Resend mockés.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Timestamp } from "firebase-admin/firestore";

const stripeMock = vi.hoisted(() => ({
  paymentIntents: { create: vi.fn(), retrieve: vi.fn(), confirm: vi.fn(), cancel: vi.fn() },
  setupIntents: { create: vi.fn(), retrieve: vi.fn() },
  customers: { create: vi.fn() },
  paymentMethods: { detach: vi.fn() },
  webhooks: { constructEvent: vi.fn() },
}));
const emailSend = vi.hoisted(() => vi.fn());

vi.mock("@/lib/stripe-server", () => ({ stripe: stripeMock }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: emailSend };
  },
}));
vi.mock("@/lib/emails/reviewRequestEmail", () => ({ sendReviewRequestEmail: vi.fn() }));

import { POST as createPaymentIntent } from "@/app/api/create-payment-intent/route";
import { POST as finalizeDeferred } from "@/app/api/finalize-deferred-booking/route";
import { GET as cronDeferredHolds } from "@/app/api/cron/deferred-holds/route";
import { POST as deferredHold } from "@/app/api/deferred-hold/route";
import { POST as webhook } from "@/app/api/webhooks/stripe/route";
import { placeDeferredHold, isDeferredHold } from "@/lib/payments/deferredHold";
import { getAdminFirestore } from "@/lib/firebase/admin-server";
import {
  createAuthUser,
  futureParisDate,
  jsonRequest,
  piCreatedNow,
  resetEmulators,
  rideMeta,
  validRide,
  VALID_RIDE_TOTAL_CENTS,
} from "./helpers";

const db = () => getAdminFirestore();
const TOTAL = VALID_RIDE_TOTAL_CENTS; // Paris -> Orly, semaine 14h = 76 €
const DAY = 24 * 60 * 60 * 1000;
const CRON_SECRET = "cron-secret-de-test";

let n = 0;
const uniqueEmail = (p: string) => `${p}-${++n}@test.dev`;

// Course lointaine (J+10 minimum, un jour de semaine à 14 h).
const farRide = (over: Record<string, unknown> = {}) => validRide(over);
// Course proche : demain ou après-demain, en semaine à 14 h (toujours < 5 jours).
const nearRide = () => {
  const d = new Date(Date.now() + DAY);
  while (![1, 2, 3, 4].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1);
  return validRide({ reservationDate: `${d.toISOString().slice(0, 10)}T14:00` });
};

const setiMeta = (uid: string, ride: Record<string, unknown> = farRide(), total = TOTAL) => ({
  userId: uid,
  paymentMode: "card_deferred",
  totalAmountCents: String(total),
  ...rideMeta(ride),
});
const seti = (uid: string, id = "seti_ok", over: Record<string, unknown> = {}, ride = farRide()) => ({
  id,
  status: "succeeded",
  created: piCreatedNow(),
  customer: "cus_test",
  payment_method: "pm_test",
  metadata: setiMeta(uid, ride),
  ...over,
});

const cronRequest = (secret?: string) =>
  new Request("http://localhost/api/cron/deferred-holds", {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  });

// Réservation « card_saved » telle que finalize-deferred-booking l'écrit.
async function seedSavedBooking(id: string, uid: string, over: Record<string, unknown> = {}) {
  const departure = Date.now() + 2 * DAY;
  await db().collection("bookings").doc(id).set({
    userId: uid,
    email: "client@test.dev",
    name: "Client Test",
    depart: "10 Rue de Rivoli, 75001 Paris",
    arrivee: "Aéroport d'Orly, 94390 Orly",
    prix: TOTAL / 100,
    reservationId: "CMD-TEST",
    reservationDate: Timestamp.fromMillis(departure),
    setupIntentId: "seti_saved",
    paymentMethod: "card",
    paymentStatus: "card_saved",
    deferredHold: true,
    holdScheduledFor: Timestamp.fromMillis(departure - 3 * DAY),
    holdAttempts: 0,
    status: "awaiting_driver",
    serverFinalized: true,
    ...over,
  });
}
const bookingOf = async (id: string) => (await db().collection("bookings").doc(id).get()).data()!;

// Erreur Stripe de refus de carte, rattachée au PaymentIntent créé.
const cardError = (piId: string, code = "authentication_required") =>
  Object.assign(new Error("Votre banque demande une authentification."), {
    type: "StripeCardError",
    code,
    raw: { payment_intent: { id: piId, status: "requires_payment_method" } },
  });

beforeEach(async () => {
  await resetEmulators();
  process.env.CRON_SECRET = CRON_SECRET;
  process.env.RESEND_API_KEY = "re_test_dummy";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_dummy";
  emailSend.mockReset().mockResolvedValue({ data: { id: "email_test" }, error: null });
  for (const group of Object.values(stripeMock)) for (const fn of Object.values(group)) fn.mockReset();
  stripeMock.customers.create.mockResolvedValue({ id: "cus_test" });
  stripeMock.setupIntents.create.mockResolvedValue({ id: "seti_new", client_secret: "seti_secret" });
  stripeMock.paymentIntents.create.mockResolvedValue({ id: "pi_new", client_secret: "pi_secret", amount: TOTAL });
  stripeMock.paymentMethods.detach.mockResolvedValue({ id: "pm_test" });
  stripeMock.paymentIntents.cancel.mockResolvedValue({ id: "pi_x", status: "canceled" });
});

// ================================================================ create-payment-intent
describe("create-payment-intent : choix empreinte immédiate / différée", () => {
  const call = (token: string, ride: Record<string, unknown>) =>
    createPaymentIntent(jsonRequest("/api/create-payment-intent", { token, body: { metadata: ride } }));

  it("course à J+10 : carte enregistrée (SetupIntent off_session), aucune empreinte", async () => {
    const u = await createAuthUser(uniqueEmail("cpi-far"));
    const res = await call(u.idToken, farRide());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.intentType).toBe("setup");
    expect(body.totalAmountCents).toBe(TOTAL);
    expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
    const arg = stripeMock.setupIntents.create.mock.calls[0][0];
    expect(arg.usage).toBe("off_session");
    expect(arg.customer).toBe("cus_test");
    expect(arg.metadata).toMatchObject({ userId: u.uid, paymentMode: "card_deferred", totalAmountCents: String(TOTAL) });
    // Empreinte prévue 3 jours avant le départ.
    const expected = new Date(rideMeta(farRide()).reservationDate).getTime() - 3 * DAY;
    expect(new Date(body.holdScheduledFor).getTime()).toBe(expected);
  });

  it("le client Stripe est créé une seule fois par compte et stocké hors de portée du client", async () => {
    const u = await createAuthUser(uniqueEmail("cpi-cus"));
    await call(u.idToken, farRide());
    await call(u.idToken, farRide());
    expect(stripeMock.customers.create).toHaveBeenCalledTimes(1);
    expect((await db().collection("stripeCustomers").doc(u.uid).get()).data()?.customerId).toBe("cus_test");
  });

  it("course dans moins de 5 jours : empreinte immédiate, comportement inchangé", async () => {
    const u = await createAuthUser(uniqueEmail("cpi-near"));
    const res = await call(u.idToken, nearRide());
    expect(res.status).toBe(200);
    expect((await res.json()).intentType).toBe("payment");
    expect(stripeMock.setupIntents.create).not.toHaveBeenCalled();
    const arg = stripeMock.paymentIntents.create.mock.calls[0][0];
    expect(arg.capture_method).toBe("manual");
    expect(arg.amount).toBe(TOTAL);
  });

  it("le montant enregistré est le prix serveur, jamais celui du navigateur", async () => {
    const u = await createAuthUser(uniqueEmail("cpi-amt"));
    const res = await createPaymentIntent(
      jsonRequest("/api/create-payment-intent", {
        token: u.idToken,
        body: { amount: 1, metadata: { ...farRide(), totalAmountCents: "1", prix: 1 } },
      })
    );
    expect(res.status).toBe(200);
    expect(stripeMock.setupIntents.create.mock.calls[0][0].metadata.totalAmountCents).toBe(String(TOTAL));
  });
});

// ================================================================ finalize-deferred-booking
describe("finalize-deferred-booking", () => {
  const call = (token: string, setupIntentId: string, ride: Record<string, unknown> = farRide(), extra = {}) =>
    finalizeDeferred(
      jsonRequest("/api/finalize-deferred-booking", {
        token,
        body: { setupIntentId, bookingData: { ...ride, name: "Client", phone: "+33600000000" }, ...extra },
      })
    );

  it("carte enregistrée : réservation « card_saved », sans empreinte, empreinte prévue à J-3", async () => {
    const u = await createAuthUser(uniqueEmail("fin-ok"));
    stripeMock.setupIntents.retrieve.mockResolvedValue(seti(u.uid));
    const res = await call(u.idToken, "seti_ok");
    expect(res.status).toBe(200);
    const { bookingId } = await res.json();
    expect(bookingId).toBe("deferred_seti_ok");
    const b = await bookingOf(bookingId);
    expect(b).toMatchObject({
      userId: u.uid,
      paymentStatus: "card_saved",
      deferredHold: true,
      prix: TOTAL / 100,
      status: "awaiting_driver",
      setupIntentId: "seti_ok",
    });
    expect(b.paymentId).toBeUndefined();
    expect(b.holdScheduledFor.toMillis()).toBe(b.reservationDate.toMillis() - 3 * DAY);
    expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
  });

  it("rejeu : même réservation, aucune seconde création", async () => {
    const u = await createAuthUser(uniqueEmail("fin-replay"));
    stripeMock.setupIntents.retrieve.mockResolvedValue(seti(u.uid));
    const first = await (await call(u.idToken, "seti_ok")).json();
    const second = await call(u.idToken, "seti_ok");
    expect(second.status).toBe(200);
    expect((await second.json()).reservationId).toBe(first.reservationId);
    expect((await db().collection("bookings").get()).size).toBe(1);
  });

  it("deux finalisations simultanées ne créent qu'une réservation", async () => {
    const u = await createAuthUser(uniqueEmail("fin-race"));
    stripeMock.setupIntents.retrieve.mockResolvedValue(seti(u.uid));
    const [a, b] = await Promise.all([call(u.idToken, "seti_ok"), call(u.idToken, "seti_ok")]);
    expect([a.status, b.status]).toEqual([200, 200]);
    expect((await db().collection("bookings").get()).size).toBe(1);
  });

  it("carte d'un autre compte -> 403, aucune réservation", async () => {
    const u = await createAuthUser(uniqueEmail("fin-owner"));
    stripeMock.setupIntents.retrieve.mockResolvedValue(seti("autre-uid"));
    const res = await call(u.idToken, "seti_ok");
    expect(res.status).toBe(403);
    expect((await db().collection("bookings").get()).size).toBe(0);
  });

  it("carte non enregistrée (3-D Secure non terminé) -> 409", async () => {
    const u = await createAuthUser(uniqueEmail("fin-state"));
    stripeMock.setupIntents.retrieve.mockResolvedValue(seti(u.uid, "seti_ok", { status: "requires_action" }));
    const res = await call(u.idToken, "seti_ok");
    expect(res.status).toBe(409);
    expect((await db().collection("bookings").get()).size).toBe(0);
  });

  it("prix enregistré différent du prix serveur -> 409 PRICE_CHANGED, carte détachée", async () => {
    const u = await createAuthUser(uniqueEmail("fin-price"));
    stripeMock.setupIntents.retrieve.mockResolvedValue(
      seti(u.uid, "seti_ok", { metadata: { ...setiMeta(u.uid), totalAmountCents: "100" } })
    );
    const res = await call(u.idToken, "seti_ok");
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("PRICE_CHANGED");
    expect(stripeMock.paymentMethods.detach).toHaveBeenCalledWith("pm_test");
    expect((await db().collection("bookings").get()).size).toBe(0);
  });

  it("course modifiée par rapport à la carte enregistrée -> 409 RIDE_MISMATCH", async () => {
    const u = await createAuthUser(uniqueEmail("fin-ride"));
    stripeMock.setupIntents.retrieve.mockResolvedValue(seti(u.uid));
    const other = farRide({ reservationDate: futureParisDate([1, 2, 3, 4], "15:00", 20) });
    const res = await call(u.idToken, "seti_ok", other);
    expect(res.status).toBe(409);
    expect((await db().collection("bookings").get()).size).toBe(0);
  });

  it("course trop proche pour une empreinte différée -> 409 DEFERRED_NOT_ALLOWED", async () => {
    const u = await createAuthUser(uniqueEmail("fin-near"));
    const ride = nearRide();
    stripeMock.setupIntents.retrieve.mockResolvedValue(seti(u.uid, "seti_ok", {}, ride));
    const res = await call(u.idToken, "seti_ok", ride);
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("DEFERRED_NOT_ALLOWED");
  });

  it("identifiant invalide -> 400 ; sans jeton -> 401", async () => {
    const u = await createAuthUser(uniqueEmail("fin-bad"));
    expect((await call(u.idToken, "pi_pas_un_seti")).status).toBe(400);
    const noAuth = await finalizeDeferred(
      jsonRequest("/api/finalize-deferred-booking", { body: { setupIntentId: "seti_ok", bookingData: farRide() } })
    );
    expect(noAuth.status).toBe(401);
  });
});

// ================================================================ cron/deferred-holds
describe("tâche quotidienne : pose des empreintes différées", () => {
  it("refuse tout appel sans le secret ou avec un mauvais secret", async () => {
    expect((await cronDeferredHolds(cronRequest())).status).toBe(401);
    expect((await cronDeferredHolds(cronRequest("mauvais"))).status).toBe(401);
    delete process.env.CRON_SECRET;
    expect((await cronDeferredHolds(cronRequest(""))).status).toBe(401);
  });

  it("pose l'empreinte des seules courses à J-3, au prix de la réservation", async () => {
    await seedSavedBooking("due", "uid-1");
    await seedSavedBooking("later", "uid-2", {
      holdScheduledFor: Timestamp.fromMillis(Date.now() + 4 * DAY),
      reservationDate: Timestamp.fromMillis(Date.now() + 7 * DAY),
    });
    stripeMock.setupIntents.retrieve.mockResolvedValue({ id: "seti_saved", status: "succeeded", customer: "cus_1", payment_method: "pm_1" });
    stripeMock.paymentIntents.create.mockResolvedValue({ id: "pi_hold", status: "requires_payment_method", amount: TOTAL });
    stripeMock.paymentIntents.confirm.mockResolvedValue({
      id: "pi_hold",
      status: "requires_capture",
      amount: TOTAL,
      latest_charge: { payment_method_details: { card: { capture_before: Math.floor((Date.now() + 7 * DAY) / 1000) } } },
    });

    const res = await cronDeferredHolds(cronRequest(CRON_SECRET));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ processed: 1, authorized: 1 });

    expect(stripeMock.paymentIntents.create).toHaveBeenCalledTimes(1);
    const [params, opts] = stripeMock.paymentIntents.create.mock.calls[0];
    expect(params).toMatchObject({ amount: TOTAL, capture_method: "manual", customer: "cus_1" });
    expect(params.confirm).toBeUndefined();
    expect(params.metadata).toMatchObject({ bookingId: "due", userId: "uid-1" });
    expect(opts.idempotencyKey).toBe("deferred-hold-due");
    const [confirmId, confirmParams] = stripeMock.paymentIntents.confirm.mock.calls[0];
    expect(confirmId).toBe("pi_hold");
    expect(confirmParams).toMatchObject({ payment_method: "pm_1", off_session: true });

    const due = await bookingOf("due");
    expect(due).toMatchObject({ paymentStatus: "authorized", paymentId: "pi_hold", amountAuthorized: TOTAL / 100 });
    expect(due.captureBefore).toBeDefined();
    expect((await bookingOf("later")).paymentStatus).toBe("card_saved");
  });

  it("relancée : aucune seconde empreinte", async () => {
    await seedSavedBooking("due", "uid-1");
    stripeMock.setupIntents.retrieve.mockResolvedValue({ id: "seti_saved", status: "succeeded", customer: "cus_1", payment_method: "pm_1" });
    stripeMock.paymentIntents.create.mockResolvedValue({ id: "pi_hold", status: "requires_payment_method", amount: TOTAL });
    stripeMock.paymentIntents.confirm.mockResolvedValue({ id: "pi_hold", status: "requires_capture", amount: TOTAL });
    await cronDeferredHolds(cronRequest(CRON_SECRET));
    await cronDeferredHolds(cronRequest(CRON_SECRET));
    expect(stripeMock.paymentIntents.create).toHaveBeenCalledTimes(1);
    expect(stripeMock.paymentIntents.confirm).toHaveBeenCalledTimes(1);
  });

  it("deux exécutions simultanées : une seule empreinte", async () => {
    await seedSavedBooking("due", "uid-1");
    stripeMock.setupIntents.retrieve.mockResolvedValue({ id: "seti_saved", status: "succeeded", customer: "cus_1", payment_method: "pm_1" });
    stripeMock.paymentIntents.create.mockResolvedValue({ id: "pi_hold", status: "requires_payment_method", amount: TOTAL });
    stripeMock.paymentIntents.confirm.mockResolvedValue({ id: "pi_hold", status: "requires_capture", amount: TOTAL });
    const outcomes = await Promise.all([placeDeferredHold("due"), placeDeferredHold("due")]);
    expect(outcomes.sort()).toEqual(["authorized", "skipped"]);
    expect(stripeMock.paymentIntents.create).toHaveBeenCalledTimes(1);
  });

  it("course annulée : pas d'empreinte", async () => {
    await seedSavedBooking("annulee", "uid-1", { status: "cancelled" });
    await cronDeferredHolds(cronRequest(CRON_SECRET));
    expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
  });

  it("refus de la banque : « action_required », e-mail au client une seule fois", async () => {
    await seedSavedBooking("refus", "uid-1");
    stripeMock.setupIntents.retrieve.mockResolvedValue({ id: "seti_saved", status: "succeeded", customer: "cus_1", payment_method: "pm_1" });
    stripeMock.paymentIntents.create.mockResolvedValue({ id: "pi_refus", status: "requires_payment_method", amount: TOTAL });
    stripeMock.paymentIntents.confirm.mockRejectedValue(cardError("pi_refus"));
    const res = await cronDeferredHolds(cronRequest(CRON_SECRET));
    expect(await res.json()).toMatchObject({ action_required: 1 });
    const b = await bookingOf("refus");
    expect(b).toMatchObject({ paymentStatus: "action_required", paymentId: "pi_refus" });
    expect(b.holdActionEmailSentAt).toBeDefined();
    expect(b.holdAdminAlertSentAt).toBeDefined();
    // Un e-mail au client (lien de confirmation) et une alerte à l'admin.
    expect(emailSend).toHaveBeenCalledTimes(2);
    const recipients = emailSend.mock.calls.map((c) => c[0].to);
    expect(recipients).toContainEqual(["client@test.dev"]);
    expect(recipients).toContainEqual(["contact@izymoto.com"]);
    const clientMail = emailSend.mock.calls.find((c) => c[0].to[0] === "client@test.dev")![0];
    expect(clientMail.html).toContain("/paiement/confirmer/refus");
    // Le motif bancaire brut n'est pas stocké (document lisible par le chauffeur assigné).
    expect(b.holdLastError).not.toContain("authentification");

    // Nouvelle tentative seulement au passage suivant : pas avant, et pas de second e-mail.
    await cronDeferredHolds(cronRequest(CRON_SECRET));
    expect(stripeMock.paymentIntents.confirm).toHaveBeenCalledTimes(1);
    expect(emailSend).toHaveBeenCalledTimes(2);
  });

  it("panne technique Stripe : la réservation reste « card_saved » pour le prochain passage", async () => {
    await seedSavedBooking("panne", "uid-1");
    stripeMock.setupIntents.retrieve.mockResolvedValue({ id: "seti_saved", status: "succeeded", customer: "cus_1", payment_method: "pm_1" });
    stripeMock.paymentIntents.create.mockRejectedValue(new Error("ECONNRESET"));
    const res = await cronDeferredHolds(cronRequest(CRON_SECRET));
    expect(await res.json()).toMatchObject({ retry: 1 });
    expect((await bookingOf("panne")).paymentStatus).toBe("card_saved");
    expect(emailSend).not.toHaveBeenCalled();
  });
});

// ================================================================ deferred-hold (page client)
describe("deferred-hold : confirmation par le client", () => {
  const call = (token: string, bookingId: string) =>
    deferredHold(jsonRequest("/api/deferred-hold", { token, body: { bookingId } }));

  it("le propriétaire récupère le client_secret de l'empreinte refusée", async () => {
    const u = await createAuthUser(uniqueEmail("dh-owner"));
    await seedSavedBooking("deferred_seti_a", u.uid, { paymentStatus: "action_required", paymentId: "pi_refus" });
    stripeMock.paymentIntents.retrieve.mockResolvedValue({
      id: "pi_refus",
      status: "requires_payment_method",
      client_secret: "pi_refus_secret",
      amount: TOTAL,
      metadata: { bookingId: "deferred_seti_a", userId: u.uid },
    });
    const res = await call(u.idToken, "deferred_seti_a");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ state: "action_required", clientSecret: "pi_refus_secret" });
  });

  it("un autre compte -> 404, aucun secret", async () => {
    const owner = await createAuthUser(uniqueEmail("dh-a"));
    const other = await createAuthUser(uniqueEmail("dh-b"));
    await seedSavedBooking("deferred_seti_a", owner.uid, { paymentStatus: "action_required", paymentId: "pi_refus" });
    const res = await call(other.idToken, "deferred_seti_a");
    expect(res.status).toBe(404);
    expect(stripeMock.paymentIntents.retrieve).not.toHaveBeenCalled();
  });

  it("empreinte confirmée (requires_capture) -> réservation « authorized »", async () => {
    const u = await createAuthUser(uniqueEmail("dh-ok"));
    await seedSavedBooking("deferred_seti_a", u.uid, { paymentStatus: "action_required", paymentId: "pi_refus" });
    stripeMock.paymentIntents.retrieve.mockResolvedValue({
      id: "pi_refus",
      status: "requires_capture",
      amount: TOTAL,
      metadata: { bookingId: "deferred_seti_a", userId: u.uid },
    });
    const res = await call(u.idToken, "deferred_seti_a");
    expect((await res.json()).state).toBe("authorized");
    expect(await bookingOf("deferred_seti_a")).toMatchObject({ paymentStatus: "authorized", amountAuthorized: TOTAL / 100 });
  });

  it("identifiant hors format -> 400", async () => {
    const u = await createAuthUser(uniqueEmail("dh-bad"));
    expect((await call(u.idToken, "card_pi_123")).status).toBe(400);
  });
});

// ================================================================ webhook
describe("webhook : empreinte différée", () => {
  const send = (event: unknown) => {
    stripeMock.webhooks.constructEvent.mockReturnValue(event);
    return webhook(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "t=1,v1=signature-mockee" },
        body: JSON.stringify(event),
      })
    );
  };

  it("payment_failed sur une empreinte différée -> reste « action_required », jamais « failed », sans motif bancaire", async () => {
    await seedSavedBooking("d1", "uid-1", { paymentStatus: "action_required", paymentId: "pi_d1" });
    const res = await send({
      id: "evt_f1",
      type: "payment_intent.payment_failed",
      data: { object: { id: "pi_d1", metadata: {}, last_payment_error: { message: "Carte refusée" } } },
    });
    expect(res.status).toBe(200);
    const d1 = await bookingOf("d1");
    expect(d1.paymentStatus).toBe("action_required");
    expect(d1.holdLastError).not.toContain("Carte refusée");
  });

  it("payment_failed pendant la tentative de la tâche (« hold_in_progress ») : verrou respecté", async () => {
    await seedSavedBooking("d3", "uid-1", { paymentStatus: "hold_in_progress", paymentId: "pi_d3" });
    await send({
      id: "evt_f3",
      type: "payment_intent.payment_failed",
      data: { object: { id: "pi_d3", metadata: {}, last_payment_error: { message: "Carte refusée" } } },
    });
    expect((await bookingOf("d3")).paymentStatus).toBe("hold_in_progress");
  });

  it("amount_capturable_updated après confirmation du client -> « authorized » avec date limite de capture", async () => {
    await seedSavedBooking("d2", "uid-1", { paymentStatus: "action_required", paymentId: "pi_d2" });
    stripeMock.paymentIntents.retrieve.mockResolvedValue({
      id: "pi_d2",
      status: "requires_capture",
      amount: TOTAL,
      latest_charge: { payment_method_details: { card: { capture_before: Math.floor((Date.now() + 7 * DAY) / 1000) } } },
    });
    await send({
      id: "evt_c2",
      type: "payment_intent.amount_capturable_updated",
      data: { object: { id: "pi_d2", amount: TOTAL, metadata: {} } },
    });
    const d2 = await bookingOf("d2");
    expect(d2.paymentStatus).toBe("authorized");
    expect(d2.captureBefore).toBeDefined();
  });

  it("payment_failed sur une empreinte immédiate : comportement inchangé (« failed »)", async () => {
    await db().collection("bookings").doc("c1").set({ paymentId: "pi_c1", paymentMethod: "card", paymentStatus: "authorized" });
    await send({
      id: "evt_f2",
      type: "payment_intent.payment_failed",
      data: { object: { id: "pi_c1", metadata: {}, last_payment_error: { message: "Refus" } } },
    });
    expect((await bookingOf("c1")).paymentStatus).toBe("failed");
  });
});

// ================================================================ cas complémentaires (QA)
describe("isDeferredHold : frontière des 5 jours", () => {
  const now = new Date("2026-11-02T10:00:00.000Z");
  const at = (ms: number) => new Date(now.getTime() + ms).toISOString();
  it("exactement 5 jours -> différée ; 1 ms de moins -> immédiate ; null -> immédiate", () => {
    expect(isDeferredHold(at(5 * DAY), now)).toBe(true);
    expect(isDeferredHold(at(5 * DAY - 1), now)).toBe(false);
    expect(isDeferredHold(at(5 * DAY + 1), now)).toBe(true);
    expect(isDeferredHold(null, now)).toBe(false);
  });
});

describe("cron : secret absent de la configuration", () => {
  it("CRON_SECRET non défini : refuse même un en-tête « Bearer undefined » ou vide", async () => {
    delete process.env.CRON_SECRET;
    expect((await cronDeferredHolds(cronRequest("undefined"))).status).toBe(401);
    expect((await cronDeferredHolds(cronRequest())).status).toBe(401);
    expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
  });
});

describe("placeDeferredHold : cas limites", () => {
  const savedSeti = { id: "seti_saved", status: "succeeded", customer: "cus_1", payment_method: "pm_1" };

  it("SetupIntent non « succeeded » -> action_required, empreinte créée mais jamais confirmée, e-mails envoyés", async () => {
    await seedSavedBooking("inutilisable", "uid-1");
    stripeMock.setupIntents.retrieve.mockResolvedValue({ ...savedSeti, status: "requires_payment_method" });
    stripeMock.paymentIntents.create.mockResolvedValue({ id: "pi_inu", status: "requires_payment_method", amount: TOTAL });
    expect(await placeDeferredHold("inutilisable")).toBe("action_required");
    expect(stripeMock.paymentIntents.confirm).not.toHaveBeenCalled();
    expect(await bookingOf("inutilisable")).toMatchObject({ paymentStatus: "action_required", paymentId: "pi_inu" });
    expect(emailSend).toHaveBeenCalledTimes(2);
  });

  it("empreinte qui revient en requires_action sans exception -> action_required avec le PI", async () => {
    await seedSavedBooking("sca", "uid-1");
    stripeMock.setupIntents.retrieve.mockResolvedValue(savedSeti);
    stripeMock.paymentIntents.create.mockResolvedValue({ id: "pi_sca", status: "requires_payment_method", amount: TOTAL });
    stripeMock.paymentIntents.confirm.mockResolvedValue({ id: "pi_sca", status: "requires_action", amount: TOTAL });
    expect(await placeDeferredHold("sca")).toBe("action_required");
    expect(await bookingOf("sca")).toMatchObject({ paymentStatus: "action_required", paymentId: "pi_sca" });
    expect(emailSend).toHaveBeenCalledTimes(2);
  });

  it("PaymentIntent déjà enregistré (reprise) : réutilisé, jamais de second PaymentIntent", async () => {
    await seedSavedBooking("reprise", "uid-1", {
      paymentStatus: "hold_in_progress",
      holdLockUntil: Timestamp.fromMillis(Date.now() - 60 * 1000),
      paymentId: "pi_exist",
    });
    stripeMock.setupIntents.retrieve.mockResolvedValue(savedSeti);
    stripeMock.paymentIntents.retrieve.mockResolvedValue({ id: "pi_exist", status: "requires_payment_method", amount: TOTAL });
    stripeMock.paymentIntents.confirm.mockResolvedValue({ id: "pi_exist", status: "requires_capture", amount: TOTAL });
    expect(await placeDeferredHold("reprise")).toBe("authorized");
    expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
    expect(stripeMock.paymentIntents.confirm.mock.calls[0][0]).toBe("pi_exist");
  });

  it("reprise après refus : tentative faite une fois l'échéance passée, ignorée avant", async () => {
    await seedSavedBooking("tard", "uid-1", {
      paymentStatus: "action_required",
      paymentId: "pi_refus",
      holdNextRetryAt: Timestamp.fromMillis(Date.now() + 60 * 60 * 1000),
    });
    expect(await placeDeferredHold("tard")).toBe("skipped");
    expect(stripeMock.paymentIntents.confirm).not.toHaveBeenCalled();
    await db().collection("bookings").doc("tard").update({ holdNextRetryAt: Timestamp.fromMillis(Date.now() - 1000) });
    stripeMock.setupIntents.retrieve.mockResolvedValue(savedSeti);
    stripeMock.paymentIntents.retrieve.mockResolvedValue({ id: "pi_refus", status: "requires_payment_method", amount: TOTAL });
    stripeMock.paymentIntents.confirm.mockResolvedValue({ id: "pi_refus", status: "requires_capture", amount: TOTAL });
    expect(await placeDeferredHold("tard")).toBe("authorized");
    expect((await bookingOf("tard")).paymentStatus).toBe("authorized");
  });

  it("verrou hold_in_progress expiré : tentative reprise, clé d'idempotence identique", async () => {
    await seedSavedBooking("expire", "uid-1", {
      paymentStatus: "hold_in_progress",
      holdLockUntil: Timestamp.fromMillis(Date.now() - 60 * 1000),
      holdAttempts: 1,
    });
    stripeMock.setupIntents.retrieve.mockResolvedValue(savedSeti);
    stripeMock.paymentIntents.create.mockResolvedValue({ id: "pi_hold", status: "requires_payment_method", amount: TOTAL });
    stripeMock.paymentIntents.confirm.mockResolvedValue({ id: "pi_hold", status: "requires_capture", amount: TOTAL });
    expect(await placeDeferredHold("expire")).toBe("authorized");
    expect(stripeMock.paymentIntents.create.mock.calls[0][1].idempotencyKey).toBe("deferred-hold-expire");
    expect((await bookingOf("expire")).holdAttempts).toBe(2);
  });

  it("verrou hold_in_progress non expiré : ignoré, aucun appel Stripe", async () => {
    await seedSavedBooking("verrou", "uid-1", {
      paymentStatus: "hold_in_progress",
      holdLockUntil: Timestamp.fromMillis(Date.now() + 5 * 60 * 1000),
    });
    expect(await placeDeferredHold("verrou")).toBe("skipped");
    expect(stripeMock.setupIntents.retrieve).not.toHaveBeenCalled();
    expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
    expect((await bookingOf("verrou")).paymentStatus).toBe("hold_in_progress");
  });

  it("montant de l'empreinte = prix de la réservation en base, pas une valeur du SetupIntent", async () => {
    await seedSavedBooking("prix", "uid-1", { prix: 123.45 });
    stripeMock.setupIntents.retrieve.mockResolvedValue({ ...savedSeti, metadata: { totalAmountCents: "1" } });
    stripeMock.paymentIntents.create.mockResolvedValue({ id: "pi_hold", status: "requires_payment_method", amount: 12345 });
    stripeMock.paymentIntents.confirm.mockResolvedValue({ id: "pi_hold", status: "requires_capture", amount: 12345 });
    await placeDeferredHold("prix");
    expect(stripeMock.paymentIntents.create.mock.calls[0][0].amount).toBe(12345);
  });

  it("réservation sans deferredHold, déjà autorisée ou inexistante : ignorée", async () => {
    await seedSavedBooking("autre", "uid-1", { deferredHold: false });
    await seedSavedBooking("deja", "uid-1", { paymentStatus: "authorized" });
    expect(await placeDeferredHold("autre")).toBe("skipped");
    expect(await placeDeferredHold("deja")).toBe("skipped");
    expect(await placeDeferredHold("inexistante")).toBe("skipped");
    expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
  });
});

describe("deferred-hold : cas complémentaires", () => {
  const call = (token: string | undefined, bookingId: string) =>
    deferredHold(jsonRequest("/api/deferred-hold", { token, body: { bookingId } }));
  const refusedPi = (uid: string, over: Record<string, unknown> = {}) => ({
    id: "pi_refus",
    status: "requires_capture",
    amount: TOTAL,
    metadata: { bookingId: "deferred_seti_a", userId: uid },
    ...over,
  });

  it("sans jeton -> 401, aucun appel Stripe", async () => {
    const res = await call(undefined, "deferred_seti_a");
    expect(res.status).toBe(401);
    expect(stripeMock.paymentIntents.retrieve).not.toHaveBeenCalled();
  });

  it("réservation « card_saved » : state pending, aucun secret, aucun appel Stripe", async () => {
    const u = await createAuthUser(uniqueEmail("dh-pending"));
    await seedSavedBooking("deferred_seti_a", u.uid);
    const res = await call(u.idToken, "deferred_seti_a");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.state).toBe("pending");
    expect(body.clientSecret).toBeUndefined();
    expect(JSON.stringify(body)).not.toMatch(/secret/i);
    expect(stripeMock.paymentIntents.retrieve).not.toHaveBeenCalled();
  });

  it("PaymentIntent d'un autre booking -> 409, pas de secret ni de passage à authorized", async () => {
    const u = await createAuthUser(uniqueEmail("dh-meta"));
    await seedSavedBooking("deferred_seti_a", u.uid, { paymentStatus: "action_required", paymentId: "pi_refus" });
    stripeMock.paymentIntents.retrieve.mockResolvedValue(
      refusedPi(u.uid, { status: "requires_payment_method", client_secret: "pi_secret_autre", metadata: { bookingId: "deferred_seti_AUTRE", userId: u.uid } })
    );
    const res = await call(u.idToken, "deferred_seti_a");
    expect(res.status).toBe(409);
    expect(JSON.stringify(await res.json())).not.toContain("pi_secret_autre");
    expect((await bookingOf("deferred_seti_a")).paymentStatus).toBe("action_required");
  });

  it("PaymentIntent d'un autre utilisateur -> 409", async () => {
    const u = await createAuthUser(uniqueEmail("dh-meta-u"));
    await seedSavedBooking("deferred_seti_a", u.uid, { paymentStatus: "action_required", paymentId: "pi_refus" });
    stripeMock.paymentIntents.retrieve.mockResolvedValue(refusedPi("autre-uid"));
    expect((await call(u.idToken, "deferred_seti_a")).status).toBe(409);
    expect((await bookingOf("deferred_seti_a")).paymentStatus).toBe("action_required");
  });

  it("requires_capture d'un montant différent -> 409, la réservation ne passe pas à authorized", async () => {
    const u = await createAuthUser(uniqueEmail("dh-amount"));
    await seedSavedBooking("deferred_seti_a", u.uid, { paymentStatus: "action_required", paymentId: "pi_refus" });
    stripeMock.paymentIntents.retrieve.mockResolvedValue(refusedPi(u.uid, { amount: 100 }));
    expect((await call(u.idToken, "deferred_seti_a")).status).toBe(409);
    expect((await bookingOf("deferred_seti_a")).paymentStatus).toBe("action_required");
  });

  it("réservation annulée -> state cancelled, aucun appel Stripe", async () => {
    const u = await createAuthUser(uniqueEmail("dh-cancel"));
    await seedSavedBooking("deferred_seti_a", u.uid, { status: "cancelled", paymentStatus: "action_required", paymentId: "pi_refus" });
    expect((await (await call(u.idToken, "deferred_seti_a")).json()).state).toBe("cancelled");
    expect(stripeMock.paymentIntents.retrieve).not.toHaveBeenCalled();
  });
});

describe("finalize-deferred-booking : rejet puis nouvel essai", () => {
  const call = (token: string, ride: Record<string, unknown>) =>
    finalizeDeferred(
      jsonRequest("/api/finalize-deferred-booking", {
        token,
        body: { setupIntentId: "seti_ok", bookingData: { ...ride, name: "Client", phone: "+33600000000" } },
      })
    );

  it("rejeu après rejet (carte déjà détachée) : même 409, aucune réservation, détachement tolérant aux erreurs", async () => {
    const u = await createAuthUser(uniqueEmail("fin-idem"));
    stripeMock.setupIntents.retrieve.mockResolvedValue(
      seti(u.uid, "seti_ok", { metadata: { ...setiMeta(u.uid), totalAmountCents: "100" } })
    );
    const first = await call(u.idToken, farRide());
    expect(first.status).toBe(409);
    stripeMock.paymentMethods.detach.mockRejectedValue(new Error("pm_test is not attached to a customer"));
    const second = await call(u.idToken, farRide());
    expect(second.status).toBe(409);
    expect((await second.json()).code).toBe("PRICE_CHANGED");
    expect((await db().collection("bookings").get()).size).toBe(0);
  });

  it("rejeu après création : toujours 200 même si la carte a été détachée entre-temps", async () => {
    const u = await createAuthUser(uniqueEmail("fin-idem2"));
    stripeMock.setupIntents.retrieve.mockResolvedValue(seti(u.uid));
    const first = await call(u.idToken, farRide());
    expect(first.status).toBe(200);
    stripeMock.setupIntents.retrieve.mockResolvedValue(seti(u.uid, "seti_ok", { payment_method: null }));
    const second = await call(u.idToken, farRide());
    expect(second.status).toBe(200);
    expect((await db().collection("bookings").get()).size).toBe(1);
  });
});

describe("empreinte confirmée sur une course annulée / nettoyage des cartes", () => {
  const send = (event: unknown) => {
    stripeMock.webhooks.constructEvent.mockReturnValue(event);
    return webhook(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "t=1,v1=signature-mockee" },
        body: JSON.stringify(event),
      })
    );
  };
  const farFuture = () => Timestamp.fromMillis(Date.now() + 30 * DAY);
  const savedCard = { id: "seti_saved", status: "succeeded", customer: "cus_1", payment_method: "pm_1" };

  it("webhook : empreinte confirmée alors que la course est annulée -> libérée, pas « authorized »", async () => {
    await seedSavedBooking("ann", "uid-1", { status: "cancelled", paymentStatus: "action_required", paymentId: "pi_ann" });
    stripeMock.paymentIntents.retrieve.mockResolvedValue({ id: "pi_ann", status: "requires_capture", amount: TOTAL });
    await send({
      id: "evt_ann",
      type: "payment_intent.amount_capturable_updated",
      data: { object: { id: "pi_ann", amount: TOTAL, metadata: {} } },
    });
    expect(stripeMock.paymentIntents.cancel).toHaveBeenCalledWith("pi_ann");
    expect((await bookingOf("ann")).paymentStatus).not.toBe("authorized");
  });

  it("cron : course encaissée -> carte conservée (D-013), rien n'est annulé", async () => {
    await seedSavedBooking("fini", "uid-1", { paymentStatus: "captured", holdCleanedAt: null, holdScheduledFor: farFuture() });
    const body = await (await cronDeferredHolds(cronRequest(CRON_SECRET))).json();
    expect(body.holdsCleaned).toBe(0);
    expect(stripeMock.paymentMethods.detach).not.toHaveBeenCalled();
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
  });

  it("cron : course annulée en attente de confirmation -> paiement ouvert annulé une seule fois, carte conservée", async () => {
    await seedSavedBooking("annulee2", "uid-1", {
      status: "cancelled",
      paymentStatus: "action_required",
      paymentId: "pi_ouvert",
      holdCleanedAt: null,
      holdScheduledFor: farFuture(),
    });
    stripeMock.paymentIntents.retrieve.mockResolvedValue({ id: "pi_ouvert", status: "requires_payment_method" });
    stripeMock.paymentIntents.cancel.mockResolvedValue({ id: "pi_ouvert", status: "canceled" });
    const first = await (await cronDeferredHolds(cronRequest(CRON_SECRET))).json();
    expect(first.holdsCleaned).toBe(1);
    expect(stripeMock.paymentIntents.cancel).toHaveBeenCalledWith("pi_ouvert");
    expect((await bookingOf("annulee2")).holdCleanedAt).not.toBeNull();
    await cronDeferredHolds(cronRequest(CRON_SECRET));
    expect(stripeMock.paymentIntents.cancel).toHaveBeenCalledTimes(1);
    expect(stripeMock.paymentMethods.detach).not.toHaveBeenCalled();
  });

  it("cron : course annulée avec empreinte posée -> laissée à l'admin (« Annuler le hold »)", async () => {
    await seedSavedBooking("annulee3", "uid-1", {
      status: "cancelled",
      paymentStatus: "authorized",
      paymentId: "pi_pose",
      holdCleanedAt: null,
      holdScheduledFor: farFuture(),
    });
    await cronDeferredHolds(cronRequest(CRON_SECRET));
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
  });
});
// ================================================================ hybride lointain
describe("create-payment-intent : pas d'hybride pour une course lointaine", () => {
  it("portefeuille + carte à J+10 -> 400 HYBRID_NOT_DEFERRED, aucune intention Stripe", async () => {
    const u = await createAuthUser(uniqueEmail("cpi-hyb"));
    await db().collection("wallets").doc(u.uid).set({ userId: u.uid, balanceCents: 2000, cumulativeRechargedCents: 2000, currency: "EUR" });
    const res = await createPaymentIntent(
      jsonRequest("/api/create-payment-intent", { token: u.idToken, body: { metadata: farRide(), walletAmountCents: 2000 } })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("HYBRID_NOT_DEFERRED");
    expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
    expect(stripeMock.setupIntents.create).not.toHaveBeenCalled();
  });
});

// ================================================================ arrêt des tentatives
describe("tâche quotidienne : arrêt des tentatives après la course", () => {
  it("départ passé depuis plus d'un jour sans empreinte -> « failed », plus aucune tentative, carte conservée", async () => {
    const past = Date.now() - 2 * DAY;
    await seedSavedBooking("passee", "uid-1", {
      paymentStatus: "action_required",
      paymentId: "pi_old",
      reservationDate: Timestamp.fromMillis(past),
      holdScheduledFor: Timestamp.fromMillis(past - 3 * DAY),
    });
    stripeMock.setupIntents.retrieve.mockResolvedValue({ id: "seti_saved", status: "succeeded", customer: "cus_1", payment_method: "pm_1" });
    stripeMock.paymentIntents.retrieve.mockResolvedValue({ id: "pi_old", status: "requires_payment_method" });
    await cronDeferredHolds(cronRequest(CRON_SECRET));
    expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
    expect(stripeMock.paymentIntents.confirm).not.toHaveBeenCalled();
    expect((await bookingOf("passee")).paymentStatus).toBe("failed");
    // Paiement resté ouvert annulé, admin prévenu d'un possible impayé.
    expect(stripeMock.paymentIntents.cancel).toHaveBeenCalledWith("pi_old");
    expect(emailSend.mock.calls.some(([m]) => m.to?.includes("contact@izymoto.com") && /tentatives arrêtées/.test(m.subject))).toBe(true);
    const mails = emailSend.mock.calls.length;
    await cronDeferredHolds(cronRequest(CRON_SECRET));
    expect(emailSend.mock.calls.length).toBe(mails);
    expect(stripeMock.paymentMethods.detach).not.toHaveBeenCalled();
    expect(stripeMock.paymentIntents.confirm).not.toHaveBeenCalled();
  });

  it("course terminée par un autre moyen (status completed) -> aucune empreinte", async () => {
    await seedSavedBooking("faite", "uid-1", { status: "completed" });
    await cronDeferredHolds(cronRequest(CRON_SECRET));
    expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
    expect((await bookingOf("faite")).paymentStatus).toBe("failed");
  });
});

// ================================================================ e-mail : lien et erreurs Resend
describe("e-mail « action requise »", () => {
  it("lien correct même si NEXT_PUBLIC_SITE_URL est saisie avec des guillemets et une barre finale", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = '"https://staging.exemple.test/" ';
    await seedSavedBooking("lien", "uid-1");
    stripeMock.setupIntents.retrieve.mockResolvedValue({ id: "seti_saved", status: "succeeded", customer: "cus_1", payment_method: "pm_1" });
    stripeMock.paymentIntents.create.mockRejectedValue(cardError("pi_lien"));
    await cronDeferredHolds(cronRequest(CRON_SECRET));
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const html = emailSend.mock.calls.find(([m]) => m.to?.includes("client@test.dev"))?.[0].html as string;
    expect(html).toContain('href="https://staging.exemple.test/paiement/confirmer/lien"');
  });

  it("refus de Resend ({ error }) : l'e-mail n'est pas marqué envoyé", async () => {
    emailSend.mockResolvedValue({ data: null, error: { name: "validation_error", message: "domain not verified" } });
    await seedSavedBooking("resend", "uid-1");
    stripeMock.setupIntents.retrieve.mockResolvedValue({ id: "seti_saved", status: "succeeded", customer: "cus_1", payment_method: "pm_1" });
    stripeMock.paymentIntents.create.mockRejectedValue(cardError("pi_resend"));
    await cronDeferredHolds(cronRequest(CRON_SECRET));
    const b = await bookingOf("resend");
    expect(b.paymentStatus).toBe("action_required");
    expect(b.holdActionEmailSentAt).toBeUndefined();
    expect(b.holdAdminAlertSentAt).toBeUndefined();
  });
});
