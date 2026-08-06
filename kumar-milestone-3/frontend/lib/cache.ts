/**
 * AgriAI Phase 8 — Offline Cache Layer (IndexedDB)
 *
 * Provides structured offline storage with:
 *  • Cache versioning  (CACHE_VERSION) — bump to invalidate stale schema
 *  • Per-entry TTL     — entries older than TTL are treated as cache misses
 *  • cachedAt timestamp — exposed to the UI ("last updated X min ago")
 *  • AI response ring-buffer capped at MAX_AI_RESPONSES
 *
 * Security: Authentication tokens, API keys, audio blobs, and raw advisory
 * streaming responses are NEVER stored here.
 */

// ─── Versioning ───────────────────────────────────────────────────────────────

/**
 * Increment CACHE_VERSION whenever the shape of a stored value changes.
 * Any existing entry whose recorded version differs from the current
 * CACHE_VERSION is treated as a cache miss and is never served to the UI.
 */
export const CACHE_VERSION = 1;

/** IndexedDB database name — fixed for the lifetime of the app. */
const DB_NAME = "agri_offline_cache";

/**
 * DB_VERSION controls the IndexedDB schema version.
 * Increment this (alongside CACHE_VERSION) when adding / removing object stores.
 */
const DB_VERSION = 1;

const STORE_ENTRIES = "entries";   // General key-value cache
const STORE_AI = "ai_responses";   // AI advisory response ring-buffer

// ─── TTL Constants ────────────────────────────────────────────────────────────

/** Pre-defined time-to-live values (milliseconds) for each data category. */
export const TTL = {
  WEATHER: 6 * 60 * 60 * 1000,      // 6 hours
  MANDI: 4 * 60 * 60 * 1000,        // 4 hours
  AI_RESPONSE: 24 * 60 * 60 * 1000, // 24 hours
  DISEASE: 48 * 60 * 60 * 1000,     // 48 hours
} as const;

/** Maximum number of AI responses kept in the ring-buffer. */
export const MAX_AI_RESPONSES = 20;

// ─── Type Definitions ─────────────────────────────────────────────────────────

/** Internal shape of a record in the `entries` object store. */
interface CacheRecord<T> {
  key: string;
  value: T;
  /** Unix timestamp (ms) when this entry was written — shown in the UI. */
  cachedAt: number;
  /** Unix timestamp (ms) after which this entry is stale. */
  expiresAt: number;
  /** CACHE_VERSION at the time of writing. */
  version: number;
}

/** Shape of a record in the `ai_responses` object store. */
export interface AIResponseRecord {
  id?: number;       // auto-increment primary key
  query: string;
  response: string;
  language: string;
  cachedAt: number;
  version: number;
}

/** What `getCacheEntry` resolves with when a valid entry is found. */
export interface CacheResult<T> {
  data: T;
  /** Unix timestamp (ms) — pass to `CachedDataBanner` for "X min ago" display. */
  cachedAt: number;
  /** True when `Date.now() > expiresAt`; caller should not use stale data. */
  isExpired: boolean;
}

// ─── DB Singleton ─────────────────────────────────────────────────────────────

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);

  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // General key-value store — keyed by `key`
      if (!db.objectStoreNames.contains(STORE_ENTRIES)) {
        db.createObjectStore(STORE_ENTRIES, { keyPath: "key" });
      }

      // AI response ring-buffer — auto-increment so oldest can be trimmed
      if (!db.objectStoreNames.contains(STORE_AI)) {
        const aiStore = db.createObjectStore(STORE_AI, {
          keyPath: "id",
          autoIncrement: true,
        });
        aiStore.createIndex("cachedAt", "cachedAt", { unique: false });
      }
    };

    req.onsuccess = (event) => {
      _db = (event.target as IDBOpenDBRequest).result;

      // Another tab upgraded the DB — close our handle so it can proceed
      _db.onversionchange = () => {
        _db?.close();
        _db = null;
      };

      resolve(_db);
    };

    req.onerror = () => reject(req.error);
    req.onblocked = () =>
      console.warn("[AgriCache] DB upgrade blocked by another open tab.");
  });
}

// ─── General Cache Operations ─────────────────────────────────────────────────

/**
 * Read a cache entry by key.
 *
 * Returns `null` when:
 *  - No entry exists for the key
 *  - The entry's `version` !== CACHE_VERSION (schema upgrade)
 *
 * Returns a `CacheResult` with `isExpired = true` when the entry exists but
 * its TTL has elapsed — callers decide whether to serve stale data.
 */
