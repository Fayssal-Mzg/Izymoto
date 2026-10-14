// Lot 0.5 : isolation des données par les règles Firestore (émulateur demo-izymoto).
// Chaque cas a un test « autorisé » (témoin, prouve que le refus vient bien de la règle) et un
// test « refusé ». Les requêtes et clés d'écriture reproduisent celles de l'app :
// lib/firebase/dispatch.ts (pool, accept/start/complete/release), lib/hooks/useReservation.js +
// lib/firebase/bookings.js (devis), AuthContext / useUserInformation (users), drivers.ts.
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { actors, BOOKING, COMPANY_A, COMPANY_B, createEnv, seed, ts, UID } from "./helpers";

let env: RulesTestEnvironment;
let as: ReturnType<typeof actors>;

beforeAll(async () => {
  env = await createEnv();
  as = actors(env);
});
afterAll(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await seed(env);
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.collection("paymentClaims").doc("pc1").set({ userId: UID.client, amountCents: 100 });
    await db.collection("auditLogs").doc("al1").set({ action: "x" });
    // Course au prix à décimales, dans le pool.
    await db.collection("bookings").doc("bkDecimal").set({
      userId: UID.client, status: "awaiting_driver", prix: 79.99, createdAt: new Date(), name: "P", phone: "+33600000001",
    });
    await db.collection("ridePool").doc("bkDecimal").set({
      bookingId: "bkDecimal", departZone: "Paris 1er", arriveeZone: "Paris 2e", createdAt: new Date(), prix: 79.99, driverShareCents: 6399,
    });
  });
});

const poolQuery = (db: any) => db.collection("ridePool").orderBy("createdAt", "desc").get();
const oldPoolQuery = (db: any) =>
  db.collection("bookings").where("status", "==", "awaiting_driver").orderBy("createdAt", "desc").get();

// Mise à jour exacte de dispatch.ts : acceptRide (prix en euros -> centimes).
const acceptFields = (driverId: string, prix = 80) => {
  const platform = Math.round(prix * 0.2 * 100);
  return {
    driverId,
    driverAcceptedAt: ts(),
    status: "assigned",
    commissionRate: 0.2,
    platformShareCents: platform,
    driverShareCents: Math.round(prix * 100) - platform,
    updatedAt: ts(),
  };
};

const devis = (uid: string, extra: object = {}) => ({
  userId: uid,
  accountType: "registered",
  depart: "Paris",
  arrivee: "Orly",
  distance: 18,
  duree: 30,
  prix: 80,
  prioriteReservation: "standard",
  status: "devis",
  reservationId: "DEV-TEST0001",
  email: "c@test.dev",
  phone: "+33600000001",
  name: "Jean",
  notes: "",
  reservationDate: new Date(),
  dateFormatted: "04/10/2026 à 10:00",
  createdAt: ts(),
  ...extra,
});

const setDriver = (patch: object) =>
  env.withSecurityRulesDisabled(async (ctx) => {
    await ctx.firestore().collection("drivers").doc(UID.driver).update(patch);
  });

