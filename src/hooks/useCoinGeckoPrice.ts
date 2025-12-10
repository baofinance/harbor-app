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
          `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
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
        console.error(`Failed to fetch price for ${coinId}:`, e);
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

    const fetchPrices = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const ids = coinIds.join(",");
        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (cancelled) return;

        const newPrices: Record<string, number | null> = {};
        coinIds.forEach((id) => {
          newPrices[id] = data[id]?.usd || null;
        });
        setPrices(newPrices);
      } catch (e: any) {
        if (cancelled) return;
        console.error(`Failed to fetch prices for ${coinIds.join(", ")}:`, e);
        setError(e.message || "Failed to fetch prices");
        setPrices({});
      } finally {
        if (cancelled) return;
        setIsLoading(false);
      }
    };

    fetchPrices();

    if (refreshInterval > 0) {
      intervalId = setInterval(fetchPrices, refreshInterval);
    }

    return () => {
      cancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [coinIds, refreshInterval]);

  return { prices, isLoading, error };
}
