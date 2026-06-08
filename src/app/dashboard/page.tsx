"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ChartBarIcon,
  InformationCircleIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { DashboardCollapsibleSection } from "@/components/dashboard/DashboardCollapsibleSection";
import { DashboardPageTitleSection } from "@/components/dashboard/DashboardPageTitleSection";
import {
  DashboardPositionsGrouped,
  type DashboardPositionGroup,
} from "@/components/dashboard/DashboardPositionsGrouped";
import { DashboardSummaryCards } from "@/components/dashboard/DashboardSummaryCards";
import { DashboardYieldSummaryCards } from "@/components/dashboard/DashboardYieldSummaryCards";
import { DashboardYieldShareList } from "@/components/dashboard/DashboardYieldShareList";
import {
  DASHBOARD_INFO_ICON_CLASS,
  DASHBOARD_LINK_CLASS,
  DASHBOARD_NOTICE_PANEL_CLASS,
} from "@/components/dashboard/dashboardStyles";
import { IndexMarksSubgraphErrorBanner } from "@/components/shared/IndexMarksSubgraphErrorBanner";
import SimpleTooltip from "@/components/SimpleTooltip";
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

const POSITIONS_DATA_SOURCE_TOOLTIP =
  "From Harbor marks and Sail subgraphs. USD is indexer-reported; use Manage for full detail.";

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

  const [positionsExpanded, setPositionsExpanded] = useState(true);
  const [yieldShareExpanded, setYieldShareExpanded] = useState(false);

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

  useEffect(() => {
    if (dashboardViewBasic) {
      if (!userToggledYield.current) {
        setYieldShareExpanded(false);
      }
      return;
    }
    if (userToggledYield.current) return;
    if (isConnected && rows.length > 0) {
      setYieldShareExpanded(true);
    }
  }, [dashboardViewBasic, isConnected, rows.length]);

  const totalOutstanding = rows.reduce((sum, row) => sum + row.outstandingUSD, 0);
  const totalEarned = useMemo(
    () => rows.reduce((s, r) => s + r.totalEarnedUSD, 0),
    [rows]
  );

  const toggleYieldShare = () => {
    userToggledYield.current = true;
    setYieldShareExpanded((v) => !v);
  };

  return (
    <div className="relative mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col font-sans text-white">
      <main className="mx-auto w-full max-w-[1600px] space-y-4 px-4 pb-6 pt-2 sm:px-10 sm:pt-4">
        <DashboardPageTitleSection />

        {!isConnected ? (
          <div className={DASHBOARD_NOTICE_PANEL_CLASS}>
            Connect your wallet to view positions and yield share.
          </div>
        ) : null}

        <DashboardCollapsibleSection
          title="Your positions"
          icon={WalletIcon}
          surface="flat"
          expanded={positionsExpanded}
          onToggle={() => setPositionsExpanded((v) => !v)}
          isConnected={isConnected}
          expandAriaLabel="Expand positions"
          collapseAriaLabel="Collapse positions"
          titleAdornment={
            <SimpleTooltip
              label={POSITIONS_DATA_SOURCE_TOOLTIP}
              className="cursor-help"
            >
              <InformationCircleIcon
                className={DASHBOARD_INFO_ICON_CLASS}
                aria-label="About position data"
              />
            </SimpleTooltip>
          }
          headerMetrics={
            <DashboardSummaryCards
              maidenUsd={positionTotals.maiden}
              earnUsd={positionTotals.earn}
              sailUsd={positionTotals.sail}
              archivedUsd={positionTotals.archived}
              showArchived={hasArchived}
              isConnected={isConnected}
            />
          }
        >
          <DashboardPositionsGrouped
            groups={positionGroups}
            onManage={openPositionManage}
            compactGroups={dashboardViewBasic}
          />
        </DashboardCollapsibleSection>

        <DashboardCollapsibleSection
          title="Yield share"
          icon={ChartBarIcon}
          expanded={yieldShareExpanded}
          onToggle={toggleYieldShare}
          isConnected={isConnected}
          expandAriaLabel="Expand yield share"
          collapseAriaLabel="Collapse yield share"
          headerMetrics={
            <DashboardYieldSummaryCards
              totalEarned={totalEarned}
              totalOutstanding={totalOutstanding}
              isConnected={isConnected}
            />
          }
        >
          {error ? (
            <IndexMarksSubgraphErrorBanner error={new Error(error)} />
          ) : null}
          <DashboardYieldShareList
            rows={rows}
            isLoading={isLoading}
            error={null}
          />
        </DashboardCollapsibleSection>
      </main>
      {dashboardManageModals}
    </div>
  );
}
