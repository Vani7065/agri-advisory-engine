const SW_URL = "/sw.js";

const BLOCKED_HOST_PREFIXES = ["id-preview--", "preview--"];
const BLOCKED_HOST_SUFFIXES = [
  "lovableproject.com",
  "lovableproject-dev.com",
  "beta.lovable.dev",
];

function isBlockedHost(hostname: string): boolean {
  if (BLOCKED_HOST_PREFIXES.some((prefix) => hostname.startsWith(prefix))) return true;
  return BLOCKED_HOST_SUFFIXES.some(
    (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`),
  );
}

async function unregisterAppServiceWorkers(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    registrations
      .filter((registration) => {
        const scriptUrl =
          registration.active?.scriptURL ??
          registration.waiting?.scriptURL ??
          registration.installing?.scriptURL ??
          "";
        return scriptUrl.endsWith(SW_URL);
      })
      .map((registration) => registration.unregister()),
  );
}

/**
 * Single place where the service worker is registered.
 * Refuses to register inside an iframe, in Lovable preview hosts,
 * or when the URL carries ?sw=off — and cleans up stale registrations there.
 */
export function registerServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const url = new URL(window.location.href);
  const refused =
    window.self !== window.top ||
    isBlockedHost(window.location.hostname) ||
    url.searchParams.get("sw") === "off";

  if (refused) {
    void unregisterAppServiceWorkers();
    return;
  }

  navigator.serviceWorker
    .register("/sw.js")
    .then((registration) => {
      console.log("Service Worker registered with scope:", registration.scope);
    })
    .catch((err) => {
      console.warn("Service Worker registration notice:", err?.message || err);
    });
}