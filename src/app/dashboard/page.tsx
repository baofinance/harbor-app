"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DashboardConnectNotice } from "@/components/dashboard/DashboardConnectNotice";
import { DashboardPageTitleSection } from "@/components/dashboard/DashboardPageTitleSection";
import {
  DashboardProductCard,
  useDashboardProductExpanded,
} from "@/components/dashboard/DashboardProductCard";
import { DASHBOARD_PRODUCT_META } from "@/components/dashboard/dashboardProductMeta";
import type { DashboardPositionGroup } from "@/components/dashboard/dashboardPositionGroup";
import { DashboardPositionsList } from "@/components/dashboard/DashboardPositionsList";
import { DashboardPageStats } from "@/components/dashboard/DashboardPageStats";
import { DashboardYieldShareList } from "@/components/dashboard/DashboardYieldShareList";
import { DASHBOARD_LINK_CLASS } from "@/components/dashboard/dashboardStyles";
import { IndexMarksSubgraphErrorBanner } from "@/components/shared/IndexMarksSubgraphErrorBanner";
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

function emptyHintWithLink(message: string, href: string, linkLabel: string): ReactNode {
  return (
    <>
      {message}{" "}
      <Link href={href} className={DASHBOARD_LINK_CLASS}>
        {linkLabel}
      </Link>
    </>
  );
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
    [group.rows]
  );

  return (
    <DashboardProductCard
      meta={DASHBOARD_PRODUCT_META[productId]}
      expanded={expanded}
      onToggle={() => setExpanded((v) => !v)}
      isConnected={isConnected}
      sectionTotalUsd={totalUsd}
      loading={group.loading}
    >
      {group.error ? (
        <IndexMarksSubgraphErrorBanner error={new Error(group.error)} />
      ) : null}
      <DashboardPositionsList
        rows={group.rows}
        loading={isConnected && group.loading}
        error={null}
        emptyHint={group.emptyHint}
        showColumnHeader
        onManage={onManage}
      />
    </DashboardProductCard>
  );
}

export default function DashboardPage() {
  const { isBasic: dashboardViewBasic } = usePageLayoutPreference();
  const { rows, isLoading, error, isConnected } = useFounderMetrics();
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

  const userToggledYield = useRef(false);

  const positionTotals = useMemo(() => {
    const maiden = sumRowsUsd(maidenVoyageRows);
    const archived = sumRowsUsd(archivedMaidenVoyageRows);
    const earn = sumRowsUsd(earnRows);
    const sail = sumRowsUsd(leverageRows);
    return { maiden, archived, earn, sail };
  }, [maidenVoyageRows, archivedMaidenVoyageRows, earnRows, leverageRows]);

  const hasArchived = archivedMaidenVoyageRows.length > 0;

  const positionGroups = useMemo((): DashboardPositionGroup[] => {
    const groups: DashboardPositionGroup[] = [
      {
        id: "maiden",
        title: "Maiden Voyage",
        rows: maidenVoyageRows,
        loading: posLoading.maidenVoyage,
        error: posErrors.maidenVoyage,
        emptyHint: emptyHintWithLink(
          "No active genesis deposits for this wallet.",
          "/genesis",
          "Open Maiden voyage"
        ),
      },
      {
        id: "earn",
        title: "Earn",
        rows: earnRows,
        loading: posLoading.anchor,
        error: posErrors.anchor,
        emptyHint: emptyHintWithLink(
          "No ha tokens or stability pool balances in the indexer.",
          "/anchor",
          "Open Anchor"
        ),
      },
      {
        id: "sail",
        title: "Sail",
        rows: leverageRows,
        loading: posLoading.leverage,
        error: posErrors.leverage,
        emptyHint: emptyHintWithLink(
          "No Sail positions in the Sail subgraph or Sail token marks in the indexer.",
          "/sail",
          "Open Sail"
        ),
      },
    ];

    if (hasArchived) {
      groups.push({
        id: "archived",
        title: "Archived",
        rows: archivedMaidenVoyageRows,
        loading: posLoading.maidenVoyage,
        error: posErrors.maidenVoyage,
        emptyHint: emptyHintWithLink(
          "No archived genesis deposits for this wallet.",
          "/genesis",
          "Open Maiden voyage"
        ),
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
    [rows]
  );

  const toggleYieldShare = () => {
    userToggledYield.current = true;
    setYieldExpanded((v) => !v);
  };

  const maidenGroup = positionGroups.find((g) => g.id === "maiden")!;
  const earnGroup = positionGroups.find((g) => g.id === "earn")!;
  const sailGroup = positionGroups.find((g) => g.id === "sail")!;
  const archivedGroup = positionGroups.find((g) => g.id === "archived");

  return (
    <div className="relative mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col font-sans text-white">
      <main className="mx-auto w-full max-w-[1600px] space-y-3 px-3 pb-6 pt-2 sm:space-y-4 sm:px-10 sm:pt-4">
        <DashboardPageTitleSection
          stats={
            <DashboardPageStats
              maidenUsd={positionTotals.maiden}
              earnUsd={positionTotals.earn}
              sailUsd={positionTotals.sail}
              archivedUsd={positionTotals.archived}
              showArchived={hasArchived}
              isConnected={isConnected}
              totalEarned={totalEarned}
              totalOutstanding={totalOutstanding}
            />
          }
        />

        {!isConnected ? <DashboardConnectNotice /> : null}

        <div className="space-y-4">
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

          <DashboardProductCard
            meta={DASHBOARD_PRODUCT_META.yield}
            expanded={yieldExpanded}
            onToggle={toggleYieldShare}
            isConnected={isConnected}
            loading={isConnected && isLoading}
          >
            {error ? (
              <IndexMarksSubgraphErrorBanner error={new Error(error)} />
            ) : null}
            <DashboardYieldShareList
              rows={rows}
              isLoading={isConnected && isLoading}
              error={null}
            />
          </DashboardProductCard>
        </div>
      </main>
      {dashboardManageModals}
    </div>
  );
}
