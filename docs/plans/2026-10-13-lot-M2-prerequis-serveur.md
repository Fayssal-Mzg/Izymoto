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

`lot/2.3-notifications` · Le socle est livré et testé avec des services simulés. L'essai réel se fera avec l'appli Chauffeur (M1/M3).

**Solution.**
1. **Enregistrement de l'appareil :** `POST /api/push/register` et `/unregister`. Le jeton Expo de l'appareil est stocké dans `pushDevices/{uid}/devices/{id}`, collection réservée au serveur.
2. **Module serveur `sendPush(uids, message)`** via le service de notifications d'Expo, qui couvre à la fois Android (FCM) et iPhone (APNs). Il supprime automatiquement les jetons d'appareils désinscrits.
3. **Événements branchés :**
   - nouvelle course dans le pool : chauffeurs validés **en service** ;
   - course acceptée, chauffeur en route, course terminée : le client ;
   - paiement à confirmer (lot 1.1) : le client, en plus de l'e-mail.
4. **Contenu :** aucune donnée personnelle dans le texte des notifications (exemple : « Nouvelle course : Paris 1er → Orly, 60,80 € pour vous »).

**Critères d'acceptation.**
- Un utilisateur n'enregistre des appareils que pour lui-même.
- Chaque événement envoie au bon public et à lui seul, sans doublon si l'événement est rejoué.
- L'échec du service de notifications ne bloque jamais une course ni un paiement.
- Aucune donnée personnelle n'apparaît dans les notifications.

---

## Décisions à prendre (porte 1)

1. **Niveau de détail du pool avant acceptation :** zone (arrondissement, commune, pôle), recommandé, ou adresse exacte sans nom ni téléphone.
2. **Suppression de compte avec un solde positif :** refuser et inviter à écrire à contact@izymoto.com pour un remboursement (recommandé), ou supprimer avec abandon explicite du solde.
3. **Conservation après suppression :** courses passées pseudonymisées et conservées pour la comptabilité (recommandé, durée à confirmer avec le comptable), ou suppression totale.
4. **Ordre :** M2a d'abord, à cause de l'échéance du 31/10 (recommandé), puis M2b, puis M2c en parallèle de M1.
