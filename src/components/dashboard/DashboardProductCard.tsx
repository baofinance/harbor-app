"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import {
  DASHBOARD_PRODUCT_ACCENT_BAR_CLASS,
  DASHBOARD_PRODUCT_CARD_CLASS,
  DASHBOARD_PRODUCT_CARD_COLLAPSED_HOVER_CLASS,
  DASHBOARD_PRODUCT_CARD_FEATURED_CLASS,
  DASHBOARD_PRODUCT_CARD_FEATURED_COLLAPSED_HOVER_CLASS,
  DASHBOARD_PRODUCT_CARD_HEADER_BUTTON_CLASS,
  DASHBOARD_PRODUCT_CARD_HEADER_CLASS,
  DASHBOARD_PRODUCT_CARD_HEADER_EXPANDED_CLASS,
  DASHBOARD_PRODUCT_CARD_HEADER_FEATURED_CLASS,
  DASHBOARD_PRODUCT_CARD_HEADER_MUTED_CLASS,
  DASHBOARD_PRODUCT_HEADER_METRIC_LABEL_CLASS,
  DASHBOARD_PRODUCT_HEADER_METRICS_CLASS,
  DASHBOARD_PRODUCT_HEADER_METRIC_VALUE_CLASS,
  DASHBOARD_PRODUCT_SUMMARY_METRIC_VALUE_GOLD_CLASS,
  DASHBOARD_PRODUCT_SUMMARY_METRIC_VALUE_MINT_CLASS,
  DASHBOARD_PRODUCT_SUMMARY_METRIC_VALUE_MUTED_CLASS,
  DASHBOARD_PRODUCT_TITLE_CLASS,
  DASHBOARD_SECTION_HEADER_ACTIONS_CELL_CLASS,
  DASHBOARD_SECTION_HEADER_INNER_CLASS,
  DASHBOARD_SECTION_HEADER_METRICS_CELL_CLASS,
  DASHBOARD_SECTION_HEADER_TITLE_CELL_CLASS,
} from "./dashboardStyles";
import {
  PORTFOLIO_ACCORDION_BODY_CLASS,
  PORTFOLIO_CHEVRON_CLASS,
} from "./portfolio/portfolioStyles";
import type { DashboardProductMeta } from "./dashboardProductMeta";

