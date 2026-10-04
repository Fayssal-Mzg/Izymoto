// Lot 0.2, aller-retour 1/2 : correctifs suite au BLOQUANT sécurité.
// hybride (un PI = une course), clientToken, liste blanche, metadata PaymentIntent,
// retrait de membre, URL de base (jamais l'en-tête Origin).
import { beforeEach, describe, expect, it, vi } from "vitest";

const stripeMock = vi.hoisted(() => ({
  paymentIntents: { create: vi.fn(), retrieve: vi.fn(), cancel: vi.fn() },
  checkout: { sessions: { create: vi.fn() } },
}));
const emailSend = vi.hoisted(() => vi.fn());

vi.mock("@/lib/stripe-server", () => ({ stripe: stripeMock }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: emailSend };
  },
}));

import { POST as createCheckout } from "@/app/api/wallet/create-checkout/route";
import { POST as debitForBooking } from "@/app/api/wallet/debit-for-booking/route";
import { POST as finalizeHybrid } from "@/app/api/wallet/finalize-hybrid-booking/route";
import { POST as createPaymentIntent } from "@/app/api/create-payment-intent/route";
import { POST as companyInvite } from "@/app/api/company/invite/route";
import { POST as companyMemberRemove } from "@/app/api/company/member/remove/route";
import { getAdminFirestore } from "@/lib/firebase/admin-server";
import {
  createAuthUser,
  jsonRequest,
  resetEmulators,
  seedUserDoc,
  piCreatedNow,
  rideMeta,
  validRide,
  VALID_RIDE_TOTAL_CENTS,
  type TestUser,
} from "./helpers";

const db = () => getAdminFirestore();
// Lot 0.3 : prix recalculé par le serveur (Paris -> Orly = 76 €) ; les montants des corps sont ignorés.
const bookingBase = validRide();
const TOTAL = VALID_RIDE_TOTAL_CENTS; // 7600
const WALLET_PART = 2000;
const CARD_PART = TOTAL - WALLET_PART; // 5600

async function seedWallet(uid: string, balanceCents: number) {
  await db().collection("wallets").doc(uid).set({ userId: uid, balanceCents, cumulativeRechargedCents: balanceCents, currency: "EUR" });
}
async function balanceOf(uid: string) {
  return (await db().collection("wallets").doc(uid).get()).data()?.balanceCents;
}
async function countDocs(col: string) {
  return (await db().collection(col).get()).size;
}
async function seedCompany(
  companyId: string,
  balanceCents: number,
  members: Array<{ user: TestUser; role: "owner" | "member" }>
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
      uid: m.user.uid, email: m.user.email, displayName: null, role: m.role, status: "active",
      monthlyBudgetCents: 0, spentThisPeriodCents: 0, budgetPeriodKey: "1970-01",
    });
    await seedUserDoc(m.user.uid, { email: m.user.email, companyId, companyRole: m.role });
  }
}
// Metadata telle que posée par create-payment-intent : hybride 2000 (wallet) + 5600 (CB) = total serveur 7600.
const hybridMeta = (uid: string, over: Record<string, string> = {}) => ({
  userId: uid, paymentMode: "hybrid", walletAmountCents: String(WALLET_PART), totalAmountCents: String(TOTAL), ...rideMeta(bookingBase), ...over,
});
// walletAmountCents / cardAmountCents du corps sont arbitraires : le serveur les ignore.
const hybridBody = (paymentIntentId: string, clientToken: string) => ({
  paymentIntentId, walletAmountCents: 1, cardAmountCents: 1, clientToken, bookingData: bookingBase,
});

let n = 0;
const uniqueEmail = (p: string) => `${p}-${++n}@test.dev`;

beforeEach(async () => {
  await resetEmulators();
  emailSend.mockReset().mockResolvedValue({ data: { id: "email_test" }, error: null });
  for (const fn of [stripeMock.paymentIntents.create, stripeMock.paymentIntents.retrieve, stripeMock.paymentIntents.cancel, stripeMock.checkout.sessions.create]) fn.mockReset();
  stripeMock.paymentIntents.create.mockResolvedValue({ id: "pi_new", client_secret: "cs_x" });
  stripeMock.paymentIntents.cancel.mockResolvedValue({ id: "pi_x", status: "canceled" });
  stripeMock.checkout.sessions.create.mockResolvedValue({ id: "cs_1", url: "https://stripe.test/c" });
});

