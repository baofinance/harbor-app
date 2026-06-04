import { maidenVoyageCapUsd } from "@/config/maidenVoyageCap";
import { maidenVoyageYieldOwnerSharePercent } from "@/config/maidenVoyageYield";
import {
  getGenesisDepositCapData,
  type GenesisDepositCapData,
} from "@/utils/genesisDepositCap";

type MaidenVoyageCampaignResult = {
  genesisAddress?: string;
  data?: {
    cap?: {
      capUSD?: string;
      cumulativeDepositsUSD?: string;
      capFilled?: boolean;
    };
  } | null;
};

type MaidenVoyageMarksRow = {
  genesisAddress?: string;
  data?: { userHarborMarks?: unknown } | null;
};

export type CapDataSource = "subgraph" | "onchain_fallback";

export type GenesisVoyageCapDisplay = GenesisDepositCapData & {
  remaining: number;
  remainingUsd: number;
  filledPct: number;
  remainingPct: number;
  dataSource: CapDataSource;
  isLoading: boolean;
};

function enrichCap(
  base: GenesisDepositCapData,
  dataSource: CapDataSource,
  isLoading: boolean,
): GenesisVoyageCapDisplay {
  const remaining = Math.max(0, base.capTotal - base.capCurrent);
  const remainingUsd = Math.max(0, base.capTotalUsd - base.capCurrentUsd);
  const filledPct = Math.min(100, Math.max(0, base.progressPct));
  const remainingPct = Math.min(100, Math.max(0, 100 - filledPct));

  return {
    ...base,
    remaining,
    remainingUsd,
    filledPct,
    remainingPct,
    dataSource,
    isLoading,
  };
}

export type ResolveGenesisVoyageCapResult = {
  cap: GenesisVoyageCapDisplay | null;
  isLoading: boolean;
  isUnavailable: boolean;
};

export function resolveGenesisVoyageCapDisplay({
  genesisAddress,
  collateralSymbol,
  totalDepositsAmount,
  totalDepositsUsd,
  maidenVoyageCampaignResults,
  marksResults,
  genesisTokenCapAmount,
  readsLoaded,
  isLoadingCapIndex = false,
}: {
  genesisAddress?: string;
  collateralSymbol: string;
  totalDepositsAmount: number;
  totalDepositsUsd: number;
  maidenVoyageCampaignResults: MaidenVoyageCampaignResult[];
  marksResults: MaidenVoyageMarksRow[];
  genesisTokenCapAmount?: number;
  readsLoaded: boolean;
  isLoadingCapIndex?: boolean;
}): ResolveGenesisVoyageCapResult {
  if (!readsLoaded) {
    return { cap: null, isLoading: true, isUnavailable: false };
  }

  const fromIndexer = getGenesisDepositCapData({
    genesisAddress,
    collateralSymbol,
    totalDepositsAmount,
    maidenVoyageCampaignResults,
    marksResults,
    genesisTokenCapAmount,
  });

  if (fromIndexer) {
    return {
      cap: enrichCap(fromIndexer, "subgraph", isLoadingCapIndex),
      isLoading: false,
      isUnavailable: false,
    };
  }

  const configCapUsd = maidenVoyageCapUsd(genesisAddress?.toLowerCase() ?? null);
  if (configCapUsd && configCapUsd > 0) {
    const capCurrentUsd = totalDepositsUsd > 0 ? totalDepositsUsd : 0;
    const capTotalUsd = configCapUsd;
    const progressPct = Math.min(100, (capCurrentUsd / capTotalUsd) * 100);
    const capFilled = progressPct >= 100;

    const fallbackBase: GenesisDepositCapData = {
      useTokenCap: false,
      capCurrent: totalDepositsAmount,
      capTotal: capTotalUsd,
      progressPct,
      capFilled,
      capCurrentUsd,
      capTotalUsd,
      tokenCapAmount: 0,
      collateralSymbol,
      ownershipShare: 0,
      countedUsd: 0,
      yieldRevSharePct: maidenVoyageYieldOwnerSharePercent(
        genesisAddress?.toLowerCase() ?? null,
      ),
    };

    return {
      cap: enrichCap(fallbackBase, "onchain_fallback", isLoadingCapIndex),
      isLoading: false,
      isUnavailable: false,
    };
  }

  if (isLoadingCapIndex) {
    return { cap: null, isLoading: true, isUnavailable: false };
  }

  return { cap: null, isLoading: false, isUnavailable: true };
}
