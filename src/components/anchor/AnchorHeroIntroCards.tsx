import {
  ArrowPathIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

/**
 * Four intro cards — Extended layout only (Genesis-style tiles: rounded, subtle blur).
 */
export function AnchorHeroIntroCards() {
  return (
    <div className="mt-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-1">
      <div className="bg-black/[0.10] backdrop-blur-sm rounded-md overflow-hidden border border-white/10 px-3 py-2 flex flex-col items-center justify-center text-center">
        <div className="flex items-center justify-center gap-2">
          <BanknotesIcon className="w-5 h-5 text-white" />
          <h2 className="font-bold text-white text-base">Mint</h2>
        </div>
        <p className="text-xs text-white/75 mt-1">
          Mint a pegged token with a supported asset
        </p>
      </div>

      <div className="bg-black/[0.10] backdrop-blur-sm rounded-md overflow-hidden border border-white/10 px-3 py-2 flex flex-col items-center justify-center text-center">
        <div className="flex items-center justify-center gap-2">
          <ShieldCheckIcon className="w-5 h-5 text-white" />
          <h2 className="font-bold text-white text-base">Secure</h2>
        </div>
        <p className="text-xs text-white/75 mt-1">
          Deposit into a stability pool to secure the protocol
        </p>
      </div>

      <div className="bg-black/[0.10] backdrop-blur-sm rounded-md overflow-hidden border border-white/10 px-3 py-2 flex flex-col items-center justify-center text-center">
        <div className="flex items-center justify-center gap-2">
          <CurrencyDollarIcon className="w-5 h-5 text-white" />
          <h2 className="font-bold text-white text-base">Earn</h2>
        </div>
        <p className="text-xs text-white/75 mt-1">
          Earn real yield from collateral and trading fees for helping secure the
          protocol
        </p>
      </div>

      <div className="bg-black/[0.10] backdrop-blur-sm rounded-md overflow-hidden border border-white/10 px-3 py-2 flex flex-col items-center justify-center text-center">
        <div className="flex items-center justify-center gap-2">
          <ArrowPathIcon className="w-5 h-5 text-white" />
          <h2 className="font-bold text-white text-base">Redeem</h2>
        </div>
        <p className="text-xs text-white/75 mt-1">
          Redeem for collateral at any time
        </p>
      </div>
    </div>
  );
}