describe("pool de courses (ridePool, lot 2.1)", () => {
  it("chauffeur validé en service : lit le pool (requête orderBy createdAt desc)", async () => {
    const snap = (await assertSucceeds(poolQuery(as.driver().firestore()))) as { size: number };
    if (snap.size !== 2) throw new Error(`2 courses attendues dans le pool, ${snap.size} reçues`);
  });
  it("chauffeur validé en service : lit une course du pool par id", async () => {
    await assertSucceeds(as.driver().firestore().collection("ridePool").doc(BOOKING.pool).get());
  });
  it("chauffeur validé HORS service (offline) : refusé (requête et id)", async () => {
    await setDriver({ availability: "offline" });
    await assertFails(poolQuery(as.driver().firestore()));
    await assertFails(as.driver().firestore().collection("ridePool").doc(BOOKING.pool).get());
    await setDriver({ availability: "online" });
    await assertSucceeds(poolQuery(as.driver().firestore())); // témoin
  });
  it("chauffeur suspendu : refusé", async () => {
    await setDriver({ status: "suspended" });
    await assertFails(poolQuery(as.driver().firestore()));
    await assertFails(as.driver().firestore().collection("ridePool").doc(BOOKING.pool).get());
  });
  it("chauffeur non validé (pending) : refusé (requête et lecture par id)", async () => {
    await assertFails(poolQuery(as.driverPending().firestore()));
    await assertFails(as.driverPending().firestore().collection("ridePool").doc(BOOKING.pool).get());
  });
  it("client : refusé", async () => {
    await assertFails(poolQuery(as.client2().firestore()));
    await assertFails(as.client().firestore().collection("ridePool").doc(BOOKING.pool).get());
  });
  it("membre / propriétaire d'entreprise : refusé", async () => {
    await assertFails(poolQuery(as.memberA().firestore()));
    await assertFails(poolQuery(as.ownerA().firestore()));
  });
  it("anonyme : refusé", async () => {
    await assertFails(poolQuery(as.anonymous().firestore()));
    await assertFails(as.anonymous().firestore().collection("ridePool").doc(BOOKING.pool).get());
  });
  it("admin : lit le pool", async () => {
    await assertSucceeds(poolQuery(as.admin().firestore()));
  });
  it("écriture refusée à tous (création, mise à jour, suppression), chauffeur validé en service compris", async () => {
    const entry = { bookingId: "x", departZone: "Paris 1er", arriveeZone: "Paris 2e", createdAt: new Date(), prix: 1 };
    for (const ctx of [as.driver(), as.driver2(), as.driverPending(), as.client(), as.ownerA(), as.admin(), as.anonymous()]) {
      const db = ctx.firestore();
      await assertFails(db.collection("ridePool").doc("nouveau").set(entry));
      await assertFails(db.collection("ridePool").doc(BOOKING.pool).update({ prix: 1 }));
      await assertFails(db.collection("ridePool").doc(BOOKING.pool).delete());
    }
  });
  it("les courses à prendre ne se lisent plus dans bookings (requête et id), même pour le chauffeur validé en service", async () => {
    await assertFails(oldPoolQuery(as.driver().firestore()));
    await assertFails(as.driver().firestore().collection("bookings").doc(BOOKING.pool).get());
    await assertSucceeds(oldPoolQuery(as.admin().firestore())); // témoin : l'admin lit toujours bookings
  });
  it("le chauffeur lit sa course assignée / en cours dans bookings, avec les coordonnées du passager", async () => {
    const snap = (await assertSucceeds(
      as.driver().firestore().collection("bookings").doc(BOOKING.assigned).get()
    )) as { data(): Record<string, unknown> };
    if (snap.data().phone !== "+33600000001" || snap.data().name !== "Passager") {
      throw new Error("nom et téléphone du passager attendus sur la course assignée");
    }
    const mine = (await assertSucceeds(
      as.driver().firestore().collection("bookings").where("driverId", "==", UID.driver)
        .where("status", "in", ["assigned", "in_progress"]).orderBy("createdAt", "desc").get()
    )) as { size: number };
    if (mine.size !== 2) throw new Error(`2 courses assignées attendues, ${mine.size} reçues`);
  });
  it.each(["completed_by_driver", "completed", "cancelled"])(
    "le chauffeur ne lit plus sa course au statut %s (coordonnées du passager réservées à la course en cours)",
    async (status) => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().collection("bookings").doc(BOOKING.assigned).update({ status });
      });
      await assertFails(as.driver().firestore().collection("bookings").doc(BOOKING.assigned).get());
      // le passager et l'admin gardent l'accès
      await assertSucceeds(as.client().firestore().collection("bookings").doc(BOOKING.assigned).get());
      await assertSucceeds(as.admin().firestore().collection("bookings").doc(BOOKING.assigned).get());
    }
  );
  it("chauffeur suspendu : ne lit plus sa course en cours ; le passager si", async () => {
    await assertSucceeds(as.driver().firestore().collection("bookings").doc(BOOKING.inProgress).get()); // témoin
    await setDriver({ status: "suspended" });
    await assertFails(as.driver().firestore().collection("bookings").doc(BOOKING.inProgress).get());
    await assertFails(as.driver().firestore().collection("bookings").doc(BOOKING.assigned).get());
    await assertSucceeds(as.client().firestore().collection("bookings").doc(BOOKING.inProgress).get());
  });
  it("requête chauffeur sans filtre de statut : refusée par la règle (le navigateur doit filtrer)", async () => {
    await assertFails(
      as.driver().firestore().collection("bookings").where("driverId", "==", UID.driver).orderBy("createdAt", "desc").get()
    );
  });
  it("chauffeur validé : ne lit pas une course non assignée d'un tiers (status pending)", async () => {
    await assertFails(as.driver().firestore().collection("bookings").doc(BOOKING.otherClient).get());
  });
});

