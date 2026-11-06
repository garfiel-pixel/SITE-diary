# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: export-full-form.spec.ts >> Full form → PDF export >> fill every section, use every control family, then export a clear PDF
- Location: e2e\export-full-form.spec.ts:20:3

# Error details

```
Test timeout of 300000ms exceeded.
```

```
Error: locator.fill: Test timeout of 300000ms exceeded.
Call log:
  - waiting for locator('#mi-site')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - link "Skip to main content" [ref=e3] [cursor=pointer]:
      - /url: "#main"
    - banner [ref=e4]:
      - img "Pave-Con Ltd — Paving & Construction logo" [ref=e6]
      - generic [ref=e7]:
        - heading "Masterbuilders - Site Diary" [level=1] [ref=e8]
        - paragraph [ref=e9]: CHOOSE WISELY... BUILD WITH CONFIDENCE
      - button "Switch to dark theme" [ref=e10] [cursor=pointer]
      - button "Settings" [ref=e13] [cursor=pointer]
    - main [ref=e17]:
      - generic [ref=e18]:
        - generic [ref=e19]:
          - button "← All reports" [ref=e20] [cursor=pointer]
          - heading "Thursday, 5 November 2026" [level=2] [ref=e21]
        - status [ref=e22]
        - generic [ref=e24]:
          - generic [ref=e25]:
            - text: People
            - generic [ref=e26]: "19"
            - generic [ref=e28]: 19 Named
          - generic [ref=e29]:
            - text: Equipment
            - generic [ref=e30]: 26.5 h
          - generic [ref=e32]:
            - text: Deliveries
            - generic [ref=e33]: "0"
          - generic [ref=e35]:
            - text: Time lost
            - generic [ref=e36]: 0 h
          - generic [ref=e38]: Saved on phone
        - generic [ref=e42]:
          - generic [ref=e43]:
            - heading [level=2] [ref=e44]:
              - button "Project / Date Hatchfield Rd Rehabilitation road rehabilitation · Chainage 0+400 to 0+900" [expanded] [ref=e45]:
                - generic [ref=e53]: Project / Date
                - generic [ref=e54]: Hatchfield Rd Rehabilitation road rehabilitation · Chainage 0+400 to 0+900
            - generic [ref=e63]:
              - generic [ref=e64]:
                - generic [ref=e65]: Project
                - button "Use Hatfield Road Rehabilitation as Project" [ref=e67] [cursor=pointer]: Hatfield Road Rehabilitation
                - textbox "Project" [active] [ref=e68] [cursor=pointer]:
                  - /placeholder: Type…
                  - text: Hatchfield Rd Rehabilitation road rehabilitation
              - generic [ref=e69]:
                - generic [ref=e70]: Site
                - generic [ref=e71]:
                  - generic [ref=e72]:
                    - button "Linear ✓" [pressed] [ref=e73] [cursor=pointer]
                    - button "Zone" [ref=e76] [cursor=pointer]
                  - generic [ref=e81]:
                    - combobox "Site start" [ref=e82] [cursor=pointer]: Chainage 0+400
                    - generic [ref=e83]: to
                    - combobox "Site end" [ref=e84] [cursor=pointer]: 0+900
              - paragraph [ref=e85]: "Day: Thursday (from the date)"
              - generic [ref=e86]:
                - generic [ref=e87]:
                  - button "Previous day" [ref=e88] [cursor=pointer]: ‹
                  - textbox "Date" [ref=e89] [cursor=pointer]: 2026-11-05
                  - button "Next day" [ref=e90] [cursor=pointer]: ›
                - button "Today" [ref=e91] [cursor=pointer]
          - heading [level=2] [ref=e93]:
            - button "Weather AM — PM —" [ref=e94]:
              - generic [ref=e100]: Weather
              - generic [ref=e102]:
                - generic [ref=e103]:
                  - generic [ref=e104]: AM
                  - generic [ref=e105]: —
                - generic [ref=e106]:
                  - generic [ref=e107]: PM
                  - generic [ref=e108]: —
          - heading [level=2] [ref=e115]:
            - button "Time lost —" [ref=e116]:
              - generic [ref=e121]: Time lost
              - generic [ref=e122]: —
          - heading [level=2] [ref=e129]:
            - button "Equipment on site 4 machines · 26.5 h" [ref=e130]:
              - generic [ref=e139]: Equipment on site
              - generic [ref=e140]: 4 machines · 26.5 h
          - heading [level=2] [ref=e148]:
            - button "Materials delivered —" [ref=e149]:
              - generic [ref=e154]: Materials delivered
              - generic [ref=e155]: —
          - heading [level=2] [ref=e162]:
            - button "Workforce 19 on site" [ref=e163]:
              - generic [ref=e172]: Workforce
              - generic [ref=e173]: 19 on site
          - heading [level=2] [ref=e181]:
            - button "Work in progress —" [ref=e182]:
              - generic [ref=e188]: Work in progress
              - generic [ref=e189]: —
          - heading [level=2] [ref=e196]:
            - button "Visitors —" [ref=e197]:
              - generic [ref=e202]: Visitors
              - generic [ref=e203]: —
          - heading [level=2] [ref=e210]:
            - button "Instructions —" [ref=e211]:
              - generic [ref=e216]: Instructions
              - generic [ref=e217]: —
          - heading [level=2] [ref=e224]:
            - button "Toolbox talk —" [ref=e225]:
              - generic [ref=e231]: Toolbox talk
              - generic [ref=e232]: —
          - heading [level=2] [ref=e239]:
            - button "Photos —" [ref=e240]:
              - generic [ref=e245]: Photos
              - generic [ref=e246]: —
          - heading [level=2] [ref=e253]:
            - button "Recorded by required" [ref=e254]:
              - generic [ref=e259]: Recorded by
              - generic [ref=e260]: required
        - generic [ref=e267]:
          - button "Jump to section" [ref=e268] [cursor=pointer]
          - generic [ref=e271]:
            - 'button "Weather: not yet — jump to section" [ref=e272] [cursor=pointer]': Weather
            - 'button "Workforce: complete — jump to section" [ref=e274] [cursor=pointer]': Workforce
            - 'button "Work in progress: not yet — jump to section" [ref=e277] [cursor=pointer]': Work in progress
            - 'button "Recorded by: not yet — jump to section" [ref=e279] [cursor=pointer]': Recorded by
          - button "Create PDF" [ref=e281]
    - contentinfo [ref=e282]:
      - paragraph [ref=e283]: CHOOSE WISELY... BUILD WITH CONFIDENCE
      - paragraph [ref=e284]: Pave-Con Ltd — Paving & Construction
      - paragraph [ref=e285]: Lot 1 Dunsinane Hatfield P.O., Manchester, Jamaica W.I.
      - paragraph [ref=e286]: "[876] 625-7283 · info@paveconja.com"
      - paragraph [ref=e287]: Supplied by the client, not independently verified.
  - text: ✓
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import fs from "node:fs";
  3   | import path from "node:path";
  4   | import {
  5   |   activate,
  6   |   copyFromYesterday,
  7   |   openSection,
  8   |   setRecordedBy,
  9   |   TODAY_ISO,
  10  |   waitForPhotoCount,
  11  |   waitSaved,
  12  | } from "./helpers";
  13  | 
  14  | const ARTIFACTS = path.resolve(process.cwd(), "..", "artifacts");
  15  | const FIXTURES = path.join(ARTIFACTS, "fixtures");
  16  | const PROJECT = "Hatchfield Rd Rehabilitation road rehabilitation";
  17  | const SITE = "Hatchfield Road, Manchester — Chainage 0+400 to 0+900";
  18  | 
  19  | test.describe("Full form → PDF export", () => {
  20  |   test("fill every section, use every control family, then export a clear PDF", async ({
  21  |     page,
  22  |   }) => {
  23  |     test.setTimeout(300_000);
  24  |     await activate(page);
  25  |     await copyFromYesterday(page);
  26  |     await waitSaved(page);
  27  | 
  28  |     // 1. Project / site — the owner's long title is the layout stress case.
  29  |     await openSection(page, "sec-project");
  30  |     await page.locator("#mi-project").fill(PROJECT);
> 31  |     await page.locator("#mi-site").fill(SITE);
      |                                    ^ Error: locator.fill: Test timeout of 300000ms exceeded.
  32  |     await page.locator("#mi-site").blur();
  33  |     await expect(page.locator("#mi-project")).toHaveValue(PROJECT);
  34  |     await expect(page.locator("#sec-project")).toContainText("Hatchfield");
  35  | 
  36  |     // 2. Weather — one AM and one PM choice.
  37  |     await openSection(page, "sec-weather");
  38  |     await page.getByRole("radio", { name: "A.M. Clear", exact: true }).click();
  39  |     await page.getByRole("radio", { name: "P.M. Showers", exact: true }).click();
  40  |     await expect(page.getByTestId("weather-summary")).toContainText("Clear");
  41  |     await expect(page.getByTestId("weather-summary")).toContainText("Showers");
  42  | 
  43  |     // 3. Time lost — reason plus the tape slider.
  44  |     await openSection(page, "sec-lost");
  45  |     await page.getByRole("radio", { name: "Rain", exact: true }).click();
  46  |     const lostHours = page.locator('[role="slider"][aria-label="Time lost hours"]');
  47  |     await lostHours.focus();
  48  |     await page.keyboard.press("ArrowRight");
  49  |     await waitSaved(page);
  50  | 
  51  |     // 4. Equipment — add a catalogue machine, step its hours, undo a removal.
  52  |     await openSection(page, "sec-equipment");
  53  |     const machineCount = await page.locator("#sec-equipment [role='slider']").count();
  54  |     await page
  55  |       .locator('#sec-equipment button[aria-label^="Add "]')
  56  |       .first()
  57  |       .click();
  58  |     await expect(page.locator("#sec-equipment [role='slider']")).toHaveCount(machineCount + 1);
  59  |     const firstMachine = page.locator("#sec-equipment [role='slider']").first();
  60  |     await firstMachine.focus();
  61  |     await page.keyboard.press("ArrowRight");
  62  |     const firstName = (await firstMachine.getAttribute("aria-label"))!.replace(" hours", "");
  63  |     await page.getByRole("button", { name: `Remove ${firstName}`, exact: true }).click();
  64  |     await page.getByTestId("undo-snackbar").getByRole("button", { name: "Undo last change" }).click();
  65  |     await expect(page.locator("#sec-equipment [role='slider']")).toHaveCount(machineCount + 1);
  66  | 
  67  |     // 5. Materials — add a delivery, open the numpad, pick 5, confirm.
  68  |     await openSection(page, "sec-materials");
  69  |     await page.getByRole("button", { name: "Add Asphalt", exact: true }).click();
  70  |     await page.locator('#sec-materials button[aria-label*="open numpad"]').first().click();
  71  |     const pad = page.getByRole("dialog", { name: "Number pad" });
  72  |     await pad.getByRole("button", { name: "5", exact: true }).click();
  73  |     await pad.getByRole("button", { name: "Done" }).click();
  74  |     await expect(page.getByTestId("summary-strip")).toContainText("Deliveries 1");
  75  | 
  76  |     // 6. Workforce — add, edit and switch crews.
  77  |     await openSection(page, "sec-workforce");
  78  |     await page.getByTestId("add-person").click();
  79  |     await page.getByTestId("person-name").fill("Mason Test");
  80  |     await page.getByTestId("person-role").fill("Mason");
  81  |     await page.getByTestId("save-person").click();
  82  |     await expect(page.getByTestId("summary-strip")).toContainText("20");
  83  | 
  84  |     // 7-9. Free text sections exercised through both typing and chips.
  85  |     await openSection(page, "sec-wip");
  86  |     await page.getByLabel("Work in progress", { exact: true }).fill("Milling and paving chainage 0+400");
  87  |     await page
  88  |       .locator("#sec-wip")
  89  |       .getByRole("button", { name: "Work in progress: add Asphalt laying", exact: true })
  90  |       .click();
  91  |     await expect(page.getByLabel("Work in progress", { exact: true })).toHaveValue(/Asphalt laying/);
  92  | 
  93  |     await openSection(page, "sec-visitors");
  94  |     await page.getByLabel("Visitors", { exact: true }).fill("Site inspection");
  95  |     await page
  96  |       .locator("#sec-visitors")
  97  |       .getByRole("button", { name: "Visitors: add Inspector", exact: true })
  98  |       .click();
  99  |     await expect(page.getByLabel("Visitors", { exact: true })).toHaveValue(/Inspector/);
  100 | 
  101 |     await openSection(page, "sec-instructions");
  102 |     await page
  103 |       .getByLabel("Instructions", { exact: true })
  104 |       .fill("Keep the haul road clean and maintain traffic control.");
  105 |     await page
  106 |       .locator("#sec-instructions")
  107 |       .getByRole("button", { name: "Instructions: add Engineer", exact: true })
  108 |       .click();
  109 | 
  110 |     // 10. Toolbox — start, topic, presenter, attendance and a hazard chip.
  111 |     await openSection(page, "sec-toolbox");
  112 |     await page.getByTestId("start-toolbox").click();
  113 |     await page.locator("#tb-topic").fill("Traffic management");
  114 |     await page.locator("#tb-pres").fill("Andre Brown");
  115 |     await page.getByRole("button", { name: "All present", exact: true }).click();
  116 |     await page
  117 |       .locator("#sec-toolbox")
  118 |       .getByRole("button", {
  119 |         name: "Notes — hazards raised and agreements: add PPE",
  120 |         exact: true,
  121 |       })
  122 |       .click();
  123 |     await expect(page.locator("#sec-toolbox")).toContainText("20 of 20");
  124 |     await expect(page.locator("#sec-toolbox textarea")).toHaveValue(/PPE/);
  125 | 
  126 |     // 11. Photos — one fixture through shrink, caption chip and bundle flow.
  127 |     await openSection(page, "sec-photos");
  128 |     const fixture = fs
  129 |       .readdirSync(FIXTURES)
  130 |       .filter((f) => f.endsWith(".jpg"))
  131 |       .sort()[0];
```