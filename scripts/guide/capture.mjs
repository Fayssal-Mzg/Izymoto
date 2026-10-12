// Captures du guide fonctionnel (docs/guide/captures/), bureau et mobile.
// - public : izymoto.com, lecture seule, aucun formulaire soumis.
// - connecte : prévisualisation staging, comptes fictifs du seed.
//
//   node scripts/guide/capture.mjs public
//   $env:GUIDE_BASE_URL="https://izymoto-git-...vercel.app"; $env:VERCEL_BYPASS="..."; $env:SEED_EMAIL="..."; $env:SEED_PASSWORD="..."
//   node scripts/guide/capture.mjs connecte
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium, devices } from "playwright";

const OUT = path.resolve("docs/guide/captures");
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = {
  bureau: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  mobile: { ...devices["iPhone 13"] },
};

// Masque le chatbot tiers et les bandeaux flottants qui couvrent le contenu.
const HIDE_CSS = `
  iframe[src*="limova"], [id*="limova" i], [class*="limova" i], [id*="chatbot" i] { display: none !important; }
  vercel-live-feedback { display: none !important; }
`;

// Pages exclues (inventaire du 2026-10-12) : /reserver (404), /contact (formulaire inopérant),
// /aeroports et pages SEO (prix différents de la grille appliquée).
const PUBLIC = [
  { name: "01-accueil", url: "/" },
  { name: "01-nos-tarifs", url: "/nos-tarifs", scrollText: "Forfaits taxi moto par trajet" },
  { name: "02-reservation", url: "/#reservation" },
  { name: "03-connexion", url: "/connexion" },
  { name: "03-inscription", url: "/inscription" },
  { name: "03-portefeuille-paliers", url: "/portefeuille#paliers" },
  { name: "04-chauffeur-inscription", url: "/chauffeur/inscription" },
  { name: "06-entreprise", url: "/entreprise" },
];

// Espaces connectés (prévisualisation staging), par compte du seed. Aucune action autre que la connexion.
const CONNECTE = {
  client: [
    { name: "03-profil", url: "/profil", fullPage: true },
    { name: "03-forfaits", url: "/profil/portefeuille", fullPage: true },
  ],
  chauffeur: [
    { name: "04-chauffeur-accueil", url: "/chauffeur" },
    { name: "04-chauffeur-courses", url: "/chauffeur/courses", fullPage: true },
    { name: "04-chauffeur-mes-courses", url: "/chauffeur/mes-courses", fullPage: true },
    { name: "04-chauffeur-profil", url: "/chauffeur/profil", fullPage: true },
  ],
  "chauffeur-attente": [{ name: "04-chauffeur-en-attente", url: "/chauffeur" }],
  admin: [
    { name: "05-admin-accueil", url: "/admin" },
    { name: "05-admin-reservations", url: "/admin/reservations" },
    { name: "05-admin-utilisateurs", url: "/admin/utilisateurs" },
    { name: "05-admin-chauffeurs", url: "/admin/chauffeurs" },
    { name: "05-admin-chauffeur-dossier", url: "/admin/chauffeurs/seed-driver-pending", fullPage: true },
    { name: "05-admin-forfaits", url: "/admin/wallets" },
    { name: "05-admin-entreprises", url: "/admin/companies" },
    { name: "05-admin-entreprise-detail", url: "/admin/companies/seed-company", fullPage: true },
  ],
  entreprise: [{ name: "06-entreprise-proprietaire", url: "/profil/entreprise", wait: 15000 }],
  collaborateur: [{ name: "06-entreprise-collaborateur", url: "/profil/entreprise" }],
};

