import { test, expect } from "@playwright/test";
import {
  activate,
  copyFromYesterday,
  getReportForDate,
  openSection,
  tableCount,
  TODAY_ISO,
  waitSaved,
} from "./helpers";

test.describe("G3 — Dexie persistence + offline", () => {
  test("fill, reload, offline edit, reload — data intact", async ({ page, context }) => {
    await activate(page);
    await copyFromYesterday(page);

    await openSection(page, "sec-project");
    const project = page.locator("#mi-project");
    const site = page.locator("#mi-site");
    await project.fill("G3 Persistence Project");
    await site.fill("Chainage 9+999");
    await openSection(page, "sec-wip");
    const wip = page.locator("#sec-wip textarea");
    await wip.fill("Line one of the diary.\nLine two.");
    await waitSaved(page);

    const countsOnline = {
      reports: await tableCount(page, "reports"),
      photos: await tableCount(page, "photos"),
      memo: await tableCount(page, "memo"),
      register: await tableCount(page, "register"),
    };
    console.log("G3 IndexedDB row counts (online):", JSON.stringify(countsOnline));

    await page.reload();
    await expect(page.getByTestId("app-header")).toBeVisible({ timeout: 15_000 });
    await openSection(page, "sec-project");
    await expect(page.locator("#mi-project")).toHaveValue("G3 Persistence Project");
    await expect(page.locator("#mi-site")).toHaveValue("Chainage 9+999");
    console.log("G3 reload online: project + site intact");

    // Make sure the service worker controls this page before cutting the wire.
    await page.waitForFunction(async () => {
      const reg = await navigator.serviceWorker.ready;
      return !!reg.active && !!navigator.serviceWorker.controller;
    }, undefined, { timeout: 30_000 });

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByTestId("app-header")).toBeVisible({ timeout: 20_000 });
    console.log("G3 reload offline: app served by the service worker");

    await openSection(page, "sec-wip");
    await wip.fill("Edited while offline.\nStill here.");
    await waitSaved(page);

    await page.reload();
    await expect(page.getByTestId("app-header")).toBeVisible({ timeout: 20_000 });
    await openSection(page, "sec-wip");
    await expect(wip).toHaveValue("Edited while offline.\nStill here.");
    console.log("G3 reload offline after edit: WIP text intact");

    const report = await getReportForDate(page, TODAY_ISO);
    expect(report).toBeTruthy();
    expect(report!.project).toBe("G3 Persistence Project");
    const countsOffline = {
      reports: await tableCount(page, "reports"),
      photos: await tableCount(page, "photos"),
      memo: await tableCount(page, "memo"),
      register: await tableCount(page, "register"),
    };
    console.log("G3 IndexedDB row counts (offline):", JSON.stringify(countsOffline));

    await context.setOffline(false);
  });
});
