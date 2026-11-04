import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 800 } });
await page.goto("http://localhost:4173/");
await page.getByLabel("Activation code character 1 of 12").click();
await page.keyboard.type("PAVECON-DEMO", { delay: 5 });
await page.getByRole("button", { name: "ACTIVATE" }).click();
await page.waitForTimeout(500);
await page.getByTestId("start-blank").click();
await page.locator("#sec-equipment > h2 > button").click();
await page.getByRole("button", { name: "Add Paver" }).click();
const slider = page.locator('[role="slider"][aria-label="Paver hours"]');
await slider.focus();
await page.keyboard.press("Home");
for (let i=0;i<5;i++) await page.keyboard.press("ArrowRight");
const valueButton = page.locator('#sec-equipment button[aria-label*="open numpad"]').first();
console.log("valueButton text", await valueButton.innerText());
await valueButton.click();
await page.waitForTimeout(600);
const dialogs = await page.locator('[role="dialog"]').count();
console.log("dialogs", dialogs);
for (let i=0;i<dialogs;i++) {
  const d = page.locator('[role="dialog"]').nth(i);
  console.log(i, "visible", await d.isVisible(), "text", JSON.stringify((await d.innerText().catch(()=>"")).slice(0,80)));
}
const buttons = await page.locator('[role="dialog"]:visible button').evaluateAll((els)=>els.map(e=>({label:e.getAttribute('aria-label'), text:e.textContent.trim().slice(0,12)})));
console.log(JSON.stringify(buttons));
await browser.close();
