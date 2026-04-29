"use client";

import { memo } from "react";
import { MarketMaintenanceTag } from "@/components/MarketMaintenanceTag";
import {
  INDEX_MANAGE_BUTTON_CLASS_COMPACT,
  INDEX_MANAGE_BUTTON_CLASS_DESKTOP,
} from "@/utils/indexPageManageButton";

const claimButtonClassCompact =
  "px-3 py-1.5 text-[10px] font-medium bg-[#1E4775] text-white hover:bg-[#17395F] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors rounded-md whitespace-nowrap";

const claimButtonClassDesktop =
  "px-4 py-2 text-xs font-medium bg-[#1E4775] text-white hover:bg-[#17395F] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors rounded-md whitespace-nowrap";

const manageButtonClassCompact = INDEX_MANAGE_BUTTON_CLASS_COMPACT;

const manageButtonClassDesktop = INDEX_MANAGE_BUTTON_CLASS_DESKTOP;

export type GenesisMarketRowClaimActionsProps = {
  /** Small buttons (mobile + md + completed grid) vs larger desktop table column */
  variant: "compact" | "desktop";
  isEnded: boolean;
  showMaintenanceTag: boolean;
  hasClaimable: boolean;
  /** When `isEnded` and nothing to claim: show gray hint (desktop table only today) */
  showNoTokensPlaceholder?: boolean;
  genesisAddress: string | undefined;
  walletAddress: `0x${string}` | undefined;
  isClaimingThisMarket: boolean;
  onClaim: () => void | Promise<void>;
  onManage: () => void;
  /** Desktop manage uses `!genesisAddress`; compact manage is never disabled */
  manageDisabled?: boolean;
};

/**
 * Claim / manage / maintenance controls for a single Genesis index row (presentational).
 */
export const GenesisMarketRowClaimActions = memo(function GenesisMarketRowClaimActions({
  variant,
  isEnded,
  showMaintenanceTag,
  hasClaimable,
  showNoTokensPlaceholder = false,
  genesisAddress,
  walletAddress,
  isClaimingThisMarket,
  onClaim,
  onManage,
  manageDisabled = false,
}: GenesisMarketRowClaimActionsProps) {
  const claimBtn =
    variant === "desktop" ? claimButtonClassDesktop : claimButtonClassCompact;
  const manageBtn =
    variant === "desktop" ? manageButtonClassDesktop : manageButtonClassCompact;

  if (isEnded) {
    if (showMaintenanceTag) {
      return <MarketMaintenanceTag />;
    }
    if (hasClaimable) {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void onClaim();
          }}
          disabled={
            !genesisAddress ||
            !walletAddress ||
            !hasClaimable ||
            isClaimingThisMarket
          }
          className={claimBtn}
        >
          {isClaimingThisMarket ? "Claiming..." : "Claim"}
        </button>
      );
    }
    if (showNoTokensPlaceholder) {
      return (
        <span className="text-xs text-gray-500">No tokens to claim</span>
      );
    }
    return null;
  }

  if (showMaintenanceTag) {
    return <MarketMaintenanceTag />;
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onManage();
      }}
      disabled={manageDisabled}
      className={manageBtn}
    >
      Manage
    </button>
  );
});