describe("finalize-hybrid-booking : cohérence du PaymentIntent et idempotence par PI", () => {
  const call = (token: string, body: unknown) =>
    finalizeHybrid(jsonRequest("/api/wallet/finalize-hybrid-booking", { token, body }));

  async function expectNoEffect(uid: string) {
    expect(await balanceOf(uid)).toBe(10000);
    expect(await countDocs("bookings")).toBe(0);
    expect(await countDocs("walletTransactions")).toBe(0);
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
  }

  it("paymentMode != hybrid -> 409, aucun débit, cancel non appelé", async () => {
    const u = await createAuthUser(uniqueEmail("h-mode"));
    await seedWallet(u.uid, 10000);
    stripeMock.paymentIntents.retrieve.mockResolvedValue({ id: "pi_card", status: "requires_capture", created: piCreatedNow(), amount: CARD_PART, metadata: hybridMeta(u.uid, { paymentMode: "card" }) });
    expect((await call(u.idToken, hybridBody("pi_card", "tok-m"))).status).toBe(409);
    await expectNoEffect(u.uid);
  });

  // Le corps est ignoré : l'incohérence porte sur les métadonnées serveur du PI (part wallet
  // 500 + CB 5600 = 6100) face au total recalculé par le serveur (7600). Aucun débit, aucune
  // course ; l'empreinte devenue invalide est libérée (cancel appelé une fois).
  it("parts du PI (metadata) ≠ total serveur -> 409 PRICE_CHANGED, aucun débit, empreinte libérée", async () => {
    const u = await createAuthUser(uniqueEmail("h-wal"));
    await seedWallet(u.uid, 10000);
    stripeMock.paymentIntents.retrieve.mockResolvedValue({ id: "pi_w", status: "requires_capture", created: piCreatedNow(), amount: CARD_PART, metadata: hybridMeta(u.uid, { walletAmountCents: "500", totalAmountCents: String(500 + CARD_PART) }) });
    const res = await call(u.idToken, hybridBody("pi_w", "tok-w"));
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("PRICE_CHANGED");
    expect(await balanceOf(u.uid)).toBe(10000);
    expect(await countDocs("bookings")).toBe(0);
    expect(await countDocs("walletTransactions")).toBe(0);
    expect(stripeMock.paymentIntents.cancel).toHaveBeenCalledWith("pi_w");
  });

  it("totalAmountCents incohérent -> 409, aucun débit", async () => {
    const u = await createAuthUser(uniqueEmail("h-tot"));
    await seedWallet(u.uid, 10000);
    stripeMock.paymentIntents.retrieve.mockResolvedValue({ id: "pi_t", status: "requires_capture", created: piCreatedNow(), amount: CARD_PART, metadata: hybridMeta(u.uid, { totalAmountCents: "9999" }) });
    expect((await call(u.idToken, hybridBody("pi_t", "tok-t"))).status).toBe(409);
    await expectNoEffect(u.uid);
  });

  it("même PI avec deux clientToken différents -> une seule course, un seul débit", async () => {
    const u = await createAuthUser(uniqueEmail("h-reuse"));
    await seedWallet(u.uid, 10000);
    stripeMock.paymentIntents.retrieve.mockResolvedValue({ id: "pi_once", status: "requires_capture", created: piCreatedNow(), amount: CARD_PART, metadata: hybridMeta(u.uid) });
    const r1 = await call(u.idToken, hybridBody("pi_once", "tok-a"));
    const r2 = await call(u.idToken, hybridBody("pi_once", "tok-b"));
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect((await r2.json()).bookingId).toBe((await r1.json()).bookingId);
    expect(await balanceOf(u.uid)).toBe(8000);
    expect(await countDocs("bookings")).toBe(1);
    expect(await countDocs("walletTransactions")).toBe(1);
    expect((await db().collection("walletTransactions").doc("hybrid_pi_once").get()).exists).toBe(true);
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
  });

  it("ledger hybride déjà au nom d'un autre -> 409, PI non annulé, aucune divulgation", async () => {
    const other = await createAuthUser(uniqueEmail("h-other"));
    const u = await createAuthUser(uniqueEmail("h-me"));
    await seedWallet(u.uid, 10000);
    await db().collection("walletTransactions").doc("hybrid_pi_shared").set({
      userId: other.uid, type: "debit", amountCents: 2000, balanceAfterCents: 424242, bookingId: "BK-SECRET", reservationId: "CMD-SECRET",
    });
    stripeMock.paymentIntents.retrieve.mockResolvedValue({ id: "pi_shared", status: "requires_capture", created: piCreatedNow(), amount: CARD_PART, metadata: hybridMeta(u.uid) });
    const res = await call(u.idToken, hybridBody("pi_shared", "tok-z"));
    expect(res.status).toBe(409);
    const text = await res.text();
    for (const secret of ["BK-SECRET", "CMD-SECRET", "424242"]) expect(text).not.toContain(secret);
    expect(await balanceOf(u.uid)).toBe(10000);
    expect(await countDocs("bookings")).toBe(0);
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
  });
});

