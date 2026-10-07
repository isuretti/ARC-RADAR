import { ExternalLink } from 'lucide-react';
import { TokenAvatar } from './TokenAvatar';
import { formatUsd, formatCount, formatPercent, priceChangeClass } from '../utils/format';
import type { TokenSummary } from '../data/types';

interface TokenCardProps {
  token: TokenSummary;
  onClick?: () => void;
  rank?: number;
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest text-[var(--subtle)] font-medium">{label}</span>
      <span className="text-xs font-semibold text-[var(--ink-2)] tabular-nums">{value}</span>
    </div>
  );
}

export function TokenCard({ token, onClick, rank }: TokenCardProps) {
  const changeClass = priceChangeClass(token.priceChange24h);

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-strong)] hover:border-[var(--border-strong)] transition-all duration-150 p-4 group focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {rank != null && (
          <span className="text-[11px] font-mono text-[var(--subtle)] w-5 pt-1 text-right flex-shrink-0">
            {rank}
          </span>
        )}
        <TokenAvatar symbol={token.symbol} logoUri={token.logoUri} size={36} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-[var(--ink)] truncate display">{token.name}</span>
          </div>
          <span className="text-xs text-[var(--subtle)] font-mono">{token.symbol}</span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-sm font-semibold text-[var(--ink)] tabular-nums">
            {token.price != null ? formatUsd(token.price, 4) : '—'}
          </span>
          <span className={`text-xs font-semibold tabular-nums ${changeClass}`}>
            {formatPercent(token.priceChange24h)}
          </span>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-x-4 gap-y-2 pt-3 border-t border-[var(--border)]">
        <MetricCell label="Liquidity" value={formatUsd(token.liquidity)} />
        <MetricCell label="Vol 24h" value={formatUsd(token.volume24h)} />
        <MetricCell label="Holders" value={formatCount(token.holderCount)} />
      </div>

      {/* External link hint */}
      <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ExternalLink size={10} className="text-[var(--subtle)]" />
        <span className="text-[10px] text-[var(--subtle)]">View details</span>
      </div>
    </button>
  );
}
