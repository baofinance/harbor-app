import { useEffect, useState, useRef } from "react";
import type { PublicClient } from "viem";
import { proxyAbi } from "@/abis/proxy";
import { format18 } from "@/lib/utils";

export interface FeedPrice {
  address: string;
  price: string;
}

// Cache for feed price arrays with timestamps
interface CachedPrice {
  prices: string[];
  timestamp: number;
}

const CACHE_DURATION_MS = 60_000; // 60 seconds
const priceCache = new Map<string, CachedPrice>();

/**
 * Generate a stable cache key from feed entries (addresses only).
 * We lowercase so casing changes don't bust cache.
 */
function getCacheKey(
  feedEntries: Array<{ address: `0x${string}`; label: string }>
): string {
  return feedEntries.map((f) => String(f.address).toLowerCase()).join(",");
}

function extractLatestAnswerMinPrice(val: unknown): bigint | null {
  if (typeof val === "bigint") return val;
  if (Array.isArray(val) && typeof val[0] === "bigint") return val[0] as bigint;
  if (val && typeof val === "object") {
    const v: any = val as any;
    if (typeof v.minPrice === "bigint") return v.minPrice as bigint;
    if (typeof v[0] === "bigint") return v[0] as bigint;
  }
  return null;
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
    if (cached && now - cached.timestamp < CACHE_DURATION_MS) {
      setPrices(cached.prices);
      setLoading(false);
      setError(null);

      // Schedule refresh when cache expires
      const timeUntilExpiry = CACHE_DURATION_MS - (now - cached.timestamp);
      if (refreshIntervalRef.current) {
        clearTimeout(refreshIntervalRef.current);
      }
      refreshIntervalRef.current = setTimeout(() => {
        priceCache.delete(cacheKey);
        setRefreshTrigger((prev) => prev + 1);
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
      try {
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

              price = extractLatestAnswerMinPrice(latestResult);
            } catch (err: unknown) {
              // Only try getPrice if latestAnswer failed for a clear network/RPC error.
              // Many feeds (e.g., SingleFeed/DoubleFeed) don't implement getPrice.
              const errMsg = err instanceof Error ? err.message : String(err);
              const isNetworkError =
                errMsg.toLowerCase().includes("network") ||
                errMsg.toLowerCase().includes("fetch");
              const isFunctionNotFound =
                errMsg.toLowerCase().includes("function") ||
                errMsg.toLowerCase().includes("not found") ||
                errMsg.toLowerCase().includes("does not exist") ||
                errMsg.toLowerCase().includes("execution reverted");

              if (isNetworkError && !isFunctionNotFound) {
                try {
                  const priceResult = await rpcClient.readContract({
                    address: feed.address,
                    abi: proxyAbi,
                    functionName: "getPrice",
                  });
                  if (typeof priceResult === "bigint") price = priceResult as bigint;
                } catch {
                  // Expected for SingleFeed/DoubleFeed, ignore.
                }
              }
            }

            if (price !== null && price !== undefined) {
              priceResults.push(format18(price));
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
          priceCache.set(cacheKey, { prices: priceResults, timestamp: Date.now() });
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
            priceCache.delete(cacheKey);
            setRefreshTrigger((prev) => prev + 1);
          }, CACHE_DURATION_MS);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setLoading(false);
          setPrices([]);
          setError(err instanceof Error ? err.message : "Failed to load prices");
        }
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
