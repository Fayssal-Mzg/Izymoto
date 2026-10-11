# Inventaire des accès Firestore du code de `main` — incident 2026-10-05

Base : `main` @ `1c055be` (branche `hotfix/regles-urgence`). Recherche exhaustive :
`firebase/firestore`, `firebase-admin`, `getFirestore`, `getAdminFirestore`, `collection(`, `doc(`,
`getDoc(s)`, `setDoc`, `addDoc`, `updateDoc`, `deleteDoc`, `runTransaction`, `onSnapshot`, noms de collections.
Aucun dossier `scripts/` sur main. `middleware.js` = passthrough. Aucun accès à `companies`,
`members`, `companyInvitations`, `paymentClaims`, `auditLogs` sur main.

Légende « qui » : ANON = navigateur non connecté ; CLIENT = navigateur connecté (soi-même) ;
CHAUFFEUR = navigateur connecté avec fiche `drivers/{uid}` ; ADMIN = navigateur connecté avec
`users/{uid}.isAdmin == true` (contrôle UI seulement) ; ADMIN-SDK = serveur, contourne les règles ;
SDK-CLIENT-SERVEUR = route serveur utilisant le SDK client **sans authentification** (soumis aux règles).

## 1. Serveur

| Fichier:ligne | Collection | Opération | Qui | Remarque |
|---|---|---|---|---|
| app/api/webhooks/stripe/route.js:47 (main:46-53) | bookings | list `where paymentId == pi` | **SDK-CLIENT-SERVEUR → ADMIN-SDK (migré)** | ne marchait que grâce à `bookings: allow read, write: if true` |
| app/api/webhooks/stripe/route.js:62 (main:63) | bookings | update `{paymentStatus, amountAuthorized, status:"awaiting_driver", paymentUpdatedAt}` / `{paymentStatus:"captured", amountCaptured, status:"completed"}` / `{paymentStatus:"released", status:"cancelled"}` / `{paymentStatus:"failed", paymentFailureMessage}` | idem (migré) | |
| app/api/webhooks/stripe/route.js:87 (main:88) | bookings | update `{reviewRequestEmailSentAt}` | idem (migré) | |
| lib/wallet/server.ts:44 | wallets | get | ADMIN-SDK | `getWalletBalance` (non appelé par une route) |
| lib/wallet/server.ts:86-142 | walletTransactions, wallets | transaction : get tx(eventId), get wallet, set/update wallet `{balanceCents, cumulativeRechargedCents, updatedAt}`, set tx | ADMIN-SDK | `creditWallet`, appelé par le webhook |
| lib/wallet/server.ts:206-272 | walletTransactions, wallets, bookings | transaction : update wallet, **set booking** `{...bookingData client, userId, reservationId, paymentMethod:"wallet", paymentStatus:"paid_wallet", walletAmountCents, isPaid:true, status:"awaiting_driver", createdAt}`, set tx | ADMIN-SDK | appelé par `/api/wallet/debit-for-booking` (**aucune auth, userId du corps**) |
| lib/wallet/server.ts:321-395 | idem | idem hybride `{paymentMethod:"hybrid", paymentStatus:"authorized", paymentId, cardAmountCents, amountAuthorized, prix, isPaid:false, status:"awaiting_driver"}` | ADMIN-SDK | appelé par `/api/wallet/finalize-hybrid-booking` (**aucune auth, userId du corps**) |
| lib/wallet/server.ts:447-498 | wallets, walletTransactions | transaction ajustement admin | ADMIN-SDK | `/api/admin/wallet/adjust` (`requireAdmin`) |
| lib/wallet/server.ts:524-556 | wallets, walletTransactions | transaction remboursement | ADMIN-SDK | webhook (hybride annulé/échoué) |
| lib/firebase/admin-server.ts:97 | users | get `users/{uid}` | ADMIN-SDK | `requireAdmin` (capture, cancel, wallet/adjust) |

Routes sans aucun accès Firestore : `create-payment-intent`, `send-devis`, `increment-authorization`,
`capture-payment`, `cancel-payment`, `wallet/create-checkout`, `limova/ping`.
Seule route serveur qui utilisait le SDK client non authentifié : le webhook Stripe (migré).

## 2. Navigateur — `users`

