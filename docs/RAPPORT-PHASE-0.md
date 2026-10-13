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

---

## Lot 0.4 — Invitations et retrait de membre (SENSIBLE)

- **Branche** : `lot/0.4-invitations` (part de `lot/0.2-auth-routes`)
- **Commit** : voir `git log lot/0.4-invitations -1` (message « fix(securite) : lot 0.4 … »)
- **Contenu** :
  - Acceptation d'invitation : refus 403 `EMAIL_NOT_VERIFIED` si l'email du jeton n'est pas vérifié, puis 403 `EMAIL_MISMATCH` s'il diffère de l'email invité (comparaison trim + minuscules) ; contrôles dans la transaction, avant toute écriture ; l'invitation reste `pending` en cas de refus.
  - Page d'invitation : messages en français pour ces deux cas, bouton « Recevoir l'email de vérification » (`sendEmailVerification`) puis réessai avec jeton rafraîchi ; token encodé dans l'URL.
  - Retrait de membre : `revokeRefreshTokens` après la transaction ; la route renvoie `sessionsRevoked: true/false`.
  - `requireAuth` / `requireAdmin` : `verifyIdToken(token, true)` (sessions révoquées refusées) ; `emailVerified` exposé depuis le jeton ; erreurs de jeton → 401, panne technique d'Auth → 503.
  - `revokeInvitation` transactionnelle (une invitation acceptée ne repasse plus `revoked`) ; un membre réinvité conserve sa dépense de la période.
  - `send-devis` : envoi au client uniquement si son email est vérifié, sinon admin seul (prolonge la décision provisoire du lot 0.2).
