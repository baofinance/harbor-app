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
      <div className="bg-black/[0.10] backdrop-blur-sm rounded-md overflow-hidden px-3 py-2 flex flex-col items-center justify-center text-center relative">
        <div className="flex items-center justify-center gap-2">
          <BanknotesIcon className="w-5 h-5 text-white" />
          <h2 className="font-bold text-white text-base">Deposit</h2>
        </div>
        <p className="text-xs text-white/75 mt-1">
          Deposit <span className="font-semibold text-white">any token</span> via
          Velora
        </p>
      </div>

      <div className="bg-black/[0.10] backdrop-blur-sm rounded-md overflow-hidden px-3 py-2 flex flex-col items-center justify-center text-center relative">
        <div className="flex items-center justify-center gap-2">
          <CurrencyDollarIcon className="w-5 h-5 text-white" />
          <h2 className="font-bold text-white text-base">
            Earn Maiden Voyage Marks
          </h2>
        </div>
        <p className="text-xs text-white/75 mt-1">
          and secure your share of the $TIDE airdrop
        </p>
        <p className="text-xs text-white/60 mt-1">(TGE Beginning Q2 2026)</p>
      </div>

      <div className="bg-black/[0.10] backdrop-blur-sm rounded-md overflow-hidden px-3 py-2 flex flex-col items-center justify-center text-center relative">
        <div className="flex items-center justify-center gap-2">
          <ArrowPathIcon className="w-5 h-5 text-white" />
          <h2 className="font-bold text-white text-base">After Maiden Voyage</h2>
        </div>
        <p className="text-xs text-white/75 mt-1">
          Claim anchor + sail tokens. Value = deposit value.
        </p>
        <p className="text-xs text-white/75 mt-1 font-semibold">
          Earn real yield and more marks!
        </p>
      </div>
    </div>
  );
}
