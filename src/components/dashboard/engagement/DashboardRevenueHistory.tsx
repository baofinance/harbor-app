"use client";

import { formatUSD } from "@/utils/formatters";
import type { RevenuePeriodBucket } from "./dashboardEngagementUtils";
import { MiniSparkline } from "./MiniSparkline";
import {
  DASHBOARD_ACTIVITY_INSET_PANEL_CLASS,
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

  const sortedPeriods = [...periods].sort((a, b) => {
    if (a.label === "All time") return -1;
    if (b.label === "All time") return 1;
    return 0;
  });

  return (
    <section className={DASHBOARD_ACTIVITY_INSET_PANEL_CLASS} aria-label="Revenue history">
      <p className={ENGAGEMENT_SECTION_TITLE_CLASS}>Revenue earned</p>
      <p className={`mt-0.5 ${ENGAGEMENT_MUTED_CLASS}`}>
        Distributed from founding participation
      </p>
      <div className="mt-2.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {sortedPeriods.map((p) => {
          const isAllTime = p.label === "All time";
          return (
            <div key={p.label}>
              <p
                className={`${ENGAGEMENT_LABEL_CLASS} ${
                  isAllTime ? "font-semibold text-white/70" : ""
                }`}
              >
                {p.label}
              </p>
              <p
                className={`${ENGAGEMENT_VALUE_CLASS} mt-0.5 ${
                  isAllTime ? "text-[#F5D76E]" : "text-white/90"
                }`}
              >
                {isLoading ? "…" : formatUSD(p.usd, { compact: false })}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-end justify-between gap-3 border-t border-white/[0.05] pt-2.5">
        <div>
          <p className={ENGAGEMENT_LABEL_CLASS}>Daily distributions</p>
          <p className={ENGAGEMENT_MUTED_CLASS}>Last 14 days</p>
        </div>
        <MiniSparkline data={sparkline} width={140} height={40} />
      </div>
    </section>
  );
}
