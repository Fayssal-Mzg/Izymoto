import { calculerPrixCourse, estHorsForfait, identifierZone, type PrixCourse } from "./compute";
import {
  DISTANCE_MAX_KM,
  DISTANCE_MIN_RATIO,
  haversineKm,
  isValidLatLng,
  type LatLng,
} from "./distance";
import { parseReservationDate } from "./time";

// Devis calculé par le SERVEUR à partir des paramètres de la course. Un montant
// envoyé par le client n'est jamais lu ici : seules des entrées vérifiables ou
// bornées (adresses, distance, date, priorité, coordonnées) entrent dans le calcul.

export interface ServerQuote extends PrixCourse {
  depart: string;
  arrivee: string;
  /** Distance retenue (km), null si non fournie/valide pour un forfait. */
  distanceKm: number | null;
  /** Instant de départ résolu (ISO UTC) ; null si aucune date (devis sans date). */
  reservationDateIso: string | null;
  prioriteReservation: boolean;
}

export type QuoteFailure = {
  ok: false;
  status: 400;
  code: string;
  error: string;
};
export type QuoteResult = { ok: true; quote: ServerQuote } | QuoteFailure;

export interface QuoteOptions {
  /** Date de départ obligatoire (paiement) ou facultative (devis). */
  requireDate: boolean;
  /** Applique les règles de délai (date non dépassée, priorité obligatoire dans l'heure). */
  enforceTimingRules: boolean;
  /**
   * Paiement en ligne : seuls les trajets AU FORFAIT sont acceptés (zones des deux
   * adresses déterminées sans ambiguïté, couple de zones présent dans la grille).
   * Sinon 400 QUOTE_REQUIRED : la distance (non vérifiable sans clé Google serveur)
   * ne détermine jamais un montant payé. Pour un devis (estimation indicative), le
   * hors-forfait reste calculable avec contrôle de la distance (haversine).
   */
  payableOnlyForfait: boolean;
}

export const PAYMENT_QUOTE_OPTIONS: QuoteOptions = {
  requireDate: true,
  enforceTimingRules: true,
  payableOnlyForfait: true,
};

export const DEVIS_QUOTE_OPTIONS: QuoteOptions = {
  requireDate: false,
  enforceTimingRules: false,
  payableOnlyForfait: false,
};

// Marge d'horloge entre l'écran du client et le serveur pour les règles de délai.
const PAST_TOLERANCE_MS = 30 * 60 * 1000;
const MAX_ADVANCE_MS = 366 * 24 * 60 * 60 * 1000;
// Même règle que l'écran (DevisModal / DateTimeInput) : départ à moins de 1 h après
// le délai minimal de 15 min, soit 1 h 15 après l'instant de référence. À la
// finalisation, l'instant de référence est la création de l'empreinte (Stripe).
const PRIORITY_REQUIRED_BELOW_MS = 75 * 60 * 1000;

const fail = (code: string, error: string): QuoteFailure => ({
  ok: false,
  status: 400,
  code,
  error,
});

// Règles de délai d'une course, évaluées à l'instant `now` (date non dépassée, pas au-delà
// d'un an, priorité obligatoire sous 1 h 15). Renvoie null si tout est conforme.
export function checkReservationTiming(
  reservationDate: Date,
  prioriteReservation: boolean,
  now: Date
): QuoteFailure | null {
  const diffMs = reservationDate.getTime() - now.getTime();
  if (diffMs < -PAST_TOLERANCE_MS) {
    return fail("DATE_IN_PAST", "La date de départ est dépassée. Veuillez en choisir une autre.");
  }
  if (diffMs > MAX_ADVANCE_MS) {
    return fail("DATE_TOO_FAR", "La réservation ne peut pas être programmée plus d'un an à l'avance.");
  }
  if (diffMs < PRIORITY_REQUIRED_BELOW_MS && !prioriteReservation) {
    return fail(
      "PRIORITY_REQUIRED",
      "Pour une réservation dans l'heure, l'option priorité est obligatoire."
    );
  }
  return null;
}

// Un PaymentIntent confirmé longtemps après sa création ne doit pas figer le prix à
// une date ancienne : au-delà de ce délai, on recalcule à l'heure actuelle.
export const PI_REFERENCE_MAX_AGE_MS = 30 * 60 * 1000;

