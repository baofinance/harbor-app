import {
  ArrowPathIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  StarIcon,
} from "@heroicons/react/24/outline";

/**
 * Five explainer cards below the Sail title — Extended layout only.
 */
export function SailHeroIntroCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
      <div className="bg-black/[0.10] backdrop-blur-sm rounded-md overflow-hidden px-3 py-2">
        <div className="flex items-center justify-center gap-2">
          <BanknotesIcon className="w-5 h-5 text-white" />
          <h2 className="font-bold text-white text-base text-center">Mint</h2>
        </div>
        <p className="text-xs text-white/75 text-center mt-1">
          Mint leveraged tokens with amplified exposure to price movements
        </p>
      </div>

      <div className="bg-black/[0.10] backdrop-blur-sm rounded-md overflow-hidden px-3 py-2">
        <div className="flex items-center justify-center gap-2">
          <CurrencyDollarIcon className="w-5 h-5 text-white" />
          <h2 className="font-bold text-white text-base text-center">
            No funding fees
          </h2>
        </div>
        <p className="text-xs text-white/75 text-center mt-1">
          Funding fee free leverage
        </p>
      </div>

      <div className="bg-black/[0.10] backdrop-blur-sm rounded-md overflow-hidden px-3 py-2">
        <div className="flex items-center justify-center gap-2">
          <ShieldCheckIcon className="w-5 h-5 text-white" />
          <h2 className="font-bold text-white text-base text-center">
            Auto rebalancing
          </h2>
        </div>
        <p className="text-xs text-white/75 text-center mt-1">
          Positions automatically rebalance to protect you from liquidation
        </p>
      </div>

      <div className="bg-black/[0.10] backdrop-blur-sm rounded-md overflow-hidden px-3 py-2">
        <div className="flex items-center justify-center gap-2">
          <StarIcon className="w-5 h-5 text-white" />
          <h2 className="font-bold text-white text-base text-center">
            Ledger Marks
          </h2>
        </div>
        <p className="text-xs text-white/75 text-center mt-1">
          Earn Ledger marks for deposits: 10 per dollar per day
        </p>
      </div>

      <div className="bg-black/[0.10] backdrop-blur-sm rounded-md overflow-hidden px-3 py-2">
        <div className="flex items-center justify-center gap-2">
          <ArrowPathIcon className="w-5 h-5 text-white" />
          <h2 className="font-bold text-white text-base text-center">Redeem</h2>
        </div>
        <p className="text-xs text-white/75 text-center mt-1">
          Redeem sail tokens for collateral at any time
        </p>
      </div>
    </div>
  );
}
