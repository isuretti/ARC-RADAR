/** Formatting utilities for Arc Liquidity Radar */

export function formatAddress(addr: string, chars = 6): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, chars)}...${addr.slice(-4)}`;
}

export function formatUsd(value: number | null | undefined, decimals = 2): string {
  if (value == null) return '—';
  if (value === 0) return '$0';
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(decimals)}`;
}

export function formatTokenAmount(amount: number | null | undefined, symbol = '', decimals = 4): string {
  if (amount == null) return '—';
  if (amount === 0) return `0 ${symbol}`.trim();
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2)}B ${symbol}`.trim();
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M ${symbol}`.trim();
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(2)}K ${symbol}`.trim();
  return `${amount.toFixed(decimals)} ${symbol}`.trim();
}

export function formatPercent(value: number | null | undefined, signed = true): string {
  if (value == null) return '—';
  const abs = Math.abs(value).toFixed(2);
  if (!signed) return `${abs}%`;
  return value >= 0 ? `+${abs}%` : `-${abs}%`;
}

export function formatTimestamp(ts: number): string {
  const now = Date.now() / 1000;
  const diff = now - ts;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts * 1000).toLocaleDateString();
}

export function formatCount(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function priceChangeClass(change: number | null): string {
  if (change == null) return 'text-[var(--subtle)]';
  if (change > 0) return 'text-[var(--success)]';
  if (change < 0) return 'text-[var(--danger)]';
  return 'text-[var(--muted)]';
}

export function isAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}
