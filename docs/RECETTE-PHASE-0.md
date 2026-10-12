# Recette phase 0 et mise en production

Branche `lot/0.5-regles`, prévisualisation Vercel branchée sur le projet Firebase **izymoto-staging-1dec9** et Stripe en **mode test**.

- Prévisualisation : `https://izymoto-git-lot-05-regles-merzouguifayssal-gmailcoms-projects.vercel.app`
- Comptes semés (`npm run seed:staging`), mot de passe commun = `SEED_PASSWORD` : `merzougui.fayssal+izy-<rôle>@gmail.com` avec `client`, `chauffeur`, `chauffeur-attente`, `admin`, `entreprise`, `collaborateur`.
- Cartes Stripe de test (date future, CVC quelconque) : `4242 4242 4242 4242` (acceptée), `4000 0025 0000 3155` (3D Secure), `4000 0000 0000 9995` (refusée).
- Après chaque paiement : Stripe (mode test) → Développeurs → Webhooks → l'endpoint de la prévisualisation doit montrer des livraisons **200**.
- Avant de commencer : relancer le seed pour repartir de données propres.

Cocher chaque ligne. Une ligne KO = noter l'heure, le compte, la capture d'écran, et ne pas passer en production.

## A. Réservation et paiement (compte `client`, portefeuille à 79 €)

- [ ] **A1 Carte** — Paris 8e → Paris 15e (forfait 46 €, hors majorations), date dans 3 jours à 14 h, payer par carte `4242…`.
  Attendu : confirmation affichée ; la course apparaît dans *Mon compte* avec le statut « en attente de chauffeur » ; Stripe montre un paiement **non capturé** (autorisé) du même montant ; webhook 200.
- [ ] **A2 Carte refusée** — même trajet, carte `…9995`. Attendu : message d'erreur, **aucune** nouvelle course dans *Mon compte*.
- [ ] **A3 3D Secure** — carte `…3155`, valider la fenêtre de test. Attendu : comme A1.
- [ ] **A4 Portefeuille** — Paris → Orly (76 €). Attendu : paiement par portefeuille proposé et accepté, solde 79 → 3 €, ligne « débit » dans *Mon portefeuille*, course créée.
- [ ] **A5 Hybride** — relancer le seed (solde 79 €), puis Paris → Roissy (99 €). Attendu : 79 € portefeuille + 20 € carte ; solde 0 € ; Stripe : paiement non capturé de **20 €** ; une seule course créée.
- [ ] **A6 Hybride annulé** — depuis le back-office (compte `admin`), annuler la course A5. Attendu : Stripe « annulé », la course passe « annulée », le portefeuille du client **revient à 79 €**.
- [ ] **A7 Prix non modifiable** — sur A1, rien à faire côté interface : le prix payé doit être exactement celui affiché (le serveur recalcule ; un écart bloque le paiement avec un message).
- [ ] **A8 Recharge portefeuille** — *Mon portefeuille* → choisir un forfait → payer `4242…`. Attendu : retour sur le site, solde crédité (montant + bonus du forfait), webhook `checkout.session.completed` 200.

## B. Devis

- [ ] **B1 Devis connecté** — compte `client`, demander un devis Paris → Roissy. Attendu : « Demande transmise » ; le devis apparaît dans *Mon compte* ; e-mail de confirmation reçu sur `+izy-client` (adresse vérifiée).
- [ ] **B2 Devis invité** — déconnecté, demander un devis avec `merzougui.fayssal+izy-invite@gmail.com`. Attendu : écran « Demande transmise » ; **aucun** e-mail sur l'adresse saisie ; e-mail reçu sur **contact@izymoto.com** (vraie boîte, préciser « TEST STAGING » dans les notes).
- [ ] **B3 Hors grille → devis** — Paris → Versailles (78). Attendu : prix affiché comme estimation, **paiement impossible**, seule la demande de devis est proposée.

## C. Entreprise

