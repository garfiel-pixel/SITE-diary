# DIRECTIVE: Pave-Con Site Diary demo — 2026 build plan

**To the terminal AI.** You execute this. You write all the code yourself.
Code blocks below are **reference snippets** that show intent. Do not paste them blindly. Adapt them, then make them pass the gates.

**Standing rules**
1. Work phase by phase (P0 → P10). When a phase's gate passes, start the next phase immediately. Do not ask for permission between verified steps.
2. Stop only when a gate fails 3 times in a row. Then report the failing gate, what you tried, and the error output.
3. Never mark a gate passed without running its check and showing the output.
4. Anything marked **VERIFY** must be checked against live docs or the installed package before you rely on it. Do not guess APIs.
5. This is a skeleton demo for showing someone. There is no backend, no real accounts, no payments, no production claims.

---

## 0. Scope register (self-enforcing)

Every feature carries one tag. Build nothing without a tag.

| Tag | Meaning |
|---|---|
| `[BRIEF]` | In the original brief. Mandatory. |
| `[LESS-WORK]` | New. Cuts taps or typing for the person filling the form. Authorised by this directive. |
| `[POLISH]` | New. Visual, motion, accessibility or performance only. Authorised. |
| `[OPTIONAL]` | New. Build behind a flag in `config.features`, default **off**, so the demo never breaks if it fails. |

Anything with no tag is out of scope. If you think something is missing, add it to `NOTES.md` and do not build it.

`config.features = { weatherSuggest: false, dictation: false, haptics: true }`

---

## 1. What the research found (drives every decision)

**Market benchmark.** Raken, HCSS and similar daily-report apps set the bar. Their common time-savers: voice-to-text in notes, auto-captured weather, rolling over the previous day's work log, photo markup, branded PDF, and share from the phone. Sources: Raken's own product pages and 2026 comparison write-ups.

**Where this demo can beat them for a small paving firm:** one scrolling page that mirrors the paper form people already know, near-zero typing, works fully offline, and the PDF looks like Pave-Con's own document.

**Verified platform facts (as of 3 Nov 2026):**

| Item | Finding | Consequence |
|---|---|---|
| Konsta UI | v5.5.0 (28 Sep 2026). Tailwind v4, React 19, iOS 26 and Material 2025 themes. | Use v5 API. Tailwind v4 theming is CSS-based (`@theme`), not `tailwind.config.js`. **VERIFY** the install steps at konstaui.com. |
| Vite / PWA plugin | `vite-plugin-pwa` 1.3.0 adds Vite 8 peer support. `@vitejs/plugin-react` 6.x pairs with Vite 8. | Vite 8 + plugin 1.3.x is allowed. If `npm i` shows a peer conflict, fall back to Vite 7. |
| pdfmake | 0.3.x (0.3.11 seen, Jun 2026). Every method returns a Promise. Fonts go through `addVirtualFileSystem` and `addFonts`, not `createPdf` arguments. Added `section` node, outlines, `verticalAlignment`. | Use 0.3 API. Old 0.2 tutorials are wrong for this build. |
| Dexie | 4.4.x, with `dexie-react-hooks` 4.4.0 (`useLiveQuery`). | Live UI from IndexedDB with no extra state library. |
| `field-sizing: content` | Chrome/Edge 123, Safari 26.2, Firefox 152. Baseline "newly available" since June 2026. | Auto-growing lined text areas in pure CSS, with a small JS fallback for older phones. |
| View Transitions (same-document) | Baseline. Chrome/Edge 111, Safari 18, Firefox 133. | Animate section open/close and count changes natively. Feature-detect always. |
| Web Share with files | `navigator.canShare({files})` and `navigator.share({files})` work in Safari (14+) and Chrome. Needs HTTPS and a user tap. | One-tap send to WhatsApp or email. See the transient-activation rule in P6. |
| iOS install | No `beforeinstallprompt` on iOS. Since iOS 26, "Open as Web App" is on by default for Home Screen sites. | Show a manual "Share → Add to Home Screen" hint on iPhone only. |
| Voice | Web Speech API is inconsistent: Chrome sends audio to Google's servers, offline on-device support is still emerging. | Do **not** depend on it. The phone keyboard's own dictation mic works offline. In-app mic is `[OPTIONAL]`. |

**Problems found in the existing mock-ups (the two uploaded HTML files are identical):**
1. Loads Google Fonts from a CDN. **Breaks offline.** Self-host fonts.
2. Uses a navy ink palette. Brand is **yellow, black, white**.
3. Sample data is house-building (blocks, rebar, mason). Pave-Con is **paving and construction**. Re-seed.
4. State lives in `localStorage`. Brief requires **Dexie**.
5. No logo, no toolbox talk, no photos, no PDF, no PWA, no activation gate.
6. Good parts to keep: tape-measure slider concept, SVG weather icons, chip catalogues, summary strip idea. Rebuild them properly in React.

---

## 2. Stack (pin exact versions after install)

Run `npm view <pkg> version` for each, install, then pin exact versions in `package.json`.

- `vite` 8.x (or 7.x on peer conflict), `@vitejs/plugin-react`, `react` 19, `react-dom` 19, `typescript`
- `tailwindcss` 4.x with `@tailwindcss/vite`
- `konsta` 5.5.x (React build)
- `dexie` 4.4.x, `dexie-react-hooks` 4.4.x
- `pdfmake` 0.3.x
- `vite-plugin-pwa` 1.3.x, `workbox-window`
- Fonts via `@fontsource/barlow-condensed` and `@fontsource/barlow` (self-hosted, bundled, precached)
- Dev only: `@playwright/test`, `@axe-core/playwright`, `lighthouse`, `sharp` (icon generation by resizing only)

**Gate G0** — `npm run build` succeeds, `npm run dev` serves, `package.json` has no `^` or `~` on the packages above.

---

## 3. Brand, logo and tokens `[BRIEF]` `[POLISH]`

### 3.1 Logo rules (non-negotiable)
- The supplied file `Gemini_Generated_Image_81zzia81zzia81zz.jpg` (1308×816, white background) is the logo. Copy it **byte-for-byte** to `src/assets/brand/logo.jpg`. Never redraw, trace, recolour, crop, or re-encode it for UI or PDF use.
- **Gate G1** — `sha256sum` of `src/assets/brand/logo.jpg` equals the sha256 of the supplied file. Print both.
- The JPG has a **white background**. On a black header it would look like a white rectangle. Solve it with a **logo plate**: a white rounded container (`rounded-2xl`, 6–8px padding) holding the unmodified image, sitting on the black header band. This is a layout choice, not an edit to the artwork.
- Do **not** remove the white background with a script unless the owner approves later. Note this in `NOTES.md`.
- PDF header: the logo sits directly on white paper, so no plate is needed there.

