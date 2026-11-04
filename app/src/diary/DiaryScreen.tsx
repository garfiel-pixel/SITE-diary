/* The diary form — one scrolling page in paper order, sticky summary strip
   and action bar. All "less work" features live here. */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { type LossKey, type Unit, type WeatherKey } from "../config";
import {
  db,
  lastReportBefore,
  reportForDate,
  shiftDate,
  todayISO,
  bumpMemo,
  getSetting,
  setSetting,
  type WorkforcePerson,
  type EquipmentRow,
  type MaterialRow,
  type MemoRow,
  type Report,
} from "../db";
import { fmtDay, fmtFull, fmtTime, fmtBytes, fmtHours } from "../lib/format";
import { SEED } from "../seed";
import { flush } from "../sync";
import { Icon } from "../icons";
import {
  SectionCard,
  TapeSlider,
  QtyStepper,
  Lined,
  ChipRow,
} from "../components/core";
import { ToolboxSection } from "./ToolboxSection";
import { WorkforceSection } from "./WorkforceSection";
import { PhotoSection } from "./PhotoSection";
import { UndoSnackbar, type UndoMsg } from "../components/UndoSnackbar";
import { SheetWrap } from "../components/SheetWrap";
import { withTransition } from "../lib/vt";
import { tick } from "../lib/haptics";

/* ---- label maps (single definition) ---- */
export const WEATHER_LABELS: { key: WeatherKey; label: string; icon: string }[] = [
  { key: "clear", label: "Clear", icon: "clear" },
  { key: "partly", label: "Partly cloudy", icon: "partly" },
  { key: "overcast", label: "Overcast", icon: "overcast" },
  { key: "showers", label: "Showers", icon: "showers" },
  { key: "heavy", label: "Heavy rain", icon: "heavy" },
  { key: "storm", label: "Storm", icon: "storm" },
];
export const LOSS_LABELS: { key: LossKey; label: string; icon: string }[] = [
  { key: "none", label: "No time lost", icon: "none" },
  { key: "rain", label: "Rain", icon: "lossRain" },
  { key: "breakdown", label: "Breakdown", icon: "breakdown" },
  { key: "materials", label: "Late materials", icon: "lateMaterials" },
  { key: "utilities", label: "Power/water cut", icon: "utilities" },
  { key: "access", label: "Site access", icon: "access" },
  { key: "other", label: "Other", icon: "lossOther" },
];
export const UNITS: Unit[] = [
  "tonnes", "bags", "loads", "pcs", "lengths", "m³", "gal", "rolls", "kg",
];
const wLabel = (w: WeatherKey | null) =>
  WEATHER_LABELS.find((x) => x.key === w)?.label ?? "—";
const lossLabel = (l: LossKey | null) =>
  LOSS_LABELS.find((x) => x.key === l)?.label ?? "—";
