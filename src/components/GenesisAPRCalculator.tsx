"use client";

import { useMemo, useState } from "react";

type GenesisAPRCalculatorProps = {
  marketId: string;
  rewardTokenSymbol: string;
  rewardPoolAmount: number; // total rewards distributed for genesis (token units)
  totalDeposits: bigint | undefined; // 18 decimals
  collateralSymbol: string;
};

// Lightweight APR calculator for Genesis using a simple proportional model:
// userShare = userDeposit / (totalDeposits + userDeposit)
// rewardsToUser = rewardPoolAmount * userShare
// impliedAPR% = (rewardsToUserValueUSD / userDepositValueUSD) * 100
// Assumptions: reward token ~ $1, collateral ~ $1 for quick estimate. We intentionally
// avoid on-chain reads here to keep this component self-contained in the dropdown.
export default function GenesisAPRCalculator({
  marketId,
  rewardTokenSymbol,
  rewardPoolAmount,
  totalDeposits,
  collateralSymbol,
}: GenesisAPRCalculatorProps) {
  const [depositPreview, setDepositPreview] = useState<number>(1000); // USD notionally

  const aprEstimates = useMemo(() => {
    const tvl = Number(totalDeposits ?? 0n) / 1e18; // assume ~USD for display
    const user = Math.max(0, depositPreview);
    const pool = Math.max(0, tvl);
    const totalAfter = pool + user;
    const share = totalAfter > 0 ? user / totalAfter : 0;
    const rewardsToUser = rewardPoolAmount * share; // in reward tokens
    const aprPercent = user > 0 ? (rewardsToUser / user) * 100 : 0;
    return {
      sharePercent: share * 100,
      rewardsToUser,
      aprPercent,
    };
  }, [depositPreview, rewardPoolAmount, totalDeposits]);

  return (
    <div className="w-full  bg-zinc-900/60  p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-white/70">Deposit preview</span>
        <span className="text-sm text-white font-mono">
          {depositPreview.toLocaleString()} {collateralSymbol}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100000}
        step={100}
        value={depositPreview}
        onChange={(e) => setDepositPreview(Number(e.target.value))}
        className="w-full accent-[#1E4775]"
      />
      <div className="mt-3 grid grid-cols-3 gap-4 text-xs">
        <div className="rounded bg-zinc-800/60 p-3">
          <div className="text-white/60">Your pool share</div>
          <div className="text-white font-semibold">
            {aprEstimates.sharePercent.toFixed(2)}%
          </div>
        </div>
        <div className="rounded bg-zinc-800/60 p-3">
          <div className="text-white/60">Est. rewards</div>
          <div className="text-white font-semibold">
            {aprEstimates.rewardsToUser.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}{" "}
            {rewardTokenSymbol}
          </div>
        </div>
        <div className="rounded bg-zinc-800/60 p-3">
          <div className="text-white/60">Implied APR</div>
          <div className="text-white font-semibold">
            {aprEstimates.aprPercent.toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  );
}
