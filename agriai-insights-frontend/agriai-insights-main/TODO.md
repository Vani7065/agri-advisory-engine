# PWA Integration — Implementation TODO

## Goal
Add the missing PWA functionality to the TanStack Start + Lovable app without touching existing UI/application logic:
- Service Worker generation (`/sw.js`)
- Service Worker registration (autoUpdate)
- Install App prompt (Chrome detection)
- Offline caching of static assets

## Steps
- [x] 1. Create `src/vite-env.d.ts` — Vite + `virtual:pwa-register` type references
- [x] 2. Create `src/client.tsx` — TanStack Start client entry (auto-detected) + SW registration
- [x] 3. Configure `vite-plugin-pwa` in `vite.config.ts` (additive, via `vite.plugins`)
- [x] 4. Add manifest + theme-color + apple-touch-icon head links to `src/routes/__root.tsx` (head metadata only)
- [x] 5. Fix `src/lib/pwa.ts` — remove `!PROD` guard so SW registers in dev (autoUpdate + devOptions.enabled)
- [x] 6. Mount `InstallPrompt` + `OfflineBanner` in `src/components/layout/AppShell.tsx` (existing components)
- [x] 7. Update `src/vite-env.d.ts` reference to `vite-plugin-pwa/client`
- [x] 8. Verify `npm run build` — sw.js + manifest generated, no errors
- [x] 9. Verify `npm run dev` — `/manifest.json`, `/sw.js`, SW Registered, Install button, offline

## Fixes applied (round 2)
- [x] Fix `vite.config.ts` — wrap PWA options in `VitePWA({...})` (was malformed), correct maskable icon filename to `icons/maskable-icon.png`
- [x] Fix `vite.config.ts` — correct `tanstackStart` import to `@tanstack/react-start/plugin/vite` (was `@tanstack/start/plugin`, which isn't installed → build-breaking)
- [x] Fix `src/lib/pwa.ts` — allow SW registration in dev (remove dev-refusal), keep iframe/preview-host cleanup
- [x] Fix `src/client.tsx` — use centralized `registerServiceWorker()` instead of direct `registerSW` (avoid double registration)
- [x] Fix `src/routes/__root.tsx` — correct apple-touch-icon path to `/icons/apple-touch-icon.png`

## Verified
- [x] `npm run build` succeeds — `dist/sw.js` (Service Worker) + `dist/workbox-*.js` generated
- [x] PWA manifest configured (icons/theme/display standalone)

## Files
### Created
- `src/vite-env.d.ts`
- `src/client.tsx`

### Modified
- `vite.config.ts`
- `src/routes/__root.tsx` (head metadata only)
- `src/lib/pwa.ts` (dev registration allowed)
- `src/components/layout/AppShell.tsx` (mount InstallPrompt + OfflineBanner)
- `src/vite-env.d.ts` (type reference)

### Not touched
Header, Sidebar, Footer, ConnectionPill, InstallPrompt, OfflineBanner, usePwaInstall, useOnlineStatus,
all routes/pages, components, styles, i18n, mock data.
