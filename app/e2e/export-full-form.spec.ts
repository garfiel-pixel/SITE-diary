import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  activate,
  copyFromYesterday,
  openSection,
  setRecordedBy,
  TODAY_ISO,
  waitForPhotoCount,
  waitSaved,
} from "./helpers";

const ARTIFACTS = path.resolve(process.cwd(), "..", "artifacts");
const FIXTURES = path.join(ARTIFACTS, "fixtures");
const PROJECT = "Hatchfield Rd Rehabilitation road rehabilitation";
const SITE = "Hatchfield Road, Manchester — Chainage 0+400 to 0+900";

test.describe("Full form → PDF export", () => {
  test("fill every section, use every control family, then export a clear PDF", async ({
    page,
  }) => {
    test.setTimeout(300_000);
    await activate(page);
    await copyFromYesterday(page);
    await waitSaved(page);

    // 1. Project / site — the owner's long title is the layout stress case.
    await openSection(page, "sec-project");
    await page.locator("#mi-project").fill(PROJECT);
    await page.locator("#mi-site").fill(SITE);
    await page.locator("#mi-site").blur();
    await expect(page.locator("#mi-project")).toHaveValue(PROJECT);
    await expect(page.locator("#sec-project")).toContainText("Hatchfield");

    // 2. Weather — one AM and one PM choice.
    await openSection(page, "sec-weather");
    await page.getByRole("radio", { name: "A.M. Clear", exact: true }).click();
    await page.getByRole("radio", { name: "P.M. Showers", exact: true }).click();
    await expect(page.getByTestId("weather-summary")).toContainText("Clear");
    await expect(page.getByTestId("weather-summary")).toContainText("Showers");

    // 3. Time lost — reason plus the tape slider.
    await openSection(page, "sec-lost");
    await page.getByRole("radio", { name: "Rain", exact: true }).click();
    const lostHours = page.locator('[role="slider"][aria-label="Time lost hours"]');
    await lostHours.focus();
    await page.keyboard.press("ArrowRight");
    await waitSaved(page);

    // 4. Equipment — add a catalogue machine, step its hours, undo a removal.
    await openSection(page, "sec-equipment");
    const machineCount = await page.locator("#sec-equipment [role='slider']").count();
    await page
      .locator('#sec-equipment button[aria-label^="Add "]')
      .first()
      .click();
    await expect(page.locator("#sec-equipment [role='slider']")).toHaveCount(machineCount + 1);
    const firstMachine = page.locator("#sec-equipment [role='slider']").first();
    await firstMachine.focus();
    await page.keyboard.press("ArrowRight");
    const firstName = (await firstMachine.getAttribute("aria-label"))!.replace(" hours", "");
    await page.getByRole("button", { name: `Remove ${firstName}`, exact: true }).click();
    await page.getByTestId("undo-snackbar").getByRole("button", { name: "Undo last change" }).click();
    await expect(page.locator("#sec-equipment [role='slider']")).toHaveCount(machineCount + 1);

    // 5. Materials — add a delivery, open the numpad, pick 5, confirm.
    await openSection(page, "sec-materials");
    await page.getByRole("button", { name: "Add Asphalt", exact: true }).click();
    await page.locator('#sec-materials button[aria-label*="open numpad"]').first().click();
    const pad = page.getByRole("dialog", { name: "Number pad" });
    await pad.getByRole("button", { name: "5", exact: true }).click();
    await pad.getByRole("button", { name: "Done" }).click();
    await expect(page.getByTestId("summary-strip")).toContainText("Deliveries 1");

    // 6. Workforce — add, edit and switch crews.
    await openSection(page, "sec-workforce");
    await page.getByTestId("add-person").click();
    await page.getByTestId("person-name").fill("Mason Test");
    await page.getByTestId("person-role").fill("Mason");
    await page.getByTestId("save-person").click();
    await expect(page.getByTestId("summary-strip")).toContainText("20");

    // 7-9. Free text sections exercised through both typing and chips.
    await openSection(page, "sec-wip");
    await page.getByLabel("Work in progress", { exact: true }).fill("Milling and paving chainage 0+400");
    await page
      .locator("#sec-wip")
      .getByRole("button", { name: "Work in progress: add Asphalt laying", exact: true })
      .click();
    await expect(page.getByLabel("Work in progress", { exact: true })).toHaveValue(/Asphalt laying/);

    await openSection(page, "sec-visitors");
    await page.getByLabel("Visitors", { exact: true }).fill("Site inspection");
    await page
      .locator("#sec-visitors")
      .getByRole("button", { name: "Visitors: add Inspector", exact: true })
      .click();
    await expect(page.getByLabel("Visitors", { exact: true })).toHaveValue(/Inspector/);

    await openSection(page, "sec-instructions");
    await page
      .getByLabel("Instructions", { exact: true })
      .fill("Keep the haul road clean and maintain traffic control.");
    await page
      .locator("#sec-instructions")
      .getByRole("button", { name: "Instructions: add Engineer", exact: true })
      .click();

    // 10. Toolbox — start, topic, presenter, attendance and a hazard chip.
    await openSection(page, "sec-toolbox");
    await page.getByTestId("start-toolbox").click();
    await page.locator("#tb-topic").fill("Traffic management");
    await page.locator("#tb-pres").fill("Andre Brown");
    await page.getByRole("button", { name: "All present", exact: true }).click();
    await page
      .locator("#sec-toolbox")
      .getByRole("button", {
        name: "Notes — hazards raised and agreements: add PPE",
        exact: true,
      })
      .click();
    await expect(page.locator("#sec-toolbox")).toContainText("20 of 20");
    await expect(page.locator("#sec-toolbox textarea")).toHaveValue(/PPE/);

    // 11. Photos — one fixture through shrink, caption chip and bundle flow.
    await openSection(page, "sec-photos");
    const fixture = fs
      .readdirSync(FIXTURES)
      .filter((f) => f.endsWith(".jpg"))
      .sort()[0];
    await page
      .locator('#sec-photos input[type="file"]')
      .nth(1)
      .setInputFiles(path.join(FIXTURES, fixture));
    await waitForPhotoCount(page, TODAY_ISO, 1, 120_000);
    await page.getByRole("button", { name: "Select", exact: true }).click();
    await page.getByRole("button", { name: "Select photo", exact: true }).first().click();
    await page.getByRole("button", { name: /Describe selected/ }).click();
    const bundle = page.getByRole("dialog", { name: "Describe selected photos" });
    await bundle.getByRole("button", { name: "Progress", exact: true }).click();
    await bundle.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByLabel("Photo description").first()).toHaveValue("Progress");

    // 12. Recorded by is the last required field.
    await setRecordedBy(page, "Kemar Lewis");
    await waitSaved(page);

    // Export — no error state, real download, every section represented.
    await page.getByTestId("create-pdf").click();
    await expect(page.getByTestId("pdf-state")).toBeVisible({ timeout: 180_000 });
    await expect(page.getByTestId("pdf-error")).toHaveCount(0);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Save to phone" }).click(),
    ]);
    const pdfPath = path.join(ARTIFACTS, "full-form-site-diary.pdf");
    await download.saveAs(pdfPath);

    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
    const allText: string[] = [];
    let headerChecked = 0;
    for (let i = 1; i <= doc.numPages; i++) {
      const pdfPage = await doc.getPage(i);
      const content = await pdfPage.getTextContent();
      const text: string[] = [];
      for (const item of content.items) {
        if (!("str" in item)) continue;
        text.push(item.str);
        if (!item.str.trim() || item.transform[5] <= 780) continue;
        headerChecked++;
        expect(
          item.transform[4],
          `page ${i + 1} header “${item.str}” clear of the 128pt logo edge`
        ).toBeGreaterThanOrEqual(144);
        expect(
          item.transform[4] + item.width,
          `page ${i + 1} header “${item.str}” inside the right margin`
        ).toBeLessThanOrEqual(559.5);
      }
      allText.push(text.join(" ").replace(/\s+/g, " "));
    }

    const joined = allText.join(" ");
    expect(joined).toContain(PROJECT);
    expect(joined).toContain("Chainage 0+400 to 0+900");
    expect(joined).toContain("Kemar Lewis");
    expect(joined).toContain("Asphalt");
    expect(joined).toContain("Traffic management");
    expect(joined).toContain("Progress");
    expect(headerChecked).toBeGreaterThanOrEqual(doc.numPages * 2);
    console.log(
      `Full form: ${doc.numPages} page(s), ${fs.statSync(pdfPath).size} bytes, ${headerChecked} header lines >= 144pt`
    );
  });
});
