# Journal des décisions — Izymoto

Une entrée par décision, datée, avec sa justification. Seul Fayssal ajoute, modifie ou annule une décision. Aucun agent ne modifie ce fichier de lui-même : un désaccord est remonté à Fayssal.

Document d'architecture de référence (non présent en local) : [Izymoto — Architecture BtoB & multi-profils](https://claude.ai/code/artifact/ab2f9c75-154f-4978-a609-a405148f0b31)

---

## D-001 — Architecture multi-profils : option A
**Date** : 2026-10-04 · **Statut** : validée

Base Firestore unique. Chaque donnée porte son propriétaire (utilisateur, entreprise, chauffeur). Les rôles sont inscrits dans le jeton Firebase (custom claims) et posés uniquement par le serveur. Toutes les écritures sensibles (argent, statut de course, rôles, rattachement entreprise) passent par le serveur. PostgreSQL est écarté pour l'instant.

**Pourquoi** : l'existant suit déjà ce modèle (collection `bookings` unique, entreprise résolue côté serveur). On durcit au lieu de reconstruire. Les collections ou projets séparés dupliqueraient le code sans gain de sécurité. Une migration PostgreSQL ne se justifie pas tant que les volumes BtoB restent faibles.

## D-002 — Paiement BtoB
**Date** : 2026-10-04 · **Statut** : validée

Au départ : portefeuille prépayé, ou carte de l'entreprise enregistrée. Ensuite : facture mensuelle avec prélèvement SEPA B2B, réservée aux entreprises validées (SIREN vérifié, plafond d'encours).

**Pourquoi** : le prépayé et la carte limitent le risque d'impayé tant que l'entreprise n'est pas vérifiée. La facture mensuelle est le standard attendu par les grands comptes.

## D-003 — Un chauffeur ne réserve pas comme client avec le même compte
**Date** : 2026-10-04 · **Statut** : validée

Le serveur refuse une course si le passager et le chauffeur sont la même personne, ou s'ils partagent le même téléphone ou le même moyen de paiement.

**Pourquoi** : éviter les accès croisés client/chauffeur et la fraude (courses fictives pour toucher la rémunération chauffeur).

## D-004 — Phase 0 prioritaire ; clé de service Firebase classée CRITIQUE
**Date** : 2026-10-04 · **Statut** : validée

La phase 0 (correctifs de sécurité) passe avant toute nouvelle fonctionnalité. Pour la clé de service présente dans `public/` :
- [x] copie de `public/` supprimée (2026-10-04) ;
- [x] historique git contrôlé : jamais commitée (2026-10-04) ;
- [x] URL en production contrôlée : 404 (2026-10-04) ;
- [ ] nouvelle clé générée et placée dans les variables d'environnement Vercel et `.env.local` ;
- [ ] ancienne clé (`fc0a60…`) révoquée dans la console Google Cloud, après test de la nouvelle ;
- [ ] journaux d'audit GCP vérifiés pour l'ancienne clé ;
- [ ] dossier `.secrets/` retiré du projet.

**Pourquoi** : une clé de service donne un accès total à la base, en contournant toutes les règles.

## D-005 — Deux applis mobiles séparées ; administration entreprise sur le web
**Date** : 2026-10-04 · **Statut** : validée

Une appli Client (particulier et collaborateur, choix perso/pro) et une appli Chauffeur. L'administration entreprise (membres, budgets, factures) reste sur le web.

**Pourquoi** : standard du secteur, et revue App Store facilitée (la géolocalisation en arrière-plan n'existe que dans l'appli Chauffeur).

## D-006 — Pas de modification des règles Firestore sans tests sur l'émulateur
**Date** : 2026-10-04 · **Statut** : validée

Aucune modification de `firestore.rules` avant que les tests des règles sur l'émulateur Firebase soient en place et passent.

**Pourquoi** : un resserrement non testé peut couper l'accès de l'espace chauffeur en production, et une isolation non testée n'est pas prouvée.

## D-007 — Équipe d'agents progressive et chaîne de décision
**Date** : 2026-10-04 · **Statut** : validée

Le chef de projet est la session principale. Fayssal valide le plan (porte 1) et le résultat (porte 2). Agents actifs en phase 0 : `dev-fullstack`, `securite-reviewer`, `qa-tests`. Les agents suivants sont ajoutés plus tard, si la chaîne a fait ses preuves :
- phases 2-3 : `paiements-stripe` (portefeuilles, Stripe, factures, Factur-X), `conformite-juridique` (signale, ne valide pas : RGPD, mentions de facture, CGV, réglementation taxi moto), `produit-btob` (parcours et textes pour dirigeants et services achats) ;
- phase 4 : `mobile-expo`.

Les rapports à Fayssal font 10 lignes au maximum. Les rapports détaillés des agents sont conservés dans `docs/rapports/`.

