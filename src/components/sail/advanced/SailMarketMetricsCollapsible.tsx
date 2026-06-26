"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import type { DefinedMarket } from "@/config/markets";
import type { SailMarketDetailMetrics } from "@/utils/sailMarketMetrics";
import { SailMarketMetricsPanel } from "./SailMarketMetricsColumn";
import {
  SAIL_ADVANCED_FROSTED_CARD,
  SAIL_ADVANCED_LIGHT_SECTION_TITLE,
} from "./sailAdvancedStyles";

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
    <div className={SAIL_ADVANCED_FROSTED_CARD}>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left sm:px-4"
      >
        <span className={SAIL_ADVANCED_LIGHT_SECTION_TITLE}>Market metrics</span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-[#1E4775]/55 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>
      {expanded ? (
        <div className="border-t border-[#1E4775]/10 px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
          <SailMarketMetricsPanel market={market} metrics={metrics} />
        </div>
      ) : null}
    </div>
  );
}
