"use client";

import SimpleTooltip from "@/components/SimpleTooltip";
import { TIDE_CONFIG, type TideBoostersSnapshot } from "@/config/tide";
import { useTideJsonSnapshot } from "@/hooks/useTideJsonSnapshot";
import { formatTideTokenAmount } from "@/utils/tideSnapshot";
import { CircleAlert } from "lucide-react";

function BoostersAllocationTooltipContent({
  snapshot,
}: {
  snapshot: TideBoostersSnapshot;
}) {
  const average = snapshot.poolTokens / snapshot.recipientCount;

  return (
    <div className="space-y-2.5 text-left font-normal">
      <p className="font-medium text-white">
        Boosters allocation pending wallet mapping
      </p>
      <p className="text-xs leading-relaxed text-white/75">
        {snapshot.recipientCount} boosters · score-weighted ·{" "}
        {formatTideTokenAmount(snapshot.poolTokens)} TIDE total
      </p>
      {snapshot.pendingAddressCount > 0 ? (
        <p className="text-xs text-amber-200/90">
          {snapshot.mappedAddressCount} of {snapshot.recipientCount} wallets
          mapped
        </p>
      ) : null}
      <p className="text-sm text-white">
        Average:{" "}
        <span className="font-medium">{formatTideTokenAmount(average)} TIDE</span>
      </p>
      <div className="border-t border-white/10 pt-2">
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-white/50">
          Allocation by rank (score)
        </p>
        <ul className="space-y-1 text-xs text-white/80">
          {snapshot.scoreGroups.map(({ rankLabel, score, amountTokens }) => (
            <li key={rankLabel} className="flex justify-between gap-4">
              <span>
                Rank {rankLabel}{" "}
                <span className="text-white/50">({score})</span>
              </span>
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
  const { data: snapshot } = useTideJsonSnapshot<TideBoostersSnapshot>(
    TIDE_CONFIG.dataPaths.boosters
  );

  if (!snapshot) return null;

  return (
    <SimpleTooltip
      label={<BoostersAllocationTooltipContent snapshot={snapshot} />}
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
