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
  DASHBOARD_PRODUCT_HEADER_METRICS_CLASS,
  DASHBOARD_PRODUCT_TAGLINE_CLASS,
  DASHBOARD_SECTION_HEADER_ACTIONS_CELL_CLASS,
  DASHBOARD_SECTION_HEADER_INNER_CLASS,
  DASHBOARD_SECTION_HEADER_METRICS_CELL_CLASS,
  DASHBOARD_SECTION_HEADER_TITLE_CELL_CLASS,
} from "./dashboardStyles";
import {
  PORTFOLIO_ACCORDION_BODY_CLASS,
  PORTFOLIO_CHEVRON_CLASS,
} from "./portfolio/portfolioStyles";
import {
  DASHBOARD_ACCORDION_CONTENT_CLASS,
  DASHBOARD_CHEVRON_CLOSED_CLASS,
  DASHBOARD_CHEVRON_OPEN_CLASS,
  DASHBOARD_SECTION_HEADER_OPEN_FEATURED_CLASS,
} from "./dashboardBrand";
import { DashboardStatChip } from "./DashboardStatChip";
import {
  dashboardProductStatChipBorderClass,
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

function ProductCardSummaryStrip({
  metrics,
  productId,
}: {
  metrics: DashboardProductSummaryMetric[];
  productId: DashboardProductMeta["id"];
}) {
  if (metrics.length === 0) return null;

  const borderClass = dashboardProductStatChipBorderClass(productId);

  return (
    <div className={DASHBOARD_PRODUCT_HEADER_METRICS_CLASS}>
      {metrics.map((metric) => (
        <DashboardStatChip
          key={metric.label}
          label={metric.label}
          value={metric.value}
          context={metric.context}
          borderClass={borderClass}
        />
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
        } ${expanded && hasChildren && featured ? DASHBOARD_SECTION_HEADER_OPEN_FEATURED_CLASS : ""}`}
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
              <div className="min-w-0">
                <h2 className={dashboardProductTitleClass(meta)}>{meta.title}</h2>
                {meta.tagline ? (
                  <p className={DASHBOARD_PRODUCT_TAGLINE_CLASS}>{meta.tagline}</p>
                ) : null}
              </div>
            </div>

            {showSummaryMetrics ? (
              <div className={DASHBOARD_SECTION_HEADER_METRICS_CELL_CLASS}>
                <ProductCardSummaryStrip
                  metrics={summaryMetrics}
                  productId={meta.id}
                />
              </div>
            ) : !isConnected ? (
              <div className={DASHBOARD_SECTION_HEADER_METRICS_CELL_CLASS}>
                <ProductCardSummaryStrip
                  metrics={[{ label: "Summary", value: "—" }]}
                  productId={meta.id}
                />
              </div>
            ) : loading ? (
              <div className={DASHBOARD_SECTION_HEADER_METRICS_CELL_CLASS}>
                <ProductCardSummaryStrip
                  metrics={[{ label: "Loading", value: "…" }]}
                  productId={meta.id}
                />
              </div>
            ) : null}

            {hasChildren ? (
              <div className={DASHBOARD_SECTION_HEADER_ACTIONS_CELL_CLASS}>
                <ChevronDownIcon
                  className={`${PORTFOLIO_CHEVRON_CLASS} pointer-events-none ${
                    expanded ? DASHBOARD_CHEVRON_OPEN_CLASS : DASHBOARD_CHEVRON_CLOSED_CLASS
                  } ${expanded ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </div>
            ) : null}
          </div>
        </button>

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
