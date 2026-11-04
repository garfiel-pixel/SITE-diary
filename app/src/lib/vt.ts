/* Same-document View Transitions helper. Feature-detected always. */
import { flushSync } from "react-dom";

export function withTransition(update: () => void) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("startViewTransition" in document)) return update();
  (document as unknown as {
    startViewTransition: (cb: () => void) => unknown;
  }).startViewTransition(() => flushSync(update));
}
