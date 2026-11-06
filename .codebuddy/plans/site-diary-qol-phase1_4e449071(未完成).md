---
name: site-diary-qol-phase1
overview: "Implement Phase 1 quality-of-life improvements for the Pave-Con Site Diary: audit-aware footer validation, workforce transparency badge, enhanced sticky metrics, larger touch targets, and clearer copy-from-yesterday feedback."
design:
  architecture:
    framework: react
  fontSystem:
    fontFamily: Barlow
    heading:
      size: 20px
      weight: 700
    subheading:
      size: 16px
      weight: 600
    body:
      size: 16px
      weight: 500
  colorSystem:
    primary:
      - "#FCE501"
      - "#0B0B0B"
      - "#FFFFFF"
    background:
      - "#F4F4F2"
      - "#FFFFFF"
      - "#0B0B0B"
      - "#141414"
    text:
      - "#0B0B0B"
      - "#FFFFFF"
      - "#3F3F3F"
    functional:
      - "#0B0B0B"
      - "#FCE501"
todos:
  - id: audit-design
    content: Use [subagent:code-explorer] and [skill:brainstorming] to audit targets and design Phase 1 UX
    status: pending
  - id: footer-metrics
    content: Implement audit footer validation and enhanced sticky metrics bar
    status: pending
    dependencies:
      - audit-design
  - id: badge-touch-copy
    content: Add workforce badge, enlarge touch targets, and improve copy feedback
    status: pending
    dependencies:
      - footer-metrics
  - id: verify-gates
    content: Update tests and use [skill:verification-before-completion] to run npm run verify
    status: pending
    dependencies:
      - badge-touch-copy
---

## Product Overview

Finish Phase 1 quality-of-life improvements for the Pave-Con Site Diary demo. These are the high-impact, low-hanging items flagged in the directive's UI/UX gap analysis, focused on reducing legal/audit risk and improving mobile usability.

## Core Features

- **Audit-aware footer validation**: turn the static `StatusChip` checkmarks into active warnings. If the user taps **Create PDF** while critical fields are missing, show a clear alert and jump to the first missing section; `Recorded by` remains the hard blocker.
- **Workforce transparency badge**: the sticky summary strip currently shows only "People N". Extend it to "People N · M Named" (and "U Unnamed" when legacy unnamed rows exist) so auditors can see named-vs-generic records at a glance.
- **Truly sticky metrics bar**: keep the yellow summary strip visually prominent while scrolling; add a subtle shadow/separator and ensure it never loses context behind the header or action bar.
- **Larger touch targets**: raise the minimum hit area of `.btn-56`, `.chip`, and `StatusChip` from 48 px to 56 px, including any inline 48 px overrides in the header and update banner.
- **Clearer copy-from-yesterday feedback**: replace the generic "Copied from yesterday" Undo snackbar with a specific message such as "Copied project, site, 12 crew and 3 equipment from yesterday".

## Tech Stack

- Frontend: React 19 + TypeScript, Vite 8, Tailwind CSS v4
- State/storage: Dexie 4.4 + `dexie-react-hooks`
- UI primitives: custom hand-built components (no external component library)
- Test/QA: Playwright, `@axe-core/playwright`, Lighthouse 13

## Implementation Approach

Make small, targeted changes inside the existing `DiaryScreen`/`index.css` surface rather than introducing new abstractions. Reuse the already-derived `summary.named`/`summary.unnamed` values, the existing `scrollTo` helper, and the `showUndo` API. The footer validation will compute a list of missing critical sections on **Create PDF** and surface it through the existing `pdfError`/`role="alert"` pattern. Touch targets will be corrected at the CSS primitive level (`.btn-56`, `.chip`) and any inline 48 px overrides in `App.tsx` will be removed so the primitives are authoritative.

## Implementation Notes

