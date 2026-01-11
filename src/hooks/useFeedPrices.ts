import { useEffect, useState, useRef } from "react";
import type { PublicClient } from "viem";
import { proxyAbi } from "@/abis/proxy";
import { format18 } from "@/lib/utils";

export interface FeedPrice {
  address: string;
  price: string;
}

// Cache for individual feed prices with timestamps
interface CachedFeedPrice {
  price: string;
  timestamp: number;
}

const CACHE_DURATION_MS = 60_000; // 60 seconds
// Cache key: feed address (lowercased) -> { price, timestamp }
const priceCache = new Map<string, CachedFeedPrice>();

function isCacheValid(cached: CachedFeedPrice | undefined): boolean {
  if (!cached) return false;
  return Date.now() - cached.timestamp < CACHE_DURATION_MS;
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

    let cancelled = false;
    setError(null);

    (async () => {
      const now = Date.now();
      try {

      // Start with cached prices where valid, and collect feeds to fetch
      const results: string[] = new Array(feedEntries.length).fill("-");
      const toFetchIdx: number[] = [];

      for (let i = 0; i < feedEntries.length; i++) {
        const addr = String(feedEntries[i].address).toLowerCase();
        const cached = priceCache.get(addr);
        if (isCacheValid(cached)) {
          results[i] = cached!.price;
        } else {
          toFetchIdx.push(i);
        }
      }

      // If everything is cached, return immediately and schedule a refresh for the oldest expiry.
      if (toFetchIdx.length === 0) {
        if (!cancelled) {
          setPrices(results);
          setLoading(false);
          setError(null);
        }
      } else {
        if (!cancelled) {
          // Only set loading if we actually need to fetch anything.
          setLoading(true);
          // Show cached data immediately if we have any.
          setPrices(results);
        }

        // Direct reads (no multicall): this is the most reliable path in-browser.
        // 1) Try latestAnswer for each feed concurrently.
        const latest = await Promise.all(
          toFetchIdx.map((idx) =>
            rpcClient
              .readContract({
                address: feedEntries[idx].address,
                abi: proxyAbi,
                functionName: "latestAnswer",
              } as any)
              .then((result) => ({ idx, ok: true as const, result }))
              .catch((error) => ({ idx, ok: false as const, error }))
          )
        );

        const fallbackIdx: number[] = [];
        for (const r of latest) {
          if (r.ok) {
            const price = extractLatestAnswerMinPrice(r.result);
            if (price !== null && price !== undefined) {
              const formatted = format18(price);
              results[r.idx] = formatted;
              priceCache.set(String(feedEntries[r.idx].address).toLowerCase(), {
                price: formatted,
                timestamp: now,
              });
            }
          } else {
            fallbackIdx.push(r.idx);
          }
        }

        // 2) For failures, try getPrice as a fallback concurrently.
        if (fallbackIdx.length > 0) {
          const fallback = await Promise.all(
            fallbackIdx.map((idx) =>
              rpcClient
                .readContract({
                  address: feedEntries[idx].address,
                  abi: proxyAbi,
                  functionName: "getPrice",
                } as any)
                .then((result) => ({ idx, ok: true as const, result }))
                .catch((error) => ({ idx, ok: false as const, error }))
            )
          );

          for (const r of fallback) {
            if (r.ok) {
              const val = r.result as bigint | undefined;
              if (val !== undefined && val !== null) {
                const formatted = format18(val);
                results[r.idx] = formatted;
                priceCache.set(String(feedEntries[r.idx].address).toLowerCase(), {
                  price: formatted,
                  timestamp: now,
                });
              }
            }
          }
        }

        if (!cancelled) {
          setPrices(results);
          setLoading(false);
          if (results.every((p) => p === "-")) {
            setError("Failed to load prices. Check console for details.");
          } else {
            setError(null);
          }
        }
      }

      // Schedule a refresh after cache duration.
      if (!cancelled) {
        if (refreshIntervalRef.current) {
          clearTimeout(refreshIntervalRef.current);
        }
        refreshIntervalRef.current = setTimeout(() => {
          // Soft refresh by invalidating any cached entries for the current list.
          for (const f of feedEntries) {
            priceCache.delete(String(f.address).toLowerCase());
          }
          if (!cancelled) setRefreshTrigger((v) => v + 1);
        }, CACHE_DURATION_MS);
      }
      } catch (err: unknown) {
        // Any error (including multicall failures) should never leave us stuck in "loading".
        if (!cancelled) {
          setLoading(false);
          setPrices(new Array(feedEntries.length).fill("-"));
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
