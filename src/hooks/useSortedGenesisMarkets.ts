import { useMemo } from "react";
import {
  isGenesisOpenForActiveCampaign,
  isMarketArchived,
} from "@/config/markets";

interface UseSortedGenesisMarketsParams {
  genesisMarkets: Array<[string, any]>;
  reads: Array<any> | undefined;
  isConnected: boolean;
  marksResults: Array<any> | undefined;
}

const getMarketIndex = (genesisMarkets: Array<[string, any]>, id: string) =>
  genesisMarkets.findIndex((m) => m[0] === id);

const ACTIVE_CAMPAIGN_LABEL_ORDER = ["MegaETH", "USD"];

function cleanCampaignLabel(label: string): string {
  return label.replace(/\s+Maiden Voyage.*/i, "").trim() || label;
}

function resolveGenesisEnded(
  id: string,
  mkt: unknown,
  genesisMarkets: Array<[string, any]>,
  reads: Array<any> | undefined,
  isConnected: boolean,
  marksResults: Array<any> | undefined
): boolean {
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
      (mkt as { addresses?: { genesis?: string } }).addresses?.genesis?.toLowerCase()
  );
  const userMarksData = marksForMarket?.data?.userHarborMarks;
  const marks = Array.isArray(userMarksData) ? userMarksData[0] : userMarksData;
  const subgraphSaysEnded = marks?.genesisEnded;

  return contractSaysEnded !== undefined
    ? contractSaysEnded
    : subgraphSaysEnded ?? false;
}

function collectActiveCampaignNames(
  activeMarkets: Array<[string, any]>,
  genesisMarkets: Array<[string, any]>,
  reads: Array<any> | undefined,
  isConnected: boolean,
  marksResults: Array<any> | undefined
): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const [id, mkt] of activeMarkets) {
    const isEnded = resolveGenesisEnded(
      id,
      mkt,
      genesisMarkets,
      reads,
      isConnected,
      marksResults
    );
    if (!isGenesisOpenForActiveCampaign(mkt, isEnded)) continue;

    const raw = (mkt as { marksCampaign?: { label?: string } }).marksCampaign
      ?.label;
    if (!raw) continue;
    const clean = cleanCampaignLabel(raw);
    if (seen.has(clean)) continue;
    seen.add(clean);
    names.push(clean);
  }
  return names.sort((a, b) => {
    const rank = (label: string) => {
      const i = ACTIVE_CAMPAIGN_LABEL_ORDER.indexOf(label);
      return i === -1 ? ACTIVE_CAMPAIGN_LABEL_ORDER.length : i;
    };
    const dr = rank(a) - rank(b);
    return dr !== 0 ? dr : a.localeCompare(b);
  });
}

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
    const archivedLiveMarkets: Array<[string, any]> = [];
    const archivedCompletedMarkets: Array<[string, any, any]> = [];

    sortedMarkets.forEach(([id, mkt]) => {
      const archived = isMarketArchived(mkt);
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

      if (archived) {
        if (isEnded) {
          archivedCompletedMarkets.push([id, mkt, marks]);
        } else {
          archivedLiveMarkets.push([id, mkt]);
        }
        return;
      }

      if (isEnded) {
        completedMarkets.push([id, mkt, marks]);
      } else {
        activeMarkets.push([id, mkt]);
      }
    });

    const activeCampaignNames = collectActiveCampaignNames(
      activeMarkets,
      genesisMarkets,
      reads,
      isConnected,
      marksResults
    );

    return {
      sortedMarkets,
      activeMarkets,
      completedMarkets,
      archivedLiveMarkets,
      archivedCompletedMarkets,
      showHeaders,
      activeCampaignNames,
    };
  }, [genesisMarkets, reads, isConnected, marksResults]);
};
