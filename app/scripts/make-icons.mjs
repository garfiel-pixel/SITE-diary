// Generates the PWA icons by RESIZING ONLY: the supplied logo centred on a
// black square with 12% padding (maskable safe zone = central 80%).
// Run: node scripts/make-icons.mjs
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import URL from "node:url";

const __dirname = path.dirname(URL.fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const publicDir = path.join(root, "public");
fs.mkdirSync(publicDir, { recursive: true });

const logoSrc = path.join(__dirname, "..", "..", "Gemini_Generated_Image_81zzia81zzia81zz.jpg");

async function icon(size, maskable) {
  const pad = Math.round(size * 0.12);
  const logo = await sharp(logoSrc)
    .resize(size - pad * 2, Math.round(((size - pad * 2) * 816) / 1308)) // keep aspect (1308x816)
    .png()
    .toBuffer();
  const meta = await sharp(logo).metadata();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: maskable ? 1 : 1 },
    },
  })
    .png()
    .composite([
      {
        input: logo,
        top: Math.round((size - (meta.height ?? 0)) / 2),
        left: Math.round((size - (meta.width ?? 0)) / 2),
      },
    ])
    .toFile(path.join(publicDir, `pwa-${size}${maskable ? "-maskable" : ""}.png`));
}

await icon(192, false);
await icon(512, false);
await icon(512, true);
console.log("make-icons: pwa-192.png, pwa-512.png, pwa-512-maskable.png written (resize-only)");
