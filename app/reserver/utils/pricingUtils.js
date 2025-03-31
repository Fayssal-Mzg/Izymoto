// app/reserver/utils/pricingUtils.js
import { zones, tarifs } from "./constants";

// Fonction pour identifier la zone d'une adresse
export const identifierZone = (adresse) => {
  // Vérifier toutes les zones
  for (const [zoneKey, patterns] of Object.entries(zones)) {
    for (const { pattern } of patterns) {
      if (pattern.test(adresse)) {
        return zoneKey;
      }
    }
  }
  // Si aucune zone n'est identifiée, considérer comme trajet hors forfait
  return "hors_forfait";
};

// Fonction pour estimer le prix
export const estimerPrix = (departZone, arriveeZone, distanceKm) => {
  // Recherche dans la grille tarifaire
  for (const tarif of tarifs) {
    // Vérifier si les zones correspondent à un tarif forfaitaire
    const departMatch =
      (tarif.depart === "Paris" && departZone === "paris") ||
      (tarif.depart === "La Défense" && departZone === "laDefense") ||
      (tarif.depart === "Orly" && departZone === "orly") ||
      (tarif.depart === "Roissy CDG" && departZone === "roissy") ||
      (tarif.depart === "Le Bourget" && departZone === "leBourget");

    const arriveeMatch =
      (tarif.arrivee === "Paris" && arriveeZone === "paris") ||
      (tarif.arrivee === "1ère couronne" &&
        arriveeZone === "premiere_couronne") ||
      (tarif.arrivee === "Orly" && arriveeZone === "orly") ||
      (tarif.arrivee === "Roissy CDG" && arriveeZone === "roissy") ||
      (tarif.arrivee === "Le Bourget" && arriveeZone === "leBourget");

    if (departMatch && arriveeMatch) {
      return tarif.prix;
    }
  }

  // Si aucun tarif forfaitaire n'est trouvé, appliquer le tarif hors forfait
  return 30 + distanceKm * 2.5; // 30€ de prise en charge + 2.50€/km
};
