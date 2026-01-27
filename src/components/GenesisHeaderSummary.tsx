import React from "react";
import {
  ArrowPathIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";

export const GenesisHeaderSummary = () => {
  return (
    <div className="mb-2">
      {/* Title Row */}
      <div className="p-4 flex items-center justify-center mb-0">
        <h1 className="font-bold font-mono text-white text-5xl sm:text-6xl md:text-7xl text-center">
          Maiden Voyage
        </h1>
      </div>

      {/* Subheader */}
      <div className="flex items-center justify-center mb-2 -mt-2">
        <p className="text-white/80 text-lg text-center">
          Earn rewards for providing initial liquidity for new markets
        </p>
      </div>

      {/* Three Boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-2 relative">
        {/* Deposit Box */}
        <div className="bg-black/[0.10] backdrop-blur-sm rounded-none overflow-hidden px-3 py-2 flex flex-col items-center justify-center text-center relative">
          <div className="flex items-center justify-center gap-2">
            <BanknotesIcon className="w-5 h-5 text-white" />
            <h2 className="font-bold text-white text-base">Deposit</h2>
          </div>
          <p className="text-xs text-white/75 mt-1">
            Deposit <span className="font-semibold text-white">any token</span>{" "}
            via Velora
          </p>
        </div>

        {/* Earn Box */}
        <div className="bg-black/[0.10] backdrop-blur-sm rounded-none overflow-hidden px-3 py-2 flex flex-col items-center justify-center text-center relative">
          <div className="flex items-center justify-center gap-2">
            <CurrencyDollarIcon className="w-5 h-5 text-white" />
            <h2 className="font-bold text-white text-base">
              Earn Maiden Voyage Marks
            </h2>
          </div>
          <p className="text-xs text-white/75 mt-1">
            and secure your share of the $TIDE airdrop
          </p>
          <p className="text-xs text-white/60 mt-1">
            (TGE Beginning Q2 2026)
          </p>
        </div>

        {/* After Maiden Voyage Box */}
        <div className="bg-black/[0.10] backdrop-blur-sm rounded-none overflow-hidden px-3 py-2 flex flex-col items-center justify-center text-center relative">
          <div className="flex items-center justify-center gap-2">
            <ArrowPathIcon className="w-5 h-5 text-white" />
            <h2 className="font-bold text-white text-base">
              After Maiden Voyage
            </h2>
          </div>
          <p className="text-xs text-white/75 mt-1">
            Claim ha + hs tokens. Value = deposit value.
          </p>
          <p className="text-xs text-white/75 mt-1 font-semibold">
            Earn real yield and more marks!
          </p>
        </div>
      </div>
    </div>
  );
};
