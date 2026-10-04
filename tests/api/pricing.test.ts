// Lot 0.3 : grille tarifaire partagée client/serveur (lib/pricing). Tests unitaires purs
// (aucun accès Firestore/Stripe) : forfaits, hors-forfait, majorations, fuseau Europe/Paris,
// heure d'été/hiver, devis serveur (codes d'erreur 400).
import { afterEach, describe, expect, it } from "vitest";
import {
  calculerPrixCourse,
  computeServerQuote,
  DEVIS_QUOTE_OPTIONS,
  getParisParts,
  haversineKm,
  identifierZone,
  aeroports,
  gares,
  parseReservationDate,
  PAYMENT_QUOTE_OPTIONS,
} from "@/lib/pricing";

// Adresses types, une par zone de la grille.
const ADDR = {
  paris: "10 Rue de Rivoli, 75001 Paris",
  orly: "Aéroport d'Orly, 94390 Orly",
  roissy: "Aéroport Paris-Charles de Gaulle, 95700 Roissy-en-France",
  beauvais: "Aéroport de Paris-Beauvais, 60000 Tillé",
  bourget: "Aéroport de Paris-Le Bourget, 93350 Le Bourget",
  defense: "Parvis de La Défense, 92800 Puteaux",
  disney: "Disneyland Paris, 77700 Chessy",
  versailles: "Château de Versailles, 78000 Versailles",
  nanterre: "Place de la Boule, 92000 Nanterre",
  vincennes: "Château de Vincennes, 94300 Vincennes",
};

// Instant de référence fixe (mercredi 10 juin 2026, 09:00 UTC = 11:00 Paris) : les dates
// de course ci-dessous sont à plus de 2 h, donc sans majoration « réservation tardive ».
const NOW = new Date("2026-06-10T09:00:00Z");

const prix = (
  depart: string,
  arrivee: string,
  reservationDate: string | Date,
  over: { distanceKm?: number; prioriteReservation?: boolean; now?: Date } = {}
) =>
  calculerPrixCourse(
    {
      depart,
      arrivee,
      distanceKm: over.distanceKm ?? 20,
      reservationDate,
      prioriteReservation: over.prioriteReservation ?? false,
    },
    over.now ?? NOW
  );

// Mercredi 17 juin 2026 14:00 (heure murale de Paris) : aucune majoration.
const WED_NOON = "2026-06-17T14:00";

