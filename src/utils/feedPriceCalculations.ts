/**
 * Helper functions for calculating quote asset prices from different feed types
 * These functions are used in FeedTable to calculate prices for SingleFeed, DoubleFeed,
 * MultifeedDiv, MultifeedSum (i26), and MultifeedNormalized (BOM5) contracts
 */

import type { PublicClient } from "viem";
import { aggregatorAbi } from "@/abis/chainlink";
import {
  singleFeedAbi,
  doubleFeedAbi,
  multifeedDivAbi,
  multifeedSumAbi,
  multifeedNormalizedAbi,
} from "@/abis/oracleFeeds";

export interface FeedEntry {
  label: string;
  address: string;
}

/**
 * Calculate quote asset price for an i26 feed (MultifeedSum)
 * Formula: sum of all feed prices / INDEX_PRICE
 */
export async function calculateI26Price(
  rpcClient: PublicClient,
  feed: FeedEntry,
  onCancel?: () => boolean
): Promise<number | null> {
  try {
    // Read INDEX_PRICE and PRICE_DIVISOR
    const [indexPrice, priceDivisor] = await Promise.all([
      rpcClient
        .readContract({
          address: feed.address as `0x${string}`,
          abi: multifeedSumAbi,
          functionName: "INDEX_PRICE",
        })
        .catch((err) => {
          console.error(`[calculateI26Price] Error reading INDEX_PRICE for ${feed.label}:`, err);
          return null;
        }),
      rpcClient
        .readContract({
          address: feed.address as `0x${string}`,
          abi: multifeedSumAbi,
          functionName: "PRICE_DIVISOR" as any,
        })
        .catch(() => null),
    ]);

    if (indexPrice === undefined || indexPrice === null || typeof indexPrice !== "bigint") {
      return null;
    }

    const indexPriceNum = Number(indexPrice) / 1e18; // INDEX_PRICE is in 18 decimals

    // i26 feeds (MultifeedSum) don't have FEED_COUNT - use maxFeedIndex: 6 (7 feeds total)
    const maxFeedIndex = 6;
    let sumPrices = 0;

    // Read all individual feed prices (FEED_0, FEED_1, ..., FEED_6)
    for (let i = 0; i <= maxFeedIndex; i++) {
      if (onCancel?.()) break;
      try {
        const [feedAddr, feedDecimals] = await Promise.all([
          rpcClient
            .readContract({
              address: feed.address as `0x${string}`,
              abi: multifeedSumAbi,
              functionName: `FEED_${i}` as any,
            })
            .catch(() => null),
          rpcClient
            .readContract({
              address: feed.address as `0x${string}`,
              abi: multifeedSumAbi,
              functionName: `FEED_${i}_DECIMALS` as any,
            })
            .catch(() => null),
        ]);

        if (!feedAddr || feedAddr === "0x0000000000000000000000000000000000000000") {
          continue;
        }

        const feedPrice = await rpcClient
          .readContract({
            address: feedAddr as `0x${string}`,
            abi: aggregatorAbi,
            functionName: "latestAnswer",
          })
          .catch(() => null);

        if (feedPrice !== null && feedPrice !== undefined) {
          const decimals = feedDecimals && typeof feedDecimals === "bigint" ? Number(feedDecimals) : 8;
          const priceNum = Number(feedPrice as bigint) / 10 ** decimals;
          sumPrices += priceNum;
        }
      } catch (err) {
        console.error(`[calculateI26Price] Error fetching FEED_${i} price for ${feed.label}:`, err);
      }
    }

    if (sumPrices > 0 && indexPriceNum > 0) {
      let quoteAssetPrice = sumPrices / indexPriceNum;
      if (priceDivisor && typeof priceDivisor === "bigint" && priceDivisor > 0n) {
        quoteAssetPrice = quoteAssetPrice / Number(priceDivisor);
      }
      return quoteAssetPrice;
    }
  } catch (err) {
    console.error(`[calculateI26Price] Error calculating i26 price for ${feed.label}:`, err);
  }
  return null;
}

/**
 * Calculate quote asset price for a BOM5 feed (MultifeedNormalized)
 * Formula: sum of normalized feed prices / FEED_COUNT
 */
