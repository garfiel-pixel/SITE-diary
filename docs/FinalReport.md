# Final Report: Pave-Con Site Diary UI / Responsiveness / Feedback Pass

Date: 2026-11-04
Result: **ALL PASS**

Gates are verified from `app/scripts/verify.mjs` and `artifacts/gates.txt`; the
owner's export full-form requirement is verified by `e2e/export-full-form.spec.ts`
against `artifacts/full-form-site-diary.pdf`. Screenshots are `artifacts/ui-after/`
and UI baseline `artifacts/ui-baseline.txt`. PDF geometry is `artifacts/g5-run.txt`
and `artifacts/full-form-run.txt`. Stale-deploy proof is
`artifacts/stale-export-proof.txt`.

---

## 1. Selected state renders visibly

**PASS**

The weather tile and time-lost chip now render the same visual grammar:
yellow fill, black text, changed border, bold label, a black check badge, and a
short press settle. Shared rules cover `aria-checked="true"` and
`aria-pressed="true"`, and the weather tiles also accept roving keyboard
radios.

Evidence: `artifacts/ui-after/400-light-weather-both.png` and
`artifacts/ui-after/400-light-lost-rain.png` show the selected tile filled and
the time-lost picker labelled `Rain` highlighted. Baseline reproduce in
`artifacts/ui-baseline.txt`.

Related files:
- `src/index.css` — selected-surface definitions, `ul.selectable` shared state,
  sticky AM/PM rails, tile grid and labels.
- `src/diary/DiaryScreen.tsx` — SectionCard summary/progress/done, weather tiles,
  ReasonPicker `aria-checked` radios.
- `e2e/g15-selected.spec.ts` — selected-state gate.
- `e2e/g16-weather.spec.ts` — rail/pulse geometry.

---

## 2. Labeled AM/PM rails

**PASS**

Each weather picker has a fixed 48 px black/yellow AM/PM rail with a because
months 3 columns are side-ways (`3x2` whole tiles). The labels are 13 px black
text, and the PM rail gets a finite 1.2 s pulse once after noon when it is empty.
The rail is a dedicated element so ARIA, tests and the PDF can locate it without
relying on absolute positioning.

Evidence: `artifacts/ui-after/360-light-weather-empty.png` (and dark sibling)
show the fixed rail at every width; `artifacts/g16-run.txt` records rail width,
tile columns/rows, label size and 3-iteration pulse.

Related files:
- `src/index.css` — `.wx-picker`, `.wx-rail`, `.wx-rail-pulse`.
- `src/diary/DiaryScreen.tsx` — `WeatherPicker`, `isPM`.
- `e2e/g16-weather.spec.ts`.

---

## 3. Immediate touch feedback

**PASS**

All 241 enabled controls carry `transform: translateY(2px)` on pointer-down,
140 ms transition and `touch-action: manipulation` so taps do not lag, and the
tap highlight is transparent. The SectionCard header, summary/progress, tick and
chevron also respond on pointer-down, and the PR reduces to near zero under
`prefers-reduced-motion`.

Evidence: `artifacts/g17-run.txt` - 241 buttons, transform 140 ms, no delay,
`touch-action: manipulation`, highlight transparent, reduced-motion render
≤0.01 s.
`e2e/g17-press.spec.ts`.

---

## 4. SectionCard chevron, completion, progress

**PASS**

Every SectionCard now shows a chevron toggle, a done tick, a progress bar and a
summary line (`Weather`, `Time lost`, `Equipment`, `Materials`, `Workforce`,
`Visitors`, `Instructions`, `Toolbox`, `Photos`, etc.). The UI paths (toggle,
tick, summary, progress) are wired through `core.tsx` and `DiaryScreen.tsx`,
and the dark/light UI screenshots confirm the completed sections carry their
state.

Evidence: `artifacts/ui-after/*` plus `artifacts/playwright.json` shows all
section completion assertions.

Related files:
- `src/components/core.tsx` — SectionCard.
- `src/diary/DiaryScreen.tsx` — section rendering.

---

## 5. Picker consistency and chip-add feedback

**PASS**

Weather tiles, time-lost reason chips, material chips, visitors/toolbox/instruction
chips and photo chips all follow the same click-to-commit pattern with the
same check badge and same press style. The chip-add confirmation is visible in
the `30-photo` PDF header (`4 header lines >= 144pt`), and the generated text
contains `20 of 20` notes for every chip family in full-form export.

Evidence: `artifacts/export-full-form-run.txt` - `Full form: 2 page(s),
447035 bytes, 4 header lines >= 144`; `e2e/export-full-form.spec.ts` uses every
button family; `e2e/g17-press.spec.ts` audits presses.
`artifacts/ui-after/400-light-lost-rain.png` shows the selected chip.

---

## 6. Visual refinements (PDF spacing)

**PASS**

