/* Seed data — paving and construction. All sample project names are
   invented (fictional); flagged in NOTES.md. */

import { CONFIG, type Unit } from "./config";
import {
  db,
  type Report,
  type WorkforcePerson,
  type EquipmentRow,
  type MaterialRow,
} from "./db";

export const SEED = {
  equipment: [
    { name: "Paver", hours: 8 },
    { name: "Roller (steel drum)", hours: 8 },
    { name: "Roller (pneumatic)", hours: 6 },
    { name: "Milling machine", hours: 8 },
    { name: "Grader", hours: 8 },
    { name: "Excavator", hours: 8 },
    { name: "Backhoe", hours: 8 },
    { name: "Tipper truck", hours: 8 },
    { name: "Water bowser", hours: 6 },
    { name: "Compactor", hours: 4 },
    { name: "Bobcat", hours: 8 },
    { name: "Concrete mixer", hours: 6 },
    { name: "Generator", hours: 8 },
    { name: "Crane", hours: 8 },
  ],
  materials: [
    { name: "Asphalt", unit: "tonnes" as Unit },
    { name: "Marl", unit: "loads" as Unit },
    { name: "Gravel", unit: "loads" as Unit },
    { name: "Aggregate", unit: "tonnes" as Unit },
    { name: "Sand", unit: "loads" as Unit },
    { name: "Cement", unit: "bags" as Unit },
    { name: "Tack coat", unit: "gal" as Unit },
    { name: "Kerb", unit: "pcs" as Unit },
    { name: "Pipe", unit: "lengths" as Unit },
    { name: "Rebar", unit: "lengths" as Unit },
    { name: "Ready-mix", unit: "m³" as Unit },
    { name: "Blocks", unit: "pcs" as Unit },
    { name: "Line paint", unit: "gal" as Unit },
  ],
  trades: [
    { name: "Supervisor", count: 1 },
    { name: "Paver operator", count: 2 },
    { name: "Roller driver", count: 2 },
    { name: "Raker", count: 3 },
    { name: "Screed hand", count: 2 },
    { name: "Grader operator", count: 1 },
    { name: "Excavator operator", count: 1 },
    { name: "Truck driver", count: 2 },
    { name: "Flagman", count: 4 },
    { name: "Labourer", count: 6 },
    { name: "Mason", count: 2 },
    { name: "Steel fixer", count: 2 },
    { name: "Carpenter", count: 2 },
    { name: "Electrician", count: 1 },
    { name: "Plumber", count: 1 },
  ],
  wipChips: [
    "Milling",
    "Tack coat",
    "Base course",
    "Asphalt laying",
    "Rolling",
    "Kerbing",
    "Drainage",
    "Line marking",
    "Traffic control",
    "Cleaning up",
  ],
  instructionChips: ["Client", "Engineer", "Supervisor", "Safety officer"],
  visitorChips: ["Client", "Engineer", "Inspector", "Supplier", "NWA", "NSWMA"],
  toolboxHazards: [
    "PPE",
    "Traffic",
    "Heat",
    "Slips",
    "Plant movement",
    "Dust",
    "Noise",
  ],
  photoChips: [
    "Before",
    "After",
    "Progress",
    "Defect",
    "Delivery",
    "Safety",
    "Damage",
  ],
};

