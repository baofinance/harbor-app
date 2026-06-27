"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import type { DefinedMarket } from "@/config/markets";
import type { SailMarketDetailMetrics } from "@/utils/sailMarketMetrics";
import { SailMarketMetricsPanel } from "./SailMarketMetricsColumn";
import { SAIL_ADVANCED_LABEL } from "./sailAdvancedStyles";

type SailMarketMetricsCollapsibleProps = {
  market: DefinedMarket;
  metrics: SailMarketDetailMetrics | undefined;
};

/** Collapsible market metrics — sits below chart + trade row to maximize chart height. */
export function SailMarketMetricsCollapsible({
  market,
  metrics,
}: SailMarketMetricsCollapsibleProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="mb-1 flex w-full items-center justify-between gap-2 text-left"
      >
        <span className={SAIL_ADVANCED_LABEL}>Market metrics</span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-white/55 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>
      {expanded ? <SailMarketMetricsPanel market={market} metrics={metrics} /> : null}
    </div>
  );
}
