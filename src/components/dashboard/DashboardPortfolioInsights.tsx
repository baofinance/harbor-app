"use client";

import type { PortfolioInsightLine } from "./portfolio/dashboardPortfolioUtils";
import { MV_SECTION_LABEL } from "@/components/genesis/maidenVoyageLayoutStyles";
import {
  DASHBOARD_INTELLIGENCE_CARD_CLASS,
  ENGAGEMENT_SECTION_TITLE_CLASS,
} from "./engagement/engagementStyles";

export type DashboardPortfolioInsightsProps = {
  lines: PortfolioInsightLine[];
  isConnected: boolean;
};

export function DashboardPortfolioInsights({
  lines,
  isConnected,
}: DashboardPortfolioInsightsProps) {
  if (!isConnected || lines.length === 0) return null;

  return (
    <section className={DASHBOARD_INTELLIGENCE_CARD_CLASS} aria-label="Portfolio insight">
      <p className={ENGAGEMENT_SECTION_TITLE_CLASS}>Portfolio insight</p>
      <dl className="mt-3 space-y-2">
        {lines.map((line) => (
          <div
            key={line.id}
            className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3"
          >
            <dt className={MV_SECTION_LABEL}>{line.label}</dt>
            <dd className="truncate font-mono text-sm font-semibold tabular-nums text-white/90 sm:text-right">
              {line.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
