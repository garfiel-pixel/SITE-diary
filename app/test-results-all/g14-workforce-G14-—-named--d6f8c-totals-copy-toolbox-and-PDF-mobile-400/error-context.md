# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: g14-workforce.spec.ts >> G14 — named workforce >> names drive totals, copy, toolbox and PDF
- Location: e2e\g14-workforce.spec.ts:117:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('pdf-state')
Expected: visible
Timeout: 180000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByTestId('pdf-state') with timeout 180000ms
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
  - text: People 21 21 Named Equipment 26.5 h Deliveries 0 Time lost 0 h Saved on phone
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
  - heading "Workforce 21 on site" [level=2]:
    - button "Workforce 21 on site" [expanded]
  - tablist "Workforce groups":
    - tab "Own crew 19" [selected]
    - tab "Subcontractors 2"
  - tabpanel "Own crew 19":
    - text: On site now
    - paragraph: 19 people
    - button "Rename"
    - button "Add person to Own crew"
    - list "Own crew people":
      - listitem:
        - text: Andre Brown Supervisor
        - button "Edit Andre Brown"
        - button "Remove Andre Brown"
      - listitem:
        - text: Kemar Lewis Paver operator
        - button "Edit Kemar Lewis"
        - button "Remove Kemar Lewis"
      - listitem:
        - text: Dwayne Clarke Paver operator
        - button "Edit Dwayne Clarke"
        - button "Remove Dwayne Clarke"
      - listitem:
        - text: Ricardo Hall Roller driver
        - button "Edit Ricardo Hall"
        - button "Remove Ricardo Hall"
      - listitem:
        - text: Omar Reid Roller driver
        - button "Edit Omar Reid"
        - button "Remove Omar Reid"
      - listitem:
        - text: Jerome Whyte Raker
        - button "Edit Jerome Whyte"
        - button "Remove Jerome Whyte"
      - listitem:
        - text: Damion Green Raker
        - button "Edit Damion Green"
        - button "Remove Damion Green"
      - listitem:
        - text: Troy Bennett Raker
        - button "Edit Troy Bennett"
        - button "Remove Troy Bennett"
      - listitem:
        - text: Michael Grant Flagman
        - button "Edit Michael Grant"
        - button "Remove Michael Grant"
      - listitem:
        - text: Kevin Thomas Flagman
        - button "Edit Kevin Thomas"
        - button "Remove Kevin Thomas"
      - listitem:
        - text: Patrick Wright Flagman
        - button "Edit Patrick Wright"
        - button "Remove Patrick Wright"
      - listitem:
        - text: Leroy Sinclair Flagman
        - button "Edit Leroy Sinclair"
        - button "Remove Leroy Sinclair"
      - listitem:
        - text: Andre Smith Labourer
        - button "Edit Andre Smith"
        - button "Remove Andre Smith"
      - listitem:
        - text: Christopher Ellis Labourer
        - button "Edit Christopher Ellis"
        - button "Remove Christopher Ellis"
      - listitem:
        - text: Rohan Blake Labourer
        - button "Edit Rohan Blake"
        - button "Remove Rohan Blake"
      - listitem:
        - text: Tevin Campbell Labourer
        - button "Edit Tevin Campbell"
        - button "Remove Tevin Campbell"
      - listitem:
        - text: Jason Brown Labourer
        - button "Edit Jason Brown"
        - button "Remove Jason Brown"
      - listitem:
        - text: Delroy Clarke Labourer
        - button "Edit Delroy Clarke"
        - button "Remove Delroy Clarke"
      - listitem:
        - text: Nia Campbell Screed hand
        - button "Edit Nia Campbell"
        - button "Remove Nia Campbell"
    - text: Roles in Own crew Labourer 6 Flagman 4 Raker 3 Paver operator 2 Roller driver 2 Screed hand 1 Supervisor 1
  - heading "Work in progress —" [level=2]:
    - button "Work in progress —"
  - heading "Visitors —" [level=2]:
    - button "Visitors —"
  - heading "Instructions —" [level=2]:
    - button "Instructions —"
  - heading "Toolbox talk —" [level=2]:
    - button "Toolbox talk —" [expanded]
  - text: Topic
  - textbox "Topic":
    - /placeholder: Type a topic…
  - text: Presenter
  - button "Andre Brown ✓" [pressed]
  - button "Kemar Lewis"
  - button "Dwayne Clarke"
  - textbox "Presenter":
    - /placeholder: Name…
    - text: Andre Brown
  - text: Time
  - textbox "Time": 04:15
  - text: Present 1 of 21
  - button "All present"
  - button "None"
  - 'button "Andre Brown, Supervisor: present" [pressed]': Andre Brown ✓
  - 'button "Kemar Lewis, Paver operator: absent"': Kemar Lewis
  - 'button "Dwayne Clarke, Paver operator: absent"': Dwayne Clarke
  - 'button "Ricardo Hall, Roller driver: absent"': Ricardo Hall
  - 'button "Omar Reid, Roller driver: absent"': Omar Reid
  - 'button "Jerome Whyte, Raker: absent"': Jerome Whyte
  - 'button "Damion Green, Raker: absent"': Damion Green
  - 'button "Troy Bennett, Raker: absent"': Troy Bennett
  - 'button "Michael Grant, Flagman: absent"': Michael Grant
  - 'button "Kevin Thomas, Flagman: absent"': Kevin Thomas
  - 'button "Patrick Wright, Flagman: absent"': Patrick Wright
  - 'button "Leroy Sinclair, Flagman: absent"': Leroy Sinclair
  - 'button "Andre Smith, Labourer: absent"': Andre Smith
  - 'button "Christopher Ellis, Labourer: absent"': Christopher Ellis
  - 'button "Rohan Blake, Labourer: absent"': Rohan Blake
  - 'button "Tevin Campbell, Labourer: absent"': Tevin Campbell
  - 'button "Jason Brown, Labourer: absent"': Jason Brown
  - 'button "Delroy Clarke, Labourer: absent"': Delroy Clarke
  - 'button "Nia Campbell, Screed hand: absent"': Nia Campbell
  - 'button "Devon Hall, Water bowser driver: absent"': Devon Hall
  - 'button "Ethan Reid, Steel fixer: absent"': Ethan Reid
  - paragraph: Attendance uses the named workforce. Remove someone there and they leave this register too.
  - text: Notes — hazards raised and agreements
  - 'button "Notes — hazards raised and agreements: add PPE"': PPE
  - 'button "Notes — hazards raised and agreements: add Traffic"': Traffic
  - 'button "Notes — hazards raised and agreements: add Heat"': Heat
  - 'button "Notes — hazards raised and agreements: add Slips"': Slips
  - 'button "Notes — hazards raised and agreements: add Plant movement"': Plant movement
  - 'button "Notes — hazards raised and agreements: add Dust"': Dust
  - 'button "Notes — hazards raised and agreements: add Noise"': Noise
  - textbox "Notes — hazards raised and agreements"
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
  119 |     await activate(page);
  120 | 
  121 |     // ---- sample: one row per person, no headcount controls --------------
  122 |     await setDate(page, YESTERDAY_ISO);
  123 |     await openSection(page, "sec-workforce");
  124 |     const wf = page.locator("#sec-workforce");
  125 |     await expect(wf.getByRole("tab", { name: /Own crew/ })).toContainText("18");
  126 |     await expect(wf.getByRole("tab", { name: /Subcontractors/ })).toContainText("1");
  127 |     await expect(wf).toContainText("Andre Brown");
  128 |     await expect(wf).toContainText("Raker 3");
  129 |     await expect(wf.locator('input[aria-label*="count" i]')).toHaveCount(0);
  130 |     console.log("G14 sample: 18 own crew + 1 subcontractor, named rows, derived Raker 3");
  131 | 
  132 |     // ---- copy carries names to today ------------------------------------
  133 |     await setDate(page, TODAY_ISO);
  134 |     await copyFromYesterday(page);
  135 |     await waitSaved(page);
  136 |     await openSection(page, "sec-workforce");
  137 |     await expect(page.getByTestId("summary-strip")).toContainText(/People\s+19/);
  138 |     await wf.getByRole("tab", { name: /Subcontractors/ }).click();
  139 |     await expect(wf).toContainText("Devon Hall");
  140 |     await wf.getByRole("tab", { name: /Own crew/ }).click();
  141 | 
  142 |     // ---- add a person to each tab ---------------------------------------
  143 |     await page.getByTestId("add-person").click();
  144 |     const addSheet = page.getByRole("dialog", { name: "Add person" });
  145 |     await expect(addSheet).toBeVisible();
  146 |     await addSheet.getByTestId("person-name").fill("Nia Campbell");
  147 |     await addSheet.getByTestId("person-role").fill("Raker");
  148 |     await addSheet.getByTestId("save-person").click();
  149 |     await expect(wf).toContainText("Nia Campbell");
  150 |     await expect(wf.getByRole("tab", { name: /Own crew/ })).toContainText("19");
  151 | 
  152 |     await wf.getByRole("tab", { name: /Subcontractors/ }).click();
  153 |     await page.getByTestId("add-person").click();
  154 |     const subSheet = page.getByRole("dialog", { name: "Add person" });
  155 |     await subSheet.getByTestId("person-name").fill("Ethan Reid");
  156 |     await subSheet.getByTestId("person-role").fill("Steel fixer");
  157 |     await subSheet.getByTestId("save-person").click();
  158 |     await expect(wf).toContainText("Ethan Reid");
  159 |     await expect(wf.getByRole("tab", { name: /Subcontractors/ })).toContainText("2");
  160 |     await expect(page.getByTestId("summary-strip")).toContainText(/People\s+21/);
  161 |     await expect(wf).toContainText("Steel fixer 1");
  162 |     console.log("G14 add: 21 people; role totals updated per tab");
  163 | 
  164 |     // ---- sheet accessibility --------------------------------------------
  165 |     await page.getByTestId("add-person").click();
  166 |     const a11ySheet = page.getByRole("dialog", { name: "Add person" });
  167 |     const axe = await new AxeBuilder({ page })
  168 |       .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
  169 |       .analyze();
  170 |     const serious = axe.violations.filter(
  171 |       (v) => v.impact === "serious" || v.impact === "critical"
  172 |     );
  173 |     expect(serious.map((v) => `${v.id} (${v.impact})`)).toEqual([]);
  174 |     console.log(`G14 add-person sheet: 0 serious/critical (${axe.violations.length} total)`);
  175 |     await a11ySheet.getByRole("button", { name: "Close", exact: true }).click();
  176 | 
  177 |     // ---- edit a role, remove with Undo ----------------------------------
  178 |     await wf.getByRole("tab", { name: /Own crew/ }).click();
  179 |     await wf.getByRole("button", { name: "Edit Nia Campbell" }).click();
  180 |     const editSheet = page.getByRole("dialog", { name: "Edit person" });
  181 |     await expect(editSheet.getByTestId("person-name")).toHaveValue("Nia Campbell");
  182 |     await editSheet.getByTestId("person-role").fill("Screed hand");
  183 |     await editSheet.getByTestId("save-person").click();
  184 |     await expect(wf).toContainText("Screed hand 1");
  185 |     await expect(wf).toContainText("Raker 3");
  186 | 
  187 |     await wf.getByRole("button", { name: "Remove Nia Campbell" }).click();
  188 |     await expect(page.getByTestId("undo-snackbar")).toBeVisible();
  189 |     await expect(page.getByTestId("summary-strip")).toContainText(/People\s+20/);
  190 |     await page
  191 |       .getByTestId("undo-snackbar")
  192 |       .getByRole("button", { name: "Undo last change" })
  193 |       .click();
  194 |     await expect(page.getByTestId("summary-strip")).toContainText(/People\s+21/);
  195 |     await expect(wf).toContainText("Nia Campbell");
  196 |     console.log("G14 edit → remove → Undo restored the same named row");
  197 | 
  198 |     // ---- reload persistence ---------------------------------------------
  199 |     await waitSaved(page);
  200 |     await page.reload();
  201 |     await openSection(page, "sec-workforce");
  202 |     await expect(wf).toContainText("Nia Campbell");
  203 |     await expect(page.getByTestId("summary-strip")).toContainText(/People\s+21/);
  204 |     console.log("G14 reload: names and totals persisted");
  205 | 
  206 |     // ---- toolbox attendance uses the same people ------------------------
  207 |     await openSection(page, "sec-toolbox");
  208 |     await page.getByTestId("start-toolbox").click();
  209 |     await expect(page.locator("#sec-toolbox")).toContainText("0 of 21");
  210 |     await page
  211 |       .getByRole("button", { name: "Andre Brown, Supervisor: absent" })
  212 |       .click();
  213 |     await expect(page.locator("#sec-toolbox")).toContainText("1 of 21");
  214 |     console.log("G14 toolbox: attendance drawn from named workforce");
  215 | 
  216 |     // ---- PDF contains names, roles and present list ---------------------
  217 |     await setRecordedBy(page, "K. Johnson");
  218 |     await page.getByTestId("create-pdf").click();
