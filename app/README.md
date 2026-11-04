# Pave-Con — Masterbuilders Site Diary

A phone-first, offline site diary for a paving and construction crew. One scrolling
page in the order of the paper form, near-zero typing, a branded PDF, and a demo
activation gate. No backend, no accounts, no payments.

- **Stack:** Vite 8 + React 19 + TypeScript, Tailwind CSS 4, Konsta 5 theme tokens,
  Dexie 4 (IndexedDB), pdfmake 0.3, Vitest-free Playwright gates, PWA via
  `vite-plugin-pwa`.
- **Brand:** the supplied JPG logo is used byte-for-byte (never redrawn or
  re-encoded). Yellow `#FCE501` measured from the artwork. See `NOTES.md`.

## Run it

```bash
npm ci
npm run dev          # http://localhost:5173
```

Production build / preview:

```bash
npm run build        # tsc --noEmit && vite build
npm run preview      # http://localhost:4173
```

Demo activation code: **`PAVECON-DEMO`**. It is only printed on the gate in dev or
when the URL has `?demo`; the production build never shows it by default.

## Gates

```bash
npm run test:e2e     # Playwright gates G3, G4, G5, G6, G7, G8, G10, G11, G12 + typing audit
npm run verify       # one command: build (G0), logo hash (G1), all tests, artifacts (G2),
                     # Lighthouse (G9), and the final G13 table
```

`npm run verify` writes evidence to `../artifacts/` and prints a gate table. The full
report is `../artifacts/gates.txt`. Every gate must pass for the command to exit 0.

Latest evidence (3 Nov 2026):

| Gate | Result | Evidence |
|---|---|---|
| G0 build / pinned deps / ≤180 KB initial JS | PASS (119.5 KB gzip) | `artifacts/bundle.txt` |
| G1 logo byte-for-byte | PASS | `artifacts/g1-logo.txt` |
| G2 icon sheet, no hard-coded colours | PASS | `artifacts/icons.png` |
| G3 persistence online + offline | PASS | `artifacts/playwright.json` |
| G4 12 photos, EXIF, bundles, Undo | PASS | `artifacts/playwright.json` |
| G5 PDF text/header/footer + 30-photo stress | PASS | `artifacts/pdf-gate.txt`, PDFs |
| G6 offline PWA + mock upload | PASS | `artifacts/playwright.json` |
| G7 activation gate | PASS | `artifacts/playwright.json` |
| G8 axe: 0 serious/critical | PASS | `artifacts/playwright.json` |
| G9 Lighthouse | PASS (100 / 98 / 96, installable) | `artifacts/lighthouse.txt`, `pwa.txt` |
| G10 tape/keys/hold/numpad/stepper | PASS | `artifacts/playwright.json` |
| G11 form completeness, no overflow, CLS | PASS | `artifacts/playwright.json` |
| G12 reduced motion + long-task trace | PASS | `artifacts/playwright.json` |
| G13 final regression | PASS | `artifacts/gates.txt` |

Typing audit (sample-equivalent report on a new day): **11 taps, 0 typed
characters** (target ≤ 25 taps / ≤ 40 characters).

## 60-second demo script

1. Open the deployed URL (or `npm run preview`), type `PAVECON-DEMO`, **Activate**.
   The app opens on today's new day.
2. Tap **Copy from Monday (2 November 2026)**. Project, site, crew and equipment
   are carried; the Undo snackbar appears for 6 s.
3. Open **Weather**, tap **A.M. Clear** and **P.M. Showers**. Add two **Work in
   progress** chips (Milling, Asphalt laying). Tap **Use K. Johnson?**.
4. Open **Equipment**, drag the Paver ruler or use −/+. The marker follows, the
   summary strip updates, the status chips go ✓.
5. Open **Photos**, choose 3 gallery photos (or use the seeded sample). Select two,
   tap **Describe selected**, apply “Progress — asphalt laying”. The PDF prints one
   caption for the pair.
6. Tap **Create PDF**. The result sheet shows the file name, size and page count.
   Use **Share / Send** (phones) or **Save to phone**.
7. Turn the network off, reload. The service worker serves the app; the report is
   still there and its state reads **Saved on phone**.
8. Turn the network on. The state moves **Uploading → Uploaded** (a mock uploader).
   This is a stand-in for a real endpoint.

Install on a phone: Chrome/Edge shows **Install this app** in Settings. On iPhone use
Share → **Add to Home Screen** and leave **Open as Web App** on.

## Source map

```
src/
  config.ts            single source of truth: brand, company, features
  db.ts                Dexie schema, memo/usage, settings, boot recovery
  seed.ts              paving catalogues + fictional sample report/photos
  diary/               the form, photos, toolbox talk
  components/core.tsx  tape slider, numpad, stepper, lined text, cards, chips
  icons/index.tsx      custom 70-icon SVG set (24 px + 48 px duotone)
  pdf/                 pdfmake 0.3 build + self-hosted fonts + logo base64
  sync.ts              report states + mock upload + retry/backoff
  workers/             off-thread photo shrink
e2e/                   Playwright gates and typing audit
scripts/               icons, fonts, fixtures, artifacts, Lighthouse, verify
```

## Scope and honesty

This is a demo skeleton. There is no backend, real authentication, payment or
production claim. The mock upload always pretends to send; see `sync.ts`. Motto and
contact details are client-supplied (in `config.ts`) and not independently verified.
Sample project names are fictional. Optional features `weatherSuggest` and in-app
`dictation` are off and not built. See `NOTES.md` for assumptions and verification
results.
