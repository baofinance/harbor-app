"use client";

import type { DashboardSectionSummarySegment } from "./portfolio/dashboardPortfolioUtils";
import {
  DASHBOARD_SECTION_SUMMARY_CLASS,
  DASHBOARD_SECTION_SUMMARY_SEPARATOR_CLASS,
  DASHBOARD_SECTION_SUMMARY_WRAP_CLASS,
} from "./dashboardStyles";

const TONE_CLASS: Record<
  NonNullable<DashboardSectionSummarySegment["tone"]>,
  string
> = {
  default: "text-white/85",
  gold: "text-harbor-gold",
  coral: "text-harbor-coral",
  mint: "text-harbor-mint",
  muted: "text-white/55",
};

export type DashboardSectionSummaryTextProps = {
  segments: DashboardSectionSummarySegment[];
  wrap?: boolean;
};

export function DashboardSectionSummaryText({
  segments,
  wrap = false,
}: DashboardSectionSummaryTextProps) {
  if (segments.length === 0) return null;

  return (
    <p className={wrap ? DASHBOARD_SECTION_SUMMARY_WRAP_CLASS : DASHBOARD_SECTION_SUMMARY_CLASS}>
      {segments.map((segment, index) => (
        <span key={`${segment.text}-${index}`}>
          {index > 0 ? (
            <span className={DASHBOARD_SECTION_SUMMARY_SEPARATOR_CLASS}> | </span>
          ) : null}
          <span className={TONE_CLASS[segment.tone ?? "default"]}>{segment.text}</span>
        </span>
      ))}
    </p>
  );
}
