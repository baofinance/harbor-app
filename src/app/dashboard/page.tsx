"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashboardCategorySummaryCards } from "@/components/dashboard/DashboardCategorySummaryCards";
import { DashboardConnectNotice } from "@/components/dashboard/DashboardConnectNotice";
import { DashboardMaidenVoyageWidget } from "@/components/dashboard/DashboardMaidenVoyageWidget";
import { DashboardPageTitleSection } from "@/components/dashboard/DashboardPageTitleSection";
import { DashboardPortfolioHero } from "@/components/dashboard/DashboardPortfolioHero";
import {
  DashboardProductCard,
  useDashboardProductExpanded,
} from "@/components/dashboard/DashboardProductCard";
import { DASHBOARD_PRODUCT_META } from "@/components/dashboard/dashboardProductMeta";
import {
  DASHBOARD_EMPTY_STATES,
  type DashboardPositionGroup,
} from "@/components/dashboard/dashboardPositionGroup";
import { DashboardPositionsList } from "@/components/dashboard/DashboardPositionsList";
import { DashboardAchievements } from "@/components/dashboard/engagement/DashboardAchievements";
import { DashboardActivityTimeline } from "@/components/dashboard/engagement/DashboardActivityTimeline";
import { DashboardFoundingTracker } from "@/components/dashboard/engagement/DashboardFoundingTracker";
import { DashboardJourneyMetrics } from "@/components/dashboard/engagement/DashboardJourneyMetrics";
import { DashboardMarketSpotlight } from "@/components/dashboard/engagement/DashboardMarketSpotlight";
import {
  DashboardModuleLayoutControls,
  useDashboardModuleLayout,
} from "@/components/dashboard/engagement/DashboardModuleLayoutControls";
import { DashboardOpportunityPanel } from "@/components/dashboard/engagement/DashboardOpportunityPanel";
import { DashboardPortfolioHealthWidget } from "@/components/dashboard/engagement/DashboardPortfolioHealthWidget";
import { DashboardRevenueHistory } from "@/components/dashboard/engagement/DashboardRevenueHistory";
import { DashboardYieldShareHub } from "@/components/dashboard/engagement/DashboardYieldShareHub";
import type { DashboardModuleId } from "@/components/dashboard/engagement/dashboardModuleLayout";
import { useDashboardEngagement } from "@/components/dashboard/engagement/useDashboardEngagement";
import {
  buildPortfolioAllocation,
} from "@/components/dashboard/portfolio/dashboardPortfolioUtils";
import { DashboardYieldShareCardList } from "@/components/dashboard/portfolio/DashboardYieldShareCardList";
import { PORTFOLIO_WIDGET_GRID_CLASS } from "@/components/dashboard/portfolio/portfolioStyles";
import { IndexMarksSubgraphErrorBanner } from "@/components/shared/IndexMarksSubgraphErrorBanner";
import { useDashboardActiveVoyage } from "@/hooks/useDashboardActiveVoyage";
import { useFounderMetrics } from "@/hooks/useFounderMetrics";
import {
  useDashboardPositions,
  type DashboardPositionRow,
} from "@/hooks/useDashboardPositions";
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
  productId: "maiden" | "earn" | "sail" | "archived";
  compact: boolean;
  isConnected: boolean;
  onManage: (row: DashboardPositionRow) => void;
};

