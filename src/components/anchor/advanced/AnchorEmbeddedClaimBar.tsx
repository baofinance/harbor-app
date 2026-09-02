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
      className={`grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-xl px-4 py-3.5 sm:gap-6 sm:px-5 ${ANCHOR_ADVANCED_FROSTED_LIGHT_PANEL} ${
        placement === "above" ? "mb-3" : "mt-3"
      }`}
    >
      <div className="min-w-0">
        <p className={ANCHOR_ADVANCED_HEADER_STRIP_LABEL}>Claimable value</p>
        <p
          className={`${ANCHOR_ADVANCED_HEADER_STRIP_VALUE} text-base sm:text-lg ${
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
        className={`${INDEX_EARN_CLAIM_BUTTON_CLASS_DESKTOP} h-10 min-w-[6.5rem] shrink-0 px-8 sm:min-w-[8.5rem] disabled:cursor-not-allowed disabled:opacity-40`}
      >
        {isClaiming ? "Claiming…" : "Claim"}
      </button>
    </div>
  );
}
