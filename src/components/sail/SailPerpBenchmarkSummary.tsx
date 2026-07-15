"use client";

import type { SailPerpBenchmarkApiResponse } from "@/lib/sailPerpBenchmarkServer";
import { formatSailChartPercentChange } from "@/utils/sailMarketChartSeries";

function usd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function ReturnValue({ value }: { value: number }) {
  const color =
    value > 0 ? "text-[#178A5C]" : value < 0 ? "text-red-700" : "text-[#1E4775]";
  return (
    <span className={`font-mono text-sm font-bold tabular-nums ${color}`}>
      {formatSailChartPercentChange(value)}
    </span>
  );
}

export function SailPerpBenchmarkSummary({
  data,
  isLoading,
  error,
}: {
  data: SailPerpBenchmarkApiResponse | null;
  isLoading: boolean;
  error: string | null;
}) {
  const downloadDetails = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `sail-vs-perp-${data.marketId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-[#1E4775]/10 bg-white/45 px-3 py-2 text-xs text-[#1E4775]/60">
        Building modeled Hyperliquid benchmark from historical funding, prices,
        and Sail state…
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-amber-700/15 bg-amber-50/70 px-3 py-2 text-xs text-amber-900/80">
        Modeled perp benchmark unavailable: {error}
      </div>
    );
  }
  if (!data) return null;

  const { benchmark, assumptions } = data;
  const costItems = [
    ["Trading fees", benchmark.costs.tradingFeesUsd],
    ["Slippage", benchmark.costs.slippageUsd],
    ["Funding", benchmark.costs.fundingUsd],
    ["Liquidation", benchmark.costs.liquidationImpactUsd],
    ["Sail mint fee", benchmark.costs.sailMintFeeUsd],
    ["Sail redeem fee", benchmark.costs.sailRedeemFeeUsd],
  ] as const;

  return (
    <details className="relative rounded-lg border border-[#1E4775]/10 bg-white/70 text-[#1E4775]">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-3 py-2">
        <span className="text-xs font-semibold">
          Modeled perp benchmark · Hyperliquid
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          <span>
            Sail net <ReturnValue value={benchmark.sailNetReturnPct} />
          </span>
          <span>
            Perp <ReturnValue value={benchmark.perpReturnPct} />
          </span>
          {benchmark.liquidatedAt ? (
            <span className="font-semibold text-red-700">Liquidated</span>
          ) : null}
        </span>
      </summary>
      <div className="absolute left-0 right-0 top-full z-30 max-h-72 overflow-y-auto rounded-b-lg border border-[#1E4775]/10 bg-white px-3 py-3 shadow-xl">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {costItems.map(([label, value]) => (
            <div key={label} className="rounded-md bg-[#1E4775]/5 px-2 py-1.5">
              <div className="text-[10px] text-[#1E4775]/55">{label}</div>
              <div className="font-mono text-xs font-semibold tabular-nums">
                {usd(value)}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-[#1E4775]/55">
          Same {usd(assumptions.startingCapitalUsd)} starting capital, no margin
          top-ups, {assumptions.takerFeeBps} bps taker fee,{" "}
          {assumptions.slippageBps} bps modeled slippage, hourly high/low
          liquidation checks, and historical funding. Sail uses archive-state
          leverage plus historical mint/redeem fee bands.
        </p>
        {data.warnings.length > 0 ? (
          <ul className="mt-2 list-disc space-y-1 pl-4 text-[10px] text-[#1E4775]/55">
            {data.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
        <button
          type="button"
          onClick={downloadDetails}
          className="mt-2 rounded-md border border-[#1E4775]/15 bg-white/70 px-2.5 py-1 text-[10px] font-semibold hover:bg-white"
        >
          Download calculation details
        </button>
      </div>
    </details>
  );
}
