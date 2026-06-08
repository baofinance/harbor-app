"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ChevronDownIcon, ChevronRightIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import {
  DASHBOARD_PRODUCT_CARD_BODY_CLASS,
  DASHBOARD_PRODUCT_CARD_CLASS,
  DASHBOARD_PRODUCT_CARD_HEADER_CLASS,
  DASHBOARD_PRODUCT_CARD_HEADER_EXPANDED_CLASS,
  DASHBOARD_PRODUCT_CARD_HEADER_MUTED_CLASS,
  DASHBOARD_PRODUCT_LOADING_HINT_CLASS,
  DASHBOARD_PRODUCT_SUBTITLE_CLASS,
  DASHBOARD_PRODUCT_TITLE_CLASS,
  DASHBOARD_PRODUCT_TOTAL_CLASS,
  DASHBOARD_SECTION_ACTION_BTN_CLASS,
  DASHBOARD_SECTION_CHEVRON_CLASS,
  DASHBOARD_VIEW_ALL_LINK_CLASS,
} from "./dashboardStyles";
import type { DashboardProductMeta } from "./dashboardProductMeta";

export type DashboardProductCardProps = {
  meta: DashboardProductMeta;
  expanded: boolean;
  onToggle: () => void;
  isConnected: boolean;
  /** Shown beside title when connected and > 0 */
  sectionTotalUsd?: number | null;
  sectionTotalLabel?: string;
  /** Header extras (e.g. yield earned / uncollected chips) */
  headerMetrics?: ReactNode;
  /** When collapsed and no body, show subtitle under title */
  showSubtitle?: boolean;
  /** Show loading hint in header when fetching and no total yet */
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

export function DashboardProductCard({
  meta,
  expanded,
  onToggle,
  isConnected,
  sectionTotalUsd = null,
  sectionTotalLabel,
  headerMetrics,
  showSubtitle = true,
  loading = false,
  expandAriaLabel,
  collapseAriaLabel,
  children,
}: DashboardProductCardProps) {
  const Icon = meta.icon;
  const showTotal =
    isConnected &&
    sectionTotalUsd != null &&
    sectionTotalUsd > 0 &&
    Number.isFinite(sectionTotalUsd);
  const showBody = expanded && children != null;
  const showHeaderMetrics = isConnected && headerMetrics != null;
  const showLoadingHint = isConnected && loading && !showTotal;
  const showSubtitleLine =
    showSubtitle && (!expanded || !showBody) && meta.subtitle.length > 0;
  const headerMuted = meta.tone === "muted";

  return (
    <section className={DASHBOARD_PRODUCT_CARD_CLASS} aria-label={meta.title}>
      <div
        className={`${DASHBOARD_PRODUCT_CARD_HEADER_CLASS} ${
          headerMuted ? DASHBOARD_PRODUCT_CARD_HEADER_MUTED_CLASS : ""
        } ${showBody ? DASHBOARD_PRODUCT_CARD_HEADER_EXPANDED_CLASS : ""} ${
          showHeaderMetrics ? "flex-wrap gap-y-3" : ""
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className={meta.iconBadgeClass} aria-hidden>
            <Icon className="h-5 w-5" />
          </span>
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-3 text-left hover:opacity-90"
            aria-expanded={expanded}
            onClick={onToggle}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <h2 className={DASHBOARD_PRODUCT_TITLE_CLASS}>{meta.title}</h2>
                {showTotal ? (
                  <span className={DASHBOARD_PRODUCT_TOTAL_CLASS}>
                    {sectionTotalLabel
                      ? `${sectionTotalLabel} ${formatSectionTotal(sectionTotalUsd)}`
                      : formatSectionTotal(sectionTotalUsd)}
                  </span>
                ) : null}
                {showLoadingHint ? (
                  <span className={DASHBOARD_PRODUCT_LOADING_HINT_CLASS}>Loading…</span>
                ) : null}
              </div>
              {showSubtitleLine ? (
                <p className={`mt-0.5 ${DASHBOARD_PRODUCT_SUBTITLE_CLASS}`}>
                  {meta.subtitle}
                </p>
              ) : null}
            </div>
          </button>
          <div className="flex shrink-0 items-center gap-1">
            {meta.viewAllHref && meta.viewAllLabel ? (
              <Link
                href={meta.viewAllHref}
                className={DASHBOARD_VIEW_ALL_LINK_CLASS}
                onClick={(e) => e.stopPropagation()}
              >
                {meta.viewAllLabel}
                <ChevronRightIcon className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : null}
            <button
              type="button"
              className={DASHBOARD_SECTION_ACTION_BTN_CLASS}
              aria-expanded={expanded}
              aria-label={
                expanded
                  ? collapseAriaLabel ?? `Collapse ${meta.title}`
                  : expandAriaLabel ?? `Expand ${meta.title}`
              }
              onClick={onToggle}
            >
              {expanded ? (
                <ChevronUpIcon className={DASHBOARD_SECTION_CHEVRON_CLASS} aria-hidden />
              ) : (
                <ChevronDownIcon className={DASHBOARD_SECTION_CHEVRON_CLASS} aria-hidden />
              )}
            </button>
          </div>
        </div>
        {showHeaderMetrics ? (
          <div className="flex w-full min-w-0 justify-end sm:w-auto">{headerMetrics}</div>
        ) : null}
      </div>
      {showBody ? <div className={DASHBOARD_PRODUCT_CARD_BODY_CLASS}>{children}</div> : null}
    </section>
  );
}

/** Sync expanded state when default changes (e.g. rows load). */
export function useDashboardProductExpanded(defaultExpanded: boolean) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    setExpanded(defaultExpanded);
  }, [defaultExpanded]);

  return [expanded, setExpanded] as const;
}
