// Lot 2.1 (SENSIBLE) : pool des chauffeurs sans données personnelles (`ridePool`) et
// actions chauffeur / admin passées par le serveur. Couvre : /api/rides/{accept|start|
// complete|release}, /api/admin/booking, reconcileRidePool, et la synchronisation du pool
// sur les chemins de paiement (finalize-card-booking, webhook Stripe).
// Admin SDK + émulateurs Firestore/Auth `demo-izymoto` ; Stripe et Resend mockés.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Timestamp } from "firebase-admin/firestore";

const stripeMock = vi.hoisted(() => ({
  paymentIntents: { create: vi.fn(), retrieve: vi.fn(), cancel: vi.fn() },
  webhooks: { constructEvent: vi.fn() },
}));

vi.mock("@/lib/stripe-server", () => ({ stripe: stripeMock }));
vi.mock("@/lib/emails/reviewRequestEmail", () => ({ sendReviewRequestEmail: vi.fn() }));
vi.mock("@/lib/payments/deferredHold", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/payments/deferredHold")>()),
  isDeferredHold: () => false,
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: vi.fn().mockResolvedValue({ data: { id: "email_test" }, error: null }) };
  },
}));

import { POST as ridesRoute } from "@/app/api/rides/[action]/route";
import { POST as adminBookingRoute } from "@/app/api/admin/booking/route";
import { POST as finalizeCard } from "@/app/api/finalize-card-booking/route";
import { POST as webhook } from "@/app/api/webhooks/stripe/route";
import { getAdminFirestore } from "@/lib/firebase/admin-server";
import { reconcileRidePool, refreshRidePool, zoneLabel } from "@/lib/rides/pool";
import {
  createAuthUser,
  jsonRequest,
  piCreatedNow,
  resetEmulators,
  rideMeta,
  seedUserDoc,
  validRide,
  VALID_RIDE_TOTAL_CENTS,
} from "./helpers";

const db = () => getAdminFirestore();

let n = 0;
const uniqueEmail = (p: string) => `${p}-${++n}@test.dev`;

const POOL_KEYS = [
  "arriveeZone", "bookingId", "createdAt", "departZone", "distance", "driverShareCents", "duree",
  "prioriteReservation", "prix", "reservationDate", "reservationId", "updatedAt",
].sort();

const PII = {
  name: "Jean Dupont",
  phone: "+33612345678",
  email: "jean.dupont@test.dev",
  notes: "Code porte 4567, sonner chez Dupont",
  depart: "10 Rue de Rivoli, 75001 Paris",
  arrivee: "Aéroport d'Orly, 94390 Orly",
};

interface Driver {
  uid: string;
  token: string;
}

async function mkDriver(
  label: string,
  over: { status?: string; availability?: string; noDoc?: boolean } = {}
): Promise<Driver> {
  const u = await createAuthUser(uniqueEmail(label));
  await seedUserDoc(u.uid, { email: u.email, isAdmin: false, role: "driver" });
  if (!over.noDoc) {
    await db().collection("drivers").doc(u.uid).set({
      uid: u.uid,
      status: over.status ?? "active",
      availability: over.availability ?? "online",
    });
  }
  return { uid: u.uid, token: u.idToken };
}

async function mkAdmin() {
  const u = await createAuthUser(uniqueEmail("admin"));
  await seedUserDoc(u.uid, { email: u.email, isAdmin: true });
  return { uid: u.uid, token: u.idToken };
}

// Course à prendre (avec données personnelles), déjà synchronisée dans le pool.
async function seedWaiting(id: string, over: Record<string, unknown> = {}, sync = true) {
  await db().collection("bookings").doc(id).set({
    userId: "passager-1",
    status: "awaiting_driver",
    paymentStatus: "authorized",
    prix: 80,
    distance: 20,
    duree: 35,
    reservationId: `CMD-${id}`,
    prioriteReservation: false,
    reservationDate: Timestamp.fromDate(new Date("2026-12-01T10:00:00Z")),
    createdAt: Timestamp.now(),
    ...PII,
    ...over,
  });
  if (sync) await refreshRidePool(id);
}

const poolDoc = async (id: string) => db().collection("ridePool").doc(id).get();
const booking = async (id: string) => (await db().collection("bookings").doc(id).get()).data()!;

const ride = (action: string, token: string | undefined, body: Record<string, unknown>) =>
  ridesRoute(jsonRequest(`/api/rides/${action}`, { token, body }), { params: { action } });
const adminBooking = (token: string | undefined, body: Record<string, unknown>) =>
  adminBookingRoute(jsonRequest("/api/admin/booking", { token, body }));

beforeEach(async () => {
  await resetEmulators();
  for (const fn of Object.values(stripeMock.paymentIntents)) fn.mockReset();
  stripeMock.webhooks.constructEvent.mockReset();
  stripeMock.paymentIntents.cancel.mockResolvedValue({ id: "pi_x", status: "canceled" });
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_dummy";
});

// ================================================================ authentification
describe("/api/rides/* : authentification et validation", () => {
  it("sans jeton -> 401 pour chaque action, aucune course modifiée, pool inchangé", async () => {
    await seedWaiting("b1");
    for (const action of ["accept", "start", "complete", "release"]) {
      const res = await ride(action, undefined, { bookingId: "b1", reason: "x" });
      expect(res.status, action).toBe(401);
    }
    expect((await booking("b1")).status).toBe("awaiting_driver");
    expect((await poolDoc("b1")).exists).toBe(true);
  });

  it("jeton invalide -> 401", async () => {
    await seedWaiting("b1");
    expect((await ride("accept", "jeton.invalide", { bookingId: "b1" })).status).toBe(401);
    expect((await booking("b1")).driverId).toBeUndefined();
  });

  it("action inconnue -> 404", async () => {
    const d = await mkDriver("unk");
    expect((await ride("delete", d.token, { bookingId: "b1" })).status).toBe(404);
  });

  it("bookingId absent ou de format invalide -> 400 INVALID_BOOKING", async () => {
    const d = await mkDriver("inv");
    for (const bookingId of [undefined, 42, "", "a/b", "../x", "x".repeat(201)]) {
      const res = await ride("accept", d.token, { bookingId });
      expect(res.status, String(bookingId)).toBe(400);
      expect((await res.json()).code).toBe("INVALID_BOOKING");
    }
  });

  it("course inexistante -> 404 NOT_FOUND", async () => {
    const d = await mkDriver("nf");
    const res = await ride("accept", d.token, { bookingId: "absente" });
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe("NOT_FOUND");
  });
});

