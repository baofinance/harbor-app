"use client";

import {
  ANCHOR_MOBILE_DEPOSIT_BUTTON_CLASS,
  ANCHOR_MOBILE_WITHDRAW_BUTTON_CLASS,
} from "./anchorAdvancedStyles";

type AnchorMobileTradeBarProps = {
  onDeposit: () => void;
  onWithdraw: () => void;
  depositDisabled?: boolean;
};

/** Sticky Deposit / Withdraw shortcuts — scrolls to the embedded panel on small screens. */
export function AnchorMobileTradeBar({
  onDeposit,
  onWithdraw,
  depositDisabled = false,
}: AnchorMobileTradeBarProps) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/15 bg-[#0d2847]/92 backdrop-blur-lg lg:hidden"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-lg gap-2 px-3 pt-3">
        <button
          type="button"
          onClick={onDeposit}
          disabled={depositDisabled}
          className={`${ANCHOR_MOBILE_DEPOSIT_BUTTON_CLASS} ${
            depositDisabled ? "cursor-not-allowed opacity-40" : ""
          }`}
        >
          Deposit
        </button>
        <button
          type="button"
          onClick={onWithdraw}
          className={ANCHOR_MOBILE_WITHDRAW_BUTTON_CLASS}
        >
          Withdraw
        </button>
      </div>
    </div>
  );
}
