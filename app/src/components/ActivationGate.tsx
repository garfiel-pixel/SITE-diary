/* Access gate (demo). Single example code, constant-time compare over
   SHA-256 digests. This is a DEMO GATE, NOT SECURITY. No accounts,
   no passwords, no server. */
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { CONFIG } from "../config";
import { setSetting } from "../db";
import { Icon } from "../icons";
const logoUrl = "/brand/logo.jpg";

const DEMO_CODE = CONFIG.activation.exampleCode;

async function sha256Hex(s: string): Promise<Uint8Array> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return new Uint8Array(buf);
}

/* Constant-time byte comparison of two digests. */
function ctCompare(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export function ActivationGate() {
  const [boxes, setBoxes] = useState<string[]>(Array(12).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wantHint, setWantHint] = useState(
    import.meta.env.DEV || new URLSearchParams(location.search).has("demo")
  );
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const setAt = (i: number, ch: string) => {
    setBoxes((b) => {
      const n = [...b];
      n[i] = ch.slice(-1).toUpperCase();
      if (ch) refs.current[i + 1]?.focus();
      return n;
    });
  };

  const key = (i: number) => (e: KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (!boxes[i] && i > 0) {
        setBoxes((b) => {
          const n = [...b];
          n[i - 1] = "";
          return n;
        });
        refs.current[i - 1]?.focus();
      }
      e.preventDefault();
    }
  };

  const activate = async () => {
    const code = boxes.join("");
    if (!code.trim()) {
      setError("Enter the activation code");
      return;
    }
    setBusy(true);
    setError(null);
    const [a, b] = await Promise.all([sha256Hex(DEMO_CODE), sha256Hex(code)]);
    if (ctCompare(a, b)) {
      await setSetting(CONFIG.activation.storeKey, "on");
      // let the live query flip; no further action
    } else {
      setError("Code not recognised — try again");
      setBoxes(Array(12).fill(""));
      refs.current[0]?.focus();
    }
    setBusy(false);
  };

  const paste = async (text: string) => {
    const clean = text.replace(/[^A-Za-z0-9-]/g, "").toUpperCase().slice(0, 12);
    if (!clean) return;
    setBoxes(Array.from(clean.padEnd(12, " ").slice(0, 12), (c) => (c === " " ? "" : c)));
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: "var(--band)", color: "var(--on-band)" }}
    >
      <div
        className="rounded-2xl bg-white p-2 mb-6 inline-block"
        aria-hidden="false"
      >
        <div
          role="img"
          aria-label={`${CONFIG.company} — ${CONFIG.tagline} logo`}
          style={{
            width: 110,
            height: Math.round((110 * 816) / 1308),
            backgroundImage: `url("${logoUrl}")`,
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
          }}
        />
      </div>
      <h1 className="font-display text-3xl mb-1" style={{ color: "var(--accent)" }}>
        ACTIVATE THIS PHONE
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--on-band)" }}>
        {CONFIG.company} — daily site diary. One code per demo device.
      </p>

      <div
        className="input-row"
        onPaste={(e) => {
          e.preventDefault();
          void paste(e.clipboardData.getData("text"));
        }}
      >
        <input
          type="text"
          value=""
          onChange={(e) => void paste(e.target.value)}
          autoComplete="one-time-code"
          inputMode="text"
          aria-label="Activation code"
          style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
          tabIndex={-1}
        />
        <div className="flex gap-1.5 flex-wrap max-w-95">
          {boxes.map((c, i) => (
            <input
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              value={c}
              onChange={(e) => setAt(i, e.target.value)}
              onKeyDown={key(i)}
              inputMode="text"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              aria-label={`Activation code character ${i + 1} of 12`}
              className="num text-center text-xl"
              style={{
                width: 44,
                height: 56,
                borderRadius: 10,
                border: `2px solid ${error ? "#B03030" : "var(--rule)"}`,
                background: "#fff",
                color: "#0B0B0B",
                fontWeight: 700,
              }}
            />
          ))}
        </div>
      </div>

      {error && (
        <p className="flex items-center gap-2 mt-3 font-semibold" role="alert">
          <Icon name="warning" size={20} /> {error}
        </p>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={activate}
        className="mt-6 font-display text-2xl px-8"
        style={{
          minHeight: 64,
          borderRadius: 16,
          background: "var(--accent)",
          color: "var(--on-accent)",
          border: 0,
        }}
      >
        {busy ? "Checking…" : "ACTIVATE"}
      </button>

      {wantHint && (
        <p className="mt-4 text-xs" style={{ color: "#8a8a8a" }}>
          Demo code: <b>{DEMO_CODE}</b> (shown in dev / ?demo only)
        </p>
      )}

      <p className="mt-10 text-xs max-w-80 text-center" style={{ color: "#8a8a8a" }}>
        Demo gate — not security. Reports stay on this phone.
      </p>
    </div>
  );
}
