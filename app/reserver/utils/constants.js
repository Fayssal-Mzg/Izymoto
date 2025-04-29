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

// Grille tarifaire mise à jour selon les nouveaux tarifs
export const tarifs = [
  { depart: "Paris", arrivee: "Paris", prix: 65 },
  { depart: "Paris", arrivee: "Orly", prix: 90 },
  { depart: "Paris", arrivee: "Roissy", prix: 110 }, 
  { depart: "Orly", arrivee: "La Défense", prix: 110 },
  { depart: "Roissy", arrivee: "La Défense", prix: 125 },
  { depart: "Orly", arrivee: "Roissy", prix: 145 },
  // Ajout d'autres trajets possibles
  { depart: "Paris", arrivee: "Le Bourget", prix: 85 },
  { depart: "Paris", arrivee: "Petite couronne", prix: 90 }, // Minimum pour petite couronne
  // Beauvais n'est pas dans la nouvelle grille mais conservé avec un tarif estimé
  { depart: "Beauvais", arrivee: "Paris", prix: 150 },
];

// Majorations
export const majorations = [
  { type: "Soir de 20h à 21h", pourcentage: 20 },
  { type: "Nuit de 21h à 7h", pourcentage: 50 },
  { type: "Samedi", pourcentage: 50 },
  { type: "Dimanche et jours fériés", pourcentage: 50 },
  { type: "Annulation à moins de 2 heures", pourcentage: 100 },
  { type: "Réservation à moins de 2h", montant: 20 }, // Montant fixe
  { type: "Réservation après 21h pour le lendemain matin", montant: 20 } // Montant fixe
];

// Définition des zones pour la tarification
export const zones = {
  paris: [
    { nom: "Paris", pattern: /^75|paris\b/i },
    { nom: "75", pattern: /^75/ },
  ],
  petite_couronne: [
    { nom: "Petite couronne", pattern: /92|93|94/i },
    { nom: "Hauts-de-Seine", pattern: /hauts-de-seine|92/i },
    { nom: "Seine-Saint-Denis", pattern: /seine-saint-denis|93/i },
    { nom: "Val-de-Marne", pattern: /val-de-marne|94/i },
    { nom: "Courbevoie", pattern: /courbevoie/i },
  ],
  laDefense: [
    { nom: "La Défense", pattern: /\bla défense\b/i },
  ],
  orly: [
    { nom: "Orly", pattern: /\borly\b|\bory\b/i },
    { nom: "Aéroport d'Orly", pattern: /aéroport d'orly/i },
  ],
  roissy: [
    { nom: "Roissy", pattern: /\broissy\b/i },
    { nom: "Charles de Gaulle", pattern: /\bcharles de gaulle\b|\bcdg\b/i },
    { nom: "CDG", pattern: /\bcdg\b/i },
    {
      nom: "Aéroport Paris-Charles de Gaulle",
      pattern: /aéroport paris-charles de gaulle/i,
    },
  ],
  leBourget: [
    { nom: "Le Bourget", pattern: /\ble bourget\b/i },
    {
      nom: "Aéroport de Paris-Le Bourget",
      pattern: /aéroport de paris-le bourget/i,
    },
  ],
};

// Paramètres pour calculs de tarifs hors forfait
export const parametresTarifs = {
  priseEnCharge: 30,      // Montant de base en euros
  prixParKm: 2,           // Prix par kilomètre en euros
  attentGratuite: 10,     // Minutes d'attente gratuites
  prixParMinuteAttente: 1 // Prix par minute d'attente supplémentaire en euros
};