// Measures the dominant yellow of the supplied logo (pixels where
// R>220, G>190, B<90) and prints the median as hex. One-off, dev only.
import sharp from "sharp";
import path from "node:path";
import URL from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(URL.fileURLToPath(import.meta.url));
const src = path.join(__dirname, "..", "..", "Gemini_Generated_Image_81zzia81zzia81zz.jpg");

const img = sharp(fs.readFileSync(src));
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });

const ys = [];
for (let i = 0; i < data.length; i += info.channels) {
  const r = data[i], g = data[i + 1], b = data[i + 2];
  if (r > 220 && g > 190 && b < 90) {
    ys.push([r, g, b]);
  }
}
ys.sort((a, b) =>
  a[0] + a[1] + a[2] - (b[0] + b[1] + b[2])
);
const mid = ys.length ? ys[Math.floor(ys.length / 2)] : [248, 224, 0];
const hex =
  "#" + mid.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
const count = ys.length;
const total = (data.length / info.channels) | 0;
console.log(JSON.stringify({ yellow: hex, sampledPixels: count, totalPixels: total, share: +(count / total).toFixed(3) }));
