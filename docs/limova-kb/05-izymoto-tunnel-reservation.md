# Izymoto — Tunnel de réservation (parcours utilisateur)

> Document pour les agents IA — comprendre comment guider un utilisateur dans le parcours de réservation `izymoto.com/reserver`.

## Vue d'ensemble du parcours

```
1. Devis (modal "DevisModal")
   ├─ Adresse de départ (autocomplete Google Maps)
   ├─ Adresse d'arrivée
   ├─ Date & heure de départ souhaitée
   ├─ Type de course (ville / aéroport / gare / mise à dispo)
   ├─ Options (priorité, bagages volumineux, etc.)
   └─ → calcul du devis instantané

2. Identification (modal "UserModal")
   ├─ Si déjà connecté → prérempli + skip possible
   ├─ Si nouveau → email + téléphone + nom/prénom
   ├─ Option : créer un compte (récupération wallet, historique)
   └─ → coordonnées validées

3. Paiement (modal "PaymentModal")
   ├─ Si wallet suffisant → paiement 100 % wallet (1 clic)
   ├─ Si wallet partiel → paiement hybride wallet + CB
   ├─ Sinon → CB classique via Stripe Elements
   ├─ 3DS si demandé par la banque
   └─ → autorisation gelée (statut "authorized")

4. Confirmation (modal "ConfirmationModal")
   ├─ Récap : trajet, horaire, conducteur attribué (si déjà assigné)
   ├─ Numéro de réservation
   ├─ Email + SMS de confirmation envoyés
   └─ → fin du tunnel
```

## 1. Étape Devis

