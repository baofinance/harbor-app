"use client";

import Image from "next/image";
import SimpleTooltip from "@/components/SimpleTooltip";
import { INDEX_CORAL_LEDGER_TAG_PILL_CLASS } from "@/components/shared/indexMarketsToolbarStyles";

export type LedgerMarksCompactBadgeProps = {
  /** Optional leading block (e.g. Genesis / Maiden Voyage context) shown above the rest */
  intro?: React.ReactNode;
  /** Main explanation (title + copy) */
  body: React.ReactNode;
  /** “How you earn” summary line(s) at the bottom of the tooltip */
  earnSummary: React.ReactNode;
  className?: string;
  pillClassName?: string;
  centerOnMobile?: boolean;
  /** Wider tooltips for long copy (e.g. Genesis) */
  tooltipMaxWidth?: number | string;
};

/**
 * Coral pill: icon + “Ledger Marks” by default; full copy + earn rate on hover.
 */
export default function LedgerMarksCompactBadge({
  intro,
  body,
  earnSummary,
  className = "",
  pillClassName = "",
  centerOnMobile = false,
  tooltipMaxWidth,
}: LedgerMarksCompactBadgeProps) {
  return (
    <SimpleTooltip
      centerOnMobile={centerOnMobile}
      maxWidth={tooltipMaxWidth}
      label={
        <div className="text-left max-w-xs space-y-2">
          {intro ? (
            <div className="text-xs text-white/90 leading-relaxed pb-2 border-b border-white/15">
              {intro}
            </div>
          ) : null}
          <div className="space-y-2">{body}</div>
          <div className="border-t border-white/20 pt-2 mt-1 text-xs text-white/90 leading-relaxed">
            {earnSummary}
          </div>
        </div>
      }
      className={className}
    >
      <div className={`${INDEX_CORAL_LEDGER_TAG_PILL_CLASS} ${pillClassName}`}>
        <div className="flex items-center gap-1.5">
          <Image
            src="/icons/marks.png"
            alt=""
            width={18}
            height={18}
            className="opacity-90 flex-shrink-0"
          />
          <span>Ledger Marks</span>
        </div>
      </div>
    </SimpleTooltip>
  );
}
