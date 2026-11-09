# Site diary — improvements to make (documented only, no code changed)

Verified: 2026-11-08. Nothing in `app/src` was modified for this document.

## Where the app stands right now

| Check | Result |
| --- | --- |
| `npm run build` (tsc --noEmit + vite) | PASS, 3.7 s |
| `npm run verify` (G0–G17 + Export + G13) | PASS, every gate |
| Initial JS (index chunk, gzip) | 127.1 KB / 180 KB budget |
| Lighthouse Performance | 100 |
| Lighthouse Accessibility | 98 |
| Lighthouse Best Practices | 96 |
| PWA installable | yes |
| Sample PDF / 30-photo PDF | 2 pages, 402 KB / 6 pages, 1.69 MB |

Two Lighthouse audits are the only binary failures, and both are one-line fixes (items 2 and 3).

Evidence: `artifacts/gates.txt`, `artifacts/lighthouse.json`, `artifacts/bundle.txt`, `artifacts/pdf-gate.txt`.

---

## 1. PDF export — photos print too small (APPLIED 2026-11-09)

**Where:** `app/src/pdf/build.ts`, the photo block near the end of `buildPdf` (search for `fit: [215, 160]`), plus `toImageRef` at the top of the file.

### What happens today

```ts
// photos: 2-column unbreakable stacks
for (let i = 0; i < ordered.length; i += 2) {
  ...
  cells.push({
    stack: [
      { image: ref, fit: [215, 160] },   // fixed box, always two-up
      ...
```

Every photo is squeezed into a fixed 215 × 160 pt box inside a two-column row, whatever its shape:

- **Portrait photo (3:4)** — fits the 160 pt height, so it prints about **120 × 160 pt (42 × 56 mm)**. This is the "tiny image" complaint.
- **Landscape photo (4:3)** — prints 213 × 160 pt and leaves ~44 pt of the 257 pt cell empty.
- A **single-photo report** still gets a half-width photo with a blank cell beside it.
- The 160 pt cap also leaves visible white space under every row.

Page geometry: A4 is 595 pt wide, `pageMargins: [36, 120, 36, 56]` leaves **523 pt** of content, so two columns with `columnGap: 8` give **~257.5 pt** per cell. The image box should be that wide, not 215.

### Size comparison after the change

| Photo shape | Now | Two-up after | Solo (only photo) after |
| --- | --- | --- | --- |
| 4:3 landscape | 213 × 160 | 257 × 193 | 506 × 380 |
| 3:4 portrait | 120 × 160 | 225 × 300 | 285 × 380 |
| 1:1 square | 160 × 160 | 257 × 257 | 380 × 380 |

Portrait area roughly doubles; a lone photo roughly triples.

### Patch (ready to apply)

Replace the `toImageRef` header and return value:

```ts
/* Layout geometry. A4 is 595 pt wide; the 36 pt side margins leave 523 pt of
   content, so a two-up cell is ~257 pt. Photos fill their cell instead of
   sitting letterboxed inside a fixed 215×160 box, and a report with a single
   photo gets the full page width. */
const CONTENT_W = 523;
const COL_GAP = 8;
const TWO_UP_W = (CONTENT_W - COL_GAP) / 2;
/* Height caps keep one photo plus its caption from pushing the next block to a
   new page: two blocks (image + caption) still fit a page of content. */
const MAX_H_TWO_UP = 300;
const MAX_H_SOLO = 380;

/** Box that fills `boxW` while keeping the photo's own shape. */
function photoBox(aspect: number, boxW: number, maxH: number): [number, number] {
  const h = boxW / aspect;
  if (h <= maxH) return [Math.round(boxW), Math.round(h)];
  return [Math.round(maxH * aspect), Math.round(maxH)];
}

// Downscale again for a WhatsApp-sized report (< 8 MB). Full-width photos keep
// more pixels because the same image is printed much larger.
async function toImageRef(
  photo: PhotoRow,
  maxEdge = 1200
): Promise<{ ref: string; aspect: number }> {
  const bmp = await createImageBitmap(photo.blob, {
    imageOrientation: "from-image",
  });
  const s = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
  // ...unchanged canvas work...
  photoImages[name] = await blobToDataUrl(blob);
  return { ref: name, aspect: w / h };   // was: return [name, blob.size / 1024];
}
```

Replace the photo loop:

