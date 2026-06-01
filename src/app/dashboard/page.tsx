"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ChartBarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InformationCircleIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { DashboardPageTitleSection } from "@/components/dashboard/DashboardPageTitleSection";
import {
  DashboardPositionsGrouped,
  type DashboardPositionGroup,
} from "@/components/dashboard/DashboardPositionsGrouped";
import { DashboardSummaryCards } from "@/components/dashboard/DashboardSummaryCards";
import { DashboardHeaderMetricsSlot } from "@/components/dashboard/DashboardSummaryStrip";
import { DashboardYieldSummaryCards } from "@/components/dashboard/DashboardYieldSummaryCards";
import { DashboardYieldShareList } from "@/components/dashboard/DashboardYieldShareList";
import {
  DASHBOARD_SECTION_BODY_CLASS,
  DASHBOARD_SECTION_CLASS,
  DASHBOARD_SECTION_CHEVRON_CLASS,
  DASHBOARD_SECTION_HEADER_ACTIONS_CELL_CLASS,
  DASHBOARD_SECTION_HEADER_EXPANDED_CLASS,
  DASHBOARD_SECTION_HEADER_INNER_CLASS,
  DASHBOARD_SECTION_HEADER_METRICS_CELL_CLASS,
  DASHBOARD_SECTION_HEADER_TITLE_CELL_CLASS,
  DASHBOARD_SECTION_ICON_CLASS,
  DASHBOARD_SECTION_TITLE_BTN_CLASS,
  DASHBOARD_SECTION_TITLE_CLASS,
} from "@/components/dashboard/dashboardStyles";
import { IndexMarksSubgraphErrorBanner } from "@/components/shared/IndexMarksSubgraphErrorBanner";
import SimpleTooltip from "@/components/SimpleTooltip";
import { useFounderMetrics } from "@/hooks/useFounderMetrics";
import {
  useDashboardPositions,
  type DashboardPositionRow,
} from "@/hooks/useDashboardPositions";
function sumRowsUsd(rows: DashboardPositionRow[]): number {
  return rows.reduce((s, r) => s + r.usd, 0);
}

const POSITIONS_DATA_SOURCE_TOOLTIP =
  "From Harbor marks and Sail subgraphs. USD is indexer-reported; use Manage for full detail.";

const EMPTY_LINK_CLASS =
  "font-medium text-[#1E4775] underline underline-offset-2 hover:text-[#153B63]";

function emptyHintWithLink(message: string, href: string, linkLabel: string): ReactNode {
  return (
    <>
      {message}{" "}
      <Link href={href} className={EMPTY_LINK_CLASS}>
        {linkLabel}
      </Link>
    </>
  );
}

