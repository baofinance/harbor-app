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
          Deposit with any token via Velora to secure your share of a
          market&apos;s revenue for life.
        </p>
      </div>

      <div className="bg-black/[0.10] backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden px-3 py-2.5 flex flex-col items-center justify-center text-center relative ring-1 ring-[#FF8A7A]/25">
        <div className="flex items-center justify-center gap-2 mb-1">
          <SparklesIcon className="w-5 h-5 text-[#FF8A7A]" />
          <h2 className="font-bold text-white text-base">Earn Marks</h2>
        </div>
        <p className="text-xs text-white/80 leading-relaxed">
          Earn Harbor Marks that convert to TIDE at TGE
        </p>
        <p className="text-xs text-white/60 mt-1.5">(TGE Beginning Q2 2026)</p>
      </div>

      <div className="bg-black/[0.10] backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden px-3 py-2.5 flex flex-col items-center justify-center text-center relative">
        <div className="flex items-center justify-center gap-2 mb-1">
          <ArrowPathIcon className="w-5 h-5 text-[#FF8A7A]" />
          <h2 className="font-bold text-white text-base">After genesis</h2>
        </div>
        <p className="text-xs text-white/80 leading-relaxed">
          Claim Anchor + Sail. Earn a share of market revenue even after
          withdrawing. Yield share is boosted 5× and declines linearly to a
          minimum of 1× as withdrawals are made.
        </p>
        <p className="text-xs text-white/80 mt-1.5 font-semibold">
          Real yield + ongoing ledger marks
        </p>
      </div>
    </div>
  );
}
