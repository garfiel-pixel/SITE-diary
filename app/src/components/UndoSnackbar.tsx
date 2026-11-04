/* Undo snackbar — no "Are you sure?" dialogs (6.4b). Auto-dismiss 6 s. */
import { useEffect } from "react";
import { Icon } from "../icons";

export interface UndoMsg {
  msg: string;
  fn: () => void;
  key: number;
}

export function UndoSnackbar({
  undo,
  onTimeout,
}: {
  undo: UndoMsg | null;
  onTimeout?: () => void;
}) {
  useEffect(() => {
    if (!undo || !onTimeout) return;
    const t = window.setTimeout(onTimeout, 6000);
    return () => window.clearTimeout(t);
  }, [undo?.key, onTimeout]);
  if (!undo) return null;
  return (
    <div
      role="status"
      data-testid="undo-snackbar"
      className="fixed left-1/2 -translate-x-1/2 z-50 p-3 rounded-xl shadow-lg flex items-center gap-4"
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)",
        background: "var(--band)",
        color: "var(--on-band)",
      }}
    >
      <Icon name="undo" size={20} />
      <span className="text-sm font-semibold">{undo.msg}</span>
      <button
        type="button"
        className="font-display text-lg"
        aria-label="Undo last change"
        style={{ color: "var(--accent)" }}
        onClick={undo.fn}
      >
        Undo
      </button>
    </div>
  );
}
