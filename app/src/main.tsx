import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppRoot, IconGallery } from "./App";

/* Fonts are self-hosted via @fontsource — no CDN anywhere.
   Latin subsets only: smaller precache, same glyph coverage for this UI. */
import "@fontsource/barlow/latin-500.css";
import "@fontsource/barlow/latin-600.css";
import "@fontsource/barlow/latin-700.css";
import "@fontsource/barlow-condensed/latin-700.css";
import "./index.css";

const isDev = import.meta.env.DEV;

const params = new URLSearchParams(location.search);
if (isDev && (location.pathname === "/icons" || params.has("icons"))) {
  createRoot(document.getElementById("root")!).render(<IconGallery />);
} else {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <AppRoot />
    </StrictMode>
  );
}
