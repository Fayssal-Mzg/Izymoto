// Tests des règles Firestore d'URGENCE (firestore.rules) — incident 2026-10-05.
//
// Commande (depuis la racine du dépôt) :
//   npx firebase emulators:exec --only firestore,auth --project demo-izymoto "npx vitest run --config docs/incident/tests/vitest.config.mjs"
//
// Émulateur uniquement, projet demo-izymoto. Aucun identifiant réel.
// Partie 1 : parcours légitimes de main (données EXACTES de l'inventaire).
// Partie 3 : attaques (toutes refusées).
import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import {
  PROJECT_EMERGENCY, RULES_EMERGENCY, createEnv, seed, as, UID, BK, EMAIL,
  Timestamp, tsNow, serverTimestamp, deleteField, mainDevisData, mainCardBookingData, mainDriverCreateData,
} from "./helpers.mjs";
import { ATTACKS } from "./attacks.mjs";

let env;
beforeAll(async () => { env = await createEnv(PROJECT_EMERGENCY, RULES_EMERGENCY); });
afterAll(async () => { await env?.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); await seed(env); });

const fs = (uid) => as(env, uid).firestore();
const anonDb = () => env.unauthenticatedContext().firestore();

// Constantes de dispatch.ts
const acceptPatch = (prix = 80) => ({
  driverId: UID.driver, driverAcceptedAt: Timestamp.now(), status: "assigned",
  commissionRate: 0.2,
  platformShareCents: Math.round(prix * 0.2 * 100),
  driverShareCents: Math.round(prix * 100) - Math.round(prix * 0.2 * 100),
  updatedAt: Timestamp.now(),
});

// Rejoue la transaction de dispatch.ts (get booking, get drivers/{uid}, update).
const acceptRideTx = (uid, rideId, prix = 80) => {
  const d = fs(uid);
  return d.runTransaction(async (tx) => {
    const rideRef = d.collection("bookings").doc(rideId);
    const drvRef = d.collection("drivers").doc(uid);
    const r = await tx.get(rideRef);
    await tx.get(drvRef);
    tx.update(rideRef, { ...acceptPatch(prix), driverId: uid });
    return r.data();
  });
};
const txUpdate = (uid, rideId, patch) => {
  const d = fs(uid);
  return d.runTransaction(async (tx) => {
    const ref = d.collection("bookings").doc(rideId);
    await tx.get(ref);
    tx.update(ref, patch);
  });
};

