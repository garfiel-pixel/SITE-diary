/* Hash router for Pave-Con Site Diary.
   Single source of truth for the current screen: #/ (or no hash) renders the
   home screen, #/report/YYYY-MM-DD renders the diary editor, and anything else
   (including an invalid or missing date) falls back to the home screen.
   location.hash is the only route state; browser Back/Forward, refresh and
   deep links all work. */

import { flushNow } from "./autosave";

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
const RE_REPORT = /^\/report\/([0-9]{4}-[0-9]{2}-[0-9]{2})$/;

function validDate(s: string): s is string {
  if (!RE_DATE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m! - 1 &&
    date.getUTCDate() === d
  );
}

function parseHash(hash: string): Route {
  const trimmed = hash.startsWith("#") ? hash.slice(1) : hash;
  if (trimmed === "" || trimmed === "/" || trimmed === "/home") {
    return { screen: "home" };
  }
  const match = RE_REPORT.exec(trimmed);
  if (match && validDate(match[1]!)) {
    return { screen: "report", date: match[1]! };
  }
  return { screen: "home" };
}

export function currentRoute(): Route {
  return parseHash(location.hash);
}

/** Tell useRoute() about a history change made with pushState/replaceState
 *  (those calls do not fire hashchange themselves). */
function notifyRoute() {
  window.dispatchEvent(new Event("hashchange"));
}

/** Flush the diary's pending 400 ms autosave before leaving the editor. */
function flushBeforeNavigate() {
  void flushNow();
}

export function openReport(date: string): void {
  if (!validDate(date)) return;
  flushBeforeNavigate();
  if (location.hash === `#/report/${date}`) return;
  history.pushState({ fromHome: true }, "", `#/report/${date}`);
  notifyRoute();
}

export function replaceReport(date: string): void {
  if (!validDate(date)) return;
  flushBeforeNavigate();
  if (location.hash === `#/report/${date}`) return;
  history.replaceState(history.state, "", `#/report/${date}`);
  notifyRoute();
}

export function goHome(): void {
  flushBeforeNavigate();
  if (currentRoute().screen === "home") return;
  history.pushState(null, "", "#/");
  notifyRoute();
}

/** "← All reports": use the browser's own Back when the editor was opened
 *  from home, otherwise replace the deep link with the home route. */
export function goAllReports(): void {
  flushBeforeNavigate();
  if (history.state && history.state.fromHome) {
    history.back();
    return;
  }
  history.pushState(null, "", "#/");
  notifyRoute();
}

export function hasHomeHistoryEntry(): boolean {
  const r = currentRoute();
  return r.screen === "home";
}

/* ---- sheet history marker ------------------------------------------- */

const SHEET_MARKER = "__siteDiarySheet";

function createSheetEntry(): object {
  return { [SHEET_MARKER]: true };
}

export function pushSheetHistory(): void {
  history.pushState(createSheetEntry(), "", location.href);
}

export function isSheetHistoryEntry(state: unknown): state is object {
  return (
    state !== null &&
    typeof state === "object" &&
    !Array.isArray(state) &&
    (state as Record<string, unknown>)[SHEET_MARKER] === true
  );
}

/* ---- React hook ------------------------------------------------------- */

import { useEffect, useState } from "react";

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(currentRoute());
  useEffect(() => {
    const handler = () =>
      setRoute((prev) => {
        const next = currentRoute();
        if (prev.screen === next.screen) {
          if (prev.screen === "home" || next.screen === "home") return prev;
          if (prev.date === next.date) return prev;
        }
        return next;
      });
    window.addEventListener("hashchange", handler);
    window.addEventListener("popstate", handler);
    return () => {
      window.removeEventListener("hashchange", handler);
      window.removeEventListener("popstate", handler);
    };
  }, []);
  return route;
}
