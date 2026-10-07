import { useEffect, useState } from 'react';
import { ExternalLink, BarChart2, Droplets } from 'lucide-react';
import { getAllDexStats, getProviderStatuses, PROVIDERS } from '../data/dexProviders';
import { DataUnavailable } from '../components/ui/DataUnavailable';
import { Skeleton } from '../components/ui/Skeleton';
import { formatUsd, formatCount } from '../utils/format';
import type { DexStats } from '../data/types';

function ProviderStatusRow({ name, available }: { name: string; available: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs py-2 border-b border-[var(--border)] last:border-0">
      <span className="text-[var(--ink-2)] font-medium">{name}</span>
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${available ? 'bg-[var(--success)]' : 'bg-[var(--subtle)]'}`} />
        <span className={available ? 'text-[var(--success)]' : 'text-[var(--subtle)]'}>
          {available ? 'Connected' : 'Not configured'}
        </span>
      </div>
    </div>
  );
}

function DexCard({ stats }: { stats: DexStats }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="display text-base font-bold text-[var(--ink)]">{stats.displayName}</h3>
          {stats.website && (
            <a
              href={stats.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-[var(--accent)] hover:underline flex items-center gap-0.5 mt-0.5"
            >
              {stats.website.replace('https://', '')}
              <ExternalLink size={10} />
            </a>
          )}
        </div>
        {stats.shareOfTotalLiquidity != null && (
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-[var(--subtle)]">Market Share</p>
            <p className="display text-lg font-bold text-[var(--ink)] tabular-nums">
              {stats.shareOfTotalLiquidity.toFixed(0)}%
            </p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[var(--subtle)] mb-1">Liquidity</p>
          <p className="text-sm font-bold text-[var(--ink)] tabular-nums">{formatUsd(stats.totalLiquidity)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[var(--subtle)] mb-1">Vol 24h</p>
          <p className="text-sm font-bold text-[var(--ink)] tabular-nums">{formatUsd(stats.volume24h)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[var(--subtle)] mb-1">Pools</p>
          <p className="text-sm font-bold text-[var(--ink)] tabular-nums">{formatCount(stats.poolCount)}</p>
        </div>
      </div>

      {/* Top pairs */}
      {stats.topPairs.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[var(--subtle)] mb-2">Top Pairs</p>
          <div className="space-y-1.5">
            {stats.topPairs.slice(0, 5).map((pair) => (
              <div key={pair.poolAddress} className="flex items-center justify-between text-xs">
                <span className="font-mono text-[var(--ink-2)]">{pair.pairLabel}</span>
                <span className="text-[var(--muted)] tabular-nums">{formatUsd(pair.liquidity)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function DexsPage() {
  const [stats, setStats] = useState<DexStats[]>([]);
  const [statuses, setStatuses] = useState<Array<{ id: string; name: string; available: boolean }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([getAllDexStats(), getProviderStatuses()])
      .then(([s, ps]) => {
        if (cancelled) return;
        setStats(s);
        setStatuses(ps);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Check if any provider is configured
  const anyAvailable = statuses.some((s) => s.available);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="display text-xl font-bold text-[var(--ink)] tracking-tight">DEX Comparison</h1>
        <p className="text-xs text-[var(--subtle)] mt-0.5">
          Liquidity concentration across Arc DEXs
        </p>
      </div>

      {/* Provider status */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart2 size={14} className="text-[var(--accent)]" />
          <p className="text-xs font-semibold text-[var(--ink-2)]">Data Sources</p>
        </div>
        {loading ? (
          <div className="space-y-2">
            {PROVIDERS.map((p) => <Skeleton key={p.id} className="h-8" />)}
          </div>
        ) : (
          PROVIDERS.map((p) => {
            const status = statuses.find((s) => s.id === p.id);
            return (
              <ProviderStatusRow key={p.id} name={p.name} available={status?.available ?? false} />
            );
          })
        )}
        <p className="text-[11px] text-[var(--subtle)] mt-3">
          To add a DEX, implement a DexProvider in{' '}
          <code className="font-mono text-[var(--muted)] bg-[var(--surface-muted)] px-1 rounded">
            src/data/dexProviders.ts
          </code>{' '}
          and register it in the PROVIDERS array.
        </p>
      </div>

      {/* DEX stats */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : !anyAvailable || stats.length === 0 ? (
        <DataUnavailable
          source="DEX Data"
          description="No DEX providers are currently configured. Set VITE_ARCSWAP_SUBGRAPH_URL in your .env file, or implement a new DexProvider for any Arc DEX."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.map((s) => <DexCard key={s.id} stats={s} />)}
        </div>
      )}

      {/* Architecture note */}
      <div className="rounded-xl border border-dashed border-[var(--border)] p-5 space-y-2">
        <div className="flex items-center gap-2">
          <Droplets size={14} className="text-[var(--subtle)]" />
          <p className="text-xs font-semibold text-[var(--ink-2)]">Extensible DEX Architecture</p>
        </div>
        <p className="text-xs text-[var(--subtle)]">
          This dashboard is built to support any number of Arc DEXs. Each provider implements a
          standard interface exposing pool data, volume, and liquidity. Once a DEX subgraph or
          API becomes available on Arc, add it by implementing and registering a new DexProvider.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
          {[
            { label: 'Registered Providers', value: String(PROVIDERS.length) },
            { label: 'Connected', value: String(statuses.filter((s) => s.available).length) },
            { label: 'Total DEX Pools', value: stats.reduce((s, d) => s + (d.poolCount ?? 0), 0).toString() || '—' },
          ].map((item) => (
            <div key={item.label} className="bg-[var(--surface-muted)] rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-widest text-[var(--subtle)]">{item.label}</p>
              <p className="display text-lg font-bold text-[var(--ink)] mt-0.5 tabular-nums">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
