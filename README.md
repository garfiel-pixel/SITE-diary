# Masterbuilders Site Diary

A phone-first, offline-capable daily site diary for a paving and construction crew. It follows the paper form, minimises typing, generates a branded PDF, and keeps working with no network.

Built and maintained by **[garfiel-pixel](https://github.com/garfiel-pixel)**.

> **Current status: working demo.** There is no production backend, real authentication, or payment in this repository yet. Uploads are mocked. The funded scalability plan is in [`docs/SCALABILITY_PLAN.md`](docs/SCALABILITY_PLAN.md), with a technical review in [`docs/SCALABILITY_REVIEW.md`](docs/SCALABILITY_REVIEW.md).

---

## Why it exists

Site supervisors fill in the same paper diary every day: weather, workforce, equipment hours, work in progress, visitors, instructions, delays, and photos. The paper gets wet, lost, or rewritten at the office.

This app keeps the familiar order and language of that form, but:

- saves every change on the device as you type;
- works offline and installs as a PWA;
- turns the day into a branded PDF that can be shared or saved;
- avoids the keyboard wherever a tape, stepper, chip, or number pad will do.

---

## Features

| Area | What it does |
|---|---|
| **Daily report** | One scrolling form in paper order: project, site, date, weather, workforce, equipment, work in progress, visitors, instructions, delays, photos |
| **Near-zero typing** | 11 taps and 0 typed characters on the sample-equivalent day (target: ≤ 25 taps / ≤ 40 characters) |
| **Named workforce** | Own crew and subcontractors by name and role, with derived role totals |
| **Equipment** | Drag ruler or −/+ stepper, live marker and summary, status chips |
| **Photos** | Multi-select, EXIF-aware, client-side shrink to ≤ 1600 px / ≤ 400 KB, grouped captions |
| **PDF** | Branded A4 PDF built locally with pdfmake, self-hosted fonts, byte-for-byte logo |
| **Offline first** | Dexie/IndexedDB storage, service worker, save-on-change, boot recovery |
| **Accessibility** | Keyboard and screen-reader support, 56 px targets, reduced-motion support, axe gate |
| **PWA** | Installable, prompt-based updates (never reloads under a half-filled form) |
| **Demo activation gate** | `PAVECON-DEMO` in development or with `?demo`; explicitly not security |

---

## Tech stack

- **UI:** React 19, TypeScript 5.9, Vite 8
- **Styling:** Tailwind CSS 4 with Konsta 5 theme tokens
- **Local data:** Dexie 4 (IndexedDB) with `dexie-react-hooks`
- **PDF:** pdfmake 0.3 with self-hosted Barlow fonts
- **PWA:** `vite-plugin-pwa` / Workbox
- **Testing:** Playwright gates, axe-core, Lighthouse
- **Hosting target:** Cloudflare Workers static assets (Wrangler)

No server is required to run the app today.

---

## Quick start

```bash
cd app
npm ci
npm run dev          # http://localhost:5173
```

Production build and local preview:

```bash
npm run build        # tsc --noEmit && vite build
npm run preview      # http://localhost:4173
```

Demo activation code: **`PAVECON-DEMO`**. It is shown on the gate only in development or when the URL contains `?demo`; the production build hides it by default.

### Install on a phone

- **Android / Chrome / Edge:** open the site, then Settings → **Install this app**.
- **iPhone / Safari:** Share → **Add to Home Screen**, and leave **Open as Web App** on.

---

## Scripts

Run from `app/`.

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check and production build |
| `npm run preview` | Serve the production build locally |
| `npm run test:e2e` | Playwright gates and typing audit |
| `npm run verify` | Build, logo hash, all tests, artifacts, Lighthouse, final gate table |
| `npm run make-icons` | Regenerate the custom icon set |
| `npm run make-fonts` | Regenerate self-hosted PDF fonts |
| `npm run make-fixtures` | Regenerate sample fixtures |
| `npm run artifacts` | Collect evidence files |
| `npm run lighthouse` | Run Lighthouse and write reports |

`npm run verify` writes evidence to `artifacts/` and exits non-zero if any gate fails. See [`app/README.md`](app/README.md) for the full gate table and the 60-second demo script.

---

## Project structure

```
.
├── app/                     React PWA
│   ├── src/
│   │   ├── config.ts        single source of truth: brand, company, features
│   │   ├── db.ts            Dexie schema, settings, boot recovery
│   │   ├── seed.ts          catalogues + fictional sample report
│   │   ├── diary/           the form, workforce, photos, toolbox talk
│   │   ├── components/      shared UI, activation gate, sheets
│   │   ├── pdf/             pdfmake build, fonts, logo
│   │   ├── icons/           custom SVG icon set
│   │   ├── sync.ts          report states + mock uploader
│   │   └── workers/         off-thread photo shrink
│   ├── e2e/                 Playwright gates
│   ├── scripts/             build, fixtures, artifacts, Lighthouse
│   └── public/              logo, PWA icons, security headers
├── docs/                    plans, reviews, evidence, backlog
├── wrangler.jsonc           Cloudflare static-asset deployment
└── artifacts/               generated gate evidence (git-ignored)
```

---

## Architecture

```
┌──────────────────────────────┐
│ Phone / laptop               │
│  React + Dexie (IndexedDB)   │
│  service worker + PWA        │
│  local PDF generation        │
└──────────────┬───────────────┘
               │ (mock today)
               ▼
┌──────────────────────────────┐
│ Cloudflare Worker            │
│  static assets from app/dist │
└──────────────────────────────┘
```

The funded plan adds identity, a project/site registry, cloud sync to D1, photo storage in R2, and a read-only PM dashboard — without making the cloud a hard dependency for the field form.

Start with:

- [`docs/SCALABILITY_PLAN.md`](docs/SCALABILITY_PLAN.md) — product and delivery plan.
- [`docs/SCALABILITY_REVIEW.md`](docs/SCALABILITY_REVIEW.md) — technical review and blockers.
- [`docs/backend/schema-v2.sql`](docs/backend/schema-v2.sql) — reviewed D1 schema draft.

---

## Deployment

The repository is configured for Cloudflare Workers static assets.

```bash
cd app
npm run build
cd ..
npx wrangler deploy
```

`wrangler.jsonc` serves `./app/dist` with SPA fallback. It currently has no `main` Worker and no D1/R2 bindings; those arrive with the funded backend phase.

---

## Quality gates

The project uses executable gates rather than “it looks fine”:

- build and pinned dependencies;
- byte-for-byte logo check;
- icon sheet and no hard-coded colours;
- persistence online and offline;
- photo handling, EXIF, bundles, undo;
- PDF text/header/footer and 30-photo stress;
- offline PWA and mock upload;
- activation gate;
- axe accessibility (0 serious/critical);
- Lighthouse (100 / 98 / 100, installable);
- tape/keys/hold/numpad/stepper;
- form completeness, no overflow, CLS;
- reduced motion and long tasks;
- named workforce and v1 migration;
- final regression.

Latest evidence lives in `artifacts/` after `npm run verify`.

---

## Honesty and scope

- This is a **demo**. Uploads are simulated in `app/src/sync.ts`; there is no endpoint.
- The activation gate is a demo convenience, **not security**.
- Company motto and contact details are client-supplied and not independently verified.
- Sample project names and people are fictional.
- Optional `weatherSuggest` and in-app `dictation` features are off and not built.
- See [`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md) for known gaps and [`PaveCon_SiteDiary_Directive.md`](PaveCon_SiteDiary_Directive.md) for the original brief.

---

## Contributing

Contributions are welcome within the project scope. Read [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) first.

Security issues: please follow [`SECURITY.md`](SECURITY.md) and do not open a public issue for a vulnerability.

Privacy: see [`PRIVACY.md`](PRIVACY.md). Do not put real worker or client data into the demo.

---

## Ownership and licence

Copyright © 2026 **garfiel-pixel**. All rights reserved.

This repository is proprietary. See [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE). The licence can be changed by the copyright holder; see [`docs/OWNERSHIP.md`](docs/OWNERSHIP.md) and [`docs/LICENSING-HISTORY.md`](docs/LICENSING-HISTORY.md).

Maintainers: repository settings, branch protection, and security features are
listed in [`docs/GITHUB_SETUP.md`](docs/GITHUB_SETUP.md). Release notes are in
[`CHANGELOG.md`](CHANGELOG.md).

The Pave-Con name, logo, and supplied brand artwork remain the property of their respective owner and are used here for the client project. They are not granted for reuse by the software licence.
