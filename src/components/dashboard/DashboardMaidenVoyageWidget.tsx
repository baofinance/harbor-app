"use client";

import Link from "next/link";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import {
  MV_CARD_INNER_GRADIENT,
  MV_CARD_SHELL,
  MV_PROGRESS_FILL,
  MV_PROGRESS_FILL_COMPLETE,
  MV_PROGRESS_TRACK,
  MV_SECTION_LABEL,
} from "@/components/genesis/maidenVoyageLayoutStyles";
import { GenesisVoyageStatusBadge } from "@/components/genesis/GenesisVoyageStatusBadge";
import type { DashboardActiveVoyageSnapshot } from "@/hooks/useDashboardActiveVoyage";
import { formatUSD } from "@/utils/formatters";
import { DASHBOARD_VIEW_ALL_BTN_CLASS } from "./dashboardStyles";

export type DashboardMaidenVoyageWidgetProps = {
  voyage: DashboardActiveVoyageSnapshot | null;
  userPositionUsd?: number;
  isConnected: boolean;
  compact?: boolean;
};

function formatCapacityAmount(usd: number | null | undefined): string {
  if (usd == null || !Number.isFinite(usd)) return "—";
  if (usd >= 1_000_000) return formatUSD(usd, { compact: true });
  return formatUSD(usd, { compact: false });
}

export function DashboardMaidenVoyageWidget({
  voyage,
  userPositionUsd = 0,
  isConnected,
  compact = false,
}: DashboardMaidenVoyageWidgetProps) {
  if (!voyage) return null;

  const filledPct = voyage.filledPct ?? 0;
  const isComplete = filledPct >= 100;
  const userUsd =
    userPositionUsd > 0 ? userPositionUsd : voyage.userDepositUsd ?? 0;

  const capacityLabel =
    voyage.capTotalUsd != null && voyage.capTotalUsd > 0
      ? `${formatCapacityAmount(voyage.capCurrentUsd)} / ${formatCapacityAmount(voyage.capTotalUsd)}`
      : voyage.filledPct != null
        ? `${filledPct < 0.1 && filledPct > 0 ? "<0.1" : filledPct.toFixed(1)}% filled`
        : "Capacity unavailable";

  return (
    <section
      className={`${MV_CARD_SHELL} ${MV_CARD_INNER_GRADIENT} relative overflow-hidden border-l-[3px] border-l-harbor-coral ${
        compact ? "" : ""
      }`}
      aria-label="Active maiden voyage"
    >
      <div className="px-4 py-3.5 sm:px-5 sm:py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-harbor-coral/90">
              Current voyage
            </p>
            <p className="mt-0.5 truncate text-base font-semibold text-white/95">
              {voyage.flowLabel}
            </p>
            <p className="truncate text-xs text-white/60">{voyage.voyageLabel}</p>
          </div>
          <Link href="/genesis" className={DASHBOARD_VIEW_ALL_BTN_CLASS}>
            Go
            <ChevronRightIcon className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <GenesisVoyageStatusBadge status={voyage.status} />
          <span className="text-xs text-white/60">{voyage.statusLabel}</span>
        </div>

        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className={MV_SECTION_LABEL}>Capacity</p>
            <p className="text-xs tabular-nums text-white/75">{capacityLabel}</p>
          </div>
          <div className={MV_PROGRESS_TRACK}>
            <div
              className={isComplete ? MV_PROGRESS_FILL_COMPLETE : MV_PROGRESS_FILL}
              style={{ width: `${Math.min(100, Math.max(0, filledPct))}%` }}
              role="progressbar"
              aria-valuenow={filledPct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {isConnected && userUsd > 0 ? (
          <div className="mt-3 rounded-lg border border-white/[0.08] bg-[#0a1929]/35 px-3 py-2">
            <p className={MV_SECTION_LABEL}>Your position</p>
            <p className="mt-0.5 font-mono text-base font-semibold tabular-nums text-white/90">
              {formatUSD(userUsd, { compact: false })}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
