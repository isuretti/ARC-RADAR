/**
 * Arc RPC client — Arc Mainnet (chain ID 5042).
 * Uses the RPC proxy token when available (set in .env by Arc Studio),
 * otherwise falls back to the public Arc mainnet RPC.
 *
 * This module is the single place that constructs RPC URLs for Arc.
 */

import { createPublicClient, http, type PublicClient } from 'viem';
import { arc } from 'viem/chains';

const proxyChains: string[] = ((import.meta.env.VITE_RPC_PROXY_CHAINS as string | undefined) ?? '').split(',').map((s) => s.trim());
const proxyBase = import.meta.env.VITE_RPC_PROXY_BASE_URL as string | undefined;
const proxyToken = import.meta.env.VITE_RPC_PROXY_TOKEN as string | undefined;

const ARC_MAINNET_CHAIN_KEY = 'Arc';

function buildRpcUrl(): string {
  if (proxyBase && proxyToken && proxyChains.includes(ARC_MAINNET_CHAIN_KEY)) {
    return `${proxyBase}/api/rpc/${ARC_MAINNET_CHAIN_KEY}?_rpc_token=${proxyToken}`;
  }
  // Fallback to public Arc mainnet RPC
  return 'https://rpc.mainnet.arc.io';
}

export const ARC_MAINNET_RPC_URL = buildRpcUrl();
export const ARC_MAINNET_CHAIN_ID = 5042;
export const ARC_EXPLORER_BASE = 'https://explorer.arc.io';

let _client: PublicClient | null = null;

export function getArcClient(): PublicClient {
  if (!_client) {
    _client = createPublicClient({
      chain: arc,
      transport: http(ARC_MAINNET_RPC_URL, { timeout: 15_000 }),
    });
  }
  return _client;
}

/** Fetch a single ERC-20 token's name, symbol, decimals via multicall-style calls */
export async function fetchErc20Metadata(address: `0x${string}`): Promise<{
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
} | null> {
  const client = getArcClient();
  const erc20Abi = [
    { name: 'name', type: 'function', inputs: [], outputs: [{ type: 'string' }], stateMutability: 'view' },
    { name: 'symbol', type: 'function', inputs: [], outputs: [{ type: 'string' }], stateMutability: 'view' },
    { name: 'decimals', type: 'function', inputs: [], outputs: [{ type: 'uint8' }], stateMutability: 'view' },
    { name: 'totalSupply', type: 'function', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  ] as const;

  try {
    const results = await client.multicall({
      contracts: [
        { address, abi: erc20Abi, functionName: 'name' },
        { address, abi: erc20Abi, functionName: 'symbol' },
        { address, abi: erc20Abi, functionName: 'decimals' },
        { address, abi: erc20Abi, functionName: 'totalSupply' },
      ],
    });

    const [nameResult, symbolResult, decimalsResult, totalSupplyResult] = results;

    if (
      nameResult.status === 'failure' ||
      symbolResult.status === 'failure' ||
      decimalsResult.status === 'failure' ||
      totalSupplyResult.status === 'failure'
    ) {
      return null;
    }

    return {
      name: nameResult.result,
      symbol: symbolResult.result,
      decimals: decimalsResult.result,
      totalSupply: totalSupplyResult.result,
    };
  } catch {
    return null;
  }
}

/** Fetch ERC-20 balance of an address */
export async function fetchErc20Balance(
  tokenAddress: `0x${string}`,
  holder: `0x${string}`,
): Promise<bigint | null> {
  const client = getArcClient();
  try {
    const result = await client.readContract({
      address: tokenAddress,
      abi: [
        {
          name: 'balanceOf',
          type: 'function',
          inputs: [{ type: 'address' }],
          outputs: [{ type: 'uint256' }],
          stateMutability: 'view',
        },
      ],
      functionName: 'balanceOf',
      args: [holder],
    });
    return result;
  } catch {
    return null;
  }
}

/** Fetch recent logs for Transfer events to get trading activity */
export async function fetchTransferLogs(
  tokenAddress: `0x${string}`,
  fromBlock: bigint,
  toBlock: bigint,
): Promise<Array<{ from: string; to: string; value: bigint; blockNumber: bigint; txHash: string }>> {
  const client = getArcClient();
  try {
    const logs = await client.getLogs({
      address: tokenAddress,
      event: {
        type: 'event',
        name: 'Transfer',
        inputs: [
          { type: 'address', name: 'from', indexed: true },
          { type: 'address', name: 'to', indexed: true },
          { type: 'uint256', name: 'value', indexed: false },
        ],
      },
      fromBlock,
      toBlock,
    });

    return logs.map((log) => ({
      from: log.args.from as string,
      to: log.args.to as string,
      value: log.args.value as bigint,
      blockNumber: log.blockNumber ?? 0n,
      txHash: log.transactionHash ?? '',
    }));
  } catch {
    return [];
  }
}

/** Get current block number */
export async function getCurrentBlockNumber(): Promise<bigint> {
  const client = getArcClient();
  try {
    return await client.getBlockNumber();
  } catch {
    return 0n;
  }
}

/** Get block timestamp for a given block number */
export async function getBlockTimestamp(blockNumber: bigint): Promise<number> {
  const client = getArcClient();
  try {
    const block = await client.getBlock({ blockNumber });
    return Number(block.timestamp);
  } catch {
    return Math.floor(Date.now() / 1000);
  }
}
