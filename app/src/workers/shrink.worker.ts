self.onmessage = async (e: MessageEvent<{ file: File; maxEdge?: number; quality?: number }>) => {
  const { file, maxEdge = 1600, quality = 0.72 } = e.data;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const s = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * s);
    const h = Math.round(bmp.height * s);
    const c = new OffscreenCanvas(w, h);
    c.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
    const blob = await c.convertToBlob({ type: "image/jpeg", quality });
    (self as unknown as Worker).postMessage({ blob, w, h });
  } catch (err) {
    (self as unknown as Worker).postMessage({ error: String(err) });
  }
};