- **Backwards compatibility**: preserve the existing gate contract — `recordedBy` is still the only hard blocker for PDF creation; the new warnings are informational and do not break the typing audit or offline flow.
- **Performance**: changes are CSS/JSX-only; no new dependencies, no additional runtime polling, and no impact on the initial JS bundle.
- **Accessibility**: keep `aria-live="polite"` for the summary strip, ensure warning alerts use `role="alert"` with an icon + text (not colour alone), and maintain the visible focus ring.
- **Blast radius**: the workforce `summary` object already exposes `named`/`unnamed`; only the sticky strip rendering needs to change. Avoid touching the PDF builder, Dexie schema, or sync logic.
- **Touch targets**: search for all inline `minWidth: 48` / `minHeight: 48` style overrides (e.g., header buttons in `App.tsx`, update banner chip) and let the CSS class drive the size so the 56 px rule is global and consistent.

## Architecture Design

The changes stay within the existing layered architecture:

- **Presentation layer**: `DiaryScreen.tsx` (action bar, summary strip, copy feedback), `App.tsx` (header/update banner button overrides), `index.css` (primitives).
- **Logic layer**: existing `summary` memo and `createPdf` flow; no new services.
- **Data layer**: unchanged Dexie schema and sync behaviour.

No new architectural patterns are introduced.

## Directory Structure

```
c:/Users/Garfield/Downloads/site diary/app/
├── src/
│   ├── diary/
│   │   └── DiaryScreen.tsx        # [MODIFY] footer validation, summary strip badge, copy feedback
│   ├── App.tsx                    # [MODIFY] remove inline 48 px button overrides in header/update banner
│   ├── index.css                  # [MODIFY] raise .btn-56/.chip/StatusChip min-height to 56 px; sticky strip prominence
│   └── lib/workforce.ts           # [REFERENCE] reuse allPeople/personName for badge counts
├── e2e/
│   └── (existing specs)           # [MODIFY] add/extend assertions for badge, validation, and touch target size
└── artifacts/
    └── (gate evidence)            # [UPDATE] refreshed screenshots and verify output after changes
```

## Design Approach

The app already uses a strong Pave-Con brand language: black header/footer bands, yellow accent strip, Barlow/Barlow Condensed typography, and white logo plate. Phase 1 refinements intensify usability without changing the visual identity.

- **Sticky metrics**: keep the yellow summary strip but add a bottom border/shadow in the brand black to separate it from scrolling content. Increase vertical padding slightly and ensure the black text remains ≥ 16 px / weight 600 for sunlight readability.
- **Workforce badge**: within the yellow strip, render the named count as a secondary black label so auditors can instantly distinguish "People 19 · 17 Named". When unnamed rows exist, show "People 19 · 17 Named · 2 Unnamed" to preserve honesty about migrated data.
- **Footer validation**: on pressing **Create PDF**, flash a black alert band (matching the header/footer) with a warning icon and a list of missing sections. The action bar status chips will continue to show ✓/open-dot; the alert is an additional safety layer.
- **Touch targets**: standardise all primary chips and buttons to 56 px tall with 14 px radius, maintaining the existing brand styling. No visual change other than slightly taller, more thumb-friendly controls.
- **Copy feedback**: the Undo snackbar text becomes specific, e.g., "Copied project, site, 12 crew and 3 equipment from yesterday", still using the existing snackbar component and 6 s timeout.

## Style Keywords

## Agent Extensions

### SubAgent

- **code-explorer**
- Purpose: Audit all call sites of `.btn-56`, `.chip`, and `StatusChip` and find any inline 48 px overrides across the app.
- Expected outcome: A precise list of files/lines that need touch-target changes.

### Skill

- **brainstorming**
- Purpose: Design the footer validation UX and sticky-metrics prominence before implementation.
- Expected outcome: A concise decision on alert wording, badge format, and CSS approach.

- **verification-before-completion**
- Purpose: Run `npm run verify` after changes and confirm G0–G17, the typing audit, and Lighthouse budgets still pass.
- Expected outcome: Printed gate table and refreshed artifact evidence.