### 3.2 App icon
- Generate 192, 512 and a **maskable** 512 by **resizing only**: place the supplied logo centred on a black square with 12% padding (maskable safe zone is the central 80%). Use `sharp` in a one-off build script `scripts/make-icons.mjs`.
- A hard-hat-only crop would be a crop of the supplied pixels (approx. x 410–870, y 0–335). Do not do it unless asked. Note it in `NOTES.md` as an option.

### 3.3 Colour tokens
Measure the logo's dominant yellow with a script (sample pixels where R>220, G>190, B<90, take the median). Store it as `BRAND.yellow` in `src/config.ts`. Provisional value from a quick sample: about `#F8E000`. Replace it with the measured value.

Contrast rules (computed for `#F8E000`):

| Pair | Ratio | Rule |
|---|---|---|
| Black on yellow | ≈ 15.6 : 1 | Yellow fills always carry black text and black icons. |
| Yellow on white | ≈ 1.3 : 1 | **Never** yellow text or thin yellow lines on white. |
| Yellow on black | ≈ 15.6 : 1 | Allowed in dark mode, including yellow text. |

```css
/* src/index.css  (Tailwind v4)  — reference only */
@import "tailwindcss";

@theme {
  --color-brand: #F8E000;          /* replace with measured value */
  --color-ink: #0B0B0B;
  --color-paper: #FFFFFF;
  --font-display: "Barlow Condensed", "Arial Narrow", sans-serif;
  --font-body: "Barlow", system-ui, sans-serif;
}

:root {
  color-scheme: light dark;
  --bg: #F4F4F2;  --surface: #FFFFFF;  --text: #0B0B0B;  --muted: #3F3F3F;
  --rule: #BDBDB8; --accent: var(--color-brand); --on-accent: #0B0B0B;
  --focus-a: #0B0B0B; --focus-b: var(--color-brand);
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #000; --surface: #141414; --text: #F5F5F5; --muted: #C9C9C9;
    --rule: #3A3A3A;
  }
}
:root[data-theme="dark"] { /* same dark values */ }
:root[data-theme="light"] { color-scheme: light; }

@media (prefers-contrast: more) { :root { --rule: #000; --muted: var(--text); } }

:focus-visible {                       /* double ring: visible on yellow, black and white */
  outline: 3px solid var(--focus-a);
  outline-offset: 2px;
  box-shadow: 0 0 0 6px var(--focus-b);
}
```

Theme control: Auto / Light / Dark in settings, saved in Dexie `settings`. Apply `data-theme` before first paint (tiny inline script in `index.html`) to avoid a flash.

### 3.4 Sunlight rules `[POLISH]`
- Body text ≥ 16px, weight ≥ 500, never grey-on-white lighter than `--muted`.
- Primary controls ≥ **56px** tall. Tape thumb hit area ≥ **64px**. (WCAG 2.2 only needs 24px, Apple 44pt, Material 48dp. Gloves need more.)
- No information by colour alone. Every status has an icon and a word.
- Light theme is the default high-contrast outdoor theme. Dark theme is true-black based.

### 3.5 Typography
- Display (titles, section headers, big numbers): Barlow Condensed 700, uppercase, tight tracking. Echoes the heavy condensed lettering of the logo.
- Body: Barlow 500/600.
- Numbers: `font-variant-numeric: tabular-nums` so counts do not jitter.
- Dates and times: `Intl.DateTimeFormat('en-JM', …)`. Same formatting in the PDF.

### 3.6 Config object `[BRIEF]`
One file `src/config.ts`, exported const, nothing duplicated elsewhere:
```ts
export const CONFIG = {
  company: "Pave-Con Ltd",
  tagline: "Paving & Construction",
  formTitle: "Masterbuilders - Site Diary",
  motto: "CHOOSE WISELY... BUILD WITH CONFIDENCE",
  contact: {
    address: "Lot 1 Dunsinane Hatfield P.O., Manchester, Jamaica W.I.",
    phone: "[876] 625-7283",
    email: "info@paveconja.com",
  },
  contactNote: "Supplied by the client, not independently verified.",
  activation: { exampleCode: "PAVECON-DEMO", storeKey: "activation" },
  brand: { yellow: "#F8E000" },   // measured value
  features: { weatherSuggest: false, dictation: false, haptics: true },
} as const;
```

---

## 4. Icons: custom SVG set `[POLISH]`

You said "we can make an SVG icon for it". Do this as a single typed icon set.

- File `src/icons/index.tsx`. One React component per icon, one `<Icon name="…" size={…} />` wrapper.
- Grid 24×24 for UI, 48×48 duotone for tiles. 2px stroke, round caps and joins, `currentColor` stroke. Duotone fill uses `var(--accent)` for one accent shape only, so icons stay readable in dark mode and in print.
- Reuse the existing weather cloud/sun/rain path geometry from the uploaded mock as a starting point. Upgrade to duotone.
- Required icons:
  - Weather: clear, partly cloudy, overcast, showers, heavy rain, storm
  - Time-lost reasons: none, rain, breakdown, late materials, power/water cut, site access, other
  - Equipment: excavator, backhoe, tipper/dump truck, paver, roller/compactor, grader, milling machine, water bowser, concrete mixer, crane, generator, bobcat, other
  - Materials: asphalt, marl, gravel, sand, cement, blocks, rebar, ready-mix, tack coat, pipe, kerb, other
  - Trades: supervisor, paver operator, roller driver, raker, labourer, flagman, mason, steel fixer, carpenter, electrician, plumber, driver, other
  - UI: camera, gallery, check, plus, minus, trash, undo, share, download, cloud-saved, cloud-uploading, cloud-done, lock, sun, moon, calendar, clock, user, users, warning
- Every icon has `aria-hidden="true"` when beside text, or `role="img"` plus `aria-label` when alone.
- Do **not** use SVG for the company logo.

**Gate G2** — a dev-only `/icons` route renders every icon at 24 and 48px in light and dark. Screenshot saved to `artifacts/icons.png`. No icon uses a hard-coded colour except through CSS variables.

---

## 5. Data layer `[BRIEF]` `[LESS-WORK]`

Dexie is the only store. No `localStorage` except the tiny theme flag in the pre-paint script.

