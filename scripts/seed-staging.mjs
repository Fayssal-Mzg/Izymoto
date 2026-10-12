// Données de test FICTIVES pour le projet Firebase de staging (étape 3c).
// Refuse de tourner sur tout projet qui n'est pas un staging ou un émulateur.
//
// Staging :
//   $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\Users\Fayss\cles\izymoto-staging-admin.json"
//   $env:SEED_PROJECT_ID = "izymoto-staging-1dec9"
//   $env:SEED_EMAIL = "prenom.nom@gmail.com"     # les comptes seront prenom.nom+izy-<rôle>@gmail.com
//   $env:SEED_PASSWORD = "<mot de passe de test, 10 caractères minimum>"
//   npm run seed:staging
//
// Émulateur : FIRESTORE_EMULATOR_HOST, FIREBASE_AUTH_EMULATOR_HOST et FIREBASE_STORAGE_EMULATOR_HOST
// définis (firebase emulators:exec), projet demo-*.
//
// Idempotent : ids fixes (seed-*, seed_*), relancer réécrit les mêmes documents.
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function fail(msg) {
  console.error(`\n[seed] ARRÊT : ${msg}\n`);
  process.exit(1);
}

// ---------------------------------------------------------------- garde-fous
const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
let projectId;
if (emulator) {
  projectId = process.env.SEED_PROJECT_ID || "demo-izymoto";
  if (!projectId.startsWith("demo-")) fail("sur l'émulateur, le projet doit commencer par demo-.");
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST || !process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
    fail("émulateurs Auth et Storage requis en plus de Firestore.");
  }
} else {
  projectId = process.env.SEED_PROJECT_ID ?? "";
  if (!/staging/.test(projectId) || projectId === "izymoto") {
    fail(`SEED_PROJECT_ID="${projectId}" n'est pas un projet de staging.`);
  }
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath) fail("GOOGLE_APPLICATION_CREDENTIALS manquant (chemin du JSON du compte de service staging).");
  let credProject;
  try {
    credProject = JSON.parse(readFileSync(credPath, "utf8")).project_id;
  } catch {
    fail("fichier du compte de service illisible.");
  }
  if (credProject !== projectId) {
    fail(`le compte de service appartient à "${credProject}", pas à "${projectId}".`);
  }
}

const seedEmail = process.env.SEED_EMAIL ?? (emulator ? "seed@example.test" : "");
const [local, domain] = seedEmail.split("@");
if (!local || !domain) fail("SEED_EMAIL manquant ou invalide (ex. prenom.nom@gmail.com).");
const password = process.env.SEED_PASSWORD ?? (emulator ? "seed-password-emulateur" : "");
if (password.length < 10) fail("SEED_PASSWORD manquant ou trop court (10 caractères minimum).");

const bucketName = process.env.SEED_STORAGE_BUCKET || `${projectId}.firebasestorage.app`;
const app = initializeApp({
  projectId,
  storageBucket: bucketName,
  ...(emulator ? {} : { credential: applicationDefault() }),
});
const auth = getAuth(app);
const db = getFirestore(app);
const bucket = getStorage(app).bucket();

// ---------------------------------------------------------------- utilitaires
const alias = (tag) => `${local}+izy-${tag}@${domain}`.toLowerCase();
const now = new Date();
const at = (days, hour = 10, minute = 0) => {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
};
const ts = (d) => Timestamp.fromDate(d);
const pad = (n) => String(n).padStart(2, "0");
const dateFormatted = (d) =>
  `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} à ${pad(d.getHours())}:${pad(d.getMinutes())}`;
const periodKey = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit" })
  .format(now)
  .slice(0, 7);

// ---------------------------------------------------------------- comptes
const ACCOUNTS = {
  client: { uid: "seed-client", tag: "client", displayName: "Camille Fictif" },
  driver: { uid: "seed-driver", tag: "chauffeur", displayName: "Yanis Fictif" },
  driverPending: { uid: "seed-driver-pending", tag: "chauffeur-attente", displayName: "Léa Fictif" },
  admin: { uid: "seed-admin", tag: "admin", displayName: "Admin Fictif" },
  owner: { uid: "seed-owner", tag: "entreprise", displayName: "Hugo Fictif" },
  member: { uid: "seed-member", tag: "collaborateur", displayName: "Inès Fictif" },
};
for (const a of Object.values(ACCOUNTS)) a.email = alias(a.tag);

async function upsertAuthUser({ uid, email, displayName }) {
  const props = { email, password, displayName, emailVerified: true, disabled: false };
  try {
    await auth.updateUser(uid, props);
  } catch (e) {
    if (e?.code !== "auth/user-not-found") throw e;
    await auth.createUser({ uid, ...props });
  }
}

