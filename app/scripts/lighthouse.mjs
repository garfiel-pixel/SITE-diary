// Lighthouse (mobile, simulated slow 4G, 4× CPU) against the production build.
// Writes ../artifacts/lighthouse.txt and exits 0 even when a score misses;
// verify.mjs reads the scores and decides PASS/FAIL.
// Run: node scripts/lighthouse.mjs
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ART = path.join(ROOT, "..", "artifacts");
fs.mkdirSync(ART, { recursive: true });
const out = path.join(ART, "lighthouse.json");
const txt = path.join(ART, "lighthouse.txt");

const viteBin = path.join(ROOT, "node_modules", "vite", "bin", "vite.js");
const server = spawn(
  process.execPath,
  [viteBin, "preview", "--port", "4173", "--strictPort"],
  { cwd: ROOT, stdio: "ignore" }
);

async function waitFor(url, timeout = 60_000) {
  const start = Date.now();
  for (;;) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* not up */
    }
    if (Date.now() - start > timeout) throw new Error("preview did not start");
    await new Promise((r) => setTimeout(r, 300));
  }
}

try {
  await waitFor("http://localhost:4173/");
  const lhBin = path.join(ROOT, "node_modules", "lighthouse", "cli", "index.js");
  const res = spawnSync(
    process.execPath,
    [
      lhBin,
      "http://localhost:4173/",
      "--output=json",
      `--output-path=${out}`,
      "--only-categories=performance,accessibility,best-practices",
      "--chrome-flags=--headless=new --no-sandbox --disable-gpu",
      "--quiet",
    ],
    { cwd: ROOT, encoding: "utf8", timeout: 180_000 }
  );
  if (!fs.existsSync(out)) {
    fs.writeFileSync(
      txt,
      `Lighthouse did not produce a report.\nstdout:\n${res.stdout ?? ""}\nstderr:\n${res.stderr ?? ""}`
    );
    console.error("lighthouse: no report");
    process.exit(2);
  }
  const json = JSON.parse(fs.readFileSync(out, "utf8"));
  const score = (id) => Math.round((json.categories?.[id]?.score ?? 0) * 100);
  const perf = score("performance");
  const a11y = score("accessibility");
  const best = score("best-practices");
  const lines = [
    `url: ${json.finalUrl ?? "http://localhost:4173/"}`,
    `lighthouse: ${json.lighthouseVersion ?? "?"}`,
    `Performance: ${perf}`,
    `Accessibility: ${a11y}`,
    `Best Practices: ${best}`,
    `LCP: ${json.audits?.["largest-contentful-paint"]?.displayValue ?? "?"}`,
    `FCP: ${json.audits?.["first-contentful-paint"]?.displayValue ?? "?"}`,
    `CLS: ${json.audits?.["cumulative-layout-shift"]?.displayValue ?? "?"}`,
    `TBT: ${json.audits?.["total-blocking-time"]?.displayValue ?? "?"}`,
  ];
  fs.writeFileSync(txt, lines.join("\n") + "\n");
  console.log(lines.join("\n"));
} finally {
  try {
    server.kill("SIGTERM");
  } catch {
    /* gone */
  }
}
