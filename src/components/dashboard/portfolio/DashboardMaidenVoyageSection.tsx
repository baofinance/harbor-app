"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FounderMetricRow } from "@/hooks/useFounderMetrics";
import type { DashboardPositionRow } from "@/hooks/useDashboardPositions";
import { founderMetricRowHasRevenueShare } from "@/utils/founderMetrics";
import { IndexMarksSubgraphErrorBanner } from "@/components/shared/IndexMarksSubgraphErrorBanner";
import { DashboardProductCard } from "../DashboardProductCard";
import { DASHBOARD_PRODUCT_META } from "../dashboardProductMeta";
import { DashboardPositionsList } from "../DashboardPositionsList";
import { DASHBOARD_GROUP_LABEL_CLASS } from "../dashboardStyles";
import { DASHBOARD_EMPTY_REVENUE_SHARE_ACCENT_CLASS } from "../dashboardBrand";
import {
  aggregateYieldShareSummary,
  buildMaidenVoyageCombinedSummaryMetrics,
} from "./dashboardPortfolioUtils";
import { DashboardYieldShareCardList } from "./DashboardYieldShareCardList";
import { DashboardEmptyState } from "./DashboardEmptyState";

export type DashboardMaidenVoyageSectionProps = {
  compact: boolean;
  isConnected: boolean;
  maidenRows: DashboardPositionRow[];
  maidenLoading: boolean;
  maidenError: string | null;
  yieldRows: FounderMetricRow[];
  yieldLoading: boolean;
  yieldError: string | null;
};

function defaultExpanded(
  compact: boolean,
  maidenRows: DashboardPositionRow[],
  revenueShareRows: FounderMetricRow[],
  maidenLoading: boolean,
  yieldLoading: boolean,
): boolean {
  if (compact) return false;
  return (
    maidenRows.length > 0 ||
    revenueShareRows.length > 0 ||
    maidenLoading ||
    yieldLoading
  );
}

export function DashboardMaidenVoyageSection({
  compact,
  isConnected,
  maidenRows,
  maidenLoading,
  maidenError,
  yieldRows,
  yieldLoading,
  yieldError,
}: DashboardMaidenVoyageSectionProps) {
  const eligibleYieldRows = useMemo(
    () => yieldRows.filter(founderMetricRowHasRevenueShare),
    [yieldRows],
  );

  const userToggled = useRef(false);
  const [expanded, setExpanded] = useState(() =>
    defaultExpanded(
      compact,
      maidenRows,
      eligibleYieldRows,
      maidenLoading,
      yieldLoading,
    ),
  );

  useEffect(() => {
    if (compact) {
      if (!userToggled.current) {
        setExpanded(false);
      }
      return;
    }
    if (userToggled.current) return;
    if (
      isConnected &&
      (maidenRows.length > 0 || eligibleYieldRows.length > 0)
    ) {
      setExpanded(true);
    }
  }, [
    compact,
    isConnected,
    maidenRows.length,
    eligibleYieldRows.length,
    setExpanded,
  ]);

  const revenueShareSummary = useMemo(
    () => aggregateYieldShareSummary(eligibleYieldRows),
    [eligibleYieldRows],
  );

  const activeMaidenUsd = useMemo(
    () => maidenRows.reduce((sum, row) => sum + row.usd, 0),
    [maidenRows],
  );

  const summaryMetrics = useMemo(
    () =>
      buildMaidenVoyageCombinedSummaryMetrics({
        isConnected,
        loading: isConnected && yieldLoading,
        maidenLoading: isConnected && maidenLoading,
        activeMaidenCount: maidenRows.length,
        activeMaidenUsd: activeMaidenUsd,
        earnedUsd: revenueShareSummary.revenueEarned,
        pendingDistributionUsd: revenueShareSummary.pendingDistributionUsd,
      }),
    [
      isConnected,
      yieldLoading,
      maidenLoading,
      maidenRows.length,
      activeMaidenUsd,
      revenueShareSummary,
    ],
  );

  const loading = isConnected && (maidenLoading || yieldLoading);
  const showActiveVoyages =
    maidenLoading || maidenRows.length > 0;
  const showRevenueShare =
    yieldLoading || eligibleYieldRows.length > 0;
  const showBothSubsections =
    !loading &&
    maidenRows.length > 0 &&
    eligibleYieldRows.length > 0;
  const showUnifiedEmpty =
    isConnected &&
    !maidenLoading &&
    !yieldLoading &&
    maidenRows.length === 0 &&
    eligibleYieldRows.length === 0;

  const toggleExpanded = () => {
    userToggled.current = true;
    setExpanded((value) => !value);
  };

  return (
    <DashboardProductCard
      meta={DASHBOARD_PRODUCT_META.yield}
      expanded={expanded}
      onToggle={toggleExpanded}
      isConnected={isConnected}
      summaryMetrics={summaryMetrics}
      loading={loading}
    >
      {maidenError ? (
        <IndexMarksSubgraphErrorBanner error={new Error(maidenError)} />
      ) : null}
      {yieldError ? (
        <IndexMarksSubgraphErrorBanner error={new Error(yieldError)} />
      ) : null}

      {showUnifiedEmpty ? (
        <DashboardEmptyState
          title="Your maiden voyage starts here"
          message="Join an active voyage to earn founding revenue — completed voyages continue earning as revenue share."
          trustLine="Ownership entitles you to a share of protocol revenue when genesis ends."
          href="/genesis"
          linkLabel="Explore maiden voyages"
          positionCount={0}
          compact
          accentBorderClass={DASHBOARD_EMPTY_REVENUE_SHARE_ACCENT_CLASS}
        />
      ) : (
        <div className="space-y-4">
          {showActiveVoyages ? (
            <div className="space-y-2">
              {showBothSubsections ? (
                <p className={DASHBOARD_GROUP_LABEL_CLASS}>Active voyages</p>
              ) : null}
              <DashboardPositionsList
                rows={maidenRows}
                loading={isConnected && maidenLoading}
                error={null}
                loadingSkeletonCount={maidenRows.length === 0 ? 1 : 3}
              />
            </div>
          ) : null}

          {showRevenueShare ? (
            <div className="space-y-2">
              {showBothSubsections ? (
                <p className={DASHBOARD_GROUP_LABEL_CLASS}>Revenue share</p>
              ) : null}
              <DashboardYieldShareCardList
                rows={yieldRows}
                isLoading={isConnected && yieldLoading}
                error={null}
                hideEmptyState
              />
            </div>
          ) : null}
        </div>
      )}
    </DashboardProductCard>
  );
}
