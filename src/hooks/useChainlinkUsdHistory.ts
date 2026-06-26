"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { formatUnits } from "viem";
import { CHAINLINK_FEEDS } from "@/config/chainlink";
import { CHAINLINK_ORACLE_ABI } from "@/abis/shared";
import type { ChainlinkPricePoint, PegAssetKey } from "@/utils/sailMarketChartSeries";

const ROUNDS_TO_FETCH = 100;

export type { ChainlinkPricePoint };

const FEED_BY_ASSET: Record<PegAssetKey, `0x${string}` | null> = {
  ETH: CHAINLINK_FEEDS.ETH_USD,
  BTC: CHAINLINK_FEEDS.BTC_USD,
  EUR: CHAINLINK_FEEDS.EUR_USD,
  XAU: CHAINLINK_FEEDS.XAU_USD,
  XAG: CHAINLINK_FEEDS.XAG_USD,
  USD: null,
};

export function useChainlinkUsdHistory(
  asset: PegAssetKey | null,
  enabled = true
): { priceHistory: ChainlinkPricePoint[]; isLoading: boolean } {
  const [priceHistory, setPriceHistory] = useState<ChainlinkPricePoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const publicClient = usePublicClient({ chainId: 1 });

  useEffect(() => {
    if (!enabled || !asset || asset === "USD" || !publicClient) {
      setPriceHistory([]);
      setIsLoading(false);
      return;
    }

    const feedAddress = FEED_BY_ASSET[asset];
    if (!feedAddress) {
      setPriceHistory([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchHistory() {
      setIsLoading(true);
      try {
        const latestRound = await publicClient!.readContract({
          address: feedAddress!,
          abi: CHAINLINK_ORACLE_ABI,
          functionName: "latestRoundData",
        });

        const points: ChainlinkPricePoint[] = [];
        const latestRoundId = Number(latestRound[0]);

        for (let i = 0; i < ROUNDS_TO_FETCH; i++) {
          const roundId = latestRoundId - i;
          if (roundId <= 0) break;

          try {
            const roundData = await publicClient!.readContract({
              address: feedAddress!,
              abi: CHAINLINK_ORACLE_ABI,
              functionName: "getRoundData",
              args: [BigInt(roundId)],
            });

            const price = Number(formatUnits(roundData[1], 8));
            const timestamp = Number(roundData[3]);

            if (timestamp > 0 && price > 0) {
              points.push({ timestamp, priceUsd: price });
            }
          } catch {
            continue;
          }
        }

        if (!cancelled) {
          setPriceHistory(points.sort((a, b) => a.timestamp - b.timestamp));
        }
      } catch {
        if (!cancelled) setPriceHistory([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [asset, enabled, publicClient]);

  return { priceHistory, isLoading };
}
