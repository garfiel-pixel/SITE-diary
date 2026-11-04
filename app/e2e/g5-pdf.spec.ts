import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  activateDb,
  copyFromYesterday,
  openSection,
  setRecordedBy,
  TODAY_ISO,
  waitForPhotoCount,
} from "./helpers";
import { fmtDate } from "../src/lib/format";

const ARTIFACTS = path.resolve(process.cwd(), "..", "artifacts");
const FIXTURES = path.join(ARTIFACTS, "fixtures");

async function pdfPages(file: string) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(fs.readFileSync(file));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
    );
  }
  return { pages, numPages: doc.numPages };
}

function assertEveryPage(
  pages: string[],
  expected: { name: string; project: string; site: string; date: string }
) {
  pages.forEach((text, i) => {
    expect(text, `page ${i + 1} missing recorded-by footer`).toContain(
      `Recorded by: ${expected.name}`
    );
    expect(text, `page ${i + 1} missing page counter`).toContain(
      `Page ${i + 1} of ${pages.length}`
    );
    expect(text, `page ${i + 1} missing motto header`).toContain(
      "CHOOSE WISELY... BUILD WITH CONFIDENCE"
    );
    expect(text, `page ${i + 1} missing project header`).toContain(expected.project);
    expect(text, `page ${i + 1} missing site header`).toContain(expected.site);
    expect(text, `page ${i + 1} missing date header`).toContain(expected.date);
  });
}

test.describe("G5 — PDF", () => {
  test("sample + 30-photo stress report: text, header/footer on every page", async ({
    page,
  }) => {
    test.setTimeout(360_000);
    await activateDb(page);
    await copyFromYesterday(page);
    await setRecordedBy(page, "K. Johnson");

    // A material with the m³ glyph, to prove the embedded font covers it.
    await openSection(page, "sec-materials");
    const materials = page.locator("#sec-materials");
    await materials.getByRole("button", { name: "More…" }).click();
    const catalogue = page.getByRole("dialog", { name: "Full catalogue" });
    await catalogue.getByRole("button", { name: "Ready-mix", exact: true }).click();
    await page.locator('#sec-materials button[aria-label*="open numpad"]').first().click();
    const pad = page.getByRole("dialog", { name: "Number pad" });
    await pad.getByRole("button", { name: "5", exact: true }).click();
    await pad.getByRole("button", { name: "Done" }).click();

    await page.getByTestId("create-pdf").click();
    await expect(page.getByTestId("pdf-state")).toBeVisible({ timeout: 120_000 });

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Save to phone" }).click(),
    ]);
    const samplePath = path.join(ARTIFACTS, "sample-site-diary.pdf");
    await download.saveAs(samplePath);

    const sample = await pdfPages(samplePath);
    const sampleBytes = fs.statSync(samplePath).size;
    console.log(`G5 sample PDF: ${sample.numPages} page(s), ${sampleBytes} bytes`);
    expect(sample.numPages).toBeGreaterThanOrEqual(1);
    expect(sample.pages[0]).toContain("m³");
    assertEveryPage(sample.pages, {
      name: "K. Johnson",
      project: "Hatfield Road Rehabilitation",
      site: "Chainage 0+400 to 0+900",
      date: fmtDate(TODAY_ISO),
    });
    console.log("G5 sample: recorded-by footer, page counter and header on every page");

    // ---- 30-photo stress report ---------------------------------------
    await page.locator('.k-sheet[data-open="true"]').click({ position: { x: 4, y: 4 } });
    await openSection(page, "sec-photos");
    const files = fs
      .readdirSync(FIXTURES)
      .filter((f) => f.endsWith(".jpg"))
      .sort()
      .slice(0, 30)
      .map((f) => path.join(FIXTURES, f));
    const gallery = page.locator('#sec-photos input[type="file"]').nth(1);
    await gallery.setInputFiles(files);
    await waitForPhotoCount(page, TODAY_ISO, 30, 240_000);

    await page.getByTestId("create-pdf").click();
    await expect(page.getByTestId("pdf-state")).toBeVisible({ timeout: 180_000 });
    const [stressDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Save to phone" }).click(),
    ]);
    const stressPath = path.join(ARTIFACTS, "stress-site-diary.pdf");
    await stressDownload.saveAs(stressPath);

    const stress = await pdfPages(stressPath);
    const stressBytes = fs.statSync(stressPath).size;
    console.log(`G5 stress PDF: ${stress.numPages} page(s), ${stressBytes} bytes`);
    expect(stress.numPages).toBeGreaterThan(1);
    expect(stressBytes).toBeLessThan(8 * 1024 * 1024);
    assertEveryPage(stress.pages, {
      name: "K. Johnson",
      project: "Hatfield Road Rehabilitation",
      site: "Chainage 0+400 to 0+900",
      date: fmtDate(TODAY_ISO),
    });
    console.log("G5 stress: header, recorded-by footer and page counter on every page");

    fs.writeFileSync(
      path.join(ARTIFACTS, "pdf-gate.txt"),
      [
        `sample: ${sample.numPages} pages, ${sampleBytes} bytes`,
        `stress: ${stress.numPages} pages, ${stressBytes} bytes`,
        "recorded-by footer, Page n of N, motto/project/site/date header verified on every page",
        "m³ glyph present in sample PDF text",
      ].join("\n")
    );
  });
});
