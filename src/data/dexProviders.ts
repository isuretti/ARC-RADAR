/**
 * DEX data provider layer.
 *
 * Architecture: Each DEX on Arc implements the DexProvider interface.
 * Providers are registered in the PROVIDERS array.
 * The normalizer calls all registered providers and merges results.
 *
 * Currently: one placeholder provider that queries any DEX
 * subgraph/API that exists on Arc testnet. When a real Arc DEX API
 * becomes available, implement its provider here and register it.
 *
 * All providers return null / empty arrays when unavailable — never fake data.
 */

import { withCache, TTL } from './cache';
import type { PoolInfo, DexStats } from './types';

export interface DexProvider {
  id: string;
  name: string;
  website?: string;

  /** Fetch pools containing a specific token (by address) */
  getPoolsForToken(tokenAddress: string): Promise<PoolInfo[]>;

  /** Fetch aggregate DEX stats */
  getDexStats(): Promise<DexStats | null>;

  /** Health check — true if the provider is reachable */
  isAvailable(): Promise<boolean>;
}

// ── ArcSwap provider (subgraph-based, connected when available) ────────────
// Arc DEX subgraph endpoint — fill in when a subgraph/API is deployed.
const ARC_SWAP_SUBGRAPH = import.meta.env.VITE_ARCSWAP_SUBGRAPH_URL as string | undefined;
const ARC_SWAP_API = import.meta.env.VITE_ARCSWAP_API_URL as string | undefined;

async function gqlFetch<T>(url: string, query: string, variables?: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: T };
    return json?.data ?? null;
  } catch {
    return null;
  }
}

class ArcSwapProvider implements DexProvider {
  id = 'arcswap';
  name = 'ArcSwap';
  website = 'https://arcswap.io';

  async isAvailable(): Promise<boolean> {
    if (!ARC_SWAP_SUBGRAPH && !ARC_SWAP_API) return false;
    const url = ARC_SWAP_SUBGRAPH ?? ARC_SWAP_API!;
    try {
      const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(3_000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  async getPoolsForToken(tokenAddress: string): Promise<PoolInfo[]> {
    if (!ARC_SWAP_SUBGRAPH) return [];
    return withCache(`arcswap:pools:${tokenAddress}`, TTL.TOKEN_DETAIL, async () => {
      const query = `
        query PoolsForToken($token: String!) {
          pools(
            where: {
              or: [
                { token0: $token }
                { token1: $token }
              ]
            }
            orderBy: totalValueLockedUSD
            orderDirection: desc
            first: 20
          ) {
            id
            token0 { id symbol }
            token1 { id symbol }
            totalValueLockedUSD
            volumeUSD
            feeTier
          }
        }
      `;
      const data = await gqlFetch<{
        pools: Array<{
          id: string;
          token0: { id: string; symbol: string };
          token1: { id: string; symbol: string };
          totalValueLockedUSD: string;
          volumeUSD: string;
          feeTier: string;
        }>;
      }>(ARC_SWAP_SUBGRAPH, query, { token: tokenAddress.toLowerCase() });

      if (!data?.pools) return [];

      const pools = data.pools;
      const totalLiq = pools.reduce((sum, p) => sum + parseFloat(p.totalValueLockedUSD || '0'), 0);

      return pools.map((p) => {
        const liq = parseFloat(p.totalValueLockedUSD || '0') || null;
        return {
          dex: this.id,
          dexDisplayName: this.name,
          poolAddress: p.id,
          token0: { address: p.token0.id, symbol: p.token0.symbol },
          token1: { address: p.token1.id, symbol: p.token1.symbol },
          pairLabel: `${p.token0.symbol}/${p.token1.symbol}`,
          liquidity: liq,
          volume24h: parseFloat(p.volumeUSD || '0') || null,
          priceImpact: null,
          shareOfTotal: totalLiq > 0 && liq ? (liq / totalLiq) * 100 : null,
          fee: parseInt(p.feeTier) / 100,
        };
      });
    });
  }

  async getDexStats(): Promise<DexStats | null> {
    if (!ARC_SWAP_SUBGRAPH) return null;
    return withCache(`arcswap:stats`, TTL.DEX_STATS, async () => {
      const query = `
        {
          factories {
            poolCount
            totalValueLockedUSD
            totalVolumeUSD
          }
          pools(orderBy: totalValueLockedUSD orderDirection: desc first: 5) {
            id
            token0 { symbol }
            token1 { symbol }
            totalValueLockedUSD
            volumeUSD
          }
        }
      `;
      const data = await gqlFetch<{
        factories: Array<{ poolCount: string; totalValueLockedUSD: string; totalVolumeUSD: string }>;
        pools: Array<{
          id: string;
          token0: { symbol: string };
          token1: { symbol: string };
          totalValueLockedUSD: string;
          volumeUSD: string;
        }>;
      }>(ARC_SWAP_SUBGRAPH, query);

      if (!data) return null;

      const factory = data.factories?.[0];
      return {
        id: this.id,
        name: this.id,
        displayName: this.name,
        website: this.website,
        totalLiquidity: factory ? parseFloat(factory.totalValueLockedUSD) : null,
        volume24h: null, // subgraph gives total, not 24h — would need timestamp filter
        poolCount: factory ? parseInt(factory.poolCount) : null,
        topPairs: (data.pools ?? []).map((p) => ({
          pairLabel: `${p.token0.symbol}/${p.token1.symbol}`,
          poolAddress: p.id,
          liquidity: parseFloat(p.totalValueLockedUSD) || null,
          volume24h: null,
        })),
        shareOfTotalLiquidity: 100, // only one DEX registered
      };
    });
  }
}

// ── Provider registry ─────────────────────────────────────────────────────
// Add new DEX providers here.
export const PROVIDERS: DexProvider[] = [new ArcSwapProvider()];

/** Get pools for a token across all registered DEX providers */
export async function getAllPoolsForToken(tokenAddress: string): Promise<PoolInfo[]> {
  const results = await Promise.allSettled(
    PROVIDERS.map((p) => p.getPoolsForToken(tokenAddress)),
  );
  const allPools = results
    .filter((r): r is PromiseFulfilledResult<PoolInfo[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value);

  // Recalculate shareOfTotal across all DEXes combined
  const total = allPools.reduce((sum, p) => sum + (p.liquidity ?? 0), 0);
  return allPools.map((p) => ({
    ...p,
    shareOfTotal: total > 0 && p.liquidity != null ? (p.liquidity / total) * 100 : null,
  }));
}

/** Get stats for all registered DEX providers */
export async function getAllDexStats(): Promise<DexStats[]> {
  const results = await Promise.allSettled(PROVIDERS.map((p) => p.getDexStats()));
  return results
    .filter(
      (r): r is PromiseFulfilledResult<DexStats | null> => r.status === 'fulfilled' && r.value !== null,
    )
    .map((r) => r.value!);
}

/** Check availability of all registered providers */
export async function getProviderStatuses(): Promise<Array<{ id: string; name: string; available: boolean }>> {
  const results = await Promise.allSettled(PROVIDERS.map((p) => p.isAvailable()));
  return PROVIDERS.map((p, i) => ({
    id: p.id,
    name: p.name,
    available:
      results[i].status === 'fulfilled' ? (results[i]).value : false,
  }));
}