describe("1. Parcours légitimes de main — client", () => {
  it("inscription client (AuthContext.signUp) : uid, email, role, createdAt/lastLogin serverTimestamp, isAdmin:false", async () => {
    await assertSucceeds(fs(UID.newUser).collection("users").doc(UID.newUser).set({
      uid: UID.newUser, email: EMAIL(UID.newUser), role: "client",
      createdAt: serverTimestamp(), lastLogin: serverTimestamp(), isAdmin: false,
    }));
  });
  it("inscription client avec pendingReservation (objet)", async () => {
    await assertSucceeds(fs(UID.newUser).collection("users").doc(UID.newUser).set({
      uid: UID.newUser, email: EMAIL(UID.newUser), role: "client",
      createdAt: serverTimestamp(), lastLogin: serverTimestamp(), isAdmin: false,
      pendingReservation: { depart: "A", arrivee: "B", prix: 50, date: "2026-10-10" },
    }));
  });
  it("inscription Google : displayName, photoURL", async () => {
    await assertSucceeds(fs(UID.newUser).collection("users").doc(UID.newUser).set({
      uid: UID.newUser, email: EMAIL(UID.newUser), displayName: "Jean", photoURL: "https://x/y.png",
      role: "client", createdAt: serverTimestamp(), lastLogin: serverTimestamp(), isAdmin: false,
    }));
  });
  it("inscription Google : photoURL null (user.photoURL peut être null)", async () => {
    await assertSucceeds(fs(UID.newUser).collection("users").doc(UID.newUser).set({
      uid: UID.newUser, email: EMAIL(UID.newUser), displayName: null, photoURL: null,
      role: "client", createdAt: serverTimestamp(), lastLogin: serverTimestamp(), isAdmin: false,
    }));
  });
  it("connexion : get soi puis setDoc merge { lastLogin }", async () => {
    await assertSucceeds(fs(UID.client).collection("users").doc(UID.client).get());
    await assertSucceeds(fs(UID.client).collection("users").doc(UID.client).set({ lastLogin: serverTimestamp() }, { merge: true }));
  });
  it("connexion avec pendingReservation", async () => {
    await assertSucceeds(fs(UID.client).collection("users").doc(UID.client).set({ lastLogin: serverTimestamp(), pendingReservation: { a: 1 } }, { merge: true }));
  });
  it("connexion Google : merge { lastLogin, photoURL }", async () => {
    await assertSucceeds(fs(UID.client).collection("users").doc(UID.client).set({ lastLogin: serverTimestamp(), photoURL: "https://x/y.png" }, { merge: true }));
  });
  it("connexion : doc users absent -> création (logIn crée le profil)", async () => {
    await assertSucceeds(fs(UID.newUser).collection("users").doc(UID.newUser).get());
    await assertSucceeds(fs(UID.newUser).collection("users").doc(UID.newUser).set({
      uid: UID.newUser, email: EMAIL(UID.newUser), role: "client", createdAt: serverTimestamp(), lastLogin: serverTimestamp(), isAdmin: false,
    }));
  });
  it("téléphone (AuthContext.updatePhoneNumber) : merge { phoneNumber, phoneVerified:true }", async () => {
    await assertSucceeds(fs(UID.client).collection("users").doc(UID.client).set({ phoneNumber: "+33611223344", phoneVerified: true }, { merge: true }));
  });
  it("téléphone sur un doc users encore inexistant (merge => création partielle)", async () => {
    await assertSucceeds(fs(UID.newUser).collection("users").doc(UID.newUser).set({ phoneNumber: "+33611223344", phoneVerified: true }, { merge: true }));
  });
  it("PaymentModal / paymentService : merge { displayName, phoneNumber }", async () => {
    await assertSucceeds(fs(UID.client).collection("users").doc(UID.client).set({ displayName: "Jean", phoneNumber: "+33611223344" }, { merge: true }));
  });
  it("useUserInformation : update { displayName, phoneNumber, email, updatedAt, lastModified(Date) }", async () => {
    await assertSucceeds(fs(UID.client).collection("users").doc(UID.client).update({
      displayName: "Jean", phoneNumber: "+33611223344", email: "jean@test.dev",
      updatedAt: serverTimestamp(), lastModified: new Date(),
    }));
  });
  it("useUserInformation : création (set avec createdAt, uid)", async () => {
    await assertSucceeds(fs(UID.newUser).collection("users").doc(UID.newUser).set({
      displayName: "Jean", phoneNumber: "+33611223344", email: "jean@test.dev",
      updatedAt: serverTimestamp(), lastModified: new Date(), createdAt: serverTimestamp(), uid: UID.newUser,
    }));
  });
  it("lecture de son users (get) + onSnapshot via get", async () => {
    await assertSucceeds(fs(UID.client).collection("users").doc(UID.client).get());
  });

  it("devis connecté (accountType registered, userId == uid, createdAt Timestamp.now())", async () => {
    await assertSucceeds(fs(UID.client).collection("bookings").add(mainDevisData({ userId: UID.client, accountType: "registered" })));
  });
  it("devis invité NON authentifié (userId guest_xxxxxxxx, accountType guest)", async () => {
    await assertSucceeds(anonDb().collection("bookings").add(mainDevisData({ userId: "guest_k3j9x2ab", accountType: "guest" })));
  });
  it("devis invité : prix 0 (prixFinal || 0) et champs vides", async () => {
    await assertSucceeds(anonDb().collection("bookings").add({
      ...mainDevisData({ userId: "guest_k3j9x2ab", accountType: "guest" }), prix: 0, notes: "", name: "", phone: "",
    }));
  });
  it("devis invité : suffixe aléatoire court (Math.random().toString(36).substring(2,10) peut faire < 8 car.)", async () => {
    await assertSucceeds(anonDb().collection("bookings").add(mainDevisData({ userId: "guest_k3j", accountType: "guest" })));
  });
  it("devis connecté : reservationDate au format Date (non string)", async () => {
    await assertSucceeds(fs(UID.client).collection("bookings").add({
      ...mainDevisData({ userId: UID.client, accountType: "registered" }), reservationDate: new Date("2026-10-10T10:00:00Z"),
    }));
  });

  it("course payée par carte créée par le navigateur (paymentService)", async () => {
    await assertSucceeds(fs(UID.client).collection("bookings").add(mainCardBookingData(UID.client)));
  });
  it("course payée par carte : prioriteReservation true", async () => {
    await assertSucceeds(fs(UID.client).collection("bookings").add({ ...mainCardBookingData(UID.client), prioriteReservation: true }));
  });
  it("course payée par carte : prix décimal (ex. 62.5)", async () => {
    await assertSucceeds(fs(UID.client).collection("bookings").add({ ...mainCardBookingData(UID.client), prix: 62.5, amountAuthorized: 62.5 }));
  });

  it("lecture de ses courses (getUserBookings : where userId == uid orderBy createdAt desc)", async () => {
    await assertSucceeds(fs(UID.client).collection("bookings").where("userId", "==", UID.client).orderBy("createdAt", "desc").get());
  });
  it("lecture d'une de ses courses (get)", async () => {
    await assertSucceeds(fs(UID.client).collection("bookings").doc(BK.clientOwn).get());
  });

  it("portefeuille : lecture de son wallets/{uid}", async () => {
    await assertSucceeds(fs(UID.client).collection("wallets").doc(UID.client).get());
  });
  it("portefeuille : wallet inexistant lisible (get d'un doc absent, utilisateur sans wallet)", async () => {
    await assertSucceeds(fs(UID.newUser).collection("wallets").doc(UID.newUser).get());
  });
  it("portefeuille : transactions (where userId == uid orderBy createdAt desc limit 20)", async () => {
    await assertSucceeds(fs(UID.client).collection("walletTransactions").where("userId", "==", UID.client).orderBy("createdAt", "desc").limit(20).get());
  });
  it("hybride / wallet côté client : aucune écriture ni lecture Firestore client (serveur Admin SDK) — rien à vérifier hors wallets/walletTransactions", async () => {
    await assertSucceeds(fs(UID.client).collection("wallets").doc(UID.client).get());
  });
});

