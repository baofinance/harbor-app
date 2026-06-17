"use client";

import Link from "next/link";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { MV_CARD_INNER_GRADIENT, MV_CARD_SHELL, MV_PROGRESS_FILL, MV_PROGRESS_TRACK, MV_SECTION_LABEL } from "@/components/genesis/maidenVoyageLayoutStyles";
import { formatUSD } from "@/utils/formatters";
import { DASHBOARD_VIEW_ALL_BTN_CLASS } from "./dashboardStyles";
import { StatusBadge } from "./portfolio/StatusBadge";

export type DashboardYieldShareSummaryCardProps = {
  revenueSharePct: number;
  boostMultiplier: number | null;
  revenueEarned: number;
  isConnected: boolean;
  isLoading?: boolean;
  onViewDetails?: () => void;
};

export function DashboardYieldShareSummaryCard({
  revenueSharePct,
  boostMultiplier,
  revenueEarned,
  isConnected,
  isLoading = false,
  onViewDetails,
}: DashboardYieldShareSummaryCardProps) {
  const shareDisplay =
    !isConnected || isLoading
      ? "—"
      : revenueSharePct > 0
        ? `${revenueSharePct.toFixed(2)}%`
        : "0%";
  const boostDisplay =
    !isConnected || isLoading
      ? "—"
      : boostMultiplier != null && boostMultiplier > 0
        ? `${boostMultiplier}×`
        : "—";
  const earnedDisplay =
    !isConnected || isLoading ? "—" : formatUSD(revenueEarned, { compact: false });

  return (
    <section
      className={`${MV_CARD_SHELL} ${MV_CARD_INNER_GRADIENT} relative overflow-hidden border-l-[3px] border-l-[#F5D76E]`}
      aria-label="Yield share summary"
    >
      <div className="px-4 py-3.5 sm:px-5 sm:py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white/95">Yield share</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {isConnected && boostMultiplier != null && boostMultiplier > 1 ? (
                <StatusBadge
                  label={`${boostMultiplier}× Boost`}
                  variant="gold"
                />
              ) : null}
              {isConnected && revenueSharePct > 0 ? (
                <StatusBadge label="Yield share eligible" variant="gold" />
              ) : null}
            </div>
          </div>
          {onViewDetails ? (
            <button type="button" className={DASHBOARD_VIEW_ALL_BTN_CLASS} onClick={onViewDetails}>
              View details
              <ChevronRightIcon className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <Metric label="Revenue share" value={shareDisplay} />
          <Metric label="Boost level" value={boostDisplay} />
          <Metric label="Revenue earned" value={earnedDisplay} highlight />
        </div>
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
    <div className="min-w-0">
      <p className={MV_SECTION_LABEL}>{label}</p>
      <p
        className={`mt-0.5 font-mono text-sm font-semibold tabular-nums sm:text-base ${
          highlight ? "text-[#F5D76E]" : "text-white/90"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
