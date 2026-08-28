"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { FeeBand } from "@/utils/sailFeeBands";
import { SailFeeRatioCell } from "@/components/sail/SailFeeRatioCell";
import { SailFeeBandBadge } from "@/components/sail/SailFeeBandBadge";
import SimpleTooltip from "@/components/SimpleTooltip";
import { Info } from "lucide-react";

export type DepositTradeMarketFees = {
  buyFeeRatio: bigint | undefined;
  sellFeeRatio: bigint | undefined;
  activeBuyBand: FeeBand | undefined;
  activeSellBand: FeeBand | undefined;
};

export type DepositTradeFeeItem = {
  label: string;
  ratio?: bigint;
  isMintSail?: boolean;
  activeBand?: FeeBand;
  /** Plain percentage or range when ratio bands are unavailable. */
  displayValue?: string;
  estimatePct?: number;
  tooltip?: ReactNode;
};

type DepositTradeFeeFooterProps = {
  heading: string;
  items: DepositTradeFeeItem[];
  showTransparencyLink?: boolean;
};

function pctToRatio(pct: number): bigint {
  return BigInt(Math.round(pct * 1e16));
}

function FeeEstimate({
  pct,
  warnHigh,
}: {
  pct: number;
  warnHigh?: boolean;
}) {
  return (
    <span
      className={`font-mono text-[10px] tabular-nums ${
        warnHigh ? "text-red-600" : "text-[#1E4775]/50"
      }`}
    >
      est. {pct > 100 ? "~1.00" : pct.toFixed(2)}%
      {warnHigh ? " ⚠️" : ""}
    </span>
  );
}

function FeeValueCell({
  ratio,
  isMintSail = false,
  activeBand,
  displayValue,
  estimatePct,
}: Pick<
  DepositTradeFeeItem,
  "ratio" | "isMintSail" | "activeBand" | "displayValue" | "estimatePct"
>) {
  if (ratio !== undefined) {
    return (
      <>
        <SailFeeRatioCell
          ratio={ratio}
          isMintSail={isMintSail}
          activeBand={activeBand}
        />
        {estimatePct != null && estimatePct > 0 ? (
          <FeeEstimate
            pct={estimatePct}
            warnHigh={estimatePct > 2 && estimatePct <= 100}
          />
        ) : null}
      </>
    );
  }

  if (estimatePct != null && estimatePct > 0) {
    return (
      <>
        <SailFeeBandBadge
          ratio={pctToRatio(estimatePct)}
          isMintSail={isMintSail}
          lowerBound={activeBand?.lowerBound ?? 0n}
          upperBound={activeBand?.upperBound}
          omitFeeSuffix
        />
        <FeeEstimate pct={estimatePct} warnHigh={estimatePct > 2} />
      </>
    );
  }

  if (displayValue) {
    const numeric = parseFloat(displayValue.replace(/[^0-9.]/g, ""));
    const warnHigh = !Number.isNaN(numeric) && numeric > 2;
    return (
      <span
        className={`font-mono text-[10px] font-semibold tabular-nums ${
          warnHigh ? "text-red-600" : "text-[#1E4775]/70"
        }`}
      >
        {displayValue}
      </span>
    );
  }

  return (
    <span className="font-mono text-[10px] font-semibold tabular-nums text-[#1E4775]/70">
      —
    </span>
  );
}

/** Shared buy/sell fee row — colored band pills, estimates, and transparency link. */
export function DepositTradeFeeFooter({
  heading,
  items,
  showTransparencyLink = true,
}: DepositTradeFeeFooterProps) {
  if (items.length === 0) return null;

  return (
    <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[10px] leading-snug text-[#1E4775]/55">
      <span className="font-semibold uppercase tracking-wide">{heading}</span>
      {items.map((item, index) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          {index > 0 ? <span aria-hidden="true">·</span> : null}
          {items.length > 1 ? <span>{item.label}</span> : null}
          {item.tooltip ? (
            <SimpleTooltip side="top" label={item.tooltip}>
              <span className="inline-flex h-4 w-4 cursor-help items-center justify-center text-[#1E4775]/60 hover:text-[#1E4775]">
                <Info className="h-3.5 w-3.5" aria-hidden />
              </span>
            </SimpleTooltip>
          ) : null}
          <FeeValueCell
            ratio={item.ratio}
            isMintSail={item.isMintSail}
            activeBand={item.activeBand}
            displayValue={item.displayValue}
            estimatePct={item.estimatePct}
          />
        </span>
      ))}
      {showTransparencyLink ? (
        <>
          <span aria-hidden="true">·</span>
          <Link
            href="/transparency"
            className="underline-offset-2 transition-colors hover:text-[#1E4775] hover:underline"
          >
            full fee structure
          </Link>
        </>
      ) : null}
    </p>
  );
}

/** Build footer items from on-chain Sail market fee bands. */
export function depositTradeFeesFromMarket({
  marketFees,
  activeTab,
  buyFeeEstimatePct,
  sellFeeEstimatePct,
  showEstimates,
}: {
  marketFees: DepositTradeMarketFees;
  activeTab: "mint" | "redeem";
  buyFeeEstimatePct?: number;
  sellFeeEstimatePct?: number;
  showEstimates?: boolean;
}): DepositTradeFeeItem[] {
  const items: DepositTradeFeeItem[] = [];

  if (activeTab === "mint") {
    items.push({
      label: "Buy",
      ratio: marketFees.buyFeeRatio,
      isMintSail: true,
      activeBand: marketFees.activeBuyBand,
      estimatePct:
        showEstimates && buyFeeEstimatePct != null && buyFeeEstimatePct > 0
          ? buyFeeEstimatePct
          : undefined,
    });
  } else {
    items.push({
      label: "Sell",
      ratio: marketFees.sellFeeRatio,
      isMintSail: false,
      activeBand: marketFees.activeSellBand,
      estimatePct:
        showEstimates && sellFeeEstimatePct != null && sellFeeEstimatePct > 0
          ? sellFeeEstimatePct
          : undefined,
    });
  }

  return items;
}
