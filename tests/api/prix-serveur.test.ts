// Lot 0.3 (SENSIBLE) : le prix est calculé par le serveur. Tout montant envoyé par le
// client est ignoré ; seul `displayedTotalCents` (prix affiché) est comparé au total
// serveur (écart -> 409 PRICE_CHANGED). Routes couvertes : create-payment-intent,
// wallet/debit-for-booking, wallet/finalize-hybrid-booking, finalize-card-booking,
// send-devis. Stripe et Resend mockés, émulateurs Firestore/Auth `demo-izymoto`.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Timestamp } from "firebase-admin/firestore";
import { calculerPrixCourse } from "@/lib/pricing";

const stripeMock = vi.hoisted(() => ({
  paymentIntents: { create: vi.fn(), retrieve: vi.fn(), cancel: vi.fn() },
}));
const emailSend = vi.hoisted(() => vi.fn());

vi.mock("@/lib/stripe-server", () => ({ stripe: stripeMock }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: emailSend };
  },
}));

import { POST as createPaymentIntent } from "@/app/api/create-payment-intent/route";
import { POST as debitForBooking } from "@/app/api/wallet/debit-for-booking/route";
import { POST as finalizeHybrid } from "@/app/api/wallet/finalize-hybrid-booking/route";
import { POST as finalizeCard } from "@/app/api/finalize-card-booking/route";
import { POST as sendDevis } from "@/app/api/send-devis/route";
import { getAdminFirestore } from "@/lib/firebase/admin-server";
import {
  createAuthUser,
  createVerifiedAuthUser,
  futureParisDate,
  jsonRequest,
  piCreatedNow,
  resetEmulators,
  rideMeta,
  validRide,
  VALID_RIDE_TOTAL_CENTS,
} from "./helpers";

const db = () => getAdminFirestore();
const TOTAL = VALID_RIDE_TOTAL_CENTS; // Paris -> Orly, semaine 14h = 76 € = 7600

// Paris -> Roissy (forfait 99 €) : un autre prix de forfait pour simuler un PI posé à un autre tarif.
const ROISSY_TOTAL = 9900;
const roissyRide = (over: Record<string, unknown> = {}) =>
  validRide({ arrivee: "Aéroport Paris-Charles de Gaulle, 95700 Roissy-en-France", ...over });

// Hors forfait Versailles -> Nanterre (~12 km à vol d'oiseau), 20 km déclarés = 30 + 60 = 90 €.
// lot 0.3 : un trajet hors forfait n'est JAMAIS payable en ligne (400 QUOTE_REQUIRED) ;
// il reste estimable par send-devis (devis).
const HF_TOTAL = 9000;
const hfRide = (over: Record<string, unknown> = {}) =>
  validRide({
    depart: "Château de Versailles, 78000 Versailles",
    arrivee: "Place de la Boule, 92000 Nanterre",
    distance: 20,
    originLat: 48.8049,
    originLng: 2.1204,
    destLat: 48.8924,
    destLng: 2.2066,
    ...over,
  });

async function seedWallet(uid: string, balanceCents: number) {
  await db().collection("wallets").doc(uid).set({
    userId: uid,
    balanceCents,
    cumulativeRechargedCents: balanceCents,
    currency: "EUR",
  });
}
async function balanceOf(uid: string) {
  return (await db().collection("wallets").doc(uid).get()).data()?.balanceCents;
}
async function countDocs(col: string) {
  return (await db().collection(col).get()).size;
}

let n = 0;
const uniqueEmail = (p: string) => `${p}-${++n}@test.dev`;

// PaymentIntent tel que create-payment-intent le pose : propriétaire, mode, parts, et les
// paramètres de la course (les routes de finalisation exigent qu'ils correspondent).
const piMeta = (uid: string, ride: Record<string, unknown> = validRide(), over: Record<string, string> = {}) => ({
  userId: uid,
  paymentMode: "card",
  walletAmountCents: "0",
  totalAmountCents: String(TOTAL),
  ...rideMeta(ride),
  ...over,
});
const cardPi = (
  uid: string,
  id = "pi_card",
  over: Record<string, unknown> = {},
  total = TOTAL,
  ride: Record<string, unknown> = validRide()
) => ({
  id,
  status: "requires_capture",
  created: piCreatedNow(),
  amount: total,
  metadata: piMeta(uid, ride, { totalAmountCents: String(total) }),
  ...over,
});
const hybridPi = (uid: string, id: string, walletCents: number, totalCents: number, ride: Record<string, unknown> = validRide()) => ({
  id,
  status: "requires_capture",
  created: piCreatedNow(),
  amount: totalCents - walletCents,
  metadata: piMeta(uid, ride, {
    paymentMode: "hybrid",
    walletAmountCents: String(walletCents),
    totalAmountCents: String(totalCents),
  }),
});

beforeEach(async () => {
  await resetEmulators();
  emailSend.mockReset().mockResolvedValue({ data: { id: "email_test" }, error: null });
  for (const fn of Object.values(stripeMock.paymentIntents)) fn.mockReset();
  stripeMock.paymentIntents.create.mockResolvedValue({ id: "pi_new", client_secret: "cs_x" });
  stripeMock.paymentIntents.cancel.mockResolvedValue({ id: "pi_x", status: "canceled" });
});

// Paramètres de course refusés par TOUTES les routes qui engagent un montant (paiement).
// Hors forfait / zone indéterminée : jamais payable en ligne, quelle que soit la distance
// déclarée ou la cohérence des coordonnées (la distance n'est pas vérifiable côté serveur).
const noCoords = { originLat: undefined, originLng: undefined, destLat: undefined, destLng: undefined };
const ridesInvalid: Array<[string, () => Record<string, unknown>, string]> = [
  ["hors forfait, coordonnées et distance cohérentes", () => hfRide(), "QUOTE_REQUIRED"],
  ["hors forfait, distance trop courte vs coordonnées", () => hfRide({ distance: 2 }), "QUOTE_REQUIRED"],
  ["hors forfait, coordonnées manquantes", () => hfRide(noCoords), "QUOTE_REQUIRED"],
  ["hors forfait, distance manquante", () => hfRide({ distance: undefined }), "QUOTE_REQUIRED"],
  ["adresse de départ sans code postal (zone indéterminée)", () => validRide({ depart: "Paris" }), "QUOTE_REQUIRED"],
  [
    "deux codes postaux dans une adresse (ambigu)",
    () => validRide({ depart: "10 Rue de Rivoli, 75001 Paris, 94390 Orly" }),
    "QUOTE_REQUIRED",
  ],
  ["date dans le passé", () => validRide({ reservationDate: "2020-01-01T10:00" }), "DATE_IN_PAST"],
  ["date à plus d'un an", () => validRide({ reservationDate: "2099-01-01T10:00" }), "DATE_TOO_FAR"],
  [
    "départ dans moins d'1 h sans priorité",
    () => validRide({ reservationDate: new Date(Date.now() + 30 * 60 * 1000).toISOString() }),
    "PRIORITY_REQUIRED",
  ],
];

