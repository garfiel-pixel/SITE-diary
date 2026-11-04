import { test, expect } from "@playwright/test";
import {
  activate,
  openSection,
  setDate,
  YESTERDAY_ISO,
} from "./helpers";

type Page = import("@playwright/test").Page;
type Locator = import("@playwright/test").Locator;

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

interface Look {
  background: string;
  border: string;
  borderWidth: string;
  color: string;
  weight: string;
  transition: string;
  badgeContent: string;
  badgeWidth: number;
  badgeHeight: number;
  badgeBackground: string;
  badgeColor: string;
}

function channels(value: string): [number, number, number] | null {
  const m = value.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1].split(/[,/\s]+/).filter(Boolean).map(Number);
  if (parts.length < 3 || parts.slice(0, 3).some((n) => Number.isNaN(n))) return null;
  return [parts[0], parts[1], parts[2]];
}

function luminance([r, g, b]: [number, number, number]) {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a: string, b: string): number {
  const ca = channels(a);
  const cb = channels(b);
  if (!ca || !cb) return 0;
  const la = luminance(ca);
  const lb = luminance(cb);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

async function look(el: Locator): Promise<Look> {
  return el.evaluate((node) => {
    const s = getComputedStyle(node);
    const a = getComputedStyle(node, "::after");
    const rect = node.getBoundingClientRect();
    const badgeW = parseFloat(a.width) || 0;
    const badgeH = parseFloat(a.height) || 0;
    return {
      background: s.backgroundColor,
      border: s.borderTopColor,
      borderWidth: s.borderTopWidth,
      color: s.color,
      weight: s.fontWeight,
      transition: s.transitionDuration,
      badgeContent: a.content,
      badgeWidth: rect.width > 0 ? badgeW : 0,
      badgeHeight: rect.height > 0 ? badgeH : 0,
      badgeBackground: a.backgroundColor,
      badgeColor: a.color,
    };
  });
}

function transitionSeconds(value: string): number[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .map((v) => (v.endsWith("ms") ? parseFloat(v) / 1000 : parseFloat(v)));
}

async function expectSelected(el: Locator, before: Look, where: string) {
  await expect(el, `${where}: aria state`).toHaveAttribute("aria-checked", "true").catch(async () => {
    await expect(el, `${where}: aria state`).toHaveAttribute("aria-pressed", "true");
  });
  // The settle is 120–180 ms; inspect the final colours, not a mid-transition frame.
  await el.page().waitForTimeout(200);
  const after = await look(el);

  expect(after.background, `${where}: selected fill must differ from unselected ${before.background}`).not.toBe(
    before.background
  );
  expect(after.border, `${where}: selected border colour must differ from unselected ${before.border}`).not.toBe(
    before.border
  );
  expect(Number(after.weight), `${where}: selected label is bolder`).toBeGreaterThanOrEqual(700);

  const durations = transitionSeconds(after.transition);
  expect(
    durations.some((d) => d >= 0.12 && d <= 0.18),
    `${where}: settle transition 120–180 ms, got ${after.transition}`
  ).toBeTruthy();

  expect(after.badgeContent, `${where}: corner check badge exists`).not.toBe("none");
  expect(after.badgeContent, `${where}: badge is a check`).toMatch(/[✓√]/);
  expect(after.badgeWidth, `${where}: badge width`).toBeGreaterThanOrEqual(14);
  expect(after.badgeHeight, `${where}: badge height`).toBeGreaterThanOrEqual(14);

  const labelRatio = contrast(after.color, after.background);
  const badgeOnFill = contrast(after.badgeBackground, after.background);
  const checkOnBadge = contrast(after.badgeColor, after.badgeBackground);
  expect(labelRatio, `${where}: label contrast ${labelRatio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  expect(badgeOnFill, `${where}: badge/fill contrast ${badgeOnFill.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
  expect(checkOnBadge, `${where}: check badge contrast ${checkOnBadge.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);

  console.log(
    `${where}: fill ${after.background} / border ${after.border} / ${after.weight} / badge ${after.badgeWidth}px / contrast ${labelRatio.toFixed(2)}:1`
  );
}

test.describe("G15 — selected state", () => {
  test("every radio and pressed control visibly fills, badges and contrasts", async ({ page }) => {
    test.setTimeout(240_000);
    await activate(page);
    await setDate(page, YESTERDAY_ISO);
    for (const id of SECTION_IDS) await openSection(page, id);
    if (await page.getByTestId("start-toolbox").count()) {
      await page.getByTestId("start-toolbox").click();
    }

    // ---- radiogroups: every radio gets clicked and checked ---------------
    const groups = page.locator('[role="radiogroup"]:visible');
    const groupCount = await groups.count();
    expect(groupCount, "sample report has radiogroups").toBeGreaterThan(0);
    for (let g = 0; g < groupCount; g++) {
      const group = groups.nth(g);
      const name = (await group.getAttribute("aria-label")) ?? `group ${g}`;
      const radios = group.locator('[role="radio"]');
      const count = await radios.count();
      expect(count, `${name}: radios`).toBeGreaterThan(1);

      const before = await look(group.locator('[role="radio"][aria-checked="false"]').first());

      for (let i = 0; i < count; i++) {
        const radio = radios.nth(i);
        if ((await radio.getAttribute("aria-checked")) === "true") continue;
        await radio.scrollIntoViewIfNeeded();
        await radio.click();
        await expectSelected(radio, before, `${name} radio ${i + 1}/${count}`);
      }

      const tabStops = await radios.evaluateAll((els) =>
        els.map((el) => (el as HTMLElement).tabIndex)
      );
      expect(
        tabStops.filter((t) => t === 0).length,
        `${name}: exactly one roving tab stop, got ${JSON.stringify(tabStops)}`
      ).toBe(1);
      // Arrow keys move focus and selection, with one tab stop.
      const last = radios.nth(count - 1);
      await last.focus();
      await last.press("ArrowRight");
      await expect
        .poll(() =>
          page.evaluate(() => {
            const el = document.activeElement;
            return {
              role: el?.getAttribute("role") ?? "",
              checked: el?.getAttribute("aria-checked") ?? "",
              tabIndex: (el as HTMLElement | null)?.tabIndex ?? -99,
              group: el?.closest('[role="radiogroup"]')?.getAttribute("aria-label") ?? "",
              name: el?.getAttribute("aria-label") ?? (el?.textContent ?? "").slice(0, 30),
            };
          })
        )
        .toMatchObject({ role: "radio", checked: "true", tabIndex: 0, group: name });
      console.log(`${name}: arrows keep focus + selection, one tab stop`);
    }

    // ---- every visible aria-pressed control ------------------------------
    const pressed = page.locator('[aria-pressed="false"]:visible');
    const pressedCount = await pressed.count();
    expect(pressedCount, "sample report has unselected pressed controls").toBeGreaterThan(0);
    for (let i = 0; i < pressedCount; i++) {
      const el = pressed.first();
      // Pin the element: once it turns on, the live :first selector would move on.
      await el.evaluate((node, n) => node.setAttribute("data-g15", String(n)), i);
      const target = page.locator(`[data-g15="${i}"]`);
      const label =
        (await target.getAttribute("aria-label")) ||
        ((await target.innerText().catch(() => "")) as string).replace(/\s+/g, " ").slice(0, 40);
      const before = await look(target);
      await target.scrollIntoViewIfNeeded();
      await target.click();
      await expectSelected(target, before, `pressed ${i + 1}/${pressedCount} “${label}”`);
    }
    console.log(`G15 light: ${groupCount} radiogroups and ${pressedCount} pressed controls passed`);

    // ---- dark: the same selected fills stay legible ----------------------
    await page.getByTestId("theme-toggle").click();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset.theme))
      .toBe("dark");
    const anySelected = page.locator('[role="radio"][aria-checked="true"]').first();
    const selectedLook = await look(anySelected);
    const darkLabel = contrast(selectedLook.color, selectedLook.background);
    const darkBadge = contrast(selectedLook.badgeBackground, selectedLook.background);
    expect(darkLabel, `dark label contrast ${darkLabel.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    expect(darkBadge, `dark badge/fill contrast ${darkBadge.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
    console.log(
      `G15 dark: selected ${selectedLook.background}, label ${darkLabel.toFixed(2)}:1, badge ${darkBadge.toFixed(2)}:1`
    );
  });
});
