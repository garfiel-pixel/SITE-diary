import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push("console: " + m.text());
});

await page.goto("http://localhost:4173/");
await page.waitForTimeout(800);
console.log("title:", await page.title());
console.log("gate visible:", await page.getByLabel("Activation code character 1 of 12").isVisible().catch(() => false));
await page.getByLabel("Activation code character 1 of 12").click();
await page.keyboard.type("PAVECON-DEMO", { delay: 15 });
await page.getByRole("button", { name: "ACTIVATE" }).click();
await page.waitForTimeout(1200);
console.log("header visible:", await page.getByTestId("app-header").isVisible().catch(() => false));
console.log("newday copy visible:", await page.getByTestId("copy-from-yesterday").isVisible().catch(() => false));
if (await page.getByTestId("copy-from-yesterday").isVisible().catch(() => false)) {
  await page.getByTestId("copy-from-yesterday").click();
  await page.waitForTimeout(600);
}
console.log("sections:", await page.locator("section.card").count());
console.log("summary:", await page.getByTestId("summary-strip").innerText().catch(() => "MISSING"));
console.log("sync state:", await page.getByTestId("sync-state").innerText().catch(() => "MISSING"));
console.log("scrollWidth:", await page.evaluate(() => [document.scrollingElement.scrollWidth, innerWidth]));

await page.screenshot({ path: "../artifacts/smoke-form.png", fullPage: true });
console.log("errors:", errors.slice(0, 10));
await browser.close();
