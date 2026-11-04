import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  activateDb,
  copyFromYesterday,
  getPhotos,
  getReportForDate,
  openSection,
  TODAY_ISO,
  waitForPhotoCount,
} from "./helpers";

const FIXTURES = path.resolve(process.cwd(), "..", "artifacts", "fixtures");

function fixtureFiles(count: number) {
  return fs
    .readdirSync(FIXTURES)
    .filter((f) => f.endsWith(".jpg"))
    .sort()
    .slice(0, count)
    .map((f) => path.join(FIXTURES, f));
}

test.describe("G4 — photos", () => {
  test("12 MP photos shrink, keep EXIF orientation, bundle, delete with Undo", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const files = fixtureFiles(12);
    expect(files.length).toBe(12);

    await activateDb(page);
    await copyFromYesterday(page);
    await openSection(page, "sec-photos");

    await page.locator('#sec-photos input[type="file"]').nth(1).setInputFiles(files);
    const allPhotos = await waitForPhotoCount(page, TODAY_ISO, 12, 180_000);
    const report = await getReportForDate(page, TODAY_ISO);
    expect(report).toBeTruthy();
    const stored = allPhotos.filter((p) => p.reportId === report!.id);
    expect(stored).toHaveLength(12);

    const sizes = stored.map((p) => p.bytes);
    const edges = stored.map((p) => Math.max(p.w, p.h));
    const portrait = stored.filter((p) => p.h > p.w);
    console.log(
      `G4 stored 12 photos — bytes min/max: ${Math.min(...sizes)}/${Math.max(...sizes)}, long edge max: ${Math.max(...edges)}, portrait (EXIF 6): ${portrait.length}`
    );
    expect(Math.max(...sizes)).toBeLessThanOrEqual(500 * 1024);
    expect(Math.max(...edges)).toBeLessThanOrEqual(1600);
    expect(portrait).toHaveLength(4);
    expect(stored.every((p) => p.type === "image/jpeg")).toBeTruthy();
    for (const p of stored) {
      expect(p.w).toBeLessThanOrEqual(1600);
      expect(p.h).toBeLessThanOrEqual(1600);
    }
    console.log("G4 sizes:", sizes.join(", "));

    // Small phone photos decode without rotation artifacts: the four EXIF 6
    // fixtures come out portrait, the rest landscape.
    expect(portrait.every((p) => p.w === 1200 && p.h === 1600)).toBeTruthy();

    // ---- bundle: one description shared by two photos -------------------
    await page.getByRole("button", { name: "Select", exact: true }).click();
    const selects = page.getByRole("button", { name: "Select photo", exact: true });
    await selects.nth(0).click();
    await selects.nth(1).click();
    await page.getByRole("button", { name: /Describe selected/ }).click();
    const sheet = page.getByRole("dialog", { name: "Describe selected photos" });
    await expect(sheet).toBeVisible();
    await sheet.getByLabel("Bundle description").fill("Progress — asphalt laying");
    await sheet.getByRole("button", { name: "Apply" }).click();
    await expect(sheet).toBeHidden();

    const bundled = await getPhotos(page);
    const groups = new Map<string, typeof bundled>();
    for (const p of bundled.filter((x) => x.reportId === report!.id)) {
      if (!p.groupId) continue;
      groups.set(p.groupId, [...(groups.get(p.groupId) ?? []), p]);
    }
    const group = [...groups.values()].find((g) => g.length === 2);
    expect(group).toBeTruthy();
    expect(new Set(group!.map((p) => p.description)).size).toBe(1);
    expect(group![0]!.description).toBe("Progress — asphalt laying");
    console.log("G4 bundle: 2 photos share one caption and a groupId");

    // ---- delete with Undo ----------------------------------------------
    await page.getByRole("button", { name: "Remove photo" }).first().click();
    await expect(page.getByTestId("undo-snackbar")).toBeVisible();
    await page.getByTestId("undo-snackbar").getByRole("button", { name: "Undo last change" }).click();
    await expect
      .poll(async () => {
        const afterUndo = await getPhotos(page);
        return afterUndo.filter((p) => p.reportId === report!.id).length;
      })
      .toBe(12);
    console.log("G4 delete → Undo restored the photo");
  });
});