// ================================================================ accept
describe("/api/rides/accept", () => {
  it("chauffeur validé et en service : course assignée, pool retiré dans la même opération", async () => {
    const d = await mkDriver("ok");
    await seedWaiting("b1");
    expect((await poolDoc("b1")).exists).toBe(true); // présent avant
    const res = await ride("accept", d.token, { bookingId: "b1" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "assigned" });
    const b = await booking("b1");
    expect(b.status).toBe("assigned");
    expect(b.driverId).toBe(d.uid);
    expect(b.driverAcceptedAt).toBeTruthy();
    expect(b.commissionRate).toBe(0.2);
    expect((await poolDoc("b1")).exists).toBe(false); // absent après
  });

  it("parts 80/20 calculées par le serveur : 80 € -> 1600 / 6400", async () => {
    const d = await mkDriver("p80");
    await seedWaiting("b1", { prix: 80 });
    await ride("accept", d.token, { bookingId: "b1" });
    const b = await booking("b1");
    expect(b.platformShareCents).toBe(1600);
    expect(b.driverShareCents).toBe(6400);
  });

  it("prix à décimales 79,99 € -> parts entières 1600 + 6399 = 7999", async () => {
    const d = await mkDriver("p7999");
    await seedWaiting("b1", { prix: 79.99 });
    expect((await poolDoc("b1")).data()?.driverShareCents).toBe(6399); // part annoncée au pool
    await ride("accept", d.token, { bookingId: "b1" });
    const b = await booking("b1");
    expect(b.platformShareCents).toBe(1600);
    expect(b.driverShareCents).toBe(6399);
    expect(b.platformShareCents + b.driverShareCents).toBe(7999);
    expect(Number.isInteger(b.platformShareCents)).toBe(true);
    expect(Number.isInteger(b.driverShareCents)).toBe(true);
  });

  it("champs injectés dans le corps (driverId, prix, parts, statut) ignorés ; le chauffeur est celui du jeton", async () => {
    const d = await mkDriver("inj");
    await seedWaiting("b1", { prix: 80 });
    const res = await ride("accept", d.token, {
      bookingId: "b1",
      driverId: "autre-chauffeur",
      uid: "autre-chauffeur",
      prix: 1,
      driverShareCents: 7999,
      platformShareCents: 1,
      status: "completed",
    });
    expect(res.status).toBe(200);
    const b = await booking("b1");
    expect(b.driverId).toBe(d.uid);
    expect(b.prix).toBe(80);
    expect(b.driverShareCents).toBe(6400);
    expect(b.platformShareCents).toBe(1600);
    expect(b.status).toBe("assigned");
  });

  it("chauffeur validé mais HORS service -> 409 DRIVER_OFFLINE, course et pool intacts", async () => {
    const d = await mkDriver("off", { availability: "offline" });
    await seedWaiting("b1");
    const res = await ride("accept", d.token, { bookingId: "b1" });
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("DRIVER_OFFLINE");
    expect((await booking("b1")).driverId).toBeUndefined();
    expect((await poolDoc("b1")).exists).toBe(true);
  });

  it.each(["pending", "suspended", "rejected"])("chauffeur au statut %s -> 403 DRIVER_NOT_ACTIVE", async (status) => {
    const d = await mkDriver("na", { status });
    await seedWaiting("b1");
    const res = await ride("accept", d.token, { bookingId: "b1" });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("DRIVER_NOT_ACTIVE");
    expect((await booking("b1")).status).toBe("awaiting_driver");
    expect((await poolDoc("b1")).exists).toBe(true);
  });

  it("compte sans fiche chauffeur (client) -> 403 DRIVER_NOT_ACTIVE", async () => {
    const c = await mkDriver("client", { noDoc: true });
    await seedWaiting("b1");
    const res = await ride("accept", c.token, { bookingId: "b1" });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("DRIVER_NOT_ACTIVE");
  });

  it("sa propre course (D-003) -> 403 OWN_RIDE, rien ne change", async () => {
    const d = await mkDriver("own");
    await seedWaiting("b1", { userId: d.uid });
    const res = await ride("accept", d.token, { bookingId: "b1" });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("OWN_RIDE");
    expect((await booking("b1")).status).toBe("awaiting_driver");
    expect((await poolDoc("b1")).exists).toBe(true);
  });

  it.each([
    ["+33612345678", "0612345678"],
    ["06 12 34 56 78", "+33 6 12 34 56 78"],
    ["0033612345678", "+33612345678"],
  ])("téléphone de la réservation = celui du chauffeur (%s / %s) -> 403 OWN_RIDE", async (ridePhone, driverPhone) => {
    const d = await mkDriver("ownphone");
    await db().collection("drivers").doc(d.uid).update({ phone: driverPhone });
    await seedWaiting("b1", { phone: ridePhone });
    const res = await ride("accept", d.token, { bookingId: "b1" });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("OWN_RIDE");
    expect((await booking("b1")).status).toBe("awaiting_driver");
    expect((await poolDoc("b1")).exists).toBe(true);
  });

  it("téléphones différents -> accepté", async () => {
    const d = await mkDriver("diffphone");
    await db().collection("drivers").doc(d.uid).update({ phone: "+33698765432" });
    await seedWaiting("b1", { phone: "+33612345678" });
    expect((await ride("accept", d.token, { bookingId: "b1" })).status).toBe(200);
  });

  it("course déjà prise -> 409 ALREADY_TAKEN, le premier chauffeur reste assigné", async () => {
    const d1 = await mkDriver("t1");
    const d2 = await mkDriver("t2");
    await seedWaiting("b1");
    expect((await ride("accept", d1.token, { bookingId: "b1" })).status).toBe(200);
    const res = await ride("accept", d2.token, { bookingId: "b1" });
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("ALREADY_TAKEN");
    expect((await booking("b1")).driverId).toBe(d1.uid);
  });

  it("le même chauffeur qui ré-accepte -> 409 ALREADY_TAKEN (pas de double effet)", async () => {
    const d = await mkDriver("twice");
    await seedWaiting("b1");
    await ride("accept", d.token, { bookingId: "b1" });
    const first = await booking("b1");
    const res = await ride("accept", d.token, { bookingId: "b1" });
    expect(res.status).toBe(409);
    expect((await booking("b1")).driverAcceptedAt).toEqual(first.driverAcceptedAt);
  });

  it.each(["failed", "released"])("paymentStatus %s -> 409 NOT_AVAILABLE, course non assignée", async (paymentStatus) => {
    const d = await mkDriver("pay");
    await seedWaiting("b1", { paymentStatus }, false);
    const res = await ride("accept", d.token, { bookingId: "b1" });
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("NOT_AVAILABLE");
    expect((await booking("b1")).driverId).toBeUndefined();
    expect((await poolDoc("b1")).exists).toBe(false);
  });

  it("course qui n'est plus awaiting_driver (cancelled) -> 409 ALREADY_TAKEN", async () => {
    const d = await mkDriver("canc");
    await seedWaiting("b1", { status: "cancelled" }, false);
    const res = await ride("accept", d.token, { bookingId: "b1" });
    expect(res.status).toBe(409);
    expect((await booking("b1")).status).toBe("cancelled");
  });

  it("deux accept simultanés de deux chauffeurs -> un seul gagnant", async () => {
    const d1 = await mkDriver("race1");
    const d2 = await mkDriver("race2");
    await seedWaiting("b1");
    const [r1, r2] = await Promise.all([
      ride("accept", d1.token, { bookingId: "b1" }),
      ride("accept", d2.token, { bookingId: "b1" }),
    ]);
    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([200, 409]);
    const winner = r1.status === 200 ? d1 : d2;
    const loser = r1.status === 200 ? r2 : r1;
    expect((await loser.json()).code).toBe("ALREADY_TAKEN");
    const b = await booking("b1");
    expect(b.driverId).toBe(winner.uid);
    expect(b.status).toBe("assigned");
    expect((await poolDoc("b1")).exists).toBe(false);
  });

  it("plusieurs accept simultanés (5 chauffeurs) -> exactement un 200", async () => {
    const drivers = await Promise.all([1, 2, 3, 4, 5].map((i) => mkDriver(`multi${i}`)));
    await seedWaiting("b1");
    const results = await Promise.all(drivers.map((d) => ride("accept", d.token, { bookingId: "b1" })));
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(4);
  });
});

