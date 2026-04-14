import {
  ArrowPathIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";

/**
 * Three intro cards below the Maiden Voyage title — Extended layout only.
 */
export function GenesisHeroIntroCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-2 relative">
      <div className="bg-black/[0.10] backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden px-3 py-2.5 flex flex-col items-center justify-center text-center relative">
        <div className="flex items-center justify-center gap-2">
          <BanknotesIcon className="w-5 h-5 text-[#FF8A7A]" />
          <h2 className="font-bold text-white text-base">Deposit</h2>
        </div>
        <p className="text-xs text-white/75 mt-1">
          Commit <span className="font-semibold text-white">any token</span> via
          Velora to join the cap table
        </p>
      </div>

      <div className="bg-black/[0.10] backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden px-3 py-2.5 flex flex-col items-center justify-center text-center relative ring-1 ring-[#FF8A7A]/25">
        <div className="flex items-center justify-center gap-2">
          <CurrencyDollarIcon className="w-5 h-5 text-[#FF8A7A]" />
          <h2 className="font-bold text-white text-base">Ownership & marks</h2>
        </div>
        <p className="text-xs text-white/75 mt-1">
          Pool share under the USD cap, maiden voyage marks, and $TIDE eligibility
        </p>
        <p className="text-xs text-white/60 mt-1">(TGE Beginning Q2 2026)</p>
      </div>

      <div className="bg-black/[0.10] backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden px-3 py-2.5 flex flex-col items-center justify-center text-center relative">
        <div className="flex items-center justify-center gap-2">
          <ArrowPathIcon className="w-5 h-5 text-[#FF8A7A]" />
          <h2 className="font-bold text-white text-base">After genesis</h2>
        </div>
        <p className="text-xs text-white/75 mt-1">
          Claim Anchor + Sail. Boosted yield share while you stay in Harbor.
        </p>
        <p className="text-xs text-white/75 mt-1 font-semibold">
          Real yield + ongoing ledger marks
        </p>
      </div>
    </div>
  );
}
