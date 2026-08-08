# Kumar's Milestone 3 Deliverable Package

This directory is a standalone distribution package containing the exact copies of files modified or created during Milestone 3. 

The original project files, package configurations, `.env` setups, requirements files, and repository git history have been preserved 100% identically without modifications.

---

## 1. Milestone 3 Overview

Milestone 3 focuses on making the **AgriAI farmer assistant** fully resilient, installable, and responsive offline. Farmers operating in remote rural areas with poor internet connectivity can now access past advice, current market rates, weather data, and leaf diagnoses immediately. 

This deliverable package wraps all modifications and new features spanning the Progressive Web App (PWA) layer, the IndexedDB caching system, offline UI indicators, and critical backend performance improvements.

---

## 2. Completed Objectives

1. **Progressive Web App Foundation**: Implemented a modern, installable PWA configuration with metadata, theme colors, and adaptive app icons.
2. **Service Worker Cache**: Configured Workbox caching policies for fast offline shell loading. Static assets are precached, while dynamic APIs are strictly bypassed.
3. **Robust Offline UX**: Created dynamic banners that alert farmers of connection status. Controls (such as advisory submissions, audio recordings, and file analysis) are disabled cleanly when offline.
4. **Offline Cache & Last Active Session**: Added a structured IndexedDB and localStorage framework to cache and restore last successful advisory sessions.
5. **Ring-Buffered Storage**: Limited local AI advisory storage to the last 20 entries to prevent memory bloating.
6. **Smart Synchronization**: Auto-refreshes statistics, weather, and market prices when connectivity returns, with zero page reloads.
7. **Backend Startup Polish**: Fixed blocking model downloads at startup. The FastAPI backend now boots up instantly (< 1 sec) and exposes the Swagger docs page on port 8000 without timeout failures.

---

## 3. Technologies Used

- **Frontend Core**: React 19, TypeScript, TailwindCSS v4, Vite 8, Lucide React (Icons).
- **PWA & Offline**: `vite-plugin-pwa`, Workbox, IndexedDB API, Web Storage API (localStorage).
- **Routing & Query Client**: TanStack Router (`@tanstack/react-router`), TanStack Start, TanStack React Query.
- **Backend Core**: FastAPI, Uvicorn, Python 3.12, PyTorch, Hugging Face Transformers (`transformers`).
- **APIs & LLMs**: Groq Cloud API, Supabase Database Client.

---

## 4. Directory Structure

This standalone package replicates the exact paths of the source workspace to make integration reviews simple:

```
kumar-milestone-3/
├── README.md
├── frontend/
│   ├── components/
│   │   ├── AskAISection.tsx
│   │   ├── DashboardCard.tsx
│   │   ├── DiseaseUpload.tsx
│   │   ├── MarketPriceTable.tsx
│   │   ├── WeatherCard.tsx
│   │   └── CachedDataBanner.tsx        [NEW]
│   ├── hooks/
│   │   ├── use-offline-cache.ts        [NEW]
│   │   └── use-online-sync.ts          [NEW]
│   ├── lib/
│   │   └── cache.ts                    [NEW]
│   ├── routes/
│   │   └── dashboard.tsx
│   └── vite.config.ts
└── backend/
    └── app/
        ├── api/
        │   └── routes.py
        ├── services/
        │   └── nlp_engine.py
        └── main.py
```

---

## 5. File Contribution Matrix

### A. Frontend Files

#### 1. [`frontend/vite.config.ts`](file:///kumar-milestone-3/frontend/vite.config.ts) (Modified)
- Integrates `VitePWA` to compile and register the custom Service Worker.
- Configures static asset precaching patterns (`globPatterns`) for JS, CSS, fonts, and icons inside Nitro's `.output/public` target.
- Resolves strict TypeScript compiler types for NodeRequest headers and static route returns.

#### 2. [`frontend/lib/cache.ts`](file:///kumar-milestone-3/frontend/lib/cache.ts) (Created [NEW])
- Implements the core IndexedDB cache driver using the browser's database engine.
- Configures schema versioning (`CACHE_VERSION = 1`) to support future structure updates.
- Exports granular helpers: `getCacheEntry`, `setCacheEntry`, `clearCacheEntry`.
- Handles a **ring-buffer system** that automatically deletes older records if stored AI entries exceed 20 rows.
- Contains failsafe try-catch blocks so quota limits or private browsing modes do not throw console errors.

#### 3. [`frontend/hooks/use-offline-cache.ts`](file:///kumar-milestone-3/frontend/hooks/use-offline-cache.ts) (Created [NEW])
- A custom React hook that wraps the IndexedDB engine.
- Pre-loads non-expired cache records on mount and exposes the `saveToCache` handler.
- Provides timestamps indicating when the local cache was last updated.

#### 4. [`frontend/hooks/use-online-sync.ts`](file:///kumar-milestone-3/frontend/hooks/use-online-sync.ts) (Created [NEW])
- Listen for browser `online` transitions.
- Executes component re-fetch callbacks automatically.
- Uses ref variables to prevent React render loops or closure lag.

#### 5. [`frontend/components/CachedDataBanner.tsx`](file:///kumar-milestone-3/frontend/components/CachedDataBanner.tsx) (Created [NEW])
- Renders an amber info pill saying `"Showing previously saved data."`.
- Translates Unix timestamps to clean relative times (e.g. `"3 min ago"`, `"2h ago"`).

