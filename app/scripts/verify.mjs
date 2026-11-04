// One-command gate runner: npm run verify
// Evidence lands in ../artifacts and ../artifacts/gates.txt.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import zlib from "node:zlib";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PARENT = path.join(ROOT, "..");
const ART = path.join(PARENT, "artifacts");
fs.mkdirSync(ART, { recursive: true });

const results = [];
const rel = (p) => path.relative(PARENT, p).replace(/\\/g, "/");
function record(gate, ok, note, evidence) {
  results.push({ gate, ok, note, evidence });
  console.log(`${ok ? "PASS" : "FAIL"} ${gate} — ${note}`);
  return ok;
}
function run(command, args, opts = {}) {
  return spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
    timeout: 600_000,
    ...opts,
  });
}

// ---------------------------------------------------------------- G0 ----
console.log("\n== G0 build ==");
const build = run("npm", ["run", "build"]);
const buildOut = `${build.stdout ?? ""}\n${build.stderr ?? ""}`;
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const unpinned = [...Object.entries(pkg.dependencies ?? {}), ...Object.entries(pkg.devDependencies ?? {})]
  .filter(([, v]) => /[\^~]/.test(String(v)))
  .map(([k, v]) => `${k}@${v}`);
const indexChunks = fs.existsSync(path.join(ROOT, "dist", "assets"))
  ? fs
      .readdirSync(path.join(ROOT, "dist", "assets"))
      .filter((f) => /^index-.*\.js$/.test(f))
      .map((f) => path.join(ROOT, "dist", "assets", f))
  : [];
const initialBytes = indexChunks.reduce(
  (n, f) => n + zlib.gzipSync(fs.readFileSync(f), { level: 9 }).length,
  0
);
const assetList = fs.existsSync(path.join(ROOT, "dist", "assets"))
  ? fs
      .readdirSync(path.join(ROOT, "dist", "assets"))
      .map((f) => {
        const size = fs.statSync(path.join(ROOT, "dist", "assets", f)).size;
        return `${(size / 1024).toFixed(1).padStart(8)} KB  ${f}`;
      })
      .sort()
  : [];
fs.writeFileSync(
  path.join(ART, "bundle.txt"),
  [
    buildOut.trim(),
    "",
    `initial JS (index chunk, gzip): ${(initialBytes / 1024).toFixed(1)} KB / budget 180 KB`,
    `pinned dependencies: ${unpinned.length ? unpinned.join(", ") : "yes (no ^ or ~)"}`,
    "",
    ...assetList,
  ].join("\n")
);
const g0 = record(
  "G0",
  build.status === 0 &&
    unpinned.length === 0 &&
    fs.existsSync(path.join(ROOT, "dist", "index.html")) &&
    initialBytes <= 180 * 1024,
  `build ${build.status === 0 ? "ok" : "FAILED"}, pinned ${unpinned.length === 0 ? "yes" : unpinned.join(",")}, initial JS ${(initialBytes / 1024).toFixed(1)} KB gzip`,
  rel(path.join(ART, "bundle.txt"))
);

