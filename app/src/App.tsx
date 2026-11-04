/* App shell: black header band, diary screen, black footer band,
   PWA update prompt, settings, activation gate, dev /icons route. */
import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { CONFIG } from "./config";
import { getSetting, setSetting, todayISO } from "./db";
import { bootRecovery } from "./db";
import { seedIfNeeded } from "./seed";
import { startSync } from "./sync";
import { ActivationGate } from "./components/ActivationGate";
import { DiaryScreen } from "./diary/DiaryScreen";
import { SheetWrap } from "./components/SheetWrap";
import { Icon, ALL_ICONS } from "./icons";

/* ---- logo img: supplied JPG, unmodified, from /public (preloaded) ---- */
const logoUrl = "/brand/logo.jpg";

function LogoImage({ width = 120 }: { width?: number }) {
  return (
    <div
      role="img"
      aria-label={`${CONFIG.company} — ${CONFIG.tagline} logo`}
      style={{
        width,
        height: Math.round((width * 816) / 1308),
        backgroundImage: `url("${logoUrl}")`,
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      }}
    />
  );
}

/* ---- boot: recovery, seed, mock-upload listeners -------------------------- */
void (async () => {
  await bootRecovery();
  await seedIfNeeded();
  startSync();
})();

/* ---- service worker (prod only): prompt the user, never auto-reload ------- */
let showUpdateRequested: (() => void) | null = null;

function useServiceWorker() {
  useEffect(() => {
    if (!import.meta.env.PROD || navigator.serviceWorker == null) return;
    let cleanup: (() => void) | undefined;
    void import("workbox-window").then(({ Workbox }) => {
      const w = new Workbox("/sw.js");
      const waiting = () => showUpdateRequested?.();
      w.addEventListener("waiting", waiting);
      void w.register();
      cleanup = () => w.removeEventListener("waiting", waiting);
    });
    return () => cleanup?.();
  }, []);
}

export function AppRoot() {
  useServiceWorker();
  const [updateReady, setUpdateReady] = useState(false);
  useEffect(() => {
    showUpdateRequested = () => setUpdateReady(true);
    return () => {
      showUpdateRequested = null;
    };
  }, []);

  const activation = useLiveQuery(
    async () =>
      (await getSetting<string | null>(CONFIG.activation.storeKey)) ?? "off",
    [],
    "loading"
  );

  if (activation === "loading") return null; // settings still loading
  if (activation !== "on") return <ActivationGate />;
  return <MainShell updateReady={updateReady} clearUpdate={() => setUpdateReady(false)} />;
}

/* ---- main shell ------------------------------------------------------------ */

function MainShell({
  updateReady,
  clearUpdate,
}: {
  updateReady: boolean;
  clearUpdate: () => void;
}) {
  const [date, setDate] = useState(todayISO());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [updateMsg, setUpdateMsg] = useState(!!updateReady);
  const headerRef = useRef<HTMLElement | null>(null);

  /* Publish the live header height so the sticky summary strip can sit
     directly beneath it (safe areas and logo size included). */
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const set = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--header-h", `${h}px`);
      /* anchored sections must clear the header + summary strip (8.4) */
      document.documentElement.style.scrollPaddingTop = `${h + 56}px`;
    };
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (updateReady) setUpdateMsg(true);
  }, [updateReady]);
  useEffect(() => {
    void clearUpdate;
  }, [clearUpdate]);
  void clearUpdate;

  /* theme from Dexie settings (auto | light | dark) */
  const theme = useLiveQuery(
    async () => await getSetting<"auto" | "light" | "dark">("theme"),
    [],
    "auto"
  );
  useEffect(() => {
    const apply = (mode: "auto" | "light" | "dark") => {
      const sysDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const dark = mode === "dark" || (mode === "auto" && sysDark);
      const el = document.documentElement;
      el.dataset.theme = dark ? "dark" : "light";
      el.classList.toggle("dark", dark);
      try {
        localStorage.setItem("pavecon-theme", mode);
      } catch {
        /* private mode */
      }
    };
    const mode = theme ?? "auto";
    apply(mode);
    if (mode === "auto") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const onChange = () => apply("auto");
      mq.addEventListener?.("change", onChange);
      return () => mq.removeEventListener?.("change", onChange);
    }
  }, [theme]);

  return (
    <>
      <header
        ref={headerRef}
        className="sticky top-0 z-40 px-3 pt-2 pb-2 flex items-center gap-3"
        style={{
          background: "var(--band)",
          color: "var(--on-band)",
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)",
        }}
        data-testid="app-header"
      >
        {/* logo plate: 6px white padding on the black band, artwork untouched */}
        <div className="rounded-2xl bg-white p-1.5 shrink-0">
          <LogoImage width={92} />
        </div>
        <div className="flex-1 min-w-0">
          <h1
            className="font-display text-base leading-[1.05]"
            style={{ color: "var(--on-band)" }}
          >
            {CONFIG.formTitle}
          </h1>
          <p className="text-[9px] leading-tight opacity-80 mt-0.5">{CONFIG.motto}</p>
        </div>
        <button
          type="button"
          className="btn-56"
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          data-testid="theme-toggle"
          onClick={() => void setSetting("theme", theme === "dark" ? "light" : "dark")}
          style={{
            background: "transparent",
            color: "var(--on-band)",
            borderColor: "#4a4a4a",
            minWidth: 48,
            minHeight: 48,
          }}
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} size={20} />
        </button>
        <button
          type="button"
          className="btn-56"
          aria-label="Settings"
          data-testid="open-settings"
          onClick={() => setSettingsOpen(true)}
          style={{
            background: "transparent",
            color: "var(--on-band)",
            borderColor: "#4a4a4a",
            minWidth: 48,
            minHeight: 48,
          }}
        >
          <Icon name="lock" size={20} />
        </button>
      </header>

      <DiaryScreen date={date} onDate={setDate} />

      <footer
        className="px-4 py-6 text-center text-xs md:text-sm"
        style={{ background: "var(--band)", color: "var(--on-band)" }}
      >
        <p className="font-display text-base mb-2" style={{ color: "var(--accent)" }}>
          {CONFIG.motto}
        </p>
        <p>
          {CONFIG.company} — {CONFIG.tagline}
        </p>
        <p className="opacity-80">{CONFIG.contact.address}</p>
        <p className="opacity-80">
          {CONFIG.contact.phone} · {CONFIG.contact.email}
        </p>
        <p className="opacity-60 mt-2 text-[10px]">{CONFIG.contactNote}</p>
      </footer>

      <SettingsSheet
        opened={settingsOpen}
        onClosed={() => setSettingsOpen(false)}
        theme={theme ?? "auto"}
      />

      {updateMsg && (
        <div
          role="status"
          data-testid="update-banner"
          className="fixed left-4 right-4 z-50 p-3 rounded-xl shadow-lg flex items-center gap-3"
          style={{
            top: "calc(env(safe-area-inset-top,0px) + 8px)",
            background: "var(--band)",
            color: "var(--on-band)",
          }}
        >
          <Icon name="cloudUploading" size={20} />
          <span className="text-sm flex-1 font-semibold">
            Update ready — tap Reload when convenient
          </span>
          <button
            type="button"
            className="font-display text-lg"
            style={{ color: "var(--accent)" }}
            onClick={() => location.reload()}
          >
            Reload
          </button>
        </div>
      )}
    </>
  );
}

