# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: g5-pdf.spec.ts >> G5 — PDF >> sample + 30-photo stress report: text, header/footer on every page
- Location: e2e\g5-pdf.spec.ts:92:3

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
  - text: People 19 19 Named Equipment 26.5 h Deliveries 1 Time lost 0 h Saved on phone
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
  - heading "Materials delivered 1 deliveries" [level=2]:
    - button "Materials delivered 1 deliveries" [expanded]
  - button "Add Marl": Marl
  - button "Add Tack coat": Tack coat
  - button "Add Asphalt": Asphalt
  - button "Add Gravel": Gravel
  - button "Add Aggregate": Aggregate
  - button "Add Sand": Sand
  - button "Add Cement": Cement
  - button "Add Kerb": Kerb
  - button "More…"
  - button "Other…"
  - text: Ready-mix
  - button "Remove Ready-mix"
  - button "Decrease by 10": −10
  - button "Decrease by 1": −1
  - button "Quantity 5 m³ — open numpad": 5 m³
  - button "Increase by 1": "+1"
  - button "Increase by 10": "+10"
  - combobox "Unit":
    - option "tonnes"
    - option "bags"
    - option "loads"
    - option "pcs"
    - option "lengths"
    - option "m³" [selected]
    - option "gal"
    - option "rolls"
    - option "kg"
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
  12  | import { fmtDate } from "../src/lib/format";
  13  | 
  14  | const ARTIFACTS = path.resolve(process.cwd(), "..", "artifacts");
  15  | const FIXTURES = path.join(ARTIFACTS, "fixtures");
  16  | 
  17  | interface PdfLine {
  18  |   str: string;
  19  |   x: number;
  20  |   y: number;
  21  |   width: number;
  22  | }
  23  | 
  24  | async function pdfPages(file: string) {
  25  |   const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  26  |   const data = new Uint8Array(fs.readFileSync(file));
  27  |   const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  28  |   const pages: string[] = [];
  29  |   const lines: PdfLine[][] = [];
  30  |   for (let i = 1; i <= doc.numPages; i++) {
  31  |     const page = await doc.getPage(i);
  32  |     const content = await page.getTextContent();
  33  |     const pageLines: PdfLine[] = [];
  34  |     const text: string[] = [];
  35  |     for (const item of content.items) {
  36  |       if (!("str" in item)) continue;
  37  |       text.push(item.str);
  38  |       if (!item.str.trim()) continue;
  39  |       pageLines.push({
  40  |         str: item.str,
  41  |         x: item.transform[4],
  42  |         y: item.transform[5],
  43  |         width: item.width,
  44  |       });
  45  |     }
  46  |     pages.push(text.join(" ").replace(/\s+/g, " "));
  47  |     lines.push(pageLines);
  48  |   }
  49  |   return { pages, lines, numPages: doc.numPages };
  50  | }
  51  | 
  52  | /* The header logo is 92 pt wide with a 36 pt left margin; its right edge is
  53  |    128 pt. The title column must start at least 16 pt to the right of it. */
  54  | function assertHeaderClearOfLogo(lines: PdfLine[][]) {
  55  |   lines.forEach((pageLines, i) => {
  56  |     const header = pageLines.filter((line) => line.y > 780);
  57  |     expect(header.length, `page ${i + 1} has no header text`).toBeGreaterThanOrEqual(2);
  58  |     for (const line of header) {
  59  |       expect(line.x, `page ${i + 1} header “${line.str}” clear of logo`).toBeGreaterThanOrEqual(
  60  |         144
  61  |       );
  62  |       expect(
  63  |         line.x + line.width,
  64  |         `page ${i + 1} header “${line.str}” inside right margin`
  65  |       ).toBeLessThanOrEqual(559.5);
  66  |     }
  67  |     expect(header.map((line) => line.str).join(" ")).toContain("CHOOSE WISELY");
  68  |   });
  69  | }
  70  | 
  71  | function assertEveryPage(
  72  |   pages: string[],
  73  |   expected: { name: string; project: string; site: string; date: string }
  74  | ) {
  75  |   pages.forEach((text, i) => {
  76  |     expect(text, `page ${i + 1} missing recorded-by footer`).toContain(
  77  |       `Recorded by: ${expected.name}`
  78  |     );
  79  |     expect(text, `page ${i + 1} missing page counter`).toContain(
  80  |       `Page ${i + 1} of ${pages.length}`
  81  |     );
  82  |     expect(text, `page ${i + 1} missing motto header`).toContain(
  83  |       "CHOOSE WISELY... BUILD WITH CONFIDENCE"
  84  |     );
  85  |     expect(text, `page ${i + 1} missing project header`).toContain(expected.project);
  86  |     expect(text, `page ${i + 1} missing site header`).toContain(expected.site);
  87  |     expect(text, `page ${i + 1} missing date header`).toContain(expected.date);
  88  |   });
  89  | }
  90  | 
  91  | test.describe("G5 — PDF", () => {
  92  |   test("sample + 30-photo stress report: text, header/footer on every page", async ({
  93  |     page,
  94  |   }) => {
  95  |     test.setTimeout(360_000);
  96  |     await activateDb(page);
  97  |     await copyFromYesterday(page);
  98  |     await setRecordedBy(page, "K. Johnson");
  99  | 
  100 |     // A material with the m³ glyph, to prove the embedded font covers it.
  101 |     await openSection(page, "sec-materials");
  102 |     const materials = page.locator("#sec-materials");
  103 |     await materials.getByRole("button", { name: "More…" }).click();
  104 |     const catalogue = page.getByRole("dialog", { name: "Full catalogue" });
  105 |     await catalogue.getByRole("button", { name: "Ready-mix", exact: true }).click();
  106 |     await page.locator('#sec-materials button[aria-label*="open numpad"]').first().click();
  107 |     const pad = page.getByRole("dialog", { name: "Number pad" });
  108 |     await pad.getByRole("button", { name: "5", exact: true }).click();
  109 |     await pad.getByRole("button", { name: "Done" }).click();
  110 | 
  111 |     await page.getByTestId("create-pdf").click();
> 112 |     await expect(page.getByTestId("pdf-state")).toBeVisible({ timeout: 120_000 });
      |                                                 ^ Error: expect(locator).toBeVisible() failed
  113 | 
  114 |     const [download] = await Promise.all([
  115 |       page.waitForEvent("download"),
  116 |       page.getByRole("button", { name: "Save to phone" }).click(),
  117 |     ]);
  118 |     const samplePath = path.join(ARTIFACTS, "sample-site-diary.pdf");
  119 |     await download.saveAs(samplePath);
  120 | 
  121 |     const sample = await pdfPages(samplePath);
  122 |     const sampleBytes = fs.statSync(samplePath).size;
  123 |     expect(fs.existsSync(path.join(process.cwd(), "dist", "assets", "pdf-builder.js"))).toBe(
  124 |       true
  125 |     );
  126 |     console.log(`G5 sample PDF: ${sample.numPages} page(s), ${sampleBytes} bytes`);
  127 |     expect(sample.numPages).toBeGreaterThanOrEqual(1);
  128 |     expect(sample.pages[0]).toContain("m³");
  129 |     assertEveryPage(sample.pages, {
  130 |       name: "K. Johnson",
  131 |       project: "Hatfield Road Rehabilitation",
  132 |       site: "Chainage 0+400 to 0+900",
  133 |       date: fmtDate(TODAY_ISO),
  134 |     });
  135 |     assertHeaderClearOfLogo(sample.lines);
  136 |     console.log(
  137 |       "G5 sample: header text starts 16pt after the logo; footer/counter on every page"
  138 |     );
  139 | 
  140 |     // ---- 30-photo stress report ---------------------------------------
  141 |     await page.locator('.k-sheet[data-open="true"]').click({ position: { x: 4, y: 4 } });
  142 |     await openSection(page, "sec-photos");
  143 |     const files = fs
  144 |       .readdirSync(FIXTURES)
  145 |       .filter((f) => f.endsWith(".jpg"))
  146 |       .sort()
  147 |       .slice(0, 30)
  148 |       .map((f) => path.join(FIXTURES, f));
  149 |     const gallery = page.locator('#sec-photos input[type="file"]').nth(1);
  150 |     await gallery.setInputFiles(files);
  151 |     await waitForPhotoCount(page, TODAY_ISO, 30, 240_000);
  152 | 
  153 |     await page.getByTestId("create-pdf").click();
  154 |     await expect(page.getByTestId("pdf-state")).toBeVisible({ timeout: 180_000 });
  155 |     const [stressDownload] = await Promise.all([
  156 |       page.waitForEvent("download"),
  157 |       page.getByRole("button", { name: "Save to phone" }).click(),
  158 |     ]);
  159 |     const stressPath = path.join(ARTIFACTS, "stress-site-diary.pdf");
  160 |     await stressDownload.saveAs(stressPath);
  161 | 
  162 |     const stress = await pdfPages(stressPath);
  163 |     const stressBytes = fs.statSync(stressPath).size;
  164 |     console.log(`G5 stress PDF: ${stress.numPages} page(s), ${stressBytes} bytes`);
  165 |     expect(stress.numPages).toBeGreaterThan(1);
  166 |     expect(stressBytes).toBeLessThan(8 * 1024 * 1024);
  167 |     assertEveryPage(stress.pages, {
  168 |       name: "K. Johnson",
  169 |       project: "Hatfield Road Rehabilitation",
  170 |       site: "Chainage 0+400 to 0+900",
  171 |       date: fmtDate(TODAY_ISO),
  172 |     });
  173 |     assertHeaderClearOfLogo(stress.lines);
  174 |     console.log("G5 stress: header clear of logo; footer and page counter on every page");
  175 | 
  176 |     fs.writeFileSync(
  177 |       path.join(ARTIFACTS, "pdf-gate.txt"),
  178 |       [
  179 |         `sample: ${sample.numPages} pages, ${sampleBytes} bytes`,
  180 |         `stress: ${stress.numPages} pages, ${stressBytes} bytes`,
  181 |         "recorded-by footer, Page n of N, motto/project/site/date header verified on every page",
  182 |         "m³ glyph present in sample PDF text",
  183 |       ].join("\n")
  184 |     );
  185 |   });
  186 | });
  187 | 
```