"use client";

import { formatUSD } from "@/utils/formatters";
import type { RevenuePeriodBucket } from "./dashboardEngagementUtils";
import { MiniSparkline } from "./MiniSparkline";
import {
  ENGAGEMENT_CARD_CLASS,
  ENGAGEMENT_LABEL_CLASS,
  ENGAGEMENT_MUTED_CLASS,
  ENGAGEMENT_SECTION_TITLE_CLASS,
  ENGAGEMENT_VALUE_CLASS,
} from "./engagementStyles";

export type DashboardRevenueHistoryProps = {
  periods: RevenuePeriodBucket[];
  sparkline: number[];
  isConnected: boolean;
  isLoading?: boolean;
};

export function DashboardRevenueHistory({
  periods,
  sparkline,
  isConnected,
  isLoading = false,
}: DashboardRevenueHistoryProps) {
  if (!isConnected) return null;

  return (
    <section className={ENGAGEMENT_CARD_CLASS} aria-label="Revenue history">
      <p className={ENGAGEMENT_SECTION_TITLE_CLASS}>Revenue earned</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {periods.map((p) => (
          <div key={p.label}>
            <p className={ENGAGEMENT_LABEL_CLASS}>{p.label}</p>
            <p className={`${ENGAGEMENT_VALUE_CLASS} mt-0.5 text-[#F5D76E]`}>
              {isLoading ? "…" : formatUSD(p.usd, { compact: false })}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-white/[0.08] pt-3">
        <div>
          <p className={ENGAGEMENT_LABEL_CLASS}>Revenue trend</p>
          <p className={ENGAGEMENT_MUTED_CLASS}>Last 14 days</p>
        </div>
        <MiniSparkline data={sparkline} width={140} height={40} />
      </div>
    </section>
  );
}
