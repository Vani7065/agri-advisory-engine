import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 8801, // 👈 Set to port 8801
    strictPort: true, // 👈 Ensures Vite will ONLY use port 8801 and won't switch
  },
  plugins: [
    tsconfigPaths(), // 👈 Must be placed FIRST
    tailwindcss(),
    tanstackStart(),
    react(),
    VitePWA({
      injectRegister: "script",
      registerType: "autoUpdate",
      manifestFilename: "manifest.json",
      devOptions: {
        enabled: true,
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,json}"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      includeAssets: ["favicon.ico", "favicon.png", "icons/apple-touch-icon.png"],
      manifest: {
        name: "Kisan Sahayak — AI Agricultural Advisory",
        short_name: "Kisan Sahayak",
        description: "Offline-ready farming advisory",
        theme_color: "#166534",
        background_color: "#f7f6ef",
        display: "standalone",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/maskable-icon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
});