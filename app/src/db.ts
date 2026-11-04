/* Dexie is the only store in the app. No localStorage except the tiny
   pre-paint theme flag in index.html. */

import Dexie, { type EntityTable } from "dexie";
import type { WeatherKey, LossKey, Unit } from "./config";

export type SyncState = "draft" | "saved" | "uploading" | "uploaded";

export interface EquipmentRow {
  id: string;
  name: string;
  hours: number;
}
export interface MaterialRow {
  id: string;
  name: string;
  qty: number;
  unit: Unit;
}
export interface Crew {
  id: string;
  name: string;
  count: number;
}
export interface Toolbox {
  topic: string;
  presenter: string;
  time: string;
  presentIds: string[];
  notes: string;
}

export interface Report {
  id: string; // crypto.randomUUID()
  date: string; // "YYYY-MM-DD"
  project: string;
  site: string;
  weather: { am: WeatherKey | null; pm: WeatherKey | null };
  timeLost: { reason: LossKey | null; hours: number };
  equipment: EquipmentRow[];
  materials: MaterialRow[];
  workforce: { groups: [string, string]; a: Crew[]; b: Crew[] };
  wip: string;
  visitors: string;
  instructions: string;
  toolbox: Toolbox | null;
  recordedBy: string;
  recordedAt: number | null;
  isSample: boolean;
  syncState: SyncState;
  updatedAt: number;
}

export interface PhotoRow {
  id: string;
  reportId: string;
  groupId: string | null; // bundle sharing one caption
  blob: Blob;
  w: number;
  h: number;
  description: string;
  takenAt: number;
}

export interface MemoRow {
  kind: string; // "equipment" | "material" | "trade" | "topic" | "presenter" | "project" | "site" | "recordedby" | "visitor"
  value: string;
  uses: number;
  lastUsed: number;
  meta?: {
    hours?: number;
    qty?: number;
    unit?: Unit;
    count?: number;
  };
}

export class DiaryDB extends Dexie {
  reports!: EntityTable<Report, "id">;
  photos!: EntityTable<PhotoRow, "id">;
  register!: EntityTable<{ id: string; name: string }, "id">;
  memo!: EntityTable<MemoRow, never>;
  settings!: EntityTable<{ key: string; value: unknown }, "key">;

  constructor() {
    super("pavecon-site-diary");
    this.version(1).stores({
      reports: "id, date, syncState, updatedAt",
      photos: "id, reportId, groupId",
      register: "id, &name",
      memo: "[kind+value], kind, uses, lastUsed",
      settings: "key",
    });
  }
}

export const db = new DiaryDB();

// ---- settings helpers ------------------------------------------------
export async function getSetting<T>(key: string): Promise<T | undefined> {
  const row = await db.settings.get(key);
  return row?.value as T | undefined;
}
export async function setSetting(key: string, value: unknown) {
  await db.settings.put({ key, value });
}

/** Bump a memo entry (usage count + last-used + optional last values). */
export async function bumpMemo(
  kind: string,
  value: string,
  meta?: MemoRow["meta"]
) {
  if (!value.trim()) return;
  const existing = await db.memo.get([kind, value]);
  const uses = (existing?.uses ?? 0) + 1;
  const nextMeta = { ...(existing?.meta ?? {}), ...(meta ?? {}) };
  await db.memo.put({ kind, value, uses, lastUsed: Date.now(), meta: nextMeta });
}

/** Get the report for a date, if any (there is at most one per day). */
export async function reportForDate(date: string): Promise<Report | undefined> {
  const all = await db.reports.where("date").equals(date).toArray();
  return all[0];
}

/** Date (ISO) of the most recent report before `beforeDate`. */
export async function lastReportBefore(beforeDate: string): Promise<Report | undefined> {
  const all = await db.reports
    .where("date")
    .notEqual(beforeDate)
    .sortBy("date");
  const earlier = all.filter((r) => r.date < beforeDate);
  return earlier.at(-1);
}

export function todayISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function shiftDate(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return todayISO(dt);
}

/* ---- boot maintenance -------------------------------------------------
   Any report stuck in "uploading" (app closed mid-upload) goes back to
   "saved" so flush() can pick it up again. */
export async function bootRecovery() {
  const stuck = await db.reports.where("syncState").equals("uploading").toArray();
  if (stuck.length)
    await Promise.all(
      stuck.map((r) => db.reports.update(r.id, { syncState: "saved" }))
    );
}
