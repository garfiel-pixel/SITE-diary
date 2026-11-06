# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: g8-a11y.spec.ts >> G8 — accessibility >> gate, forms, toolbox, photos, result sheet, settings — light and dark
- Location: e2e\g8-a11y.spec.ts:42:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('pdf-state')
Expected: visible
Timeout: 120000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByTestId('pdf-state') with timeout 120000ms
  - waiting for getByTestId('pdf-state')

```

```yaml
- link "Skip to main content":
  - /url: "#main"
- banner:
  - img "Pave-Con Ltd — Paving & Construction logo"
  - heading "Masterbuilders - Site Diary" [level=1]
  - paragraph: CHOOSE WISELY... BUILD WITH CONFIDENCE
  - button "Switch to dark theme"
  - button "Settings"
- main:
  - button "← All reports"
  - heading "Thursday, 5 November 2026" [level=2]
  - status
  - text: People 0 0 Named Equipment 0 h Deliveries 0 Time lost 0 h Saved on phone
  - heading "Project / Date —" [level=2]:
    - button "Project / Date —" [expanded]
  - text: Project
  - button "Use Hatfield Road Rehabilitation as Project": Hatfield Road Rehabilitation
  - textbox "Project":
    - /placeholder: Type…
  - text: Site
  - button "Linear"
  - button "Zone ✓" [pressed]
  - combobox "Site"
  - button "Zone A"
  - button "Zone B"
  - button "Zone C"
  - button "Zone D"
  - button "Zone E"
  - paragraph: "Day: Thursday (from the date)"
  - button "Previous day": ‹
  - textbox "Date": 2026-11-05
  - button "Next day": ›
  - button "Today"
  - heading "Weather AM — PM —" [level=2]:
    - button "Weather AM — PM —"
  - heading "Time lost —" [level=2]:
    - button "Time lost —"
  - heading "Equipment on site —" [level=2]:
    - button "Equipment on site —"
  - heading "Materials delivered —" [level=2]:
    - button "Materials delivered —"
  - heading "Workforce 0 on site" [level=2]:
    - button "Workforce 0 on site"
  - heading "Work in progress —" [level=2]:
    - button "Work in progress —"
  - heading "Visitors —" [level=2]:
    - button "Visitors —"
  - heading "Instructions —" [level=2]:
    - button "Instructions —"
  - heading "Toolbox talk —" [level=2]:
    - button "Toolbox talk —" [expanded]
  - paragraph: Optional — add a toolbox talk for this day.
  - button "Start toolbox talk"
  - heading "Photos —" [level=2]:
    - button "Photos —" [expanded]
  - button "Take photos with the camera": Camera
  - button "Choose photos from the gallery": Gallery
  - button "Select"
  - paragraph: No photos yet for this day.
  - heading "Recorded by K. Johnson" [level=2]:
    - button "Recorded by K. Johnson" [expanded]
  - button "Use K. Johnson?"
  - text: Recorded by
  - textbox "Recorded by":
    - /placeholder: Type your name…
    - text: K. Johnson
  - paragraph
  - button "Jump to section"
  - 'button "Weather: not yet — jump to section"': Weather
  - 'button "Workforce: not yet — jump to section"': Workforce
  - 'button "Work in progress: not yet — jump to section"': Work in progress
  - 'button "Recorded by: complete — jump to section"': Recorded by
  - button "Create PDF"
- contentinfo:
  - paragraph: CHOOSE WISELY... BUILD WITH CONFIDENCE
  - paragraph: Pave-Con Ltd — Paving & Construction
  - paragraph: Lot 1 Dunsinane Hatfield P.O., Manchester, Jamaica W.I.
  - paragraph: "[876] 625-7283 · info@paveconja.com"
  - paragraph: Supplied by the client, not independently verified.
