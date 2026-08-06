/**
 * AgriAI Phase 8 — CachedDataBanner
 *
 * A small amber pill displayed inside a card when it is serving cached data
 * instead of a live API response.
 *
 * Renders nothing (`null`) when `isFromCache` is false so it is safe to
 * unconditionally include in every card's JSX.
 *
 * The `cachedAt` prop accepts a Unix timestamp (ms) from `cache.ts` and
 * converts it to a human-readable relative string ("just now", "3 min ago",
 * "2h ago", etc.) so farmers know how fresh the data is.
 */
import { History, Clock } from "lucide-react";

// ─── Relative Time Formatting ─────────────────────────────────────────────────

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CachedDataBannerProps {
  /** When true the banner is visible; when false nothing is rendered. */
  isFromCache: boolean;
  /**
   * Unix timestamp (ms) indicating when this data was originally fetched
   * and stored. Displayed as a relative time string. Pass `null` to omit
   * the timestamp portion.
   */
  cachedAt: number | null;
}

export function CachedDataBanner({ isFromCache, cachedAt }: CachedDataBannerProps) {
  if (!isFromCache) return null;

  return (
    <div
      className="mb-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-400"
      role="status"
      aria-live="polite"
    >
      <History className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>Showing previously saved data.</span>
      {cachedAt !== null && (
        <span className="ml-auto flex items-center gap-1 text-amber-600/80 dark:text-amber-500/80">
          <Clock className="h-3 w-3" aria-hidden="true" />
          {formatRelativeTime(cachedAt)}
        </span>
      )}
    </div>
  );
}
