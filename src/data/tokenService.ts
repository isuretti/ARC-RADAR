/**
 * Token service — normalized API consumed by all UI components.
 *
 * Combines data from:
 *   - Arc Explorer (Blockscout) API  → prices, holders, transfers, contract info
 *   - DEX providers                  → pool / liquidity data
 *   - Arc RPC                        → on-chain fallback for unknown tokens
 *
 * Returns normalized TokenSummary / TokenDetail objects.
 * All functions handle partial data gracefully.
 */

import {
  fetchTokenInfo,
  fetchTokenHolders,
  fetchTokenTransfers,
  fetchContractInfo,
  fetchTokenList,
  searchTokens,
} from './explorerApi';
import { getAllPoolsForToken } from './dexProviders';
import { fetchErc20Metadata } from './arcRpc';
import { withCache, TTL } from './cache';
import type {
  TokenSummary,
  TokenDetail,
  TradeEvent,
  HolderInfo,
  ContractInfo,
  VerifiedStatus,
  PaginatedResult,
  TokenListOptions,
} from './types';
import { ARC_EXPLORER_BASE } from './arcRpc';

export const EXPLORER_TX_URL = (hash: string) => `${ARC_EXPLORER_BASE}/tx/${hash}`;
export const EXPLORER_ADDR_URL = (addr: string) => `${ARC_EXPLORER_BASE}/address/${addr}`;

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTokenSummary(info: {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  holderCount: number;
  price: number | null;
  totalSupply?: string;
  marketCap?: number | null;
}): TokenSummary {
  return {
    address: info.address,
    name: info.name,
    symbol: info.symbol,
    decimals: info.decimals,
    price: info.price,
    priceChange24h: null, // Explorer API doesn't expose 24h change directly
    liquidity: null,      // Requires DEX data
    volume24h: null,      // Requires DEX data
    holderCount: info.holderCount,
    marketCap: info.marketCap ?? null,
  };
}

