/**
 * AgriAI Phase 8 — useOfflineCache
 *
 * Generic React hook that wraps the IndexedDB cache layer.
 * On mount (or key change) it pre-loads any non-expired entry from IDB.
 * Components use `saveToCache` after a successful live fetch to persist data.
 *
 * Usage:
 *   const { cachedData, cachedAt, saveToCache } =
 *     useOfflineCache<MyType>("my-key", TTL.WEATHER);
 */
import { useState, useEffect, useCallback } from "react";
import { getCacheEntry, setCacheEntry, type CacheResult } from "@/lib/cache";

export interface UseOfflineCacheReturn<T> {
  /** Last non-expired value read from IndexedDB (null if none). */
  cachedData: T | null;
  /** Unix timestamp (ms) when the cached value was stored — for "X min ago" display. */
  cachedAt: number | null;
  /**
   * Persist `value` to IndexedDB under this hook's key with the configured TTL.
   * Also updates `cachedData` and `cachedAt` in local state.
   */
  saveToCache: (value: T) => void;
}

export function useOfflineCache<T>(
  key: string,
  ttlMs: number
): UseOfflineCacheReturn<T> {
  const [cachedData, setCachedData] = useState<T | null>(null);
  const [cachedAt, setCachedAt] = useState<number | null>(null);

  // Pre-load from IDB on mount / key change
  useEffect(() => {
    let mounted = true;

    getCacheEntry<T>(key).then((result: CacheResult<T> | null) => {
      if (!mounted || !result || result.isExpired) return;
      setCachedData(result.data);
      setCachedAt(result.cachedAt);
    });

    return () => {
      mounted = false;
    };
  }, [key]);

  const saveToCache = useCallback(
    (value: T) => {
      // Fire-and-forget write — never blocks the caller
      void setCacheEntry(key, value, ttlMs);
      // Update local state so components don't need to re-read IDB
      setCachedData(value);
      setCachedAt(Date.now());
    },
    [key, ttlMs]
  );

  return { cachedData, cachedAt, saveToCache };
}
