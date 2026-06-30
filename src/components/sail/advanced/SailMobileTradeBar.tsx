"use client";

import {
  SAIL_MOBILE_TRADE_BUY_BUTTON_CLASS,
  SAIL_MOBILE_TRADE_SELL_BUTTON_CLASS,
} from "./sailAdvancedStyles";

type SailMobileTradeBarProps = {
  onMint: () => void;
  onRedeem: () => void;
};

/** Sticky Buy / Sell shortcuts — scrolls to the embedded trade panel on small screens. */
export function SailMobileTradeBar({ onMint, onRedeem }: SailMobileTradeBarProps) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/15 bg-[#0d2847]/92 backdrop-blur-lg lg:hidden"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-lg gap-2 px-3 pt-3">
        <button
          type="button"
          onClick={onMint}
          className={SAIL_MOBILE_TRADE_BUY_BUTTON_CLASS}
        >
          Buy
        </button>
        <button
          type="button"
          onClick={onRedeem}
          className={SAIL_MOBILE_TRADE_SELL_BUTTON_CLASS}
        >
          Sell
        </button>
      </div>
    </div>
  );
}
