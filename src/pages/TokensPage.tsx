import { useEffect, useState, useCallback, useRef } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { TokenAvatar } from '../components/TokenAvatar';
import { SkeletonTableRow } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/EmptyState';
import { SearchBar } from '../components/SearchBar';
import { getTokenList } from '../data/tokenService';
import { formatUsd, formatCount, formatPercent, priceChangeClass } from '../utils/format';
import type { TokenSummary, SortField } from '../data/types';

interface TokensPageProps {
  onTokenSelect: (address: string) => void;
  initialQuery?: string;
}

type SortDir = 'asc' | 'desc';

interface SortState {
  field: SortField;
  dir: SortDir;
}

const COLUMNS: Array<{ label: string; field: SortField | null; align?: 'right' }> = [
  { label: '#', field: null },
  { label: 'Token', field: null },
  { label: 'Price', field: null, align: 'right' },
  { label: '24h Change', field: 'priceChange24h', align: 'right' },
  { label: 'Liquidity', field: 'liquidity', align: 'right' },
  { label: 'Volume 24h', field: 'volume24h', align: 'right' },
  { label: 'Holders', field: 'holderCount', align: 'right' },
];

export function TokensPage({ onTokenSelect, initialQuery }: TokensPageProps) {
  const [tokens, setTokens] = useState<TokenSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [sort, setSort] = useState<SortState>({ field: 'volume24h', dir: 'desc' });
  const [query, setQuery] = useState(initialQuery ?? '');
  const PAGE_SIZE = 50;

  const load = useCallback(
    async (p: number, q: string, s: SortState, reset: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const result = await getTokenList({ sort: s.field, page: p, pageSize: PAGE_SIZE, query: q });
        setTokens((prev) => (reset ? result.items : [...prev, ...result.items]));
        setHasMore(result.hasMore);
        setPage(p);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load tokens');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Initial + query/sort changes
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
    }
    void load(1, query, sort, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, sort.field, sort.dir]);

  const handleSort = (field: SortField) => {
    setSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
        : { field, dir: 'desc' },
    );
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sort.field !== field) return <ChevronDown size={11} className="text-[var(--subtle)] opacity-40" />;
    return sort.dir === 'desc'
      ? <ChevronDown size={11} className="text-[var(--accent)]" />
      : <ChevronUp size={11} className="text-[var(--accent)]" />;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="display text-xl font-bold text-[var(--ink)] tracking-tight">Tokens</h1>
          <p className="text-xs text-[var(--subtle)] mt-0.5">All ERC-20 tokens on Arc Mainnet</p>
        </div>
        <div className="w-64">
          <SearchBar
            onSearch={(q) => setQuery(q)}
            placeholder="Name, symbol or address…"
            initialValue={query}
          />
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)]">
                {COLUMNS.map((col) => (
                  <th
                    key={col.label}
                    className={`py-3 px-4 font-semibold text-[var(--subtle)] uppercase tracking-widest text-[10px] whitespace-nowrap ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    } ${col.field ? 'cursor-pointer hover:text-[var(--ink-2)] select-none' : ''}`}
                    onClick={col.field ? () => handleSort(col.field!) : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.align === 'right' && col.field && <SortIcon field={col.field} />}
                      {col.label}
                      {col.align !== 'right' && col.field && <SortIcon field={col.field} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {error ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="py-8">
                    <ErrorState message={error} onRetry={() => { void load(1, query, sort, true); }} />
                  </td>
                </tr>
              ) : loading && tokens.length === 0 ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonTableRow key={i} />)
              ) : tokens.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length}>
                    <EmptyState
                      icon={Search}
                      title="No tokens found"
                      description={query ? `No results for "${query}"` : 'No ERC-20 tokens indexed yet.'}
                    />
                  </td>
                </tr>
              ) : (
                tokens.map((token, i) => (
                  <tr
                    key={token.address}
                    onClick={() => onTokenSelect(token.address)}
                    className="border-b border-[var(--border)] hover:bg-[var(--surface-strong)] cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 text-[var(--subtle)] font-mono">{i + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <TokenAvatar symbol={token.symbol} size={28} />
                        <div className="min-w-0">
                          <div className="font-semibold text-[var(--ink)] truncate max-w-[120px]">{token.name}</div>
                          <div className="text-[var(--subtle)] font-mono text-[10px]">{token.symbol}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-[var(--ink)] tabular-nums">
                      {token.price != null ? formatUsd(token.price, 4) : '—'}
                    </td>
                    <td className={`py-3 px-4 text-right font-semibold tabular-nums ${priceChangeClass(token.priceChange24h)}`}>
                      {formatPercent(token.priceChange24h)}
                    </td>
                    <td className="py-3 px-4 text-right text-[var(--ink-2)] tabular-nums">
                      {formatUsd(token.liquidity)}
                    </td>
                    <td className="py-3 px-4 text-right text-[var(--ink-2)] tabular-nums">
                      {formatUsd(token.volume24h)}
                    </td>
                    <td className="py-3 px-4 text-right text-[var(--ink-2)] tabular-nums">
                      {formatCount(token.holderCount)}
                    </td>
                  </tr>
                ))
              )}

              {/* Load more */}
              {hasMore && !loading && (
                <tr>
                  <td colSpan={COLUMNS.length} className="py-4 text-center">
                    <button
                      onClick={() => { void load(page + 1, query, sort, false); }}
                      className="text-xs font-semibold text-[var(--accent)] hover:underline"
                    >
                      Load more
                    </button>
                  </td>
                </tr>
              )}
              {loading && tokens.length > 0 && (
                <tr>
                  <td colSpan={COLUMNS.length} className="py-4 text-center">
                    <span className="text-xs text-[var(--subtle)]">Loading…</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-[var(--subtle)] text-center">
        Showing {tokens.length} token{tokens.length !== 1 ? 's' : ''} from Arc Mainnet Explorer
      </p>
    </div>
  );
}
