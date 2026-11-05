/* Same-document View Transitions helper. Feature-detected always. */
import { flushSync } from "react-dom";

export function withTransition(update: () => void) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return update();
  if (!("startViewTransition" in document)) return update();
  (document as unknown as {
    startViewTransition: (cb: () => void) => unknown;
  }).startViewTransition(() => flushSync(update));
}