describe("driverRides (historique réduit du chauffeur, lot 2.1)", () => {
  const mineQuery = (db: any, uid: string) => db.collection("driverRides").doc(uid).collection("rides").orderBy("createdAt", "desc").get();
  it("le chauffeur lit son historique (requête et lecture par id), sans donnée personnelle", async () => {
    const snap = (await assertSucceeds(mineQuery(as.driver().firestore(), UID.driver))) as { size: number };
    if (snap.size !== 2) throw new Error(`2 entrées attendues, ${snap.size} reçues`);
    const one = (await assertSucceeds(
      as.driver().firestore().collection("driverRides").doc(UID.driver).collection("rides").doc(BOOKING.assigned).get()
    )) as { data(): Record<string, unknown> };
    for (const k of ["name", "phone", "email", "notes", "depart", "arrivee", "userId"]) {
      if (k in one.data()) throw new Error(`champ personnel dans driverRides : ${k}`);
    }
  });
  it("le chauffeur ne lit pas l'historique d'un autre chauffeur", async () => {
    await assertFails(mineQuery(as.driver().firestore(), UID.driver2));
    await assertFails(
      as.driver().firestore().collection("driverRides").doc(UID.driver2).collection("rides").doc(BOOKING.otherDriver).get()
    );
  });
  it("client et anonyme ne lisent aucun historique ; l'admin oui", async () => {
    await assertFails(mineQuery(as.client().firestore(), UID.driver));
    await assertFails(mineQuery(as.anonymous().firestore(), UID.driver));
    await assertSucceeds(mineQuery(as.admin().firestore(), UID.driver));
  });
  it("un chauffeur suspendu lit encore son propre historique", async () => {
    await setDriver({ status: "suspended" });
    await assertSucceeds(mineQuery(as.driver().firestore(), UID.driver));
  });
  it("écriture refusée à tous, chauffeur concerné compris (création, mise à jour, suppression)", async () => {
    for (const ctx of [as.driver(), as.driver2(), as.client(), as.admin(), as.anonymous()]) {
      const col = ctx.firestore().collection("driverRides").doc(UID.driver).collection("rides");
      await assertFails(col.doc("nouveau").set({ bookingId: "nouveau", prix: 1 }));
      await assertFails(col.doc(BOOKING.assigned).update({ driverShareCents: 999999 }));
      await assertFails(col.doc(BOOKING.assigned).delete());
    }
  });
});

describe("chauffeur : plus aucune écriture dans bookings (accept / start / complete / release = /api/rides/*)", () => {
  it("accepter une course du pool (transaction de l'ancien acceptRide) : refusé", async () => {
    const db = as.driver().firestore();
    await assertFails(
      db.runTransaction(async (tx) => {
        const rideRef = db.collection("bookings").doc(BOOKING.pool);
        await tx.get(rideRef);
        tx.update(rideRef, acceptFields(UID.driver));
      })
    );
  });
  it("accepter une course à prix décimal (79.99 EUR) : refusé", async () => {
    await assertFails(
      as.driver().firestore().collection("bookings").doc("bkDecimal").update(acceptFields(UID.driver, 79.99))
    );
  });
  it("accepter avec commission falsifiée ou parts incohérentes : refusé", async () => {
    const ref = as.driver().firestore().collection("bookings").doc(BOOKING.pool);
    await assertFails(ref.update({ ...acceptFields(UID.driver), commissionRate: 0.05 }));
    await assertFails(ref.update({ ...acceptFields(UID.driver), platformShareCents: 0, driverShareCents: 8000 }));
    await assertFails(ref.update({ ...acceptFields(UID.driver), platformShareCents: 1600.5, driverShareCents: 6399.5 }));
  });
  it("accepter en modifiant prix / userId / paymentStatus, ou pour un autre chauffeur : refusé", async () => {
    const ref = as.driver().firestore().collection("bookings").doc(BOOKING.pool);
    await assertFails(ref.update({ ...acceptFields(UID.driver), prix: 1 }));
    await assertFails(ref.update({ ...acceptFields(UID.driver), userId: UID.driver }));
    await assertFails(ref.update({ ...acceptFields(UID.driver), paymentStatus: "captured" }));
    await assertFails(ref.update(acceptFields(UID.driver2)));
  });
  it("chauffeur non validé, puis validé et en ligne : toujours refusé d'accepter dans bookings", async () => {
    const ref = as.driverPending().firestore().collection("bookings").doc(BOOKING.pool);
    await assertFails(ref.update(acceptFields(UID.driverPending)));
    await env.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection("drivers").doc(UID.driverPending).update({ status: "active", availability: "online" });
    });
    await assertFails(ref.update(acceptFields(UID.driverPending)));
    await assertFails(as.driver().firestore().collection("bookings").doc(BOOKING.pool).update(acceptFields(UID.driver)));
  });
  it("accepter une course déjà assignée, ou sa propre course (D-003) : refusé", async () => {
    await assertFails(
      as.driver().firestore().collection("bookings").doc(BOOKING.otherDriver).update(acceptFields(UID.driver))
    );
    await env.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection("bookings").doc("bkOwnPool").set({
        userId: UID.driver, status: "awaiting_driver", prix: 80, createdAt: new Date(),
      });
    });
    await assertFails(as.driver().firestore().collection("bookings").doc("bkOwnPool").update(acceptFields(UID.driver)));
  });
  it("démarrer sa course (assigned -> in_progress) : refusé", async () => {
    await assertFails(
      as.driver().firestore().collection("bookings").doc(BOOKING.assigned)
        .update({ status: "in_progress", driverStartedAt: ts(), updatedAt: ts() })
    );
  });
  it("terminer sa course (in_progress -> completed_by_driver) : refusé", async () => {
    await assertFails(
      as.driver().firestore().collection("bookings").doc(BOOKING.inProgress)
        .update({ status: "completed_by_driver", driverCompletedAt: ts(), updatedAt: ts() })
    );
  });
  it("libérer sa course assignée : refusé (même suspendu, même motif trop long)", async () => {
    const ref = as.driver().firestore().collection("bookings").doc(BOOKING.assigned);
    const release = (reason: string) => ({
      driverId: null, driverAcceptedAt: null, status: "awaiting_driver", driverReleaseReason: reason, updatedAt: ts(),
    });
    await assertFails(ref.update(release("imprévu")));
    await assertFails(ref.update(release("x".repeat(501))));
    await setDriver({ status: "suspended" });
    await assertFails(ref.update(release("suspendu")));
  });
  it("modifier prix / userId / paymentStatus / statut final de sa course : refusé", async () => {
    const ref = as.driver().firestore().collection("bookings").doc(BOOKING.inProgress);
    await assertFails(ref.update({ status: "completed_by_driver", prix: 1 }));
    await assertFails(ref.update({ status: "completed_by_driver", userId: UID.driver }));
    await assertFails(ref.update({ status: "completed_by_driver", paymentStatus: "captured" }));
    await assertFails(ref.update({ status: "completed" }));
  });
  it("mêmes opérations sur la course d'un autre chauffeur : refusées", async () => {
    const ref = as.driver().firestore().collection("bookings").doc(BOOKING.otherDriver);
    await assertFails(ref.update({ status: "in_progress", driverStartedAt: ts(), updatedAt: ts() }));
    await assertFails(ref.update({ driverId: UID.driver, status: "in_progress" }));
  });
  it("chauffeur : ne supprime aucune course", async () => {
    await assertFails(as.driver().firestore().collection("bookings").doc(BOOKING.assigned).delete());
  });
  it("témoin : l'admin, lui, modifie une course (statut)", async () => {
    await assertSucceeds(as.admin().firestore().collection("bookings").doc(BOOKING.pool).update({ status: "cancelled" }));
  });
});