describe("debit-for-booking : clientToken, ledger étranger, liste blanche", () => {
  const call = (token: string, body: Record<string, unknown>) =>
    debitForBooking(jsonRequest("/api/wallet/debit-for-booking", { token, body }));

  it.each(["hybrid_abc", "a/b", "a b", "x".repeat(101), "..", "tok.1"])("clientToken invalide %j -> 400, aucun effet", async (tok) => {
    const u = await createAuthUser(uniqueEmail("tok"));
    await seedWallet(u.uid, 10000);
    const res = await call(u.idToken, { amountCents: 3000, clientToken: tok, bookingData: bookingBase });
    expect(res.status).toBe(400);
    expect(await balanceOf(u.uid)).toBe(10000);
    expect(await countDocs("bookings")).toBe(0);
    expect(await countDocs("walletTransactions")).toBe(0);
  });

  it("clientToken valide (UUID, tirets, underscores) accepté", async () => {
    const u = await createAuthUser(uniqueEmail("tok-ok"));
    await seedWallet(u.uid, 10000);
    const res = await call(u.idToken, { amountCents: 3000, clientToken: "123e4567-e89b-12d3_a456-426614174000", bookingData: bookingBase });
    expect(res.status).toBe(200);
  });

  it("ledger existant d'un autre utilisateur -> 409 sans bookingId/solde, aucun débit", async () => {
    const victim = await createAuthUser(uniqueEmail("led-victim"));
    const u = await createAuthUser(uniqueEmail("led-me"));
    await seedWallet(u.uid, 10000);
    await db().collection("walletTransactions").doc("tok-pris").set({
      userId: victim.uid, type: "debit", amountCents: 1000, balanceAfterCents: 777777, bookingId: "BK-SECRET", reservationId: "CMD-SECRET",
    });
    const res = await call(u.idToken, { amountCents: 3000, clientToken: "tok-pris", bookingData: bookingBase });
    expect(res.status).toBe(409);
    const text = await res.text();
    for (const secret of ["BK-SECRET", "CMD-SECRET", "777777"]) expect(text).not.toContain(secret);
    expect(await balanceOf(u.uid)).toBe(10000);
    expect(await countDocs("bookings")).toBe(0);
  });

  it("liste blanche : champs inconnus ignorés ; email = jeton ; prix = total serveur", async () => {
    const u = await createAuthUser("wl@test.dev");
    await seedWallet(u.uid, 10000);
    const res = await call(u.idToken, {
      amountCents: 4200,
      clientToken: "tok-wl",
      bookingData: validRide({
        depart: "Gare de Lyon, 75012 Paris", arrivee: "Aéroport d'Orly, 94390 Orly",
        prix: 1, email: "autre@test.dev", paymentId: "pi_fake", amountAuthorized: 9999,
        amountCaptured: 9999, status: "completed", isPaid: false, paymentStatus: "x", paymentMethod: "card", reservationId: "FAKE",
        walletAmountCents: 1, rating: 5, internalFlag: true,
      }),
    });
    expect(res.status).toBe(200);
    const b = (await db().collection("bookings").doc((await res.json()).bookingId).get()).data()!;
    expect(b.depart).toBe("Gare de Lyon, 75012 Paris");
    expect(b.arrivee).toBe("Aéroport d'Orly, 94390 Orly");
    expect(b.email).toBe("wl@test.dev");
    expect(b.prix).toBe(76);
    expect(b.status).toBe("awaiting_driver");
    expect(b.paymentMethod).toBe("wallet");
    expect(b.paymentStatus).toBe("paid_wallet");
    expect(b.isPaid).toBe(true);
    expect(b.walletAmountCents).toBe(TOTAL);
    expect(b.reservationId).not.toBe("FAKE");
    for (const k of ["paymentId", "rating", "internalFlag"]) expect(b).not.toHaveProperty(k);
    expect(b.amountAuthorized).toBe(76);
    expect(b.amountCaptured).toBe(76);
  });
});

