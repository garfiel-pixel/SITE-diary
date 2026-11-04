/// <reference types="vite/client" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt", // never reload under someone mid-form
      includeAssets: ["brand/logo.jpg"],
      manifest: {
        name: "Pave-Con Site Diary",
        short_name: "Site Diary",
        description:
          "Daily site diary for Pave-Con Ltd — paving & construction. Works offline.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#0B0B0B",
        background_color: "#0B0B0B",
        lang: "en-JM",
        icons: [
          {
            src: "pwa-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: [
          "**/*.{js,css,html,woff2,woff,jpg,png,svg,webmanifest}",
        ],
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // pdfmake chunk
        runtimeCaching: [
          {
            // Optional weather suggestion (flag off by default). Network-only
            // so a failed request can never break offline use.
            urlPattern: /^https:\/\/api\.open-meteo\.com\//,
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ],
});
