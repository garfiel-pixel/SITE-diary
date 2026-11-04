/* Photos (§10): two big buttons (Camera / Gallery), off-thread shrink,
   per-photo descriptions with chips, bundles (select → one caption). */
import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type PhotoRow } from "../db";
import { Icon } from "../icons";
import { SheetWrap } from "../components/SheetWrap";
import { shrinkPhoto } from "../lib/photo";
import { tick } from "../lib/haptics";
import { withTransition } from "../lib/vt";

const DESC_CHIPS = ["Before", "After", "Progress", "Defect", "Delivery", "Safety", "Damage"];

export function PhotoSection({ reportId }: { reportId: string }) {
  const photos = useLiveQuery(
    () => db.photos.where("reportId").equals(reportId).sortBy("takenAt"),
    [reportId],
    []
  );
  const camRef = useRef<HTMLInputElement | null>(null);
  const galRef = useRef<HTMLInputElement | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bundleSheet, setBundleSheet] = useState(false);
  const [bundleText, setBundleText] = useState("");
  const [busy, setBusy] = useState(false);
  const urls = useRef<string[]>([]);

  const track = (u: string) => {
    urls.current.push(u);
    return u;
  };
  useEffect(
    () => () => {
      for (const u of urls.current) URL.revokeObjectURL(u);
    },
    []
  );

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    for (const f of Array.from(files)) {
      const { blob, w, h } = await shrinkPhoto(f);
      await db.photos.put({
        id: crypto.randomUUID(),
        reportId,
        groupId: null,
        blob,
        w,
        h,
        description: "",
        takenAt: Date.now(),
      });
    }
    setBusy(false);
    tick();
  };

  const delWithUndo = async (id: string) => {
    const row = await db.photos.get(id);
    if (!row) return;
    await db.photos.delete(id);
    setSelected((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
    tick();
    window.dispatchEvent(
      new CustomEvent("diary-undo", {
        detail: {
          key: Date.now(),
          msg: "Photo removed — Undo to restore",
          perform: async () => {
            await db.photos.put(row);
          },
        },
      })
    );
  };

  const pickDesc = async (id: string, d: string) => {
    const row = await db.photos.get(id);
    if (!row) return;
    await db.photos.put({ ...row, description: d });
  };

  const makeBundle = async () => {
    const rows = photos?.filter((p) => selected.has(p.id)) ?? [];
    if (!rows.length || !bundleText.trim()) {
      setBundleSheet(false);
      return;
    }
    const gid = crypto.randomUUID();
    for (const row of rows) {
      const fresh = await db.photos.get(row.id);
      if (!fresh) continue;
      await db.photos.put({
        ...fresh,
        groupId: gid,
        description: bundleText.trim(),
      });
    }
    setBundleSheet(false);
    setSelectMode(false);
    setSelected(new Set());
    tick();
  };

  const all = photos ?? [];
  const selectedCount = selected.size;

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          className="btn-56 flex-1 font-display text-lg"
          aria-label="Take photos with the camera"
          onClick={() => {
            tick();
            camRef.current?.click();
          }}
        >
          <Icon name="camera" size={22} duo /> Camera
        </button>
        <button
          type="button"
          className="btn-56 flex-1 font-display text-lg"
          aria-label="Choose photos from the gallery"
          onClick={() => {
            tick();
            galRef.current?.click();
          }}
        >
          <Icon name="gallery" size={22} duo /> Gallery
        </button>
      </div>
      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <input
        ref={galRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => void handleFiles(e.target.files)}
      />
      {busy && (
        <p className="text-sm mb-2" role="status">
          Shrinking photos…
        </p>
      )}

      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          className="chip"
          aria-pressed={selectMode}
          onClick={() => {
            tick();
            setSelectMode((s) => !s);
            setSelected(new Set());
          }}
        >
          {selectMode ? "Done selecting" : "Select"}
        </button>
        {selectMode && (
          <button
            type="button"
            className="chip"
            disabled={!selectedCount}
            style={{ opacity: selectedCount ? 1 : 0.5 }}
            onClick={() => {
              tick();
              setBundleSheet(true);
            }}
          >
            Describe selected ({selectedCount})
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {all.map((p) => (
          <PhotoCard
            key={p.id}
            photo={p}
            selectMode={selectMode}
            selected={selected.has(p.id)}
            onToggleSelect={() => {
              tick();
              setSelected((s) => {
                const n = new Set(s);
                if (n.has(p.id)) n.delete(p.id);
                else n.add(p.id);
                return n;
              });
            }}
            onDelete={() => void delWithUndo(p.id)}
            onDesc={(d) => void pickDesc(p.id, d)}
          />
        ))}
        {all.length === 0 && !busy && (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            No photos yet for this day.
          </p>
        )}
      </div>

      <SheetWrap
        opened={bundleSheet}
        onClosed={() => setBundleSheet(false)}
        label="Describe selected photos"
      >
        <span className="font-display text-2xl block mb-3">
          One description for {selectedCount} photos
        </span>
        <input
          type="text"
          value={bundleText}
          onChange={(e) => setBundleText(e.target.value)}
          className="btn-56 w-full px-4 text-left mb-2"
          aria-label="Bundle description"
          placeholder="e.g. Progress — asphalt laying"
        />
        <div className="flex gap-2 flex-wrap mb-3">
          {DESC_CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              className="chip"
              onClick={() => setBundleText(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="w-full font-display text-xl"
          style={{
            minHeight: 64,
            borderRadius: 14,
            background: "var(--accent)",
            color: "var(--on-accent)",
            border: 0,
          }}
          onClick={() => void makeBundle()}
        >
          Apply
        </button>
      </SheetWrap>
    </div>
  );
}

function PhotoCard({
  photo,
  selectMode,
  selected,
  onToggleSelect,
  onDelete,
  onDesc,
}: {
  photo: PhotoRow;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  onDesc: (d: string) => void;
}) {
  const url = useObjectUrl(photo.blob);
  return (
    <div className="row-vt card p-2" style={{ borderColor: selected ? "var(--accent)" : "var(--rule)" }}>
      <div className="flex gap-3">
        {selectMode ? (
          <button
            type="button"
            aria-pressed={selected}
            aria-label={selected ? "Unselect photo" : "Select photo"}
            onClick={onToggleSelect}
            className="chip !min-h-16 !flex-col self-start"
          >
            {selected ? <Icon name="check" size={20} /> : ""}
            Select
          </button>
        ) : (
          url && (
            <img
              src={url}
              width={96}
              height={68}
              alt={photo.description || "Site photo"}
              style={{ objectFit: "cover", borderRadius: 10 }}
            />
          )
        )}
        <div className="flex-1 flex flex-col gap-2">
          <input
            key={photo.description}
            type="text"
            defaultValue={photo.description}
            onBlur={(e) => onDesc(e.target.value)}
            className="btn-56 !min-h-12 w-full px-3 text-left text-sm"
            aria-label="Photo description"
            placeholder="Description…"
          />
          <div className="flex gap-1.5 flex-wrap">
            {DESC_CHIPS.map((c) => (
              <button
                key={c}
                type="button"
                className="chip !min-h-10 text-xs"
                onClick={() => onDesc(c)}
                aria-label={`Describe photo as ${c}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          aria-label="Remove photo"
          className="btn-56 !min-h-10 !min-w-10 self-start"
          onClick={onDelete}
        >
          <Icon name="trash" size={18} />
        </button>
      </div>
      <span className="text-xs mt-1 num" style={{ color: "var(--muted)" }}>
        {photo.w}×{photo.h}
      </span>
    </div>
  );
}

function useObjectUrl(blob: Blob): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}
