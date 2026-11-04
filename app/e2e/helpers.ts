import { expect, type Page } from "@playwright/test";

export const CODE = "PAVECON-DEMO";
export const TODAY = new Date();
export const TODAY_ISO = iso(TODAY);
export const YESTERDAY_ISO = iso(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - 1));

export function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** Types the demo code into the segmented gate and unlocks. */
export async function activate(page: Page) {
  await page.goto("/");
  const first = page.getByLabel("Activation code character 1 of 12");
  await expect(first).toBeVisible();
  await first.click();
  await page.keyboard.type(CODE, { delay: 10 });
  await page.getByRole("button", { name: "ACTIVATE" }).click();
  await expect(page.getByTestId("app-header")).toBeVisible({ timeout: 15_000 });
  resetAudit(page);
}

/** Directly writes the activation setting through IndexedDB (faster for gates
 *  that don't test the gate itself). */
export async function activateDb(page: Page) {
  await page.goto("/");
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open("pavecon-site-diary");
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("settings", "readwrite");
        tx.objectStore("settings").put({ key: "activation", value: "on" });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
    });
  });
  await page.reload();
  await expect(page.getByTestId("app-header")).toBeVisible({ timeout: 15_000 });
}

/** Counts rows in a store using plain IndexedDB (works against prod build). */
export async function tableCount(page: Page, store: string): Promise<number> {
  return page.evaluate(async (s) => {
    return new Promise<number>((resolve, reject) => {
      const req = indexedDB.open("pavecon-site-diary");
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(s, "readonly");
        const count = tx.objectStore(s).count();
        count.onsuccess = () => resolve(count.result);
        count.onerror = () => reject(count.error);
      };
    });
  }, store);
}

export async function openSection(page: Page, id: string) {
  const header = page.locator(`#${id} > h2 > button`);
  const expanded = await header.getAttribute("aria-expanded");
  if (expanded !== "true") await header.click();
  await expect(header).toHaveAttribute("aria-expanded", "true");
}

export async function setRecordedBy(page: Page, name: string) {
  await openSection(page, "sec-recorded");
  const input = page.getByTestId("recorded-by");
  await input.fill(name);
  await input.blur();
}

/** Navigates the diary to a specific ISO date, with or without a report. */
export async function setDate(page: Page, isoDate: string) {
  const projectHeader = page.locator("#sec-project > h2 > button");
  if (await projectHeader.count()) await openSection(page, "sec-project");
  const input = page.locator('input[aria-label="Date"]').first();
  await input.fill(isoDate);
  await page.waitForTimeout(400);
}

/** Waits for the 400 ms autosave to land (plus a safety margin). */
export async function waitSaved(page: Page) {
  await page.waitForTimeout(700);
}

/** Reports currently in Dexie, newest date first. */
export async function getReports(page: Page) {
  return page.evaluate(async () => {
    const req = indexedDB.open("pavecon-site-diary");
    const db = await new Promise<IDBDatabase>((res) => (req.onsuccess = () => res(req.result)));
    return new Promise<Record<string, unknown>[]>((res, rej) => {
      const all = db.transaction("reports").objectStore("reports").getAll();
      all.onsuccess = () => res(all.result as Record<string, unknown>[]);
      all.onerror = () => rej(all.error);
    });
  });
}

export async function getReportForDate(page: Page, isoDate: string) {
  const all = await getReports(page);
  return all.find((r) => r.date === isoDate);
}

export interface PhotoInfo {
  id: string;
  reportId: string;
  groupId: string | null;
  bytes: number;
  type: string;
  w: number;
  h: number;
  description: string;
}

export async function getPhotos(page: Page): Promise<PhotoInfo[]> {
  return page.evaluate(async () => {
    const req = indexedDB.open("pavecon-site-diary");
    const db = await new Promise<IDBDatabase>((res) => (req.onsuccess = () => res(req.result)));
    return new Promise<PhotoInfo[]>((res, rej) => {
      const all = db.transaction("photos").objectStore("photos").getAll();
      all.onsuccess = () =>
        res(
          (all.result as Record<string, unknown>[]).map((p) => ({
            id: String(p.id),
            reportId: String(p.reportId),
            groupId: (p.groupId as string | null) ?? null,
            bytes: (p.blob as Blob).size,
            type: (p.blob as Blob).type,
            w: Number(p.w),
            h: Number(p.h),
            description: String(p.description ?? ""),
          }))
        );
      all.onerror = () => rej(all.error);
    });
  });
}

/** Polls IndexedDB until the report for `isoDate` has `expected` photos. */
export async function waitForPhotoCount(page: Page, isoDate: string, expected: number, timeout = 120_000) {
  const start = Date.now();
  for (;;) {
    const report = await getReportForDate(page, isoDate);
    if (report) {
      const photos = await getPhotos(page);
      if (photos.filter((p) => p.reportId === report.id).length >= expected) return photos;
    }
    if (Date.now() - start > timeout) throw new Error(`photos did not reach ${expected} for ${isoDate}`);
    await page.waitForTimeout(150);
  }
}

/** Starts today's report by copying yesterday (the demo path). */
export async function copyFromYesterday(page: Page) {
  await page.getByTestId("copy-from-yesterday").click();
  await expect(page.locator("#sec-project")).toBeVisible({ timeout: 10_000 });
}

/** Instrumentation for the typing audit. */
export async function startAudit(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __audit: { taps: number; chars: number } };
    w.__audit = { taps: 0, chars: 0 };
    if (!(window as unknown as { __auditBound?: boolean }).__auditBound) {
      (window as unknown as { __auditBound?: boolean }).__auditBound = true;
      document.addEventListener(
        "click",
        (e) => {
          const t = e.target as HTMLElement;
          if (t.closest("button, [role=radio], [role=button], a")) w.__audit.taps++;
        },
        true
      );
      document.addEventListener(
        "keydown",
        (e) => {
          if (e.key.length === 1) w.__audit.chars++;
        },
        true
      );
    }
  });
}

export async function readAudit(page: Page) {
  return page.evaluate(() => (window as unknown as { __audit: { taps: number; chars: number } }).__audit);
}

async function resetAudit(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __audit?: { taps: number; chars: number } };
    if (w.__audit) w.__audit = { taps: 0, chars: 0 };
  });
}

/** Stubs Math.random so the mock upload never simulates a failure. */
export function stubUploadSuccess(page: Page) {
  return page.addInitScript(() => {
    Math.random = () => 0.9;
  });
}
