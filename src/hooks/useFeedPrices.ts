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

const MULTICALL_BATCH_SIZE = 40;

function isCacheValid(cached: CachedFeedPrice | undefined): boolean {
  if (!cached) return false;
  return Date.now() - cached.timestamp < CACHE_DURATION_MS;
}

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

        // Batch read latestAnswer for all stale feeds.
        const latestContracts = toFetchIdx.map((i) => ({
          address: feedEntries[i].address,
          abi: proxyAbi,
          functionName: "latestAnswer" as const,
        }));

        // NOTE: Some RPCs reject very large multicalls. Chunk to keep it reliable.
        let latestResults: any[] = [];
        try {
          for (const batch of chunk(latestContracts, MULTICALL_BATCH_SIZE)) {
            // eslint-disable-next-line no-await-in-loop
            const r = await rpcClient.multicall({
              contracts: batch as any,
              allowFailure: true,
            });
            latestResults = latestResults.concat(r as any[]);
          }
        } catch (e) {
          // Fallback: concurrent per-contract read (still cached per address).
          latestResults = await Promise.all(
            latestContracts.map((c) =>
              rpcClient
                .readContract(c as any)
                .then((result) => ({ status: "success", result }))
                .catch((error) => ({ status: "failure", error }))
            )
          );
        }

        // For any failures, attempt getPrice in a second multicall (best-effort).
        const fallbackIdx: number[] = [];
        for (let j = 0; j < latestResults.length; j++) {
          const idx = toFetchIdx[j];
          const r: any = latestResults[j];
          if (r?.status === "success") {
            const val = r.result;
            let price: bigint | null = null;
            if (val && Array.isArray(val) && val.length >= 1) {
              price = val[0] as bigint;
            } else if (typeof val === "bigint") {
              price = val;
            }
            if (price !== null && price !== undefined) {
              const formatted = format18(price);
              results[idx] = formatted;
              priceCache.set(String(feedEntries[idx].address).toLowerCase(), {
                price: formatted,
                timestamp: now,
              });
            } else {
              results[idx] = "-";
            }
          } else {
            fallbackIdx.push(idx);
          }
        }

        if (fallbackIdx.length > 0) {
          const fallbackContracts = fallbackIdx.map((i) => ({
            address: feedEntries[i].address,
            abi: proxyAbi,
            functionName: "getPrice" as const,
          }));
          let fallbackResults: any[] = [];
          try {
            for (const batch of chunk(fallbackContracts, MULTICALL_BATCH_SIZE)) {
              // eslint-disable-next-line no-await-in-loop
              const r = await rpcClient.multicall({
                contracts: batch as any,
                allowFailure: true,
              });
              fallbackResults = fallbackResults.concat(r as any[]);
            }
          } catch (e) {
            fallbackResults = await Promise.all(
              fallbackContracts.map((c) =>
                rpcClient
                  .readContract(c as any)
                  .then((result) => ({ status: "success", result }))
                  .catch((error) => ({ status: "failure", error }))
              )
            );
          }

          for (let j = 0; j < fallbackResults.length; j++) {
            const idx = fallbackIdx[j];
            const r: any = fallbackResults[j];
            if (r?.status === "success") {
              const val = r.result as bigint | undefined;
              if (val !== undefined && val !== null) {
                const formatted = format18(val);
                results[idx] = formatted;
                priceCache.set(String(feedEntries[idx].address).toLowerCase(), {
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
