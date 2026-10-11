// Preuve d'exposition : les MÊMES attaques que rules-emergency.test.mjs, jouées contre les
// règles de PRODUCTION relevées le 2026-10-05 (docs/incident/regles-prod-2026-10-05.rules),
// chargées sur un projet d'émulateur distinct (demo-izymoto-prod).
//
// Commande (depuis la racine du dépôt) :
//   npx firebase emulators:exec --only firestore,auth --project demo-izymoto "npx vitest run --config docs/incident/tests/vitest.config.mjs"
//
// Attendu : `prod: true` dans attacks.mjs = ACCEPTÉE en prod (exposition réelle) ;
// `prod: false` = refusée même en prod (anonyme sans accès hors bookings).
import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { PROJECT_PROD, RULES_PROD, createEnv, seed } from "./helpers.mjs";
import { ATTACKS } from "./attacks.mjs";

let env;
beforeAll(async () => { env = await createEnv(PROJECT_PROD, RULES_PROD); });
afterAll(async () => { await env?.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); await seed(env); });

describe("4. Règles de PRODUCTION : les attaques sont ACCEPTÉES (exposition)", () => {
  for (const a of ATTACKS) {
    it(`${a.prod ? "ACCEPTÉE en prod" : "refusée en prod"} — ${a.name}`, async () => {
      const op = Promise.resolve().then(() => a.run(env));
      if (a.prod) await assertSucceeds(op);
      else await assertFails(op);
    });
  }
});