describe("client : bookings", () => {
  it("lit ses courses (requête getUserBookings)", async () => {
    const snap = await assertSucceeds(
      as.client().firestore().collection("bookings").where("userId", "==", UID.client).orderBy("createdAt", "desc").get()
    );
    if (snap.size < 4) throw new Error(`au moins 4 courses attendues, ${snap.size} reçues`);
  });
  it("ne lit pas la course d'un autre client (par id et par requête)", async () => {
    const db = as.client().firestore();
    await assertSucceeds(db.collection("bookings").doc(BOOKING.clientOwn).get()); // témoin
    await assertFails(db.collection("bookings").doc(BOOKING.otherClient).get());
    await assertFails(db.collection("bookings").where("userId", "==", UID.client2).get());
  });
  it("ne met à jour aucune course, même la sienne", async () => {
    const db = as.client().firestore();
    await assertFails(db.collection("bookings").doc(BOOKING.clientOwn).update({ notes: "x" }));
    await assertFails(db.collection("bookings").doc(BOOKING.clientOwn).update({ status: "awaiting_driver" }));
    await assertFails(db.collection("bookings").doc(BOOKING.pool).update({ status: "cancelled" }));
    await assertFails(db.collection("bookings").doc(BOOKING.clientOwn).delete());
  });
  it("crée un devis valide (autorisé)", async () => {
    await assertSucceeds(as.client().firestore().collection("bookings").add(devis(UID.client)));
  });
  it("refuse la création avec status awaiting_driver / pending / assigned", async () => {
    const db = as.client().firestore();
    await assertFails(db.collection("bookings").add(devis(UID.client, { status: "awaiting_driver" })));
    await assertFails(db.collection("bookings").add(devis(UID.client, { status: "pending" })));
    await assertFails(db.collection("bookings").add(devis(UID.client, { status: "assigned" })));
  });
  it("refuse la création avec paymentStatus / serverFinalized / companyId / driverId", async () => {
    const db = as.client().firestore();
    await assertFails(db.collection("bookings").add(devis(UID.client, { paymentStatus: "authorized" })));
    await assertFails(db.collection("bookings").add(devis(UID.client, { serverFinalized: true })));
    await assertFails(db.collection("bookings").add(devis(UID.client, { companyId: COMPANY_A })));
    await assertFails(db.collection("bookings").add(devis(UID.client, { driverId: UID.driver })));
  });
  it("refuse la création pour le compte d'un autre (userId différent) et les id card_ / hybrid_ / deferred_", async () => {
    const db = as.client().firestore();
    await assertFails(db.collection("bookings").add(devis(UID.client2)));
    await assertSucceeds(db.collection("bookings").doc("dev_ok").set(devis(UID.client))); // témoin : id libre OK
    await assertFails(db.collection("bookings").doc("card_x").set(devis(UID.client)));
    await assertFails(db.collection("bookings").doc("hybrid_x").set(devis(UID.client)));
    await assertFails(db.collection("bookings").doc("deferred_seti_x").set(devis(UID.client)));
  });
  it("refuse createdAt à l'heure client (new Date()) ; serverTimestamp accepté", async () => {
    const db = as.client().firestore();
    await assertFails(db.collection("bookings").add(devis(UID.client, { createdAt: new Date() })));
    await assertFails(db.collection("bookings").add(devis(UID.client, { createdAt: new Date("2020-01-01T00:00:00Z") })));
    await assertSucceeds(db.collection("bookings").add(devis(UID.client)));
  });
  it("refuse notes / name / depart / arrivee > 2000 caractères ; 2000 passe", async () => {
    const db = as.client().firestore();
    await assertSucceeds(db.collection("bookings").add(devis(UID.client, { notes: "x".repeat(2000) })));
    await assertFails(db.collection("bookings").add(devis(UID.client, { notes: "x".repeat(2001) })));
    await assertFails(db.collection("bookings").add(devis(UID.client, { name: "x".repeat(2001) })));
    await assertFails(db.collection("bookings").add(devis(UID.client, { depart: "x".repeat(2001) })));
    await assertFails(db.collection("bookings").add(devis(UID.client, { arrivee: "x".repeat(2001) })));
  });
  it("refuse la création anonyme", async () => {
    await assertFails(as.anonymous().firestore().collection("bookings").add(devis("guest_abc")));
  });
});

