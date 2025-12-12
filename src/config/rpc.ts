/**
 * RPC Configuration and Client Helpers
 * Provides RPC clients for mainnet
 */

import { createPublicClient, http, defineChain } from "viem";

// Mainnet RPC URL - defaults to Alchemy if not set in environment
export const MAINNET_RPC_URL =
  process.env.NEXT_PUBLIC_MAINNET_RPC_URL ||
  "https://eth-mainnet.g.alchemy.com/v2/uGl5kuD60tnGFHRmkevK1iYQuIQKmh1n";

// Arbitrum RPC URL - defaults to Alchemy if not set in environment
export const ARBITRUM_RPC_URL =
  process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL ||
  "https://arb-mainnet.g.alchemy.com/v2/uGl5kuD60tnGFHRmkevK1iYQuIQKmh1n";

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

// Export the mainnet public client for direct use
export const publicClient = getRpcClient();
