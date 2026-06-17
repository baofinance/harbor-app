"use client";

import type { PortfolioInsight } from "./portfolio/dashboardPortfolioUtils";
import { MV_CARD_INNER_GRADIENT, MV_CARD_SHELL, MV_SECTION_LABEL } from "@/components/genesis/maidenVoyageLayoutStyles";
import { InsightCard } from "./portfolio/InsightCard";
import { PORTFOLIO_INSIGHT_GRID_CLASS } from "./portfolio/portfolioStyles";

export type DashboardPortfolioInsightsProps = {
  insights: PortfolioInsight[];
  isConnected: boolean;
};

export function DashboardPortfolioInsights({
  insights,
  isConnected,
}: DashboardPortfolioInsightsProps) {
  if (!isConnected || insights.length === 0) return null;

  return (
    <section
      className={`${MV_CARD_SHELL} ${MV_CARD_INNER_GRADIENT} px-4 py-3.5 sm:px-5 sm:py-4`}
      aria-label="Portfolio insights"
    >
      <p className={`${MV_SECTION_LABEL} mb-3`}>Portfolio insights</p>
      <div className={PORTFOLIO_INSIGHT_GRID_CLASS}>
        {insights.map((insight) => (
          <InsightCard
            key={insight.id}
            label={insight.label}
            value={insight.value}
            subvalue={insight.subvalue}
          />
        ))}
      </div>
    </section>
  );
}