// ================================================================ create-payment-intent
describe("create-payment-intent : montant calculé par le serveur", () => {
  const call = (token: string, body: Record<string, unknown>) =>
    createPaymentIntent(jsonRequest("/api/create-payment-intent", { token, body }));

  it("tout montant du corps est ignoré : Stripe reçoit le total serveur", async () => {
    const u = await createAuthUser(uniqueEmail("cpi-ign"));
    const res = await call(u.idToken, {
      amount: 1,
      amountCents: 1,
      prix: 1,
      total: 1,
      totalAmountCents: 1,
      cardAmountCents: 1,
      metadata: { ...validRide(), prix: 1, amount: 1, amountCents: 1, totalAmountCents: "1" },
    });
    expect(res.status).toBe(200);
    expect(stripeMock.paymentIntents.create).toHaveBeenCalledTimes(1);
    const arg = stripeMock.paymentIntents.create.mock.calls[0][0];
    expect(arg.amount).toBe(TOTAL);
    expect(arg.metadata.totalAmountCents).toBe(String(TOTAL));
    expect(arg.metadata.walletAmountCents).toBe("0");
    expect((await res.json()).totalAmountCents).toBe(TOTAL);
  });

  it("montant du corps énorme ignoré aussi (pas de sur-facturation ni de sous-facturation)", async () => {
    const u = await createAuthUser(uniqueEmail("cpi-big"));
    await call(u.idToken, { amount: 99999, metadata: validRide() });
    expect(stripeMock.paymentIntents.create.mock.calls[0][0].amount).toBe(TOTAL);
  });

  it("forfait Paris -> Roissy : 99 € calculés par le serveur", async () => {
    const u = await createAuthUser(uniqueEmail("cpi-roissy"));
    const res = await call(u.idToken, { amount: 1, metadata: roissyRide() });
    expect(res.status).toBe(200);
    expect(stripeMock.paymentIntents.create.mock.calls[0][0].amount).toBe(ROISSY_TOTAL);
  });

  it("metadata du PI = paramètres de course validés par le serveur (adresses, date ISO UTC, priorité)", async () => {
    const u = await createAuthUser(uniqueEmail("cpi-meta"));
    await call(u.idToken, { metadata: validRide() });
    const m = stripeMock.paymentIntents.create.mock.calls[0][0].metadata;
    expect(m).toMatchObject(rideMeta(validRide()));
  });

  it("majorations et priorité comptées par le serveur (samedi 23:30 + priorité = 76+40+20+20)", async () => {
    const u = await createAuthUser(uniqueEmail("cpi-maj"));
    const res = await call(u.idToken, {
      metadata: validRide({ reservationDate: futureParisDate([6], "23:30"), prioriteReservation: true }),
    });
    expect(res.status).toBe(200);
    expect(stripeMock.paymentIntents.create.mock.calls[0][0].amount).toBe(15600);
  });

  it("displayedTotalCents égal au total serveur -> 200", async () => {
    const u = await createAuthUser(uniqueEmail("cpi-disp-ok"));
    const res = await call(u.idToken, { displayedTotalCents: TOTAL, metadata: validRide() });
    expect(res.status).toBe(200);
  });

  it("displayedTotalCents différent -> 409 PRICE_CHANGED avec le nouveau prix, Stripe non appelé", async () => {
    const u = await createAuthUser(uniqueEmail("cpi-disp-ko"));
    const res = await call(u.idToken, { displayedTotalCents: 5000, metadata: validRide() });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("PRICE_CHANGED");
    expect(json.newTotalCents).toBe(TOTAL);
    expect(json.newTotal).toBe(76);
    expect(json.previousTotalCents).toBe(5000);
    expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
  });

  it("displayedTotalCents non numérique -> 400, Stripe non appelé", async () => {
    const u = await createAuthUser(uniqueEmail("cpi-disp-nan"));
    const res = await call(u.idToken, { displayedTotalCents: "7600", metadata: validRide() });
    expect(res.status).toBe(400);
    expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
  });

  it.each(ridesInvalid)("%s -> 400 %s, Stripe non appelé", async (_name, ride, code) => {
    const u = await createAuthUser(uniqueEmail("cpi-bad"));
    const res = await call(u.idToken, { amount: 7600, metadata: ride() });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe(code);
    expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
  });

  it("sans paramètres de course (metadata absente) -> 400, Stripe non appelé", async () => {
    const u = await createAuthUser(uniqueEmail("cpi-nometa"));
    const res = await call(u.idToken, { amount: 7600 });
    expect(res.status).toBe(400);
    expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
  });

  it("part portefeuille > solde réel -> 402, Stripe non appelé", async () => {
    const u = await createAuthUser(uniqueEmail("cpi-402"));
    await seedWallet(u.uid, 1000);
    const res = await call(u.idToken, { walletAmountCents: 2000, metadata: validRide() });
    expect(res.status).toBe(402);
    expect((await res.json()).code).toBe("INSUFFICIENT_BALANCE");
    expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
    expect(await balanceOf(u.uid)).toBe(1000);
  });

  it("part portefeuille sans portefeuille du tout -> 402", async () => {
    const u = await createAuthUser(uniqueEmail("cpi-nowallet"));
    const res = await call(u.idToken, { walletAmountCents: 500, metadata: validRide() });
    expect(res.status).toBe(402);
    expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
  });

  it.each([TOTAL, TOTAL + 1, 99999999])(
    "part portefeuille %d ≥ total serveur -> 400 WALLET_COVERS_TOTAL",
    async (wallet) => {
      const u = await createAuthUser(uniqueEmail("cpi-cover"));
      await seedWallet(u.uid, 100000000);
      const res = await call(u.idToken, { walletAmountCents: wallet, metadata: validRide() });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe("WALLET_COVERS_TOTAL");
      expect(json.totalAmountCents).toBe(TOTAL);
      expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
    }
  );

  it("hybride valide : CB = total serveur - part wallet, metadata cohérentes", async () => {
    const u = await createAuthUser(uniqueEmail("cpi-hyb"));
    await seedWallet(u.uid, 5000);
    const res = await call(u.idToken, { amount: 1, walletAmountCents: 2000, metadata: validRide() });
    expect(res.status).toBe(200);
    const arg = stripeMock.paymentIntents.create.mock.calls[0][0];
    expect(arg.amount).toBe(TOTAL - 2000);
    expect(arg.metadata).toMatchObject({
      paymentMode: "hybrid",
      walletAmountCents: "2000",
      totalAmountCents: String(TOTAL),
      userId: u.uid,
    });
    expect(await balanceOf(u.uid)).toBe(5000); // rien débité à ce stade
  });
});

