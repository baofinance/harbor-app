"use client";

import { useMemo, useState } from "react";
import { formatUSD } from "@/utils/formatters";
import {
  REVENUE_SHARE_CALC_SLIDER_BOUNDS,
  REVENUE_SHARE_CALC_TRADING_FEE_PCT,
  buildDefaultRevenueShareCalcInput,
  computeRevenueShareEstimate,
  type RevenueShareCalcInput,
} from "@/utils/maidenVoyageRevenueShareCalculator";
import {
  estimateMaidenVoyageYieldSharePct,
  formatMaidenVoyageYieldSharePct,
} from "@/utils/maidenVoyageYieldShareEstimate";
import {
  MV_CAPTION_TEXT,
  MV_CARD_INNER_GRADIENT,
  MV_CARD_SHELL,
  MV_META_TEXT,
  MV_SECTION_LABEL,
} from "./maidenVoyageLayoutStyles";

export type GenesisRevenueShareCalculatorProps = {
  capUsd: number | null;
  yieldRevSharePct: number | null;
  initialDepositUsd: number;
  className?: string;
};

function parseInputNumber(value: string, fallback: number): number {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function clampToBounds(
  value: number,
  bounds: { min: number; max: number },
): number {
  return Math.min(bounds.max, Math.max(bounds.min, value));
}

function CalcSlider({
  id,
  label,
  value,
  min,
  max,
  step,
  formatValue,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  formatValue: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className={MV_SECTION_LABEL}>
          {label}
        </label>
        <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-white/90">
          {formatValue(value)}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#B8EBD5] [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[#B8EBD5] [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#B8EBD5]"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      />
      <div className={`mt-1 flex justify-between ${MV_META_TEXT}`}>
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
    </div>
  );
}

function DepositField({
  id,
  label,
  value,
  onChange,
  shareLabel,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  shareLabel: string;
}) {
  return (
    <label htmlFor={id} className="block min-w-0">
      <span className={MV_SECTION_LABEL}>{label}</span>
      <div className="relative mt-1">
        <input
          id={id}
          type="number"
          min={0}
          step="100"
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(parseInputNumber(e.target.value, value))}
          className="w-full rounded-lg border border-white/10 bg-[#0a1929]/40 px-3 py-2 font-mono text-sm tabular-nums text-white/95 outline-none transition focus:border-white/25 focus:ring-1 focus:ring-white/20"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/45">
          USD
        </span>
      </div>
      <p className={`mt-1.5 ${MV_CAPTION_TEXT}`}>
        Your revenue share: {shareLabel}
      </p>
    </label>
  );
}

