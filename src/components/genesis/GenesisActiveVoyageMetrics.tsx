"use client";

import { maidenVoyageCapUsd } from "@/config/maidenVoyageCap";
import type { ActiveVoyageStatus } from "@/utils/activeVoyageStatus";
import { getActiveVoyageZeroStateCopy } from "@/utils/activeVoyageStatus";
import type { GenesisVoyageCapDisplay } from "@/utils/genesisVoyageCapDisplay";
import { formatUSD } from "@/utils/formatters";
import {
  MV_ACCENT_GRADIENT,
  MV_CAPTION_TEXT,
  MV_PROGRESS_FILL,
  MV_PROGRESS_FILL_COMPLETE,
  MV_PROGRESS_TRACK,
  MV_METRIC_STAT_COLUMN,
  MV_SECTION_LABEL,
  MV_TEXT_ON_GLASS,
} from "./maidenVoyageLayoutStyles";

function stripLabel(symbol: string): string {
  const s = symbol.trim();
  const lower = s.toLowerCase();
  if (lower === "wsteth") return "wstETH";
  if (lower === "steth") return "stETH";
  if (lower === "hausd") return "haUSD";
  if (lower.startsWith("hs")) return `hs${s.slice(2)}`;
  if (lower.startsWith("ha")) return `ha${s.slice(2)}`;
  return s;
}

function resolveOwnershipLabel(
  capDisplay: GenesisVoyageCapDisplay,
  genesisAddress?: string,
): { label: string; caption: string } {
  const capUsd =
    maidenVoyageCapUsd(genesisAddress?.toLowerCase() ?? null) ??
    (capDisplay.capTotalUsd > 0 ? capDisplay.capTotalUsd : null);
  const estimatedOwnershipPct =
    capUsd && capUsd > 0 ? (Math.min(1000, capUsd) / capUsd) * 100 : null;
  const hasUserOwnership = capDisplay.ownershipShare > 0;

  if (hasUserOwnership) {
    return {
      label: `${(capDisplay.ownershipShare * 100).toFixed(2)}%`,
      caption: "Your current share",
    };
  }

  return {
    label:
      estimatedOwnershipPct != null
        ? `${estimatedOwnershipPct.toFixed(2)}%`
        : "—",
    caption: "With $1,000 deposit",
  };
}

export type GenesisActiveVoyageMetricsProps = {
  capDisplay: GenesisVoyageCapDisplay | null;
  isLoading: boolean;
  isUnavailable: boolean;
  voyageStatus: ActiveVoyageStatus;
  yieldRevSharePct?: number | null;
  genesisAddress?: string;
};

export function GenesisActiveVoyageMetrics({
  capDisplay,
  isLoading,
  isUnavailable,
  voyageStatus,
  yieldRevSharePct = null,
  genesisAddress,
}: GenesisActiveVoyageMetricsProps) {
  if (isLoading) {
    return (
      <div
        className="h-20 animate-pulse rounded-xl bg-white/[0.08]"
        aria-label="Loading capacity"
      />
    );
  }

  if (isUnavailable || !capDisplay) {
    return (
      <p className="text-sm text-white/60">Capacity data unavailable</p>
    );
  }

  const { filledPct, capFilled } = capDisplay;
  const progressWidth = `${Math.min(100, Math.max(0, filledPct))}%`;

  const capacityFractionLabel = capDisplay.useTokenCap
    ? `${capDisplay.capCurrent.toFixed(2)} / ${capDisplay.capTotal.toFixed(0)} ${stripLabel(capDisplay.collateralSymbol)}`
    : `${formatUSD(capDisplay.capCurrentUsd)} / ${formatUSD(capDisplay.capTotalUsd)}`;

  const remainingLabel = capDisplay.useTokenCap
    ? `${formatRemainingToken(capDisplay.remaining)} ${stripLabel(capDisplay.collateralSymbol)} remaining`
    : `${formatUSD(capDisplay.remainingUsd)} remaining`;

  const zeroState = getActiveVoyageZeroStateCopy(voyageStatus, filledPct);
  const ownership = resolveOwnershipLabel(capDisplay, genesisAddress);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.5fr)_minmax(0,0.75fr)_minmax(0,0.75fr)] md:items-center md:gap-0">
      <div className="min-w-0 md:pr-4">
        <p className={MV_SECTION_LABEL}>Voyage Capacity</p>
        <p className="mt-0.5 font-mono text-2xl font-bold tabular-nums leading-none sm:text-3xl">
          <span className={MV_ACCENT_GRADIENT}>{filledPct.toFixed(0)}%</span>{" "}
          <span className="text-lg font-bold uppercase text-white/90 sm:text-xl">
            filled
          </span>
        </p>

        <div
          className={`mt-2 h-3 ${MV_PROGRESS_TRACK}`}
          role="progressbar"
          aria-valuenow={Math.round(filledPct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Deposit cap progress"
        >
          <div
            className={capFilled ? MV_PROGRESS_FILL_COMPLETE : MV_PROGRESS_FILL}
            style={{ width: progressWidth }}
          />
        </div>

        <div
          className={`mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 ${MV_CAPTION_TEXT} ${MV_TEXT_ON_GLASS}`}
        >
          <span className="font-mono font-semibold tabular-nums text-white/80">
            {capacityFractionLabel}
          </span>
          <span className="font-mono font-semibold tabular-nums text-[#FF8A7A]">
            {remainingLabel}
          </span>
        </div>

        {zeroState ? (
          <p className={`mt-1.5 ${MV_CAPTION_TEXT} text-[#B8EBD5]`}>
            {zeroState.line1}
          </p>
        ) : null}
      </div>

      <div
        className={`min-w-0 border-t border-white/10 pt-3 md:border-l md:border-t-0 md:px-4 md:pt-0 ${MV_METRIC_STAT_COLUMN}`}
      >
        <p className={MV_SECTION_LABEL}>Est. Your Share</p>
        <p className="mt-0.5 font-mono text-2xl font-bold tabular-nums text-white/95 sm:text-3xl">
          {ownership.label}
        </p>
        <p className={`mt-0.5 ${MV_CAPTION_TEXT}`}>{ownership.caption}</p>
      </div>

      <div
        className={`min-w-0 border-t border-white/10 pt-3 md:border-l md:border-t-0 md:pl-4 md:pt-0 ${MV_METRIC_STAT_COLUMN}`}
      >
        <p className={MV_SECTION_LABEL}>Revenue Share</p>
        <p className="mt-0.5 font-mono text-2xl font-bold tabular-nums text-white/95 sm:text-3xl">
          {yieldRevSharePct != null ? `${yieldRevSharePct}%` : "—"}
        </p>
        <p className={`mt-0.5 ${MV_CAPTION_TEXT}`}>Eligible pool share</p>
      </div>
    </div>
  );
}

function formatRemainingToken(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "0";
  if (amount >= 1000) return amount.toFixed(0);
  if (amount >= 1) return amount.toFixed(2);
  return amount.toFixed(4);
}