describe("users", () => {
  const fresh = (uid: string) => env.authenticatedContext(uid).firestore().collection("users").doc(uid);
  const base = (uid: string) => ({ uid, email: `${uid}@test.dev`, role: "client", isAdmin: false });

  it("création saine (clés d'AuthContext) autorisée", async () => {
    await assertSucceeds(fresh("n1").set({ ...base("n1"), displayName: "N", photoURL: "", phoneNumber: "", createdAt: new Date(), lastLogin: new Date() }));
    await assertSucceeds(fresh("n2").set({ ...base("n2"), role: "driver" }));
  });
  it("création refusée avec isAdmin true / role admin / companyId / companyRole / phoneVerified", async () => {
    await assertFails(fresh("a1").set({ ...base("a1"), isAdmin: true }));
    await assertFails(fresh("a2").set({ ...base("a2"), role: "admin" }));
    await assertFails(fresh("a3").set({ ...base("a3"), companyId: COMPANY_A }));
    await assertFails(fresh("a4").set({ ...base("a4"), companyRole: "owner" }));
    await assertFails(fresh("a5").set({ ...base("a5"), phoneVerified: true }));
  });
  it("création refusée pour le compte d'un autre uid", async () => {
    await assertFails(env.authenticatedContext("x1").firestore().collection("users").doc("x2").set(base("x2")));
  });
  it("mise à jour du profil autorisée (displayName, phoneNumber, photoURL, lastLogin, pendingReservation)", async () => {
    const ref = as.client().firestore().collection("users").doc(UID.client);
    await assertSucceeds(ref.update({ displayName: "Jean" }));
    await assertSucceeds(ref.update({ phoneNumber: "+33611111111", photoURL: "https://x/y.png" }));
    await assertSucceeds(ref.update({ lastLogin: new Date(), updatedAt: new Date() }));
    await assertSucceeds(ref.update({ pendingReservation: { depart: "A" } }));
  });
  it("mise à jour refusée de isAdmin / role admin / companyId / companyRole / phoneVerified", async () => {
    const ref = as.client().firestore().collection("users").doc(UID.client);
    await assertFails(ref.update({ isAdmin: true }));
    await assertFails(ref.update({ role: "admin" }));
    await assertFails(ref.update({ companyId: COMPANY_A }));
    await assertFails(ref.update({ companyRole: "owner" }));
    await assertFails(ref.update({ phoneVerified: true }));
    await assertFails(ref.update({ uid: "autre" }));
  });
  it("pendingReservation : 20 clés acceptées, 21 refusées (création et mise à jour)", async () => {
    const keys = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`k${i}`, i]));
    const ref = as.client().firestore().collection("users").doc(UID.client);
    await assertSucceeds(ref.update({ pendingReservation: keys(20) }));
    await assertFails(ref.update({ pendingReservation: keys(21) }));
    await assertSucceeds(fresh("pr1").set({ ...base("pr1"), pendingReservation: keys(20) }));
    await assertFails(fresh("pr2").set({ ...base("pr2"), pendingReservation: keys(21) }));
  });
  it("collaborateur : ne change pas son rattachement ; owner non plus", async () => {
    await assertFails(as.memberA().firestore().collection("users").doc(UID.memberA).update({ companyId: COMPANY_B }));
    await assertFails(as.ownerA().firestore().collection("users").doc(UID.ownerA).update({ companyRole: "member" }));
  });
  it("client -> driver autorisé (réserve : inscription chauffeur depuis un compte existant)", async () => {
    await assertSucceeds(as.client2().firestore().collection("users").doc(UID.client2).update({ role: "driver", updatedAt: new Date() }));
  });
  it("driver -> client refusé selon la règle", async () => {
    await assertFails(as.driver().firestore().collection("users").doc(UID.driver).update({ role: "client" }));
  });
  it("ne lit pas le profil d'un autre ; lit le sien ; ne supprime pas le sien", async () => {
    const db = as.client().firestore();
    await assertSucceeds(db.collection("users").doc(UID.client).get());
    await assertFails(db.collection("users").doc(UID.client2).get());
    await assertFails(db.collection("users").doc(UID.client).delete());
    await assertFails(as.anonymous().firestore().collection("users").doc(UID.client).get());
  });
  it("ne liste pas la collection users", async () => {
    await assertFails(as.client().firestore().collection("users").get());
  });
});