async function shoot(context, base, t, vp) {
  const page = await context.newPage();
  // Pas de "networkidle" : les écouteurs Firestore gardent une connexion ouverte en permanence.
  await page.goto(new URL(t.url, base).toString(), { waitUntil: "load", timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(t.wait ?? 4000);
  await page.addStyleTag({ content: HIDE_CSS }).catch(() => {});
  const hash = new URL(t.url, base).hash;
  const target = hash ? page.locator(hash) : t.scrollText ? page.getByText(t.scrollText, { exact: false }) : null;
  if (target) {
    await target.first().scrollIntoViewIfNeeded({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(800);
    // L'en-tête est fixe : on remonte de sa hauteur pour ne pas couper le titre de la section.
    await target.first().evaluate((el) => {
      el.scrollIntoView({ block: "start" });
      const header = document.querySelector("header");
      window.scrollBy(0, -((header?.getBoundingClientRect().height ?? 90) + 16));
    }).catch(() => {});
  }
  if (t.before) await t.before(page);
  await page.waitForTimeout(1500);
  // Les comptes du seed sont des alias d'une vraie adresse : on les remplace par des adresses fictives.
  await page.evaluate(() => {
    // Couvre aussi les adresses tronquées par l'interface (« prenom.nom+izy-collab… »).
    const fake = (s) => s.replace(/[\w.]+\+(?:izy-)?/gi, "").replace(/@gmail\.com/gi, "@exemple.fr");
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (/\+|@gmail\.com/.test(n.nodeValue) && /[\w.]+\+[\w-]/.test(n.nodeValue)) n.nodeValue = fake(n.nodeValue);
    }
    for (const el of document.querySelectorAll("input")) {
      if (el.value.includes("@gmail.com")) el.value = fake(el.value);
    }
  }).catch(() => {});
  const file = path.join(OUT, `${t.name}-${vp}.png`);
  // Pleine page sur bureau seulement : sur mobile elle devient illisible et la barre « Réserver » fixe la recouvre.
  await page.screenshot({ path: file, fullPage: Boolean(t.fullPage) && vp === "bureau" });
  console.log("capture", path.relative(process.cwd(), file));
  await page.close();
}

// Pose le cookie de contournement de la protection Vercel pour tout le contexte.
async function setBypassCookie(context, base) {
  const page = await context.newPage();
  await page.goto(`${base}/?x-vercel-protection-bypass=${process.env.VERCEL_BYPASS}&x-vercel-set-bypass-cookie=true`, { waitUntil: "load", timeout: 60000 }).catch(() => {});
  await page.close();
}

async function runPublic() {
  const base = process.env.GUIDE_PUBLIC_URL || "https://izymoto.com";
  const browser = await chromium.launch();
  for (const [vp, opts] of Object.entries(VIEWPORTS)) {
    const context = await browser.newContext({ ...opts, locale: "fr-FR" });
    if (process.env.VERCEL_BYPASS) await setBypassCookie(context, base);
    const only = process.argv.slice(3);
    for (const t of PUBLIC) if (!only.length || only.includes(t.name)) await shoot(context, base, t, vp);
    await context.close();
  }
  await browser.close();
}

function env(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`variable ${name} manquante`);
    process.exit(1);
  }
  return v;
}

async function runConnecte() {
  const base = env("GUIDE_BASE_URL");
  if (/izymoto\.com/.test(base)) {
    console.error("ARRÊT : le mode connecté ne vise que la prévisualisation staging.");
    process.exit(1);
  }
  env("VERCEL_BYPASS");
  const [local, domain] = env("SEED_EMAIL").split("@");
  const password = env("SEED_PASSWORD");
  const only = process.argv.slice(3);
  const browser = await chromium.launch();
  for (const [tag, targets] of Object.entries(CONNECTE)) {
    const todo = targets.filter((t) => !only.length || only.includes(t.name) || only.includes(tag));
    if (!todo.length) continue;
    for (const [vp, opts] of Object.entries(VIEWPORTS)) {
      const context = await browser.newContext({ ...opts, locale: "fr-FR" });
      await setBypassCookie(context, base);
      const page = await context.newPage();
      await page.goto(`${base}/connexion`, { waitUntil: "load", timeout: 60000 }).catch(() => {});
      await page.fill("#email", `${local}+izy-${tag}@${domain}`.toLowerCase());
      await page.fill("#password", password);
      await page.click('button[type="submit"]');
      await page.waitForURL((u) => !u.pathname.startsWith("/connexion"), { timeout: 30000 });
      await page.close();
      for (const t of todo) await shoot(context, base, t, vp);
      await context.close();
    }
  }
  await browser.close();
}

const mode = process.argv[2];
if (mode === "public") await runPublic();
else if (mode === "connecte") await runConnecte();
else {
  console.error("usage : node scripts/guide/capture.mjs public|connecte");
  process.exit(1);
}
