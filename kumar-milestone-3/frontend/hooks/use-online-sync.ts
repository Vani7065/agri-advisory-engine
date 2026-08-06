/**
 * AgriAI Phase 8 — useOnlineSync
 *
 * Fires `refresh` every time the browser transitions from offline → online.
 *
 * Centralises the "online" event listener pattern that was duplicated in
 * AppShell, AskAISection, VoiceAssistant, and DiseaseUpload (Phase 7).
 * Those components keep their own `isOnline` state for UI; this hook
 * layers on top to trigger data re-fetching without touching their state.
 *
 * The callback is stored in a ref so callers never need to stabilise the
 * function reference — no risk of stale closures or missed re-fetches.
 *
 * Usage:
 *   useOnlineSync(() => { void loadWeather(location); });
 */
import { useEffect, useRef } from "react";

export function useOnlineSync(
  refresh: () => void | Promise<void>
): void {
  const refreshRef = useRef<typeof refresh>(refresh);

  // Keep the ref pointing to the latest callback on every render
  useEffect(() => {
    refreshRef.current = refresh;
  });

  useEffect(() => {
    const handleOnline = () => {
      void refreshRef.current();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []); // Runs once — the ref keeps the callback current
}
