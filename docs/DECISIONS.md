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
**Date** : 2026-10-05 · **Statut** : validée (porte 2, phase 0) · **Échéance** : 2026-10-31

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
