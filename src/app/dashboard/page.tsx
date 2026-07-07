"use client";

import { useMemo } from "react";
import { DashboardConnectNotice } from "@/components/dashboard/DashboardConnectNotice";
import { DashboardTideLiveBanner } from "@/components/dashboard/DashboardTideLiveBanner";
import { DashboardPortfolioHero } from "@/components/dashboard/DashboardPortfolioHero";
import { DashboardProductCard, useDashboardProductExpanded } from "@/components/dashboard/DashboardProductCard";
import { DashboardPositionsList } from "@/components/dashboard/DashboardPositionsList";
import { DASHBOARD_PRODUCT_META } from "@/components/dashboard/dashboardProductMeta";
import { DASHBOARD_GAP_CATEGORY } from "@/components/dashboard/dashboardDensity";
import {
  DASHBOARD_EMPTY_STATES,
  type DashboardPositionGroup,
} from "@/components/dashboard/dashboardPositionGroup";
import { DashboardActivitySection } from "@/components/dashboard/engagement/DashboardActivitySection";
import {
  DashboardModuleLayoutControls,
  useDashboardModuleLayout,
} from "@/components/dashboard/engagement/DashboardModuleLayoutControls";
import type { DashboardModuleId } from "@/components/dashboard/engagement/dashboardModuleLayout";
import { useDashboardEngagement } from "@/components/dashboard/engagement/useDashboardEngagement";
import {
  buildEarnSummaryMetrics,
  buildPortfolioAllocation,
  buildPositionSummaryMetrics,
} from "@/components/dashboard/portfolio/dashboardPortfolioUtils";
import { DashboardMaidenVoyageSection } from "@/components/dashboard/portfolio/DashboardMaidenVoyageSection";
import { IndexMarksSubgraphErrorBanner } from "@/components/shared/IndexMarksSubgraphErrorBanner";
import { HarborPageShell } from "@/components/shared/HarborPageShell";
import { useDashboardActiveVoyage } from "@/hooks/useDashboardActiveVoyage";
import { useFounderMetrics } from "@/hooks/useFounderMetrics";
import {
  useDashboardPositions,
  type DashboardPositionRow,
} from "@/hooks/useDashboardPositions";
import { useDashboardEarnClaimable } from "@/hooks/useDashboardEarnClaimable";
import { useDashboardManageModals } from "@/hooks/useDashboardManageModals";

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
  earnClaimableUsd?: number;
  earnClaimableLoading?: boolean;
  onManage?: (row: DashboardPositionRow) => void;
  showWithdrawNotice?: boolean;
};

function PositionProductCard({
  group,
  productId,
  compact,
  isConnected,
  earnClaimableUsd = 0,
  earnClaimableLoading = false,
  onManage,
  showWithdrawNotice = false,
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
        loadingSkeletonCount={group.rows.length === 0 ? 1 : 3}
        onManage={onManage}
        showWithdrawNotice={showWithdrawNotice}
        showPnLColumn={productId === "sail"}
        showAprColumn={productId === "earn"}
      />
    </DashboardProductCard>
  );
}

export default function DashboardPage() {
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
  const { openPositionManage, modals } = useDashboardManageModals();
  const { order: moduleOrder, setOrder: setModuleOrder } = useDashboardModuleLayout();

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

  const engagement = useDashboardEngagement({
    yieldRows: rows,
    maidenRows: maidenVoyageRows,
    archivedRows: archivedMaidenVoyageRows,
    allPositionRows,
    activeVoyage,
    positionTotals,
    totalEarned,
    totalOutstanding: rows.reduce((sum, row) => sum + row.outstandingUSD, 0),
  });

  const earnGroup = positionGroups.find((g) => g.id === "earn")!;
  const sailGroup = positionGroups.find((g) => g.id === "sail")!;
  const archivedGroup = positionGroups.find((g) => g.id === "archived");

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
            <div className={DASHBOARD_GAP_CATEGORY}>
              <DashboardMaidenVoyageSection
                compact={false}
                isConnected={isConnected}
                maidenRows={maidenVoyageRows}
                maidenLoading={posLoading.maidenVoyage}
                maidenError={posErrors.maidenVoyage}
                yieldRows={rows}
                yieldLoading={isLoading}
                yieldError={error}
              />
              <PositionProductCard
                group={earnGroup}
                productId="earn"
                compact={false}
                isConnected={isConnected}
                earnClaimableUsd={earnClaimableUsd}
                earnClaimableLoading={earnClaimableLoading}
              />
              <PositionProductCard
                group={sailGroup}
                productId="sail"
                compact={false}
                isConnected={isConnected}
              />
              {archivedGroup ? (
                <PositionProductCard
                  group={archivedGroup}
                  productId="archived"
                  compact={false}
                  isConnected={isConnected}
                  onManage={openPositionManage}
                  showWithdrawNotice
                />
              ) : null}
            </div>
          </div>
        );

      case "activity":
        return (
          <DashboardActivitySection
            key="activity"
            events={engagement.timeline}
            isConnected={isConnected}
          />
        );

      default:
        return null;
    }
  };

  return (
    <HarborPageShell mainClassName="space-y-3 max-sm:!px-3">
      {!isConnected ? (
        <DashboardConnectNotice />
      ) : (
        <>
          <div className="relative flex items-start justify-end">
            <DashboardModuleLayoutControls
              order={moduleOrder}
              onOrderChange={setModuleOrder}
            />
          </div>

          <DashboardTideLiveBanner />

          <div className="space-y-4">
            {moduleOrder.map((moduleId) => renderModule(moduleId))}
          </div>
        </>
      )}
      {modals}
    </HarborPageShell>
  );
}
