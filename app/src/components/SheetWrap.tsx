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
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function focusables(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLES)).filter(
    (el) =>
      el.offsetParent !== null &&
      !el.hasAttribute("disabled") &&
      el.getAttribute("aria-hidden") !== "true"
  );
}

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
  const wasOpenRef = useRef(false);
  const [shows, setShows] = useState(false);

  const closeThroughHistory = useCallback(() => {
    if (isSheetHistoryEntry(history.state)) {
      history.back();
      return;
    }
    onClosed();
  }, [onClosed]);

  /* Open: remember the opener, add a history entry, then reveal the panel.
     Close: reveal nothing and drop the history entry that belongs to it. */
  useEffect(() => {
    if (opened && !wasOpenRef.current) {
      wasOpenRef.current = true;
      openerRef.current = document.activeElement as HTMLElement | null;
      pushSheetHistory();
      setShows(true);
    } else if (!opened && wasOpenRef.current) {
      wasOpenRef.current = false;
      setShows(false);
      if (isSheetHistoryEntry(history.state)) history.back();
    }
  }, [opened]);

  /* The browser Back button (or a programmatic history.back) pops the sheet
     entry. Close the sheet without pushing another history entry. */
  useEffect(() => {
    if (!shows) return;
    const onPop = () => {
      wasOpenRef.current = false;
      setShows(false);
      onClosed();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [shows, onClosed]);

  /* Focus the first control inside the dialog on open, and return focus to
     whatever opened it when the dialog closes. */
  useEffect(() => {
    if (shows) {
      const panel = panelRef.current;
      if (!panel) return;
      const items = focusables(panel);
      (items[0] ?? panel).focus();
    } else if (openerRef.current) {
      const opener = openerRef.current;
      openerRef.current = null;
      if (document.contains(opener)) opener.focus();
    }
  }, [shows]);

  /* Escape closes; Tab and Shift+Tab can never leave the dialog. */
  useEffect(() => {
    if (!shows) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const panel = panelRef.current;
      if (!panel) return;
      if (e.key === "Escape") {
        e.preventDefault();
        closeThroughHistory();
        return;
      }
      if (e.key !== "Tab") return;

      const items = focusables(panel);
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const active = document.activeElement as HTMLElement | null;
      const idx = items.indexOf(active as HTMLElement);
      if (e.shiftKey) {
        if (idx <= 0) {
          e.preventDefault();
          items[items.length - 1]!.focus();
        }
      } else if (idx < 0 || idx === items.length - 1) {
        e.preventDefault();
        items[0]!.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [shows, closeThroughHistory]);

  const close = useCallback(() => closeThroughHistory(), [closeThroughHistory]);

  const node = (
    <div
      ref={backdropRef}
      className="k-sheet"
      data-open={shows ? "true" : "false"}
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
          maxHeight: "90svh",
          overflowY: "auto",
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
            minHeight: 56,
            minWidth: 56,
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