export async function calculateBOM5Price(
  rpcClient: PublicClient,
  feed: FeedEntry,
  onCancel?: () => boolean
): Promise<number | null> {
  try {
    // Read FEED_COUNT (BOM5 doesn't have PRICE_DIVISOR)
    const feedCount = await rpcClient
      .readContract({
        address: feed.address as `0x${string}`,
        abi: multifeedNormalizedAbi,
        functionName: "FEED_COUNT" as any,
      })
      .catch((err) => {
        console.error(`[calculateBOM5Price] Error reading FEED_COUNT for ${feed.label}:`, err);
        return null;
      });

    if (!feedCount || typeof feedCount !== "bigint" || Number(feedCount) <= 0) {
      return null;
    }

    const numFeeds = Number(feedCount);
    let sumNormalizedPrices = 0;

    // Read all individual feed prices with their NORM_FACTOR to calculate normalized prices
    for (let i = 0; i < numFeeds; i++) {
      if (onCancel?.()) break;
      try {
        const [feedAddr, feedDecimals, normFactor] = await Promise.all([
          rpcClient
            .readContract({
              address: feed.address as `0x${string}`,
              abi: multifeedNormalizedAbi,
              functionName: `FEED_${i}` as any,
            })
            .catch(() => null),
          rpcClient
            .readContract({
              address: feed.address as `0x${string}`,
              abi: multifeedNormalizedAbi,
              functionName: `FEED_${i}_DECIMALS` as any,
            })
            .catch(() => null),
          rpcClient
            .readContract({
              address: feed.address as `0x${string}`,
              abi: multifeedNormalizedAbi,
              functionName: `NORM_FACTOR_${i}` as any,
            })
            .catch(() => null),
        ]);

        if (!feedAddr || feedAddr === "0x0000000000000000000000000000000000000000") {
          continue;
        }

        const feedPrice = await rpcClient
          .readContract({
            address: feedAddr as `0x${string}`,
            abi: aggregatorAbi,
            functionName: "latestAnswer",
          })
          .catch(() => null);

        if (feedPrice !== null && feedPrice !== undefined && normFactor && typeof normFactor === "bigint" && normFactor > 0n) {
          const decimals = feedDecimals && typeof feedDecimals === "bigint" ? Number(feedDecimals) : 8;
          const rawPrice = feedPrice as bigint;
          
          // Calculate normalized price: (rawPrice * normFactor) / 1e18
          const normalizedBigInt = (rawPrice * normFactor) / BigInt(10 ** 18);
          const normalizedPriceNum = Number(normalizedBigInt) / 10 ** decimals;
          
          sumNormalizedPrices += normalizedPriceNum;
        }
      } catch (err) {
        console.error(`[calculateBOM5Price] Error fetching FEED_${i} normalized price for ${feed.label}:`, err);
      }
    }

    if (sumNormalizedPrices > 0 && numFeeds > 0) {
      return sumNormalizedPrices / numFeeds;
    }
  } catch (err) {
    console.error(`[calculateBOM5Price] Error calculating BOM5 price for ${feed.label}:`, err);
  }
  return null;
}

/**
 * Calculate quote asset price for a MultifeedDiv feed (e.g., MAG7)
 * Formula: (sum of all feed prices / FEED_COUNT) / PRICE_DIVISOR
 */
export async function calculateMultifeedDivPrice(
  rpcClient: PublicClient,
  feed: FeedEntry,
  onCancel?: () => boolean
): Promise<number | null> {
  try {
    // Read FEED_COUNT and PRICE_DIVISOR
    const [feedCount, priceDivisor] = await Promise.all([
      rpcClient
        .readContract({
          address: feed.address as `0x${string}`,
          abi: multifeedDivAbi,
          functionName: "FEED_COUNT" as any,
        })
        .catch((err) => {
          console.error(`[calculateMultifeedDivPrice] Error reading FEED_COUNT for ${feed.label}:`, err);
          return null;
        }),
      rpcClient
        .readContract({
          address: feed.address as `0x${string}`,
          abi: multifeedDivAbi,
          functionName: "PRICE_DIVISOR" as any,
        })
        .catch(() => null),
    ]);

    if (!feedCount || typeof feedCount !== "bigint" || Number(feedCount) <= 0) {
      return null;
    }

    const numFeeds = Number(feedCount);
    let sumPrices = 0;

    // Read all individual feed prices (FEED_0, FEED_1, etc.)
    for (let i = 0; i < numFeeds; i++) {
      if (onCancel?.()) break;
      try {
        const [feedAddr, feedDecimals] = await Promise.all([
          rpcClient
            .readContract({
              address: feed.address as `0x${string}`,
              abi: multifeedDivAbi,
              functionName: `FEED_${i}` as any,
            })
            .catch(() => null),
          rpcClient
            .readContract({
              address: feed.address as `0x${string}`,
              abi: multifeedDivAbi,
              functionName: `FEED_${i}_DECIMALS` as any,
            })
            .catch(() => null),
        ]);

        if (!feedAddr || feedAddr === "0x0000000000000000000000000000000000000000") {
          continue;
        }

        const feedPrice = await rpcClient
          .readContract({
            address: feedAddr as `0x${string}`,
            abi: aggregatorAbi,
            functionName: "latestAnswer",
          })
          .catch(() => null);

        if (feedPrice !== null && feedPrice !== undefined) {
          const decimals = feedDecimals && typeof feedDecimals === "bigint" ? Number(feedDecimals) : 8;
          const priceNum = Number(feedPrice as bigint) / 10 ** decimals;
          sumPrices += priceNum;
        }
      } catch (err) {
        console.error(`[calculateMultifeedDivPrice] Error fetching FEED_${i} price for ${feed.label}:`, err);
      }
    }

    if (sumPrices > 0 && numFeeds > 0) {
      let quoteAssetPrice = sumPrices / numFeeds;
      if (priceDivisor && typeof priceDivisor === "bigint" && priceDivisor > 0n) {
        quoteAssetPrice = quoteAssetPrice / Number(priceDivisor);
      }
      return quoteAssetPrice;
    }
  } catch (err) {
    console.error(`[calculateMultifeedDivPrice] Error calculating MultifeedDiv price for ${feed.label}:`, err);
  }
  return null;
}

