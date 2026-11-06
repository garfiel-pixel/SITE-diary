/* Smart location input — linear (start to end) or zone mode.
   The saved value is still a plain string; the mode is a local UX convenience. */
import { useEffect, useState } from "react";
import { Icon } from "../icons";
import { bumpMemo } from "../db";

interface SmartSiteInputProps {
  value: string;
  suggestions: string[];
  onChange: (value: string) => void;
}

const ZONES = ["Zone A", "Zone B", "Zone C", "Zone D", "Zone E"];

export function SmartSiteInput({ value, suggestions, onChange }: SmartSiteInputProps) {
  const [mode, setMode] = useState<"linear" | "zone">(() =>
    /\s+to\s+/.test(value) ? "linear" : "zone"
  );
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  useEffect(() => {
    if (mode === "linear") {
      const parts = value.split(/\s+to\s+/);
      setStart(parts[0] ?? "");
      setEnd(parts[1] ?? "");
    }
  }, [mode, value]);

  const commitLinear = (a: string, b: string) => {
    const s = a.trim();
    const e = b.trim();
    if (!s && !e) onChange("");
    else if (!e) onChange(s);
    else onChange(`${s} to ${e}`);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          data-testid="site-mode-linear"
          className={`chip flex-1 justify-center ${mode === "linear" ? "on" : ""}`}
          aria-pressed={mode === "linear"}
          onClick={() => setMode("linear")}
        >
          <Icon name="list" size={16} />
          Linear
        </button>
        <button
          type="button"
          data-testid="site-mode-zone"
          className={`chip flex-1 justify-center ${mode === "zone" ? "on" : ""}`}
          aria-pressed={mode === "zone"}
          onClick={() => setMode("zone")}
        >
          <Icon name="users" size={16} />
          Zone
        </button>
      </div>

      {mode === "linear" ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            list="site-linear-options"
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              commitLinear(e.target.value, end);
            }}
            onBlur={() => value.trim() && void bumpMemo("site", value)}
            className="btn-56 flex-1 px-3 text-left"
            placeholder="e.g. 0+400"
            aria-label="Site start"
          />
          <span className="font-display text-lg" style={{ color: "var(--muted)" }}>to</span>
          <input
            type="text"
            list="site-linear-options"
            value={end}
            onChange={(e) => {
              setEnd(e.target.value);
              commitLinear(start, e.target.value);
            }}
            onBlur={() => value.trim() && void bumpMemo("site", value)}
            className="btn-56 flex-1 px-3 text-left"
            placeholder="e.g. 0+900"
            aria-label="Site end"
          />
          <datalist id="site-linear-options">
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <input
            type="text"
            list="site-zone-options"
            id="mi-site"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => value.trim() && void bumpMemo("site", value)}
            className="btn-56 w-full px-4 text-left"
            placeholder="Site location"
            aria-label="Site"
          />
          <datalist id="site-zone-options">
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <div className="flex flex-wrap gap-1.5">
            {ZONES.map((z) => (
              <button
                key={z}
                type="button"
                className={`chip ${value === z ? "on" : ""}`}
                aria-pressed={value === z}
                onClick={() => {
                  onChange(z);
                  void bumpMemo("site", z);
                }}
              >
                {z}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
