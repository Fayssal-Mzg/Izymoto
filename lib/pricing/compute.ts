import {
  MAJORATION_NUIT,
  MAJORATION_RESERVATION_TARDIVE,
  MAJORATION_SOIR,
  MAJORATION_WEEKEND,
  parametresTarifs,
  tarifs,
  zones,
  type ZoneKey,
} from "./constants";
import { getParisParts, parseReservationDate } from "./time";

export interface MajorationApplied {
  type: string;
  montant: number;
}

// Codes postaux (5 chiffres) présents dans l'adresse.
const codesPostaux = (adresse: string): string[] =>
  adresse.match(/\b\d{5}\b/g) ?? [];

// Pôles tarifaires (aéroports, La Défense, Disneyland) : un pôle n'est retenu que si
// le mot-clé est présent ET si le code postal de l'adresse est l'un des codes
// postaux explicites ci-dessous. Sans cela, un mot-clé dans une adresse parisienne
// (« Place Charles de Gaulle, 75008 Paris ») ferait facturer le forfait d'un pôle.
// Codes postaux établis à partir des adresses postales officielles (à revoir si une
// adresse Google d'un pôle porte un autre code).
export const POLES: Array<{ zone: ZoneKey; keyword: RegExp; codesPostaux: string[] }> = [
  {
    zone: "roissy",
    keyword: /(roissy|charles[- ]de[- ]gaulle|\bcdg\b)/i,
    // Roissy-en-France (aéroport CDG, cedex 95711/95712/95716), Le Mesnil-Amelot (zone fret).
    codesPostaux: ["95700", "95701", "95711", "95712", "95716", "77990"],
  },
  {
    zone: "orly",
    keyword: /\borly\b|\bory\b/i,
    // Orly (aérogare, ville, cedex 94396) et Paray-Vieille-Poste (emprise sud).
    codesPostaux: ["94390", "94310", "94396", "91550"],
  },
  {
    zone: "leBourget",
    keyword: /le bourget/i,
    codesPostaux: ["93350"],
  },
  {
    zone: "beauvais",
    keyword: /beauvais/i,
    // Aéroport Paris-Beauvais : Tillé (60000).
    codesPostaux: ["60000", "60390"],
  },
  {
    zone: "disneyland",
    keyword: /disneyland|marne[- ]la[- ]vall[ée]e|chessy/i,
    // Chessy, Coupvray, Magny-le-Hongre, Serris (Val d'Europe), cedex Disney.
    codesPostaux: ["77700", "77705", "77706"],
  },
  {
    zone: "laDefense",
    keyword: /\bla d[ée]fense\b/i,
    // Courbevoie, Puteaux, cedex La Défense (92060, 92081, 92092, 92093).
    codesPostaux: ["92400", "92800", "92060", "92081", "92092", "92093"],
  },
];

// Identifie la zone tarifaire d'une adresse (même fonction pour l'écran et le serveur).
// - exactement UN code postal à 5 chiffres exigé, sinon null (zone indéterminée :
//   le paiement en ligne est refusé, un devis est demandé) ;
// - pôle (aéroports, La Défense, Disneyland) seulement si mot-clé ET code postal
//   du pôle ; sinon la zone vient du préfixe du code postal ;
// - code postal hors des zones connues : "hors_forfait".
export const identifierZone = (adresse: string | null | undefined): ZoneKey | null => {
  if (!adresse) return null;

  const cps = codesPostaux(adresse);
  if (cps.length !== 1) return null;
  const cp = cps[0];

  for (const pole of POLES) {
    if (pole.keyword.test(adresse) && pole.codesPostaux.includes(cp)) return pole.zone;
  }

  for (const [zoneKey, def] of Object.entries(zones)) {
    if (def.codePostalPrefixes?.some((p) => cp.startsWith(p))) {
      return zoneKey as ZoneKey;
    }
  }

  return "hors_forfait";
};