// ---------------------------------------------------------------- G1 ----
console.log("\n== G1 logo ==");
const sha = (p) => (fs.existsSync(p) ? crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex") : "MISSING");
const supplied = path.join(PARENT, "Gemini_Generated_Image_81zzia81zzia81zz.jpg");
const srcLogo = path.join(ROOT, "src", "assets", "brand", "logo.jpg");
const pubLogo = path.join(ROOT, "public", "brand", "logo.jpg");
const hashes = { supplied: sha(supplied), src: sha(srcLogo), public: sha(pubLogo) };
fs.writeFileSync(
  path.join(ART, "g1-logo.txt"),
  [
    `supplied: ${hashes.supplied}`,
    `src/assets/brand/logo.jpg: ${hashes.src}`,
    `public/brand/logo.jpg: ${hashes.public}`,
    "logo used unmodified; white background kept; UI uses a white logo plate; PDF places it on white paper",
  ].join("\n")
);
record(
  "G1",
  hashes.supplied !== "MISSING" && hashes.supplied === hashes.src && hashes.supplied === hashes.public,
  "supplied JPG copied byte-for-byte (sha256 matches)",
  rel(path.join(ART, "g1-logo.txt"))
);

// --------------------------------------------------------- fixtures -----
const fixtures = path.join(ART, "fixtures");
if (!fs.existsSync(fixtures) || fs.readdirSync(fixtures).filter((f) => f.endsWith(".jpg")).length < 30) {
  const fx = run("node", ["scripts/make-fixtures.mjs"]);
  if (fx.status !== 0) console.error(fx.stdout, fx.stderr);
}

// ------------------------------------------------------ Playwright ------
console.log("\n== G3-G14 Playwright ==");
const jsonPath = path.join(ART, "playwright.json");
const pw = run("npx", ["playwright", "test", "--reporter=json"], {
  env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: jsonPath },
});
let specs = [];
if (fs.existsSync(jsonPath)) {
  const report = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const walk = (suite, ancestors = []) => {
    const pathTitles = suite.title.endsWith(".spec.ts")
      ? ancestors
      : [...ancestors, suite.title];
    for (const spec of suite.specs ?? []) {
      const results = (spec.tests ?? []).flatMap((t) => t.results ?? []);
      specs.push({
        title: [...pathTitles, spec.title].filter(Boolean).join(" "),
        ok: results.length > 0 && results.every((r) => r.status === "passed"),
        error: results.find((r) => r.status !== "passed")?.error?.message ?? "",
      });
    }
    for (const child of suite.suites ?? []) walk(child, pathTitles);
  };
  for (const suite of report.suites ?? []) walk(suite);
}
if (!specs.length) {
  console.error((pw.stdout ?? "").slice(-3000), (pw.stderr ?? "").slice(-3000));
}
const byGate = new Map();
for (const spec of specs) {
  const m = spec.title.match(/\b(G\d+)\b/);
  if (!m) continue;
  const gate = m[1];
  byGate.set(gate, [...(byGate.get(gate) ?? []), spec]);
}
for (const spec of specs.filter((s) => !s.ok)) {
  console.log(`  test failed: ${spec.title}\n    ${spec.error.split("\n")[0]}`);
}
for (const [gate, list] of [...byGate.entries()].sort()) {
  const ok = list.every((s) => s.ok);
  record(
    gate,
    ok,
    ok ? `${list.length} test(s) passed` : `${list.filter((s) => !s.ok).length}/${list.length} failed`,
    gate === "G5" ? `${rel(path.join(ART, "pdf-gate.txt"))}, ${rel(path.join(ART, "playwright.json"))}` : rel(jsonPath)
  );
}
const audit = specs.find((s) => s.title.startsWith("Typing audit"));
record(
  "Audit",
  !!audit?.ok,
  audit ? (audit.ok ? "typing audit passed (see test log)" : "typing audit failed") : "typing audit did not run",
  rel(jsonPath)
);
const fullForm = specs.find((s) => s.title.startsWith("Full form"));
record(
  "Export",
  !!fullForm?.ok,
  fullForm
    ? fullForm.ok
      ? "every section filled through the UI, PDF exported, header clear of logo"
      : "full-form export failed"
    : "full-form export did not run",
  rel(path.join(ART, "full-form-site-diary.pdf"))
);

// ---------------------------------------------------------- G2 ---------
console.log("\n== Artifacts / G2 ==");
const artRes = run("node", ["scripts/artifacts.mjs"]);
if (artRes.status !== 0)
  console.log((artRes.stdout ?? "").slice(-2000), (artRes.stderr ?? "").slice(-2000));
