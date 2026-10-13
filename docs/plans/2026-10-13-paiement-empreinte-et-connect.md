# Plan — empreinte bancaire au-delà de 7 jours (a) et Stripe Connect chauffeurs (b)

Date : 2026-10-13 · Statut : **validé par Fayssal (porte 1, 2026-10-13)** · Classement : **SENSIBLE** (argent, données bancaires)

Décisions de la porte 1 :
- Lot A : carte enregistrée + empreinte à J-3 (pas de limite à 6 jours).
- Lot B : Stripe Connect, l'argent des chauffeurs détenu par Stripe (agréé) ; inscription des versements par le **formulaire Stripe intégré au site** (composants Connect embarqués : les données vont directement chez Stripe, qui vérifie l'identité) ; versement hebdomadaire. Écartés : virements depuis la banque d'Izymoto (Izymoto détiendrait les fonds des chauffeurs) et formulaire entièrement développé par Izymoto.
- Lot B, à faire valider par le comptable avant de démarrer : qui facture le client, TVA sur la commission, mandat de facturation.
- « Chauffeur actif » (tarif Connect) = chauffeur ayant reçu au moins un versement dans le mois.

Base de départ : `lot/0.5-regles` (phase 0). Rien n'est modifié avant validation.

---

## Constat

- `app/api/create-payment-intent/route.js:85-112` crée une empreinte (`capture_method: "manual"`) **au moment de la réservation**. Une empreinte carte en ligne est valable **7 jours** chez la plupart des réseaux ; or la date de course peut être jusqu'à **1 an** plus tard (`lib/pricing/quote.ts:62`). Au-delà de 7 jours, la capture après la course échoue : course non payée.
- L'autorisation prolongée Stripe (jusqu'à 30 jours) est réservée à la tarification **IC+** et ne couvre pas 1 an : écartée.
- Aucune fonction de versement chauffeur : 100 % de l'argent arrive sur le compte Stripe Izymoto, la part chauffeur (`driverShareCents`, 80 %, `lib/firebase/dispatch.ts:165`) est seulement affichée ; les virements sont faits à la main, sans suivi.

---

## Lot A — `lot/1.1-empreinte-differee`

**Principe** : pour une course lointaine, on **enregistre la carte** à la réservation (avec authentification 3-D Secure du client) et on ne pose l'empreinte que **3 jours avant la course**.

| Départ de la course | Comportement |
|---|---|
| dans moins de 5 jours | inchangé : empreinte immédiate |
| dans 5 jours ou plus | carte enregistrée (SetupIntent, `usage: off_session`) ; empreinte créée automatiquement à J-3 |

1. **Réservation lointaine** : création d'un client Stripe (Customer) par compte Izymoto, SetupIntent confirmé par le client dans le même écran de paiement qu'aujourd'hui. Texte d'accord sous le bouton : « J'autorise Izymoto à bloquer puis débiter [montant] sur cette carte pour la course du [date]. » Réservation en `awaiting_driver`, `paymentStatus: "card_saved"`.
2. **Tâche quotidienne** (Vercel Cron, 1 exécution par jour, route protégée par secret) : pour chaque course `card_saved` à J-3, PaymentIntent `off_session`, `confirm: true`, `capture_method: "manual"`, clé d'idempotence = id de réservation. Succès → `paymentStatus: "authorized"` (flux actuel ensuite).
3. **Échec** (carte refusée ou authentification demandée par la banque) : `paymentStatus: "action_required"`, e-mail au client avec un lien vers une page de confirmation (paiement en session), alerte dans l'admin. Nouvelle tentative le lendemain. Sans solution à J-1 : l'admin décide (appel client ou annulation).
4. **Admin** : afficher sur chaque réservation carte « à capturer avant le … » (`capture_before` renvoyé par Stripe) et l'état de la carte enregistrée.
5. **Annulation** d'une course `card_saved` : rien à rembourser ; on détache la carte si le client n'a pas d'autre course.
6. Hors périmètre : paiement portefeuille (débit immédiat, non concerné).

**Critères d'acceptation**
- Une course à J+30 payée par carte de test `4000 0025 0000 3155` (3-D Secure) passe en `card_saved` sans empreinte.
- La tâche du jour crée l'empreinte pour les courses à J-3 et seulement elles ; relancée deux fois, elle ne crée pas deux empreintes.
- Carte `4000 0000 0000 9995` (refus) : `action_required`, e-mail client, alerte admin.
- Le montant de l'empreinte est le prix serveur de la réservation, jamais une valeur du navigateur.
- Courses à moins de 5 jours : comportement strictement identique à aujourd'hui (tests existants verts).
- La route de la tâche refuse tout appel sans le secret.

---

## Lot B — `lot/1.2-connect-chauffeurs`

