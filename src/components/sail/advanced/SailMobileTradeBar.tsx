"use client";

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
          className="flex-1 rounded-lg bg-[#4A9784] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3d8070] active:scale-[0.98]"
        >
          Buy
        </button>
        <button
          type="button"
          onClick={onRedeem}
          className="flex-1 rounded-lg bg-[#1E4775] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#163a5f] active:scale-[0.98]"
        >
          Sell
        </button>
      </div>
    </div>
  );
}
