"use client";

import { memo } from "react";
import { MarketMaintenanceTag } from "@/components/MarketMaintenanceTag";
import {
  INDEX_CLAIM_BUTTON_CLASS_COMPACT,
  INDEX_CLAIM_BUTTON_CLASS_DESKTOP,
  INDEX_CLAIM_BUTTON_CLASS_RESPONSIVE,
  INDEX_MANAGE_BUTTON_CLASS_COMPACT,
  INDEX_MANAGE_BUTTON_CLASS_DESKTOP,
  INDEX_MANAGE_BUTTON_CLASS_RESPONSIVE,
} from "@/utils/indexPageManageButton";

const claimButtonClassCompact = INDEX_CLAIM_BUTTON_CLASS_COMPACT;

const claimButtonClassDesktop = INDEX_CLAIM_BUTTON_CLASS_DESKTOP;

const claimButtonClassResponsive = INDEX_CLAIM_BUTTON_CLASS_RESPONSIVE;

const manageButtonClassCompact = INDEX_MANAGE_BUTTON_CLASS_COMPACT;

const manageButtonClassDesktop = INDEX_MANAGE_BUTTON_CLASS_DESKTOP;

const manageButtonClassResponsive = INDEX_MANAGE_BUTTON_CLASS_RESPONSIVE;

export type GenesisMarketRowClaimActionsProps = {
  /** compact = mobile/md; desktop = lg active rows; responsive = md+ archived/completed grids */
  variant: "compact" | "desktop" | "responsive";
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
  /** Primary action label when not ended (default Manage; archived rows use Withdraw). */
  manageButtonLabel?: "Manage" | "Withdraw";
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
  manageButtonLabel = "Manage",
}: GenesisMarketRowClaimActionsProps) {
  const claimBtn =
    variant === "desktop"
      ? claimButtonClassDesktop
      : variant === "responsive"
        ? claimButtonClassResponsive
        : claimButtonClassCompact;
  const manageBtn =
    variant === "desktop"
      ? manageButtonClassDesktop
      : variant === "responsive"
        ? manageButtonClassResponsive
        : manageButtonClassCompact;

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
      {manageButtonLabel}
    </button>
  );
});