**Pourquoi** : tester la chaîne avec le minimum d'agents avant de l'alourdir.

## D-008 — Preuves automatiques avant tout passage en production
**Date** : 2026-10-04 · **Statut** : validée

- Une CI GitHub Actions lance, à chaque pull request, la vérification des types TypeScript et les tests des règles sur l'émulateur. Rien ne passe en production si la CI est rouge.
- Fayssal teste lui-même le déploiement de prévisualisation Vercel de chaque lot avant de valider.
- Avant de démarcher des grands comptes : audit de sécurité réalisé par un humain (prestataire), en vue des questionnaires sécurité des services achats.

**Pourquoi** : le « VALIDÉ » d'un agent reste un avis ; un test qui passe est une preuve.

## D-009 — Lanceur de tests : Vitest
**Date** : 2026-10-04 · **Statut** : validée

Vitest, avec `@firebase/rules-unit-testing` pour les règles Firestore sur l'émulateur (projectId `demo-izymoto`). Les tests vivent dans `tests/`.

**Pourquoi** : léger, compatible TypeScript sans configuration lourde, adapté aux tests des règles et des routes API.

## D-010 — Pool visible en entier par les chauffeurs validés (acceptation temporaire)
**Date** : 2026-10-05 · **Statut** : **close** par le lot 2.1 (voir D-014) · **Échéance** : 2026-10-31

Les courses à prendre (`bookings` en `awaiting_driver`) restent lisibles en entier, données personnelles du passager comprises, par les chauffeurs validés. C'est un écart temporaire au tableau « Qui voit quoi » (« version sans données perso »). La collection `ridePool` (version sans données personnelles, écrite par le serveur) est le premier lot de la phase 2.

**Pourquoi** : les règles Firestore ne savent pas masquer des champs ; les règles du lot 0.5 réduisent déjà l'exposition (avant : tout compte connecté lisait le pool).

## D-011 — Décisions provisoires de la phase 0 validées
**Date** : 2026-10-05 · **Statut** : validée (porte 2, phase 0)

Validées telles quelles :
- devis d'un invité (non connecté) envoyé à l'admin seulement, jamais à l'adresse saisie ;
- trajet hors forfait payable uniquement sur devis ;
- zone tarifaire déterminée par le code postal (un seul code postal exigé ; un pôle n'est retenu que si mot-clé et code postal concordent) ;
- option priorité obligatoire pour une course à moins de 1 h 15 ;
- course payée par carte créée directement au statut `awaiting_driver` ;
- libération automatique de l'empreinte carte en cas d'écart de prix ou de course ;
- retrait d'un membre d'entreprise = révocation de toutes ses sessions.

**Pourquoi** : options les plus prudentes retenues pendant la phase 0 (voir `docs/RAPPORT-PHASE-0.md`).

## D-012 — Suites à planifier issues de la phase 0
**Date** : 2026-10-05 · **Statut** : validée (porte 2, phase 0)

- Phase 1, prioritaire : envoi de l'email de vérification à l'inscription.
- Phase 1 : distance calculée côté serveur, pour rouvrir le paiement en ligne du hors forfait.
- Phase 1 : journal d'audit des actions sensibles.
- Phase 1 : restriction du CORS de `vercel.json`.
- Phase 1 : mise en cohérence des prix affichés avec la grille tarifaire.
- Phase 3 : choix perso/pro du collaborateur au moment de réserver.

## D-013 — Empreinte différée des courses réservées à l'avance (lot 1.1)
**Date** : 2026-10-13 · **Statut** : validée (porte 1 et arbitrages de la relecture sécurité)

- Course à 5 jours ou plus : la carte est enregistrée à la réservation (3-D Secure) et l'empreinte est posée automatiquement 3 jours avant le départ. Moins de 5 jours : empreinte immédiate, inchangée. Paiement hybride refusé au-delà de 5 jours.
- Empreinte refusée (« action_required ») : e-mail au client avec une page de confirmation, alerte e-mail à l'admin et badge « Paiement à confirmer », nouvelle tentative chaque matin. **La course reste dans le pool des chauffeurs ; à J-1 sans confirmation, c'est l'admin qui décide** (appel du client ou annulation). Pas de retrait ni d'annulation automatique.
- Au-delà d'un jour après le départ, ou si la course est terminée sans empreinte, les tentatives s'arrêtent (« failed »).
- **La carte reste enregistrée après la course** (pas de détachement) ; le texte d'accord le dit (« pour cette course et mes prochaines réservations ») et indique que la suppression se demande à contact@izymoto.com. La réutilisation d'une carte enregistrée à l'écran n'est pas encore proposée.
- Seul le serveur crée les réservations `deferred_<seti>` (règle Firestore).

**Pourquoi** : une empreinte n'est valable que 7 jours ; l'autorisation prolongée (30 jours) est réservée à la tarification IC+.

## D-014 — Pool sans données personnelles et coordonnées du passager pendant la course seulement (lot 2.1)
**Date** : 2026-10-13 · **Statut** : validée (porte 1)

- Courses à prendre : collection `ridePool` écrite par le serveur ; le chauffeur validé **en service** n'y voit que la **zone** (pôle, arrondissement de Paris, ou département hors Paris, d'après une table fermée), la date, la distance, le prix et sa part — jamais nom, téléphone, e-mail, notes ni adresse exacte.
- Coordonnées du passager (adresse exacte, téléphone) : lisibles par le chauffeur assigné et validé **pendant la course uniquement** (attribuée / en cours). Ensuite, son historique est une copie réduite (`driverRides`) : zones, date, statut, gains.
- Accepter / démarrer / terminer / libérer et les changements de statut de l'admin passent par le serveur (transaction, journal `auditLogs`). D-003 vérifié aussi sur le téléphone ; la comparaison du **moyen de paiement** (empreinte de carte Stripe) fera l'objet d'un **lot dédié** (décision de Fayssal, 2026-10-14).
- Admin : une course dont l'empreinte est active s'annule par « Annuler le hold » ; une course déjà payée ne s'annule qu'après confirmation du remboursement ; une course au paiement actif ne se supprime pas.

