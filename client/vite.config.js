import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { pwaManifest } from "./pwaManifest";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-180.png", "favicon.svg"],
      manifest: pwaManifest,
      workbox: {
        globPatterns: [
          "**/*.{js,css,html,woff2}",
          "assets/background-*.webp",
          "assets/world-map-*.svg",
        ],
      },
    }),
  ],
  server: {
    host: "localhost",
    port: 5173,
    strictPort: false,
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
});