describe("create-payment-intent : metadata en liste blanche", () => {
  it("intent/tierId/paymentMode/wallet injectés ignorés ; clés serveur posées ; pas de données perso", async () => {
    const u = await createAuthUser(uniqueEmail("pi-wl"));
    const res = await createPaymentIntent(
      jsonRequest("/api/create-payment-intent", {
        token: u.idToken,
        body: {
          amount: 50,
          metadata: {
            ...validRide({ arrivee: "Aéroport Paris-Charles de Gaulle (CDG), 95700 Roissy-en-France", distance: 30 }),
            intent: "wallet_recharge", tierId: "business-enterprise", paymentMode: "hybrid", walletAmountCents: "4999",
            totalAmountCents: "1", userId: "victime", name: "Jean Dupont", phone: "0600000000", notes: "secret", email: "a@b.c",
          },
        },
      })
    );
    expect(res.status).toBe(200);
    const m = stripeMock.paymentIntents.create.mock.calls[0][0].metadata;
    expect(m.intent).toBeUndefined();
    expect(m.tierId).toBeUndefined();
    expect(m.userId).toBe(u.uid);
    expect(m.paymentMode).toBe("card");
    expect(m.walletAmountCents).toBe("0");
    expect(m.totalAmountCents).toBe("9900"); // Paris -> Roissy = 99 € (calcul serveur)
    expect(stripeMock.paymentIntents.create.mock.calls[0][0].amount).toBe(9900);
    for (const k of ["name", "phone", "notes", "email"]) expect(m).not.toHaveProperty(k);
    expect(m.depart).toBe(bookingBase.depart);
    expect(m.distance).toBe("30");
  });

  it("hybride : paymentMode/wallet/total calculés par le serveur", async () => {
    const u = await createAuthUser(uniqueEmail("pi-hyb"));
    await seedWallet(u.uid, 5000);
    const res = await createPaymentIntent(
      jsonRequest("/api/create-payment-intent", {
        token: u.idToken,
        body: { amount: 50, walletAmountCents: WALLET_PART, metadata: { ...bookingBase, paymentMode: "card", walletAmountCents: "0" } },
      })
    );
    expect(res.status).toBe(200);
    const arg = stripeMock.paymentIntents.create.mock.calls[0][0];
    expect(arg.amount).toBe(CARD_PART);
    expect(arg.metadata).toMatchObject({ paymentMode: "hybrid", walletAmountCents: "2000", totalAmountCents: String(TOTAL), userId: u.uid });
  });

  it("erreur Stripe -> message générique, sans error.message", async () => {
    const u = await createAuthUser(uniqueEmail("pi-err"));
    stripeMock.paymentIntents.create.mockRejectedValue(new Error("SECRET_STRIPE_DETAIL sk_live_xxx"));
    const res = await createPaymentIntent(jsonRequest("/api/create-payment-intent", { token: u.idToken, body: { amount: 50, metadata: bookingBase } }));
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain("SECRET_STRIPE_DETAIL");
  });
});

