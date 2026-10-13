// Lot 0.6 : règles Storage (émulateur demo-izymoto). Chemins et métadonnées reproduisent
// lib/firebase/drivers.ts (uploadDriverDocument / deleteDriverDocument) et
// lib/firebase/admin.ts (generateInvoicePDF). isAdmin lit users/{uid} dans Firestore.
import { readFileSync } from "node:fs";
import path from "node:path";
import "firebase/compat/storage";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { actors, PROJECT_ID, seed, UID } from "./helpers";

let env: RulesTestEnvironment;
let as: ReturnType<typeof actors>;

const read = (f: string) => readFileSync(path.resolve(process.cwd(), f), "utf8");

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: read("firestore.rules") },
    storage: { rules: read("storage.rules") },
  });
  as = actors(env);
});
afterAll(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
  await seed(env);
  await env.withSecurityRulesDisabled(async (ctx) => {
    const s = ctx.storage();
    await s.ref(`drivers/${UID.driver}/identityCard_1_cni.pdf`).put(pdf(), { contentType: "application/pdf" });
    await s.ref("factures/facture_bkClientOwn_1.pdf").put(pdf(), { contentType: "application/pdf" });
    await s.ref("autre/fichier.txt").put(pdf(), { contentType: "text/plain" });
  });
});

const pdf = (size = 1024) => new Uint8Array(size).fill(37);
const driverDoc = (uid: string, name = "drivingLicense_1760000000000_permis.pdf") => `drivers/${uid}/${name}`;
const ownDoc = driverDoc(UID.driver, "identityCard_1_cni.pdf");
const facture = "factures/facture_bkClientOwn_1.pdf";
const put = (ctx: any, p: string, data = pdf(), contentType = "application/pdf") =>
  ctx.storage().ref(p).put(data, { contentType });
const url = (ctx: any, p: string) => ctx.storage().ref(p).getDownloadURL();
const del = (ctx: any, p: string) => ctx.storage().ref(p).delete();

