// Lot 0.2 : authentification des routes sensibles (jeton Firebase réel de
// l'émulateur, handlers appelés directement, Stripe mocké). Voir aussi
// smoke.test.ts pour send-devis.
import { beforeEach, describe, expect, it, vi } from "vitest";

const stripeMock = vi.hoisted(() => ({
  paymentIntents: {
    create: vi.fn(),
    retrieve: vi.fn(),
    cancel: vi.fn(),
    capture: vi.fn(),
    incrementAuthorization: vi.fn(),
  },
  checkout: { sessions: { create: vi.fn() } },
}));

vi.mock("@/lib/stripe-server", () => ({ stripe: stripeMock }));

import { Timestamp } from "firebase-admin/firestore";
import { POST as createCheckout } from "@/app/api/wallet/create-checkout/route";
import { POST as debitForBooking } from "@/app/api/wallet/debit-for-booking/route";
import { POST as finalizeHybrid } from "@/app/api/wallet/finalize-hybrid-booking/route";
import { POST as createPaymentIntent } from "@/app/api/create-payment-intent/route";
import { POST as incrementAuthorization } from "@/app/api/increment-authorization/route";
import { GET as companyOverview } from "@/app/api/company/overview/route";
import { GET as getInvitationRoute } from "@/app/api/company/invitation/[token]/route";
import { getAdminFirestore } from "@/lib/firebase/admin-server";
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

async function seedWallet(uid: string, balanceCents: number) {
  await db().collection("wallets").doc(uid).set({
    userId: uid,
    balanceCents,
    cumulativeRechargedCents: balanceCents,
    currency: "EUR",
  });
}
async function balanceOf(uid: string) {
  return (await db().collection("wallets").doc(uid).get()).data()?.balanceCents;
}
async function seedCompany(
  companyId: string,
  balanceCents: number,
  members: Array<{ user: TestUser; role: "owner" | "member"; budget?: number }>
) {
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
      uid: m.user.uid,
      email: m.user.email,
      displayName: null,
      role: m.role,
      status: "active",
      monthlyBudgetCents: m.budget ?? 0,
      spentThisPeriodCents: 0,
      budgetPeriodKey: "1970-01",
    });
    await seedUserDoc(m.user.uid, { email: m.user.email, companyId, companyRole: m.role });
  }
}
async function companyBalance(id: string) {
  return (await db().collection("companies").doc(id).get()).data()?.walletBalanceCents;
}
async function countDocs(col: string) {
  return (await db().collection(col).get()).size;
}

// Lot 0.3 : le serveur recalcule le prix à partir de la course (Paris -> Orly = 76 €).
// Tout `amountCents` / `prix` des corps ci-dessous est un montant arbitraire du client : ignoré.
const bookingBase = validRide();
const TOTAL = VALID_RIDE_TOTAL_CENTS; // 7600

beforeEach(async () => {
  await resetEmulators();
  for (const fn of [
    stripeMock.paymentIntents.create,
    stripeMock.paymentIntents.retrieve,
    stripeMock.paymentIntents.cancel,
    stripeMock.paymentIntents.capture,
    stripeMock.paymentIntents.incrementAuthorization,
    stripeMock.checkout.sessions.create,
  ]) {
    fn.mockReset();
  }
  stripeMock.paymentIntents.create.mockResolvedValue({ id: "pi_new", client_secret: "cs_x" });
  stripeMock.paymentIntents.cancel.mockResolvedValue({ id: "pi_x", status: "canceled" });
  stripeMock.paymentIntents.incrementAuthorization.mockResolvedValue({ id: "pi_inc", status: "requires_capture", amount: 9000 });
  stripeMock.checkout.sessions.create.mockResolvedValue({ id: "cs_1", url: "https://stripe.test/c" });
});

