import { useEffect, useState, useCallback } from 'react';
import { TrendingUp, Sparkles, BarChart2, Droplets, Clock } from 'lucide-react';
import { TokenCard } from '../components/TokenCard';
import { SkeletonCard } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/EmptyState';
import {
  getTrendingTokens,
  getHighestVolumeTokens,
  getHighestLiquidityTokens,
  getNewTokens,
  getRecentlyActiveTokens,
} from '../data/tokenService';
import type { TokenSummary } from '../data/types';

interface SectionState {
  data: TokenSummary[];
  loading: boolean;
  error: string | null;
}

const INITIAL: SectionState = { data: [], loading: true, error: null };

interface DashboardProps {
  onTokenSelect: (address: string) => void;
}

function TokenSection({
  title,
  icon: Icon,
  state,
  onTokenSelect,
}: {
  title: string;
  icon: typeof TrendingUp;
  state: SectionState;
  onTokenSelect: (address: string) => void;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Icon size={15} className="text-[var(--accent)]" />
        <h2 className="text-sm font-semibold text-[var(--ink)] display">{title}</h2>
      </div>

      {state.error ? (
        <ErrorState message={state.error} />
      ) : state.loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : state.data.length === 0 ? (
        <EmptyState
          icon={BarChart2}
          title="No tokens found"
          description="No data available from the Arc Testnet explorer yet."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {state.data.map((token, i) => (
            <TokenCard
              key={token.address}
              token={token}
              rank={i + 1}
              onClick={() => onTokenSelect(token.address)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function Dashboard({ onTokenSelect }: DashboardProps) {
  const [trending, setTrending] = useState<SectionState>(INITIAL);
  const [newTokens, setNewTokens] = useState<SectionState>(INITIAL);
  const [volume, setVolume] = useState<SectionState>(INITIAL);
  const [liquidity, setLiquidity] = useState<SectionState>(INITIAL);
  const [recent, setRecent] = useState<SectionState>(INITIAL);

  const loadSection = useCallback(
    async (
      setter: React.Dispatch<React.SetStateAction<SectionState>>,
      fetcher: () => Promise<TokenSummary[]>,
    ) => {
      setter({ data: [], loading: true, error: null });
      try {
        const data = await fetcher();
        setter({ data, loading: false, error: null });
      } catch (e) {
        setter({
          data: [],
          loading: false,
          error: e instanceof Error ? e.message : 'Unknown error',
        });
      }
    },
    [],
  );

  useEffect(() => {
    void loadSection(setTrending, getTrendingTokens);
    void loadSection(setNewTokens, getNewTokens);
    void loadSection(setVolume, getHighestVolumeTokens);
    void loadSection(setLiquidity, getHighestLiquidityTokens);
    void loadSection(setRecent, getRecentlyActiveTokens);
  }, [loadSection]);

  return (
    <div className="space-y-10">
      {/* Page header */}
      <div>
        <h1 className="display text-2xl font-bold text-[var(--ink)] tracking-tight mb-1">
          Liquidity Radar
        </h1>
        <p className="text-sm text-[var(--subtle)]">
          Discover tokens and liquidity on Arc — powered by live chain data.
        </p>
      </div>

      <TokenSection
        title="Trending"
        icon={TrendingUp}
        state={trending}
        onTokenSelect={onTokenSelect}
      />
      <TokenSection
        title="New Tokens"
        icon={Sparkles}
        state={newTokens}
        onTokenSelect={onTokenSelect}
      />
      <TokenSection
        title="Highest 24h Volume"
        icon={BarChart2}
        state={volume}
        onTokenSelect={onTokenSelect}
      />
      <TokenSection
        title="Highest Liquidity"
        icon={Droplets}
        state={liquidity}
        onTokenSelect={onTokenSelect}
      />
      <TokenSection
        title="Recently Active"
        icon={Clock}
        state={recent}
        onTokenSelect={onTokenSelect}
      />
    </div>
  );
}
