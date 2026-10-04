# Rapport — Phase 0 (exécution autonome)

Démarrage : 2026-10-04. Porte 1 validée par Fayssal (lots 0.1 à 0.5). Ordre d'exécution : 0.1 → 0.2 → 0.4 → 0.3 → 0.5.
Chaque branche part de la précédente : `feat/wallet-entreprise` → `lot/0.1-outillage` → `lot/0.2-auth-routes` → `lot/0.4-invitations` → `lot/0.3-prix-serveur` → `lot/0.5-regles`.
Aucun push, aucun merge, aucun déploiement. Émulateur uniquement (projectId `demo-izymoto`).

## Remarques d'organisation

- Les agents de `.claude/agents/` ne sont pas chargés dans cette session (la liste des agents disponibles ne les contient pas). Ils sont donc lancés comme agents généraux auxquels on transmet le prompt complet de leur fiche (`dev-fullstack`, `securite-reviewer`, `qa-tests`) et le même modèle. Le « lecture seule » du relecteur repose sur la consigne, pas sur l'outil.
- Le plan détaillé (contenu des lots) provient de la proposition faite dans la session précédente du 2026-10-04 : 0.1 outillage (Vitest + émulateur + CI), 0.2 authentification des routes, 0.3 prix serveur, 0.4 invitations et retrait de membre, 0.5 règles Firestore minimales.
- Java 17 est installé. Les versions récentes de `firebase-tools` exigent Java 21 pour l'émulateur ; on épingle donc une version compatible Java 17 en dépendance de développement (aucune installation système).
- Historique git contrôlé (`git log --all --name-only` filtré sur sdk/pem/env/secret/serviceaccount) : aucun fichier sensible jamais commité.

---

## Lot 0.1 — Outillage de tests (SENSIBLE)

- **Branche** : `lot/0.1-outillage` (part de `feat/wallet-entreprise`)
- **Commit** : voir `git log lot/0.1-outillage -1` (message « test(outillage) : … »)
- **Contenu** : Vitest 3.2.7 + `@firebase/rules-unit-testing` 5.0.2 + `firebase-tools` 13.35.1 (versions exactes ; 13.x = compatible Java 17) ; section `emulators` de `firebase.json` (firestore 8080, auth 9099, UI coupée) ; `vitest.config.ts` ; `tests/setup-env.ts` (projet `demo-izymoto` forcé, garde qui refuse un hôte non local ou un projet non `demo-*`, clé RSA jetable générée à la volée) ; `tests/rules/` (helpers + `baseline.test.ts`) ; `tests/api/` (helpers avec vrais jetons de l'émulateur Auth + `smoke.test.ts`, Stripe/Resend simulés) ; CI `.github/workflows/ci.yml` (Node 20, Java 17, `npm ci`, `tsc`, `npm test`, actions épinglées par SHA, aucun secret) ; scripts `test`, `test:rules`, `test:api` ; `.gitignore` (logs d'émulateur) ; `CLAUDE.md` §2 et §4 (mention des tests).
- **Verdicts** :
  - qa-tests (implémenteur) : VALIDÉ AVEC RÉSERVES.
  - securite-reviewer : VALIDÉ AVEC RÉSERVES (aucun bloquant). Constats MOYENS corrigés au 1er aller-retour : en-tête de la suite de base reformulé, tests figeant des écritures client contraires à D-001 isolés dans un `describe` « non conforme — à migrer », 2 fausses assurances transformées en `it.fails` (chauffeur qui s'approprie la course d'un autre ; suppression puis recréation de son profil avec `companyId` d'une autre entreprise). Constats BAS corrigés (garde de `setup-env`, assertion Stripe, SHA, versions exactes).
- **Tests réellement exécutés (par le chef, après corrections)** : `npx tsc --noEmit` → code 0 ; `npm test` → `Test Files 2 passed (2)`, `Tests 40 passed | 13 todo (53)`, émulateur Firestore + Auth démarré sous Java 17. Les 3 `it.fails` sont des failles connues (lot 0.2 pour `send-devis`, lot 0.5 pour les deux autres).
- **Réserves ouvertes** :
  - `.firebaserc` a pour projet par défaut `izymoto` (prod) : un `firebase emulators:start` lancé à la main tournerait sous l'identifiant de prod. Toujours passer par `npm test`.
  - Vercel installe les devDependencies : `firebase-tools` (et la compilation native de `re2`) entrera dans le build. À accepter ou à exclure (porte 2).
  - `npm install` signale 56 vulnérabilités (arbre de `firebase-tools` surtout) ; `npm audit fix` non lancé.
  - En mode émulateur, `verifyIdToken` ne vérifie pas la signature : les tests ne prouvent pas le rejet d'un jeton forgé en prod (comportement firebase-admin standard).

