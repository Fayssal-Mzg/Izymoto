// Lot 2.3 : pushDevices, pushTokens, pushEvents et pushReceipts sont réservés au serveur
// (Admin SDK, qui contourne les règles). Aucun client — particulier, chauffeur, validé ou non,
// admin, anonyme — ne lit ni n'écrit ces collections : refus par défaut, sans règle d'ouverture.
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { actors, createEnv, seed, UID } from "./helpers";

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
    await db.doc(`pushDevices/${UID.client}/devices/h1`).set({ token: "ExponentPushToken[abc]", platform: "ios", app: "client" });
    await db.doc(`pushDevices/${UID.driver}/devices/h2`).set({ token: "ExponentPushToken[def]", platform: "android", app: "chauffeur" });
    await db.doc("pushTokens/h1").set({ uid: UID.client });
    await db.doc("pushEvents/ride_available:bkPool:1").set({ createdAt: new Date() });
    await db.doc("pushReceipts/t1").set({ tokenHash: "h1", createdAt: new Date() });
  });
});

const ACTORS = ["anonymous", "client", "client2", "driver", "driverPending", "admin", "ownerA"] as const;

describe("collections de notification : serveur uniquement", () => {
  it("témoin : un client lit son propre profil (les règles sont bien actives)", async () => {
    await assertSucceeds(as.client().firestore().collection("users").doc(UID.client).get());
  });

  for (const who of ACTORS) {
    it(`${who} : aucune lecture ni écriture`, async () => {
      const db = as[who]().firestore();
      const own = who === "client" ? UID.client : who === "driver" ? UID.driver : who === "admin" ? UID.admin : UID.client;
      await assertFails(db.doc(`pushDevices/${own}/devices/h1`).get());
      await assertFails(db.collection(`pushDevices/${own}/devices`).get());
      await assertFails(db.doc(`pushDevices/${own}/devices/h9`).set({ token: "ExponentPushToken[zzz]", platform: "ios", app: "client" }));
      await assertFails(db.doc(`pushDevices/${own}/devices/h1`).update({ app: "chauffeur" }));
      await assertFails(db.doc(`pushDevices/${own}/devices/h1`).delete());
      await assertFails(db.doc(`pushDevices/${UID.client}`).set({ x: 1 }));
      await assertFails(db.doc("pushTokens/h1").get());
      await assertFails(db.collection("pushTokens").where("uid", "==", own).get());
      await assertFails(db.doc("pushTokens/h9").set({ uid: own }));
      await assertFails(db.doc("pushTokens/h1").update({ uid: own }));
      await assertFails(db.doc("pushTokens/h1").delete());
      await assertFails(db.doc("pushEvents/ride_available:bkPool:1").get());
      await assertFails(db.collection("pushEvents").get());
      await assertFails(db.doc("pushEvents/nouvelle").set({ createdAt: new Date() }));
      await assertFails(db.doc("pushEvents/ride_available:bkPool:1").delete());
      await assertFails(db.doc("pushReceipts/t1").get());
      await assertFails(db.doc("pushReceipts/t2").set({ tokenHash: "h1" }));
    });
  }
});
