"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import {
  DASHBOARD_PRODUCT_ACCENT_BAR_CLASS,
  DASHBOARD_PRODUCT_CARD_CLASS,
  DASHBOARD_PRODUCT_CARD_COLLAPSED_HOVER_CLASS,
  DASHBOARD_PRODUCT_CARD_HEADER_CLASS,
  DASHBOARD_PRODUCT_CARD_HEADER_EXPANDED_CLASS,
  DASHBOARD_PRODUCT_CARD_HEADER_MUTED_CLASS,
  DASHBOARD_PRODUCT_HEADER_EXPAND_BTN_CLASS,
  DASHBOARD_PRODUCT_HEADER_NAV_LINK_CLASS,
} from "./dashboardStyles";
import {
  PORTFOLIO_ACCORDION_BODY_CLASS,
  PORTFOLIO_CHEVRON_CLASS,
} from "./portfolio/portfolioStyles";
import {
  DASHBOARD_ACCORDION_CONTENT_CLASS,
  DASHBOARD_CHEVRON_CLOSED_CLASS,
  DASHBOARD_CHEVRON_OPEN_CLASS,
} from "./dashboardBrand";
import { DashboardSectionSummaryText } from "./DashboardSectionSummaryText";
import { toSectionSummarySegments } from "./portfolio/dashboardPortfolioUtils";
import {
  dashboardProductTitleClass,
  type DashboardProductMeta,
} from "./dashboardProductMeta";

export type DashboardProductSummaryMetric = {
  label: string;
  value: string;
  context?: string;
};

export type DashboardProductCardProps = {
  meta: DashboardProductMeta;
  expanded: boolean;
  onToggle: () => void;
  isConnected: boolean;
  summaryMetrics?: DashboardProductSummaryMetric[];
  expandedMetrics?: ReactNode;
  loading?: boolean;
  expandAriaLabel?: string;
  collapseAriaLabel?: string;
  children?: ReactNode;
};

export function DashboardProductCard({
  meta,
  expanded,
  onToggle,
  isConnected,
  summaryMetrics = [],
  loading = false,
  expandAriaLabel,
  collapseAriaLabel,
  expandedMetrics,
  children,
}: DashboardProductCardProps) {
  const Icon = meta.icon;
  const hasChildren = children != null;
  const headerMuted = meta.tone === "muted";
  const showExpandedMetrics = isConnected && expandedMetrics != null && expanded;

  const summarySegments = useMemo(() => {
    if (!isConnected) {
      return [{ text: "—", tone: "muted" as const }];
    }
    if (loading && summaryMetrics.length === 0) {
      return [{ text: "…", tone: "muted" as const }];
    }
    return toSectionSummarySegments(meta.id, summaryMetrics);
  }, [isConnected, loading, meta.id, summaryMetrics]);

  const showSummary = isConnected || loading;

  const collapsedHoverClass =
    hasChildren && !expanded ? DASHBOARD_PRODUCT_CARD_COLLAPSED_HOVER_CLASS : "";

  const toggleLabel = expanded
    ? collapseAriaLabel ?? `Collapse ${meta.title}`
    : expandAriaLabel ?? `Expand ${meta.title}`;

  const titleClass = dashboardProductTitleClass(meta);

  return (
    <section
      className={`${DASHBOARD_PRODUCT_CARD_CLASS} ${collapsedHoverClass}`}
      aria-label={meta.title}
    >
      <div
        className={`${DASHBOARD_PRODUCT_ACCENT_BAR_CLASS} ${meta.accentBarClass}`}
        aria-hidden
      />
      <div
        className={`${DASHBOARD_PRODUCT_CARD_HEADER_CLASS} ${
          headerMuted ? DASHBOARD_PRODUCT_CARD_HEADER_MUTED_CLASS : ""
        } ${expanded && hasChildren ? DASHBOARD_PRODUCT_CARD_HEADER_EXPANDED_CLASS : ""}`}
      >
        <div className="flex w-full min-w-0 items-center gap-2 px-0 py-1.5 sm:gap-2.5 sm:py-2.5">
          <span className={`${meta.iconBadgeClass} shrink-0`} aria-hidden>
            <Icon className="h-4 w-4" />
          </span>

          {meta.headerHref ? (
            <Link
              href={meta.headerHref}
              className={DASHBOARD_PRODUCT_HEADER_NAV_LINK_CLASS}
            >
              <h2 className={titleClass}>{meta.title}</h2>
              <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-white/45" aria-hidden />
            </Link>
          ) : (
            <h2 className={`${titleClass} shrink-0`}>{meta.title}</h2>
          )}

          {hasChildren ? (
            <button
              type="button"
              className={DASHBOARD_PRODUCT_HEADER_EXPAND_BTN_CLASS}
              aria-expanded={expanded}
              aria-label={toggleLabel}
              onClick={onToggle}
            >
              {showSummary ? (
                <span className="min-w-0 flex-1 truncate text-right">
                  <DashboardSectionSummaryText segments={summarySegments} />
                </span>
              ) : (
                <span className="flex-1" />
              )}
              <ChevronDownIcon
                className={`${PORTFOLIO_CHEVRON_CLASS} pointer-events-none shrink-0 ${
                  expanded ? DASHBOARD_CHEVRON_OPEN_CLASS : DASHBOARD_CHEVRON_CLOSED_CLASS
                } ${expanded ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
          ) : showSummary ? (
            <div className="min-w-0 flex-1 truncate text-right">
              <DashboardSectionSummaryText segments={summarySegments} />
            </div>
          ) : null}
        </div>

        {showExpandedMetrics ? (
          <div className="mt-2 flex w-full min-w-0 justify-end border-t border-white/[0.04] px-3 pt-2 sm:px-4">
            {expandedMetrics}
          </div>
        ) : null}
      </div>
      {hasChildren ? (
        <div
          className={`${PORTFOLIO_ACCORDION_BODY_CLASS} ${
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div
              className={`px-3 pb-1.5 pt-0 sm:px-4 sm:pb-2 ${DASHBOARD_ACCORDION_CONTENT_CLASS} ${
                expanded ? "opacity-100" : "opacity-0"
              }`}
            >
              {children}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function useDashboardProductExpanded(defaultExpanded: boolean) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    setExpanded(defaultExpanded);
  }, [defaultExpanded]);

  return [expanded, setExpanded] as const;
}
