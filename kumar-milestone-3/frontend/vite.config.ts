import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import { NodeRequest, sendNodeResponse } from "srvx/node";
import { serveStatic } from "srvx/static";

function nitroPreviewPlugin() {
  return {
    name: "nitro-preview-plugin",
    configurePreviewServer(server: any) {
      return () => {
        let nitroServer: any = null;
        const publicDir = resolve(process.cwd(), ".output/public");
        const staticHandler = serveStatic({ dir: publicDir });

        server.middlewares.use(async (req: any, res: any, next: any) => {
          try {
            const nitroPath = resolve(process.cwd(), ".output/server/index.mjs");
            if (!existsSync(nitroPath)) {
              return next(
                new Error(`Nitro build output not found at ${nitroPath}. Please run 'npm run build' first.`)
              );
            }
            if (!nitroServer) {
              nitroServer = (await import(pathToFileURL(nitroPath).href)).default;
            }
            const protocol = req.headers["x-forwarded-proto"] || (req.socket?.encrypted ? "https" : "http");
            const host = req.headers.host || "localhost";
            const fullUrl = new URL(req.url || "/", `${protocol}://${host}`).href;
            const headers = new Headers();
            for (const [key, value] of Object.entries(req.headers)) {
              if (value !== undefined) {
                if (Array.isArray(value)) {
                  for (const v of value) headers.append(key, v);
                } else {
                  headers.set(key, String(value));
                }
              }
            }
            const method = req.method || "GET";
            const hasBody = method !== "GET" && method !== "HEAD";
            const webReq = new Request(fullUrl, {
              method,
              headers,
              body: hasBody ? req : null,
              duplex: hasBody ? "half" : undefined,
            } as any);

            const staticRes = await staticHandler(webReq, (() => undefined) as any);
            if (staticRes) {
              return sendNodeResponse(res, staticRes);
            }

            const webRes = await nitroServer.fetch(webReq, {}, { waitUntil() {} });
            if (webRes) {
              if (webRes.headers.get("content-type")?.startsWith("text/html")) {
                res.setHeader("content-encoding", "identity");
              }
              return sendNodeResponse(res, webRes);
            }
            next();
          } catch (error) {
            next(error);
          }
        });
      };
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    preview: {},
    plugins: [
      nitroPreviewPlugin(),
      VitePWA({
        injectRegister: null, // Manual registration using pwa-register virtual module
        manifest: {
          name: "AgriAI Smart Assistant",
          short_name: "AgriAI",
          description: "AI-powered multilingual agricultural advisory system for crops, weather, market prices, and disease diagnosis.",
          theme_color: "#15803d",
          background_color: "#ffffff",
          display: "standalone",
          start_url: "/",
          icons: [
            {
              src: "icon.svg",
              sizes: "any",
              type: "image/svg+xml",
              purpose: "any maskable"
            }
          ]
        },
        workbox: {
          // --- Milestone 3 Phase 2 Caching Layer Configuration ---
          //
          // 1. Static Asset Precaching:
          // We configure globDirectory to point to '.output/public' (Nitro's static assets output directory)
          // so that Workbox can locate and index the compiled assets. We configure globPatterns to match
          // all critical static assets generated during the build.
          // This tells Workbox to download and cache these assets immediately on service worker installation
          // (Cache-first/Precache strategy), guaranteeing instant loading and visual stability.
          //
          // - JS (*.js) & CSS (*.css): Essential for React rendering, page routing, and interface layout/styling.
          // - Images (*.png, *.jpg, *.jpeg, *.svg, *.ico): Application branding, dashboard graphics, and leaf icons.
          // - Fonts (*.woff, *.woff2, *.ttf): Custom typography to prevent font layout shifts.
          // - Webmanifest (*.webmanifest): Application installability and shortcut assets.
          globDirectory: ".output/public",
          globPatterns: ["**/*.{js,css,html,svg,png,jpg,jpeg,ico,woff,woff2,ttf,webmanifest}"],

          // 2. Excluding Dynamic Routes & API/Chat Responses:
          // Since Workbox precaching only scans the local build output directory, server-side APIs (such as
          // '/api/v1/query/text', '/api/v1/query/audio', or RAG endpoints) are naturally excluded.
          // We deliberately do NOT define any runtimeCaching rules for these dynamic routes to ensure that
          // farmers always query the backend live for real-time, accurate agricultural advisory and mandi pricing.
        },
        devOptions: {
          enabled: true,
        }
      })
    ]
  }
});

