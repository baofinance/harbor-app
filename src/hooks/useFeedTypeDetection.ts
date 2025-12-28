import { useEffect, useState } from "react";
import type { PublicClient } from "viem";
import { singleFeedAbi, doubleFeedAbi, multifeedDivAbi, multifeedSumAbi, multifeedNormalizedAbi } from "@/abis/oracleFeeds";
import { customFeedNormalizationV2Abi } from "@/abis/harbor";

export type FeedType = 
  | "single" 
  | "double" 
  | "multifeedDiv" 
  | "multifeedSum" 
  | "multifeedNormalized" 
  | "customV2" 
  | "proxy";

export interface FeedTypeDetection {
  type: FeedType;
  isSingleFeed: boolean;
  isDoubleFeed: boolean;
  isMultifeedDiv: boolean;
  isMultifeedSum: boolean;
  isMultifeedNormalized: boolean;
  isV2Contract: boolean;
  loading: boolean;
}

/**
 * Hook to detect the type of feed contract
 */
export function useFeedTypeDetection(
  rpcClient: PublicClient | null,
  feedAddress: `0x${string}` | undefined
): FeedTypeDetection {
  const [detection, setDetection] = useState<FeedTypeDetection>({
    type: "proxy",
    isSingleFeed: false,
    isDoubleFeed: false,
    isMultifeedDiv: false,
    isMultifeedSum: false,
    isMultifeedNormalized: false,
    isV2Contract: false,
    loading: true,
  });

  useEffect(() => {
    if (!rpcClient || !feedAddress) {
      setDetection((prev) => ({ ...prev, loading: false }));
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        let isSingleFeed = false;
        let isDoubleFeed = false;
        let isMultifeedDiv = false;
        let isMultifeedSum = false;
        let isMultifeedNormalized = false;
        let isV2Contract = false;

        // Check if this is a SingleFeed contract
        try {
          const priceFeed = await rpcClient
            .readContract({
              address: feedAddress,
              abi: singleFeedAbi,
              functionName: "PRICE_FEED",
            })
            .catch(() => null);

          if (priceFeed && priceFeed !== "0x0000000000000000000000000000000000000000") {
            isSingleFeed = true;
            if (!cancelled) {
              setDetection({
                type: "single",
                isSingleFeed: true,
                isDoubleFeed: false,
                isMultifeedDiv: false,
                isMultifeedSum: false,
                isMultifeedNormalized: false,
                isV2Contract: false,
                loading: false,
              });
            }
            return;
          }
        } catch {}

        // Check if this is a DoubleFeed contract
        try {
          const firstFeed = await rpcClient
            .readContract({
              address: feedAddress,
              abi: doubleFeedAbi,
              functionName: "FIRST_FEED",
            })
            .catch(() => null);

          if (firstFeed && firstFeed !== "0x0000000000000000000000000000000000000000") {
            isDoubleFeed = true;
            if (!cancelled) {
              setDetection({
                type: "double",
                isSingleFeed: false,
                isDoubleFeed: true,
                isMultifeedDiv: false,
                isMultifeedSum: false,
                isMultifeedNormalized: false,
                isV2Contract: false,
                loading: false,
              });
            }
            return;
          }
        } catch {}

        // Check if this is a MultifeedSum contract (has INDEX_PRICE)
        try {
          const indexPrice = await rpcClient
            .readContract({
              address: feedAddress,
              abi: multifeedSumAbi,
              functionName: "INDEX_PRICE",
            })
            .catch(() => null);

          if (indexPrice !== null && typeof indexPrice === "bigint") {
            isMultifeedSum = true;
            if (!cancelled) {
              setDetection({
                type: "multifeedSum",
                isSingleFeed: false,
                isDoubleFeed: false,
                isMultifeedDiv: false,
                isMultifeedSum: true,
                isMultifeedNormalized: false,
                isV2Contract: false,
                loading: false,
              });
            }
            return;
          }
        } catch {}

        // Check if this is a MultifeedNormalized contract (has NORM_FACTOR_0)
        try {
          const normFactor = await rpcClient
            .readContract({
              address: feedAddress,
              abi: multifeedNormalizedAbi,
              functionName: "NORM_FACTOR_0" as any,
            })
            .catch(() => null);

          if (normFactor !== null && typeof normFactor === "bigint") {
            isMultifeedNormalized = true;
            if (!cancelled) {
              setDetection({
                type: "multifeedNormalized",
                isSingleFeed: false,
                isDoubleFeed: false,
                isMultifeedDiv: false,
                isMultifeedSum: false,
                isMultifeedNormalized: true,
                isV2Contract: false,
                loading: false,
              });
            }
            return;
          }
        } catch {}

        // Check if this is a MultifeedDiv contract
        try {
          const feedCount = await rpcClient
            .readContract({
              address: feedAddress,
              abi: multifeedDivAbi,
              functionName: "FEED_COUNT" as any,
            })
            .catch(() => null);

          if (feedCount !== null && typeof feedCount === "bigint" && Number(feedCount) > 0) {
            isMultifeedDiv = true;
            if (!cancelled) {
              setDetection({
                type: "multifeedDiv",
                isSingleFeed: false,
                isDoubleFeed: false,
                isMultifeedDiv: true,
                isMultifeedSum: false,
                isMultifeedNormalized: false,
                isV2Contract: false,
                loading: false,
              });
            }
            return;
          }
        } catch {}

        // Check if this is a v2 custom feed aggregator
        try {
          const countV2 = await rpcClient
            .readContract({
              address: feedAddress,
              abi: customFeedNormalizationV2Abi,
              functionName: "getCustomFeedCount",
            })
            .catch(() => null);
          if (countV2 !== null && typeof countV2 === "bigint" && Number(countV2) > 0) {
            isV2Contract = true;
            if (!cancelled) {
              setDetection({
                type: "customV2",
                isSingleFeed: false,
                isDoubleFeed: false,
                isMultifeedDiv: false,
                isMultifeedSum: false,
                isMultifeedNormalized: false,
                isV2Contract: true,
                loading: false,
              });
            }
            return;
          }
        } catch {}

        // Default to proxy
        if (!cancelled) {
          setDetection({
            type: "proxy",
            isSingleFeed: false,
            isDoubleFeed: false,
            isMultifeedDiv: false,
            isMultifeedSum: false,
            isMultifeedNormalized: false,
            isV2Contract: false,
            loading: false,
          });
        }
      } catch (err) {
        console.error("[useFeedTypeDetection] Error detecting feed type:", err);
        if (!cancelled) {
          setDetection((prev) => ({ ...prev, loading: false }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [rpcClient, feedAddress]);

  return detection;
}

