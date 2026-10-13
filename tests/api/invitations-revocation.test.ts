// Lot 0.4 : acceptation d'invitation (email = jeton + vérifié), retrait de membre
// (révocation des sessions), jeton révoqué sur route admin.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Timestamp } from "firebase-admin/firestore";

const stripeMock = vi.hoisted(() => ({
  paymentIntents: { capture: vi.fn(), create: vi.fn(), retrieve: vi.fn(), cancel: vi.fn() },
}));
const emailSend = vi.hoisted(() => vi.fn());

vi.mock("@/lib/stripe-server", () => ({ stripe: stripeMock }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: emailSend };
  },
}));

import { POST as acceptInvitation } from "@/app/api/company/invitation/accept/route";
import { POST as memberRemove } from "@/app/api/company/member/remove/route";
import { GET as companyOverview } from "@/app/api/company/overview/route";
import { POST as debitForBooking } from "@/app/api/wallet/debit-for-booking/route";
import { POST as capturePayment } from "@/app/api/capture-payment/route";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin-server";
import {
  createAuthUser,
  createVerifiedAuthUser,
  jsonRequest,
  markEmailVerified,
  resetEmulators,
  seedUserDoc,
  signInAgain,
  type TestUser,
} from "./helpers";

const db = () => getAdminFirestore();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let n = 0;
const uniqueEmail = (p: string) => `${p}-${++n}@test.dev`;

async function seedCompany(companyId: string, balanceCents: number, owner: TestUser) {
  await db().collection("companies").doc(companyId).set({
    name: `Société ${companyId}`,
    ownerUid: owner.uid,
    walletBalanceCents: balanceCents,
    cumulativeRechargedCents: balanceCents,
    currency: "EUR",
    memberCount: 1,
  });
  await db().collection("companies").doc(companyId).collection("members").doc(owner.uid).set({
    uid: owner.uid, email: owner.email, displayName: null, role: "owner", status: "active",
    monthlyBudgetCents: 0, spentThisPeriodCents: 0, budgetPeriodKey: "1970-01",
  });
  await seedUserDoc(owner.uid, { email: owner.email, companyId, companyRole: "owner" });
}

async function seedInvitation(
  token: string,
  email: string,
  over: Partial<{ status: string; expiresAt: Timestamp; companyId: string }> = {}
) {
  await db().collection("companyInvitations").doc(token).set({
    companyId: over.companyId ?? "coA",
    companyName: "Société coA",
    email,
    role: "member",
    monthlyBudgetCents: 0,
    status: over.status ?? "pending",
    invitedByUid: "owner-uid",
    createdAt: Timestamp.now(),
    expiresAt: over.expiresAt ?? Timestamp.fromMillis(Date.now() + 86400_000),
  });
}

const accept = (token: string, jwt: string) =>
  acceptInvitation(jsonRequest("/api/company/invitation/accept", { token: jwt, body: { token } }));
const inviteDoc = async (token: string) => (await db().collection("companyInvitations").doc(token).get()).data()!;
const memberDoc = async (companyId: string, uid: string) =>
  db().collection("companies").doc(companyId).collection("members").doc(uid).get();
const companyDoc = async (id: string) => (await db().collection("companies").doc(id).get()).data()!;

beforeEach(async () => {
  await resetEmulators();
  emailSend.mockReset().mockResolvedValue({ data: { id: "email_test" }, error: null });
  for (const fn of Object.values(stripeMock.paymentIntents)) fn.mockReset();
  stripeMock.paymentIntents.capture.mockResolvedValue({ id: "pi_test", status: "succeeded", amount_received: 8000 });
});

