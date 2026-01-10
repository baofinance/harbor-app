/**
 * Hook to fetch quote asset prices for different feed types with 60-second caching
 * Supports: SingleFeed, DoubleFeed, MultifeedDiv, MultifeedSum (i26), MultifeedNormalized (BOM5)
 */

import { useEffect, useState, useRef } from "react";
import type { PublicClient } from "viem";
import type { FeedEntry } from "@/config/feeds";
import { parsePair } from "@/lib/utils";
import { singleFeedAbi, doubleFeedAbi } from "@/abis/oracleFeeds";
import {
  calculateI26Price,
  calculateBOM5Price,
  calculateMultifeedDivPrice,
  calculateSingleFeedPrice,
  calculateDoubleFeedPrice,
} from "@/utils/feedPriceCalculations";

export interface FeedQuotePriceResult {
  address: string;
  price: number | null;
  loading: boolean;
}

// Cache for individual feed prices with timestamps
interface CachedFeedPrice {
  price: number | null;
  timestamp: number;
}

const CACHE_DURATION_SUCCESS_MS = 60_000; // 60 seconds for successful prices
const CACHE_DURATION_FAILED_MS = 10_000; // 10 seconds for failed/rate-limited prices
// Cache key: "network:feedAddress" -> { price, timestamp }
const priceCache = new Map<string, CachedFeedPrice>();

/**
 * Generate cache key for a single feed
 */
function getFeedCacheKey(feedAddress: string, network: string): string {
  return `${network}:${feedAddress.toLowerCase()}`;
}

/**
 * Check if a cached price is still valid
 * - Successful prices (non-null): valid for 60 seconds
 * - Failed prices (null): valid for 10 seconds (retry sooner)
 */
function isCacheValid(cached: CachedFeedPrice | undefined): boolean {
  if (!cached) return false;
  const now = Date.now();
  const age = now - cached.timestamp;
  
  // Failed prices (null) expire after 10 seconds, successful prices expire after 60 seconds
  const cacheDuration = cached.price === null ? CACHE_DURATION_FAILED_MS : CACHE_DURATION_SUCCESS_MS;
  return age < cacheDuration;
}

/**
 * Determine feed type from label
 */
function getFeedType(label: string): "i26" | "bom5" | "multifeeddiv" | "regular" {
  const labelLower = label.toLowerCase();
  if (labelLower.includes(".i26")) {
    return "i26";
  } else if (labelLower.includes("bom5") || labelLower.includes("bom")) {
    return "bom5";
  } else if (labelLower.includes("mag7") || labelLower.includes("multifeeddiv")) {
    return "multifeeddiv";
  }
  return "regular";
}

/**
 * Hook to fetch quote asset prices for multiple feeds with 60-second caching
 */
