# Izymoto — Wallet & espace grand compte (B2B + B2C)

> Document pour les agents IA — pitch et fonctionnement du portefeuille pré-chargé Izymoto, version particuliers et version entreprises.

## 1. Concept

Le **wallet Izymoto** est un **portefeuille pré-chargé** que le client (particulier ou entreprise) recharge à l'avance. Les courses sont ensuite débitées du wallet, **sans avoir à ressaisir une carte bancaire à chaque trajet**.

**Bonus** : selon le montant rechargé, l'utilisateur reçoit un **crédit additionnel offert** par Izymoto (ex. recharge de 1 000 € → 1 100 € crédités).

## 2. Wallet particuliers (B2C)

### Public cible
- Clients réguliers (au moins 2-3 courses/mois)
- Voyageurs business fréquents
- Clientèle CSP+ habituée au moto-taxi

### Avantages utilisateur
- ✅ **Tarif effectif réduit** grâce aux bonus de palier
- ✅ **Réservation 1 clic** sans ressaisir CB
- ✅ **Fidélité récompensée** (palier supérieur = bonus +)
- ✅ **Suivi consommation** dans l'espace personnel `/portefeuille/mon-compte`

### Comment recharger
1. Aller sur `https://izymoto.com/portefeuille`
2. Sélectionner un palier de recharge
3. Payer via Stripe Checkout (CB, Apple Pay, Google Pay)
4. Solde crédité instantanément (+ bonus appliqué)

### Paliers proposés (à confirmer / ajuster côté `lib/wallet/tiers.ts`)
*(Indicatif — vérifier les valeurs exactes dans le code)*

| Recharge | Bonus | Solde crédité | Bonus % effectif |
|---|---|---|---|
| 200 € | 0 € | 200 € | 0 % |
| 500 € | 25 € | 525 € | +5 % |
| 1 000 € | 100 € | 1 100 € | +10 % |
| 2 500 € | 375 € | 2 875 € | +15 % |

## 3. Wallet entreprises (B2B grand compte)

### Public cible
- **Hôtels 4★/5★ et palaces** (conciergerie pour clients VIP)
- **Sociétés de gestion** (banques privées, family offices)
- **Comités d'entreprise** (souhaitant offrir un avantage transport)
- **Cabinets d'avocats / conseil** (déplacements RDV multiples)
- **Sociétés événementielles** (logistique invités VIP, festivals)
- **Entreprises tech / start-ups** Triangle d'Or & La Défense (CSP+ collaborateurs)

### Mécanique
1. **Société souscrit** un wallet entreprise (KYC simple, contrat cadre)
2. **Recharge** d'un montant initial (ex. 5 000 € à 50 000 € selon volume estimé)
3. **Bonus de bienvenue** + bonus selon palier de recharge
4. **Collaborateurs autorisés** sont liés au compte société
5. Lors d'une course, le collaborateur indique son **code société** (ou est automatiquement reconnu via email professionnel)
6. Course débitée du **wallet société**, **0 € à avancer** par le collaborateur
7. Société reçoit un **rapport mensuel** détaillé (qui, quand, combien, pour quel trajet)

### Avantages société
- ✅ **Économies d'échelle** sur les bonus de recharge
- ✅ **Suppression des notes de frais** transport (gain de temps RH/compta)
- ✅ **Visibilité totale** sur la consommation transport
- ✅ **Service homogène et premium** pour tous les collaborateurs
- ✅ **Facture unique mensuelle** (TVA 10 % détaillée)
- ✅ **Engagement zéro** : à tout moment, le solde restant peut être remboursé ou transféré sur un autre wallet

