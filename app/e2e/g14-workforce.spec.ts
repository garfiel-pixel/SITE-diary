import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";
import {
  activate,
  copyFromYesterday,
  getReportForDate,
  iso,
  openSection,
  setDate,
  setRecordedBy,
  TODAY,
  TODAY_ISO,
  waitSaved,
  YESTERDAY_ISO,
} from "./helpers";

const ARTIFACTS = path.resolve(process.cwd(), "..", "artifacts");

async function pdfText(file: string) {
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
  return pages;
}

test.describe("G14 — named workforce", () => {
  test("migrates v1 role counts without inventing names", async ({ page }) => {
    await page.goto("/manifest.webmanifest");
    await page.evaluate(async () => {
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open("pavecon-site-diary", 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          const stores: [string, string | string[]][] = [
            ["reports", "id"],
            ["photos", "id"],
            ["register", "id"],
            ["memo", ["kind", "value"]],
            ["settings", "key"],
          ];
          for (const [name, keyPath] of stores) {
            if (!db.objectStoreNames.contains(name))
              db.createObjectStore(name, { keyPath });
          }
        };
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction("reports", "readwrite");
          tx.objectStore("reports").put({
            id: "legacy-report",
            date: "2026-01-15",
            project: "Legacy Road",
            site: "Chainage 1+000",
            weather: { am: null, pm: null },
            timeLost: { reason: null, hours: 0 },
            equipment: [],
            materials: [],
            workforce: {
              groups: ["Own crew", "Subcontractors"],
              a: [{ id: "c1", name: "Raker", count: 3 }],
              b: [{ id: "c2", name: "Steel fixer", count: 2 }],
            },
            wip: "",
            visitors: "",
            instructions: "",
            toolbox: {
              topic: "Legacy talk",
              presenter: "",
              time: "07:30",
              presentIds: ["c1"],
              notes: "",
            },
            recordedBy: "Legacy",
            recordedAt: null,
            isSample: false,
            syncState: "draft",
            updatedAt: Date.now(),
          });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      });
    });

    await activate(page);
    await setDate(page, "2026-01-15");
    await openSection(page, "sec-workforce");
    const wf = page.locator("#sec-workforce");
    await expect(wf.getByRole("tab", { name: /Own crew/ })).toContainText("3");
    await expect(wf.getByRole("tab", { name: /Subcontractors/ })).toContainText("2");
    await expect(wf.getByText("Unnamed", { exact: true })).toHaveCount(3);
    await expect(wf).toContainText("Raker 3");
    await expect(wf).toContainText("0 named · 5 unnamed");
    await expect(page.getByTestId("summary-strip")).toContainText(/People\s+5/);
    await openSection(page, "sec-toolbox");
    await expect(page.locator("#sec-toolbox")).toContainText("1 of 5");
    console.log("G14 migration: role counts expanded to unnamed people; attendance id preserved");
  });

  test("names drive totals, copy, toolbox and PDF", async ({ page }) => {
    test.setTimeout(300_000);
    await activate(page);

    // ---- sample: one row per person, no headcount controls --------------
    await setDate(page, YESTERDAY_ISO);
    await openSection(page, "sec-workforce");
    const wf = page.locator("#sec-workforce");
    await expect(wf.getByRole("tab", { name: /Own crew/ })).toContainText("18");
    await expect(wf.getByRole("tab", { name: /Subcontractors/ })).toContainText("1");
    await expect(wf).toContainText("Andre Brown");
    await expect(wf).toContainText("Raker 3");
    await expect(wf.locator('input[aria-label*="count" i]')).toHaveCount(0);
    console.log("G14 sample: 18 own crew + 1 subcontractor, named rows, derived Raker 3");

    // ---- copy carries names to today ------------------------------------
    await setDate(page, TODAY_ISO);
    await copyFromYesterday(page);
    await waitSaved(page);
    await openSection(page, "sec-workforce");
    await expect(page.getByTestId("summary-strip")).toContainText(/People\s+19/);
    await wf.getByRole("tab", { name: /Subcontractors/ }).click();
    await expect(wf).toContainText("Devon Hall");
    await wf.getByRole("tab", { name: /Own crew/ }).click();

    // ---- add a person to each tab ---------------------------------------
    await page.getByTestId("add-person").click();
    const addSheet = page.getByRole("dialog", { name: "Add person" });
    await expect(addSheet).toBeVisible();
    await addSheet.getByTestId("person-name").fill("Nia Campbell");
    await addSheet.getByTestId("person-role").fill("Raker");
    await addSheet.getByTestId("save-person").click();
    await expect(wf).toContainText("Nia Campbell");
    await expect(wf.getByRole("tab", { name: /Own crew/ })).toContainText("19");

    await wf.getByRole("tab", { name: /Subcontractors/ }).click();
    await page.getByTestId("add-person").click();
    const subSheet = page.getByRole("dialog", { name: "Add person" });
    await subSheet.getByTestId("person-name").fill("Ethan Reid");
    await subSheet.getByTestId("person-role").fill("Steel fixer");
    await subSheet.getByTestId("save-person").click();
    await expect(wf).toContainText("Ethan Reid");
    await expect(wf.getByRole("tab", { name: /Subcontractors/ })).toContainText("2");
    await expect(page.getByTestId("summary-strip")).toContainText(/People\s+21/);
    await expect(wf).toContainText("Steel fixer 1");
    console.log("G14 add: 21 people; role totals updated per tab");

    // ---- sheet accessibility --------------------------------------------
    await page.getByTestId("add-person").click();
    const a11ySheet = page.getByRole("dialog", { name: "Add person" });
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const serious = axe.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );
    expect(serious.map((v) => `${v.id} (${v.impact})`)).toEqual([]);
    console.log(`G14 add-person sheet: 0 serious/critical (${axe.violations.length} total)`);
    await a11ySheet.getByRole("button", { name: "Close" }).click();

    // ---- edit a role, remove with Undo ----------------------------------
    await wf.getByRole("tab", { name: /Own crew/ }).click();
    await wf.getByRole("button", { name: "Edit Nia Campbell" }).click();
    const editSheet = page.getByRole("dialog", { name: "Edit person" });
    await expect(editSheet.getByTestId("person-name")).toHaveValue("Nia Campbell");
    await editSheet.getByTestId("person-role").fill("Screed hand");
    await editSheet.getByTestId("save-person").click();
    await expect(wf).toContainText("Screed hand 1");
    await expect(wf).toContainText("Raker 3");

    await wf.getByRole("button", { name: "Remove Nia Campbell" }).click();
    await expect(page.getByTestId("undo-snackbar")).toBeVisible();
    await expect(page.getByTestId("summary-strip")).toContainText(/People\s+20/);
    await page
      .getByTestId("undo-snackbar")
      .getByRole("button", { name: "Undo last change" })
      .click();
    await expect(page.getByTestId("summary-strip")).toContainText(/People\s+21/);
    await expect(wf).toContainText("Nia Campbell");
    console.log("G14 edit → remove → Undo restored the same named row");

    // ---- reload persistence ---------------------------------------------
    await waitSaved(page);
    await page.reload();
    await openSection(page, "sec-workforce");
    await expect(wf).toContainText("Nia Campbell");
    await expect(page.getByTestId("summary-strip")).toContainText(/People\s+21/);
    console.log("G14 reload: names and totals persisted");

    // ---- toolbox attendance uses the same people ------------------------
    await openSection(page, "sec-toolbox");
    await page.getByTestId("start-toolbox").click();
    await expect(page.locator("#sec-toolbox")).toContainText("0 of 21");
    await page
      .getByRole("button", { name: "Andre Brown, Supervisor: absent" })
      .click();
    await expect(page.locator("#sec-toolbox")).toContainText("1 of 21");
    console.log("G14 toolbox: attendance drawn from named workforce");

    // ---- PDF contains names, roles and present list ---------------------
    await setRecordedBy(page, "K. Johnson");
    await page.getByTestId("create-pdf").click();
    await expect(page.getByTestId("pdf-state")).toBeVisible({ timeout: 180_000 });
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Save to phone" }).click(),
    ]);
    const pdfPath = path.join(ARTIFACTS, "g14-named-workforce.pdf");
    await download.saveAs(pdfPath);
    const text = (await pdfText(pdfPath)).join(" ").replace(/\s+/g, " ");
    expect(text).toContain("Workforce — 21 people");
    expect(text).toContain("Nia Campbell");
    expect(text).toContain("Ethan Reid");
    expect(text).toContain("Screed hand");
    expect(text).toContain("Roles:");
    expect(text).toContain("Present: Andre Brown");
    console.log(
      `G14 PDF: named workforce + roles + present list (${fs.statSync(pdfPath).size} bytes)`
    );
    await page.locator('.k-sheet[data-open="true"]').click({ position: { x: 4, y: 4 } });

    // ---- copy forward keeps names with fresh ids ------------------------
    const tomorrow = new Date(TODAY);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowISO = iso(tomorrow);
    await setDate(page, tomorrowISO);
    await copyFromYesterday(page);
    await waitSaved(page);
    await openSection(page, "sec-workforce");
    await expect(wf).toContainText("Nia Campbell");
    await wf.getByRole("tab", { name: /Subcontractors/ }).click();
    await expect(wf).toContainText("Ethan Reid");
    const todayReport = (await getReportForDate(page, TODAY_ISO)) as {
      workforce: { a: { id: string; name: string }[]; b: { id: string; name: string }[] };
    };
    const tomorrowReport = (await getReportForDate(page, tomorrowISO)) as {
      workforce: { a: { id: string; name: string }[]; b: { id: string; name: string }[] };
    };
    const todayNia = todayReport.workforce.a.find((p) => p.name === "Nia Campbell");
    const tomorrowNia = tomorrowReport.workforce.a.find((p) => p.name === "Nia Campbell");
    expect(todayNia && tomorrowNia).toBeTruthy();
    expect(tomorrowNia!.id).not.toBe(todayNia!.id);
    console.log("G14 copy-forward: names kept, row ids regenerated");

    // ---- 400 and 1280 widths --------------------------------------------
    const width = () =>
      page.evaluate(() => ({
        scroll: document.scrollingElement!.scrollWidth,
        inner: window.innerWidth,
      }));
    let sizes = await width();
    expect(sizes.scroll).toBeLessThanOrEqual(sizes.inner + 1);
    await page.setViewportSize({ width: 1280, height: 800 });
    await openSection(page, "sec-workforce");
    sizes = await width();
    expect(sizes.scroll).toBeLessThanOrEqual(sizes.inner + 1);
    console.log("G14 400×800 and 1280×800: no horizontal overflow");
  });
});