describe("grille de forfaits (identique à l'ancienne, dans les deux sens)", () => {
  const forfaits: Array<[string, string, string, number]> = [
    ["Paris -> Paris", ADDR.paris, "20 Avenue des Champs-Élysées, 75008 Paris", 46],
    ["Paris <-> Orly", ADDR.paris, ADDR.orly, 76],
    ["Paris <-> Roissy", ADDR.paris, ADDR.roissy, 99],
    ["La Défense <-> Roissy", ADDR.defense, ADDR.roissy, 99],
    ["La Défense <-> Orly", ADDR.defense, ADDR.orly, 99],
    ["Roissy <-> Orly", ADDR.roissy, ADDR.orly, 139],
    ["Paris <-> La Défense", ADDR.paris, ADDR.defense, 50],
    ["Paris <-> Le Bourget", ADDR.paris, ADDR.bourget, 65],
    ["Paris <-> Petite couronne", ADDR.paris, ADDR.vincennes, 70],
    ["Paris <-> Disneyland", ADDR.paris, ADDR.disney, 110],
    ["La Défense <-> Le Bourget", ADDR.defense, ADDR.bourget, 80],
    ["Roissy <-> Le Bourget", ADDR.roissy, ADDR.bourget, 60],
    ["Roissy <-> Disneyland", ADDR.roissy, ADDR.disney, 120],
    ["Orly <-> Disneyland", ADDR.orly, ADDR.disney, 130],
    ["Beauvais <-> Paris", ADDR.beauvais, ADDR.paris, 180],
    ["Beauvais <-> La Défense", ADDR.beauvais, ADDR.defense, 170],
  ];

  it.each(forfaits)("%s (aller)", (_n, a, b, expected) => {
    const r = prix(a, b, WED_NOON);
    expect(r.prixBase).toBe(expected);
    expect(r.total).toBe(expected);
    expect(r.totalCents).toBe(expected * 100);
    expect(r.horsForfait).toBe(false);
  });

  it.each(forfaits)("%s (retour)", (_n, a, b, expected) => {
    const r = prix(b, a, WED_NOON);
    expect(r.prixBase).toBe(expected);
    expect(r.horsForfait).toBe(false);
  });

  it("le forfait ne dépend pas de la distance déclarée", () => {
    expect(prix(ADDR.paris, ADDR.orly, WED_NOON, { distanceKm: 1 }).total).toBe(76);
    expect(prix(ADDR.paris, ADDR.orly, WED_NOON, { distanceKm: 200 }).total).toBe(76);
  });

  it("identification de zone : pôle = mot-clé ET code postal du pôle", () => {
    expect(identifierZone(ADDR.roissy)).toBe("roissy"); // CP 95700 = grande couronne sinon
    expect(identifierZone(ADDR.orly)).toBe("orly"); // CP 94390 = petite couronne sinon
    expect(identifierZone(ADDR.defense)).toBe("laDefense"); // CP 92800 = petite couronne sinon
    expect(identifierZone(ADDR.beauvais)).toBe("beauvais");
    expect(identifierZone(ADDR.bourget)).toBe("leBourget");
    expect(identifierZone(ADDR.disney)).toBe("disneyland");
    expect(identifierZone(ADDR.paris)).toBe("paris");
    expect(identifierZone(ADDR.versailles)).toBe("grande_couronne");
    expect(identifierZone(ADDR.nanterre)).toBe("petite_couronne");
  });

  it("un mot-clé de pôle dans une adresse parisienne ne donne PAS le forfait du pôle", () => {
    expect(identifierZone("Place Charles de Gaulle, 75008 Paris")).toBe("paris");
    expect(identifierZone("12 Rue d'Orly, 75014 Paris")).toBe("paris");
    expect(identifierZone("Aéroport d'Orly, 94000 Créteil")).toBe("petite_couronne"); // CP hors pôle
    expect(prix("Place Charles de Gaulle, 75008 Paris", ADDR.paris, WED_NOON).total).toBe(46);
  });

  it("cas du durcissement : adresses ambiguës ou sans pôle valide", () => {
    expect(identifierZone("Place Charles de Gaulle, 75008 Paris, France")).toBe("paris");
    expect(identifierZone("Rue d'Orly, 75014 Paris")).toBe("paris");
    expect(identifierZone("CDG, 75008 Paris")).toBe("paris"); // mot-clé sans code postal de pôle
    expect(identifierZone("75008 – 1 rue X, 78000 Versailles")).toBeNull(); // deux codes postaux
    expect(identifierZone("Aéroport Paris-Charles de Gaulle, 95700 Roissy-en-France")).toBe("roissy");
  });

  it("toutes les adresses des constantes (aéroports, gares) sont reconnues", () => {
    const expected: Record<string, string> = {
      "Charles de Gaulle (CDG)": "roissy",
      "Orly (ORY)": "orly",
      "Beauvais (BVA)": "beauvais",
      "Le Bourget": "leBourget",
    };
    for (const a of aeroports) expect(identifierZone(a.adresse), a.nom).toBe(expected[a.nom]);
    for (const g of gares) expect(identifierZone(g.adresse), g.nom).toBe("paris");
  });

  it("paiement : adresse ambiguë (deux CP) ou sans CP -> QUOTE_REQUIRED ; « CDG, 75008 Paris » facturé comme Paris", () => {
    const now = new Date("2026-06-10T09:00:00Z");
    const ride = (depart: string) => ({ depart, arrivee: ADDR.paris, distance: 5, reservationDate: WED_NOON, prioriteReservation: false });
    for (const d of ["75008 – 1 rue X, 78000 Versailles", "Gare de Lyon"]) {
      const r = computeServerQuote(ride(d), PAYMENT_QUOTE_OPTIONS, now);
      expect(r.ok ? "OK" : r.code, d).toBe("QUOTE_REQUIRED");
    }
    const cdg = computeServerQuote(ride("CDG, 75008 Paris"), PAYMENT_QUOTE_OPTIONS, now);
    expect(cdg.ok && cdg.quote.total).toBe(46);
  });

  it("zone indéterminée (null) : adresse vide, sans code postal ou avec deux codes postaux", () => {
    expect(identifierZone("")).toBeNull();
    expect(identifierZone(null)).toBeNull();
    expect(identifierZone("Paris")).toBeNull();
    expect(identifierZone("10 Rue de Rivoli, Paris")).toBeNull();
    expect(identifierZone("75001 Paris, 94390 Orly")).toBeNull();
  });

  it("code postal inconnu (hors Île-de-France / Oise) : hors_forfait", () => {
    expect(identifierZone("1 Place Bellecour, 69002 Lyon")).toBe("hors_forfait");
  });
});