const isPM = () => new Date().getHours() >= 12;
const compact = (parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(" · ") || "—";
const firstLine = (text: string) => {
  const line = text.trim().split("\n")[0] ?? "";
  return line.length > 42 ? `${line.slice(0, 41)}…` : line;
};

/** Memo-ranked values first, then the full seed catalogue (6.2). */
function catalogue(used: string[], seed: readonly string[]): string[] {
  return [...new Set([...used, ...seed])];
}

const SECTION_IDS = [
  "sec-project",
  "sec-weather",
  "sec-lost",
  "sec-equipment",
  "sec-materials",
  "sec-workforce",
  "sec-wip",
  "sec-visitors",
  "sec-instructions",
  "sec-toolbox",
  "sec-photos",
  "sec-recorded",
];

function toggle(
  open: Record<string, boolean>,
  setOpen: (f: (o: Record<string, boolean>) => Record<string, boolean>) => void,
  id: string
) {
  tick();
  setOpen((o) => ({ ...o, [id]: !o[id] }));
}

/* =================== small building blocks =================== */

/** Date navigation — available before a report exists too (6.3). */
function DateNav({ date, onDate }: { date: string; onDate: (d: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn-56 text-2xl"
          aria-label="Previous day"
          onClick={() => {
            tick();
            withTransition(() => onDate(shiftDate(date, -1)));
          }}
        >
          ‹
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => e.target.value && onDate(e.target.value)}
          aria-label="Date"
          className="btn-56 flex-1 min-w-0 px-2"
          style={{ fontSize: 16 }}
        />
        <button
          type="button"
          className="btn-56 text-2xl"
          aria-label="Next day"
          onClick={() => {
            tick();
            withTransition(() => onDate(shiftDate(date, 1)));
          }}
        >
          ›
        </button>
      </div>
      <button
        type="button"
        className="chip self-start"
        onClick={() => {
          tick();
          onDate(todayISO());
        }}
      >
        Today
      </button>
    </div>
  );
}

function SummaryNum({
  label,
  value,
  hrs,
}: {
  label: string;
  value: number;
  hrs?: boolean;
}) {
  return (
    <span className="whitespace-nowrap">
      {label}{" "}
      <b className="num">
        <span key={value} className="roll">
          {hrs ? fmtHours(Number(value.toFixed(1))) : String(value)}
        </span>
      </b>
    </span>
  );
}

function WeatherStatus({ w }: { w: WeatherKey | null }) {
  if (!w) return <span>—</span>;
  const label = wLabel(w);
  const icon = WEATHER_LABELS.find((x) => x.key === w)?.icon ?? "clear";
  return (
    <span className="inline-flex items-center gap-1">
      <Icon name={icon} size={16} /> {label}
    </span>
  );
}

function Tile({
  children,
  id,
  selected,
  onPick,
  label,
  tabIndex,
  onKeyDown,
}: {
  children: React.ReactNode;
  id: string;
  selected: boolean;
  onPick: () => void;
  label: string;
  tabIndex: number;
  onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      id={id}
      role="radio"
      aria-checked={selected}
      aria-label={label}
      tabIndex={tabIndex}
      onKeyDown={onKeyDown}
      onClick={() => {
        tick();
        onPick();
      }}
      className="chip wx-tile min-w-0"
    >
      {children}
    </button>
  );
}

function WeatherPicker({
  label,
  value,
  onChange,
  pulse,
}: {
  label: string;
  value: WeatherKey | null;
  onChange: (w: WeatherKey) => void;
  pulse?: boolean;
}) {
  const slug = label.replace(/[^a-z]/gi, "").toLowerCase();
  const checked = WEATHER_LABELS.findIndex((x) => x.key === value);
  const tabStop = checked >= 0 ? checked : 0;
  const [focusKey, setFocusKey] = useState<WeatherKey | null>(null);
  useEffect(() => {
    if (!focusKey) return;
    document.getElementById(`wx-${slug}-${focusKey}`)?.focus();
    setFocusKey(null);
  }, [focusKey, slug]);
  const move = (index: number, delta: number) => {
    const next = (index + delta + WEATHER_LABELS.length) % WEATHER_LABELS.length;
    onChange(WEATHER_LABELS[next].key);
    setFocusKey(WEATHER_LABELS[next].key);
  };
  return (
    <div role="radiogroup" aria-label={`Weather ${label}`} className="wx-picker">
      <div
        className={`wx-rail ${pulse ? "pulse-soft" : ""}`}
        data-filled={!!value}
        aria-hidden="true"
        data-testid={`weather-rail-${slug}`}
      >
        <span className="wx-rail-pulse" aria-hidden="true" />
        <Icon name={label === "A.M." ? "sun" : "moon"} size={18} />
        <span className="wx-rail-label">{label === "A.M." ? "AM" : "PM"}</span>
        <span className="wx-rail-check">
          <Icon name="check" size={12} />
        </span>
      </div>
      <div className="wx-grid">
        {WEATHER_LABELS.map((item, index) => (
          <Tile
            key={item.key}
            id={`wx-${slug}-${item.key}`}
            label={`${label} ${item.label}`}
            selected={value === item.key}
            tabIndex={index === tabStop ? 0 : -1}
            onPick={() => onChange(item.key)}
            onKeyDown={(e) => {
              const delta =
                e.key === "ArrowRight" || e.key === "ArrowDown"
                  ? 1
                  : e.key === "ArrowLeft" || e.key === "ArrowUp"
                    ? -1
                    : 0;
              if (!delta) return;
              e.preventDefault();
              move(index, delta);
            }}
          >
            <Icon name={item.icon} size={28} duo />
            <span className="wx-tile-label">{item.label}</span>
          </Tile>
        ))}
      </div>
    </div>
  );
}

function WeatherSummary({ weather }: { weather: { am: WeatherKey | null; pm: WeatherKey | null } }) {
  const part = (tag: string, value: WeatherKey | null) => {
    const item = WEATHER_LABELS.find((x) => x.key === value);
    return (
      <span className={`wx-summary-part ${item ? "" : "wx-summary-empty"}`}>
        <span className="wx-summary-tag">{tag}</span>
        {item ? (
          <>
            <Icon name={item.icon} size={16} />
            <span className="wx-summary-label">{item.label}</span>
          </>
        ) : (
          <span className="wx-summary-empty">—</span>
        )}
      </span>
    );
  };
  return (
    <span className="wx-summary" data-testid="weather-summary">
      {part("AM", weather.am)}
      {part("PM", weather.pm)}
    </span>
  );
}

/** Input with last-used chips above it; typing is the fallback. [LESS-WORK] */
function MemoInput({
  kind,
  label,
  value,
  suggestions,
  onChange,
  onCommit,
}: {
  kind: string;
  label: string;
  value: string;
  suggestions: string[];
  onChange: (v: string) => void;
  onCommit?: () => void;
}) {
  return (
    <div>
      <label className="font-display text-lg block mb-1" htmlFor={`mi-${kind}`}>
        {label}
      </label>
      <div className="flex gap-2 flex-wrap mb-1">
        {suggestions.slice(0, 5).map((s) => (
          <button
            key={s}
            type="button"
            className="chip"
            aria-label={`Use ${s} as ${label}`}
            onClick={() => {
              tick();
              onChange(s);
              void bumpMemo(kind, s);
              onCommit?.();
            }}
          >
            {s}
          </button>
        ))}
      </div>
      <input
        id={`mi-${kind}`}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          void bumpMemo(kind, value);
          onCommit?.();
        }}
        className="btn-56 w-full px-4 text-left"
        placeholder="Type…"
      />
    </div>
  );
}

/** Small bottom sheet: single input + Done. For "Other…" entries. */
function OtherSheet({
  opened,
  onClosed,
  title,
  initial,
  onDone,
}: {
  opened: boolean;
  onClosed: () => void;
  title: string;
  initial: string;
  onDone: (v: string) => void;
}) {
  const [v, setV] = useState("");
  useEffect(() => {
    if (opened) setV(initial);
  }, [opened, initial]);
  return (
    <SheetWrap opened={opened} onClosed={onClosed} label={title}>
      <span className="font-display text-2xl mb-3 block">{title}</span>
      <input
        type="text"
        value={v}
        onChange={(e) => setV(e.target.value)}
        className="btn-56 w-full px-4 mb-3"
        aria-label={title}
      />
      <button
        type="button"
        style={{
          minHeight: 64,
          borderRadius: 14,
          background: "var(--accent)",
          color: "var(--on-accent)",
          border: 0,
        }}
        className="w-full font-display text-xl"
        onClick={() => {
          onClosed();
          if (v.trim()) onDone(v.trim());
        }}
      >
        Done
      </button>
    </SheetWrap>
  );
}

/* =================== the screen =================== */

