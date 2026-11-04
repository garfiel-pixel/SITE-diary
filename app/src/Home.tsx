/* Home screen — read-only index of saved reports.
   Never creates or writes a report; navigation only through lib/route. */

import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, reportForDate, todayISO } from "./db";
import { openReport, hasHomeHistoryEntry, useRoute } from "./lib/route";
import { Icon } from "./icons";

export function Home() {
  const { screen } = useRoute();
  const reports = useLiveQuery(
    () => db.reports.orderBy("date").reverse().toArray(),
    [],
    []
  );

  const [otherDate, setOtherDate] = useState(todayISO());
  const syncRaw = useLiveQuery(() => db.settings.get("sync.active"), [], undefined);
  const syncOn = syncRaw && syncRaw.value === "on";

  const today = todayISO();
  const hasAny = Array.isArray(reports) && reports.length > 0;
  const opensToday = hasAny && reports[0]?.date === today;

  return (
    <section aria-labelledby="home-heading" style={{ padding: "0 4px 80px", color: "var(--ink)" }}>
      <h2 id="home-heading" className="font-display text-2xl mb-4" style={{ color: "var(--ink)" }}>
        Site diary
      </h2>

      <button
        type="button"
        className="chip min-h-[56px]"
        style={{ flex: "1 1 220px", fontSize: 16 }}
        data-testid="home-new-today"
        onClick={() => {
          if (today) openReport(today);
        }}
      >
        {opensToday ? "Open today's report" : "New report for today"}
      </button>

      <fieldset
        className="min-h-[48px] mb-5"
        style={{
          border: "1px solid var(--rule)",
          borderRadius: 12,
          padding: "12px 14px",
        }}
      >
        <legend className="text-sm font-semibold mb-2" style={{ color: "var(--ink)" }}>
          Open another date
        </legend>
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label htmlFor="home-other-date" className="text-xs block mb-1" style={{ color: "var(--muted)" }}>
              Choose a date
            </label>
            <input
              id="home-other-date"
              type="date"
              className="min-h-[48px] w-44"
              value={otherDate}
              onChange={(e) => setOtherDate(e.target.value)}
              min="2000-01-01"
              max={today}
              aria-label="Choose a date"
            />
          </div>
          <button
            type="button"
            className="chip min-h-[48px]"
            data-testid="home-open-other"
            style={{ flex: "0 0 auto" }}
            disabled={!hasHomeHistoryEntry()}
            onClick={() => {
              if (otherDate) openReport(otherDate);
            }}
          >
            Open
          </button>
          <button
            type="button"
            className="chip min-h-[48px]"
            data-testid="home-set-today"
            style={{ flex: "0 0 auto" }}
            onClick={() => setOtherDate(today)}
          >
            Use today
          </button>
        </div>
      </fieldset>

      <h3 className="text-base font-semibold mb-2" style={{ color: "var(--ink)" }}>
        Saved reports
      </h3>

      <div
        role="region"
        aria-label="Saved reports"
        className="space-y-1"
        style={{
          minHeight: hasAny ? Math.max(reports.length * 64, 80) : 60,
          padding: 4,
          border: "1px solid var(--rule)",
          borderRadius: 12,
          background: "var(--surface)",
        }}
      >
        {!hasAny ? (
          <p className="text-xs" style={{ color: "var(--muted)", padding: "12px 0" }}>
            No reports yet.
          </p>
        ) : (
          reports.map((r) => (
            <HomeRow
              key={r.date}
              r={r}
              latestSync={syncOn ? new Date() : undefined}
            />
          ))
        )}
      </div>

      <p className="mt-4 text-xs" style={{ color: "var(--muted)" }}>
        Reports stay on this phone. Your changes sync when a connection is available.
      </p>
    </section>
  );
}

interface HomeRow {
  date: string;
  project: string;
  site: string;
  isSample: boolean;
  syncState: string;
}

function HomeRow({ r, latestSync }: { r: HomeRow; latestSync?: Date | null }) {
  const parts = r.date.split("-");
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
  const when =
    d instanceof Date
      ? `${dayName} ${d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`
      : r.date;

  const location = r.site ? `${r.project ? r.project + " — " : ""}${r.site}` : r.project || "No project";

  return (
    <button
      type="button"
      className="w-full text-left"
      style={{ minHeight: 56 }}
      data-testid={`home-row-${r.date}`}
      onClick={() => {
        if (r.date) openReport(r.date);
      }}
    >
      <div className="flex items-center justify-between gap-2 min-h-[56px]">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm break-all" style={{ color: "var(--ink)" }}>
            {when}
          </div>
          <div className="text-xs mt-0.5 truncate" style={{ color: "var(--muted)" }}>
            {location}
          </div>
          {latestSync && <HomeSync active>Synced {latestSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</HomeSync>}
        </div>
        {r.isSample && (
          <span
            className="shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{
              background: "var(--accent)",
              color: "var(--on-accent)",
            }}
          >
            Sample
          </span>
        )}
      </div>
    </button>
  );
}

function HomeSync({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span
      role="status"
      className="text-xs font-semibold"
      style={{ color: active ? "var(--accent)" : "var(--muted)" }}
    >
      {children}
    </span>
  );
}
