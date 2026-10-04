// Lot 0.3 : webhook Stripe payment_intent.amount_capturable_updated. Le handler lit
// Firestore avec le SDK CLIENT (`lib/firebaseConfig`) ; on le branche sur l'émulateur via
// un shim du module "firebase/firestore" appuyé sur l'Admin SDK (même base d'émulateur).
// `stripe.webhooks.constructEvent` est mocké : l'événement est lu dans le corps de la requête.
import { beforeEach, describe, expect, it, vi } from "vitest";

const constructEvent = vi.hoisted(() => vi.fn());

vi.mock("@/lib/stripe-server", () => ({
  stripe: { webhooks: { constructEvent } },
}));
vi.mock("@/lib/firebaseConfig", () => ({ db: { shim: true } }));
vi.mock("firebase/firestore", async () => {
  const admin = await import("firebase-admin/firestore");
  const { getAdminFirestore } = await import("@/lib/firebase/admin-server");
  return {
    Timestamp: admin.Timestamp,
    collection: (_db: unknown, name: string) => ({ name }),
    where: (field: string, op: string, value: unknown) => ({ field, op, value }),
    query: (col: { name: string }, w: { field: string; op: string; value: unknown }) => ({ col, w }),
    getDocs: async (q: { col: { name: string }; w: { field: string; op: string; value: unknown } }) => {
      const snap = await getAdminFirestore()
        .collection(q.col.name)
        .where(q.w.field, q.w.op as FirebaseFirestore.WhereFilterOp, q.w.value)
        .get();
      return { docs: snap.docs };
    },
    doc: (_db: unknown, col: string, id: string) => ({ col, id }),
    updateDoc: (ref: { col: string; id: string }, fields: Record<string, unknown>) =>
      getAdminFirestore().collection(ref.col).doc(ref.id).update(fields),
  };
});
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
