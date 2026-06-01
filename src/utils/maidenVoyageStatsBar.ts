import type { MaidenVoyageConfidenceStats } from "@/utils/maidenVoyageConfidenceStats";
import { formatCompactUSD } from "@/utils/anchor";

export type MaidenVoyageStatsBarData = {
  featuredTvlUsd: number | null;
  featuredTvlLabel: string | null;
  voyageNumber: number;
  completedLaunchesCount: number;
};

export function computeMaidenVoyageStatsBarData({
  confidenceStats,
  activeDepositsUsd,
}: {
  confidenceStats: MaidenVoyageConfidenceStats;
  activeDepositsUsd: number | null;
}): MaidenVoyageStatsBarData {
  let featuredTvlUsd: number | null = null;

  const completed = confidenceStats.completedDepositsUsd;
  const active =
    activeDepositsUsd != null && activeDepositsUsd > 0
      ? activeDepositsUsd
      : 0;

  if (completed != null) {
    featuredTvlUsd = completed + active;
  } else if (activeDepositsUsd != null && activeDepositsUsd > 0) {
    featuredTvlUsd = activeDepositsUsd;
  }

  return {
    featuredTvlUsd,
    featuredTvlLabel:
      featuredTvlUsd != null && featuredTvlUsd > 0
        ? formatCompactUSD(featuredTvlUsd)
        : null,
    voyageNumber: confidenceStats.voyageNumber,
    completedLaunchesCount: confidenceStats.completedLaunchesCount,
  };
}
