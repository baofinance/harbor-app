import { useState, useEffect } from "react";

/**
 * Fetches a single token price in USD from CoinGecko API
 * @param coinId - The CoinGecko coin ID (e.g., "wrapped-steth")
 * @param refreshInterval - How often to refresh in milliseconds (default: 60000 = 1 minute)
 */
export function useCoinGeckoPrice(
  coinId: string,
  refreshInterval: number = 60000
) {
  const [price, setPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!coinId) {
      setPrice(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    let intervalId: NodeJS.Timeout | null = null;

    const fetchPrice = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/coingecko/simple-price?ids=${encodeURIComponent(coinId)}`
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (cancelled) return;

        if (data[coinId] && data[coinId].usd) {
          setPrice(data[coinId].usd);
        } else {
          setError(`Price data for ${coinId} not found.`);
          setPrice(null);
        }
      } catch (e: any) {
        if (cancelled) return;
        // Only log network errors in development, not in production
        if (process.env.NODE_ENV === "development") {
          console.warn(`Failed to fetch price for ${coinId}:`, e.message || "Network error");
        }
        setError(e.message || "Failed to fetch price");
        setPrice(null);
      } finally {
        if (cancelled) return;
        setIsLoading(false);
      }
    };

    fetchPrice();

    if (refreshInterval > 0) {
      intervalId = setInterval(fetchPrice, refreshInterval);
    }

    return () => {
      cancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [coinId, refreshInterval]);

  return { price, isLoading, error };
}

/**
 * Fetches multiple token prices in USD from CoinGecko API
 * @param coinIds - Array of CoinGecko coin IDs
 * @param refreshInterval - How often to refresh in milliseconds (default: 60000 = 1 minute)
 */
export function useCoinGeckoPrices(
  coinIds: string[],
  refreshInterval: number = 60000
) {
  const [prices, setPrices] = useState<Record<string, number | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (coinIds.length === 0) {
      setPrices({});
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    let intervalId: NodeJS.Timeout | null = null;
    let retryTimeoutId: NodeJS.Timeout | null = null;

    const fetchPrices = async (retryCount: number = 0): Promise<void> => {
      const startTime = performance.now();
      if (process.env.NODE_ENV === "development") {
        console.log(
          `[CoinGecko] Starting fetch for: ${coinIds.join(", ")}${
            retryCount > 0 ? ` (retry ${retryCount})` : ""
          }`
        );
      }
      setIsLoading(true);
      setError(null);
      try {
        const ids = coinIds.join(",");
        const response = await fetch(
          `/api/coingecko/simple-price?ids=${encodeURIComponent(ids)}`
        );
        const fetchTime = performance.now() - startTime;
        if (process.env.NODE_ENV === "development") {
          console.log(
            `[CoinGecko] Fetch completed in ${fetchTime.toFixed(
              2
            )}ms, status: ${response.status}`
          );
        }
        
        if (!response.ok) {
          // Handle rate limiting (429) with retry logic
          if (response.status === 429 && retryCount < 3) {
            const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10s
            if (process.env.NODE_ENV === "development") {
              console.warn(
                `[CoinGecko] Rate limited (429), retrying in ${backoffDelay}ms...`
              );
            }
            if (cancelled) return;
            retryTimeoutId = setTimeout(() => {
              fetchPrices(retryCount + 1);
            }, backoffDelay);
            setIsLoading(false); // Don't show loading during backoff
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (cancelled) return;

        const newPrices: Record<string, number | null> = {};
        coinIds.forEach((id) => {
          newPrices[id] = data[id]?.usd || null;
          if (process.env.NODE_ENV === "development") {
            if (newPrices[id]) {
              console.log(`[CoinGecko] Price for ${id}: $${newPrices[id]}`);
            } else {
              console.warn(`[CoinGecko] No price found for ${id}`);
            }
          }
        });
        const totalTime = performance.now() - startTime;
        if (process.env.NODE_ENV === "development") {
          console.log(
            `[CoinGecko] Total time: ${totalTime.toFixed(
              2
            )}ms, prices:`,
            newPrices
          );
        }
        
        // Only update prices if we got valid data
        // Preserve existing prices for coins that weren't returned in this response
        setPrices((prevPrices) => {
          const mergedPrices = { ...prevPrices };
          coinIds.forEach((id) => {
            if (newPrices[id] !== null && newPrices[id] !== undefined) {
              mergedPrices[id] = newPrices[id];
            }
            // Keep existing price if new price is null/undefined (don't clear on partial failures)
          });
          return mergedPrices;
        });
      } catch (e: any) {
        if (cancelled) return;
        // Only log network errors in development, not in production
        if (process.env.NODE_ENV === "development") {
          console.warn(`Failed to fetch prices for ${coinIds.join(", ")}:`, e.message || "Network error");
        }
        setError(e.message || "Failed to fetch prices");
        // DON'T clear prices on error - preserve last known good prices
        // This prevents showing 0 when CoinGecko is temporarily unavailable
        // setPrices({}); // REMOVED: Keep existing prices
      } finally {
        if (cancelled) return;
        setIsLoading(false);
      }
    };

    fetchPrices();

    if (refreshInterval > 0) {
      intervalId = setInterval(() => {
        fetchPrices(0); // Reset retry count on scheduled refresh
      }, refreshInterval);
    }

    return () => {
      cancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (retryTimeoutId) {
        clearTimeout(retryTimeoutId);
      }
    };
  }, [coinIds, refreshInterval]);

  return { prices, isLoading, error };
}
