# Arc Liquidity Radar

> Built with Arc Studio — analytics and discovery platform for the Arc blockchain.

---

## What This App Does

Arc Liquidity Radar is a token analytics and liquidity discovery dashboard for the Arc blockchain.
Users can discover tokens, analyze liquidity across DEXs, inspect holders, review trading activity,
and examine contract metadata. It is an analytics platform — not a trading app.

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS
- Web3: wagmi v2, viem v2, ConnectKit
- Data: Arc Mainnet Explorer (Blockscout-compatible API at https://explorer.arc.io/api/v2/)
- Chain: Arc Mainnet (Chain ID: 5042)
- USDC: 0x3600000000000000000000000000000000000000 (Arc Mainnet)
- Fonts: Space Grotesk (display), DM Sans (body), JetBrains Mono (mono)
- Icons: lucide-react, @web3icons/react
- Toasts: Sonner

## Key Files

- `src/App.tsx` — Router/state for Dashboard, Tokens, DEXs, TokenDetail pages
- `src/pages/Dashboard.tsx` — Trending, new, high-volume, high-liquidity, recent sections
- `src/pages/TokensPage.tsx` — Full paginated sortable token table + search
- `src/pages/TokenDetailPage.tsx` — Token overview, liquidity pools, trades, holders, contract tabs
- `src/pages/DexsPage.tsx` — DEX comparison and provider status
- `src/components/Layout.tsx` — Top nav, search bar, footer
- `src/components/TokenCard.tsx` — Card used in dashboard sections
- `src/components/TokenAvatar.tsx` — Symbol-based avatar with deterministic color
- `src/data/types.ts` — Normalized data model (TokenSummary, TokenDetail, PoolInfo, etc.)
- `src/data/arcRpc.ts` — Arc testnet RPC client (viem public client)
- `src/data/explorerApi.ts` — Blockscout API adapter (tokens, holders, transfers, contracts)
- `src/data/dexProviders.ts` — DEX provider registry + ArcSwap provider stub
- `src/data/tokenService.ts` — Normalized service combining explorer + DEX data
- `src/data/cache.ts` — In-memory TTL cache
- `src/utils/format.ts` — Formatting helpers (USD, addresses, timestamps, percent)

## Data Architecture

Modular layered architecture:
1. `arcRpc.ts` — raw viem RPC calls to Arc testnet
2. `explorerApi.ts` — Blockscout-compatible REST API calls (tokens, holders, transfers)
3. `dexProviders.ts` — DEX provider interface + registry (add new DEXs here)
4. `tokenService.ts` — Combines and normalizes all data sources
5. `cache.ts` — TTL cache to minimize redundant calls

## Wiring a DEX

To add a new DEX, implement the `DexProvider` interface in `src/data/dexProviders.ts`
and push an instance into the `PROVIDERS` array. No other changes needed.

## Environment Variables

```
VITE_ARCSWAP_SUBGRAPH_URL=   # ArcSwap Uniswap-V3-compatible subgraph URL
VITE_ARCSWAP_API_URL=        # Alternative REST API for ArcSwap (if no subgraph)
```

## To Run

```
bun install
bun run dev
```
