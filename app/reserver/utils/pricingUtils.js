import { zones, tarifs, majorations, parametresTarifs } from "./constants";

// Fonction pour identifier la zone d'une adresse
export const identifierZone = (adresse) => {
  if (!adresse) return null;
  
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
  if (/la défense/i.test(adresse)) {
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

// Fonction pour estimer le prix de base
// Modification de la fonction estimerPrix pour s'assurer qu'elle retourne toujours une valeur numérique
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
      return tarif.prix; // Retourne le prix du tarif trouvé
    }
  }

  // Si aucun tarif forfaitaire n'est trouvé, appliquer le tarif hors forfait
  const prixHorsForfait = 30 + distanceKm * 2.5; // 30€ de prise en charge + 2.50€/km
  
  // Assurez-vous de toujours retourner un nombre, même si c'est 0
  return prixHorsForfait || 0;
};

// Fonction pour calculer les majorations
export const calculerMajorations = (prixBase, dateReservation, reservationImmediateLate = false) => {
  if (!dateReservation || !prixBase) return { prixFinal: prixBase, detailsMajorations: [] };
  
  const date = new Date(dateReservation);
  const heures = date.getHours();
  const minutes = date.getMinutes();
  const jour = date.getDay(); // 0 = dimanche, 6 = samedi
  
  let prixFinal = prixBase;
  const detailsMajorations = [];
  
  // Vérifier si c'est une réservation immédiate (moins de 2h)
  if (reservationImmediateLate) {
    const majorationImmediate = majorations.find(m => m.type === "Réservation à moins de 2h");
    if (majorationImmediate) {
      prixFinal += majorationImmediate.montant;
      detailsMajorations.push({
        type: majorationImmediate.type,
        montant: majorationImmediate.montant
      });
    }
  }
  
  // Vérifier si c'est le soir (20h à 21h)
  if (heures >= 20 && heures < 21) {
    const majorationSoir = majorations.find(m => m.type === "Soir de 20h à 21h");
    if (majorationSoir) {
      const montant = (prixBase * majorationSoir.pourcentage) / 100;
      prixFinal += montant;
      detailsMajorations.push({
        type: majorationSoir.type,
        montant,
        pourcentage: majorationSoir.pourcentage
      });
    }
  }
  
  // Vérifier si c'est la nuit (21h à 7h)
  if (heures >= 21 || heures < 7) {
    const majorationNuit = majorations.find(m => m.type === "Nuit de 21h à 7h");
    if (majorationNuit) {
      const montant = (prixBase * majorationNuit.pourcentage) / 100;
      prixFinal += montant;
      detailsMajorations.push({
        type: majorationNuit.type,
        montant,
        pourcentage: majorationNuit.pourcentage
      });
    }
  }
  
  // Vérifier si c'est un samedi
  if (jour === 6) {
    const majorationSamedi = majorations.find(m => m.type === "Samedi");
    if (majorationSamedi) {
      const montant = (prixBase * majorationSamedi.pourcentage) / 100;
      prixFinal += montant;
      detailsMajorations.push({
        type: majorationSamedi.type,
        montant,
        pourcentage: majorationSamedi.pourcentage
      });
    }
  }
  
  // Vérifier si c'est un dimanche ou jour férié
  if (jour === 0) {
    const majorationDimanche = majorations.find(m => m.type === "Dimanche et jours fériés");
    if (majorationDimanche) {
      const montant = (prixBase * majorationDimanche.pourcentage) / 100;
      prixFinal += montant;
      detailsMajorations.push({
        type: majorationDimanche.type,
        montant,
        pourcentage: majorationDimanche.pourcentage
      });
    }
  }
  
  return {
    prixFinal: Math.round(prixFinal),
    detailsMajorations
  };
};

// Fonction principale pour estimer le prix total
export const estimerPrixTotal = (departAdresse, arriveeAdresse, distanceKm, dateReservation, reservationImmediateLate = false) => {
  const departZone = identifierZone(departAdresse);
  const arriveeZone = identifierZone(arriveeAdresse);
  
  const prixBase = estimerPrixBase(departZone, arriveeZone, distanceKm);
  const { prixFinal, detailsMajorations } = calculerMajorations(prixBase, dateReservation, reservationImmediateLate);
  
  return {
    prixBase,
    prixFinal,
    detailsMajorations,
    departZone,
    arriveeZone
  };
};

// Fonction auxiliaire pour faciliter la correspondance des zones
function matchZone(tarifZone, userZone) {
  return (
    (tarifZone === "Paris" && userZone === "paris") ||
    (tarifZone === "La Défense" && userZone === "laDefense") ||
    (tarifZone === "Petite couronne" && userZone === "petite_couronne") ||
    (tarifZone === "Orly" && userZone === "orly") ||
    (tarifZone === "Roissy" && userZone === "roissy") ||
    (tarifZone === "Le Bourget" && userZone === "leBourget") ||
    (tarifZone === "Beauvais" && userZone === "beauvais")
  );
}