// Generates 12 MP test photos (4000x3000) with EXIF rotation metadata.
// These are synthetic site scenes drawn in SVG — no stock photography.
// Run: node scripts/make-fixtures.mjs
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import URL from "node:url";

const __dirname = path.dirname(URL.fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "..", "artifacts", "fixtures");
fs.mkdirSync(outDir, { recursive: true });

const palette = ["#8fb6d6", "#b7c9d6", "#d8c9a8", "#9db08d", "#c8a97e"];

function scene(n) {
  const sky = palette[n % palette.length];
  const label = String(n).padStart(2, "0");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${sky}"/><stop offset="1" stop-color="#e8ecef"/>
    </linearGradient>
    <linearGradient id="road" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3c3c3c"/><stop offset="1" stop-color="#1d1d1d"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="1200" fill="url(#sky)"/>
  <path d="M0 640 L1600 600 L1600 1200 L0 1200 Z" fill="#8a8f6e"/>
  <path d="M-200 980 L1700 880 L1900 1200 L-300 1200 Z" fill="url(#road)"/>
  <rect x="0" y="1010" width="1600" height="18" fill="#FCE501"/>
  <g fill="#f5f5f5" stroke="#0b0b0b" stroke-width="6">
    <rect x="640" y="420" width="380" height="220" rx="16"/>
    <rect x="700" y="340" width="240" height="90" rx="10"/>
  </g>
  <circle cx="720" cy="660" r="54" fill="#141414"/><circle cx="720" cy="660" r="24" fill="#8a8a8a"/>
  <circle cx="950" cy="650" r="64" fill="#141414"/><circle cx="950" cy="650" r="28" fill="#8a8a8a"/>
  <g fill="#FCE501" stroke="#0b0b0b" stroke-width="6">
    <path d="M300 900 l40 0 l-20 -70 z"/>
    <path d="M420 910 l40 0 l-20 -70 z"/>
    <path d="M1240 890 l40 0 l-20 -70 z"/>
  </g>
  <g fill="#0b0b0b" font-family="Arial" font-weight="bold">
    <text x="60" y="120" font-size="64">PAVE-CON FIXTURE ${label}</text>
    <text x="60" y="190" font-size="34">Hatfield Road Rehabilitation — synthetic test image</text>
  </g>
  <rect x="1210" y="70" width="300" height="120" fill="#0b0b0b"/>
  <text x="1240" y="150" fill="#FCE501" font-family="Arial" font-weight="bold" font-size="58">SITE ${label}</text>
</svg>`;
}

for (let i = 1; i <= 30; i++) {
  const buf = await sharp(Buffer.from(scene(i)), { density: 250 })
    .resize(4000, 3000)
    .jpeg({ quality: 82, chromaSubsampling: "4:2:0" })
    .toBuffer();
  // every third fixture is physically portrait with EXIF orientation 6
  const orientation = i % 3 === 0 ? 6 : 1;
  const file = path.join(outDir, `photo-${String(i).padStart(2, "0")}.jpg`);
  await sharp(buf).withMetadata({ orientation }).jpeg({ quality: 82 }).toFile(file);
  const meta = await sharp(file).metadata();
  console.log(
    `${path.basename(file)} ${meta.width}x${meta.height} orientation=${meta.orientation ?? 1} ${(fs.statSync(file).size / 1024).toFixed(0)} KB`
  );
}