export function DiaryScreen({
  date,
  onDate,
  onSettings,
}: {
  date: string;
  onDate: (d: string) => void;
  onSettings?: () => void;
}) {
  const [r, setR] = useState<Report | null>(null);
  const [mode, setMode] = useState<"loading" | "ready" | "empty">("loading");
  const [prev, setPrev] = useState<Report | null>(null);
  const [savedAt, setSavedAt] = useState("Saved on phone");
  const [undo, setUndo] = useState<UndoMsg | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({ "sec-project": true });
  const [pdfSheet, setPdfSheet] = useState<{ name: string; bytes: number; pages: number } | null>(null);
  const [recordedError, setRecordedError] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [carryWip, setCarryWip] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [otherSheet, setOtherSheet] = useState<null | "equipment" | "material" | "visitor">(null);
  const savedTimer = useRef<number | undefined>(undefined);

  /* ---- load for date ---- */
  useEffect(() => {
    let alive = true;
    setMode("loading");
    void (async () => {
      const found = await reportForDate(date);
      const before = await lastReportBefore(date);
      if (!alive) return;
      setPrev(before ?? null);
      if (found) {
        setR(found);
        setMode("ready");
      } else {
        setR(null);
        setMode("empty");
      }
    })();
    return () => {
      alive = false;
    };
  }, [date]);

  /* ---- autosave (400 ms debounce, whole report) ---- */
  const saveSoon = useCallback((report: Report) => {
    window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(async () => {
      await db.reports.put(report);
      const asked = await getSetting<boolean>("persistAsked");
      if (!asked) {
        void navigator.storage?.persist?.();
        await setSetting("persistAsked", true);
      }
      setSavedAt(`Saved on phone · ${fmtTime(Date.now())}`);
    }, 400);
  }, []);

  const update = useCallback(
    (patch: ((r0: Report) => Partial<Report>) | Partial<Report>) => {
      setR((old) => {
        if (!old) return old;
        const p = typeof patch === "function" ? patch(old) : patch;
        const next = { ...old, ...p, updatedAt: Date.now() };
        saveSoon(next);
        return next;
      });
    },
    [saveSoon]
  );

  /* ---- memo catalogues ---- */
  const eqMemo = useLiveQuery(() => db.memo.where("kind").equals("equipment").toArray(), []);
  const matMemo = useLiveQuery(() => db.memo.where("kind").equals("material").toArray(), []);
  const tradeMemo = useLiveQuery(() => db.memo.where("kind").equals("trade").toArray(), []);
  const projMemo = useLiveQuery(() => db.memo.where("kind").equals("project").toArray(), []);
  const siteMemo = useLiveQuery(() => db.memo.where("kind").equals("site").toArray(), []);
  const recMemo = useLiveQuery(() => db.memo.where("kind").equals("recordedby").toArray(), []);
  const peopleMemo = useLiveQuery(() => db.memo.where("kind").equals("person").toArray(), []);

  const ranked = (memo: MemoRow[] | undefined): string[] =>
    (memo ?? [])
      .slice()
      .sort((a, b) => b.uses - a.uses || b.lastUsed - a.lastUsed)
      .map((m) => m.value);
  const metaOf = (memo: MemoRow[] | undefined, value: string) => memo?.find((m) => m.value === value)?.meta ?? {};
  const recName = ranked(recMemo)[0] ?? "";
  const photosCount = usePhotosCount(r ? r.id : "!loading");
  const eqCatalogue = catalogue(ranked(eqMemo), SEED.equipment.map((e) => e.name));
  const matCatalogue = catalogue(ranked(matMemo), SEED.materials.map((m) => m.name));
  const tradeCatalogue = catalogue(ranked(tradeMemo), SEED.trades.map((t) => t.name));
  const personSuggestions = ranked(peopleMemo);

  /* Live sync state (the mock uploader updates the row directly). */
  const liveSync = useLiveQuery(
    async () => (r ? (await db.reports.get(r.id))?.syncState : undefined),
    [r?.id]
  );
  const syncState = liveSync ?? r?.syncState ?? "draft";

  /* ---- copy from yesterday (6.1) ---- */
  const copyFromPrev = () => {
    if (!prev) return;
    const blank: Report = {
      id: crypto.randomUUID(),
      date,
      project: prev.project,
      site: prev.site,
      weather: { am: null, pm: null },
      timeLost: { reason: null, hours: 0 },
      equipment: prev.equipment.map((e) => ({
        id: crypto.randomUUID(),
        name: e.name,
        hours: e.hours,
      })),
      materials: [],
      workforce: {
        groups: [prev.workforce.groups[0], prev.workforce.groups[1]],
        a: prev.workforce.a.map((c) => ({ ...c, id: crypto.randomUUID() })),
        b: prev.workforce.b.map((c) => ({ ...c, id: crypto.randomUUID() })),
      },
      wip: carryWip ? prev.wip : "",
      visitors: "",
      instructions: "",
      toolbox: null,
      recordedBy: "",
      recordedAt: null,
      isSample: false,
      syncState: "draft",
      updatedAt: Date.now(),
    };
    void db.reports.put(blank);
    setR(blank);
    setMode("ready");
    setOpen((o) => ({ ...o, "sec-project": true }));
    tick();
    setUndo({
      key: Date.now(),
      msg: "Copied from yesterday",
      fn: () => {
        void db.reports.delete(blank.id);
        setUndo(null);
        setR(null);
        setMode("empty");
      },
    });
  };

  const startBlank = () => {
    const blank: Report = {
      id: crypto.randomUUID(),
      date,
      project: "",
      site: "",
      weather: { am: null, pm: null },
      timeLost: { reason: null, hours: 0 },
      equipment: [],
      materials: [],
      workforce: { groups: ["Own crew", "Subcontractors"], a: [], b: [] },
      wip: "",
      visitors: "",
      instructions: "",
      toolbox: null,
      recordedBy: "",
      recordedAt: null,
      isSample: false,
      syncState: "draft",
      updatedAt: Date.now(),
    };
    void db.reports.put(blank);
    setR(blank);
    setMode("ready");
    setOpen((o) => ({ ...o, "sec-project": true }));
  };

  /* ---- summary numbers ---- */
  const summary = useMemo(() => {
    if (!r) return { people: 0, named: 0, unnamed: 0, hours: 0, deliveries: 0, lost: 0 };
    const people = r.workforce.a.length + r.workforce.b.length;
    const named = [...r.workforce.a, ...r.workforce.b].filter((p) => p.name.trim()).length;
    return {
      people,
      named,
      unnamed: people - named,
      hours: r.equipment.reduce((n, e) => n + e.hours, 0),
      deliveries: r.materials.length,
      lost: r.timeLost.reason === "none" ? 0 : r.timeLost.hours,
    };
  }, [r]);

  /* ---- add / delete rows ---- */
  const addEquipmentRow = (name: string) => {
    const meta = metaOf(eqMemo, name);
    const hours = meta.hours ?? defaultHours(name);
    update((old) => ({
      equipment: [...old.equipment, { id: crypto.randomUUID(), name, hours }],
    }));
    void bumpMemo("equipment", name, { hours });
    tick();
  };
  const addMaterialRow = (name: string, unit?: Unit) => {
    const meta = metaOf(matMemo, name);
    const seedUnit = SEED.materials.find((m) => m.name === name)?.unit;
    update((old) => ({
      materials: [
        ...old.materials,
        {
          id: crypto.randomUUID(),
          name,
          qty: meta.qty ?? 0,
          unit: unit ?? (meta.unit as Unit) ?? seedUnit ?? "loads",
        },
      ],
    }));
    void bumpMemo("material", name);
    tick();
  };
  const addPerson = (grp: "a" | "b", name: string, role: string) => {
    const person: WorkforcePerson = {
      id: crypto.randomUUID(),
      name: name.trim(),
      role: role.trim(),
    };
    update((old) => ({
      workforce: {
        ...old.workforce,
        [grp]: [...old.workforce[grp], person],
      },
    }));
    void bumpMemo("person", person.name);
    void bumpMemo("trade", person.role);
    tick();
  };

  const editPerson = (grp: "a" | "b", id: string, name: string, role: string) => {
    update((old) => ({
      workforce: {
        ...old.workforce,
        [grp]: old.workforce[grp].map((p) =>
          p.id === id ? { ...p, name: name.trim(), role: role.trim() } : p
        ),
      },
    }));
    void bumpMemo("person", name);
    void bumpMemo("trade", role);
    tick();
  };

  /* Delete is immediate; Undo restores the row at its original position. */
  const deleteRow = (list: "equipment" | "materials", id: string) => {
    if (!r) return;
    const rows = list === "equipment" ? r.equipment : r.materials;
    const index = rows.findIndex((x) => x.id === id);
    if (index < 0) return;
    const row = rows[index]!;
    const rowName = row.name;

    const remove = (old: Report): Partial<Report> =>
      list === "equipment"
        ? { equipment: old.equipment.filter((x) => x.id !== id) }
        : { materials: old.materials.filter((x) => x.id !== id) };

    const restore = (old: Report): Partial<Report> => {
      if (list === "equipment") {
        const next = [...old.equipment];
        next.splice(index, 0, row as EquipmentRow);
        return { equipment: next };
      }
      const next = [...old.materials];
      next.splice(index, 0, row as MaterialRow);
      return { materials: next };
    };

    update(remove);
    setUndo({
      key: Date.now(),
      msg: `${rowName} removed — tap Undo to restore`,
      fn: () => {
        update(restore);
        setUndo(null);
      },
    });
  };

  const deletePerson = (grp: "a" | "b", id: string) => {
    if (!r) return;
    const index = r.workforce[grp].findIndex((p) => p.id === id);
    if (index < 0) return;
    const person = r.workforce[grp][index]!;
    const wasPresent = r.toolbox?.presentIds.includes(id) ?? false;
    const label = person.name.trim() || person.role;

    const remove = (old: Report): Partial<Report> => ({
      workforce: {
        ...old.workforce,
        [grp]: old.workforce[grp].filter((p) => p.id !== id),
      },
      toolbox: old.toolbox
        ? {
            ...old.toolbox,
            presentIds: old.toolbox.presentIds.filter((pid) => pid !== id),
          }
        : null,
    });

    const restore = (old: Report): Partial<Report> => {
      const next = [...old.workforce[grp]];
      next.splice(index, 0, person);
      return {
        workforce: { ...old.workforce, [grp]: next },
        toolbox: old.toolbox
          ? {
              ...old.toolbox,
              presentIds: wasPresent
                ? [...new Set([...old.toolbox.presentIds, id])]
                : old.toolbox.presentIds,
            }
          : null,
      };
    };

    update(remove);
    setUndo({
      key: Date.now(),
      msg: `${label} removed — tap Undo to restore`,
      fn: () => {
        update(restore);
        setUndo(null);
      },
    });
  };

  /* Stable callbacks let memoised equipment rows skip re-rendering while a
     tape drag updates its neighbour. */
  const deleteRowRef = useRef(deleteRow);
  deleteRowRef.current = deleteRow;
  const removeEquipment = useCallback(
    (id: string) => withTransition(() => deleteRowRef.current("equipment", id)),
    []
  );
  const setEquipmentHours = useCallback(
    (id: string, v: number) =>
      update((old) => ({
        equipment: old.equipment.map((row) =>
          row.id === id ? { ...row, hours: v } : row
        ),
      })),
    [update]
  );

  /* ---- work in progress chips ---- */
  const wipChips = SEED.wipChips;
  const instrChips = SEED.instructionChips;
  const visitorChips = SEED.visitorChips;
  const stampTime = (text: string, chip: string) =>
    (text && !text.endsWith("\n") ? text + "\n" : text) + `${fmtTime(Date.now())} ${chip} — `;

  /* ---- completeness (6.5) ---- */
  const complete = {
    weather: !!(r?.weather.am && r?.weather.pm),
    workforce: (r?.workforce.a.length ?? 0) + (r?.workforce.b.length ?? 0) > 0,
    wip: !!r?.wip.trim(),
    recorded: !!r?.recordedBy.trim(),
  };
  const sectionProgress = {
    project: (r?.project.trim() ? 0.5 : 0) + (r?.site.trim() ? 0.5 : 0),
    weather: (Number(!!r?.weather.am) + Number(!!r?.weather.pm)) / 2,
    lost: r?.timeLost.reason ? 1 : 0,
    equipment: r?.equipment.length ? 1 : 0,
    materials: r?.materials.length ? 1 : 0,
    workforce: complete.workforce ? 1 : 0,
    wip: complete.wip ? 1 : 0,
    visitors: r?.visitors.trim() ? 1 : 0,
    instructions: r?.instructions.trim() ? 1 : 0,
    toolbox: r?.toolbox?.topic ? 1 : 0,
    photos: photosCount > 0 ? 1 : 0,
    recorded: complete.recorded ? 1 : 0,
  };
  const isDone = (key: keyof typeof sectionProgress) => sectionProgress[key] === 1;
  const scrollTo = (id: string) => {
    setOpen((o) => ({ ...o, [id]: true }));
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      el?.classList.remove("pulse-target");
      requestAnimationFrame(() => el?.classList.add("pulse-target"));
    });
  };

  /* ---- create PDF ---- */
  const createPdf = async () => {
    if (!r?.recordedBy.trim()) {
      setRecordedError(true);
      scrollTo("sec-recorded");
      return;
    }
    setRecordedError(false);
    setPdfError(null);
    setBuilding(true);
    try {
      // Lazy-load pdfmake + embedded fonts so first paint stays small.
      const { buildPdf } = await import("../pdf/build");
      const photos = await db.photos.where("reportId").equals(r.id).toArray();
      await bumpMemo("recordedby", r.recordedBy);
      if (r.project) await bumpMemo("project", r.project);
      if (r.site) await bumpMemo("site", r.site);
      for (const e of r.equipment) await bumpMemo("equipment", e.name, { hours: e.hours });
      for (const m of r.materials) await bumpMemo("material", m.name, { qty: m.qty, unit: m.unit });
      for (const p of [...r.workforce.a, ...r.workforce.b]) {
        await bumpMemo("person", p.name);
        await bumpMemo("trade", p.role);
      }

      /* Stamp the time BEFORE rendering so the first PDF prints it too. */
      const withStamp: Report = {
        ...r,
        recordedAt: r.recordedAt ?? Date.now(),
        syncState: r.syncState === "draft" ? "saved" : r.syncState,
      };
      const out = await buildPdf(withStamp, photos);
      setR(withStamp);
      await db.reports.put(withStamp);
      pdfBlobRef.current = out.blob;
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = URL.createObjectURL(out.blob);
      withTransition(() => setPdfSheet({ name: out.name, bytes: out.bytes, pages: out.pages }));
      tick();
      // The report is queued for the mock upload; try now if we are online.
      void flush();
    } catch (err) {
      setPdfError(
        err instanceof Error ? err.message : "Could not create the PDF. Try again."
      );
    } finally {
      setBuilding(false);
    }
  };
  const pdfUrlRef = useRef<string | null>(null);
  const pdfBlobRef = useRef<Blob | null>(null);
  useEffect(
    () => () => {
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    },
    []
  );

  /* Active-section highlight for the completeness chips (6.5). */
  useEffect(() => {
    if (mode !== "ready") return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { rootMargin: "-140px 0px -45% 0px", threshold: [0, 0.25] }
    );
    for (const id of SECTION_IDS) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [mode, r?.id]);

  /* photos + rows publish undo actions on a custom event */
  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail as {
        key: number;
        msg: string;
        perform: () => void | Promise<void>;
      };
      setUndo({
        key: d.key,
        msg: d.msg,
        fn: () => {
          void d.perform();
          setUndo(null);
        },
      });
    };
    window.addEventListener("diary-undo", handler);
    return () => window.removeEventListener("diary-undo", handler);
  }, []);

  /* No awaits before share(): phones only allow navigator.share directly
     after the tap (transient activation). The blob is already in memory. */
  const sharePdf = async () => {
    const blob = pdfBlobRef.current;
    if (!blob) return;
    const name = pdfSheet?.name ?? "site-diary.pdf";
    const file = new File([blob], name, { type: "application/pdf" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: name });
      } catch (err) {
        if ((err as Error).name !== "AbortError")
          setPdfError("Sharing was refused — use Save to phone instead.");
      }
    } else {
      savePdf();
    }
  };
  const savePdf = () => {
    if (!pdfUrlRef.current) return;
    const a = document.createElement("a");
    a.href = pdfUrlRef.current;
    a.download = pdfSheet?.name ?? "site-diary.pdf";
    a.rel = "noopener";
    a.click();
  };

  /* ==================== render ==================== */
  if (mode === "loading")
    return (
      <p className="p-6 text-sm" style={{ color: "var(--muted)" }}>
        Loading diary…
      </p>
    );

  if (mode === "empty") {
    return (
      <div className="p-4 max-w-3xl mx-auto">
        <div className="card p-4" id="newday-card">
          <h2 className="font-display text-2xl mb-1">New day</h2>
          <p className="text-sm mb-2" style={{ color: "var(--muted)" }}>
            {fmtFull(date)} · {fmtDay(date)}
          </p>
          <div className="mb-4">
            <DateNav date={date} onDate={onDate} />
          </div>
          {prev ? (
            <>
              <button
                type="button"
                data-testid="copy-from-yesterday"
                className="w-full font-display text-2xl"
                style={{
                  minHeight: 64,
                  borderRadius: 14,
                  background: "var(--accent)",
                  color: "var(--on-accent)",
                  border: 0,
                }}
                onClick={copyFromPrev}
              >
                Copy from {fmtDay(prev.date)} ({fmtFull(prev.date).split(", ")[1]}) →
              </button>
              <button
                type="button"
                className={`chip mt-2 ${carryWip ? "on" : ""}`}
                aria-pressed={carryWip}
                data-testid="carry-wip"
                onClick={() => setCarryWip((v) => !v)}
              >
                <Icon name={carryWip ? "check" : "plus"} size={16} />
                Include work in progress
              </button>
              <p className="text-xs my-3" style={{ color: "var(--muted)" }}>
                Carries project, site, workforce and equipment. Never weather, time lost,
                materials, visitors, instructions, toolbox or photos. Work in progress is
                carried only when the chip above is on.
              </p>
            </>
          ) : null}
          <button type="button" data-testid="start-blank" className="chip" onClick={startBlank}>
            Start blank page
          </button>
        </div>
      </div>
    );
  }

  if (!r) return null;

  return (
    <div className="max-w-3xl mx-auto">
      {/* sticky summary strip, directly under the live header height */}
      <div
        className="summary-strip sticky z-30"
        style={{ top: "var(--header-h, 96px)" }}
        aria-live="polite"
        data-testid="summary-strip"
      >
        <div className="px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold">
          <SummaryNum label="People" value={summary.people} />
          <SummaryNum label="Equipment" value={summary.hours} hrs />
          <SummaryNum label="Deliveries" value={summary.deliveries} />
          <SummaryNum label="Time lost" value={summary.lost} hrs />
          <span
            className="ml-auto whitespace-nowrap text-xs inline-flex items-center gap-1 shrink-0"
            data-testid="sync-state"
            data-state={syncState}
          >
            <Icon
              name={
                syncState === "uploaded"
                  ? "cloudDone"
                  : syncState === "uploading"
                    ? "cloudUploading"
                    : "cloudSaved"
              }
              size={16}
            />
            {syncState === "uploaded"
              ? "Uploaded"
              : syncState === "uploading"
                ? "Uploading"
                : "Saved on phone"}
          </span>
        </div>
      </div>

      {r.isSample && (
        <div className="px-4 pt-3 flex items-center gap-3 flex-wrap">
          <span className="ribbon-sample">SAMPLE DATA</span>
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            Fictional sample report. Any new day you start is clean.
          </span>
        </div>
      )}

      <div className="px-3 pt-2 flex flex-col gap-3 pb-56">
        {/* 1. Project / Site / Day / Date -------------------------------- */}
        <SectionCard
          id="sec-project"
          title="Project / Date"
          icon="calendar"
          summary={compact([r.project, r.site])}
          done={isDone("project")}
          progress={sectionProgress.project}
          open={open["sec-project"]}
          onToggle={() => toggle(open, setOpen, "sec-project")}
        >
          <div className="flex flex-col gap-3">
            <MemoInput
              kind="project"
              label="Project"
              value={r.project}
              suggestions={ranked(projMemo)}
              onChange={(v) => update({ project: v })}
            />
            <MemoInput
              kind="site"
              label="Site"
              value={r.site}
              suggestions={ranked(siteMemo)}
              onChange={(v) => update({ site: v })}
            />
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Day: <b style={{ color: "var(--text)" }}>{fmtDay(date)}</b> (from the date)
            </p>
            <DateNav date={date} onDate={onDate} />
          </div>
        </SectionCard>

        {/* 2. Weather ------------------------------------------------------ */}
        <SectionCard
          id="sec-weather"
          title="Weather"
          icon="partly"
          summary={<WeatherSummary weather={r.weather} />}
          done={isDone("weather")}
          progress={sectionProgress.weather}
          open={open["sec-weather"]}
          onToggle={() => toggle(open, setOpen, "sec-weather")}
        >
          <WeatherPicker
            label="A.M."
            value={r.weather.am}
            onChange={(v) => update({ weather: { ...r.weather, am: v } })}
          />
          <div className="h-3" />
          <WeatherPicker
            label="P.M."
            value={r.weather.pm}
            pulse={!r.weather.pm && isPM()}
            onChange={(v) => update({ weather: { ...r.weather, pm: v } })}
          />
        </SectionCard>

        {/* 3. Time lost ---------------------------------------------------- */}
        <SectionCard
          id="sec-lost"
          title="Time lost"
          icon="clock"
          summary={
            r.timeLost.reason
              ? `${lossLabel(r.timeLost.reason)} · ${r.timeLost.reason === "none" ? "0 h" : fmtHours(r.timeLost.hours)}`
              : "—"
          }
          done={isDone("lost")}
          progress={sectionProgress.lost}
          open={open["sec-lost"]}
          onToggle={() => toggle(open, setOpen, "sec-lost")}
        >
          <ReasonPicker
            value={r.timeLost.reason}
            onPick={(reason: LossKey) =>
              update({ timeLost: { reason, hours: reason === "none" ? 0 : r.timeLost.hours || 1 } })
            }
          />
          {r.timeLost.reason && r.timeLost.reason !== "none" && (
            <div className="mt-3">
              <span className="font-display text-lg">Hours</span>
              <TapeSlider
                label="Time lost hours"
                args={{
                  min: 0,
                  max: 24,
                  step: 0.5,
                  value: r.timeLost.hours,
                  unit: "h",
                  onChange: (v) => update({ timeLost: { ...r.timeLost, hours: v } }),
                }}
              />
            </div>
          )}
        </SectionCard>

        {/* 4. Equipment ---------------------------------------------------- */}
        <SectionCard
          id="sec-equipment"
          title="Equipment on site"
          icon="roller"
          summary={r.equipment.length ? `${r.equipment.length} machines · ${fmtHours(r.equipment.reduce((n, e) => n + e.hours, 0))}` : "—"}
          done={isDone("equipment")}
          progress={sectionProgress.equipment}
          open={open["sec-equipment"]}
          onToggle={() => toggle(open, setOpen, "sec-equipment")}
        >
          <ChipRow
            chips={eqCatalogue.filter((v) => !r.equipment.some((e) => e.name === v))}
            onPick={(name) => withTransition(() => addEquipmentRow(name))}
            onOther={() => setOtherSheet("equipment")}
          />
          <div className="mt-3 flex flex-col gap-2">
            {r.equipment.map((e) => (
              <EquipmentRowView
                key={e.id}
                row={e}
                onHours={setEquipmentHours}
                onDelete={removeEquipment}
              />
            ))}
          </div>
        </SectionCard>

        {/* 5. Materials ---------------------------------------------------- */}
        <SectionCard
          id="sec-materials"
          title="Materials delivered"
          icon="matAsphalt"
          summary={r.materials.length ? `${r.materials.length} deliveries` : "—"}
          done={isDone("materials")}
          progress={sectionProgress.materials}
          open={open["sec-materials"]}
          onToggle={() => toggle(open, setOpen, "sec-materials")}
        >
          <ChipRow
            chips={matCatalogue.filter((v) => !r.materials.some((m) => m.name === v))}
            onPick={(name) => withTransition(() => addMaterialRow(name))}
            onOther={() => setOtherSheet("material")}
          />
          <div className="mt-3 flex flex-col gap-2">
            {r.materials.map((m) => (
              <div key={m.id} className="row-vt card p-2" style={{ borderColor: "var(--rule)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <b className="flex-1">{m.name}</b>
                  <button
                    type="button"
                    aria-label={`Remove ${m.name}`}
                    className="btn-56 !min-h-10 !min-w-10"
                    onClick={() => withTransition(() => deleteRow("materials", m.id))}
                  >
                    <Icon name="trash" size={18} />
                  </button>
                </div>
                <QtyStepper
                  qty={m.qty}
                  unit={m.unit}
                  units={UNITS}
                  onQty={(v) =>
                    update((old) => ({
                      materials: old.materials.map((row) =>
                        row.id === m.id ? { ...row, qty: v } : row
                      ),
                    }))
                  }
                  onUnit={(u) =>
                    update((old) => ({
                      materials: old.materials.map((row) =>
                        row.id === m.id ? { ...row, unit: u as Unit } : row
                      ),
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </SectionCard>

        {/* 6. Workforce ---------------------------------------------------- */}
        <SectionCard
          id="sec-workforce"
          title="Workforce"
          icon="users"
          summary={
            summary.unnamed > 0
              ? `${summary.named} named · ${summary.unnamed} unnamed`
              : `${summary.people} on site`
          }
          done={isDone("workforce")}
          progress={sectionProgress.workforce}
          open={open["sec-workforce"]}
          onToggle={() => toggle(open, setOpen, "sec-workforce")}
        >
          <WorkforceSection
            workforce={r.workforce}
            roleCatalogue={tradeCatalogue}
            nameSuggestions={personSuggestions}
            onAddPerson={(grp, name, role) =>
              withTransition(() => addPerson(grp, name, role))
            }
            onEditPerson={(grp, id, name, role) =>
              withTransition(() => editPerson(grp, id, name, role))
            }
            onDeletePerson={(grp, id) =>
              withTransition(() => deletePerson(grp, id))
            }
            onGroups={(groups) =>
              update((old) => ({ workforce: { ...old.workforce, groups } }))
            }
          />
        </SectionCard>

        {/* 7. Work in progress --------------------------------------------- */}
        <SectionCard
          id="sec-wip"
          title="Work in progress"
          icon="grader"
          summary={r.wip.trim() ? firstLine(r.wip) : "—"}
          done={isDone("wip")}
          progress={sectionProgress.wip}
          open={open["sec-wip"]}
          onToggle={() => toggle(open, setOpen, "sec-wip")}
        >
          <Lined
            label="Work in progress"
            value={r.wip}
            onChange={(v) => update({ wip: v })}
            chips={wipChips}
            lines={3}
          />
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Tip: your phone keyboard's own dictation mic works offline.
          </p>
        </SectionCard>

        {/* 8. Visitors ------------------------------------------------------ */}
        <SectionCard
          id="sec-visitors"
          title="Visitors"
          icon="user"
          summary={r.visitors.trim() ? firstLine(r.visitors) : "—"}
          done={isDone("visitors")}
          progress={sectionProgress.visitors}
          open={open["sec-visitors"]}
          onToggle={() => toggle(open, setOpen, "sec-visitors")}
        >
          <Lined
            label="Visitors"
            value={r.visitors}
            onChange={(v) => update({ visitors: v })}
            chips={visitorChips}
            onChip={(chip) => stampTime(r.visitors, chip)}
            lines={2}
          />
        </SectionCard>

        {/* 9. Instructions -------------------------------------------------- */}
        <SectionCard
          id="sec-instructions"
          title="Instructions"
          icon="warning"
          summary={r.instructions.trim() ? firstLine(r.instructions) : "—"}
          done={isDone("instructions")}
          progress={sectionProgress.instructions}
          open={open["sec-instructions"]}
          onToggle={() => toggle(open, setOpen, "sec-instructions")}
        >
          <Lined
            label="Instructions"
            value={r.instructions}
            onChange={(v) => update({ instructions: v })}
            chips={instrChips}
            lines={2}
          />
        </SectionCard>

        {/* 10. Toolbox talk -------------------------------------------------- */}
        <SectionCard
          id="sec-toolbox"
          title="Toolbox talk"
          icon="users"
          summary={r.toolbox?.topic ? r.toolbox.topic : "—"}
          done={isDone("toolbox")}
          progress={sectionProgress.toolbox}
          open={open["sec-toolbox"]}
          onToggle={() => toggle(open, setOpen, "sec-toolbox")}
        >
          <ToolboxSection
            toolbox={r.toolbox}
            people={[...r.workforce.a, ...r.workforce.b]}
            onChange={(toolbox) => update({ toolbox })}
            onOpenWorkforce={() => scrollTo("sec-workforce")}
          />
        </SectionCard>

        {/* 11. Photos -------------------------------------------------------- */}
        <SectionCard
          id="sec-photos"
          title="Photos"
          icon="camera"
          summary={photosCount > 0 ? `${photosCount} photos` : "—"}
          done={isDone("photos")}
          progress={sectionProgress.photos}
          open={open["sec-photos"]}
          onToggle={() => toggle(open, setOpen, "sec-photos")}
        >
          <PhotoSection reportId={r.id} />
        </SectionCard>

        {/* 12. Recorded by (blank at the bottom right, like the paper form) --- */}
        <SectionCard
          id="sec-recorded"
          title="Recorded by"
          icon="user"
          summary={r.recordedBy ? r.recordedBy : "required"}
          done={isDone("recorded")}
          progress={sectionProgress.recorded}
          open={open["sec-recorded"]}
          onToggle={() => toggle(open, setOpen, "sec-recorded")}
          tone={recordedError ? "alert" : undefined}
        >
          {recName && (
            <div className="mb-2">
              <button type="button" className="chip" onClick={() => update({ recordedBy: recName })}>
                Use {recName}?
              </button>
            </div>
          )}
          <label htmlFor="rec-by" className="font-display text-lg block mb-1">
            Recorded by
          </label>
          <input
            id="rec-by"
            data-testid="recorded-by"
            type="text"
            value={r.recordedBy}
            onChange={(e) => {
              update({ recordedBy: e.target.value });
              if (e.target.value.trim()) setRecordedError(false);
            }}
            onBlur={() => r.recordedBy.trim() && bumpMemo("recordedby", r.recordedBy.trim())}
            className="btn-56 w-full px-4 text-left"
            placeholder="Type your name…"
          />
          {recordedError && (
            <p className="flex items-center gap-2 mt-2 font-semibold" role="alert">
              <Icon name="warning" size={18} /> Recorded by is required before the PDF can be
              created.
            </p>
          )}
          <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
            {r.recordedAt ? `Recorded ${fmtFull(r.date)} at ${fmtTime(r.recordedAt)}` : ""}
          </p>
        </SectionCard>
      </div>

      {/* ===== sticky action bar (6.5) ===== */}
      <div
        className="fixed left-0 right-0 z-40 p-2 px-3"
        style={{
          bottom: 0,
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)",
          background: "var(--surface)",
          borderTop: "1px solid var(--rule)",
        }}
      >
        <div className="max-w-3xl mx-auto flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <StatusChip
              done={complete.weather}
              label="Weather"
              active={activeSection === "sec-weather"}
              onJump={() => scrollTo("sec-weather")}
            />
            <StatusChip
              done={complete.workforce}
              label="Workforce"
              active={activeSection === "sec-workforce"}
              onJump={() => scrollTo("sec-workforce")}
            />
            <StatusChip
              done={complete.wip}
              label="Work in progress"
              active={activeSection === "sec-wip"}
              onJump={() => scrollTo("sec-wip")}
            />
            <StatusChip
              done={complete.recorded}
              label="Recorded by"
              active={activeSection === "sec-recorded"}
              onJump={() => scrollTo("sec-recorded")}
            />
          </div>
          <button
            type="button"
            data-testid="create-pdf"
            disabled={building}
            className="w-full font-display text-xl"
            style={{
              minHeight: 56,
              borderRadius: 14,
              background: "var(--accent)",
              color: "var(--on-accent)",
              border: 0,
            }}
            onClick={() => void createPdf()}
          >
            {building ? "Building…" : "Create PDF"}
          </button>
        </div>
      </div>

      {/* ===== PDF result sheet ===== */}
      <SheetWrap opened={!!pdfSheet} onClosed={() => setPdfSheet(null)} label="Report ready">
        {pdfSheet && (
          <>
            <span
              className="inline-flex items-center gap-2 mb-2 text-sm font-semibold"
              data-testid="pdf-state"
            >
              <Icon name="check" size={18} /> {syncState === "uploaded" ? "Uploaded" : syncState === "uploading" ? "Uploading" : "Saved on phone"}
            </span>
            <span className="font-display text-xl block mb-1 break-all">{pdfSheet.name}</span>
            <span className="text-sm block mb-3" style={{ color: "var(--muted)" }}>
              {fmtBytes(pdfSheet.bytes)} · {pdfSheet.pages} page{pdfSheet.pages === 1 ? "" : "s"}
            </span>
            {typeof navigator.share === "function" && (
              <button
                type="button"
                className="w-full font-display text-xl mb-2"
                style={{
                  minHeight: 56,
                  borderRadius: 14,
                  background: "var(--accent)",
                  color: "var(--on-accent)",
                  border: 0,
                }}
                onClick={() => void sharePdf()}
              >
                Share / Send
              </button>
            )}
            <button type="button" className="chip w-full justify-center" onClick={savePdf}>
              Save to phone
            </button>
          </>
        )}
      </SheetWrap>

      {/* ===== Other… sheets ===== */}
      <OtherSheet
        opened={otherSheet !== null}
        onClosed={() => setOtherSheet(null)}
        title={
          otherSheet === "equipment"
            ? "Other equipment"
            : otherSheet === "material"
              ? "Other material"
              : "Other visitor"
        }
        initial=""
        onDone={(v) => {
          if (otherSheet === "equipment") addEquipmentRow(v);
          if (otherSheet === "material") addMaterialRow(v);
          if (otherSheet === "visitor") update((old) => ({ visitors: stampTime(old.visitors, v) }));
        }}
      />

      <UndoSnackbar undo={undo} onTimeout={() => setUndo(null)} />

      {pdfError && (
        <div
          role="alert"
          data-testid="pdf-error"
          className="fixed left-3 right-3 z-50 p-3 rounded-xl shadow-lg flex items-center gap-3"
          style={{
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)",
            background: "var(--band)",
            color: "var(--on-band)",
          }}
        >
          <Icon name="warning" size={20} />
          <span className="text-sm font-semibold flex-1">{pdfError}</span>
          <button
            type="button"
            className="font-display text-lg"
            style={{ color: "var(--accent)" }}
            onClick={() => setPdfError(null)}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

/* Memoised so dragging one ruler does not re-render the other rows. */
const EquipmentRowView = memo(function EquipmentRowView({
  row,
  onHours,
  onDelete,
}: {
  row: EquipmentRow;
  onHours: (id: string, v: number) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="row-vt card p-2" style={{ borderColor: "var(--rule)" }}>
      <div className="flex items-center gap-2 mb-1">
        <Icon name={equipmentIcon(row.name)} size={20} duo />
        <b className="flex-1">{row.name}</b>
        <button
          type="button"
          aria-label={`Remove ${row.name}`}
          className="btn-56 !min-h-10 !min-w-10"
          onClick={() => onDelete(row.id)}
        >
          <Icon name="trash" size={18} />
        </button>
      </div>
      <TapeSlider
        label={`${row.name} hours`}
        args={{
          min: 0,
          max: 24,
          step: 0.5,
          value: row.hours,
          unit: "h",
          onChange: (v) => onHours(row.id, v),
        }}
      />
    </div>
  );
});

/* equipment default hours by name (seed batch) */
function defaultHours(name: string): number {
  const map: Record<string, number> = {
    Paver: 8,
    "Roller (steel drum)": 8,
    "Roller (pneumatic)": 6,
    "Milling machine": 8,
    Grader: 8,
    Excavator: 8,
    Backhoe: 8,
    "Tipper truck": 8,
    "Water bowser": 6,
    Compactor: 4,
    Bobcat: 8,
    "Concrete mixer": 6,
    Generator: 8,
  };
  return map[name] ?? 8;
}

function StatusChip({
  done,
  label,
  active,
  onJump,
}: {
  done: boolean;
  label: string;
  active?: boolean;
  onJump: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        tick();
        onJump();
      }}
      data-active={active ? "true" : "false"}
      aria-label={`${label}: ${done ? "complete" : "not yet"} — jump to section`}
      className="chip !min-h-10 shrink-0"
      style={{ fontSize: 13 }}
    >
      {done ? (
        <Icon name="check" size={16} />
      ) : (
        <span
          aria-hidden
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            border: "2px solid currentColor",
            display: "inline-block",
          }}
        />
      )}
      {label}
    </button>
  );
}

/* Time-lost reason picker (radiogroup of chips with icon + word). */
function ReasonPicker({
  value,
  onPick,
}: {
  value: LossKey | null;
  onPick: (k: LossKey) => void;
}) {
  const checked = LOSS_LABELS.findIndex((x) => x.key === value);
  const tabStop = checked >= 0 ? checked : 0;
  const move = (index: number, delta: number) => {
    const next = (index + delta + LOSS_LABELS.length) % LOSS_LABELS.length;
    onPick(LOSS_LABELS[next].key);
    requestAnimationFrame(() => {
      document.getElementById(`loss-${LOSS_LABELS[next].key}`)?.focus();
    });
  };
  return (
    <div role="radiogroup" aria-label="Reason for time lost" className="flex gap-2 flex-wrap">
      {LOSS_LABELS.map((item, index) => (
        <button
          key={item.key}
          id={`loss-${item.key}`}
          type="button"
          role="radio"
          aria-checked={value === item.key}
          tabIndex={index === tabStop ? 0 : -1}
          className="chip"
          onClick={() => {
            tick();
            onPick(item.key);
          }}
          onKeyDown={(e) => {
            const delta =
              e.key === "ArrowRight" || e.key === "ArrowDown"
                ? 1
                : e.key === "ArrowLeft" || e.key === "ArrowUp"
                  ? -1
                  : 0;
            if (!delta) return;
            e.preventDefault();
            move(index, delta);
          }}
        >
          <Icon name={item.icon} size={20} duo />
          {item.label}
        </button>
      ))}
    </div>
  );
}

/* equipment icon by name */
function equipmentIcon(name: string): string {
  const map: Record<string, string> = {
    paver: "paver",
    roller: "roller",
    tipper: "tipper",
    "milling machine": "miller",
    miller: "miller",
    grader: "grader",
    excavator: "excavator",
    backhoe: "backhoe",
    "water bowser": "bowser",
    bowser: "bowser",
    compactor: "roller",
    bobcat: "bobcat",
    "concrete mixer": "mixer",
    mixer: "mixer",
    generator: "generator",
    crane: "crane",
    "tipper truck": "tipper",
  };
  return map[name.trim().toLowerCase()] ?? "eqOther";
}

function usePhotosCount(reportId: string) {
  const n = useLiveQuery(() => db.photos.where("reportId").equals(reportId).count(), [reportId], 0);
  return n ?? 0;
}
