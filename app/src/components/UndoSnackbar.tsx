/* Undo snackbar — no auto-dismiss; it stays until Undo, Dismiss, or the next
   report change replaces/clears it. Rendered once by the app shell so it can
   survive navigation to the home screen. */
import { Icon } from "../icons";
import { clearUndo, type UndoMsg } from "./undo";

export function UndoSnackbar({ undo }: { undo: UndoMsg | null }) {
  if (!undo) return null;
  return (
    <div
      role="status"
      data-testid="undo-snackbar"
      className="fixed left-1/2 -translate-x-1/2 z-[70] p-3 rounded-xl shadow-lg flex flex-wrap items-center justify-center gap-3"
      style={{
        maxWidth: "calc(100vw - 24px)",
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
        style={{ color: "var(--accent)", minHeight: 56, minWidth: 56 }}
        onClick={undo.fn}
      >
        Undo
      </button>
      <button
        type="button"
        className="font-display text-lg"
        aria-label="Dismiss this message"
        style={{ color: "var(--on-band)", minHeight: 56, minWidth: 56 }}
        onClick={clearUndo}
      >
        Dismiss
      </button>
    </div>
  );
}