function stripeCalls() {
  return (
    stripeMock.paymentIntents.create.mock.calls.length +
    stripeMock.paymentIntents.retrieve.mock.calls.length +
    stripeMock.paymentIntents.cancel.mock.calls.length +
    stripeMock.paymentIntents.capture.mock.calls.length +
    stripeMock.paymentIntents.incrementAuthorization.mock.calls.length +
    stripeMock.checkout.sessions.create.mock.calls.length
  );
}

// ---------------------------------------------------------------- 1. 401
const protectedRoutes: Array<{ name: string; path: string; handler: (r: Request) => Promise<Response>; body: unknown }> = [
  { name: "wallet/create-checkout", path: "/api/wallet/create-checkout", handler: createCheckout, body: { tierId: "individual-essai" } },
  {
    name: "wallet/debit-for-booking",
    path: "/api/wallet/debit-for-booking",
    handler: debitForBooking,
    body: { amountCents: 5000, bookingData: bookingBase, clientToken: "tok-1", userId: "victime" },
  },
  {
    name: "wallet/finalize-hybrid-booking",
    path: "/api/wallet/finalize-hybrid-booking",
    handler: finalizeHybrid,
    body: { paymentIntentId: "pi_x", walletAmountCents: 2000, cardAmountCents: 3000, bookingData: bookingBase, clientToken: "tok-2" },
  },
  { name: "create-payment-intent", path: "/api/create-payment-intent", handler: createPaymentIntent, body: { amount: 50, metadata: { userId: "victime" } } },
];

describe.each(protectedRoutes)("$name : authentification obligatoire", ({ path, handler, body }) => {
  it("sans jeton -> 401, aucun effet de bord", async () => {
    await seedWallet("victime", 10000);
    const res = await handler(jsonRequest(path, { body }));
    expect(res.status).toBe(401);
    expect(stripeCalls()).toBe(0);
    expect(await countDocs("bookings")).toBe(0);
    expect(await countDocs("walletTransactions")).toBe(0);
    expect(await balanceOf("victime")).toBe(10000);
  });

  it("jeton invalide -> 401, aucun effet de bord", async () => {
    await seedWallet("victime", 10000);
    const res = await handler(jsonRequest(path, { body, token: "jeton.invalide.xyz" }));
    expect(res.status).toBe(401);
    expect(stripeCalls()).toBe(0);
    expect(await countDocs("bookings")).toBe(0);
    expect(await countDocs("walletTransactions")).toBe(0);
    expect(await balanceOf("victime")).toBe(10000);
  });
});

// ---------------------------------------------------------------- 2. increment-authorization
describe("POST /api/increment-authorization (requireAdmin)", () => {
  const body = { paymentIntentId: "pi_ok", amount: 90 };

  it("sans jeton -> 401", async () => {
    const res = await incrementAuthorization(jsonRequest("/api/increment-authorization", { body }));
    expect(res.status).toBe(401);
    expect(stripeMock.paymentIntents.incrementAuthorization).not.toHaveBeenCalled();
  });

  it("jeton non admin -> 403", async () => {
    const u = await createAuthUser("simple@test.dev");
    await seedUserDoc(u.uid, { email: u.email, isAdmin: false });
    const res = await incrementAuthorization(jsonRequest("/api/increment-authorization", { body, token: u.idToken }));
    expect(res.status).toBe(403);
    expect(stripeMock.paymentIntents.incrementAuthorization).not.toHaveBeenCalled();
  });

  it("admin -> 200, Stripe (mock) appelé avec le montant en centimes", async () => {
    const a = await createAuthUser("admin@test.dev");
    await seedUserDoc(a.uid, { email: a.email, isAdmin: true });
    const res = await incrementAuthorization(jsonRequest("/api/increment-authorization", { body, token: a.idToken }));
    expect(res.status).toBe(200);
    expect(stripeMock.paymentIntents.incrementAuthorization).toHaveBeenCalledTimes(1);
    expect(stripeMock.paymentIntents.incrementAuthorization).toHaveBeenCalledWith("pi_ok", { amount: 9000 });
  });
});

