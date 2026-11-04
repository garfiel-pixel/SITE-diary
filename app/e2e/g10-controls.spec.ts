import { test, expect } from "@playwright/test";
import { activate, openSection } from "./helpers";

async function sliderValue(page: import("@playwright/test").Page, label: string) {
  const v = await page.locator(`[role="slider"][aria-label="${label}"]`).getAttribute("aria-valuenow");
  return Number(v);
}

test.describe("G10 — controls", () => {
  test("tape drag, keys, hold, 0.5 steps, no drift, numpad, stepper clamp", async ({ page }) => {
    await activate(page);
    await page.getByTestId("start-blank").click();
    await openSection(page, "sec-equipment");
    await page.getByRole("button", { name: "Add Paver", exact: true }).click();

    const slider = page.locator('[role="slider"][aria-label="Paver hours"]');
    await expect(slider).toBeVisible();
    const start = await sliderValue(page, "Paver hours");
    console.log("G10 initial Paver hours:", start);

    // ---- drag ----
    // Let the add-row view transition finish, then centre the ruler above the
    // fixed action bar so raw mouse coordinates land on it.
    await page.waitForTimeout(500);
    await slider.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(300);
    const box = (await slider.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, { steps: 12 });
    await page.mouse.up();
    await expect.poll(() => sliderValue(page, "Paver hours")).toBeLessThan(start);
    const afterDrag = await sliderValue(page, "Paver hours");
    console.log("G10 drag 80% → 20%:", start, "→", afterDrag);

    // ---- keyboard, 0.5 h step ----
    await slider.focus();
    const beforeKey = afterDrag;
    await page.keyboard.press("ArrowRight");
    const afterKey = await sliderValue(page, "Paver hours");
    expect(Math.abs(afterKey - beforeKey - 0.5)).toBeLessThan(1e-9);
    console.log("G10 ArrowRight step 0.5:", beforeKey, "→", afterKey);
    await page.keyboard.press("PageUp");
    const afterPage = await sliderValue(page, "Paver hours");
    expect(Math.abs(afterPage - afterKey - 2.5)).toBeLessThan(1e-9);
    console.log("G10 PageUp step 2.5:", afterKey, "→", afterPage);

    // ---- float drift: Home, then 40 × ArrowRight must land exactly on 20 ----
    await page.keyboard.press("Home");
    expect(await sliderValue(page, "Paver hours")).toBe(0);
    for (let i = 0; i < 40; i++) await page.keyboard.press("ArrowRight");
    const drift = await sliderValue(page, "Paver hours");
    expect(drift).toBe(20);
    console.log("G10 40 × ArrowRight from 0 →", drift, "(exact, no float drift)");

    // ---- press-and-hold − ----
    await page.keyboard.press("End");
    expect(await sliderValue(page, "Paver hours")).toBe(24);
    const minus = page.locator('#sec-equipment button[aria-label="Decrease"]').first();
    await minus.dispatchEvent("pointerdown", { pointerId: 1, isPrimary: true, button: 0 });
    await page.waitForTimeout(1100);
    await minus.dispatchEvent("pointerup", { pointerId: 1, isPrimary: true, button: 0 });
    const afterHold = await sliderValue(page, "Paver hours");
    expect(afterHold).toBeLessThan(22);
    console.log("G10 hold Decrease for 1.1 s: 24 →", afterHold, "(accelerating repeat)");

    // ---- numpad entry sets the exact value ----
    await slider.click({ position: { x: 30, y: 40 } }); // tap moves marker, then open numpad
    const valueButton = page.locator('#sec-equipment button[aria-label*="open numpad"]').first();
    await valueButton.click();
    const sheet = page.getByRole("dialog", { name: "Number pad" });
    await expect(sheet).toBeVisible();
    const del = sheet.getByRole("button", { name: "Delete", exact: true });
    for (let i = 0; i < 4; i++) await del.click();
    for (const k of ["1", "2", ".", "5"]) await sheet.getByRole("button", { name: k, exact: true }).click();
    await sheet.getByRole("button", { name: "Done" }).click();
    await expect.poll(() => sliderValue(page, "Paver hours")).toBe(12.5);
    console.log("G10 numpad entry 12.5 →", await sliderValue(page, "Paver hours"));

    // ---- quantity stepper clamps at 0 ----
    await openSection(page, "sec-materials");
    await page.getByRole("button", { name: "Add Asphalt", exact: true }).click();
    const minus10 = page.locator('#sec-materials button[aria-label="Decrease by 10"]').first();
    await minus10.click();
    await minus10.click();
    await minus10.click();
    const qtyButton = page.locator('#sec-materials button[aria-label*="Quantity 0"]').first();
    await expect(qtyButton).toBeVisible();
    const qtyText = await qtyButton.innerText();
    expect(qtyText.trim().startsWith("0")).toBeTruthy();
    console.log("G10 stepper −10 ×3 at 0 clamps:", qtyText.replace(/\n/g, " "));
  });
});
