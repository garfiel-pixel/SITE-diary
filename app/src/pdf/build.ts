/* PDF build with pdfmake 0.3 (promise API, all methods async).
   Fonts + logo come from src/pdf/pdfFonts.ts (generated, self-hosted). */
import { CONFIG, type Unit } from "../config";
import type { Report, PhotoRow } from "../db";
import { fmtDate, fmtDay } from "../lib/format";
import { allPeople, personName, roleSummary } from "../lib/workforce";
import { vfs } from "./pdfFonts";

/* font families: all four variants must exist */
const fonts = {
  Barlow: {
    normal: "Barlow-Regular.ttf",
    bold: "Barlow-SemiBold.ttf",
    italics: "Barlow-Regular.ttf",
    bolditalics: "Barlow-SemiBold.ttf",
  },
  BarlowCond: {
    normal: "BarlowCondensed-Bold.ttf",
    bold: "BarlowCondensed-Bold.ttf",
    italics: "BarlowCondensed-Bold.ttf",
    bolditalics: "BarlowCondensed-Bold.ttf",
  },
};

/* Layout geometry. A4 is 595 pt wide; the 36 pt side margins leave 523 pt of
   content, so a two-up cell is ~257 pt. Photos fill their cell instead of
   sitting letterboxed inside a fixed 215×160 box, and a report with a single
   photo gets the full page width. */
const CONTENT_W = 523;
const COL_GAP = 8;
const TWO_UP_W = (CONTENT_W - COL_GAP) / 2;
/* Height caps keep one photo plus its caption from pushing the next block to a
   new page: two blocks (image + caption) still fit a page of content. */
const MAX_H_TWO_UP = 300;
const MAX_H_SOLO = 380;

/** Box that fills `boxW` while keeping the photo's own shape. */
function photoBox(aspect: number, boxW: number, maxH: number): [number, number] {
  const h = boxW / aspect;
  if (h <= maxH) return [Math.round(boxW), Math.round(h)];
  return [Math.round(maxH * aspect), Math.round(maxH)];
}

// Downscale again for a WhatsApp-sized report (< 8 MB). Full-width photos keep
// more pixels because the same image is printed much larger.
async function toImageRef(
  photo: PhotoRow,
  maxEdge = 1200
): Promise<{ ref: string; aspect: number }> {
  const bmp = await createImageBitmap(photo.blob, {
    imageOrientation: "from-image",
  });
  const s = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * s);
  const h = Math.round(bmp.height * s);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  const blob = await new Promise<Blob>((res) =>
    c.toBlob((b) => res(b!), "image/jpeg", 0.75)
  );
  const name = `p${photo.id}`;
  photoImages[name] = await blobToDataUrl(blob);
  return { ref: name, aspect: w / h };
}

const photoImages: Record<string, string> = {};

function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result));
    fr.onerror = () => rej(new Error("read"));
    fr.readAsDataURL(b);
  });
}

type Doc = Record<string, unknown>;

/* Human labels — the PDF must not print raw storage keys. */
const WEATHER: Record<string, string> = {
  clear: "Clear",
  partly: "Partly cloudy",
  overcast: "Overcast",
  showers: "Showers",
  heavy: "Heavy rain",
  storm: "Storm",
};
const LOSS: Record<string, string> = {
  none: "No time lost",
  rain: "Rain",
  breakdown: "Breakdown",
  materials: "Late materials",
  utilities: "Power/water cut",
  access: "Site access",
  other: "Other",
};

export interface PdfResult {
  blob: Blob;
  name: string;
  pages: number;
  bytes: number;
}