**Pourquoi** : tableau « Qui voit quoi » ; fin de l'écart D-010 avant son échéance ; prérequis de l'appli Chauffeur.

## D-015 — Applis mobiles : technologie, ordre, comptes, position
**Date** : 2026-10-13 · **Statut** : validée (porte 1, plan `docs/plans/2026-10-13-applis-mobiles.md`)

Expo / React Native (TypeScript) ; appli **Chauffeur d'abord**, Client ensuite ; comptes Apple Developer et Google Play **au nom de la société IZYMOTO** (D-U-N-S) ; appli Chauffeur v1 **avec position en arrière-plan** (en service / en course seulement, dernière position sans historique, visible de l'admin et du client de la course acceptée). Prérequis serveur (lot M2) : pool sans données perso (D-014), suppression de compte complète (solde positif → refus et remboursement via contact@izymoto.com ; courses passées pseudonymisées et conservées), notifications push.

## D-016 — Suppression de compte : ce qui est effacé, ce qui est conservé (lot 2.2)
**Date** : 2026-10-14 · **Statut** : validée (porte 1 M2 + arbitrage de la relecture sécurité)

- Effacés : profil, portefeuille (solde nul exigé), client Stripe et cartes enregistrées, fiche chauffeur (réduite au statut « supprimé »), IBAN et pièces, historique chauffeur, invitations entreprise le concernant ; le compte de connexion en dernier.
- Pseudonymisés (pseudonyme aléatoire) et conservés pour la comptabilité : courses (liste blanche : montants, dates, statuts, références de paiement, zones), devis invités envoyés avec son e-mail, mouvements de portefeuille, verrous de paiement, journal d'audit.
- **Factures émises : conservées telles quelles (obligation comptable, 10 ans)**, y compris nom et e-mail — **à faire confirmer par le comptable** et à mentionner dans la politique de confidentialité.
- Données détenues par des tiers (Stripe : paiements et données de facturation ; Resend : e-mails envoyés) : non effacées par Izymoto, conservées par ces prestataires selon leurs propres obligations.
- Refus : course en cours ou à venir, course chauffeur non encore encaissée, solde positif, société avec collaborateurs ou solde ; un compte administrateur ne se supprime pas lui-même et un admin ne supprime pas un autre admin. Laisser la décision à l'admin à J-1 évite d'annuler une course qu'un simple appel au client peut sauver. Accepté par Fayssal : une course peut être réalisée sans empreinte si personne n'agit (risque d'impayé tracé par l'alerte admin).

---

## Qui voit quoi (référence d'isolation)

| Donnée | Client particulier | Collaborateur | Admin entreprise | Chauffeur | Admin Izymoto |
| --- | --- | --- | --- | --- | --- |
| Ses propres courses | Oui | Oui | Oui | — | Oui |
| Courses pro des collègues | — | Non | Oui, sa société uniquement | — | Oui |
| Courses perso d'un salarié | — | — | Non | — | Oui |
| Courses à prendre | Non | Non | Non | Version sans données perso, si compte validé | Oui |
| Coordonnées du passager | — | — | — | Course assignée uniquement, pendant sa durée | Oui |
| Factures et soldes entreprise | Non | Son budget | Oui | Non | Oui |
| IBAN et documents chauffeur | Non | Non | Non | Les siens | Oui, journalisé |

Tout ce qui ne figure pas dans ce tableau est refusé par défaut.
