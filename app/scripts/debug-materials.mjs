import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 800 } });
await page.goto("http://localhost:4173/");
await page.getByLabel("Activation code character 1 of 12").click();
await page.keyboard.type("PAVECON-DEMO", { delay: 5 });
await page.getByRole("button", { name: "ACTIVATE" }).click();
await page.waitForTimeout(500);
await page.getByTestId("start-blank").click();
await page.locator("#sec-materials > h2 > button").click();
await page.waitForTimeout(800);
const info = await page.evaluate(() => {
  const sec = document.querySelector("#sec-materials");
  const card = sec;
  const body = document.querySelector("#sec-materials-body");
  const inner = body?.querySelector(".inner");
  const btn = [...document.querySelectorAll("#sec-materials button")].find((b) => b.getAttribute("aria-label") === "Add Asphalt");
  const r = (el) => el ? el.getBoundingClientRect().toJSON() : null;
  return {
    sec: r(sec), body: r(body), inner: r(inner),
    secH: sec?.clientHeight, secSH: sec?.scrollHeight,
    bodyH: body?.clientHeight, bodySH: body?.scrollHeight,
    innerH: inner?.clientHeight, innerSH: inner?.scrollHeight,
    btn: r(btn), btnCenter: btn ? [r(btn).x + r(btn).width/2, r(btn).y + r(btn).height/2] : null,
    atCenter: btn ? (()=>{ const b=r(btn); const el=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2); return el ? {tag:el.tagName, aria:el.getAttribute("aria-label"), text:el.textContent.slice(0,20)} : null; })() : null,
    grid: body ? getComputedStyle(body).gridTemplateRows : null,
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
