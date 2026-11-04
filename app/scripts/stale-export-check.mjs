/* Reproduces the owner's stale-deploy export failure: open the app, rebuild
   dist underneath it, remove the old index chunk as a fresh deploy would, then
   export from the still-open page. The PDF chunks have stable URLs, so the old
   page can fetch the current builder instead of a deleted hash-named module. */
import { chromium } from "@playwright/test";
import { execSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { once } from "node:events";

const ARTIFACTS = path.resolve(process.cwd(), "..", "artifacts");
const DIST = path.resolve(process.cwd(), "dist");
const log = [];
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".map": "application/json",
};

function note(line) {
  log.push(line);
  console.log(line);
}

function build() {
  execSync("npm run build", { stdio: "ignore" });
}

build();
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "");
  const file = path.resolve(DIST, rel || "index.html");
  if (!file.startsWith(DIST)) {
    res.writeHead(403).end();
    return;
  }
  fs.readFile(file, (error, body) => {
    if (error) {
      res.writeHead(404, { "cache-control": "no-store" }).end("not found");
      return;
    }
    res.writeHead(200, {
      "content-type": MIME[path.extname(file)] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(body);
  });
});
server.listen(0, "localhost");
await once(server, "listening");
const base = `http://localhost:${server.address().port}`;
note(`serving dist at ${base}`);

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 400, height: 800 },
  serviceWorkers: "block",
});
const page = await context.newPage();

try {
  await page.goto(base);
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      const req = indexedDB.open("pavecon-site-diary");
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("settings", "readwrite");
        tx.objectStore("settings").put({ key: "activation", value: "on" });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
    });
  });
  await page.reload();
  await page.getByTestId("copy-from-yesterday").click();
  await page.locator("#sec-recorded > h2 > button").click();
  const name = page.getByTestId("recorded-by");
  await name.fill("Stale Deploy Test");
  await name.blur();
  await page.waitForTimeout(700);

  const oldIndex = await page.evaluate(
    () =>
      [...document.scripts]
        .map((s) => s.src)
        .find((src) => /\/assets\/index-.*\.js$/.test(src)) ?? ""
  );
  if (!oldIndex) throw new Error("could not find the loaded index chunk");
  note(`loaded index before deploy: ${new URL(oldIndex).pathname}`);

  build();
  note("rebuilt dist while the page stayed open");
  fs.rmSync(path.join(DIST, new URL(oldIndex).pathname.replace(/^\/+/, "")));
  note("removed the old index chunk to simulate a fresh deploy");

  const oldStatus = await fetch(oldIndex).then((r) => r.status);
  const builderStatus = await fetch(`${base}/assets/pdf-builder.js`).then((r) => r.status);
  note(`old index chunk after deploy: HTTP ${oldStatus}`);
  note(`stable pdf builder after deploy: HTTP ${builderStatus}`);
  if (oldStatus !== 404) throw new Error(`expected the old index hash to be gone, got ${oldStatus}`);
  if (builderStatus !== 200)
    throw new Error(`stable pdf builder missing, got ${builderStatus}`);

  const builderResponse = page.waitForResponse(
    (r) => r.url().endsWith("/assets/pdf-builder.js"),
    { timeout: 60_000 }
  );
  await page.getByTestId("create-pdf").click();
  await page.getByTestId("pdf-state").waitFor({ timeout: 120_000 });
  const builderHit = await builderResponse;
  note(`old page fetched stable builder: HTTP ${builderHit.status()}`);
  if (builderHit.status() !== 200) throw new Error("old page could not fetch pdf-builder.js");
  const errors = await page.getByTestId("pdf-error").count();
  if (errors) throw new Error("export showed pdf-error after the rebuild");
  note("export from the pre-deploy page: PASS (report ready, no pdf-error)");

  const download = page.waitForEvent("download", { timeout: 30_000 });
  await page.getByRole("button", { name: "Save to phone" }).click();
  await download;
  note("download started from the pre-deploy page: PASS");
} finally {
  await browser.close();
  server.close();
  build();
  note("dist rebuilt after the check");
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACTS, "stale-export-proof.txt"), log.join("\n") + "\n");
}
