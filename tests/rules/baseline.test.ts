// Non-régression fonctionnelle : accès légitimes de l'app (chauffeur, client, entreprise,
// admin) avec les règles ACTUELLES de firestore.rules. Filet de sécurité pour le lot 0.5 :
// le PARCOURS fonctionnel doit rester possible ; le CHEMIN (client direct ou route serveur)
// peut changer. Le bloc « comportement actuel non conforme D-001 » fige des écritures client
// directes qui doivent migrer côté serveur : à remplacer par le test du parcours équivalent
// via la route serveur, pas à conserver tels quels.
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
  createEnv,
  seed,
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
  // PROVISOIRE : les documents bookings contiennent name/phone du passager, alors que
  // « Qui voit quoi » (DECISIONS.md) exige une version sans données personnelles pour le pool.
  // Ce test ne prouve que le parcours fonctionnel « le chauffeur validé voit le pool » ; il
  // sera adapté au lot 0.5 (voir les it.todo « pool » en bas de fichier).
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
        "documents.licence": { url: "https://x", path: "drivers/driverOk/licence_1.pdf", filename: "l.pdf", uploadedAt: new Date() },
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

  it("supprime son propre users/{uid}", async () => {
    await assertSucceeds(as.client2().firestore().collection("users").doc(UID.client2).delete());
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

describe("comportement actuel non conforme D-001 — à migrer côté serveur (lot 0.5 ou phase 2)", () => {
  // Écritures sensibles (statut de course, parts commission, rôle, vérification téléphone, prix,
  // droits admin) faites aujourd'hui directement par le client. Elles passent avec les règles
  // actuelles mais doivent passer par le serveur : ces tests devront être remplacés, pas conservés.
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
          driverAcceptedAt: new Date(),
          status: "assigned",
          commissionRate: 0.2,
          platformShareCents: 1600,
          driverShareCents: 6400,
          updatedAt: new Date(),
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
        tx.update(ref, { status: "in_progress", driverStartedAt: new Date(), updatedAt: new Date() });
      })
    );
  });

  it("termine sa course (in_progress -> completed_by_driver)", async () => {
    const db = as.driver().firestore();
    await assertSucceeds(
      db.runTransaction(async (tx) => {
        const ref = db.collection("bookings").doc(BOOKING.inProgress);
        await tx.get(ref);
        tx.update(ref, { status: "completed_by_driver", driverCompletedAt: new Date(), updatedAt: new Date() });
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
          updatedAt: new Date(),
        });
      })
    );
  });

  it("inscription : marque users/{uid}.role = driver (merge) puis crée drivers/{uid}", async () => {
    const db = as.client2().firestore();
    await assertSucceeds(
      db.collection("users").doc(UID.client2).set({ role: "driver", updatedAt: new Date() }, { merge: true })
    );
    await assertSucceeds(
      db.collection("drivers").doc(UID.client2).set({ uid: UID.client2, email: "client2@test.dev", status: "pending", availability: "offline" })
    );
  });

  it("client : marque phoneVerified:true lui-même (à migrer côté serveur)", async () => {
    const db = as.client().firestore();
    await assertSucceeds(db.collection("users").doc(UID.client).set({ phoneVerified: true }, { merge: true }));
  });

  it("crée une réservation (saveBooking : addDoc bookings avec son userId)", async () => {
    const db = as.client().firestore();
    await assertSucceeds(
      db.collection("bookings").add({ userId: UID.client, status: "pending", accountType: "registered", prix: 80, createdAt: new Date() })
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

  // Faille firestore.rules:82 (request.resource.data.driverId == uid), corrigée au lot 0.5 :
  // un chauffeur peut s'attribuer une course assignée à un autre. Attendu REFUSÉ ; it.fails
  // tant que la règle n'est pas resserrée (passer en it au lot 0.5).
  it.fails("chauffeur : ne peut pas s'attribuer la course assignée à un autre chauffeur (faille firestore.rules:82, lot 0.5)", async () => {
    await assertFails(
      as.driver().firestore().collection("bookings").doc(BOOKING.otherDriver).update({ driverId: UID.driver, status: "in_progress" })
    );
  });

  // Faille firestore.rules:45-46 + 54 (create sans contrôle de companyId/companyRole, delete de
  // son propre doc autorisé), corrigée au lot 0.5 : suppression puis recréation de users/{uid}
  // avec un rattachement entreprise choisi. Attendu REFUSÉ ; it.fails jusqu'au lot 0.5.
  it.fails("collaborateur : ne peut pas supprimer puis recréer son users/{uid} avec companyId/companyRole (faille lot 0.5)", async () => {
    const db = as.memberA().firestore();
    await assertSucceeds(db.collection("users").doc(UID.memberA).delete());
    await assertFails(
      db.collection("users").doc(UID.memberA).set({ uid: UID.memberA, role: "client", isAdmin: false, companyId: "companyB", companyRole: "owner" })
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

describe("failles connues à traiter au lot 0.5 (tests à écrire)", () => {
  it.todo("un client / chauffeur non validé ne lit PAS le pool awaiting_driver");
  it.todo("le pool exposé au chauffeur validé ne contient pas de données personnelles du passager (name, phone, email)");
  it.todo("un chauffeur lit une course assignée à lui seul, pas celle des autres, et seulement pendant sa durée");
  it.todo("un chauffeur non validé (status pending) n'accepte pas de course");
  it.todo("un chauffeur ne peut pas modifier son propre status (pending -> active) ni sa fiche hors champs autorisés");
  it.todo("un utilisateur ne peut pas modifier son propre role (client -> driver/admin) hors parcours serveur");
  it.todo("un utilisateur ne peut pas créer users/{uid} avec companyId / companyRole");
  it.todo("create booking : userId forcé à request.auth.uid, statut initial restreint, pas d'injection de driverId / prix / paymentStatus");
  it.todo("update booking par le chauffeur : seuls les champs de transition autorisés (pas prix, userId, paymentStatus)");
  it.todo("un chauffeur ne peut pas s'affecter une course d'autrui (request.resource.data.driverId == uid)");
  it.todo("un client n'écrit pas sur une réservation existante (status, prix, paymentStatus)");
  it.todo("course perso d'un salarié invisible pour son entreprise ; courses pro visibles de l'admin de sa société uniquement");
  it.todo("un propriétaire d'entreprise A ne lit ni n'écrit rien de l'entreprise B");
});