describe("company/invitation/accept : email du jeton = email de l'invitation ET vérifié", () => {
  it("bon email + vérifié -> 200, membre actif, users.companyId posé, invitation acceptée", async () => {
    const owner = await createAuthUser(uniqueEmail("ac-owner"));
    await seedCompany("coA", 0, owner);
    const u = await createVerifiedAuthUser("collab@test.dev");
    await seedInvitation("tok1", "collab@test.dev");

    const res = await accept("tok1", u.idToken);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, companyId: "coA" });
    const m = (await memberDoc("coA", u.uid)).data();
    expect(m).toMatchObject({ uid: u.uid, role: "member", status: "active" });
    const user = (await db().collection("users").doc(u.uid).get()).data()!;
    expect(user.companyId).toBe("coA");
    expect(user.companyRole).toBe("member");
    expect((await inviteDoc("tok1")).status).toBe("accepted");
    expect((await companyDoc("coA")).memberCount).toBe(2);
  });

  it("email différent (même vérifié) -> 403 EMAIL_MISMATCH, invitation pending, aucune écriture", async () => {
    const owner = await createAuthUser(uniqueEmail("mm-owner"));
    await seedCompany("coA", 0, owner);
    const intrus = await createVerifiedAuthUser("intrus@test.dev");
    await seedInvitation("tok2", "collab@test.dev");

    const res = await accept("tok2", intrus.idToken);
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("EMAIL_MISMATCH");
    expect((await inviteDoc("tok2")).status).toBe("pending");
    expect((await inviteDoc("tok2")).acceptedByUid).toBeUndefined();
    expect((await memberDoc("coA", intrus.uid)).exists).toBe(false);
    expect((await db().collection("users").doc(intrus.uid).get()).exists).toBe(false);
    expect((await companyDoc("coA")).memberCount).toBe(1);
  });

  it("email différent ET non vérifié -> 403 (refus avant écriture)", async () => {
    const owner = await createAuthUser(uniqueEmail("mm2-owner"));
    await seedCompany("coA", 0, owner);
    const intrus = await createAuthUser("intrus2@test.dev");
    await seedInvitation("tok2b", "collab@test.dev");
    const res = await accept("tok2b", intrus.idToken);
    expect(res.status).toBe(403);
    expect((await inviteDoc("tok2b")).status).toBe("pending");
    expect((await memberDoc("coA", intrus.uid)).exists).toBe(false);
  });

  it("casse / espaces différents mais même adresse -> accepté", async () => {
    const owner = await createAuthUser(uniqueEmail("case-owner"));
    await seedCompany("coA", 0, owner);
    const u = await createVerifiedAuthUser("casse@test.dev");
    await seedInvitation("tok3", "  CaSSe@Test.DEV ");
    const res = await accept("tok3", u.idToken);
    expect(res.status).toBe(200);
    expect((await memberDoc("coA", u.uid)).data()?.status).toBe("active");
    expect((await inviteDoc("tok3")).status).toBe("accepted");
  });

  it("casse différente côté compte Auth (email du jeton en majuscules) -> accepté", async () => {
    const owner = await createAuthUser(uniqueEmail("case2-owner"));
    await seedCompany("coA", 0, owner);
    const u = await createVerifiedAuthUser("Mixed.Case@Test.dev");
    await seedInvitation("tok3b", "mixed.case@test.dev");
    expect((await accept("tok3b", u.idToken)).status).toBe(200);
  });

  it("bon email NON vérifié -> 403 EMAIL_NOT_VERIFIED, invitation pending, aucune écriture", async () => {
    const owner = await createAuthUser(uniqueEmail("nv-owner"));
    await seedCompany("coA", 0, owner);
    const u = await createAuthUser("nonverif@test.dev");
    await seedInvitation("tok4", "nonverif@test.dev");

    const res = await accept("tok4", u.idToken);
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("EMAIL_NOT_VERIFIED");
    expect((await inviteDoc("tok4")).status).toBe("pending");
    expect((await memberDoc("coA", u.uid)).exists).toBe(false);
    expect((await db().collection("users").doc(u.uid).get()).exists).toBe(false);
    expect((await companyDoc("coA")).memberCount).toBe(1);
  });

  it("après vérification de l'email + nouveau jeton -> accepté", async () => {
    const owner = await createAuthUser(uniqueEmail("nv2-owner"));
    await seedCompany("coA", 0, owner);
    const u = await createAuthUser("later@test.dev");
    await seedInvitation("tok4b", "later@test.dev");
    expect((await accept("tok4b", u.idToken)).status).toBe(403);
    await markEmailVerified(u.uid);
    const fresh = await signInAgain("later@test.dev");
    expect((await accept("tok4b", fresh.idToken)).status).toBe(200);
  });

  it("sans jeton -> 401 ; invitation inexistante -> refus 4xx", async () => {
    const res = await acceptInvitation(jsonRequest("/api/company/invitation/accept", { body: { token: "x" } }));
    expect(res.status).toBe(401);
    const u = await createVerifiedAuthUser("ghost@test.dev");
    const r2 = await accept("inexistante", u.idToken);
    expect(r2.status).toBeGreaterThanOrEqual(400);
    expect(r2.status).toBeLessThan(500);
  });

  it("invitation expirée -> 403, aucune écriture", async () => {
    const owner = await createAuthUser(uniqueEmail("exp-owner"));
    await seedCompany("coA", 0, owner);
    const u = await createVerifiedAuthUser("exp@test.dev");
    await seedInvitation("tok5", "exp@test.dev", { expiresAt: Timestamp.fromMillis(Date.now() - 1000) });
    const res = await accept("tok5", u.idToken);
    expect(res.status).toBe(403);
    expect((await inviteDoc("tok5")).status).toBe("pending");
    expect((await memberDoc("coA", u.uid)).exists).toBe(false);
  });

  it("invitation déjà acceptée -> 409, pas de second rattachement", async () => {
    const owner = await createAuthUser(uniqueEmail("dej-owner"));
    await seedCompany("coA", 0, owner);
    const u = await createVerifiedAuthUser("dej@test.dev");
    await seedInvitation("tok6", "dej@test.dev", { status: "accepted" });
    const res = await accept("tok6", u.idToken);
    expect(res.status).toBe(409);
    expect((await memberDoc("coA", u.uid)).exists).toBe(false);
    expect((await companyDoc("coA")).memberCount).toBe(1);
  });

  it("invitation révoquée -> 409, aucun rattachement", async () => {
    const owner = await createAuthUser(uniqueEmail("rev-owner"));
    await seedCompany("coA", 0, owner);
    const u = await createVerifiedAuthUser("rev@test.dev");
    await seedInvitation("tok7", "rev@test.dev", { status: "revoked" });
    const res = await accept("tok7", u.idToken);
    expect(res.status).toBe(409);
    expect((await memberDoc("coA", u.uid)).exists).toBe(false);
    expect((await db().collection("users").doc(u.uid).get()).exists).toBe(false);
  });

  it("utilisateur déjà membre d'une société -> 409, invitation pending", async () => {
    const owner = await createAuthUser(uniqueEmail("already-owner"));
    await seedCompany("coA", 0, owner);
    const u = await createVerifiedAuthUser("already@test.dev");
    await seedUserDoc(u.uid, { email: u.email, companyId: "coZ", companyRole: "member" });
    await seedInvitation("tok7b", "already@test.dev");
    expect((await accept("tok7b", u.idToken)).status).toBe(409);
    expect((await inviteDoc("tok7b")).status).toBe("pending");
  });

  it("double acceptation concurrente -> un seul membre, memberCount +1 une seule fois", async () => {
    const owner = await createAuthUser(uniqueEmail("conc-owner"));
    await seedCompany("coA", 0, owner);
    const u = await createVerifiedAuthUser("conc@test.dev");
    await seedInvitation("tok8", "conc@test.dev");

    const results = await Promise.all([accept("tok8", u.idToken), accept("tok8", u.idToken), accept("tok8", u.idToken)]);
    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 200)).toHaveLength(1);
    expect(statuses.filter((s) => s !== 200).every((s) => s === 409)).toBe(true);
    const members = await db().collection("companies").doc("coA").collection("members").get();
    expect(members.size).toBe(2); // propriétaire + un seul collaborateur
    expect((await companyDoc("coA")).memberCount).toBe(2);
    expect((await inviteDoc("tok8")).status).toBe("accepted");
  });

  it("deux comptes concurrents sur la même invitation : seul le bon email passe", async () => {
    const owner = await createAuthUser(uniqueEmail("conc2-owner"));
    await seedCompany("coA", 0, owner);
    const good = await createVerifiedAuthUser("good@test.dev");
    const bad = await createVerifiedAuthUser("bad@test.dev");
    await seedInvitation("tok9", "good@test.dev");
    const [rg, rb] = await Promise.all([accept("tok9", good.idToken), accept("tok9", bad.idToken)]);
    expect(rg.status).toBe(200);
    expect(rb.status).toBeGreaterThanOrEqual(400);
    expect((await memberDoc("coA", bad.uid)).exists).toBe(false);
    expect((await companyDoc("coA")).memberCount).toBe(2);
  });
});

