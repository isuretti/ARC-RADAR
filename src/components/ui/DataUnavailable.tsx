/**
 * Shown when a data source is not yet connected.
 * Prompts the developer to wire up the real API/subgraph.
 */

import { PlugZap } from 'lucide-react';

interface DataUnavailableProps {
  source: string;
  description?: string;
  compact?: boolean;
}

export function DataUnavailable({ source, description, compact }: DataUnavailableProps) {
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-[var(--subtle)] text-xs">
        <PlugZap size={12} />
        <span>Awaiting {source} integration</span>
      </span>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]/50 p-6 flex flex-col items-center gap-2 text-center">
      <PlugZap size={20} className="text-[var(--subtle)]" />
      <p className="text-sm font-semibold text-[var(--ink-2)]">
        {source} data not yet available
      </p>
      {description && (
        <p className="text-xs text-[var(--subtle)] max-w-xs">{description}</p>
      )}
      <p className="text-[11px] text-[var(--subtle)]/70 mt-1">
        Connect a DEX subgraph or API to populate this section.
      </p>
    </div>
  );
}