describe("hors forfait : 30 € + 3 €/km, arrondi à 5 €", () => {
  it.each([
    [20, 90], // 30 + 60
    [21, 95], // 93 -> 95
    [12.4, 65], // 67.2 -> 65
    [12.5, 70], // 67.5 -> 70
    [1, 35], // 33 -> 35
    [100, 330], // 330
  ])("Versailles <-> Nanterre %s km = %d €", (km, expected) => {
    const r = prix(ADDR.versailles, ADDR.nanterre, WED_NOON, { distanceKm: km });
    expect(r.horsForfait).toBe(true);
    expect(r.prixBase).toBe(expected);
    expect(r.total).toBe(expected);
  });

  it("Paris <-> grande couronne n'a pas de forfait : hors forfait", () => {
    expect(prix(ADDR.paris, ADDR.versailles, WED_NOON, { distanceKm: 20 }).horsForfait).toBe(true);
    expect(prix(ADDR.versailles, ADDR.paris, WED_NOON, { distanceKm: 20 }).prixBase).toBe(90);
  });
});

describe("majorations (montants fixes, calculées à l'heure de Paris)", () => {
  // Mercredi 17 juin 2026 (CEST), forfait Paris -> Orly = 76 €.
  const at = (hhmm: string) => prix(ADDR.paris, ADDR.orly, `2026-06-17T${hhmm}`);

  it.each([
    ["14:00", 76, []],
    ["07:00", 76, []],
    ["19:59", 76, []],
    ["06:59", 96, ["Soir / matin tôt"]],
    ["06:00", 96, ["Soir / matin tôt"]],
    ["20:00", 96, ["Soir / matin tôt"]],
    ["22:59", 96, ["Soir / matin tôt"]],
    ["23:00", 116, ["Nuit (23h-6h)"]],
    ["00:00", 116, ["Nuit (23h-6h)"]],
    ["05:59", 116, ["Nuit (23h-6h)"]],
  ])("mercredi %s -> %d €", (hhmm, expected, types) => {
    const r = at(hhmm);
    expect(r.total).toBe(expected);
    expect(r.majorations.map((m) => m.type)).toEqual(types);
  });

  it("week-end : samedi et dimanche +20 €, vendredi non", () => {
    expect(prix(ADDR.paris, ADDR.orly, "2026-06-13T14:00").total).toBe(96); // samedi
    expect(prix(ADDR.paris, ADDR.orly, "2026-06-14T14:00").total).toBe(96); // dimanche
    expect(prix(ADDR.paris, ADDR.orly, "2026-06-12T14:00").total).toBe(76); // vendredi
  });

  it("nuit + week-end se cumulent (+40 +20)", () => {
    expect(prix(ADDR.paris, ADDR.orly, "2026-06-13T23:30").total).toBe(136);
  });

  it("réservation à moins de 2 h : +20 ; au-delà de 2 h ou dans le passé : 0", () => {
    const now = new Date("2026-06-10T11:00:00Z"); // 13:00 Paris
    expect(prix(ADDR.paris, ADDR.orly, "2026-06-10T12:30:00Z", { now }).total).toBe(96); // 14:30 Paris, dans 1 h 30
    expect(prix(ADDR.paris, ADDR.orly, "2026-06-10T13:30:00Z", { now }).total).toBe(76); // 15:30 Paris, dans 2 h 30
    expect(prix(ADDR.paris, ADDR.orly, "2026-06-10T10:30:00Z", { now }).total).toBe(76); // passé
  });

  it("supplément priorité +20 € ajouté au total et aux centimes", () => {
    const r = prix(ADDR.paris, ADDR.orly, WED_NOON, { prioriteReservation: true });
    expect(r.supplementPriorite).toBe(20);
    expect(r.prix).toBe(76);
    expect(r.total).toBe(96);
    expect(r.totalCents).toBe(9600);
  });

  it("cumul complet : forfait + tardive + nuit + week-end + priorité", () => {
    const now = new Date("2026-06-13T20:30:00Z"); // samedi 22:30 Paris
    // Départ samedi 23:30 Paris (= 21:30Z), dans 1 h : réservation tardive.
    const r = prix(ADDR.paris, ADDR.orly, "2026-06-13T21:30:00Z", { now, prioriteReservation: true });
    // 76 + 20 (tardive) + 40 (nuit, 23:30 Paris) + 20 (samedi) + 20 (priorité)
    expect(r.total).toBe(176);
  });
});