function buildContractInfo(
  address: string,
  explorerInfo: {
    isVerified: boolean;
    isProxy: boolean;
    proxyType: string | null;
    owner: string | null;
    implementationAddress: string | null;
  } | null,
): ContractInfo {
  const verified: VerifiedStatus = explorerInfo
    ? explorerInfo.isVerified
      ? 'verified'
      : 'warning'
    : 'unknown';

  return {
    address,
    verified,
    owner: explorerInfo?.owner ?? null,
    isProxy: explorerInfo?.isProxy ?? null,
    canMint: null,    // Would require source-code analysis
    canPause: null,
    hasBlacklist: null,
    otherPermissions: [],
    notes: explorerInfo
      ? [
          explorerInfo.isProxy && explorerInfo.proxyType
            ? `Proxy type: ${explorerInfo.proxyType}`
            : '',
          explorerInfo.implementationAddress
            ? `Implementation: ${explorerInfo.implementationAddress}`
            : '',
        ].filter(Boolean)
      : [],
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

/** Fetch a paginated list of tokens, sorted by the given field */
export async function getTokenList(options: TokenListOptions): Promise<PaginatedResult<TokenSummary>> {
  const { sort, page, pageSize } = options;

  if (options.query?.trim()) {
    return searchTokenList(options.query.trim(), page, pageSize);
  }

  const explorerSort =
    sort === 'holderCount' ? 'holder_count' : 'circulating_market_cap';

  const items = await withCache(
    `tokenlist:${explorerSort}:${page}:${pageSize}`,
    TTL.TOKEN_LIST,
    () => fetchTokenList(explorerSort, page, pageSize),
  );

  const summaries = items.map((t) => formatTokenSummary(t));

  return {
    items: summaries,
    total: summaries.length,
    page,
    pageSize,
    hasMore: summaries.length === pageSize,
  };
}

/** Search tokens by name, symbol, or address */
export async function searchTokenList(
  query: string,
  page: number,
  pageSize: number,
): Promise<PaginatedResult<TokenSummary>> {
  // If it looks like an address, try to load it directly
  if (/^0x[0-9a-fA-F]{40}$/.test(query)) {
    const info = await fetchTokenInfo(query);
    if (info) {
      return {
        items: [formatTokenSummary(info)],
        total: 1,
        page: 1,
        pageSize,
        hasMore: false,
      };
    }
    // Fall through to RPC-based lookup
    const rpcMeta = await fetchErc20Metadata(query as `0x${string}`);
    if (rpcMeta) {
      return {
        items: [
          {
            address: query,
            name: rpcMeta.name,
            symbol: rpcMeta.symbol,
            decimals: rpcMeta.decimals,
            price: null,
            priceChange24h: null,
            liquidity: null,
            volume24h: null,
            holderCount: null,
            marketCap: null,
          },
        ],
        total: 1,
        page: 1,
        pageSize,
        hasMore: false,
      };
    }
    return { items: [], total: 0, page: 1, pageSize, hasMore: false };
  }

  const results = await searchTokens(query);
  const start = (page - 1) * pageSize;
  const slice = results.slice(start, start + pageSize);
  return {
    items: slice.map((t) => formatTokenSummary(t)),
    total: results.length,
    page,
    pageSize,
    hasMore: start + pageSize < results.length,
  };
}

/** Get full detail for a specific token */
export async function getTokenDetail(address: string): Promise<TokenDetail | null> {
  return withCache(`tokendetail:${address}`, TTL.TOKEN_DETAIL, async () => {
    // Fetch all data sources in parallel
    const [explorerInfo, holderData, transfers, contractData, pools] = await Promise.all([
      fetchTokenInfo(address),
      fetchTokenHolders(address, 1, 50),
      fetchTokenTransfers(address, 50),
      fetchContractInfo(address),
      getAllPoolsForToken(address),
    ]);

    // If Explorer has no info, try RPC
    if (!explorerInfo) {
      const rpcMeta = await fetchErc20Metadata(address as `0x${string}`);
      if (!rpcMeta) return null;

      const totalSupplyNum = Number(rpcMeta.totalSupply) / 10 ** rpcMeta.decimals;

      return {
        address,
        name: rpcMeta.name,
        symbol: rpcMeta.symbol,
        decimals: rpcMeta.decimals,
        price: null,
        priceChange24h: null,
        liquidity: pools.reduce((s, p) => s + (p.liquidity ?? 0), 0) || null,
        volume24h: pools.reduce((s, p) => s + (p.volume24h ?? 0), 0) || null,
        holderCount: null,
        marketCap: null,
        totalSupply: totalSupplyNum,
        pools,
        recentTrades: [],
        topHolders: [],
        contract: buildContractInfo(address, null),
      };
    }

    // Compute total liquidity from pools
    const totalLiquidity = pools.length > 0
      ? pools.reduce((s, p) => s + (p.liquidity ?? 0), 0) || null
      : null;
    const totalVolume24h = pools.length > 0
      ? pools.reduce((s, p) => s + (p.volume24h ?? 0), 0) || null
      : null;

    // Build trade events from transfer log
    const tokenDecimals = explorerInfo.decimals;
    const tokenPrice = explorerInfo.price;

    const recentTrades: TradeEvent[] = transfers.slice(0, 50).map((t, i) => {
      const rawAmount = parseFloat(t.value) / 10 ** t.decimals;
      const usdValue = tokenPrice ? rawAmount * tokenPrice : null;
      // Heuristic: treat transfers TO pools as sells, FROM pools as buys
      // Without pool address list, mark as 'buy' for incoming and 'sell' for outgoing
      return {
        txHash: t.txHash,
        blockNumber: t.blockNumber,
        timestamp: t.timestamp,
        type: i % 2 === 0 ? 'buy' : 'sell', // placeholder direction until DEX events are available
        tokenAmount: rawAmount,
        usdValue,
        walletAddress: t.from,
        dex: 'arc',
        dexDisplayName: 'Arc',
      };
    });

    // Build holder list
    const totalSupplyRaw = parseFloat(explorerInfo.totalSupply) / 10 ** tokenDecimals;

    const topHolders: HolderInfo[] = (holderData?.holders ?? []).map((h, i) => {
      const balance = parseFloat(h.balance) / 10 ** tokenDecimals;
      return {
        rank: i + 1,
        address: h.address,
        balance,
        supplyPercent: totalSupplyRaw > 0 ? (balance / totalSupplyRaw) * 100 : 0,
        label: h.label ?? undefined,
        isContract: h.isContract,
      };
    });

    const contractInfo = buildContractInfo(address, contractData);

    return {
      address,
      name: explorerInfo.name,
      symbol: explorerInfo.symbol,
      decimals: tokenDecimals,
      price: explorerInfo.price,
      priceChange24h: null,
      liquidity: totalLiquidity,
      volume24h: totalVolume24h,
      holderCount: explorerInfo.holderCount,
      marketCap: explorerInfo.marketCap,
      totalSupply: totalSupplyRaw,
      pools,
      recentTrades,
      topHolders,
      contract: contractInfo,
    };
  });
}

/** Get a subset of tokens for a specific dashboard section */
export async function getTrendingTokens(): Promise<TokenSummary[]> {
  const result = await getTokenList({ sort: 'volume24h', page: 1, pageSize: 8 });
  return result.items;
}

export async function getNewTokens(): Promise<TokenSummary[]> {
  const result = await getTokenList({ sort: 'firstSeenAt', page: 1, pageSize: 8 });
  return result.items;
}

export async function getHighestVolumeTokens(): Promise<TokenSummary[]> {
  const result = await getTokenList({ sort: 'volume24h', page: 1, pageSize: 8 });
  return result.items;
}

export async function getHighestLiquidityTokens(): Promise<TokenSummary[]> {
  const result = await getTokenList({ sort: 'liquidity', page: 1, pageSize: 8 });
  return result.items;
}

export async function getRecentlyActiveTokens(): Promise<TokenSummary[]> {
  const result = await getTokenList({ sort: 'lastActiveAt', page: 1, pageSize: 8 });
  return result.items;
}
