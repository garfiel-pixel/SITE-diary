/* Haptics: gated by config.features.haptics and reduced motion. */
import { CONFIG } from "../config";

export function tick() {
  if (!CONFIG.features.haptics) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  navigator.vibrate?.(8);
}
