"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatUSD } from "@/utils/formatters";
import type { UpsideMilestoneRow } from "@/utils/maidenVoyageRevenueShareCalculator";
import { MV_SECTION_LABEL } from "./maidenVoyageLayoutStyles";

export type GenesisUpsideGrowthChartProps = {
  rows: UpsideMilestoneRow[];
};

function formatTvlAxis(tvlUsd: number): string {
  return formatUSD(tvlUsd, { compact: true, minDecimals: 0, maxDecimals: 0 });
}

export function GenesisUpsideGrowthChart({ rows }: GenesisUpsideGrowthChartProps) {
  const chartData = rows.map((row) => ({
    tvlUsd: row.tvlUsd,
    tvlLabel: formatTvlAxis(row.tvlUsd),
    earnings: row.yourEarningsPerYear,
  }));

  if (chartData.length === 0) return null;

  return (
    <div className="min-w-0">
      <p className={`mb-2 ${MV_SECTION_LABEL}`}>Annual earnings growth</p>
      <div className="h-[180px] w-full rounded-xl border border-white/[0.08] bg-[#0a1929]/35 px-2 py-2 sm:h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
            <defs>
              <linearGradient id="upsideEarningsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#B8EBD5" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#B8EBD5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.08)"
              vertical={false}
            />
            <XAxis
              dataKey="tvlLabel"
              tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) =>
                formatUSD(Number(v), { compact: true, minDecimals: 0, maxDecimals: 0 })
              }
              width={48}
            />
            <Tooltip
              contentStyle={{
                background: "#0a1929",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "rgba(255,255,255,0.7)" }}
              formatter={(value: number) => [
                `${formatUSD(value, { compact: false })} / yr`,
                "Your earnings",
              ]}
            />
            <Area
              type="monotone"
              dataKey="earnings"
              stroke="#B8EBD5"
              strokeWidth={2}
              fill="url(#upsideEarningsFill)"
              dot={{ r: 3, fill: "#B8EBD5", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#B8EBD5" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
