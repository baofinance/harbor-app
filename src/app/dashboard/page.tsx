"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashboardConnectNotice } from "@/components/dashboard/DashboardConnectNotice";
import { DashboardPageTitleSection } from "@/components/dashboard/DashboardPageTitleSection";
import { DashboardPortfolioCategoryChips } from "@/components/dashboard/DashboardPortfolioCategoryChips";
import { DashboardPortfolioHero } from "@/components/dashboard/DashboardPortfolioHero";
import {
  DashboardProductCard,
  useDashboardProductExpanded,
} from "@/components/dashboard/DashboardProductCard";
import { DASHBOARD_PRODUCT_META } from "@/components/dashboard/dashboardProductMeta";
import {
  DASHBOARD_STAT_CHIP_BORDER_ARCHIVED_CLASS,
  DASHBOARD_STAT_CHIP_BORDER_EARN_CLASS,
  DASHBOARD_STAT_CHIP_BORDER_MAIDEN_CLASS,
  DASHBOARD_STAT_CHIP_BORDER_SAIL_CLASS,
} from "@/components/dashboard/dashboardStyles";
import {
  DASHBOARD_EMPTY_STATES,
  type DashboardPositionGroup,
} from "@/components/dashboard/dashboardPositionGroup";
import { DashboardPositionsList } from "@/components/dashboard/DashboardPositionsList";
import { DashboardActivitySection } from "@/components/dashboard/engagement/DashboardActivitySection";
import { DashboardActivityTimeline } from "@/components/dashboard/engagement/DashboardActivityTimeline";
import {
  DashboardModuleLayoutControls,
  useDashboardModuleLayout,
} from "@/components/dashboard/engagement/DashboardModuleLayoutControls";
import { DashboardOpportunityPanel } from "@/components/dashboard/engagement/DashboardOpportunityPanel";
import { DashboardRevenueHistory } from "@/components/dashboard/engagement/DashboardRevenueHistory";
import type { DashboardModuleId } from "@/components/dashboard/engagement/dashboardModuleLayout";
import { useDashboardEngagement } from "@/components/dashboard/engagement/useDashboardEngagement";
import {
  aggregateYieldShareSummary,
  buildEarnSummaryMetrics,
  buildPortfolioAllocation,
  buildPositionSummaryMetrics,
  buildRevenueShareSummaryMetrics,
} from "@/components/dashboard/portfolio/dashboardPortfolioUtils";
import { DashboardYieldShareCardList } from "@/components/dashboard/portfolio/DashboardYieldShareCardList";
import { IndexMarksSubgraphErrorBanner } from "@/components/shared/IndexMarksSubgraphErrorBanner";
import { useDashboardActiveVoyage } from "@/hooks/useDashboardActiveVoyage";
import { useFounderMetrics } from "@/hooks/useFounderMetrics";
import {
  useDashboardPositions,
  type DashboardPositionRow,
} from "@/hooks/useDashboardPositions";
import { useDashboardEarnClaimable } from "@/hooks/useDashboardEarnClaimable";
import { useDashboardManageModals } from "@/hooks/useDashboardManageModals";
import { usePageLayoutPreference } from "@/contexts/PageLayoutPreferenceContext";

function sumRowsUsd(rows: DashboardPositionRow[]): number {
  return rows.reduce((s, r) => s + r.usd, 0);
}

function defaultPositionExpanded(
  compact: boolean,
  rows: DashboardPositionRow[],
  loading: boolean,
): boolean {
  if (compact) return false;
  return rows.length > 0 || loading;
}

type PositionProductCardProps = {
  group: DashboardPositionGroup;
  productId: "earn" | "sail" | "archived";
  compact: boolean;
  isConnected: boolean;
  onManage: (row: DashboardPositionRow) => void;
  earnClaimableUsd?: number;
  earnClaimableLoading?: boolean;
};

