// Generates the visual evidence in ../artifacts:
//   light-400.png dark-400.png light-1280.png dark-1280.png
//   icons.png (dev-only /icons gallery)
//   pdf-page1.png (rendered sample PDF page)
//   pwa.txt (installability errors + manifest facts)
// Run: node scripts/artifacts.mjs
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ART = path.join(ROOT, "..", "artifacts");
fs.mkdirSync(ART, { recursive: true });

const viteBin = path.join(ROOT, "node_modules", "vite", "bin", "vite.js");
const children = [];

function start(port, extra = []) {
  const args = [viteBin];
  if (extra.includes("preview")) {
    args.push("preview", "--port", String(port), "--strictPort");
  } else {
    args.push("--port", String(port), "--strictPort");
  }
  const child = spawn(process.execPath, args, { cwd: ROOT, stdio: "ignore" });
  children.push(child);
  return child;
}

async function waitFor(url, timeout = 60_000) {
  const start = Date.now();
  for (;;) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    if (Date.now() - start > timeout) throw new Error(`server did not start: ${url}`);
    await new Promise((r) => setTimeout(r, 300));
  }
}

function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

async function setTheme(page, mode) {
  const current = await page.evaluate(() => document.documentElement.dataset.theme);
  if (current !== mode) {
    await page.getByTestId("theme-toggle").click();
    await page.waitForFunction(
      (m) => document.documentElement.dataset.theme === m,
      mode,
      { timeout: 5_000 }
    );
  }
}

async function main() {
  start(4173, ["preview"]);
  await waitFor("http://localhost:4173/");

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 400, height: 800 } });
  const page = await context.newPage();
  await page.goto("http://localhost:4173/");
  await page.getByLabel("Activation code character 1 of 12").click();
  await page.keyboard.type("PAVECON-DEMO");
  await page.getByRole("button", { name: "ACTIVATE" }).click();
  await page.waitForSelector("[data-testid=app-header]", { timeout: 20_000 });

  // Show the sample report (yesterday) for the screenshots.
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateInput = page.locator('input[aria-label="Date"]').first();
  await dateInput.fill(iso(yesterday));
  await page.waitForSelector("#sec-project", { timeout: 15_000 });
  await page.waitForTimeout(500);

  await setTheme(page, "light");
  await page.screenshot({ path: path.join(ART, "light-400.png") });
  await setTheme(page, "dark");
  await page.screenshot({ path: path.join(ART, "dark-400.png") });

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(300);
  await setTheme(page, "light");
  await page.screenshot({ path: path.join(ART, "light-1280.png") });
  await setTheme(page, "dark");
  await page.screenshot({ path: path.join(ART, "dark-1280.png") });
  console.log("artifacts: light/dark screenshots at 400 and 1280");

  // ---- PWA installability -------------------------------------------------
  const swState = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return { active: !!reg.active, scope: reg.scope };
  });
  const cdp = await context.newCDPSession(page);
  await cdp.send("Page.enable");
  const { installabilityErrors } = await cdp.send("Page.getInstallabilityErrors");
  const manifest = await page.evaluate(() =>
    fetch("/manifest.webmanifest")
      .then((r) => r.json())
      .catch(() => null)
  );
  fs.writeFileSync(
    path.join(ART, "pwa.txt"),
    [
      `service worker active: ${swState.active} (${swState.scope})`,
      `manifest name: ${manifest?.name ?? "MISSING"}`,
      `manifest display: ${manifest?.display ?? "MISSING"}`,
      `manifest icons: ${(manifest?.icons ?? []).map((i) => i.sizes + (i.purpose ? ":" + i.purpose : "")).join(", ")}`,
      `installability errors: ${JSON.stringify(installabilityErrors)}`,
      installabilityErrors.length === 0 ? "RESULT: installable" : "RESULT: not installable",
    ].join("\n")
  );
  console.log("artifacts: pwa.txt", installabilityErrors);

  await browser.close();

  // ---- icon sheet (dev-only route) --------------------------------------
  start(5174);
  await waitFor("http://localhost:5174/icons");
  const iconBrowser = await chromium.launch();
  const iconPage = await iconBrowser.newPage({ viewport: { width: 1500, height: 900 } });
  await iconPage.goto("http://localhost:5174/icons");
  await iconPage.waitForSelector("[data-testid=icon-sheet-light]");
  await iconPage.screenshot({ path: path.join(ART, "icons.png"), fullPage: true });
  await iconBrowser.close();
  console.log("artifacts: icons.png");

  // ---- render page 1 of the sample PDF ----------------------------------
  const pdfPath = path.join(ART, "sample-site-diary.pdf");
  if (fs.existsSync(pdfPath)) {
    const { createCanvas, DOMMatrix, ImageData, Path2D } = await import("@napi-rs/canvas");
    globalThis.DOMMatrix = DOMMatrix;
    globalThis.ImageData = ImageData;
    globalThis.Path2D = Path2D;
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
    const pg = await doc.getPage(1);
    const viewport = pg.getViewport({ scale: 1.4 });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await pg.render({ canvasContext: canvas.getContext("2d"), viewport, canvas }).promise;
    fs.writeFileSync(path.join(ART, "pdf-page1.png"), canvas.toBuffer("image/png"));
    console.log("artifacts: pdf-page1.png");
  } else {
    console.log("artifacts: sample PDF not found (run the G5 test first)");
  }
}

try {
  await main();
} finally {
  for (const child of children) {
    try {
      child.kill("SIGTERM");
    } catch {
      /* already gone */
    }
  }
}
