"use client";

import { formatUSD, formatPercent } from "@/utils/formatters";
import { MV_GLASS_INSET_DARK, MV_SECTION_LABEL } from "./maidenVoyageLayoutStyles";

export type GenesisUpsideSummaryStatsProps = {
  marketRevenuePerYear: number;
  yourSharePct: number;
  annualEarningsUsd: number;
  foreverAprPct: number | null;
  milestoneAprCallouts: Array<{ tvlLabel: string; foreverAprPct: number | null }>;
};

function StatTile({
  label,
  value,
  valueClassName = "text-white/95",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div
      className={`${MV_GLASS_INSET_DARK} flex min-w-0 flex-col items-center justify-center px-3 py-3 text-center`}
    >
      <p className={MV_SECTION_LABEL}>{label}</p>
      <p
        className={`mt-1 font-mono text-lg font-semibold tabular-nums sm:text-xl ${valueClassName}`}
      >
        {value}
      </p>
    </div>
  );
}

function formatForeverApr(pct: number | null): string {
  if (pct == null || !Number.isFinite(pct) || pct <= 0) return "—";
  return formatPercent(pct, { decimals: pct >= 10 ? 1 : 2 });
}

export function GenesisUpsideSummaryStats({
  marketRevenuePerYear,
  yourSharePct,
  annualEarningsUsd,
  foreverAprPct,
  milestoneAprCallouts,
}: GenesisUpsideSummaryStatsProps) {
  const shareDisplay =
    yourSharePct > 0
      ? formatPercent(yourSharePct, { decimals: yourSharePct >= 0.01 ? 2 : 4 })
      : "—";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          label="Market revenue"
          value={`${formatUSD(marketRevenuePerYear, { compact: false })} / yr`}
        />
        <StatTile label="Your lifetime share" value={shareDisplay} />
        <StatTile
          label="Your annual earnings"
          value={`${formatUSD(annualEarningsUsd, { compact: false })} / yr`}
          valueClassName="text-[#B8EBD5]"
        />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <StatTile
          label="Forever APR"
          value={formatForeverApr(foreverAprPct)}
          valueClassName="text-[#B8EBD5]"
        />
        {milestoneAprCallouts.map((item) => (
          <StatTile
            key={item.tvlLabel}
            label={`At ${item.tvlLabel} TVL`}
            value={formatForeverApr(item.foreverAprPct)}
            valueClassName="text-[#B8EBD5]"
          />
        ))}
      </div>
    </div>
  );
}
