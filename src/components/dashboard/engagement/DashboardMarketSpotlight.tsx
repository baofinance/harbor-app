"use client";

import Link from "next/link";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import {
  MV_PROGRESS_FILL,
  MV_PROGRESS_TRACK,
  MV_SECTION_LABEL,
} from "@/components/genesis/maidenVoyageLayoutStyles";
import { GenesisVoyageStatusBadge } from "@/components/genesis/GenesisVoyageStatusBadge";
import type { DashboardActiveVoyageSnapshot } from "@/hooks/useDashboardActiveVoyage";
import { DASHBOARD_VIEW_ALL_BTN_CLASS } from "../dashboardStyles";
import {
  ENGAGEMENT_ACCENT_CORAL,
  ENGAGEMENT_CARD_CLASS,
  ENGAGEMENT_MUTED_CLASS,
  ENGAGEMENT_SECTION_TITLE_CLASS,
} from "./engagementStyles";

export type DashboardMarketSpotlightProps = {
  voyage: DashboardActiveVoyageSnapshot | null;
  revenueAllocationPct?: number | null;
  isConnected: boolean;
};

export function DashboardMarketSpotlight({
  voyage,
  revenueAllocationPct,
  isConnected,
}: DashboardMarketSpotlightProps) {
  if (!voyage) return null;

  const filledPct = voyage.filledPct ?? 0;
  const closingSoon = filledPct >= 75 && voyage.status === "deposits_open";

  return (
    <section
      className={`${ENGAGEMENT_CARD_CLASS} relative overflow-hidden ${ENGAGEMENT_ACCENT_CORAL}`}
      aria-label="Featured market"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#FF8A7A]/90">
            Featured market
          </p>
          <p className={`${ENGAGEMENT_SECTION_TITLE_CLASS} mt-0.5 truncate`}>
            {voyage.flowLabel}
          </p>
          <p className={`${ENGAGEMENT_MUTED_CLASS} truncate`}>{voyage.voyageLabel}</p>
        </div>
        <Link href="/genesis" className={DASHBOARD_VIEW_ALL_BTN_CLASS}>
          View
          <ChevronRightIcon className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <GenesisVoyageStatusBadge status={voyage.status} />
        {closingSoon ? (
          <span className="text-xs font-medium text-[#F5D76E]">Deposits closing soon</span>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className={MV_SECTION_LABEL}>Capacity</p>
          <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-white/90">
            {filledPct < 0.1 && filledPct > 0 ? "<0.1" : filledPct.toFixed(0)}%
          </p>
        </div>
        {revenueAllocationPct != null && revenueAllocationPct > 0 ? (
          <div>
            <p className={MV_SECTION_LABEL}>Revenue allocation</p>
            <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-white/90">
              {revenueAllocationPct.toFixed(1)}%
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-3">
        <div className={MV_PROGRESS_TRACK}>
          <div
            className={MV_PROGRESS_FILL}
            style={{ width: `${Math.min(100, filledPct)}%` }}
            role="progressbar"
            aria-valuenow={filledPct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>
    </section>
  );
}
