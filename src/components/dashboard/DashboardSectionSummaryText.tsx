"use client";

import type { DashboardSectionSummarySegment } from "./portfolio/dashboardPortfolioUtils";
import {
  DASHBOARD_SECTION_SUMMARY_CLASS,
  DASHBOARD_SECTION_SUMMARY_SEPARATOR_CLASS,
} from "./dashboardStyles";

const TONE_CLASS: Record<
  NonNullable<DashboardSectionSummarySegment["tone"]>,
  string
> = {
  default: "text-white/85",
  gold: "text-[#F5D76E]",
  coral: "text-[#FF8A7A]",
  mint: "text-[#B8EBD5]",
  muted: "text-white/55",
};

export type DashboardSectionSummaryTextProps = {
  segments: DashboardSectionSummarySegment[];
};

export function DashboardSectionSummaryText({
  segments,
}: DashboardSectionSummaryTextProps) {
  if (segments.length === 0) return null;

  return (
    <p className={DASHBOARD_SECTION_SUMMARY_CLASS}>
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