export async function buildPdf(r: Report, photos: PhotoRow[]): Promise<PdfResult> {
  photoImagesClear();
  const mod = await import("pdfmake/build/pdfmake");
  const pdfMake = (mod.default ?? mod) as {
    addVirtualFileSystem: (v: unknown) => void;
    addFonts: (f: unknown) => void;
    createPdf: (d: Doc) => {
      getBlob: () => Promise<Blob>;
    };
  };
  pdfMake.addVirtualFileSystem(vfs);
  pdfMake.addFonts(fonts);

  const logoDataUrl = `data:image/jpeg;base64,${vfs["logo.jpg"]}`;

  /* ---- diary content ---- */
  const H = (id: string, text: string): Doc => ({
    text,
    id,
    font: "BarlowCond",
    fontSize: 13,
    bold: true,
    margin: [0, 10, 0, 3],
    /* pdfmake 0.3 bookmarks live on the text node, not the doc. */
    ...(text ? { outline: true, outlineText: text } : {}),
  });

  const weatherRow = (w: string | null) => (w ? WEATHER[w] ?? w : "—");
  const content: Doc[] = [];

  if (r.isSample) {
    content.push({
      text: "SAMPLE",
      font: "BarlowCond",
      fontSize: 14,
      color: "#0B0B0B",
      background: "#FCE501",
      margin: [0, 2, 0, 2],
    });
  }

  content.push(
    H("sec-project", "Project / Site / Day / Date"),
    {
      layout: "lightHorizontalLines",
      table: {
        widths: [70, "*", 70, "*"],
        body: [
          [
            { text: "Project", bold: true },
            r.project || "—",
            { text: "Site", bold: true },
            r.site || "—",
          ],
          [
            { text: "Day", bold: true },
            fmtDay(r.date),
            { text: "Date", bold: true },
            fmtDate(r.date),
          ],
        ],
      },
      fontSize: 10,
      dontBreakRows: true,
    } as Doc
  );

  content.push(
    H("sec-weather", "Weather"),
    {
      layout: "lightHorizontalLines",
      table: {
        headerRows: 1,
        body: [
          [
            { text: "A.M.", bold: true },
            { text: "P.M.", bold: true },
          ],
          [weatherRow(r.weather.am), weatherRow(r.weather.pm)],
        ],
      },
      fontSize: 10,
      dontBreakRows: true,
    } as Doc
  );

  content.push(
    H("sec-lost", "Time lost"),
    {
      layout: "lightHorizontalLines",
      table: {
        headerRows: 1,
        body: [
          [{ text: "Reason", bold: true }, { text: "Hours", bold: true }],
          [
            r.timeLost.reason ? LOSS[r.timeLost.reason] ?? r.timeLost.reason : "None",
            String(r.timeLost.hours),
          ],
        ],
      },
      fontSize: 10,
      dontBreakRows: true,
    } as Doc
  );

  if (r.equipment.length) {
    content.push(
      H("sec-equipment", "Equipment on site"),
      {
        layout: "lightHorizontalLines",
        table: {
          headerRows: 1,
          widths: ["*", 70],
          dontBreakRows: true,
          body: [
            [
              { text: "Item", bold: true },
              { text: "Hours", bold: true, alignment: "right" },
            ],
            ...r.equipment.map((e) => [e.name, { text: String(e.hours), alignment: "right" }]),
          ],
        },
        fontSize: 10,
      } as Doc
    );
  }

  if (r.materials.length) {
    content.push(
      H("sec-materials", "Materials delivered"),
      {
        layout: "lightHorizontalLines",
        table: {
          headerRows: 1,
          widths: ["*", 70, 70],
          dontBreakRows: true,
          body: [
            [
              { text: "Material", bold: true },
              { text: "Qty", bold: true, alignment: "right" },
              { text: "Unit", bold: true },
            ],
            ...r.materials.map((m) => [
              m.name,
              { text: String(m.qty), alignment: "right" },
              m.unit,
            ]),
          ],
        },
        fontSize: 10,
      } as Doc
    );
  }

  const workforcePeople = allPeople(r.workforce);
  if (workforcePeople.length > 0) {
    const groups = [
      { name: r.workforce.groups[0], people: r.workforce.a },
      { name: r.workforce.groups[1], people: r.workforce.b },
    ].filter((group) => group.people.length > 0);

    content.push(
      H("sec-workforce", `Workforce — ${workforcePeople.length} people`),
      {
        columns: groups.map((group) => ({
          width: "*",
          stack: [
            {
              text: `${group.name} — ${group.people.length}`,
              bold: true,
              fontSize: 10,
              margin: [0, 0, 0, 3],
            },
            {
              layout: "lightHorizontalLines",
              table: {
                headerRows: 1,
                widths: ["*", 82],
                dontBreakRows: true,
                body: [
                  [
                    { text: "Name", bold: true },
                    { text: "Role", bold: true },
                  ],
                  ...[...group.people]
                    .sort(
                      (a, b) =>
                        a.role.localeCompare(b.role) ||
                        personName(a).localeCompare(personName(b))
                    )
                    .map((person) => [
                      { text: personName(person) },
                      { text: person.role || "—" },
                    ]),
                ],
              },
              fontSize: 8.5,
            },
            {
              text: `Roles: ${roleSummary(group.people) || "—"}`,
              fontSize: 8,
              color: "#3F3F3F",
              margin: [0, 3, 0, 0],
            },
          ],
        })),
        columnGap: 14,
      } as Doc
    );
  }

  const para = (id: string, title: string, text: string | undefined) => {
    if (!text?.trim()) return;
    content.push(H(id, title), { text, fontSize: 10.5, lineHeight: 1.35 });
  };
  para("sec-wip", "Work in progress", r.wip);
  para("sec-visitors", "Visitors", r.visitors);
  para("sec-instructions", "Instructions", r.instructions);

  // ---- toolbox (omitted if no topic and nobody present)
  const presentNames = workforcePeople
    .filter((person) => r.toolbox?.presentIds.includes(person.id))
    .map(personName);
  if (r.toolbox && (r.toolbox.topic || presentNames.length)) {
    const tb = r.toolbox;
    content.push(
      H("sec-toolbox", "Toolbox talk"),
      {
        layout: "lightHorizontalLines",
        table: {
          headerRows: 1,
          body: [
            [
              { text: "Topic", bold: true },
              tb.topic || "—",
              { text: "Presenter", bold: true },
              tb.presenter || "—",
            ],
            [
              { text: "Time", bold: true },
              tb.time,
              { text: "Present", bold: true },
              `${presentNames.length} present`,
            ],
          ],
        },
        fontSize: 10,
      } as Doc
    );
    if (presentNames.length)
      content.push({ text: `Present: ${presentNames.join(", ")}`, fontSize: 9.5 });
    if (tb.notes) content.push({ text: tb.notes, fontSize: 10.5 });
  }

  // ---- photos: 2-column unbreakable stacks, grouped caption
  if (photos.length) {
    content.push(H("sec-photos", "Photos"));
    const groups = new Map<string, PhotoRow[]>();
    const singles: PhotoRow[] = [];
    for (const p of photos) {
      if (p.groupId) {
        const arr = groups.get(p.groupId) ?? [];
        arr.push(p);
        groups.set(p.groupId, arr);
      } else singles.push(p);
    }
    const ordered = [
      ...[...groups.entries()].flatMap(([, rows]) =>
        rows.map((row) => ({ row, group: rows }))
      ),
      ...singles.map((row) => ({ row, group: null })),
    ];
    /* A lone photo is printed full width; anything else is two-up, both
       filling their cell. */
    const solo = ordered.length === 1;
    const boxW = solo ? CONTENT_W : TWO_UP_W;
    const maxH = solo ? MAX_H_SOLO : MAX_H_TWO_UP;
    for (let i = 0; i < ordered.length; i += solo ? 1 : 2) {
      const cells: Doc[] = [];
      for (const cell of solo ? [ordered[i]] : [ordered[i], ordered[i + 1]]) {
        if (!cell) {
          cells.push({ text: "" });
          continue;
        }
        const { ref, aspect } = await toImageRef(cell.row, solo ? 1600 : 1200);
        const caption = cell.group
          ? cell.group[0]?.description
          : cell.row.description;
        cells.push({
          stack: [
            { image: ref, fit: photoBox(aspect, boxW, maxH) },
            caption
              ? { text: caption, fontSize: 8.5, italic: false, margin: [2, 3, 0, 2] }
              : { text: "" },
          ],
          unbreakable: true,
        });
      }
      content.push({
        columns: cells,
        columnGap: COL_GAP,
        dontBreakRows: true,
        margin: [0, 5, 0, 5],
      });
    }
  }

  // ---- recorded by
  content.push(
    H("sec-recorded", ""),
    {
      columns: [
        { text: "Recorded at: " + (r.recordedAt ? new Date(r.recordedAt).toLocaleString("en-JM") : "—"), width: 240, fontSize: 9 },
        { text: `Recorded by: ${r.recordedBy}`, bold: true, alignment: "right", fontSize: 10.5 },
      ],
    } as Doc
  );

  const safeName = (r.project || "Site Diary").replace(/[^\w\- ]+/g, "").trim().replace(/ +/g, "-");
  const name = `PaveCon_SiteDiary_${safeName}_${r.date}.pdf`;

  const doc = {
    pageSize: "A4",
    pageMargins: [36, 120, 36, 56],
    info: {
      title: `Site Diary ${r.project} ${r.date}`,
      author: r.recordedBy,
      subject: CONFIG.formTitle,
    },
    defaultStyle: { font: "Barlow", fontSize: 10 },
    images: { logo: logoDataUrl, ...photoImages },
    header: () => ({
      margin: [36, 18, 36, 0],
      /* 16 pt breathing room after the 92 pt logo: title/site text can never
         touch the Pave-Con mark, even when the project name wraps. */
      columnGap: 16,
      columns: [
        { image: "logo", width: 92 },
        {
          width: "*",
          verticalAlignment: "middle",
          stack: [
            {
              text: CONFIG.motto,
              font: "BarlowCond",
              fontSize: 11,
              color: "#0B0B0B",
            },
            {
              text: `${r.project || "—"}  ·  ${r.site || "—"}  ·  ${fmtDate(r.date)}`,
              margin: [0, 6, 0, 0],
              bold: true,
            },
            ...(r.isSample
              ? [
                  {
                    text: "SAMPLE DATA — fictional project",
                    font: "BarlowCond",
                    fontSize: 8.5,
                    color: "#3F3F3F",
                    margin: [0, 3, 0, 0],
                  },
                ]
              : []),
          ],
        },
      ] as unknown[],
    }),
    footer: (
      page: number,
      count: number
    ) => ({
      margin: [36, 0, 36, 20],
      columns: [
        {
          text: `Recorded by: ${r.recordedBy}`,
          fontSize: 9,
        },
        {
          text: `Page ${page} of ${count}`,
          alignment: "right" as const,
          fontSize: 9,
        },
      ],
    }),
    content,
  };

  const blob = await pdfMake.createPdf(doc).getBlob();
  const pages = await countPages(blob);
  return { blob, name, pages, bytes: blob.size };
}

function photoImagesClear() {
  for (const k of Object.keys(photoImages)) delete photoImages[k];
}

async function countPages(blob: Blob): Promise<number> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let latin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < buf.length; i += CHUNK) {
    latin += String.fromCharCode(...buf.subarray(i, i + CHUNK));
  }
  return (latin.match(/\/Type\s*\/Page[\s>\]]/g) ?? []).length;
}
