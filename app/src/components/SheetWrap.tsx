/* Bottom sheet — accessible modal dialog. It is rendered through a portal so a
   transformed card can never become its containing block, and focus is kept inside
   the panel while it is open. Open/close is tied to the history stack so the Back
   button closes the sheet, but it never mutates location.hash and never triggers the
   hash router. */
import { useCallback, useEffect, useRef, useState } from "react";
import { type ReactNode } from "react";
import { createPortal } from "react-dom";
import { isSheetHistoryEntry, pushSheetHistory } from "../lib/route";

const FOCUSABLES = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex=\"-1\"])",
].join(",");

export function SheetWrap({
  opened,
  onClosed,
  children,
  label = "Sheet",
  className = "",
}: {
  opened: boolean;
  onClosed: () => void;
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [shows, setShows] = useState(false);

  useEffect(() => {
    if (opened) {
      openerRef.current = document.activeElement as HTMLElement;
      pushSheetHistory();
    } else {
      setShows(false);
      try {
        history.back();
      } catch {
        /* ignore when there is no previous sheet entry */
      }
    }
  }, [opened]);

  useEffect(() => {
    if (!shows) return;
    const onPop = () => {
      if (!isSheetHistoryEntry(history.state)) return;
      onClosed();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [shows, onClosed]);

  useEffect(() => {
    if (!shows) return;
    const panel = panelRef.current;
    if (!panel) return;

    const onKeyDown = (e: Event) => {
      const ke = e as unknown as KeyboardEvent & {
        currentTarget: EventTarget;
      };
      if (ke.key === "Escape") {
        e.preventDefault();
        onClosed();
        return;
      }
      if (ke.key !== "Tab") return;

      const items = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLES)
      ).filter((el) => el.offsetParent !== null && !el.hasAttribute("disabled"));
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const active = panel.ownerDocument.activeElement;
      const idx = items.indexOf(active as HTMLElement);
      if (ke.shiftKey) {
        if (idx <= 0) {
          e.preventDefault();
          items[items.length - 1]?.focus();
        }
      } else if (idx < 0 || idx === items.length - 1) {
        e.preventDefault();
        items[0]?.focus();
      }
    };

    panel.addEventListener("keydown", onKeyDown);
    return () => panel.removeEventListener("keydown", onKeyDown);
  }, [shows, onClosed]);

  const close = useCallback(() => onClosed(), [onClosed]);

  const node = (
    <div
      ref={backdropRef}
      className="k-sheet"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: shows ? "rgba(0,0,0,.4)" : "transparent",
        display: shows ? "block" : "none",
      }}
      onClick={(e) => {
        if (e.target === backdropRef.current) close();
      }}
      role="presentation"
      aria-hidden={!shows}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal={shows}
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
        className={`max-w-2xl mx-auto p-4 k-sheet-panel ${className}`}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
          background: "var(--surface)",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          border: "1px solid var(--rule)",
          transform: shows ? "none" : "translateY(110%)",
          transition: "transform .3s ease",
        }}
      >
        <button
          type="button"
          className="close-chip"
          style={{
            marginBottom: 8,
            minHeight: 48,
            minWidth: 48,
            borderRadius: 12,
            background: "var(--surface)",
            color: "var(--text)",
            border: "1px solid var(--rule)",
          }}
          onClick={close}
          aria-label={`Close ${label}`}
        >
          <span className="font-display text-base">Close</span>
        </button>
        {children}
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
