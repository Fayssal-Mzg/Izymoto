# Plan — passage aux applis mobiles Android et iPhone

Date : 2026-10-13 · Statut : **validé par Fayssal (porte 1, 2026-10-13)** · Cadre : D-005 (deux applis : Client, Chauffeur ; administration entreprise sur le web), D-007 (agent `mobile-expo`).

Décisions de la porte 1 :
- Technologie : **Expo / React Native** (TypeScript).
- Ordre : **appli Chauffeur d'abord**, appli Client ensuite.
- Comptes Apple Developer et Google Play **au nom de la société IZYMOTO** (numéro D-U-N-S).
- Appli Chauffeur v1 **avec position en arrière-plan** et suivi en direct côté client (voir « Position en arrière-plan » ci-dessous).

---

## Principe

Le web reste en place : site public, réservation web, back-office admin et espace entreprise. Les applis s'ajoutent et réutilisent **le même serveur** : les routes API de izymoto.com, authentifiées par le jeton Firebase, déjà sécurisées en phase 0. Aucune logique de prix ou de paiement n'est dupliquée dans les applis : le serveur reste la source de vérité.

| | Appli **Client** | Appli **Chauffeur** |
|---|---|---|
| Public | particuliers, collaborateurs d'entreprise | chauffeurs validés |
| Cœur | réserver, payer, suivre ses courses | recevoir, accepter et réaliser les courses |
| Spécifique | Apple Pay / Google Pay, notifications de suivi | notifications « nouvelle course », navigation, photo des documents ; plus tard position en arrière-plan |

## Technologie recommandée : Expo (React Native, TypeScript)