// ================================================================ start / complete / release
describe("/api/rides/start, complete, release", () => {
  async function assigned(d: Driver, id = "b1", over: Record<string, unknown> = {}) {
    await seedWaiting(id, over);
    expect((await ride("accept", d.token, { bookingId: id })).status).toBe(200);
  }

  it("start : assigned -> in_progress, pool toujours absent", async () => {
    const d = await mkDriver("st");
    await assigned(d);
    const res = await ride("start", d.token, { bookingId: "b1" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "in_progress" });
    const b = await booking("b1");
    expect(b.status).toBe("in_progress");
    expect(b.driverStartedAt).toBeTruthy();
    expect((await poolDoc("b1")).exists).toBe(false);
  });

  it("start : pas dans le bon état (déjà in_progress) -> 409 BAD_STATE", async () => {
    const d = await mkDriver("st2");
    await assigned(d);
    await ride("start", d.token, { bookingId: "b1" });
    const res = await ride("start", d.token, { bookingId: "b1" });
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("BAD_STATE");
  });

  it("complete : depuis in_progress -> completed_by_driver", async () => {
    const d = await mkDriver("co");
    await assigned(d);
    await ride("start", d.token, { bookingId: "b1" });
    const res = await ride("complete", d.token, { bookingId: "b1" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "completed_by_driver" });
    const b = await booking("b1");
    expect(b.status).toBe("completed_by_driver");
    expect(b.driverCompletedAt).toBeTruthy();
    expect((await poolDoc("b1")).exists).toBe(false);
  });

  it("complete : depuis assigned (sans démarrage) autorisé", async () => {
    const d = await mkDriver("co2");
    await assigned(d);
    expect((await ride("complete", d.token, { bookingId: "b1" })).status).toBe(200);
    expect((await booking("b1")).status).toBe("completed_by_driver");
  });

  it("complete : déjà terminée -> 409 BAD_STATE", async () => {
    const d = await mkDriver("co3");
    await assigned(d);
    await ride("complete", d.token, { bookingId: "b1" });
    const res = await ride("complete", d.token, { bookingId: "b1" });
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("BAD_STATE");
  });

  it("release : retour dans le pool (présent), driverId vidé, parts supprimées, motif enregistré", async () => {
    const d = await mkDriver("re");
    await assigned(d);
    expect((await poolDoc("b1")).exists).toBe(false);
    const res = await ride("release", d.token, { bookingId: "b1", reason: "  Panne de moto  " });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "awaiting_driver" });
    const b = await booking("b1");
    expect(b.status).toBe("awaiting_driver");
    expect(b.driverId).toBeNull();
    expect(b.driverAcceptedAt).toBeNull();
    expect(b.driverReleaseReason).toBeUndefined(); // le passager lit sa réservation : motif en audit seulement
    const logs = (await db().collection("auditLogs").where("action", "==", "ride.release").get()).docs.map((x) => x.data());
    expect(logs).toHaveLength(1);
    expect(logs[0].details).toEqual({ reason: "Panne de moto" });
    expect(b.commissionRate).toBeUndefined();
    expect(b.platformShareCents).toBeUndefined();
    expect(b.driverShareCents).toBeUndefined();
    const p = await poolDoc("b1");
    expect(p.exists).toBe(true);
    expect(p.data()!.driverShareCents).toBe(6400);
  });

  it("release : un autre chauffeur peut ensuite accepter la course libérée", async () => {
    const d1 = await mkDriver("re1");
    const d2 = await mkDriver("re2");
    await assigned(d1);
    await ride("release", d1.token, { bookingId: "b1", reason: "imprévu" });
    expect((await ride("accept", d2.token, { bookingId: "b1" })).status).toBe(200);
    expect((await booking("b1")).driverId).toBe(d2.uid);
  });

  it("release sans motif (absent, vide, espaces, non-chaîne) -> 400 REASON_REQUIRED, rien ne change", async () => {
    const d = await mkDriver("re3");
    await assigned(d);
    for (const reason of [undefined, "", "   ", 42]) {
      const res = await ride("release", d.token, { bookingId: "b1", reason });
      expect(res.status, String(reason)).toBe(400);
      expect((await res.json()).code).toBe("REASON_REQUIRED");
    }
    const b = await booking("b1");
    expect(b.status).toBe("assigned");
    expect(b.driverId).toBe(d.uid);
    expect((await poolDoc("b1")).exists).toBe(false);
  });

  it("release : motif tronqué à 500 caractères", async () => {
    const d = await mkDriver("re4");
    await assigned(d);
    await ride("release", d.token, { bookingId: "b1", reason: "x".repeat(900) });
    const logs = (await db().collection("auditLogs").where("action", "==", "ride.release").get()).docs;
    expect(logs[0].data().details.reason).toHaveLength(500);
  });

  it("release d'une course déjà démarrée -> 409 BAD_STATE, reste in_progress", async () => {
    const d = await mkDriver("re5");
    await assigned(d);
    await ride("start", d.token, { bookingId: "b1" });
    const res = await ride("release", d.token, { bookingId: "b1", reason: "x" });
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("BAD_STATE");
    expect((await booking("b1")).status).toBe("in_progress");
    expect((await poolDoc("b1")).exists).toBe(false);
  });

  it.each(["start", "complete", "release"])("%s sur la course d'un autre chauffeur -> 403 NOT_YOUR_RIDE", async (action) => {
    const owner = await mkDriver("own-a");
    const other = await mkDriver("own-b");
    await assigned(owner);
    const res = await ride(action, other.token, { bookingId: "b1", reason: "x" });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("NOT_YOUR_RIDE");
    const b = await booking("b1");
    expect(b.status).toBe("assigned");
    expect(b.driverId).toBe(owner.uid);
  });

  it.each(["start", "complete", "release"])("%s sur une course non assignée -> 403, pool intact", async (action) => {
    const d = await mkDriver("na-a");
    await seedWaiting("b1");
    const res = await ride(action, d.token, { bookingId: "b1", reason: "x" });
    expect(res.status).toBe(403);
    expect((await booking("b1")).status).toBe("awaiting_driver");
    expect((await poolDoc("b1")).exists).toBe(true);
  });

  it("chauffeur suspendu après acceptation : ne peut plus démarrer ni libérer (403 DRIVER_NOT_ACTIVE)", async () => {
    const d = await mkDriver("susp");
    await assigned(d);
    await db().collection("drivers").doc(d.uid).update({ status: "suspended" });
    for (const action of ["start", "complete", "release"]) {
      const res = await ride(action, d.token, { bookingId: "b1", reason: "x" });
      expect(res.status, action).toBe(403);
      expect((await res.json()).code).toBe("DRIVER_NOT_ACTIVE");
    }
    expect((await booking("b1")).status).toBe("assigned");
  });
});

