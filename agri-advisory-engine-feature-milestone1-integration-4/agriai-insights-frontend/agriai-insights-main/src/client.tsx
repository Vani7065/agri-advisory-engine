import "./lib/i18n"; // Must be imported FIRST before React loads!

import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { StartClient } from "@tanstack/react-start/client";

import { registerServiceWorker } from "./lib/pwa";

// Hydrate TanStack Start App
startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>
  );
});

// Register Progressive Web App Service Worker (single, centralized registration)
if (typeof window !== "undefined") {
  registerServiceWorker();
}