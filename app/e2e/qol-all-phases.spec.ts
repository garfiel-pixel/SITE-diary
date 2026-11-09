import { test, expect } from "@playwright/test";
import {
  activateDb,
  copyFromYesterday,
  openSection,
  setRecordedBy,
  waitSaved,
  TODAY_ISO,
  YESTERDAY_ISO,
} from "./helpers";

test.describe("QOL — Phase 1–3", () => {
  test.beforeEach(async ({ page }) => {
    await activateDb(page);
  });

  test("workforce transparency badge in sticky strip", async ({ page }) => {
    await copyFromYesterday(page);
    const strip = page.getByTestId("summary-strip");
    await expect(strip).toContainText("People");
    await expect(strip).toContainText("Named");
    // The sample has 19 named people and 0 unnamed.
    await expect(strip).toContainText("19 Named");
    await expect(strip.getByTestId("unnamed-count")).toHaveCount(0);
  });

  test("audit footer validation warns before creating incomplete PDF", async ({ page }) => {
    await page.goto(`#/report/${TODAY_ISO}`);
    await page.getByRole("button", { name: "Start a blank report" }).click();
    await setRecordedBy(page, "Tester");
    // Leave project/site/weather/workforce/wip empty.
    await page.getByTestId("create-pdf").click();
    const warning = page.getByTestId("pdf-warning");
    await expect(warning).toBeVisible();
    await expect(page.getByTestId("pdf-warning-create")).toBeVisible();
    await page.getByTestId("pdf-warning-create").click();
    // After "Create PDF anyway" the result sheet opens.
    await expect(page.getByTestId("pdf-state")).toBeVisible();
  });

  test("copy-from-yesterday shows specific inherited items", async ({ page }) => {
    await page.goto(`#/report/${TODAY_ISO}`);
    const copy = page.getByTestId("copy-from-yesterday");
    await expect(copy).toBeVisible();
    await copy.click();
    const snack = page.getByTestId("undo-snackbar");
    await expect(snack).toContainText("Copied project, site,");
    await expect(snack).toContainText("people");
    await expect(snack).toContainText("equipment");
  });

  test("primary touch targets are at least 56 px", async ({ page }) => {
    await copyFromYesterday(page);
    const small = await page.evaluate(() => {
      const taps = [...document.querySelectorAll<HTMLElement>("button, [role=button], [role=radio]")].filter(
        (el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && (r.width < 56 || r.height < 56);
        }
      );
      return taps.map((el) => (el.getAttribute("aria-label") || el.textContent || el.className).slice(0, 40));
    });
    expect(small, `targets below 56px: ${small.join(", ")}`).toEqual([]);
  });

  test("smart location toggles linear and zone modes", async ({ page }) => {
    await page.goto(`#/report/${TODAY_ISO}`);
    await page.getByRole("button", { name: "Start a blank report" }).click();
    await openSection(page, "sec-project");
    // Default is zone mode.
    await expect(page.getByTestId("site-mode-zone")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("site-mode-linear").click();
    await expect(page.locator('input[aria-label="Site start"]')).toBeVisible();
    await page.locator('input[aria-label="Site start"]').fill("0+400");
    await page.locator('input[aria-label="Site end"]').fill("0+900");
    await waitSaved(page);
    const report = await page.evaluate(async (isoDate) => {
      const req = indexedDB.open("pavecon-site-diary");
      const db = await new Promise<IDBDatabase>((res) => (req.onsuccess = () => res(req.result)));
      return new Promise<Record<string, unknown> | undefined>((res, rej) => {
        const all = db.transaction("reports").objectStore("reports").getAll();
        all.onsuccess = () =>
          res((all.result as Record<string, unknown>[]).find((r) => r.date === isoDate));
        all.onerror = () => rej(all.error);
      });
    }, TODAY_ISO);
    expect(report?.site).toBe("0+400 to 0+900");
  });

  test("jump-to-section drawer lists sections and navigates", async ({ page }) => {
    await copyFromYesterday(page);
    // Dismiss the copy-from-yesterday snackbar so it does not intercept taps.
    const dismiss = page.getByRole("button", { name: "Dismiss" });
    if (await dismiss.isVisible().catch(() => false)) await dismiss.click();
    await page.getByTestId("jump-to-section").click();
    const sheet = page.getByRole("dialog", { name: "Jump to section" });
    await expect(sheet).toBeVisible();
    await sheet.getByRole("button", { name: "Recorded by" }).click();
    await expect(sheet).toBeHidden();
    // Wait for smooth scroll, then confirm the section is active/visible.
    await page.waitForTimeout(600);
    await expect(page.locator("#sec-recorded")).toBeInViewport();
  });

  test("photo carousel opens and navigates", async ({ page }) => {
    // Open the sample report (yesterday) which has 3 placeholder photos.
    await page.goto(`#/report/${YESTERDAY_ISO}`);
    await expect(page.locator("#sec-project, #newday-card").first()).toBeVisible({ timeout: 15_000 });
    await openSection(page, "sec-photos");
    const thumbs = page.getByRole("button", { name: /Open photo/ });
    await expect(thumbs.first()).toBeVisible({ timeout: 15_000 });
    /* The seed writes its placeholder photos after the report row, so the
       exact count depends on how far seeding got (see docs/IMPROVEMENTS.md
       item 13). Assert the carousel against the set actually on screen. */
    const total = await thumbs.count();
    expect(total).toBeGreaterThan(0);
    await thumbs.first().click();
    const dialog = page.getByRole("dialog", { name: "Photo preview" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(`1 / ${total}`);
    if (total > 1) {
      await dialog.getByRole("button", { name: "Next photo" }).click();
      await expect(dialog).toContainText(`2 / ${total}`);
    }
    await dialog.getByRole("button", { name: "Close preview" }).click();
    await expect(dialog).toBeHidden();
  });
});
