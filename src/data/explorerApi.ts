/**
 * Arc Explorer API adapter.
 *
 * The Arc mainnet explorer is at https://explorer.arc.io.
 * It exposes a Blockscout-compatible API at /api/v2/ for token info,
 * holders, transfers, and contract verification.
 *
 * If the API is unavailable, every function returns null / empty arrays
 * so the UI can show a graceful "data unavailable" state.
 */

import { withCache, TTL } from './cache';
import { ARC_EXPLORER_BASE } from './arcRpc';

const API_BASE = `${ARC_EXPLORER_BASE}/api/v2`;

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ── Types from Blockscout API ──────────────────────────────────────────────

interface BlockscoutToken {
  address: string;
  name: string;
  symbol: string;
  decimals: string;
  total_supply: string;
  holders: string;
  exchange_rate: string | null;
  circulating_market_cap: string | null;
  type: string;
}

interface BlockscoutHolder {
  address: { hash: string; is_contract: boolean; name: string | null };
  value: string;
  token_id: string | null;
}

interface BlockscoutTransfer {
  tx_hash: string;
  block_number: number;
  timestamp: string;
  from: { hash: string };
  to: { hash: string };
  total: { value: string; decimals: string };
  method: string | null;
}

interface BlockscoutAddress {
  hash: string;
  is_contract: boolean;
  is_verified: boolean;
  name: string | null;
  creator_address_hash: string | null;
  implementation_address: string | null;
  proxy_type: string | null;
  has_methods_write: boolean;
  has_methods_read: boolean;
  token: BlockscoutToken | null;
}

// ── Public API ─────────────────────────────────────────────────────────────

export interface ExplorerTokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  holderCount: number;
  price: number | null;
  marketCap: number | null;
}

export async function fetchTokenInfo(address: string): Promise<ExplorerTokenInfo | null> {
  return withCache(`explorer:token:${address}`, TTL.TOKEN_DETAIL, async () => {
    const data = await fetchJson<{ token: BlockscoutToken }>(`/tokens/${address}`);
    if (!data?.token) {
      // Try as address endpoint
      const addrData = await fetchJson<BlockscoutAddress>(`/addresses/${address}`);
      if (!addrData?.token) return null;
      const t = addrData.token;
      return {
        address,
        name: t.name ?? 'Unknown',
        symbol: t.symbol ?? '???',
        decimals: parseInt(t.decimals ?? '18'),
        totalSupply: t.total_supply ?? '0',
        holderCount: parseInt(t.holders ?? '0'),
        price: t.exchange_rate ? parseFloat(t.exchange_rate) : null,
        marketCap: t.circulating_market_cap ? parseFloat(t.circulating_market_cap) : null,
      };
    }
    const t = data.token;
    return {
      address,
      name: t.name ?? 'Unknown',
      symbol: t.symbol ?? '???',
      decimals: parseInt(t.decimals ?? '18'),
      totalSupply: t.total_supply ?? '0',
      holderCount: parseInt(t.holders ?? '0'),
      price: t.exchange_rate ? parseFloat(t.exchange_rate) : null,
      marketCap: t.circulating_market_cap ? parseFloat(t.circulating_market_cap) : null,
    };
  });
}

export interface ExplorerHolder {
  address: string;
  balance: string;
  isContract: boolean;
  label: string | null;
}

export async function fetchTokenHolders(
  address: string,
  page = 1,
  limit = 50,
): Promise<{ holders: ExplorerHolder[]; total: number } | null> {
  return withCache(`explorer:holders:${address}:${page}:${limit}`, TTL.HOLDERS, async () => {
    const data = await fetchJson<{
      items: BlockscoutHolder[];
      next_page_params: unknown;
    }>(`/tokens/${address}/holders?limit=${limit}`);
    if (!data) return null;
    return {
      holders: (data.items ?? []).map((h) => ({
        address: h.address.hash,
        balance: h.value,
        isContract: h.address.is_contract,
        label: h.address.name ?? null,
      })),
      total: data.items?.length ?? 0,
    };
  });
}

