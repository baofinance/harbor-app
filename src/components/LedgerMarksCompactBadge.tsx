"use client";

import Image from "next/image";
import SimpleTooltip from "@/components/SimpleTooltip";

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
      <div
        className={`flex cursor-help items-center bg-[#E67A6B] hover:bg-[#D66A5B] border border-white backdrop-blur-sm px-2 py-1 rounded-md transition-colors ${pillClassName}`}
      >
        <div className="flex items-center gap-1.5 text-white text-sm whitespace-nowrap">
          <Image
            src="/icons/marks.png"
            alt=""
            width={18}
            height={18}
            className="opacity-95 flex-shrink-0"
          />
          <span className="font-semibold">Ledger Marks</span>
        </div>
      </div>
    </SimpleTooltip>
  );
}