| Fichier:ligne | Opération | Clés écrites / filtre | Qui |
|---|---|---|---|
| contexts/AuthContext.tsx:94 | set (création) | `uid, email, role:"client", createdAt, lastLogin, isAdmin:false, pendingReservation?` | CLIENT (signUp) |
| contexts/AuthContext.tsx:119 | set (création) | `uid, email, role:"driver", createdAt, lastLogin, isAdmin:false` | CLIENT (signUpAsDriver) |
| contexts/AuthContext.tsx:140, 176 | get soi | — | CLIENT (logIn, Google) |
| contexts/AuthContext.tsx:144 | set (création si absent) | `uid, email, role:"client", createdAt, lastLogin, isAdmin:false, pendingReservation?` | CLIENT |
| contexts/AuthContext.tsx:157 | set merge | `lastLogin, pendingReservation?` | CLIENT |
| contexts/AuthContext.tsx:180 | set (création Google) | `uid, email, displayName, photoURL, role:"client", createdAt, lastLogin, isAdmin:false, pendingReservation?` | CLIENT |
| contexts/AuthContext.tsx:195 | set merge | `lastLogin, photoURL, pendingReservation?` | CLIENT |
| contexts/AuthContext.tsx:217 | set merge | `phoneNumber, phoneVerified:true` | CLIENT |
| app/reserver/components/PaymentModal.jsx:133 | set merge | `phoneNumber, phoneVerified:true` | CLIENT |
| app/reserver/components/PaymentModal.jsx:581, 819 | set merge | `displayName, phoneNumber` | CLIENT |
| app/reserver/components/PaymentModal.jsx:997 | get soi | — | CLIENT |
| lib/services/paymentService.ts:60 | set merge | `displayName, phoneNumber` | CLIENT |
| lib/hooks/useUserInformation.js:185, 282 | get soi | — | CLIENT |
| lib/hooks/useUserInformation.js:286 | update | `displayName, phoneNumber, email, updatedAt, lastModified` | CLIENT |
| lib/hooks/useUserInformation.js:289 | set (création) | idem + `createdAt, uid` | CLIENT |
| app/chauffeur/inscription/page.tsx:142 | set merge | `role:"driver", updatedAt` (bascule client → chauffeur) | CLIENT |
| lib/hooks/useDriver.ts:41 | onSnapshot soi | — | CLIENT/CHAUFFEUR |
| lib/hooks/useReservation.js:431 ; app/reserver/components/ReservationModal.jsx:49 ; app/profil/page.tsx:105 ; components/AdminButton.tsx:19 ; lib/hooks/useAdmin.js:23 | get soi | — | CLIENT |
| lib/firebase/admin.ts:311, 365, 414, 488 | list / get tous | — | ADMIN |
| lib/firebase/admin.ts:330 | delete | — | ADMIN (admin/utilisateurs) |
| lib/firebase/admin.ts:345-350 | get + update/set | `isAdmin` | ADMIN (admin/utilisateurs) |
| lib/firebase/users.js:8, 22 | get / set merge `isAdmin` | — | code mort (non importé) |

## 3. Navigateur — `bookings`

| Fichier:ligne | Opération | Clés / filtre | Qui |
|---|---|---|---|
| lib/firebase/bookings.js:29 via lib/hooks/useReservation.js:495 | add (devis) | `userId ("guest_xxxxxxxx" ou uid), accountType ("guest"/"registered"), status:"devis", createdAt, depart, arrivee, distance, duree, prix, prioriteReservation, reservationId, email, phone, name, notes, reservationDate, dateFormatted` | **ANON** ou CLIENT |
| lib/firebase/bookings.js:29 via lib/services/paymentService.ts:107 (appelé par PaymentModal.jsx:1060) | add (course carte, hold Stripe) | `userId, accountType:"registered", status:"confirmed", paymentStatus:"authorized", paymentId, prix, amountAuthorized, isPaid:false, createdAt, depart, arrivee, distance, duree, name, phone, notes, prioriteReservation, reservationId, reservationDate, dateFormatted, email` | CLIENT |
| lib/firebase/bookings.js:39-45 via app/profil/page.tsx:128 | list `where userId == uid orderBy createdAt` | — | CLIENT |
| lib/firebase/dispatch.ts:74-79 via lib/hooks/useRidePool.ts:27 | onSnapshot list `where status == "awaiting_driver" orderBy createdAt` | — | CHAUFFEUR actif |
| lib/firebase/dispatch.ts:98-103 via useRidePool.ts:63 | onSnapshot list `where driverId == uid orderBy createdAt` | — | CHAUFFEUR |
| lib/firebase/dispatch.ts:135-177 (RidePoolCard.tsx:27) | transaction : get booking + get `drivers/{uid}`, update | `driverId, driverAcceptedAt, status:"assigned", commissionRate, platformShareCents, driverShareCents, updatedAt` | CHAUFFEUR (status active, availability online) |
| lib/firebase/dispatch.ts:182-198 (mes-courses:131) | transaction get + update | `status:"in_progress", driverStartedAt, updatedAt` | CHAUFFEUR assigné |
| lib/firebase/dispatch.ts:207-223 (mes-courses:132) | transaction get + update | `status:"completed_by_driver", driverCompletedAt, updatedAt` | CHAUFFEUR assigné |
| lib/firebase/dispatch.ts:233-253 (mes-courses:139) | transaction get + update | `driverId:null, driverAcceptedAt:null, status:"awaiting_driver", driverReleaseReason, updatedAt` | CHAUFFEUR assigné |
| lib/firebase/admin.ts:252, 472, 481 | list (tout, `createdAt >= today`) | — | ADMIN |
| lib/firebase/admin.ts:286 | update | `status, updatedAt` | ADMIN |
| lib/firebase/admin.ts:300 | delete | — | ADMIN |

