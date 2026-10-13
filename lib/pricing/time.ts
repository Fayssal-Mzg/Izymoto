import { FUSEAU_TARIFAIRE } from "./constants";

// Toutes les majorations dépendent de l'heure et du jour À PARIS, quel que soit
// le fuseau de la machine qui calcule (navigateur hors France, serveur Vercel en UTC).
// Aucune dépendance : Intl.DateTimeFormat uniquement.

export interface ParisParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
  second: number;
  weekday: number; // 0 = dimanche … 6 = samedi
}

const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: FUSEAU_TARIFAIRE,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  weekday: "short",
});

const WEEKDAYS: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

// Composantes (année, heure, jour de semaine…) d'un instant, lues à l'heure de Paris.
export function getParisParts(date: Date): ParisParts {
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")) % 24,
    minute: Number(get("minute")),
    second: Number(get("second")),
    weekday: WEEKDAYS[get("weekday")] ?? 0,
  };
}

// Instant correspondant à une heure « murale » de Paris (gère l'heure d'été).
function parisWallTimeToInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number
): Date {
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  let instant = wallAsUtc;
  for (let i = 0; i < 2; i++) {
    const p = getParisParts(new Date(instant));
    const parisAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    instant -= parisAsUtc - wallAsUtc;
  }
  return new Date(instant);
}

const WALL_RE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/;
const ZONED_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?\s*(?:Z|[+-]\d{2}:?\d{2})$/i;

// Interprète une date de course.
// - "YYYY-MM-DDThh:mm" (valeur d'un <input type="datetime-local">, sans fuseau) :
//   heure murale de PARIS, quel que soit le fuseau du navigateur.
// - ISO avec "Z" ou décalage : instant absolu.
// - Date : instant absolu.
// Renvoie null si la valeur est inexploitable.
export function parseReservationDate(input: unknown): Date | null {
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }
  if (typeof input !== "string") return null;
  const s = input.trim();
  const wall = WALL_RE.exec(s);
  if (wall) {
    const [, y, mo, d, h, mi, sec] = wall;
    const year = Number(y);
    const month = Number(mo);
    const day = Number(d);
    const hour = Number(h);
    const minute = Number(mi);
    const second = sec ? Number(sec) : 0;
    if (
      month < 1 || month > 12 || day < 1 || day > 31 ||
      hour > 23 || minute > 59 || second > 59
    ) {
      return null;
    }
    const check = new Date(Date.UTC(year, month - 1, day));
    if (check.getUTCMonth() !== month - 1) return null; // 31 février, etc.
    return parisWallTimeToInstant(year, month, day, hour, minute, second);
  }
  if (ZONED_RE.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}
