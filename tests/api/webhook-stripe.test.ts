// Lots 0.3 / 0.5 : webhook Stripe payment_intent.amount_capturable_updated. Le handler
// utilise l'Admin SDK (bypass des règles) directement sur l'émulateur Firestore : aucun
// shim du SDK client n'est nécessaire.
// `stripe.webhooks.constructEvent` est mocké : l'événement est lu dans le corps de la requête.
import { beforeEach, describe, expect, it, vi } from "vitest";

const constructEvent = vi.hoisted(() => vi.fn());
const refundsCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/stripe-server", () => ({
  stripe: { webhooks: { constructEvent }, refunds: { create: refundsCreate } },
}));
vi.mock("@/lib/emails/reviewRequestEmail", () => ({ sendReviewRequestEmail: vi.fn() }));

import { POST as webhook } from "@/app/api/webhooks/stripe/route";
import { getAdminFirestore } from "@/lib/firebase/admin-server";
import { resetEmulators } from "./helpers";

const db = () => getAdminFirestore();

const capturableEvent = (piId: string, amount = 7600) => ({
  id: `evt_${piId}`,
  type: "payment_intent.amount_capturable_updated",
  data: { object: { id: piId, amount, metadata: {} } },
});

function send(event: unknown) {
  constructEvent.mockReturnValue(event);
  return webhook(
    new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=signature-mockee" },
      body: JSON.stringify(event),
    })
  );
}

beforeEach(async () => {
  await resetEmulators();
  constructEvent.mockReset();
  refundsCreate.mockReset().mockResolvedValue({ id: "re_test" });
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_dummy";
});

describe("webhook Stripe : signature", () => {
  it("sans en-tête stripe-signature -> 400, aucun traitement", async () => {
    const res = await webhook(new Request("http://localhost/api/webhooks/stripe", { method: "POST", body: "{}" }));
    expect(res.status).toBe(400);
    expect(constructEvent).not.toHaveBeenCalled();
  });

  it("signature invalide (constructEvent lève) -> 400, réservation inchangée", async () => {
    await db().collection("bookings").doc("b1").set({ paymentId: "pi_sig", status: "confirmed" });
    constructEvent.mockImplementation(() => {
      throw new Error("No signatures found matching the expected signature");
    });
    const res = await webhook(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "mauvaise" },
        body: "{}",
      })
    );
    expect(res.status).toBe(400);
    expect((await db().collection("bookings").doc("b1").get()).data()?.status).toBe("confirmed");
  });
});

describe("webhook payment_intent.amount_capturable_updated : ne fait pas reculer une course avancée", () => {
  it.each(["assigned", "in_progress", "completed", "cancelled"])(
    "réservation au statut %s -> statut conservé, paiement marqué authorized",
    async (status) => {
      await db().collection("bookings").doc("b1").set({ paymentId: "pi_adv", status, driverId: "chauffeur-1" });
      const res = await send(capturableEvent("pi_adv"));
      expect(res.status).toBe(200);
      const b = (await db().collection("bookings").doc("b1").get()).data()!;
      expect(b.status).toBe(status);
      expect(b.driverId).toBe("chauffeur-1");
      expect(b.paymentStatus).toBe("authorized");
      expect(b.amountAuthorized).toBe(76);
    }
  );

  it.each(["confirmed", "pending", "awaiting_driver"])(
    "réservation au statut %s -> awaiting_driver",
    async (status) => {
      await db().collection("bookings").doc("b1").set({ paymentId: "pi_new", status });
      expect((await send(capturableEvent("pi_new"))).status).toBe(200);
      const b = (await db().collection("bookings").doc("b1").get()).data()!;
      expect(b.status).toBe("awaiting_driver");
      expect(b.paymentStatus).toBe("authorized");
    }
  );

  it("réservation sans statut -> awaiting_driver", async () => {
    await db().collection("bookings").doc("b1").set({ paymentId: "pi_nostatus" });
    await send(capturableEvent("pi_nostatus"));
    expect((await db().collection("bookings").doc("b1").get()).data()?.status).toBe("awaiting_driver");
  });

  it("redélivrance de l'événement après acceptation par un chauffeur : course toujours assignée", async () => {
    await db().collection("bookings").doc("b1").set({ paymentId: "pi_redeliv", status: "confirmed" });
    await send(capturableEvent("pi_redeliv"));
    await db().collection("bookings").doc("b1").update({ status: "assigned", driverId: "chauffeur-1" });
    expect((await send(capturableEvent("pi_redeliv"))).status).toBe(200);
    expect((await db().collection("bookings").doc("b1").get()).data()?.status).toBe("assigned");
  });

  it("aucune réservation pour ce PI -> 200, rien créé", async () => {
    expect((await send(capturableEvent("pi_inconnu"))).status).toBe(200);
    expect((await db().collection("bookings").get()).size).toBe(0);
  });

  it("ne touche que la réservation du PI concerné", async () => {
    await db().collection("bookings").doc("b1").set({ paymentId: "pi_a", status: "confirmed" });
    await db().collection("bookings").doc("b2").set({ paymentId: "pi_b", status: "confirmed" });
    await send(capturableEvent("pi_a"));
    expect((await db().collection("bookings").doc("b2").get()).data()?.status).toBe("confirmed");
  });
});

