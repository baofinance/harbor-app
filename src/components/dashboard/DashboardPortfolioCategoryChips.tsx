"use client";

import { MV_STAT_TILE } from "@/components/genesis/maidenVoyageLayoutStyles";
import { formatUSD } from "@/utils/formatters";

export type PortfolioCategoryChip = {
  id: string;
  label: string;
  usd: number;
  borderClass: string;
};

export type DashboardPortfolioCategoryChipsProps = {
  chips: PortfolioCategoryChip[];
  isConnected: boolean;
  isLoading?: boolean;
};

function formatChipUsd(usd: number, isConnected: boolean, isLoading: boolean): string {
  if (!isConnected) return "—";
  if (isLoading) return "…";
  return formatUSD(usd, { compact: false });
}

export function DashboardPortfolioCategoryChips({
  chips,
  isConnected,
  isLoading = false,
}: DashboardPortfolioCategoryChipsProps) {
  return (
    <div
      className="flex flex-wrap gap-2"
      aria-label="Portfolio by product"
    >
      {chips.map((chip) => (
        <div
          key={chip.id}
          className={`${MV_STAT_TILE} border-l-[3px] ${chip.borderClass} px-3 py-2`}
        >
          <span className="text-xs font-medium text-white/70">{chip.label}</span>
          <span className="ml-2 font-mono text-sm font-semibold tabular-nums text-white/95">
            {formatChipUsd(chip.usd, isConnected, isLoading)}
          </span>
        </div>
      ))}
    </div>
  );
}
