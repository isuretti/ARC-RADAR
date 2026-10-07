/**
 * Simple in-memory cache with TTL.
 * Prevents redundant RPC/API calls across components.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  clear(): void {
    this.store.clear();
  }
}

export const cache = new MemoryCache();

export const TTL = {
  PRICE: 30_000,          // 30s — prices
  TOKEN_LIST: 60_000,     // 1m  — token listings
  TOKEN_DETAIL: 45_000,   // 45s — individual token data
  TRADES: 20_000,         // 20s — recent trades
  HOLDERS: 120_000,       // 2m  — holder list (changes slowly)
  CONTRACT: 300_000,      // 5m  — contract metadata
  DEX_STATS: 90_000,      // 90s — DEX statistics
  BLOCK: 10_000,          // 10s — block number
} as const;

/** Wrap a function call with caching */
export async function withCache<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>,
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached !== null) return cached;
  const result = await fn();
  cache.set(key, result, ttl);
  return result;
}
