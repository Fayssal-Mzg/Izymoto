// app/reserver/utils/constants.js

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

// Grille tarifaire
export const tarifs = [
  { depart: "Paris", arrivee: "Paris", prix: 50 },
  { depart: "Paris", arrivee: "1ère couronne", prix: 65 },
  { depart: "Paris", arrivee: "Orly", prix: 80 },
  { depart: "Paris", arrivee: "Roissy CDG", prix: 100 },
  { depart: "La Défense", arrivee: "Orly", prix: 90 },
  { depart: "La Défense", arrivee: "Roissy CDG", prix: 110 },
  { depart: "Orly", arrivee: "Roissy CDG", prix: 150 },
  { depart: "Paris", arrivee: "Le Bourget", prix: 80 },
  { depart: "Beauvais", arrivee: "Orly", prix: 120 }, // Exemple pour Beauvais - Orly
];

// Définition des zones pour la tarification
export const zones = {
  paris: [
    { nom: "Paris", pattern: /^75|paris\b/i }, // Ajouté '\b' pour éviter les correspondances partielles
    { nom: "75", pattern: /^75/ },
  ],
  premiere_couronne: [
    { nom: "Première couronne", pattern: /92|93|94/i },
    { nom: "Hauts-de-Seine", pattern: /hauts-de-seine/i },
    { nom: "Seine-Saint-Denis", pattern: /seine-saint-denis/i },
    { nom: "Val-de-Marne", pattern: /val-de-marne/i },
    { nom: "Courbevoie", pattern: /courbevoie/i }, // Ajouté explicitement pour être sûr
  ],
  laDefense: [
    { nom: "La Défense", pattern: /\bla défense\b/i }, // Ajouté '\b' pour éviter les correspondances partielles
  ],
  orly: [
    { nom: "Orly", pattern: /\borly\b/i }, // Ajouté '\b' pour éviter les correspondances partielles
    { nom: "Aéroport d'Orly", pattern: /aéroport d'orly/i },
  ],
  roissy: [
    { nom: "Roissy", pattern: /\broissy\b/i }, // Ajouté '\b' pour éviter les correspondances partielles
    { nom: "Charles de Gaulle", pattern: /\bcharles de gaulle\b|\bcdg\b/i },
    { nom: "CDG", pattern: /\bcdg\b/i },
    {
      nom: "Aéroport Paris-Charles de Gaulle",
      pattern: /aéroport paris-charles de gaulle/i,
    },
  ],
  leBourget: [
    { nom: "Le Bourget", pattern: /\ble bourget\b/i }, // Ajouté '\b' pour éviter les correspondances partielles
    {
      nom: "Aéroport de Paris-Le Bourget",
      pattern: /aéroport de paris-le bourget/i,
    },
  ],
};