export type DashboardProductSummaryMetric = {
  label: string;
  value: string;
  tone?: "default" | "gold" | "mint" | "muted";
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

function summaryMetricValueClass(tone: DashboardProductSummaryMetric["tone"]): string {
  switch (tone) {
    case "gold":
      return DASHBOARD_PRODUCT_SUMMARY_METRIC_VALUE_GOLD_CLASS;
    case "mint":
      return DASHBOARD_PRODUCT_SUMMARY_METRIC_VALUE_MINT_CLASS;
    case "muted":
      return DASHBOARD_PRODUCT_SUMMARY_METRIC_VALUE_MUTED_CLASS;
    default:
      return "text-white/90";
  }
}

function ProductCardSummaryStrip({
  metrics,
}: {
  metrics: DashboardProductSummaryMetric[];
}) {
  if (metrics.length === 0) return null;

  return (
    <div className={DASHBOARD_PRODUCT_HEADER_METRICS_CLASS}>
      {metrics.map((metric) => (
        <div key={metric.label} className="min-w-0 text-center sm:text-left">
          <p className={DASHBOARD_PRODUCT_HEADER_METRIC_LABEL_CLASS}>{metric.label}</p>
          <p
            className={`${DASHBOARD_PRODUCT_HEADER_METRIC_VALUE_CLASS} ${summaryMetricValueClass(metric.tone)}`}
          >
            {metric.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function DashboardProductCard({
  meta,
  expanded,
  onToggle,
  isConnected,
  summaryMetrics = [],
  expandedMetrics,
  loading = false,
  expandAriaLabel,
  collapseAriaLabel,
  children,
}: DashboardProductCardProps) {
  const Icon = meta.icon;
  const hasChildren = children != null;
  const featured = meta.featured === true;
  const headerMuted = meta.tone === "muted";
  const showSummaryMetrics = isConnected && summaryMetrics.length > 0;
  const showExpandedMetrics = isConnected && expandedMetrics != null && expanded;
  const showAccentBar =
    meta.id === "earn" ||
    meta.id === "sail" ||
    meta.id === "archived" ||
    meta.id === "yield";

  const cardShellClass = featured
    ? DASHBOARD_PRODUCT_CARD_FEATURED_CLASS
    : DASHBOARD_PRODUCT_CARD_CLASS;

  const collapsedHoverClass =
    hasChildren && !expanded
      ? featured
        ? DASHBOARD_PRODUCT_CARD_FEATURED_COLLAPSED_HOVER_CLASS
        : DASHBOARD_PRODUCT_CARD_COLLAPSED_HOVER_CLASS
      : "";

  const toggleLabel = expanded
    ? collapseAriaLabel ?? `Collapse ${meta.title}`
    : expandAriaLabel ?? `Expand ${meta.title}`;

  return (
    <section
      className={`${cardShellClass} ${collapsedHoverClass}`}
      aria-label={meta.title}
    >
      {showAccentBar ? (
        <div
          className={`${DASHBOARD_PRODUCT_ACCENT_BAR_CLASS} ${meta.accentBarClass}`}
          aria-hidden
        />
      ) : null}
      <div
        className={`${DASHBOARD_PRODUCT_CARD_HEADER_CLASS} ${
          featured ? DASHBOARD_PRODUCT_CARD_HEADER_FEATURED_CLASS : ""
        } ${headerMuted ? DASHBOARD_PRODUCT_CARD_HEADER_MUTED_CLASS : ""} ${
          expanded && hasChildren ? DASHBOARD_PRODUCT_CARD_HEADER_EXPANDED_CLASS : ""
        }`}
      >
        <button
          type="button"
          className={DASHBOARD_PRODUCT_CARD_HEADER_BUTTON_CLASS}
          aria-expanded={hasChildren ? expanded : undefined}
          aria-label={hasChildren ? toggleLabel : undefined}
          disabled={!hasChildren}
          onClick={hasChildren ? onToggle : undefined}
        >
          <div className={DASHBOARD_SECTION_HEADER_INNER_CLASS}>
            <div
              className={`${DASHBOARD_SECTION_HEADER_TITLE_CELL_CLASS} flex min-w-0 items-center gap-2.5`}
            >
              <span className={meta.iconBadgeClass} aria-hidden>
                <Icon className={featured ? "h-5 w-5" : "h-4 w-4"} />
              </span>
              <h2 className={DASHBOARD_PRODUCT_TITLE_CLASS}>{meta.title}</h2>
            </div>

            {showSummaryMetrics ? (
              <div className={DASHBOARD_SECTION_HEADER_METRICS_CELL_CLASS}>
                <ProductCardSummaryStrip metrics={summaryMetrics} />
              </div>
            ) : !isConnected ? (
              <div className={DASHBOARD_SECTION_HEADER_METRICS_CELL_CLASS}>
                <ProductCardSummaryStrip
                  metrics={[{ label: "Summary", value: "—", tone: "muted" }]}
                />
              </div>
            ) : loading ? (
              <div className={DASHBOARD_SECTION_HEADER_METRICS_CELL_CLASS}>
                <ProductCardSummaryStrip
                  metrics={[{ label: "Loading", value: "…", tone: "muted" }]}
                />
              </div>
            ) : null}

            {hasChildren ? (
              <div className={DASHBOARD_SECTION_HEADER_ACTIONS_CELL_CLASS}>
                <ChevronDownIcon
                  className={`${PORTFOLIO_CHEVRON_CLASS} pointer-events-none ${
                    expanded ? "rotate-180" : ""
                  }`}
                  aria-hidden
                />
              </div>
            ) : null}
          </div>
        </button>

        {showExpandedMetrics ? (
          <div className="mt-2 flex w-full min-w-0 justify-end border-t border-white/[0.06] px-3 pt-2 sm:px-4">
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
            <div className="px-3 pb-2 pt-0 sm:px-4 sm:pb-2.5">{children}</div>
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
