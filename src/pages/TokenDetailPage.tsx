import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
  Droplets,
  Activity,
  Users,
  FileCode,
} from 'lucide-react';
import { TokenAvatar } from '../components/TokenAvatar';
import { Badge } from '../components/ui/Badge';
import { DataUnavailable } from '../components/ui/DataUnavailable';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/EmptyState';
import { getTokenDetail, EXPLORER_TX_URL, EXPLORER_ADDR_URL } from '../data/tokenService';
import {
  formatUsd,
  formatPercent,
  formatCount,
  formatAddress,
  formatTimestamp,
  formatTokenAmount,
  priceChangeClass,
} from '../utils/format';
import type { TokenDetail, VerifiedStatus } from '../data/types';

const TABS = ['Overview', 'Liquidity', 'Trades', 'Holders', 'Contract'] as const;
type Tab = typeof TABS[number];

interface TokenDetailPageProps {
  tokenAddress: string;
  onBack: () => void;
}

// ── Copy button ──────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button onClick={handleCopy} className="text-[var(--subtle)] hover:text-[var(--muted)] transition-colors">
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

// ── Metric card ──────────────────────────────────────────────────────────

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[10px] uppercase tracking-widest text-[var(--subtle)] font-medium mb-1">{label}</p>
      <p className="text-lg font-bold text-[var(--ink)] tabular-nums display">{value}</p>
      {sub && <p className="text-xs text-[var(--subtle)] mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Tab panels ───────────────────────────────────────────────────────────

function OverviewTab({ token }: { token: TokenDetail }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard label="Price" value={token.price != null ? formatUsd(token.price, 6) : '—'} />
        <MetricCard
          label="24h Change"
          value={formatPercent(token.priceChange24h)}
          sub={token.priceChange24h != null ? (token.priceChange24h >= 0 ? 'Gain' : 'Loss') : undefined}
        />
        <MetricCard label="Market Cap" value={formatUsd(token.marketCap)} />
        <MetricCard label="Total Liquidity" value={formatUsd(token.liquidity)} />
        <MetricCard label="Volume 24h" value={formatUsd(token.volume24h)} />
        <MetricCard label="Holders" value={formatCount(token.holderCount)} />
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
        <p className="text-xs font-semibold text-[var(--ink-2)]">Token Info</p>
        {[
          { label: 'Contract', value: token.address, mono: true, copy: true, link: EXPLORER_ADDR_URL(token.address) },
          { label: 'Symbol', value: token.symbol },
          { label: 'Decimals', value: String(token.decimals) },
          { label: 'Total Supply', value: token.totalSupply != null ? formatCount(token.totalSupply) : '—' },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-2 text-xs">
            <span className="text-[var(--subtle)] flex-shrink-0 w-28">{row.label}</span>
            <div className="flex items-center gap-1.5 min-w-0">
              {row.link ? (
                <a
                  href={row.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`truncate text-[var(--accent)] hover:underline ${row.mono ? 'font-mono' : ''}`}
                >
                  {row.value}
                </a>
              ) : (
                <span className={`text-[var(--ink-2)] ${row.mono ? 'font-mono' : 'font-semibold'}`}>
                  {row.value}
                </span>
              )}
              {row.copy && <CopyButton value={row.value} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LiquidityTab({ token }: { token: TokenDetail }) {
  if (token.pools.length === 0) {
    return (
      <DataUnavailable
        source="DEX Liquidity"
        description="No pool data found. Connect a DEX subgraph endpoint in VITE_ARCSWAP_SUBGRAPH_URL to populate this section."
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--subtle)]">
        {token.pools.length} pool{token.pools.length !== 1 ? 's' : ''} found — total liquidity{' '}
        <strong className="text-[var(--ink-2)]">{formatUsd(token.liquidity)}</strong>
      </p>
      <div className="rounded-xl border border-[var(--border)] overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[var(--surface-muted)] border-b border-[var(--border)]">
              {['DEX', 'Pair', 'Pool Address', 'Liquidity', 'Vol 24h', 'Pool %'].map((h) => (
                <th key={h} className="py-3 px-4 text-left text-[10px] uppercase tracking-widest text-[var(--subtle)] font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {token.pools.map((pool) => (
              <tr key={pool.poolAddress} className="border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors">
                <td className="py-3 px-4 font-semibold text-[var(--ink)]">{pool.dexDisplayName}</td>
                <td className="py-3 px-4 text-[var(--ink-2)] font-mono">{pool.pairLabel}</td>
                <td className="py-3 px-4">
                  <a
                    href={EXPLORER_ADDR_URL(pool.poolAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent)] hover:underline font-mono"
                  >
                    {formatAddress(pool.poolAddress)}
                    <ExternalLink size={10} className="inline ml-1" />
                  </a>
                </td>
                <td className="py-3 px-4 tabular-nums text-[var(--ink-2)]">{formatUsd(pool.liquidity)}</td>
                <td className="py-3 px-4 tabular-nums text-[var(--ink-2)]">{formatUsd(pool.volume24h)}</td>
                <td className="py-3 px-4 tabular-nums text-[var(--ink-2)]">
                  {pool.shareOfTotal != null ? `${pool.shareOfTotal.toFixed(1)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TradesTab({ token }: { token: TokenDetail }) {
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const slice = token.recentTrades.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (token.recentTrades.length === 0) {
    return (
      <DataUnavailable
        source="Trading Activity"
        description="Recent transfer data is available when the Arc Mainnet Explorer API is reachable."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--border)] overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[var(--surface-muted)] border-b border-[var(--border)]">
              {['Time', 'Type', 'Amount', 'USD Value', 'Wallet', 'DEX', 'Tx'].map((h) => (
                <th key={h} className="py-3 px-4 text-left text-[10px] uppercase tracking-widest text-[var(--subtle)] font-semibold whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((trade) => (
              <tr key={trade.txHash + trade.timestamp} className="border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors">
                <td className="py-3 px-4 text-[var(--subtle)] whitespace-nowrap">{formatTimestamp(trade.timestamp)}</td>
                <td className="py-3 px-4">
                  <Badge variant={trade.type}>{trade.type}</Badge>
                </td>
                <td className="py-3 px-4 tabular-nums text-[var(--ink-2)]">
                  {formatTokenAmount(trade.tokenAmount, token.symbol)}
                </td>
                <td className="py-3 px-4 tabular-nums text-[var(--ink-2)]">
                  {formatUsd(trade.usdValue)}
                </td>
                <td className="py-3 px-4">
                  <a
                    href={EXPLORER_ADDR_URL(trade.walletAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[var(--accent)] hover:underline"
                  >
                    {formatAddress(trade.walletAddress)}
                  </a>
                </td>
                <td className="py-3 px-4 text-[var(--muted)]">{trade.dexDisplayName}</td>
                <td className="py-3 px-4">
                  <a
                    href={EXPLORER_TX_URL(trade.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--subtle)] hover:text-[var(--accent)]"
                  >
                    <ExternalLink size={13} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {token.recentTrades.length > PAGE_SIZE && (
        <div className="flex items-center justify-between text-xs">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-[var(--accent)] hover:underline disabled:opacity-30 disabled:no-underline"
          >
            Previous
          </button>
          <span className="text-[var(--subtle)]">
            Page {page + 1} of {Math.ceil(token.recentTrades.length / PAGE_SIZE)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={(page + 1) * PAGE_SIZE >= token.recentTrades.length}
            className="text-[var(--accent)] hover:underline disabled:opacity-30 disabled:no-underline"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function HoldersTab({ token }: { token: TokenDetail }) {
  if (token.topHolders.length === 0) {
    return (
      <DataUnavailable
        source="Holder Data"
        description="Holder data is available when the Arc Mainnet Explorer API is reachable."
      />
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-[var(--surface-muted)] border-b border-[var(--border)]">
            {['Rank', 'Address', 'Balance', '% of Supply', 'Type'].map((h) => (
              <th key={h} className="py-3 px-4 text-left text-[10px] uppercase tracking-widest text-[var(--subtle)] font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {token.topHolders.map((holder) => (
            <tr key={holder.address} className="border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors">
              <td className="py-3 px-4 text-[var(--subtle)] font-mono">{holder.rank}</td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <a
                    href={EXPLORER_ADDR_URL(holder.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[var(--accent)] hover:underline"
                  >
                    {formatAddress(holder.address)}
                  </a>
                  {holder.label && (
                    <span className="text-[var(--subtle)] text-[10px] bg-[var(--surface-muted)] px-1.5 py-0.5 rounded">
                      {holder.label}
                    </span>
                  )}
                </div>
              </td>
              <td className="py-3 px-4 tabular-nums text-[var(--ink-2)]">
                {formatTokenAmount(holder.balance, token.symbol)}
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 rounded-full bg-[var(--surface-muted)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--accent)]/60"
                      style={{ width: `${Math.min(100, holder.supplyPercent)}%` }}
                    />
                  </div>
                  <span className="text-[var(--ink-2)] tabular-nums">
                    {holder.supplyPercent.toFixed(2)}%
                  </span>
                </div>
              </td>
              <td className="py-3 px-4">
                <Badge variant={holder.isContract ? 'neutral' : 'unknown'}>
                  {holder.isContract ? 'Contract' : 'Wallet'}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ContractTab({ token }: { token: TokenDetail }) {
  const c = token.contract;
  const verifiedVariant: Record<VerifiedStatus, 'verified' | 'warning' | 'unknown'> = {
    verified: 'verified',
    warning: 'warning',
    unknown: 'unknown',
  };

  const rows: Array<{ label: string; value: React.ReactNode }> = [
    {
      label: 'Address',
      value: (
        <a href={EXPLORER_ADDR_URL(c.address)} target="_blank" rel="noopener noreferrer" className="font-mono text-[var(--accent)] hover:underline">
          {c.address}
          <ExternalLink size={10} className="inline ml-1" />
        </a>
      ),
    },
    {
      label: 'Verification',
      value: <Badge variant={verifiedVariant[c.verified]}>{c.verified}</Badge>,
    },
    {
      label: 'Owner',
      value: c.owner ? (
        <a href={EXPLORER_ADDR_URL(c.owner)} target="_blank" rel="noopener noreferrer" className="font-mono text-[var(--accent)] hover:underline">
          {formatAddress(c.owner)}
        </a>
      ) : (
        <span className="text-[var(--subtle)]">Unknown</span>
      ),
    },
    {
      label: 'Upgradeable / Proxy',
      value: c.isProxy == null ? (
        <Badge variant="unknown">Unknown</Badge>
      ) : c.isProxy ? (
        <Badge variant="warning">Yes</Badge>
      ) : (
        <Badge variant="verified">No</Badge>
      ),
    },
    {
      label: 'Mint Capability',
      value: c.canMint == null ? <Badge variant="unknown">Unknown</Badge> : c.canMint ? <Badge variant="warning">Yes</Badge> : <Badge variant="verified">No</Badge>,
    },
    {
      label: 'Pause Capability',
      value: c.canPause == null ? <Badge variant="unknown">Unknown</Badge> : c.canPause ? <Badge variant="warning">Yes</Badge> : <Badge variant="verified">No</Badge>,
    },
    {
      label: 'Blacklist Capability',
      value: c.hasBlacklist == null ? <Badge variant="unknown">Unknown</Badge> : c.hasBlacklist ? <Badge variant="warning">Yes</Badge> : <Badge variant="verified">No</Badge>,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-4">
        {rows.map((row) => (
          <div key={String(row.label)} className="flex items-start gap-4 text-xs">
            <span className="text-[var(--subtle)] w-40 flex-shrink-0 pt-0.5">{row.label}</span>
            <div className="flex-1 min-w-0">{row.value}</div>
          </div>
        ))}
      </div>

      {c.notes.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs font-semibold text-[var(--ink-2)] mb-2">Notes</p>
          <ul className="space-y-1">
            {c.notes.map((note, i) => (
              <li key={i} className="text-xs text-[var(--muted)]">— {note}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[11px] text-[var(--subtle)] p-3 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)]">
        Contract data is sourced from the Arc Mainnet block explorer. Capability indicators
        (mint, pause, blacklist) require source-code verification to be accurate. Do not use these
        indicators as sole indicators of trust — conduct independent due diligence.
      </p>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────

export function TokenDetailPage({ tokenAddress, onBack }: TokenDetailPageProps) {
  const [token, setToken] = useState<TokenDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  useEffect(() => {
    let cancelled = false;
    void getTokenDetail(tokenAddress)
      .then((data) => {
        if (cancelled) return;
        if (!data) setError('Token not found on Arc Mainnet.');
        else setToken(data);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load token');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [tokenAddress]);

  if (loading) {
    return (
      <div className="space-y-5">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-[var(--subtle)] hover:text-[var(--ink-2)]">
          <ArrowLeft size={13} /> Back
        </button>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3.5 w-20" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="space-y-5">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-[var(--subtle)] hover:text-[var(--ink-2)]">
          <ArrowLeft size={13} /> Back
        </button>
        <ErrorState message={error ?? 'Token not found.'} onRetry={() => {
          setLoading(true);
          setError(null);
          void getTokenDetail(tokenAddress)
            .then((d) => { if (!d) setError('Token not found.'); else setToken(d); })
            .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error'))
            .finally(() => setLoading(false));
        }} />
      </div>
    );
  }

  const changeClass = priceChangeClass(token.priceChange24h);

  const tabIcons: Record<Tab, typeof Activity> = {
    Overview: Activity,
    Liquidity: Droplets,
    Trades: Activity,
    Holders: Users,
    Contract: FileCode,
  };

  return (
    <div className="space-y-6">
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-[var(--subtle)] hover:text-[var(--ink-2)] transition-colors">
        <ArrowLeft size={13} /> Back to tokens
      </button>

      {/* Token header */}
      <div className="flex items-start gap-4">
        <TokenAvatar symbol={token.symbol} size={48} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2">
            <h1 className="display text-2xl font-bold text-[var(--ink)] tracking-tight">{token.name}</h1>
            <span className="text-sm font-mono text-[var(--subtle)] bg-[var(--surface-muted)] px-2 py-0.5 rounded-md">
              {token.symbol}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="font-mono text-xs text-[var(--subtle)] flex items-center gap-1">
              {formatAddress(token.address, 8)}
              <CopyButton value={token.address} />
              <a href={EXPLORER_ADDR_URL(token.address)} target="_blank" rel="noopener noreferrer" className="text-[var(--subtle)] hover:text-[var(--accent)]">
                <ExternalLink size={11} />
              </a>
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="display text-2xl font-bold text-[var(--ink)] tabular-nums">
            {token.price != null ? formatUsd(token.price, 6) : '—'}
          </p>
          <p className={`text-sm font-semibold tabular-nums ${changeClass}`}>
            {formatPercent(token.priceChange24h)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--border)]">
        <div className="flex gap-0.5 overflow-x-auto pb-px">
          {TABS.map((tab) => {
            const Icon = tabIcons[tab];
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                  active
                    ? 'border-[var(--accent)] text-[var(--ink)]'
                    : 'border-transparent text-[var(--muted)] hover:text-[var(--ink-2)]'
                }`}
              >
                <Icon size={12} />
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'Overview' && <OverviewTab token={token} />}
        {activeTab === 'Liquidity' && <LiquidityTab token={token} />}
        {activeTab === 'Trades' && <TradesTab token={token} />}
        {activeTab === 'Holders' && <HoldersTab token={token} />}
        {activeTab === 'Contract' && <ContractTab token={token} />}
      </div>
    </div>
  );
}
