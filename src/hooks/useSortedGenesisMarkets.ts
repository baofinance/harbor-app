import { useMemo } from "react";

interface UseSortedGenesisMarketsParams {
  genesisMarkets: Array<[string, any]>;
  reads: Array<any> | undefined;
  isConnected: boolean;
  marksResults: Array<any> | undefined;
}

const getMarketIndex = (genesisMarkets: Array<[string, any]>, id: string) =>
  genesisMarkets.findIndex((m) => m[0] === id);

export const useSortedGenesisMarkets = ({
  genesisMarkets,
  reads,
  isConnected,
  marksResults,
}: UseSortedGenesisMarketsParams) => {
  return useMemo(() => {
    // Sort markets: running first, then completed
    // Within each group, markets with deposits first
    const sortedMarkets = [...genesisMarkets].sort((a, b) => {
      const miA = getMarketIndex(genesisMarkets, a[0]);
      const miB = getMarketIndex(genesisMarkets, b[0]);

      const baseOffsetA = miA * (isConnected ? 3 : 1);
      const baseOffsetB = miB * (isConnected ? 3 : 1);

      const isEndedA = (reads?.[baseOffsetA]?.result as boolean) ?? false;
      const isEndedB = (reads?.[baseOffsetB]?.result as boolean) ?? false;

      if (isEndedA && !isEndedB) return 1;
      if (!isEndedA && isEndedB) return -1;

      const userDepositA = isConnected
        ? (reads?.[baseOffsetA + 1]?.result as bigint | undefined)
        : undefined;
      const userDepositB = isConnected
        ? (reads?.[baseOffsetB + 1]?.result as bigint | undefined)
        : undefined;

      const hasDepositA = userDepositA && userDepositA > 0n;
      const hasDepositB = userDepositB && userDepositB > 0n;

      if (hasDepositA && !hasDepositB) return -1;
      if (!hasDepositA && hasDepositB) return 1;

      return 0;
    });

    const hasEndedMarkets = sortedMarkets.some((market) => {
      const mi = getMarketIndex(genesisMarkets, market[0]);
      const baseOffset = mi * (isConnected ? 3 : 1);
      const isEnded = (reads?.[baseOffset]?.result as boolean) ?? false;
      return isEnded;
    });

    const hasLiveMarkets = sortedMarkets.some((market) => {
      const mi = getMarketIndex(genesisMarkets, market[0]);
      const baseOffset = mi * (isConnected ? 3 : 1);
      return !((reads?.[baseOffset]?.result as boolean) ?? false);
    });

    const showHeaders =
      (hasEndedMarkets && hasLiveMarkets) || hasLiveMarkets || hasEndedMarkets;

    const activeMarkets: Array<[string, any]> = [];
    const completedMarkets: Array<[string, any, any]> = [];

    sortedMarkets.forEach(([id, mkt]) => {
      const mi = getMarketIndex(genesisMarkets, id);
      const baseOffset = mi * (isConnected ? 3 : 1);
      const contractReadResult = reads?.[baseOffset];
      const contractSaysEnded =
        contractReadResult?.status === "success"
          ? (contractReadResult.result as boolean)
          : undefined;

      const marksForMarket = marksResults?.find(
        (marks) =>
          marks.genesisAddress?.toLowerCase() ===
          (mkt as any).addresses?.genesis?.toLowerCase()
      );
      const userMarksData = marksForMarket?.data?.userHarborMarks;
      const marks = Array.isArray(userMarksData) ? userMarksData[0] : userMarksData;
      const subgraphSaysEnded = marks?.genesisEnded;

      const isEnded =
        contractSaysEnded !== undefined ? contractSaysEnded : subgraphSaysEnded ?? false;

      if (isEnded) {
        completedMarkets.push([id, mkt, marks]);
      } else {
        activeMarkets.push([id, mkt]);
      }
    });

    const activeCampaignName =
      activeMarkets.length > 0
        ? (() => {
            const firstMarketConfig = activeMarkets[0][1] as any;
            const campaignLabel =
              firstMarketConfig?.marksCampaign?.label || "Genesis";
            return (
              campaignLabel.replace(/\s+Maiden Voyage.*/i, "").trim() ||
              campaignLabel
            );
          })()
        : null;

    return {
      sortedMarkets,
      activeMarkets,
      completedMarkets,
      showHeaders,
      activeCampaignName,
    };
  }, [genesisMarkets, reads, isConnected, marksResults]);
};
