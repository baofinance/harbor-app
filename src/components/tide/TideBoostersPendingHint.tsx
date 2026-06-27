"use client";

import SimpleTooltip from "@/components/SimpleTooltip";
import {
  TIDE_BOOSTERS,
  TIDE_BOOSTERS_RANK_GROUPS,
  tideBoostersAverageTokens,
  tideBoostersTotalTokens,
} from "@/config/tide";
import { formatTideTokenAmount } from "@/utils/tideSnapshot";
import { CircleAlert } from "lucide-react";

function BoostersAllocationTooltipContent() {
  const average = tideBoostersAverageTokens();
  const pool = tideBoostersTotalTokens();

  return (
    <div className="space-y-2.5 text-left font-normal">
      <p className="font-medium text-white">
        Boosters allocation pending wallet mapping
      </p>
      <p className="text-xs leading-relaxed text-white/75">
        {TIDE_BOOSTERS.recipientCount} boosters ·{" "}
        {formatTideTokenAmount(pool)} TIDE total
      </p>
      <p className="text-sm text-white">
        Average:{" "}
        <span className="font-medium">{formatTideTokenAmount(average)} TIDE</span>
      </p>
      <div className="border-t border-white/10 pt-2">
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-white/50">
          Allocation by rank
        </p>
        <ul className="space-y-1 text-xs text-white/80">
          {TIDE_BOOSTERS_RANK_GROUPS.map(({ rankLabel, amountTokens }) => (
            <li key={rankLabel} className="flex justify-between gap-4">
              <span>Rank {rankLabel}</span>
              <span className="tabular-nums text-white">
                {formatTideTokenAmount(amountTokens)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function TideBoostersPendingHint() {
  return (
    <SimpleTooltip
      label={<BoostersAllocationTooltipContent />}
      side="top"
      maxWidth="18rem"
      centerOnMobile
    >
      <span
        className="inline-flex shrink-0 text-amber-400/90 hover:text-amber-300"
        aria-label="Boosters allocation details"
      >
        <CircleAlert className="h-3.5 w-3.5" strokeWidth={2} />
      </span>
    </SimpleTooltip>
  );
}
