"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { formatUnits } from "viem";
import { CHAINLINK_AGGREGATOR_ABI } from "@/abis/chainlink";
import { CHAINLINK_FEEDS } from "@/config/chainlink";
import type { ChainlinkPricePoint, PegAssetKey } from "@/utils/sailMarketChartSeries";

const ROUNDS_TO_FETCH = 1000;
/** Stop walking rounds once we reach this age (31d chart + buffer). */
const MAX_HISTORY_AGE_SEC = 32 * 24 * 60 * 60;

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
  enabled = true,
  /** Earliest unix timestamp the series should cover (optional). */
  minTimestamp?: number
): { priceHistory: ChainlinkPricePoint[]; isLoading: boolean } {
  const [priceHistory, setPriceHistory] = useState<ChainlinkPricePoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const publicClient = usePublicClient({ chainId: 1 });

  useEffect(() => {
    if (!enabled || !asset || asset === "USD") {
      setPriceHistory([]);
      setIsLoading(false);
      return;
    }

    if (!publicClient) {
      setIsLoading(true);
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
        const [latestRound, decimals] = await Promise.all([
          publicClient!.readContract({
            address: feedAddress!,
            abi: CHAINLINK_AGGREGATOR_ABI,
            functionName: "latestRoundData",
          }),
          publicClient!.readContract({
            address: feedAddress!,
            abi: CHAINLINK_AGGREGATOR_ABI,
            functionName: "decimals",
          }),
        ]);

        const points: ChainlinkPricePoint[] = [];
        let roundId = latestRound[0];
        const cutoffTs =
          minTimestamp ??
          Math.floor(Date.now() / 1000) - MAX_HISTORY_AGE_SEC;

        while (points.length < ROUNDS_TO_FETCH && roundId > 0n) {
          try {
            const roundData = await publicClient!.readContract({
              address: feedAddress!,
              abi: CHAINLINK_AGGREGATOR_ABI,
              functionName: "getRoundData",
              args: [roundId],
            });

            const price = Number(formatUnits(roundData[1], decimals));
            const timestamp = Number(roundData[3]);

            if (timestamp > 0 && price > 0) {
              points.push({ timestamp, priceUsd: price });
              if (timestamp <= cutoffTs) break;
            }

            roundId = roundId - 1n;
          } catch {
            break;
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
  }, [asset, enabled, minTimestamp, publicClient]);

  return { priceHistory, isLoading };
}
