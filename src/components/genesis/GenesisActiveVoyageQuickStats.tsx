"use client";

import { maidenVoyageCapUsd } from "@/config/maidenVoyageCap";
import type { GenesisVoyageCapDisplay } from "@/utils/genesisVoyageCapDisplay";
import { formatUSD } from "@/utils/formatters";
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
};

export function GenesisActiveVoyageQuickStats({
  capDisplay,
  yieldRevSharePct = null,
  genesisAddress,
}: GenesisActiveVoyageQuickStatsProps) {
  const capacityLabel = capDisplay.useTokenCap
    ? `${capDisplay.capCurrent.toFixed(2)} / ${capDisplay.capTotal.toFixed(0)}`
    : `$${capDisplay.capCurrentUsd.toFixed(0)} / $${capDisplay.capTotalUsd.toFixed(0)}`;

  const capUsd =
    maidenVoyageCapUsd(genesisAddress?.toLowerCase() ?? null) ??
    (capDisplay.capTotalUsd > 0 ? capDisplay.capTotalUsd : null);
  const estimatedOwnershipPct =
    capUsd && capUsd > 0 ? (Math.min(1000, capUsd) / capUsd) * 100 : null;
  const hasUserOwnership = capDisplay.ownershipShare > 0;
  const ownershipLabel = hasUserOwnership
    ? `${(capDisplay.ownershipShare * 100).toFixed(2)}%`
    : estimatedOwnershipPct != null
      ? `${estimatedOwnershipPct.toFixed(2)}%`
      : "—";

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
          {hasUserOwnership ? "Your share" : "Est. at $1k"}
        </p>
        <p className="mt-1 font-mono text-sm font-semibold text-white/90">
          {ownershipLabel}
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
