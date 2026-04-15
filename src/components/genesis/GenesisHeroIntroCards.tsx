import {
  ArrowPathIcon,
  BanknotesIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

/**
 * Three intro cards below the Maiden Voyage title — Extended layout only.
 */
export function GenesisHeroIntroCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-2 relative">
      <div className="bg-black/[0.10] backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden px-3 py-2.5 flex flex-col items-center justify-center text-center relative">
        <div className="flex items-center justify-center gap-2 mb-1">
          <BanknotesIcon className="w-5 h-5 text-[#FF8A7A]" />
          <h2 className="font-bold text-white text-base">Deposit</h2>
        </div>
        <p className="text-xs text-white/80 leading-relaxed">
          Help fill a market&apos;s launch liquidity &amp; in return own a share
          of all mint/redeem fees and collateral yield.
        </p>
      </div>

      <div className="bg-black/[0.10] backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden px-3 py-2.5 flex flex-col items-center justify-center text-center relative ring-1 ring-[#FF8A7A]/25">
        <div className="flex items-center justify-center gap-2 mb-1">
          <SparklesIcon className="w-5 h-5 text-[#FF8A7A]" />
          <h2 className="font-bold text-white text-base">Launch</h2>
        </div>
        <p className="text-xs text-white/80 leading-relaxed">
          Markets launch once their deposit cap is filled
        </p>
      </div>

      <div className="bg-black/[0.10] backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden px-3 py-2.5 flex flex-col items-center justify-center text-center relative">
        <div className="flex items-center justify-center gap-2 mb-1">
          <ArrowPathIcon className="w-5 h-5 text-[#FF8A7A]" />
          <h2 className="font-bold text-white text-base">After genesis</h2>
        </div>
        <p className="text-xs text-white/80 leading-relaxed">
          Claim Anchor + Sail. Stay deposited to maximize share of revenue.{" "}
          <a
            href="https://docs.harborfinance.io/maiden-voyage"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#FF8A7A] hover:text-[#ffb4a8] underline decoration-white/30 underline-offset-2 font-semibold whitespace-nowrap"
          >
            Find out more
          </a>
        </p>
      </div>
    </div>
  );
}
