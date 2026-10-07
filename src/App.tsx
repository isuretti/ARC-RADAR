import { useState, useCallback } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { TokensPage } from './pages/TokensPage';
import { DexsPage } from './pages/DexsPage';
import { TokenDetailPage } from './pages/TokenDetailPage';

export type Page = 'dashboard' | 'tokens' | 'dexs' | 'token-detail';

interface AppState {
  page: Page;
  tokenAddress?: string;
  searchQuery?: string;
}

export default function App() {
  const [appState, setAppState] = useState<AppState>({ page: 'dashboard' });

  const navigate = useCallback((page: Page, tokenAddress?: string) => {
    setAppState({ page, tokenAddress });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSearch = useCallback((query: string) => {
    if (!query.trim()) return;
    setAppState({ page: 'tokens', searchQuery: query });
  }, []);

  const handleTokenSelect = useCallback((address: string) => {
    setAppState({ page: 'token-detail', tokenAddress: address });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleBack = useCallback(() => {
    setAppState((prev) =>
      prev.searchQuery
        ? { page: 'tokens', searchQuery: prev.searchQuery }
        : { page: 'tokens' },
    );
  }, []);

  return (
    <Layout
      currentPage={appState.page === 'token-detail' ? 'tokens' : appState.page}
      onNavigate={navigate}
      onSearch={handleSearch}
    >
      {appState.page === 'dashboard' && (
        <Dashboard onTokenSelect={handleTokenSelect} />
      )}
      {appState.page === 'tokens' && (
        <TokensPage
          onTokenSelect={handleTokenSelect}
          initialQuery={appState.searchQuery}
        />
      )}
      {appState.page === 'dexs' && <DexsPage />}
      {appState.page === 'token-detail' && appState.tokenAddress && (
        <TokenDetailPage
          tokenAddress={appState.tokenAddress}
          onBack={handleBack}
        />
      )}
    </Layout>
  );
}