// Instant de référence du recalcul à la finalisation : la création de l'empreinte
// (source Stripe) si elle date d'au plus 30 min, sinon l'heure actuelle.
export function finalizationReferenceTime(
  piCreatedSeconds: number,
  nowMs: number = Date.now()
): Date {
  const createdMs = piCreatedSeconds * 1000;
  return nowMs - createdMs <= PI_REFERENCE_MAX_AGE_MS && createdMs <= nowMs
    ? new Date(createdMs)
    : new Date(nowMs);
}

const asNumber = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

const asText = (v: unknown): string =>
  typeof v === "string" ? v.trim().slice(0, 500) : "";

// Lit les paramètres de course dans un objet client (bookingData / metadata).
// Les coordonnées viennent de l'itinéraire Google calculé par le navigateur :
// originLat/originLng (départ) et destLat/destLng (arrivée).
export function computeServerQuote(
  raw: unknown,
  options: QuoteOptions = PAYMENT_QUOTE_OPTIONS,
  now: Date = new Date()
): QuoteResult {
  if (!raw || typeof raw !== "object") {
    return fail("RIDE_MISSING", "Paramètres de la course manquants.");
  }
  const src = raw as Record<string, unknown>;

  const depart = asText(src.depart);
  const arrivee = asText(src.arrivee);
  if (!depart || !arrivee) {
    return fail("ADDRESS_MISSING", "Adresses de départ et d'arrivée obligatoires.");
  }

  const prioriteReservation = src.prioriteReservation === true;

  // Date de départ (heure murale de Paris si la chaîne n'a pas de fuseau).
  let reservationDate: Date | null = null;
  const rawDate = src.reservationDate;
  const hasDate = rawDate !== undefined && rawDate !== null && rawDate !== "";
  if (hasDate) {
    reservationDate = parseReservationDate(rawDate);
    if (!reservationDate) {
      return fail("INVALID_DATE", "Date et heure de départ invalides.");
    }
  } else if (options.requireDate) {
    return fail("INVALID_DATE", "Date et heure de départ obligatoires.");
  }

  if (reservationDate && options.enforceTimingRules) {
    const timing = checkReservationTiming(reservationDate, prioriteReservation, now);
    if (timing) return timing;
  }

  const horsForfait = estHorsForfait(identifierZone(depart), identifierZone(arrivee));
  const declaredKm = asNumber(src.distance);
  let distanceKm: number | null =
    declaredKm !== null && declaredKm >= 0 && declaredKm <= DISTANCE_MAX_KM ? declaredKm : null;

  if (options.payableOnlyForfait) {
    if (horsForfait) {
      return fail(
        "QUOTE_REQUIRED",
        "Ce trajet n'est pas au forfait : il ne peut pas être réglé en ligne. Merci de demander un devis."
      );
    }
  } else {
    // Estimation (devis) : distance déclarée contrôlée contre la ligne droite.
    const origin: LatLng | null = isValidLatLng({ lat: src.originLat, lng: src.originLng })
      ? { lat: src.originLat as number, lng: src.originLng as number }
      : null;
    const destination: LatLng | null = isValidLatLng({ lat: src.destLat, lng: src.destLng })
      ? { lat: src.destLat as number, lng: src.destLng as number }
      : null;
    const straightKm = origin && destination ? haversineKm(origin, destination) : null;

    if (straightKm !== null && straightKm > DISTANCE_MAX_KM) {
      return fail("DISTANCE_INVALID", "Distance du trajet hors de la zone desservie.");
    }
    if (horsForfait) {
      if (declaredKm === null || declaredKm <= 0 || declaredKm > DISTANCE_MAX_KM) {
        return fail("DISTANCE_INVALID", "Distance du trajet manquante ou invalide.");
      }
      if (straightKm !== null && declaredKm < straightKm * DISTANCE_MIN_RATIO) {
        return fail(
          "DISTANCE_TOO_SHORT",
          "Distance déclarée incohérente avec les adresses. Veuillez relancer le calcul de l'itinéraire."
        );
      }
    }
  }

  const prix = calculerPrixCourse(
    { depart, arrivee, distanceKm, reservationDate, prioriteReservation },
    now
  );

  return {
    ok: true,
    quote: {
      ...prix,
      depart,
      arrivee,
      distanceKm,
      reservationDateIso: reservationDate ? reservationDate.toISOString() : null,
      prioriteReservation,
    },
  };
}