function PositionProductCard({
  group,
  productId,
  compact,
  isConnected,
  onManage,
  earnClaimableUsd = 0,
  earnClaimableLoading = false,
}: PositionProductCardProps) {
  const defaultExpanded =
    productId === "archived"
      ? !compact && group.rows.length > 0
      : defaultPositionExpanded(compact, group.rows, group.loading);
  const [expanded, setExpanded] = useDashboardProductExpanded(defaultExpanded);
  const totalUsd = useMemo(
    () => group.rows.reduce((sum, row) => sum + row.usd, 0),
    [group.rows],
  );

  const summaryMetrics = useMemo(() => {
    if (productId === "earn") {
      return buildEarnSummaryMetrics({
        isConnected,
        loading: group.loading,
        valueUsd: totalUsd,
        positionCount: group.rows.length,
        earnedUsd: earnClaimableUsd,
        earnedLoading: earnClaimableLoading,
      });
    }
    return buildPositionSummaryMetrics({
      isConnected,
      loading: group.loading,
      valueUsd: totalUsd,
      positionCount: group.rows.length,
    });
  }, [
    productId,
    isConnected,
    group.loading,
    group.rows.length,
    totalUsd,
    earnClaimableUsd,
    earnClaimableLoading,
  ]);

  return (
    <DashboardProductCard
      meta={DASHBOARD_PRODUCT_META[productId]}
      expanded={expanded}
      onToggle={() => setExpanded((v) => !v)}
      isConnected={isConnected}
      summaryMetrics={summaryMetrics}
      loading={group.loading}
    >
      {group.error ? (
        <IndexMarksSubgraphErrorBanner error={new Error(group.error)} />
      ) : null}
      <DashboardPositionsList
        rows={group.rows}
        loading={isConnected && group.loading}
        error={null}
        emptyState={group.emptyState}
        onManage={onManage}
        loadingSkeletonCount={group.rows.length === 0 ? 1 : 3}
      />
    </DashboardProductCard>
  );
}