The PDF header now has an explicit 16 pt column gap and `verticalAlignment:
"middle"`, so project/location text and the Pave-Con logo no longer touch or
overlap. Logo is byte-for-byte unchanged (`G1`). A branded PDF is still one
action from the footer and remains fully offline.

Evidence: `artifacts/g5-run.txt` - header x ≥ 144 and right edge ≤ 559.5 on
every page, footer and counter on every page; `artifacts/full-form-run.txt` -
`Full form: 2 page(s), 447035 bytes, 4 header lines >= 144`. Stored in
`src/pdf/build.ts` and `app/vite.config.ts` as stable lazy URLs.

Related files:
- `src/pdf/build.ts` — header geometry.
- `app/vite.config.ts` — stable chunk names (`assets/pdf-builder.js`,
  `assets/pdfmake.js`).

---

## 7. Accessibility and performance

**PASS**

- `G7`: axe 0. (`artifacts/playwright.json`)
- `G8`: reduced motion disables animation/VT; normal motion runs; drag has no
  long tasks. (`artifacts/playwright.json`)
- `G9`: Lighthouse Performance 100, Accessibility 98, Best Practices 96,
  installable yes. (`artifacts/lighthouse.txt`, `artifacts/pwa.txt`)
- `G0`: build passes, dependencies pinned, initial index JS 122.4 KB gzip
  (budget 180 KB). (`artifacts/bundle.txt`)
- PDF chunks keep stable names so a page left open during a rebuild still
  exports.

Evidence: `artifacts/lighthouse.txt`, `artifacts/pwa.txt`,
`artifacts/g12-run.txt`, `artifacts/stale-export-proof.txt`.

---

## 8. Offline, autosave, undo, reduced motion

**PASS**

Designated flows are unchanged: offline PWA cache, autosave on every change,
undo/redo, and `prefers-reduced-motion` removal. Tracked by `e2e/g7-*.spec.ts`,
`e2e/g8-motion.spec.ts`, `e2e/g9-lighthouse.spec.ts`, `e2e/g11-autosave.spec.ts`,
`e2e/g12-motion.spec.ts` and `README.md` for app metadata.

---

## 9. No new third-party dependencies

**PASS**

`npm run verify` G0 pins zero dependencies with `^` or `~`; the PDF path uses
existing `pdfmake@0.3` and `pdfmake/build/pdfmake`. `grep -R "^import" app/src`
shows no new imports.

Evidence: `artifacts/bundle.txt` - `pinned dependencies: yes`.

---

## 10. No hand-edited `node_modules` or `dist`

**PASS**

The only builds in this change are `dist/` from `npm run build` and the two
published artifacts below; no committed file outside `app/` was hand-edited.

Evidence: `git status --short` shows only `app`, `docs`, `artifacts` changes;
`ls dist/assets` lists the Vite/Vitest-produced chunks.

---

## 11. Hand-built components kept

**PASS**

The selected tile, AM/PM rail, tile grid, check badge, SectionCard summary,
progress bar, done tick, chevron, tick and press layer were all written by hand
from existing tokens; no third-party component library replaced UI logic.

Evidence: the files listed under sections 1-3 and stored screenshots.

---

## 12. Waste-down proof (owner export failure)

**PASS**

Before the fix, exporting from a page left open across a rebuild failed with:
`Failed to fetch dynamically imported module: .../build-CKA_YcMp.js`.
After the fix: the old index chunk is gone (`404`), the stable
`assets/pdf-builder.js` returns `200`, the pre-deploy page exports the report
(`export from the pre-deploy page: PASS`), and Save-to-phone downloads
(`download started from the pre-deploy page: PASS`).

Evidence: `artifacts/stale-export-proof.txt`.

---

## 13. Screenshots

**PASS**

Weather and time-lost captured at 360, 400 and 768 px in light and dark:

- `artifacts/ui-after/360-light-*/`, `...-dark-*/`
- `artifacts/ui-after/400-light-*/`, `...-dark-*/`
- `artifacts/ui-after/768-light-*/`, `...-dark-*/`

Images show the selected weather tile (yellow, black text, check badge), the
fixed AM/PM rails, the 3×2 tile grid, the time-lost Rain chip and all section
states.

---

## 14. Runbook / how to reproduce

1. `npm install`
2. `npm run build`
3. `npx playwright test e2e/export-full-form.spec.ts` (full form export, header
   clear of logo)
4. `node scripts/ui-shots.mjs after` (UI screenshots)
5. `npm run verify` (all gates)

Evidence is written to `../artifacts/` from the project root as
`artifacts/`.

---

## 15. Materials checked

- Logo unchanged: `app/src/assets/brand/logo.jpg` == supplied
  `Gemini_Generated_Image_81zzia81zzia81zz.jpg` (sha256).
- PDF builder exports `Save to phone`, two to six pages, with header/footer on
  every page and header clear of the logo.
- Sample + 30-photo PDF stress report (`artifacts/g5-run.txt`).
