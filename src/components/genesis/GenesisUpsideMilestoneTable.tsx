"use client";

import { formatUSD } from "@/utils/formatters";
import type { UpsideMilestoneRow } from "@/utils/maidenVoyageRevenueShareCalculator";
import { MV_SECTION_LABEL } from "./maidenVoyageLayoutStyles";

export type GenesisUpsideMilestoneTableProps = {
  rows: UpsideMilestoneRow[];
  highlightedIndex: number;
};

function formatTvlLabel(tvlUsd: number): string {
  return formatUSD(tvlUsd, { compact: true, minDecimals: 0, maxDecimals: 1 });
}

function formatPerYear(usd: number): string {
  return `${formatUSD(usd, { compact: true, minDecimals: 0, maxDecimals: 1 })}/yr`;
}

export function GenesisUpsideMilestoneTable({
  rows,
  highlightedIndex,
}: GenesisUpsideMilestoneTableProps) {
  return (
    <div className="min-w-0">
      <p className={`mb-2 ${MV_SECTION_LABEL}`}>Growth scenarios</p>
      <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0a1929]/35">
        <table className="w-full min-w-[320px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left">
              <th className={`px-3 py-2.5 ${MV_SECTION_LABEL}`}>TVL</th>
              <th className={`px-3 py-2.5 ${MV_SECTION_LABEL}`}>Market revenue</th>
              <th className={`px-3 py-2.5 ${MV_SECTION_LABEL}`}>Your earnings</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const highlighted = index === highlightedIndex;
              return (
                <tr
                  key={row.tvlUsd}
                  className={`border-b border-white/[0.06] last:border-b-0 ${
                    highlighted ? "bg-[#B8EBD5]/10" : ""
                  }`}
                >
                  <td className="px-3 py-2.5 font-mono font-semibold tabular-nums text-white/90">
                    {formatTvlLabel(row.tvlUsd)}
                  </td>
                  <td className="px-3 py-2.5 font-mono tabular-nums text-white/80">
                    {formatPerYear(row.marketRevenuePerYear)}
                  </td>
                  <td
                    className={`px-3 py-2.5 font-mono font-semibold tabular-nums ${
                      highlighted ? "text-[#B8EBD5]" : "text-white/90"
                    }`}
                  >
                    {formatPerYear(row.yourEarningsPerYear)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