- dialog "Report incomplete":
  - button "Close Report incomplete": Close
  - text: Some sections are empty
  - paragraph: "This PDF will be created without: Project, Site, Weather, Workforce, Work in progress."
  - button "Create PDF anyway"
  - button "Review missing sections"
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import AxeBuilder from "@axe-core/playwright";
  3   | import {
  4   |   activate,
  5   |   openSection,
  6   |   setDate,
  7   |   setRecordedBy,
  8   |   TODAY_ISO,
  9   |   YESTERDAY_ISO,
  10  | } from "./helpers";
  11  | 
  12  | type Page = import("@playwright/test").Page;
  13  | 
  14  | async function scan(page: Page, label: string) {
  15  |   const results = await new AxeBuilder({ page })
  16  |     .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
  17  |     .analyze();
  18  |   const serious = results.violations.filter(
  19  |     (v) => v.impact === "serious" || v.impact === "critical"
  20  |   );
  21  |   if (serious.length) {
  22  |     console.log(`G8 ${label} FAIL:`, JSON.stringify(serious, null, 2));
  23  |   }
  24  |   expect(
  25  |     serious.map((v) => `${v.id} (${v.impact})`),
  26  |     `${label}: serious/critical axe violations`
  27  |   ).toEqual([]);
  28  |   console.log(`G8 ${label}: 0 serious/critical (${results.violations.length} total violations)`);
  29  | }
  30  | 
  31  | async function setTheme(page: Page, mode: "light" | "dark") {
  32  |   const current = await page.evaluate(() => document.documentElement.dataset.theme);
  33  |   if (current !== mode) {
  34  |     await page.getByTestId("theme-toggle").click();
  35  |     await expect
  36  |       .poll(() => page.evaluate(() => document.documentElement.dataset.theme))
  37  |       .toBe(mode);
  38  |   }
  39  | }
  40  | 
  41  | test.describe("G8 — accessibility", () => {
  42  |   test("gate, forms, toolbox, photos, result sheet, settings — light and dark", async ({
  43  |     page,
  44  |   }) => {
  45  |     test.setTimeout(300_000);
  46  | 
  47  |     await page.goto("/");
  48  |     await page.emulateMedia({ colorScheme: "light" });
  49  |     await scan(page, "gate (light)");
  50  |     await page.emulateMedia({ colorScheme: "dark" });
  51  |     await scan(page, "gate (dark)");
  52  |     await page.emulateMedia({ colorScheme: "light" });
  53  | 
  54  |     await activate(page);
  55  | 
  56  |     // ---- sample report -------------------------------------------------
  57  |     await setDate(page, YESTERDAY_ISO);
  58  |     await expect(page.locator("#sec-project")).toBeVisible();
  59  |     await setTheme(page, "light");
  60  |     await scan(page, "sample form (light)");
  61  |     await setTheme(page, "dark");
  62  |     await scan(page, "sample form (dark)");
  63  |     await setTheme(page, "light");
  64  | 
  65  |     await openSection(page, "sec-toolbox");
  66  |     if (await page.getByTestId("start-toolbox").count()) {
  67  |       await page.getByTestId("start-toolbox").click();
  68  |     }
  69  |     await scan(page, "toolbox open (light)");
  70  | 
  71  |     await openSection(page, "sec-photos");
  72  |     await expect(page.locator("#sec-photos").getByRole("img").first()).toBeVisible();
  73  |     await scan(page, "photos with 3 items (light)");
  74  |     console.log("G8 photos screen: 3 sample photos present");
  75  | 
  76  |     // ---- blank form ----------------------------------------------------
  77  |     await setDate(page, TODAY_ISO);
  78  |     await page.getByTestId("start-blank").click();
  79  |     await setTheme(page, "light");
  80  |     await scan(page, "blank form (light)");
  81  |     await setTheme(page, "dark");
  82  |     await scan(page, "blank form (dark)");
  83  |     await setTheme(page, "light");
  84  | 
  85  |     // ---- result sheet --------------------------------------------------
  86  |     await setRecordedBy(page, "K. Johnson");
  87  |     await page.getByTestId("create-pdf").click();
> 88  |     await expect(page.getByTestId("pdf-state")).toBeVisible({ timeout: 120_000 });
      |                                                 ^ Error: expect(locator).toBeVisible() failed
  89  |     await scan(page, "result sheet (light)");
  90  |     await page.locator('.k-sheet[data-open="true"]').click({ position: { x: 4, y: 4 } });
  91  | 
  92  |     // ---- settings ------------------------------------------------------
  93  |     await page.getByTestId("open-settings").click();
  94  |     await page.getByTestId("theme-light").click();
  95  |     await scan(page, "settings (light)");
  96  |     await page.getByTestId("theme-dark").click();
  97  |     await scan(page, "settings (dark)");
  98  |     console.log("G8 completed every required screen in both themes");
  99  |   });
  100 | });
  101 | 
```