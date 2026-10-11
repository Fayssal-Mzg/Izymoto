import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");

export const PROJECT_EMERGENCY = "demo-izymoto";
export const PROJECT_PROD = "demo-izymoto-prod"; // même émulateur, règles de prod chargées sur un autre projet
// Règles d'urgence déployées le 2026-10-05, archivées : firestore.rules porte désormais celles de la phase 0.
export const RULES_EMERGENCY = path.join(root, "docs/incident/firestore-urgence-2026-10-05.rules");
export const RULES_PROD = path.join(root, "docs/incident/regles-prod-2026-10-05.rules");

// Ce que main écrit : Timestamp.now() (navigateur) ou serverTimestamp().
export const Timestamp = firebase.firestore.Timestamp;
export const serverTimestamp = () => firebase.firestore.FieldValue.serverTimestamp();
export const tsNow = () => Timestamp.now();
export const deleteField = () => firebase.firestore.FieldValue.delete();

export async function createEnv(projectId, rulesPath) {
  return initializeTestEnvironment({
    projectId,
    firestore: { rules: readFileSync(rulesPath, "utf8"), host: "127.0.0.1", port: 8080 },
  });
}

export const UID = {
  client: "client1",
  client2: "client2",
  newUser: "newUser",
  driver: "driverOk",
  driver2: "driverOk2",
  driverPending: "driverPending",
  driverNew: "driverNew",
  admin: "admin1",
};
export const EMAIL = (uid) => `${uid.toLowerCase()}@test.dev`;

export const BK = {
  pool: "bkPool",
  assigned: "bkAssigned",
  inProgress: "bkInProgress",
  clientOwn: "bkClientOwn",
  otherClient: "bkOtherClient",
  otherDriver: "bkOtherDriver",
  devis: "bkDevis",
};

const past = Timestamp.fromDate(new Date("2026-10-04T10:00:00Z"));

const ride = (extra) => ({
  depart: "Paris",
  arrivee: "Orly",
  distance: 18,
  duree: 30,
  prix: 80,
  name: "Passager",
  phone: "+33600000001",
  email: "p@test.dev",
  createdAt: past,
  reservationDate: past,
  dateFormatted: "04/10/2026 à 12:00",
  reservationId: "CMD-ABC12345",
  ...extra,
});

export async function seed(env) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const user = (uid, extra = {}) =>
      db.collection("users").doc(uid).set({ uid, email: EMAIL(uid), role: "client", isAdmin: false, createdAt: past, lastLogin: past, ...extra });
    await user(UID.client, { phoneNumber: "+33600000001" });
    await user(UID.client2);
    await user(UID.driver, { role: "driver" });
    await user(UID.driver2, { role: "driver" });
    await user(UID.driverPending, { role: "driver" });
    await user(UID.driverNew, { role: "driver" });
    await user(UID.admin, { isAdmin: true });

    const driverBase = {
      firstName: "Test", lastName: "Driver", phone: "+33600000009", dateOfBirth: null, address: "",
      legalForm: null, companyName: "", siret: "", vatNumber: "", licenseNumber: "", licenseDeliveryDate: null,
      moto: { brand: "", model: "", year: null, plate: "", color: "" },
      bank: { iban: "FR76", bic: "TEST", accountHolder: "T" },
      documents: {}, acceptedAt: null, rejectedAt: null, rejectionReason: "",
      stats: { totalRides: 0, totalEarningsCents: 0 }, createdAt: past, updatedAt: past,
    };
    const drv = (uid, status, availability) =>
      db.collection("drivers").doc(uid).set({ ...driverBase, uid, email: EMAIL(uid), status, availability });
    await drv(UID.driver, "active", "online");
    await drv(UID.driver2, "active", "online");
    await drv(UID.driverPending, "pending", "offline");

    const bk = (id, extra) => db.collection("bookings").doc(id).set(ride(extra));
    await bk(BK.pool, { userId: UID.client, accountType: "registered", status: "awaiting_driver" });
    await bk(BK.assigned, { userId: UID.client, accountType: "registered", status: "assigned", driverId: UID.driver });
    await bk(BK.inProgress, { userId: UID.client, accountType: "registered", status: "in_progress", driverId: UID.driver });
    await bk(BK.clientOwn, { userId: UID.client, accountType: "registered", status: "confirmed", paymentStatus: "authorized", paymentId: "pi_own", isPaid: false });
    await bk(BK.otherClient, { userId: UID.client2, accountType: "registered", status: "confirmed", paymentStatus: "authorized", paymentId: "pi_other", isPaid: false });
    await bk(BK.otherDriver, { userId: UID.client2, accountType: "registered", status: "assigned", driverId: UID.driver2 });
    await bk(BK.devis, { userId: "guest_abcd1234", accountType: "guest", status: "devis" });

    await db.collection("wallets").doc(UID.client).set({ userId: UID.client, balanceCents: 5000, cumulativeRechargedCents: 5000, currency: "EUR", createdAt: past, updatedAt: past });
    await db.collection("wallets").doc(UID.client2).set({ userId: UID.client2, balanceCents: 100, cumulativeRechargedCents: 100, currency: "EUR", createdAt: past, updatedAt: past });
    await db.collection("walletTransactions").doc("tx1").set({ userId: UID.client, type: "recharge", amountCents: 5000, balanceAfterCents: 5000, description: "r", createdAt: past });
    await db.collection("walletTransactions").doc("tx2").set({ userId: UID.client2, type: "recharge", amountCents: 100, balanceAfterCents: 100, description: "r", createdAt: past });
    await db.collection("factures").doc("f1").set({ id: "FAC-1", bookingId: BK.clientOwn, userId: UID.client, montant: 96, dateGeneration: past });
    await db.collection("companies").doc("co1").set({ name: "Co", ownerUid: UID.client2 });
    await db.collection("companies").doc("co1").collection("members").doc(UID.client2).set({ uid: UID.client2, role: "owner" });
  });
}

