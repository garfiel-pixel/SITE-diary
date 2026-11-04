import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const fixtures = path.resolve("../artifacts/fixtures");
const files = fs.readdirSync(fixtures).filter((f) => f.endsWith(".jpg")).map((f) => path.join(fixtures, f));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

await page.goto("http://localhost:4173/");
await page.getByLabel("Activation code character 1 of 12").click();
await page.keyboard.type("PAVECON-DEMO", { delay: 10 });
await page.getByRole("button", { name: "ACTIVATE" }).click();
await page.waitForTimeout(600);
await page.getByTestId("copy-from-yesterday").click();
await page.waitForTimeout(500);
await page.locator("#sec-photos > h2 > button").click();
await page.waitForTimeout(200);
const t0 = Date.now();
await page.locator('#sec-photos input[type="file"]').nth(1).setInputFiles(files);
await page.waitForFunction(
  async () => {
    const req = indexedDB.open("pavecon-site-diary");
    const db = await new Promise((res) => (req.onsuccess = () => res(req.result)));
    return new Promise((res) => {
      const c = db.transaction("photos").objectStore("photos").count();
      c.onsuccess = () => res(c.result >= 12);
    });
  },
  undefined,
  { timeout: 120000 }
);
console.log("12 photos stored in", Date.now() - t0, "ms");
const rows = await page.evaluate(async () => {
  const req = indexedDB.open("pavecon-site-diary");
  const db = await new Promise((res) => (req.onsuccess = () => res(req.result)));
  return new Promise((res) => {
    const all = db.transaction("photos").objectStore("photos").getAll();
    all.onsuccess = () =>
      res(
        all.result.map((p) => ({
          id: p.id.slice(0, 8),
          bytes: p.blob.size,
          type: p.blob.type,
          w: p.w,
          h: p.h,
          reportId: p.reportId.slice(0, 8),
        }))
      );
  });
});
for (const r of rows) console.log(JSON.stringify(r));
console.log("max bytes:", Math.max(...rows.map((r) => r.bytes)), "max long edge:", Math.max(...rows.map((r) => Math.max(r.w, r.h))));
console.log("errors:", errors);
await browser.close();
