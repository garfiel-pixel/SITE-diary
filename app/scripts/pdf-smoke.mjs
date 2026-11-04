import { chromium } from "playwright";
import fs from "node:fs";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 800 }, acceptDownloads: true });
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
await page.locator("#sec-recorded > h2 > button").click();
await page.getByTestId("recorded-by").fill("K. Johnson");
await page.getByTestId("recorded-by").blur();
await page.waitForTimeout(700);

const t0 = Date.now();
await page.getByTestId("create-pdf").click();
await page.getByTestId("pdf-state").waitFor({ timeout: 60000 });
console.log("pdf built in", Date.now() - t0, "ms");
console.log("pdf sheet:", await page.getByTestId("pdf-state").innerText());
const sheetText = await page.locator('[role="dialog"]').last().innerText();
console.log(sheetText.replace(/\n/g, " | "));

const [download] = await Promise.all([
  page.waitForEvent("download"),
  page.getByRole("button", { name: "Save to phone" }).click(),
]);
const out = "../artifacts/sample-site-diary.pdf";
await download.saveAs(out);
console.log("saved", out, fs.statSync(out).size, "bytes");

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const data = new Uint8Array(fs.readFileSync(out));
const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
console.log("pages:", doc.numPages);
for (let i = 1; i <= doc.numPages; i++) {
  const pg = await doc.getPage(i);
  const content = await pg.getTextContent();
  const text = content.items.map((it) => ("str" in it ? it.str : "")).join(" ");
  console.log(`--- page ${i} ---`);
  console.log(text.slice(0, 500));
}
console.log("errors:", errors);
await browser.close();