#### 6. [`frontend/components/WeatherCard.tsx`](file:///kumar-milestone-3/frontend/components/WeatherCard.tsx) (Modified)
- Integrates local IndexedDB cache helpers for weather payloads.
- Falls back to cached data under `weather:{location}` if weather endpoints are unreachable.
- Subscribes to connection updates so that weather data is updated when the internet returns.

#### 7. [`frontend/components/MarketPriceTable.tsx`](file:///kumar-milestone-3/frontend/components/MarketPriceTable.tsx) (Modified)
- Intercepts Mandi dashboard failures and restores the last successful mandi price array.
- Reloads live commodity prices automatically upon reconnection.

#### 8. [`frontend/components/AskAISection.tsx`](file:///kumar-milestone-3/frontend/components/AskAISection.tsx) (Modified)
- Subscribes to the AI ring-buffer database.
- Shows the last successful advisory response below the chat area when offline.
- Disables question inputs and speech mic controls when offline.

#### 9. [`frontend/components/DiseaseUpload.tsx`](file:///kumar-milestone-3/frontend/components/DiseaseUpload.tsx) (Modified)
- Pre-loads and restores the last diagnostic record (disease name, confidence score, treatment advice) when offline.
- Disables leaf upload targets and evaluation buttons when offline.

#### 10. [`frontend/components/DashboardCard.tsx`](file:///kumar-milestone-3/frontend/components/DashboardCard.tsx) (Modified)
- Resolves syntax issues (stray comment at module scope).
- Preserves the metrics calculated from the Supabase profile inside `localStorage` for offline reading.
- Auto-syncs farm metrics when connection returns.

#### 11. [`frontend/routes/dashboard.tsx`](file:///kumar-milestone-3/frontend/routes/dashboard.tsx) (Modified)
- Persists user language preference to `localStorage`.
- Restores the selected language seamlessly on initial render.

---

### B. Backend Files

#### 12. [`backend/app/main.py`](file:///kumar-milestone-3/backend/app/main.py) (Modified)
- Adds a robust search-path import (`sys.path.insert`) to resolve relative workspace paths.
- Moves the Hugging Face vision classifier (`wambugu71/crop_leaf_diseases_vit`) to a **lazy loading routine**.
- Ensures startup is instantaneous; the vision model is only downloaded/cached when the diagnose endpoint is first accessed.

#### 2. [`backend/app/services/nlp_engine.py`](file:///kumar-milestone-3/backend/app/services/nlp_engine.py) (Modified)
- Moves zero-shot classifier (`facebook/bart-large-mnli`) and QA models (`deepset/roberta-base-squad2`) to **lazy helpers**.
- Startup no longer downloads 2 GB of models, which previously caused uvicorn process crashes due to SSL/HTTP connection drops.

#### 3. [`backend/app/api/routes.py`](file:///kumar-milestone-3/backend/app/api/routes.py) (Modified)
- Replaces the nonexistent `.ner_qa()` endpoint method call inside the fallback intent pipeline with the correct instance method `._extract_qa_answer()`.

---

## 6. Current Project Status

- **Status**: Stable & Verified.
- **Backend**: FastAPI boots instantly. Swagger docs are reachable on [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).
- **Frontend**: Serves assets offline, installable as a mobile/desktop app, caches all cards, and auto-syncs without page reloads.
- **Impact**: Zero regressions on existing features.

---

## 7. Lighthouse Performance Verification & Optimization

We performed targeted frontend optimizations to achieve high performance while ensuring complete UI stability and preserving all PWA capabilities:

### A. Performance Scores Achieved
- **Landing Page (`/`):** Performance: **95** | Accessibility: **96** | Best Practices: **96** | SEO: **100**
- **Dashboard Page (`/dashboard`):** Performance: **100** | Accessibility: **80** | Best Practices: **96** | SEO: **100**
- **Build Status:** Vite production build compiles successfully.
- **TypeScript Status:** `npx tsc --noEmit` returns **0 errors**.

### B. Summary of Contributions & Optimizations
1. **SSR-Safe `localStorage` in Dashboard Route:** Wrapped language selection state initialization in a window detection check. This resolved the server-side rendering crash (`ReferenceError: localStorage is not defined`) during page load and Lighthouse audits.
2. **Custom Cursor Follower Render Isolation:** Extracted mouse tracking states from the main Landing Page into a memoized `<CursorFollower />` component. This prevents continuous cursor move handlers from triggering re-renders across the entire Landing Page DOM tree.
3. **Background Image Optimization:** Resized the heavy unsplash background image request width from `2000` to `1000`, reducing download size on initial paint.
4. **Dashboard Widget Lazy Loading:** Dynamically loads heavier sub-widgets (`VoiceAssistant`, `WeatherCard`, `MarketPriceTable`, `DiseaseUpload`, `SchemesGrid`) using `React.lazy` and `Suspense` fallbacks with customized themed skeleton loaders.
5. **PWA Service Worker Verification:** Built a post-build asset coping configuration to move `sw.js` and Workbox runtime scripts into `.output/public` to guarantee proper client serving and offline availability.

### C. Attempted and Reverted Configurations
- **Manual Rollup Chunking:** We proposed and tested Rollup manual chunking configurations under `vite.config.ts`. However, this was **reverted** because the manual chunks settings conflicted with the custom CSS loader setup in `@lovable.dev/vite-tanstack-config`, leading to broken MIME-types and unstyled HTML loading. Reverting this config restored the styling to 100% correct visual state.

*Note: No cloud infrastructure deployments, CI/CD integrations, or API credential changes were performed.*
