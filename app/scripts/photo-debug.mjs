import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const fixtures = path.resolve("../artifacts/fixtures");
const files = fs.readdirSync(fixtures).filter((f) => f.endsWith(".jpg")).map((f) => path.join(fixtures, f));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 800 } });
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
page.on("console", (m) => console.log("CONSOLE", m.type(), m.text()));
page.on("worker", (w) => console.log("WORKER STARTED", w.url()));

await page.goto("http://localhost:4173/");
await page.getByLabel("Activation code character 1 of 12").click();
await page.keyboard.type("PAVECON-DEMO", { delay: 10 });
await page.getByRole("button", { name: "ACTIVATE" }).click();
await page.waitForTimeout(600);
await page.getByTestId("copy-from-yesterday").click();
await page.waitForTimeout(500);
await page.locator("#sec-photos > h2 > button").click();
await page.waitForTimeout(200);
await page.locator('#sec-photos input[type="file"]').nth(1).setInputFiles(files.slice(0, 2));
await page.waitForTimeout(4000);
console.log("section text:", await page.locator("#sec-photos").innerText());
console.log("photo count:", await page.evaluate(async () => {
  const req = indexedDB.open("pavecon-site-diary");
  const db = await new Promise((res) => (req.onsuccess = () => res(req.result)));
  return new Promise((res) => {
    const c = db.transaction("photos").objectStore("photos").count();
    c.onsuccess = () => res(c.result);
  });
}));
await browser.close();