### Avantages collaborateur
- ✅ Pas de CB perso à sortir (pas d'avance de frais)
- ✅ Réservation rapide (compte d'entreprise reconnu, parcours simplifié)
- ✅ Service premium garanti (image de l'entreprise valorisée)

### Avantages Izymoto
- 💰 **Cash flow positif** (argent à l'avance)
- 🔗 **Lock-in client** (effet d'engagement par le pré-paiement)
- 📈 **Volume garanti** (les sociétés ont intérêt à utiliser le solde)

## 4. Comment activer le wallet entreprise (process commercial)

### Côté prospect / client
1. **Demande** via formulaire `https://izymoto.com/contact` ou téléphone +33 6 49 50 25 25
2. **Échange commercial** : volume estimé, type de société, périmètre (ville / aéroport / mise à dispo)
3. **Devis personnalisé** : palier de recharge initial + bonus négocié
4. **Contrat cadre** signé (CGV B2B + politique de remboursement)
5. **Premier rechargement** via Stripe Checkout B2B (facture pro forma)
6. **Activation** des collaborateurs autorisés (liste fournie par la société)
7. **Onboarding** : briefing du référent + collaborateurs (15 min)

### Côté Izymoto (admin)
- Création du compte société dans le back-office `/admin/wallets`
- Liaison des emails professionnels collaborateurs
- Configuration du quota par collaborateur (optionnel : limite mensuelle individuelle)
- Activation rapport mensuel automatique (Resend)

## 5. Cas d'usage type

### Cas A — Hôtel 5★ Triangle d'Or
- Hôtel charge 10 000 € sur le wallet société (palier avec +12 % bonus = 11 200 €)
- Conciergerie commande automatiquement une moto pour ses clients VIP
- Refacturation au client final selon politique de l'hôtel (souvent transparent dans la note ou commission concierge)

### Cas B — Banque privée Place Vendôme
- Wallet 25 000 € (bonus +15 % = 28 750 €)
- 30 banquiers autorisés à commander pour leurs RDV avec clients fortunés
- Zéro note de frais à traiter, facture unique mensuelle pour la compta

### Cas C — Comité d'entreprise tech La Défense
- Wallet 5 000 € (bonus +5 % = 5 250 €)
- Avantage offert aux 200 salariés sous forme de "bons de course" (ex. 50 € offerts pour transferts aéroport pro)
- Suivi des bénéficiaires + reporting transparent

### Cas D — Cabinet d'avocats parisien
- Wallet 8 000 € (bonus +8 % = 8 640 €)
- 15 associés/collaborateurs autorisés, pour leurs déplacements TGV / Eurostar / RDV clients
- Facture mensuelle unique

## 6. Tarification & remises B2B (cadre)

| Volume mensuel estimé | Recharge initiale recommandée | Bonus indicatif |
|---|---|---|
| < 500 € | 500 € | 0-2 % |
| 500-2 000 € | 2 000 € | 5 % |
| 2 000-5 000 € | 5 000 € | 8 % |
| 5 000-15 000 € | 15 000 € | 12 % |
| > 15 000 € | sur devis | jusqu'à 18 % négocié |

*(À ajuster selon le contrat cadre négocié)*

## 7. Politique de remboursement (B2B)

- Solde wallet remboursable à tout moment (sur demande écrite, sous 15 jours ouvrés)
- Bonus offerts **non remboursables** (mais utilisables jusqu'à épuisement du compte)
- Pas de frais de clôture
- Pas de durée minimale d'engagement

## 8. Posture commerciale agents IA

### Pour Mickael (chatbot site)
Si un visiteur identifie qu'il représente une **entreprise** ou un **hôtel** :
- Lui présenter le wallet entreprise (pitch court)
- Récupérer ses coordonnées + contexte (nom société, secteur, volume estimé)
- Le rediriger vers `contact@izymoto.com` ou la prise de RDV téléphonique

### Pour Elio (LinkedIn outbound)
Cibles prioritaires :
- Directeurs concierge d'hôtels 4★/5★ Paris (Plaza, Bristol, Crillon, Ritz, etc.)
- Directeurs services généraux / office managers de cabinets d'avocats CAC40
- DRH / responsables avantages CSE de grandes entreprises Paris/La Défense
- Family office & banques privées (head of operations)

Pitch type :
> *"Bonjour [Prénom], je dirige Izymoto, service de moto-taxi haut de gamme à Paris. Je propose une solution de wallet entreprise pré-chargé qui permet à vos [collaborateurs / clients VIP] de bénéficier d'un transport premium sans note de frais ni avance, avec bonus jusqu'à +15 % sur la recharge. Seriez-vous ouvert à un échange 15 min pour voir si ça pourrait servir [nom société] ?"*

## 9. Différenciation vs concurrents

| Critère | Izymoto | Concurrents (Citybird, Motocab) |
|---|---|---|
| Wallet pré-chargé avec bonus | ✅ | ⚠️ partiel |
| Facture unique mensuelle | ✅ | ✅ |
| Liaison email professionnel auto | ✅ | ⚠️ |
| Reporting personnalisé | ✅ | ⚠️ |
| Souplesse contractuelle (pas d'engagement) | ✅ | ⚠️ |
| Service concierge personnalisé | ✅ | ❌ |

## 10. Statut au 2026-05-10 (à supprimer une fois projet clos)

- Phase 1 UI livrée (page `/portefeuille` paliers + FAQ)
- Phase 2 noyau livré (Stripe Checkout recharge, Firebase Admin SDK, hook useWallet)
- Phases 2A, 2B-1, 2B-2, 2C livrées (historique transactions, paiement par wallet sur résa, paiement hybride, ajustements admin)
- **Reste à faire** : templates email Resend (recharge + débit), validation token Firebase API, sécurisation rules Firestore `bookings/{id}`