export function useFeedQuotePrices(
  rpcClient: PublicClient | null,
  feedEntries: FeedEntry[],
  network: string,
  enabled: boolean = true
) {
  const [prices, setPrices] = useState<Map<string, number | null>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!enabled || !rpcClient || feedEntries.length === 0) {
      setPrices(new Map());
      setLoading(false);
      setError(null);
      return;
    }

    cancelledRef.current = false;

    (async () => {
      // Start with cached prices for all feeds
      const priceResults = new Map<string, number | null>();
      const feedsToFetch: FeedEntry[] = [];

      // Check cache for each feed individually
      for (const feed of feedEntries) {
        const feedCacheKey = getFeedCacheKey(feed.address, network);
        const cached = priceCache.get(feedCacheKey);

        if (isCacheValid(cached)) {
          // Use cached price
          priceResults.set(feed.address, cached!.price);
        } else {
          // Need to fetch this feed
          feedsToFetch.push(feed);
          // Set loading state only if we have feeds to fetch
        }
      }

      // If all feeds are cached, we're done
      if (feedsToFetch.length === 0) {
        if (!cancelledRef.current) {
          setPrices(priceResults);
          setLoading(false);
          setError(null);
        }
        return;
      }

      // Some feeds need to be fetched - set loading state
      if (!cancelledRef.current) {
        setLoading(true);
        setError(null);
        // Update with cached prices immediately (better UX)
        setPrices(new Map(priceResults));
      }

      // Group feeds to fetch by type for efficient processing
      const feedsByType = {
        i26: [] as FeedEntry[],
        bom5: [] as FeedEntry[],
        multifeeddiv: [] as FeedEntry[],
        regular: [] as FeedEntry[],
      };

      feedsToFetch.forEach(feed => {
        const type = getFeedType(feed.label);
        feedsByType[type].push(feed);
      });

      try {
        // Process i26 feeds (MultifeedSum)
        if (feedsByType.i26.length > 0 && network === "arbitrum") {
          for (const feed of feedsByType.i26) {
            if (cancelledRef.current) break;
            const feedCacheKey = getFeedCacheKey(feed.address, network);
            
            try {
              const price = await calculateI26Price(
                rpcClient,
                feed,
                () => cancelledRef.current
              );
              
              // Cache the result
              priceCache.set(feedCacheKey, {
                price,
                timestamp: Date.now(),
              });
              
              priceResults.set(feed.address, price);
            } catch (err) {
              console.error(`[useFeedQuotePrices] Error fetching i26 price for ${feed.label}:`, err);
              // Cache null to prevent repeated failed attempts
              priceCache.set(feedCacheKey, {
                price: null,
                timestamp: Date.now(),
              });
              priceResults.set(feed.address, null);
            }
          }
        }

        // Process BOM5 feeds (MultifeedNormalized)
        if (feedsByType.bom5.length > 0 && network === "base") {
          for (const feed of feedsByType.bom5) {
            if (cancelledRef.current) break;
            const feedCacheKey = getFeedCacheKey(feed.address, network);
            
            try {
              const price = await calculateBOM5Price(
                rpcClient,
                feed,
                () => cancelledRef.current
              );
              
              // Cache the result
              priceCache.set(feedCacheKey, {
                price,
                timestamp: Date.now(),
              });
              
              priceResults.set(feed.address, price);
            } catch (err) {
              console.error(`[useFeedQuotePrices] Error fetching BOM5 price for ${feed.label}:`, err);
              priceCache.set(feedCacheKey, {
                price: null,
                timestamp: Date.now(),
              });
              priceResults.set(feed.address, null);
            }
          }
        }

        // Process MultifeedDiv feeds (e.g., MAG7)
        if (feedsByType.multifeeddiv.length > 0 && network === "arbitrum") {
          for (const feed of feedsByType.multifeeddiv) {
            if (cancelledRef.current) break;
            const feedCacheKey = getFeedCacheKey(feed.address, network);
            
            try {
              const price = await calculateMultifeedDivPrice(
                rpcClient,
                feed,
                () => cancelledRef.current
              );
              
              // Cache the result
              priceCache.set(feedCacheKey, {
                price,
                timestamp: Date.now(),
              });
              
              priceResults.set(feed.address, price);
            } catch (err) {
              console.error(`[useFeedQuotePrices] Error fetching MultifeedDiv price for ${feed.label}:`, err);
              priceCache.set(feedCacheKey, {
                price: null,
                timestamp: Date.now(),
              });
              priceResults.set(feed.address, null);
            }
          }
        }

        // Process regular feeds (SingleFeed or DoubleFeed)
        if (feedsByType.regular.length > 0) {
          for (const feed of feedsByType.regular) {
            if (cancelledRef.current) break;
            const feedCacheKey = getFeedCacheKey(feed.address, network);
            
            try {
              // Check if it's a SingleFeed by trying to read PRICE_FEED
              const priceFeed = await rpcClient
                .readContract({
                  address: feed.address as `0x${string}`,
                  abi: singleFeedAbi,
                  functionName: "PRICE_FEED",
                })
                .catch(() => null);

              if (priceFeed && priceFeed !== "0x0000000000000000000000000000000000000000") {
                // It's a SingleFeed - check if inverted
                const pair = parsePair(feed.label);
                const isInverted = pair.base?.toLowerCase() === "fxusd";
                
                if (isInverted) {
                  const price = await calculateSingleFeedPrice(rpcClient, feed, true);
                  priceCache.set(feedCacheKey, {
                    price,
                    timestamp: Date.now(),
                  });
                  priceResults.set(feed.address, price);
                } else {
                  // Not inverted, no price to show
                  priceCache.set(feedCacheKey, {
                    price: null,
                    timestamp: Date.now(),
                  });
                  priceResults.set(feed.address, null);
                }
                continue;
              }

              // Check if it's a DoubleFeed by trying to read FIRST_FEED
              const firstFeed = await rpcClient
                .readContract({
                  address: feed.address as `0x${string}`,
                  abi: doubleFeedAbi,
                  functionName: "FIRST_FEED",
                })
                .catch(() => null);

              if (firstFeed && firstFeed !== "0x0000000000000000000000000000000000000000") {
                // It's a DoubleFeed
                const price = await calculateDoubleFeedPrice(rpcClient, feed);
                priceCache.set(feedCacheKey, {
                  price,
                  timestamp: Date.now(),
                });
                priceResults.set(feed.address, price);
              } else {
                // Not a known feed type, cache null
                priceCache.set(feedCacheKey, {
                  price: null,
                  timestamp: Date.now(),
                });
                priceResults.set(feed.address, null);
              }
            } catch (err) {
              // Not a SingleFeed/DoubleFeed or error reading
              console.error(`[useFeedQuotePrices] Error detecting feed type for ${feed.label}:`, err);
              const feedCacheKey = getFeedCacheKey(feed.address, network);
              priceCache.set(feedCacheKey, {
                price: null,
                timestamp: Date.now(),
              });
              priceResults.set(feed.address, null);
            }
          }
        }

        if (!cancelledRef.current) {
          setPrices(priceResults);
          setLoading(false);
          
          const hasAnyPrices = Array.from(priceResults.values()).some((p) => p !== null);
          if (!hasAnyPrices && feedsToFetch.length > 0) {
            setError("Failed to load prices. Check console for details.");
          } else {
            setError(null);
          }
        }
      } catch (err) {
        if (!cancelledRef.current) {
          console.error("[useFeedQuotePrices] Error fetching quote prices:", err);
          setError(err instanceof Error ? err.message : "Failed to load prices");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelledRef.current = true;
    };
  }, [enabled, rpcClient, feedEntries, network]);

  return { prices, loading, error };
}