- [ ] **C1 Espace entreprise** — compte `entreprise` → *Mon compte* → Entreprise. Attendu : « Société Fictive SAS », solde 454 €, 2 membres, budget du collaborateur 200 € dont 46 € consommés.
- [ ] **C2 Invitation** — inviter `merzougui.fayssal+izy-invite2@gmail.com`. Ouvrir le lien d'invitation, créer le compte avec cette adresse.
  Attendu : l'acceptation est **refusée tant que l'e-mail n'est pas vérifié** ; bouton d'envoi de vérification ; après clic sur le lien reçu, l'acceptation passe ; le nouveau membre apparaît côté propriétaire.
- [ ] **C3 Invitation mauvaise adresse** — ouvrir le lien C2 connecté en `client`. Attendu : refus (adresse différente).
- [ ] **C4 Course payée par l'entreprise** — compte `collaborateur`, Paris → Paris (46 €) payé par l'entreprise. Attendu : solde entreprise −46 €, budget consommé +46 €.
- [ ] **C5 Isolation** — compte `client` : l'espace entreprise est absent ou vide ; aucune donnée de « Société Fictive SAS ».

## D. Espace chauffeur

- [ ] **D1 Chauffeur validé** — compte `chauffeur` → passer « en service ». Attendu : les courses en attente apparaissent (au moins celles du seed et de A1/A4).
- [ ] **D2 Cycle de course** — accepter une course → démarrer → terminer. Attendu : statuts successifs visibles dans *Mes courses*, part chauffeur = 80 % du prix ; la course n'est plus proposée aux autres.
- [ ] **D3 Hors service** — repasser « hors service ». Attendu : le pool n'est plus affiché.
- [ ] **D4 Chauffeur en attente** — compte `chauffeur-attente`. Attendu : bandeau « dossier en cours de validation », **aucune** course visible.
- [ ] **D5 Inscription chauffeur** — nouveau compte `+izy-chauffeur2` → *Devenir chauffeur* → remplir le profil et déposer les 5 documents (PDF ou photo, < 10 Mo). Attendu : dépôts réussis (Storage), dossier « en attente ».
- [ ] **D6 Document refusé** — tenter un fichier `.html` ou > 10 Mo. Attendu : refus.
- [ ] **D7 Client** — compte `client` sur `/chauffeur/courses`. Attendu : redirection, aucune course visible.

## E. Back-office (compte `admin`)

- [ ] **E1 Accès** — `/admin` accessible en `admin` ; en `client`, accès refusé.
- [ ] **E2 Réservations** — liste complète, détail d'une course. ⚠ Bug connu : dates « Invalid Date ».
- [ ] **E3 Capture** — capturer la course A1. Attendu : Stripe « réussi » (montant prélevé), la course passe « terminée », webhook 200, e-mail de demande d'avis au client.
- [ ] **E4 Annulation carte** — annuler la course A3. Attendu : Stripe « annulé », course « annulée ».
- [ ] **E5 Validation chauffeur** — `/admin/chauffeurs` → dossier D5 → ouvrir chaque document → *Approuver*. Attendu : le chauffeur voit le pool après passage en service.
- [ ] **E6 Portefeuilles** — `/admin/wallets` : solde et historique du client ; ajustement manuel de +5 € avec motif. Attendu : visible côté client.
- [ ] **E7 Entreprises** — `/admin/companies` : « Société Fictive SAS », membres, historique.
- [ ] **E8 Facture** — ⚠ bug connu : la génération PDF plante (date). Noter le résultat, ne bloque pas la recette si la décision est « après la mise en production ».

## F. Contrôles transverses

