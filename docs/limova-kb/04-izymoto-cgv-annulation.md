# Izymoto — Conditions générales & politique d'annulation

> Document destiné aux agents IA pour répondre aux questions clients. Pour le détail légal complet, voir https://izymoto.com/mentions-legales et https://izymoto.com/politique-de-confidentialite.

## 1. Cadre général

- **Service** : transport de personnes en moto-taxi
- **Société** : Izymoto, siège 25 Rue de Ponthieu, 75008 Paris
- **TVA applicable** : 10 % (transport de personnes, Art. 279 b quater CGI)
- **Réglementation** : conducteurs titulaires carte professionnelle moto-taxi, motos assurées en transport public

## 2. Réservation

### Modes
- Site web `izymoto.com/reserver`
- Téléphone +33 6 49 50 25 25
- Chatbot site

### Confirmation
- Email + SMS de confirmation après réservation validée
- SMS de rappel 30 min avant le départ avec contact conducteur

### Tarif
- Tarif **fixe affiché à la réservation**
- Pas de surge pricing (pas d'augmentation aux heures de pointe / pluie)
- Tarif TVA 10 % incluse

## 3. Paiement

### Modes acceptés
- Carte bancaire (Visa, Mastercard, CB, American Express) via Stripe
- Apple Pay / Google Pay
- Wallet Izymoto (portefeuille pré-chargé)
- Facturation entreprise (espace grand compte)

### Mécanique du paiement
1. **Réservation** → autorisation Stripe sur la carte (montant gelé, NON débité)
2. **Course effective** → capture (débit réel)
3. **Annulation conforme** → libération de l'autorisation sans débit
4. **No-show / annulation tardive** → capture partielle ou totale selon barème (voir §4)

### Espèces
**Non acceptées** pour des raisons de sécurité et de traçabilité.

## 4. Politique d'annulation

### Par le client

| Délai d'annulation avant le départ | Frais |
|---|---|
| **> 2h** | **Gratuit** — autorisation libérée sans débit |
| **2h à 30 min** | **30 % du montant** |
| **< 30 min** ou **no-show** | **50 à 100 % du montant** selon situation |

**No-show** = passager absent à l'horaire convenu, après tentative de contact par le conducteur (15 min d'attente raisonnable). Dans ce cas, capture du montant total possible.

### Cas particuliers (annulation gratuite même tardive)
- **Vol annulé** par la compagnie aérienne (preuve à fournir : email/SMS compagnie)
- **Hospitalisation** ou cas de force majeure documenté
- **Erreur côté Izymoto** (conducteur indisponible, retard significatif non rattrapé)

### Par Izymoto
Si Izymoto annule (panne moto, indisponibilité conducteur), le client est :
- Remboursé intégralement
- Recontacté pour proposer une alternative (autre conducteur, créneau ajusté)
- Indemnisé d'un geste commercial selon impact (ex. avoir sur prochaine course)

## 5. Modifications

### Modification de l'horaire ou du trajet
- **> 2h avant** : gratuit, modifiable depuis l'espace client ou par téléphone
- **< 2h avant** : selon disponibilité conducteur, possible mais peut entraîner ajustement tarifaire si le nouveau trajet est plus long

### Ajout d'un détour en cours de course
À l'appréciation du conducteur. Si détour significatif (> 5 min ou > 3 km), un complément tarifaire peut s'appliquer (à valider avant le détour).

## 6. Retards

### Retard du conducteur
- **Retard < 10 min** : aucune compensation (aléas trafic acceptables)
- **Retard 10-30 min** : geste commercial (ex. -10 % sur la course)
- **Retard > 30 min** ou **non-arrivée** : course offerte ou avoir intégral

### Retard du client
- **Retard < 15 min** : généralement absorbé sans frais (zone de tolérance)
- **Retard 15-45 min** : frais d'attente au prorata du tarif horaire (80 €/h)
- **Retard > 45 min** : assimilable à un no-show (voir §4)

### Retard de vol (à l'arrivée)
**Gratuit**, à condition d'avoir indiqué le numéro de vol à la réservation. Izymoto suit le statut du vol et ajuste l'heure de prise en charge automatiquement.

## 7. Conditions de transport

### Acceptés
- 1 passager par moto
- 1 bagage cabine + 1 petit sac à main (inclus)
- Bagages volumineux (top-case grand format) : sur réservation

### Non acceptés
- Enfants de moins de 12 ans (réglementation française)
- Animaux
- Plus d'1 passager par moto
- Substances illicites, objets dangereux, matières inflammables

### Tenue & équipement
- Casque fourni (modulable haut de gamme)
- Charlotte hygiénique disponible
- Équipement de pluie en cas d'intempéries
- Gants disponibles sur demande
- Tablier déperlant pour les jours pluvieux

## 8. Responsabilité & assurance

- Toutes les motos Izymoto sont **assurées en transport public de personnes**
- **Assurance passager** complète couvrant les dommages corporels
- Le passager est tenu de respecter les consignes de sécurité du conducteur
- Izymoto ne peut être tenu responsable :
  - D'un objet oublié non récupéré (procédure à activer dans les 48h)
  - D'un retard causé par un cas de force majeure (manifestation, intempérie majeure, accident sur le trajet hors responsabilité du conducteur)

## 9. Litiges

### Procédure
1. Email à `contact@izymoto.com` décrivant le problème
2. Réponse Izymoto sous 24h ouvrées
3. Tentative de résolution amiable (geste commercial, remboursement si justifié)
4. Si désaccord persistant : médiation par un médiateur de la consommation agréé
5. En dernier recours : tribunal compétent du siège (Paris)

### Délai de réclamation
**30 jours** après la course pour toute contestation (dépassé ce délai, la course est considérée comme acceptée).

## 10. Données personnelles & RGPD

- Données collectées : nom, prénom, email, téléphone, adresses de prise en charge / dépose, historique des courses
- **Finalité** : gestion de la prestation, facturation, support client, prospection commerciale (avec consentement)
- **Durée de conservation** : 5 ans après dernière course (obligation légale comptable)
- **Droits** : accès, rectification, suppression, portabilité (contact : `contact@izymoto.com`)
- **Hébergement** : Vercel (USA, encadré par DPA), Firestore (Google Cloud, GDPR-compliant)
- Pour le détail : `https://izymoto.com/politique-de-confidentialite`

## 11. Force majeure

Izymoto ne peut être tenu responsable d'une interruption ou d'un retard du service en cas de :
- Manifestation, grève, blocage routier non prévisible
- Intempérie extrême (verglas, neige importante, tempête)
- Accident sur le trajet hors responsabilité du conducteur
- Décision administrative (fermeture d'axe routier, plan Vigipirate)

Dans ces cas, recherche de solution alternative et remboursement intégral si la course ne peut être assurée.