describe("drivers", () => {
  const ctxDrv = (uid: string, email = `${uid}@test.dev`) =>
    env.authenticatedContext(uid, { email }).firestore().collection("drivers").doc(uid);
  const fiche = (uid: string, extra: object = {}) => ({
    uid, email: `${uid}@test.dev`, status: "pending", availability: "offline",
    firstName: "A", lastName: "B", phone: "+33600000000", createdAt: new Date(), updatedAt: new Date(), ...extra,
  });

  it("création avec status pending autorisée", async () => {
    await assertSucceeds(ctxDrv("nd1").set(fiche("nd1")));
    await assertSucceeds(ctxDrv("nd2").set(fiche("nd2", { stats: { totalRides: 0, totalEarningsCents: 0 } })));
  });
  it("création refusée avec status active / suspended / stats gonflées / uid d'un autre", async () => {
    await assertFails(ctxDrv("nd3").set(fiche("nd3", { status: "active" })));
    await assertFails(ctxDrv("nd4").set(fiche("nd4", { status: "suspended" })));
    await assertFails(ctxDrv("nd5").set(fiche("nd5", { stats: { totalRides: 50, totalEarningsCents: 1 } })));
    await assertFails(env.authenticatedContext("nd6", { email: "nd7@test.dev" }).firestore().collection("drivers").doc("nd7").set(fiche("nd7")));
  });
  it("mise à jour du profil autorisée ; status / stats / commission / acceptedAt / uid refusés", async () => {
    const ref = as.driver().firestore().collection("drivers").doc(UID.driver);
    await assertSucceeds(ref.update({ firstName: "Paul", phone: "+33677777777", "moto.brand": "Honda" }));
    await assertFails(ref.update({ status: "pending" }));
    await assertFails(ref.update({ status: "suspended" }));
    await assertFails(ref.update({ stats: { totalRides: 999, totalEarningsCents: 99999 } }));
    await assertFails(ref.update({ commissionRate: 0 }));
    await assertFails(ref.update({ acceptedAt: new Date() }));
    await assertFails(ref.update({ rejectionReason: "" }));
    await assertFails(ref.update({ uid: "autre" }));
  });
  it("création : email du document différent de celui du jeton refusé", async () => {
    await assertFails(ctxDrv("em1", "autre@test.dev").set(fiche("em1")));
    await assertFails(env.authenticatedContext("em2").firestore().collection("drivers").doc("em2").set(fiche("em2"))); // jeton sans email
    await assertSucceeds(ctxDrv("em3").set(fiche("em3")));
  });
  it("documents : 6 clés connues avec path sous drivers/<uid>/ acceptées (création et mise à jour)", async () => {
    const d = (uid: string, k: string) => ({ url: "https://x", path: `drivers/${uid}/${k}_1.pdf`, filename: "f.pdf", uploadedAt: new Date() });
    const kinds = ["identityCard", "drivingLicense", "vehicleRegistration", "insurance", "rib", "motoPhoto"];
    await assertSucceeds(ctxDrv("dc1").set(fiche("dc1", { documents: Object.fromEntries(kinds.map((k) => [k, d("dc1", k)])) })));
    await assertSucceeds(ctxDrv("dc2").set(fiche("dc2", { documents: { rib: null } })));
    const ref = as.driver().firestore().collection("drivers").doc(UID.driver);
    for (const k of kinds) await assertSucceeds(ref.update({ [`documents.${k}`]: d(UID.driver, k) }));
  });
  it("documents : path sous un autre uid ou clé inconnue refusés (création et mise à jour)", async () => {
    const d = (path: string) => ({ url: "https://x", path, filename: "f.pdf", uploadedAt: new Date() });
    await assertFails(ctxDrv("dx1").set(fiche("dx1", { documents: { rib: d("drivers/autreUid/rib.pdf") } })));
    await assertFails(ctxDrv("dx2").set(fiche("dx2", { documents: { licence: d("drivers/dx2/l.pdf") } })));
    await assertFails(ctxDrv("dx3").set(fiche("dx3", { documents: { rib: { url: "https://x" } } }))); // pas de path
    const ref = as.driver().firestore().collection("drivers").doc(UID.driver);
    await assertFails(ref.update({ "documents.rib": d(`drivers/${UID.driver2}/rib.pdf`) }));
    await assertFails(ref.update({ "documents.drivingLicense": d("drivers/driverOkEVIL/l.pdf") }));
    await assertFails(ref.update({ "documents.licence": d(`drivers/${UID.driver}/l.pdf`) }));
    await assertFails(ref.update({ documents: "pas une map" }));
  });
  it("pending : ne s'auto-valide pas (status active)", async () => {
    await assertFails(as.driverPending().firestore().collection("drivers").doc(UID.driverPending).update({ status: "active" }));
  });
  it("disponibilité online / offline autorisée, autre valeur refusée", async () => {
    const ref = as.driver().firestore().collection("drivers").doc(UID.driver);
    await assertSucceeds(ref.update({ availability: "offline", updatedAt: new Date() }));
    await assertSucceeds(ref.update({ availability: "online", updatedAt: new Date() }));
    await assertFails(ref.update({ availability: "busy" }));
    await assertFails(ref.update({ availability: null }));
  });
  it("lit sa fiche, pas celle d'un autre ; ne liste pas ; ne supprime pas", async () => {
    const db = as.driver().firestore();
    await assertSucceeds(db.collection("drivers").doc(UID.driver).get());
    await assertFails(db.collection("drivers").doc(UID.driver2).get());
    await assertFails(db.collection("drivers").get());
    await assertFails(db.collection("drivers").doc(UID.driver).delete());
    await assertFails(as.client().firestore().collection("drivers").doc(UID.driver).get());
  });
});

