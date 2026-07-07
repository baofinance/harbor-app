"use client";

import { DashboardStatChip } from "@/components/dashboard/DashboardStatChip";
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

function formatChipUsd(
  usd: number,
  isConnected: boolean,
  isLoading: boolean,
): string {
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
    <div className="flex min-w-0 flex-wrap gap-2" aria-label="Portfolio by product">
      {chips.map((chip) => (
        <DashboardStatChip
          key={chip.id}
          label={chip.label}
          value={formatChipUsd(chip.usd, isConnected, isLoading)}
          borderClass={chip.borderClass}
        />
      ))}
    </div>
  );
}