describe("1b. Parcours légitimes de main — espace chauffeur", () => {
  it("inscription chauffeur (signUpAsDriver) : users role:driver", async () => {
    await assertSucceeds(fs(UID.newUser).collection("users").doc(UID.newUser).set({
      uid: UID.newUser, email: EMAIL(UID.newUser), role: "driver", createdAt: serverTimestamp(), lastLogin: serverTimestamp(), isAdmin: false,
    }));
  });
  it("bascule client -> chauffeur (merge { role:driver, updatedAt })", async () => {
    await assertSucceeds(fs(UID.client).collection("users").doc(UID.client).set({ role: "driver", updatedAt: serverTimestamp() }, { merge: true }));
  });
  it("création de la fiche drivers/{uid} pending (createDriverProfile)", async () => {
    await assertSucceeds(fs(UID.newUser).collection("drivers").doc(UID.newUser).set(mainDriverCreateData(UID.newUser)));
  });
  it("createDriverProfile REJOUÉ sur une fiche existante pending (course bootstrap / étape Compte)", async () => {
    await assertSucceeds(fs(UID.driverPending).collection("drivers").doc(UID.driverPending).set(mainDriverCreateData(UID.driverPending)));
  });
  it("lecture de sa fiche (get + snapshot)", async () => {
    await assertSucceeds(fs(UID.driverPending).collection("drivers").doc(UID.driverPending).get());
  });
  it("updateDriverProfile : profil, moto, bank", async () => {
    await assertSucceeds(fs(UID.driverPending).collection("drivers").doc(UID.driverPending).update({
      firstName: "Karim", lastName: "B", phone: "+33600", dateOfBirth: "1990-01-01", address: "1 rue X",
      legalForm: "auto-entrepreneur", companyName: "KB", siret: "12345678901234", vatNumber: "",
      licenseNumber: "L1", licenseDeliveryDate: "2015-01-01",
      moto: { brand: "Yamaha", model: "TMax", year: 2022, plate: "AB-123-CD", color: "noir" },
      bank: { iban: "FR76", bic: "BNPA", accountHolder: "Karim B" },
      updatedAt: serverTimestamp(),
    }));
  });
  it("documents : upload (documents.<kind> avec path drivers/<uid>/…, uploadedAt Timestamp.now())", async () => {
    await assertSucceeds(fs(UID.driverPending).collection("drivers").doc(UID.driverPending).update({
      "documents.identityCard": { url: "https://firebasestorage.googleapis.com/v0/b/demo-izymoto.appspot.com/o/drivers%2Fx?alt=media&token=t", path: `drivers/${UID.driverPending}/identityCard_1_cni.pdf`, filename: "cni.pdf", uploadedAt: Timestamp.now() },
      updatedAt: serverTimestamp(),
    }));
  });
  it("documents : 6 types successifs, puis suppression (null)", async () => {
    const ref = fs(UID.driverPending).collection("drivers").doc(UID.driverPending);
    for (const kind of ["identityCard", "drivingLicense", "vehicleRegistration", "insurance", "rib", "motoPhoto"]) {
      await assertSucceeds(ref.update({
        [`documents.${kind}`]: { url: "https://firebasestorage.googleapis.com/v0/b/demo-izymoto.appspot.com/o/drivers%2Fx?alt=media&token=t", path: `drivers/${UID.driverPending}/${kind}_1_f.pdf`, filename: "f.pdf", uploadedAt: Timestamp.now() },
        updatedAt: serverTimestamp(),
      }));
    }
    await assertSucceeds(ref.update({ "documents.rib": null, updatedAt: serverTimestamp() }));
  });
  it("disponibilité : online / offline (setDriverAvailability)", async () => {
    const ref = fs(UID.driver).collection("drivers").doc(UID.driver);
    await assertSucceeds(ref.update({ availability: "offline", updatedAt: serverTimestamp() }));
    await assertSucceeds(ref.update({ availability: "online", updatedAt: serverTimestamp() }));
  });
  it("lecture du pool (where status == awaiting_driver orderBy createdAt desc)", async () => {
    await assertSucceeds(fs(UID.driver).collection("bookings").where("status", "==", "awaiting_driver").orderBy("createdAt", "desc").get());
  });
  it("lecture de ses courses (where driverId == uid orderBy createdAt desc)", async () => {
    await assertSucceeds(fs(UID.driver).collection("bookings").where("driverId", "==", UID.driver).orderBy("createdAt", "desc").get());
  });
  it("accepter une course (acceptRide : transaction get booking + get driver, update)", async () => {
    await assertSucceeds(acceptRideTx(UID.driver, BK.pool));
  });
  it("accepter une course sans prix (prix absent -> parts 0)", async () => {
    await env.withSecurityRulesDisabled((c) => c.firestore().collection("bookings").doc(BK.pool).update({ prix: deleteField() }));
    await assertSucceeds(acceptRideTx(UID.driver, BK.pool, 0));
  });
  it("démarrer (startRide : assigned -> in_progress)", async () => {
    await assertSucceeds(txUpdate(UID.driver, BK.assigned, { status: "in_progress", driverStartedAt: Timestamp.now(), updatedAt: Timestamp.now() }));
  });
  it("terminer depuis in_progress (completeRide)", async () => {
    await assertSucceeds(txUpdate(UID.driver, BK.inProgress, { status: "completed_by_driver", driverCompletedAt: Timestamp.now(), updatedAt: Timestamp.now() }));
  });
  it("terminer depuis assigned (completeRide)", async () => {
    await assertSucceeds(txUpdate(UID.driver, BK.assigned, { status: "completed_by_driver", driverCompletedAt: Timestamp.now(), updatedAt: Timestamp.now() }));
  });
  it("libérer une course assignée (releaseRide)", async () => {
    await assertSucceeds(txUpdate(UID.driver, BK.assigned, { driverId: null, driverAcceptedAt: null, status: "awaiting_driver", driverReleaseReason: "Imprévu", updatedAt: Timestamp.now() }));
  });
  it("libérer avec raison vide", async () => {
    await assertSucceeds(txUpdate(UID.driver, BK.assigned, { driverId: null, driverAcceptedAt: null, status: "awaiting_driver", driverReleaseReason: "", updatedAt: Timestamp.now() }));
  });
  it("refus : libérer une course déjà démarrée (in_progress) — comme dispatch.ts", async () => {
    await assertFails(txUpdate(UID.driver, BK.inProgress, { driverId: null, driverAcceptedAt: null, status: "awaiting_driver", driverReleaseReason: "x", updatedAt: Timestamp.now() }));
  });
  it("refus : accepter une course déjà assignée (transaction)", async () => {
    await assertFails(acceptRideTx(UID.driver, BK.otherDriver));
  });
});

