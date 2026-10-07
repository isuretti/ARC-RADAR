import { useState, type ReactNode } from 'react';
import { Activity, BarChart2, Layers, Menu, X, Zap, ExternalLink } from 'lucide-react';
import { SearchBar } from './SearchBar';
import type { Page } from '../App';

interface LayoutProps {
  children: ReactNode;
  currentPage: Page;
  onNavigate: (page: Page, tokenAddress?: string) => void;
  onSearch: (query: string) => void;
}

const NAV_ITEMS: { id: Page; label: string; icon: typeof Activity }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Activity },
  { id: 'tokens', label: 'Tokens', icon: Layers },
  { id: 'dexs', label: 'DEXs', icon: BarChart2 },
];

export function Layout({ children, currentPage, onNavigate, onSearch }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-[var(--bg)] flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
          {/* Logo */}
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 flex-shrink-0 group"
          >
            <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center">
              <Zap size={14} className="text-[#0d1b2f]" />
            </div>
            <span className="display text-sm font-bold text-[var(--ink)] tracking-tight hidden sm:block">
              Arc Liquidity Radar
            </span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 ml-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    active
                      ? 'bg-[var(--surface-strong)] text-[var(--ink)] border border-[var(--border-strong)]'
                      : 'text-[var(--muted)] hover:text-[var(--ink-2)] hover:bg-[var(--surface)]'
                  }`}
                >
                  <Icon size={13} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Search */}
          <div className="flex-1 max-w-md ml-auto">
            <SearchBar onSearch={onSearch} placeholder="Search tokens, symbols, addresses…" />
          </div>

          {/* Network pill */}
          <a
            href="https://explorer.arc.io"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-strong)] transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] flex-shrink-0" />
            <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-widest">
              Arc Mainnet
            </span>
            <ExternalLink size={9} className="text-[var(--subtle)]" />
          </a>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden w-8 h-8 flex items-center justify-center text-[var(--muted)]"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Mobile nav dropdown */}
        {mobileOpen && (
          <div className="md:hidden border-t border-[var(--border)] bg-[var(--bg)] px-4 py-3 flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { onNavigate(item.id); setMobileOpen(false); }}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-left transition-all ${
                    active
                      ? 'bg-[var(--surface-strong)] text-[var(--ink)]'
                      : 'text-[var(--muted)] hover:text-[var(--ink-2)] hover:bg-[var(--surface)]'
                  }`}
                >
                  <Icon size={15} />
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-4 px-4 text-center">
        <p className="text-[11px] text-[var(--subtle)]">
          Arc Liquidity Radar — analytics data from Arc Mainnet Explorer
        </p>
      </footer>
    </div>
  );
}
