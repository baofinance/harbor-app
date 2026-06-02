import type { MaidenVoyageConfidenceStats } from "@/utils/maidenVoyageConfidenceStats";
import { formatCompactUSD } from "@/utils/anchor";

export type MaidenVoyageStatsBarData = {
  featuredTvlUsd: number | null;
  featuredTvlLabel: string;
  voyageNumber: number;
  completedLaunchesCount: number;
};

function resolveFeaturedTvlLabel({
  featuredTvlUsd,
  activeDepositsUsd,
  activeCapTotalUsd,
}: {
  featuredTvlUsd: number | null;
  activeDepositsUsd: number | null;
  activeCapTotalUsd: number | null;
}): string {
  if (featuredTvlUsd != null && featuredTvlUsd > 0) {
    return formatCompactUSD(featuredTvlUsd);
  }
  if (activeDepositsUsd != null && activeDepositsUsd > 0) {
    return formatCompactUSD(activeDepositsUsd);
  }
  if (activeCapTotalUsd != null && activeCapTotalUsd > 0) {
    return `Cap ${formatCompactUSD(activeCapTotalUsd)}`;
  }
  return "$0";
}

export function computeMaidenVoyageStatsBarData({
  confidenceStats,
  activeDepositsUsd,
  activeCapTotalUsd = null,
}: {
  confidenceStats: MaidenVoyageConfidenceStats;
  activeDepositsUsd: number | null;
  activeCapTotalUsd?: number | null;
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

  const featuredTvlLabel = resolveFeaturedTvlLabel({
    featuredTvlUsd,
    activeDepositsUsd,
    activeCapTotalUsd,
  });

  return {
    featuredTvlUsd,
    featuredTvlLabel,
    voyageNumber: confidenceStats.voyageNumber,
    completedLaunchesCount: confidenceStats.completedLaunchesCount,
  };
}
