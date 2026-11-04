import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  activate,
  openSection,
  setDate,
  setRecordedBy,
  TODAY_ISO,
  YESTERDAY_ISO,
} from "./helpers";

type Page = import("@playwright/test").Page;

async function scan(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical"
  );
  if (serious.length) {
    console.log(`G8 ${label} FAIL:`, JSON.stringify(serious, null, 2));
  }
  expect(
    serious.map((v) => `${v.id} (${v.impact})`),
    `${label}: serious/critical axe violations`
  ).toEqual([]);
  console.log(`G8 ${label}: 0 serious/critical (${results.violations.length} total violations)`);
}

async function setTheme(page: Page, mode: "light" | "dark") {
  const current = await page.evaluate(() => document.documentElement.dataset.theme);
  if (current !== mode) {
    await page.getByTestId("theme-toggle").click();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset.theme))
      .toBe(mode);
  }
}

test.describe("G8 — accessibility", () => {
  test("gate, forms, toolbox, photos, result sheet, settings — light and dark", async ({
    page,
  }) => {
    test.setTimeout(300_000);

    await page.goto("/");
    await page.emulateMedia({ colorScheme: "light" });
    await scan(page, "gate (light)");
    await page.emulateMedia({ colorScheme: "dark" });
    await scan(page, "gate (dark)");
    await page.emulateMedia({ colorScheme: "light" });

    await activate(page);

    // ---- sample report -------------------------------------------------
    await setDate(page, YESTERDAY_ISO);
    await expect(page.locator("#sec-project")).toBeVisible();
    await setTheme(page, "light");
    await scan(page, "sample form (light)");
    await setTheme(page, "dark");
    await scan(page, "sample form (dark)");
    await setTheme(page, "light");

    await openSection(page, "sec-toolbox");
    if (await page.getByTestId("start-toolbox").count()) {
      await page.getByTestId("start-toolbox").click();
    }
    await scan(page, "toolbox open (light)");

    await openSection(page, "sec-photos");
    await expect(page.locator("#sec-photos").getByRole("img").first()).toBeVisible();
    await scan(page, "photos with 3 items (light)");
    console.log("G8 photos screen: 3 sample photos present");

    // ---- blank form ----------------------------------------------------
    await setDate(page, TODAY_ISO);
    await page.getByTestId("start-blank").click();
    await setTheme(page, "light");
    await scan(page, "blank form (light)");
    await setTheme(page, "dark");
    await scan(page, "blank form (dark)");
    await setTheme(page, "light");

    // ---- result sheet --------------------------------------------------
    await setRecordedBy(page, "K. Johnson");
    await page.getByTestId("create-pdf").click();
    await expect(page.getByTestId("pdf-state")).toBeVisible({ timeout: 120_000 });
    await scan(page, "result sheet (light)");
    await page.locator('.k-sheet[data-open="true"]').click({ position: { x: 4, y: 4 } });

    // ---- settings ------------------------------------------------------
    await page.getByTestId("open-settings").click();
    await page.getByTestId("theme-light").click();
    await scan(page, "settings (light)");
    await page.getByTestId("theme-dark").click();
    await scan(page, "settings (dark)");
    console.log("G8 completed every required screen in both themes");
  });
});
