"use client";

import type { PortfolioHealth } from "./dashboardEngagementUtils";
import {
  ENGAGEMENT_ACCENT_MINT,
  ENGAGEMENT_CARD_CLASS,
  ENGAGEMENT_LABEL_CLASS,
  ENGAGEMENT_MUTED_CLASS,
  ENGAGEMENT_SECTION_TITLE_CLASS,
  ENGAGEMENT_VALUE_CLASS,
} from "./engagementStyles";

export type DashboardPortfolioHealthWidgetProps = {
  health: PortfolioHealth;
  isConnected: boolean;
};

export function DashboardPortfolioHealthWidget({
  health,
  isConnected,
}: DashboardPortfolioHealthWidgetProps) {
  if (!isConnected) return null;

  const statusColor =
    health.status === "strong"
      ? "text-[#B8EBD5]"
      : health.status === "attention"
        ? "text-[#F5D76E]"
        : "text-white/70";

  return (
    <section
      className={`${ENGAGEMENT_CARD_CLASS} relative overflow-hidden ${ENGAGEMENT_ACCENT_MINT}`}
      aria-label="Portfolio health"
    >
      <p className={ENGAGEMENT_SECTION_TITLE_CLASS}>Portfolio health</p>
      <p className={`mt-2 font-mono text-2xl font-bold ${statusColor}`}>
        {health.statusLabel}
      </p>
      {health.averageProtectionPct != null ? (
        <p className={`${ENGAGEMENT_VALUE_CLASS} mt-2`}>
          Avg. protection {health.averageProtectionPct.toFixed(1)}%
        </p>
      ) : null}
      <p className={`${ENGAGEMENT_MUTED_CLASS} mt-1`}>
        {health.activePositions > 0
          ? `${health.activePositions} active position${health.activePositions === 1 ? "" : "s"}`
          : null}
        {health.activePositions > 0 ? " · " : ""}
        {health.message}
      </p>
    </section>
  );
}
