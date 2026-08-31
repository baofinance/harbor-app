"use client";

import type { ReactNode } from "react";
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
  tooltip?: ReactNode;
};

type DepositTradeFeeFooterProps = {
  heading: string;
  items: DepositTradeFeeItem[];
};

export function pctToDepositFeeRatio(pct: number): bigint {
  return BigInt(Math.round(pct * 1e16));
}

function parseSingleFeePercent(displayValue: string): number | null {
  const match = displayValue.trim().match(/^([\d.]+)%$/);
  if (!match) return null;
  const pct = parseFloat(match[1]!);
  return Number.isFinite(pct) ? pct : null;
}

function FeeValueCell({
  ratio,
  isMintSail = false,
  activeBand,
  displayValue,
}: Pick<
  DepositTradeFeeItem,
  "ratio" | "isMintSail" | "activeBand" | "displayValue"
>) {
  if (ratio !== undefined) {
    return (
      <SailFeeRatioCell
        ratio={ratio}
        isMintSail={isMintSail}
        activeBand={activeBand}
      />
    );
  }

  if (displayValue) {
    const singlePct = parseSingleFeePercent(displayValue);
    if (singlePct != null) {
      return (
        <SailFeeBandBadge
          ratio={pctToDepositFeeRatio(singlePct)}
          isMintSail={isMintSail}
          lowerBound={activeBand?.lowerBound ?? 0n}
          upperBound={activeBand?.upperBound}
          omitFeeSuffix
        />
      );
    }

    return (
      <span className="font-mono text-[10px] font-semibold tabular-nums text-[#1E4775]/70">
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

/** Shared buy/sell fee row — colored band pills above modal primary actions. */
export function DepositTradeFeeFooter({
  heading,
  items,
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
          />
        </span>
      ))}
    </p>
  );
}

/** Build footer items from on-chain Sail market fee bands. */
export function depositTradeFeesFromMarket({
  marketFees,
  activeTab,
}: {
  marketFees: DepositTradeMarketFees;
  activeTab: "mint" | "redeem";
}): DepositTradeFeeItem[] {
  if (activeTab === "mint") {
    return [
      {
        label: "Buy",
        ratio: marketFees.buyFeeRatio,
        isMintSail: true,
        activeBand: marketFees.activeBuyBand,
      },
    ];
  }

  return [
    {
      label: "Sell",
      ratio: marketFees.sellFeeRatio,
      isMintSail: false,
      activeBand: marketFees.activeSellBand,
    },
  ];
}
