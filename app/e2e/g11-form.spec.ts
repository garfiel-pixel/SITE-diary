import { test, expect } from "@playwright/test";
import {
  activate,
  copyFromYesterday,
  getReportForDate,
  openSection,
  TODAY_ISO,
  waitSaved,
} from "./helpers";

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

async function assertNoHorizontalScroll(page: import("@playwright/test").Page) {
  const sizes = await page.evaluate(() => ({
    scroll: document.scrollingElement!.scrollWidth,
    inner: window.innerWidth,
  }));
  expect(sizes.scroll, `horizontal overflow: ${sizes.scroll} > ${sizes.inner}`).toBeLessThanOrEqual(
    sizes.inner + 1
  );
}

async function openAll(page: import("@playwright/test").Page) {
  for (const id of SECTION_IDS) await openSection(page, id);
}

test.describe("G11 — form completeness (400 × 800)", () => {
  test("copy carries only allowed fields, summary updates, no overflow, PDF blocked", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await activate(page);
    await copyFromYesterday(page);
    await waitSaved(page);

    // ---- 6.1: only the allowed fields are carried forward ----------------
    const report = await getReportForDate(page, TODAY_ISO);
    expect(report).toBeTruthy();
    expect(report!.project).toBe("Hatfield Road Rehabilitation");
    expect(report!.site).toBe("Chainage 0+400 to 0+900");
    expect(report!.equipment).toHaveLength(4);
    expect((report!.workforce as { a: unknown[] }).a).toHaveLength(6);
    expect((report!.workforce as { b: unknown[] }).b).toHaveLength(1);
    expect(report!.weather).toEqual({ am: null, pm: null });
    expect(report!.timeLost).toEqual({ reason: null, hours: 0 });
    expect(report!.materials).toEqual([]);
    expect(report!.wip).toBe("");
    expect(report!.visitors).toBe("");
    expect(report!.instructions).toBe("");
    expect(report!.toolbox).toBeNull();
    expect(report!.recordedBy).toBe("");
    expect(report!.recordedAt).toBeNull();
    console.log("G11 copy-from-yesterday: carried project/site/equipment/workforce only");

    await assertNoHorizontalScroll(page);
    const strip = page.getByTestId("summary-strip");
    await expect(strip).toContainText("People");
    await expect(strip).toContainText("19");
    await expect(strip).toContainText("26.5 h");
    console.log("G11 summary after copy:", (await strip.innerText()).replace(/\n/g, " | "));

    // ---- summary updates from each kind of input ------------------------
    await page.evaluate(() => {
      const w = window as unknown as { __cls: number };
      w.__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as PerformanceEntry & { hadRecentInput: boolean }).hadRecentInput)
            w.__cls += (entry as PerformanceEntry & { value: number }).value;
        }
      }).observe({ type: "layout-shift" });
    });

    await openSection(page, "sec-lost");
    await page.getByRole("radio", { name: "Rain", exact: true }).click();
    await expect(strip).toContainText("1 h");

    await openSection(page, "sec-materials");
    await page.getByRole("button", { name: "Add Asphalt", exact: true }).click();
    await expect(strip).toContainText("Deliveries 1");

    await openSection(page, "sec-workforce");
    const workforce = page.locator("#sec-workforce");
    await workforce.getByRole("button", { name: "More…" }).click();
    const catalogue = page.getByRole("dialog", { name: "Full catalogue" });
    await catalogue.getByRole("button", { name: "Mason", exact: true }).click();
    await expect(strip).toContainText(/People\s+21/);

    await openSection(page, "sec-equipment");
    const paver = page.locator('[role="slider"][aria-label="Paver hours"]');
    await paver.focus();
    await page.keyboard.press("ArrowRight");
    await expect(strip).toContainText("27 h");
    console.log("G11 summary after edits:", (await strip.innerText()).replace(/\n/g, " | "));

    // ---- delete + Undo restores the row (6.4b) --------------------------
    await page.getByRole("button", { name: "Remove Paver", exact: true }).click();
    await expect(page.getByTestId("undo-snackbar")).toBeVisible();
    await expect(page.locator('[role="slider"][aria-label="Paver hours"]')).toHaveCount(0);
    await page.getByTestId("undo-snackbar").getByRole("button", { name: "Undo last change" }).click();
    await expect(page.locator('[role="slider"][aria-label="Paver hours"]')).toHaveCount(1);
    console.log("G11 delete → Undo restored the equipment row");

    await openAll(page);
    await assertNoHorizontalScroll(page);
    console.log("G11 400×800 with every section open: no horizontal scroll");

    // ---- Recorded by empty blocks the PDF -------------------------------
    await page.getByTestId("create-pdf").click();
    await expect(page.getByRole("alert")).toContainText("Recorded by is required");
    await expect(page.getByRole("dialog", { name: "Report ready" })).toHaveCount(0);
    console.log("G11 empty Recorded by blocked PDF with a clear message");

    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    console.log("G11 layout shift (user edits excluded):", cls.toFixed(4));
    expect(cls).toBeLessThan(0.05);
  });
});

test.describe("G11 — no horizontal scroll on desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("1280 × 800 with every section open", async ({ page }) => {
    test.setTimeout(120_000);
    await activate(page);
    await copyFromYesterday(page);
    await openAll(page);
    await assertNoHorizontalScroll(page);
    console.log("G11 1280×800 with every section open: no horizontal scroll");
  });
});
