"use client";

import { MV_STAT_TILE, MV_SECTION_LABEL } from "@/components/genesis/maidenVoyageLayoutStyles";
import { formatUSD } from "@/utils/formatters";

export type PortfolioCategoryChip = {
  id: string;
  label: string;
  usd: number;
  borderClass: string;
};

export type DashboardPortfolioCategoryChipsProps = {
  chips: PortfolioCategoryChip[];
  revenueShareYieldUsd: number;
  earnYieldUsd: number;
  isConnected: boolean;
  isLoading?: boolean;
  isEarnLoading?: boolean;
};

function formatStatUsd(
  usd: number,
  isConnected: boolean,
  isLoading: boolean,
): string {
  if (!isConnected) return "—";
  if (isLoading) return "…";
  return formatUSD(usd, { compact: false });
}

function YieldStatBox({
  label,
  value,
  accentClass,
}: {
  label: string;
  value: string;
  accentClass: string;
}) {
  return (
    <div className={`${MV_STAT_TILE} border-l-[3px] ${accentClass} px-3 py-2 text-right`}>
      <p className={MV_SECTION_LABEL}>{label}</p>
      <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-[#F5D76E]">
        {value}
      </p>
    </div>
  );
}

export function DashboardPortfolioCategoryChips({
  chips,
  revenueShareYieldUsd,
  earnYieldUsd,
  isConnected,
  isLoading = false,
  isEarnLoading = false,
}: DashboardPortfolioCategoryChipsProps) {
  return (
    <div
      className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:justify-between sm:gap-3"
      aria-label="Portfolio by product"
    >
      <div className="flex min-w-0 flex-wrap gap-2">
        {chips.map((chip) => (
          <div
            key={chip.id}
            className={`${MV_STAT_TILE} border-l-[3px] ${chip.borderClass} px-3 py-2`}
          >
            <span className="text-xs font-medium text-white/70">{chip.label}</span>
            <span className="ml-2 font-mono text-sm font-semibold tabular-nums text-white/95">
              {formatStatUsd(chip.usd, isConnected, isLoading)}
            </span>
          </div>
        ))}
      </div>

      {isConnected ? (
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          <YieldStatBox
            label="Revenue share yield"
            value={formatStatUsd(revenueShareYieldUsd, isConnected, isLoading)}
            accentClass="border-l-[#F5D76E]/70"
          />
          <YieldStatBox
            label="Earn yield"
            value={formatStatUsd(earnYieldUsd, isConnected, isEarnLoading)}
            accentClass="border-l-[#B8EBD5]/70"
          />
        </div>
      ) : null}
    </div>
  );
}
