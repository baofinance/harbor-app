"use client";

import { ChevronRightIcon } from "@heroicons/react/24/outline";
import {
  MV_PROGRESS_FILL,
  MV_PROGRESS_TRACK,
  MV_SECTION_LABEL,
} from "@/components/genesis/maidenVoyageLayoutStyles";
import { formatUSD } from "@/utils/formatters";
import { DASHBOARD_VIEW_ALL_BTN_CLASS } from "../dashboardStyles";
import { StatusBadge } from "../portfolio/StatusBadge";
import type { YieldHubSnapshot } from "./dashboardEngagementUtils";
import {
  ENGAGEMENT_ACCENT_GOLD,
  ENGAGEMENT_CARD_CLASS,
  ENGAGEMENT_LABEL_CLASS,
  ENGAGEMENT_SECTION_TITLE_CLASS,
  ENGAGEMENT_VALUE_CLASS,
} from "./engagementStyles";

export type DashboardYieldShareHubProps = {
  hub: YieldHubSnapshot;
  isConnected: boolean;
  isLoading?: boolean;
  onViewDetails?: () => void;
};

export function DashboardYieldShareHub({
  hub,
  isConnected,
  isLoading = false,
  onViewDetails,
}: DashboardYieldShareHubProps) {
  const shareDisplay =
    !isConnected || isLoading
      ? "—"
      : hub.revenueSharePct > 0
        ? `${hub.revenueSharePct.toFixed(2)}%`
        : "0%";
  const boostDisplay =
    !isConnected || isLoading
      ? "—"
      : hub.boostMultiplier != null
        ? `${hub.boostMultiplier}×`
        : "—";
  const earnedDisplay =
    !isConnected || isLoading ? "—" : formatUSD(hub.revenueEarned, { compact: false });
  const eligibleDisplay =
    !isConnected || isLoading || hub.eligibleSinceDays == null
      ? "—"
      : `${hub.eligibleSinceDays} days`;

  return (
    <section
      className={`${ENGAGEMENT_CARD_CLASS} relative overflow-hidden ${ENGAGEMENT_ACCENT_GOLD}`}
      aria-label="Yield share hub"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={ENGAGEMENT_SECTION_TITLE_CLASS}>Yield share</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {isConnected && hub.boostMultiplier != null && hub.boostMultiplier > 1 ? (
              <StatusBadge label={`${hub.boostMultiplier}× boost`} variant="gold" surface="dark" />
            ) : null}
          </div>
        </div>
        {onViewDetails ? (
          <button type="button" className={DASHBOARD_VIEW_ALL_BTN_CLASS} onClick={onViewDetails}>
            Details
            <ChevronRightIcon className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Metric label="Current share" value={shareDisplay} />
        <Metric label="Current boost" value={boostDisplay} highlight />
        <Metric label="Revenue earned" value={earnedDisplay} highlight />
        <Metric label="Eligible since" value={eligibleDisplay} />
        <Metric label="Next milestone" value={hub.nextMilestoneLabel} />
      </div>

      {isConnected && hub.milestoneTarget > 0 ? (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className={MV_SECTION_LABEL}>
              {hub.boostMultiplier != null ? `${hub.boostMultiplier}× boost` : "Boost progress"}
            </p>
            <p className="text-xs tabular-nums text-white/70">
              {hub.milestoneCurrent} / {hub.milestoneTarget} days
            </p>
          </div>
          <div className={MV_PROGRESS_TRACK}>
            <div
              className={MV_PROGRESS_FILL}
              style={{ width: `${hub.milestoneProgressPct}%` }}
              role="progressbar"
              aria-valuenow={hub.milestoneCurrent}
              aria-valuemin={0}
              aria-valuemax={hub.milestoneTarget}
            />
          </div>
        </div>
      ) : null}
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
    <div className="min-w-0">
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