export default function DashboardPage() {
  const { rows, isLoading, error, isConnected } = useFounderMetrics();
  const {
    maidenVoyageRows,
    archivedMaidenVoyageRows,
    earnRows,
    leverageRows,
    isLoading: posLoading,
    errors: posErrors,
  } = useDashboardPositions();

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
    if (userToggledYield.current) return;
    if (isConnected && rows.length > 0) {
      setYieldShareExpanded(true);
    }
  }, [isConnected, rows.length]);

  const totalOutstanding = rows.reduce((sum, row) => sum + row.outstandingUSD, 0);
  const totalEarned = useMemo(
    () => rows.reduce((s, r) => s + r.totalEarnedUSD, 0),
    [rows]
  );

  return (
    <div className="min-h-0 flex-1 text-white max-w-[1300px] mx-auto font-sans relative w-full">
      <main className="container mx-auto px-4 sm:px-10 pb-6 pt-2 sm:pt-4 space-y-4">
        <DashboardPageTitleSection />

        {!isConnected ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70">
            Connect your wallet to view positions and yield share.
          </div>
        ) : null}

        <section className={DASHBOARD_SECTION_CLASS}>
          <div
            className={`${DASHBOARD_SECTION_HEADER_INNER_CLASS} ${
              positionsExpanded && isConnected ? DASHBOARD_SECTION_HEADER_EXPANDED_CLASS : ""
            }`}
          >
            <button
              type="button"
              className={`${DASHBOARD_SECTION_HEADER_TITLE_CELL_CLASS} ${DASHBOARD_SECTION_TITLE_BTN_CLASS}`}
              aria-expanded={positionsExpanded}
              onClick={() => setPositionsExpanded((v) => !v)}
            >
              <WalletIcon className={DASHBOARD_SECTION_ICON_CLASS} aria-hidden />
              <h2 className={DASHBOARD_SECTION_TITLE_CLASS}>Your positions</h2>
              <span
                className="shrink-0"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <SimpleTooltip
                  label={POSITIONS_DATA_SOURCE_TOOLTIP}
                  className="cursor-help"
                >
                  <InformationCircleIcon
                    className="h-4 w-4 text-[#1E4775]/45"
                    aria-label="About position data"
                  />
                </SimpleTooltip>
              </span>
            </button>
            {isConnected ? (
              <div className={DASHBOARD_SECTION_HEADER_METRICS_CELL_CLASS}>
                <DashboardHeaderMetricsSlot>
                  <DashboardSummaryCards
                    maidenUsd={positionTotals.maiden}
                    earnUsd={positionTotals.earn}
                    sailUsd={positionTotals.sail}
                    archivedUsd={positionTotals.archived}
                    showArchived={hasArchived}
                    isConnected={isConnected}
                  />
                </DashboardHeaderMetricsSlot>
              </div>
            ) : null}
            <div className={DASHBOARD_SECTION_HEADER_ACTIONS_CELL_CLASS}>
              <button
                type="button"
                className="shrink-0 rounded-md p-1 hover:bg-[#1E4775]/5"
                aria-expanded={positionsExpanded}
                aria-label={
                  positionsExpanded ? "Collapse positions" : "Expand positions"
                }
                onClick={() => setPositionsExpanded((v) => !v)}
              >
                {positionsExpanded ? (
                  <ChevronUpIcon className={DASHBOARD_SECTION_CHEVRON_CLASS} aria-hidden />
                ) : (
                  <ChevronDownIcon className={DASHBOARD_SECTION_CHEVRON_CLASS} aria-hidden />
                )}
              </button>
            </div>
          </div>

          {positionsExpanded && isConnected ? (
            <div className={DASHBOARD_SECTION_BODY_CLASS}>
              <DashboardPositionsGrouped groups={positionGroups} />
            </div>
          ) : null}
        </section>

        <section className={DASHBOARD_SECTION_CLASS}>
          <div
            className={`${DASHBOARD_SECTION_HEADER_INNER_CLASS} ${
              yieldShareExpanded && isConnected ? DASHBOARD_SECTION_HEADER_EXPANDED_CLASS : ""
            }`}
          >
            <button
              type="button"
              className={`${DASHBOARD_SECTION_HEADER_TITLE_CELL_CLASS} ${DASHBOARD_SECTION_TITLE_BTN_CLASS}`}
              aria-expanded={yieldShareExpanded}
              onClick={() => {
                userToggledYield.current = true;
                setYieldShareExpanded((v) => !v);
              }}
            >
              <ChartBarIcon className={DASHBOARD_SECTION_ICON_CLASS} aria-hidden />
              <h2 className={DASHBOARD_SECTION_TITLE_CLASS}>Yield share</h2>
            </button>
            {isConnected ? (
              <div className={DASHBOARD_SECTION_HEADER_METRICS_CELL_CLASS}>
                <DashboardHeaderMetricsSlot>
                  <DashboardYieldSummaryCards
                    totalEarned={totalEarned}
                    totalOutstanding={totalOutstanding}
                    isConnected={isConnected}
                  />
                </DashboardHeaderMetricsSlot>
              </div>
            ) : null}
            <div className={DASHBOARD_SECTION_HEADER_ACTIONS_CELL_CLASS}>
              <button
                type="button"
                className="rounded-md p-1 hover:bg-[#1E4775]/5"
                aria-expanded={yieldShareExpanded}
                aria-label={
                  yieldShareExpanded ? "Collapse yield share" : "Expand yield share"
                }
                onClick={() => {
                  userToggledYield.current = true;
                  setYieldShareExpanded((v) => !v);
                }}
              >
                {yieldShareExpanded ? (
                  <ChevronUpIcon className={DASHBOARD_SECTION_CHEVRON_CLASS} aria-hidden />
                ) : (
                  <ChevronDownIcon className={DASHBOARD_SECTION_CHEVRON_CLASS} aria-hidden />
                )}
              </button>
            </div>
          </div>

          {yieldShareExpanded && isConnected ? (
            <div className={DASHBOARD_SECTION_BODY_CLASS}>
              {error ? (
                <IndexMarksSubgraphErrorBanner error={new Error(error)} />
              ) : null}
              <DashboardYieldShareList
                rows={rows}
                isLoading={isLoading}
                error={null}
              />
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
