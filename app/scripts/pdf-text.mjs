import fs from "node:fs";
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const data = new Uint8Array(fs.readFileSync("../artifacts/sample-site-diary.pdf"));
const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
for (let i = 1; i <= doc.numPages; i++) {
  const pg = await doc.getPage(i);
  const c = await pg.getTextContent();
  const t = c.items.map((it) => ("str" in it ? it.str : "")).join(" ");
  console.log(`PAGE ${i}/${doc.numPages}:`, t);
}
