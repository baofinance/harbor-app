"use client";

import { useQuery } from "@tanstack/react-query";
import type { PublicClient } from "viem";
import { formatUnits } from "viem";
import { usePublicClient } from "wagmi";
import { CHAINLINK_AGGREGATOR_ABI } from "@/abis/chainlink";
import { CHAINLINK_FEEDS } from "@/config/chainlink";
import type { ChainlinkPricePoint, PegAssetKey } from "@/utils/sailMarketChartSeries";

/** Stop walking rounds once we reach this age (up to 1Y chart window). */
const DEFAULT_MAX_HISTORY_AGE_SEC = 366 * 24 * 60 * 60;
const MAX_ROUNDS = 3000;
const MULTICALL_BATCH_SIZE = 50;

export type { ChainlinkPricePoint };

const FEED_BY_ASSET: Record<PegAssetKey, `0x${string}` | null> = {
  ETH: CHAINLINK_FEEDS.ETH_USD,
  BTC: CHAINLINK_FEEDS.BTC_USD,
  EUR: CHAINLINK_FEEDS.EUR_USD,
  XAU: CHAINLINK_FEEDS.XAU_USD,
  XAG: CHAINLINK_FEEDS.XAG_USD,
  USD: null,
};

export async function fetchChainlinkUsdHistory(
  publicClient: PublicClient,
  asset: PegAssetKey,
  minTimestamp?: number
): Promise<ChainlinkPricePoint[]> {
  const feedAddress = FEED_BY_ASSET[asset];
  if (!feedAddress) return [];

  const [latestRound, decimals] = await Promise.all([
    publicClient.readContract({
      address: feedAddress,
      abi: CHAINLINK_AGGREGATOR_ABI,
      functionName: "latestRoundData",
    }),
    publicClient.readContract({
      address: feedAddress,
      abi: CHAINLINK_AGGREGATOR_ABI,
      functionName: "decimals",
    }),
  ]);

  const points: ChainlinkPricePoint[] = [];
  let roundId = latestRound[0];
  const cutoffTs =
    minTimestamp ?? Math.floor(Date.now() / 1000) - DEFAULT_MAX_HISTORY_AGE_SEC;

  while (points.length < MAX_ROUNDS && roundId > 0n) {
    const batchSize = Math.min(
      MULTICALL_BATCH_SIZE,
      MAX_ROUNDS - points.length,
      Number(roundId)
    );
    if (batchSize <= 0) break;

    const roundIds: bigint[] = [];
    for (let i = 0; i < batchSize; i++) {
      const id = roundId - BigInt(i);
      if (id <= 0n) break;
      roundIds.push(id);
    }
    if (roundIds.length === 0) break;

    let results: Awaited<ReturnType<PublicClient["multicall"]>>;
    try {
      results = await publicClient.multicall({
        contracts: roundIds.map((id) => ({
          address: feedAddress,
          abi: CHAINLINK_AGGREGATOR_ABI,
          functionName: "getRoundData" as const,
          args: [id] as const,
        })),
        allowFailure: true,
      });
    } catch {
      break;
    }

    let hitCutoff = false;
    for (const result of results) {
      if (result.status !== "success") continue;

      const price = Number(formatUnits(result.result[1], decimals));
      const timestamp = Number(result.result[3]);

      if (timestamp > 0 && price > 0) {
        points.push({ timestamp, priceUsd: price });
        if (timestamp <= cutoffTs) {
          hitCutoff = true;
          break;
        }
      }
    }

    if (hitCutoff) break;
    roundId = roundId - BigInt(roundIds.length);
  }

  return points.sort((a, b) => a.timestamp - b.timestamp);
}

export function useChainlinkUsdHistory(
  asset: PegAssetKey | null,
  enabled = true,
  /** Earliest unix timestamp the series should cover (optional). */
  minTimestamp?: number
): { priceHistory: ChainlinkPricePoint[]; isLoading: boolean } {
  const publicClient = usePublicClient({ chainId: 1 });

  const shouldFetch =
    enabled && !!asset && asset !== "USD" && !!publicClient;

  const { data, isLoading } = useQuery({
    queryKey: ["chainlinkUsdHistory", asset, minTimestamp],
    queryFn: () =>
      fetchChainlinkUsdHistory(publicClient!, asset as PegAssetKey, minTimestamp),
    enabled: shouldFetch,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  if (!shouldFetch) {
    return { priceHistory: [], isLoading: false };
  }

  return {
    priceHistory: data ?? [],
    isLoading: isLoading && !data,
  };
}
