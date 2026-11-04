# NOTES — assumptions, verification and scope

## Next session — workforce by name (documented 4 Nov 2026, not built)

**Current state:** Workforce stores a role plus a headcount (`Crew { name, count }`).
That is why the diary can say “5 steel fixers” but cannot record which steel fixers were
on site. The client has clarified that names matter more than the role count.

**Required next session (P11, directive §21):**

- Two tabs, **Own crew** and **Subcontractors** (group labels stay editable).
- **Add person** opens a sheet with **Name** and **Role** only. One row = one person.
- Role totals and people totals are derived from the named rows; there is no separate
  headcount entry.
- Edit/remove people with the existing 6 s Undo. Copy-from-yesterday carries names,
  roles and groups so names are not retyped each day.
- Toolbox-talk attendance uses the same named people. The PDF prints `Name — Role`,
  role totals and the total people count.
- Existing saved reports migrate honestly: old count rows expand to unnamed people
  (`Unnamed — Role`), never invented names. The seeded sample is replaced with
  fictional named people.
- Gate **G14** covers add/switch/edit/remove/Undo/persistence/copy/PDF/axe/overflow and
  the typing audit. Full acceptance criteria are in the directive.

**Do not ship this as done until** `npm run verify` exits 0 with G14 included and the
refreshed G5/G11 evidence. The current demo still has the old role-count behaviour.

## Logo

- The supplied file `Gemini_Generated_Image_81zzia81zzia81zz.jpg` (1308 × 816,
  white background) is copied **byte-for-byte** to `src/assets/brand/logo.jpg` and
  `public/brand/logo.jpg`. Gate G1 compares SHA-256:
  `52b5cc496587f4dbc91440fd1154dc82e69c59c64299f52322b1a00742b47059`.
- It is **not** redrawn, traced, recoloured, cropped or re-encoded. The JPG's white
  background is solved by layout, not editing: a white rounded plate (6 px padding)
  on the black header band. The PDF places the unmodified JPG on white paper.
- A hard-hat-only crop would be a crop of the supplied pixels (approx. x 410–870,
  y 0–335). It was **not** done; it remains an owner decision.
- The UI and gate show the same public file. It is referenced as a CSS background
  on a `role="img"` plate so the accessible text (not the 366 KB JPG) is the LCP;
  the artwork is still preloaded with high priority. This is why Lighthouse
  performance moved from 85 to 100 without touching the image.
- Yellow measured from the artwork (pixels R>220, G>190, B<90, median):
  `#FCE501`. Black-on-yellow ≈ 15.5:1; yellow is never used as text on white.

## Sample data

- Sample project names and people are **fictional**.
- The sample report is dated **yesterday** so the demo's “Copy from …” path is
  available on first open. “Start blank page” is on the new-day screen.
- Sample photos are neutral placeholders generated in code (diagonal bands +
  label); no stock photography or third-party imagery.

## VERIFY results (against installed packages, 3 Nov 2026)

| Item | Result |
|---|---|
| Konsta 5.5 | `konsta/react/theme.css` imported. The app uses hand-built sheets/cards instead of Konsta components; no Konsta v5 component props are relied on. Deliberate deviation to match the paper form and the custom controls. |
| pdfmake 0.3.13 | Verified by generating real PDFs: promise `getBlob()`, `addVirtualFileSystem`, `addFonts`. Bookmarks are `outline: true` + `outlineText` on the text node (not a document-level `outlines` array — that property is ignored by 0.3). |
| Barlow `m³` | Present in the embedded TTF; the G5 PDF text extraction asserts `m³`. |
| `field-sizing: content` | Used with `@supports not (field-sizing: content)` → JS height fallback in `Lined`. |
| View Transitions | Feature-detected in `src/lib/vt.ts`; reduced motion exits before calling it. G12 spies on `startViewTransition`. |
| Web Share with files | Code path uses `navigator.canShare({files})` and keeps the built Blob in memory so `navigator.share` is called directly in the tap handler (no `await` first). Not exercisable in headless Chromium; **Save to phone** is the tested fallback. |
| iOS install / haptics | Manual “Share → Add to Home Screen” hint shown on iPhone. The hidden-checkbox iOS haptic trick was **not** built (needs a real iPhone). `navigator.vibrate` only. |
| Open-Meteo / weatherSuggest | Not built; flag is `false`. Workbox has a network-only route ready if enabled. |
| In-app dictation | Not built; flag is `false`. Text areas are dictation-friendly (keyboard mic works offline). |
| Background Sync | Not used (not on Safari). Online + visibilitychange listeners are the contract. |

