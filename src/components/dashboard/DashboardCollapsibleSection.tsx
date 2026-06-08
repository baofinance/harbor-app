"use client";

import type { ComponentType, ReactNode } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import {
  DASHBOARD_SECTION_ACTION_BTN_CLASS,
  DASHBOARD_SECTION_BODY_CLASS,
  DASHBOARD_SECTION_CHEVRON_CLASS,
  DASHBOARD_SECTION_BODY_FLAT_CLASS,
  DASHBOARD_SECTION_CLASS,
  DASHBOARD_SECTION_FLAT_CLASS,
  DASHBOARD_SECTION_INNER_GRADIENT,
  DASHBOARD_SECTION_HEADER_ACTIONS_CELL_CLASS,
  DASHBOARD_SECTION_HEADER_CARD_INNER_CLASS,
  DASHBOARD_SECTION_HEADER_EXPANDED_CLASS,
  DASHBOARD_SECTION_HEADER_FLAT_EXPANDED_CLASS,
  DASHBOARD_SECTION_HEADER_INNER_CLASS,
  DASHBOARD_SECTION_HEADER_METRICS_CELL_CLASS,
  DASHBOARD_SECTION_HEADER_TITLE_CELL_CLASS,
  DASHBOARD_SECTION_ICON_CLASS,
  DASHBOARD_SECTION_TITLE_BTN_CLASS,
  DASHBOARD_SECTION_TITLE_CLASS,
} from "./dashboardStyles";
import { DashboardHeaderMetricsSlot } from "./DashboardSummaryStrip";

export type DashboardCollapsibleSectionProps = {
  title: string;
  icon: ComponentType<{ className?: string }>;
  expanded: boolean;
  onToggle: () => void;
  isConnected: boolean;
  headerMetrics?: ReactNode;
  titleAdornment?: ReactNode;
  expandAriaLabel?: string;
  collapseAriaLabel?: string;
  /** `flat` = no frosted outer card (Your positions). */
  surface?: "card" | "flat";
  children: ReactNode;
};

export function DashboardCollapsibleSection({
  title,
  icon: Icon,
  expanded,
  onToggle,
  isConnected,
  headerMetrics,
  titleAdornment,
  expandAriaLabel = "Expand section",
  collapseAriaLabel = "Collapse section",
  surface = "card",
  children,
}: DashboardCollapsibleSectionProps) {
  const isFlat = surface === "flat";
  const sectionClass = isFlat
    ? DASHBOARD_SECTION_FLAT_CLASS
    : `${DASHBOARD_SECTION_CLASS} ${DASHBOARD_SECTION_INNER_GRADIENT}`;
  const headerExpandedClass =
    expanded && isConnected
      ? isFlat
        ? DASHBOARD_SECTION_HEADER_FLAT_EXPANDED_CLASS
        : DASHBOARD_SECTION_HEADER_EXPANDED_CLASS
      : "";
  const bodyClass = isFlat
    ? DASHBOARD_SECTION_BODY_FLAT_CLASS
    : DASHBOARD_SECTION_BODY_CLASS;

  return (
    <section className={sectionClass}>
      <div
        className={`${DASHBOARD_SECTION_HEADER_INNER_CLASS} ${
          isFlat ? "" : DASHBOARD_SECTION_HEADER_CARD_INNER_CLASS
        } ${headerExpandedClass}`}
      >
        <button
          type="button"
          className={`${DASHBOARD_SECTION_HEADER_TITLE_CELL_CLASS} ${DASHBOARD_SECTION_TITLE_BTN_CLASS}`}
          aria-expanded={expanded}
          onClick={onToggle}
        >
          <Icon className={DASHBOARD_SECTION_ICON_CLASS} aria-hidden />
          <h2 className={DASHBOARD_SECTION_TITLE_CLASS}>{title}</h2>
          {titleAdornment ? (
            <span
              className="shrink-0"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {titleAdornment}
            </span>
          ) : null}
        </button>
        {isConnected && headerMetrics ? (
          <div className={DASHBOARD_SECTION_HEADER_METRICS_CELL_CLASS}>
            <DashboardHeaderMetricsSlot>{headerMetrics}</DashboardHeaderMetricsSlot>
          </div>
        ) : null}
        <div className={DASHBOARD_SECTION_HEADER_ACTIONS_CELL_CLASS}>
          <button
            type="button"
            className={DASHBOARD_SECTION_ACTION_BTN_CLASS}
            aria-expanded={expanded}
            aria-label={expanded ? collapseAriaLabel : expandAriaLabel}
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

      {expanded && isConnected ? (
        <div className={bodyClass}>{children}</div>
      ) : null}
    </section>
  );
}
