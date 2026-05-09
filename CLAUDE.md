# CLAUDE.md — Projet Izymoto

Fichier de contexte chargé automatiquement par Claude Code à chaque session dans ce dépôt.
Garder concis : uniquement ce qui n'est pas trivialement déductible du code.

---

## 1. Le projet en une phrase

**Izymoto** est un site de réservation de **moto-taxi à Paris et en Île-de-France** (transferts aéroports, trajets en ville, mise à disposition à l'heure). Site vitrine + tunnel de réservation + paiement + back-office admin.

- **Domaine de production** : `https://izymoto.com`
- **Téléphone affiché** : +33 6 49 50 25 25
- **Email contact** : contact@izymoto.com
- **Adresse siège** : 25 Rue de Ponthieu, 75008 Paris
- **Tarifs de référence** : trajet ville dès 50€ • aéroport (CDG/Orly) dès 80€ • mise à disposition 80€/h • Paris↔Paris 65€

## 2. Stack & contraintes techniques

| | |
|---|---|
| Framework | **Next.js 14.2** (App Router, `--turbo` en dev) |
| Langages | TypeScript + JavaScript mixés (legacy `.jsx` toléré, **nouvelles features en `.tsx`**) |
| UI | Tailwind CSS 3.4 + shadcn/ui (`components/ui/`) + lucide-react |
| Auth & DB | **Firebase** (auth + Firestore) — config dans `lib/firebase/` |
| Paiement | **Stripe** (`@stripe/react-stripe-js`, `stripe` server) — voir `lib/stripe-server.js` |
| Cartes | **Google Maps JS API** via `@react-google-maps/api` (`components/maps/GoogleMapsProvider.tsx`) |
| Emails | **Resend** + templates dans `lib/emails/` |
| Hébergement | **Vercel** (`vercel.json`, build via `next build`) |
| Node | >= 18.x |

**Ne pas ajouter sans demander** : nouvelle lib UI, ORM, state manager global, framework de tests (rien en place actuellement).

## 3. Arborescence haut niveau

```
app/
  page.tsx                      # landing principale (hero + réservation + tarifs + about + contact)
  layout.tsx                    # metadata SEO globales + JSON-LD LocalBusiness
  robots.ts / sitemap.ts        # SEO — autorisations bots IA explicites
  reserver/                     # tunnel de réservation (modals: devis, user, payment, confirmation)
  aeroports/                    # page transferts aéroports
  nos-tarifs/                   # grille tarifaire
  about/, contact/, mentions-legales/, politique-de-confidentialite/
  connexion/, inscription/, profil/
  admin/                        # back-office (réservations, utilisateurs)
  api/
    create-payment-intent/      # route Stripe
    send-devis/                 # envoi email Resend
  paiement-reussi/, paiement-annule/
  moto-taxi-*/                  # pages SEO landing (voir §6)

components/
  Header.tsx, Footer.tsx
  reservation/                  # ReservationForm, ReservationProcess
  maps/                         # GoogleMapsProvider
  seo/SeoLandingPage.tsx        # template réutilisable pour pages SEO
  ui/                           # shadcn (button, sheet, carousel)
  *Button.jsx                   # boutons localisation/aéroport/gare (legacy jsx)

contexts/
  AuthContext.tsx               # user Firebase + login/logout
  ReservationContext.tsx        # état du formulaire de réservation

lib/
  firebase/                     # admin.ts, bookings.js, users.js
  emails/confirmationEmail.ts   # template Resend
  hooks/useReservation.js, useAdmin.js, useUserInformation.js
  services/paymentService.ts
  stripe.js, stripe-server.js
  utils.ts                      # cn() Tailwind helper

middleware.js                   # actuellement passthrough (NextResponse.next)
next.config.mjs                 # minimal (reactStrictMode)
public/
  llms.txt                      # résumé IA-friendly du site
  Izymoto.svg                   # logo
  taxi-paris.jpg, about-izymoto.jpg, *.webp  # visuels OG/hero
```

## 4. Conventions de code à respecter

- **Pages SEO** = utiliser le template `components/seo/SeoLandingPage.tsx`. Ne pas dupliquer la structure hero/FAQ/CTA dans chaque page.
- **JSON-LD** = injecter via `<Script type="application/ld+json" strategy="beforeInteractive">`, jamais en `<head>` brut.
- **Métadonnées Next** = export `metadata` typé `Metadata` dans chaque `page.tsx` SEO (title, description, alternates.canonical, openGraph).
- **Client vs Server components** : par défaut Server. Mettre `"use client"` uniquement si le composant utilise hooks, contexts, ou listeners. La landing `app/page.tsx` est `"use client"` à cause de `useAuth` et `useInView`.
- **Imports** : alias `@/` mappé sur la racine (voir `tsconfig.json`).
- **Tailwind** : pas de CSS custom dans `globals.css` sauf utilités globales. Utiliser `cn()` de `lib/utils.ts` pour la composition de classes.
- **Pas de tests** dans le repo aujourd'hui — ne pas en ajouter sans demander.
- **Langue** : tout le contenu utilisateur en **français** (le site cible la France).

## 5. Variables d'environnement attendues (à confirmer côté `.env.local`)

```
# Firebase (client)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (server) — service account JSON
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

# Resend (emails)
RESEND_API_KEY=
```
*(Les noms exacts sont à vérifier dans `lib/firebase/`, `lib/stripe*.js`, `lib/emails/`. Cette liste est indicative.)*

## 6. SEO — état actuel (mis en place 2026-05)

**Stratégie** : positionner Izymoto sur les requêtes parisiennes haute intention + apparaître dans les réponses des LLMs (ChatGPT Search, Perplexity, Claude, Le Chat Mistral, Gemini).

**Pages SEO landing créées** (toutes utilisent `SeoLandingPage`) :
- `/moto-taxi-paris` — mot-clé tête
- `/moto-taxi-aeroport-cdg` — Roissy CDG
- `/moto-taxi-aeroport-orly`
- `/moto-taxi-gare-du-nord` — Eurostar/Thalys
- `/moto-taxi-gare-de-lyon` — TGV Sud-Est
- `/moto-taxi-la-defense` — B2B / business
- `/moto-taxi-disneyland`

**Optimisations IA** :
- `app/robots.ts` autorise explicitement 17 user-agents IA (GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, anthropic-ai, PerplexityBot, Google-Extended, Applebot-Extended, MistralAI-User, etc.) et bloque CCBot.
- `public/llms.txt` au standard llms.txt — résumé structuré du site (services, tarifs, FAQ).
- JSON-LD : `TaxiService` racine + `Service` + `FAQPage` + `BreadcrumbList` sur chaque page SEO.
- Métadonnées `metadataBase`, `openGraph`, `twitter`, `verification.google`, `alternates.canonical` dans `app/layout.tsx`.

**Pour ajouter une nouvelle page SEO landing** :
1. Créer `app/<slug>/page.tsx` qui exporte `metadata` + `<SeoLandingPage>` avec `slug`, `h1`, `intro`, `priceFrom`, `routes`, `faq`, `serviceName`, `areaServed`.
2. Ajouter le slug dans `app/sitemap.ts` (tableau `seoLandingPages`).
3. Optionnellement référencer la page dans `public/llms.txt`.

## 7. Points d'attention / pièges connus

- **`app/page.tsx`** est volumineux (~900 lignes) et `"use client"` — toute logique de réservation y est inline + déléguée à `HomeReservationSection`. Pas urgent à refactor mais à garder en tête.
- **Mix `.jsx` / `.tsx`** : code legacy toléré, ne pas migrer en bloc sans demande.
- **Chatbot externe** : un `<Script>` charge `limova-web-sltj.onrender.com/scripts/chatbot-loader.js` dans `layout.tsx` (data-connection-id). Service tiers, ne pas supprimer sans accord.
- **`PerformanceMonitor`** est rendu uniquement en `process.env.NODE_ENV === "development"` sur la landing — c'est un outil de debug, pas une fonctionnalité utilisateur.
- **Vérification Google Search Console** : fichier `public/google675d24b21567992b.html` + `verification.google` dans metadata — ne pas casser.
- **TypeScript strict mais base mixte** : `npx tsc --noEmit` passe ; `next lint` peut signaler des warnings sur le legacy `.jsx`.
- **Paiement Stripe = hold/capture, pas débit immédiat** (depuis commit C1 `de38937`, 2026-05-06). `create-payment-intent` utilise `capture_method: "manual"` + `request_incremental_authorization`. Le débit réel passe par `/api/capture-payment` (admin). Endpoints associés : `/api/cancel-payment`, `/api/increment-authorization`, `/api/webhooks/stripe`. Statut Firestore : `authorized` → `captured` (plus de `paid` immédiat).

## 8. Commandes essentielles

```powershell
npm run dev              # dev server (turbopack)
npm run build            # build production
npm run lint             # ESLint Next.js
npx tsc --noEmit         # type-check sans build
```

## 9. Identité git pour les commits

L'utilisateur signe ses commits en tant que `Fayssal Merzougui <merzougui.fayssal@gmail.com>` (config locale au repo). Vérifier `git config user.email` avant le premier commit d'une session si besoin.

## 10. Ce que l'utilisateur attend de Claude Code dans ce repo

- **Réponses concises en français.**
- **Pas de sur-ingénierie** : pas d'abstraction prématurée, pas de tests à ajouter sans demande, pas de refacto opportuniste.
- **Toujours typer en TS** pour le nouveau code (`.tsx`).
- **Pas de commentaires inutiles** — uniquement quand le "pourquoi" n'est pas évident.
- **Privilégier l'édition** des fichiers existants à la création de nouveaux.
- **Demander avant** : modifications du tunnel de paiement Stripe, des règles Firebase, du middleware, ou de la structure d'auth.
