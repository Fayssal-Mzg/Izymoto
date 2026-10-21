# Cadrage — lot M2 « prérequis serveur des applis mobiles »

Date : 2026-10-13 · Statut : **validé par Fayssal (porte 1, 2026-10-13)** — pool au niveau de la zone ; suppression refusée si solde positif (remboursement via contact@izymoto.com) ; courses passées pseudonymisées et conservées (durée à confirmer avec le comptable) ; ordre M2a → M2b → M2c · Classement : **SENSIBLE** (rôles, données personnelles, statut des courses) · Plan parent : `docs/plans/2026-10-13-applis-mobiles.md`.

Trois sous-lots, chacun sur sa branche, relu par `securite-reviewer` et `qa-tests`. Ils servent aussi le site web.

---

## M2a — Pool des chauffeurs sans données personnelles + actions de course côté serveur

`lot/2.1-pool-serveur` · Échéance : **31 octobre 2026** (fin de l'écart temporaire D-010).

**Constat.** Les chauffeurs validés lisent aujourd'hui les documents `bookings` du pool en entier : nom, téléphone, adresses exactes et notes du passager (écart D-010). L'acceptation, le démarrage, la fin et la libération d'une course sont des transactions écrites depuis le navigateur (`lib/firebase/dispatch.ts`). Les changements de statut de l'admin aussi (`lib/firebase/admin.ts`). Les règles Firestore ne savent pas masquer des champs, et l'appli mobile ne doit pas dépendre de ces écritures côté client.

**Solution.**
1. Une collection **`ridePool/{bookingId}`**, écrite **uniquement par le serveur**, contient une version réduite de la course :
   - zone de départ et d'arrivée au niveau de l'arrondissement, de la commune ou du pôle (exemple : « Paris 1er → Aéroport d'Orly ») ;
   - date et heure, distance, durée, prix, part du chauffeur, option priorité, référence.
   - **Elle ne contient ni nom, ni téléphone, ni adresse exacte, ni notes.**
2. **Actions de course par des routes API** (Admin SDK, transactions), avec le chauffeur identifié par son jeton :
   - `POST /api/rides/accept`, `/start`, `/complete`, `/release` : mêmes règles qu'aujourd'hui (chauffeur actif et en service, premier qui accepte, état attendu) ;
   - `POST /api/admin/booking/status` pour les boutons de l'admin.
3. **Un helper unique `syncRidePool`**, appelé dans la même transaction que chaque écriture qui fait entrer une course dans le pool ou l'en fait sortir :
   - finalisations carte, carte enregistrée, portefeuille, hybride et entreprise ;
   - webhook ;
   - acceptation et libération ;
   - annulation par l'admin.
4. **Règles Firestore :**
   - `ridePool` lisible par les chauffeurs validés **et en service** ;
   - `bookings` n'est plus lisible par les chauffeurs pour les courses du pool, seulement pour **leurs** courses assignées ;
   - plus aucune écriture chauffeur sur `bookings`.
5. **Espace chauffeur web** branché sur `ridePool` et les nouvelles routes. Aucune différence visible pour le chauffeur, sauf que les adresses exactes et le téléphone n'apparaissent qu'**après** acceptation.
6. **Reprise de l'existant :** un script de remplissage initial de `ridePool` à partir des courses `awaiting_driver`. Il est relançable et testé sur staging avant la prod.

**Critères d'acceptation.**
- Un chauffeur validé en service voit les courses à prendre via `ridePool`, sans nom, téléphone, adresse exacte ni notes. Hors service, ou non validé, il ne voit rien (tests des règles avec un cas autorisé et un cas refusé pour chacun).
- Une course qui entre dans le pool (par chacun des 6 chemins) apparaît dans `ridePool`. Une course acceptée, annulée ou terminée en disparaît, dans la même transaction.
- Deux chauffeurs qui acceptent en même temps : un seul gagne, l'autre reçoit « déjà acceptée ».
- Un chauffeur ne peut ni lire une course du pool dans `bookings`, ni écrire dans `bookings` ; il lit sa course assignée, avec les coordonnées du passager.
- La part chauffeur et la commission sont calculées par le serveur.
- Non-régression de l'espace chauffeur (pool, mes courses, accepter, démarrer, terminer, libérer, profil) et de l'admin.
- D-010 est clos dans DECISIONS.md.

---

## M2b — Suppression de compte complète

`lot/2.2-suppression-compte`

**Constat.** « Supprimer mon compte » ne supprime que le compte de connexion : le profil, le portefeuille et le client Stripe restent. Un compte connecté avec Google ne peut pas confirmer la suppression, faute de mot de passe. Or Apple exige une suppression complète depuis l'appli.

**Solution.** Une route `POST /api/account/delete`, qui exige une connexion récente (jeton émis il y a moins de 5 minutes, ce qui marche aussi pour Google et Apple) :
1. **Refus avec explication** si :
   - une course est en cours ou à venir (assignée, empreinte posée, carte enregistrée) ;
   - le compte possède une société qui a d'autres membres ;
   - le solde du portefeuille est positif (voir décision 2).
2. **Profil :** `users/{uid}` est supprimé.
3. **Réservations passées :** conservées pour la comptabilité, mais **pseudonymisées** : nom, téléphone, e-mail et notes sont effacés, le `userId` est remplacé par un identifiant anonyme.
4. **Stripe :** le client et ses cartes sont supprimés. Le client est retiré de `stripeCustomers`.
5. **Chauffeur :** la fiche passe en « supprimé ». L'IBAN et les documents sont effacés du Storage. Les courses réalisées sont conservées, pseudonymisées.
6. **Entreprise :** le collaborateur est retiré de sa société.
7. **Le compte de connexion est supprimé en dernier.** Les jetons sont révoqués.
8. **Écran web :** nouvelle confirmation en se reconnectant (mot de passe, Google ou Apple), puis appel de la route.

**Critères d'acceptation.**
- Après suppression, il ne reste plus aucune donnée identifiante, dans aucune collection ni chez Stripe. Les montants et les dates des courses passées sont conservés.
- Chacun des refus du point 1 fonctionne, avec un message clair. L'opération est idempotente (un double appel ne pose pas de problème).
- Un jeton ancien (connexion de plus de 5 minutes) est refusé.
- Un compte Google peut se supprimer.
- La suppression d'un autre compte est impossible : l'uid vient du jeton.

---

## M2c — Notifications push (socle)

`lot/2.3-notifications` · Classement : **SENSIBLE** (données personnelles, rôles, statut des courses) · Cadrage détaillé du 2026-10-21 : **validé par Fayssal (porte 1, 2026-10-21, options recommandées retenues — D-017)** · Le socle est livré et testé avec des services simulés. L'essai réel se fera avec l'appli Chauffeur (M1/M3).

**Constat.**
- Aucune notification push n'existe : le chauffeur doit garder l'espace web ouvert pour voir une nouvelle course, et le client n'est prévenu que par e-mail (confirmation, paiement à confirmer).
- Les transitions à notifier sont toutes côté serveur depuis le lot 2.1 : `runRideAction` (`lib/rides/actions.ts` : `assigned`, `in_progress`, `completed_by_driver`, libération → retour au pool), `syncRidePoolInTx` / `refreshRidePoolSafe` (`lib/rides/pool.ts`, entrée dans le pool par 6 chemins + webhook + libération), `markActionRequired` (`lib/payments/deferredHold.ts`, déjà dédoublonné par `holdActionEmailSentAt`).
- Il n'existe **pas de statut « chauffeur en route »** : après l'acceptation, la course passe directement à « démarrée » puis « terminée ».
- Les règles Firestore refusent par défaut toute collection non listée (`match /{document=**}`) : une collection réservée au serveur n'a besoin d'aucune règle d'ouverture.
- La suppression de compte (lot 2.2) n'efface pas encore de jetons d'appareil (réserve du rapport 2.2).

**Solution.**
1. **Enregistrement de l'appareil** — `POST /api/push/register` et `POST /api/push/unregister`, jeton Firebase exigé (`requireAuth`), l'uid vient du jeton.
   - Corps : jeton Expo (format `ExponentPushToken[…]` vérifié), plateforme (`ios` | `android`), appli (`chauffeur` | `client`). Tout autre champ est ignoré.
   - Stockage : `pushDevices/{uid}/devices/{empreinte du jeton}` (jeton, plateforme, appli, dates de création et de dernière vue). L'empreinte (SHA-256) comme identifiant rend l'enregistrement idempotent.
   - **Un jeton n'appartient qu'à un compte** : un index `pushTokens/{empreinte} → uid` permet, si le même téléphone se connecte avec un autre compte, de retirer le jeton de l'ancien compte dans la même transaction (sinon l'ancien utilisateur continuerait à recevoir ses notifications sur un téléphone qui n'est plus le sien).
   - 10 appareils au plus par compte : au-delà, le plus ancien est retiré.
   - `unregister` (déconnexion dans l'appli) ne retire que les jetons du compte appelant.
   - `pushDevices`, `pushTokens` et `pushEvents` : **serveur uniquement**, aucune lecture ni écriture depuis un client, admin compris (refus par défaut, testé).
2. **Module serveur `sendPush(uids, message)`** (`lib/push/`) vers l'API HTTP d'Expo, qui couvre Android (FCM) et iPhone (APNs).
   - Envoi par lots de 100, délai maximal de 3 secondes, aucune exception propagée : l'appelant reçoit un résumé, jamais une erreur.
   - Jeton d'accès Expo (`EXPO_ACCESS_TOKEN`, « Enhanced Push Security ») : sans lui, toute personne connaissant un jeton d'appareil pourrait y envoyer des notifications.
   - Jetons désinscrits (`DeviceNotRegistered`) : supprimés dès la réponse d'envoi, et via les accusés différés d'Expo relevés par une tâche quotidienne (nouvelle tâche `/api/cron/push-receipts`, ou ajout à la tâche existante si la limite de tâches Vercel est atteinte).
   - **Anti-doublon** : avant chaque envoi, création d'un document `pushEvents/{clé}` (échoue s'il existe déjà). Clé = type d'événement + course + horodatage de la transition (ex. `ride_accepted:{bookingId}:{driverAcceptedAt}`). Une course libérée puis remise au pool redonne donc une nouvelle notification, mais un rejeu du même événement non. Purge des clés après 30 jours.
3. **Événements branchés** (envoi **après** la validation de la transaction, jamais dedans) :

   | Événement | Destinataires | Exemple de texte |
   |---|---|---|
   | Course entrée dans le pool (6 chemins, webhook, libération) | chauffeurs `status: active` **et** `availability: online` au moment de l'envoi, appli `chauffeur` | « Nouvelle course : Paris 1er → Aéroport d'Orly, 12 nov. 14 h 30 — 64,00 € pour vous » |
   | Course acceptée (`assigned`) | le client de la course (`userId`), appli `client` | « Votre course du 12 nov. est acceptée : votre chauffeur se prépare. » |
   | Course démarrée (`in_progress`) | le client | « Votre course a démarré. » |
   | Course terminée (`completed_by_driver`) | le client | « Course terminée. Merci d'avoir choisi Izymoto. » |
   | Paiement à confirmer (lot 1.1) | le client, **en plus** de l'e-mail | « Action requise : confirmez le paiement de votre course du 12 nov. » |

   - Course d'un invité (sans `userId`) : pas de notification, l'e-mail reste le seul canal.
   - Le chauffeur qui a accepté n'est jamais destinataire de « nouvelle course » pour cette même course ; le client passager n'est jamais destinataire des notifications chauffeur (D-003).
4. **Contenu** : texte construit **uniquement** à partir de champs déjà exposés au pool (zones de `zoneLabel`, date, part chauffeur) ou de libellés fixes. Jamais de nom (passager ou chauffeur), téléphone, e-mail, adresse exacte ni notes — le texte s'affiche sur l'écran verrouillé. Données techniques jointes : type d'événement et `bookingId` seulement (pour ouvrir le bon écran).
5. **Suppression de compte** (complète le lot 2.2) : `pushDevices/{uid}` et ses entrées `pushTokens` sont effacés **à l'étape de verrou**, avant tout autre effacement, pour qu'aucune notification n'arrive pendant ou après la suppression.
6. **Hors périmètre** : code des applis (M1/M3/M4), notifications web (navigateur), préférences de notification par type, toute notification commerciale (consentement distinct requis).

**Critères d'acceptation.**
- Un utilisateur n'enregistre et ne désinscrit des appareils que pour lui-même ; sans jeton Firebase ou avec un jeton Expo mal formé → refus (400/401).
- Un même jeton enregistré par un second compte disparaît du premier (test).
- Aucun client (particulier, chauffeur, admin) ne lit ni n'écrit `pushDevices`, `pushTokens`, `pushEvents` (tests des règles sur l'émulateur, D-006).
- Chaque événement du tableau envoie au bon public et à lui seul : chauffeur hors service, non validé ou supprimé → rien ; client d'une autre course → rien ; invité → rien (tests avec Expo simulé).
- Chacun des chemins d'entrée dans le pool déclenche « nouvelle course » ; un rejeu (webhook rejoué, double appel) n'envoie rien de plus ; une libération puis remise au pool renvoie une notification.
- Expo en panne, lent (> 3 s) ou en erreur 500 : l'acceptation, le démarrage, la fin, le webhook et la finalisation de paiement répondent comme avant (tests).
- `DeviceNotRegistered` → jeton supprimé.
- Aucun nom, téléphone, e-mail, adresse exacte ni note dans le titre, le texte ou les données d'une notification (test qui vérifie chaque gabarit avec une course aux champs remplis).
- Après suppression d'un compte, il ne reste ni `pushDevices/{uid}` ni entrée `pushTokens` pointant vers lui.
- `npx tsc --noEmit` et `npm test` verts ; non-régression des suites 2.1 et 2.2.

**Décisions à prendre (porte 1 M2c).**
1. **Envoi vers Expo** : appel HTTP direct (`fetch`), sans nouvelle dépendance (recommandé), ou bibliothèque `expo-server-sdk` (dépendance à ajouter).
2. **« Chauffeur en route »** : couvert par la notification d'acceptation (« votre chauffeur se prépare ») dans ce socle (recommandé) ; une vraie étape « en route » / « arrivé » sera ajoutée avec la position (M3b) — ou bien ajouter dès maintenant une action `on_the_way` (nouvel état de course, touche aux règles et à l'espace chauffeur web).
3. **Public « nouvelle course »** : tous les chauffeurs en service (recommandé tant que la flotte est petite) ou filtrage par zone (plus tard).
4. **Jeton d'accès Expo** : à créer par Fayssal dans le compte Expo de la société (lot M0) et à ajouter aux variables Vercel avant la mise en production ; les tests n'en ont pas besoin.
5. **Politique de confidentialité** : ajouter les jetons d'appareil (finalité : suivi des courses, effacés à la déconnexion ou à la suppression du compte) au point 4 des prérequis stores.

---

## Décisions à prendre (porte 1)

1. **Niveau de détail du pool avant acceptation :** zone (arrondissement, commune, pôle), recommandé, ou adresse exacte sans nom ni téléphone.
2. **Suppression de compte avec un solde positif :** refuser et inviter à écrire à contact@izymoto.com pour un remboursement (recommandé), ou supprimer avec abandon explicite du solde.
3. **Conservation après suppression :** courses passées pseudonymisées et conservées pour la comptabilité (recommandé, durée à confirmer avec le comptable), ou suppression totale.
4. **Ordre :** M2a d'abord, à cause de l'échéance du 31/10 (recommandé), puis M2b, puis M2c en parallèle de M1.