- [ ] **F1** Aucune donnée réelle visible sur la prévisualisation (seulement les comptes « Fictif » et les tiens).
- [ ] **F2** Vercel → prévisualisation → Logs : aucune erreur 500 pendant la recette.
- [ ] **F3** Console Firebase **prod** (`izymoto`) → Authentication : aucun compte `+izy-` créé (preuve que la prévisualisation n'a jamais touché la prod).

---

# Procédure de mise en production

Rôles : Fayssal exécute toutes les commandes. Claude ne pousse, ne fusionne et ne déploie rien.

## 1. Prérequis (la veille)

- [ ] Recette A à F complète, aucun KO bloquant ; décision prise sur les bugs connus (E2, E8, date des courses portefeuille côté chauffeur).
- [ ] PR `lot/0.5-regles` → `main` ouverte, **CI verte**.
- [ ] Vercel → Settings → Environment Variables, environnement **Production** :
  - `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` **présentes** (projet `izymoto`) — sans elles, paiements, portefeuille, webhook et back-office échouent ;
  - `NEXT_PUBLIC_SITE_URL` = `https://izymoto.com` (sans `/` final) ;
  - `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` en **live**, `STRIPE_WEBHOOK_SECRET` = celui de l'endpoint **live** `https://izymoto.com/api/webhooks/stripe` ;
  - endpoint live abonné à : `checkout.session.completed`, `payment_intent.amount_capturable_updated`, `payment_intent.succeeded`, `payment_intent.canceled`, `payment_intent.payment_failed`.
- [ ] **Fiches chauffeurs existantes** — console Firebase prod → Firestore → `drivers`. Pour chaque document :
  - `documents` est vide `{}` ou ne contient que `identityCard`, `drivingLicense`, `vehicleRegistration`, `insurance`, `rib`, `motoPhoto`, chacun avec un `path` qui commence par `drivers/<uid du document>/` ;
  - `availability` vaut `online` ou `offline` ; `status` vaut `pending`, `active`, `suspended` ou `rejected`.
  Une fiche non conforme bloquera ce chauffeur (même le bouton en service) : la corriger dans la console **avant** le déploiement des règles.
- [ ] **Courses en attente existantes** — `bookings` où `status == awaiting_driver` : `prix` doit être un **nombre** (pas une chaîne), sinon aucun chauffeur ne pourra l'accepter.
- [ ] **Storage en prod** — décision : activer (forfait Blaze, bucket en mode production) ou reporter. Sans Storage, l'inscription chauffeur (dépôt de documents) et les factures PDF restent indisponibles, comme aujourd'hui.

## 2. Mise en production (moment calme : en semaine, tôt le matin, aucune course en cours)

Ordre important : **le code d'abord, les règles juste après**. L'inverse casserait le paiement carte de l'ancien code, qui écrit la course depuis le navigateur.

1. GitHub → PR `lot/0.5-regles` → **Merge**. Vercel déploie la production automatiquement ; attendre **Ready**.
2. Immédiatement après, dans le terminal (branche `main` à jour : `git checkout main` puis `git pull`) :
   ```
   npx firebase deploy --only firestore --project izymoto
   ```
   Si la CLI propose de **supprimer** des index absents du fichier : répondre **No**.
3. Si Storage est activé en prod :
   ```
   npx firebase deploy --only storage --project izymoto
   ```
   puis accorder l'accès Firestore demandé dans la console (Storage → Règles), comme sur staging.
4. Console Firebase prod → Firestore → Index : attendre que les index soient « Activés » (quelques minutes ; le pool chauffeur et *Mes réservations* restent vides d'ici là).

## 3. Vérifications en production (15 minutes)

- [ ] izymoto.com s'affiche, carte et calcul de prix OK.
- [ ] Devis invité vers ta propre adresse : « Demande transmise », e-mail reçu sur contact@izymoto.com.
- [ ] Ton compte : paiement carte réel d'un petit trajet, puis **annulation depuis le back-office** (empreinte libérée, aucun débit). Webhook live : livraisons 200.
- [ ] Un chauffeur validé voit le pool ; un compte client ne le voit pas.
- [ ] Vercel → Logs production : pas d'erreur 500.

## 4. Retour arrière (si un contrôle échoue)

1. Vercel → Deployments → déploiement production précédent → **Instant Rollback**.
2. Console Firebase prod → Firestore → Règles → historique → republier la version précédente (règles d'urgence, aussi archivées dans `docs/incident/firestore-urgence-2026-10-05.rules`).
3. Prévenir Claude avec l'heure et le symptôme ; ne rien modifier d'autre.

## 5. Après la mise en production

- Rotation de la clé de compte de service prod (D-004) et retrait de la clé Resend exposée dans l'historique Git.
- Correctifs à planifier : dates du back-office et facture PDF, date des courses portefeuille côté chauffeur, URL permanentes des pièces chauffeur, documents modifiables par un chauffeur validé (voir commit 893f401).
