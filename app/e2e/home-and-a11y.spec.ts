import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  TODAY_ISO,
  YESTERDAY_ISO,
  iso,
  activateDb,
  tableCount,
  openSection,
  setRecordedBy,
  waitSaved,
  getReports,
  stubUploadSuccess,
} from "./helpers";

type Page = import("@playwright/test").Page;

const HOME_TITLE = "Site diary";

test.describe("Unit 8 — home screen and accessibility", () => {
  test("8.1 Fresh launch shows the home screen and no editor", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: HOME_TITLE, level: 2 })).toBeVisible();
    await expect(page.locator('[data-testid="app-header"]')).toBeHidden();
    await expect(page.locator("#sec-project")).toBeHidden();
  });

  test("8.2 Open the sample from the saved list; back chip is visible without scrolling", async ({
    page,
  }) => {
    await activateDb(page);
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "All reports", level: 2 })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "← All reports", level: 2 })
    ).toBeVisible();

    await page.getByRole("link", { name: /site diary sample/i }).first().click();
    await expect(
      page.getByRole("heading", { name: "← All reports", level: 2 })
    ).toBeVisible();

    await page.getByRole("heading", {
      name: "← All reports",
      level: 2,
    }).click();
    await expect(
      page.getByRole("heading", { name: "All reports", level: 2 })
    ).toBeVisible();
  });

  test("8.3 Browser Back from the editor returns home; reload preserves route", async ({
    page,
  }) => {
    await activateDb(page);

    await page.goto(`#/report/${TODAY_ISO}`);
    await expect(page.locator("#sec-project")).toBeVisible();

    await page.goBack();
    await expect(
      page.getByRole("heading", { name: HOME_TITLE, level: 2 })
    ).toBeVisible();

    await page.goto(`#/report/${YESTERDAY_ISO}`);
    await expect(page.locator("#sec-project")).toBeVisible();
    await page.reload();
    await expect(page.locator("#sec-project")).toBeVisible();

    await page.goto("#/");
    await expect(
      page.getByRole("heading", { name: HOME_TITLE, level: 2 })
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: HOME_TITLE, level: 2 })
    ).toBeVisible();
  });

  test("8.4 Visiting an empty date adds zero rows; Start a blank report adds one", async ({
    page,
  }) => {
    await activateDb(page);

    const parts = TODAY_ISO.match(/^(\d{4})-(\d{2})-(\d{2})$/)!;
    const future = iso(
      new Date(+parts[1], +parts[2] - 1, +parts[3] + 3)
    );
    await page.goto(`#/report/${future}`);
    await expect(page.locator('[data-testid="start-blank"]')).toBeVisible();
    await expect(page.locator('[data-testid="copy-from-yesterday"]')).toBeHidden();

    await waitSaved(page);
    const beforeEmpty = await tableCount(page, "reports");
    await page.goto("/");
    await waitSaved(page);
    const afterEmpty = await tableCount(page, "reports");
    expect(afterEmpty).toBe(beforeEmpty);

    await page.goto(`#/report/${future}`);
    await page.getByTestId("start-blank").click();
    await expect(page.locator("#sec-project")).toBeVisible();
    await waitSaved(page);

    const afterBlank = await tableCount(page, "reports");
    expect(afterBlank).toBe(beforeEmpty + 1);

    const reports = await getReports(page);
    const newRow = reports.find((r) => (r.date as string) === future);
    expect(newRow).toBeDefined();
  });

  test("8.5 When today already has a report, the primary button reads Open today's report", async ({
    page,
  }) => {
    await activateDb(page);

    await page.goto("/");
    await page.getByRole("link", { name: /site diary sample/i }).first().click();
    await waitSaved(page);

    await page.goto("/");
    await expect(
      page.getByRole("button", { name: /open today's report/i })
    ).toBeVisible();
    await page.getByRole("button", { name: /open today's report/i }).click();
    await expect(page.locator("#sec-project")).toBeVisible();
    await waitSaved(page);

    const reports = await getReports(page);
    const todays = reports.filter(
      (r) => (r.date as string) === TODAY_ISO
    );
    expect(todays.length).toBe(1);
  });

  test("8.6 For every sheet: Escape closes it, focus returns to the opener, Tab never leaves", async ({
    page,
  }) => {
    await activateDb(page);
    await page.goto(`#/report/${YESTERDAY_ISO}`);

    await page.getByTestId("open-settings").click();
    await expect(page.locator('.k-sheet[data-open="true"]')).toBeVisible();
    const sheet = page.locator('.k-sheet[data-open="true"]');
    const opener = page.locator('[data-testid="open-settings"]');

    const focusableInside = sheet.locator(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    await expect(focusableInside.first()).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden({ timeout: 5_000 });
    await expect(opener).toBeFocused({ timeout: 2_000 });

    await page.getByTestId("open-settings").click();
    await expect(sheet).toBeVisible();
    let trapped = 0;
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      if (await focusableInside.first().evaluate((el) => el === document.activeElement)) trapped++;
      await page.keyboard.press("Shift+Tab");
      if (await focusableInside.first().evaluate((el) => el === document.activeElement)) trapped++;
    }
    expect(trapped).toBeGreaterThan(0);

    await page.locator('.k-sheet[data-open="true"]').click({ position: { x: 4, y: 4 } });
    await expect(sheet).toBeHidden({ timeout: 5_000 });
  });

  test("8.7 axe reports zero serious/critical violations across required screens", async ({
    page,
  }) => {
    test.setTimeout(400_000);

    await page.goto("/");
    await page.emulateMedia({ colorScheme: "light" });
    for (const label of [
      "home (light)",
      "editor (light)",
      "new-day (light)",
      "settings (light)",
    ]) {
      if (label === "editor (light)" || label === "new-day (light)") {
        await page.getByRole("link", { name: /site diary sample/i })
          .first()
          .click();
        await waitSaved(page);
      }
      if (label === "settings (light)") {
        await page.getByTestId("open-settings").click();
      }
      if (label === "new-day (light)") {
        await page.getByTestId("start-blank").click();
      }

      const results = await new AxeBuilder({ page })
        .withTags([
          "wcag2a",
          "wcag2aa",
          "wcag21a",
          "wcag21aa",
          "wcag22aa",
        ])
        .analyze();
      const serious = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical"
      );
      expect(
        serious.map((v) => `${v.id} (${v.impact})`),
        `${label}: serious/critical axe violations`
      ).toEqual([]);
      console.log(`8.7 ${label}: 0 serious/critical (${results.violations.length} total)`);

      if (label === "new-day (light)") {
        await page.locator('.k-sheet[data-open="true"]').click({
          position: { x: 4, y: 4 },
        });
      }
      if (label === "settings (light)") {
        await page.locator('.k-sheet[data-open="true"]').click({
          position: { x: 4, y: 4 },
        });
      }
    }

    await page.emulateMedia({ colorScheme: "dark" });
    for (const label of [
      "home (dark)",
      "editor (dark)",
      "new-day (dark)",
      "settings (dark)",
    ]) {
      if (label === "editor (dark)" || label === "new-day (dark)") {
        await page.getByRole("link", { name: /site diary sample/i })
          .first()
          .click();
        await waitSaved(page);
      }
      if (label === "settings (dark)") {
        await page.getByTestId("open-settings").click();
      }
      if (label === "new-day (dark)") {
        await page.getByTestId("start-blank").click();
      }

      const results = await new AxeBuilder({ page })
        .withTags([
          "wcag2a",
          "wcag2aa",
          "wcag21a",
          "wcag21aa",
          "wcag22aa",
        ])
        .analyze();
      const serious = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical"
      );
      expect(
        serious.map((v) => `${v.id} (${v.impact})`),
        `${label}: serious/critical axe violations`
      ).toEqual([]);
      console.log(`8.7 ${label}: 0 serious/critical (${results.violations.length} total)`);

      if (label === "new-day (dark)") {
        await page.locator('.k-sheet[data-open="true"]').click({
          position: { x: 4, y: 4 },
        });
      }
      if (label === "settings (dark)") {
        await page.locator('.k-sheet[data-open="true"]').click({
          position: { x: 4, y: 4 },
        });
      }
    }
  });

  test("8.8 No visible text has a computed font-size below 12px", async ({ page }) => {
    test.setTimeout(400_000);

    async function assertNoSmallText(page: Page, label: string) {
      const small = await page.evaluate(() => {
        const out: Array<{ text: string; size: number; el: string }> = [];
        document.querySelectorAll("*").forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.closest(".sr-only")) return;
          const style = getComputedStyle(node);
          const size = parseFloat(style.fontSize);
          if (size > 0 && size < 12) {
            const text = node.textContent?.trim().slice(0, 80) ?? "";
            if (text) {
              out.push({ text, size, el: node.tagName.toLowerCase() });
            }
          }
        });
        return out;
      });
      expect(
        small,
        `${label}: text elements with computed font-size below 12px`
      ).toEqual([]);
    }

    await page.goto("/");
    await assertNoSmallText(page, "home");

    await page.getByRole("link", { name: /site diary sample/i }).first().click();
    await waitSaved(page);
    await assertNoSmallText(page, "editor");

    await page.getByTestId("start-blank").click();
    await assertNoSmallText(page, "new-day");

    await page.getByTestId("open-settings").click();
    await assertNoSmallText(page, "settings");
  });

  test("8.9 Delete sample report removes it and Undo restores it", async ({ page }) => {
    await activateDb(page);
    await page.goto(`#/report/${YESTERDAY_ISO}`);

    await expect(page.getByTestId("delete-sample")).toBeVisible();
    const sampleName = await page
      .locator('[data-testid="delete-sample"]')
      .getAttribute("aria-label");
    expect(sampleName).toContain("sample");

    await page.getByTestId("delete-sample").click();
    await expect(page.getByRole("heading", { name: HOME_TITLE, level: 2 })).toBeVisible();

    const reports = await getReports(page);
    const sample = reports.find(
      (r) =>
        (r.date as string) === YESTERDAY_ISO &&
        (r.isSample as boolean) === true
    );
    expect(sample).toBeUndefined();

    await page.getByTestId("undo-snackbar").waitFor({ state: "attached" });
    await page.getByRole("button", { name: "Undo" }).click();
    await waitSaved(page);

    const after = await getReports(page);
    const restored = after.find(
      (r) =>
        (r.date as string) === YESTERDAY_ISO &&
        (r.isSample as boolean) === true
    );
    expect(restored).toBeDefined();
  });

  test("8.10 A simulated db.reports.put failure shows the role=alert Not saved message", async ({
    page,
  }) => {
    test.setTimeout(200_000);
    await stubUploadSuccess(page);
    await activateDb(page);
    await page.goto(`#/report/${YESTERDAY_ISO}`);

    await page.addInitScript(() => {
      const orig = (IDBObjectStore.prototype as any).put;
      (IDBObjectStore.prototype as any).put = function (this: IDBObjectStore, mode: IDBTransactionMode, transaction: IDBTransaction) {
        if (transaction.objectStoreNames.contains("reports")) {
          const err = new DOMException("mock put failure", "AbortError");
          setTimeout(() => {
            const ev = new Event("error", { bubbles: true });
            (transaction as any).error = err;
            transaction.dispatchEvent(ev);
          }, 0);
          return;
        }
        return orig.call(this, mode, transaction);
      } as any;
    });

    await page.locator("#sec-project > h2 > button").click();
    const projectInput = page.locator('[data-testid="mi-project"]');
    await projectInput.fill("Edited project name");
    await projectInput.blur();
    await waitSaved(page);

    await expect(
      page.getByRole("alert").filter({ hasText: /not saved/i })
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByTestId("persist-failure")
    ).toBeVisible({ timeout: 5_000 });
  });
});
