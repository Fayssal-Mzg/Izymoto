export type WalletAudience = "individual" | "business";

export interface WalletTier {
  id: string;
  audience: WalletAudience;
  name: string;
  rechargeAmount: number;
  bonusAmount: number;
  totalCredit: number;
  bonusPercent: number;
  popular?: boolean;
  tagline: string;
  equivalent: string;
}

const buildTier = (
  partial: Omit<WalletTier, "totalCredit" | "bonusPercent">
): WalletTier => {
  const totalCredit = partial.rechargeAmount + partial.bonusAmount;
  const bonusPercent = Math.round(
    (partial.bonusAmount / partial.rechargeAmount) * 100
  );
  return { ...partial, totalCredit, bonusPercent };
};

export const INDIVIDUAL_TIERS: WalletTier[] = [
  buildTier({
    id: "individual-essai",
    audience: "individual",
    name: "Essai",
    rechargeAmount: 100,
    bonusAmount: 5,
    tagline: "Pour découvrir le service",
    equivalent: "1 trajet aéroport ou 2 trajets ville",
  }),
  buildTier({
    id: "individual-regulier",
    audience: "individual",
    name: "Régulier",
    rechargeAmount: 250,
    bonusAmount: 25,
    tagline: "Pour vos trajets occasionnels",
    equivalent: "Environ 5 trajets en ville",
  }),
  buildTier({
    id: "individual-habitue",
    audience: "individual",
    name: "Habitué",
    rechargeAmount: 500,
    bonusAmount: 75,
    popular: true,
    tagline: "Le palier préféré de nos clients",
    equivalent: "Environ 10 trajets en ville",
  }),
  buildTier({
    id: "individual-premium",
    audience: "individual",
    name: "Premium",
    rechargeAmount: 1000,
    bonusAmount: 200,
    tagline: "Le maximum d'avantages",
    equivalent: "Plus de 20 trajets en ville",
  }),
];

export const BUSINESS_TIERS: WalletTier[] = [
  buildTier({
    id: "business-tpe",
    audience: "business",
    name: "TPE",
    rechargeAmount: 1000,
    bonusAmount: 50,
    tagline: "Idéal pour démarrer",
    equivalent: "Pour 1 à 3 collaborateurs mobiles",
  }),
  buildTier({
    id: "business-pme",
    audience: "business",
    name: "PME",
    rechargeAmount: 2500,
    bonusAmount: 250,
    tagline: "Le bon compromis flexibilité / économies",
    equivalent: "Pour 3 à 8 collaborateurs",
  }),
  buildTier({
    id: "business-business",
    audience: "business",
    name: "Business",
    rechargeAmount: 5000,
    bonusAmount: 750,
    popular: true,
    tagline: "Notre formule la plus choisie",
    equivalent: "Pour 8 à 15 collaborateurs",
  }),
  buildTier({
    id: "business-premium",
    audience: "business",
    name: "Premium",
    rechargeAmount: 10000,
    bonusAmount: 1800,
    tagline: "Service prioritaire absolu",
    equivalent: "Pour 15 à 30 collaborateurs",
  }),
  buildTier({
    id: "business-enterprise",
    audience: "business",
    name: "Enterprise",
    rechargeAmount: 25000,
    bonusAmount: 5000,
    tagline: "L'offre grand compte",
    equivalent: "Pour 30+ collaborateurs",
  }),
];

export const ALL_TIERS: WalletTier[] = [...INDIVIDUAL_TIERS, ...BUSINESS_TIERS];

export const getTiersByAudience = (audience: WalletAudience): WalletTier[] =>
  audience === "individual" ? INDIVIDUAL_TIERS : BUSINESS_TIERS;

export const getTierById = (id: string): WalletTier | undefined =>
  ALL_TIERS.find((t) => t.id === id);

export const formatEuro = (amount: number): string =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
