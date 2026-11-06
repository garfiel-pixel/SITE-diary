# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: g6-sync.spec.ts >> G6 — offline PWA + mock upload >> offline reload, PDF stays saved, online + visibilitychange upload
- Location: e2e\g6-sync.spec.ts:12:3

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
  - text: People 19 19 Named Equipment 26.5 h Deliveries 0 Time lost 0 h Saved on phone
  - heading "Project / Date Hatfield Road Rehabilitation · Chainage 0+400 to 0+900" [level=2]:
    - button "Project / Date Hatfield Road Rehabilitation · Chainage 0+400 to 0+900" [expanded]
  - text: Project
  - button "Use Hatfield Road Rehabilitation as Project": Hatfield Road Rehabilitation
  - textbox "Project":
    - /placeholder: Type…
    - text: Hatfield Road Rehabilitation
  - text: Site
  - button "Linear ✓" [pressed]
  - button "Zone"
  - combobox "Site start": Chainage 0+400
  - text: to
  - combobox "Site end": 0+900
  - paragraph: "Day: Thursday (from the date)"
  - button "Previous day": ‹
  - textbox "Date": 2026-11-05
  - button "Next day": ›
  - button "Today"
  - heading "Weather AM — PM —" [level=2]:
    - button "Weather AM — PM —" [expanded]
  - radiogroup "Weather A.M.":
    - radio "A.M. Clear": Clear
    - radio "A.M. Partly cloudy": Partly cloudy
    - radio "A.M. Overcast": Overcast
    - radio "A.M. Showers": Showers
    - radio "A.M. Heavy rain": Heavy rain
    - radio "A.M. Storm": Storm
  - radiogroup "Weather P.M.":
    - radio "P.M. Clear": Clear
    - radio "P.M. Partly cloudy": Partly cloudy
    - radio "P.M. Overcast": Overcast
    - radio "P.M. Showers": Showers
    - radio "P.M. Heavy rain": Heavy rain
    - radio "P.M. Storm": Storm
  - heading "Time lost —" [level=2]:
    - button "Time lost —"
  - heading "Equipment on site 4 machines · 26.5 h" [level=2]:
    - button "Equipment on site 4 machines · 26.5 h"
  - heading "Materials delivered —" [level=2]:
    - button "Materials delivered —"
  - heading "Workforce 19 on site" [level=2]:
    - button "Workforce 19 on site"
  - heading "Work in progress —" [level=2]:
    - button "Work in progress —"
  - heading "Visitors —" [level=2]:
    - button "Visitors —"
  - heading "Instructions —" [level=2]:
    - button "Instructions —"
  - heading "Toolbox talk —" [level=2]:
    - button "Toolbox talk —"
  - heading "Photos —" [level=2]:
    - button "Photos —"
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
  - 'button "Workforce: complete — jump to section"': Workforce
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
  - paragraph: "This PDF will be created without: Weather, Work in progress."
  - button "Create PDF anyway"
  - button "Review missing sections"
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import {
  3   |   activate,
  4   |   copyFromYesterday,
  5   |   getReportForDate,
  6   |   setRecordedBy,
  7   |   stubUploadSuccess,
  8   |   TODAY_ISO,
  9   | } from "./helpers";
  10  | 
  11  | test.describe("G6 — offline PWA + mock upload", () => {
  12  |   test("offline reload, PDF stays saved, online + visibilitychange upload", async ({
  13  |     page,
  14  |     context,
  15  |   }) => {
  16  |     test.setTimeout(180_000);
  17  |     await stubUploadSuccess(page);
  18  |     await activate(page);
  19  | 
  20  |     // First visit registers the worker; a reload puts the page under its
  21  |     // control so lazy chunks come from the precache. Verify synchronously.
  22  |     await expect
  23  |       .poll(
  24  |         () =>
  25  |           page.evaluate(async () => (await navigator.serviceWorker.ready).active?.state),
  26  |         { timeout: 30_000 }
  27  |       )
  28  |       .toBe("activated");
  29  |     await page.reload();
  30  |     await expect(page.getByTestId("app-header")).toBeVisible({ timeout: 20_000 });
  31  |     expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  32  |     console.log("G6 service worker controls the page");
  33  | 
  34  |     await copyFromYesterday(page);
  35  |     await setRecordedBy(page, "K. Johnson");
  36  | 
  37  |     await context.setOffline(true);
  38  |     console.log("G6 offline: context.setOffline(true)");
  39  | 
  40  |     await page.getByTestId("create-pdf").click();
> 41  |     await expect(page.getByTestId("pdf-state")).toBeVisible({ timeout: 120_000 });
      |                                                 ^ Error: expect(locator).toBeVisible() failed
  42  |     await expect(page.getByTestId("sync-state")).toContainText("Saved on phone");
  43  |     const report = await getReportForDate(page, TODAY_ISO);
  44  |     expect(report!.syncState).toBe("saved");
  45  |     console.log("G6 offline PDF created; report state = saved");
  46  | 
  47  |     await page.reload();
  48  |     await expect(page.getByTestId("app-header")).toBeVisible({ timeout: 20_000 });
  49  |     await expect(page.getByTestId("summary-strip")).toContainText("People");
  50  |     const afterReload = await getReportForDate(page, TODAY_ISO);
  51  |     expect(afterReload!.recordedBy).toBe("K. Johnson");
  52  |     console.log("G6 offline reload: app served by service worker, report intact");
  53  | 
  54  |     await context.setOffline(false);
  55  |     await page.evaluate(() => window.dispatchEvent(new Event("online")));
  56  |     await expect
  57  |       .poll(async () => page.getByTestId("sync-state").getAttribute("data-state"), {
  58  |         timeout: 10_000,
  59  |         intervals: [150, 250, 400],
  60  |       })
  61  |       .toBe("uploading");
  62  |     console.log("G6 online event: state = uploading");
  63  |     await expect
  64  |       .poll(async () => page.getByTestId("sync-state").getAttribute("data-state"), {
  65  |         timeout: 15_000,
  66  |       })
  67  |       .toBe("uploaded");
  68  |     console.log("G6 online event: state = uploaded");
  69  | 
  70  |     // ---- visibilitychange path ----------------------------------------
  71  |     await page.evaluate(async () => {
  72  |       const req = indexedDB.open("pavecon-site-diary");
  73  |       const db = await new Promise<IDBDatabase>((res) => (req.onsuccess = () => res(req.result)));
  74  |       await new Promise<void>((res, rej) => {
  75  |         const tx = db.transaction("reports", "readwrite");
  76  |         const store = tx.objectStore("reports");
  77  |         const cursor = store.openCursor();
  78  |         cursor.onsuccess = () => {
  79  |           const c = cursor.result;
  80  |           if (!c) return;
  81  |           const value = c.value;
  82  |           if (value.recordedBy === "K. Johnson") {
  83  |             value.syncState = "saved";
  84  |             c.update(value);
  85  |           }
  86  |           c.continue();
  87  |         };
  88  |         tx.oncomplete = () => res();
  89  |         tx.onerror = () => rej(tx.error);
  90  |       });
  91  |     });
  92  |     await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  93  |     await expect
  94  |       .poll(async () => page.getByTestId("sync-state").getAttribute("data-state"), {
  95  |         timeout: 15_000,
  96  |       })
  97  |       .toBe("uploaded");
  98  |     console.log("G6 visibilitychange path: report re-uploaded to uploaded");
  99  |   });
  100 | });
  101 | 
```