```ts
    /* A lone photo is printed full width; anything else is two-up, both
       filling their cell. */
    const solo = ordered.length === 1;
    const boxW = solo ? CONTENT_W : TWO_UP_W;
    const maxH = solo ? MAX_H_SOLO : MAX_H_TWO_UP;
    for (let i = 0; i < ordered.length; i += solo ? 1 : 2) {
      const cells: Doc[] = [];
      for (const cell of solo ? [ordered[i]] : [ordered[i], ordered[i + 1]]) {
        if (!cell) {
          cells.push({ text: "" });
          continue;
        }
        const { ref, aspect } = await toImageRef(cell.row, solo ? 1600 : 1200);
        const caption = cell.group
          ? cell.group[0]?.description
          : cell.row.description;
        cells.push({
          stack: [
            { image: ref, fit: photoBox(aspect, boxW, maxH) },
            caption
              ? { text: caption, fontSize: 8.5, italic: false, margin: [2, 3, 0, 2] }
              : { text: "" },
          ],
          unbreakable: true,
        });
      }
      content.push({
        columns: cells,
        columnGap: COL_GAP,
        dontBreakRows: true,
        margin: [0, 5, 0, 5],
      });
    }
```

Keep the 2-up source at 1200 px: at 257 pt that is ~336 dpi, and the 30-photo report stays well under the 8 MB gate (1.69 MB today). The solo path uses 1600 px because that image is printed at 523 pt (~303 dpi at its 380 pt cap).

### How to verify after applying

1. `npm run build`, then `npx playwright test e2e/g5-pdf.spec.ts` — it writes `artifacts/sample-site-diary.pdf` and `artifacts/stress-site-diary.pdf` and enforces `stressBytes < 8 MB`.
2. New assertion worth adding to `g5-pdf.spec.ts`: read the photo image placement from the page content stream with pdfjs and assert the drawn width is ≥ 240 pt for a two-up photo (today it is ~213 pt or less) and ≥ 400 pt when the report has one photo.
3. Open the PDF and confirm the header-clears-logo and footer/page-counter assertions still hold (they are unaffected — photo layout is body-only).

### Result (applied and deployed 2026-11-09)

Live at `https://site-diary.garfieldprocis.workers.dev`. Regenerated PDFs:

- sample PDF: 2 pages, 402,941 bytes
- 30-photo PDF: 9 pages (was 6), 1,690,142 bytes — still far under the 8 MB gate
- two-up photos fill 257 pt instead of letterboxing in 215 × 160; a 3:4 portrait is now 225 × 300 (was ~120 × 160)
- a report with a single photo prints it full width (523 pt)

The G5 (pdf-gate) and Export gates pass with the taller layout; the header, footer and page-counter assertions are unaffected because only the body layout changed.

### Open questions for the PDF (decide before coding)

- With 30 photos, taller blocks mean more pages (6 today). Is a longer PDF acceptable, or should large bundles switch back to a smaller 3-up layout?
- Long descriptions wrap under a 257 pt cell and can grow the block; consider clamping the caption to 2 lines in the PDF.
- A trailing odd photo still gets a half-width cell; decide whether it should span full width instead.

---

## 2. Accessibility 98 → `landmark-one-main` (1-line fix)

The Lighthouse run audits `/`, which before activation renders `ActivationGate` (`app/src/components/ActivationGate.tsx`). It returns a bare `<div className="min-h-screen ...">`, so the first screen a user ever sees has **no `<main>` landmark**. `app/src/App.tsx` does have `<main id="main">`, but only inside `MainShell`.

Change the gate's outer `<div>` to `<main>`. Expected to take Accessibility to 100.

## 3. Best Practices 96 → favicon 404

`errors-in-console` fails with a single item: `http://localhost:4173/favicon.ico` → 404. Add a `public/favicon.ico`, or add `<link rel="icon" href="/pwa-192.png">` to `app/index.html`. Expected to take Best Practices to 100.

## 4. PWA precache ships the PDF engine to every user

`app/vite.config.ts` precaches `**/*.{js,css,html,...}` and raises `maximumFileSizeToCacheInBytes` to 6 MB for the pdfmake chunk. Result: **26 entries / 2930 KiB** precached on first visit, including `assets/pdfmake.js` (768 KB) and `assets/pdf-builder.js` (925 KB), even though those are only imported lazily when "Create PDF" is tapped — and Adobe-less users on a job site may never tap it.

Suggested: exclude `assets/pdf-*.js` from `globPatterns` (or `workbox.globIgnores`) and serve them from `runtimeCaching` with a `CacheFirst` handler that still records them on first use. Offline export keeps working after the first export; check `e2e/g5-pdf.spec.ts` and `e2e/g6-sync.spec.ts` still pass offline. Trade-off to accept consciously: the first offline export then needs one prior online export.

## 5. "Create PDF" spends its first second writing memos one at a time

In `DiaryScreen.doCreatePdf` the memo upkeep is sequential:

```ts
for (const e of r.equipment) await bumpMemo("equipment", e.name, { hours: e.hours });
for (const m of r.materials) await bumpMemo("material", m.name, { qty: m.qty, unit: m.unit });
for (const p of [...r.workforce.a, ...r.workforce.b]) {
  await bumpMemo("person", p.name);
  await bumpMemo("trade", p.role);
}
```