describe("webhook amount_capturable_updated tardif : ne régresse pas l'état du paiement", () => {
  it("paymentStatus captured conservé (et amountAuthorized inchangé) après un événement tardif", async () => {
    await db().collection("bookings").doc("b1").set({
      paymentId: "pi_late", status: "completed", paymentStatus: "captured", amountAuthorized: 76, amountCaptured: 76,
    });
    expect((await send(capturableEvent("pi_late", 9999))).status).toBe(200);
    const b = (await db().collection("bookings").doc("b1").get()).data()!;
    expect(b.paymentStatus).toBe("captured");
    expect(b.amountAuthorized).toBe(76);
    expect(b.status).toBe("completed");
  });

  it.each(["released", "failed"])("paymentStatus %s conservé", async (paymentStatus) => {
    await db().collection("bookings").doc("b1").set({ paymentId: "pi_late2", status: "cancelled", paymentStatus, amountAuthorized: 76 });
    await send(capturableEvent("pi_late2"));
    const b = (await db().collection("bookings").doc("b1").get()).data()!;
    expect(b.paymentStatus).toBe(paymentStatus);
    expect(b.amountAuthorized).toBe(76);
  });

  it.each(["pending", "authorized", undefined])("paymentStatus %s -> authorized posé avec le montant", async (paymentStatus) => {
    await db().collection("bookings").doc("b1").set({
      paymentId: "pi_ok", status: "confirmed", ...(paymentStatus ? { paymentStatus } : {}),
    });
    await send(capturableEvent("pi_ok", 7600));
    const b = (await db().collection("bookings").doc("b1").get()).data()!;
    expect(b.paymentStatus).toBe("authorized");
    expect(b.amountAuthorized).toBe(76);
    expect(b.status).toBe("awaiting_driver");
  });
});

// Lot 2.2 : recharge payée après la suppression du compte (ou pour une société fermée) ->
// remboursement idempotent, aucun crédit.
describe("webhook checkout.session.completed (recharge) : compte supprimé -> remboursement", () => {
  const rechargeEvent = (meta: Record<string, string>, sessionId = "cs_1") => ({
    id: `evt_${sessionId}`,
    type: "checkout.session.completed",
    data: {
      object: {
        id: sessionId,
        payment_status: "paid",
        payment_intent: `pi_${sessionId}`,
        metadata: { intent: "wallet_recharge", ...meta },
      },
    },
  });
  const walletBalance = async (uid: string) => (await db().collection("wallets").doc(uid).get()).data()?.balanceCents;
  const txCount = async () => (await db().collection("walletTransactions").get()).size;

  it("témoin : profil existant -> crédit du portefeuille, aucun remboursement", async () => {
    await db().collection("users").doc("u1").set({ email: "u1@test.dev" });
    const res = await send(rechargeEvent({ userId: "u1", tierId: "individual-essai" }));
    expect(res.status).toBe(200);
    expect(await walletBalance("u1")).toBe(10500);
    expect(refundsCreate).not.toHaveBeenCalled();
  });

  it("profil absent (compte supprimé) -> remboursement avec clé d'idempotence, aucun crédit", async () => {
    const res = await send(rechargeEvent({ userId: "u2", tierId: "individual-essai" }, "cs_2"));
    expect(res.status).toBe(200);
    expect(refundsCreate).toHaveBeenCalledTimes(1);
    expect(refundsCreate).toHaveBeenCalledWith({ payment_intent: "pi_cs_2" }, { idempotencyKey: "refund-deleted-cs_2" });
    expect(await walletBalance("u2")).toBeUndefined();
    expect(await txCount()).toBe(0);
  });

  it("suppression en cours (deletionPseudonym posé) -> remboursement, aucun crédit", async () => {
    await db().collection("users").doc("u3").set({ deletionPseudonym: "supprime_" + "a".repeat(24) });
    await send(rechargeEvent({ userId: "u3", tierId: "individual-essai" }, "cs_3"));
    expect(refundsCreate).toHaveBeenCalledWith({ payment_intent: "pi_cs_3" }, { idempotencyKey: "refund-deleted-cs_3" });
    expect(await walletBalance("u3")).toBeUndefined();
    expect(await txCount()).toBe(0);
  });

  it("société fermée -> remboursement, solde société inchangé", async () => {
    await db().collection("companies").doc("coC").set({ status: "closed", walletBalanceCents: 0, memberCount: 0 });
    await send(rechargeEvent({ userId: "own", companyId: "coC", tierId: "business-tpe" }, "cs_4"));
    expect(refundsCreate).toHaveBeenCalledWith({ payment_intent: "pi_cs_4" }, { idempotencyKey: "refund-deleted-cs_4" });
    expect((await db().collection("companies").doc("coC").get()).data()?.walletBalanceCents).toBe(0);
    expect(await txCount()).toBe(0);
  });

  it("société absente -> remboursement", async () => {
    await send(rechargeEvent({ userId: "own", companyId: "coNone", tierId: "business-tpe" }, "cs_5"));
    expect(refundsCreate).toHaveBeenCalledTimes(1);
    expect((await db().collection("companies").doc("coNone").get()).exists).toBe(false);
  });

  it("société ouverte -> crédit société, aucun remboursement", async () => {
    await db().collection("companies").doc("coOk").set({ status: "active", walletBalanceCents: 0, cumulativeRechargedCents: 0, memberCount: 1, ownerUid: "own" });
    const res = await send(rechargeEvent({ userId: "own", companyId: "coOk", tierId: "business-tpe" }, "cs_6"));
    expect(res.status).toBe(200);
    expect((await db().collection("companies").doc("coOk").get()).data()?.walletBalanceCents).toBe(105000);
    expect(refundsCreate).not.toHaveBeenCalled();
  });

  it("événement rejoué sur compte supprimé -> même clé d'idempotence", async () => {
    const ev = rechargeEvent({ userId: "u7", tierId: "individual-essai" }, "cs_7");
    await send(ev);
    await send(ev);
    const keys = refundsCreate.mock.calls.map((c) => c[1].idempotencyKey);
    expect(new Set(keys)).toEqual(new Set(["refund-deleted-cs_7"]));
  });
});