> 219 |     await expect(page.getByTestId("pdf-state")).toBeVisible({ timeout: 180_000 });
      |                                                 ^ Error: expect(locator).toBeVisible() failed
  220 |     const [download] = await Promise.all([
  221 |       page.waitForEvent("download"),
  222 |       page.getByRole("button", { name: "Save to phone" }).click(),
  223 |     ]);
  224 |     const pdfPath = path.join(ARTIFACTS, "g14-named-workforce.pdf");
  225 |     await download.saveAs(pdfPath);
  226 |     const text = (await pdfText(pdfPath)).join(" ").replace(/\s+/g, " ");
  227 |     expect(text).toContain("Workforce — 21 people");
  228 |     expect(text).toContain("Nia Campbell");
  229 |     expect(text).toContain("Ethan Reid");
  230 |     expect(text).toContain("Screed hand");
  231 |     expect(text).toContain("Roles:");
  232 |     expect(text).toContain("Present: Andre Brown");
  233 |     console.log(
  234 |       `G14 PDF: named workforce + roles + present list (${fs.statSync(pdfPath).size} bytes)`
  235 |     );
  236 |     await page.locator('.k-sheet[data-open="true"]').click({ position: { x: 4, y: 4 } });
  237 | 
  238 |     // ---- copy forward keeps names with fresh ids ------------------------
  239 |     const tomorrow = new Date(TODAY);
  240 |     tomorrow.setDate(tomorrow.getDate() + 1);
  241 |     const tomorrowISO = iso(tomorrow);
  242 |     await setDate(page, tomorrowISO);
  243 |     await copyFromYesterday(page);
  244 |     await waitSaved(page);
  245 |     await openSection(page, "sec-workforce");
  246 |     await expect(wf).toContainText("Nia Campbell");
  247 |     await wf.getByRole("tab", { name: /Subcontractors/ }).click();
  248 |     await expect(wf).toContainText("Ethan Reid");
  249 |     const todayReport = (await getReportForDate(page, TODAY_ISO)) as {
  250 |       workforce: { a: { id: string; name: string }[]; b: { id: string; name: string }[] };
  251 |     };
  252 |     const tomorrowReport = (await getReportForDate(page, tomorrowISO)) as {
  253 |       workforce: { a: { id: string; name: string }[]; b: { id: string; name: string }[] };
  254 |     };
  255 |     const todayNia = todayReport.workforce.a.find((p) => p.name === "Nia Campbell");
  256 |     const tomorrowNia = tomorrowReport.workforce.a.find((p) => p.name === "Nia Campbell");
  257 |     expect(todayNia && tomorrowNia).toBeTruthy();
  258 |     expect(tomorrowNia!.id).not.toBe(todayNia!.id);
  259 |     console.log("G14 copy-forward: names kept, row ids regenerated");
  260 | 
  261 |     // ---- 400 and 1280 widths --------------------------------------------
  262 |     const width = () =>
  263 |       page.evaluate(() => ({
  264 |         scroll: document.scrollingElement!.scrollWidth,
  265 |         inner: window.innerWidth,
  266 |       }));
  267 |     let sizes = await width();
  268 |     expect(sizes.scroll).toBeLessThanOrEqual(sizes.inner + 1);
  269 |     await page.setViewportSize({ width: 1280, height: 800 });
  270 |     await openSection(page, "sec-workforce");
  271 |     sizes = await width();
  272 |     expect(sizes.scroll).toBeLessThanOrEqual(sizes.inner + 1);
  273 |     console.log("G14 400×800 and 1280×800: no horizontal overflow");
  274 |   });
  275 | });
  276 | 
```