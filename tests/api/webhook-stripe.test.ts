// Lots 0.3 / 0.5 : webhook Stripe payment_intent.amount_capturable_updated. Le handler
// utilise l'Admin SDK (bypass des règles) directement sur l'émulateur Firestore : aucun
// shim du SDK client n'est nécessaire.
// `stripe.webhooks.constructEvent` est mocké : l'événement est lu dans le corps de la requête.
import { beforeEach, describe, expect, it, vi } from "vitest";

const constructEvent = vi.hoisted(() => vi.fn());

vi.mock("@/lib/stripe-server", () => ({
  stripe: { webhooks: { constructEvent } },
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