describe("company/member/remove : révocation des sessions du membre retiré", () => {
  async function setup() {
    const owner = await createAuthUser(uniqueEmail("rv-owner"));
    const mem = await createAuthUser(uniqueEmail("rv-mem"));
    await seedCompany("coA", 10000, owner);
    await db().collection("companies").doc("coA").collection("members").doc(mem.uid).set({
      uid: mem.uid, email: mem.email, displayName: null, role: "member", status: "active",
      monthlyBudgetCents: 0, spentThisPeriodCents: 0, budgetPeriodKey: "1970-01",
    });
    await seedUserDoc(mem.uid, { email: mem.email, companyId: "coA", companyRole: "member" });
    await db().collection("companies").doc("coA").update({ memberCount: 2 });
    return { owner, mem };
  }
  const remove = (token: string, memberUid: string) =>
    memberRemove(jsonRequest("/api/company/member/remove", { token, body: { memberUid } }));
  const overview = (token: string) =>
    companyOverview(jsonRequest("/api/company/overview", { method: "GET", token }));
  const debit = (token: string, clientToken: string) =>
    debitForBooking(
      jsonRequest("/api/wallet/debit-for-booking", {
        token,
        body: { amountCents: 2000, clientToken, bookingData: { depart: "A", arrivee: "B" } },
      })
    );

  it("avant retrait : le jeton du membre est accepté (témoin)", async () => {
    const { mem } = await setup();
    expect((await overview(mem.idToken)).status).toBe(200);
  });

  it("l'émulateur Auth supporte la révocation : validSince posé, verifyIdToken(checkRevoked) rejette", async () => {
    const { owner, mem } = await setup();
    await sleep(1100);
    expect((await remove(owner.idToken, mem.uid)).status).toBe(200);
    const rec = await getAdminAuth().getUser(mem.uid);
    expect(rec.tokensValidAfterTime).toBeTruthy();
    await expect(getAdminAuth().verifyIdToken(mem.idToken, true)).rejects.toMatchObject({
      code: "auth/id-token-revoked",
    });
    // Remarque : en mode émulateur le SDK admin vérifie la révocation même sans
    // checkRevoked ; ces tests ne prouvent donc pas à eux seuls que le « true »
    // de requireAuth est nécessaire en production (voir rapport).
  });

  it("ancien jeton du membre retiré -> 401 sur company/overview et wallet/debit-for-booking, aucun débit", async () => {
    const { owner, mem } = await setup();
    await sleep(1100); // validSince est à la seconde : le jeton doit lui être antérieur
    expect((await remove(owner.idToken, mem.uid)).status).toBe(200);

    expect((await overview(mem.idToken)).status).toBe(401);
    expect((await debit(mem.idToken, "rv-old")).status).toBe(401);
    expect((await companyDoc("coA")).walletBalanceCents).toBe(10000);
    expect((await db().collection("bookings").get()).size).toBe(0);
  });

  it("nouveau jeton après retrait : plus de société, ne débite pas la société", async () => {
    const { owner, mem } = await setup();
    await sleep(1100);
    expect((await remove(owner.idToken, mem.uid)).status).toBe(200);
    await sleep(1100);
    const fresh = await signInAgain(mem.email);

    const ov = await overview(fresh.idToken);
    expect(ov.status).toBe(200);
    expect((await ov.json()).company).toBeNull();

    const res = await debit(fresh.idToken, "rv-new");
    expect(res.status).not.toBe(200); // pas de wallet perso -> refus
    expect((await companyDoc("coA")).walletBalanceCents).toBe(10000);
    expect((await db().collection("bookings").get()).size).toBe(0);
    expect((await db().collection("users").doc(mem.uid).get()).data()?.companyId).toBeNull();
    expect((await memberDoc("coA", mem.uid)).data()?.status).not.toBe("active");
    expect((await companyDoc("coA")).memberCount).toBe(1);
  });

  it("le propriétaire n'est pas déconnecté par le retrait d'un membre", async () => {
    const { owner, mem } = await setup();
    await sleep(1100);
    expect((await remove(owner.idToken, mem.uid)).status).toBe(200);
    expect((await overview(owner.idToken)).status).toBe(200);
  });

  it("retrait refusé (simple membre) -> aucune révocation de la cible", async () => {
    const { mem } = await setup();
    const m2 = await createAuthUser(uniqueEmail("rv-m2"));
    await db().collection("companies").doc("coA").collection("members").doc(m2.uid).set({
      uid: m2.uid, email: m2.email, displayName: null, role: "member", status: "active",
      monthlyBudgetCents: 0, spentThisPeriodCents: 0, budgetPeriodKey: "1970-01",
    });
    await seedUserDoc(m2.uid, { email: m2.email, companyId: "coA", companyRole: "member" });
    await sleep(1100);
    expect((await remove(mem.idToken, m2.uid)).status).toBe(403);
    expect((await overview(m2.idToken)).status).toBe(200);
  });
});

describe("jeton révoqué sur une route admin", () => {
  it("capture-payment : jeton admin révoqué -> 401, Stripe non appelé ; nouveau jeton -> 200", async () => {
    const admin = await createAuthUser("admin-rev@test.dev");
    await seedUserDoc(admin.uid, { email: admin.email, isAdmin: true });
    const call = (token: string) =>
      capturePayment(jsonRequest("/api/capture-payment", { token, body: { paymentIntentId: "pi_ok", amountToCapture: 80 } }));

    expect((await call(admin.idToken)).status).toBe(200);
    stripeMock.paymentIntents.capture.mockClear();

    await sleep(1100);
    await getAdminAuth().revokeRefreshTokens(admin.uid);
    expect((await call(admin.idToken)).status).toBe(401);
    expect(stripeMock.paymentIntents.capture).not.toHaveBeenCalled();

    await sleep(1100);
    const fresh = await signInAgain(admin.email);
    expect((await call(fresh.idToken)).status).toBe(200);
  });
});
