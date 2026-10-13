// Non-régression fonctionnelle (lot 0.5) : accès légitimes de l'app (chauffeur, client,
// entreprise, admin) avec les règles de firestore.rules, et refus qui doivent rester vrais.
// Le PARCOURS fonctionnel doit rester possible ; le bloc « réserve phase 2 » fige les écritures
// client directes encore autorisées (contraintes) qui devront migrer côté serveur.
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  actors,
  BOOKING,
  COMPANY_A,
  COMPANY_B,
  createEnv,
  seed,
  ts,
  UID,
} from "./helpers";

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
});

describe("espace chauffeur (validé) — dispatch.ts, drivers.ts, useDriver.ts", () => {
  // Réserve phase 2 : les documents bookings contiennent name/phone du passager ; le pool
  // expose le document complet (voir le it.fails « pool sans données personnelles » plus bas).
  it("lit le pool (bookings status == awaiting_driver, tri createdAt desc)", async () => {
    const db = as.driver().firestore();
    await assertSucceeds(
      db.collection("bookings").where("status", "==", "awaiting_driver").orderBy("createdAt", "desc").get()
    );
  });

  it("lit ses courses (bookings driverId == uid)", async () => {
    const db = as.driver().firestore();
    const snap = await assertSucceeds(
      db.collection("bookings").where("driverId", "==", UID.driver).orderBy("createdAt", "desc").get()
    );
    if (snap.size !== 2) throw new Error(`2 courses attendues, ${snap.size} reçues`);
  });

  it("lit sa fiche chauffeur (useDriver : drivers/{uid} et users/{uid})", async () => {
    const db = as.driver().firestore();
    await assertSucceeds(db.collection("drivers").doc(UID.driver).get());
    await assertSucceeds(db.collection("users").doc(UID.driver).get());
  });

  it("met à jour sa fiche (profil, documents) et sa disponibilité", async () => {
    const db = as.driver().firestore();
    await assertSucceeds(db.collection("drivers").doc(UID.driver).update({ availability: "offline", updatedAt: new Date() }));
    await assertSucceeds(db.collection("drivers").doc(UID.driver).update({ phone: "+33611111111", "moto.brand": "Yamaha" }));
    await assertSucceeds(
      db.collection("drivers").doc(UID.driver).update({
        "documents.drivingLicense": { url: "https://x", path: "drivers/driverOk/licence_1.pdf", filename: "l.pdf", uploadedAt: new Date() },
      })
    );
  });

});

describe("compte client / particulier — AuthContext, bookings.js, useWallet*", () => {
  it("crée son users/{uid} (isAdmin false)", async () => {
    const db = env.authenticatedContext("newUser").firestore();
    await assertSucceeds(
      db.collection("users").doc("newUser").set({ uid: "newUser", email: "n@test.dev", role: "client", isAdmin: false })
    );
  });

  it("lit et met à jour son profil (lastLogin, téléphone, nom, pendingReservation)", async () => {
    const db = as.client().firestore();
    await assertSucceeds(db.collection("users").doc(UID.client).get());
    await assertSucceeds(db.collection("users").doc(UID.client).set({ lastLogin: new Date() }, { merge: true }));
    await assertSucceeds(
      db.collection("users").doc(UID.client).set({ phoneNumber: "+33622222222", displayName: "Jean" }, { merge: true })
    );
    await assertSucceeds(
      db.collection("users").doc(UID.client).set({ pendingReservation: { depart: "A" } }, { merge: true })
    );
  });

  it("lit ses courses (getUserBookings : userId == uid, tri createdAt desc)", async () => {
    const db = as.client().firestore();
    const snap = await assertSucceeds(
      db.collection("bookings").where("userId", "==", UID.client).orderBy("createdAt", "desc").get()
    );
    if (snap.size !== 4) throw new Error(`4 courses attendues, ${snap.size} reçues`);
  });

  it("lit son portefeuille (wallets/{uid}) et son historique (walletTransactions userId == uid)", async () => {
    const db = as.client().firestore();
    await assertSucceeds(db.collection("wallets").doc(UID.client).get());
    await assertSucceeds(db.collection("walletTransactions").where("userId", "==", UID.client).get());
  });

  it("ne peut pas supprimer son propre users/{uid} (delete admin seulement)", async () => {
    await assertFails(as.client2().firestore().collection("users").doc(UID.client2).delete());
  });
});

