"use client";

import type { DashboardActiveVoyageSnapshot } from "@/hooks/useDashboardActiveVoyage";
import { GenesisVoyageStatusBadge } from "@/components/genesis/GenesisVoyageStatusBadge";
import { formatUSD } from "@/utils/formatters";
import { DASHBOARD_MV_PREVIEW_CLASS } from "./dashboardStyles";

export type DashboardMaidenVoyagePreviewProps = {
  voyage: DashboardActiveVoyageSnapshot | null;
  userPositionUsd?: number;
  isConnected: boolean;
};

export function DashboardMaidenVoyagePreview({
  voyage,
  userPositionUsd = 0,
  isConnected,
}: DashboardMaidenVoyagePreviewProps) {
  if (!voyage) return null;

  const filledLabel =
    voyage.filledPct != null
      ? `${voyage.filledPct < 0.1 && voyage.filledPct > 0 ? "<0.1" : voyage.filledPct.toFixed(1)}% filled`
      : voyage.isLoading
        ? "Loading capacity…"
        : "Capacity unavailable";

  const participation =
    isConnected && userPositionUsd > 0
      ? `Your deposit · ${formatUSD(userPositionUsd, { compact: false })}`
      : isConnected && voyage.userDepositUsd && voyage.userDepositUsd > 0
        ? `Your deposit · ${formatUSD(voyage.userDepositUsd, { compact: false })}`
        : null;

  return (
    <div className={DASHBOARD_MV_PREVIEW_CLASS}>
      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#FF8A7A]/90">
            Active voyage
          </p>
          <p className="truncate text-sm font-medium text-white/90">{voyage.voyageLabel}</p>
          <p className="truncate text-xs text-white/60">{voyage.flowLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-xs tabular-nums text-white/75">{filledLabel}</span>
          <GenesisVoyageStatusBadge status={voyage.status} />
        </div>
      </div>
      {participation ? (
        <p className="shrink-0 text-xs font-medium text-white/70 sm:text-right">
          {participation}
        </p>
      ) : null}
    </div>
  );
}