```ts
// src/db.ts — reference only
import Dexie, { type EntityTable } from "dexie";

export interface Report {
  id: string;                  // crypto.randomUUID()
  date: string;                // "YYYY-MM-DD"
  project: string; site: string;
  weather: { am: WeatherKey | null; pm: WeatherKey | null };
  timeLost: { reason: LossKey | null; hours: number };
  equipment: { id: string; name: string; hours: number }[];
  materials: { id: string; name: string; qty: number; unit: Unit }[];
  workforce: { groups: [string, string]; a: WorkforcePerson[]; b: WorkforcePerson[] };
  wip: string; visitors: string; instructions: string;
  toolbox: { topic: string; presenter: string; time: string; presentIds: string[]; notes: string } | null;
  recordedBy: string; recordedAt: number | null;
  isSample: boolean;
  syncState: "draft" | "saved" | "uploading" | "uploaded";
  updatedAt: number;
}
export interface PhotoRow {
  id: string; reportId: string; groupId: string | null;
  blob: Blob; w: number; h: number; description: string; takenAt: number;
}

class DiaryDB extends Dexie {
  reports!: EntityTable<Report, "id">;
  photos!: EntityTable<PhotoRow, "id">;
  register!: EntityTable<{ id: string; name: string }, "id">;   // toolbox attendee names
  memo!: EntityTable<{ kind: string; value: string; uses: number; lastUsed: number; meta?: any }, never>;
  settings!: EntityTable<{ key: string; value: unknown }, "key">;
  constructor() {
    super("pavecon-site-diary");
    this.version(1).stores({
      reports:  "id, date, syncState, updatedAt",
      photos:   "id, reportId, groupId",
      register: "id, &name",
      memo:     "[kind+value], kind, uses, lastUsed",
      settings: "key",
    });
  }
}
export const db = new DiaryDB();
```

**Rules**
- Autosave: debounce 400 ms after any change, write the whole report. Show "Saved on phone" with time. No Save button.
- On first save call `navigator.storage?.persist?.()` once, so the browser is less likely to evict data. Store the result in `settings`.
- `memo` holds usage counts and last-used values for: equipment names, material names, trade names, toolbox topics, presenters, project names, site names, recorded-by names, visitor names. It powers the smart chips in section 6.
- Photos are stored as `Blob`, never base64.
- On boot, any report stuck in `uploading` returns to `saved` (the app may have been closed mid-upload).

**Gate G3** — Playwright test: fill a report, reload the page, data is intact. Put the browser offline, edit, reload, data intact. Print row counts from IndexedDB.

---

## 6. The "do less work" system `[LESS-WORK]`

This is the heart of the upgrade. Build in this order of impact.

### 6.1 Start from yesterday
- On a new day, the top of the page shows one large button: **"Copy from <date of last report>"**. One tap carries forward: project, site, the named workforce in both groups, equipment names with their usual hours.
- It does **not** carry weather, time lost, materials delivered, visitors, instructions, toolbox, photos or recorded-at.
- `wip` is carried as editable text only if the user taps "Include work in progress" in the same sheet.
- Works fully offline from Dexie.
- After copying, show an **Undo** snackbar (6 s).

### 6.2 Chips that learn
- Quick-add chips are ranked by `memo.uses` descending, then recency. The top 8 show. "More" opens a sheet with the full catalogue and an "Other" chip.
- Adding equipment pre-fills its **last-used hours**. Adding material pre-fills its **last qty and unit**. Adding a person uses the memo-ranked role list; the headcount is derived from the rows.
- First-run order comes from the paving-and-construction seed catalogue (section 12).

### 6.3 Selection beats typing
- Project and Site: first tap shows the last 5 used as chips. Typing is the fallback.
- Day: derived from the date, read-only.
- Date: opens on today, prev-day, next-day and Today buttons, plus the native date picker on tapping the date.
- Weather A.M. and P.M.: one tap each. After 12:00 local time the P.M. tile gets a gentle pulse if empty. Respect reduced motion.
- Time lost: pick a reason, then hours. "No time lost" sets 0 and collapses the hours control.

### 6.4 Number entry without the OS keyboard `[LESS-WORK]`
- Tapping the number opens a Konsta `Sheet` with a big 3×4 numpad (7-8-9 / 4-5-6 / 1-2-3 / . 0 ⌫), a Done key at 64px tall, and a decimal key only when the field allows halves. No OS keyboard appears, so nothing jumps and nothing covers the form.
- Still accept hardware or OS-keyboard entry with `inputmode="decimal"` when the number is focused on desktop.

### 6.5 Completeness bar
- A sticky bottom bar shows the primary button **Create PDF** and a row of small status chips: Weather, Workforce, Work in progress, Recorded by.
- Chips show ✓ or an open dot. Tapping a chip scrolls to that section and pulses it.
- Only **Recorded by** blocks PDF creation (per brief). The others are hints, never blockers.
- Use `IntersectionObserver` for the active-section highlight. Do not rely on CSS scroll-spy (not Baseline).

### 6.4b Undo instead of confirm
- Deleting a row, a photo or a name shows an **Undo** snackbar for 6 s. No "Are you sure?" dialogs.

### 6.5b Voice `[OPTIONAL]` (flag `dictation`)
- Always make the text areas dictation-friendly: `autocapitalize="sentences"`, `enterkeyhint="enter"`, `spellcheck`. The phone's own keyboard mic then works offline. **Tell the user this in the help text.**
- If `config.features.dictation` is true, add an in-app mic button. Feature-detect `SpeechRecognition || webkitSpeechRecognition`. Prefer on-device: call `SpeechRecognition.available({ langs:['en-US'], processLocally:true })` where it exists (**VERIFY**). If nothing usable, hide the button. Never show a button that fails.

### 6.6 Weather suggestion `[OPTIONAL]` (flag `weatherSuggest`)
- When online, and only if the person grants location once, fetch a current-conditions suggestion from Open-Meteo (no API key; **VERIFY** the endpoint and CORS) and map WMO weather codes to the six tiles.
- Show it as a **suggestion chip** ("Suggested: Showers — tap to use"). Never write to the form automatically. Offline: do nothing, silently.
- Add Open-Meteo's host to Workbox `runtimeCaching` as network-only. Do not break offline.

### 6.7 Haptics `[POLISH]`
- `navigator.vibrate?.(8)` on each major tape-tick crossing and on chip add, where supported (Android Chrome).
- iOS Safari ignores `vibrate`. An iOS-only trick using a hidden `<input type="checkbox" switch>` is reported to give a tap feel (**VERIFY on a real iPhone** before shipping it; otherwise leave it out).
- Gate by `config.features.haptics` and `prefers-reduced-motion`.

---

## 7. Controls `[BRIEF]` `[POLISH]`

### 7.1 Tape-measure slider
Requirements:
- Fixed ruler with tick marks (minor every step, major every 5th or 10th) and a **draggable marker**. Tapping or dragging anywhere on the ruler moves the marker.
- Pointer Events with `setPointerCapture`. `touch-action: pan-y` on the track so vertical page scroll still works.
- `role="slider"`, `aria-valuemin/max/now`, `aria-valuetext` with units. Keys: arrows = step, PageUp/PageDown = major, Home/End = min/max.
- Beside it: `−` and `+` buttons (56px). Press-and-hold repeats and accelerates after 600 ms.
- Value is editable through the numpad sheet (6.4).
- Equipment hours step 0.5. Headcount step 1. Time lost step 0.5.
- Marker snaps to step. No float drift: `Number(v.toFixed(2))`.
- Value changes animate (see 8.3).

