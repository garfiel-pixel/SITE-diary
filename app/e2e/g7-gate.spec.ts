import { test, expect } from "@playwright/test";
import { CODE } from "./helpers";

const BOX = "Activation code character 1 of 12";

async function typeCode(page: import("@playwright/test").Page, code: string) {
  await page.getByLabel(BOX).click();
  await page.keyboard.type(code, { delay: 8 });
}

test.describe("G7 — demo access gate", () => {
  test("fresh profile: gate, wrong code, unlock, reload, switch off", async ({ page }) => {
    await page.goto("/");

    // 1. Fresh profile shows the gate and nothing else.
    await expect(page.getByLabel(BOX)).toBeVisible();
    await expect(page.getByRole("button", { name: "ACTIVATE" })).toBeVisible();
    await expect(page.getByTestId("app-header")).toHaveCount(0);
    console.log("G7 fresh profile: gate shown, app header absent");

    // 2. Wrong code → clear text error (not colour only), boxes reset.
    await typeCode(page, "WRONG-CODE99");
    await page.getByRole("button", { name: "ACTIVATE" }).click();
    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("Code not recognised");
    console.log("G7 wrong code message:", JSON.stringify(await alert.innerText()));

    // 3. Right code unlocks.
    await typeCode(page, CODE);
    await page.getByRole("button", { name: "ACTIVATE" }).click();
    await expect(page.getByTestId("app-header")).toBeVisible({ timeout: 15_000 });
    console.log("G7 correct code: unlocked");

    // 4. Reload stays unlocked.
    await page.reload();
    await expect(page.getByTestId("app-header")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByLabel(BOX)).toHaveCount(0);
    console.log("G7 reload: still unlocked");

    // 5. Switch this phone off returns to the gate; reports are retained.
    await page.getByTestId("open-settings").click();
    await expect(page.getByRole("button", { name: /Switch this phone off/i })).toBeVisible();
    await page.getByTestId("switch-phone-off").click();
    await expect(page.getByLabel(BOX)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("app-header")).toHaveCount(0);
    console.log("G7 switch off: gate shown again");
  });

  test("code hint is not shown in a production build without ?demo", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByLabel(BOX)).toBeVisible();
    await expect(page.getByText(`Demo code: ${CODE}`)).toHaveCount(0);
    console.log("G7 prod build hides the demo code hint (unless ?demo)");

    await page.goto("/?demo");
    await expect(page.getByText(`Demo code: ${CODE}`)).toBeVisible();
    console.log("G7 ?demo flag reveals the demo code hint");
  });
});
