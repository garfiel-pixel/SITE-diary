/* App-wide Undo snackbar store. It lives outside the editor so the message
   survives "Delete sample report" returning to the home screen. */
import { useSyncExternalStore } from "react";

export interface UndoMsg {
  msg: string;
  fn: () => void;
  key: number;
}

let current: UndoMsg | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function showUndo(msg: UndoMsg) {
  current = msg;
  emit();
}

export function clearUndo() {
  if (current === null) return;
  current = null;
  emit();
}

export function useUndo(): UndoMsg | null {
  return useSyncExternalStore(subscribe, () => current, () => null);
}
