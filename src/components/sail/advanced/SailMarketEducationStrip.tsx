"use client";

import {
  SAIL_ADVANCED_HEADER_STRIP_DIVIDE,
  SAIL_ADVANCED_HEADER_STRIP_LABEL,
  SAIL_ADVANCED_HEADER_STRIP_SHELL,
  SAIL_ADVANCED_HEADER_STRIP_VALUE,
} from "@/components/sail/advanced/sailAdvancedStyles";
import { formatLeverage } from "@/utils/sailDisplayFormat";

type SailMarketEducationStripProps = {
  leverageRatio?: bigint;
  rebalanceThresholdLabel?: string;
  className?: string;
};

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-center px-3 py-2.5 text-center sm:py-2.5">
      <span className={SAIL_ADVANCED_HEADER_STRIP_LABEL}>{label}</span>
      <span className={SAIL_ADVANCED_HEADER_STRIP_VALUE} title={value}>
        {value}
      </span>
    </div>
  );
}

/** Disconnected-state market facts above the chart — education instead of empty wallet CTAs. */
export function SailMarketEducationStrip({
  leverageRatio,
  rebalanceThresholdLabel,
  className = "",
}: SailMarketEducationStripProps) {
  return (
    <div
      className={`${SAIL_ADVANCED_HEADER_STRIP_SHELL} grid grid-cols-2 ${SAIL_ADVANCED_HEADER_STRIP_DIVIDE} sm:grid-cols-4 sm:divide-y-0 ${className}`.trim()}
      aria-label="This market facts"
    >
      <StatCell
        label="Current leverage"
        value={formatLeverage(leverageRatio)}
      />
      <StatCell
        label="Rebalances at"
        value={rebalanceThresholdLabel ?? "—"}
      />
      <StatCell label="Funding fees" value="None" />
      <StatCell label="Leverage" value="Automatic" />
    </div>
  );
}