## Behaviour decisions

- Autosave debounces 400 ms and writes the whole report. There is no Save button.
- One report per date. Copying yesterday creates the day's row immediately; Undo
  deletes it.
- Deleting a row/photo is immediate with a 6 s Undo that restores the item at its
  original position (no “Are you sure?” dialog).
- “Copy from yesterday” carries project, site, workforce and equipment. Weather,
  time lost, materials, visitors, instructions, toolbox, photos and recorded-at are
  always left behind. Work in progress is carried only when the
  “Include work in progress” chip is on.
- Recorded by is required for the PDF. Report time is stamped **before** rendering
  so the first PDF prints it, not only later PDFs.
- The sticky action bar puts the four status chips above a full-width Create PDF
  button. On 400 px they wrap to two rows; the form has bottom padding so the last
  card can always scroll clear of the bar.
- Closed sections mount only when first opened. This keeps tape dragging cheap
  (55 fps budget) without changing what is saved.
- Tape drag previews in the DOM and commits once on release, via
  `startTransition`. The ruler ticks are memoised. This is what removed long tasks
  at 4× CPU throttle.
- Dark theme is true black. Theme is stored in Dexie `settings`; a tiny
  localStorage key is used only for pre-paint to avoid a flash.

## What is not here

- No backend, real auth, accounts, payments, analytics, ads or third-party scripts.
- The upload is a mock (`sync.ts`, ~10% simulated failure, backoff 2 s / 8 s / 30 s
  then 2 min).
- Weather suggestion and in-app speech recognition are intentionally not built.
- There is no PDF editor/preview beyond the result sheet; no cloud sync.
- Lighthouse 13 no longer has a PWA category. Installability is checked via CDP
  `Page.getInstallabilityErrors` (empty = installable) plus manifest/service-worker
  facts in `artifacts/pwa.txt`.

## Evidence map (`../artifacts`)

- `bundle.txt` — build output, gzip initial JS, pinned versions, asset sizes.
- `g1-logo.txt` — three SHA-256 values.
- `icons.png` — every icon at 24/48 px, light and dark.
- `light-400.png`, `dark-400.png`, `light-1280.png`, `dark-1280.png` — viewport
  screenshots of the sample report.
- `sample-site-diary.pdf`, `stress-site-diary.pdf`, `pdf-gate.txt`, `pdf-page1.png`.
- `lighthouse.txt`, `lighthouse.json`, `pwa.txt`.
- `playwright.json` — raw gate results; `gates.txt` — final table.
- `fixtures/` — 30 synthetic 12 MP JPEGs (including EXIF orientation 6).

## Gate notes

- G4 verifies each stored blob ≤ 500 KB, long edge ≤ 1600 px, and that the four
  EXIF orientation-6 fixtures decode portrait. Measured output: 56–64 KB each.
- G5 sample: 1 page / ~389 KB. Stress (30 photos): 6 pages / ~1.6 MB, text on every
  page contains the recorded-by footer, page counter and header. Page 1 is rendered
  to `pdf-page1.png` and visually confirmed to use the supplied artwork.
- G8 runs axe WCAG 2.0/2.1/2.2 A/AA on gate, sample form, blank form, toolbox,
  photos, result sheet and settings, light and dark: 0 serious/critical.
- G9 mobile Lighthouse: Performance 100, Accessibility 98, Best Practices 96;
  installability errors `[]`.
- G12 reduced motion: `.roll` animation and section transition compute to
  0.00001 s, and no view transition is called. Normal motion: 0.18 s / 0.25 s and
  one view transition. A 3 s drag at 4× CPU throttle has no long task over 50 ms.
- Typing audit: 11 taps, 0 typed characters.
- G0 initial JS is 119.5 KB gzip (budget 180 KB), excluding lazy pdfmake and the
  font chunks. The PDF chunk is precached for offline use.
