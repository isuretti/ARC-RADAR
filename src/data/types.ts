// Normalized internal data model for Arc Liquidity Radar.
// All DEX/chain adapters must conform to these interfaces.

export type PriceChangeDirection = 'up' | 'down' | 'neutral';

export interface TokenSummary {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  price: number | null;
  priceChange24h: number | null; // percentage
  liquidity: number | null; // USD
  volume24h: number | null; // USD
  holderCount: number | null;
  marketCap: number | null;
  logoUri?: string;
  // Metadata for display
  isVerified?: boolean;
  firstSeenAt?: number; // unix ts
  lastActiveAt?: number; // unix ts
}

export interface PoolInfo {
  dex: string;
  dexDisplayName: string;
  poolAddress: string;
  token0: { address: string; symbol: string };
  token1: { address: string; symbol: string };
  pairLabel: string;
  liquidity: number | null; // USD TVL
  volume24h: number | null; // USD
  priceImpact?: number | null; // percent for 1k USD trade
  shareOfTotal: number | null; // 0-100
  fee?: number; // bps e.g. 30 = 0.3%
}

export interface TradeEvent {
  txHash: string;
  blockNumber: number;
  timestamp: number; // unix seconds
  type: 'buy' | 'sell';
  tokenAmount: number;
  usdValue: number | null;
  walletAddress: string;
  dex: string;
  dexDisplayName: string;
}

export interface HolderInfo {
  rank: number;
  address: string;
  balance: number;
  supplyPercent: number;
  label?: string; // e.g. "Pool: ArcSwap", "Known Contract"
  isContract?: boolean;
}

export interface ContractInfo {
  address: string;
  verified: VerifiedStatus;
  owner: string | null;
  isProxy: boolean | null;
  canMint: boolean | null;
  canPause: boolean | null;
  hasBlacklist: boolean | null;
  otherPermissions: string[];
  notes: string[];
}

export type VerifiedStatus = 'verified' | 'warning' | 'unknown';

export interface TokenDetail extends TokenSummary {
  pools: PoolInfo[];
  recentTrades: TradeEvent[];
  topHolders: HolderInfo[];
  contract: ContractInfo;
  totalSupply: number | null;
}

export interface DexStats {
  id: string;
  name: string;
  displayName: string;
  website?: string;
  totalLiquidity: number | null;
  volume24h: number | null;
  poolCount: number | null;
  topPairs: Array<{
    pairLabel: string;
    poolAddress: string;
    liquidity: number | null;
    volume24h: number | null;
  }>;
  shareOfTotalLiquidity: number | null; // 0-100
}

export type SortField =
  | 'liquidity'
  | 'volume24h'
  | 'priceChange24h'
  | 'holderCount'
  | 'lastActiveAt'
  | 'firstSeenAt';

export interface TokenListOptions {
  sort: SortField;
  page: number;
  pageSize: number;
  query?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** Describes a data provider — used to communicate readiness to UI */
export interface DataSourceStatus {
  id: string;
  label: string;
  ready: boolean;
  error?: string;
}