```tsx
// reference only
function useTape({ min, max, step, value, onChange }: TapeArgs) {
  const track = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const fromX = (x: number) => {
    const r = track.current!.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (x - r.left) / r.width));
    const v = Math.round((min + t * (max - min)) / step) * step;
    return Number(v.toFixed(2));
  };
  const commit = (v: number) => {
    if (v !== value) { onChange(v); if (v % (step * 5) === 0) navigator.vibrate?.(8); }
  };
  return {
    track,
    bind: {
      onPointerDown: (e: React.PointerEvent) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); commit(fromX(e.clientX)); },
      onPointerMove: (e: React.PointerEvent) => { if (dragging.current) commit(fromX(e.clientX)); },
      onPointerUp:   () => { dragging.current = false; },
      onPointerCancel: () => { dragging.current = false; },
      onKeyDown: (e: React.KeyboardEvent) => {
        const big = step * 5;
        const map: Record<string, number> = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step, PageUp: big, PageDown: -big };
        if (e.key in map) { e.preventDefault(); commit(Math.min(max, Math.max(min, Number((value + map[e.key]).toFixed(2))))); }
        if (e.key === "Home") commit(min);
        if (e.key === "End") commit(max);
      },
    },
  };
}
```

### 7.2 Quantity stepper (materials)
`−10`, `−1`, `+1`, `+10` buttons, centre number opens the numpad, unit as a native `<select>` or Konsta list sheet. Units: bags, loads, pcs, lengths, m³, tonnes, gal, rolls, kg. Add **tonnes** to the top of the unit list for asphalt.

### 7.3 Lined auto-growing text areas
Work in progress, Visitors, Instructions. Lined like paper. Grow with content. No JS in modern browsers.

```css
/* reference only */
.lined {
  --lh: 2rem;
  field-sizing: content;                    /* grows as you type */
  min-block-size: calc(var(--lines, 3) * var(--lh));
  max-block-size: 60svh;                     /* then scrolls */
  line-height: var(--lh);
  padding-block: 0;
  background-image: repeating-linear-gradient(
    to bottom, transparent 0 calc(var(--lh) - 1px), var(--rule) calc(var(--lh) - 1px) var(--lh));
  background-attachment: local;              /* lines scroll with the text */
  resize: none;
}
@supports not (field-sizing: content) { .lined { overflow: hidden; } }
```
Fallback for older browsers: if `!CSS.supports('field-sizing','content')`, set `height='auto'` then `height = scrollHeight + 'px'` on input.

Chips that start a line (state-based, so React stays in sync):
```ts
const startLine = (text: string) =>
  setValue(v => (v && !v.endsWith("\n") ? v + "\n" : v) + text);
// then focus the textarea and move the caret to the end in requestAnimationFrame
```
Chip sets (seed, editable by usage ranking):
- Work in progress: Milling, Tack coat, Base course, Asphalt laying, Rolling, Kerbing, Drainage, Line marking, Traffic control, Cleaning up.
- Instructions: Client, Engineer, Supervisor, Safety officer.
- Visitors: Client, Engineer, Inspector, Supplier, NWA/NSWMA/other authority (editable). **Visitor chips stamp the current time** as `HH:mm` using `Intl`, e.g. `09:40 Engineer — `.

---

## 8. Layout, motion, fluidity `[POLISH]`

### 8.1 Page structure (400px phone first, desktop second, no horizontal scroll)
1. **Header band (black).** Logo plate (white) left, title "Masterbuilders - Site Diary" in Barlow Condensed, motto under it. Theme toggle and settings icon right. Safe-area padding: `env(safe-area-inset-*)`.
2. **Summary strip (sticky under header, yellow fill, black text).** People on site · Equipment hours · Deliveries · Time lost. Live. Numbers animate (8.3).
3. **Sections as cards** in a single column, in paper order: Project/Site/Day/Date → Weather → Time lost → Equipment → Materials → Workforce → Work in progress → Visitors → Instructions → Toolbox talk → Photos → **Recorded by** (bottom right, as on paper).
4. **Footer band (black).** Motto and contact details from `CONFIG`.
5. **Sticky action bar** (6.5).

Desktop ≥ 1024px: centred sheet `max-w-3xl`, the summary strip becomes a sticky right rail, the action bar becomes a bottom-aligned centred bar. Same components.

Konsta usage: `App` (with safe areas), `Page`, `Block`, `List`/`ListItem`, `Sheet`, `Popup`, `Segmented`, `Dialog`, `Notification` for toasts, `Toolbar` for the action bar. Pick **one** theme (`ios`) for the whole app so it looks identical on every device, and override colours with tokens from 3.3. **VERIFY** current v5 props and theming in the docs. Custom components: tape slider, tiles, lined text areas.

### 8.2 Sections open and close
- Each section is a collapsible card. Header shows a one-line summary when closed ("2 equipment · 14 hrs").
- Animate height with the cross-browser grid trick (no layout thrash):
```css
.collapse { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .25s ease; }
.collapse[data-open="true"] { grid-template-rows: 1fr; }
.collapse > .inner { overflow: hidden; min-height: 0; }
```
- `content-visibility: auto` with `contain-intrinsic-size: auto 400px` on closed or off-screen sections for speed.

### 8.3 Count changes and transitions
```ts
// src/lib/vt.ts — reference only
import { flushSync } from "react-dom";
export function withTransition(update: () => void) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("startViewTransition" in document)) return update();
  (document as any).startViewTransition(() => flushSync(update));
}
```
- Use it for: adding or removing a list row, switching the date, opening the Create PDF sheet.
- Give list rows `view-transition-name: match-element` and `view-transition-class: row`. Names must be unique among visible elements or the transition is skipped.
- Summary numbers: render `<span key={value} className="roll">` with a 180 ms translateY and opacity keyframe. Add `aria-live="polite"` to the strip, throttled so screen readers are not flooded.
- Evaluate React's built-in `<ViewTransition>` only if it exists in the stable React version you installed. Otherwise use the helper above.

```css
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after { animation-duration: .01ms !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
  ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none !important; }
}
```

### 8.4 Fluidity budget (gates in P9)
- Interaction to Next Paint < 200 ms on a 4× CPU-throttled mid-range Android profile.
- Dragging the tape never drops below 55 fps in a trace.
- No layout shift when the OS keyboard opens, when a number changes width (tabular nums), or when a section opens.
- `scroll-padding-top` set so anchored sections clear the sticky header and summary strip.

---

## 9. Toolbox talk `[BRIEF]`

