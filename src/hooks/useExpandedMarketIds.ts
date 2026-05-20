import { useCallback, useState } from "react";

/** Toggle expanded market ids for index table rows. */
export function useExpandedMarketIds() {
  const [expandedMarkets, setExpandedMarkets] = useState<string[]>([]);

  const toggleExpandedMarket = useCallback((marketId: string) => {
    setExpandedMarkets((prev) =>
      prev.includes(marketId)
        ? prev.filter((id) => id !== marketId)
        : [...prev, marketId]
    );
  }, []);

  return { expandedMarkets, setExpandedMarkets, toggleExpandedMarket };
}
