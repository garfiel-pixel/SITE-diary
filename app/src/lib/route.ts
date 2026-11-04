/* Hash router for Pave-Con Site Diary.
   Single source of truth for the current screen: #/ and #home render the home
   screen, #/report/YYYY-MM-DD renders the diary editor, and anything else
   (including an invalid or missing date) falls back to the home screen. */

export type Screen = "home" | "report";

export interface HomeRoute {
  screen: "home";
}

export interface ReportRoute {
  screen: "report";
  /** Validated YYYY-MM-DD. Never undefined in the "report" variant. */
  date: string;
}

export type Route = HomeRoute | ReportRoute;

const RE_DATE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

function validDate(s: string): s is string {
  if (!RE_DATE.test(s)) return false;
  const d = new Date(s + "T00:00:00");
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return false;
  return (
    d.getUTCFullYear().toString() === s.slice(0, 4) &&
    String(d.getUTCMonth() + 1).padStart(2, "0") === s.slice(5, 7) &&
    String(d.getUTCDate()).padStart(2, "0") === s.slice(8, 10)
  );
}

function parseHash(hash: string): Route {
  const trimmed = hash.startsWith("#") ? hash.slice(1) : hash;
  if (trimmed === "" || trimmed === "/" || trimmed === "/home") {
    return { screen: "home" };
  }
  if (trimmed.startsWith("/report/")) {
    const candidate = trimmed.slice("/report/".length).slice(0, 10);
    if (validDate(candidate)) {
      return { screen: "report", date: candidate };
    }
  }
  return { screen: "home" };
}

export function currentRoute(): Route {
  return parseHash(location.hash);
}

export function openReport(date: string): void {
  if (!validDate(date)) return;
  history.pushState(null, "", `#/report/${date}`);
}

export function replaceReport(date: string): void {
  if (!validDate(date)) return;
  history.replaceState(null, "", `#/report/${date}`);
  const synthetic = new HashChangeEvent("hashchange", { newURL: location.href, oldURL: location.href });
  window.dispatchEvent(synthetic);
}

export function goHome(): void {
  history.pushState(null, "", "#/");
}

export function hasHomeHistoryEntry(): boolean {
  return location.hash === "#/" || location.hash === "" || location.hash === "#home";
}

/* ---- sheet history marker ------------------------------------------- */

const SHEET_MARKER = Symbol.for("site-diary-sheet");

function createSheetEntry(): object {
  return { [SHEET_MARKER]: true } as Record<symbol, true>;
}

export function pushSheetHistory(): void {
  history.pushState(createSheetEntry(), "", location.href);
}

export function isSheetHistoryEntry(state: unknown): state is object {
  return (
    state !== null &&
    typeof state === "object" &&
    !Array.isArray(state) &&
    SHEET_MARKER in state
  );
}

/* ---- React hook ------------------------------------------------------- */

import { useEffect, useState } from "react";

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(currentRoute());
  useEffect(() => {
    const handler = () => setRoute(currentRoute());
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  return route;
}