describe("fuseau : le calcul se fait à l'heure de Paris, pas à celle du process", () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  it("samedi 23:30 UTC = dimanche 01:30 Paris (été) -> nuit + week-end", () => {
    const r = prix(ADDR.paris, ADDR.orly, "2026-06-13T23:30:00Z");
    expect(getParisParts(new Date("2026-06-13T23:30:00Z"))).toMatchObject({ weekday: 0, hour: 1, minute: 30 });
    expect(r.total).toBe(76 + 40 + 20);
  });

  it("vendredi 22:30 UTC = samedi 00:30 Paris (été) -> nuit + week-end (un calcul UTC verrait un vendredi soir)", () => {
    expect(prix(ADDR.paris, ADDR.orly, "2026-06-12T22:30:00Z").total).toBe(76 + 40 + 20);
  });

  it("dimanche 22:30 UTC = lundi 00:30 Paris -> nuit seule (plus de week-end)", () => {
    expect(prix(ADDR.paris, ADDR.orly, "2026-06-14T22:30:00Z").total).toBe(76 + 40);
  });

  it.each(["UTC", "America/Los_Angeles", "Pacific/Auckland", "Europe/Paris"])(
    "résultat identique avec TZ=%s (ISO UTC et heure murale)",
    (tz) => {
      process.env.TZ = tz;
      expect(prix(ADDR.paris, ADDR.orly, "2026-06-13T23:30:00Z").total).toBe(136);
      expect(prix(ADDR.paris, ADDR.orly, "2026-06-12T22:30:00Z").total).toBe(136);
      expect(prix(ADDR.paris, ADDR.orly, "2026-06-17T14:00").total).toBe(76);
      expect(prix(ADDR.paris, ADDR.orly, "2026-06-13T23:30").total).toBe(136); // murale samedi 23:30 Paris
      expect(prix(ADDR.paris, ADDR.orly, "2026-06-17T06:30").total).toBe(96);
    }
  );

  it("heure murale (sans fuseau) = heure de Paris, été (UTC+2) et hiver (UTC+1)", () => {
    expect(parseReservationDate("2026-06-17T14:00")?.toISOString()).toBe("2026-06-17T12:00:00.000Z");
    expect(parseReservationDate("2026-01-14T14:00")?.toISOString()).toBe("2026-01-14T13:00:00.000Z");
  });

  it("même instant UTC, majoration différente selon l'heure d'été / d'hiver", () => {
    // 05:30 UTC : 07:30 à Paris en été (aucune majoration), 06:30 en hiver (matin tôt +20).
    expect(prix(ADDR.paris, ADDR.orly, "2026-06-17T05:30:00Z").total).toBe(76);
    expect(prix(ADDR.paris, ADDR.orly, "2026-01-14T05:30:00Z").total).toBe(96);
    // 21:30 UTC : 23:30 à Paris en été (nuit +40), 22:30 en hiver (soir +20).
    expect(prix(ADDR.paris, ADDR.orly, "2026-06-17T21:30:00Z").total).toBe(116);
    expect(prix(ADDR.paris, ADDR.orly, "2026-01-14T21:30:00Z").total).toBe(96);
  });

  it("jour de passage à l'heure d'été (dimanche 29 mars 2026) et d'hiver (25 octobre 2026)", () => {
    // 29/03 : 03:30 Paris existe (CEST) -> nuit + dimanche
    expect(prix(ADDR.paris, ADDR.orly, "2026-03-29T03:30").total).toBe(76 + 40 + 20);
    expect(parseReservationDate("2026-03-29T03:30")?.toISOString()).toBe("2026-03-29T01:30:00.000Z");
    // 25/10 : 14:00 Paris (CET) = 13:00Z ; dimanche
    expect(parseReservationDate("2026-10-25T14:00")?.toISOString()).toBe("2026-10-25T13:00:00.000Z");
    expect(prix(ADDR.paris, ADDR.orly, "2026-10-25T14:00").total).toBe(96);
    // Samedi 28/03 23:30Z = dimanche 00:30 Paris (CET) -> nuit + week-end ;
    expect(prix(ADDR.paris, ADDR.orly, "2026-03-28T23:30:00Z").total).toBe(76 + 40 + 20);
  });

  it("dates invalides : null (31 février, mois 13, texte)", () => {
    for (const bad of ["2026-02-31T10:00", "2026-13-01T10:00", "demain", "", "2026-06-17", 12345, null]) {
      expect(parseReservationDate(bad), String(bad)).toBeNull();
    }
  });
});

