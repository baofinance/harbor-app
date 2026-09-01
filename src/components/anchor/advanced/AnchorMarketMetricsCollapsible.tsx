"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import type { DefinedMarket } from "@/config/markets";
import type { MarketData } from "@/hooks/anchor/useAnchorMarketData";
import { AnchorMarketMetricsPanel } from "./AnchorMarketMetricsPanel";
import { ANCHOR_ADVANCED_LABEL } from "./anchorAdvancedStyles";

type AnchorMarketMetricsCollapsibleProps = {
  market: DefinedMarket;
  marketData: MarketData | undefined;
  peggedPriceUSD?: number;
  isLoading?: boolean;
};

export function AnchorMarketMetricsCollapsible({
  market,
  marketData,
  peggedPriceUSD,
  isLoading = false,
}: AnchorMarketMetricsCollapsibleProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="mb-1 flex w-full items-center justify-between gap-2 text-left"
      >
        <span className={ANCHOR_ADVANCED_LABEL}>Market metrics</span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-white/55 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>
      {expanded ? (
        isLoading && !marketData ? (
          <p className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-6 text-center text-sm text-white/55">
            Loading market metrics…
          </p>
        ) : (
          <AnchorMarketMetricsPanel
            market={market}
            marketData={marketData}
            peggedPriceUSD={peggedPriceUSD}
          />
        )
      ) : null}
    </div>
  );
}
