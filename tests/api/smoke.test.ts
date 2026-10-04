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

describe("POST /api/send-devis (jeton FACULTATIF, lot 0.2)", () => {
  const SCRIPT = "<script>alert(1)</script>";
  const LINK = '<a href="https://evil.test">cliquez</a>';
  const sentHtml = () => emailSend.mock.calls.map((c) => String(c[0].html)).join("\n");

  // DÉCISION PROVISOIRE : le parcours devis existe aussi pour un invité (non
  // connecté) ; sans jeton le devis est envoyé à l'adresse saisie. À rediscuter
  // (envoi d'email vers un tiers / relais de spam possible).
  it("(a) sans jeton -> 200, UN seul email, vers contact@izymoto.com avec l'email saisi ; rien à l'adresse saisie", async () => {
    const res = await sendDevis(
      jsonRequest("/api/send-devis", { body: { email: "invite@test.dev", name: "Invité", reservationId: "R1" } })
    );
    expect(res.status).toBe(200);
    expect(emailSend).toHaveBeenCalledTimes(1);
    const sent = emailSend.mock.calls[0][0];
    expect(sent.to).toEqual(["contact@izymoto.com"]);
    expect(String(sent.html)).toContain("invite@test.dev");
    expect(emailSend.mock.calls.flatMap((c) => c[0].to as string[])).not.toContain("invite@test.dev");
  });

  it("sans jeton, email invalide ou manquant -> 400, aucun envoi", async () => {
    for (const email of ["pas-un-email", "", undefined, "a@b", "x@y.z,evil@test.dev", "<b>@x.fr", 42]) {
      const res = await sendDevis(jsonRequest("/api/send-devis", { body: { email, name: "X", reservationId: "R" } }));
      expect(res.status, `email=${JSON.stringify(email)}`).toBe(400);
    }
    expect(emailSend).not.toHaveBeenCalled();
  });

  it("jeton valide mais sans email (compte anonyme) -> 400, aucun envoi", async () => {
    const r0 = await fetch(
      `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ returnSecureToken: true }) }
    );
    const { idToken } = (await r0.json()) as { idToken: string };
    const res = await sendDevis(
      jsonRequest("/api/send-devis", { token: idToken, body: { email: "victime@test.dev", name: "X", reservationId: "R" } })
    );
    expect(res.status).toBe(400);
    expect(emailSend).not.toHaveBeenCalled();
  });

  it("(b) jeton invalide -> 401, aucun envoi", async () => {
    const res = await sendDevis(
      jsonRequest("/api/send-devis", { token: "jeton.invalide", body: { email: "x@test.dev", name: "X", reservationId: "R1" } })
    );
    expect(res.status).toBe(401);
    expect(emailSend).not.toHaveBeenCalled();
  });

  it("(c) jeton valide + email d'un tiers dans le corps -> envoi uniquement à l'email du jeton", async () => {
    const user = await createAuthUser("legit@test.dev");
    const res = await sendDevis(
      jsonRequest("/api/send-devis", { token: user.idToken, body: { email: "victime@test.dev", name: "Legit", reservationId: "R2" } })
    );
    expect(res.status).toBe(200);
    const recipients = emailSend.mock.calls.flatMap((c) => c[0].to as string[]);
    expect(recipients).toContain("legit@test.dev");
    expect(recipients).not.toContain("victime@test.dev");
    // seul autre destinataire admis : la boîte admin interne
    expect(recipients.filter((r) => r !== "legit@test.dev")).toEqual(["contact@izymoto.com"]);
    expect(sentHtml()).not.toContain("victime@test.dev");
  });

  it("(d) valeurs contenant du HTML -> HTML envoyé uniquement échappé", async () => {
    const res = await sendDevis(
      jsonRequest("/api/send-devis", {
        body: {
          email: "invite@test.dev",
          name: SCRIPT,
          notes: LINK,
          depart: SCRIPT,
          arrivee: LINK,
          reservationId: SCRIPT,
          phone: LINK,
          prix: SCRIPT,
          distance: LINK,
        },
      })
    );
    expect(res.status).toBe(200);
    const html = sentHtml();
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<a href");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&lt;a href=&quot;https://evil.test&quot;&gt;cliquez&lt;/a&gt;");
  });

  it("sujet : retours à la ligne neutralisés (pas d'injection d'en-tête)", async () => {
    await sendDevis(
      jsonRequest("/api/send-devis", { body: { email: "invite@test.dev", name: "X", reservationId: "R\r\nBcc: x@evil.test" } })
    );
    expect(emailSend).toHaveBeenCalled();
    for (const c of emailSend.mock.calls) expect(String(c[0].subject)).not.toMatch(/[\r\n]/);
  });
});
