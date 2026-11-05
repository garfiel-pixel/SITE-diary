import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  TODAY_ISO,
  YESTERDAY_ISO,
  iso,
  activateDb,
  tableCount,
  openSection,
  waitSaved,
  getReports,
  waitForSeed,
} from "./helpers";

type Page = import("@playwright/test").Page;

const HOME_TITLE = "Site diary";

function fullDate(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-JM", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(y!, m! - 1, d!));
}

async function openHome(page: Page) {
  await activateDb(page);
  await page.goto("/");
  await waitForSeed(page);
  await expect(
    page.getByRole("heading", { name: HOME_TITLE, level: 2 })
  ).toBeVisible();
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

async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id} (${v.impact})`);
}

test.describe("Unit 3 — home screen, back navigation and accessibility", () => {
  test("3.1 A fresh launch shows the home screen and never auto-opens a report", async ({
    page,
  }) => {
    await openHome(page);

    await expect(
      page.getByRole("heading", { name: HOME_TITLE, level: 2 })
    ).toBeVisible();
    await expect(page.locator("#main")).toBeVisible();
    await expect(page.locator("#sec-project")).toHaveCount(0);
    await expect(page.getByText("No report for this date yet")).toHaveCount(0);
    await expect(page).toHaveTitle("Pave-Con Site Diary");
    await expect(
      page.getByRole("button", { name: /New report for today|Open today's report/ })
    ).toBeVisible();

    const reports = await getReports(page);
    expect(reports.some((r) => r.date === TODAY_ISO)).toBe(false);

    await expect(
      page.getByRole("heading", { name: HOME_TITLE, level: 2 })
    ).toBeFocused();
  });

  test("3.2 The saved list opens the sample report; the visible back control returns home", async ({
    page,
  }) => {
    await openHome(page);

    const row = page.getByTestId(`home-row-${YESTERDAY_ISO}`);
    await expect(row).toBeVisible();
    await expect(row).toContainText("Hatfield Road Rehabilitation");
    await expect(row).toContainText("Chainage 0+400 to 0+900");
    await expect(row).toContainText("Saved on phone");
    await expect(row).toContainText("Sample");

    const box = await row.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(56);

    await row.click();
    await expect(page.locator("#sec-project")).toBeVisible();
    await expect(page).toHaveTitle(`Site diary — ${fullDate(YESTERDAY_ISO)}`);

    const back = page.getByTestId("all-reports");
    await expect(back).toBeVisible();
    const backBox = await back.boundingBox();
    expect(backBox?.height ?? 0).toBeGreaterThanOrEqual(48);
    const headerBox = await page.getByTestId("app-header").boundingBox();
    expect(backBox?.y ?? 0).toBeGreaterThanOrEqual((headerBox?.y ?? 0) + (headerBox?.height ?? 0) - 1);
    expect(backBox?.y ?? 9999).toBeLessThan(800);

    await back.click();
    await expect(
      page.getByRole("heading", { name: HOME_TITLE, level: 2 })
    ).toBeVisible();
    await expect(page).toHaveTitle("Pave-Con Site Diary");
  });

  test("3.3 Browser Back, Forward and reload follow the hash route", async ({ page }) => {
    await openHome(page);

    await page.getByTestId(`home-row-${YESTERDAY_ISO}`).click();
    await expect(page.locator("#sec-project")).toBeVisible();

    await page.goBack();
    await expect(
      page.getByRole("heading", { name: HOME_TITLE, level: 2 })
    ).toBeVisible();

    await page.goForward();
    await expect(page.locator("#sec-project")).toBeVisible();
    await expect(page).toHaveTitle(`Site diary — ${fullDate(YESTERDAY_ISO)}`);

    await page.goBack();
    await expect(
      page.getByRole("heading", { name: HOME_TITLE, level: 2 })
    ).toBeVisible();

    // A deep link survives refresh, and a plain / still lands on home.
    await page.goto(`#/report/${YESTERDAY_ISO}`);
    await expect(page.locator("#sec-project")).toBeVisible();
    await page.reload();
    await expect(page.locator("#sec-project")).toBeVisible();
    await expect(page).toHaveTitle(`Site diary — ${fullDate(YESTERDAY_ISO)}`);

    await page.goto("/");
    await page.reload();
    await expect(
      page.getByRole("heading", { name: HOME_TITLE, level: 2 })
    ).toBeVisible();
    await expect(page).toHaveTitle("Pave-Con Site Diary");
  });

  test("3.4 Visiting an empty date adds no report; Start a blank report adds exactly one", async ({
    page,
  }) => {
    await openHome(page);

    const parts = TODAY_ISO.match(/^(\d{4})-(\d{2})-(\d{2})$/)!;
    const future = iso(new Date(+parts[1]!, +parts[2]! - 1, +parts[3]! + 4));

    const before = await tableCount(page, "reports");
    await page.goto(`#/report/${future}`);
    await expect(
      page.getByRole("heading", { name: "No report for this date yet", level: 2 })
    ).toBeVisible();
    await waitSaved(page);
    expect(await tableCount(page, "reports")).toBe(before);

    await page.getByTestId("all-reports").click();
    await expect(
      page.getByRole("heading", { name: HOME_TITLE, level: 2 })
    ).toBeVisible();
    expect(await tableCount(page, "reports")).toBe(before);

    await page.goto(`#/report/${future}`);
    await page.getByTestId("start-blank").click();
    await expect(page.locator("#sec-project")).toBeVisible();
    await expect(page.locator("#mi-project")).toBeFocused();
    await waitSaved(page);

    expect(await tableCount(page, "reports")).toBe(before + 1);
    const reports = await getReports(page);
    expect(reports.filter((r) => r.date === future)).toHaveLength(1);
  });

  test("3.5 The primary button opens today once and never creates a duplicate", async ({
    page,
  }) => {
    await openHome(page);

    const todayReports = async () =>
      (await getReports(page)).filter((r) => r.date === TODAY_ISO);

    expect(await todayReports()).toHaveLength(0);
    await page.getByRole("button", { name: "New report for today" }).click();
    await expect(
      page.getByRole("heading", { name: "No report for this date yet", level: 2 })
    ).toBeVisible();

    await page.getByTestId("start-blank").click();
    await expect(page.locator("#sec-project")).toBeVisible();
    await waitSaved(page);
    expect(await todayReports()).toHaveLength(1);

    await page.getByTestId("all-reports").click();
    await expect(
      page.getByRole("button", { name: "Open today's report" })
    ).toBeVisible();
    await page.getByRole("button", { name: "Open today's report" }).click();
    await expect(page.locator("#sec-project")).toBeVisible();
    await waitSaved(page);

    expect(await todayReports()).toHaveLength(1);
  });

  test("3.6 Sheets trap focus, close on Escape, and close with browser Back without changing the route", async ({
    page,
  }) => {
    await activateDb(page);
    await page.goto(`#/report/${YESTERDAY_ISO}`);
    await expect(page.locator("#sec-project")).toBeVisible();

    const hash = () => page.evaluate(() => location.hash);
    const routeHash = await hash();

    // Escape closes; focus enters the dialog first and returns to the opener.
    const opener = page.getByTestId("open-settings");
    await opener.click();
    const sheet = page.locator('.k-sheet[data-open="true"]');
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("dialog")).toBeVisible();
    await expect(
      sheet.getByRole("button", { name: "Close Settings" })
    ).toBeVisible();
    const inside = await page.evaluate(
      () => !!document.activeElement?.closest('[role="dialog"]')
    );
    expect(inside).toBe(true);

    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      expect(
        await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))
      ).toBe(true);
      await page.keyboard.press("Shift+Tab");
      expect(
        await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))
      ).toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden({ timeout: 5_000 });
    await expect(opener).toBeFocused({ timeout: 2_000 });
    expect(await hash()).toBe(routeHash);

    // Android/browser Back closes a sheet through history, not the router.
    await opener.click();
    await expect(sheet).toBeVisible();
    await page.goBack();
    await expect(sheet).toBeHidden({ timeout: 5_000 });
    expect(await hash()).toBe(routeHash);
    await expect(page.locator("#sec-project")).toBeVisible();
    await expect(opener).toBeFocused({ timeout: 2_000 });

    // An editor sheet behaves the same way.
    await openSection(page, "sec-workforce");
    const addPerson = page.getByTestId("add-person");
    await addPerson.click();
    const personSheet = page.locator('.k-sheet[data-open="true"]');
    await expect(personSheet).toBeVisible();
    await page.goBack();
    await expect(personSheet).toBeHidden({ timeout: 5_000 });
    expect(await hash()).toBe(routeHash);
    await expect(page.locator("#sec-project")).toBeVisible();
  });

  test("3.7 axe reports zero serious or critical violations on the required screens", async ({
    page,
  }) => {
    test.setTimeout(400_000);
    await openHome(page);
    await page.emulateMedia({ colorScheme: "light" });

    for (const theme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: theme });
      await setTheme(page, theme);

      expect(await seriousViolations(page), `home (${theme})`).toEqual([]);

      await page.getByTestId(`home-row-${YESTERDAY_ISO}`).click();
      await expect(page.locator("#sec-project")).toBeVisible();
      expect(await seriousViolations(page), `editor (${theme})`).toEqual([]);

      await page.getByTestId("all-reports").click();
      await page.getByTestId("home-new-today").click();
      await expect(
        page.getByRole("heading", { name: "No report for this date yet", level: 2 })
      ).toBeVisible();
      expect(await seriousViolations(page), `new-day (${theme})`).toEqual([]);

      await page.getByTestId("open-settings").click();
      const sheet = page.locator('.k-sheet[data-open="true"]');
      await expect(sheet).toBeVisible();
      expect(await seriousViolations(page), `settings (${theme})`).toEqual([]);
      await sheet.getByRole("button", { name: "Close Settings" }).click();
      await expect(sheet).toBeHidden();

      await page.getByTestId("all-reports").click();
      await expect(
        page.getByRole("heading", { name: HOME_TITLE, level: 2 })
      ).toBeVisible();
    }
  });

  test("3.8 Visible text is at least 12px and every interactive target is at least 48px", async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const assertText = async (label: string) => {
      const small = await page.evaluate(() => {
        const out: Array<{ text: string; size: number; tag: string }> = [];
        document.querySelectorAll("*").forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.closest(".sr-only")) return;
          const rect = node.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return;
          const style = getComputedStyle(node);
          if (style.visibility === "hidden" || style.display === "none") return;
          const size = parseFloat(style.fontSize);
          if (size > 0 && size < 12) {
            const text = node.textContent?.trim().slice(0, 80) ?? "";
            if (text) out.push({ text, size, tag: node.tagName.toLowerCase() });
          }
        });
        return out;
      });
      expect(small, `${label}: visible text under 12px`).toEqual([]);
    };

    const assertTargets = async (label: string) => {
      const small = await page.evaluate(() => {
        const out: Array<{ label: string; w: number; h: number; tag: string }> = [];
        const selector =
          'button, a[href], input, select, textarea, [role="radio"], [role="tab"], [role="button"]';
        document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
          if (el.closest(".sr-only")) return;
          if (el.classList.contains("skip-link")) return;
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          if (rect.width === 0 || rect.height === 0) return;
          if (style.visibility === "hidden" || style.display === "none") return;
          if (el.closest('[aria-hidden="true"]')) return;
          if (rect.width < 48 || rect.height < 48) {
            out.push({
              label:
                el.getAttribute("aria-label") ||
                el.textContent?.trim().slice(0, 40) ||
                el.className ||
                el.tagName,
              w: Math.round(rect.width),
              h: Math.round(rect.height),
              tag: el.tagName.toLowerCase(),
            });
          }
        });
        return out;
      });
      expect(small, `${label}: interactive targets under 48×48`).toEqual([]);
    };

    await openHome(page);
    await assertText("home");
    await assertTargets("home");

    await page.getByTestId(`home-row-${YESTERDAY_ISO}`).click();
    await expect(page.locator("#sec-project")).toBeVisible();
    await assertText("editor");
    await assertTargets("editor");

    await page.getByTestId("all-reports").click();
    await page.getByTestId("home-new-today").click();
    await expect(
      page.getByRole("heading", { name: "No report for this date yet", level: 2 })
    ).toBeVisible();
    await assertText("new-day");
    await assertTargets("new-day");

    await page.getByTestId("open-settings").click();
    const sheet = page.locator('.k-sheet[data-open="true"]');
    await expect(sheet).toBeVisible();
    await assertText("settings");
    await assertTargets("settings");
  });

  test("3.9 Delete sample report and Undo restore it, even after the snackbar sits for a long time", async ({
    page,
  }) => {
    await activateDb(page);
    await page.goto(`#/report/${YESTERDAY_ISO}`);
    await expect(page.getByTestId("delete-sample")).toBeVisible();

    await page.getByTestId("delete-sample").click();
    await expect(
      page.getByRole("heading", { name: HOME_TITLE, level: 2 })
    ).toBeVisible();

    await expect
      .poll(async () => {
        const reports = await getReports(page);
        return reports.some(
          (r) => r.date === YESTERDAY_ISO && r.isSample === true
        );
      })
      .toBe(false);

    const snackbar = page.getByTestId("undo-snackbar");
    await expect(snackbar).toBeVisible();
    await expect(snackbar).toContainText("Sample report deleted");

    // No auto-dismiss: still there well after the old six-second timeout.
    await page.waitForTimeout(7_000);
    await expect(snackbar).toBeVisible();

    await snackbar
      .getByRole("button", { name: "Undo last change" })
      .click();
    await expect(snackbar).toBeHidden();

    await expect
      .poll(async () => {
        const reports = await getReports(page);
        return reports.some(
          (r) => r.date === YESTERDAY_ISO && r.isSample === true
        );
      })
      .toBe(true);
    await expect(page.getByTestId(`home-row-${YESTERDAY_ISO}`)).toContainText(
      "Sample"
    );
  });

  test("3.10 A failed autosave keeps the old data and shows the exact persistent alert", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await activateDb(page);
    await page.goto(`#/report/${YESTERDAY_ISO}`);
    await expect(page.locator("#sec-project")).toBeVisible();

    const original = await getReports(page);
    const originalProject = original.find((r) => r.date === YESTERDAY_ISO)
      ?.project;
    expect(originalProject).toBe("Hatfield Road Rehabilitation");

    await page.evaluate(() => {
      const proto = IDBObjectStore.prototype as unknown as {
        put: (value: unknown, key?: IDBValidKey) => IDBRequest;
      };
      (window as unknown as { __origPut: typeof proto.put }).__origPut =
        proto.put;
      proto.put = function (value: unknown, key?: IDBValidKey) {
        if ((this as IDBObjectStore).name === "reports") {
          throw new DOMException("mock put failure", "AbortError");
        }
        return (
          window as unknown as { __origPut: typeof proto.put }
        ).__origPut.call(this, value, key);
      };
    });

    const project = page.locator("#mi-project");
    await project.fill("Edited project name");
    await project.blur();

    const alert = page.getByTestId("persist-failure");
    await expect(alert).toBeVisible({ timeout: 10_000 });
    await expect(alert).toHaveAttribute("role", "alert");
    await expect(alert).toHaveText(
      "Not saved — storage problem. Export the PDF now to keep your work."
    );

    await page.waitForTimeout(5_000);
    await expect(alert).toBeVisible();

    // The write failed, so the previously saved report is untouched.
    const afterFailure = await getReports(page);
    expect(
      afterFailure.find((r) => r.date === YESTERDAY_ISO)?.project
    ).toBe(originalProject);
    expect(
      await page.evaluate(() =>
        localStorage.getItem("site-diary-persist-failure")
      )
    ).toBeTruthy();

    await page.evaluate(() => {
      (
        IDBObjectStore.prototype as unknown as { put: unknown }
      ).put = (window as unknown as { __origPut: unknown }).__origPut;
    });
    await project.fill("Recovered project name");
    await project.blur();
    await expect(alert).toBeHidden({ timeout: 10_000 });
    await expect
      .poll(async () => {
        const reports = await getReports(page);
        return reports.find((r) => r.date === YESTERDAY_ISO)?.project;
      })
      .toBe("Recovered project name");
  });
});