function PositionProductCard({
  group,
  productId,
  compact,
  isConnected,
  onManage,
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

  return (
    <DashboardProductCard
      meta={DASHBOARD_PRODUCT_META[productId]}
      expanded={expanded}
      onToggle={() => setExpanded((v) => !v)}
      isConnected={isConnected}
      sectionTotalUsd={totalUsd}
      positionCount={group.rows.length}
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

  const hasArchived = archivedMaidenVoyageRows.length > 0;

  const positionGroups = useMemo((): DashboardPositionGroup[] => {
    const groups: DashboardPositionGroup[] = [
      {
        id: "maiden",
        title: "Maiden Voyage",
        rows: maidenVoyageRows,
        loading: posLoading.maidenVoyage,
        error: posErrors.maidenVoyage,
        emptyState: DASHBOARD_EMPTY_STATES.maiden,
      },
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
    maidenVoyageRows,
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

  const totalOutstanding = rows.reduce((sum, row) => sum + row.outstandingUSD, 0);
  const totalEarned = useMemo(
    () => rows.reduce((s, r) => s + r.totalEarnedUSD, 0),
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

  const handleClaimRewards = useCallback(() => {
    userToggledYield.current = true;
    setYieldExpanded(true);
    requestAnimationFrame(() => {
      yieldSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

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
    totalOutstanding,
    onClaim: handleClaimRewards,
    onYieldDetails: handleViewYieldDetails,
  });

  const revenueSharePct = rows.reduce((s, r) => s + r.yieldSharePct, 0);

  const maidenGroup = positionGroups.find((g) => g.id === "maiden")!;
  const earnGroup = positionGroups.find((g) => g.id === "earn")!;
  const sailGroup = positionGroups.find((g) => g.id === "sail")!;
  const archivedGroup = positionGroups.find((g) => g.id === "archived");

  const renderModule = (id: DashboardModuleId) => {
    switch (id) {
      case "portfolio":
        return (
          <div key="portfolio" className="space-y-2.5 sm:space-y-3">
            <DashboardPortfolioHero
              totalPositionValue={totalPortfolioValue}
              totalEarned={totalEarned}
              uncollected={totalOutstanding}
              isConnected={isConnected}
              isLoading={portfolioLoading}
              onClaimRewards={handleClaimRewards}
            />
            <DashboardCategorySummaryCards
              earnUsd={positionTotals.earn}
              earnCount={earnRows.length}
              sailUsd={positionTotals.sail}
              sailCount={leverageRows.length}
              archivedUsd={positionTotals.archived}
              archivedCount={archivedMaidenVoyageRows.length}
              allocationSlices={allocationSlices}
              isConnected={isConnected}
            />
            <div className="space-y-2.5 sm:space-y-3">
              <PositionProductCard
                group={maidenGroup}
                productId="maiden"
                compact={dashboardViewBasic}
                isConnected={isConnected}
                onManage={openPositionManage}
              />
              <PositionProductCard
                group={earnGroup}
                productId="earn"
                compact={dashboardViewBasic}
                isConnected={isConnected}
                onManage={openPositionManage}
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

      case "yield":
        return (
          <div key="yield" className="space-y-2.5 sm:space-y-3">
            <DashboardYieldShareHub
              hub={engagement.yieldHub}
              isConnected={isConnected}
              isLoading={isLoading}
              onViewDetails={handleViewYieldDetails}
            />
            <div ref={yieldSectionRef}>
              <DashboardProductCard
                meta={DASHBOARD_PRODUCT_META.yield}
                expanded={yieldExpanded}
                onToggle={toggleYieldShare}
                isConnected={isConnected}
                sectionTotalUsd={totalOutstanding}
                positionCount={rows.length}
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
          </div>
        );

      case "voyages":
        return (
          <div key="voyages" className="space-y-2.5 sm:space-y-3">
            <div className={PORTFOLIO_WIDGET_GRID_CLASS}>
              <DashboardMaidenVoyageWidget
                voyage={activeVoyage}
                userPositionUsd={positionTotals.maiden}
                isConnected={isConnected}
              />
              <DashboardMarketSpotlight
                voyage={activeVoyage}
                revenueAllocationPct={revenueSharePct > 0 ? revenueSharePct : null}
                isConnected={isConnected}
              />
            </div>
            <DashboardFoundingTracker
              founding={engagement.founding}
              isConnected={isConnected}
            />
          </div>
        );

      case "revenue":
        return (
          <DashboardRevenueHistory
            key="revenue"
            periods={engagement.revenuePeriods}
            sparkline={engagement.revenueSparkline}
            isConnected={isConnected}
            isLoading={isLoading}
          />
        );

      case "activity":
        return (
          <DashboardActivityTimeline
            key="activity"
            events={engagement.timeline}
            isConnected={isConnected}
          />
        );

      case "engagement":
        return (
          <div key="engagement" className="space-y-2.5 sm:space-y-3">
            <DashboardOpportunityPanel
              opportunities={engagement.opportunities}
              isConnected={isConnected}
            />
            <DashboardJourneyMetrics
              journey={engagement.journey}
              isConnected={isConnected}
              isLoading={isLoading}
            />
            <div className={PORTFOLIO_WIDGET_GRID_CLASS}>
              <DashboardPortfolioHealthWidget
                health={engagement.health}
                isConnected={isConnected}
              />
              <DashboardAchievements
                achievements={engagement.achievements}
                isConnected={isConnected}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="relative mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col font-sans text-white">
      <main className="mx-auto w-full max-w-[1600px] space-y-3 px-3 pb-6 pt-2 sm:space-y-3.5 sm:px-10 sm:pt-4">
        <div className="relative flex items-start justify-between gap-3">
          <DashboardPageTitleSection />
          <DashboardModuleLayoutControls
            order={moduleOrder}
            onOrderChange={setModuleOrder}
          />
        </div>

        {!isConnected ? <DashboardConnectNotice /> : null}

        <div className="space-y-3 sm:space-y-4">
          {moduleOrder.map((moduleId) => renderModule(moduleId))}
        </div>
      </main>
      {dashboardManageModals}
    </div>
  );
}