// ---------------------------------------------------------------- 3. identité injectée
describe("identité injectée ignorée", () => {
  it("debit-for-booking : débite l'appelant, pas la victime ; booking sans identité injectée", async () => {
    const caller = await createAuthUser("caller@test.dev");
    const victim = await createAuthUser("victim@test.dev");
    await seedWallet(caller.uid, 20000);
    await seedWallet(victim.uid, 10000);

    const res = await debitForBooking(
      jsonRequest("/api/wallet/debit-for-booking", {
        token: caller.idToken,
        body: {
          amountCents: 4000,
          clientToken: "tok-inj",
          userId: victim.uid,
          uid: victim.uid,
          companyId: "societe-victime",
          driverId: "chauffeur-x",
          bookingData: {
            ...bookingBase,
            userId: victim.uid,
            uid: victim.uid,
            companyId: "societe-victime",
            driverId: "chauffeur-x",
            driverUid: "chauffeur-x",
            acceptedByUid: "chauffeur-x",
          },
        },
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(await balanceOf(caller.uid)).toBe(20000 - TOTAL);
    expect(await balanceOf(victim.uid)).toBe(10000);
    const booking = (await db().collection("bookings").doc(json.bookingId).get()).data()!;
    expect(booking.userId).toBe(caller.uid);
    for (const k of ["driverId", "driverUid", "acceptedByUid", "companyId", "uid"]) {
      expect(booking).not.toHaveProperty(k);
    }
    const txs = await db().collection("walletTransactions").get();
    expect(txs.size).toBe(1);
    expect(txs.docs[0].data().userId).toBe(caller.uid);
  });

  it("debit-for-booking : solde insuffisant -> 402, rien débité", async () => {
    const caller = await createAuthUser("poor@test.dev");
    await seedWallet(caller.uid, 1000);
    const res = await debitForBooking(
      jsonRequest("/api/wallet/debit-for-booking", {
        token: caller.idToken,
        body: { amountCents: 5000, clientToken: "tok-poor", bookingData: bookingBase },
      })
    );
    expect(res.status).toBe(402);
    expect(await balanceOf(caller.uid)).toBe(1000);
    expect(await countDocs("bookings")).toBe(0);
  });

  it("create-payment-intent : metadata.userId = appelant (corps ignoré)", async () => {
    const caller = await createAuthUser("caller2@test.dev");
    const res = await createPaymentIntent(
      jsonRequest("/api/create-payment-intent", {
        token: caller.idToken,
        body: {
          amount: 50,
          metadata: { ...bookingBase, userId: "victime", UserID: "victime", companyId: "societe-victime", driverId: "d" },
        },
      })
    );
    expect(res.status).toBe(200);
    expect(stripeMock.paymentIntents.create).toHaveBeenCalledTimes(1);
    const arg = stripeMock.paymentIntents.create.mock.calls[0][0];
    expect(arg.metadata.userId).toBe(caller.uid);
    expect(arg.metadata).not.toHaveProperty("UserID");
    expect(arg.metadata).not.toHaveProperty("companyId");
    expect(arg.metadata).not.toHaveProperty("driverId");
    expect(arg.metadata.depart).toBe(bookingBase.depart);
    expect(arg.amount).toBe(TOTAL);
  });

  it("create-checkout : metadata/client_reference_id = appelant ; tierId inconnu -> 400", async () => {
    const caller = await createAuthUser("caller3@test.dev");
    const res = await createCheckout(
      jsonRequest("/api/wallet/create-checkout", {
        token: caller.idToken,
        body: { tierId: "individual-essai", userId: "victime", companyId: "societe-victime" },
      })
    );
    expect(res.status).toBe(200);
    const arg = stripeMock.checkout.sessions.create.mock.calls[0][0];
    expect(arg.client_reference_id).toBe(caller.uid);
    expect(arg.metadata.userId).toBe(caller.uid);
    expect(arg.metadata).not.toHaveProperty("companyId");
    expect(arg.payment_intent_data.metadata.userId).toBe(caller.uid);

    stripeMock.checkout.sessions.create.mockClear();
    const bad = await createCheckout(
      jsonRequest("/api/wallet/create-checkout", { token: caller.idToken, body: { tierId: "inconnu" } })
    );
    expect(bad.status).toBe(400);
    expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("create-checkout : un simple membre ne peut pas faire créditer une société (palier business)", async () => {
    const owner = await createAuthUser("owner-c@test.dev");
    const member = await createAuthUser("member-c@test.dev");
    await seedCompany("coA", 0, [
      { user: owner, role: "owner" },
      { user: member, role: "member" },
    ]);
    const res = await createCheckout(
      jsonRequest("/api/wallet/create-checkout", { token: member.idToken, body: { tierId: "business-tpe", companyId: "coA" } })
    );
    expect(res.status).toBe(200);
    const arg = stripeMock.checkout.sessions.create.mock.calls[0][0];
    expect(arg.metadata).not.toHaveProperty("companyId");
  });

  it("finalize-hybrid : PI de l'appelant -> débit de l'appelant, identité injectée ignorée", async () => {
    const caller = await createAuthUser("hyb@test.dev");
    const victim = await createAuthUser("hybvictim@test.dev");
    await seedWallet(caller.uid, 10000);
    await seedWallet(victim.uid, 10000);
    stripeMock.paymentIntents.retrieve.mockResolvedValue({
      id: "pi_mine",
      status: "requires_capture",
      created: piCreatedNow(),
      amount: TOTAL - 2000,
      metadata: {
        userId: caller.uid,
        paymentMode: "hybrid",
        walletAmountCents: "2000",
        totalAmountCents: String(TOTAL),
        ...rideMeta(bookingBase),
      },
    });
    const res = await finalizeHybrid(
      jsonRequest("/api/wallet/finalize-hybrid-booking", {
        token: caller.idToken,
        body: {
          paymentIntentId: "pi_mine",
          walletAmountCents: 2000,
          cardAmountCents: 3000,
          clientToken: "tok-h",
          userId: victim.uid,
          bookingData: { ...bookingBase, userId: victim.uid, driverId: "d", companyId: "x" },
        },
      })
    );
    expect(res.status).toBe(200);
    expect(await balanceOf(caller.uid)).toBe(8000);
    expect(await balanceOf(victim.uid)).toBe(10000);
    const json = await res.json();
    const booking = (await db().collection("bookings").doc(json.bookingId).get()).data()!;
    expect(booking.userId).toBe(caller.uid);
    expect(booking).not.toHaveProperty("driverId");
    expect(booking).not.toHaveProperty("companyId");
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------- 4. PI d'un autre
describe("finalize-hybrid-booking : PaymentIntent d'un autre utilisateur", () => {
  it("metadata.userId étranger -> 403, aucun débit, cancel NON appelé", async () => {
    const caller = await createAuthUser("thief@test.dev");
    const victim = await createAuthUser("owner-pi@test.dev");
    await seedWallet(caller.uid, 10000);
    await seedWallet(victim.uid, 10000);
    stripeMock.paymentIntents.retrieve.mockResolvedValue({
      id: "pi_victim",
      status: "requires_capture",
      amount: 3000,
      metadata: { userId: victim.uid },
    });

    const res = await finalizeHybrid(
      jsonRequest("/api/wallet/finalize-hybrid-booking", {
        token: caller.idToken,
        body: {
          paymentIntentId: "pi_victim",
          walletAmountCents: 2000,
          cardAmountCents: 3000,
          clientToken: "tok-steal",
          bookingData: bookingBase,
        },
      })
    );
    expect(res.status).toBe(403);
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
    expect(await balanceOf(caller.uid)).toBe(10000);
    expect(await balanceOf(victim.uid)).toBe(10000);
    expect(await countDocs("bookings")).toBe(0);
    expect(await countDocs("walletTransactions")).toBe(0);
  });

  it("PI sans metadata.userId -> 403, cancel NON appelé", async () => {
    const caller = await createAuthUser("thief2@test.dev");
    await seedWallet(caller.uid, 10000);
    stripeMock.paymentIntents.retrieve.mockResolvedValue({
      id: "pi_nometa",
      status: "requires_capture",
      amount: 3000,
      metadata: {},
    });
    const res = await finalizeHybrid(
      jsonRequest("/api/wallet/finalize-hybrid-booking", {
        token: caller.idToken,
        body: {
          paymentIntentId: "pi_nometa",
          walletAmountCents: 2000,
          cardAmountCents: 3000,
          clientToken: "tok-nm",
          bookingData: bookingBase,
        },
      })
    );
    expect(res.status).toBe(403);
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
    expect(await balanceOf(caller.uid)).toBe(10000);
  });
});

// ---------------------------------------------------------------- 5. entreprise
describe("entreprise : cloisonnement et budget", () => {
  it("membre de A : debit-for-booking (companyId=B dans le corps) débite A, jamais B", async () => {
    const ownerA = await createAuthUser("ownerA@test.dev");
    const memA = await createAuthUser("memA@test.dev");
    const ownerB = await createAuthUser("ownerB@test.dev");
    await seedCompany("coA", 20000, [
      { user: ownerA, role: "owner" },
      { user: memA, role: "member" },
    ]);
    await seedCompany("coB", 20000, [{ user: ownerB, role: "owner" }]);

    const res = await debitForBooking(
      jsonRequest("/api/wallet/debit-for-booking", {
        token: memA.idToken,
        body: {
          amountCents: 5000,
          clientToken: "tok-co",
          companyId: "coB",
          bookingData: { ...bookingBase, companyId: "coB", paidBy: "x" },
        },
      })
    );
    expect(res.status).toBe(200);
    expect(await companyBalance("coA")).toBe(20000 - TOTAL);
    expect(await companyBalance("coB")).toBe(20000);
    const json = await res.json();
    const booking = (await db().collection("bookings").doc(json.bookingId).get()).data()!;
    expect(booking.companyId).toBe("coA");
    expect(booking.userId).toBe(memA.uid);
    expect(booking.paidBy).toBe("company");
  });

  it("utilisateur avec users.companyId=B mais sans fiche membre : ne peut pas débiter B", async () => {
    const ownerB = await createAuthUser("ownerB2@test.dev");
    const outsider = await createAuthUser("outsider@test.dev");
    await seedCompany("coB", 20000, [{ user: ownerB, role: "owner" }]);
    await seedUserDoc(outsider.uid, { email: outsider.email, companyId: "coB" });
    const res = await debitForBooking(
      jsonRequest("/api/wallet/debit-for-booking", {
        token: outsider.idToken,
        body: { amountCents: 5000, clientToken: "tok-out", companyId: "coB", bookingData: bookingBase },
      })
    );
    expect([402, 403, 404]).toContain(res.status);
    expect(await companyBalance("coB")).toBe(20000);
    expect(await countDocs("bookings")).toBe(0);
  });

  it("company/overview : sans jeton -> 401 ; un membre de A ne voit que A", async () => {
    const noTok = await companyOverview(jsonRequest("/api/company/overview", { method: "GET" }));
    expect(noTok.status).toBe(401);

    const ownerA = await createAuthUser("ownerA3@test.dev");
    const memA = await createAuthUser("memA3@test.dev");
    const ownerB = await createAuthUser("ownerB3@test.dev");
    await seedCompany("coA", 11100, [
      { user: ownerA, role: "owner" },
      { user: memA, role: "member", budget: 3000 },
    ]);
    await seedCompany("coB", 99900, [{ user: ownerB, role: "owner" }]);

    const res = await companyOverview(
      jsonRequest("/api/company/overview?companyId=coB", { method: "GET", token: memA.idToken })
    );
    expect(res.status).toBe(200);
    const { company } = await res.json();
    expect(company.companyId).toBe("coA");
    expect(company.walletBalanceCents).toBe(11100);
    expect(company.members).toEqual([]);
    expect(company.pendingInvitations).toEqual([]);
    expect(JSON.stringify(company)).not.toContain("ownerB3");
    expect(JSON.stringify(company)).not.toContain("coB");
  });

  it("collaborateur : ne dépasse pas son budget mensuel (402 BUDGET_EXCEEDED, rien débité)", async () => {
    const owner = await createAuthUser("ownerBud@test.dev");
    const mem = await createAuthUser("memBud@test.dev");
    await seedCompany("coA", 50000, [
      { user: owner, role: "owner" },
      { user: mem, role: "member", budget: 10000 },
    ]);
    const call = (tok: string, amount: number) =>
      debitForBooking(
        jsonRequest("/api/wallet/debit-for-booking", {
          token: mem.idToken,
          body: { amountCents: amount, clientToken: tok, bookingData: bookingBase },
        })
      );
    expect((await call("b1", 4000)).status).toBe(200);
    expect(await companyBalance("coA")).toBe(50000 - TOTAL);
    const over = await call("b2", 4000);
    expect(over.status).toBe(402);
    expect((await over.json()).code).toBe("BUDGET_EXCEEDED");
    expect(await companyBalance("coA")).toBe(50000 - TOTAL);
    expect(await countDocs("bookings")).toBe(1);
  });
});

// ---------------------------------------------------------------- 6. idempotence
describe("idempotence debit-for-booking", () => {
  const mk = (token: string, clientToken: string) => () =>
    debitForBooking(
      jsonRequest("/api/wallet/debit-for-booking", {
        token,
        body: { amountCents: 3000, clientToken, bookingData: bookingBase },
      })
    );

  it("double appel avec le même clientToken -> un seul débit, un seul booking", async () => {
    const u = await createAuthUser("idem@test.dev");
    await seedWallet(u.uid, 10000);
    const call = mk(u.idToken, "tok-idem");
    const r1 = await call();
    const r2 = await call();
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    const j1 = await r1.json();
    const j2 = await r2.json();
    expect(j2.bookingId).toBe(j1.bookingId);
    expect(await balanceOf(u.uid)).toBe(10000 - TOTAL);
    expect(await countDocs("bookings")).toBe(1);
    expect(await countDocs("walletTransactions")).toBe(1);
  });

  it("deux appels simultanés avec le même clientToken -> un seul débit", async () => {
    const u = await createAuthUser("idem2@test.dev");
    await seedWallet(u.uid, 10000);
    const call = mk(u.idToken, "tok-par");
    const [a, b] = await Promise.all([call(), call()]);
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(await balanceOf(u.uid)).toBe(10000 - TOTAL);
    expect(await countDocs("bookings")).toBe(1);
  });
});

// ---------------------------------------------------------------- 8. invitation
describe("GET /api/company/invitation/[token] : email masqué", () => {
  it("ne renvoie pas l'email complet de l'invité", async () => {
    const full = "jean.dupont@exemple-societe.fr";
    await db()
      .collection("companyInvitations")
      .doc("tok-inv")
      .set({
        companyId: "coA",
        companyName: "Société A",
        email: full,
        role: "member",
        monthlyBudgetCents: 0,
        status: "pending",
        invitedByUid: "x",
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromMillis(Date.now() + 86400000),
      });

    const res = await getInvitationRoute(jsonRequest("/api/company/invitation/tok-inv", { method: "GET" }), {
      params: { token: "tok-inv" },
    });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain(full);
    expect(text).not.toContain("jean.dupont");
    expect(JSON.parse(text).invitation.email).toBe("j***@exemple-societe.fr");
  });

  it("token inconnu -> 404", async () => {
    const res = await getInvitationRoute(jsonRequest("/api/company/invitation/nope", { method: "GET" }), {
      params: { token: "nope" },
    });
    expect(res.status).toBe(404);
  });
});
