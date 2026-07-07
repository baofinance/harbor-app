"use client";

import SimpleTooltip from "@/components/SimpleTooltip";
import { formatAPR } from "@/utils/anchor";
import { formatUsd18 } from "@/utils/formatters";
import {
  DEPOSIT_AMOUNT_CARD_CLASS,
  DEPOSIT_SECTION_LABEL_CLASS,
} from "@/components/deposit/depositFlowStyles";

export type DepositStabilityPoolOption = {
  marketId: string;
  marketName?: string;
  poolType: "collateral" | "sail";
  apr?: number;
  tvl?: bigint;
  rewardTokens: string[];
};

type DepositStabilityPoolCardProps = {
  pools: DepositStabilityPoolOption[];
  selected: { marketId: string; poolType: "collateral" | "sail" } | null;
  onSelect: (pool: { marketId: string; poolType: "collateral" | "sail" }) => void;
  disabled?: boolean;
  showMarketName?: boolean;
  peggedTokenPrice?: bigint;
  pegTargetUsdWei?: bigint;
  isPoolDataLoading?: boolean;
  isRewardDataLoading?: boolean;
  emptyMessage?: string;
  label?: string;
};

function poolTypeLabel(poolType: "collateral" | "sail") {
  return poolType === "collateral" ? "Collateral Pool" : "Sail Pool";
}

export function DepositStabilityPoolCard({
  pools,
  selected,
  onSelect,
  disabled = false,
  showMarketName = false,
  peggedTokenPrice,
  pegTargetUsdWei,
  isPoolDataLoading = false,
  isRewardDataLoading = false,
  emptyMessage = "No stability pools available.",
  label = "Stability pool",
}: DepositStabilityPoolCardProps) {
  return (
    <div className={DEPOSIT_AMOUNT_CARD_CLASS}>
      <span className={`${DEPOSIT_SECTION_LABEL_CLASS} mb-2 block`}>
        {label}
      </span>

      {pools.length === 0 ? (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-2 text-xs text-yellow-800">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-2">
          {pools.map((pool) => {
            const poolKey = `${pool.marketId}-${pool.poolType}`;
            const isSelected =
              selected?.marketId === pool.marketId &&
              selected?.poolType === pool.poolType;
            const title = poolTypeLabel(pool.poolType);

            return (
              <label
                key={poolKey}
                className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 transition-colors ${
                  isSelected
                    ? "border-[#1E4775]/35 bg-white/90"
                    : "border-[#1E4775]/12 bg-white/60 hover:bg-white/80"
                } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <input
                  type="radio"
                  name="stabilityPool"
                  checked={isSelected}
                  onChange={() =>
                    onSelect({
                      marketId: pool.marketId,
                      poolType: pool.poolType,
                    })
                  }
                  disabled={disabled}
                  className="mt-0.5 h-3.5 w-3.5 cursor-pointer border-[#1E4775]/30 text-[#1E4775] focus:ring-1 focus:ring-[#1E4775]/20"
                />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-1.5">
                    <span className="text-xs font-medium text-[#1E4775]">
                      {title}
                    </span>
                    <SimpleTooltip
                      side="right"
                      label={
                        <div className="max-w-xs space-y-2">
                          <p className="text-base font-semibold">{title}</p>
                          <div className="space-y-2 text-sm">
                            <p>
                              A {pool.poolType === "collateral" ? "collateral" : "sail"}{" "}
                              pool holds anchor tokens (ha tokens) and provides
                              stability to the market.
                            </p>
                            <p>
                              <span className="font-medium">Rewards:</span> By
                              depositing in this pool, you earn rewards for
                              providing liquidity for rebalances.
                            </p>
                            <p>
                              <span className="font-medium">Rebalancing:</span>{" "}
                              When the market reaches its minimum collateral
                              ratio, it rebalances by converting your anchor
                              tokens to{" "}
                              {pool.poolType === "collateral"
                                ? "market collateral"
                                : "sail tokens"}{" "}
                              at market rates.
                            </p>
                          </div>
                        </div>
                      }
                    >
                      <span className="inline-flex h-3.5 w-3.5 cursor-help items-center justify-center text-[#1E4775]/60 hover:text-[#1E4775]">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-3 w-3"
                          aria-hidden
                        >
                          <circle cx="12" cy="12" r="10" />
                          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                          <path d="M12 17h.01" />
                        </svg>
                      </span>
                    </SimpleTooltip>
                    {showMarketName && pool.marketName ? (
                      <span className="truncate text-[10px] text-[#1E4775]/60">
                        {pool.marketName}
                      </span>
                    ) : null}
                  </div>
                  <div className="grid min-w-0 grid-cols-[auto_1fr_auto] gap-x-4 gap-y-0.5 text-[10px]">
                    <div className="min-w-0 shrink-0">
                      <span className="text-[#1E4775]/60">APR:</span>
                      <span className="ml-1 font-medium text-[#1E4775]">
                        {pool.apr !== undefined ? (
                          pool.apr > 0 ? (
                            formatAPR(pool.apr)
                          ) : (
                            "-"
                          )
                        ) : isPoolDataLoading || isRewardDataLoading ? (
                          "Loading..."
                        ) : (
                          "-"
                        )}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-baseline justify-center gap-1">
                      <span className="shrink-0 text-[#1E4775]/60">TVL:</span>
                      <span className="min-w-0 truncate whitespace-nowrap font-mono font-medium text-[#1E4775]">
                        {pool.tvl !== undefined &&
                        peggedTokenPrice !== undefined &&
                        peggedTokenPrice > 0n &&
                        pegTargetUsdWei !== undefined &&
                        pegTargetUsdWei > 0n
                          ? formatUsd18(
                              (pool.tvl *
                                peggedTokenPrice *
                                pegTargetUsdWei) /
                                10n ** 36n,
                            )
                          : "..."}
                      </span>
                    </div>
                    <div className="min-w-0 shrink-0">
                      <span className="text-[#1E4775]/60">Rewards:</span>
                      <span className="ml-1 truncate font-medium text-[#1E4775]">
                        {pool.rewardTokens.length > 0
                          ? pool.rewardTokens.join("+")
                          : "..."}
                      </span>
                    </div>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
