// Webhook Stripe (app/api/webhooks/stripe/route.js) migré vers l'Admin SDK : il doit écrire sur
// l'émulateur (projet demo-izymoto) malgré les règles d'urgence qui interdisent tout accès client serveur.
//
// Commande (depuis la racine du dépôt) :
//   npx firebase emulators:exec --only firestore,auth --project demo-izymoto "npx vitest run --config docs/incident/tests/vitest.config.mjs"
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { Timestamp } from "firebase-admin/firestore";
import { PROJECT_EMERGENCY, RULES_EMERGENCY, createEnv } from "./helpers.mjs";

vi.mock("@/lib/stripe-server", () => ({
  stripe: { webhooks: { constructEvent: (raw, sig) => {
    if (sig === "bad") throw new Error("No signatures found matching");
    return JSON.parse(raw.toString());
  } } },
}));
const sendReviewRequestEmail = vi.fn(async () => ({ id: "mail" }));
vi.mock("@/lib/emails/reviewRequestEmail", () => ({ sendReviewRequestEmail: (...a) => sendReviewRequestEmail(...a) }));

import { POST } from "@/app/api/webhooks/stripe/route.js";
import { getAdminFirestore } from "@/lib/firebase/admin-server";

let env;
beforeAll(async () => { env = await createEnv(PROJECT_EMERGENCY, RULES_EMERGENCY); });
afterAll(async () => { await env?.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); sendReviewRequestEmail.mockClear(); });

const adb = () => getAdminFirestore();
const send = (event, sig = "good") =>
  POST(new Request("http://localhost/api/webhooks/stripe", {
    method: "POST", headers: { "stripe-signature": sig }, body: JSON.stringify(event),
  }));
const pi = (type, object, id = "evt_1") => ({ id, type, data: { object } });
const seedBooking = (id, extra = {}) =>
  adb().collection("bookings").doc(id).set({
    userId: "client1", accountType: "registered", status: "confirmed", paymentStatus: "authorized",
    paymentId: "pi_123", prix: 80, email: "p@test.dev", name: "P", reservationId: "CMD-1",
    depart: "A", arrivee: "B", createdAt: Timestamp.now(), isPaid: false, ...extra,
  });

