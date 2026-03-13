import { useMemo } from "react";
import { createPublicClient } from "viem";
import type { Network } from "@/config/networks";
import {
  getMainnetRpcClient,
  getArbitrumRpcClient,
  getBaseRpcClient,
  getMegaEthRpcClient,
} from "@/config/rpc";
import { redactForLog } from "@/utils/redactUrl";

// Module-level clients (singleton pattern)
let mainnetClient: ReturnType<typeof createPublicClient> | null = null;
let arbitrumClient: ReturnType<typeof createPublicClient> | null = null;
let baseClient: ReturnType<typeof createPublicClient> | null = null;
let megaethClient: ReturnType<typeof createPublicClient> | null = null;

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
          console.error("[useRpcClient] Failed to initialize mainnet client:", redactForLog(error instanceof Error ? error.message : String(error)));
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
          console.error("[useRpcClient] Failed to initialize Arbitrum client:", redactForLog(error instanceof Error ? error.message : String(error)));
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
          console.error("[useRpcClient] Failed to initialize Base client:", redactForLog(error instanceof Error ? error.message : String(error)));
        }
      }
      return baseClient;
    }

    // Always use dedicated MegaETH client for MegaETH markets
    if (network === "megaeth") {
      if (!megaethClient) {
        try {
          megaethClient = getMegaEthRpcClient();
        } catch (error) {
          console.error("[useRpcClient] Failed to initialize MegaETH client:", redactForLog(error instanceof Error ? error.message : String(error)));
        }
      }
      return megaethClient;
    }

    // Default to mainnet client as fallback
    if (!mainnetClient) {
      try {
        mainnetClient = getMainnetRpcClient();
      } catch (error) {
        console.error("[useRpcClient] Failed to initialize mainnet client:", redactForLog(error instanceof Error ? error.message : String(error)));
      }
    }
    return mainnetClient;
  }, [network]);
}

