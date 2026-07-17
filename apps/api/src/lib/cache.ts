// apps/api/src/lib/cache.ts

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export const ONE_DAY_MS = 24 * 60 * 60 * 1000;
export const ONE_WEEK_MS = 7 * ONE_DAY_MS;

/**
 * Returns the cached value for `key` if still fresh, otherwise calls
 * `fetcher`, caches the result for `ttlMs`, and returns it. Concurrent calls
 * for the same not-yet-cached key each trigger their own fetch (no
 * in-flight de-duping) — acceptable here since these endpoints are rarely
 * hit concurrently before the first cache fill.
 */
export async function getOrSetCache<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = store.get(key) as CacheEntry<T> | undefined;
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const value = await fetcher();
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

export function clearCache(key?: string): void {
  if (key) {
    store.delete(key);
  } else {
    store.clear();
  }
}