// ================================================================ journal d'audit
describe("auditLogs : une entrée par action réussie", () => {
  it("accept / start / complete / release journalisés avec acteur, rôle, course et date", async () => {
    const d = await mkDriver("aud");
    await seedWaiting("b1");
    await ride("accept", d.token, { bookingId: "b1" });
    await ride("start", d.token, { bookingId: "b1" });
    await ride("complete", d.token, { bookingId: "b1" });
    await seedWaiting("b2");
    await ride("accept", d.token, { bookingId: "b2" });
    await ride("release", d.token, { bookingId: "b2", reason: "imprévu" });
    const logs = (await db().collection("auditLogs").get()).docs.map((x) => x.data());
    expect(logs.map((l) => l.action).sort()).toEqual(["ride.accept", "ride.accept", "ride.complete", "ride.release", "ride.start"]);
    for (const l of logs) {
      expect(l.actorUid).toBe(d.uid);
      expect(l.actorRole).toBe("driver");
      expect(["b1", "b2"]).toContain(l.bookingId);
      expect(l.at).toBeInstanceOf(Timestamp);
    }
  });

  it("action refusée -> aucune entrée d'audit", async () => {
    const d = await mkDriver("aud2", { availability: "offline" });
    await seedWaiting("b1");
    await ride("accept", d.token, { bookingId: "b1" });
    expect((await db().collection("auditLogs").get()).size).toBe(0);
  });

  it("admin : booking.status et booking.delete journalisés avec l'uid de l'admin", async () => {
    const a = await mkAdmin();
    await seedWaiting("b1", { paymentStatus: "pending" });
    await seedWaiting("b2", { paymentStatus: "pending" });
    await adminBooking(a.token, { bookingId: "b1", status: "cancelled" });
    await adminBooking(a.token, { bookingId: "b2", action: "delete" });
    const logs = (await db().collection("auditLogs").get()).docs.map((x) => x.data());
    expect(logs.map((l) => l.action).sort()).toEqual(["booking.delete", "booking.status"]);
    for (const l of logs) {
      expect(l.actorUid).toBe(a.uid);
      expect(l.actorRole).toBe("admin");
      expect(l.at).toBeInstanceOf(Timestamp);
    }
    expect(logs.find((l) => l.action === "booking.status")!.details).toMatchObject({ from: "awaiting_driver", to: "cancelled" });
  });
});

// ================================================================ historique du chauffeur
const HISTORY_KEYS = [
  "arriveeZone", "bookingId", "createdAt", "departZone", "driverShareCents", "paymentStatus",
  "prix", "reservationDate", "reservationId", "status", "updatedAt",
].sort();
const historyDoc = (driverUid: string, id: string) =>
  db().collection("driverRides").doc(driverUid).collection("rides").doc(id).get();

