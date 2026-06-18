"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import {
  DASHBOARD_PRODUCT_ACCENT_BAR_CLASS,
  DASHBOARD_PRODUCT_AMOUNT_CLASS,
  DASHBOARD_PRODUCT_CARD_CLASS,
  DASHBOARD_PRODUCT_CARD_HEADER_CLASS,
  DASHBOARD_PRODUCT_CARD_HEADER_EXPANDED_CLASS,
  DASHBOARD_PRODUCT_CARD_HEADER_MUTED_CLASS,
  DASHBOARD_PRODUCT_CARD_HEADER_ROW_CLASS,
  DASHBOARD_PRODUCT_COUNT_CLASS,
  DASHBOARD_PRODUCT_LOADING_HINT_CLASS,
  DASHBOARD_PRODUCT_TITLE_CLASS,
  DASHBOARD_SECTION_EXPAND_BTN_CLASS,
  DASHBOARD_VIEW_ALL_BTN_CLASS,
} from "./dashboardStyles";
import {
  PORTFOLIO_ACCORDION_BODY_CLASS,
  PORTFOLIO_CHEVRON_CLASS,
} from "./portfolio/portfolioStyles";
import type { DashboardProductMeta } from "./dashboardProductMeta";

export type DashboardProductCardProps = {
  meta: DashboardProductMeta;
  expanded: boolean;
  onToggle: () => void;
  isConnected: boolean;
  sectionTotalUsd?: number | null;
  positionCount?: number;
  /** Hide USD in header — chips show totals; show position count only */
  compactHeader?: boolean;
  collapsedPreview?: ReactNode;
  headerMetrics?: ReactNode;
  loading?: boolean;
  expandAriaLabel?: string;
  collapseAriaLabel?: string;
  children?: ReactNode;
};

function formatSectionTotal(usd: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usd);
}

function positionCountLabel(count: number): string {
  if (count === 1) return "1 position";
  return `${count} positions`;
}

export function DashboardProductCard({
  meta,
  expanded,
  onToggle,
  isConnected,
  sectionTotalUsd = null,
  positionCount = 0,
  compactHeader = false,
  collapsedPreview,
  headerMetrics,
  loading = false,
  expandAriaLabel,
  collapseAriaLabel,
  children,
}: DashboardProductCardProps) {
  const Icon = meta.icon;
  const hasChildren = children != null;
  const showHeaderMetrics = isConnected && headerMetrics != null && expanded;
  const showCollapsedPreview = !expanded && collapsedPreview != null;
  const headerMuted = meta.tone === "muted";

  const amountDisplay =
    isConnected && sectionTotalUsd != null && Number.isFinite(sectionTotalUsd)
      ? formatSectionTotal(sectionTotalUsd)
      : isConnected && loading
        ? "…"
        : "—";

  const countDisplay = isConnected ? positionCountLabel(positionCount) : "—";
  const showAccentBar =
    meta.id === "earn" ||
    meta.id === "sail" ||
    meta.id === "archived" ||
    meta.id === "yield";

  return (
    <section className={DASHBOARD_PRODUCT_CARD_CLASS} aria-label={meta.title}>
      {showAccentBar ? (
        <div
          className={`${DASHBOARD_PRODUCT_ACCENT_BAR_CLASS} ${meta.accentBarClass}`}
          aria-hidden
        />
      ) : null}
      <div
        className={`${DASHBOARD_PRODUCT_CARD_HEADER_CLASS} ${
          headerMuted ? DASHBOARD_PRODUCT_CARD_HEADER_MUTED_CLASS : ""
        } ${expanded && hasChildren ? DASHBOARD_PRODUCT_CARD_HEADER_EXPANDED_CLASS : ""}`}
      >
        <div className={DASHBOARD_PRODUCT_CARD_HEADER_ROW_CLASS}>
          <span className={meta.iconBadgeClass} aria-hidden>
            <Icon className="h-4 w-4" />
          </span>
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center text-left hover:opacity-90"
            aria-expanded={expanded}
            onClick={onToggle}
          >
            <div className="min-w-0">
              <h2 className={DASHBOARD_PRODUCT_TITLE_CLASS}>{meta.title}</h2>
              {compactHeader ? (
                <p className={`mt-0.5 ${DASHBOARD_PRODUCT_COUNT_CLASS}`}>{countDisplay}</p>
              ) : (
                <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0">
                  <span className={DASHBOARD_PRODUCT_AMOUNT_CLASS}>{amountDisplay}</span>
                  <span className={DASHBOARD_PRODUCT_COUNT_CLASS}>{countDisplay}</span>
                  {isConnected && loading && sectionTotalUsd == null ? (
                    <span className={DASHBOARD_PRODUCT_LOADING_HINT_CLASS}>Loading…</span>
                  ) : null}
                </div>
              )}
            </div>
          </button>
          <div className="flex shrink-0 items-center gap-2">
            {meta.viewAllHref && meta.viewAllLabel ? (
              <Link
                href={meta.viewAllHref}
                className={DASHBOARD_VIEW_ALL_BTN_CLASS}
                onClick={(e) => e.stopPropagation()}
              >
                {meta.viewAllLabel}
                <ChevronRightIcon className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : null}
            {hasChildren ? (
              <button
                type="button"
                className={DASHBOARD_SECTION_EXPAND_BTN_CLASS}
                aria-expanded={expanded}
                aria-label={
                  expanded
                    ? collapseAriaLabel ?? `Collapse ${meta.title}`
                    : expandAriaLabel ?? `Expand ${meta.title}`
                }
                onClick={onToggle}
              >
                <ChevronDownIcon
                  className={`${PORTFOLIO_CHEVRON_CLASS} ${expanded ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>
            ) : null}
          </div>
        </div>
        {showCollapsedPreview ? collapsedPreview : null}
        {showHeaderMetrics ? (
          <div className="mt-2 flex w-full min-w-0 justify-end border-t border-white/[0.06] pt-2">
            {headerMetrics}
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
