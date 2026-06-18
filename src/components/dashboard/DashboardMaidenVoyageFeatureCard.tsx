"use client";

import Link from "next/link";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import {
  MV_CARD_INNER_GRADIENT,
  MV_MAIN_CARD_SHELL,
  MV_SECTION_LABEL,
} from "@/components/genesis/maidenVoyageLayoutStyles";
import type { DashboardActiveVoyageSnapshot } from "@/hooks/useDashboardActiveVoyage";
import { formatPercent, formatUSD } from "@/utils/formatters";
import type { FoundingMarketsSnapshot } from "./engagement/DashboardFoundingTracker";
import type { YieldHubSnapshot } from "./engagement/dashboardEngagementUtils";
import { DASHBOARD_VIEW_ALL_BTN_CLASS } from "./dashboardStyles";
import { StatusBadge } from "./portfolio/StatusBadge";

export type DashboardMaidenVoyageFeatureCardProps = {
  founding: FoundingMarketsSnapshot;
  yieldHub: YieldHubSnapshot;
  totalEarned: number;
  activeVoyage: DashboardActiveVoyageSnapshot | null;
  isConnected: boolean;
  isLoading?: boolean;
};

export function DashboardMaidenVoyageFeatureCard({
  founding,
  yieldHub,
  totalEarned,
  activeVoyage,
  isConnected,
  isLoading = false,
}: DashboardMaidenVoyageFeatureCardProps) {
  if (!isConnected) return null;

  const shareDisplay =
    isLoading || yieldHub.revenueSharePct <= 0
      ? "0%"
      : formatPercent(yieldHub.revenueSharePct, { decimals: 2 });
  const earnedDisplay = isLoading ? "…" : formatUSD(totalEarned, { compact: false });
  const boostDisplay =
    yieldHub.boostMultiplier != null && yieldHub.boostMultiplier > 0
      ? `${yieldHub.boostMultiplier}×`
      : null;

  const voyageHint =
    activeVoyage?.status === "deposits_open" && activeVoyage.filledPct != null
      ? `${activeVoyage.flowLabel} · ${activeVoyage.filledPct.toFixed(0)}% capacity`
      : activeVoyage?.flowLabel ?? null;

  return (
    <section
      className={`${MV_MAIN_CARD_SHELL} ${MV_CARD_INNER_GRADIENT} relative overflow-hidden border-l-[4px] border-l-[#FF8A7A] px-4 py-4 sm:px-5 sm:py-4`}
      aria-label="Maiden Voyage"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <div>
            <p className="text-sm font-semibold text-[#FF8A7A]">Maiden Voyage</p>
            <p className="mt-1 text-xs text-white/60">
              Harbor&apos;s flagship founding product
            </p>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Metric
              label="Founding positions"
              value={isLoading ? "…" : String(founding.joined)}
            />
            <Metric label="Revenue share" value={shareDisplay} />
            <Metric label="Lifetime revenue" value={earnedDisplay} highlight />
            {boostDisplay ? (
              <div>
                <p className={MV_SECTION_LABEL}>Boost</p>
                <div className="mt-0.5">
                  <StatusBadge label={`${boostDisplay} boost`} variant="gold" />
                </div>
              </div>
            ) : null}
          </div>

          {voyageHint ? (
            <p className="text-xs text-white/55">{voyageHint}</p>
          ) : null}

          {founding.markets.length > 0 ? (
            <ul className="space-y-1">
              {founding.markets.slice(0, 3).map((m) => (
                <li
                  key={m.label}
                  className="truncate text-xs text-white/70"
                >
                  {m.label}
                  <span className="text-white/45"> · Founding member</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <Link href="/genesis" className={DASHBOARD_VIEW_ALL_BTN_CLASS}>
          View voyages
          <ChevronRightIcon className="h-3.5 w-3.5" aria-hidden />
        </Link>
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
      <p className={MV_SECTION_LABEL}>{label}</p>
      <p
        className={`mt-0.5 font-mono text-sm font-semibold tabular-nums ${
          highlight ? "text-[#F5D76E]" : "text-white/90"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