describe("driverRides : historique réduit du chauffeur, sans donnée personnelle", () => {
  function expectNoPii(data: Record<string, unknown>) {
    expect(Object.keys(data).sort()).toEqual(HISTORY_KEYS);
    for (const forbidden of ["name", "phone", "email", "notes", "depart", "arrivee", "userId", "driverId"]) {
      expect(data, forbidden).not.toHaveProperty(forbidden);
    }
    const dump = JSON.stringify(data);
    for (const secret of ["Jean", "Dupont", "612345678", "jean.dupont@test.dev", "4567", "Rivoli", "passager-1"]) {
      expect(dump, secret).not.toContain(secret);
    }
  }

  it("accept : l'entrée est créée chez le chauffeur (assigned), contenu réduit et exact", async () => {
    const d = await mkDriver("h1");
    await seedWaiting("b1");
    expect((await historyDoc(d.uid, "b1")).exists).toBe(false);
    await ride("accept", d.token, { bookingId: "b1" });
    const h = await historyDoc(d.uid, "b1");
    expect(h.exists).toBe(true);
    const data = h.data()!;
    expectNoPii(data);
    expect(data.status).toBe("assigned");
    expect(data.departZone).toBe("Paris 1er");
    expect(data.arriveeZone).toBe("Aéroport d'Orly");
    expect(data.prix).toBe(80);
    expect(data.driverShareCents).toBe(6400);
    expect(data.reservationDate).toBeInstanceOf(Timestamp);
  });

  it("start puis complete : le statut de l'historique suit", async () => {
    const d = await mkDriver("h2");
    await seedWaiting("b1");
    await ride("accept", d.token, { bookingId: "b1" });
    await ride("start", d.token, { bookingId: "b1" });
    expect((await historyDoc(d.uid, "b1")).data()!.status).toBe("in_progress");
    await ride("complete", d.token, { bookingId: "b1" });
    const data = (await historyDoc(d.uid, "b1")).data()!;
    expect(data.status).toBe("completed_by_driver");
    expectNoPii(data);
  });

  it("release : l'entrée est supprimée chez ce chauffeur, l'autre chauffeur n'est pas touché", async () => {
    const d1 = await mkDriver("h3a");
    const d2 = await mkDriver("h3b");
    await seedWaiting("b1");
    await seedWaiting("b2");
    await ride("accept", d1.token, { bookingId: "b1" });
    await ride("accept", d2.token, { bookingId: "b2" });
    await ride("release", d1.token, { bookingId: "b1", reason: "imprévu" });
    expect((await historyDoc(d1.uid, "b1")).exists).toBe(false);
    expect((await historyDoc(d2.uid, "b2")).exists).toBe(true);
    // un autre chauffeur la reprend : l'entrée est chez lui, pas chez le premier
    await ride("accept", d2.token, { bookingId: "b1" });
    expect((await historyDoc(d2.uid, "b1")).exists).toBe(true);
    expect((await historyDoc(d1.uid, "b1")).exists).toBe(false);
  });

  it("action refusée : aucune entrée d'historique", async () => {
    const d = await mkDriver("h4", { availability: "offline" });
    await seedWaiting("b1");
    await ride("accept", d.token, { bookingId: "b1" });
    expect((await historyDoc(d.uid, "b1")).exists).toBe(false);
  });

  it("suppression admin : l'entrée du chauffeur est supprimée", async () => {
    const d = await mkDriver("h5");
    const a = await mkAdmin();
    await seedWaiting("b1");
    await ride("accept", d.token, { bookingId: "b1" });
    await db().collection("bookings").doc("b1").update({ paymentStatus: "pending" });
    expect((await adminBooking(a.token, { bookingId: "b1", action: "delete" })).status).toBe(200);
    expect((await historyDoc(d.uid, "b1")).exists).toBe(false);
  });

  it("statut admin : l'historique suit (completed)", async () => {
    const d = await mkDriver("h6");
    const a = await mkAdmin();
    await seedWaiting("b1");
    await ride("accept", d.token, { bookingId: "b1" });
    await db().collection("bookings").doc("b1").update({ paymentStatus: "pending" });
    await adminBooking(a.token, { bookingId: "b1", status: "completed" });
    expect((await historyDoc(d.uid, "b1")).data()!.status).toBe("completed");
  });

  it("webhook succeeded puis canceled : le statut est mis à jour dans l'historique", async () => {
    const d = await mkDriver("h7");
    await seedWaiting("b1", { paymentId: "pi_h", email: "" });
    await seedWaiting("b2", { paymentId: "pi_h2", email: "" });
    await ride("accept", d.token, { bookingId: "b1" });
    await ride("accept", d.token, { bookingId: "b2" });
    const send = (type: string, object: Record<string, unknown>) => {
      const event = { id: `evt_${type}_${object.id}`, type, data: { object } };
      stripeMock.webhooks.constructEvent.mockReturnValue(event);
      return webhook(
        new Request("http://localhost/api/webhooks/stripe", {
          method: "POST",
          headers: { "stripe-signature": "t=1,v1=mockee" },
          body: JSON.stringify(event),
        })
      );
    };
    expect((await send("payment_intent.succeeded", { id: "pi_h", amount_received: 8000, metadata: {} })).status).toBe(200);
    let h = (await historyDoc(d.uid, "b1")).data()!;
    expect(h.status).toBe("completed");
    expect(h.paymentStatus).toBe("captured");
    expect((await send("payment_intent.canceled", { id: "pi_h2", metadata: {} })).status).toBe(200);
    h = (await historyDoc(d.uid, "b2")).data()!;
    expect(h.status).toBe("cancelled");
    expect(h.paymentStatus).toBe("released");
    expectNoPii(h);
  });

  it("reconcileRidePool({ backfillHistory }) crée l'historique manquant de toute course qui a un driverId ; pas la réconciliation quotidienne", async () => {
    await seedWaiting("assignee", { status: "assigned", driverId: "chauffeur-x" }, false);
    await seedWaiting("terminee", { status: "completed", driverId: "chauffeur-y" }, false);
    await seedWaiting("libre", {}, false);
    await reconcileRidePool();
    expect((await db().collectionGroup("rides").get()).size).toBe(0);
    await reconcileRidePool({ backfillHistory: true });
    const x = await historyDoc("chauffeur-x", "assignee");
    expect(x.exists).toBe(true);
    expectNoPii(x.data()!);
    expect((await historyDoc("chauffeur-y", "terminee")).exists).toBe(true);
    expect((await db().collectionGroup("rides").get()).size).toBe(2);
  });
});

