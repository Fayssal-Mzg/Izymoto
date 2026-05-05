// Liste des aéroports parisiens
export const aeroports = [
  {
    nom: "Charles de Gaulle (CDG)",
    adresse: "Aéroport Paris-Charles de Gaulle, 95700 Roissy-en-France",
  },
  { nom: "Orly (ORY)", adresse: "Aéroport d'Orly, 94390 Orly" },
  { nom: "Beauvais (BVA)", adresse: "Aéroport de Paris-Beauvais, 60000 Tillé" },
  {
    nom: "Le Bourget",
    adresse: "Aéroport de Paris-Le Bourget, 93350 Le Bourget",
  },
];

export const gares = [
  { nom: "Gare du Nord", adresse: "18 Rue de Dunkerque, 75010 Paris" },
  { nom: "Gare de Lyon", adresse: "Place Louis-Armand, 75012 Paris" },
  {
    nom: "Gare Montparnasse",
    adresse: "17 Boulevard de Vaugirard, 75015 Paris",
  },
  { nom: "Gare de l'Est", adresse: "Place du 11 Novembre 1918, 75010 Paris" },
  { nom: "Gare Saint-Lazare", adresse: "13 Rue d'Amsterdam, 75008 Paris" },
  { nom: "Gare d'Austerlitz", adresse: "85 Quai d'Austerlitz, 75013 Paris" },
];

// Grille tarifaire alignée sur motocab.com (forfaits déterministes, indépendants du km).
// Les forfaits Beauvais / Disneyland / Le Bourget / La Défense intra-Paris ne figurent
// pas chez motocab — valeurs estimées de manière cohérente avec leur barème.
export const tarifs = [
  // Forfaits motocab (référence)
  { depart: "Paris", arrivee: "Paris", prix: 46 },
  { depart: "Paris", arrivee: "Orly", prix: 76 },
  { depart: "Paris", arrivee: "Roissy", prix: 99 },
  { depart: "La Défense", arrivee: "Roissy", prix: 99 },
  { depart: "La Défense", arrivee: "Orly", prix: 99 },
  { depart: "Roissy", arrivee: "Orly", prix: 139 },
  // Compléments cohérents avec le maillage motocab
  { depart: "Paris", arrivee: "La Défense", prix: 50 },
  { depart: "Paris", arrivee: "Le Bourget", prix: 65 },
  { depart: "Paris", arrivee: "Petite couronne", prix: 70 },
  { depart: "Paris", arrivee: "Disneyland", prix: 110 },
  { depart: "La Défense", arrivee: "Le Bourget", prix: 80 },
  { depart: "Roissy", arrivee: "Le Bourget", prix: 60 },
  { depart: "Roissy", arrivee: "Disneyland", prix: 120 },
  { depart: "Orly", arrivee: "Disneyland", prix: 130 },
  { depart: "Beauvais", arrivee: "Paris", prix: 180 },
  { depart: "Beauvais", arrivee: "La Défense", prix: 170 },
];

// Mise à disposition (motocab)
export const miseADisposition = [
  { duree: "1 heure", prix: 95 },
  { duree: "4 heures", prix: 320 },
  { duree: "8 heures (journée)", prix: 580 },
];

// Majorations en montants FIXES (motocab) — plus prévisible que des pourcentages.
export const majorations = [
  { type: "Soir / matin tôt (6h-7h ou 20h-23h)", montant: 20 },
  { type: "Nuit (23h-6h)", montant: 40 },
  { type: "Week-end ou jour férié", montant: 20 },
  { type: "Réservation à moins de 2h", montant: 20 },
  { type: "Annulation à moins de 2 heures", pourcentage: 100 },
];

// Définition des zones pour la tarification.
// La détection se fait en priorité par mots-clés (aéroports, La Défense),
// puis par code postal extrait de l'adresse (plus robuste que le pattern texte).
export const zones = {
  paris: { codePostalPrefixes: ["75"], keywords: [/\bparis\b/i] },
  petite_couronne: {
    codePostalPrefixes: ["92", "93", "94"],
    keywords: [/courbevoie|nanterre|puteaux|montrouge|saint[- ]ouen|saint[- ]denis|levallois|neuilly|boulogne|issy|vincennes|montreuil|cr[ée]teil/i],
  },
  grande_couronne: {
    codePostalPrefixes: ["77", "78", "91", "95"],
    keywords: [],
  },
};

// Paramètres du fallback hors-forfait (utilisé seulement si aucun forfait ne matche).
// Les valeurs sont arrondies par paliers de 5€ pour éviter les variations à l'écran
// quand Google Maps recalcule l'itinéraire avec quelques mètres d'écart.
export const parametresTarifs = {
  priseEnChargeHorsForfait: 30,
  prixParKmHorsForfait: 3,
  arrondiPalier: 5, // arrondi à 5€ près
  attenteGratuite: 5, // minutes
  attenteAeroportGratuite: 20, // minutes après atterrissage
  prixParMinuteAttente: 1,
  supplementPriorite: 20, // bouton "réservation prioritaire"
};
