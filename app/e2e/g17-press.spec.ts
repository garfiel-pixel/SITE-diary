import { test, expect, type Locator } from "@playwright/test";
import { activateDb, copyFromYesterday, openSection } from "./helpers";

const SECTION_IDS = [
  "sec-project",
  "sec-weather",
  "sec-lost",
  "sec-equipment",
  "sec-materials",
  "sec-workforce",
  "sec-wip",
  "sec-visitors",
  "sec-instructions",
  "sec-toolbox",
  "sec-photos",
  "sec-recorded",
];

/*
  G17 — one immediate press language for every tappable control:
  no 300 ms delay, no grey tap flash, a 0.97 press scale and a short settle,
  with the same controls collapsing to an instant transition under reduced
  motion.
*/

async function pressScale(page: import("@playwright/test").Page, el: Locator) {
  await el.evaluate((node) => node.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(60);
  const box = await el.boundingBox();
  if (!box) throw new Error("control has no box");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  try {
    await expect
      .poll(
        () =>
          el.evaluate((node) => {
            const transform = getComputedStyle(node).transform;
            return transform === "none" ? 1 : new DOMMatrix(transform).a;
          }),
        { message: "pressed control scales down" }
      )
      .toBeLessThan(0.995);
  } finally {
    // Move off before release so sampling never triggers the action.
    await page.mouse.move(1, 1);
    await page.mouse.up();
  }
}

test.describe("G17 — press feedback", () => {
  test("every enabled button carries instant press language; motion reduction is instant", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await activateDb(page);
    await copyFromYesterday(page);
    for (const id of SECTION_IDS) await openSection(page, id);

    const audit = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll<HTMLButtonElement>("button")].filter(
        (el) => !el.disabled && el.getBoundingClientRect().width > 0
      );
      return {
        count: buttons.length,
        missing: buttons
          .map((el) => {
            const cs = getComputedStyle(el);
            return {
              label: el.getAttribute("aria-label") || el.textContent?.trim().slice(0, 30) || el.className,
              transition: cs.transitionProperty,
              duration: cs.transitionDuration,
              delay: cs.transitionDelay,
              touchAction: cs.touchAction,
              tapHighlight: cs.getPropertyValue("-webkit-tap-highlight-color"),
            };
          })
          .filter(
            (c) =>
              !c.transition.includes("transform") ||
              !c.duration.split(",").some((part) => parseFloat(part) === 0.14) ||
              !c.delay.split(",").every((part) => parseFloat(part) === 0) ||
              c.touchAction !== "manipulation" ||
              c.tapHighlight !== "rgba(0, 0, 0, 0)"
          ),
      };
    });

    expect(audit.count, "visible enabled buttons audited").toBeGreaterThan(15);
    expect(audit.missing, "buttons missing the shared press language").toEqual([]);
    console.log(`G17: ${audit.count} enabled buttons carry the immediate press language`);

    await pressScale(page, page.getByTestId("theme-toggle"));
    await pressScale(page, page.locator("#sec-project > h2 > button"));
    await pressScale(page, page.getByTestId("create-pdf"));
    console.log("G17: btn-56, section header and export chip all scale on pointer-down");

    await page.emulateMedia({ reducedMotion: "reduce" });
    const reduced = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll<HTMLButtonElement>("button")].filter(
        (el) => !el.disabled && el.getBoundingClientRect().width > 0
      );
      return buttons
        .map((el) => getComputedStyle(el).transitionDuration)
        .flatMap((value) => value.split(",").map((part) => parseFloat(part)));
    });
    expect(reduced.length).toBeGreaterThan(15);
    expect(Math.max(...reduced), "reduced-motion transition duration").toBeLessThanOrEqual(0.01);
    await pressScale(page, page.getByTestId("theme-toggle"));
    console.log("G17: reduced motion keeps the press scale but settles in <= 0.01s");
  });
});