// ================================================================ contenu du pool
describe("ridePool : aucune donnée personnelle", () => {
  it("liste blanche exacte des champs ; aucun nom, téléphone, e-mail, notes, adresse exacte ni userId", async () => {
    await seedWaiting("b1", { distance: 20, duree: 35, prioriteReservation: true });
    const data = (await poolDoc("b1")).data()!;
    expect(Object.keys(data).sort()).toEqual(POOL_KEYS);
    for (const forbidden of ["name", "phone", "email", "notes", "depart", "arrivee", "userId", "paymentId", "driverId"]) {
      expect(data, forbidden).not.toHaveProperty(forbidden);
    }
    const dump = JSON.stringify(data);
    for (const secret of ["Jean", "Dupont", "612345678", "jean.dupont@test.dev", "4567", "Rivoli", "passager-1"]) {
      expect(dump, secret).not.toContain(secret);
    }
    expect(data.bookingId).toBe("b1");
    expect(data.reservationId).toBe("CMD-b1");
    expect(data.prix).toBe(80);
    expect(data.driverShareCents).toBe(6400);
    expect(data.distance).toBe(20);
    expect(data.duree).toBe(35);
    expect(data.prioriteReservation).toBe(true);
  });

  it("champs inconnus ajoutés sur la course (même sensibles) ne passent pas dans le pool", async () => {
    await seedWaiting("b1", { iban: "FR76 0000", clientSecret: "cs_secret", companyId: "c1", paymentId: "pi_1" });
    const data = (await poolDoc("b1")).data()!;
    expect(Object.keys(data).sort()).toEqual(POOL_KEYS);
  });

  it.each([
    ["10 Rue de Rivoli, 75001 Paris", "Paris 1er"],
    ["25 Rue de Ponthieu, 75008 Paris", "Paris 8e"],
    ["5 Avenue Foch, 75116 Paris", "Paris 16e"],
    ["Aéroport d'Orly, 94390 Orly", "Aéroport d'Orly"],
    ["12 Rue Victor Hugo, 92100 Boulogne-Billancourt", "Hauts-de-Seine (92)"],
    ["3 Avenue de la République, 93100 Montreuil", "Seine-Saint-Denis (93)"],
    ["93200 Saint-Denis 12 rue de la République", "Seine-Saint-Denis (93)"],
    ["1 rue X, 92100 Boulogne chez M. Dupont tél 0612345678", "Hauts-de-Seine (92)"],
    ["2 rue Y, 95100 Argenteuil", "Val-d'Oise (95)"],
    ["4 rue Z, 60200 Compiègne", "Oise (60)"],
    ["4 rue Z, 69001 Lyon", "Hors Île-de-France"],
    ["4 rue Z, 75001 Paris puis 92100 Boulogne", "Zone non précisée"],
  ])("zone de %s -> %s", async (adresse, attendu) => {
    expect(zoneLabel(adresse)).toBe(attendu);
    await seedWaiting("bz", { depart: adresse });
    const data = (await poolDoc("bz")).data()!;
    expect(data.departZone).toBe(attendu);
    expect(JSON.stringify(data)).not.toMatch(/rue|Rue|Avenue|Dupont|0612345678|Compiègne|Argenteuil|Boulogne|Lyon/);
  });

  it("reservationDate du pool est un Timestamp, même si la réservation porte une chaîne ISO (course portefeuille)", async () => {
    await seedWaiting("bi", { reservationDate: "2026-12-01T10:00:00.000Z" });
    const d = (await poolDoc("bi")).data()!.reservationDate;
    expect(d).toBeInstanceOf(Timestamp);
    expect(d.toDate().toISOString()).toBe("2026-12-01T10:00:00.000Z");
    await seedWaiting("bt");
    expect((await poolDoc("bt")).data()!.reservationDate).toBeInstanceOf(Timestamp);
  });

  it("départ Paris 1er et arrivée Orly dans une même entrée", async () => {
    await seedWaiting("b1");
    const data = (await poolDoc("b1")).data()!;
    expect(data.departZone).toBe("Paris 1er");
    expect(data.arriveeZone).toBe("Aéroport d'Orly");
  });

  it("adresse absente ou sans code postal -> zone non précisée (jamais l'adresse)", async () => {
    expect(zoneLabel(undefined)).toBe("Zone non précisée");
    expect(zoneLabel("")).toBe("Zone non précisée");
    expect(zoneLabel("quelque part")).toBe("Zone non précisée");
  });
});