/** Neutral placeholder JPEG generator — no stock photos, no copyright. */
export async function makePlaceholderPhoto(
  label: string,
  w = 960,
  h = 640
): Promise<Blob> {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#8a8a84";
  ctx.fillRect(0, 0, w, h);
  // a few diagonal bands to visually separate the placeholders
  for (let x = -h; x < w; x += 120) {
    ctx.fillStyle = "#9a9a92";
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 60, 0);
    ctx.lineTo(x + 60 + h, h);
    ctx.lineTo(x + h, h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#0B0B0B";
  ctx.fillRect(0, h - 90, w, 90);
  ctx.fillStyle = "#FCE501";
  ctx.font = `bold ${Math.round(h / 9)}px Arial`;
  ctx.fillText(label, 24, h - 30);
  return await new Promise((res) =>
    c.toBlob((b) => res(b!), "image/jpeg", 0.72)
  );
}

export function newReport(date: string): Report {
  return {
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
}

/* Fictional sample people. Names are intentionally ordinary; none are real
   employees or subcontractors. */
const samplePerson = (
  id: string,
  name: string,
  role: string
): WorkforcePerson => ({ id, name, role });

export const SAMPLE_PEOPLE: { a: WorkforcePerson[]; b: WorkforcePerson[] } = {
  a: [
    samplePerson("sp1", "Andre Brown", "Supervisor"),
    samplePerson("sp2", "Kemar Lewis", "Paver operator"),
    samplePerson("sp3", "Dwayne Clarke", "Paver operator"),
    samplePerson("sp4", "Ricardo Hall", "Roller driver"),
    samplePerson("sp5", "Omar Reid", "Roller driver"),
    samplePerson("sp6", "Jerome Whyte", "Raker"),
    samplePerson("sp7", "Damion Green", "Raker"),
    samplePerson("sp8", "Troy Bennett", "Raker"),
    samplePerson("sp9", "Michael Grant", "Flagman"),
    samplePerson("sp10", "Kevin Thomas", "Flagman"),
    samplePerson("sp11", "Patrick Wright", "Flagman"),
    samplePerson("sp12", "Leroy Sinclair", "Flagman"),
    samplePerson("sp13", "Andre Smith", "Labourer"),
    samplePerson("sp14", "Christopher Ellis", "Labourer"),
    samplePerson("sp15", "Rohan Blake", "Labourer"),
    samplePerson("sp16", "Tevin Campbell", "Labourer"),
    samplePerson("sp17", "Jason Brown", "Labourer"),
    samplePerson("sp18", "Delroy Clarke", "Labourer"),
  ],
  b: [samplePerson("sp19", "Devon Hall", "Water bowser driver")],
};

export async function seedIfNeeded() {
  const count = await db.reports.count();
  if (count > 0) return;

  const equipment: EquipmentRow[] = [
    { id: crypto.randomUUID(), name: "Paver", hours: 8 },
    { id: crypto.randomUUID(), name: "Roller (steel drum)", hours: 8 },
    { id: crypto.randomUUID(), name: "Tipper truck", hours: 6.5 },
    { id: crypto.randomUUID(), name: "Milling machine", hours: 4 },
  ];
  const materials: MaterialRow[] = [
    { id: crypto.randomUUID(), name: "Asphalt", qty: 120, unit: "tonnes" },
    { id: crypto.randomUUID(), name: "Tack coat", qty: 40, unit: "gal" },
    { id: crypto.randomUUID(), name: "Marl", qty: 2, unit: "loads" },
  ];
  const today = new Date();
  const date = new Date(today);
  date.setDate(date.getDate() - 1); // sample is "yesterday" so Copy-from-yesterday demos today

  const sample: Report = {
    id: crypto.randomUUID(),
    date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
    project: "Hatfield Road Rehabilitation",
    site: "Chainage 0+400 to 0+900",
    weather: { am: "clear", pm: "showers" },
    timeLost: { reason: "rain", hours: 1.5 },
    equipment,
    materials,
    workforce: {
      groups: ["Own crew", "Subcontractors"],
      a: SAMPLE_PEOPLE.a.map((p) => ({ ...p })),
      b: SAMPLE_PEOPLE.b.map((p) => ({ ...p })),
    },
    wip: "Milling 0+400 to 0+650 completed. Base course laid from 0+650. Asphalt laying commencing at 0+700.\nRolling continues behind the paver.",
    visitors: "09:40 Engineer — Mr. R. Hoyea (NSWMA inspector visited at 13:15)",
    instructions:
      "Keep lane width to the set plan. All staff inside cones at all times.",
    toolbox: {
      topic: "Working near live traffic",
      presenter: "Andre Brown",
      time: "07:30",
      presentIds: SAMPLE_PEOPLE.a.slice(0, 8).map((p) => p.id),
      notes: "PPE: hi-vis and hard hats confirmed. Traffic: stay behind cones; flagman commands. Heat: rotate water breaks.",
    },
    recordedBy: "K. Johnson",
    recordedAt: date.getTime(),
    isSample: true,
    syncState: "draft",
    updatedAt: Date.now(),
  };
  await db.reports.put(sample);

  // Sample photos (neutral placeholders generated in code)
  for (const [i, label] of ["SAMPLE A", "SAMPLE B", "SAMPLE C"].entries()) {
    const blob = await makePlaceholderPhoto(label);
    await db.photos.put({
      id: crypto.randomUUID(),
      reportId: sample.id,
      groupId: null,
      blob,
      w: 960,
      h: 640,
      description: label === "SAMPLE A" ? "Before" : i === 1 ? "Progress" : "After",
      takenAt: Date.now() - (2 - i) * 60000,
    });
  }

  // pre-seed memo counts so chips have an order from day one
  for (const e of equipment)
    await db.memo.put({
      kind: "equipment",
      value: e.name,
      uses: 3,
      lastUsed: Date.now(),
      meta: { hours: e.hours },
    });
  for (const m of materials)
    await db.memo.put({
      kind: "material",
      value: m.name,
      uses: 2,
      lastUsed: Date.now(),
      meta: { unit: m.unit },
    });
  for (const t of SEED.trades)
    await db.memo.put({
      kind: "trade",
      value: t.name,
      uses: 1,
      lastUsed: Date.now(),
      meta: { count: t.count },
    });
  // remembered context for the next report / typing audit
  await db.memo.put({ kind: "project", value: sample.project, uses: 2, lastUsed: Date.now() });
  await db.memo.put({ kind: "site", value: sample.site, uses: 2, lastUsed: Date.now() });
  await db.memo.put({
    kind: "recordedby",
    value: sample.recordedBy,
    uses: 2,
    lastUsed: Date.now(),
  });
  await bumpMemoSettings();

  async function bumpMemoSettings() {
    await db.settings.put({ key: "seededAt", value: Date.now() });
  }

  console.info(
    `[seed] sample report '%s' inserted (fictional project names — see NOTES.md)`,
    CONFIG.formTitle
  );
}