// ================================================================ debit-for-booking
describe("wallet/debit-for-booking : débit = total serveur", () => {
  const call = (token: string, body: Record<string, unknown>) =>
    debitForBooking(jsonRequest("/api/wallet/debit-for-booking", { token, body }));

  it.each([1, 7600, 999999])("amountCents du corps (%d) ignoré : débit, ledger et booking = total serveur", async (amountCents) => {
    const u = await createAuthUser(uniqueEmail("dfb-ign"));
    await seedWallet(u.uid, 20000);
    const res = await call(u.idToken, {
      amountCents,
      amountAuthorized: 1,
      prix: 1,
      clientToken: "tok-ign",
      bookingData: { ...validRide(), prix: 1, amountAuthorized: 1, amountCaptured: 1 },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(await balanceOf(u.uid)).toBe(20000 - TOTAL);
    const b = (await db().collection("bookings").doc(json.bookingId).get()).data()!;
    expect(b.prix).toBe(76);
    expect(b.amountAuthorized).toBe(76);
    expect(b.amountCaptured).toBe(76);
    expect(b.walletAmountCents).toBe(TOTAL);
    const txs = await db().collection("walletTransactions").get();
    expect(txs.size).toBe(1);
    expect(txs.docs[0].data().amountCents).toBe(TOTAL);
  });

  it("amountCents = 1 avec un solde < total serveur -> 402 (le client ne peut pas payer moins), rien débité", async () => {
    const u = await createAuthUser(uniqueEmail("dfb-402"));
    await seedWallet(u.uid, 5000);
    const res = await call(u.idToken, { amountCents: 1, clientToken: "tok-402", bookingData: validRide() });
    expect(res.status).toBe(402);
    expect(await balanceOf(u.uid)).toBe(5000);
    expect(await countDocs("bookings")).toBe(0);
    expect(await countDocs("walletTransactions")).toBe(0);
  });

  it("forfait Paris -> Roissy : débite 99 € (amountCents = 1 ignoré)", async () => {
    const u = await createAuthUser(uniqueEmail("dfb-roissy"));
    await seedWallet(u.uid, 20000);
    const res = await call(u.idToken, { amountCents: 1, clientToken: "tok-roissy", bookingData: roissyRide() });
    expect(res.status).toBe(200);
    expect(await balanceOf(u.uid)).toBe(20000 - ROISSY_TOTAL);
  });

  it("displayedTotalCents égal -> 200 ; différent -> 409 PRICE_CHANGED sans aucun effet", async () => {
    const u = await createAuthUser(uniqueEmail("dfb-disp"));
    await seedWallet(u.uid, 20000);
    const ko = await call(u.idToken, {
      displayedTotalCents: 5000,
      clientToken: "tok-disp-ko",
      bookingData: validRide(),
    });
    expect(ko.status).toBe(409);
    const json = await ko.json();
    expect(json.code).toBe("PRICE_CHANGED");
    expect(json.newTotalCents).toBe(TOTAL);
    expect(await balanceOf(u.uid)).toBe(20000);
    expect(await countDocs("bookings")).toBe(0);
    expect(await countDocs("walletTransactions")).toBe(0);

    const ok = await call(u.idToken, {
      displayedTotalCents: TOTAL,
      clientToken: "tok-disp-ok",
      bookingData: validRide(),
    });
    expect(ok.status).toBe(200);
    expect(await balanceOf(u.uid)).toBe(20000 - TOTAL);
  });

  it.each(ridesInvalid)("%s -> 400 %s, aucun effet", async (_name, ride, code) => {
    const u = await createAuthUser(uniqueEmail("dfb-bad"));
    await seedWallet(u.uid, 50000);
    const res = await call(u.idToken, { amountCents: 100, clientToken: "tok-bad", bookingData: ride() });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe(code);
    expect(await balanceOf(u.uid)).toBe(50000);
    expect(await countDocs("bookings")).toBe(0);
    expect(await countDocs("walletTransactions")).toBe(0);
  });
});

// ================================================================ finalize-hybrid-booking
describe("wallet/finalize-hybrid-booking : prix serveur vs PaymentIntent", () => {
  const call = (token: string, body: Record<string, unknown>) =>
    finalizeHybrid(jsonRequest("/api/wallet/finalize-hybrid-booking", { token, body }));

  it("walletAmountCents / cardAmountCents / prix du corps ignorés : débit = part du PI, booking.prix = total serveur", async () => {
    const u = await createAuthUser(uniqueEmail("fh-ign"));
    await seedWallet(u.uid, 10000);
    stripeMock.paymentIntents.retrieve.mockResolvedValue(hybridPi(u.uid, "pi_h", 2000, TOTAL));
    const res = await call(u.idToken, {
      paymentIntentId: "pi_h",
      walletAmountCents: 1,
      cardAmountCents: 1,
      amountCents: 1,
      prix: 1,
      bookingData: { ...validRide(), prix: 1 },
    });
    expect(res.status).toBe(200);
    expect(await balanceOf(u.uid)).toBe(8000);
    const b = (await db().collection("bookings").doc((await res.json()).bookingId).get()).data()!;
    expect(b.prix).toBe(76);
    expect(b.walletAmountCents).toBe(2000);
    const tx = (await db().collection("walletTransactions").doc("hybrid_pi_h").get()).data()!;
    expect(tx.amountCents).toBe(2000);
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
  });

  it("PI posé pour un autre prix (99 €) alors que la course vaut 76 € -> 409 PRICE_CHANGED, aucun débit, empreinte libérée", async () => {
    const u = await createAuthUser(uniqueEmail("fh-chg"));
    await seedWallet(u.uid, 10000);
    stripeMock.paymentIntents.retrieve.mockResolvedValue(hybridPi(u.uid, "pi_old", 2000, ROISSY_TOTAL));
    const res = await call(u.idToken, { paymentIntentId: "pi_old", bookingData: validRide() });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("PRICE_CHANGED");
    expect(json.newTotalCents).toBe(TOTAL);
    expect(json.previousTotalCents).toBe(ROISSY_TOTAL);
    expect(await balanceOf(u.uid)).toBe(10000);
    expect(await countDocs("bookings")).toBe(0);
    expect(await countDocs("walletTransactions")).toBe(0);
    expect(stripeMock.paymentIntents.cancel).toHaveBeenCalledWith("pi_old");
  });

  it("part wallet du PI ≥ total serveur (wallet 7600 + CB 500) -> 409, aucun débit", async () => {
    const u = await createAuthUser(uniqueEmail("fh-cover"));
    await seedWallet(u.uid, 20000);
    stripeMock.paymentIntents.retrieve.mockResolvedValue(hybridPi(u.uid, "pi_cover", TOTAL, TOTAL + 500));
    const res = await call(u.idToken, { paymentIntentId: "pi_cover", bookingData: validRide() });
    expect(res.status).toBe(409);
    expect(await balanceOf(u.uid)).toBe(20000);
    expect(await countDocs("bookings")).toBe(0);
    expect(await countDocs("walletTransactions")).toBe(0);
  });

  it("displayedTotalCents différent -> 409 PRICE_CHANGED, aucun débit, aucune course", async () => {
    const u = await createAuthUser(uniqueEmail("fh-disp"));
    await seedWallet(u.uid, 10000);
    stripeMock.paymentIntents.retrieve.mockResolvedValue(hybridPi(u.uid, "pi_d", 2000, TOTAL));
    const res = await call(u.idToken, { paymentIntentId: "pi_d", displayedTotalCents: 5000, bookingData: validRide() });
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("PRICE_CHANGED");
    expect(await balanceOf(u.uid)).toBe(10000);
    expect(await countDocs("bookings")).toBe(0);
    expect(await countDocs("walletTransactions")).toBe(0);
    // Le PI reste exploitable : le client peut confirmer avec le bon prix affiché.
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
    const ok = await call(u.idToken, { paymentIntentId: "pi_d", displayedTotalCents: TOTAL, bookingData: validRide() });
    expect(ok.status).toBe(200);
    expect(await balanceOf(u.uid)).toBe(8000);
  });

  it.each(ridesInvalid)("%s -> 400 %s, aucun débit, empreinte libérée", async (_name, ride, code) => {
    const u = await createAuthUser(uniqueEmail("fh-bad"));
    await seedWallet(u.uid, 10000);
    stripeMock.paymentIntents.retrieve.mockResolvedValue(hybridPi(u.uid, "pi_bad", 2000, TOTAL));
    const res = await call(u.idToken, { paymentIntentId: "pi_bad", bookingData: ride() });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe(code);
    expect(await balanceOf(u.uid)).toBe(10000);
    expect(await countDocs("bookings")).toBe(0);
    expect(await countDocs("walletTransactions")).toBe(0);
    expect(stripeMock.paymentIntents.cancel).toHaveBeenCalledWith("pi_bad");
  });

  it("part wallet > solde réel (solde baissé entre-temps) -> 402, aucune course, empreinte libérée", async () => {
    const u = await createAuthUser(uniqueEmail("fh-402"));
    await seedWallet(u.uid, 1000);
    stripeMock.paymentIntents.retrieve.mockResolvedValue(hybridPi(u.uid, "pi_poor", 2000, TOTAL));
    const res = await call(u.idToken, { paymentIntentId: "pi_poor", bookingData: validRide() });
    expect(res.status).toBe(402);
    expect(await balanceOf(u.uid)).toBe(1000);
    expect(await countDocs("bookings")).toBe(0);
    expect(await countDocs("walletTransactions")).toBe(0);
    expect(stripeMock.paymentIntents.cancel).toHaveBeenCalledWith("pi_poor");
  });

  it("même total mais autre course que celle du PI (adresse de départ) -> 409 RIDE_MISMATCH, aucun débit, empreinte libérée", async () => {
    const u = await createAuthUser(uniqueEmail("fh-swap"));
    await seedWallet(u.uid, 10000);
    stripeMock.paymentIntents.retrieve.mockResolvedValue(hybridPi(u.uid, "pi_swap", 2000, TOTAL));
    const res = await call(u.idToken, {
      paymentIntentId: "pi_swap",
      bookingData: validRide({ depart: "1 Rue de la Paix, 75002 Paris" }),
    });
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("RIDE_MISMATCH");
    expect(await balanceOf(u.uid)).toBe(10000);
    expect(await countDocs("bookings")).toBe(0);
    expect(await countDocs("walletTransactions")).toBe(0);
    expect(stripeMock.paymentIntents.cancel).toHaveBeenCalledWith("pi_swap");
  });

  it("refus définitif : un nouvel appel -> 409 PAYMENT_REJECTED, aucun débit, pas de second cancel", async () => {
    const u = await createAuthUser(uniqueEmail("fh-rej"));
    await seedWallet(u.uid, 10000);
    stripeMock.paymentIntents.retrieve.mockResolvedValue(hybridPi(u.uid, "pi_rej", 2000, ROISSY_TOTAL));
    expect((await call(u.idToken, { paymentIntentId: "pi_rej", bookingData: validRide() })).status).toBe(409);
    expect(stripeMock.paymentIntents.cancel).toHaveBeenCalledTimes(1);
    stripeMock.paymentIntents.retrieve.mockResolvedValue(hybridPi(u.uid, "pi_rej", 2000, TOTAL));
    const again = await call(u.idToken, { paymentIntentId: "pi_rej", bookingData: validRide() });
    expect(again.status).toBe(409);
    expect((await again.json()).code).toBe("PAYMENT_REJECTED");
    expect(stripeMock.paymentIntents.cancel).toHaveBeenCalledTimes(1);
    expect(await balanceOf(u.uid)).toBe(10000);
    expect(await countDocs("bookings")).toBe(0);
  });

  it("deux appels simultanés (même PI) -> un seul débit, une seule course", async () => {
    const u = await createAuthUser(uniqueEmail("fh-par"));
    await seedWallet(u.uid, 10000);
    stripeMock.paymentIntents.retrieve.mockResolvedValue(hybridPi(u.uid, "pi_par", 2000, TOTAL));
    const mk = () => call(u.idToken, { paymentIntentId: "pi_par", bookingData: validRide() });
    const results = await Promise.all([mk(), mk()]);
    const bodies = await Promise.all(results.map(async (r) => ({ status: r.status, json: await r.json() })));
    expect(bodies.some((b) => b.status === 200)).toBe(true);
    for (const b of bodies) if (b.status !== 200) expect(b.json.code).toBe("IN_PROGRESS");
    expect(await balanceOf(u.uid)).toBe(8000);
    expect(await countDocs("bookings")).toBe(1);
    expect(await countDocs("walletTransactions")).toBe(1);
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
  });

  it("rejeu après succès avec une course différente : même réponse, aucun nouveau débit ni annulation", async () => {
    const u = await createAuthUser(uniqueEmail("fh-replay"));
    await seedWallet(u.uid, 10000);
    stripeMock.paymentIntents.retrieve.mockResolvedValue(hybridPi(u.uid, "pi_r", 2000, TOTAL));
    const r1 = await call(u.idToken, { paymentIntentId: "pi_r", bookingData: validRide() });
    const r2 = await call(u.idToken, { paymentIntentId: "pi_r", bookingData: hfRide() });
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect((await r2.json()).bookingId).toBe((await r1.json()).bookingId);
    expect(await balanceOf(u.uid)).toBe(8000);
    expect(await countDocs("bookings")).toBe(1);
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
  });
});

// ================================================================ finalize-card-booking
describe("finalize-card-booking : course carte seule créée par le serveur", () => {
  const call = (token: string | undefined, body: Record<string, unknown>) =>
    finalizeCard(jsonRequest("/api/finalize-card-booking", { token, body }));
  const bodyFor = (id: string, over: Record<string, unknown> = {}) => ({
    paymentIntentId: id,
    bookingData: validRide(),
    ...over,
  });

  async function expectNoBooking() {
    expect(await countDocs("bookings")).toBe(0);
  }

  it("sans jeton -> 401, Stripe non appelé, aucune course", async () => {
    const res = await call(undefined, bodyFor("pi_x"));
    expect(res.status).toBe(401);
    expect(stripeMock.paymentIntents.retrieve).not.toHaveBeenCalled();
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
    await expectNoBooking();
  });

  it("jeton invalide -> 401", async () => {
    const res = await call("jeton.invalide", bodyFor("pi_x"));
    expect(res.status).toBe(401);
    expect(stripeMock.paymentIntents.retrieve).not.toHaveBeenCalled();
    await expectNoBooking();
  });

  it("paymentIntentId ou bookingData manquant -> 400, aucun effet", async () => {
    const u = await createAuthUser(uniqueEmail("fc-400"));
    expect((await call(u.idToken, { bookingData: validRide() })).status).toBe(400);
    expect((await call(u.idToken, { paymentIntentId: "pi_x" })).status).toBe(400);
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
    await expectNoBooking();
  });

  it("PI introuvable côté Stripe -> 404, aucun effet", async () => {
    const u = await createAuthUser(uniqueEmail("fc-404"));
    stripeMock.paymentIntents.retrieve.mockRejectedValue(new Error("No such payment_intent"));
    const res = await call(u.idToken, bodyFor("pi_nope"));
    expect(res.status).toBe(404);
    await expectNoBooking();
  });

  it("PI d'un autre utilisateur -> 403, aucune course, cancel NON appelé", async () => {
    const victim = await createAuthUser(uniqueEmail("fc-victim"));
    const thief = await createAuthUser(uniqueEmail("fc-thief"));
    stripeMock.paymentIntents.retrieve.mockResolvedValue(cardPi(victim.uid, "pi_victim"));
    const res = await call(thief.idToken, bodyFor("pi_victim"));
    expect(res.status).toBe(403);
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
    await expectNoBooking();
  });

  it("PI sans metadata.userId -> 403, cancel NON appelé", async () => {
    const u = await createAuthUser(uniqueEmail("fc-nometa"));
    stripeMock.paymentIntents.retrieve.mockResolvedValue({ id: "pi_nm", status: "requires_capture", amount: TOTAL, metadata: {} });
    const res = await call(u.idToken, bodyFor("pi_nm"));
    expect(res.status).toBe(403);
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
    await expectNoBooking();
  });

  it("PI en mode hybrid -> 409, aucune course, cancel non appelé", async () => {
    const u = await createAuthUser(uniqueEmail("fc-hyb"));
    stripeMock.paymentIntents.retrieve.mockResolvedValue(hybridPi(u.uid, "pi_hyb", 2000, TOTAL));
    const res = await call(u.idToken, bodyFor("pi_hyb"));
    expect(res.status).toBe(409);
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
    await expectNoBooking();
  });

  it("metadata totalAmountCents ≠ pi.amount (PI trafiqué) -> 409, aucune course", async () => {
    const u = await createAuthUser(uniqueEmail("fc-inco"));
    stripeMock.paymentIntents.retrieve.mockResolvedValue(
      cardPi(u.uid, "pi_inco", { metadata: piMeta(u.uid, validRide(), { totalAmountCents: "9999" }) })
    );
    const res = await call(u.idToken, bodyFor("pi_inco"));
    expect(res.status).toBe(409);
    await expectNoBooking();
  });

  it.each(["requires_payment_method", "requires_confirmation", "requires_action", "processing", "succeeded", "canceled"])(
    "PI au statut %s (≠ requires_capture) -> 409, aucune course, cancel non appelé",
    async (status) => {
      const u = await createAuthUser(uniqueEmail("fc-status"));
      stripeMock.paymentIntents.retrieve.mockResolvedValue(cardPi(u.uid, "pi_st", { status }));
      const res = await call(u.idToken, bodyFor("pi_st"));
      expect(res.status).toBe(409);
      expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
      await expectNoBooking();
    }
  );

  it("pi.amount ≠ total serveur (PI à 50 €, course à 76 €) -> 409 PRICE_CHANGED, cancel appelé, aucune réservation", async () => {
    const u = await createAuthUser(uniqueEmail("fc-amt"));
    stripeMock.paymentIntents.retrieve.mockResolvedValue(cardPi(u.uid, "pi_50", {}, 5000));
    const res = await call(u.idToken, bodyFor("pi_50"));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("PRICE_CHANGED");
    expect(json.newTotalCents).toBe(TOTAL);
    expect(json.previousTotalCents).toBe(5000);
    expect(stripeMock.paymentIntents.cancel).toHaveBeenCalledTimes(1);
    expect(stripeMock.paymentIntents.cancel).toHaveBeenCalledWith("pi_50");
    await expectNoBooking();
  });

  it("PI payé 76 € pour une course qui vaut 99 € (Roissy) -> 409 PRICE_CHANGED, cancel, aucune course", async () => {
    // Le client paie le forfait Orly mais décrit une course Roissy : le serveur recalcule 99 €.
    const u = await createAuthUser(uniqueEmail("fc-under"));
    stripeMock.paymentIntents.retrieve.mockResolvedValue(cardPi(u.uid, "pi_under"));
    const res = await call(u.idToken, bodyFor("pi_under", { bookingData: roissyRide() }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("PRICE_CHANGED");
    expect(json.newTotalCents).toBe(ROISSY_TOTAL);
    expect(stripeMock.paymentIntents.cancel).toHaveBeenCalledWith("pi_under");
    await expectNoBooking();
  });

  it("même montant mais autre adresse de départ que celle du PI -> 409 RIDE_MISMATCH, cancel, aucune course", async () => {
    const u = await createAuthUser(uniqueEmail("fc-swap"));
    stripeMock.paymentIntents.retrieve.mockResolvedValue(cardPi(u.uid, "pi_swap"));
    // Même forfait (Paris -> Orly, 76 €) mais autre adresse de départ que celle payée.
    const res = await call(
      u.idToken,
      bodyFor("pi_swap", { bookingData: validRide({ depart: "1 Rue de la Paix, 75002 Paris" }) })
    );
    expect(res.status).toBe(409);
    const swapJson = await res.json();
    expect(swapJson.code).toBe("RIDE_MISMATCH");
    expect(swapJson.holdReleased).toBe(true);
    expect(stripeMock.paymentIntents.cancel).toHaveBeenCalledWith("pi_swap");
    await expectNoBooking();
  });

  it("même montant mais autre date que celle du PI -> 409 RIDE_MISMATCH, cancel, aucune course", async () => {
    const u = await createAuthUser(uniqueEmail("fc-date"));
    stripeMock.paymentIntents.retrieve.mockResolvedValue(cardPi(u.uid, "pi_date"));
    const res = await call(
      u.idToken,
      bodyFor("pi_date", { bookingData: validRide({ reservationDate: futureParisDate([1, 2, 3, 4], "15:00", 20) }) })
    );
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("RIDE_MISMATCH");
    expect(stripeMock.paymentIntents.cancel).toHaveBeenCalledWith("pi_date");
    await expectNoBooking();
  });

  it("paymentIntentId de format invalide -> 400, Stripe non appelé", async () => {
    const u = await createAuthUser(uniqueEmail("fc-fmt"));
    for (const id of ["card_pi_x", "pi_a/b", "pi_", "x", "../pi_x", "../x", "cs_123"]) {
      const res = await call(u.idToken, bodyFor(id));
      expect(res.status, id).toBe(400);
    }
    expect(stripeMock.paymentIntents.retrieve).not.toHaveBeenCalled();
    await expectNoBooking();
  });

  it("refus définitif (prix changé) : un nouvel appel -> 409 PAYMENT_REJECTED, aucune course, pas de second cancel", async () => {
    const u = await createAuthUser(uniqueEmail("fc-rej"));
    stripeMock.paymentIntents.retrieve.mockResolvedValue(cardPi(u.uid, "pi_rej", {}, 5000));
    expect((await call(u.idToken, bodyFor("pi_rej"))).status).toBe(409);
    expect(stripeMock.paymentIntents.cancel).toHaveBeenCalledTimes(1);
    // Même si Stripe répond encore requires_capture (course d'événements), rien ne se crée.
    stripeMock.paymentIntents.retrieve.mockResolvedValue(cardPi(u.uid, "pi_rej"));
    const again = await call(u.idToken, bodyFor("pi_rej"));
    expect(again.status).toBe(409);
    expect((await again.json()).code).toBe("PAYMENT_REJECTED");
    expect(stripeMock.paymentIntents.cancel).toHaveBeenCalledTimes(1);
    await expectNoBooking();
  });

  it.each(ridesInvalid)("%s -> 400 %s, cancel appelé, aucune course", async (_name, ride, code) => {
    const u = await createAuthUser(uniqueEmail("fc-bad"));
    stripeMock.paymentIntents.retrieve.mockResolvedValue(cardPi(u.uid, "pi_bad"));
    const res = await call(u.idToken, bodyFor("pi_bad", { bookingData: ride() }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe(code);
    expect(stripeMock.paymentIntents.cancel).toHaveBeenCalledWith("pi_bad");
    await expectNoBooking();
  });

  it("displayedTotalCents différent -> 409 PRICE_CHANGED, aucune course", async () => {
    const u = await createAuthUser(uniqueEmail("fc-disp"));
    stripeMock.paymentIntents.retrieve.mockResolvedValue(cardPi(u.uid, "pi_disp"));
    const res = await call(u.idToken, bodyFor("pi_disp", { displayedTotalCents: 5000 }));
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("PRICE_CHANGED");
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled(); // empreinte valide, intacte
    await expectNoBooking();
    // Le client peut réessayer avec le bon prix affiché.
    const ok = await call(u.idToken, bodyFor("pi_disp", { displayedTotalCents: TOTAL }));
    expect(ok.status).toBe(200);
    expect(await countDocs("bookings")).toBe(1);
  });

  it("succès : doc card_<pi> avec identité du jeton, prix serveur, paymentId, authorized ; corps trafiqué ignoré", async () => {
    const u = await createAuthUser(uniqueEmail("fc-ok"));
    stripeMock.paymentIntents.retrieve.mockResolvedValue(cardPi(u.uid, "pi_ok"));
    const res = await call(
      u.idToken,
      bodyFor("pi_ok", {
        userId: "victime",
        amountCents: 1,
        prix: 1,
        bookingData: {
          ...validRide(),
          name: "Jean",
          phone: "0600000000",
          userId: "victime",
          uid: "victime",
          companyId: "societe-victime",
          driverId: "chauffeur-x",
          email: "autre@test.dev",
          prix: 1,
          amountAuthorized: 1,
          amountCaptured: 1,
          status: "completed",
          paymentStatus: "captured",
          paymentId: "pi_fake",
          isPaid: true,
          reservationId: "FAKE",
        },
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.bookingId).toBe("card_pi_ok");
    expect(json.reservationId).toMatch(/^CMD-/);
    expect(json.reservationId).not.toBe("FAKE");
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();

    expect(await countDocs("bookings")).toBe(1);
    const b = (await db().collection("bookings").doc("card_pi_ok").get()).data()!;
    expect(b.userId).toBe(u.uid);
    expect(b.email).toBe(u.email);
    expect(b.prix).toBe(76);
    expect(b.amountAuthorized).toBe(76);
    expect(b.paymentId).toBe("pi_ok");
    expect(b.paymentStatus).toBe("authorized");
    expect(b.paymentMethod).toBe("card");
    expect(b.status).toBe("awaiting_driver");
    expect(b.isPaid).toBe(false);
    expect(b.reservationId).toBe(json.reservationId);
    expect(b.depart).toBe(validRide().depart);
    expect(b.arrivee).toBe(validRide().arrivee);
    expect(b.name).toBe("Jean");
    expect(b).not.toHaveProperty("amountCaptured");
    for (const k of ["uid", "companyId", "driverId"]) expect(b).not.toHaveProperty(k);
  });

  it("forfait Roissy : prix serveur 99 € dans la réservation, distance déclarée conservée", async () => {
    const u = await createAuthUser(uniqueEmail("fc-roissy"));
    stripeMock.paymentIntents.retrieve.mockResolvedValue(
      cardPi(u.uid, "pi_roissy", {}, ROISSY_TOTAL, roissyRide())
    );
    const res = await call(u.idToken, bodyFor("pi_roissy", { bookingData: roissyRide() }));
    expect(res.status).toBe(200);
    const b = (await db().collection("bookings").doc("card_pi_roissy").get()).data()!;
    expect(b.prix).toBe(99);
    expect(b.distance).toBe(20);
  });

  it("rejeu (même PI) -> même bookingId et reservationId, une seule réservation, cancel non appelé", async () => {
    const u = await createAuthUser(uniqueEmail("fc-replay"));
    stripeMock.paymentIntents.retrieve.mockResolvedValue(cardPi(u.uid, "pi_rp"));
    const r1 = await call(u.idToken, bodyFor("pi_rp"));
    const r2 = await call(u.idToken, bodyFor("pi_rp"));
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(await r2.json()).toEqual(await r1.json());
    expect(await countDocs("bookings")).toBe(1);
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
  });

  it("rejeu avec une course différente : la réservation d'origine n'est pas modifiée", async () => {
    const u = await createAuthUser(uniqueEmail("fc-replay2"));
    stripeMock.paymentIntents.retrieve.mockResolvedValue(cardPi(u.uid, "pi_rp2"));
    expect((await call(u.idToken, bodyFor("pi_rp2"))).status).toBe(200);
    const r2 = await call(u.idToken, bodyFor("pi_rp2", { bookingData: hfRide() }));
    expect(r2.status).toBe(200);
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
    expect(await countDocs("bookings")).toBe(1);
    const b = (await db().collection("bookings").doc("card_pi_rp2").get()).data()!;
    expect(b.prix).toBe(76);
    expect(b.arrivee).toBe(validRide().arrivee);
  });

  it("deux appels simultanés (même PI) -> une seule réservation ; l'autre reçoit 200 identique ou 409 IN_PROGRESS sans effet", async () => {
    const u = await createAuthUser(uniqueEmail("fc-par"));
    stripeMock.paymentIntents.retrieve.mockResolvedValue(cardPi(u.uid, "pi_par"));
    const results = await Promise.all([call(u.idToken, bodyFor("pi_par")), call(u.idToken, bodyFor("pi_par"))]);
    const bodies = await Promise.all(results.map(async (r) => ({ status: r.status, json: await r.json() })));
    expect(bodies.some((b) => b.status === 200)).toBe(true);
    for (const b of bodies) {
      if (b.status === 409) expect(b.json.code).toBe("IN_PROGRESS");
      else expect(b.json.bookingId).toBe("card_pi_par");
    }
    expect(await countDocs("bookings")).toBe(1);
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
    // Un rejeu ultérieur est toujours idempotent.
    const again = await call(u.idToken, bodyFor("pi_par"));
    expect(again.status).toBe(200);
    expect((await again.json()).bookingId).toBe("card_pi_par");
  });

  it("rejeu après capture (PI succeeded) : même bookingId restitué à son propriétaire", async () => {
    const u = await createAuthUser(uniqueEmail("fc-cap"));
    stripeMock.paymentIntents.retrieve.mockResolvedValue(cardPi(u.uid, "pi_cap"));
    const r1 = await call(u.idToken, bodyFor("pi_cap"));
    expect(r1.status).toBe(200);
    stripeMock.paymentIntents.retrieve.mockResolvedValue(cardPi(u.uid, "pi_cap", { status: "succeeded" }));
    const r2 = await call(u.idToken, bodyFor("pi_cap"));
    expect(r2.status).toBe(200);
    expect((await r2.json()).bookingId).toBe((await r1.json()).bookingId);
    expect(await countDocs("bookings")).toBe(1);
  });

  it("réservation card_<pi> existante d'un autre utilisateur -> 409 sans divulgation, document intact", async () => {
    const other = await createAuthUser(uniqueEmail("fc-other"));
    const u = await createAuthUser(uniqueEmail("fc-me"));
    await db().collection("bookings").doc("card_pi_taken").set({
      userId: other.uid,
      reservationId: "CMD-SECRET",
      email: "secret@test.dev",
      prix: 424242,
    });
    stripeMock.paymentIntents.retrieve.mockResolvedValue(cardPi(u.uid, "pi_taken"));
    const res = await call(u.idToken, bodyFor("pi_taken"));
    expect(res.status).toBe(409);
    const text = await res.text();
    for (const secret of ["CMD-SECRET", "secret@test.dev", "424242", other.uid]) expect(text).not.toContain(secret);
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
    expect(await countDocs("bookings")).toBe(1);
    const b = (await db().collection("bookings").doc("card_pi_taken").get()).data()!;
    expect(b.userId).toBe(other.uid);
    expect(b.prix).toBe(424242);
  });
});

// ================================================================ mécanismes ajoutés (aller-retour 2/2)
const claimsCol = () => db().collection("paymentClaims");
const seedClaim = (pi: string, over: Record<string, unknown>) =>
  claimsCol().doc(pi).set({
    userId: "x",
    kind: "card",
    state: "finalizing",
    requestId: "autre-requete",
    leaseUntil: Timestamp.fromMillis(Date.now() + 60_000),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...over,
  });

describe("finalize-card-booking : verrou paymentClaims/<pi>", () => {
  const call = (token: string, body: Record<string, unknown>) =>
    finalizeCard(jsonRequest("/api/finalize-card-booking", { token, body }));
  const bodyFor = (id: string, over: Record<string, unknown> = {}) => ({ paymentIntentId: id, bookingData: validRide(), ...over });

  it("verrou « en cours » d'une autre requête -> 409 IN_PROGRESS, aucun effet, cancel non appelé, holdReleased non vrai", async () => {
    const u = await createAuthUser(uniqueEmail("cl-prog"));
    stripeMock.paymentIntents.retrieve.mockResolvedValue(cardPi(u.uid, "pi_prog"));
    await seedClaim("pi_prog", { userId: u.uid });
    const res = await call(u.idToken, bodyFor("pi_prog"));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("IN_PROGRESS");
    expect(json.holdReleased).toBeFalsy();
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
    expect(await countDocs("bookings")).toBe(0);
    expect((await claimsCol().doc("pi_prog").get()).data()?.requestId).toBe("autre-requete");
  });

  it("verrou « rejeté » -> 409 PAYMENT_REJECTED, aucune création, cancel non appelé", async () => {
    const u = await createAuthUser(uniqueEmail("cl-rej"));
    stripeMock.paymentIntents.retrieve.mockResolvedValue(cardPi(u.uid, "pi_rjt"));
    await seedClaim("pi_rjt", { userId: u.uid, state: "rejected" });
    const res = await call(u.idToken, bodyFor("pi_rjt"));
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("PAYMENT_REJECTED");
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
    expect(await countDocs("bookings")).toBe(0);
  });

  it("verrou d'un autre utilisateur -> 409 CONFLICT, aucun effet", async () => {
    const u = await createAuthUser(uniqueEmail("cl-other"));
    stripeMock.paymentIntents.retrieve.mockResolvedValue(cardPi(u.uid, "pi_oth"));
    await seedClaim("pi_oth", { userId: "quelqu-un-d-autre" });
    const res = await call(u.idToken, bodyFor("pi_oth"));
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("CONFLICT");
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
    expect(await countDocs("bookings")).toBe(0);
  });

  it("verrou expiré (> 2 min) : repris, la réservation est créée et le verrou passe à « done » sous un nouveau requestId", async () => {
    const u = await createAuthUser(uniqueEmail("cl-exp"));
    stripeMock.paymentIntents.retrieve.mockResolvedValue(cardPi(u.uid, "pi_exp"));
    await seedClaim("pi_exp", { userId: u.uid, leaseUntil: Timestamp.fromMillis(Date.now() - 1000) });
    const res = await call(u.idToken, bodyFor("pi_exp"));
    expect(res.status).toBe(200);
    expect(await countDocs("bookings")).toBe(1);
    const claim = (await claimsCol().doc("pi_exp").get()).data()!;
    expect(claim.state).toBe("done");
    expect(claim.requestId).not.toBe("autre-requete");
    expect(claim.bookingId).toBe("card_pi_exp");
  });

  it("succès : verrou « done » avec bookingId et reservationId", async () => {
    const u = await createAuthUser(uniqueEmail("cl-done"));
    stripeMock.paymentIntents.retrieve.mockResolvedValue(cardPi(u.uid, "pi_done"));
    const json = await (await call(u.idToken, bodyFor("pi_done"))).json();
    const claim = (await claimsCol().doc("pi_done").get()).data()!;
    expect(claim).toMatchObject({ userId: u.uid, kind: "card", state: "done", bookingId: "card_pi_done", reservationId: json.reservationId });
  });

  it("A (bons paramètres) et B (priorité inversée) en concurrence : jamais une réservation créée ET un cancel", async () => {
    for (let i = 0; i < 6; i++) {
      await resetEmulators();
      stripeMock.paymentIntents.cancel.mockClear();
      const u = await createAuthUser(uniqueEmail("cl-race"));
      const id = `pi_race${i}`;
      stripeMock.paymentIntents.retrieve.mockResolvedValue(cardPi(u.uid, id));
      const [a, b] = await Promise.all([
        call(u.idToken, bodyFor(id)),
        call(u.idToken, bodyFor(id, { bookingData: validRide({ prioriteReservation: true }) })),
      ]);
      const bookings = await countDocs("bookings");
      const cancelled = stripeMock.paymentIntents.cancel.mock.calls.length;
      expect(bookings > 0 && cancelled > 0, `i=${i} A=${a.status} B=${b.status} bookings=${bookings} cancel=${cancelled}`).toBe(false);
      // B ne crée jamais sa propre course (96 €) : s'il reçoit 200, c'est le rejeu idempotent de A.
      if (b.status === 200) {
        expect(a.status).toBe(200);
        expect((await db().collection("bookings").doc(`card_${id}`).get()).data()?.prix).toBe(76);
      }
      expect(bookings).toBeLessThanOrEqual(1);
    }
  });
});

describe("finalize-card-booking : rejeu et réservation préexistante", () => {
  const call = (token: string, body: Record<string, unknown>) =>
    finalizeCard(jsonRequest("/api/finalize-card-booking", { token, body }));
  const bodyFor = (id: string) => ({ paymentIntentId: id, bookingData: validRide() });

  it("doc card_<pi> préexistant du même utilisateur SANS serverFinalized (planté), sans verrou -> 409 CONFLICT, doc non écrasé", async () => {
    const u = await createAuthUser(uniqueEmail("rp-plant"));
    await db().collection("bookings").doc("card_pi_plant").set({ userId: u.uid, prix: 1, paymentId: "pi_plant", reservationId: "CMD-PLANT" });
    stripeMock.paymentIntents.retrieve.mockResolvedValue(cardPi(u.uid, "pi_plant"));
    const res = await call(u.idToken, bodyFor("pi_plant"));
    expect(res.status).toBe(409);
    expect((await res.json()).bookingId).toBeUndefined();
    const b = (await db().collection("bookings").doc("card_pi_plant").get()).data()!;
    expect(b).toEqual({ userId: u.uid, prix: 1, paymentId: "pi_plant", reservationId: "CMD-PLANT" });
    expect(await countDocs("bookings")).toBe(1);
  });

  it("verrou « done » + doc sans serverFinalized (planté) -> 409 BOOKING_INCONSISTENT, doc intact, pas de succès", async () => {
    const u = await createAuthUser(uniqueEmail("rp-plant2"));
    const doc = { userId: u.uid, prix: 76, paymentId: "pi_plant2", reservationId: "CMD-PLANT" };
    await db().collection("bookings").doc("card_pi_plant2").set(doc);
    await seedClaim("pi_plant2", { userId: u.uid, state: "done", bookingId: "card_pi_plant2", reservationId: "CMD-PLANT" });
    stripeMock.paymentIntents.retrieve.mockResolvedValue(cardPi(u.uid, "pi_plant2"));
    const res = await call(u.idToken, bodyFor("pi_plant2"));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("BOOKING_INCONSISTENT");
    expect(json.bookingId).toBeUndefined();
    expect((await db().collection("bookings").doc("card_pi_plant2").get()).data()).toEqual(doc);
  });

  it("verrou « done » + doc serverFinalized mais prix ≠ PI -> 409 BOOKING_INCONSISTENT", async () => {
    const u = await createAuthUser(uniqueEmail("rp-prix"));
    await db().collection("bookings").doc("card_pi_prix").set({
      userId: u.uid, prix: 1, paymentId: "pi_prix", serverFinalized: true, reservationId: "CMD-X",
    });
    await seedClaim("pi_prix", { userId: u.uid, state: "done", bookingId: "card_pi_prix", reservationId: "CMD-X" });
    stripeMock.paymentIntents.retrieve.mockResolvedValue(cardPi(u.uid, "pi_prix"));
    const res = await call(u.idToken, bodyFor("pi_prix"));
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("BOOKING_INCONSISTENT");
  });

  it("now = pi.created : PI créé 2 h 30 avant la course, finalisé à 1 h 50 -> pas de majoration « < 2 h », succès", async () => {
    const u = await createAuthUser(uniqueEmail("rp-created"));
    const departMs = Date.now() + 110 * 60 * 1000; // il reste 1 h 50
    const created = Math.floor((departMs - 150 * 60 * 1000) / 1000); // PI créé 2 h 30 avant
    const ride = validRide({ reservationDate: new Date(departMs).toISOString() });
    const base = { depart: String(ride.depart), arrivee: String(ride.arrivee), distanceKm: 20, reservationDate: new Date(departMs), prioriteReservation: false };
    const atCreation = calculerPrixCourse(base, new Date(created * 1000));
    const atFinalization = calculerPrixCourse(base, new Date());
    expect(atCreation.majorations.some((m) => m.type.includes("moins de 2h"))).toBe(false);
    expect(atFinalization.totalCents).toBe(atCreation.totalCents + 2000); // garde-fou : l'horloge réelle ajouterait +20 €
    stripeMock.paymentIntents.retrieve.mockResolvedValue(
      cardPi(u.uid, "pi_crt", { created }, atCreation.totalCents, ride)
    );
    const res = await call(u.idToken, { paymentIntentId: "pi_crt", bookingData: ride });
    expect(res.status).toBe(200);
    const b = (await db().collection("bookings").doc("card_pi_crt").get()).data()!;
    expect(Math.round(b.prix * 100)).toBe(atCreation.totalCents);
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
  });

  it("RIDE_MISMATCH : arrivée différente de pi.metadata à prix égal -> 409, holdReleased true, cancel, aucune réservation", async () => {
    const u = await createAuthUser(uniqueEmail("rp-arr"));
    stripeMock.paymentIntents.retrieve.mockResolvedValue(cardPi(u.uid, "pi_arr"));
    const res = await call(u.idToken, {
      paymentIntentId: "pi_arr",
      bookingData: validRide({ arrivee: "Orly Sud, 94390 Orly" }),
    });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("RIDE_MISMATCH");
    expect(json.holdReleased).toBe(true);
    expect(stripeMock.paymentIntents.cancel).toHaveBeenCalledWith("pi_arr");
    expect(await countDocs("bookings")).toBe(0);
  });

  it("holdReleased : true sur PRICE_CHANGED de recalcul, false sur PRICE_CHANGED d'affichage", async () => {
    const u = await createAuthUser(uniqueEmail("rp-hr"));
    stripeMock.paymentIntents.retrieve.mockResolvedValue(cardPi(u.uid, "pi_hr1", {}, 5000));
    const recalcul = await (await call(u.idToken, bodyFor("pi_hr1"))).json();
    expect(recalcul.code).toBe("PRICE_CHANGED");
    expect(recalcul.holdReleased).toBe(true);

    stripeMock.paymentIntents.retrieve.mockResolvedValue(cardPi(u.uid, "pi_hr2"));
    const res = await call(u.idToken, { ...bodyFor("pi_hr2"), displayedTotalCents: 1234 });
    const affichage = await res.json();
    expect(res.status).toBe(409);
    expect(affichage.code).toBe("PRICE_CHANGED");
    expect(affichage.holdReleased).toBe(false);
  });
});

describe("finalize-hybrid-booking : verrou, identifiant et ledger d'un autre", () => {
  const call = (token: string, body: Record<string, unknown>) =>
    finalizeHybrid(jsonRequest("/api/wallet/finalize-hybrid-booking", { token, body }));

  it.each(["../x", "cs_123", "pi_", "card_pi_x"])("paymentIntentId %j invalide -> 400, Stripe non appelé", async (id) => {
    const u = await createAuthUser(uniqueEmail("fh-id"));
    const res = await call(u.idToken, { paymentIntentId: id, bookingData: validRide() });
    expect(res.status).toBe(400);
    expect(stripeMock.paymentIntents.retrieve).not.toHaveBeenCalled();
  });

  it("verrou « en cours » d'une autre requête -> 409 IN_PROGRESS, aucun débit, cancel non appelé", async () => {
    const u = await createAuthUser(uniqueEmail("fh-prog"));
    await seedWallet(u.uid, 10000);
    stripeMock.paymentIntents.retrieve.mockResolvedValue(hybridPi(u.uid, "pi_prog", 2000, TOTAL));
    await seedClaim("pi_prog", { userId: u.uid, kind: "hybrid" });
    const res = await call(u.idToken, { paymentIntentId: "pi_prog", bookingData: validRide() });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("IN_PROGRESS");
    expect(json.holdReleased).toBeFalsy();
    expect(await balanceOf(u.uid)).toBe(10000);
    expect(await countDocs("bookings")).toBe(0);
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
  });

  it("verrou « rejeté » -> 409 PAYMENT_REJECTED, aucun débit", async () => {
    const u = await createAuthUser(uniqueEmail("fh-rjt"));
    await seedWallet(u.uid, 10000);
    stripeMock.paymentIntents.retrieve.mockResolvedValue(hybridPi(u.uid, "pi_rjt", 2000, TOTAL));
    await seedClaim("pi_rjt", { userId: u.uid, kind: "hybrid", state: "rejected" });
    const res = await call(u.idToken, { paymentIntentId: "pi_rjt", bookingData: validRide() });
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("PAYMENT_REJECTED");
    expect(await balanceOf(u.uid)).toBe(10000);
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
  });

  it("verrou expiré : repris, débit et course créés, verrou « done »", async () => {
    const u = await createAuthUser(uniqueEmail("fh-exp"));
    await seedWallet(u.uid, 10000);
    stripeMock.paymentIntents.retrieve.mockResolvedValue(hybridPi(u.uid, "pi_exp", 2000, TOTAL));
    await seedClaim("pi_exp", { userId: u.uid, kind: "hybrid", leaseUntil: Timestamp.fromMillis(Date.now() - 1000) });
    const res = await call(u.idToken, { paymentIntentId: "pi_exp", bookingData: validRide() });
    expect(res.status).toBe(200);
    expect(await balanceOf(u.uid)).toBe(8000);
    expect((await claimsCol().doc("pi_exp").get()).data()?.state).toBe("done");
  });

  it("verrou de type « card » sur un PI hybride -> 409 CONFLICT, aucun débit", async () => {
    const u = await createAuthUser(uniqueEmail("fh-kind"));
    await seedWallet(u.uid, 10000);
    stripeMock.paymentIntents.retrieve.mockResolvedValue(hybridPi(u.uid, "pi_kind", 2000, TOTAL));
    await seedClaim("pi_kind", { userId: u.uid, kind: "card" });
    const res = await call(u.idToken, { paymentIntentId: "pi_kind", bookingData: validRide() });
    expect(res.status).toBe(409);
    expect(await balanceOf(u.uid)).toBe(10000);
  });

  it("ledger hybrid_<pi> d'un autre (CONFLICT) : 409 sans divulgation, aucun effet, PI intact ; état du verrou documenté", async () => {
    const other = await createAuthUser(uniqueEmail("fh-led-other"));
    const u = await createAuthUser(uniqueEmail("fh-led-me"));
    await seedWallet(u.uid, 10000);
    await db().collection("walletTransactions").doc("hybrid_pi_led").set({
      userId: other.uid, type: "debit", amountCents: 2000, balanceAfterCents: 424242, bookingId: "BK-SECRET", reservationId: "CMD-SECRET",
    });
    stripeMock.paymentIntents.retrieve.mockResolvedValue(hybridPi(u.uid, "pi_led", 2000, TOTAL));
    const res = await call(u.idToken, { paymentIntentId: "pi_led", bookingData: validRide() });
    expect(res.status).toBe(409);
    const text = await res.text();
    for (const secret of ["BK-SECRET", "CMD-SECRET", "424242"]) expect(text).not.toContain(secret);
    expect(await balanceOf(u.uid)).toBe(10000);
    expect(await countDocs("bookings")).toBe(0);
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
    // Comportement constaté : voir le rapport (état du verrou après ce refus).
    const claim = (await claimsCol().doc("pi_led").get()).data();
    const second = await call(u.idToken, { paymentIntentId: "pi_led", bookingData: validRide() });
    expect(second.status).toBe(409);
    expect(await countDocs("bookings")).toBe(0);
    expect(await balanceOf(u.uid)).toBe(10000);
    console.log("[doc-lock] état du verrou après CONFLICT ledger :", claim?.state ?? "(absent)", "-> 2e appel :", (await second.clone().json()).code);
  });
});

// ================================================================ send-devis
describe("send-devis : le prix de l'email est le prix serveur", () => {
  const call = (body: Record<string, unknown>) =>
    sendDevis(jsonRequest("/api/send-devis", { body: { email: "invite@test.dev", name: "Invité", reservationId: "R1", ...body } }));
  const prixEmail = () => {
    const html = emailSend.mock.calls.map((c) => String(c[0].html)).join("\n");
    return [...html.matchAll(/Prix estimé :<\/strong>\s*(?:<span[^>]*>)?\s*([\d.]+)\s*(?:<\/span>)?\s*€/g)].map((m) => m[1]);
  };

  it("prix du corps ignoré : 76.00 (forfait Paris -> Orly)", async () => {
    const res = await call({ ...validRide(), prix: 1 });
    expect(res.status).toBe(200);
    expect(emailSend).toHaveBeenCalled();
    const prices = prixEmail();
    expect(prices.length).toBeGreaterThan(0);
    for (const p of prices) expect(p).toBe("76.00");
    const html = emailSend.mock.calls.map((c) => String(c[0].html)).join("\n");
    expect(html).not.toContain("1.00€");
  });

  it("prix du corps énorme ignoré aussi", async () => {
    await call({ ...validRide(), prix: 99999 });
    for (const p of prixEmail()) expect(p).toBe("76.00");
    expect(emailSend.mock.calls.map((c) => String(c[0].html)).join("\n")).not.toContain("99999");
  });

  it("priorité et majorations incluses (priorité : 96.00)", async () => {
    await call({ ...validRide({ prioriteReservation: true }), prix: 1 });
    for (const p of prixEmail()) expect(p).toBe("96.00");
  });

  it("utilisateur connecté (email vérifié) : email client ET admin au prix serveur", async () => {
    const u = await createVerifiedAuthUser(uniqueEmail("dv-auth"));
    const res = await sendDevis(
      jsonRequest("/api/send-devis", {
        token: u.idToken,
        body: { ...validRide(), prix: 1, name: "X", reservationId: "R2" },
      })
    );
    expect(res.status).toBe(200);
    expect(emailSend).toHaveBeenCalledTimes(2);
    const prices = prixEmail();
    expect(prices).toHaveLength(2);
    for (const p of prices) expect(p).toBe("76.00");
  });

  it("hors forfait (devis seulement) : 90.00 ; coordonnées facultatives pour un devis", async () => {
    await call({ ...hfRide(noCoords), prix: 1 });
    for (const p of prixEmail()) expect(p).toBe("90.00");
  });

  it("hors forfait : distance déclarée trop courte vs coordonnées -> 400 DISTANCE_TOO_SHORT, aucun email", async () => {
    const res = await call({ ...hfRide({ distance: 2 }), prix: 1 });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("DISTANCE_TOO_SHORT");
    expect(emailSend).not.toHaveBeenCalled();
  });

  it.each([undefined, 0, -5, 251])("hors forfait : distance %s -> 400 DISTANCE_INVALID, aucun email", async (distance) => {
    const res = await call({ ...hfRide({ distance }), prix: 50 });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("DISTANCE_INVALID");
    expect(emailSend).not.toHaveBeenCalled();
  });

  it("sans adresses -> 400, aucun email", async () => {
    const res = await call({ prix: 76 });
    expect(res.status).toBe(400);
    expect(emailSend).not.toHaveBeenCalled();
  });
});