describe("2. Webhook Stripe via Admin SDK", () => {
  it("signature invalide -> 400", async () => {
    const res = await send(pi("payment_intent.canceled", { id: "pi_123" }), "bad");
    expect(res.status).toBe(400);
  });

  it("amount_capturable_updated -> authorized / awaiting_driver / amountAuthorized", async () => {
    await seedBooking("b1");
    const res = await send(pi("payment_intent.amount_capturable_updated", { id: "pi_123", amount: 8000 }));
    expect(res.status).toBe(200);
    const d = (await adb().collection("bookings").doc("b1").get()).data();
    expect(d.paymentStatus).toBe("authorized");
    expect(d.status).toBe("awaiting_driver");
    expect(d.amountAuthorized).toBe(80);
    expect(d.paymentUpdatedAt).toBeTruthy();
  });

  it("payment_intent.succeeded -> captured / completed + email d'avis + reviewRequestEmailSentAt", async () => {
    await seedBooking("b1");
    const res = await send(pi("payment_intent.succeeded", { id: "pi_123", amount_received: 8000 }));
    expect(res.status).toBe(200);
    const d = (await adb().collection("bookings").doc("b1").get()).data();
    expect(d.paymentStatus).toBe("captured");
    expect(d.amountCaptured).toBe(80);
    expect(d.status).toBe("completed");
    expect(sendReviewRequestEmail).toHaveBeenCalledTimes(1);
    expect(d.reviewRequestEmailSentAt).toBeTruthy();
    // redélivrance : pas de second email (idempotence)
    await send(pi("payment_intent.succeeded", { id: "pi_123", amount_received: 8000 }, "evt_2"));
    expect(sendReviewRequestEmail).toHaveBeenCalledTimes(1);
  });

  it("payment_intent.canceled -> released / cancelled", async () => {
    await seedBooking("b1", { status: "awaiting_driver" });
    const res = await send(pi("payment_intent.canceled", { id: "pi_123" }));
    expect(res.status).toBe(200);
    const d = (await adb().collection("bookings").doc("b1").get()).data();
    expect(d.paymentStatus).toBe("released");
    expect(d.status).toBe("cancelled");
  });

  it("payment_intent.payment_failed -> failed + paymentFailureMessage", async () => {
    await seedBooking("b1");
    await send(pi("payment_intent.payment_failed", { id: "pi_123", last_payment_error: { message: "Carte refusée" } }));
    const d = (await adb().collection("bookings").doc("b1").get()).data();
    expect(d.paymentStatus).toBe("failed");
    expect(d.paymentFailureMessage).toBe("Carte refusée");
  });

  it("annulation d'une course hybride -> remboursement de la part wallet (idempotent)", async () => {
    await adb().collection("wallets").doc("client1").set({ userId: "client1", balanceCents: 1000, cumulativeRechargedCents: 1000, currency: "EUR", createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
    await seedBooking("b1", { paymentMethod: "hybrid", walletAmountCents: 2000, status: "awaiting_driver" });
    await send(pi("payment_intent.canceled", { id: "pi_123" }, "evt_c"));
    await send(pi("payment_intent.canceled", { id: "pi_123" }, "evt_c"));
    const w = (await adb().collection("wallets").doc("client1").get()).data();
    expect(w.balanceCents).toBe(3000);
    const tx = (await adb().collection("walletTransactions").doc("b1:evt_c").get()).data();
    expect(tx.type).toBe("refund");
    expect(tx.userId).toBe("client1");
  });

  it("checkout.session.completed wallet_recharge -> crédit wallet + ledger (idempotent)", async () => {
    const ev = pi("checkout.session.completed", {
      id: "cs_1", payment_status: "paid", payment_intent: "pi_w1",
      metadata: { intent: "wallet_recharge", userId: "client1", tierId: "individual-essai" },
    }, "evt_w1");
    const res = await send(ev);
    expect(res.status).toBe(200);
    const w = (await adb().collection("wallets").doc("client1").get()).data();
    expect(w.balanceCents).toBe(10500);
    expect(w.cumulativeRechargedCents).toBe(10500);
    const tx = (await adb().collection("walletTransactions").doc("evt_w1").get()).data();
    expect(tx.type).toBe("recharge");
    expect(tx.userId).toBe("client1");
    expect(tx.checkoutSessionId).toBe("cs_1");
    await send(ev); // redélivrance
    expect((await adb().collection("wallets").doc("client1").get()).data().balanceCents).toBe(10500);
  });

  it("checkout.session.completed non payée ou hors wallet -> aucun crédit", async () => {
    await send(pi("checkout.session.completed", { id: "cs_2", payment_status: "unpaid", metadata: { intent: "wallet_recharge", userId: "client1", tierId: "individual-essai" } }, "evt_x"));
    await send(pi("checkout.session.completed", { id: "cs_3", payment_status: "paid", metadata: {} }, "evt_y"));
    expect((await adb().collection("wallets").doc("client1").get()).exists).toBe(false);
  });

  it("PaymentIntent d'une recharge wallet ignoré par les évents booking", async () => {
    await seedBooking("b1");
    await send(pi("payment_intent.canceled", { id: "pi_123", metadata: { intent: "wallet_recharge" } }));
    expect((await adb().collection("bookings").doc("b1").get()).data().status).toBe("confirmed");
  });

  it("PI sans réservation -> 200 sans erreur", async () => {
    const res = await send(pi("payment_intent.canceled", { id: "pi_unknown" }));
    expect(res.status).toBe(200);
  });
});
