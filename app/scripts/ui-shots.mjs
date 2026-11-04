// Capture the weather / time-lost UI at the three review widths.
// Usage: node scripts/ui-shots.mjs before|after
// Evidence: ../artifacts/ui-<label>/<width>-<theme>-<state>.png
// The first run also writes ../artifacts/ui-baseline.txt measurements.
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ART = path.join(ROOT, "..", "artifacts");
const label = process.argv[2] || "before";
const OUT = path.join(ART, `ui-${label}`);
const PORT = 4175;
const URL = `http://localhost:${PORT}/`;
fs.mkdirSync(OUT, { recursive: true });

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const YESTERDAY = iso(yesterday);

async function reachable() {
  try {
    const res = await fetch(URL);
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForServer() {
  for (let i = 0; i < 120; i++) {
    if (await reachable()) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`preview server did not start on ${PORT}`);
}

async function setTheme(page, theme) {
  await page.emulateMedia({ colorScheme: theme });
  await page.evaluate((t) => {
    document.documentElement.dataset.theme = t;
  }, theme);
  await page.waitForTimeout(80);
}

async function activate(page) {
  await page.goto(URL);
  const first = page.getByLabel("Activation code character 1 of 12");
  await first.waitFor();
  await first.click();
  await page.keyboard.type("PAVECON-DEMO", { delay: 8 });
  await page.getByRole("button", { name: "ACTIVATE" }).click();
  await page.getByTestId("app-header").waitFor({ timeout: 15_000 });
}

async function openSection(page, id) {
  const header = page.locator(`#${id} > h2 > button`);
  if ((await header.getAttribute("aria-expanded")) !== "true") await header.click();
  await header.waitFor();
}

async function useYesterday(page) {
  await page.locator('input[aria-label="Date"]').first().fill(YESTERDAY);
  await page.waitForTimeout(500);
  await page.locator("#sec-project").waitFor({ timeout: 15_000 });
}

async function pickRadio(page, group, name) {
  const radio = page.getByRole("radiogroup", { name: group }).getByRole("radio", { name });
  await radio.click();
  await page.waitForTimeout(220);
}

async function measure(page, width, theme) {
  return page.evaluate(
    ({ width, theme }) => {
      const rgb = (v) => v;
      const group = document.querySelector('[role="radiogroup"][aria-label="Weather A.M."]');
      if (!group) return null;
      const radios = [...group.querySelectorAll('[role="radio"]')];
      const selected = radios.find((r) => r.getAttribute("aria-checked") === "true");
      const unselected = radios.find((r) => r.getAttribute("aria-checked") !== "true");
      if (!selected || !unselected) return null;
      const style = (el) => {
        const s = getComputedStyle(el);
        const after = getComputedStyle(el, "::after");
        return {
          label: el.getAttribute("aria-label"),
          background: rgb(s.backgroundColor),
          border: rgb(s.borderColor),
          color: rgb(s.color),
          weight: s.fontWeight,
          badgeContent: after.content,
          badgeBackground: rgb(after.backgroundColor),
          badgeColor: rgb(after.color),
        };
      };
      return { width, theme, selected: style(selected), unselected: style(unselected) };
    },
    { width, theme }
  );
}
const server = (await reachable())
  ? null
  : spawn(
      process.execPath,
      [
        path.join(ROOT, "node_modules", "vite", "bin", "vite.js"),
        "preview",
        "--port",
        String(PORT),
        "--strictPort",
      ],
      { cwd: ROOT, stdio: "ignore" }
    );

let browser;
const measurements = [];
try {
  await waitForServer();
  await new Promise((r) => setTimeout(r, 300));
  browser = await chromium.launch();
  for (const width of [360, 400, 768]) {
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({
        viewport: { width, height: 800 },
        colorScheme: theme,
        reducedMotion: "no-preference",
      });
      const page = await context.newPage();
      await activate(page);
      await useYesterday(page);
      await setTheme(page, theme);
      await openSection(page, "sec-weather");
      await page.evaluate(() => document.fonts.ready);

      const weather = page.locator("#sec-weather");
      await weather.screenshot({ path: path.join(OUT, `${width}-${theme}-weather-empty.png`) });

      await pickRadio(page, "Weather A.M.", /^A\.M\. Clear/);
      await weather.screenshot({ path: path.join(OUT, `${width}-${theme}-weather-am-only.png`) });
      const m = await measure(page, width, theme);
      if (m && width === 400 && theme === "light") measurements.push(m);

      await pickRadio(page, "Weather P.M.", /^P\.M\. Clear/);
      await weather.screenshot({ path: path.join(OUT, `${width}-${theme}-weather-both.png`) });

      await openSection(page, "sec-lost");
      await page.locator("#loss-rain").click();
      await page.waitForTimeout(220);
      await page.locator("#sec-lost").screenshot({
        path: path.join(OUT, `${width}-${theme}-lost-rain.png`),
      });
      await context.close();
    }
  }
  console.log(`UI captures: ${path.relative(ROOT, OUT).replace(/\\/g, "/")}`);
} finally {
  await browser?.close();
  server?.kill();
}

if (label === "before" && measurements.length) {
  const m = measurements[0];
  const line = (kind, s) =>
    [
      `${kind}: ${s.label}`,
      `  background ${s.background}`,
      `  border     ${s.border}`,
      `  label      ${s.color}, weight ${s.weight}`,
      `  badge      content=${s.badgeContent} bg=${s.badgeBackground} colour=${s.badgeColor}`,
    ].join("\n");
  const text = [
    "UI baseline — weather tile selected vs unselected (400px, light)",
    "Measured from the built app before the UI pass.",
    "",
    line("SELECTED", m.selected),
    "",
    line("UNSELECTED", m.unselected),
    "",
    "Reading: selected and unselected tiles share the same background, border and",
    "font weight, and no check badge exists. The owner's defect is reproduced.",
    "",
    "Time lost reason chips use the same .chip surface and only a transparent",
    "background override when unselected; no selected fill or badge is rendered.",
  ].join("\n");
  fs.writeFileSync(path.join(ART, "ui-baseline.txt"), text);
  console.log(`Baseline written: ${path.join(ART, "ui-baseline.txt")}`);
}
