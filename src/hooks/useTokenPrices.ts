import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { minterABI } from "@/abis/minter";
import { useCoinGeckoPrices } from "./useCoinGeckoPrice";

// Chainlink price feed addresses on Ethereum mainnet
const CHAINLINK_FEEDS = {
  ETH_USD: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419" as `0x${string}`,
  BTC_USD: "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c" as `0x${string}`,
} as const;

const chainlinkABI = [
  {
    inputs: [],
    name: "decimals",
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "latestRoundData",
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

interface TokenPricesResult {
  peggedBackingRatio: number; // Health indicator (1.0 = healthy)
  peggedPriceUSD: number; // Actual USD price of ha token
  leveragedPriceUSD: number; // Actual USD price of hs token
  pegTargetUSD: number; // USD price of peg target
  isDepegged: boolean; // True if backing ratio < 1.0
  isLoading: boolean;
  error: boolean;
}

interface MarketTokenPriceInput {
  marketId: string;
  minterAddress: `0x${string}`;
  pegTarget: string;
}

/**
 * Hook to fetch ha and hs token prices in USD for multiple markets
 * 
 * How it works:
 * 1. Reads peggedTokenPrice() and leveragedTokenPrice() from Minter contracts
 *    - These return prices denominated in the peg target (USD, BTC, ETH)
 * 2. Gets the USD price of the peg targets (Priority: CoinGecko → Chainlink)
 * 3. Multiplies to get final USD prices:
 *    - haTokenPriceUSD = peggedTokenPrice × pegTargetUSD
 *    - hsTokenPriceUSD = leveragedTokenPrice × pegTargetUSD
 */
export function useMultipleTokenPrices(
  markets: MarketTokenPriceInput[]
): Record<string, TokenPricesResult> {
  // Build minter contract calls for all markets
  const minterContracts = useMemo(() => {
    return markets.flatMap((market) => [
      {
        address: market.minterAddress,
        abi: minterABI,
        functionName: "peggedTokenPrice" as const,
      },
      {
        address: market.minterAddress,
        abi: minterABI,
        functionName: "leveragedTokenPrice" as const,
      },
    ]);
  }, [markets]);

  // Determine which Chainlink feeds we need
  const needsChainlink = useMemo(() => {
    const needs = { eth: false, btc: false };
    markets.forEach((market) => {
      const target = market.pegTarget.toLowerCase();
      if (target === "eth" || target === "ethereum") needs.eth = true;
      if (target === "btc" || target === "bitcoin") needs.btc = true;
    });
    return needs;
  }, [markets]);

  // Build Chainlink contract calls (only if needed)
  const chainlinkContracts = useMemo(() => {
    const contracts: any[] = [];
    if (needsChainlink.eth) {
      contracts.push(
        {
          address: CHAINLINK_FEEDS.ETH_USD,
          abi: chainlinkABI,
          functionName: "decimals" as const,
        },
        {
          address: CHAINLINK_FEEDS.ETH_USD,
          abi: chainlinkABI,
          functionName: "latestRoundData" as const,
        }
      );
    }
    if (needsChainlink.btc) {
      contracts.push(
        {
          address: CHAINLINK_FEEDS.BTC_USD,
          abi: chainlinkABI,
          functionName: "decimals" as const,
        },
        {
          address: CHAINLINK_FEEDS.BTC_USD,
          abi: chainlinkABI,
          functionName: "latestRoundData" as const,
        }
      );
    }
    return contracts;
  }, [needsChainlink]);

  // Read minter token prices
  const { data: tokenPriceData, isLoading: isPriceLoading, error: priceError } = useReadContracts({
    contracts: minterContracts,
    query: {
      enabled: minterContracts.length > 0,
    },
  });

  // Read Chainlink prices
  const { data: chainlinkData } = useReadContracts({
    contracts: chainlinkContracts,
    query: {
      enabled: chainlinkContracts.length > 0,
    },
  });

  // Get CoinGecko prices for peg targets
  const coinGeckoIds = useMemo(() => {
    const uniqueTargets = new Set<string>();
    markets.forEach((market) => {
      const target = market.pegTarget.toLowerCase();
      if (target === "btc" || target === "bitcoin") {
        uniqueTargets.add("bitcoin");
      } else if (target === "eth" || target === "ethereum") {
        uniqueTargets.add("ethereum");
      }
    });
    return Array.from(uniqueTargets);
  }, [markets]);

  const coinGeckoPrices = useCoinGeckoPrices(coinGeckoIds);

  // Parse Chainlink prices
  const chainlinkPrices = useMemo(() => {
    const prices: { eth?: number; btc?: number } = {};
    if (!chainlinkData) return prices;

    let offset = 0;
    
    // Parse ETH if requested
    if (needsChainlink.eth && chainlinkData.length >= 2) {
      const decimalsResult = chainlinkData[offset];
      const roundDataResult = chainlinkData[offset + 1];
      
      if (decimalsResult?.status === "success" && roundDataResult?.status === "success") {
        const decimals = decimalsResult.result as number;
        const roundData = roundDataResult.result as any[];
        if (roundData && roundData[1]) {
          const price = Number(roundData[1]) / 10 ** decimals;
          prices.eth = price > 0 ? price : undefined;
        }
      }
      offset += 2;
    }

    // Parse BTC if requested
    if (needsChainlink.btc && chainlinkData.length >= offset + 2) {
      const decimalsResult = chainlinkData[offset];
      const roundDataResult = chainlinkData[offset + 1];
      
      if (decimalsResult?.status === "success" && roundDataResult?.status === "success") {
        const decimals = decimalsResult.result as number;
        const roundData = roundDataResult.result as any[];
        if (roundData && roundData[1]) {
          const price = Number(roundData[1]) / 10 ** decimals;
          prices.btc = price > 0 ? price : undefined;
        }
      }
    }

    return prices;
  }, [chainlinkData, needsChainlink]);

  // Calculate USD prices for each market
  return useMemo(() => {
    const result: Record<string, TokenPricesResult> = {};

    markets.forEach((market, idx) => {
      const baseOffset = idx * 2;
      const peggedResult = tokenPriceData?.[baseOffset];
      const leveragedResult = tokenPriceData?.[baseOffset + 1];

      // Get peg target USD price (Priority: CoinGecko → Chainlink → 0)
      const target = market.pegTarget.toLowerCase();
      let pegTargetUSD = 0;
      
      if (target === "usd" || target === "fxusd") {
        pegTargetUSD = 1.0;
      } else if (target === "btc" || target === "bitcoin") {
        // Try CoinGecko first, fall back to Chainlink
        pegTargetUSD = 
          coinGeckoPrices.prices?.["bitcoin"] || 
          chainlinkPrices.btc || 
          0;
      } else if (target === "eth" || target === "ethereum") {
        // Try CoinGecko first, fall back to Chainlink
        pegTargetUSD = 
          coinGeckoPrices.prices?.["ethereum"] || 
          chainlinkPrices.eth || 
          0;
      }

      // Check if minter data is available
      if (!peggedResult?.result || !leveragedResult?.result) {
        result[market.marketId] = {
          peggedBackingRatio: 0,
          peggedPriceUSD: 0,
          leveragedPriceUSD: 0,
          pegTargetUSD,
          isDepegged: false,
          isLoading: isPriceLoading,
          error: !!priceError,
        };
        return;
      }

      // Parse token prices (in peg target units)
      const peggedBackingRatio = Number(
        formatUnits(peggedResult.result as bigint, 18)
      );
      const leveragedPriceInPegUnits = Number(
        formatUnits(leveragedResult.result as bigint, 18)
      );

      // Calculate USD prices: tokenPrice × pegTargetUSD
      result[market.marketId] = {
        peggedBackingRatio,
        peggedPriceUSD: peggedBackingRatio * pegTargetUSD,
        leveragedPriceUSD: leveragedPriceInPegUnits * pegTargetUSD,
        pegTargetUSD,
        isDepegged: peggedBackingRatio < 1.0,
        isLoading: isPriceLoading,
        error: !!priceError,
      };
    });

    return result;
  }, [markets, tokenPriceData, coinGeckoPrices, chainlinkPrices, isPriceLoading, priceError]);
}