// ================================================================ admin
describe("/api/admin/booking", () => {
  it("sans jeton -> 401", async () => {
    await seedWaiting("b1", { paymentStatus: "pending" });
    expect((await adminBooking(undefined, { bookingId: "b1", status: "cancelled" })).status).toBe(401);
    expect((await booking("b1")).status).toBe("awaiting_driver");
  });

  it("non-admin (chauffeur validé) -> 403, course et pool intacts", async () => {
    const d = await mkDriver("nonadmin");
    await seedWaiting("b1", { paymentStatus: "pending" });
    for (const body of [{ bookingId: "b1", status: "cancelled" }, { bookingId: "b1", action: "delete" }]) {
      expect((await adminBooking(d.token, body)).status).toBe(403);
    }
    expect((await booking("b1")).status).toBe("awaiting_driver");
    expect((await poolDoc("b1")).exists).toBe(true);
  });

  it("admin : statut cancelled -> course annulée et retirée du pool", async () => {
    const a = await mkAdmin();
    await seedWaiting("b1", { paymentStatus: "pending" });
    expect((await poolDoc("b1")).exists).toBe(true);
    const res = await adminBooking(a.token, { bookingId: "b1", status: "cancelled" });
    expect(res.status).toBe(200);
    expect((await booking("b1")).status).toBe("cancelled");
    expect((await poolDoc("b1")).exists).toBe(false);
  });

  it("admin : statut confirmed sur une course attendant un chauffeur -> retirée du pool", async () => {
    const a = await mkAdmin();
    await seedWaiting("b1", { paymentStatus: "pending" });
    expect((await adminBooking(a.token, { bookingId: "b1", status: "confirmed" })).status).toBe(200);
    expect((await poolDoc("b1")).exists).toBe(false);
  });

  it("admin : supprimer -> course supprimée et retirée du pool", async () => {
    const a = await mkAdmin();
    await seedWaiting("b1", { paymentStatus: "pending" });
    const res = await adminBooking(a.token, { bookingId: "b1", action: "delete" });
    expect(res.status).toBe(200);
    expect((await db().collection("bookings").doc("b1").get()).exists).toBe(false);
    expect((await poolDoc("b1")).exists).toBe(false);
  });

  it.each(["awaiting_driver", "assigned", "in_progress", "completed_by_driver", "nimporte", "", 42, null])(
    "statut invalide %s -> 400 INVALID_STATUS, course inchangée",
    async (status) => {
      const a = await mkAdmin();
      await seedWaiting("b1", { paymentStatus: "pending" });
      const res = await adminBooking(a.token, { bookingId: "b1", status });
      expect(res.status).toBe(400);
      expect((await res.json()).code).toBe("INVALID_STATUS");
      expect((await booking("b1")).status).toBe("awaiting_driver");
      expect((await poolDoc("b1")).exists).toBe(true);
    }
  );

  it("annuler une course dont l'empreinte est active (authorized) -> 409 HOLD_ACTIVE, pool intact", async () => {
    const a = await mkAdmin();
    await seedWaiting("b1", { paymentStatus: "authorized" });
    for (const refundConfirmed of [false, true]) {
      const res = await adminBooking(a.token, { bookingId: "b1", status: "cancelled", refundConfirmed });
      expect(res.status).toBe(409);
      expect((await res.json()).code).toBe("HOLD_ACTIVE");
    }
    expect((await booking("b1")).status).toBe("awaiting_driver");
    expect((await poolDoc("b1")).exists).toBe(true);
    expect((await db().collection("auditLogs").get()).size).toBe(0);
  });

  it.each(["paid_wallet", "captured"])("annuler une course %s sans refundConfirmed -> 409 REFUND_REQUIRED ; avec -> accepté", async (paymentStatus) => {
    const a = await mkAdmin();
    await seedWaiting("b1", { paymentStatus });
    const refused = await adminBooking(a.token, { bookingId: "b1", status: "cancelled" });
    expect(refused.status).toBe(409);
    expect((await refused.json()).code).toBe("REFUND_REQUIRED");
    expect((await booking("b1")).status).toBe("awaiting_driver");
    const ok = await adminBooking(a.token, { bookingId: "b1", status: "cancelled", refundConfirmed: true });
    expect(ok.status).toBe(200);
    expect((await booking("b1")).status).toBe("cancelled");
    expect((await poolDoc("b1")).exists).toBe(false);
    const log = (await db().collection("auditLogs").get()).docs[0].data();
    expect(log.details.refundConfirmed).toBe(true);
  });

  it("refundConfirmed non booléen (chaîne) ignoré -> 409 REFUND_REQUIRED", async () => {
    const a = await mkAdmin();
    await seedWaiting("b1", { paymentStatus: "paid_wallet" });
    const res = await adminBooking(a.token, { bookingId: "b1", status: "cancelled", refundConfirmed: "true" });
    expect(res.status).toBe(409);
  });

  it.each(["authorized", "paid_wallet", "captured"])("supprimer une course %s -> 409 PAYMENT_ACTIVE, course et pool intacts", async (paymentStatus) => {
    const a = await mkAdmin();
    await seedWaiting("b1", { paymentStatus });
    const res = await adminBooking(a.token, { bookingId: "b1", action: "delete" });
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("PAYMENT_ACTIVE");
    expect((await db().collection("bookings").doc("b1").get()).exists).toBe(true);
    expect((await db().collection("auditLogs").get()).size).toBe(0);
  });

  it("identifiant invalide -> 400 INVALID_BOOKING ; course inexistante -> 404", async () => {
    const a = await mkAdmin();
    const bad = await adminBooking(a.token, { bookingId: "a/b", status: "cancelled" });
    expect(bad.status).toBe(400);
    expect((await bad.json()).code).toBe("INVALID_BOOKING");
    expect((await adminBooking(a.token, { bookingId: "absente", status: "cancelled" })).status).toBe(404);
  });
});

// ================================================================ reconcileRidePool
describe("reconcileRidePool", () => {
  it("ajoute les courses à prendre manquantes et retire les entrées orphelines", async () => {
    // Manquante : éligible, mais jamais synchronisée.
    await seedWaiting("manquante", {}, false);
    // Déjà présente et correcte.
    await seedWaiting("ok");
    // Non éligibles et absentes du pool : ne doivent pas être ajoutées.
    await seedWaiting("echec", { paymentStatus: "failed" }, false);
    await seedWaiting("liberee", { paymentStatus: "released" }, false);
    await seedWaiting("prise", { driverId: "chauffeur-x" }, false);
    await seedWaiting("assignee", { status: "assigned", driverId: "chauffeur-x" }, false);
    // Orphelines : la course n'est plus à prendre, ou n'existe plus.
    await seedWaiting("devenue-assignee", { status: "assigned", driverId: "chauffeur-x" }, false);
    await db().collection("ridePool").doc("devenue-assignee").set({ bookingId: "devenue-assignee" });
    await db().collection("ridePool").doc("annulee").set({ bookingId: "annulee" });
    await seedWaiting("annulee", { status: "cancelled" }, false);
    await db().collection("ridePool").doc("fantome").set({ bookingId: "fantome" });

    const result = await reconcileRidePool();
    expect(result).toEqual({ added: 1, removed: 3 });

    const ids = (await db().collection("ridePool").get()).docs.map((d) => d.id).sort();
    expect(ids).toEqual(["manquante", "ok"]);
    expect(Object.keys((await poolDoc("manquante")).data()!).sort()).toEqual(POOL_KEYS);
  });

  it("idempotente : un second passage ne change rien", async () => {
    await seedWaiting("manquante", {}, false);
    await db().collection("ridePool").doc("fantome").set({ bookingId: "fantome" });
    expect(await reconcileRidePool()).toEqual({ added: 1, removed: 1 });
    expect(await reconcileRidePool()).toEqual({ added: 0, removed: 0 });
  });
});

