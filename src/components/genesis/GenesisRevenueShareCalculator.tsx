"use client";

import { useMemo, useState } from "react";
import { formatUSD } from "@/utils/formatters";
import {
  REVENUE_SHARE_CALC_TRADING_FEE_PCT,
  buildDefaultRevenueShareCalcInput,
  buildPresetRevenueShareCalcInput,
  computePresetRevenueShareEstimates,
  computeRevenueShareEstimate,
  type RevenueShareCalcInput,
} from "@/utils/maidenVoyageRevenueShareCalculator";
import {
  MV_CAPTION_TEXT,
  MV_DETAILS_PANEL,
  MV_META_TEXT,
  MV_SECTION_LABEL,
} from "./maidenVoyageLayoutStyles";

export type GenesisRevenueShareCalculatorProps = {
  initialYourSharePct: number;
  className?: string;
};

function parseInputNumber(value: string, fallback: number): number {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function formatPresetTvlLabel(tvlUsd: number): string {
  return formatUSD(tvlUsd, { compact: true, minDecimals: 0, maxDecimals: 0 });
}

function CalcField({
  id,
  label,
  suffix,
  value,
  onChange,
  step,
}: {
  id: string;
  label: string;
  suffix?: string;
  value: number;
  onChange: (value: number) => void;
  step?: string;
}) {
  return (
    <label htmlFor={id} className="block min-w-0">
      <span className={MV_SECTION_LABEL}>{label}</span>
      <div className="relative mt-1">
        <input
          id={id}
          type="number"
          min={0}
          step={step ?? "any"}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(parseInputNumber(e.target.value, value))}
          className="w-full rounded-lg border border-white/10 bg-[#0a1929]/40 px-3 py-2 font-mono text-sm tabular-nums text-white/95 outline-none transition focus:border-white/25 focus:ring-1 focus:ring-white/20"
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/45">
            {suffix}
          </span>
        ) : null}
      </div>
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

function PresetEstimateCard({
  tvlUsd,
  yourEstimatedRevenue,
  isActive,
  onSelect,
}: {
  tvlUsd: number;
  yourEstimatedRevenue: number;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`min-w-0 rounded-lg border px-3 py-2.5 text-left transition ${
        isActive
          ? "border-[#B8EBD5]/40 bg-[#B8EBD5]/10"
          : "border-white/10 bg-[#0a1929]/35 hover:border-white/20 hover:bg-[#0a1929]/50"
      }`}
    >
      <p className={MV_SECTION_LABEL}>{formatPresetTvlLabel(tvlUsd)} TVL</p>
      <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-[#B8EBD5] sm:text-xl">
        {formatUSD(yourEstimatedRevenue, { compact: false })} / yr
      </p>
      <p className={`mt-0.5 ${MV_CAPTION_TEXT}`}>Your estimated revenue</p>
    </button>
  );
}

export function GenesisRevenueShareCalculator({
  initialYourSharePct,
  className = "",
}: GenesisRevenueShareCalculatorProps) {
  const [inputs, setInputs] = useState<RevenueShareCalcInput>(() =>
    buildDefaultRevenueShareCalcInput(initialYourSharePct),
  );

  const presets = useMemo(
    () => computePresetRevenueShareEstimates(initialYourSharePct),
    [initialYourSharePct],
  );

  const result = useMemo(() => computeRevenueShareEstimate(inputs), [inputs]);

  const activePresetTvl = presets.some((p) => p.tvlUsd === inputs.tvlUsd)
    ? inputs.tvlUsd
    : null;

  const setField = <K extends keyof RevenueShareCalcInput>(
    key: K,
    value: RevenueShareCalcInput[K],
  ) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const applyPreset = (tvlUsd: number) => {
    setInputs(buildPresetRevenueShareCalcInput(tvlUsd, inputs.yourSharePct));
  };

  return (
    <details className={`${MV_DETAILS_PANEL} group ${className}`.trim()}>
      <summary className="cursor-pointer list-none px-3 py-2.5 sm:px-4 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white/90">
              Estimate your revenue share
            </p>
            <p className={`mt-0.5 ${MV_CAPTION_TEXT}`}>Adjust assumptions</p>
          </div>
          <span
            className="shrink-0 text-xs font-semibold uppercase tracking-wide text-white/45 transition group-open:text-white/65"
            aria-hidden
          >
            <span className="group-open:hidden">Show</span>
            <span className="hidden group-open:inline">Hide</span>
          </span>
        </div>
      </summary>

      <div className="border-t border-white/10 px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
        <div className="space-y-2">
          <p className={MV_SECTION_LABEL}>Preset scenarios</p>
          <p className={`${MV_CAPTION_TEXT} -mt-1`}>
            5% collateral yield · 10× TVL trading volume ·{" "}
            {REVENUE_SHARE_CALC_TRADING_FEE_PCT}% fee
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {presets.map((preset) => (
              <PresetEstimateCard
                key={preset.tvlUsd}
                tvlUsd={preset.tvlUsd}
                yourEstimatedRevenue={preset.result.yourEstimatedRevenue}
                isActive={activePresetTvl === preset.tvlUsd}
                onSelect={() => applyPreset(preset.tvlUsd)}
              />
            ))}
          </div>
        </div>

        <div className="mt-4 border-t border-white/10 pt-4">
          <p className={`mb-3 ${MV_SECTION_LABEL}`}>Custom assumptions</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CalcField
              id="mv-rev-calc-tvl"
              label="TVL"
              suffix="USD"
              value={inputs.tvlUsd}
              step="1000"
              onChange={(v) => setField("tvlUsd", v)}
            />
            <CalcField
              id="mv-rev-calc-collateral-yield"
              label="Collateral yield"
              suffix="% / yr"
              value={inputs.collateralYieldPct}
              step="0.1"
              onChange={(v) => setField("collateralYieldPct", v)}
            />
            <CalcField
              id="mv-rev-calc-trading-volume"
              label="Trading volume"
              suffix="USD / yr"
              value={inputs.tradingVolumeUsd}
              step="1000"
              onChange={(v) => setField("tradingVolumeUsd", v)}
            />
            <CalcField
              id="mv-rev-calc-your-share"
              label="Your share"
              suffix="%"
              value={inputs.yourSharePct}
              step="0.001"
              onChange={(v) => setField("yourSharePct", v)}
            />
          </div>

          <p className={`mt-3 ${MV_META_TEXT}`}>
            Average trading fee: {REVENUE_SHARE_CALC_TRADING_FEE_PCT}%
          </p>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <OutputStat
              label="Total collateral yield"
              value={`${formatUSD(result.collateralYieldPerYear, { compact: false })} / yr`}
            />
            <OutputStat
              label="Total trading fees"
              value={`${formatUSD(result.tradingFeesPerYear, { compact: false })} / yr`}
            />
            <div className="sm:col-span-2">
              <OutputStat
                label="Your estimated revenue"
                value={`${formatUSD(result.yourEstimatedRevenue, { compact: false })} / yr`}
                highlight
              />
            </div>
          </div>
        </div>

        <p className={`mt-3 ${MV_META_TEXT}`}>
          Illustrative only. Actual revenue depends on market TVL, volume, and
          fee settings.
        </p>
      </div>
    </details>
  );
}