- **Topic**: combobox. First time typed, then saved to `memo` (kind `topic`). Dropdown lists saved topics (most used first). No preset list.
- **Presenter**: same pattern (kind `presenter`).
- **Time**: auto-fills with the current time on section open. Tappable to adjust.
- **Present**: the named workforce from §21. Each talk shows those people as large toggle chips (tick = present). Controls: "All present", "None". Live count "7 of 12 present". Removing a person in Workforce removes them here too.
- **Notes**: lined text area (7.3) for hazards raised and what was agreed. Chips: PPE, Traffic, Heat, Slips, Plant movement, Dust, Noise.
- Whole section optional. PDF omits it if no topic and nobody present.

---

## 10. Photos `[BRIEF]`

- Two big buttons: **Camera** (`<input type="file" accept="image/*" capture="environment" multiple>`) and **Gallery** (same input, no `capture`).
- Shrink before saving, off the main thread:
```ts
// src/workers/shrink.worker.ts — reference only
self.onmessage = async (e: MessageEvent<{ file: File; maxEdge?: number; quality?: number }>) => {
  const { file, maxEdge = 1600, quality = 0.72 } = e.data;
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const s = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * s), h = Math.round(bmp.height * s);
  const c = new OffscreenCanvas(w, h);
  c.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  const blob = await c.convertToBlob({ type: "image/jpeg", quality });
  (self as any).postMessage({ blob, w, h });
};
```
Fallback to a main-thread `<canvas>` if `OffscreenCanvas` or `convertToBlob` is missing. Honour EXIF orientation. Target ≤ 400 KB per photo.
- Each photo gets a card with thumbnail, description field, delete (with Undo).
- **Bundles**: long-press or "Select" mode to tick several photos, then "Describe selected": one description applies to all, stored with a shared `groupId`. In the PDF the group prints one caption over its photos.
- Description chips: Before, After, Progress, Defect, Delivery, Safety, Damage. Chips fill the field. Typing is the fallback.
- Thumbnails use `URL.createObjectURL`. Revoke on unmount.
- Photos belong to the report's date. Switching the date shows that day's photos.

**Gate G4** — add 12 photos from fixtures (a 12 MP JPEG with EXIF rotation). Each stored blob ≤ 500 KB, long edge ≤ 1600 px, orientation correct. Print sizes.

---

## 11. PDF `[BRIEF]`

Build with pdfmake 0.3 (promise API). Lazy-load it (`await import(...)`) so the form's first load stays small, and precache the chunk for offline.

**Requirements**
- Real, selectable text. Paginates over any length.
- **Every page header**: logo (unmodified JPG as a data URL), motto, Project, Site, Date.
- **Every page footer**: `Recorded by: <name>` left, `Page X of Y` right.
- Order: diary sections → toolbox talk → photos with descriptions.
- Fonts: embed Barlow Condensed and Barlow from local TTF/WOFF files through the virtual file system. **VERIFY** the 0.3 import shape and that the font has the `³` glyph for `m³` (fallback: print `m3`).
- Tables use `headerRows: 1` and `dontBreakRows: true`. Photos use `unbreakable: true` stacks in two columns. Grouped photos show one caption for the group.
- Set PDF `info` (title, author = recorded by, subject) and add `outline` bookmarks for the main sections.
- File name: `PaveCon_SiteDiary_<Project>_<YYYY-MM-DD>.pdf`, with unsafe characters stripped.
- For the PDF, downscale photos again to ≤ 1200 px so a 20-photo report stays small enough for WhatsApp (aim < 8 MB; log the size).
- Footer name comes from the report's `recordedBy`. Block creation if empty.

```ts
// reference only — adapt to pdfmake 0.3 docs
const { default: pdfMake } = await import("pdfmake/build/pdfmake");
const vfs = (await import("./pdfFonts")).default;     // built from local font files
pdfMake.addVirtualFileSystem(vfs);
pdfMake.addFonts({ Barlow: { normal: "Barlow-Medium.ttf", bold: "Barlow-SemiBold.ttf" },
                   BarlowCond: { normal: "BarlowCondensed-Bold.ttf", bold: "BarlowCondensed-Bold.ttf" } });

const doc = {
  pageSize: "A4",
  pageMargins: [36, 120, 36, 56],                      // top must clear the header
  info: { title: `Site Diary ${r.project} ${r.date}`, author: r.recordedBy, subject: "Masterbuilders - Site Diary" },
  defaultStyle: { font: "Barlow", fontSize: 10 },
  images: { logo: logoDataUrl, ...photoImages },
  header: () => ({
    margin: [36, 18, 36, 0],
    columns: [
      { image: "logo", width: 92 },
      { width: "*", stack: [
        { text: CONFIG.motto, font: "BarlowCond", fontSize: 11 },
        { text: `${r.project}  ·  ${r.site}  ·  ${fmtDate(r.date)}`, margin: [0, 6, 0, 0], bold: true },
      ]},
    ],
  }),
  footer: (page: number, count: number) => ({
    margin: [36, 0, 36, 20],
    columns: [{ text: `Recorded by: ${r.recordedBy}` }, { text: `Page ${page} of ${count}`, alignment: "right" }],
  }),
  content: [ /* diary sections */, /* toolbox */, /* photos */ ],
};
const blob = await pdfMake.createPdf(doc).getBlob();
```

**Share flow (transient-activation rule).** Phones only allow `navigator.share` straight after a tap. PDF building is async, so a share call after the build can be refused.
1. Tap **Create PDF** → build → open a result sheet showing file name, size, page count.
2. The sheet has a **Share / Send** button. Its click handler calls `navigator.share` **immediately** with the pre-built `File`.
```ts
const file = new File([blob], name, { type: "application/pdf" });
if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: name });
else { /* fallback: <a download> with URL.createObjectURL(blob) */ }
```
3. A second button **Save to phone** does the download fallback. On desktop, only Save shows.
4. Creating the PDF marks the report `saved` (queued for the mock upload).

**Gate G5** — for the sample report plus a 30-photo stress report:
- Extract text with `pdftotext` (or pdf.js). It contains the Recorded by name on **every page** and `Page n of N` for every page.
- Header text (motto, project, site, date) appears on every page.
- Page count > 1 for the stress report. Print page count and file size.
- Open page 1 as an image and visually confirm the logo is the supplied artwork, not a redraw.

---

## 12. Seed data (paving and construction) `[BRIEF]` `[LESS-WORK]`

Replace the house-building catalogues. These are starting chips, ranked by use after that.