function OutputStat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-[#0a1929]/35 px-3 py-2.5">
      <p className={MV_SECTION_LABEL}>{label}</p>
      <p
        className={`mt-0.5 font-mono text-lg font-semibold tabular-nums sm:text-xl ${
          highlight ? "text-[#B8EBD5]" : "text-white/95"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function GenesisRevenueShareCalculator({
  capUsd,
  yieldRevSharePct,
  initialDepositUsd,
  className = "",
}: GenesisRevenueShareCalculatorProps) {
  const [marketInputs, setMarketInputs] = useState(() => {
    const defaults = buildDefaultRevenueShareCalcInput(0);
    return {
      tvlUsd: defaults.tvlUsd,
      collateralYieldPct: defaults.collateralYieldPct,
      tradingVolumeUsd: defaults.tradingVolumeUsd,
    };
  });
  const [depositUsd, setDepositUsd] = useState(initialDepositUsd);

  const yourSharePct = useMemo(() => {
    const pct = estimateMaidenVoyageYieldSharePct({
      depositUsd,
      capUsd,
      yieldRevSharePct,
    });
    return pct ?? 0;
  }, [depositUsd, capUsd, yieldRevSharePct]);

  const shareLabel = formatMaidenVoyageYieldSharePct(
    yourSharePct > 0 ? yourSharePct : null,
  );

  const calcInput: RevenueShareCalcInput = useMemo(
    () => ({
      ...marketInputs,
      tradingFeePct: REVENUE_SHARE_CALC_TRADING_FEE_PCT,
      yourSharePct,
    }),
    [marketInputs, yourSharePct],
  );

  const result = useMemo(() => computeRevenueShareEstimate(calcInput), [calcInput]);

  const setMarketField = <K extends keyof typeof marketInputs>(
    key: K,
    value: (typeof marketInputs)[K],
  ) => {
    setMarketInputs((prev) => ({ ...prev, [key]: value }));
  };

  const tvlBounds = REVENUE_SHARE_CALC_SLIDER_BOUNDS.tvlUsd;
  const yieldBounds = REVENUE_SHARE_CALC_SLIDER_BOUNDS.collateralYieldPct;
  const volumeBounds = REVENUE_SHARE_CALC_SLIDER_BOUNDS.tradingVolumeUsd;

  return (
    <section
      className={`${MV_CARD_SHELL} ${MV_CARD_INNER_GRADIENT} w-full px-4 py-4 sm:px-5 sm:py-5 ${className}`.trim()}
      aria-label="Estimate your revenue share"
    >
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-white/90 sm:text-base">
          Estimate your revenue share
        </h2>
        <p className={`mt-0.5 ${MV_CAPTION_TEXT}`}>Adjust assumptions</p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-8">
        <div className="space-y-4">
          <CalcSlider
            id="mv-rev-calc-tvl"
            label="TVL"
            value={marketInputs.tvlUsd}
            min={tvlBounds.min}
            max={tvlBounds.max}
            step={tvlBounds.step}
            formatValue={(v) =>
              formatUSD(v, { compact: true, minDecimals: 0, maxDecimals: 1 })
            }
            onChange={(v) => setMarketField("tvlUsd", v)}
          />
          <CalcSlider
            id="mv-rev-calc-collateral-yield"
            label="Collateral yield"
            value={marketInputs.collateralYieldPct}
            min={yieldBounds.min}
            max={yieldBounds.max}
            step={yieldBounds.step}
            formatValue={(v) => `${v.toFixed(1)}% / yr`}
            onChange={(v) => setMarketField("collateralYieldPct", v)}
          />
          <CalcSlider
            id="mv-rev-calc-trading-volume"
            label="Trading volume"
            value={marketInputs.tradingVolumeUsd}
            min={volumeBounds.min}
            max={volumeBounds.max}
            step={volumeBounds.step}
            formatValue={(v) =>
              formatUSD(v, { compact: true, minDecimals: 0, maxDecimals: 1 }) +
              " / yr"
            }
            onChange={(v) => setMarketField("tradingVolumeUsd", v)}
          />
          <DepositField
            id="mv-rev-calc-your-deposit"
            label="Your deposit"
            value={depositUsd}
            onChange={(v) =>
              setDepositUsd(clampToBounds(v, { min: 0, max: capUsd ?? 10_000_000 }))
            }
            shareLabel={shareLabel}
          />
          <p className={MV_META_TEXT}>
            Average trading fee: {REVENUE_SHARE_CALC_TRADING_FEE_PCT}%
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <OutputStat
            label="Total collateral yield"
            value={`${formatUSD(result.collateralYieldPerYear, { compact: false })} / yr`}
          />
          <OutputStat
            label="Total trading fees"
            value={`${formatUSD(result.tradingFeesPerYear, { compact: false })} / yr`}
          />
          <OutputStat
            label="Your estimated revenue"
            value={`${formatUSD(result.yourEstimatedRevenue, { compact: false })} / yr`}
            highlight
          />
        </div>
      </div>

      <p className={`mt-4 ${MV_META_TEXT}`}>
        Illustrative only. Actual revenue depends on market TVL, volume, and fee
        settings.
      </p>
    </section>
  );
}
