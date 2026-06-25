"use client";

import { formatUSD } from "@/utils/formatters";
import type { JourneyMetrics } from "./dashboardEngagementUtils";
import {
  ENGAGEMENT_CARD_CLASS,
  ENGAGEMENT_LABEL_CLASS,
  ENGAGEMENT_SECTION_TITLE_CLASS,
  ENGAGEMENT_VALUE_CLASS,
} from "./engagementStyles";

export type DashboardJourneyMetricsProps = {
  journey: JourneyMetrics;
  isConnected: boolean;
  isLoading?: boolean;
};

export function DashboardJourneyMetrics({
  journey,
  isConnected,
  isLoading = false,
}: DashboardJourneyMetricsProps) {
  if (!isConnected) return null;

  return (
    <section className={ENGAGEMENT_CARD_CLASS} aria-label="Your Harbor journey">
      <p className={ENGAGEMENT_SECTION_TITLE_CLASS}>Your Harbor journey</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric
          label="Days active"
          value={
            isLoading || journey.daysActive == null ? "—" : String(journey.daysActive)
          }
        />
        <Metric
          label="Markets joined"
          value={isLoading ? "…" : String(journey.marketsJoined)}
        />
        <Metric
          label="Revenue earned"
          value={
            isLoading ? "…" : formatUSD(journey.revenueEarned, { compact: false })
          }
          highlight
        />
        <Metric
          label="Founding positions"
          value={isLoading ? "…" : String(journey.foundingPositions)}
        />
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className={ENGAGEMENT_LABEL_CLASS}>{label}</p>
      <p
        className={`${ENGAGEMENT_VALUE_CLASS} mt-0.5 ${
          highlight ? "text-harbor-gold" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
