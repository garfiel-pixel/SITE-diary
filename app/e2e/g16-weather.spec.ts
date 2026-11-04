import { test, expect } from "@playwright/test";
import { activateDb, openSection, setDate } from "./helpers";

/*
  G16 — weather picker structure on a phone, tablet and desktop width:
  a fixed AM/PM rail, six tiles in 3 x 2, readable 13 px labels, a compact
  AM/PM summary, a finite PM pulse after noon, and no rotation of the grid.
*/

const BLANK_DAY = "2026-11-05";

test.describe("G16 — weather layout", () => {
  test("rails, 3x2 tiles, AM/PM summary, finite pulse and responsive widths", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    // Freeze the clock after noon so the empty PM rail exercises its pulse.
    await page.addInitScript(() => {
      const NativeDate = Date;
      const fixed = new NativeDate(2026, 10, 4, 15, 30, 0, 0).getTime();
      const FrozenDate = new Proxy(NativeDate, {
        construct(target, args) {
          return args.length ? Reflect.construct(target, args) : new target(fixed);
        },
        get(target, prop, receiver) {
          if (prop === "now") return () => fixed;
          return Reflect.get(target, prop, receiver);
        },
      });
      (window as unknown as { Date: DateConstructor }).Date =
        FrozenDate as unknown as DateConstructor;
    });

    await activateDb(page);
    await setDate(page, BLANK_DAY);
    await page.getByRole("button", { name: "Start blank page" }).click();
    await expect(page.locator("#sec-weather")).toBeVisible();
    await openSection(page, "sec-weather");

    const pickers = page.locator(".wx-picker:visible");
    await expect(pickers).toHaveCount(2);
    await expect(page.getByTestId("weather-rail-am")).toContainText("AM");
    await expect(page.getByTestId("weather-rail-pm")).toContainText("PM");

    // Empty report: both halves show a muted dash in the section summary.
    const summary = page.getByTestId("weather-summary");
    await expect(summary).toContainText("AM");
    await expect(summary).toContainText("PM");
    await expect(summary.locator(".wx-summary-part.wx-summary-empty")).toHaveCount(2);

    for (const width of [360, 400, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(120);

      const layout = await page.evaluate(() => {
        const picker = document.querySelector<HTMLElement>(".wx-picker");
        if (!picker) throw new Error("weather picker missing");
        const rail = picker.querySelector<HTMLElement>(".wx-rail");
        const tiles = [...picker.querySelectorAll<HTMLElement>(".wx-tile")];
        const rects = tiles.map((tile) => tile.getBoundingClientRect());
        const railRect = rail?.getBoundingClientRect();
        const label = tiles[0]?.querySelector<HTMLElement>(".wx-tile-label");
        return {
          railWidth: railRect?.width ?? 0,
          columns: new Set(rects.map((r) => Math.round(r.left))).size,
          rows: new Set(rects.map((r) => Math.round(r.top))).size,
          tileHeight: Math.min(...rects.map((r) => r.height)),
          labelSize: label ? parseFloat(getComputedStyle(label).fontSize) : 0,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });

      expect(layout.railWidth, `${width}px rail width`).toBeGreaterThanOrEqual(44);
      expect(layout.railWidth, `${width}px rail width`).toBeLessThanOrEqual(52);
      expect(layout.columns, `${width}px tile columns`).toBe(3);
      expect(layout.rows, `${width}px tile rows`).toBe(2);
      expect(layout.tileHeight, `${width}px tile height`).toBeGreaterThanOrEqual(84);
      expect(layout.labelSize, `${width}px label size`).toBeCloseTo(13, 1);
      expect(layout.overflow, `${width}px horizontal overflow`).toBeLessThanOrEqual(1);
    }

    // A settled AM pick lights the rail check and the summary.
    const amRail = page.getByTestId("weather-rail-am");
    const emptyOpacity = await amRail
      .locator(".wx-rail-check")
      .evaluate((el) => getComputedStyle(el).opacity);
    expect(emptyOpacity).toBe("0");
    await page.getByRole("radio", { name: "A.M. Clear", exact: true }).click();
    await expect(amRail).toHaveAttribute("data-filled", "true");
    await expect
      .poll(() =>
        amRail.locator(".wx-rail-check").evaluate((el) => getComputedStyle(el).opacity)
      )
      .toBe("1");
    await expect(summary).toContainText("Clear");

    // Empty PM after noon pulses exactly three times, then stops.
    const pmRail = page.getByTestId("weather-rail-pm");
    const pulseLayer = pmRail.locator(".wx-rail-pulse");
    await expect(pmRail).toHaveClass(/pulse-soft/);
    const pulse = await pulseLayer.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        name: cs.animationName,
        duration: cs.animationDuration,
        iterations: cs.animationIterationCount,
      };
    });
    expect(pulse).toEqual({ name: "pulse-rail", duration: "1.2s", iterations: "3" });

    // Selecting PM ends the reminder immediately.
    await page.getByRole("radio", { name: "P.M. Showers", exact: true }).click();
    await expect(pmRail).not.toHaveClass(/pulse-soft/);

    // Reduced motion removes the pulse entirely.
    await page.emulateMedia({ reducedMotion: "reduce" });
    const reduced = await pulseLayer.evaluate((el) => getComputedStyle(el).animationName);
    expect(reduced).toBe("none");

    console.log("G16: 360/400/768 -> 48px rails, 3 x 2 tiles, 13px labels, finite pulse");
  });
});