describe("espace entreprise — useCompany.ts", () => {
  it("collaborateur : lit users/{uid}, sa société et sa propre adhésion", async () => {
    const db = as.memberA().firestore();
    await assertSucceeds(db.collection("users").doc(UID.memberA).get());
    await assertSucceeds(db.collection("companies").doc(COMPANY_A).get());
    await assertSucceeds(db.collection("companies").doc(COMPANY_A).collection("members").doc(UID.memberA).get());
  });

  it("propriétaire : lit sa société et tous les membres de sa société", async () => {
    const db = as.ownerA().firestore();
    await assertSucceeds(db.collection("companies").doc(COMPANY_A).get());
    await assertSucceeds(db.collection("companies").doc(COMPANY_A).collection("members").get());
  });
});

describe("back-office admin — lib/firebase/admin.ts, drivers.ts", () => {
  it("lit utilisateurs, réservations, wallets, transactions, sociétés, membres, factures, chauffeurs", async () => {
    const db = as.admin().firestore();
    await assertSucceeds(db.collection("users").get());
    await assertSucceeds(db.collection("bookings").orderBy("createdAt", "desc").get());
    await assertSucceeds(db.collection("wallets").get());
    await assertSucceeds(db.collection("walletTransactions").where("userId", "==", UID.client).get());
    await assertSucceeds(db.collection("walletTransactions").where("companyId", "==", COMPANY_A).get());
    await assertSucceeds(db.collection("companies").get());
    await assertSucceeds(db.collection("companies").doc(COMPANY_A).collection("members").get());
    await assertSucceeds(db.collection("factures").get());
    await assertSucceeds(db.collection("drivers").orderBy("createdAt", "desc").get());
  });

  it("gère les chauffeurs (approuve, rejette, suspend, réintègre)", async () => {
    const db = as.admin().firestore();
    const ref = db.collection("drivers").doc(UID.driverPending);
    await assertSucceeds(ref.update({ status: "active", acceptedAt: new Date(), rejectionReason: "" }));
    await assertSucceeds(ref.update({ status: "rejected", rejectionReason: "x", availability: "offline" }));
    await assertSucceeds(ref.update({ status: "suspended", rejectionReason: "x", availability: "offline" }));
    await assertSucceeds(ref.update({ status: "active", rejectionReason: "" }));
  });

  it("met à jour le statut d'une réservation, la supprime, crée une facture", async () => {
    const db = as.admin().firestore();
    await assertSucceeds(db.collection("bookings").doc(BOOKING.clientOwn).update({ status: "confirmed" }));
    await assertSucceeds(db.collection("bookings").doc(BOOKING.otherClient).delete());
    await assertSucceeds(db.collection("factures").add({ bookingId: BOOKING.clientOwn, userId: UID.client, montant: 96 }));
  });

});