- Un seul code pour Android et iPhone ; TypeScript, comme le site ; le module de prix `lib/pricing` (TypeScript pur) est réutilisable tel quel pour l'affichage.
- Bibliothèques officielles : Firebase (Auth, Firestore), **Stripe React Native** (PaymentSheet, Apple Pay, Google Pay, empreinte et carte enregistrée), Expo Notifications (push), cartes et position.
- Compilation et publication sur les stores avec **EAS** (service d'Expo) ; mises à jour rapides du code JavaScript sans nouvelle revue.
- Écarté : emballer le site web dans une appli (Capacitor/WebView). Plus rapide au départ, mais Apple refuse souvent une appli qui n'est qu'un site, et on n'aurait ni vraies notifications ni Apple Pay natif.
- Organisation : dossier `mobile/` dans le même dépôt (deux applis + code partagé), même CI.

## Prérequis avant la première publication (bloquants côté stores)

1. **Comptes développeur** au nom de la société : Apple Developer Program (99 $/an ; compte d'organisation → numéro **D-U-N-S** de la société, gratuit, quelques jours à obtenir) et Google Play Console (25 $ une fois ; organisation → D-U-N-S aussi). Compte Expo (offre gratuite suffisante au départ).
2. **Suppression du compte complète depuis l'appli** (exigence Apple) : aujourd'hui seul le compte Auth est supprimé → route serveur qui supprime / anonymise le profil et conserve ce qui est comptable.
3. **« Se connecter avec Apple »** obligatoire sur iPhone dès qu'on propose « Continuer avec Google ».
4. **Politique de confidentialité** corrigée (passages à compléter et affirmations inexactes relevés dans le guide) + déclaration des données dans les fiches des stores. À rédiger aussi : jetons d'appareil pour les notifications (finalité : suivi des courses ; effacés à la déconnexion ou à la suppression du compte — D-017).
5. **Pool sans données personnelles** (`ridePool`, D-010, premier lot de la phase 2) : l'appli Chauffeur lira le pool en temps réel ; il ne doit plus exposer le passager avant acceptation.

## Ajouts côté serveur (réutilisés par le web)

- Enregistrement des jetons de notification (par appareil, par compte) et envoi des notifications : nouvelle course → chauffeurs en service ; course acceptée / chauffeur en route / course terminée → client ; paiement à confirmer (lot 1.1) → client.
- Paramètres Stripe pour PaymentSheet (client Stripe + clé éphémère) à côté des routes actuelles ; même prix serveur, même empreinte, même empreinte différée.
- Liens profonds (`izymoto://` et liens universels izymoto.com) : e-mail « Confirmer le paiement », invitation entreprise.

## Découpage proposé (chaque lot : porte 1 → implémentation → relecture sécurité + QA → porte 2)

| Lot | Contenu | Classement |
|---|---|---|
| **M0** | Comptes Apple / Google / Expo, identifiants d'appli (`com.izymoto.client`, `com.izymoto.chauffeur`), D-U-N-S | hors code (Fayssal) |
| **M1** | Socle `mobile/` : projet Expo, code partagé, connexion (e-mail, Google, Apple), liens profonds, compilation EAS, distribution de test (TestFlight, test interne Google Play) | SENSIBLE (auth) |
| **M2** | Prérequis serveur : suppression de compte complète, `ridePool` sans données perso, jetons + envoi de notifications | SENSIBLE |
| **M3** | Appli **Chauffeur** v1 : en service, pool temps réel, accepter / démarrer / terminer / libérer, mes courses, notification « nouvelle course », ouverture de Waze / Google Maps, photo des documents | SENSIBLE |
| **M3b** | Position du chauffeur en arrière-plan (en service / en course), suivi en direct de sa course par le client (web, puis appli Client) | SENSIBLE (données perso) |
| **M4** | Appli **Client** v1 : réservation (adresses, devis, prix serveur), paiement PaymentSheet (carte, Apple Pay, Google Pay, empreinte immédiate ou différée), mes réservations, portefeuille, notifications de suivi, suppression de compte | SENSIBLE (argent) |
| **M5** | Publication : fiches stores, captures, déclarations de confidentialité, revue Apple / Google | LÉGER |
| plus tard | Choix perso/pro du collaborateur (phase 3) | SENSIBLE |

Ordre recommandé : **Chauffeur avant Client**. Les chauffeurs ont besoin de notifications pour accepter vite (le web ne les réveille pas) ; leur appli est plus petite et ne touche pas au paiement ; les clients continuent à réserver sur le web en attendant. La page d'accueil annonce l'appli client : le texte « été 2026 » est à mettre à jour dans tous les cas.

## Position en arrière-plan (appli Chauffeur v1)

- Partage de la position **uniquement** quand le chauffeur est « en service » ou a une course en cours ; arrêt automatique hors service ; indicateur visible (notification permanente Android, bandeau iOS).
- Stockage minimal : dernière position connue par chauffeur (pas d'historique), écrite par le chauffeur lui-même ; lisible par l'admin et par le client **seulement pour sa course acceptée** ; règles Firestore + tests sur l'émulateur (D-006).
- Exigences stores : iOS — autorisation « Toujours », texte d'explication précis, justification à la revue Apple ; Android — service de premier plan « position », déclaration « position en arrière-plan » dans la Play Console avec une **vidéo de démonstration**.
- Mentions RGPD : finalité (dispatch, suivi de la course), durée de conservation, information des chauffeurs (contrat / CGU chauffeurs).
- Conséquence : le lot M3 grossit ; un lot dédié **M3b « position et suivi en direct »** (chauffeur + affichage côté client web et appli) est ajouté.

## Décisions prises (porte 1)

1. Technologie : **Expo / React Native**.
2. Ordre : **Chauffeur d'abord**.
3. Comptes stores : **société IZYMOTO** (D-U-N-S).
4. Chauffeur v1 : **avec** position en arrière-plan (lot M3b).

## Points ouverts

- **BLOQUANT pour M1 — « Se connecter avec Apple » non implémenté** (relevé le 2026-10-21, prérequis #3). Le site propose « Continuer avec Google » (`app/connexion/page.tsx`, `app/inscription/page.tsx`, `contexts/AuthContext.tsx`) mais aucune connexion Apple. Seule la reconnexion Apple avant suppression de compte est prévue (`app/profil/page.tsx`, lot 2.2). Apple refuse une appli iPhone qui propose Google sans Apple. À intégrer au cadrage de M1 : fournisseur Apple dans Firebase Auth (identifiant de service, clé et domaine configurés dans le compte Apple Developer de la société, lot M0), bouton sur le web et dans les applis, cas de l'adresse e-mail masquée par Apple (« Masquer mon adresse »).