describe("drivers/{uid}/ — documents chauffeur", () => {
  it("le chauffeur dépose un document dans son dossier (PDF, JPEG, PNG, HEIC)", async () => {
    await assertSucceeds(put(as.driver(), driverDoc(UID.driver)));
    await assertSucceeds(put(as.driver(), driverDoc(UID.driver, "motoPhoto_1_moto.jpg"), pdf(), "image/jpeg"));
    await assertSucceeds(put(as.driver(), driverDoc(UID.driver, "rib_1_rib.png"), pdf(), "image/png"));
    await assertSucceeds(put(as.driverPending(), driverDoc(UID.driverPending, "insurance_1_a.heic"), pdf(), "image/heic"));
  });

  it("dépôt refusé dans le dossier d'un autre, sans connexion, ou par l'admin", async () => {
    await assertFails(put(as.driver(), driverDoc(UID.driver2)));
    await assertFails(put(as.client(), driverDoc(UID.driver)));
    await assertFails(put(as.anonymous(), driverDoc(UID.driver)));
    await assertFails(put(as.admin(), driverDoc(UID.driver)));
  });

  it("dépôt refusé : mauvais type, trop gros, vide, nom hors convention, sous-dossier", async () => {
    await assertFails(put(as.driver(), driverDoc(UID.driver, "rib_1_x.html"), pdf(), "text/html"));
    await assertFails(put(as.driver(), driverDoc(UID.driver, "rib_1_x.svg"), pdf(), "image/svg+xml"));
    await assertFails(put(as.driver(), driverDoc(UID.driver), pdf(10 * 1024 * 1024 + 1)));
    await assertFails(put(as.driver(), driverDoc(UID.driver), new Uint8Array(0)));
    await assertFails(put(as.driver(), driverDoc(UID.driver, "avatar.pdf")));
    await assertFails(put(as.driver(), driverDoc(UID.driver, "selfie_1_x.pdf")));
    await assertFails(put(as.driver(), `drivers/${UID.driver}/sub/identityCard_1_x.pdf`));
  });

  it("dépôt refusé : chauffeur suspendu ou rejeté, compte sans fiche chauffeur", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection("drivers").doc(UID.driver2).update({ status: "suspended" });
      await ctx.firestore().collection("drivers").doc(UID.driverPending).update({ status: "rejected" });
    });
    await assertFails(put(as.driver2(), driverDoc(UID.driver2)));
    await assertFails(put(as.driverPending(), driverDoc(UID.driverPending)));
    await assertFails(put(as.client(), driverDoc(UID.client)));
  });

  it("nom de fichier : 200 caractères acceptés, 201 refusés", async () => {
    const name = (n: number) => `rib_1_${"a".repeat(n)}`;
    await assertSucceeds(put(as.driver(), driverDoc(UID.driver, name(200))));
    await assertFails(put(as.driver(), driverDoc(UID.driver, name(201))));
  });

  it("un fichier existant ne peut être ni écrasé ni requalifié", async () => {
    await assertFails(put(as.driver(), ownDoc));
    await assertFails(as.driver().storage().ref(ownDoc).updateMetadata({ contentType: "text/html" }));
  });

  it("lecture : le chauffeur et l'admin seulement", async () => {
    await assertSucceeds(url(as.driver(), ownDoc));
    await assertSucceeds(url(as.admin(), ownDoc));
    await assertFails(url(as.driver2(), ownDoc));
    await assertFails(url(as.client(), ownDoc));
    await assertFails(url(as.anonymous(), ownDoc));
  });

  it("suppression : le chauffeur tant que son dossier est en attente, et l'admin", async () => {
    const pendingDoc = driverDoc(UID.driverPending, "rib_1_rib.pdf");
    await env.withSecurityRulesDisabled((ctx) => put(ctx, pendingDoc));
    await assertFails(del(as.driver(), pendingDoc));
    await assertSucceeds(del(as.driverPending(), pendingDoc));
    await assertFails(del(as.driver(), ownDoc)); // dossier validé : pièce figée
    await assertFails(del(as.driver2(), ownDoc));
    await assertFails(del(as.client(), ownDoc));
    await assertSucceeds(del(as.admin(), ownDoc));
  });
});

describe("factures/ — PDF du back-office", () => {
  it("l'admin génère, lit et supprime une facture", async () => {
    await assertSucceeds(put(as.admin(), "factures/facture_card_pi_3Abc_1760000000000.pdf"));
    // Comme admin.ts : blob jsPDF sans contentType explicite.
    const blob = new Blob([pdf()], { type: "application/pdf" });
    await assertSucceeds(Promise.resolve(as.admin().storage().ref("factures/facture_x_2.pdf").put(blob)));
    await assertSucceeds(url(as.admin(), facture));
    await assertSucceeds(del(as.admin(), facture));
  });

  it("refusé à tout autre acteur, y compris le client concerné", async () => {
    await assertFails(url(as.client(), facture));
    await assertFails(url(as.driver(), facture));
    await assertFails(url(as.anonymous(), facture));
    await assertFails(put(as.client(), "factures/facture_x_1.pdf"));
    await assertFails(del(as.client(), facture));
  });

  it("refusé à l'admin hors convention : autre type, trop gros, nom libre", async () => {
    await assertFails(put(as.admin(), "factures/facture_x_1.pdf", pdf(), "text/html"));
    await assertFails(put(as.admin(), "factures/facture_x_1.pdf", pdf(5 * 1024 * 1024 + 1)));
    await assertFails(put(as.admin(), "factures/index.html", pdf(), "application/pdf"));
  });
});

describe("tout le reste", () => {
  it("refusé à tous, admin compris", async () => {
    await assertFails(url(as.admin(), "autre/fichier.txt"));
    await assertFails(put(as.admin(), "public/x.pdf"));
    await assertFails(put(as.driver(), `drivers/${UID.driver}.pdf`));
    await assertFails(url(as.anonymous(), "autre/fichier.txt"));
  });
});