describe("entreprises", () => {
  it("membre actif de A : lit A, sa propre adhésion ; pas B", async () => {
    const db = as.memberA().firestore();
    await assertSucceeds(db.collection("companies").doc(COMPANY_A).get());
    await assertSucceeds(db.collection("companies").doc(COMPANY_A).collection("members").doc(UID.memberA).get());
    await assertFails(db.collection("companies").doc(COMPANY_B).get());
    await assertFails(db.collection("companies").doc(COMPANY_B).collection("members").doc(UID.memberB).get());
  });
  it("owner de A : lit A et tous ses membres ; pas B", async () => {
    const db = as.ownerA().firestore();
    await assertSucceeds(db.collection("companies").doc(COMPANY_A).collection("members").get());
    await assertFails(db.collection("companies").doc(COMPANY_B).collection("members").get());
  });
  it("membre retiré (status removed) : ne lit plus A ni sa fiche membre", async () => {
    const ref = as.memberA().firestore().collection("companies").doc(COMPANY_A);
    await assertSucceeds(ref.get()); // avant retrait
    await env.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection("companies").doc(COMPANY_A).collection("members").doc(UID.memberA).update({ status: "removed" });
    });
    await assertFails(ref.get());
    await assertFails(ref.collection("members").doc(UID.memberA).get());
  });
  it("collaborateur : ne lit pas les fiches (budgets) des autres membres ni la liste", async () => {
    const db = as.memberA().firestore();
    await assertFails(db.collection("companies").doc(COMPANY_A).collection("members").doc(UID.ownerA).get());
    await assertFails(db.collection("companies").doc(COMPANY_A).collection("members").get());
  });
  it("collaborateur : ne lit pas les courses d'un collègue", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection("bookings").doc("bkColl").set({ userId: UID.ownerA, status: "devis", prix: 50, createdAt: new Date(), companyId: COMPANY_A });
    });
    await assertSucceeds(as.ownerA().firestore().collection("bookings").doc("bkColl").get()); // témoin : l'auteur
    await assertFails(as.memberA().firestore().collection("bookings").doc("bkColl").get());
  });
  it("aucune écriture client sur companies, members, companyInvitations (owner, membre, admin)", async () => {
    for (const ctx of [as.ownerA(), as.memberA(), as.admin()]) {
      const db = ctx.firestore();
      await assertFails(db.collection("companies").doc(COMPANY_A).update({ walletBalanceCents: 1 }));
      await assertFails(db.collection("companies").doc("newCo").set({ name: "x", ownerUid: "x" }));
      await assertFails(db.collection("companies").doc(COMPANY_A).delete());
      await assertFails(db.collection("companies").doc(COMPANY_A).collection("members").doc(UID.memberA).update({ monthlyBudgetCents: 999999 }));
      await assertFails(db.collection("companies").doc(COMPANY_A).collection("members").doc("zz").set({ role: "owner", status: "active" }));
      await assertFails(db.collection("companyInvitations").doc("tok2").set({ companyId: COMPANY_A }));
      await assertFails(db.collection("companyInvitations").doc("tok1").get());
    }
  });
  it("anonyme : aucune lecture", async () => {
    await assertFails(as.anonymous().firestore().collection("companies").doc(COMPANY_A).get());
  });
});

