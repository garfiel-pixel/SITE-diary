# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: qol-all-phases.spec.ts >> QOL — Phase 1–3 >> jump-to-section drawer lists sections and navigates
- Location: e2e\qol-all-phases.spec.ts:90:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:4173/
Call log:
  - navigating to "http://localhost:4173/", waiting until "load"

```

# Test source

```ts
  1   | import { expect, type Page } from "@playwright/test";
  2   | 
  3   | export const CODE = "PAVECON-DEMO";
  4   | export const TODAY = new Date();
  5   | export const TODAY_ISO = iso(TODAY);
  6   | export const YESTERDAY_ISO = iso(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - 1));
  7   | 
  8   | export function iso(d: Date): string {
  9   |   return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
  10  |     d.getDate()
  11  |   ).padStart(2, "0")}`;
  12  | }
  13  | 
  14  | /** Types the demo code into the segmented gate and unlocks. */
  15  | export async function activate(page: Page) {
  16  |   await page.goto("/");
  17  |   const first = page.getByLabel("Activation code character 1 of 12");
  18  |   await expect(first).toBeVisible();
  19  |   await first.click();
  20  |   await page.keyboard.type(CODE, { delay: 10 });
  21  |   await page.getByRole("button", { name: "ACTIVATE" }).click();
  22  |   await expect(page.getByTestId("app-header")).toBeVisible({ timeout: 15_000 });
  23  |   await waitForSeed(page);
  24  |   await openEditor(page, TODAY_ISO);
  25  |   resetAudit(page);
  26  | }
  27  | 
  28  | /** Directly writes the activation setting through IndexedDB and waits until
  29  |  *  the main shell is actually rendered (the live query can lag behind the
  30  |  *  write on reload). */
  31  | export async function activateDb(page: Page) {
> 32  |   await page.goto("/");
      |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:4173/
  33  |   await page.evaluate(async () => {
  34  |     await new Promise<void>((resolve, reject) => {
  35  |       const req = indexedDB.open("pavecon-site-diary");
  36  |       req.onerror = () => reject(req.error);
  37  |       req.onsuccess = () => {
  38  |         const db = req.result;
  39  |         const tx = db.transaction("settings", "readwrite");
  40  |         tx.objectStore("settings").put({ key: "activation", value: "on" });
  41  |         tx.oncomplete = () => resolve();
  42  |         tx.onerror = () => reject(tx.error);
  43  |       };
  44  |     });
  45  |   });
  46  |   await page.reload();
  47  |   await expect(page.locator('[data-testid="app-header"]')).toBeVisible({ timeout: 30_000 });
  48  |   await waitForSeed(page);
  49  |   await openEditor(page, TODAY_ISO);
  50  | }
  51  | 
  52  | /** Waits until the seeded sample report is available on a fresh profile. */
  53  | export async function waitForSeed(page: Page) {
  54  |   await expect
  55  |     .poll(async () => tableCount(page, "reports").catch(() => 0), {
  56  |       timeout: 20_000,
  57  |       intervals: [100, 250, 500],
  58  |     })
  59  |     .toBeGreaterThan(0);
  60  | }
  61  | 
  62  | /** Counts rows in a store using plain IndexedDB (works against prod build). */
  63  | export async function tableCount(page: Page, store: string): Promise<number> {
  64  |   return page.evaluate(async (s) => {
  65  |     return new Promise<number>((resolve, reject) => {
  66  |       const req = indexedDB.open("pavecon-site-diary");
  67  |       req.onerror = () => reject(req.error);
  68  |       req.onsuccess = () => {
  69  |         const db = req.result;
  70  |         const tx = db.transaction(s, "readonly");
  71  |         const count = tx.objectStore(s).count();
  72  |         count.onsuccess = () => resolve(count.result);
  73  |         count.onerror = () => reject(count.error);
  74  |       };
  75  |     });
  76  |   }, store);
  77  | }
  78  | 
  79  | export async function openSection(page: Page, id: string) {
  80  |   const header = page.locator(`#${id} > h2 > button`);
  81  |   const expanded = await header.getAttribute("aria-expanded");
  82  |   if (expanded !== "true") await header.click();
  83  |   await expect(header).toHaveAttribute("aria-expanded", "true");
  84  | }
  85  | 
  86  | export async function setRecordedBy(page: Page, name: string) {
  87  |   await openSection(page, "sec-recorded");
  88  |   const input = page.getByTestId("recorded-by");
  89  |   await input.fill(name);
  90  |   await input.blur();
  91  | }
  92  | 
  93  | /** Ensures the diary editor is open for `isoDate`, starting from home when
  94  |  *  necessary. Home is the launch screen now, so old tests must navigate to the
  95  |  *  editor explicitly instead of relying on an auto-opened report. */
  96  | export async function openEditor(page: Page, isoDate: string = TODAY_ISO) {
  97  |   if (page.url().includes(`#/report/${isoDate}`)) {
  98  |     await expect(
  99  |       page.locator("#sec-project, #newday-card").first()
  100 |     ).toBeVisible({ timeout: 15_000 });
  101 |     return;
  102 |   }
  103 |   await page.goto(`#/report/${isoDate}`);
  104 |   await expect(
  105 |     page.locator("#sec-project, #newday-card").first()
  106 |   ).toBeVisible({ timeout: 15_000 });
  107 | }
  108 | 
  109 | /** Navigates the diary to a specific ISO date, with or without a report. */
  110 | export async function setDate(page: Page, isoDate: string) {
  111 |   const inEditor = await page.locator("#sec-project, #newday-card").count();
  112 |   if (!inEditor) {
  113 |     await openEditor(page, isoDate);
  114 |     return;
  115 |   }
  116 |   const projectHeader = page.locator("#sec-project > h2 > button");
  117 |   if (await projectHeader.count()) await openSection(page, "sec-project");
  118 |   const input = page.locator('input[aria-label="Date"]').first();
  119 |   await input.fill(isoDate);
  120 |   await page.waitForTimeout(400);
  121 | }
  122 | 
  123 | /** Waits for the 400 ms autosave to land (plus a safety margin). */
  124 | export async function waitSaved(page: Page) {
  125 |   await page.waitForTimeout(700);
  126 | }
  127 | 
  128 | /** Reports currently in Dexie, newest date first. */
  129 | export async function getReports(page: Page) {
  130 |   return page.evaluate(async () => {
  131 |     const req = indexedDB.open("pavecon-site-diary");
  132 |     const db = await new Promise<IDBDatabase>((res) => (req.onsuccess = () => res(req.result)));
```