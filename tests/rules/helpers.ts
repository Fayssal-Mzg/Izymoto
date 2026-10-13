import { readFileSync } from "node:fs";
import path from "node:path";
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
  type RulesTestContext,
} from "@firebase/rules-unit-testing";

export const PROJECT_ID = "demo-izymoto";

// serverTimestamp() du SDK client : les règles exigent `== request.time` (devis, transitions de course).
export const ts = () => firebase.firestore.FieldValue.serverTimestamp();

// UIDs fixes des acteurs de test.
export const UID = {
  client: "client1",
  client2: "client2",
  driver: "driverOk",
  driver2: "driverOk2",
  driverPending: "driverPending",
  admin: "admin1",
  ownerA: "ownerA",
  memberA: "memberA",
  ownerB: "ownerB",
  memberB: "memberB",
} as const;

export const COMPANY_A = "companyA";
export const COMPANY_B = "companyB";

export const BOOKING = {
  pool: "bkPool", // awaiting_driver, sans chauffeur
  assigned: "bkAssigned", // assignée à driverOk
  inProgress: "bkInProgress", // en cours, assignée à driverOk
  clientOwn: "bkClientOwn", // course de client1 (pending)
  otherClient: "bkOtherClient", // course de client2 (pending)
  otherDriver: "bkOtherDriver", // assignée à driverOk2
} as const;

export async function createEnv(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(path.resolve(process.cwd(), "firestore.rules"), "utf8"),
    },
  });
}

const now = new Date("2026-10-04T10:00:00Z");

// Données semées en contournant les règles.
export async function seed(env: RulesTestEnvironment): Promise<void> {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();

    const users: Record<string, object> = {
      [UID.client]: { uid: UID.client, email: "client1@test.dev", role: "client", isAdmin: false, phoneNumber: "+33600000001" },
      [UID.client2]: { uid: UID.client2, email: "client2@test.dev", role: "client", isAdmin: false },
      [UID.driver]: { uid: UID.driver, email: "driver@test.dev", role: "driver", isAdmin: false },
      [UID.driver2]: { uid: UID.driver2, email: "driver2@test.dev", role: "driver", isAdmin: false },
      [UID.driverPending]: { uid: UID.driverPending, email: "pending@test.dev", role: "driver", isAdmin: false },
      [UID.admin]: { uid: UID.admin, email: "admin@test.dev", role: "client", isAdmin: true },
      [UID.ownerA]: { uid: UID.ownerA, email: "ownerA@test.dev", role: "client", isAdmin: false, companyId: COMPANY_A, companyRole: "owner" },
      [UID.memberA]: { uid: UID.memberA, email: "memberA@test.dev", role: "client", isAdmin: false, companyId: COMPANY_A, companyRole: "member" },
      [UID.ownerB]: { uid: UID.ownerB, email: "ownerB@test.dev", role: "client", isAdmin: false, companyId: COMPANY_B, companyRole: "owner" },
      [UID.memberB]: { uid: UID.memberB, email: "memberB@test.dev", role: "client", isAdmin: false, companyId: COMPANY_B, companyRole: "member" },
    };
    for (const [id, data] of Object.entries(users)) {
      await db.collection("users").doc(id).set(data);
    }

    const driverBase = {
      firstName: "Test",
      lastName: "Driver",
      phone: "+33600000009",
      bank: { iban: "FR7600000000000000000000000", bic: "TESTFRPP", accountHolder: "Test Driver" },
      documents: {},
      createdAt: now,
      updatedAt: now,
    };
    await db.collection("drivers").doc(UID.driver).set({ ...driverBase, uid: UID.driver, status: "active", availability: "online" });
    await db.collection("drivers").doc(UID.driver2).set({ ...driverBase, uid: UID.driver2, status: "active", availability: "online" });
    await db.collection("drivers").doc(UID.driverPending).set({ ...driverBase, uid: UID.driverPending, status: "pending", availability: "offline" });

    const ride = (extra: object) => ({
      depart: "Paris",
      arrivee: "Orly",
      distance: 18,
      duree: 30,
      prix: 80,
      name: "Passager",
      phone: "+33600000001",
      createdAt: now,
      reservationDate: now,
      ...extra,
    });
    await db.collection("bookings").doc(BOOKING.pool).set(ride({ userId: UID.client, status: "awaiting_driver" }));
    await db.collection("bookings").doc(BOOKING.assigned).set(ride({ userId: UID.client, status: "assigned", driverId: UID.driver }));
    await db.collection("bookings").doc(BOOKING.inProgress).set(ride({ userId: UID.client, status: "in_progress", driverId: UID.driver }));
    await db.collection("bookings").doc(BOOKING.clientOwn).set(ride({ userId: UID.client, status: "pending" }));
    await db.collection("bookings").doc(BOOKING.otherClient).set(ride({ userId: UID.client2, status: "pending" }));
    await db.collection("bookings").doc(BOOKING.otherDriver).set(ride({ userId: UID.client2, status: "assigned", driverId: UID.driver2 }));

    await db.collection("wallets").doc(UID.client).set({ balanceCents: 5000, cumulativeRechargedCents: 5000, currency: "EUR" });
    await db.collection("wallets").doc(UID.client2).set({ balanceCents: 100, cumulativeRechargedCents: 100, currency: "EUR" });
    await db.collection("walletTransactions").doc("tx1").set({ userId: UID.client, type: "recharge", amountCents: 5000, createdAt: now });
    await db.collection("walletTransactions").doc("tx2").set({ userId: UID.client2, type: "recharge", amountCents: 100, createdAt: now });

    for (const [cid, owner, member] of [
      [COMPANY_A, UID.ownerA, UID.memberA],
      [COMPANY_B, UID.ownerB, UID.memberB],
    ] as const) {
      await db.collection("companies").doc(cid).set({ name: cid, ownerUid: owner, walletBalanceCents: 10000, cumulativeRechargedCents: 10000, memberCount: 2 });
      await db.collection("companies").doc(cid).collection("members").doc(owner).set({ uid: owner, role: "owner", status: "active", monthlyBudgetCents: 0, spentThisPeriodCents: 0 });
      await db.collection("companies").doc(cid).collection("members").doc(member).set({ uid: member, role: "member", status: "active", monthlyBudgetCents: 20000, spentThisPeriodCents: 0 });
    }

    await db.collection("companyInvitations").doc("tok1").set({ companyId: COMPANY_A, email: "x@test.dev" });
    await db.collection("factures").doc("f1").set({ bookingId: BOOKING.clientOwn, userId: UID.client, montant: 96 });
  });
}

// Contextes d'acteurs.
export const actors = (env: RulesTestEnvironment) => ({
  anonymous: (): RulesTestContext => env.unauthenticatedContext(),
  client: (): RulesTestContext => env.authenticatedContext(UID.client),
  client2: (): RulesTestContext => env.authenticatedContext(UID.client2),
  driver: (): RulesTestContext => env.authenticatedContext(UID.driver), // validé
  driver2: (): RulesTestContext => env.authenticatedContext(UID.driver2),
  driverPending: (): RulesTestContext => env.authenticatedContext(UID.driverPending), // non validé
  admin: (): RulesTestContext => env.authenticatedContext(UID.admin),
  ownerA: (): RulesTestContext => env.authenticatedContext(UID.ownerA),
  memberA: (): RulesTestContext => env.authenticatedContext(UID.memberA),
  ownerB: (): RulesTestContext => env.authenticatedContext(UID.ownerB),
  memberB: (): RulesTestContext => env.authenticatedContext(UID.memberB),
});