describe("collections serveur et inconnues", () => {
  it("paymentClaims / auditLogs : aucun accès (client, owner, chauffeur, admin, anonyme)", async () => {
    for (const ctx of [as.client(), as.ownerA(), as.driver(), as.admin(), as.anonymous()]) {
      const db = ctx.firestore();
      await assertFails(db.collection("paymentClaims").doc("pc1").get());
      await assertFails(db.collection("paymentClaims").doc("pc2").set({ userId: "x" }));
      await assertFails(db.collection("auditLogs").doc("al1").get());
      await assertFails(db.collection("auditLogs").doc("al2").set({ action: "x" }));
    }
  });
  it("wallets : lit le sien seulement, aucune écriture (même le sien, même admin)", async () => {
    const db = as.client().firestore();
    await assertSucceeds(db.collection("wallets").doc(UID.client).get());
    await assertFails(db.collection("wallets").doc(UID.client2).get());
    await assertFails(db.collection("wallets").doc(UID.client).update({ balanceCents: 999999 }));
    await assertFails(db.collection("wallets").doc("nw").set({ balanceCents: 1 }));
    await assertFails(db.collection("wallets").doc(UID.client).delete());
    await assertFails(as.admin().firestore().collection("wallets").doc(UID.client).update({ balanceCents: 1 }));
  });
  it("walletTransactions : lit les siennes seulement, aucune écriture", async () => {
    const db = as.client().firestore();
    await assertSucceeds(db.collection("walletTransactions").where("userId", "==", UID.client).get());
    await assertFails(db.collection("walletTransactions").where("userId", "==", UID.client2).get());
    await assertFails(db.collection("walletTransactions").doc("tx2").get());
    await assertFails(db.collection("walletTransactions").add({ userId: UID.client, amountCents: 1 }));
    await assertFails(db.collection("walletTransactions").doc("tx1").update({ amountCents: 99999 }));
    await assertFails(as.admin().firestore().collection("walletTransactions").add({ userId: UID.client, amountCents: 1 }));
  });
  it("factures : admin seulement (lecture et écriture)", async () => {
    await assertSucceeds(as.admin().firestore().collection("factures").doc("f1").get());
    await assertSucceeds(as.admin().firestore().collection("factures").add({ bookingId: "b", montant: 1 }));
    for (const ctx of [as.client(), as.ownerA(), as.memberA(), as.driver(), as.anonymous()]) {
      const db = ctx.firestore();
      await assertFails(db.collection("factures").doc("f1").get());
      await assertFails(db.collection("factures").add({ bookingId: "b", montant: 1 }));
    }
  });
  it("collection inconnue : refusée pour tous, admin compris", async () => {
    for (const ctx of [as.client(), as.driver(), as.admin(), as.anonymous()]) {
      await assertFails(ctx.firestore().collection("inconnue").doc("x").get());
      await assertFails(ctx.firestore().collection("inconnue").doc("x").set({ a: 1 }));
    }
  });
});

describe("admin : accès conservés pour le back-office", () => {
  it("lit tout ce dont le back-office a besoin", async () => {
    const db = as.admin().firestore();
    await assertSucceeds(db.collection("users").get());
    await assertSucceeds(db.collection("bookings").orderBy("createdAt", "desc").get());
    await assertSucceeds(db.collection("drivers").orderBy("createdAt", "desc").get());
    await assertSucceeds(db.collection("wallets").get());
    await assertSucceeds(db.collection("companies").get());
    await assertSucceeds(db.collection("companies").doc(COMPANY_A).collection("members").get());
    await assertSucceeds(db.collection("factures").get());
  });
  it("gère chauffeurs, réservations, utilisateurs, factures", async () => {
    const db = as.admin().firestore();
    await assertSucceeds(db.collection("drivers").doc(UID.driverPending).update({ status: "active", acceptedAt: new Date() }));
    await assertSucceeds(db.collection("bookings").doc(BOOKING.clientOwn).update({ status: "confirmed" }));
    await assertSucceeds(db.collection("bookings").doc(BOOKING.otherClient).delete());
    await assertSucceeds(db.collection("users").doc(UID.client2).update({ isAdmin: true }));
    await assertSucceeds(db.collection("users").doc(UID.client2).update({ isAdmin: false }));
    await assertSucceeds(db.collection("users").doc(UID.client2).delete());
    await assertSucceeds(db.collection("factures").doc("f2").set({ montant: 1 }));
  });
  it("un non-admin ne bénéficie d'aucun de ces accès", async () => {
    const db = as.client().firestore();
    await assertFails(db.collection("users").get());
    await assertFails(db.collection("bookings").orderBy("createdAt", "desc").get());
    await assertFails(db.collection("drivers").doc(UID.driverPending).update({ status: "active" }));
    await assertFails(db.collection("bookings").doc(BOOKING.otherClient).delete());
  });
});
