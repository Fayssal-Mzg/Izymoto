import { zones, tarifs, majorations, parametresTarifs } from "./constants";

// Extrait un code postal français (5 chiffres) de l'adresse. Plus fiable
// qu'une regex texte qui peut faussement matcher un numéro de rue.
const extraireCodePostal = (adresse) => {
  if (!adresse) return null;
  const match = adresse.match(/\b(\d{5})\b/);
  return match ? match[1] : null;
};

// Identifie la zone tarifaire d'une adresse.
// Ordre : pôles spécifiques (aéroports, La Défense, Disneyland) → CP → mots-clés.
// Les pôles sont prioritaires car ils peuvent être situés dans n'importe quel CP
// (ex : CDG est dans le 95, Orly dans le 94 — sinon ils seraient classés couronne).
export const identifierZone = (adresse) => {
  if (!adresse) return null;

  // 1. Aéroports & pôles spécifiques (priorité absolue)
  if (/(roissy|charles[- ]de[- ]gaulle|\bcdg\b)/i.test(adresse)) return "roissy";
  if (/\borly\b|\bory\b/i.test(adresse)) return "orly";
  if (/le bourget/i.test(adresse)) return "leBourget";
  if (/beauvais/i.test(adresse)) return "beauvais";
  if (/disneyland|marne[- ]la[- ]vall[ée]e|chessy/i.test(adresse)) return "disneyland";
  if (/\bla d[ée]fense\b/i.test(adresse)) return "laDefense";

  // 2. Détection par code postal
  const cp = extraireCodePostal(adresse);
  if (cp) {
    for (const [zoneKey, def] of Object.entries(zones)) {
      if (def.codePostalPrefixes?.some((p) => cp.startsWith(p))) {
        return zoneKey;
      }
    }
  }

  // 3. Fallback sur mots-clés ville
  for (const [zoneKey, def] of Object.entries(zones)) {
    if (def.keywords?.some((rx) => rx.test(adresse))) {
      return zoneKey;
    }
  }

  return "hors_forfait";
};

// Mapping zone tarif (libellé grille) → clé renvoyée par identifierZone.
const ZONE_LABEL_TO_KEY = {
  Paris: "paris",
  "La Défense": "laDefense",
  "Petite couronne": "petite_couronne",
  "Grande couronne": "grande_couronne",
  Orly: "orly",
  Roissy: "roissy",
  "Le Bourget": "leBourget",
  Beauvais: "beauvais",
  Disneyland: "disneyland",
};

const matchZone = (tarifZone, userZone) => ZONE_LABEL_TO_KEY[tarifZone] === userZone;

// Estime le prix de base : forfait si match, sinon tarif km arrondi par paliers
// (l'arrondi évite que le prix change visuellement à chaque recalcul Google Maps).
export const estimerPrix = (departZone, arriveeZone, distanceKm) => {
  for (const tarif of tarifs) {
    const direct = matchZone(tarif.depart, departZone) && matchZone(tarif.arrivee, arriveeZone);
    const inverse = matchZone(tarif.depart, arriveeZone) && matchZone(tarif.arrivee, departZone);
    if (direct || inverse) return tarif.prix;
  }

  const { priseEnChargeHorsForfait, prixParKmHorsForfait, arrondiPalier } = parametresTarifs;
  const brut = priseEnChargeHorsForfait + (distanceKm || 0) * prixParKmHorsForfait;
  return Math.round(brut / arrondiPalier) * arrondiPalier;
};

// Calcule les majorations en montants FIXES (alignement motocab).
// Les pourcentages introduisaient de la variabilité — ici tout est additif et déterministe.
export const calculerMajorations = (prixBase, dateReservation, reservationImmediateLate = false) => {
  if (!dateReservation || !prixBase) {
    return { prixFinal: prixBase, detailsMajorations: [] };
  }

  const date = new Date(dateReservation);
  const heures = date.getHours();
  const jour = date.getDay(); // 0 = dimanche, 6 = samedi

  let prixFinal = prixBase;
  const details = [];

  const ajouter = (type, montant) => {
    prixFinal += montant;
    details.push({ type, montant });
  };

  if (reservationImmediateLate) {
    ajouter("Réservation à moins de 2h", 20);
  }

  if (heures >= 23 || heures < 6) {
    ajouter("Nuit (23h-6h)", 40);
  } else if ((heures >= 20 && heures < 23) || (heures >= 6 && heures < 7)) {
    ajouter("Soir / matin tôt", 20);
  }

  if (jour === 0 || jour === 6) {
    ajouter("Week-end ou jour férié", 20);
  }

  return { prixFinal: Math.round(prixFinal), detailsMajorations: details };
};

// Pipeline complet : adresse → zone → prix de base → majorations → prix final.
// (Auparavant cette fonction appelait estimerPrixBase, qui n'existait pas → ReferenceError.)
export const estimerPrixTotal = (departAdresse, arriveeAdresse, distanceKm, dateReservation, reservationImmediateLate = false) => {
  const departZone = identifierZone(departAdresse);
  const arriveeZone = identifierZone(arriveeAdresse);
  const prixBase = estimerPrix(departZone, arriveeZone, distanceKm);
  const { prixFinal, detailsMajorations } = calculerMajorations(prixBase, dateReservation, reservationImmediateLate);

  return { prixBase, prixFinal, detailsMajorations, departZone, arriveeZone };
};
