/**
 * RPC Configuration and Client Helpers
 * Provides RPC clients for mainnet
 */

import { createPublicClient, http, defineChain } from "viem";

// Multicall3 is used by viem's `client.multicall()`. Our custom chains must include it.
// This address is standard across many EVM chains.
const MULTICALL3 = {
  address: "0xca11bde05977b3631167028862be2a173976ca11" as `0x${string}`,
  // blockCreated is not required for calls; set to 0 to avoid incorrect gating.
  blockCreated: 0,
};

// Mainnet RPC URL - defaults to Alchemy if not set in environment
export const MAINNET_RPC_URL =
  process.env.NEXT_PUBLIC_MAINNET_RPC_URL ||
  "https://eth-mainnet.g.alchemy.com/v2/uGl5kuD60tnGFHRmkevK1iYQuIQKmh1n";

// Arbitrum RPC URL - defaults to Alchemy if not set in environment
export const ARBITRUM_RPC_URL =
  process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL ||
  "https://arb-mainnet.g.alchemy.com/v2/uGl5kuD60tnGFHRmkevK1iYQuIQKmh1n";

// Base RPC URL - defaults to Base public RPC if not set in environment
export const BASE_RPC_URL =
  process.env.NEXT_PUBLIC_BASE_RPC_URL ||
  "https://mainnet.base.org";

// Define mainnet chain
const mainnetChain = defineChain({
  id: 1,
  name: "Ethereum Mainnet",
  network: "mainnet",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  contracts: {
    multicall3: MULTICALL3,
  },
  rpcUrls: {
    default: {
      http: [MAINNET_RPC_URL],
    },
    public: {
      http: [MAINNET_RPC_URL],
    },
  },
});

// Define Arbitrum chain
const arbitrumChain = defineChain({
  id: 42161,
  name: "Arbitrum One",
  network: "arbitrum",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  contracts: {
    multicall3: MULTICALL3,
  },
  rpcUrls: {
    default: {
      http: [ARBITRUM_RPC_URL],
    },
    public: {
      http: [ARBITRUM_RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: "Arbiscan",
      url: "https://arbiscan.io",
    },
  },
});

// Define Base chain
const baseChain = defineChain({
  id: 8453,
  name: "Base",
  network: "base",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  contracts: {
    multicall3: MULTICALL3,
  },
  rpcUrls: {
    default: {
      http: [BASE_RPC_URL],
    },
    public: {
      http: [BASE_RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: "Basescan",
      url: "https://basescan.org",
    },
  },
});

/**
 * Get the mainnet RPC client
 */
export function getRpcClient() {
  return createPublicClient({
    chain: mainnetChain,
    transport: http(MAINNET_RPC_URL),
  });
}

/**
 * Get mainnet RPC client (alias for getRpcClient)
 */
export function getMainnetRpcClient() {
  return getRpcClient();
}

/**
 * Get Arbitrum RPC client
 */
export function getArbitrumRpcClient() {
  return createPublicClient({
    chain: arbitrumChain,
    transport: http(ARBITRUM_RPC_URL),
  });
}

/**
 * Get Base RPC client
 */
export function getBaseRpcClient() {
  return createPublicClient({
    chain: baseChain,
    transport: http(BASE_RPC_URL),
  });
}

// Export the mainnet public client for direct use
export const publicClient = getRpcClient();
