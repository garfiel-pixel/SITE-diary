/* Photo shrink (camera/gallery -> Blob, off main thread when possible).
   Falls back to a main-thread canvas honouring EXIF via createImageBitmap. */

export interface ShrinkResult {
  blob: Blob;
  w: number;
  h: number;
}

let worker: Worker | null = null;

function getWorker(): Worker | null {
  if (worker) return worker;
  try {
    worker = new Worker(new URL("../workers/shrink.worker.ts", import.meta.url), {
      type: "module",
    });
  } catch {
    worker = null;
  }
  return worker;
}

async function shrinkMainThread(file: File, maxEdge: number, quality: number): Promise<ShrinkResult> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const s = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * s);
  const h = Math.round(bmp.height * s);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  const blob = await new Promise<Blob>((res) =>
    c.toBlob((b) => res(b!), "image/jpeg", quality)
  );
  bmp.close?.();
  return { blob, w, h };
}

export function shrinkPhoto(
  file: File,
  maxEdge = 1600,
  quality = 0.72
): Promise<ShrinkResult> {
  const wk = getWorker();
  if (wk) {
    return new Promise((resolve, reject) => {
      const onMsg = (ev: MessageEvent) => {
        wk.removeEventListener("message", onMsg);
        if (ev.data.error) reject(new Error(ev.data.error));
        else resolve({ blob: ev.data.blob, w: ev.data.w, h: ev.data.h });
      };
      wk.addEventListener("message", onMsg);
      wk.postMessage({ file, maxEdge, quality });
    });
  }
  return shrinkMainThread(file, maxEdge, quality);
}
