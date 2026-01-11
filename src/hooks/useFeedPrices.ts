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

// Map Room prices don't need to update every minute. A longer TTL materially reduces RPC load.
const CACHE_DURATION_MS = 5 * 60_000; // 5 minutes
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

const MULTICALL_BATCH_SIZE = 25;
function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
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
        // Prefer multicall to reduce RPC requests dramatically; fallback per-feed to preserve reliability.
        const priceResults: string[] = new Array(feedEntries.length).fill("-");
        const needFallbackIdx = new Set<number>();

        const canMulticall = typeof (rpcClient as any).multicall === "function";
        if (canMulticall) {
          const contracts = feedEntries.map((feed) => ({
            address: feed.address,
            abi: proxyAbi,
            functionName: "latestAnswer" as const,
          }));

          let out: any[] = [];
          try {
            for (const batch of chunk(contracts, MULTICALL_BATCH_SIZE)) {
              // eslint-disable-next-line no-await-in-loop
              const r = await (rpcClient as any).multicall({
                contracts: batch,
                allowFailure: true,
              });
              out = out.concat(r as any[]);
            }

            for (let i = 0; i < out.length; i++) {
              const r = out[i];
              if (r?.status === "success") {
                const price = extractLatestAnswerMinPrice(r.result);
                if (price !== null && price !== undefined) {
                  priceResults[i] = format18(price);
                } else {
                  needFallbackIdx.add(i);
                }
              } else {
                needFallbackIdx.add(i);
              }
            }
          } catch {
            // If multicall itself fails, fall back for all.
            for (let i = 0; i < feedEntries.length; i++) needFallbackIdx.add(i);
          }
        } else {
          for (let i = 0; i < feedEntries.length; i++) needFallbackIdx.add(i);
        }

        // Per-feed fallback (latestAnswer, then getPrice on network-ish errors)
        for (const i of Array.from(needFallbackIdx.values())) {
          if (cancelled) break;
          const feed = feedEntries[i];
          try {
            let price: bigint | null = null;
            try {
              const latestResult = await rpcClient.readContract({
                address: feed.address,
                abi: proxyAbi,
                functionName: "latestAnswer",
              });
              price = extractLatestAnswerMinPrice(latestResult);
            } catch (err: unknown) {
              const errMsg = err instanceof Error ? err.message : String(err);
              const lower = errMsg.toLowerCase();
              const isNetworkError = lower.includes("network") || lower.includes("fetch");
              const isFunctionNotFound =
                lower.includes("function") ||
                lower.includes("not found") ||
                lower.includes("does not exist") ||
                lower.includes("execution reverted");
              if (isNetworkError && !isFunctionNotFound) {
                try {
                  const priceResult = await rpcClient.readContract({
                    address: feed.address,
                    abi: proxyAbi,
                    functionName: "getPrice",
                  });
                  if (typeof priceResult === "bigint") price = priceResult as bigint;
                } catch {
                  // ignore
                }
              }
            }
            if (price !== null && price !== undefined) {
              priceResults[i] = format18(price);
            }
          } catch (err) {
            console.error(`[useFeedPrices] Exception fetching price for ${feed.label}:`, err);
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