**Principe** : Stripe Connect, comptes chauffeurs **Express**, tarification **gérée par Izymoto**, **paiements et transferts distincts** (le chauffeur n'est pas connu au moment du paiement). Le client paie toujours Izymoto ; après la course, Izymoto transfère la part chauffeur sur son compte Stripe ; Stripe le paie chaque semaine.

1. **Inscription des versements** : bouton « Configurer mes versements » dans le profil chauffeur → page Stripe (Account Link) qui collecte l'IBAN et vérifie l'identité (KYC). On stocke `stripeAccountId` et `payoutsEnabled` (mis à jour par le webhook `account.updated`).
2. **Transfert** : déclenché quand la course est payée et terminée :
   - carte : après la capture, `transfer` du montant `driverShareCents` avec `source_transaction` = la charge (le transfert n'est exécuté que lorsque les fonds sont disponibles) ;
   - portefeuille / entreprise : `transfer` depuis le solde de la plateforme à la validation de la course ;
   - clé d'idempotence = id de réservation ; `transferId` et `driverPayoutStatus` (`pending` / `transferred` / `failed` / `reversed`) enregistrés sur la réservation.
3. **Remboursement après transfert** : annulation du transfert (transfer reversal), proportionnelle.
4. **Versements** : calendrier hebdomadaire des comptes connectés (jour à choisir).
5. **Chauffeur** : dans son espace, chaque course affiche « versée le … » ou « en attente » ; lien vers son tableau de bord Stripe Express (relevés).
6. **Admin** : page « Versements » : par chauffeur, montant dû, transféré, échoué ; bouton « relancer » en cas d'échec.
7. **Données** : l'IBAN n'est plus stocké dans Firestore (collecté par Stripe) ; suppression des IBAN existants après migration.

**Critères d'acceptation**
- En mode test, un chauffeur crée son compte Express et passe `payoutsEnabled: true` via le webhook.
- Course carte capturée → un seul transfert de 80 % vers le bon compte, même si la capture ou le webhook est rejoué.
- Course portefeuille terminée → transfert depuis le solde plateforme.
- Remboursement total après transfert → transfert annulé, statut `reversed`.
- Un chauffeur ne voit que ses propres versements (tests de règles sur l'émulateur).
- Plus aucun IBAN dans `drivers/{uid}` pour les nouveaux chauffeurs.

**Coût Connect** (France, tarification gérée par la plateforme) : 2 € par chauffeur actif et par mois + 0,25 % + 0,10 € par versement ; vérification d'identité et relevés inclus. Exemple : 20 courses à 46 €/mois, versement hebdomadaire → ≈ 4,25 €/mois par chauffeur.

---

## Prérequis hors code (Fayssal)

- Activer Connect sur le compte Stripe Izymoto (profil de plateforme, questionnaire) — d'abord dans le bac à sable.
- **Comptable / avocat** : qui facture le client (Izymoto ou le chauffeur), TVA sur la commission, mandat de facturation des auto-entrepreneurs, CGU chauffeurs (acceptation de l'accord de compte connecté Stripe) et CGV clients (enregistrement de la carte).
- Décider de la base de la commission (voir décisions).

## Décisions à prendre (porte 1)

1. **Lot A** : carte enregistrée + empreinte à J-3 (recommandé) **ou** limiter la réservation en ligne à 6 jours à l'avance (2 h de travail, mais perte des réservations anticipées, fréquentes pour les aéroports).
2. **Lot B — moment du transfert** : après capture / validation de la course (recommandé) ; jour de versement hebdomadaire.
3. **Lot B — obligation** : un chauffeur doit avoir terminé la configuration Stripe pour accepter des courses (recommandé), avec un délai de grâce pour les chauffeurs déjà actifs ?
4. **Commission** : 20 % calculés sur le prix total suppléments compris (actuel) ; les frais Stripe et le bonus portefeuille restent à la charge d'Izymoto (actuel) — à confirmer avec le comptable.

## Ordre et agents

1. Lot A d'abord (risque d'impayé), puis lot B.
2. Pour chacun : `dev-fullstack` implémente sur sa branche ; `securite-reviewer` + `qa-tests` systématiquement (SENSIBLE) ; tests Vitest (routes, webhook, idempotence) + règles sur l'émulateur ; essai bout en bout sur la prévisualisation avec le bac à sable Stripe et la CLI (`stripe trigger`, cartes de test).
3. Rapport à Fayssal (10 lignes) puis porte 2.

## Sources

- Autorisation prolongée, validité 7 jours par défaut, IC+ : https://docs.stripe.com/payments/extended-authorization
- Paiements et transferts distincts, `source_transaction` : https://docs.stripe.com/connect/separate-charges-and-transfers
- Tarifs Connect : https://stripe.com/fr/connect/pricing