Horodatages : main écrit `Timestamp.now()` (horloge navigateur) dans `bookings`, `serverTimestamp()` dans `users`/`drivers`.

## 4. Navigateur — `drivers`

| Fichier:ligne | Opération | Clés | Qui |
|---|---|---|---|
| lib/firebase/drivers.ts:212 (inscription/page.tsx:147, 186) | set (création, **parfois rejoué** sur une fiche existante : course entre le bootstrap l.136-156 et l'étape Compte l.186) | `uid, email, status:"pending", availability:"offline", firstName…licenseDeliveryDate, moto, bank, documents:{}, acceptedAt:null, rejectedAt:null, rejectionReason:"", stats:{0,0}, createdAt, updatedAt` | CHAUFFEUR (soi) |
| lib/firebase/drivers.ts:223 | get | — | ADMIN (admin/chauffeurs/[uid]) |
| lib/hooks/useDriver.ts:50 | onSnapshot soi | — | CHAUFFEUR |
| lib/firebase/drivers.ts:232 (inscription:240, chauffeur/profil:59) | update | `firstName, lastName, phone, dateOfBirth, address, legalForm, companyName, siret, licenseNumber, licenseDeliveryDate, moto, bank, updatedAt` | CHAUFFEUR |
| lib/firebase/drivers.ts:242 (chauffeur/page.tsx:50, courses/page.tsx:32) | update | `availability, updatedAt` | CHAUFFEUR |
| lib/firebase/drivers.ts:268, 292 (DocumentUploadField.tsx:50, 66) | update | `documents.<kind>` ({url, path `drivers/<uid>/…`, filename, uploadedAt} ou null), `updatedAt` | CHAUFFEUR |
| lib/firebase/drivers.ts:309-313 | list (`where status`, `orderBy createdAt`) | — | ADMIN |
| lib/firebase/drivers.ts:318, 327, 337, 346 | update | `status, acceptedAt/rejectedAt, rejectionReason, availability, updatedAt` | ADMIN |

## 5. Navigateur — `wallets`, `walletTransactions`, `factures`

| Fichier:ligne | Collection | Opération | Qui |
|---|---|---|---|
| lib/hooks/useWallet.ts:34-35 | wallets | onSnapshot `wallets/{uid}` | CLIENT |
| lib/hooks/useWalletTransactions.ts:62-69 | walletTransactions | onSnapshot `where userId == uid orderBy createdAt limit` | CLIENT |
| lib/firebase/admin.ts:364, 413 | wallets | list / get | ADMIN |
| lib/firebase/admin.ts:440-444 | walletTransactions | list `where userId == uid orderBy createdAt` | ADMIN |
| lib/firebase/admin.ts:112-116, 209-213 | factures | list `where bookingId ==` / `orderBy dateGeneration` | ADMIN |
| lib/firebase/admin.ts:196 | factures | add `{id, bookingId, userId, clientName, clientEmail, montant, dateReservation, dateGeneration, dateEcheance, pdfUrl, statut}` | ADMIN |

Aucune écriture client sur `wallets` / `walletTransactions`.

## 6. Synthèse par collection (prod actuelle → règles d'urgence)

| Collection | Lecture : prod → urgence | Écriture : prod → urgence |
|---|---|---|
| bookings | **tout le monde, même anonyme** → passager, chauffeur assigné, chauffeurs validés (pool `awaiting_driver`, D-010), admin | **tout le monde** → création devis (anonyme ou connecté, liste blanche, `status:"devis"`), création course carte (`userId == auth.uid`, liste blanche, `confirmed`/`authorized`/`isPaid:false`), 4 transitions chauffeur de dispatch.ts, admin ; suppression admin |
| users | tout compte connecté → soi-même, admin | tout compte connecté (dont `isAdmin:true`) → soi-même avec liste blanche, `isAdmin` seulement `false` à la création, `role` client/driver et client→driver seulement ; admin ; suppression admin |
| drivers | tout compte connecté → soi-même, admin | tout compte connecté → création `pending` par soi ; mise à jour soi sans `status`/validation/`stats` ; admin |
| wallets | soi (mais OU avec règle générale → tout compte connecté) → soi, admin | tout compte connecté (règle générale) → **personne côté client** (Admin SDK) |
| walletTransactions | idem → soi, admin | tout compte connecté → **personne côté client** |
| factures | tout compte connecté → admin | tout compte connecté → admin |
| companies, members, companyInvitations, autres | tout compte connecté → **personne** (non utilisé par main) | tout compte connecté → **personne** |
