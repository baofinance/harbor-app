import { useMemo } from "react";
import { createPublicClient } from "viem";
import type { Network } from "@/config/networks";
import {
  getMainnetRpcClient,
  getArbitrumRpcClient,
  getBaseRpcClient,
} from "@/config/rpc";

// Module-level clients (singleton pattern)
let mainnetClient: ReturnType<typeof createPublicClient> | null = null;
let arbitrumClient: ReturnType<typeof createPublicClient> | null = null;
let baseClient: ReturnType<typeof createPublicClient> | null = null;

/**
 * Hook to get the appropriate RPC client based on network
 */
export function useRpcClient(network: Network) {
  return useMemo(() => {
    // Always use mainnet client for mainnet feeds
    if (network === "mainnet") {
      if (!mainnetClient) {
        try {
          mainnetClient = getMainnetRpcClient();
        } catch (error) {
          console.error("[useRpcClient] Failed to initialize mainnet client:", error);
        }
      }
      return mainnetClient;
    }

    // Always use dedicated Arbitrum client for Arbitrum feeds
    if (network === "arbitrum") {
      if (!arbitrumClient) {
        try {
          arbitrumClient = getArbitrumRpcClient();
        } catch (error) {
          console.error("[useRpcClient] Failed to initialize Arbitrum client:", error);
        }
      }
      return arbitrumClient;
    }

    // Always use dedicated Base client for Base feeds
    if (network === "base") {
      if (!baseClient) {
        try {
          baseClient = getBaseRpcClient();
        } catch (error) {
          console.error("[useRpcClient] Failed to initialize Base client:", error);
        }
      }
      return baseClient;
    }

    // Default to mainnet client as fallback
    if (!mainnetClient) {
      try {
        mainnetClient = getMainnetRpcClient();
      } catch (error) {
        console.error("[useRpcClient] Failed to initialize mainnet client:", error);
      }
    }
    return mainnetClient;
  }, [network]);
}

