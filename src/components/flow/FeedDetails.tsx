"use client";

import { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { feeds } from "@/config/feeds";
import { proxyAbi } from "@/abis/proxy";
import { aggregatorAbi } from "@/abis/chainlink";
import { customFeedAggregatorAbi, customFeedNormalizationV2Abi } from "@/abis/harbor";
import { singleFeedAbi, doubleFeedAbi, multifeedDivAbi, multifeedSumAbi, multifeedNormalizedAbi } from "@/abis/oracleFeeds";
import {
  parsePair,
  format18,
  formatUnit,
  deriveFeedName,
  bytes32ToAddress,
} from "@/lib/utils";
import {
  formatHeartbeat,
  getExplorerUrl,
} from "@/utils/flowUtils";
import { ExternalLinkIcon } from "@/components/flow/Icons";
import { useRpcClient } from "@/hooks/useRpcClient";
import type { Network } from "@/config/networks";

// Helper function to fetch Chainlink feed data (description and price)
async function fetchChainlinkFeedData(
  rpcClient: any,
  aggregatorAddress: `0x${string}`,
  decimals: number | bigint | null
): Promise<{ description: string; price: string | undefined; rawPrice: bigint | undefined }> {
  let feedDescription = "-";
  let feedPrice: string | undefined;
  let rawPriceValue: bigint | undefined;

  try {
    const [desc, price] = await Promise.all([
      rpcClient.readContract({
        address: aggregatorAddress,
        abi: aggregatorAbi,
        functionName: "description",
      }).catch(() => null),
      rpcClient.readContract({
        address: aggregatorAddress,
        abi: aggregatorAbi,
        functionName: "latestAnswer",
      }).catch(() => null),
    ]);

    if (desc && typeof desc === "string") {
      feedDescription = desc.trim();
    }

    if (price !== null && decimals !== null) {
      rawPriceValue = price as bigint;
      feedPrice = formatUnit(rawPriceValue, Number(decimals));
    }
  } catch (err) {
    console.error(`[FeedDetails] Error fetching Chainlink feed data:`, err);
  }

  return { description: feedDescription, price: feedPrice, rawPrice: rawPriceValue };
}

// Helper function to process BASE_USD_FEED for multifeed types
async function processBaseUsdFeed(
  rpcClient: any,
  feedAddress: `0x${string}`,
  abi: any,
  contractDivisor: bigint | null | undefined
): Promise<{
  id: number;
  name: string;
  feed: `0x${string}`;
  constraintA: bigint | undefined;
  constraintB: undefined;
  price: string | undefined;
  rawPrice: string | undefined;
  divisor: bigint | undefined;
  normFactor?: undefined;
  normalizedPrice?: undefined;
} | null> {
  const [baseUsdFeed, baseUsdFeedHeartbeat, baseUsdFeedDecimals] = await Promise.all([
    rpcClient.readContract({
      address: feedAddress,
      abi,
      functionName: "BASE_USD_FEED",
    }).catch(() => null),
    rpcClient.readContract({
      address: feedAddress,
      abi,
      functionName: "BASE_USD_FEED_HEARTBEAT",
    }).catch(() => null),
    rpcClient.readContract({
      address: feedAddress,
      abi,
      functionName: "BASE_USD_FEED_DECIMALS",
    }).catch(() => null),
  ]);

  if (!baseUsdFeed || baseUsdFeed === "0x0000000000000000000000000000000000000000") {
    return null;
  }

  // Ensure proper type casting
  const divisor = contractDivisor && typeof contractDivisor === "bigint" ? contractDivisor : undefined;
  const decimals = baseUsdFeedDecimals && (typeof baseUsdFeedDecimals === "bigint" || typeof baseUsdFeedDecimals === "number") 
    ? baseUsdFeedDecimals 
    : null;

  const { description, price, rawPrice } = await fetchChainlinkFeedData(
    rpcClient,
    baseUsdFeed as `0x${string}`,
    decimals
  );

  return {
    id: 0,
    name: description || "Base USD Feed",
    feed: baseUsdFeed as `0x${string}`,
    constraintA: baseUsdFeedHeartbeat && typeof baseUsdFeedHeartbeat === "bigint" ? baseUsdFeedHeartbeat : undefined,
    constraintB: undefined,
    price,
    rawPrice: rawPrice !== undefined && decimals !== null ? formatUnit(rawPrice, Number(decimals)) : undefined,
    divisor,
  };
}

// Configuration options for unified multifeed processing
interface MultifeedConfig {
  hasNormFactor: boolean;
  maxFeedIndex: number;
  includeDivisor: boolean;
  includeBaseFeed: boolean;
}

// Unified helper function to process MultifeedDiv/Normalized/Sum feeds
async function processMultifeedFeeds(
  rpcClient: any,
  feedAddress: `0x${string}`,
  abi: any,
  config: MultifeedConfig,
  contractDivisor: bigint | null | undefined,
  feedCount: bigint | null | undefined
): Promise<Array<{
  id: number;
  name: string;
  feed?: `0x${string}`;
  constraintA?: bigint;
  constraintB?: bigint;
  price?: string;
  rawPrice?: string;
  divisor?: bigint;
  normFactor?: bigint;
  normalizedPrice?: string;
}>> {
  const rows: Array<{
    id: number;
    name: string;
    feed?: `0x${string}`;
    constraintA?: bigint;
    constraintB?: bigint;
    price?: string;
    rawPrice?: string;
    divisor?: bigint;
    normFactor?: bigint;
    normalizedPrice?: string;
  }> = [];

  // Process BASE_USD_FEED if configured
  if (config.includeBaseFeed) {
    try {
      const baseFeedRow = await processBaseUsdFeed(
        rpcClient,
        feedAddress,
        abi,
        config.includeDivisor ? contractDivisor : null
      );
      if (baseFeedRow) {
        if (config.hasNormFactor) {
          // For normalized feeds, base feed doesn't have norm factor
          rows.push({
            ...baseFeedRow,
            normFactor: undefined,
            normalizedPrice: undefined,
          });
        } else {
          rows.push(baseFeedRow);
        }
      }
    } catch (err) {
      console.error(`[FeedDetails] Error processing BASE_USD_FEED:`, err);
      // Continue processing other feeds even if base feed fails
    }
  }

  // Determine number of feeds to process
  const numFeeds = feedCount && typeof feedCount === "bigint" && Number(feedCount) > 0
    ? Number(feedCount)
    : config.maxFeedIndex + 1;
  const maxFeedIndex = Math.min(numFeeds - 1, config.maxFeedIndex);

  // Build function name map
  const feedFunctionMap: Record<number, { feed: string; decimals: string; heartbeat: string; normFactor?: string }> = {};
  for (let i = 0; i <= maxFeedIndex; i++) {
    feedFunctionMap[i] = {
      feed: `FEED_${i}`,
      decimals: `FEED_${i}_DECIMALS`,
      heartbeat: `FEED_${i}_HEARTBEAT`,
      ...(config.hasNormFactor && { normFactor: `NORM_FACTOR_${i}` }),
    };
  }

  // Process each feed
  for (let i = 0; i <= maxFeedIndex; i++) {
    try {
      const funcNames = feedFunctionMap[i];
      if (!funcNames) continue;

      // Build contract read promises
      const readPromises: Promise<any>[] = [
        rpcClient.readContract({
          address: feedAddress,
          abi,
          functionName: funcNames.feed as any,
        }).catch(() => null),
        rpcClient.readContract({
          address: feedAddress,
          abi,
          functionName: funcNames.decimals as any,
        }).catch(() => null),
        rpcClient.readContract({
          address: feedAddress,
          abi,
          functionName: funcNames.heartbeat as any,
        }).catch(() => null),
      ];

      if (config.hasNormFactor && funcNames.normFactor) {
        readPromises.push(
          rpcClient.readContract({
            address: feedAddress,
            abi,
            functionName: funcNames.normFactor as any,
          }).catch(() => null)
        );
      }

      const results = await Promise.all(readPromises);
      const feedAddr = results[0];
      const feedDecimals = results[1];
      const feedHeartbeat = results[2];
      const normFactor = config.hasNormFactor ? results[3] : undefined;

      if (!feedAddr || feedAddr === "0x0000000000000000000000000000000000000000") {
        continue;
      }

      // Ensure proper type casting for decimals
      const decimals = feedDecimals && (typeof feedDecimals === "bigint" || typeof feedDecimals === "number")
        ? feedDecimals
        : null;

      const { description, price, rawPrice } = await fetchChainlinkFeedData(
        rpcClient,
        feedAddr as `0x${string}`,
        decimals
      );

      // Calculate normalized price if needed
      let normalizedPriceValue: string | undefined;
      if (config.hasNormFactor && normFactor && typeof normFactor === "bigint" && normFactor > 0n && rawPrice && decimals !== null) {
        const normalizedBigInt = (rawPrice * normFactor) / BigInt(10 ** 18);
        normalizedPriceValue = formatUnit(normalizedBigInt, Number(decimals));
      }

      // Ensure proper type casting for divisor
      const divisor = config.includeDivisor && contractDivisor && typeof contractDivisor === "bigint"
        ? contractDivisor
        : undefined;

      rows.push({
        id: i + 1, // Start from 1 since BASE_USD_FEED is 0
        name: description || `Feed ${i}`,
        feed: feedAddr as `0x${string}`,
        constraintA: feedHeartbeat && typeof feedHeartbeat === "bigint" ? feedHeartbeat : undefined,
        constraintB: undefined,
        price,
        rawPrice: rawPrice !== undefined && decimals !== null ? formatUnit(rawPrice, Number(decimals)) : undefined,
        divisor,
        normFactor: normFactor && typeof normFactor === "bigint" ? normFactor : undefined,
        normalizedPrice: normalizedPriceValue,
      });
    } catch (err) {
      console.error(`[FeedDetails] Error processing feed ${i}:`, err);
    }
  }

  return rows;
}

interface FeedDetailsProps {
  network: Network;
  token: string;
  feedIndex: number;
  publicClient: any;
  onClose?: () => void;
  compact?: boolean;
  compactOuterClassName?: string;
  embedded?: boolean;
}

export function FeedDetails({
  network,
  token,
  feedIndex,
  publicClient,
  onClose,
  compact = false,
  compactOuterClassName,
  embedded = false,
}: FeedDetailsProps) {
  const networkFeeds = feeds[network as keyof typeof feeds];
  const feedEntries =
    (networkFeeds?.[token as keyof typeof networkFeeds] as any) || [];
  const feed = feedEntries[feedIndex];
  const rpcClient = useRpcClient(network);

  const [price, setPrice] = useState<bigint | undefined>(undefined);
  const [latestAnswer, setLatestAnswer] = useState<
    [bigint, bigint, bigint, bigint] | undefined
  >(undefined);
  const [priceDivisor, setPriceDivisor] = useState<bigint | undefined>(undefined);
  const [aggregatedPrice, setAggregatedPrice] = useState<bigint | undefined>(undefined);
  const [indexPrice, setIndexPrice] = useState<bigint | undefined>(undefined);
  const [feedCount, setFeedCount] = useState<number | undefined>(undefined);
  const [isMultifeedDivType, setIsMultifeedDivType] = useState(false);
  const [isMultifeedNormalizedType, setIsMultifeedNormalizedType] = useState(false);
  const [isMultifeedSumType, setIsMultifeedSumType] = useState(false);
  const [feedTable, setFeedTable] = useState<
    Array<{
      id: number;
      name: string;
      feed?: `0x${string}`;
      constraintA?: bigint;
      constraintB?: bigint;
      price?: string;
      rawPrice?: string;
      divisor?: bigint;
      normFactor?: bigint;
      normalizedPrice?: string;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  const ZERO_BYTES32 =
    "0x0000000000000000000000000000000000000000000000000000000000000000" as const;
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

  useEffect(() => {
    if (!feed || !rpcClient) {
      console.log("FeedDetails: Missing feed or rpcClient", {
        feed,
        rpcClient,
      });
      return;
    }

    let cancelled = false;
    setLoading(true);
    setIsMultifeedDivType(false);
    setIsMultifeedNormalizedType(false);
    setIsMultifeedSumType(false);
    setAggregatedPrice(undefined);
    setFeedCount(undefined);

    (async () => {
      try {
        console.log(
          `FeedDetails: Fetching data for ${feed.label} at ${feed.address} on ${network}`
        );

        // Check contract type first to use correct ABI
        let contractAbi = proxyAbi;
        let isV2Contract = false;
        let isSingleFeed = false;
        let isDoubleFeed = false;
        let isMultifeedDiv = false;
        let isMultifeedSum = false;
        let isMultifeedNormalized = false;

        // Check if this is a SingleFeed contract
        try {
          const priceFeed = await rpcClient
            .readContract({
              address: feed.address,
              abi: singleFeedAbi,
              functionName: "PRICE_FEED",
            })
            .catch(() => null);

          if (priceFeed && priceFeed !== "0x0000000000000000000000000000000000000000") {
            isSingleFeed = true;
            console.log(`[FeedDetails] Detected SingleFeed contract for ${feed.label}`);
          }
        } catch {}

        // Check if this is a DoubleFeed contract
        if (!isSingleFeed) {
          try {
            const firstFeed = await rpcClient
              .readContract({
                address: feed.address,
                abi: doubleFeedAbi,
                functionName: "FIRST_FEED",
              })
              .catch(() => null);

            if (firstFeed && firstFeed !== "0x0000000000000000000000000000000000000000") {
              isDoubleFeed = true;
              console.log(`[FeedDetails] Detected DoubleFeed contract for ${feed.label}`);
            }
          } catch {}
        }

        // Check if this is a MultifeedSum contract (has INDEX_PRICE)
        if (!isSingleFeed && !isDoubleFeed) {
          try {
            const indexPrice = await rpcClient
              .readContract({
                address: feed.address,
                abi: multifeedSumAbi,
                functionName: "INDEX_PRICE",
              })
              .catch(() => null);

            if (indexPrice !== null && typeof indexPrice === "bigint") {
              isMultifeedSum = true;
              setIsMultifeedSumType(true);
              setIndexPrice(indexPrice);
              console.log(`[FeedDetails] Detected MultifeedSum contract for ${feed.label}`);
            }
          } catch {}
        }

        // Check if this is a MultifeedNormalized contract (has NORM_FACTOR_0)
        if (!isSingleFeed && !isDoubleFeed && !isMultifeedSum) {
          try {
            const normFactor = await rpcClient
              .readContract({
                address: feed.address,
                abi: multifeedNormalizedAbi,
                functionName: "NORM_FACTOR_0" as any,
              })
              .catch(() => null);

            if (normFactor !== null && typeof normFactor === "bigint") {
              isMultifeedNormalized = true;
              setIsMultifeedNormalizedType(true);
              console.log(`[FeedDetails] Detected MultifeedNormalized contract for ${feed.label}`);
            }
          } catch {}
        }

        // Check if this is a MultifeedDiv contract
        if (!isSingleFeed && !isDoubleFeed && !isMultifeedSum && !isMultifeedNormalized) {
          try {
            const feedCount = await rpcClient
              .readContract({
                address: feed.address,
                abi: multifeedDivAbi,
                functionName: "FEED_COUNT" as any,
              })
              .catch(() => null);

            if (feedCount !== null && typeof feedCount === "bigint" && Number(feedCount) > 0) {
              isMultifeedDiv = true;
              setIsMultifeedDivType(true);
              console.log(`[FeedDetails] Detected MultifeedDiv contract for ${feed.label} with ${feedCount} feeds`);
            }
          } catch {}
        }

        // Check if this is a v2 custom feed aggregator
        if (!isSingleFeed && !isDoubleFeed && !isMultifeedDiv && !isMultifeedSum && !isMultifeedNormalized) {
          try {
            const countV2 = await rpcClient
              .readContract({
                address: feed.address,
                abi: customFeedNormalizationV2Abi,
                functionName: "getCustomFeedCount",
              })
              .catch(() => null);
            if (countV2 !== null && typeof countV2 === "bigint" && Number(countV2) > 0) {
              // v2 contract detected, but still use proxyAbi for getPrice/latestAnswer
              // as v2 contracts implement the proxy interface
              isV2Contract = true;
            }
          } catch {}
        }

        // Fetch price, latestAnswer, and priceDivisor
        // For SingleFeed, DoubleFeed, MultifeedDiv, MultifeedSum, or MultifeedNormalized, use their specific ABIs; otherwise use proxyAbi
        const abiToUse = isSingleFeed ? singleFeedAbi : (isDoubleFeed ? doubleFeedAbi : (isMultifeedDiv ? multifeedDivAbi : (isMultifeedSum ? multifeedSumAbi : (isMultifeedNormalized ? multifeedNormalizedAbi : proxyAbi))));

        const [priceResult, latestResult, divisorResult] = await Promise.all([
          // Try getPrice first (only for non-SingleFeed/DoubleFeed contracts), fallback to latestAnswer[0] if not available
          // SingleFeed and DoubleFeed contracts don't have getPrice, they use latestAnswer directly
          (!isSingleFeed && !isDoubleFeed) ? rpcClient
            .readContract({
              address: feed.address,
              abi: abiToUse,
              functionName: "getPrice",
            })
            .catch(() => null) : Promise.resolve(null),
          rpcClient
            .readContract({
              address: feed.address,
              abi: abiToUse,
              functionName: "latestAnswer",
            })
            .catch((err: any) => {
              console.error(
                `Error fetching latestAnswer for ${feed.label}:`,
                err
              );
              return null;
            }),
          rpcClient
            .readContract({
              address: feed.address,
              abi: abiToUse,
              functionName: (isSingleFeed || isDoubleFeed || isMultifeedDiv || isMultifeedSum || isMultifeedNormalized) ? "PRICE_DIVISOR" : "priceDivisor",
            })
            .catch((err: any) => {
              // priceDivisor might not exist on all contracts, so we silently fail
              console.log(`priceDivisor not available for ${feed.label}:`, err);
              return null;
            }),
        ]);

        // For SingleFeed, if getPrice doesn't exist, use latestAnswer[0] as price
        let finalPrice = priceResult as bigint | undefined;
        if ((!finalPrice || finalPrice === 0n) && latestResult && Array.isArray(latestResult) && latestResult.length >= 1) {
          finalPrice = latestResult[0] as bigint;
        }

        if (cancelled) return;

        setPrice(finalPrice);
        setLatestAnswer(
          latestResult as [bigint, bigint, bigint, bigint] | undefined
        );
        setPriceDivisor(divisorResult as bigint | undefined);

        // Handle SingleFeed contracts differently
        if (isSingleFeed) {
          const rows: Array<{
            id: number;
            name: string;
            feed?: `0x${string}`;
            constraintA?: bigint;
            constraintB?: bigint;
            price?: string;
          }> = [];

          try {
            // Read SingleFeed-specific data
            const [priceFeedAddr, heartbeat, priceFeedDecimals, description] = await Promise.all([
              rpcClient.readContract({
                address: feed.address,
                abi: singleFeedAbi,
                functionName: "PRICE_FEED",
              }).catch(() => null),
              rpcClient.readContract({
                address: feed.address,
                abi: singleFeedAbi,
                functionName: "PRICE_FEED_HEARTBEAT",
              }).catch(() => null),
              rpcClient.readContract({
                address: feed.address,
                abi: singleFeedAbi,
                functionName: "PRICE_FEED_DECIMALS",
              }).catch(() => null),
              null, // description will be fetched from the price feed
            ]);

            if (priceFeedAddr && priceFeedAddr !== "0x0000000000000000000000000000000000000000") {
              const { description, price } = await fetchChainlinkFeedData(
                rpcClient,
                priceFeedAddr as `0x${string}`,
                priceFeedDecimals
              );

              rows.push({
                id: 1,
                name: description,
                feed: priceFeedAddr as `0x${string}`,
                constraintA: heartbeat as bigint | undefined, // heartbeat in seconds
                constraintB: undefined, // no deviation threshold
                price,
              });
            }

            if (!cancelled) {
              setFeedTable(rows);
              setLoading(false);
            }
            return;
          } catch (err) {
            console.error(`[FeedDetails] Error fetching SingleFeed data:`, err);
            if (!cancelled) setLoading(false);
            return;
          }
        }

        // Handle DoubleFeed contracts differently
        if (isDoubleFeed) {
          const rows: Array<{
            id: number;
            name: string;
            feed?: `0x${string}`;
            constraintA?: bigint;
            constraintB?: bigint;
            price?: string;
          }> = [];

          try {
            // Read DoubleFeed-specific data
            const [firstFeedAddr, firstFeedHeartbeat, firstFeedDecimals, secondFeedAddr, secondFeedHeartbeat, secondFeedDecimals] = await Promise.all([
              rpcClient.readContract({
                address: feed.address,
                abi: doubleFeedAbi,
                functionName: "FIRST_FEED",
              }).catch(() => null),
              rpcClient.readContract({
                address: feed.address,
                abi: doubleFeedAbi,
                functionName: "FIRST_FEED_HEARTBEAT",
              }).catch(() => null),
              rpcClient.readContract({
                address: feed.address,
                abi: doubleFeedAbi,
                functionName: "FIRST_FEED_DECIMALS",
              }).catch(() => null),
              rpcClient.readContract({
                address: feed.address,
                abi: doubleFeedAbi,
                functionName: "SECOND_FEED",
              }).catch(() => null),
              rpcClient.readContract({
                address: feed.address,
                abi: doubleFeedAbi,
                functionName: "SECOND_FEED_HEARTBEAT",
              }).catch(() => null),
              rpcClient.readContract({
                address: feed.address,
                abi: doubleFeedAbi,
                functionName: "SECOND_FEED_DECIMALS",
              }).catch(() => null),
            ]);

            // Process first feed
            if (firstFeedAddr && firstFeedAddr !== "0x0000000000000000000000000000000000000000") {
              const { description, price } = await fetchChainlinkFeedData(
                rpcClient,
                firstFeedAddr as `0x${string}`,
                firstFeedDecimals
              );

              rows.push({
                id: 1,
                name: description || "First Feed",
                feed: firstFeedAddr as `0x${string}`,
                constraintA: firstFeedHeartbeat as bigint | undefined, // heartbeat in seconds
                constraintB: undefined, // no deviation threshold
                price,
              });
            }

            // Process second feed
            if (secondFeedAddr && secondFeedAddr !== "0x0000000000000000000000000000000000000000") {
              const { description, price } = await fetchChainlinkFeedData(
                rpcClient,
                secondFeedAddr as `0x${string}`,
                secondFeedDecimals
              );

              rows.push({
                id: 2,
                name: description || "Second Feed",
                feed: secondFeedAddr as `0x${string}`,
                constraintA: secondFeedHeartbeat as bigint | undefined, // heartbeat in seconds
                constraintB: undefined, // no deviation threshold
                price,
              });
            }

            if (!cancelled) {
              setFeedTable(rows);
              setLoading(false);
            }
            return;
          } catch (err) {
            console.error(`[FeedDetails] Error fetching DoubleFeed data:`, err);
            if (!cancelled) setLoading(false);
            return;
          }
        }

        // Handle MultifeedDiv contracts differently
        if (isMultifeedDiv) {
          try {
            // Read aggregated price (from latestAnswer[0] which is the aggregated result)
            if (latestResult && Array.isArray(latestResult) && latestResult.length >= 1) {
              setAggregatedPrice(latestResult[0] as bigint);
            }

            // Read PRICE_DIVISOR and FEED_COUNT
            const [contractDivisorRaw, feedCountRaw] = await Promise.all([
              rpcClient.readContract({
                address: feed.address,
                abi: multifeedDivAbi,
                functionName: "PRICE_DIVISOR" as any,
              }).catch(() => null),
              rpcClient.readContract({
                address: feed.address,
                abi: multifeedDivAbi,
                functionName: "FEED_COUNT" as any,
              }).catch(() => null),
            ]);

            // Ensure proper type casting
            const contractDivisor = contractDivisorRaw && typeof contractDivisorRaw === "bigint" ? contractDivisorRaw : null;
            const feedCount = feedCountRaw && typeof feedCountRaw === "bigint" ? feedCountRaw : null;

            const numFeeds = feedCount && Number(feedCount) > 0
              ? Number(feedCount)
              : 1;
            setFeedCount(numFeeds);
            console.log(`[FeedDetails] MultifeedDiv has ${numFeeds} feeds`);

            // Process feeds using unified helper
            const rows = await processMultifeedFeeds(
              rpcClient,
              feed.address,
              multifeedDivAbi,
              {
                hasNormFactor: false,
                maxFeedIndex: 6,
                includeDivisor: true,
                includeBaseFeed: true,
              },
              contractDivisor,
              feedCount
            );

            if (!cancelled) {
              setFeedTable(rows);
              setLoading(false);
            }
            return;
          } catch (err) {
            console.error(`[FeedDetails] Error fetching MultifeedDiv data:`, err);
            if (!cancelled) setLoading(false);
            return;
          }
        }

        // Handle MultifeedNormalized contracts differently (similar to MultifeedDiv but with NORM_FACTOR)
        if (isMultifeedNormalized) {
          try {
            // Read aggregated price (from latestAnswer[0] which is the aggregated result)
            if (latestResult && Array.isArray(latestResult) && latestResult.length >= 1) {
              setAggregatedPrice(latestResult[0] as bigint);
            }

            // Read PRICE_DIVISOR and FEED_COUNT
            const [contractDivisorRaw, feedCountRaw] = await Promise.all([
              rpcClient.readContract({
                address: feed.address,
                abi: multifeedNormalizedAbi,
                functionName: "PRICE_DIVISOR" as any,
              }).catch(() => null),
              rpcClient.readContract({
                address: feed.address,
                abi: multifeedNormalizedAbi,
                functionName: "FEED_COUNT" as any,
              }).catch(() => null),
            ]);

            // Ensure proper type casting
            const contractDivisor = contractDivisorRaw && typeof contractDivisorRaw === "bigint" ? contractDivisorRaw : null;
            const feedCount = feedCountRaw && typeof feedCountRaw === "bigint" ? feedCountRaw : null;

            const numFeeds = feedCount && Number(feedCount) > 0
              ? Number(feedCount)
              : 1;
            setFeedCount(numFeeds);
            console.log(`[FeedDetails] MultifeedNormalized has ${numFeeds} feeds`);

            // Process feeds using unified helper
            const rows = await processMultifeedFeeds(
              rpcClient,
              feed.address,
              multifeedNormalizedAbi,
              {
                hasNormFactor: true,
                maxFeedIndex: 4,
                includeDivisor: true,
                includeBaseFeed: true,
              },
              contractDivisor,
              feedCount
            );

            if (!cancelled) {
              setFeedTable(rows);
              setLoading(false);
            }
            return;
          } catch (err) {
            console.error(`[FeedDetails] Error fetching MultifeedNormalized data:`, err);
            if (!cancelled) setLoading(false);
            return;
          }
        }

        // Handle MultifeedSum contracts differently (similar to MultifeedDiv but with INDEX_PRICE)
        if (isMultifeedSum) {
          try {
            // Read aggregated price (from latestAnswer[0] which is the aggregated result)
            if (latestResult && Array.isArray(latestResult) && latestResult.length >= 1) {
              setAggregatedPrice(latestResult[0] as bigint);
            }

            // Set feedCount to 1 for MultifeedSum (simplified)
            setFeedCount(1);

            // Read INDEX_PRICE (unique to MultifeedSum) and PRICE_DIVISOR
            const [indexPriceValue, sumDivisor] = await Promise.all([
              rpcClient.readContract({
                address: feed.address,
                abi: multifeedSumAbi,
                functionName: "INDEX_PRICE",
              }).catch(() => null),
              rpcClient.readContract({
                address: feed.address,
                abi: multifeedSumAbi,
                functionName: "PRICE_DIVISOR" as any,
              }).catch(() => null),
            ]);

            if (indexPriceValue !== null && typeof indexPriceValue === "bigint") {
              setIndexPrice(indexPriceValue);
            }

            if (sumDivisor !== null && typeof sumDivisor === "bigint") {
              setPriceDivisor(sumDivisor);
            }

            // Process feeds using unified helper (MultifeedSum doesn't use divisor in rows)
            const rows = await processMultifeedFeeds(
              rpcClient,
              feed.address,
              multifeedSumAbi,
              {
                hasNormFactor: false,
                maxFeedIndex: 6,
                includeDivisor: false,
                includeBaseFeed: true,
              },
              null,
              null // Don't use FEED_COUNT for MultifeedSum
            );

            // Remove divisor from all rows for MultifeedSum
            const rowsWithoutDivisor = rows.map(({ divisor, ...row }) => row);

            if (!cancelled) {
              setFeedTable(rowsWithoutDivisor);
              setLoading(false);
            }
            return;
          } catch (err) {
            console.error(`[FeedDetails] Error fetching MultifeedSum data:`, err);
            if (!cancelled) setLoading(false);
            return;
          }
        }

        // Check if this is a HarborCustomFeedAndRateAggregator_v1 or v2 contract
        let isCustomFeedAggregator = false;
        let customFeedCount = 0;
        let feedIdsToCheck: number[] = [];

        if (isV2Contract) {
          // Already detected v2 contract
          isCustomFeedAggregator = true;
          customFeedCount = Number(
            await rpcClient
              .readContract({
                address: feed.address,
                abi: customFeedNormalizationV2Abi,
                functionName: "getCustomFeedCount",
              })
              .catch(() => 0n)
          );
          if (customFeedCount > 0) {
            // For v2, getCustomFeedCount tells us how many feeds exist (e.g., 5)
            // We check customFeeds[0] through customFeeds[count-1] (e.g., 0, 1, 2, 3, 4)
            feedIdsToCheck = [...Array(customFeedCount).keys()]; // [0, 1, 2, 3, 4] for count=5
          }
        } else {
          // Try v1 (HarborCustomFeedAndRateAggregator_v1)
          try {
            const countV1 = await rpcClient
              .readContract({
                address: feed.address,
                abi: customFeedAggregatorAbi,
                functionName: "getCustomFeedCount",
              })
              .catch(() => null);

            if (
              countV1 !== null &&
              typeof countV1 === "bigint" &&
              Number(countV1) > 0
            ) {
              isCustomFeedAggregator = true;
              customFeedCount = Number(countV1);
              // Custom feeds are at IDs 1, 2, 3, ..., customFeedCount
              feedIdsToCheck = [...Array(customFeedCount).keys()].map(
                (i) => i + 1
              );
            }
          } catch {}
        }

        // If not a custom feed aggregator, use the default IDs (1, 2)
        if (!isCustomFeedAggregator) {
          feedIdsToCheck = [1, 2];
        }

        // Fetch feed identifiers and constraints
        const rows: Array<{
          id: number;
          name: string;
          feed?: `0x${string}`;
          constraintA?: bigint;
          constraintB?: bigint;
          price?: string;
        }> = [];

        console.log(`[FeedDetails] Processing ${feedIdsToCheck.length} feed IDs:`, feedIdsToCheck);

        for (const id of feedIdsToCheck) {
          let aggAddr: `0x${string}` | undefined;
          let cons: [bigint, bigint] | null = null;
          let name = "-";
          let price: string | undefined;

          try {
            console.log(`[FeedDetails] Processing feed ID ${id} (isV2Contract: ${isV2Contract}, isCustomFeedAggregator: ${isCustomFeedAggregator})`);

            if (isCustomFeedAggregator) {
              // For custom feed aggregator, feedIdentifiers returns address directly
              // But constraints should be fetched from the aggregator contract using getConstraints, same as regular feeds
              if (isV2Contract) {
                // v2 contract: use customFeeds array (0-based index)
                // id comes from feedIdsToCheck which is [0, 1, 2, ..., customFeedCount-1]
                // e.g., if getCustomFeedCount returns 5, we check indices 0, 1, 2, 3, 4
                const feedIndex = BigInt(id);

                const feedAddr = await rpcClient
                  .readContract({
                    address: feed.address,
                    abi: customFeedNormalizationV2Abi,
                    functionName: "customFeeds",
                    args: [feedIndex],
                  })
                  .catch((err: unknown) => {
                    console.warn(`Failed to fetch customFeeds[${feedIndex}] for v2 contract:`, err);
                    return null;
                  });

                if (!feedAddr || feedAddr === ZERO_ADDRESS) {
                  console.warn(`Invalid feed address at index ${feedIndex} for v2 contract`);
                  continue;
                }

                aggAddr = feedAddr as `0x${string}`;

                // For v2, feedConstraints takes the feed address, not an identifier
                const constraints = await rpcClient
                  .readContract({
                    address: feed.address,
                    abi: customFeedNormalizationV2Abi,
                    functionName: "feedConstraints",
                    args: [aggAddr],
                  })
                  .catch((err: unknown) => {
                    console.warn(`Failed to fetch feedConstraints for v2 feed address ${aggAddr}:`, err);
                    return null;
                  });

                // v2 returns 4 values: [maxAnswerAge, maxPercentageDeviation, maxAbsoluteDeviation, maxTrendReversalDeviation]
                if (constraints) {
                  const constraintsV2 = constraints as [bigint, bigint, bigint, bigint];
                  // Use first two for compatibility: maxAnswerAge and maxPercentageDeviation
                  cons = [constraintsV2[0], constraintsV2[1]] as [bigint, bigint];
                  console.log(`[FeedDetails] v2 constraints for feed ${feedIndex} (address ${aggAddr}):`, cons);
                } else {
                  console.warn(`[FeedDetails] No constraints found for v2 feed ${feedIndex} at ${aggAddr}`);
                }

                console.log(`[FeedDetails] v2 feed ${feedIndex} -> address: ${aggAddr}`);
              } else {
                // v1 contract: getConstraints returns 2 values
                const [constraints, feedAddr] = await Promise.all([
                  rpcClient
                    .readContract({
                      address: feed.address,
                      abi: proxyAbi,
                      functionName: "getConstraints",
                      args: [id as number],
                    })
                    .catch(() => null),
                  rpcClient
                    .readContract({
                      address: feed.address,
                      abi: customFeedAggregatorAbi,
                      functionName: "feedIdentifiers",
                      args: [id as number],
                    })
                    .catch(() => null),
                ]);

                if (!feedAddr) continue;
                aggAddr = feedAddr as `0x${string}`;
                if (aggAddr === ZERO_ADDRESS) continue;

                if (constraints) {
                  cons = constraints as [bigint, bigint];
                  console.log(`[FeedDetails] v1 constraints for feed ${id} (from getConstraints):`, cons);
                }
              }
            } else {
              // For regular proxy feeds, feedIdentifiers returns bytes32
              const [constraints, feedIdentifier] = await Promise.all([
                rpcClient
                  .readContract({
                    address: feed.address,
                    abi: proxyAbi,
                    functionName: "getConstraints",
                    args: [id],
                  })
                  .catch((err: unknown) => {
                    console.warn(`[FeedDetails] Failed to fetch getConstraints(${id}) from proxy:`, err);
                    return null;
                  }),
                rpcClient
                  .readContract({
                    address: feed.address,
                    abi: proxyAbi,
                    functionName: "feedIdentifiers",
                    args: [id],
                  })
                  .catch(() => null),
              ]);

              if (!feedIdentifier) continue;
              const f = feedIdentifier as `0x${string}`;
              aggAddr = bytes32ToAddress(f);
              if (!f || f === ZERO_BYTES32 || f === ZERO_ADDRESS || !aggAddr)
                continue;

              if (constraints) {
                cons = constraints as [bigint, bigint];
                console.log(`[FeedDetails] proxy constraints for feed ${id}:`, cons);
              } else {
                // Try to fetch constraints from aggregator if proxy doesn't have them
                // Some Chainlink aggregators store heartbeat/deviation on the aggregator itself
                console.log(`[FeedDetails] No constraints from proxy, will try aggregator for feed ${id}`);
              }
            }

            try {
              if (aggAddr) {
                // If we don't have constraints yet, try to fetch from aggregator
                let aggregatorConstraints: [bigint, bigint] | null = null;
                if (!cons && !isCustomFeedAggregator) {
                  // Try common Chainlink aggregator methods for heartbeat/deviation
                  try {
                    const [heartbeat, deviation] = await Promise.all([
                      rpcClient
                        .readContract({
                          address: aggAddr,
                          abi: [
                            {
                              inputs: [],
                              name: "heartbeat",
                              outputs: [{ type: "uint256" }],
                              stateMutability: "view",
                              type: "function",
                            },
                            {
                              inputs: [],
                              name: "deviationThreshold",
                              outputs: [{ type: "uint256" }],
                              stateMutability: "view",
                              type: "function",
                            },
                          ] as const,
                          functionName: "heartbeat",
                        })
                        .catch(() => null),
                      rpcClient
                        .readContract({
                          address: aggAddr,
                          abi: [
                            {
                              inputs: [],
                              name: "heartbeat",
                              outputs: [{ type: "uint256" }],
                              stateMutability: "view",
                              type: "function",
                            },
                            {
                              inputs: [],
                              name: "deviationThreshold",
                              outputs: [{ type: "uint256" }],
                              stateMutability: "view",
                              type: "function",
                            },
                          ] as const,
                          functionName: "deviationThreshold",
                        })
                        .catch(() => null),
                    ]);

                    if (heartbeat && deviation) {
                      aggregatorConstraints = [heartbeat as bigint, deviation as bigint];
                      console.log(`[FeedDetails] Got constraints from aggregator:`, aggregatorConstraints);
                    }
                  } catch (err) {
                    // Aggregator doesn't have these methods, that's okay
                  }
                }

                // Fetch decimals separately (needed for custom feeds)
                const dec = await rpcClient
                  .readContract({
                    address: aggAddr,
                    abi: aggregatorAbi,
                    functionName: "decimals",
                  })
                  .catch(() => null);

                // Fetch description and price using helper
                const { description: feedDesc, price: feedPrice } = await fetchChainlinkFeedData(
                  rpcClient,
                  aggAddr,
                  dec
                );

                if (feedDesc && feedDesc.trim().length > 0) {
                  name = feedDesc.trim();
                } else if (!isCustomFeedAggregator) {
                  // Try to derive name from bytes32 if it's a regular proxy feed
                  const feedIdentifier = await rpcClient
                    .readContract({
                      address: feed.address,
                      abi: proxyAbi,
                      functionName: "feedIdentifiers",
                      args: [id],
                    })
                    .catch(() => null);
                  if (feedIdentifier) {
                    const derived = deriveFeedName(
                      feedIdentifier as `0x${string}`
                    );
                    if (derived && derived !== "-") {
                      name = derived;
                    }
                  }
                }

                price = feedPrice;

                // Use aggregator constraints if we got them and don't have proxy constraints
                if (!cons && aggregatorConstraints) {
                  cons = aggregatorConstraints;
                }
              }
            } catch (err) {
              console.error(`[FeedDetails] Error fetching feed data for ID ${id}:`, err);
              // Continue to add row even if some data failed
            }

            // Only add row if we have an aggregator address
            if (aggAddr) {
              rows.push({
                id: isV2Contract ? id + 1 : id, // Display 1-based IDs for v2, keep original for others
                name: name || "-",
                feed: aggAddr,
                constraintA: cons?.[0],
                constraintB: cons?.[1],
                price: price || "-",
              });
            } else {
              console.warn(`[FeedDetails] Skipping feed ID ${id} - no aggregator address`);
            }
          } catch (err) {
            console.error(`[FeedDetails] Failed to load feed ID ${id}:`, err);
            // Try to add row with whatever data we have
            if (aggAddr) {
              rows.push({
                id: isV2Contract ? (typeof id === 'number' ? id + 1 : Number(id) + 1) : (typeof id === 'number' ? id : Number(id)),
                name: name || "-",
                feed: aggAddr,
                constraintA: cons?.[0],
                constraintB: cons?.[1],
                price: price || "-",
              });
            }
          }
        }

        if (!cancelled) {
          console.log(`[FeedDetails] Setting ${rows.length} feed rows:`, rows);
          setFeedTable(rows);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch feed data:", err);
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [feed, rpcClient, network]);

  if (!feed) return null;

  if (compact) {
  return (
      <div className={compactOuterClassName ?? "bg-white border border-[#1E4775]/10 p-3"}>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[#1E4775] font-semibold text-sm truncate">
              {feed.label}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-right">
              <div className="text-[#1E4775]/60 text-[10px] uppercase tracking-wider mb-0.5">
                Price
              </div>
              <div className="text-[#1E4775] font-mono font-semibold">
                {format18(price)}
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-[#1E4775]/60 hover:text-[#1E4775] transition-colors"
                aria-label="Close details"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-2 grid grid-cols-2 lg:grid-cols-4 gap-2 text-[10px]">
          <div className="bg-[#1E4775]/5 p-2">
            <div className="text-[#1E4775]/60">Min / Max</div>
            <div className="text-[#1E4775] font-mono font-semibold">
              {format18(latestAnswer?.[0])} / {format18(latestAnswer?.[1])}
            </div>
          </div>
          <div className="bg-[#1E4775]/5 p-2">
            <div className="text-[#1E4775]/60">Rate (min / max)</div>
            <div className="text-[#1E4775] font-mono font-semibold">
              {format18(latestAnswer?.[2])} / {format18(latestAnswer?.[3])}
            </div>
          </div>
          <div className="bg-[#1E4775]/5 p-2 col-span-2 lg:col-span-2 min-w-0">
            <div className="text-[#1E4775]/60">Contract</div>
            <a
              href={getExplorerUrl(feed.address, network)}
              target="_blank"
              rel="noreferrer"
              className="text-[#1E4775] font-mono font-semibold hover:underline break-all"
            >
              {feed.address}
              <ExternalLinkIcon />
            </a>
          </div>
        </div>

        {/* Feed Details Table (compact) */}
        <div className="mt-2 bg-white border border-[#1E4775]/10 overflow-x-auto">
          <table className="min-w-full text-left text-sm table-fixed">
            <thead>
              <tr className="border-b border-[#1E4775]/20 uppercase tracking-wider text-[10px] text-[#1E4775]/60">
                <th className="py-2 px-3 font-normal">ID</th>
                <th className="py-2 px-3 font-normal">Feed Name / Description</th>
                <th className="py-2 px-3 font-normal">Feed Identifier</th>
                {(isMultifeedNormalizedType || isMultifeedDivType) && (
                  <th className="py-2 px-3 font-normal">Normalization Factor</th>
                )}
                {isMultifeedNormalizedType && (
                  <th className="py-2 px-3 font-normal">Normalized Price</th>
                )}
                <th className="py-2 px-3 font-normal">Price</th>
                <th className="py-2 px-3 font-normal">Heartbeat (seconds)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="border-t border-[#1E4775]/10">
                  <td
                    colSpan={isMultifeedNormalizedType ? 6 : isMultifeedDivType ? 5 : 4}
                    className="py-3 px-3 text-[#1E4775]/60 text-xs"
                  >
                    Loading…
                  </td>
                </tr>
              ) : feedTable.length === 0 ? (
                <tr className="border-t border-[#1E4775]/10">
                  <td
                    colSpan={isMultifeedNormalizedType ? 6 : isMultifeedDivType ? 5 : 4}
                    className="py-3 px-3 text-[#1E4775]/60 text-xs"
                  >
                    No feeds found.
                  </td>
                </tr>
              ) : (
                feedTable.map((row) => (
                  <tr
                    key={`${row.id}-${row.feed || row.name}`}
                    className="border-t border-[#1E4775]/10"
                  >
                    <td className="py-2 px-3 text-[#1E4775]/70 font-mono text-xs">
                      {row.id}
                    </td>
                    <td className="py-2 px-3 text-[#1E4775] text-xs">
                      {row.name || "-"}
                    </td>
                    <td className="py-2 px-3 text-[#1E4775] font-mono text-xs break-all">
                      {row.feed ? (
                        <a
                          href={getExplorerUrl(row.feed, network)}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline"
                        >
                          {row.feed}
                          <ExternalLinkIcon />
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    {(isMultifeedNormalizedType || isMultifeedDivType) && (
                      <td className="py-2 px-3 text-[#1E4775] font-mono text-xs">
                        {row.normFactor !== undefined ? row.normFactor.toString() : "-"}
                      </td>
                    )}
                    {isMultifeedNormalizedType && (
                      <td className="py-2 px-3 text-[#1E4775] font-mono text-xs">
                        {row.normalizedPrice || "-"}
                      </td>
                    )}
                    <td className="py-2 px-3 text-[#1E4775] font-mono text-xs">
                      {row.price || "-"}
                    </td>
                    <td className="py-2 px-3 text-[#1E4775]/70 text-xs">
                      {row.constraintA !== undefined
                        ? formatHeartbeat(row.constraintA)
                        : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const boxBg = embedded ? "bg-[#1E4775]/5" : "bg-white";

  return (
    <section
      className={`grid grid-cols-1 md:grid-cols-3 gap-3 ${
        embedded ? "" : "mb-2 mt-2"
      }`}
    >
      {/* Price Display */}
      <div className={`md:col-span-2 ${boxBg} p-3 border border-[#1E4775]/10`}>
        <div className="text-[#1E4775]/60 text-xs mb-1">
          {feed.label} - Price
          {((priceDivisor && priceDivisor > 1n) || (feed.divisor && feed.divisor > 1)) && (
            <span className="ml-2 text-[#1E4775]/40 italic">
              (price normalized{priceDivisor && priceDivisor > 1n ? `, divisor: ${priceDivisor.toString()}` : feed.divisor ? `, divisor: ${feed.divisor}` : ''})
            </span>
          )}
        </div>
        <div className="text-2xl font-mono text-[#1E4775]">
          {format18(price)}
        </div>
        <div className="text-[#1E4775]/40 text-xs mt-1">18 decimals</div>
        <div className="space-y-1 mt-2">
          {(() => {
            // Find base feed (id === 0 or name contains "base")
            const baseFeed = feedTable.find(row => 
              row.id === 0 ||
              row.name?.toLowerCase().includes("base") ||
              row.name === "Base USD Feed"
            );
            
            const baseFeedPrice = baseFeed?.price || baseFeed?.rawPrice;
            
            return baseFeedPrice && baseFeedPrice !== "-" ? (
              <div className="text-[#1E4775]/40 text-xs">
                Price USD (Base Asset): {baseFeedPrice}
              </div>
            ) : null;
          })()}
          {feedCount !== undefined && feedCount > 0 && (isMultifeedSumType || isMultifeedDivType || isMultifeedNormalizedType) && !loading && (
            <>
              {(() => {
                // Calculate sum of all feed prices, excluding base feed
                // For MultifeedNormalized, use normalizedPrice instead of price
                const sum = feedTable.reduce((acc, row) => {
                  // Skip base feed rows (id === 0 or name contains "base")
                  const isBaseFeed = row.id === 0 ||
                    row.name?.toLowerCase().includes("base") ||
                    row.name === "Base USD Feed";
                  if (isBaseFeed) {
                    return acc;
                  }

                  // For MultifeedNormalized, use normalizedPrice if available, otherwise use price
                  const priceToUse = isMultifeedNormalizedType && row.normalizedPrice && row.normalizedPrice !== "-"
                    ? row.normalizedPrice
                    : row.price;

                  if (priceToUse && priceToUse !== "-") {
                    const priceNum = parseFloat(priceToUse.replace(/,/g, ""));
                    if (!isNaN(priceNum)) {
                      return acc + priceNum;
                    }
                  }
                  return acc;
                }, 0);

                // Calculate asset price USD by dividing sum by feed count (skip for MultifeedSum since feedCount=1)
                const assetPriceUSD = !isMultifeedSumType && sum > 0 && feedCount > 0 ? sum / feedCount : null;

                // For MultifeedSum, calculate quote asset (index of performance) = sum feeds / indexed price
                let quoteAsset: number | null = null;
                if (isMultifeedSumType && indexPrice !== undefined && sum > 0) {
                  // Convert indexPrice from 18 decimals to number
                  const indexPriceNum = Number(indexPrice) / 1e18;
                  if (indexPriceNum > 0) {
                    quoteAsset = sum / indexPriceNum;
                  }
                }

                return sum > 0 ? (
                  <>
                    <div className="text-[#1E4775]/40 text-xs">
                      Price USD ({isMultifeedNormalizedType ? "Sum feeds normalized" : "Sum feeds"}): {sum.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                    </div>
                    {assetPriceUSD !== null && (
                      <div className="text-[#1E4775]/40 text-xs">
                        Price USD (Quote asset): {assetPriceUSD.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                      </div>
                    )}
                    {quoteAsset !== null && (
                      <div className="text-[#1E4775]/40 text-xs">
                        Price USD (Index performance): {quoteAsset.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                      </div>
                    )}
                  </>
                ) : null;
              })()}
            </>
          )}
          {feedCount !== undefined && (
            <div className="text-[#1E4775]/40 text-xs">
              Feed count: {feedCount}
            </div>
          )}
        </div>
        {isMultifeedSumType && indexPrice !== undefined && (
          <div className="text-[#1E4775]/40 text-xs">
            Indexed price: {format18(indexPrice)}
          </div>
        )}
      </div>

      {/* Latest Answer Display */}
      <div className={`${boxBg} p-3 border border-[#1E4775]/10`}>
        <div className="text-[#1E4775]/60 text-xs mb-1">
          Latest oracle feed data
        </div>
        <div className="space-y-1 font-mono text-[#1E4775]">
          <div>
            {feed.label} min price: {format18(latestAnswer?.[0])}
          </div>
          <div>
            {feed.label} max price: {format18(latestAnswer?.[1])}
          </div>
          <div>
            {parsePair(feed.label).base} min rate: {format18(latestAnswer?.[2])}
          </div>
          <div>
            {parsePair(feed.label).base} max rate: {format18(latestAnswer?.[3])}
          </div>
        </div>
      </div>

      {/* Contract Address */}
      <div className={`md:col-span-3 ${boxBg} p-3 border border-[#1E4775]/10`}>
        <div className="text-[#1E4775]/60 text-xs mb-1">Contract</div>
        <a
          href={getExplorerUrl(feed.address, network)}
          target="_blank"
          rel="noreferrer"
          className="hover:underline text-[#1E4775] font-mono"
        >
          {feed.address}
          <ExternalLinkIcon />
        </a>
      </div>

      {/* Feed Details Table */}
      <div
        className={`md:col-span-3 ${boxBg} p-3 overflow-x-auto border border-[#1E4775]/10`}
      >
        <table className="min-w-full text-left text-sm table-fixed">
          <thead>
            <tr className="border-b border-[#1E4775]/20 uppercase tracking-wider text-[10px] text-[#1E4775]/60">
              <th className="py-3 px-4 font-normal">ID</th>
              <th className="py-3 px-4 font-normal">Feed Name / Description</th>
              <th className="py-3 px-4 font-normal">Feed Identifier</th>
              {(isMultifeedNormalizedType || isMultifeedDivType) && (
                <th className="py-3 px-4 font-normal">Normalization Factor</th>
              )}
              {isMultifeedNormalizedType && (
                <th className="py-3 px-4 font-normal">Normalized Price</th>
              )}
              <th className="py-3 px-4 font-normal">Price</th>
              <th className="py-3 px-4 font-normal">Heartbeat (seconds)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="border-t border-[#1E4775]/10">
                <td
                  colSpan={isMultifeedNormalizedType ? 6 : (isMultifeedDivType ? 5 : 4)}
                  className="py-4 px-4 text-center text-[#1E4775]/50"
                >
                  Loading feed data...
                </td>
              </tr>
            ) : feedTable.length === 0 ? (
              <tr className="border-t border-[#1E4775]/10">
                <td
                  colSpan={isMultifeedNormalizedType ? 6 : (isMultifeedDivType ? 5 : 4)}
                  className="py-4 px-4 text-center text-[#1E4775]/50"
                >
                  No feed data available
                </td>
              </tr>
            ) : (
              feedTable
                .filter((r) => {
                  // Filter out base feed rows (id === 0 or name contains "base")
                  const isBaseFeed = r.id === 0 ||
                    r.name?.toLowerCase().includes("base") ||
                    r.name === "Base USD Feed";
                  return !isBaseFeed;
                })
                .map((r) => (
                <tr key={r.id} className="border-t border-[#1E4775]/10">
                  <td className="py-2 px-4 font-mono text-[#1E4775]">{r.id}</td>
                  <td className="py-2 px-4 font-mono text-[#1E4775]">
                    {r.name || "-"}
                  </td>
                  <td className="py-2 px-4 font-mono">
                    {r.feed ? (
                      <a
                        href={getExplorerUrl(r.feed, network)}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline text-[#1E4775]"
                      >
                        {r.feed}
                        <ExternalLinkIcon className="inline-block w-3 h-3 align-[-2px] ml-1" />
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  {(isMultifeedNormalizedType || isMultifeedDivType) && (
                    <td className="py-2 px-4 font-mono text-[#1E4775]">
                      {r.normFactor !== undefined ? format18(r.normFactor) : "-"}
                    </td>
                  )}
                  {isMultifeedNormalizedType && (
                    <td className="py-2 px-4 font-mono text-[#1E4775]">
                      {r.normalizedPrice || "-"}
                    </td>
                  )}
                  <td className="py-2 px-4 font-mono text-[#1E4775]">
                    {r.rawPrice || r.price || "-"}
                  </td>
                  <td className="py-2 px-4 font-mono text-[#1E4775]">
                    {r.constraintA !== undefined ? formatHeartbeat(r.constraintA) : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