describe("1c. Parcours légitimes de main — back-office admin", () => {
  it("admin : list bookings / today (createdAt >=) / get", async () => {
    const a = fs(UID.admin).collection("bookings");
    await assertSucceeds(a.orderBy("createdAt", "desc").get());
    await assertSucceeds(a.where("createdAt", ">=", Timestamp.fromDate(new Date("2026-10-01"))).get());
    await assertSucceeds(a.doc(BK.clientOwn).get());
  });
  it("admin : updateBookingStatus { status, updatedAt } / deleteBooking", async () => {
    const a = fs(UID.admin).collection("bookings");
    await assertSucceeds(a.doc(BK.clientOwn).update({ status: "cancelled", updatedAt: Timestamp.now() }));
    await assertSucceeds(a.doc(BK.devis).delete());
  });
  it("admin : users list / get / update isAdmin / delete / set isAdmin sur doc absent", async () => {
    const u = fs(UID.admin).collection("users");
    await assertSucceeds(u.get());
    await assertSucceeds(u.doc(UID.client2).get());
    await assertSucceeds(u.doc(UID.client2).update({ isAdmin: true }));
    await assertSucceeds(u.doc("ghost").set({ isAdmin: true }));
    await assertSucceeds(u.doc(UID.client2).delete());
  });
  it("admin : drivers list (where status orderBy createdAt) / get / approve / reject / suspend / reinstate", async () => {
    const d = fs(UID.admin).collection("drivers");
    await assertSucceeds(d.where("status", "==", "pending").orderBy("createdAt", "desc").get());
    await assertSucceeds(d.orderBy("createdAt", "desc").get());
    await assertSucceeds(d.doc(UID.driverPending).get());
    await assertSucceeds(d.doc(UID.driverPending).update({ status: "active", acceptedAt: Timestamp.now(), rejectionReason: "", updatedAt: serverTimestamp() }));
    await assertSucceeds(d.doc(UID.driverPending).update({ status: "rejected", rejectedAt: Timestamp.now(), rejectionReason: "x", availability: "offline", updatedAt: serverTimestamp() }));
    await assertSucceeds(d.doc(UID.driver).update({ status: "suspended", rejectionReason: "x", availability: "offline", updatedAt: serverTimestamp() }));
    await assertSucceeds(d.doc(UID.driver).update({ status: "active", rejectionReason: "", updatedAt: serverTimestamp() }));
  });
  it("admin : wallets (list/get) et walletTransactions (list par userId orderBy createdAt)", async () => {
    await assertSucceeds(fs(UID.admin).collection("wallets").get());
    await assertSucceeds(fs(UID.admin).collection("wallets").doc(UID.client).get());
    await assertSucceeds(fs(UID.admin).collection("walletTransactions").where("userId", "==", UID.client).orderBy("createdAt", "desc").get());
  });
  it("admin : factures (get where bookingId, add, list orderBy dateGeneration)", async () => {
    const f = fs(UID.admin).collection("factures");
    await assertSucceeds(f.where("bookingId", "==", BK.clientOwn).get());
    await assertSucceeds(f.add({ id: "FAC-2", bookingId: BK.clientOwn, userId: UID.client, clientName: "N", clientEmail: "e@x", montant: 96, dateReservation: new Date(), dateGeneration: new Date(), dateEcheance: new Date(), pdfUrl: "u", statut: "genere" }));
    await assertSucceeds(f.orderBy("dateGeneration", "desc").get());
  });
  it("admin : lit les courses du pool et assignées (pas de blocage)", async () => {
    await assertSucceeds(fs(UID.admin).collection("bookings").doc(BK.otherDriver).get());
  });
});

describe("3. Attaques — TOUTES refusées par les règles d'urgence", () => {
  for (const a of ATTACKS) {
    it(a.name, async () => {
      await assertFails(Promise.resolve().then(() => a.run(env)));
    });
  }
});
