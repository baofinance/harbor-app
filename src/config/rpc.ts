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

// Mainnet RPC URL - must be set in env for production (e.g. Alchemy). No hardcoded key.
const PUBLIC_MAINNET_RPC = "https://eth.llamarpc.com";

/**
 * Upstream JSON-RPC URL (Alchemy, etc.). Used by server-side clients and chain metadata.
 * Prefer server-only `MAINNET_RPC_URL`; falls back to public RPC for local/dev.
 */
function getUpstreamMainnetRpcUrl(): string {
  return (
    process.env.MAINNET_RPC_URL ||
    process.env.NEXT_PUBLIC_MAINNET_RPC_URL ||
    PUBLIC_MAINNET_RPC
  );
}

/**
 * URL passed to wagmi/viem `http()` for browser reads.
 * When `NEXT_PUBLIC_USE_RPC_PROXY=true`, use same-origin `/api/rpc` so previews (e.g. Vercel)
 * do not call `NEXT_PUBLIC_APP_URL/api/rpc` on another host and hit CORS.
 */
function getBrowserMainnetRpcTransportUrl(): string {
  if (process.env.NEXT_PUBLIC_USE_RPC_PROXY === "true") {
    return "/api/rpc";
  }
  return process.env.NEXT_PUBLIC_MAINNET_RPC_URL || PUBLIC_MAINNET_RPC;
}

const UPSTREAM_MAINNET_RPC = getUpstreamMainnetRpcUrl();

/** Wagmi / browser transport (relative `/api/rpc` when proxy is on). */
export const MAINNET_RPC_URL = getBrowserMainnetRpcTransportUrl();

// Arbitrum RPC URL - must be set in env for production. Public fallback.
const PUBLIC_ARBITRUM_RPC = "https://arb1.arbitrum.io/rpc";
export const ARBITRUM_RPC_URL =
  process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || PUBLIC_ARBITRUM_RPC;

// Base RPC URL - defaults to Base public RPC if not set in environment
export const BASE_RPC_URL =
  process.env.NEXT_PUBLIC_BASE_RPC_URL ||
  "https://mainnet.base.org";

// MegaETH RPC URL (chainId 4326) - set in env for MegaETH markets
export const MEGAETH_RPC_URL =
  process.env.NEXT_PUBLIC_MEGAETH_RPC_URL || "";

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
      http: [UPSTREAM_MAINNET_RPC],
    },
    public: {
      http: [UPSTREAM_MAINNET_RPC],
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

// MegaETH chain (chainId 4326)
const megaethChain = defineChain({
  id: 4326,
  name: "MegaETH",
  network: "megaeth",
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
      http: [MEGAETH_RPC_URL || "https://rpc.megaeth.org"],
    },
    public: {
      http: [MEGAETH_RPC_URL || "https://rpc.megaeth.org"],
    },
  },
});

/**
 * Get the mainnet RPC client
 */
export function getRpcClient() {
  return createPublicClient({
    chain: mainnetChain,
    transport: http(UPSTREAM_MAINNET_RPC),
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

/**
 * Get MegaETH RPC client (chainId 4326)
 */
export function getMegaEthRpcClient() {
  const url = MEGAETH_RPC_URL || "https://rpc.megaeth.org";
  return createPublicClient({
    chain: megaethChain,
    transport: http(url),
  });
}

// Export chains for wagmi
export { mainnetChain, arbitrumChain, baseChain, megaethChain };

// Export the mainnet public client for direct use
export const publicClient = getRpcClient();
