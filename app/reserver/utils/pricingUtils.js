// app/reserver/utils/pricingUtils.js
import { zones, tarifs } from "./constants";

// Fonction pour identifier la zone d'une adresse
export const identifierZone = (adresse) => {
  // Détection spécifique des aéroports en priorité
  if (/roissy|charles de gaulle|cdg/i.test(adresse)) {
    return "roissy";
  }
  if (/\borly\b/i.test(adresse)) {
    return "orly";
  }
  if (/le bourget/i.test(adresse)) {
    return "leBourget";
  }
  if (/beauvais/i.test(adresse)) {
    return "beauvais";
  }

  // Cas spécial pour Courbevoie - considérer comme La Défense
  if (/courbevoie/i.test(adresse)) {
    return "laDefense";
  }

  // Vérifier toutes les autres zones
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
    // Vérifier si les zones correspondent à un tarif forfaitaire (dans les deux sens)
    const zonesMatch =
      // Cas 1: Correspondance directe
      (matchZone(tarif.depart, departZone) &&
        matchZone(tarif.arrivee, arriveeZone)) ||
      // Cas 2: Correspondance dans le sens inverse (pour assurer la symétrie des prix)
      (matchZone(tarif.depart, arriveeZone) &&
        matchZone(tarif.arrivee, departZone));

    if (zonesMatch) {
      return tarif.prix;
    }
  }

  // Si aucun tarif forfaitaire n'est trouvé, appliquer le tarif hors forfait
  return 30 + distanceKm * 2.5; // 30€ de prise en charge + 2.50€/km
};

// Fonction auxiliaire pour faciliter la correspondance des zones
function matchZone(tarifZone, userZone) {
  return (
    (tarifZone === "Paris" && userZone === "paris") ||
    (tarifZone === "La Défense" && userZone === "laDefense") ||
    (tarifZone === "1ère couronne" && userZone === "premiere_couronne") ||
    (tarifZone === "Orly" && userZone === "orly") ||
    (tarifZone === "Roissy CDG" && userZone === "roissy") ||
    (tarifZone === "Le Bourget" && userZone === "leBourget")
  );
}
