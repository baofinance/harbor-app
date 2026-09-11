"use client";

import { formatUSD } from "@/utils/formatters";
import { INDEX_EARN_CLAIM_BUTTON_CLASS_DESKTOP } from "@/utils/indexPageManageButton";
import {
  ANCHOR_ADVANCED_HEADER_STRIP_LABEL,
  ANCHOR_ADVANCED_HEADER_STRIP_VALUE,
  ANCHOR_ADVANCED_FROSTED_LIGHT_PANEL,
} from "./anchorAdvancedStyles";

export type AnchorEmbeddedClaimBarProps = {
  isConnected: boolean;
  claimableRewardsUSD: number;
  isClaiming?: boolean;
  onClaim: () => void;
  /** Above the trade panel (default) or below it. */
  placement?: "above" | "below";
};

/** Full-width claimable + Claim row under the embedded Anchor manage panel. */
export function AnchorEmbeddedClaimBar({
  isConnected,
  claimableRewardsUSD,
  isClaiming = false,
  onClaim,
  placement = "below",
}: AnchorEmbeddedClaimBarProps) {
  if (!isConnected) return null;

  const hasClaimable = claimableRewardsUSD > 0;

  return (
    <div
      className={`grid h-[60px] w-full grid-cols-[1fr_auto] items-center gap-2 rounded-xl px-3.5 sm:gap-4 sm:px-4 ${ANCHOR_ADVANCED_FROSTED_LIGHT_PANEL} ${
        placement === "above" ? "mb-3" : "mt-3"
      }`}
    >
      <div className="min-w-0 leading-tight">
        <p className={ANCHOR_ADVANCED_HEADER_STRIP_LABEL}>Claimable value</p>
        <p
          className={`${ANCHOR_ADVANCED_HEADER_STRIP_VALUE} text-sm sm:text-base ${
            hasClaimable ? "text-[#2d6b5c]" : ""
          }`}
        >
          {formatUSD(claimableRewardsUSD, { compact: false })}
        </p>
      </div>
      <button
        type="button"
        onClick={onClaim}
        disabled={isClaiming || !hasClaimable}
        className={`${INDEX_EARN_CLAIM_BUTTON_CLASS_DESKTOP} h-9 min-w-[6rem] shrink-0 px-6 sm:min-w-[7.5rem] disabled:cursor-not-allowed disabled:opacity-40`}
      >
        {isClaiming ? "Claiming…" : "Claim"}
      </button>
    </div>
  );
}
