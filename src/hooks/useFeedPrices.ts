import { useEffect, useState, useRef } from "react";
import type { PublicClient } from "viem";
import { proxyAbi } from "@/abis/proxy";
import { format18 } from "@/lib/utils";

export interface FeedPrice {
  address: string;
  price: string;
}

// Cache for feed prices with timestamps
interface CachedPrice {
  prices: string[];
  timestamp: number;
}

const CACHE_DURATION_MS = 60_000; // 60 seconds
const priceCache = new Map<string, CachedPrice>();

/**
 * Generate cache key from feed entries
 */
function getCacheKey(feedEntries: Array<{ address: `0x${string}`; label: string }>): string {
  return feedEntries.map(f => f.address).join(",");
}

/**
 * Hook to fetch prices for multiple feeds with 60-second caching
 */
export function useFeedPrices(
  rpcClient: PublicClient | null,
  feedEntries: Array<{ address: `0x${string}`; label: string }>
) {
  const [prices, setPrices] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!rpcClient || feedEntries.length === 0) {
      setPrices([]);
      return;
    }

    const cacheKey = getCacheKey(feedEntries);
    const cached = priceCache.get(cacheKey);
    const now = Date.now();

    // Check if we have valid cached data
    if (cached && (now - cached.timestamp) < CACHE_DURATION_MS) {
      setPrices(cached.prices);
      setLoading(false);
      setError(null);

      // Schedule refresh when cache expires
      const timeUntilExpiry = CACHE_DURATION_MS - (now - cached.timestamp);
      if (refreshIntervalRef.current) {
        clearTimeout(refreshIntervalRef.current);
      }
      refreshIntervalRef.current = setTimeout(() => {
        // Clear cache and trigger refresh
        priceCache.delete(cacheKey);
        setRefreshTrigger(prev => prev + 1);
      }, timeUntilExpiry);

      return () => {
        if (refreshIntervalRef.current) {
          clearTimeout(refreshIntervalRef.current);
        }
      };
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      const priceResults: string[] = [];
      for (const feed of feedEntries) {
        if (cancelled) break;
        try {
          // Try latestAnswer first (works for SingleFeed, DoubleFeed, proxy contracts, etc.)
          let price: bigint | null = null;

          try {
            const latestResult = await rpcClient.readContract({
              address: feed.address,
              abi: proxyAbi,
              functionName: "latestAnswer",
            });

            if (latestResult && Array.isArray(latestResult) && latestResult.length >= 1) {
              // latestAnswer returns [minPrice, maxPrice, minRate, maxRate]
              // Use minPrice (first element) as the price
              price = latestResult[0] as bigint;
            } else if (latestResult && typeof latestResult === "bigint") {
              // Some contracts return a single bigint instead of an array
              price = latestResult;
            }
          } catch (err: unknown) {
            // latestAnswer failed - check if this might be a SingleFeed/DoubleFeed contract
            // SingleFeed and DoubleFeed contracts don't have getPrice, only latestAnswer
            // If latestAnswer fails for them, getPrice won't work either
            const errMsg = err instanceof Error ? err.message : String(err);
            const isNetworkError = errMsg.includes("NetworkError") || errMsg.includes("network") || errMsg.includes("fetch");
            const isFunctionNotFound = errMsg.includes("function") || 
                                      errMsg.includes("not found") || 
                                      errMsg.includes("does not exist") ||
                                      errMsg.includes("execution reverted");
            
            // Only try getPrice if latestAnswer failed for a clear network/RPC error
            // If it's a function-not-found error or we can't determine, skip getPrice
            // SingleFeed/DoubleFeed contracts don't have getPrice, so trying it causes errors
            if (isNetworkError && !isFunctionNotFound) {
              try {
                const priceResult = await rpcClient.readContract({
                  address: feed.address,
                  abi: proxyAbi,
                  functionName: "getPrice",
                });
                price = priceResult as bigint;
              } catch (getPriceErr: unknown) {
                // Silently fail - contract might not have getPrice (e.g., SingleFeed/DoubleFeed)
                // This is expected behavior, so we don't log it as an error
              }
            }
            // If latestAnswer failed for a non-network reason (function not found, execution reverted, etc.)
            // Don't try getPrice - the contract likely doesn't have it
          }

          if (price !== null && price !== undefined) {
            const formatted = format18(price);
            priceResults.push(formatted);
          } else {
            priceResults.push("-");
          }
        } catch (err: unknown) {
          console.error(
            `[useFeedPrices] Exception fetching price for ${feed.label}:`,
            err
          );
          priceResults.push("-");
        }
      }
      if (!cancelled) {
        // Cache the results
        priceCache.set(cacheKey, {
          prices: priceResults,
          timestamp: Date.now(),
        });

        setPrices(priceResults);
        setLoading(false);
        if (priceResults.every((p) => p === "-")) {
          setError("Failed to load prices. Check console for details.");
        }

        // Schedule refresh after cache duration
        if (refreshIntervalRef.current) {
          clearTimeout(refreshIntervalRef.current);
        }
        refreshIntervalRef.current = setTimeout(() => {
          // Clear cache and trigger refresh
          priceCache.delete(cacheKey);
          setRefreshTrigger(prev => prev + 1);
        }, CACHE_DURATION_MS);
      }
    })();

    return () => {
      cancelled = true;
      if (refreshIntervalRef.current) {
        clearTimeout(refreshIntervalRef.current);
      }
    };
  }, [rpcClient, feedEntries, refreshTrigger]);

  return { prices, loading, error };
}