A 20-person, 10-material day is ~40 round trips before pdfmake even starts. These are independent writes — `await Promise.all([...])` collects them into one batch and shortens the wait on the button with no behaviour change.

## 6. `scripts/artifacts.mjs` is broken but the gate still passes

The verify log contains:

```
locator.fill: Timeout 30000ms exceeded.
  waiting for locator('input[aria-label="Date"]').first()
  at app/scripts/artifacts.mjs:81:19
```

The script still assumes the editor opens on load; the app now launches on Home, so the screenshots in `artifacts/*.png` may be stale. G2 only checks that `icons.png` exists, so it passes anyway. Two fixes: navigate to `#/report/<today>` (or click through Home) in the script, and make G2 fail when `artifacts.mjs` exits non-zero instead of ignoring `artRes.status`.

## 7. No way to delete a real report

Only the seeded sample can be deleted (`deleteSample` in `DiaryScreen`). `Home.tsx` lists every report but the row is a single navigation button. Add a per-row delete with the existing undo snackbar pattern, or at least an archive action, so test/sample days do not accumulate forever.

## 8. No whole-device backup or restore

The only export is one PDF per day. Clearing site data, losing the phone, or reinstalling the PWA loses every report, photo and memo. Given the product promise ("reports stay on this phone"), a JSON export/import of `reports` + `photos` (photos as data URLs) plus a "restore" path in Settings is the highest-value durability item.

## 9. The upload path is a mock

`app/src/sync.ts` simulates the upload (`mockUpload`, 10 % random failure), so "Uploaded" in the UI never means a server has the report. Before any real deployment this needs an endpoint, an idempotency key per report id, and a documented conflict rule (device is source of truth). The retry/backoff and the `navigator.locks` single-tab guard are already good and can stay.

## 10. Dead code and drift (quick cleanups)

- `otherSheet` is typed `"equipment" | "material" | "visitor"` and `OtherSheet` has a visitor branch, but nothing ever calls `setOtherSheet("visitor")` — the Visitors section uses `Lined` chips only. Either add an "Other…" entry to Visitors or drop the branch (`DiaryScreen.tsx:504` and `~1860`).
- `hasHomeHistoryEntry()` (`app/src/lib/route.ts:100`) is unused.
- `CONFIG.features.weatherSuggest` and `CONFIG.features.dictation` are never read — only `haptics` is (`app/src/lib/haptics.ts:5`). The `api.open-meteo.com` runtime-caching rule in `vite.config.ts` only matters if the weather-suggestion flag is ever finished.
- `registerFlush(...)` is called in the render body of `DiaryScreen` (around line 527) rather than in an effect — a side effect during render that works only because the module keeps a single callback.
- `app/src/db.ts` claims "No localStorage except the tiny pre-paint theme flag", but `DiaryScreen` also writes `site-diary-persist-failure` and `App.tsx` writes `pavecon-theme`. Fix the comment or the writes.

## 11. No linter

There is no ESLint config and no `lint` script, so several of the items above (unused export, render-phase side effect, missing deps) are only found by reading. Adding `typescript-eslint` + `eslint-plugin-react-hooks` and a `lint` gate next to `build` in `scripts/verify.mjs` G0 would catch this class of issue automatically.

## 12. `pdf-builder.js` is 568 KB gzip

The chunk is dominated by two base64-embedded Barlow TTFs (`app/src/pdf/pdfFonts.ts`). Subsetting those fonts to the glyphs the PDF can actually print (Latin basic + `³`, `·`, `—`) would cut this materially. It is lazy-loaded, so this only affects the first export on a slow connection — low priority next to item 4.

---

## 13. The sample seed can be interrupted mid-write (found 2026-11-09)

`seedIfNeeded()` inserts the sample report first and then writes its three placeholder photos in a loop. The guard is `if (count > 0) return`, so any interruption after the report row lands (most easily a reload while activation is being written, which is exactly what the e2e helpers do) leaves a permanently partial sample: the next boot sees one report and skips seeding, so the remaining photos never appear. A full-suite run caught this as a carousel showing 1 photo instead of 3.

Fix options: write the photos before the report row so the row is the last write; or store a `seedComplete` setting and, when it is missing, finish the missing photos on boot. Until then the QOL carousel spec asserts against the photo set actually on screen.

## Suggested order

1. Items 2 and 3 (one-line a11y/best-practice wins, take Lighthouse to 100/100).
2. Item 1 (PDF photos — the explicit request; patch above is ready).
3. Item 6 (make the gate honest again) and item 5 (cheap latency win).
4. Item 4 (PWA precache) with the offline export check.
5. Items 7 and 8 (data safety story), then 9 when a real backend exists.
6. Items 10–12 as cleanups.
