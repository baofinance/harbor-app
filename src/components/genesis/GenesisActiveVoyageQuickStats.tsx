"use client";

import type { GenesisVoyageCapDisplay } from "@/utils/genesisVoyageCapDisplay";
import { formatUSD } from "@/utils/formatters";
import { resolveMaidenVoyageYieldShareLabel } from "@/utils/maidenVoyageYieldShareEstimate";
import { MV_STAT_TILE } from "./maidenVoyageLayoutStyles";

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

export type GenesisActiveVoyageQuickStatsProps = {
  capDisplay: GenesisVoyageCapDisplay;
  yieldRevSharePct?: number | null;
  genesisAddress?: string;
  userDepositUsd?: number | null;
};

export function GenesisActiveVoyageQuickStats({
  capDisplay,
  yieldRevSharePct = null,
  genesisAddress,
  userDepositUsd = null,
}: GenesisActiveVoyageQuickStatsProps) {
  const capacityLabel = capDisplay.useTokenCap
    ? `${capDisplay.capCurrent.toFixed(2)} / ${capDisplay.capTotal.toFixed(0)}`
    : `$${capDisplay.capCurrentUsd.toFixed(0)} / $${capDisplay.capTotalUsd.toFixed(0)}`;

  const yieldShare = resolveMaidenVoyageYieldShareLabel({
    capDisplay,
    genesisAddress,
    yieldRevSharePct,
    userDepositUsd,
  });
  const hasUserDeposit =
    capDisplay.countedUsd > 0 ||
    capDisplay.ownershipShare > 0 ||
    (userDepositUsd != null && userDepositUsd > 0);

  return (
    <div className={`${MV_STAT_TILE} mb-4 grid grid-cols-3 gap-3 p-2.5`}>
      <div>
        <p className="text-[10px] uppercase tracking-wide text-white/45">
          Capacity
        </p>
        <p className="mt-1 font-mono text-sm font-semibold text-white/90">
          {capacityLabel}
        </p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wide text-white/45">
          {hasUserDeposit ? "Your est. share" : "Est. at $1k"}
        </p>
        <p className="mt-1 font-mono text-sm font-semibold text-white/90">
          {yieldShare.label}
        </p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wide text-white/45">
          Revenue share
        </p>
        <p className="mt-1 font-mono text-sm font-semibold text-white/90">
          {yieldRevSharePct != null ? `${yieldRevSharePct}%` : "—"}
        </p>
      </div>
    </div>
  );
}