// ---------------------------------------------------------------- documents chauffeur (Storage)
// PDF minimal lisible, marqué fictif.
function placeholderPdf(label) {
  const text = `DOCUMENT FICTIF - STAGING - ${label}`.replace(/[()\\]/g, "");
  const stream = `BT /F1 18 Tf 50 750 Td (${text}) Tj ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) out += `${String(off).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

const DOC_KINDS = ["identityCard", "drivingLicense", "vehicleRegistration", "insurance", "rib"];

async function uploadDriverDocs(uid, name) {
  const documents = {};
  for (const kind of DOC_KINDS) {
    const filename = `${kind}-fictif.pdf`;
    // Même convention que uploadDriverDocument et storage.rules.
    const path = `drivers/${uid}/${kind}_1760000000000_${filename}`;
    // URL à jeton construite ici : getDownloadURL de l'Admin SDK est soumis aux règles sur l'émulateur.
    const token = randomUUID();
    await bucket.file(path).save(placeholderPdf(`${name} - ${kind}`), {
      contentType: "application/pdf",
      resumable: false,
      metadata: { metadata: { firebaseStorageDownloadTokens: token } },
    });
    const host = emulator ? `http://${process.env.FIREBASE_STORAGE_EMULATOR_HOST}` : "https://firebasestorage.googleapis.com";
    const url = `${host}/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
    documents[kind] = { url, path, filename, uploadedAt: ts(at(-20)) };
  }
  return documents;
}

// ---------------------------------------------------------------- données
const PRICE = { parisParis: 46, parisOrly: 76, parisRoissy: 99 };
const share = (prix) => {
  const cents = Math.round(prix * 100);
  const platformShareCents = Math.round(cents * 0.2);
  return { commissionRate: 0.2, platformShareCents, driverShareCents: cents - platformShareCents };
};

function ride({ n, depart, arrivee, distance, duree, prix, when, who, notes = "" }) {
  return {
    depart,
    arrivee,
    distance,
    duree,
    prix,
    prioriteReservation: false,
    name: who.displayName,
    phone: `+3360000${String(n).padStart(4, "0")}`,
    email: who.email,
    notes,
    reservationId: `CMD-SEED${String(n).padStart(4, "0")}`,
    reservationDate: ts(when),
    dateFormatted: dateFormatted(when),
  };
}

async function main() {
  console.log(`[seed] projet ${projectId}${emulator ? " (émulateur)" : ""}, bucket ${bucketName}`);

  for (const a of Object.values(ACCOUNTS)) await upsertAuthUser(a);

  const C = ACCOUNTS;
  const userDoc = (a, extra = {}) => ({
    uid: a.uid,
    email: a.email,
    displayName: a.displayName,
    photoURL: null,
    phoneNumber: null,
    role: "client",
    isAdmin: false,
    companyId: null,
    companyRole: null,
    createdAt: ts(at(-30)),
    lastLogin: ts(at(-1)),
    updatedAt: ts(at(-1)),
    ...extra,
  });

  const driverDocs = await uploadDriverDocs(C.driver.uid, C.driver.displayName);
  const pendingDocs = await uploadDriverDocs(C.driverPending.uid, C.driverPending.displayName);

  const driverBase = (a, extra) => ({
    uid: a.uid,
    email: a.email,
    firstName: a.displayName.split(" ")[0],
    lastName: "Fictif",
    phone: "+33600009999",
    dateOfBirth: "1990-01-01",
    address: "1 rue Fictive, 75000 Paris",
    legalForm: "auto-entrepreneur",
    companyName: `${a.displayName} EI (fictive)`,
    siret: "12345678900011",
    vatNumber: "",
    licenseNumber: "000000000000",
    licenseDeliveryDate: "2015-01-01",
    moto: { brand: "Yamaha", model: "Tracer 9", year: 2022, plate: "AA-123-ZZ", color: "Noir" },
    bank: { iban: "FR7630006000011234567890189", bic: "AGRIFRPP", accountHolder: `${a.displayName} (fictif)` },
    rejectedAt: null,
    rejectionReason: "",
    createdAt: ts(at(-25)),
    updatedAt: ts(at(-1)),
    ...extra,
  });

  // Courses
  const R = {
    devis: ride({ n: 1, depart: "Paris 8e", arrivee: "Aéroport Roissy-CDG", distance: 32, duree: 45, prix: PRICE.parisRoissy, when: at(5, 7, 30), who: C.client, notes: "Devis de démonstration" }),
    pool1: ride({ n: 2, depart: "Paris 11e", arrivee: "Aéroport d'Orly", distance: 18, duree: 30, prix: PRICE.parisOrly, when: at(1, 9), who: C.client }),
    pool2: ride({ n: 3, depart: "Paris 2e", arrivee: "Paris 16e", distance: 7, duree: 20, prix: PRICE.parisParis, when: at(2, 18, 15), who: C.member }),
    assigned: ride({ n: 4, depart: "Paris 15e", arrivee: "Aéroport Roissy-CDG", distance: 34, duree: 50, prix: PRICE.parisRoissy, when: at(3, 6, 45), who: C.client }),
    done: ride({ n: 5, depart: "Paris 9e", arrivee: "Paris 5e", distance: 6, duree: 18, prix: PRICE.parisParis, when: at(-3, 14), who: C.client }),
    cancelled: ride({ n: 6, depart: "Paris 1er", arrivee: "Aéroport d'Orly", distance: 17, duree: 30, prix: PRICE.parisOrly, when: at(-7, 11), who: C.client }),
    guest: ride({ n: 7, depart: "Paris 10e", arrivee: "Aéroport Roissy-CDG", distance: 28, duree: 40, prix: PRICE.parisRoissy, when: at(6, 8), who: { displayName: "Invité Fictif", email: alias("invite") } }),
  };
  const walletPaid = (prix) => ({
    paymentMethod: "wallet",
    paymentStatus: "paid_wallet",
    walletAmountCents: Math.round(prix * 100),
    amountAuthorized: prix,
    amountCaptured: prix,
    isPaid: true,
  });

  const bookings = {
    seed_bk_devis: { ...R.devis, userId: C.client.uid, accountType: "registered", status: "devis", createdAt: ts(at(-1, 16)) },
    seed_bk_pool1: { ...R.pool1, ...walletPaid(PRICE.parisOrly), userId: C.client.uid, accountType: "registered", status: "awaiting_driver", createdAt: ts(at(-1, 17)) },
    seed_bk_pool2: {
      ...R.pool2, ...walletPaid(PRICE.parisParis), userId: C.member.uid, accountType: "registered", status: "awaiting_driver",
      companyId: "seed-company", actorUid: C.member.uid, paidBy: "company", createdAt: ts(at(-1, 18)),
    },
    seed_bk_assigned: {
      ...R.assigned, ...walletPaid(PRICE.parisRoissy), ...share(PRICE.parisRoissy), userId: C.client.uid, accountType: "registered",
      status: "assigned", driverId: C.driver.uid, driverAcceptedAt: ts(at(-1, 19)), createdAt: ts(at(-2, 10)), updatedAt: ts(at(-1, 19)),
    },
    seed_bk_done: {
      ...R.done, ...walletPaid(PRICE.parisParis), ...share(PRICE.parisParis), userId: C.client.uid, accountType: "registered",
      status: "completed", driverId: C.driver.uid, driverAcceptedAt: ts(at(-4, 9)), driverStartedAt: ts(at(-3, 13, 55)),
      driverCompletedAt: ts(at(-3, 14, 20)), createdAt: ts(at(-5, 12)), updatedAt: ts(at(-3, 14, 20)),
    },
    seed_bk_cancelled: {
      ...R.cancelled, userId: C.client.uid, accountType: "registered", status: "cancelled",
      paymentMethod: "card", paymentStatus: "released", paymentId: "pi_seed_fictif_annule", amountAuthorized: PRICE.parisOrly,
      isPaid: false, createdAt: ts(at(-9, 10)), updatedAt: ts(at(-8, 10)),
    },
    seed_bk_guest_devis: { ...R.guest, userId: "guest_5eed5eed5eed5eed", accountType: "guest", status: "devis", createdAt: ts(at(-2, 9)) },
  };

  const clientDebits = [
    ["seed_bk_pool1", R.pool1, -2],
    ["seed_bk_assigned", R.assigned, -2],
    ["seed_bk_done", R.done, -5],
  ];
  const rechargeCents = 30000;
  const clientBalance = rechargeCents - clientDebits.reduce((s, [, r]) => s + Math.round(r.prix * 100), 0);

  const companyRechargeCents = 50000;
  const companyDebitCents = Math.round(R.pool2.prix * 100);

  const batch = db.batch();
  const set = (path, data) => batch.set(db.doc(path), data);

  set(`users/${C.client.uid}`, userDoc(C.client, { phoneNumber: "+33600000001" }));
  set(`users/${C.driver.uid}`, userDoc(C.driver, { role: "driver" }));
  set(`users/${C.driverPending.uid}`, userDoc(C.driverPending, { role: "driver" }));
  set(`users/${C.admin.uid}`, userDoc(C.admin, { isAdmin: true }));
  set(`users/${C.owner.uid}`, userDoc(C.owner, { companyId: "seed-company", companyRole: "owner" }));
  set(`users/${C.member.uid}`, userDoc(C.member, { companyId: "seed-company", companyRole: "member" }));

  set(`drivers/${C.driver.uid}`, driverBase(C.driver, {
    status: "active",
    availability: "online",
    documents: driverDocs,
    acceptedAt: ts(at(-20)),
    stats: { totalRides: 1, totalEarningsCents: share(PRICE.parisParis).driverShareCents },
  }));
  set(`drivers/${C.driverPending.uid}`, driverBase(C.driverPending, {
    status: "pending",
    availability: "offline",
    documents: pendingDocs,
    acceptedAt: null,
    moto: { brand: "Honda", model: "NT1100", year: 2023, plate: "BB-456-YY", color: "Gris" },
    stats: { totalRides: 0, totalEarningsCents: 0 },
  }));

  for (const [id, data] of Object.entries(bookings)) set(`bookings/${id}`, data);

  set(`wallets/${C.client.uid}`, {
    userId: C.client.uid, balanceCents: clientBalance, cumulativeRechargedCents: rechargeCents, currency: "EUR",
    createdAt: ts(at(-10)), updatedAt: ts(at(-2)),
  });
  set("walletTransactions/seed_tx_client_recharge", {
    userId: C.client.uid, type: "recharge", amountCents: rechargeCents, balanceAfterCents: rechargeCents,
    description: "Recharge forfait (données fictives)", createdAt: ts(at(-10)),
  });
  let running = rechargeCents;
  for (const [bookingId, r, day] of clientDebits) {
    const cents = Math.round(r.prix * 100);
    running -= cents;
    set(`walletTransactions/seed_tx_debit_${bookingId}`, {
      userId: C.client.uid, type: "debit", amountCents: cents, balanceAfterCents: running,
      description: `Course ${r.depart} → ${r.arrivee}`, bookingId, reservationId: r.reservationId, createdAt: ts(at(day, 12)),
    });
  }

  set("companies/seed-company", {
    name: "Société Fictive SAS", slug: "societe-fictive", ownerUid: C.owner.uid, adminUids: [C.owner.uid],
    walletBalanceCents: companyRechargeCents - companyDebitCents, cumulativeRechargedCents: companyRechargeCents, currency: "EUR",
    billingEmail: C.owner.email, siret: "98765432100019", address: "10 avenue Imaginaire, 92400 Courbevoie",
    memberCount: 2, createdAt: ts(at(-15)), updatedAt: ts(at(-1)),
  });
  const member = (a, role, extra) => ({
    uid: a.uid, email: a.email, displayName: a.displayName, role, status: "active",
    budgetPeriodKey: periodKey, invitedAt: ts(at(-15)), joinedAt: ts(at(-14)), ...extra,
  });
  set(`companies/seed-company/members/${C.owner.uid}`, member(C.owner, "owner", { monthlyBudgetCents: 0, spentThisPeriodCents: 0 }));
  set(`companies/seed-company/members/${C.member.uid}`, member(C.member, "member", { monthlyBudgetCents: 20000, spentThisPeriodCents: companyDebitCents }));
  set("walletTransactions/seed_tx_company_recharge", {
    companyId: "seed-company", actorUid: C.owner.uid, actorEmail: C.owner.email, type: "recharge",
    amountCents: companyRechargeCents, balanceAfterCents: companyRechargeCents,
    description: "Recharge entreprise (données fictives)", createdAt: ts(at(-15)),
  });
  set("walletTransactions/seed_tx_company_debit_pool2", {
    companyId: "seed-company", actorUid: C.member.uid, actorEmail: C.member.email, type: "debit",
    amountCents: companyDebitCents, balanceAfterCents: companyRechargeCents - companyDebitCents,
    description: `Course ${R.pool2.depart} → ${R.pool2.arrivee}`, bookingId: "seed_bk_pool2", reservationId: R.pool2.reservationId,
    createdAt: ts(at(-1, 18)),
  });

  await batch.commit();

  console.log("\n[seed] terminé. Comptes (e-mail vérifié, mot de passe = SEED_PASSWORD) :");
  for (const [role, a] of Object.entries(ACCOUNTS)) console.log(`  ${role.padEnd(14)} ${a.email}`);
  console.log(`  + ${Object.keys(bookings).length} réservations, wallet client ${clientBalance / 100} €, entreprise « Société Fictive SAS ».`);
}

main().catch((e) => {
  console.error("[seed] échec :", e?.message ?? e);
  process.exit(1);
});