const iconsSrc = fs.readFileSync(path.join(ROOT, "src", "icons", "index.tsx"), "utf8");
const hardCoded = iconsSrc.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
record(
  "G2",
  fs.existsSync(path.join(ART, "icons.png")) && hardCoded.length === 0,
  hardCoded.length
    ? `hard-coded colours in icon set: ${hardCoded.join(", ")}`
    : "icon sheet rendered at 24/48 px in light and dark; colours via CSS variables",
  rel(path.join(ART, "icons.png"))
);

// ---------------------------------------------------------- G9 ---------
console.log("\n== G9 Lighthouse ==");
const lh = run("node", ["scripts/lighthouse.mjs"]);
const lhText = fs.existsSync(path.join(ART, "lighthouse.txt"))
  ? fs.readFileSync(path.join(ART, "lighthouse.txt"), "utf8")
  : "";
const pwaText = fs.existsSync(path.join(ART, "pwa.txt"))
  ? fs.readFileSync(path.join(ART, "pwa.txt"), "utf8")
  : "";
const score = (name) => Number((lhText.match(new RegExp(`${name}: (\\d+)`)) ?? [])[1] ?? 0);
const perf = score("Performance");
const a11y = score("Accessibility");
const best = score("Best Practices");
const installable = /RESULT: installable/.test(pwaText);
if (lh.status !== 0 || !lhText) {
  console.log((lh.stdout ?? "").slice(-2000), (lh.stderr ?? "").slice(-2000));
}
record(
  "G9",
  perf >= 90 && a11y >= 95 && best >= 95 && installable,
  `Performance ${perf}, Accessibility ${a11y}, Best Practices ${best}, installable ${installable ? "yes" : "no"}`,
  `${rel(path.join(ART, "lighthouse.txt"))}, ${rel(path.join(ART, "pwa.txt"))}`
);

// ---------------------------------------------------------- G13 --------
const gateOrder = ["G0", "G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "G9", "G10", "G11", "G12", "G14", "G15", "G16", "G17", "Export"];
const prior = new Map(results.map((r) => [r.gate, r]));
const allOk =
  gateOrder.every((g) => prior.get(g)?.ok) &&
  (prior.get("Audit")?.ok ?? false);
record(
  "G13",
  allOk,
  allOk ? "all gates passed" : "one or more gates failed",
  rel(path.join(ART, "gates.txt"))
);
const byGateFinal = new Map(results.map((r) => [r.gate, r]));

// ---------------------------------------------------------- report -----
const line = "+------+--------+----------------------------------------------------------+";
const table = [
  line,
  "| Gate | Result | Evidence / note                                            |",
  line,
  ...gateOrder.concat("G13").map((g) => {
    const r = byGateFinal.get(g) ?? { ok: false, note: "not run", evidence: "" };
    return `| ${g.padEnd(4)} | ${(r.ok ? "PASS" : "FAIL").padEnd(6)} | ${(r.evidence || r.note).slice(0, 56).padEnd(56)} |`;
  }),
  line,
];
const auditRow = byGateFinal.get("Audit");
const report = [
  "Pave-Con Site Diary — verification",
  `date: ${new Date().toISOString()}`,
  "",
  ...table,
  "",
  `Typing audit: ${auditRow?.ok ? "PASS" : "FAIL"} — ${auditRow?.note}`,
  "",
  "Gates:",
  ...gateOrder.concat("G13").map((g) => {
    const r = byGateFinal.get(g);
    return `${g}: ${r?.ok ? "PASS" : "FAIL"} — ${r?.note ?? "not run"} (${r?.evidence ?? ""})`;
  }),
].join("\n");
fs.writeFileSync(path.join(ART, "gates.txt"), report + "\n");
console.log("\n" + table.join("\n"));
console.log(`\n${allOk ? "DONE — all gates passed." : "NOT DONE — see failing gates above."}`);
console.log(`evidence: ${rel(ART)}/gates.txt`);
process.exitCode = allOk ? 0 : 1;
