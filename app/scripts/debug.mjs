import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 800 } });
await page.goto("http://localhost:4173/");
await page.getByLabel("Activation code character 1 of 12").click();
await page.keyboard.type("PAVECON-DEMO", { delay: 10 });
await page.getByRole("button", { name: "ACTIVATE" }).click();
await page.waitForTimeout(600);
await page.getByTestId("copy-from-yesterday").click();
await page.waitForTimeout(600);
const info = await page.evaluate(() => {
  const sec = document.querySelector("#sec-project");
  const body = document.querySelector("#sec-project-body");
  const inputs = [...document.querySelectorAll("#sec-project input")].map((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { type: el.getAttribute("type"), value: el.value, rect: [r.x, r.y, r.width, r.height], display: cs.display, visibility: cs.visibility, opacity: cs.opacity, color: cs.color, bg: cs.backgroundColor };
  });
  return {
    sectionRect: sec?.getBoundingClientRect().toJSON(),
    bodyRect: body?.getBoundingClientRect().toJSON(),
    bodyOpen: body?.getAttribute("data-open"),
    bodyHtml: body?.innerHTML.slice(0, 400),
    text: body?.innerText.slice(0, 300),
    inputs,
    cv: sec ? getComputedStyle(sec).contentVisibility : null,
  };
});
console.log(JSON.stringify(info, null, 2));
await page.locator("#sec-project").screenshot({ path: "../artifacts/debug-project.png" });
await browser.close();