export default function DashboardPage() {
  const { isBasic: dashboardViewBasic } = usePageLayoutPreference();
  const { rows, isLoading, error, isConnected } = useFounderMetrics();
  const activeVoyage = useDashboardActiveVoyage();
  const {
    maidenVoyageRows,
    archivedMaidenVoyageRows,
    earnRows,
    leverageRows,
    isLoading: posLoading,
    errors: posErrors,
  } = useDashboardPositions();
  const { earnClaimableUsd, isLoading: earnClaimableLoading } =
    useDashboardEarnClaimable();
  const { openPositionManage, modals: dashboardManageModals } =
    useDashboardManageModals();
  const { order: moduleOrder, setOrder: setModuleOrder } = useDashboardModuleLayout();

  const userToggledYield = useRef(false);
  const yieldSectionRef = useRef<HTMLDivElement>(null);

  const positionTotals = useMemo(() => {
    const maiden = sumRowsUsd(maidenVoyageRows);
    const archived = sumRowsUsd(archivedMaidenVoyageRows);
    const earn = sumRowsUsd(earnRows);
    const sail = sumRowsUsd(leverageRows);
    return { maiden, archived, earn, sail };
  }, [maidenVoyageRows, archivedMaidenVoyageRows, earnRows, leverageRows]);

  const totalPortfolioValue = useMemo(
    () =>
      positionTotals.maiden +
      positionTotals.earn +
      positionTotals.sail +
      positionTotals.archived,
    [positionTotals],
  );

  const allPositionRows = useMemo(
    () => [
      ...maidenVoyageRows,
      ...earnRows,
      ...leverageRows,
      ...archivedMaidenVoyageRows,
    ],
    [maidenVoyageRows, earnRows, leverageRows, archivedMaidenVoyageRows],
  );

  const allocationSlices = useMemo(
    () =>
      buildPortfolioAllocation({
        maidenUsd: positionTotals.maiden,
        earnUsd: positionTotals.earn,
        sailUsd: positionTotals.sail,
        archivedUsd: positionTotals.archived,
      }),
    [positionTotals],
  );

  const portfolioChips = useMemo(
    () => [
      {
        id: "earn",
        label: "Earn",
        usd: positionTotals.earn,
        borderClass: DASHBOARD_STAT_CHIP_BORDER_EARN_CLASS,
      },
      {
        id: "sail",
        label: "Sail",
        usd: positionTotals.sail,
        borderClass: DASHBOARD_STAT_CHIP_BORDER_SAIL_CLASS,
      },
      {
        id: "archived",
        label: "Archived",
        usd: positionTotals.archived,
        borderClass: DASHBOARD_STAT_CHIP_BORDER_ARCHIVED_CLASS,
      },
      {
        id: "maiden",
        label: "Maiden Voyage",
        usd: positionTotals.maiden,
        borderClass: DASHBOARD_STAT_CHIP_BORDER_MAIDEN_CLASS,
      },
    ],
    [positionTotals],
  );

  const hasArchived = archivedMaidenVoyageRows.length > 0;

  const positionGroups = useMemo((): DashboardPositionGroup[] => {
    const groups: DashboardPositionGroup[] = [
      {
        id: "earn",
        title: "Earn",
        rows: earnRows,
        loading: posLoading.anchor,
        error: posErrors.anchor,
        emptyState: DASHBOARD_EMPTY_STATES.earn,
      },
      {
        id: "sail",
        title: "Sail",
        rows: leverageRows,
        loading: posLoading.leverage,
        error: posErrors.leverage,
        emptyState: DASHBOARD_EMPTY_STATES.sail,
      },
    ];

    if (hasArchived) {
      groups.push({
        id: "archived",
        title: "Archived",
        rows: archivedMaidenVoyageRows,
        loading: posLoading.maidenVoyage,
        error: posErrors.maidenVoyage,
        emptyState: DASHBOARD_EMPTY_STATES.archived,
      });
    }

    return groups;
  }, [
    earnRows,
    leverageRows,
    archivedMaidenVoyageRows,
    hasArchived,
    posLoading,
    posErrors,
  ]);

  const [yieldExpanded, setYieldExpanded] = useState(false);

  useEffect(() => {
    if (dashboardViewBasic) {
      if (!userToggledYield.current) {
        setYieldExpanded(false);
      }
      return;
    }
    if (userToggledYield.current) return;
    if (isConnected && rows.length > 0) {
      setYieldExpanded(true);
    }
  }, [dashboardViewBasic, isConnected, rows.length, setYieldExpanded]);

  const totalEarned = useMemo(
    () => rows.reduce((s, r) => s + r.totalEarnedUSD, 0),
    [rows],
  );

  const revenueShareSummary = useMemo(
    () => aggregateYieldShareSummary(rows),
    [rows],
  );

  const portfolioLoading =
    isConnected &&
    (isLoading ||
      posLoading.anchor ||
      posLoading.maidenVoyage ||
      posLoading.leverage);

  const toggleYieldShare = () => {
    userToggledYield.current = true;
    setYieldExpanded((v) => !v);
  };

  const handleViewYieldDetails = useCallback(() => {
    userToggledYield.current = true;
    setYieldExpanded(true);
    requestAnimationFrame(() => {
      yieldSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const engagement = useDashboardEngagement({
    yieldRows: rows,
    maidenRows: maidenVoyageRows,
    archivedRows: archivedMaidenVoyageRows,
    allPositionRows,
    activeVoyage,
    positionTotals,
    totalEarned,
    totalOutstanding: rows.reduce((sum, row) => sum + row.outstandingUSD, 0),
    onYieldDetails: handleViewYieldDetails,
  });

  const earnGroup = positionGroups.find((g) => g.id === "earn")!;
  const sailGroup = positionGroups.find((g) => g.id === "sail")!;
  const archivedGroup = positionGroups.find((g) => g.id === "archived");

  const revenueShareSummaryMetrics = useMemo(
    () =>
      buildRevenueShareSummaryMetrics({
        isConnected,
        loading: isConnected && isLoading,
        marketCount: revenueShareSummary.marketCount,
        earnedUsd: revenueShareSummary.revenueEarned,
        pendingDistributionUsd: revenueShareSummary.pendingDistributionUsd,
      }),
    [isConnected, isLoading, revenueShareSummary],
  );

  const latestActivityEvent = engagement.timeline[0] ?? null;

  const yieldShareSection = (
    <div ref={yieldSectionRef} className="space-y-2">
      <DashboardProductCard
        meta={DASHBOARD_PRODUCT_META.yield}
        expanded={yieldExpanded}
        onToggle={toggleYieldShare}
        isConnected={isConnected}
        summaryMetrics={revenueShareSummaryMetrics}
        loading={isConnected && isLoading}
      >
        {error ? (
          <IndexMarksSubgraphErrorBanner error={new Error(error)} />
        ) : null}
        <DashboardYieldShareCardList
          rows={rows}
          isLoading={isConnected && isLoading}
          error={null}
        />
      </DashboardProductCard>
    </div>
  );

  const renderModule = (id: DashboardModuleId) => {
    switch (id) {
      case "portfolio":
        return (
          <div key="portfolio" className="space-y-3">
            <DashboardPortfolioHero
              totalPositionValue={totalPortfolioValue}
              activePositionCount={allPositionRows.length}
              allocationSlices={allocationSlices}
              revenueShareYieldUsd={totalEarned}
              earnYieldUsd={earnClaimableUsd}
              isConnected={isConnected}
              isLoading={portfolioLoading}
              isEarnLoading={earnClaimableLoading}
            />
            <DashboardPortfolioCategoryChips
              chips={portfolioChips}
              isConnected={isConnected}
              isLoading={portfolioLoading}
            />
            <div className="mt-6 pt-1 sm:mt-8">{yieldShareSection}</div>
            <div className="space-y-2">
              <PositionProductCard
                group={earnGroup}
                productId="earn"
                compact={dashboardViewBasic}
                isConnected={isConnected}
                onManage={openPositionManage}
                earnClaimableUsd={earnClaimableUsd}
                earnClaimableLoading={earnClaimableLoading}
              />
              <PositionProductCard
                group={sailGroup}
                productId="sail"
                compact={dashboardViewBasic}
                isConnected={isConnected}
                onManage={openPositionManage}
              />
              {archivedGroup ? (
                <PositionProductCard
                  group={archivedGroup}
                  productId="archived"
                  compact={dashboardViewBasic}
                  isConnected={isConnected}
                  onManage={openPositionManage}
                />
              ) : null}
            </div>
          </div>
        );

      case "activity":
        return (
          <DashboardActivitySection
            key="activity"
            defaultExpanded={false}
            isConnected={isConnected}
            latestEvent={
              latestActivityEvent
                ? {
                    label: latestActivityEvent.label,
                    relativeLabel: latestActivityEvent.relativeLabel,
                  }
                : null
            }
          >
            <DashboardActivityTimeline
              events={engagement.timeline}
              isConnected={isConnected}
            />
            <DashboardRevenueHistory
              periods={engagement.revenuePeriods}
              sparkline={engagement.revenueSparkline}
              isConnected={isConnected}
              isLoading={isLoading}
            />
            <DashboardOpportunityPanel
              opportunities={engagement.opportunities}
              isConnected={isConnected}
            />
          </DashboardActivitySection>
        );

      default:
        return null;
    }
  };

  return (
    <div className="relative mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col font-sans text-white">
      <main className="mx-auto w-full max-w-[1600px] space-y-3 px-3 pb-6 pt-2 sm:px-10 sm:pt-4">
        <div className="relative flex items-start justify-between gap-3">
          <DashboardPageTitleSection />
          <DashboardModuleLayoutControls
            order={moduleOrder}
            onOrderChange={setModuleOrder}
          />
        </div>

        {!isConnected ? <DashboardConnectNotice /> : null}

        <div className="space-y-3">
          {moduleOrder.map((moduleId) => renderModule(moduleId))}
        </div>
      </main>
      {dashboardManageModals}
    </div>
  );
}