describe("non conforme D-001 mais encore autorisé — réserve phase 2 (à migrer côté serveur)", () => {
  // Écritures encore faites directement par le client, contraintes par les règles du lot 0.5
  // (commissions : taux 0.2 et parts cohérentes ; rôle : client -> driver seulement).
  // Réserve phase 2 : à remplacer par le test de la route serveur équivalente.
  it("accepte une course du pool (transaction : lit course + sa fiche, update driverId/status)", async () => {
    const db = as.driver().firestore();
    await assertSucceeds(
      db.runTransaction(async (tx) => {
        const rideRef = db.collection("bookings").doc(BOOKING.pool);
        const driverRef = db.collection("drivers").doc(UID.driver);
        await tx.get(rideRef);
        await tx.get(driverRef);
        tx.update(rideRef, {
          driverId: UID.driver,
          driverAcceptedAt: ts(),
          status: "assigned",
          commissionRate: 0.2,
          platformShareCents: 1600,
          driverShareCents: 6400,
          updatedAt: ts(),
        });
      })
    );
  });

  it("démarre sa course (assigned -> in_progress)", async () => {
    const db = as.driver().firestore();
    await assertSucceeds(
      db.runTransaction(async (tx) => {
        const ref = db.collection("bookings").doc(BOOKING.assigned);
        await tx.get(ref);
        tx.update(ref, { status: "in_progress", driverStartedAt: ts(), updatedAt: ts() });
      })
    );
  });

  it("termine sa course (in_progress -> completed_by_driver)", async () => {
    const db = as.driver().firestore();
    await assertSucceeds(
      db.runTransaction(async (tx) => {
        const ref = db.collection("bookings").doc(BOOKING.inProgress);
        await tx.get(ref);
        tx.update(ref, { status: "completed_by_driver", driverCompletedAt: ts(), updatedAt: ts() });
      })
    );
  });

  it("libère sa course (assigned -> awaiting_driver, driverId null)", async () => {
    const db = as.driver().firestore();
    await assertSucceeds(
      db.runTransaction(async (tx) => {
        const ref = db.collection("bookings").doc(BOOKING.assigned);
        await tx.get(ref);
        tx.update(ref, {
          driverId: null,
          driverAcceptedAt: null,
          status: "awaiting_driver",
          driverReleaseReason: "imprévu",
          updatedAt: ts(),
        });
      })
    );
  });

  it("inscription : marque users/{uid}.role = driver (merge) puis crée drivers/{uid}", async () => {
    const db = env.authenticatedContext(UID.client2, { email: "client2@test.dev" }).firestore();
    await assertSucceeds(
      db.collection("users").doc(UID.client2).set({ role: "driver", updatedAt: new Date() }, { merge: true })
    );
    await assertSucceeds(
      db.collection("drivers").doc(UID.client2).set({ uid: UID.client2, email: "client2@test.dev", status: "pending", availability: "offline" })
    );
  });

  it("client : ne marque plus phoneVerified:true lui-même (serveur uniquement)", async () => {
    const db = as.client().firestore();
    // Témoin : une mise à jour de profil légitime passe sur le même document.
    await assertSucceeds(db.collection("users").doc(UID.client).set({ displayName: "Jean" }, { merge: true }));
    await assertFails(db.collection("users").doc(UID.client).set({ phoneVerified: true }, { merge: true }));
  });

  it("ne crée plus de réservation status pending / prix 80 (courses payées = serveur)", async () => {
    const db = as.client().firestore();
    await assertFails(
      db.collection("bookings").add({ userId: UID.client, status: "pending", accountType: "registered", prix: 80, createdAt: new Date() })
    );
  });

  it("crée un devis (saveBooking : status devis, userId = soi, clés de useReservation.js)", async () => {
    const db = as.client().firestore();
    await assertSucceeds(
      db.collection("bookings").add({
        userId: UID.client,
        accountType: "registered",
        depart: "Paris",
        arrivee: "Orly",
        distance: 18,
        duree: 30,
        prix: 79.99,
        prioriteReservation: "standard",
        status: "devis",
        reservationId: "DEV-ABC12345",
        email: "client1@test.dev",
        phone: "+33600000001",
        name: "Jean",
        notes: "",
        reservationDate: new Date(),
        dateFormatted: "04/10/2026 à 10:00",
        createdAt: ts(),
      })
    );
  });

  it("promeut / retire un admin et supprime un utilisateur", async () => {
    const db = as.admin().firestore();
    await assertSucceeds(db.collection("users").doc(UID.client2).update({ isAdmin: true }));
    await assertSucceeds(db.collection("users").doc(UID.client2).update({ isAdmin: false }));
    await assertSucceeds(db.collection("users").doc(UID.client2).delete());
  });
});