- **Equipment** (default hrs): Paver 8, Roller (steel drum) 8, Roller (pneumatic) 6, Milling machine 8, Grader 8, Excavator 8, Backhoe 8, Tipper truck 8, Water bowser 6, Compactor 4, Bobcat 8, Concrete mixer 6, Generator 8, Crane 8.
- **Materials**: Asphalt (tonnes), Marl (loads), Gravel (loads), Aggregate (tonnes), Sand (loads), Cement (bags), Tack coat (gal), Kerb (pcs), Pipe (lengths), Rebar (lengths), Ready-mix (m³), Blocks (pcs), Line paint (gal).
- **Trades**: Supervisor, Paver operator, Roller driver, Raker, Screed hand, Grader operator, Excavator operator, Truck driver, Flagman, Labourer, Mason, Steel fixer, Carpenter, Electrician, Plumber.
- **Workforce group names** (editable): "Own crew" and "Subcontractors".
- **Sample report** (clearly badged **SAMPLE**, plus a **Start blank page** button on the first screen): Project "Hatfield Road Rehabilitation", Site "Chainage 0+400 to 0+900", weather Clear A.M. / Showers P.M., time lost Rain 1.5 h, equipment Paver 8, Roller 8, Tipper 6.5, Milling machine 4; materials Asphalt 120 tonnes, Tack coat 40 gal, Marl 2 loads; workforce 18 fictional named people in Own crew and 1 named subcontractor (see §21; total 19); WIP lines on milling and base course and asphalt laying; one visitor with a time stamp; one instruction; one toolbox talk ("Working near live traffic") with 8 of 19 present; 3 sample photos (generate neutral placeholder images in code, no stock photos, no copyrighted material).
- Sample project names are invented. State that they are fictional in `NOTES.md`.
- Sample must be obviously a sample: yellow "SAMPLE DATA" ribbon on the page and a "SAMPLE" line in the PDF header area, removed when the user taps Start blank page.

---

## 13. Offline, PWA and mock upload `[BRIEF]`

### 13.1 vite-plugin-pwa
```ts
// vite.config.ts — reference only
VitePWA({
  registerType: "prompt",                       // never reload under someone mid-form
  includeAssets: ["brand/logo.jpg"],
  manifest: {
    name: "Pave-Con Site Diary", short_name: "Site Diary",
    start_url: "/", scope: "/", display: "standalone", orientation: "portrait",
    theme_color: "#0B0B0B", background_color: "#0B0B0B", lang: "en-JM",
    icons: [ /* 192, 512, 512 maskable from scripts/make-icons.mjs */ ],
  },
  workbox: {
    globPatterns: ["**/*.{js,css,html,woff2,woff,jpg,png,svg,webmanifest}"],
    navigateFallback: "/index.html",
    cleanupOutdatedCaches: true,
    maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,   // pdfmake chunk
  },
})
```
- When a new version is ready, show a Konsta notification "Update ready — Reload" and apply only on tap.
- Self-host every font. No CDN anywhere. Precache the pdfmake chunk and font files.

### 13.2 Install hint
- Android/desktop Chromium: capture `beforeinstallprompt`, show an **Install** button in settings and once as a dismissible banner.
- iPhone Safari (not standalone): show a bottom sheet "Tap Share, then Add to Home Screen. Leave Open as Web App on." Detect with UA plus `navigator.standalone`. Show once, dismissible, re-openable from settings. Menu wording changes by iOS version, so keep the text general.

### 13.3 Report state and mock upload
States: `draft` → `saved` (PDF created) → `uploading` → `uploaded`. Show a pill with icon and word: "Saved on phone", "Uploading", "Uploaded".

```ts
// src/sync.ts — reference only
export async function flush() {
  await navigator.locks.request("pavecon-sync", { ifAvailable: true }, async (lock) => {
    if (!lock) return;                                   // another tab is syncing
    if (!navigator.onLine) return;
    const pending = await db.reports.where("syncState").equals("saved").toArray();
    for (const r of pending) {
      await db.reports.update(r.id, { syncState: "uploading" });
      try { await mockUpload(r); await db.reports.update(r.id, { syncState: "uploaded" }); }
      catch { await db.reports.update(r.id, { syncState: "saved" }); }
    }
  });
}
const mockUpload = (r: Report) => new Promise<void>((res, rej) =>
  setTimeout(() => (Math.random() < 0.1 ? rej(new Error("simulated")) : res()), 1200));

addEventListener("online", flush);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") flush(); });
```
- Retry with backoff after a simulated failure (2 s, 8 s, 30 s, cap at 2 min), reset on the next `online` event.
- Background Sync API is not on Safari, so do not use it. The two listeners above are the contract.
- Comment in code: the mock is a stand-in for a real endpoint.

**Gate G6 (offline)** — Playwright: load, `context.setOffline(true)`, reload (served from the service worker), create a report, make a PDF, state shows "Saved on phone". `setOffline(false)` and dispatch `online`: state moves to "Uploading" then "Uploaded". Also test the `visibilitychange` path.

---

## 14. Access gate (demo) `[BRIEF]`

- First open shows a full-screen activation screen: logo plate, "Activate this phone", a code field (segmented boxes, paste supported, `autocomplete="one-time-code"`, large keys), and an Activate button.
- Accept the single `CONFIG.activation.exampleCode`. Compare in constant time over a SHA-256 digest (`crypto.subtle`). Add a comment: this is a **demo gate, not security**.
- Store activation in Dexie `settings`. Until activated, nothing in the app is reachable: not the form, not saved reports, not settings.
- Settings screen has **Switch this phone off**. It clears activation and returns to the gate. Existing local reports stay on the device.
- Show the example code on the gate only when `import.meta.env.DEV` or a `?demo` flag is set, so the demo can be shown without typing hints into the build. State this in `NOTES.md`.
- No accounts, no passwords, no server.

**Gate G7** — fresh profile shows the gate. Wrong code rejected with a clear message (not colour only). Right code unlocks. Reload stays unlocked. Switch off returns to the gate.

---

## 15. Recorded by `[BRIEF]`

- Bottom right of the form, like the paper page. Typed name, required.
- Remembered: on next report the field is pre-filled and labelled "Use <name>?" with a one-tap confirm. Still shows the field so it can be changed.
- Date and time recorded are added automatically when the report is finalised (Create PDF), shown beside the name.
- Same name appears in the PDF footer on every page (G5).

---

## 16. Accessibility `[POLISH]`

- Every control has a label. Tiles are a `radiogroup`. Chips are `button`s with `aria-pressed` where toggled.
- Tape slider keyboard map as in 7.1.
- Visible focus ring as in 3.3. Respect `prefers-reduced-motion`, `prefers-contrast`, `forced-colors`.
- Text zoom to 200% without loss of function, still no horizontal scroll.
- `lang="en-JM"` on `<html>`.
- Use `inputmode`, `enterkeyhint`, `autocomplete` correctly.
- Error text sits beside the field with an icon, not only a red border.

