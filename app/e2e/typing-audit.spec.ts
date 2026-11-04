import { test, expect } from "@playwright/test";
import {
  activate,
  copyFromYesterday,
  openSection,
  readAudit,
  startAudit,
} from "./helpers";

test.describe("Typing audit — sample-equivalent report on a new day", () => {
  test("≤ 25 taps and ≤ 40 typed characters", async ({ page }) => {
    test.setTimeout(180_000);
    await activate(page);
    await startAudit(page);

    await copyFromYesterday(page); // 1 tap: copy yesterday

    await openSection(page, "sec-weather");
    await page.getByRole("radio", { name: "A.M. Clear", exact: true }).click();
    await page.getByRole("radio", { name: /^P\.M\. Showers/ }).click();

    await openSection(page, "sec-wip");
    for (const chip of ["Milling", "Asphalt laying", "Rolling"]) {
      await page.getByRole("button", { name: `Work in progress: add ${chip}` }).click();
    }

    await openSection(page, "sec-recorded");
    await page.getByRole("button", { name: "Use K. Johnson?" }).click();

    await page.getByTestId("create-pdf").click();
    await expect(page.getByTestId("pdf-state")).toBeVisible({ timeout: 120_000 });

    const audit = await readAudit(page);
    console.log(
      `Typing audit: ${audit.taps} taps, ${audit.chars} typed characters (target ≤ 25 / ≤ 40)`
    );
    expect(audit.taps).toBeLessThanOrEqual(25);
    expect(audit.chars).toBeLessThanOrEqual(40);
  });
});