// Mapping zone tarif (libellé grille) → clé renvoyée par identifierZone.
const ZONE_LABEL_TO_KEY: Record<string, ZoneKey> = {
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

const matchZone = (tarifZone: string, userZone: ZoneKey | null): boolean =>
  ZONE_LABEL_TO_KEY[tarifZone] === userZone;

// Vrai si aucun forfait ne couvre le couple de zones (la distance entre alors dans le prix).
export const estHorsForfait = (
  departZone: ZoneKey | null,
  arriveeZone: ZoneKey | null
): boolean =>
  departZone === null ||
  arriveeZone === null ||
  !tarifs.some(
    (t) =>
      (matchZone(t.depart, departZone) && matchZone(t.arrivee, arriveeZone)) ||
      (matchZone(t.depart, arriveeZone) && matchZone(t.arrivee, departZone))
  );

// Estime le prix de base : forfait si match, sinon tarif km arrondi par paliers
// (l'arrondi évite que le prix change visuellement à chaque recalcul Google Maps).
export const estimerPrix = (
  departZone: ZoneKey | null,
  arriveeZone: ZoneKey | null,
  distanceKm: number | null | undefined
): number => {
  for (const tarif of tarifs) {
    const direct = matchZone(tarif.depart, departZone) && matchZone(tarif.arrivee, arriveeZone);
    const inverse = matchZone(tarif.depart, arriveeZone) && matchZone(tarif.arrivee, departZone);
    if (direct || inverse) return tarif.prix;
  }

  const { priseEnChargeHorsForfait, prixParKmHorsForfait, arrondiPalier } = parametresTarifs;
  const brut = priseEnChargeHorsForfait + (distanceKm || 0) * prixParKmHorsForfait;
  return Math.round(brut / arrondiPalier) * arrondiPalier;
};

// Réservation à moins de 2 h (et pas dans le passé), évaluée à l'instant `now`.
export const estReservationTardive = (
  dateReservation: string | Date | null | undefined,
  now: Date = new Date()
): boolean => {
  const target = parseReservationDate(dateReservation);
  if (!target) return false;
  const diffHours = (target.getTime() - now.getTime()) / (1000 * 60 * 60);
  return diffHours < 2 && diffHours > 0;
};

// Calcule les majorations en montants FIXES (alignement motocab).
// L'heure et le jour sont lus À PARIS (Europe/Paris), pas dans le fuseau de la machine.
export const calculerMajorations = (
  prixBase: number,
  dateReservation: string | Date | null | undefined,
  reservationImmediateLate = false
): { prixFinal: number; detailsMajorations: MajorationApplied[] } => {
  const date = dateReservation ? parseReservationDate(dateReservation) : null;
  if (!date || !prixBase) {
    return { prixFinal: prixBase, detailsMajorations: [] };
  }

  const { hour: heures, weekday: jour } = getParisParts(date); // jour : 0 = dimanche, 6 = samedi

  let prixFinal = prixBase;
  const details: MajorationApplied[] = [];

  const ajouter = (m: { type: string; montant: number }) => {
    prixFinal += m.montant;
    details.push({ type: m.type, montant: m.montant });
  };

  if (reservationImmediateLate) {
    ajouter(MAJORATION_RESERVATION_TARDIVE);
  }

  if (heures >= 23 || heures < 6) {
    ajouter(MAJORATION_NUIT);
  } else if ((heures >= 20 && heures < 23) || (heures >= 6 && heures < 7)) {
    ajouter(MAJORATION_SOIR);
  }

  if (jour === 0 || jour === 6) {
    ajouter(MAJORATION_WEEKEND);
  }

  return { prixFinal: Math.round(prixFinal), detailsMajorations: details };
};

// Pipeline complet : adresse → zone → prix de base → majorations → prix final
// (hors supplément priorité, voir calculerPrixCourse).
export const estimerPrixTotal = (
  departAdresse: string,
  arriveeAdresse: string,
  distanceKm: number | null | undefined,
  dateReservation: string | Date | null | undefined,
  reservationImmediateLate = false
) => {
  const departZone = identifierZone(departAdresse);
  const arriveeZone = identifierZone(arriveeAdresse);
  const prixBase = estimerPrix(departZone, arriveeZone, distanceKm);
  const { prixFinal, detailsMajorations } = calculerMajorations(
    prixBase,
    dateReservation,
    reservationImmediateLate
  );

  return { prixBase, prixFinal, detailsMajorations, departZone, arriveeZone };
};

export interface CourseParams {
  depart: string;
  arrivee: string;
  distanceKm: number | null | undefined;
  reservationDate: string | Date | null | undefined;
  prioriteReservation: boolean;
}

export interface PrixCourse {
  departZone: ZoneKey | null;
  arriveeZone: ZoneKey | null;
  horsForfait: boolean;
  prixBase: number; // forfait ou hors-forfait arrondi
  majorations: MajorationApplied[];
  prix: number; // prixBase + majorations (€)
  supplementPriorite: number; // 0 ou 20 (€)
  total: number; // prix + supplément priorité (€), c'est le montant facturé
  totalCents: number;
}

// Prix complet d'une course : unique fonction utilisée par le navigateur (affichage)
// ET par le serveur (montant réellement débité). `now` sert à la règle « moins de 2 h ».
export const calculerPrixCourse = (
  params: CourseParams,
  now: Date = new Date()
): PrixCourse => {
  const departZone = identifierZone(params.depart);
  const arriveeZone = identifierZone(params.arrivee);
  const prixBase = estimerPrix(departZone, arriveeZone, params.distanceKm);
  const { prixFinal, detailsMajorations } = calculerMajorations(
    prixBase,
    params.reservationDate,
    estReservationTardive(params.reservationDate, now)
  );
  const supplementPriorite = params.prioriteReservation
    ? parametresTarifs.supplementPriorite
    : 0;
  const total = prixFinal + supplementPriorite;
  return {
    departZone,
    arriveeZone,
    horsForfait: estHorsForfait(departZone, arriveeZone),
    prixBase,
    majorations: detailsMajorations,
    prix: prixFinal,
    supplementPriorite,
    total,
    totalCents: Math.round(total * 100),
  };
};
