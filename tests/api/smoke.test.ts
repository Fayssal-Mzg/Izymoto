// Prouve que l'outillage API fonctionne : handlers Next appelés directement,
// vrais ID tokens de l'émulateur Auth, firebase-admin branché sur l'émulateur,
// Stripe / Resend mockés (aucun appel réseau réel).
import { beforeEach, describe, expect, it, vi } from "vitest";

const capture = vi.hoisted(() => vi.fn());
const emailSend = vi.hoisted(() => vi.fn());

vi.mock("@/lib/stripe-server", () => ({
  stripe: { paymentIntents: { capture } },
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: emailSend };
  },
}));

import { POST as capturePayment } from "@/app/api/capture-payment/route";
import { POST as sendDevis } from "@/app/api/send-devis/route";
import { createAuthUser, jsonRequest, resetEmulators, seedUserDoc } from "./helpers";

beforeEach(async () => {
  await resetEmulators();
  capture.mockReset().mockResolvedValue({ id: "pi_test", status: "succeeded", amount_received: 8000 });
  emailSend.mockReset().mockResolvedValue({ data: { id: "email_test" }, error: null });
});

describe("POST /api/capture-payment (requireAdmin)", () => {
  it("sans jeton -> 401, Stripe non appelé", async () => {
    const res = await capturePayment(jsonRequest("/api/capture-payment", { body: { paymentIntentId: "pi_x" } }));
    expect(res.status).toBe(401);
    expect(capture).not.toHaveBeenCalled();
  });

  it("jeton invalide -> 401", async () => {
    const res = await capturePayment(
      jsonRequest("/api/capture-payment", { token: "n-importe-quoi", body: { paymentIntentId: "pi_x" } })
    );
    expect(res.status).toBe(401);
    expect(capture).not.toHaveBeenCalled();
  });

  it("vrai jeton d'un utilisateur non admin -> 403, Stripe non appelé", async () => {
    const user = await createAuthUser("simple@test.dev");
    await seedUserDoc(user.uid, { email: user.email, isAdmin: false });
    const res = await capturePayment(
      jsonRequest("/api/capture-payment", { token: user.idToken, body: { paymentIntentId: "pi_x" } })
    );
    expect(res.status).toBe(403);
    expect(capture).not.toHaveBeenCalled();
  });

  it("vrai jeton d'un admin -> 200, Stripe (mock) appelé une fois", async () => {
    const admin = await createAuthUser("admin@test.dev");
    await seedUserDoc(admin.uid, { email: admin.email, isAdmin: true });
    const res = await capturePayment(
      jsonRequest("/api/capture-payment", { token: admin.idToken, body: { paymentIntentId: "pi_ok", amountToCapture: 80 } })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ paymentIntentId: "pi_test", status: "succeeded", amountCaptured: 80 });
    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith("pi_ok", { amount_to_capture: 8000 });
  });
});

describe("POST /api/send-devis", () => {
  // Lot 0.2 : la route n'exige aujourd'hui aucune authentification (elle envoie
  // des emails à une adresse fournie par l'appelant). Test attendu = 401 ;
  // it.fails tant que le lot 0.2 n'est pas livré. Ce it.fails sera remplacé par
  // une assertion explicite (401 + aucun email envoyé) au lot 0.2.
  it.fails("sans jeton -> 401 (lot 0.2)", async () => {
    const res = await sendDevis(
      jsonRequest("/api/send-devis", { body: { email: "victime@test.dev", name: "X", reservationId: "R1" } })
    );
    expect(res.status).toBe(401);
  });
});
