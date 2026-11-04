import { test, expect } from "@playwright/test";
import {
  activate,
  copyFromYesterday,
  getReportForDate,
  setRecordedBy,
  stubUploadSuccess,
  TODAY_ISO,
} from "./helpers";

test.describe("G6 — offline PWA + mock upload", () => {
  test("offline reload, PDF stays saved, online + visibilitychange upload", async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000);
    await stubUploadSuccess(page);
    await activate(page);

    // First visit registers the worker; a reload puts the page under its
    // control so lazy chunks come from the precache. Verify synchronously.
    await expect
      .poll(
        () =>
          page.evaluate(async () => (await navigator.serviceWorker.ready).active?.state),
        { timeout: 30_000 }
      )
      .toBe("activated");
    await page.reload();
    await expect(page.getByTestId("app-header")).toBeVisible({ timeout: 20_000 });
    expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    console.log("G6 service worker controls the page");

    await copyFromYesterday(page);
    await setRecordedBy(page, "K. Johnson");

    await context.setOffline(true);
    console.log("G6 offline: context.setOffline(true)");

    await page.getByTestId("create-pdf").click();
    await expect(page.getByTestId("pdf-state")).toBeVisible({ timeout: 120_000 });
    await expect(page.getByTestId("sync-state")).toContainText("Saved on phone");
    const report = await getReportForDate(page, TODAY_ISO);
    expect(report!.syncState).toBe("saved");
    console.log("G6 offline PDF created; report state = saved");

    await page.reload();
    await expect(page.getByTestId("app-header")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("summary-strip")).toContainText("People");
    const afterReload = await getReportForDate(page, TODAY_ISO);
    expect(afterReload!.recordedBy).toBe("K. Johnson");
    console.log("G6 offline reload: app served by service worker, report intact");

    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await expect
      .poll(async () => page.getByTestId("sync-state").getAttribute("data-state"), {
        timeout: 10_000,
        intervals: [150, 250, 400],
      })
      .toBe("uploading");
    console.log("G6 online event: state = uploading");
    await expect
      .poll(async () => page.getByTestId("sync-state").getAttribute("data-state"), {
        timeout: 15_000,
      })
      .toBe("uploaded");
    console.log("G6 online event: state = uploaded");

    // ---- visibilitychange path ----------------------------------------
    await page.evaluate(async () => {
      const req = indexedDB.open("pavecon-site-diary");
      const db = await new Promise<IDBDatabase>((res) => (req.onsuccess = () => res(req.result)));
      await new Promise<void>((res, rej) => {
        const tx = db.transaction("reports", "readwrite");
        const store = tx.objectStore("reports");
        const cursor = store.openCursor();
        cursor.onsuccess = () => {
          const c = cursor.result;
          if (!c) return;
          const value = c.value;
          if (value.recordedBy === "K. Johnson") {
            value.syncState = "saved";
            c.update(value);
          }
          c.continue();
        };
        tx.oncomplete = () => res();
        tx.onerror = () => rej(tx.error);
      });
    });
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await expect
      .poll(async () => page.getByTestId("sync-state").getAttribute("data-state"), {
        timeout: 15_000,
      })
      .toBe("uploaded");
    console.log("G6 visibilitychange path: report re-uploaded to uploaded");
  });
});