// ================================================================ sync sur les chemins de paiement
describe("synchronisation du pool : finalize-card-booking", () => {
  const meta = (uid: string, ride = validRide()) => ({
    userId: uid,
    paymentMode: "card",
    walletAmountCents: "0",
    totalAmountCents: String(VALID_RIDE_TOTAL_CENTS),
    ...rideMeta(ride),
  });

  it("une course carte finalisée entre au pool, sans donnée personnelle", async () => {
    const u = await createAuthUser(uniqueEmail("fc"));
    stripeMock.paymentIntents.retrieve.mockResolvedValue({
      id: "pi_ok",
      status: "requires_capture",
      created: piCreatedNow(),
      amount: VALID_RIDE_TOTAL_CENTS,
      metadata: meta(u.uid),
    });
    const res = await finalizeCard(
      jsonRequest("/api/finalize-card-booking", {
        token: u.idToken,
        body: {
          paymentIntentId: "pi_ok",
          bookingData: { ...validRide(), name: "Jean Dupont", phone: "+33612345678", notes: "Code 4567" },
        },
      })
    );
    expect(res.status).toBe(200);
    expect((await res.json()).bookingId).toBe("card_pi_ok");
    const b = await booking("card_pi_ok");
    expect(b.status).toBe("awaiting_driver");
    const p = await poolDoc("card_pi_ok");
    expect(p.exists).toBe(true);
    const data = p.data()!;
    expect(Object.keys(data).sort()).toEqual(POOL_KEYS);
    expect(data.departZone).toBe("Paris 1er");
    expect(data.arriveeZone).toBe("Aéroport d'Orly");
    expect(data.prix).toBe(76);
    expect(data.driverShareCents).toBe(6080);
    const dump = JSON.stringify(data);
    for (const secret of ["Jean", "612345678", "4567", "Rivoli", u.email]) expect(dump, secret).not.toContain(secret);
  });

  it("refus (PI d'un autre utilisateur) : aucune entrée dans le pool", async () => {
    const victim = await createAuthUser(uniqueEmail("fc-v"));
    const thief = await createAuthUser(uniqueEmail("fc-t"));
    stripeMock.paymentIntents.retrieve.mockResolvedValue({
      id: "pi_v",
      status: "requires_capture",
      created: piCreatedNow(),
      amount: VALID_RIDE_TOTAL_CENTS,
      metadata: meta(victim.uid),
    });
    const res = await finalizeCard(
      jsonRequest("/api/finalize-card-booking", {
        token: thief.idToken,
        body: { paymentIntentId: "pi_v", bookingData: validRide() },
      })
    );
    expect(res.status).toBe(403);
    expect((await db().collection("ridePool").get()).size).toBe(0);
  });
});

describe("synchronisation du pool : webhook Stripe", () => {
  function send(type: string, object: Record<string, unknown>) {
    const event = { id: `evt_${type}_${object.id}`, type, data: { object } };
    stripeMock.webhooks.constructEvent.mockReturnValue(event);
    return webhook(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "t=1,v1=mockee" },
        body: JSON.stringify(event),
      })
    );
  }

  it("amount_capturable_updated : la course confirmée entre au pool", async () => {
    await seedWaiting("b1", { status: "confirmed", paymentStatus: "pending", paymentId: "pi_cap" }, false);
    expect((await poolDoc("b1")).exists).toBe(false);
    expect((await send("payment_intent.amount_capturable_updated", { id: "pi_cap", amount: 8000, metadata: {} })).status).toBe(200);
    expect((await booking("b1")).status).toBe("awaiting_driver");
    const p = await poolDoc("b1");
    expect(p.exists).toBe(true);
    expect(Object.keys(p.data()!).sort()).toEqual(POOL_KEYS);
  });

  it("amount_capturable_updated sur une course déjà assignée : n'entre pas au pool", async () => {
    await seedWaiting("b1", { status: "assigned", driverId: "chauffeur-1", paymentId: "pi_adv" }, false);
    await send("payment_intent.amount_capturable_updated", { id: "pi_adv", amount: 8000, metadata: {} });
    expect((await booking("b1")).status).toBe("assigned");
    expect((await poolDoc("b1")).exists).toBe(false);
  });

  it("payment_intent.canceled : la course sort du pool (released / cancelled)", async () => {
    await seedWaiting("b1", { paymentId: "pi_can" });
    expect((await poolDoc("b1")).exists).toBe(true);
    expect((await send("payment_intent.canceled", { id: "pi_can", metadata: {} })).status).toBe(200);
    const b = await booking("b1");
    expect(b.status).toBe("cancelled");
    expect(b.paymentStatus).toBe("released");
    expect((await poolDoc("b1")).exists).toBe(false);
  });

  it("payment_intent.succeeded : la course sort du pool (captured / completed)", async () => {
    await seedWaiting("b1", { paymentId: "pi_suc", email: "" });
    expect((await poolDoc("b1")).exists).toBe(true);
    expect((await send("payment_intent.succeeded", { id: "pi_suc", amount_received: 8000, metadata: {} })).status).toBe(200);
    const b = await booking("b1");
    expect(b.paymentStatus).toBe("captured");
    expect(b.status).toBe("completed");
    expect((await poolDoc("b1")).exists).toBe(false);
  });

  it("payment_intent.payment_failed : la course sort du pool (failed)", async () => {
    await seedWaiting("b1", { paymentId: "pi_fail" });
    expect((await poolDoc("b1")).exists).toBe(true);
    expect(
      (await send("payment_intent.payment_failed", { id: "pi_fail", metadata: {}, last_payment_error: { message: "refusé" } })).status
    ).toBe(200);
    expect((await booking("b1")).paymentStatus).toBe("failed");
    expect((await poolDoc("b1")).exists).toBe(false);
  });

  it("l'événement d'un autre PI ne touche pas le pool de cette course", async () => {
    await seedWaiting("b1", { paymentId: "pi_a" });
    await seedWaiting("b2", { paymentId: "pi_b" });
    await send("payment_intent.canceled", { id: "pi_a", metadata: {} });
    expect((await poolDoc("b1")).exists).toBe(false);
    expect((await poolDoc("b2")).exists).toBe(true);
  });
});