/**
 * Calculate quote asset price for a SingleFeed contract (inverted feeds)
 * For inverted fxUSD feeds, reads PRICE_FEED's latestAnswer directly
 */
export async function calculateSingleFeedPrice(
  rpcClient: PublicClient,
  feed: FeedEntry,
  isInverted: boolean
): Promise<number | null> {
  if (!isInverted) {
    return null; // Only handle inverted feeds for now
  }

  try {
    // Read PRICE_FEED address
    const priceFeed = await rpcClient
      .readContract({
        address: feed.address as `0x${string}`,
        abi: singleFeedAbi,
        functionName: "PRICE_FEED",
      })
      .catch(() => null);

    if (!priceFeed || priceFeed === "0x0000000000000000000000000000000000000000") {
      return null;
    }

    // Read PRICE_FEED_DECIMALS, PRICE_FEED's latestAnswer, and PRICE_DIVISOR
    const [priceFeedDecimals, priceFeedPrice, priceDivisor] = await Promise.all([
      rpcClient
        .readContract({
          address: feed.address as `0x${string}`,
          abi: singleFeedAbi,
          functionName: "PRICE_FEED_DECIMALS",
        })
        .catch(() => null),
      rpcClient
        .readContract({
          address: priceFeed as `0x${string}`,
          abi: aggregatorAbi,
          functionName: "latestAnswer",
        })
        .catch(() => null),
      rpcClient
        .readContract({
          address: feed.address as `0x${string}`,
          abi: singleFeedAbi,
          functionName: "PRICE_DIVISOR",
        })
        .catch(() => null),
    ]);

    if (priceFeedPrice === null || priceFeedPrice === undefined) {
      return null;
    }

    const decimals = priceFeedDecimals ? Number(priceFeedDecimals) : 8; // Default to 8 for Chainlink
    let priceNum = Number(priceFeedPrice as bigint) / 10 ** decimals;

    // Divide by PRICE_DIVISOR if it exists
    if (priceDivisor && typeof priceDivisor === "bigint" && priceDivisor > 0n) {
      priceNum = priceNum / Number(priceDivisor);
    }

    return priceNum;
  } catch (err) {
    console.error(`[calculateSingleFeedPrice] Error calculating SingleFeed price for ${feed.label}:`, err);
  }
  return null;
}

/**
 * Calculate quote asset price for a DoubleFeed contract
 * Reads SECOND_FEED's latestAnswer directly
 */
export async function calculateDoubleFeedPrice(
  rpcClient: PublicClient,
  feed: FeedEntry
): Promise<number | null> {
  try {
    // Read SECOND_FEED address, SECOND_FEED_DECIMALS, and PRICE_DIVISOR
    const [secondFeedAddr, secondFeedDecimals, priceDivisor] = await Promise.all([
      rpcClient
        .readContract({
          address: feed.address as `0x${string}`,
          abi: doubleFeedAbi,
          functionName: "SECOND_FEED",
        })
        .catch(() => null),
      rpcClient
        .readContract({
          address: feed.address as `0x${string}`,
          abi: doubleFeedAbi,
          functionName: "SECOND_FEED_DECIMALS",
        })
        .catch(() => null),
      rpcClient
        .readContract({
          address: feed.address as `0x${string}`,
          abi: doubleFeedAbi,
          functionName: "PRICE_DIVISOR",
        })
        .catch(() => null),
    ]);

    if (!secondFeedAddr || secondFeedAddr === "0x0000000000000000000000000000000000000000") {
      return null;
    }

    // Read SECOND_FEED's latestAnswer directly
    const secondFeedPrice = await rpcClient
      .readContract({
        address: secondFeedAddr as `0x${string}`,
        abi: aggregatorAbi,
        functionName: "latestAnswer",
      })
      .catch(() => null);

    if (secondFeedPrice === null || secondFeedPrice === undefined) {
      return null;
    }

    // Use SECOND_FEED_DECIMALS or default to 8 for Chainlink
    const decimals = secondFeedDecimals ? Number(secondFeedDecimals) : 8;
    let priceNum = Number(secondFeedPrice as bigint) / 10 ** decimals;

    // Divide by PRICE_DIVISOR if it exists
    if (priceDivisor && typeof priceDivisor === "bigint" && priceDivisor > 0n) {
      priceNum = priceNum / Number(priceDivisor);
    }

    return priceNum;
  } catch (err) {
    console.error(`[calculateDoubleFeedPrice] Error calculating DoubleFeed price for ${feed.label}:`, err);
  }
  return null;
}