**Gate G8** — `@axe-core/playwright` reports zero serious or critical issues on: gate, form (sample), form (blank), toolbox open, photos with 3 items, result sheet, settings. Light and dark.

---

## 17. Performance and quality budgets `[POLISH]`

- Initial JS ≤ 180 KB gzip, excluding the lazy pdfmake and font chunks. Print the bundle report.
- Lighthouse (mobile, simulated slow 4G, 4× CPU): Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, PWA installable.
- No layout shift above 0.05 during a scripted fill-in.
- Fonts: `font-display: swap`, preload the two most used.

**Gate G9** — Lighthouse run output pasted into `artifacts/lighthouse.txt` with the four scores. If a score misses, fix and re-run. Do not lower the budget.

---

## 17.5 UI/UX Gaps & Recommendations `[POLISH]`

**Current state assessment** (live on `http://localhost:4173/`) compared against the final directive targets:

### Completed & Verified ✅
- All core gates passing (G3, G7, G10)
- SheetWrap portal architecture successfully implemented
- Comprehensive Playwright test coverage for critical controls

### High-Impact Low-Hanging Fruit for Immediate Polish

#### 1. **Audit Footer Validation** *(Critical liability risk)*
- **Where:** Bottom metrics band above **CREATE PDF**
- **Issue:** Static checkmarks don't prevent incomplete PDF generation
- **Impact:** Legal exposure for client submissions
- **Fix:** Interactive validation with warning alerts for missing critical fields

#### 2. **Workforce Transparency Badge** *(Legal compliance)*
- **Where:** Top metrics banner (`People 19`)
- **Issue:** No visibility into named vs. generic personnel records
- **Impact:** Audit trail gaps for historical liability
- **Fix:** Add dual-label display (`19 People · 12 Named`)

#### 3. **Sticky Scroll Metrics** *(Mobile workflow)
- **Issue:** Top metrics disappear during form entry
- **Impact:** Loss of context during data capture
- **Fix:** Implement truly sticky metrics bar with enhanced prominence

#### 4. **Touch Target Optimization** *(Mobile usability)*
- **Issue:** Custom numeric keypads have small tap targets
- **Impact:** Error-prone entry on mobile with gloves/muddy hands
- **Fix:** Increase touch padding across all interactive elements

#### 5. **Inheritance Clarity** *(User experience)*
- **Issue:** Generic "Copied from yesterday" feedback
- **Impact:** Users can't instantly see what data was inherited
- **Fix:** Specific inheritance indicators (e.g., "Copied crew & equipment from yesterday")

### Implementation Priority Ranking

**Phase 1 (Critical Liability Fixes) - 2-3 hours**
1. Audit footer validation with warning alerts
2. Workforce transparency badge
3. Sticky scroll metrics

**Phase 2 (Usability Polish) - 1-2 hours**
4. Touch target optimization
5. Inheritance clarity improvements

**Phase 3 (Advanced Features) - 1-2 hours**
6. Smart location field (linear vs. zone toggle)
7. Quick-jump navigation drawer
8. Interactive photo preview carousel

### Verification Requirements

**Playwright Testing Strategy:**
- G4 (Photo operations) – Validate EXIF rotation and storage
- G5 (PDF generation) – Test sample + stress reports
- G6 (Offline/sync) – Verify service worker persistence
- G8 (Accessibility) – Run axe-core on all interaction patterns
- G9 (Performance) – Lighthouse validation after each polish
- G11 (Form completeness) – Comprehensive field validation testing

**Typing Audit Integration:**
- Develop targeted Playwright script for measuring taps vs. typing efficiency
- Validate all polish improvements don't exceed interaction budget

### Current Playwright Test Coverage

**Existing Tests (Passing):**
- **G3** – Dexie persistence + offline functionality
- **G7** – Demo access gate validation
- **G10** – Controls (tape, keys, hold, numpad, stepper)

**Missing Tests (Action Required):**
- **G4** – Photo operations validation
- **G5** – PDF generation and text extraction
- **G6** – Offline/sync functionality
- **G8** – Accessibility audit integration
- **G9** – Lighthouse performance validation
- **G11** – Form completeness and validation
- **G12** – Motion/reduced motion compliance
- **G13** – Final regression testing suite

### Immediate Next Steps

1. **Execute Phase 1 Polish** – Critical liability fixes first
2. **Add Missing Playwright Tests** – Comprehensive validation coverage
3. **Run Lighthouse** – Performance validation after each polish phase
4. **Execute G13 Verification** – Full regression testing

### Evidence Requirements

For each polish improvement:
- **Screen recordings** demonstrating improved user flow
- **Playwright test output** showing validation passes
- **Lighthouse results** after each improvement phase
- **Typing audit metrics** post-polish validation

---

## 18. Phases and gates (run in order, auto-continue on pass)

| Phase | Build | Gate |
|---|---|---|
| P0 | Scaffold, pin versions, Tailwind v4, Konsta v5, PWA plugin, lint | G0 |
| P1 | Logo copy, tokens, fonts, theme, header/footer, config, icon set | G1, G2 |
| P2 | Dexie schema, memo/usage, settings, autosave, persist | G3 |
| P3 | Tape slider, stepper, numpad sheet, chips, lined text, tiles | G10 |
| P4 | All form sections, summary strip, completeness bar, Start-from-yesterday, undo | G11 |
| P5 | Toolbox talk, photos with shrink and bundles | G4 |
| P6 | PDF build and share flow | G5 |
| P7 | Service worker, install hint, report states, mock upload | G6 |
| P8 | Access gate | G7 |
| P9 | Motion, view transitions, a11y pass, performance pass | G8, G9, G12 |
| P10 | Seed/sample data, `NOTES.md`, final regression of all gates | G13 |
| P11 | Workforce by name (client clarification) — implemented | G14 |

**G10 (controls)** — unit and Playwright tests: tape moves by drag, by keys, by ± hold; hours step 0.5; no float drift after 100 random steps; numpad entry sets exact value; stepper ±10 clamps at 0.
**G11 (form)** — at **400×800** and **1280×800**: `document.scrollingElement.scrollWidth <= innerWidth` on every screen; summary strip updates when each input changes; copy-from-yesterday carries only the allowed fields; Recorded by empty blocks PDF with a clear message.
**G12 (motion)** — with `prefers-reduced-motion: reduce` emulated, no animation or view transition runs. With it off, count roll and section open run. A trace of a 3 s tape drag at 4× throttle shows no long tasks over 50 ms.
**G13 (final)** — re-run all gates (G0–G14 once P11 is built) in one command `npm run verify`. Print one table: gate, pass/fail, evidence path. Anything failing blocks "done".

**Typing audit (self-check for the "less work" goal).** Write a Playwright script that fills the **sample-equivalent report on a new day** and counts taps and typed characters. Target: with Start-from-yesterday, **≤ 25 taps and ≤ 40 typed characters** (the name confirm, a few WIP lines via chips, weather, hours changes). Print the counts. If over target, find the biggest cost and reduce it.

