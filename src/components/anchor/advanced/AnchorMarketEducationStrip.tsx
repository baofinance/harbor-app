"use client";

import {
  ANCHOR_ADVANCED_HEADER_STRIP_DIVIDE,
  ANCHOR_ADVANCED_HEADER_STRIP_LABEL,
  ANCHOR_ADVANCED_HEADER_STRIP_SHELL,
  ANCHOR_ADVANCED_HEADER_STRIP_VALUE,
} from "./anchorAdvancedStyles";

type AnchorMarketEducationStripProps = {
  pegTarget?: string;
  bestAprLabel?: string;
  className?: string;
};

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-center px-3 py-2.5 text-center">
      <span className={ANCHOR_ADVANCED_HEADER_STRIP_LABEL}>{label}</span>
      <span className={ANCHOR_ADVANCED_HEADER_STRIP_VALUE} title={value}>
        {value}
      </span>
    </div>
  );
}

/** Disconnected-state market facts above the chart. */
export function AnchorMarketEducationStrip({
  pegTarget = "USD",
  bestAprLabel,
  className = "",
}: AnchorMarketEducationStripProps) {
  return (
    <div
      className={`${ANCHOR_ADVANCED_HEADER_STRIP_SHELL} grid grid-cols-2 ${ANCHOR_ADVANCED_HEADER_STRIP_DIVIDE} sm:grid-cols-4 sm:divide-y-0 ${className}`.trim()}
      aria-label="This market facts"
    >
      <StatCell label="Peg target" value={pegTarget} />
      <StatCell label="Yield source" value="Stability pools" />
      <StatCell label="Redemptions" value="Anytime" />
      <StatCell label="APR" value={bestAprLabel ?? "Variable"} />
    </div>
  );
}
