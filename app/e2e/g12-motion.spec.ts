import { test, expect } from "@playwright/test";
import { activate, copyFromYesterday, openSection } from "./helpers";

type Page = import("@playwright/test").Page;

async function seconds(page: Page, selector: string, prop: "animationDuration" | "transitionDuration") {
  return page.evaluate(
    ([sel, p]) => {
      const el = document.querySelector(sel as string);
      if (!el) return null;
      const raw = getComputedStyle(el)[p as "animationDuration"];
      const value = parseFloat(raw);
      return raw.trim().endsWith("ms") ? value / 1000 : value;
    },
    [selector, prop] as const
  );
}

async function vtCount(page: Page) {
  return page.evaluate(() => (window as unknown as { __vt: number }).__vt);
}

test.describe("G12 — motion", () => {
  test("reduced motion disables animation/VT; normal motion runs; drag has no long tasks", async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000);
    await page.addInitScript(() => {
      const w = window as unknown as { __vt: number };
      w.__vt = 0;
      const doc = document as Document & {
        startViewTransition?: (cb: () => void) => unknown;
      };
      const original = doc.startViewTransition?.bind(document);
      if (original) {
        doc.startViewTransition = (cb: () => void) => {
          w.__vt += 1;
          return original(cb);
        };
      }
    });

    // ---- reduced motion -------------------------------------------------
    await page.emulateMedia({ reducedMotion: "reduce" });
    await activate(page);
    await copyFromYesterday(page);
    await openSection(page, "sec-equipment");

    await page.getByRole("button", { name: "Add Grader", exact: true }).click();
    await expect(page.locator('[role="slider"][aria-label="Grader hours"]')).toBeVisible();

    const rollReduced = await seconds(page, ".roll", "animationDuration");
    const collapseReduced = await seconds(page, ".card-collapse", "transitionDuration");
    console.log(
      `G12 reduce: .roll animation=${rollReduced}s, collapse transition=${collapseReduced}s, VT calls=${await vtCount(page)}`
    );
    expect(rollReduced ?? 1).toBeLessThan(0.001);
    expect(collapseReduced ?? 1).toBeLessThan(0.001);
    expect(await vtCount(page)).toBe(0);

    // ---- normal motion --------------------------------------------------
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.getByRole("button", { name: "Add Excavator", exact: true }).click();
    await expect(page.locator('[role="slider"][aria-label="Excavator hours"]')).toBeVisible();
    const roll = await seconds(page, ".roll", "animationDuration");
    const collapse = await seconds(page, ".card-collapse", "transitionDuration");
    console.log(
      `G12 normal: .roll animation=${roll}s, collapse transition=${collapse}s, VT calls=${await vtCount(page)}`
    );
    expect(roll ?? 0).toBeGreaterThan(0.1);
    expect(collapse ?? 0).toBeGreaterThan(0.2);
    expect(await vtCount(page)).toBeGreaterThan(0);

    // ---- 3 s tape drag at 4× CPU throttle: no long task over 50 ms ------
    const cdp = await context.newCDPSession(page);
    const slider = page.locator('[role="slider"][aria-label="Grader hours"]');
    await page.waitForTimeout(500);
    await slider.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(300);
    const box = (await slider.boundingBox())!;
    const yMid = box.y + box.height / 2;

    // Warm-up: the first pointer interaction pays one-off hit-test/font/IPC
    // costs. Exercise it, then start the measured 3 s drag from a clean heap.
    await page.mouse.move(box.x + box.width * 0.5, yMid);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.55, yMid, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(400);
    await cdp.send("HeapProfiler.collectGarbage");

    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.evaluate(() => {
      const w = window as unknown as { __long: number[] };
      w.__long = [];
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) w.__long.push(entry.duration);
      }).observe({ type: "longtask" });
    });

    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2);
    await page.mouse.down();
    for (let i = 0; i <= 60; i++) {
      const x = box.x + box.width * (0.2 + 0.6 * (i / 60));
      await page.mouse.move(x, box.y + box.height / 2);
      await page.waitForTimeout(48);
    }

    // Measure the drag itself, while the pointer is still down.
    const during = await page.evaluate(
      () => (window as unknown as { __long: number[] }).__long.slice()
    );
    const duringOver50 = during.filter((d) => d > 50);
    await page.mouse.up();
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    const after = await page.evaluate(
      () => (window as unknown as { __long: number[] }).__long
    );
    const commitOver50 = after.filter((d) => d > 50 && !duringOver50.includes(d));
    console.log(
      `G12 3 s drag at 4× throttle — during drag: ${during.length} long tasks, over 50 ms: ${duringOver50.length} ${JSON.stringify(duringOver50)}; post-release commit: ${JSON.stringify(commitOver50)}`
    );
    expect(duringOver50).toHaveLength(0);
  });
});