- **Verdicts** :
  - dev-fullstack : VALIDÉ (après 1 aller-retour).
  - securite-reviewer : VALIDÉ AVEC RÉSERVES (aucun CRITIQUE/HAUTE) ; 6 constats BASSES corrigés au 1er aller-retour (relecture du chef sur la gestion 401/503).
  - qa-tests : VALIDÉ AVEC RÉSERVES (réserve de couverture : sur l'émulateur, firebase-admin vérifie la révocation d'office ; on ne peut donc pas prouver sur l'émulateur que le `checkRevoked=true` est nécessaire en prod).
- **Tests réellement exécutés (par le chef)** : `npx tsc --noEmit` → code 0 ; `npm test` → `Test Files 5 passed (5)`, `Tests 119 passed | 13 todo (132)`. Nouveau fichier `tests/api/invitations-revocation.test.ts` (21 tests : bon/mauvais email, non vérifié, casse/espaces, expirée/acceptée/révoquée, acceptation concurrente, ancien jeton du membre retiré refusé sur `company/overview` et `wallet/debit-for-booking`, jeton admin révoqué refusé sur `capture-payment`).
- **Réserves ouvertes** :
  - **À corriger au lot 0.5** : `firestore.rules` (`isCompanyMember`) ne vérifie pas `status == "active"` → un membre retiré garde, via le SDK client, la lecture de `companies/{id}` (solde, SIRET, adresse).
  - Les comptes email/mot de passe existants n'ont jamais reçu d'email de vérification (l'appli n'en envoyait pas) : ils devront vérifier leur email via la page d'invitation, et ne reçoivent plus le devis par email tant que ce n'est pas fait. Les comptes Google sont déjà vérifiés.
  - Le 401/503 n'est pas testé (pas de simulation de panne Auth).
  - Révocation à la seconde près (un jeton émis dans la même seconde que le retrait reste valable) : négligeable, l'accès société est coupé en base.
- **Questions pour Fayssal** :
  - Retirer un membre le déconnecte de **toutes** ses sessions, y compris son usage personnel du site : voulu ?
  - Envoyer automatiquement l'email de vérification à l'inscription (changement du parcours d'inscription, non fait) ?
  - Journal d'audit des actions sur les membres (retrait, acceptation, budget) : maintenant ou en phase 1 ?

---

## Lot 0.3 — Prix calculé par le serveur (SENSIBLE, tunnel Stripe — accord de Fayssal pour le code ; rien de modifié côté Stripe)

- **Branche** : `lot/0.3-prix-serveur` (part de `lot/0.4-invitations`)
- **Commit** : voir `git log lot/0.3-prix-serveur` (message « fix(paiement) : lot 0.3 … »)
- **Contenu** :
  - Module unique `lib/pricing/` (grille, majorations, zones, distance, devis), utilisé par le client et le serveur ; `app/reserver/utils/constants.js` et `pricingUtils.js` deviennent des ré-exports. Grille inchangée (comparaison ancien/nouveau sur ~16 000 combinaisons par le développeur ; 16 forfaits dans les deux sens + majorations testés).
  - Majorations calculées à l'heure de **Paris** (`Intl`, `Europe/Paris`) côté client et serveur (le serveur Vercel tourne en UTC). La règle « moins de 2 h » était auparavant évaluée dans le fuseau du navigateur.
  - Le serveur recalcule le montant dans `create-payment-intent`, `wallet/debit-for-booking`, `wallet/finalize-hybrid-booking`, `send-devis` ; tout montant du client est ignoré ; écart avec le prix affiché → 409 `PRICE_CHANGED` + écran « Le prix de votre course a changé » côté client. Part portefeuille contrôlée contre le solde réel (et le budget collaborateur).
  - **Nouvelle route `app/api/finalize-card-booking`** : la course payée par carte seule est créée par le serveur (doc `bookings/card_<pi>`, `serverFinalized: true`) et non plus par le navigateur ; contrôle de propriété du PaymentIntent, statut `requires_capture`, prix et course identiques à ceux de l'empreinte.
  - Verrou par PaymentIntent (`paymentClaims/<pi>`, `lib/payments/claims.ts`) contre les requêtes concurrentes ; l'empreinte n'est libérée que par le détenteur du verrou ; réponses 409 avec `holdReleased`.
  - Recalcul de finalisation à l'heure de création de l'empreinte (`pi.created`) pour qu'un 3DS lent ne change pas le prix.
  - Webhook Stripe : `amount_capturable_updated` ne rétrograde plus une course déjà acceptée (modification minimale).
  - Bouton « Réessayer la finalisation » si le paiement est autorisé mais la réservation pas encore créée.
- **Verdicts** :
  - dev-fullstack : VALIDÉ AVEC RÉSERVES.
  - securite-reviewer : 1er passage **BLOQUANT** (3 HAUTES : distance/coordonnées falsifiables → hors-forfait à 35 € ; zone lue dans le texte libre de l'adresse ; course de condition permettant d'annuler une empreinte déjà rattachée) → 2e passage **VALIDÉ AVEC RÉSERVES** (HAUTES fermées ; zone ramenée à MOYENNE résiduelle).
  - qa-tests : VALIDÉ AVEC RÉSERVES (351 tests verts).
- **Tests réellement exécutés (par le chef)** : `npx tsc --noEmit` → code 0 ; `npm test` → `Test Files 8 passed (8)`, `Tests 351 passed | 13 todo (364)`. Nouveaux fichiers : `tests/api/pricing.test.ts` (grille, majorations, fuseaux UTC/Los Angeles/Auckland/Paris, heure d'été, zones durcies), `tests/api/prix-serveur.test.ts` (montant client ignoré sur 4 routes, `PRICE_CHANGED`, `QUOTE_REQUIRED`, solde, verrou, concurrence A/B, rejeu, `RIDE_MISMATCH`, `holdReleased`, identifiants invalides), `tests/api/webhook-stripe.test.ts` (13 tests).
- **Non vérifié** : aucun test dans un navigateur (écrans « Demander un devis », nouveau prix, réessai) ; `next build` non lancé (il chargerait les fichiers `.env*`, interdits) — seuls `tsc` et une analyse syntaxique des `.jsx` par le développeur.
- **DÉCISIONS PROVISOIRES — à valider par Fayssal** :
  1. **Trajet hors forfait (ou zone indéterminée) non payable en ligne** : 400 `QUOTE_REQUIRED`, l'interface propose « Demander un devis ». Raison : sans clé Google côté serveur, la distance et les coordonnées viennent du navigateur et sont falsifiables (un trajet de 100 km payable 35 €). Pour rouvrir : calcul d'itinéraire / géocodage côté serveur.
  2. **Zones** : l'adresse doit contenir exactement un code postal ; un pôle (CDG, Orly, Le Bourget, Beauvais, Disneyland, La Défense) n'est retenu que si le mot-clé ET le code postal du pôle concordent (liste `POLES` dans `lib/pricing/compute.ts`). Effet de bord voulu : « Place Charles de Gaulle, 75008 Paris » n'est plus facturée comme Roissy. Une adresse Google sans code postal bascule en devis (à surveiller pour la conversion). **À tester en prévisualisation** : les adresses Google réelles des aéroports et de La Défense doivent être reconnues.
  3. **Risque résiduel accepté provisoirement** : une adresse saisie à la main avec un code postal mensonger mais cohérent (ex. « Gare de Versailles-Chantiers, 75015 ») obtient encore un forfait Paris. Visible par le chauffeur et l'admin ; l'admin peut capturer moins ou annuler. Consigne à donner : signaler une incohérence code postal / ville avant d'accepter. Correction durable : validation serveur des adresses (phase 1).
  4. Priorité obligatoire sous **1 h 15** (aligné sur l'écran) ; date passée de plus de 30 min ou à plus d'un an refusée au paiement.
  5. Course carte créée directement au statut `awaiting_driver` (au lieu de `confirmed` puis passage par le webhook), pour ne pas dépendre de l'ordre d'arrivée du webhook.
  6. En cas d'écart de prix ou de course différente de l'empreinte, l'empreinte est libérée automatiquement (le client repaie au bon prix).
- **Réserves ouvertes** :
  - **Prérequis de mise en production : lot 0.5** (`firestore.rules`). Sans lui, un client peut toujours écrire directement dans `bookings` (création libre avec `prix`, `paymentStatus`… ; modification en s'attribuant `driverId`), ce qui contourne tout le prix serveur.
  - MOYENNE (2e relecture) : le recalcul avec `pi.created` n'est pas borné dans le temps — un PaymentIntent créé longtemps avant et confirmé au dernier moment échappe à la majoration « < 2 h » et à la priorité obligatoire (≤ 40 €). Voir le complément ci-dessous.
  - BASSES : verrou hybride non libéré après un refus `CONFLICT` (bail 2 min) ; webhook en retard pouvant repasser `paymentStatus` de `captured` à `authorized` ; empreinte orpheline possible si le client ferme l'onglet avant la finalisation (aucune réconciliation automatique) ; jours fériés non gérés (comme avant).
  - Les devis restent écrits par le navigateur avec un `prix` client (`saveBooking`) : affichage back-office seulement, à cadrer au lot 0.5.
  - Incohérence d'affichage public : `CLAUDE.md` §1 annonce Paris↔Paris 65 € et aéroport dès 80 €, la grille applique 46 / 76 / 99 € (non modifié).

### Lot 0.3 — complément (2e commit sur la même branche)

- **Pourquoi** : MOYENNE et BASSES restantes de la 2e relecture (lot déjà validé avec réserves, pas de BLOQUANT).
- **Contenu** : instant de référence du recalcul = création de l'empreinte seulement si elle date d'au plus 30 min, sinon heure actuelle ; règles de délai (date passée, priorité < 1 h 15) toujours revérifiées à l'heure actuelle ; verrou hybride libéré après un refus `CONFLICT` ; webhook `amount_capturable_updated` n'écrase plus un `paymentStatus` déjà `captured`/`released`/`failed`…
- **Vérification** : relecture du diff par le chef ; dev-fullstack VALIDÉ ; qa-tests VALIDÉ (nouveaux cas : PI de 3 h / 25 min / 40 min, verrou libéré, webhook tardif).
- **Tests réellement exécutés (par le chef)** : `npx tsc --noEmit` → code 0 ; `npm test` → `Test Files 8 passed (8)`, `Tests 360 passed | 13 todo (373)`.
- La MOYENNE « `pi.created` non borné » et les BASSES « verrou hybride » et « webhook tardif » de la liste des réserves ci-dessus sont **fermées**.

---

## Lot 0.5 — Règles Firestore minimales (SENSIBLE) — écrites et testées sur l'émulateur, **jamais déployées**

- **Branche** : `lot/0.5-regles` (part de `lot/0.3-prix-serveur`)
- **Commit** : voir `git log lot/0.5-regles -1` (message « fix(regles) : lot 0.5 … »)
- **Contenu** (`firestore.rules` réécrit, refus par défaut en fin de fichier, commentaire de tête « ne pas déployer sans validation de Fayssal ») :
  - `users` : création en liste blanche (`isAdmin` doit valoir false, rôle `client` ou `driver`, ni `companyId`/`companyRole`/`phoneVerified`) ; mise à jour limitée au profil ; suppression réservée à l'admin (ferme « supprimer puis recréer ») ; tailles bornées.
  - `drivers` : création seulement en `pending` avec l'email du jeton ; le chauffeur ne touche ni à son statut, ni à ses statistiques, ni aux champs de validation ; disponibilité `online`/`offline` ; documents limités aux 6 types connus avec un chemin `drivers/<uid>/…`.
  - `bookings` : le client ne crée plus que des **devis** (`status: "devis"`, `userId` = soi, liste blanche, horodatage serveur ; ni argent, ni paiement, ni chauffeur, ni entreprise, ni id `card_`/`hybrid_`) ; aucune mise à jour par le passager ; **pool lisible seulement par un chauffeur validé** ; acceptation seulement par un chauffeur validé **et en ligne**, jamais sa propre course (D-003), commissions entières et cohérentes avec le `prix` du document ; démarrer/terminer réservés au chauffeur assigné et validé ; libérer permis au chauffeur assigné ; plus personne ne peut s'attribuer la course d'un autre.
  - `companies` : membre **actif** uniquement (un membre retiré ne lit plus rien) ; un collaborateur ne lit pas les fiches des autres ; aucune écriture client.
  - Collections serveur fermées : `paymentClaims`, `auditLogs`, `companyInvitations` ; `wallets`/`walletTransactions` en lecture du sien ; `factures` admin.
- **Code modifié pour rester compatible** :
  - Webhook Stripe : passe du SDK client **non authentifié** (refusé par les règles) à l'Admin SDK, logique inchangée. **Les règles et ce webhook doivent être déployés ensemble.**
  - Devis **invité** : plus d'écriture depuis le navigateur ; `send-devis` (serveur) enregistre la demande (`status: "devis"`, `accountType: "guest"`, prix serveur). Sans cela, les nouvelles règles cassaient le devis invité.
  - `dispatch.ts` et `bookings.js` : horodatages `serverTimestamp()` ; retrait de l'écriture client `phoneVerified: true` (champ lu nulle part).
- **Verdicts** :
  - dev-fullstack : VALIDÉ AVEC RÉSERVES.
  - securite-reviewer : 1er passage **BLOQUANT** (1 HAUTE : le pool expose les données perso ; MOYENNES : chauffeur suspendu, D-003, accaparement du pool, devis invité cassé…) → corrections → 2e passage **VALIDÉ AVEC RÉSERVES, sous condition d'une décision écrite de Fayssal sur la HAUTE du pool** (sans elle : BLOQUANT pour la production).
  - qa-tests : VALIDÉ.
- **Tests réellement exécutés (par le chef)** : `npx tsc --noEmit` → code 0 ; `npm test` → `Test Files 9 passed (9)`, `Tests 454 passed (454)`. Nouveau `tests/rules/isolation.test.ts` (chaque cas autorisé + refusé : pool, acceptation, D-003, hors ligne, suspendu, commissions, horodatages, devis, users, drivers, documents, entreprises A/B, membre retiré, collections serveur, admin) ; `tests/rules/baseline.test.ts` mis à jour (non-régression de l'espace chauffeur et client) ; tests `send-devis` invité.
- **BLOCAGE (décision de Fayssal requise avant toute mise en production)** : le pool (`bookings` en `awaiting_driver`) reste lisible **en entier** (nom, téléphone, email, notes du passager) par tout chauffeur validé, contrairement au tableau « Qui voit quoi » (« version sans données perso »). Les règles Firestore ne savent pas masquer des champs : la correction est la collection `ridePool` écrite par le serveur, prévue en phase 2. Fayssal doit soit inscrire dans DECISIONS.md une acceptation temporaire avec échéance, soit avancer `ridePool`. Un test `it.fails` documente cet écart. Rappel : avec les règles actuelles du dépôt, **tout compte connecté** lit ce pool ; ce lot réduit donc déjà fortement l'exposition.
- **Réserves ouvertes** :
  - `send-devis` invité : écriture en base + email sans authentification ni limitation de débit (spam/volume) → App Check ou captcha + limitation par IP avant la production.
  - `documents.*.url` des chauffeurs non contrôlé (l'admin ouvre ce lien) → générer le lien depuis `path` côté admin.
  - Le chauffeur lit les coordonnées du passager de ses courses même après la fin ; un collaborateur lit tout le document de son entreprise (solde, SIRET) ; le chauffeur peut changer son IBAN sans nouvelle validation ni journal ; un chauffeur suspendu garde ses courses assignées jusqu'à leur libération ; commissions encore écrites par le client (contraintes) ; `prix` client sur un devis connecté (sans effet sur un paiement) ; `reservationId` du devis invité fourni par l'appelant → phase 1/2.
  - **Avant déploiement** : comparer avec les règles en production ; vérifier en base que les fiches chauffeur existantes respectent les 6 types de documents et ont l'email de leur compte (sinon le chauffeur ne pourra plus mettre à jour sa fiche, même sa disponibilité).
  - Passage `client → driver` par soi-même autorisé (inscription chauffeur d'un compte existant) : sans effet tant que l'admin n'a pas validé `drivers/{uid}`.

---

## Synthèse finale (porte 2)

| Lot | Branche | Commit(s) | Verdict final | Tests (chef) |
| --- | --- | --- | --- | --- |
| 0.1 Outillage | `lot/0.1-outillage` | `d4615d4` | Validé avec réserves | 40 passés |
| 0.2 Auth des routes | `lot/0.2-auth-routes` | `2fdd989` | Validé avec réserves (après 1 BLOQUANT corrigé) | 97 passés |
| 0.4 Invitations | `lot/0.4-invitations` | `0c12a36` | Validé avec réserves | 119 passés |
| 0.3 Prix serveur | `lot/0.3-prix-serveur` | `062af0c`, `e96a01b` | Validé avec réserves (après 1 BLOQUANT corrigé) | 360 passés |
| 0.5 Règles | `lot/0.5-regles` | voir `git log` | **Bloqué pour la production** tant que Fayssal n'a pas tranché le pool ; sinon validé avec réserves | 454 passés |

Chaque branche contient les précédentes : `lot/0.5-regles` porte toute la phase 0.

**Décisions provisoires à valider par Fayssal** : (0.2) devis invité envoyé à l'admin seulement ; (0.3) hors-forfait payable uniquement sur devis, zones durcies par code postal, priorité obligatoire sous 1 h 15, course carte créée en `awaiting_driver`, libération automatique de l'empreinte en cas d'écart ; (0.5) décision sur le pool.

**À faire par Fayssal** : relire puis merger dans l'ordre (ou seulement `lot/0.5-regles`) ; décision écrite sur le pool ; tester la prévisualisation Vercel **sur un projet Firebase de test** (paiement carte, portefeuille, hybride, devis connecté et invité, hors-forfait → devis, invitation avec vérification d'email, espace chauffeur complet) ; comparer les règles en production avant de déployer règles + webhook ensemble ; lot 0.6 (nouvelle clé de service, révocation de l'ancienne, journaux GCP, retrait de `.secrets/`, règles Storage) ; définir `NEXT_PUBLIC_SITE_URL` sur Vercel ; déployer à un moment creux (PaymentIntents en cours refusés).