describe("company/member/remove : cohérence du rattachement", () => {
  const remove = (token: string, memberUid: string) =>
    companyMemberRemove(jsonRequest("/api/company/member/remove", { token, body: { memberUid } }));

  it("membre inexistant -> 404", async () => {
    const owner = await createAuthUser(uniqueEmail("rm-owner0"));
    await seedCompany("coA", 0, [{ user: owner, role: "owner" }]);
    expect((await remove(owner.idToken, "uid-inexistant")).status).toBe(404);
  });

  it("membre non actif -> 409 sans effet", async () => {
    const owner = await createAuthUser(uniqueEmail("rm-owner1"));
    const mem = await createAuthUser(uniqueEmail("rm-mem1"));
    await seedCompany("coA", 0, [{ user: owner, role: "owner" }, { user: mem, role: "member" }]);
    await db().collection("companies").doc("coA").collection("members").doc(mem.uid).update({ status: "removed" });
    expect((await remove(owner.idToken, mem.uid)).status).toBe(409);
    expect((await db().collection("users").doc(mem.uid).get()).data()?.companyId).toBe("coA");
    expect((await db().collection("companies").doc("coA").get()).data()?.memberCount).toBe(2);
  });

  it("ancien membre de A désormais dans B, 'retiré' par le propriétaire de A -> 409, B intact", async () => {
    const ownerA = await createAuthUser(uniqueEmail("rm-ownerA"));
    const ownerB = await createAuthUser(uniqueEmail("rm-ownerB"));
    const mover = await createAuthUser(uniqueEmail("rm-mover"));
    await seedCompany("coA", 0, [{ user: ownerA, role: "owner" }, { user: mover, role: "member" }]);
    await seedCompany("coB", 5000, [{ user: ownerB, role: "owner" }]);
    await db().collection("companies").doc("coB").collection("members").doc(mover.uid).set({
      uid: mover.uid, email: mover.email, displayName: null, role: "member", status: "active",
      monthlyBudgetCents: 0, spentThisPeriodCents: 0, budgetPeriodKey: "1970-01",
    });
    await db().collection("users").doc(mover.uid).set({ email: mover.email, companyId: "coB", companyRole: "member" });
    const beforeB = (await db().collection("companies").doc("coB").get()).data()?.memberCount;

    expect((await remove(ownerA.idToken, mover.uid)).status).toBe(409);
    const userDoc = (await db().collection("users").doc(mover.uid).get()).data()!;
    expect(userDoc.companyId).toBe("coB");
    expect(userDoc.companyRole).toBe("member");
    expect((await db().collection("companies").doc("coB").get()).data()?.memberCount).toBe(beforeB);
    expect((await db().collection("companies").doc("coA").get()).data()?.memberCount).toBe(2);
    expect((await db().collection("companies").doc("coA").collection("members").doc(mover.uid).get()).data()?.status).toBe("active");
  });

  it("nominal : le propriétaire retire un membre actif -> 200", async () => {
    const owner = await createAuthUser(uniqueEmail("rm-owner2"));
    const mem = await createAuthUser(uniqueEmail("rm-mem2"));
    await seedCompany("coA", 0, [{ user: owner, role: "owner" }, { user: mem, role: "member" }]);
    expect((await remove(owner.idToken, mem.uid)).status).toBe(200);
    expect((await db().collection("users").doc(mem.uid).get()).data()?.companyId).toBeNull();
  });

  it("un simple membre ne peut pas retirer un collègue -> 403", async () => {
    const owner = await createAuthUser(uniqueEmail("rm-owner3"));
    const m1 = await createAuthUser(uniqueEmail("rm-m1"));
    const m2 = await createAuthUser(uniqueEmail("rm-m2"));
    await seedCompany("coA", 0, [{ user: owner, role: "owner" }, { user: m1, role: "member" }, { user: m2, role: "member" }]);
    expect((await remove(m1.idToken, m2.uid)).status).toBe(403);
    expect((await db().collection("users").doc(m2.uid).get()).data()?.companyId).toBe("coA");
  });
});

describe("URL de base : jamais l'en-tête Origin", () => {
  it("company/invite : lien de l'email sans l'Origin de l'appelant ; companyName échappé", async () => {
    const owner = await createAuthUser(uniqueEmail("inv-owner"));
    await seedCompany("coA", 0, [{ user: owner, role: "owner" }]);
    await db().collection("companies").doc("coA").update({ name: "<script>alert(1)</script>Evil" });
    const res = await companyInvite(
      jsonRequest("/api/company/invite", {
        token: owner.idToken,
        headers: { origin: "https://evil.example" },
        body: { email: "nouveau@test.dev" },
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.inviteUrl).not.toContain("evil.example");
    expect(emailSend).toHaveBeenCalledTimes(1);
    const sent = emailSend.mock.calls[0][0];
    const html = String(sent.html);
    expect(html).not.toContain("evil.example");
    expect(html).toContain(json.inviteUrl);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;Evil");
    expect(sent.to).toEqual(["nouveau@test.dev"]);
  });

  it("wallet/create-checkout : success_url / cancel_url sans l'Origin de l'appelant", async () => {
    const u = await createAuthUser(uniqueEmail("co-origin"));
    const res = await createCheckout(
      jsonRequest("/api/wallet/create-checkout", {
        token: u.idToken,
        headers: { origin: "https://evil.example" },
        body: { tierId: "individual-essai" },
      })
    );
    expect(res.status).toBe(200);
    const arg = stripeMock.checkout.sessions.create.mock.calls[0][0];
    expect(arg.success_url).not.toContain("evil.example");
    expect(arg.cancel_url).not.toContain("evil.example");
    expect(arg.success_url).toMatch(/^https?:\/\//);
  });
});