describe("refus qui doivent rester vrais après resserrement", () => {
  it("anonyme : aucune lecture des collections de données", async () => {
    const db = as.anonymous().firestore();
    await assertFails(db.collection("bookings").doc(BOOKING.pool).get());
    await assertFails(db.collection("users").doc(UID.client).get());
    await assertFails(db.collection("drivers").doc(UID.driver).get());
    await assertFails(db.collection("wallets").doc(UID.client).get());
    await assertFails(db.collection("companies").doc(COMPANY_A).get());
  });

  it("client : ne peut pas écrire wallets, walletTransactions, companies, members, invitations", async () => {
    const db = as.client().firestore();
    await assertFails(db.collection("wallets").doc(UID.client).update({ balanceCents: 999999 }));
    await assertFails(db.collection("walletTransactions").add({ userId: UID.client, amountCents: 1 }));
    await assertFails(db.collection("companies").doc(COMPANY_A).update({ walletBalanceCents: 1 }));
    await assertFails(db.collection("companies").doc(COMPANY_A).collection("members").doc(UID.client).set({ role: "owner" }));
    await assertFails(db.collection("companyInvitations").doc("tok1").get());
  });

  it("client : ne lit pas factures ni le wallet / l'historique d'un autre", async () => {
    const db = as.client().firestore();
    await assertFails(db.collection("factures").doc("f1").get());
    await assertFails(db.collection("wallets").doc(UID.client2).get());
    await assertFails(db.collection("walletTransactions").where("userId", "==", UID.client2).get());
  });

  it("client : ne peut pas se donner isAdmin ni créer un users isAdmin true", async () => {
    const db = as.client().firestore();
    await assertFails(db.collection("users").doc(UID.client).update({ isAdmin: true }));
    await assertFails(db.collection("users").doc(UID.client).set({ uid: UID.client, isAdmin: true }));
  });

  it("collaborateur : ne modifie pas son rattachement entreprise (companyId / companyRole)", async () => {
    const db = as.memberA().firestore();
    // Témoin : une mise à jour légitime du même document passe (le refus ci-dessous vient donc bien de la règle).
    await assertSucceeds(db.collection("users").doc(UID.memberA).update({ displayName: "Marie" }));
    await assertFails(db.collection("users").doc(UID.memberA).update({ companyId: "companyB" }));
    await assertFails(db.collection("users").doc(UID.memberA).update({ companyRole: "owner" }));
  });

  it("chauffeur : ne lit pas la fiche d'un autre chauffeur", async () => {
    await assertFails(as.driver().firestore().collection("drivers").doc(UID.driver2).get());
  });

  it("chauffeur : ne modifie pas la course d'un autre chauffeur", async () => {
    await assertFails(
      as.driver().firestore().collection("bookings").doc(BOOKING.otherDriver).update({ status: "completed_by_driver" })
    );
  });

  it("chauffeur : ne peut pas s'attribuer la course assignée à un autre chauffeur", async () => {
    await assertFails(
      as.driver().firestore().collection("bookings").doc(BOOKING.otherDriver).update({ driverId: UID.driver, status: "in_progress" })
    );
  });

  it("collaborateur : ne peut ni supprimer son users/{uid} ni en recréer un avec companyId/companyRole", async () => {
    const db = as.memberA().firestore();
    await assertFails(db.collection("users").doc(UID.memberA).delete());
    // Document frais : création sans rattachement entreprise OK (témoin), avec companyId/companyRole refusée.
    const fresh = env.authenticatedContext("freshUser").firestore();
    await assertSucceeds(fresh.collection("users").doc("freshUser").set({ uid: "freshUser", role: "client", isAdmin: false }));
    const fresh2 = env.authenticatedContext("freshUser2").firestore();
    await assertFails(
      fresh2.collection("users").doc("freshUser2").set({ uid: "freshUser2", role: "client", isAdmin: false, companyId: "companyB", companyRole: "owner" })
    );
  });

  it("chauffeur : ne supprime pas sa fiche (delete admin seulement)", async () => {
    await assertFails(as.driver().firestore().collection("drivers").doc(UID.driver).delete());
  });

  it("membre société B : ne lit pas la société A ni ses membres", async () => {
    const db = as.memberB().firestore();
    await assertFails(db.collection("companies").doc(COMPANY_A).get());
    await assertFails(db.collection("companies").doc(COMPANY_A).collection("members").doc(UID.ownerA).get());
  });

  it("collaborateur : ne lit pas l'adhésion d'un autre membre (owner / admin seulement)", async () => {
    await assertFails(
      as.memberA().firestore().collection("companies").doc(COMPANY_A).collection("members").doc(UID.ownerA).get()
    );
  });

  it("collection inconnue : refusée même pour un admin", async () => {
    await assertFails(as.admin().firestore().collection("inconnue").doc("x").get());
  });
});

