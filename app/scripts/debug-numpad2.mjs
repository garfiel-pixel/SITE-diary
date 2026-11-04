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
await page.locator('#sec-equipment button[aria-label*="open numpad"]').first().click();
await page.waitForTimeout(400);
console.log(await page.evaluate(() => {
  const key = document.querySelector('.numpad-key');
  const chain = [];
  let el = key;
  while (el && chain.length < 8) {
    chain.push({ tag: el.tagName, cls: el.className, role: el.getAttribute('role'), aria: el.getAttribute('aria-label'), style: el.getAttribute('style')?.slice(0,120) });
    el = el.parentElement;
  }
  return chain;
}));
await browser.close();
