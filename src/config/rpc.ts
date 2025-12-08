/**
 * RPC Configuration and Client Helpers
 * Provides RPC clients for mainnet and local Anvil fork
 */

import { createPublicClient, http, defineChain } from "viem";
import { shouldUseAnvil } from "./environment";

// Mainnet RPC URL - defaults to Alchemy if not set in environment
export const MAINNET_RPC_URL =
  process.env.NEXT_PUBLIC_MAINNET_RPC_URL ||
  "https://eth-mainnet.g.alchemy.com/v2/uGl5kuD60tnGFHRmkevK1iYQuIQKmh1n";

// Arbitrum RPC URL - defaults to Alchemy if not set in environment
export const ARBITRUM_RPC_URL =
  process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL ||
  "https://arb-mainnet.g.alchemy.com/v2/uGl5kuD60tnGFHRmkevK1iYQuIQKmh1n";

// Anvil RPC URL - defaults to localhost:8545
export const ANVIL_RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545";

// Anvil fork RPC URL (for mainnet fork on different port, e.g., 8546)
export const ANVIL_FORK_RPC_URL =
  process.env.NEXT_PUBLIC_ANVIL_FORK_RPC_URL || "http://127.0.0.1:8546";

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

// Define Anvil chain
const anvilChain = defineChain({
  id: 31337,
  name: "Anvil",
  network: "anvil",
  nativeCurrency: {
    decimals: 18,
    name: "Ethereum",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [ANVIL_RPC_URL],
    },
    public: {
      http: [ANVIL_RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: "Anvil Explorer",
      url: "",
    },
  },
  testnet: true,
});

// Define Anvil fork chain (for mainnet fork)
const anvilForkChain = defineChain({
  id: 31337,
  name: "Anvil ETH Fork",
  network: "anvil-eth",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [ANVIL_FORK_RPC_URL],
    },
    public: {
      http: [ANVIL_FORK_RPC_URL],
    },
  },
});

/**
 * Get the appropriate RPC client based on environment
 * Returns mainnet client in production, anvil client in development
 */
export function getRpcClient() {
  const useAnvil = shouldUseAnvil();
  
  if (useAnvil) {
    return createPublicClient({
      chain: anvilChain,
      transport: http(ANVIL_RPC_URL),
    });
  }
  
  return createPublicClient({
    chain: mainnetChain,
    transport: http(MAINNET_RPC_URL),
  });
}

/**
 * Get mainnet RPC client (always returns mainnet, regardless of environment)
 */
export function getMainnetRpcClient() {
  return createPublicClient({
    chain: mainnetChain,
    transport: http(MAINNET_RPC_URL),
  });
}

/**
 * Get Anvil RPC client (always returns Anvil, regardless of environment)
 */
export function getAnvilRpcClient() {
  return createPublicClient({
    chain: anvilChain,
    transport: http(ANVIL_RPC_URL),
  });
}

/**
 * Get Anvil fork RPC client (for mainnet fork on different port)
 */
export function getAnvilForkRpcClient() {
  return createPublicClient({
    chain: anvilForkChain,
    transport: http(ANVIL_FORK_RPC_URL),
  });
}

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
 * Get Arbitrum RPC client (always returns Arbitrum, regardless of environment)
 */
export function getArbitrumRpcClient() {
  return createPublicClient({
    chain: arbitrumChain,
    transport: http(ARBITRUM_RPC_URL),
  });
}