### Champs obligatoires
- **Adresse de départ** (autocomplete Google Maps API, contraint à France)
- **Adresse d'arrivée** (idem)
- **Date** (minimum aujourd'hui, maximum 6 mois)
- **Heure** (par tranche de 15 min, 30 min minimum à l'avance)

### Champs optionnels
- **Numéro de vol** (si trajet aéroport, pour suivi temps réel)
- **Bagages volumineux** (oui/non, ajuste l'équipement moto)
- **Option priorité** (si dispo, créneau garanti)
- **Demandes spéciales** (champ texte libre)

### Calcul automatique
- Distance + temps estimés via Google Maps Directions API
- Application du barème tarifaire (50 € / 65 € / 80 € / 80 €/h)
- Affichage du **tarif fixe TTC** + détail TVA 10 %

### Posture agent IA
Si utilisateur hésite ou pose des questions :
- Encourager à essayer le devis (gratuit, sans engagement)
- Rappeler que le tarif est garanti à la réservation
- Si trajet inhabituel → orienter vers le téléphone +33 6 49 50 25 25

## 2. Étape Identification

### Cas 1 : utilisateur déjà connecté (Firebase Auth)
- Coordonnées préremplies depuis profil
- Skip possible si tout est complet
- Possibilité de modifier ponctuellement (sans toucher au profil)

### Cas 2 : utilisateur nouveau
Champs requis :
- **Prénom**
- **Nom**
- **Email** (validation format)
- **Téléphone** (format français +33, validation pattern)

Option proposée :
- ☑️ "Créer mon compte" (par défaut coché) → permet :
  - Récupération de l'historique des courses
  - Accès au wallet (rechargement, bonus)
  - Réservations rapides la prochaine fois (coordonnées sauvées)

### Important UX (feedback noté en mémoire)
- **Reprise du tunnel après login** : si l'utilisateur clique "Se connecter" en cours de tunnel, le parcours reprend où il en était (pas de perte de saisie)
- **Purge sur clic X** : fermer le tunnel via X = purge complète des données saisies (RGPD-friendly)

### Posture agent IA
Si l'utilisateur hésite à créer un compte :
- Mettre en avant le **wallet avec bonus** (gain économique direct)
- Rassurer sur la confidentialité (RGPD, données stockées en France via Firestore Europe)
- Préciser que créer un compte ne nécessite pas de mot de passe à la première résa (Magic Link possible)

## 3. Étape Paiement

### 3.1 Logique de routage

```
Si user a un wallet ET solde wallet >= montant course
  → Mode "100 % wallet" (1 clic, débit immédiat du wallet, pas de CB)

Sinon si user a un wallet ET solde > 0 < montant
  → Mode "hybride" : wallet utilisé en partie + complément CB
  → CB via Stripe Elements pour le reste

Sinon
  → Mode "100 % CB" : Stripe Elements, autorisation hold/capture
```

### 3.2 Stripe Elements (CB classique)

- Champ CB sécurisé (PCI-DSS via iframe Stripe)
- Apple Pay / Google Pay si disponibles sur le device
- 3DS automatique si requis par la banque
- **Capture différée** : autorisation à la résa, débit réel après la course (admin déclenche `/api/capture-payment`)

### 3.3 Paiement wallet (B2C ou B2B)

#### B2C (wallet personnel)
- Wallet pré-chargé via `/portefeuille` avec bonus selon palier
- Débit instantané du wallet à la résa
- Email de confirmation indique le débit + solde restant

#### B2B (wallet entreprise)
- Wallet société pré-chargé par admin
- Collaborateur lié à la société peut commander sans CB
- Débit instantané, traçabilité complète dans le back-office société

### 3.4 Statuts Stripe / Firestore

| Statut Stripe | Statut Firestore | Signification |
|---|---|---|
| `requires_payment_method` | — | Initial, en attente CB |
| `requires_capture` | `authorized` | CB validée, montant gelé |
| `succeeded` | `captured` | Course terminée, débit effectif |
| `canceled` | `released` | Annulation, hold libéré |
| `failed` | `failed` | Erreur paiement |

### Posture agent IA
- **Rassurer** : "Vous n'êtes débité qu'après votre course"
- **Mentionner le wallet** si l'utilisateur fait souvent des courses
- **Si refus carte** : suggérer Apple/Google Pay ou autre carte

## 4. Étape Confirmation

### Informations affichées
- Numéro de réservation (format `IZY-XXXXXX`)
- Récap trajet : départ, arrivée, date, heure
- Tarif final TTC
- Mode de paiement utilisé
- Conducteur attribué (si déjà assigné, sinon "à venir 30 min avant")
- Lien vers espace personnel (suivi, modifications)

### Notifications envoyées
- **Email instantané** : récap + facture pro forma
- **SMS instantané** : confirmation courte
- **SMS J-30 min** : nom du conducteur, photo, modèle moto, plaque, numéro

## 5. Cas particuliers

### Réservation pour un tiers
Le tunnel actuel demande les coordonnées du **passager**. Si l'utilisateur réserve pour quelqu'un d'autre, lui demander de saisir les coordonnées du passager final (et pas les siennes).

### Réservation aller-retour
Pas géré nativement aujourd'hui dans le tunnel — il faut **réserver 2 courses séparées** (aller puis retour). À orienter sur cette voie.

### Course à plusieurs (cortège de motos)
Pas dans le tunnel — orienter vers le téléphone pour devis personnalisé.

### Mise à disposition (heures multiples)
Sélectionner "Mise à disposition" en type de course → indiquer durée souhaitée (par tranches d'1h, min 1h, max 8h).

## 6. Flux de réenrichissement post-confirmation

Après confirmation, le client peut :
- **Modifier** sa course (jusqu'à 2h avant) depuis `/profil/reservations`
- **Annuler** (selon politique d'annulation, voir doc CGV)
- **Suivre en temps réel** le conducteur (J-30 min) via lien SMS
- **Recharger son wallet** depuis `/portefeuille` pour la prochaine course

## 7. Posture globale agent IA

### À FAIRE
- ✅ Vouvoiement systématique
- ✅ Ton concierge : courtois, posé, rassurant, professionnel
- ✅ Proposer le tarif avant que l'utilisateur ne demande "combien ?"
- ✅ Mentionner les avantages premium (ponctualité, équipement, gain de temps)
- ✅ Orienter rapidement vers le tunnel ou le téléphone selon complexité

### À NE PAS FAIRE
- ❌ Tutoyer
- ❌ Promettre quelque chose hors barème (un tarif "à la tête du client")
- ❌ Inventer des informations non documentées (zones non couvertes, options inexistantes)
- ❌ Pousser à la création de compte si l'utilisateur refuse explicitement
- ❌ Saturer de questions — si l'utilisateur veut réserver, le mener au tunnel rapidement
