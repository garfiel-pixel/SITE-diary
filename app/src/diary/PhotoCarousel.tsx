/* Fullscreen photo carousel — tap, swipe or key through report photos. */
import { useEffect, useRef, useState } from "react";
import { Icon } from "../icons";
import type { PhotoRow } from "../db";

interface PhotoCarouselProps {
  photos: PhotoRow[];
  startIndex: number;
  onClosed: () => void;
}

export function PhotoCarousel({ photos, startIndex, onClosed }: PhotoCarouselProps) {
  const [index, setIndex] = useState(startIndex);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const current = photos[index];
  const url = current ? URL.createObjectURL(current.blob) : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClosed();
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIndex((i) => Math.min(photos.length - 1, i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (url) URL.revokeObjectURL(url);
    };
  }, [onClosed, photos.length, url]);

  const goPrev = () => setIndex((i) => Math.max(0, i - 1));
  const goNext = () => setIndex((i) => Math.min(photos.length - 1, i + 1));

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Photo preview"
      className="fixed inset-0 z-[80] flex flex-col"
      style={{ background: "rgba(0,0,0,0.95)" }}
      onClick={(e) => {
        if (e.target === containerRef.current) onClosed();
      }}
      onTouchStart={(e) => setTouchStart(e.changedTouches[0]?.clientX ?? null)}
      onTouchEnd={(e) => {
        const end = e.changedTouches[0]?.clientX ?? null;
        if (touchStart == null || end == null) return;
        const diff = end - touchStart;
        if (Math.abs(diff) > 48) {
          if (diff > 0) goPrev();
          else goNext();
        }
        setTouchStart(null);
      }}
    >
      <div className="flex items-center justify-between p-3">
        <span className="text-white text-sm font-semibold num">
          {index + 1} / {photos.length}
        </span>
        <button
          type="button"
          className="btn-56"
          style={{ background: "rgba(255,255,255,0.15)", color: "#fff", borderColor: "transparent" }}
          aria-label="Close preview"
          onClick={onClosed}
        >
          <Icon name="minus" size={20} />
        </button>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {current && url && (
          <img
            src={url}
            alt={current.description || "Site photo"}
            className="max-w-full max-h-full object-contain"
            style={{ touchAction: "pan-y" }}
          />
        )}
        {photos.length > 1 && (
          <>
            <button
              type="button"
              className="btn-56 absolute left-2"
              style={{ background: "rgba(255,255,255,0.15)", color: "#fff", borderColor: "transparent" }}
              aria-label="Previous photo"
              disabled={index === 0}
              onClick={goPrev}
            >
              <Icon name="chevron" size={24} className="rotate-90" />
            </button>
            <button
              type="button"
              className="btn-56 absolute right-2"
              style={{ background: "rgba(255,255,255,0.15)", color: "#fff", borderColor: "transparent" }}
              aria-label="Next photo"
              disabled={index === photos.length - 1}
              onClick={goNext}
            >
              <Icon name="chevron" size={24} className="-rotate-90" />
            </button>
          </>
        )}
      </div>

      <div className="p-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
        <p className="text-white text-center text-sm font-semibold">
          {current?.description || "No description"}
        </p>
        {current && (
          <p className="text-white/70 text-center text-xs mt-1 num">
            {current.w}×{current.h}
          </p>
        )}
      </div>
    </div>
  );
}