// Contexte avec email (les règles comparent request.auth.token.email pour drivers/create).
export const as = (env, uid) => env.authenticatedContext(uid, { email: EMAIL(uid) });

// ---- Données EXACTES écrites par main (cf. inventaire) ----
// useReservation.handleRequestDevis -> saveBooking (bookings.js) : createdAt = Timestamp.now().
export const mainDevisData = ({ userId, accountType }) => ({
  userId,
  accountType,
  depart: "Châtelet, Paris",
  arrivee: "Aéroport Orly",
  distance: 18,
  duree: 30,
  prix: 80,
  prioriteReservation: false,
  status: "devis",
  reservationId: "RES-XYZ12345",
  email: "p@test.dev",
  phone: "+33600000001",
  name: "Passager Test",
  notes: "",
  reservationDate: "2026-10-10T10:00",
  dateFormatted: "10/10/2026 à 10:00",
  createdAt: tsNow(),
});

// paymentService.handleSuccessfulPayment -> saveBooking.
export const mainCardBookingData = (uid) => ({
  userId: uid,
  depart: "Châtelet, Paris",
  arrivee: "Aéroport Orly",
  distance: 18,
  duree: 30,
  prix: 80,
  amountAuthorized: 80,
  name: "Passager Test",
  phone: "+33600000001",
  notes: "",
  prioriteReservation: false,
  paymentId: "pi_3Abc123XYZ",
  reservationId: "CMD-ABCD1234",
  reservationDate: new Date("2026-10-10T10:00:00Z"),
  dateFormatted: "10/10/2026 à 10:00:00",
  status: "confirmed",
  paymentStatus: "authorized",
  createdAt: tsNow(),
  email: EMAIL(uid),
  isPaid: false,
  accountType: "registered",
});

// drivers.ts createDriverProfile : EMPTY_DRIVER + serverTimestamp().
export const mainDriverCreateData = (uid) => ({
  uid,
  email: EMAIL(uid),
  status: "pending",
  availability: "offline",
  firstName: "", lastName: "", phone: "", dateOfBirth: null, address: "",
  legalForm: null, companyName: "", siret: "", vatNumber: "", licenseNumber: "", licenseDeliveryDate: null,
  moto: { brand: "", model: "", year: null, plate: "", color: "" },
  bank: { iban: "", bic: "", accountHolder: "" },
  documents: {},
  acceptedAt: null, rejectedAt: null, rejectionReason: "",
  stats: { totalRides: 0, totalEarningsCents: 0 },
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});