export interface ExplorerTransfer {
  txHash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string;
  value: string;
  decimals: number;
}

export async function fetchTokenTransfers(
  address: string,
  limit = 50,
): Promise<ExplorerTransfer[]> {
  return withCache(`explorer:transfers:${address}:${limit}`, TTL.TRADES, async () => {
    const data = await fetchJson<{ items: BlockscoutTransfer[] }>(
      `/tokens/${address}/transfers?limit=${limit}`,
    );
    if (!data?.items) return [];
    return data.items.map((t) => ({
      txHash: t.tx_hash,
      blockNumber: t.block_number,
      timestamp: new Date(t.timestamp).getTime() / 1000,
      from: t.from.hash,
      to: t.to.hash,
      value: t.total?.value ?? '0',
      decimals: parseInt(t.total?.decimals ?? '18'),
    }));
  });
}

export interface ExplorerContractInfo {
  isVerified: boolean;
  isProxy: boolean;
  proxyType: string | null;
  implementationAddress: string | null;
  owner: string | null;
}

export async function fetchContractInfo(address: string): Promise<ExplorerContractInfo | null> {
  return withCache(`explorer:contract:${address}`, TTL.CONTRACT, async () => {
    const data = await fetchJson<BlockscoutAddress>(`/addresses/${address}`);
    if (!data) return null;
    return {
      isVerified: data.is_verified,
      isProxy: !!data.proxy_type || !!data.implementation_address,
      proxyType: data.proxy_type ?? null,
      implementationAddress: data.implementation_address ?? null,
      owner: data.creator_address_hash ?? null,
    };
  });
}

// Token list from explorer (sorted by holders desc)
export interface ExplorerTokenListItem {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  holderCount: number;
  price: number | null;
  totalSupply: string;
}

export async function fetchTokenList(
  sortField: 'holder_count' | 'circulating_market_cap' = 'holder_count',
  page = 1,
  limit = 50,
): Promise<ExplorerTokenListItem[]> {
  return withCache(`explorer:tokenlist:${sortField}:${page}:${limit}`, TTL.TOKEN_LIST, async () => {
    const data = await fetchJson<{ items: BlockscoutToken[]; next_page_params: unknown }>(
      `/tokens?type=ERC-20&sort=${sortField}&order=desc&limit=${limit}`,
    );
    if (!data?.items) return [];
    return data.items.map((t) => ({
      address: t.address,
      name: t.name ?? 'Unknown',
      symbol: t.symbol ?? '???',
      decimals: parseInt(t.decimals ?? '18'),
      holderCount: parseInt(t.holders ?? '0'),
      price: t.exchange_rate ? parseFloat(t.exchange_rate) : null,
      totalSupply: t.total_supply ?? '0',
    }));
  });
}

export async function searchTokens(query: string): Promise<ExplorerTokenListItem[]> {
  return withCache(`explorer:search:${query}`, TTL.TOKEN_LIST, async () => {
    const data = await fetchJson<{
      items: Array<{
        type: string;
        token?: BlockscoutToken;
        address?: string;
        name?: string;
        symbol?: string;
      }>;
    }>(`/search?q=${encodeURIComponent(query)}`);
    if (!data?.items) return [];
    return data.items
      .filter((item) => item.type === 'token' && item.token)
      .map((item) => {
        const t = item.token!;
        return {
          address: t.address,
          name: t.name ?? 'Unknown',
          symbol: t.symbol ?? '???',
          decimals: parseInt(t.decimals ?? '18'),
          holderCount: parseInt(t.holders ?? '0'),
          price: t.exchange_rate ? parseFloat(t.exchange_rate) : null,
          totalSupply: t.total_supply ?? '0',
        };
      });
  });
}