describe("resserrement du lot 0.5 (ex-todo)", () => {
  it("un client / chauffeur non validé / anonyme ne lit PAS le pool awaiting_driver", async () => {
    const q = (db: any) => db.collection("bookings").where("status", "==", "awaiting_driver").orderBy("createdAt", "desc").get();
    await assertSucceeds(q(as.driver().firestore())); // témoin : chauffeur validé
    await assertFails(q(as.client2().firestore()));
    await assertFails(q(as.driverPending().firestore()));
    await assertFails(q(as.anonymous().firestore()));
  });

  // Réserve phase 2 (en-tête de firestore.rules) : les règles ne filtrent pas les champs, le pool
  // renvoie encore name/phone. it.fails : devient vert (et doit passer en it) quand le pool sera
  // une version sans données personnelles.
  it.fails("le pool exposé au chauffeur validé ne contient pas de données personnelles (name, phone, email) — réserve phase 2", async () => {
    const snap = await as.driver().firestore().collection("bookings").doc(BOOKING.pool).get();
    const d = snap.data()!;
    if ("name" in d || "phone" in d || "email" in d) throw new Error("données personnelles exposées");
  });

  it("un chauffeur lit sa course assignée, pas celle d'un autre ni une course sans lien", async () => {
    const db = as.driver().firestore();
    await assertSucceeds(db.collection("bookings").doc(BOOKING.assigned).get());
    await assertFails(db.collection("bookings").doc(BOOKING.otherDriver).get());
    await assertFails(db.collection("bookings").doc(BOOKING.clientOwn).get());
  });

  it("un chauffeur non validé (pending) n'accepte pas de course", async () => {
    const db = as.driverPending().firestore();
    await assertFails(
      db.collection("bookings").doc(BOOKING.pool).update({
        driverId: UID.driverPending, driverAcceptedAt: ts(), status: "assigned",
        commissionRate: 0.2, platformShareCents: 1600, driverShareCents: 6400, updatedAt: ts(),
      })
    );
  });

  it("un chauffeur ne modifie ni son status (pending -> active) ni sa fiche hors champs autorisés", async () => {
    const db = as.driverPending().firestore();
    const ref = db.collection("drivers").doc(UID.driverPending);
    await assertSucceeds(ref.update({ phone: "+33699999999" })); // témoin
    await assertFails(ref.update({ status: "active" }));
    await assertFails(ref.update({ stats: { totalRides: 99, totalEarningsCents: 99999 } }));
    await assertFails(ref.update({ acceptedAt: new Date() }));
  });

  it("rôle : client -> driver autorisé (réserve phase 2), client -> admin et driver -> client refusés", async () => {
    await assertSucceeds(as.client2().firestore().collection("users").doc(UID.client2).update({ role: "driver" }));
    await assertFails(as.client().firestore().collection("users").doc(UID.client).update({ role: "admin" }));
    await assertFails(as.driver().firestore().collection("users").doc(UID.driver).update({ role: "client" }));
  });

  it("un utilisateur ne peut pas créer users/{uid} avec companyId / companyRole", async () => {
    const db = env.authenticatedContext("newU").firestore();
    await assertFails(db.collection("users").doc("newU").set({ uid: "newU", role: "client", isAdmin: false, companyId: COMPANY_A }));
    await assertFails(db.collection("users").doc("newU").set({ uid: "newU", role: "client", isAdmin: false, companyRole: "owner" }));
    await assertSucceeds(db.collection("users").doc("newU").set({ uid: "newU", role: "client", isAdmin: false }));
  });

  it("create booking : userId forcé à soi, statut devis uniquement, pas de driverId / paymentStatus", async () => {
    const db = as.client().firestore();
    const base = { userId: UID.client, accountType: "registered", status: "devis", prix: 80, createdAt: ts() };
    await assertSucceeds(db.collection("bookings").add(base));
    await assertFails(db.collection("bookings").add({ ...base, userId: UID.client2 }));
    await assertFails(db.collection("bookings").add({ ...base, status: "awaiting_driver" }));
    await assertFails(db.collection("bookings").add({ ...base, driverId: UID.driver }));
    await assertFails(db.collection("bookings").add({ ...base, paymentStatus: "authorized" }));
  });

  it("update booking par le chauffeur : seuls les champs de transition (pas prix, userId, paymentStatus)", async () => {
    const db = as.driver().firestore();
    const ref = db.collection("bookings").doc(BOOKING.assigned);
    await assertFails(ref.update({ status: "in_progress", prix: 1 }));
    await assertFails(ref.update({ status: "in_progress", userId: UID.driver }));
    await assertFails(ref.update({ status: "in_progress", paymentStatus: "captured" }));
    await assertSucceeds(ref.update({ status: "in_progress", driverStartedAt: ts(), updatedAt: ts() })); // témoin
  });

  it("un chauffeur ne s'affecte pas une course d'autrui (driverId == uid sur course d'un autre)", async () => {
    await assertFails(
      as.driver().firestore().collection("bookings").doc(BOOKING.otherDriver).update({ driverId: UID.driver, updatedAt: ts() })
    );
  });

  it("un client n'écrit pas sur une réservation existante (status, prix, paymentStatus)", async () => {
    const ref = as.client().firestore().collection("bookings").doc(BOOKING.clientOwn);
    await assertFails(ref.update({ status: "awaiting_driver" }));
    await assertFails(ref.update({ prix: 1 }));
    await assertFails(ref.update({ paymentStatus: "captured" }));
  });

  it("course perso d'un salarié invisible pour son entreprise (owner/membre) ; visible du salarié et de l'admin", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection("bookings").doc("bkPerso").set({
        userId: UID.memberA, status: "devis", prix: 50, createdAt: new Date(), companyId: COMPANY_A,
      });
    });
    await assertSucceeds(as.memberA().firestore().collection("bookings").doc("bkPerso").get());
    await assertSucceeds(as.admin().firestore().collection("bookings").doc("bkPerso").get());
    await assertFails(as.ownerA().firestore().collection("bookings").doc("bkPerso").get());
    await assertFails(as.memberB().firestore().collection("bookings").doc("bkPerso").get());
  });

  it("un propriétaire d'entreprise A ne lit ni n'écrit rien de l'entreprise B", async () => {
    const db = as.ownerA().firestore();
    await assertSucceeds(db.collection("companies").doc(COMPANY_A).get()); // témoin
    await assertFails(db.collection("companies").doc(COMPANY_B).get());
    await assertFails(db.collection("companies").doc(COMPANY_B).collection("members").get());
    await assertFails(db.collection("companies").doc(COMPANY_B).update({ walletBalanceCents: 1 }));
    await assertFails(db.collection("companies").doc(COMPANY_B).collection("members").doc(UID.memberB).update({ monthlyBudgetCents: 1 }));
  });
});