---

## 19. Files to produce

- Source tree for the app, `README.md` (run, build, demo script), `NOTES.md` (assumptions, logo-background note, optional icon crop, VERIFY results, what was left out and why).
- `artifacts/` with gate evidence: icon sheet, screenshots at 400px light and dark, desktop light and dark, the sample PDF and the stress PDF, Lighthouse output, bundle report.
- A 60-second **demo script** in `README.md`: open on sample → tap Copy from yesterday → change one slider → add a photo bundle → Create PDF → Share → go offline → reload → show it still works.

---

## 20. Do not

- Do not redraw, trace, recolour or re-encode the logo.
- Do not add accounts, real auth, a backend, analytics, ads, or third-party scripts.
- Do not use a CDN for fonts or libraries.
- Do not use yellow text on white.
- Do not build anything without a scope tag.
- Do not state the motto or contact details are verified. They are client-supplied and live only in `CONFIG`.
- Do not claim a gate passed without printed evidence.

---

## 21. Workforce by name — client clarification (implemented) `[BRIEF]` `[LESS-WORK]`

**Status:** implemented 4 Nov 2026; G14 passes inside `npm run verify`. This supersedes the role-only headcount model in §5, §6.4, §11, §12 and the Workforce row in §8.1. Sample data uses 19 fictional named people.

**Why.** A diary that records “5 steel fixers” cannot answer *which* steel fixer was on site, or which one did a particular piece of work. Pave-Con identifies people by **name first, role second**. Names make the PDF and the toolbox talk usable as a record, and they are what gets called out on site.

### 21.1 Required behaviour

- The Workforce card opens with two large tabs using the editable group names, default **Own crew** and **Subcontractors**. The active tab decides which group receives the next person. Use `tablist` / `tab` / `tabpanel` semantics and ≥56 px targets.
- One primary **Add person** button inside the active tab. It opens a sheet with exactly two required fields:
  1. **Name** — text, trimmed, `autocomplete="name"`, `enterkeyhint="done"`, autofocus. Duplicate names are allowed; ids keep the rows distinct.
  2. **Role** — combobox seeded from the trade catalogue and ranked by `memo` like the existing chips. “Other” may add a new role. This is the person’s role; it is not a second headcount.
- Saving adds **one person row** under the active tab: name, role, remove. **One row = one person.** There is no per-person count slider and no separate role-headcount entry.
- A person row can be edited in place (name and role) and removed with the existing 6 s **Undo**, which restores it to the same tab and position.
- Totals are always derived, never stored as separate editable numbers:
  - group total = number of people in that tab;
  - role total = number of people with that role in that tab;
  - site total = both tabs;
  - role summary, e.g. `Raker 3 · Steel fixer 2 · Labourer 6`;
  - group line, e.g. `Own crew — 12 people`.
- The Workforce section summary and the sticky summary strip use the named-people count. If migrated unnamed headcount still exists, show `N named · U unnamed`; never present an unnamed count as named.
- **Copy from yesterday** carries people with their names, roles and groups exactly, with fresh row ids. A daily user must not retype names. Undo restores the copied roster.
- The **Toolbox talk** register is populated from these people and their ids instead of being maintained separately. Removing a person removes them from the present list; adding a person does not auto-tick them. Keep “All present”, “None” and the live “7 of 12 present” count.
- **PDF:** print both tabs with every person as `Name — Role`, grouped by role; include role totals and total persons. Omit an empty tab. Migrated unnamed rows print as `Unnamed — <Role>`. Header, footer, logo and page counter rules do not change.
- Store names and roles in `memo` for future autocomplete; keep the trade catalogue for roles.

### 21.2 Data model and migration

```ts
export interface WorkforcePerson {
  id: string;
  name: string;   // "" only for an unnamed row migrated from the old count model
  role: string;
}

export interface Report {
  // …unchanged fields…
  workforce: { groups: [string, string]; a: WorkforcePerson[]; b: WorkforcePerson[] };
}
```

- Replace `Crew { name; count }` with `WorkforcePerson`. `a` and `b` become arrays of people.
- Existing reports must not disappear or crash. Add a Dexie v2 upgrade (or an equivalent one-time normaliser run before render) that expands each legacy `{ name: Role, count: N }` row into **N** person rows with `name: ""` and `role: Role`, in the same group and order. The Edit person action lets the user fill those names later.
- Do **not** fabricate names during migration. “Unnamed” is honest; a made-up name on a legal record is not.
- Replace the seeded sample’s role counts with fictional named people and roles, so the demo opens on the new behaviour. Keep the sample clearly badged and keep the total people count consistent with the old sample (19) unless a deliberate change is documented.
- Removing a person from the roster must also remove that id from `toolbox.presentIds` so the PDF cannot print a present person who is no longer in the crew.

### 21.3 Impact on existing gates

- **G11** (no overflow, summary updates): the Workforce summary now counts people; the row-level count control is gone.
- **G12** (motion/long tasks): editing names is a normal controlled input; do not animate every keystroke.
- **Typing audit:** names are carried by Copy from yesterday, so the ≤25 taps / ≤40 characters target for the copied-day report still applies. A cold start now needs names typed; report that count separately and do not hide it.
- **G5/PDF:** update the workforce assertion to names, roles and derived totals. Keep the per-page footer assertion.

### 21.4 Gate G14 — named workforce

Playwright, on a fresh activated profile:

1. Add **Andre Brown**, role **Raker**, in **Own crew**. Switch to **Subcontractors** and add **Devon Hall**, role **Steel fixer**.
2. Assert both rows show the correct name and role, no headcount input exists, group totals are 1 and 1, site total is 2, and the role summary reads `Raker 1 · Steel fixer 1`.
3. Reload; both people persist. Edit one role and confirm the derived totals update.
4. Copy from a day with three named people; assert names, roles and groups are carried with new ids, and Undo restores the original roster.
5. Remove Andre: group/site/role totals decrement; Undo restores him in the same tab at the same position.
6. Generate the PDF and extract text: both names, both roles and the totals appear; every page still has the recorded-by footer and `Page n of N`; header/motto/project/site/date unchanged.
7. Axe on the form and the Add-person sheet: 0 serious/critical. At 400×800 and 1280×800, `scrollWidth <= innerWidth`.
8. Typing audit on the copied-day report stays ≤25 taps and ≤40 typed characters; print the cold-start name-entry count separately.
9. Add G14 to `npm run verify` and to the final G13 table; a failure blocks “done”.

**Definition of done for P11 (met 4 Nov 2026):** G14 passes, G5/G11 evidence is refreshed, the sample uses named people, and the full `npm run verify` exits 0.
