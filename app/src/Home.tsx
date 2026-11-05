/* Home screen — read-only index of saved reports.
   Never creates or writes a report; navigation only through lib/route. */

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, todayISO } from "./db";
import { openReport } from "./lib/route";
import { fmtDay, fmtDate } from "./lib/format";
import type { Report } from "./db";

const SYNC_TEXT: Record<Report["syncState"], string> = {
  draft: "Saved on phone",
  saved: "Ready to upload",
  uploading: "Uploading",
  uploaded: "Uploaded",
};

export function Home() {
  const reports = useLiveQuery(
    () => db.reports.orderBy("date").reverse().toArray(),
    [],
    [] as Report[]
  );

  const [otherDate, setOtherDate] = useState(todayISO());

  const today = todayISO();
  const hasAny = reports.length > 0;
  const hasToday = reports.some((r) => r.date === today);

  return (
    <section
      aria-labelledby="home-heading"
      style={{ padding: "12px 4px 80px", color: "var(--ink)" }}
    >
      <h2
        id="home-heading"
        tabIndex={-1}
        data-screen-heading
        className="font-display text-2xl mb-4"
        style={{ color: "var(--ink)" }}
      >
        Site diary
      </h2>

      <button
        type="button"
        className="chip min-h-[56px] w-full justify-center mb-5"
        style={{ fontSize: 16 }}
        data-testid="home-new-today"
        onClick={() => openReport(today)}
      >
        {hasToday ? "Open today's report" : "New report for today"}
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
          <div className="min-w-0">
            <label htmlFor="home-other-date" className="text-xs block mb-1" style={{ color: "var(--muted)" }}>
              Choose a date
            </label>
            <input
              id="home-other-date"
              type="date"
              className="min-h-[48px] w-44 max-w-full"
              value={otherDate}
              onChange={(e) => setOtherDate(e.target.value)}
              aria-label="Choose a date"
            />
          </div>
          <button
            type="button"
            className="chip min-h-[48px]"
            data-testid="home-open-other"
            style={{ flex: "0 0 auto" }}
            onClick={() => {
              if (otherDate) openReport(otherDate);
            }}
          >
            Open
          </button>
        </div>
      </fieldset>

      <h3 className="text-base font-semibold mb-2" style={{ color: "var(--ink)" }}>
        Saved reports
      </h3>

      <div
        role="region"
        aria-label="Saved reports"
        style={{
          border: "1px solid var(--rule)",
          borderRadius: 12,
          background: "var(--surface)",
          overflow: "hidden",
        }}
      >
        {!hasAny ? (
          <p className="text-sm" style={{ color: "var(--muted)", padding: "16px 12px" }}>
            No reports yet.
          </p>
        ) : (
          reports.map((r) => <HomeRow key={r.id} r={r} />)
        )}
      </div>

      <p className="mt-4 text-sm" style={{ color: "var(--muted)" }}>
        Reports stay on this phone. Your changes sync when a connection is available.
      </p>
    </section>
  );
}

function HomeRow({ r }: { r: Report }) {
  const location = [r.project, r.site].filter(Boolean).join(" · ") || "No project";
  const syncText = SYNC_TEXT[r.syncState] ?? "Saved on phone";

  return (
    <button
      type="button"
      className="w-full text-left"
      style={{
        minHeight: 56,
        padding: "10px 12px",
        border: 0,
        borderBottom: "1px solid var(--rule)",
        background: "transparent",
        color: "var(--text)",
      }}
      data-testid={`home-row-${r.date}`}
      onClick={() => openReport(r.date)}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0 flex-1">
          <span className="font-semibold text-base block break-words">
            {fmtDay(r.date)} {fmtDate(r.date)}
          </span>
          <span className="text-sm mt-0.5 block break-words" style={{ color: "var(--muted)" }}>
            {location}
          </span>
          <span className="text-xs mt-0.5 block" style={{ color: "var(--muted)" }}>
            {syncText}
          </span>
        </span>
        {r.isSample && (
          <span
            className="shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            Sample
          </span>
        )}
      </span>
    </button>
  );
}
