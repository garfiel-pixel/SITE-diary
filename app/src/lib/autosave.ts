/* Tiny autosave/flush hook for the diary editor.

   The diary screen registers its own flush work through registerFlush().
   This module only guarantees that flushNow() is called once when the page
   is being torn down (pagehide) or when the tab moves fully hidden.
   It does not own any DB writes. */

type Flush = () => Promise<void> | void;

let flush: Flush | null = null;

export function registerFlush(fn: Flush) {
  flush = fn;
}

export function clearFlush() {
  flush = null;
}

export async function flushNow() {
  const f = flush;
  if (!f) return;
  try {
    await f();
  } catch {
    /* best effort; autosave failures are reported by the screen itself */
  }
}

let started = false;

function start() {
  if (started) return;
  started = true;

  const onHide = () => flushNow();
  window.addEventListener("pagehide", onHide, { once: true });

  const onVisible = () => {
    if (document.visibilityState === "hidden") {
      flushNow();
    }
  };
  document.addEventListener("visibilitychange", onVisible);
}

start();
