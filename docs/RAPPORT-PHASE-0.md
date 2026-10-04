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


---

## Lot 0.2 — Authentification des routes (SENSIBLE)

- **Branche** : `lot/0.2-auth-routes` (part de `lot/0.1-outillage`)
- **Commit** : voir `git log lot/0.2-auth-routes -1` (message « fix(securite) : lot 0.2 … »)
- **Contenu** :
  - Jeton Firebase obligatoire (vérifié serveur, 401 sinon) sur `wallet/create-checkout`, `wallet/debit-for-booking`, `wallet/finalize-hybrid-booking`, `create-payment-intent` ; `increment-authorization` réservé admin (aucun appelant client).
  - L'identité vient toujours du jeton (`auth.uid`, `auth.email`) ; listes blanches des champs acceptés du client (`lib/api/identity.ts` : `pickBookingFields`, `pickPaymentIntentMetadata`) ; métadonnées Stripe réservées (`userId`, `paymentMode`, `walletAmountCents`, `totalAmountCents`) posées par le serveur ; nom/téléphone/notes retirés des métadonnées Stripe ; message d'erreur Stripe non renvoyé au client.
  - `finalize-hybrid-booking` : contrôle de propriété du PaymentIntent avant tout effet de bord ; un PaymentIntent = une seule course (ledger `hybrid_<pi>`), cohérence mode/montants exigée.
  - Idempotence : un ledger existant n'est renvoyé qu'à son propriétaire (409 sinon) ; format de `clientToken` contrôlé.
  - Entreprise : `member/remove` ne peut plus éjecter un ancien membre passé dans une autre société ; aperçu d'invitation avec email masqué ; lien d'invitation et URLs Stripe construits depuis `NEXT_PUBLIC_SITE_URL` (repli `https://izymoto.com`), plus jamais depuis l'en-tête `Origin` ; `companyName` échappé dans l'email.
  - `send-devis` : échappement HTML complet, sujet et logs nettoyés, email validé strictement.
  - Client : en-tête `Authorization: Bearer <idToken>` ajouté sur tous les appels concernés (`PaymentModal.jsx`, `WalletTiersSection.tsx`, `useReservation.js`, `confirmationEmail.ts`).
- **Verdicts** :
  - dev-fullstack : VALIDÉ AVEC RÉSERVES.
  - securite-reviewer : 1er passage **BLOQUANT** (HAUTE : un même PaymentIntent réutilisable pour N courses) + 5 MOYENNES → corrigés au 1er aller-retour → 2e passage **VALIDÉ AVEC RÉSERVES** (4 BASSES).
  - qa-tests : VALIDÉ (après mise à jour des tests pour les corrections).
- **Tests réellement exécutés (par le chef)** : `npx tsc --noEmit` → code 0 ; `npm test` → `Test Files 4 passed (4)`, `Tests 97 passed | 13 todo (110)`. Fichiers : `tests/api/auth-routes.test.ts`, `tests/api/auth-routes-round1.test.ts`, `tests/api/smoke.test.ts` (401/403, identité injectée ignorée, propriété du PaymentIntent, isolation entre entreprises, budget collaborateur, idempotence, send-devis, échappement, Origin).
- **DÉCISION PROVISOIRE — à valider par Fayssal** : `send-devis` pour un **invité** (non connecté) n'envoie plus le devis à l'adresse saisie : un seul email part, vers `contact@izymoto.com`, avec l'adresse de l'invité dans le contenu ; l'écran invité affiche « Votre demande a bien été transmise, nous vous recontactons ». Utilisateur connecté : envoi à l'email du jeton ; jeton sans email → 400. Raison : la route servait de relais d'envoi d'emails à n'importe quelle adresse depuis contact@izymoto.com. Pour rétablir l'envoi à l'invité : captcha/App Check + limitation de débit.
- **Réserves ouvertes** :
  - `email_verified` non exigé (un compte créé avec l'adresse d'un tiers reçoit le devis) → à traiter avec le lot 0.4.
  - Aucune limitation de débit sur `send-devis` (volume vers contact@).
  - Déploiement : un PaymentIntent hybride créé **avant** la mise en production sera refusé (409) à la finalisation, l'empreinte restant posée jusqu'à expiration → déployer à un moment creux.
  - `NEXT_PUBLIC_SITE_URL` doit être correcte sur Vercel (sinon repli `https://izymoto.com`, y compris sur les prévisualisations).
  - Si `send-devis` répond 400 à un utilisateur connecté, l'écran « devis envoyé » s'affiche quand même (erreur seulement journalisée côté client).
- **Questions pour Fayssal remontées par les agents** :
  - Un collaborateur voit toutes ses courses payées par portefeuille débitées sur la société, sans choix perso/pro : contradiction avec « Courses perso d'un salarié : Non » (DECISIONS.md). À trancher (phase 3 ?).
  - CORS `*` avec `Allow-Credentials` sur tout le site (`vercel.json:12-13`).
  - Le webhook Stripe écrit dans `bookings` avec le SDK client non authentifié, alors que `firestore.rules` l'interdit : soit ces mises à jour échouent en prod, soit les règles déployées diffèrent du fichier → à vérifier dans la console (lot 0.6 « comparer les règles déployées »).