/* ---- settings sheet ---------------------------------------------------------- */

function SettingsSheet({
  opened,
  onClosed,
  theme,
}: {
  opened: boolean;
  onClosed: () => void;
  theme: "auto" | "light" | "dark";
}) {
  const [deferred, setDeferred] = useState((null as unknown as { prompt?: () => Promise<void> } | null));
  const isIOS =
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !((navigator as { standalone?: boolean }).standalone === true) &&
    !window.matchMedia("(display-mode: standalone)").matches;
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true;

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as unknown as { prompt?: () => Promise<void> });
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    await deferred?.prompt?.();
    setDeferred(null);
  };

  const switchOff = async () => {
    await setSetting(CONFIG.activation.storeKey, null);
    location.reload();
  };

  return (
    <SheetWrap opened={opened} onClosed={onClosed} label="Settings">
      <span className="font-display text-2xl block mb-3">Settings</span>

      <div className="mb-4">
        <span className="font-display text-lg block mb-1">Theme</span>
        <div className="flex gap-2">
          {(["auto", "light", "dark"] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={`chip flex-1 justify-center ${theme === m ? "on" : ""}`}
              aria-pressed={theme === m}
              data-testid={`theme-${m}`}
              onClick={() => void setSetting("theme", m)}
            >
              {m === "auto" ? "Auto" : m}
            </button>
          ))}
        </div>
      </div>

      {deferred && (
        <button
          type="button"
          data-testid="install-btn"
          className="chip w-full justify-center mb-2"
          onClick={() => void install()}
        >
          <Icon name="download" size={16} /> Install this app
        </button>
      )}
      {isIOS && !standalone && (
        <p className="text-sm mb-2" style={{ color: "var(--muted)" }}>
          iPhone: tap Share, then “Add to Home Screen”. Leave “Open as Web App” on.
        </p>
      )}

      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
        Voice: use your keyboard's mic for offline dictation. Weather suggestions are
        off in this demo.
      </p>

      <button
        type="button"
        data-testid="switch-phone-off"
        className="chip w-full justify-center mb-1"
        onClick={() => void switchOff()}
      >
        <Icon name="lock" size={16} /> Switch this phone off
      </button>
      <p className="text-xs" style={{ color: "var(--muted)" }}>
        Returns to the activation gate. Reports stay on this device.
      </p>
    </SheetWrap>
  );
}

/* ---- dev-only icons gallery (Gate G2) ------------------------------------------ */
/* Rendered when location.pathname === "/icons" (only wired in dev). */
export function IconGallery() {
  const grid = (theme: "light" | "dark") => (    <section
      data-theme={theme}
      className={theme === "dark" ? "dark" : ""}
      style={{
        background: theme === "dark" ? "#141414" : "#ffffff",
        color: theme === "dark" ? "#f5f5f5" : "#0b0b0b",
        padding: 12,
      }}
    >
      <h2 className="font-display text-xl mb-2">{theme} — 24 px / 48 px duotone</h2>
      <div className="grid grid-cols-5 gap-2" data-testid={`icon-sheet-${theme}`}>
        {ALL_ICONS.map((n) => (
          <div
            key={n}
            className="flex flex-col items-center p-1"
            style={{
              border: `1px solid ${theme === "dark" ? "#3a3a3a" : "#bdbdb8"}`,
              borderRadius: 10,
              background: theme === "dark" ? "#1c1c1c" : "#f6f6f2",
            }}
          >
            <Icon name={n} size={24} />
            <Icon name={n} size={48} duo />
            <span className="text-[9px] truncate w-full text-center" title={n}>
              {n}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
  return (
    <div className="p-2 flex flex-col gap-4">
      <h1 className="font-display text-3xl">Icon sheet — {ALL_ICONS.length} icons</h1>
      {grid("light")}
      {grid("dark")}
    </div>
  );
}