export async function getCacheEntry<T>(
  key: string
): Promise<CacheResult<T> | null> {
  try {
    const db = await openDB();
    return new Promise<CacheResult<T> | null>((resolve, reject) => {
      const tx = db.transaction(STORE_ENTRIES, "readonly");
      const store = tx.objectStore(STORE_ENTRIES);
      const req = store.get(key);

      req.onsuccess = () => {
        const entry = req.result as CacheRecord<T> | undefined;

        if (!entry) {
          resolve(null);
          return;
        }

        // Version mismatch → treat as cache miss
        if (entry.version !== CACHE_VERSION) {
          resolve(null);
          return;
        }

        resolve({
          data: entry.value,
          cachedAt: entry.cachedAt,
          isExpired: Date.now() > entry.expiresAt,
        });
      };

      req.onerror = () => reject(req.error);
    });
  } catch {
    return null; // Storage unavailable (private browsing, quota exceeded, …)
  }
}

/**
 * Write a value to the cache under `key` with a `ttlMs` expiry.
 * Silently no-ops if storage is unavailable.
 */
export async function setCacheEntry<T>(
  key: string,
  value: T,
  ttlMs: number
): Promise<void> {
  try {
    const db = await openDB();
    const now = Date.now();
    const record: CacheRecord<T> = {
      key,
      value,
      cachedAt: now,
      expiresAt: now + ttlMs,
      version: CACHE_VERSION,
    };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_ENTRIES, "readwrite");
      const req = tx.objectStore(STORE_ENTRIES).put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[AgriCache] setCacheEntry failed:", err);
  }
}

/** Remove a single entry from the cache. */
export async function clearCacheEntry(key: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_ENTRIES, "readwrite");
      const req = tx.objectStore(STORE_ENTRIES).delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[AgriCache] clearCacheEntry failed:", err);
  }
}

/** Wipe all entries from both stores. */
export async function clearAllCache(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_ENTRIES, STORE_AI], "readwrite");
      tx.objectStore(STORE_ENTRIES).clear();
      tx.objectStore(STORE_AI).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("[AgriCache] clearAllCache failed:", err);
  }
}

// ─── AI Response Ring-Buffer ───────────────────────────────────────────────────

/**
 * Append a new AI advisory response to the ring-buffer.
 *
 * After inserting, trims the store to at most `MAX_AI_RESPONSES` by deleting
 * the oldest records (lowest auto-increment IDs) first.
 *
 * This prevents unbounded storage growth while keeping the most recent
 * advisory interactions available offline.
 */
export async function addAIResponse(
  query: string,
  response: string,
  language: string
): Promise<void> {
  try {
    const db = await openDB();

    // 1. Insert the new record
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_AI, "readwrite");
      const record: Omit<AIResponseRecord, "id"> = {
        query,
        response,
        language,
        cachedAt: Date.now(),
        version: CACHE_VERSION,
      };
      const req = tx.objectStore(STORE_AI).add(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // 2. Trim to MAX_AI_RESPONSES — delete oldest by cursor (lowest IDs)
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_AI, "readwrite");
      const store = tx.objectStore(STORE_AI);
      const countReq = store.count();

      countReq.onsuccess = () => {
        const surplus = countReq.result - MAX_AI_RESPONSES;
        if (surplus <= 0) {
          resolve();
          return;
        }

        let deleted = 0;
        const cursorReq = store.openCursor(); // ascending order (oldest first)

        cursorReq.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (!cursor || deleted >= surplus) {
            resolve();
            return;
          }
          cursor.delete();
          deleted++;
          cursor.continue();
        };

        cursorReq.onerror = () => reject(cursorReq.error);
      };

      countReq.onerror = () => reject(countReq.error);
    });
  } catch (err) {
    console.warn("[AgriCache] addAIResponse failed:", err);
  }
}

/**
 * Retrieve the most recently stored AI advisory response.
 *
 * Returns `null` when:
 *  - The store is empty
 *  - The newest record's version !== CACHE_VERSION
 *  - The newest record is older than TTL.AI_RESPONSE
 */
export async function getLatestAIResponse(): Promise<AIResponseRecord | null> {
  try {
    const db = await openDB();
    return new Promise<AIResponseRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE_AI, "readonly");
      const store = tx.objectStore(STORE_AI);

      // Reverse cursor gives us the newest record first (highest ID)
      const req = store.openCursor(null, "prev");

      req.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (!cursor) {
          resolve(null);
          return;
        }

        const record = cursor.value as AIResponseRecord;

        if (record.version !== CACHE_VERSION) {
          resolve(null);
          return;
        }

        const isExpired =
          Date.now() > record.cachedAt + TTL.AI_RESPONSE;
        resolve(isExpired ? null : record);
      };

      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}