describe("distance haversine", () => {
  it("Paris centre <-> Orly ≈ 14 km, symétrique, nulle sur un même point", () => {
    const paris = { lat: 48.8556, lng: 2.3606 };
    const orly = { lat: 48.7262, lng: 2.3652 };
    const d = haversineKm(paris, orly);
    expect(d).toBeGreaterThan(13.5);
    expect(d).toBeLessThan(15);
    expect(haversineKm(orly, paris)).toBeCloseTo(d, 10);
    expect(haversineKm(paris, paris)).toBe(0);
  });
});

describe("computeServerQuote : paramètres de course -> prix ou erreur 400", () => {
  const now = new Date("2026-06-10T09:00:00Z"); // mercredi 11:00 Paris
  const base = {
    depart: ADDR.paris,
    arrivee: ADDR.orly,
    distance: 20,
    originLat: 48.8556,
    originLng: 2.3606,
    destLat: 48.7262,
    destLng: 2.3652,
    reservationDate: WED_NOON,
    prioriteReservation: false,
  };
  const code = (raw: unknown, opts = PAYMENT_QUOTE_OPTIONS) => {
    const r = computeServerQuote(raw, opts, now);
    return r.ok ? "OK" : r.code;
  };
  // Hors forfait Versailles -> Nanterre, ~ 12 km à vol d'oiseau.
  const hf = {
    ...base,
    depart: ADDR.versailles,
    arrivee: ADDR.nanterre,
    originLat: 48.8049,
    originLng: 2.1204,
    destLat: 48.8924,
    destLng: 2.2066,
  };

  it("cas nominal : total 76 € = 7600 centimes ; montants du corps ignorés", () => {
    const r = computeServerQuote(
      { ...base, prix: 1, amount: 1, amountCents: 1, total: 1, totalCents: 1 },
      PAYMENT_QUOTE_OPTIONS,
      now
    );
    expect(r.ok && r.quote.totalCents).toBe(7600);
    expect(r.ok && r.quote.reservationDateIso).toBe("2026-06-17T12:00:00.000Z");
  });

  describe("paiement : seuls les trajets au forfait sont payables en ligne", () => {
    it.each([
      ["coordonnées et distance cohérentes", hf],
      ["distance trop courte", { ...hf, distance: 2 }],
      ["distance absente", { ...hf, distance: undefined }],
      ["sans coordonnées", { ...hf, originLat: undefined, originLng: undefined, destLat: undefined, destLng: undefined }],
      ["zone indéterminée (départ sans code postal)", { ...base, depart: "Paris" }],
      ["deux codes postaux (ambigu)", { ...base, depart: "75001 Paris, 94390 Orly" }],
    ])("hors forfait, %s -> QUOTE_REQUIRED", (_n, ride) => {
      expect(code(ride)).toBe("QUOTE_REQUIRED");
    });

    it("la distance déclarée n'a aucune influence sur un forfait (même absurde)", () => {
      const r = computeServerQuote({ ...base, distance: 9999, destLat: 43.3, destLng: 5.4 }, PAYMENT_QUOTE_OPTIONS, now);
      expect(r.ok && r.quote.totalCents).toBe(7600);
    });
  });

  describe("devis : estimation hors forfait avec contrôle de la distance", () => {
    it("coordonnées cohérentes -> prix km (90 €)", () => {
      const r = computeServerQuote({ ...hf, distance: 20 }, DEVIS_QUOTE_OPTIONS, now);
      expect(r.ok && r.quote.total).toBe(90);
    });

    it("DISTANCE_TOO_SHORT : distance déclarée < 95 % de la ligne droite", () => {
      expect(code({ ...hf, distance: 2 }, DEVIS_QUOTE_OPTIONS)).toBe("DISTANCE_TOO_SHORT");
    });

    it("coordonnées facultatives pour un devis", () => {
      const { originLat, originLng, destLat, destLng, ...noCoords } = hf;
      expect(code(noCoords, DEVIS_QUOTE_OPTIONS)).toBe("OK");
    });

    it("DISTANCE_INVALID : distance manquante, négative, nulle, > 250 km ou non numérique", () => {
      for (const distance of [undefined, -5, 0, 251, "20", NaN]) {
        expect(code({ ...hf, distance }, DEVIS_QUOTE_OPTIONS), String(distance)).toBe("DISTANCE_INVALID");
      }
    });

    it("DISTANCE_INVALID : coordonnées à plus de 250 km à vol d'oiseau (Marseille), même au forfait", () => {
      expect(code({ ...base, destLat: 43.2965, destLng: 5.3698 }, DEVIS_QUOTE_OPTIONS)).toBe("DISTANCE_INVALID");
    });
  });

  it("DATE_IN_PAST au-delà de 30 min de tolérance ; 20 min de retard toléré (avec priorité)", () => {
    expect(code({ ...base, reservationDate: "2026-06-10T07:30:00Z" })).toBe("DATE_IN_PAST"); // 1 h 30 dans le passé
    expect(code({ ...base, reservationDate: "2026-06-10T08:40:00Z", prioriteReservation: true })).toBe("OK");
  });

  it("DATE_TOO_FAR : plus d'un an à l'avance", () => {
    expect(code({ ...base, reservationDate: "2028-01-01T14:00" })).toBe("DATE_TOO_FAR");
  });

  it("PRIORITY_REQUIRED : départ à moins de 75 min sans priorité ; OK avec priorité ou au-delà", () => {
    const at = (min: number) => new Date(now.getTime() + min * 60 * 1000).toISOString();
    expect(code({ ...base, reservationDate: at(30) })).toBe("PRIORITY_REQUIRED");
    expect(code({ ...base, reservationDate: at(70) })).toBe("PRIORITY_REQUIRED");
    expect(code({ ...base, reservationDate: at(80) })).toBe("OK");
    expect(code({ ...base, reservationDate: at(30), prioriteReservation: true })).toBe("OK");
  });

  it("date obligatoire pour un paiement, facultative pour un devis ; date invalide refusée", () => {
    const { reservationDate, ...noDate } = base;
    expect(code(noDate)).toBe("INVALID_DATE");
    expect(code(noDate, DEVIS_QUOTE_OPTIONS)).toBe("OK");
    expect(code({ ...base, reservationDate: "bientôt" })).toBe("INVALID_DATE");
  });

  it("adresses ou corps manquants", () => {
    expect(code({ ...base, depart: "" })).toBe("ADDRESS_MISSING");
    expect(code({ ...base, arrivee: undefined })).toBe("ADDRESS_MISSING");
    expect(code(null)).toBe("RIDE_MISSING");
    expect(code("texte")).toBe("RIDE_MISSING");
  });

  it("prioriteReservation n'est prise en compte que si elle vaut exactement true", () => {
    const r = computeServerQuote({ ...base, prioriteReservation: "true" }, PAYMENT_QUOTE_OPTIONS, now);
    expect(r.ok && r.quote.supplementPriorite).toBe(0);
  });
});
