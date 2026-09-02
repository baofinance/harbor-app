"use client";

import {
  ANCHOR_MOBILE_DEPOSIT_BUTTON_CLASS,
  ANCHOR_MOBILE_WITHDRAW_BUTTON_CLASS,
} from "./anchorAdvancedStyles";

type AnchorMobileTradeBarProps = {
  onMint: () => void;
  onRedeem: () => void;
  mintDisabled?: boolean;
};

/** Sticky Mint / Redeem shortcuts — scrolls to the embedded panel on small screens. */
export function AnchorMobileTradeBar({
  onMint,
  onRedeem,
  mintDisabled = false,
}: AnchorMobileTradeBarProps) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/15 bg-[#0d2847]/92 backdrop-blur-lg lg:hidden"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-lg gap-2 px-3 pt-3">
        <button
          type="button"
          onClick={onMint}
          disabled={mintDisabled}
          className={`${ANCHOR_MOBILE_DEPOSIT_BUTTON_CLASS} ${
            mintDisabled ? "cursor-not-allowed opacity-40" : ""
          }`}
        >
          Mint
        </button>
        <button
          type="button"
          onClick={onRedeem}
          className={ANCHOR_MOBILE_WITHDRAW_BUTTON_CLASS}
        >
          Redeem
        </button>
      </div>
    </div>
  );
}
