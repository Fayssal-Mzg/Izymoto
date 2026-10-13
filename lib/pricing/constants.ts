// Source de vérité unique de la grille tarifaire Izymoto (client ET serveur).
// Valeurs reprises à l'identique de l'ancien app/reserver/utils/constants.js (lot 0.3) :
// toute modification de tarif se fait ICI et nulle part ailleurs.

export interface PointAdresse {
  nom: string;
  adresse: string;
}

// Liste des aéroports parisiens
export const aeroports: PointAdresse[] = [
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

export const gares: PointAdresse[] = [
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

export interface Tarif {
  depart: string;
  arrivee: string;
  prix: number;
}

// Grille tarifaire alignée sur motocab.com (forfaits déterministes, indépendants du km).
// Les forfaits Beauvais / Disneyland / Le Bourget / La Défense intra-Paris ne figurent
// pas chez motocab — valeurs estimées de manière cohérente avec leur barème.
export const tarifs: Tarif[] = [
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

// Mise à disposition (motocab). Affichage uniquement : le tunnel de réservation
// en ligne ne propose pas (encore) cette prestation, elle n'est donc pas un
// paramètre de prix côté serveur.
export const miseADisposition = [
  { duree: "1 heure", prix: 95 },
  { duree: "4 heures", prix: 320 },
  { duree: "8 heures (journée)", prix: 580 },
];

// Majorations en montants FIXES (motocab) — plus prévisible que des pourcentages.
// Affichage : les montants réellement appliqués sont ceux de MAJORATION_* ci-dessous.
export const majorations: Array<{
  type: string;
  montant?: number;
  pourcentage?: number;
}> = [
  { type: "Soir / matin tôt (6h-7h ou 20h-23h)", montant: 20 },
  { type: "Nuit (23h-6h)", montant: 40 },
  { type: "Week-end ou jour férié", montant: 20 },
  { type: "Réservation à moins de 2h", montant: 20 },
  { type: "Annulation à moins de 2 heures", pourcentage: 100 },
];

// Montants et libellés appliqués par le calcul (identiques à l'ancien pricingUtils.js).
export const MAJORATION_RESERVATION_TARDIVE = {
  type: "Réservation à moins de 2h",
  montant: 20,
} as const;
export const MAJORATION_NUIT = { type: "Nuit (23h-6h)", montant: 40 } as const;
export const MAJORATION_SOIR = { type: "Soir / matin tôt", montant: 20 } as const;
export const MAJORATION_WEEKEND = {
  type: "Week-end ou jour férié",
  montant: 20,
} as const;

export type ZoneKey =
  | "paris"
  | "petite_couronne"
  | "grande_couronne"
  | "roissy"
  | "orly"
  | "leBourget"
  | "beauvais"
  | "disneyland"
  | "laDefense"
  | "hors_forfait";

export interface ZoneDefinition {
  codePostalPrefixes: string[];
  keywords: RegExp[];
}

// Définition des zones pour la tarification.
// La détection se fait en priorité par mots-clés (aéroports, La Défense),
// puis par code postal extrait de l'adresse (plus robuste que le pattern texte).
export const zones: Record<string, ZoneDefinition> = {
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

// Fuseau de référence de toutes les majorations horaires.
export const FUSEAU_TARIFAIRE = "Europe/Paris";
