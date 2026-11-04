/* Report states: draft -> saved (PDF created) -> uploading -> uploaded.
   The upload itself is a MOCK — a stand-in for a real endpoint. */

import { db } from "./db";

const RETRY_DELAYS = [2000, 8000, 30000]; // then cap at 2 min
let backoffAttempt = 0;
let retryTimer: number | undefined;

// comment: the mock is a stand-in for a real endpoint.
const mockUpload = (_r: unknown): Promise<void> =>
  new Promise<void>((res, rej) =>
    setTimeout(
      () => (Math.random() < 0.1 ? rej(new Error("simulated")) : res()),
      1200
    )
  );

async function flushLocked(): Promise<boolean> {
  if (!navigator.onLine) return false;
  let failed = false;
  const pending = await db.reports.where("syncState").equals("saved").toArray();
  for (const r of pending) {
    await db.reports.update(r.id, { syncState: "uploading" });
    try {
      await mockUpload(r);
      await db.reports.update(r.id, { syncState: "uploaded" });
      backoffAttempt = 0;
    } catch {
      failed = true;
      await db.reports.update(r.id, { syncState: "saved" });
    }
  }
  return failed;
}

export async function flush() {
  let failed = false;
  try {
    if (navigator.locks) {
      await navigator.locks.request("pavecon-sync", { ifAvailable: true }, async (lock) => {
        if (!lock) return; // another tab is syncing
        failed = await flushLocked();
      });
    } else {
      failed = await flushLocked();
    }
  } catch {
    failed = true;
  }
  if (failed) scheduleRetry();
}

/* Retry with backoff after a simulated failure (2 s, 8 s, 30 s, cap 2 min),
   reset on the next `online` event. */
function scheduleRetry() {
  if (retryTimer) return;
  const delay =
    backoffAttempt < RETRY_DELAYS.length
      ? RETRY_DELAYS[backoffAttempt]
      : 120_000;
  backoffAttempt += 1;
  retryTimer = window.setTimeout(() => {
    retryTimer = undefined;
    void flush();
  }, delay);
}

export function startSync() {
  window.addEventListener("online", () => {
    backoffAttempt = 0;
    window.clearTimeout(retryTimer);
    retryTimer = undefined;
    void flush();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      backoffAttempt = 0;
      void flush();
    }
  });
  void flush();
}
