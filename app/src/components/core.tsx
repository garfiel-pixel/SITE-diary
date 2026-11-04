/* Core reusable pieces: tape-measure slider, numpad sheet, quantity
   stepper, lined textareas, section cards, chip rows, undo snackbar. */
import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type JSX,
} from "react";
import { SheetWrap } from "./SheetWrap";
import { Icon } from "../icons";
import { withTransition } from "../lib/vt";
import { tick } from "../lib/haptics";

/* ================= Tape slider (7.1) ================================== */

interface TapeArgs {
  min: number;
  max: number;
  step: number;
  value: number;
  unit: string;
  onChange: (v: number) => void;
  /** Pointer drag previews locally; the report commits on release. */
  onPreview?: (v: number) => void;
  onPreviewEnd?: (v: number) => void;
}

function fmtVal(v: number) {
  return v.toFixed(1).replace(/\.0$/, "");
}

/** Fixed ruler + draggable marker, tap anywhere to move. Keyboard mapped.
    Value tap opens the numpad — no OS keyboard. */
export function TapeSlider({ args, label }: { args: TapeArgs; label: string }) {
  const { min, max, step, value, unit, onChange } = args;
  const numRef = useRef<HTMLSpanElement | null>(null);
  const buttonValueRef = useRef<HTMLSpanElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);

  /* Drag preview writes straight to the DOM. React only updates on release, so
     a 60 fps drag does not reconcile the form on every pointer move. */
  const paintPreview = (v: number) => {
    const trackWidth = track.current?.clientWidth ?? 0;
    if (thumbRef.current) {
      const x = (trackWidth * (v - min)) / (max - min);
      thumbRef.current.style.transform = `translateX(${x}px)`;
    }
    /* Visible label follows the finger; ARIA stays on the committed value
       (a screen reader only needs the value after release). */
    if (numRef.current) numRef.current.textContent = fmtVal(v);
    if (buttonValueRef.current) buttonValueRef.current.textContent = fmtVal(v);
  };

  const { track, bind, commit } = useTape({
    ...args,
    onPreview: paintPreview,
    onPreviewEnd: (v) => {
      /* Non-urgent: React can interleave the report update on release. */
      startTransition(() => onChange(v));
    },
  });
  const [num, setNum] = useState(false);

  /* Position the marker with a transform so dragging never triggers layout. */
  useLayoutEffect(() => {
    const trackWidth = track.current?.clientWidth ?? 0;
    if (thumbRef.current) {
      const x = (trackWidth * (value - min)) / (max - min);
      thumbRef.current.style.transform = `translateX(${x}px)`;
    }
  }, [value, min, max, track]);

  return (
    <div className="flex items-center gap-2">
      <div
        ref={track}
        className="tape tape-track flex-1"
        {...bind}
        role="slider"
        tabIndex={0}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${fmtVal(value)} ${unit}`}
        aria-label={label}
      >
        <TapeTicks min={min} max={max} step={step} />
        <div
          ref={thumbRef}
          className="absolute pointer-events-none"
          style={{ left: 0, top: 0, bottom: 0, willChange: "transform" }}
        >
          <div
            className="tape-thumb -translate-x-1/2 flex items-center justify-center rounded-xl font-bold"
            style={{
              background: "var(--accent)",
              color: "var(--on-accent)",
              width: 64,
              height: 64,
              marginTop: 10,
              boxShadow: "0 2px 6px rgba(0,0,0,.35)",
            }}
          >
            <span ref={numRef} key={value} className="roll num text-xl">
              {fmtVal(value)}
            </span>
          </div>
        </div>
      </div>
      <StepMinus onStep={() => commit(value - step)} />
      <button
        type="button"
        className="btn-56 num min-w-20 font-display text-2xl"
        style={{ minHeight: 64 }}
        aria-label={`${label}: ${fmtVal(value)} ${unit} — open numpad`}
        onClick={() => setNum(true)}
      >
        <span ref={buttonValueRef}>{fmtVal(value)}</span>
      </button>
      <StepPlus onStep={() => commit(value + step)} />
      <NumpadSheet
        opened={num}
        onClosed={() => setNum(false)}
        value={value}
        min={min}
        max={max}
        allowDecimal={step < 1}
        onDone={onChange}
      />
    </div>
  );
}

/** Static ruler substrip. Memoised: a drag only moves the thumb. */
const TapeTicks = memo(function TapeTicks({
  min,
  max,
  step,
}: {
  min: number;
  max: number;
  step: number;
}) {
  const ticks = useMemo(() => {
    const steps = Math.round((max - min) / step);
    const list: boolean[] = [];
    for (let i = 0; i <= steps; i++) list.push(i % 5 === 0);
    return list;
  }, [min, max, step]);
  return (
    <div className="absolute inset-0 flex items-end justify-between px-1 pointer-events-none">
      {ticks.map((major, i) => (
        <div
          key={i}
          style={{
            height: major ? 26 : 12,
            width: 0,
            borderLeft: "2px solid var(--rule)",
            marginBottom: 8,
          }}
        />
      ))}
    </div>
  );
});

export function useTape({
  min,
  max,
  step,
  value,
  onChange,
  onPreview,
  onPreviewEnd,
}: TapeArgs) {
  const track = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);
  const lastPointerValue = useRef<number | null>(null);

  const fromX = useCallback(
    (x: number) => {
      const r = track.current?.getBoundingClientRect();
      if (!r) return value;
      const t = Math.min(1, Math.max(0, (x - r.left) / r.width));
      const v = Math.round((min + t * (max - min)) / step) * step;
      return Number(v.toFixed(2));
    },
    [min, max, step, value]
  );

  const commit = useCallback(
    (v: number) => {
      const clamped = Math.min(max, Math.max(min, Number(v.toFixed(2))));
      if (clamped !== value) {
        onChange(clamped);
        if (clamped % (step * 5) === 0) tick();
      }
    },
    [value, onChange, max, min, step]
  );

  const bind = {
    onPointerDown: (e: React.PointerEvent) => {
      dragging.current = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      const v = fromX(e.clientX);
      lastPointerValue.current = v;
      if (onPreview) onPreview(v);
      else commit(v);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const v = fromX(e.clientX);
      lastPointerValue.current = v;
      if (onPreview) onPreview(v);
      else commit(v);
    },
    onPointerUp: () => {
      dragging.current = false;
      const v = lastPointerValue.current;
      lastPointerValue.current = null;
      if (v != null) {
        if (onPreviewEnd) onPreviewEnd(v);
        else commit(v);
      }
    },
    onPointerCancel: () => {
      dragging.current = false;
      lastPointerValue.current = null;
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      const big = step * 5;
      const map: Record<string, number> = {
        ArrowRight: step,
        ArrowUp: step,
        ArrowLeft: -step,
        ArrowDown: -step,
        PageUp: big,
        PageDown: -big,
      };
      if (e.key in map) {
        e.preventDefault();
        commit(value + map[e.key]);
      }
      if (e.key === "Home") commit(min);
      if (e.key === "End") commit(max);
    },
  };

  return { track, bind, commit };
}

/** Press-and-hold −/+ with acceleration. */
export function HoldButton({
  onStep,
  children,
  label,
}: {
  onStep: () => void;
  children: ReactNode;
  label: string;
}) {
  const t1 = useRef<number | undefined>(undefined);
  const t2 = useRef<number | undefined>(undefined);
  /* Keep the latest onStep so the repeat interval always steps from the
     current value, not the value captured when the press began. */
  const stepRef = useRef(onStep);
  stepRef.current = onStep;

  const stop = () => {
    window.clearTimeout(t1.current);
    window.clearInterval(t2.current);
    t1.current = t2.current = undefined;
  };
  const accelerateAndRepeat = () => {
    let interval = 90;
    const run = () => {
      stepRef.current();
      window.clearInterval(t2.current);
      t2.current = window.setInterval(run, interval);
      interval = Math.max(40, interval - 8); // accelerate
    };
    run();
  };
  const start = () => {
    stepRef.current();
    t1.current = window.setTimeout(accelerateAndRepeat, 600);
  };

  return (
    <button
      type="button"
      aria-label={label}
      className="btn-56 num text-xl"
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onStep();
        }
      }}
    >
      {children}
    </button>
  );
}

export function StepMinus({ onStep }: { onStep: () => void }) {
  return (
    <HoldButton onStep={onStep} label="Decrease">
      <Icon name="minus" size={24} />
    </HoldButton>
  );
}
export function StepPlus({ onStep }: { onStep: () => void }) {
  return (
    <HoldButton onStep={onStep} label="Increase">
      <Icon name="plus" size={24} />
    </HoldButton>
  );
}

/* ================= Numpad (6.4) ======================================= */

export function NumpadSheet({
  opened,
  onClosed,
  value,
  min = 0,
  max = 500,
  allowDecimal,
  onDone,
}: {
  opened: boolean;
  onClosed: () => void;
  value: number;
  min?: number;
  max?: number;
  allowDecimal: boolean;
  onDone: (v: number) => void;
}) {
  const [buf, setBuf] = useState<string>(fmtVal(value));
  useEffect(() => {
    if (opened) setBuf(fmtVal(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const press = (k: string) => {
    tick();
    if (k === "del") {
      setBuf((b) => (b.length > 1 ? b.slice(0, -1) : "0"));
      return;
    }
    if (k === ".") {
      if (!allowDecimal) return;
      setBuf((b) => (b.includes(".") ? b : b + "."));
      return;
    }
    setBuf((b) => {
      const next = b === "0" && k !== "." ? k : b + k;
      const n = Number(next);
      return Number.isNaN(n) || n > max ? b : next.length > 8 ? b : next;
    });
  };

  const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", ...(allowDecimal ? ["."] : ["clear"]), "0", "del"];

  const done = () => {
    let n = Number(buf);
    if (Number.isNaN(n)) n = value;
    n = Math.min(max, Math.max(min, Number(n.toFixed(2))));
    tick();
    onClosed();
    onDone(n);
  };

  return (
    <SheetWrap opened={opened} onClosed={onClosed} label="Number pad">
      <div className="p-4 pb-safe">
        {/* Also accepts a hardware / OS keyboard on desktop. */}
        <input
          type="text"
          inputMode={allowDecimal ? "decimal" : "numeric"}
          value={buf}
          onChange={(e) => {
            const next = e.target.value.replace(/[^0-9.]/g, "");
            setBuf(next);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") done();
          }}
          aria-label="Number pad value"
          className="num w-full text-center font-display text-3xl mb-3 bg-transparent"
          style={{ fontVariantNumeric: "tabular-nums", border: 0, color: "var(--text)" }}
        />
        <div className="grid grid-cols-3 gap-2">
          {keys.map((k) => (
            <button
              key={k}
              type="button"
              className="numpad-key"
              aria-label={k === "del" ? "Delete" : k === "clear" ? "Clear" : k}
              onClick={() =>
                press(k === "clear" ? "del" : k)
              }
            >
              {k === "del" ? "⌫" : k === "clear" ? "✕" : k}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="mt-3 w-full font-display text-xl"
          style={{
            height: 64,
            borderRadius: 14,
            background: "var(--accent)",
            color: "var(--on-accent)",
            border: "2px solid var(--rule)",
          }}
          onClick={done}
        >
          Done
        </button>
      </div>
    </SheetWrap>
  );
}

/* ================= Qty stepper (7.2) ================================== */

export function QtyStepper({
  qty,
  unit,
  units,
  onQty,
  onUnit,
}: {
  qty: number;
  unit: string;
  units: readonly string[];
  onQty: (v: number) => void;
  onUnit: (u: string) => void;
}) {
  const [num, setNum] = useState(false);
  const button = (kids: ReactNode, label: string, step: number) => (
    <HoldButton
      label={label}
      onStep={() => onQty(Math.max(0, Number((qty + step).toFixed(2))))}
    >
      {kids}
    </HoldButton>
  );
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex gap-2">
        {button("−10", "Decrease by 10", -10)}
        {button("−1", "Decrease by 1", -1)}
      </div>
      <button
        type="button"
        className="btn-56 num min-w-24 text-lg"
        onClick={() => setNum(true)}
        aria-label={`Quantity ${fmtVal(qty)} ${unitsLabel(unit)} — open numpad`}
      >
        <span key={qty} className="roll">
          {fmtVal(qty)}
        </span>
        <span className="text-xs opacity-70 ml-1">{unitsLabel(unit)}</span>
      </button>
      <div className="flex gap-2">
        {button("+1", "Increase by 1", 1)}
        {button("+10", "Increase by 10", 10)}
      </div>
      <select
        className="btn-56 !min-h-14 text-sm px-3"
        value={unit}
        onChange={(e) => onUnit(e.target.value)}
        aria-label="Unit"
      >
        {units.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>
      <NumpadSheet
        opened={num}
        onClosed={() => setNum(false)}
        value={qty}
        min={0}
        max={100000}
        allowDecimal
        onDone={onQty}
      />
    </div>
  );
}

function unitsLabel(u: string) {
  return u === "m³" ? "m³" : u;
}

/* ================= Lined textarea (7.3) ================================ */

export function Lined({
  label,
  value,
  onChange,
  lines = 3,
  chips,
  onChip,
  help,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  lines?: number;
  chips?: string[];
  onChip?: (chip: string) => string;
  help?: string;
}) {
  const ta = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    if (!CSS.supports?.("field-sizing", "content")) {
      const el = ta.current;
      if (el) {
        el.style.height = "auto";
        el.style.height = el.scrollHeight + "px";
      }
    }
  }, [value]);
  const appendChip = (chip: string) => {
    const next = onChip
      ? onChip(chip)
      : (value && !value.endsWith("\n") ? value + "\n" : value) + chip + " — ";
    onChange(next);
    requestAnimationFrame(() => {
      el_focus();
    });
    function el_focus() {
      const el = ta.current;
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    }
  };
  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-1">
        <span className="font-display text-lg">{label}</span>
      </div>
      {chips && chips.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-2 flex-nowrap">
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              className="chip whitespace-nowrap shrink-0"
              aria-label={`${label}: add ${c}`}
              onClick={() => appendChip(c)}
            >
              <Icon name="plus" size={16} />
              {c}
            </button>
          ))}
        </div>
      )}
      <textarea
        ref={ta}
        className="lined"
        style={{ ["--lines" as never]: lines }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={lines}
        aria-label={label}
        spellCheck
        autoCapitalize="sentences"
        enterKeyHint="enter"
        placeholder={help}
      />
    </div>
  );
}

/* ================= Section card (8.2) ================================= */

export function SectionCard({
  id,
  title,
  summary,
  icon,
  open,
  onToggle,
  children,
  tone,
}: {
  id: string;
  title: string;
  summary?: string;
  icon?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  tone?: "alert";
}) {
  /* Content mounts on first open and stays mounted after that. Closed
     sections therefore add no DOM/render cost while a tape drag updates
     the report (the 55 fps budget in 8.4). */
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);
  return (
    <section
      id={id}
      className={`card cv-auto ${tone === "alert" ? "!border-2 !border-dashed" : ""}`}
      style={tone === "alert" ? { borderColor: "var(--accent)" } : undefined}
    >
      <h2>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={`${id}-body`}
          className="w-full flex items-center gap-3 px-4 py-3 text-left"
        >
          {icon && <Icon name={icon} size={26} duo />}
          <span className="font-display text-2xl flex-1">{title}</span>
          {summary && (
            <span className="text-sm num" style={{ color: "var(--muted)" }}>
              {summary}
            </span>
          )}
          <span
            aria-hidden
            className="transition-transform"
            style={{ transform: open ? "rotate(90deg)" : "none" }}
          >
            ›
          </span>
        </button>
      </h2>
      <div className="card-collapse" data-open={open} id={`${id}-body`}>
        <div className="inner">
          <div className="px-4 pb-4">{mounted ? children : null}</div>
        </div>
      </div>
    </section>
  );
}

/* ================= Chip row with sheet (6.2) =========================== */

export function ChipRow({
  chips,
  onPick,
  onOther,
  moreLabel = "More…",
}: {
  chips: string[];
  onPick: (name: string) => void;
  onOther?: () => void;
  moreLabel?: string;
}) {
  const [more, setMore] = useState(false);
  const top8 = chips.slice(0, 8);
  const rest = chips.slice(8);
  return (
    <div className="flex flex-wrap gap-2">
      {top8.map((c) => (
        <button
          key={c}
          type="button"
          className="chip"
          aria-label={`Add ${c}`}
          onClick={() => onPick(c)}
        >
          {c}
        </button>
      ))}
      {rest.length > 0 && (
        <button type="button" className="chip ghost" onClick={() => withTransition(() => setMore(true))}>
          {moreLabel}
        </button>
      )}
      {onOther && (
        <button type="button" className="chip ghost" onClick={onOther}>
          Other…
        </button>
      )}
      <SheetWrap
        opened={more}
        onClosed={() => setMore(false)}
        label="Full catalogue"
        className="max-h-[85vh] overflow-y-auto"
      >
        <div className="p-4 pb-safe overflow-y-auto max-h-full">
          <div className="flex justify-between items-center mb-3">
            <span className="font-display text-2xl">Full catalogue</span>
            <button
              type="button"
              className="btn-56"
              aria-label="Close list"
              onClick={() => setMore(false)}
            >
              <Icon name="minus" size={22} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <button
                key={c}
                type="button"
                className="chip"
                onClick={() => {
                  setMore(false);
                  onPick(c);
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </SheetWrap>
    </div>
  );
}

/* ================= Undo snackbar (6.4b) ================================ */

export interface UndoMsg {
  msg: string;
  fn: () => void;
  key: number;
}

export function UndoSnackbar({ undo }: { undo: UndoMsg | null }) {
  useEffect(() => {
    if (!undo) return;
    const t = window.setTimeout(() => {
      document.dispatchEvent(new CustomEvent("undo-timeout", { detail: undo.key }));
    }, 6000);
    return () => window.clearTimeout(t);
  }, [undo]);
  if (!undo) return null;
  return (
    <div
      role="status"
      className="fixed left-1/2 -translate-x-1/2 z-50 p-3 rounded-xl shadow-lg flex items-center gap-4"
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)",
        background: "var(--band)",
        color: "var(--on-band)",
      }}
    >
      <Icon name="undo" size={20} />
      <span className="text-sm font-semibold">{undo.msg}</span>
      <button
        type="button"
        className="font-display text-lg"
        style={{ color: "var(--accent)" }}
        onClick={undo.fn}
      >
        Undo
      </button>
    </div>
  );
}
