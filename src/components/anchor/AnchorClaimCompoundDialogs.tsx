"use client";

import { formatEther, parseEther } from "viem";
import { AnchorClaimAllModal } from "@/components/AnchorClaimAllModal";
import {
  CompoundTargetTokenModal,
  type CompoundSelectedPosition,
  type CompoundTargetOption,
  type CompoundTargetPoolApr,
} from "@/components/CompoundTargetTokenModal";
import { TransactionProgressModal } from "@/components/TransactionProgressModal";
import { CompoundConfirmationModal } from "@/components/CompoundConfirmationModal";
import {
  CompoundPoolSelectionModal,
  type PoolOption,
} from "@/components/CompoundPoolSelectionModal";
import { AnchorClaimMarketModal } from "@/components/AnchorClaimMarketModal";
import { HARBOR_FROSTED_MODAL_SHELL } from "@/components/shared/harborFrostedSurfaceStyles";
import {
  HARBOR_BTN_GLASS_MAX_CHIP_ROUND_CLASS,
  HARBOR_BTN_GLASS_PILL_CORAL_CLASS,
  HARBOR_BTN_GLASS_PILL_NAVY_CLASS,
  HARBOR_BTN_GLASS_PILL_OUTLINE_CLASS,
} from "@/components/shared/harborButtonStyles";
import { formatDateTime, formatTimeRemaining, formatToken } from "@/utils/formatters";
import {
  INDEX_MODAL_CANCEL_BUTTON_CLASS_DESKTOP,
  INDEX_WITHDRAW_BUTTON_CLASS_DESKTOP_CORAL,
} from "@/utils/indexPageManageButton";
import {
  useAnchorClaimCompound,
  type UseAnchorClaimCompoundParams,
} from "@/hooks/anchor/useAnchorClaimCompound";

type ClaimState = ReturnType<typeof useAnchorClaimCompound>;

export type AnchorClaimCompoundDialogsProps = {
  claim: ClaimState;
  anchorMarkets: UseAnchorClaimCompoundParams["anchorMarkets"];
  reads: UseAnchorClaimCompoundParams["reads"];
  allPoolRewards: UseAnchorClaimCompoundParams["allPoolRewards"];
  claimAllPositions: Array<{
    marketId: string;
    market: any;
    poolType: "collateral" | "sail";
    rewards: bigint;
    rewardsUSD: number;
    deposit: bigint;
    depositUSD: number;
    rewardTokens: Array<{
      symbol: string;
      claimable: bigint;
      claimableFormatted: string;
    }>;
  }>;
  marketsDataMap: Map<
    string,
    {
      collateralPoolAPR?: { collateral?: number; steam?: number };
      sailPoolAPR?: { collateral?: number; steam?: number };
    }
  >;
};

export function AnchorClaimCompoundDialogs({
  claim,
  anchorMarkets,
  reads,
  allPoolRewards,
  claimAllPositions,
  marketsDataMap,
}: AnchorClaimCompoundDialogsProps) {
  const {
    compoundModal,
    setCompoundModal,
    compoundPoolSelection,
    setCompoundPoolSelection,
    isClaiming,
    isCompounding,
    setIsCompounding,
    isClaimingAll,
    isCompoundingAll,
    earlyWithdrawModal,
    setEarlyWithdrawModal,
    withdrawAmountModal,
    setWithdrawAmountModal,
    withdrawAmountInput,
    setWithdrawAmountInput,
    withdrawAmountError,
    setWithdrawAmountError,
    transactionProgress,
    setTransactionProgress,
    compoundConfirmation,
    setCompoundConfirmation,
    compoundTargetModal,
    setCompoundTargetModal,
    compoundIntent,
    setCompoundIntent,
    advancedPreflight,
    simplePreflight,
    cancelOperationRef,
    isClaimAllModalOpen,
    setIsClaimAllModalOpen,
    selectedMarketForClaim,
    setIsClaimMarketModalOpen,
    isClaimMarketModalOpen,
    handlePendingWithdraw,
    handleCompoundRewards,
    handleClaimAll,
    handleCompoundAll,
    handleCompoundConfirm,
    handleBuyTide,
    runAdvancedPreflight,
    runSimplePreflight,
    handleCompoundAllKeepPerToken,
    handleCompoundAllToSingleToken,
    handleClaimMarketBasicClaim,
    handleClaimMarketCompound,
    handleClaimMarketBuyTide,
  } = claim;

  return (
    <>
        {compoundModal && (
          // Convert old compoundModal to new pool selection flow
          <CompoundPoolSelectionModal
            isOpen={true}
            onClose={() => setCompoundModal(null)}
            onConfirm={async (allocations) => {
              setCompoundModal(null);
              try {
                // Calculate reward amount from all pools
                const totalRewardAmount = BigInt(0); // Will be calculated in handleCompoundConfirm
                const collateralPool = compoundModal.market.addresses
                  ?.stabilityPoolCollateral as `0x${string}` | undefined;
                const sailPool = compoundModal.market.addresses
                  ?.stabilityPoolLeveraged as `0x${string}` | undefined;

                await handleCompoundConfirm(
                  compoundModal.market,
                  allocations
                    .map((a) => {
                      const addr = a.poolAddress.toLowerCase();
                      const collateralAddr = collateralPool?.toLowerCase();
                      const sailAddr = sailPool?.toLowerCase();
                      const poolId =
                        collateralAddr && addr === collateralAddr
                          ? ("collateral" as const)
                          : sailAddr && addr === sailAddr
                          ? ("sail" as const)
                          : null;
                      return poolId
                        ? { poolId, percentage: a.percentage }
                        : null;
                    })
                    .filter(
                      (
                        x
                      ): x is {
                        poolId: "collateral" | "sail";
                        percentage: number;
                      } => x !== null
                    ),
                  totalRewardAmount
                );
              } catch (error: any) {
                setTransactionProgress({
                  isOpen: true,
                  title: "Compounding Rewards",
                  steps: [
                    {
                      id: "error",
                      label: "Error",
                      status: "error",
                      error: error?.message || "An error occurred",
                    },
                  ],
                  currentStepIndex: 0,
                });
              }
            }}
            pools={(() => {
              // Build pools array from the market
              const market = compoundModal.market;
              const collateralPoolAddress = market.addresses
                ?.stabilityPoolCollateral as `0x${string}` | undefined;
              const sailPoolAddress = market.addresses
                ?.stabilityPoolLeveraged as `0x${string}` | undefined;

              const pools: PoolOption[] = [];

              // Get pegged token price for TVL calculation
              let peggedTokenPrice: bigint | undefined;
              const marketIndex = anchorMarkets.findIndex(
                ([id]) =>
                  id === compoundModal.market.id ||
                  (compoundModal.market as any).addresses?.peggedToken
              );
              if (marketIndex >= 0 && reads) {
                let offset = 0;
                for (let i = 0; i < marketIndex; i++) {
                  const prevMarket = anchorMarkets[i][1];
                  const prevHasCollateral = !!(prevMarket as any).addresses
                    ?.stabilityPoolCollateral;
                  const prevHasSail = !!(prevMarket as any).addresses
                    ?.stabilityPoolLeveraged;
                  const prevHasPriceOracle = !!(prevMarket as any).addresses
                    ?.collateralPrice;
                  const prevHasStabilityPoolManager = !!(prevMarket as any)
                    .addresses?.stabilityPoolManager;
                  const prevPeggedTokenAddress = (prevMarket as any)?.addresses
                    ?.peggedToken;
                  offset += 5;
                  if (prevHasStabilityPoolManager) offset += 1;
                  if (prevHasCollateral) {
                    offset += 4;
                    if (prevPeggedTokenAddress) offset += 1;
                  }
                  if (prevHasSail) {
                    offset += 4;
                    if (prevPeggedTokenAddress) offset += 1;
                  }
                  if (prevHasPriceOracle) offset += 1;
                }
                peggedTokenPrice = reads?.[offset + 3]?.result as
                  | bigint
                  | undefined;
              }

              if (collateralPoolAddress) {
                const collateralPoolData = allPoolRewards?.find(
                  (r) =>
                    r.poolAddress.toLowerCase() ===
                    collateralPoolAddress.toLowerCase()
                );
                const collateralPoolAPR = collateralPoolData?.totalAPR;

                let collateralTVLUSD: number | undefined;
                if (collateralPoolData?.tvl !== undefined && peggedTokenPrice) {
                  const tvlTokens = Number(collateralPoolData.tvl) / 1e18;
                  const peggedPriceUSD = Number(peggedTokenPrice) / 1e18;
                  collateralTVLUSD = tvlTokens * peggedPriceUSD;
                }

                pools.push({
                  id: "collateral",
                  name: `${
                    compoundModal.market.peggedToken?.symbol ||
                    compoundModal.market.id
                  } Collateral Pool`,
                  address: collateralPoolAddress,
                  apr: collateralPoolAPR,
                  tvl: collateralPoolData?.tvl,
                  tvlUSD: collateralTVLUSD,
                  enabled: true,
                });
              }

              if (sailPoolAddress) {
                const sailPoolData = allPoolRewards?.find(
                  (r) =>
                    r.poolAddress.toLowerCase() ===
                    sailPoolAddress.toLowerCase()
                );
                const sailPoolAPR = sailPoolData?.totalAPR;

                let sailTVLUSD: number | undefined;
                if (sailPoolData?.tvl !== undefined && peggedTokenPrice) {
                  const tvlTokens = Number(sailPoolData.tvl) / 1e18;
                  const peggedPriceUSD = Number(peggedTokenPrice) / 1e18;
                  sailTVLUSD = tvlTokens * peggedPriceUSD;
                }

                pools.push({
                  id: "sail",
                  name: `${
                    compoundModal.market.peggedToken?.symbol ||
                    compoundModal.market.id
                  } Sail Pool`,
                  address: sailPoolAddress,
                  apr: sailPoolAPR,
                  tvl: sailPoolData?.tvl,
                  tvlUSD: sailTVLUSD,
                  enabled: true,
                });
              }

              return pools;
            })()}
            marketSymbol={
              compoundModal.market.peggedToken?.symbol ||
              compoundModal.market.id
            }
          />
        )}

        <AnchorClaimAllModal
          isOpen={isClaimAllModalOpen}
          onClose={() => setIsClaimAllModalOpen(false)}
          onBasicClaim={handleClaimAll}
          onCompound={(selectedPools) => {
            const selectedKey = new Set(
              selectedPools.map((p) => `${p.marketId}-${p.poolType}`)
            );
            const selectedPositions = claimAllPositions.filter((p) =>
              selectedKey.has(`${p.marketId}-${p.poolType}`)
            );

            const selectedMarketIds = Array.from(
              new Set(selectedPositions.map((p) => p.marketId))
            );

            // Build token options grouped by pegged token address, and include APRs for *all* pools across *all* markets for that token.
            const tokenAddrToRepresentativeMarketId = new Map<string, string>();
            for (const marketId of selectedMarketIds) {
              const market = anchorMarkets.find(([id]) => id === marketId)?.[1];
              const peggedTokenAddr = (market as any)?.addresses
                ?.peggedToken as `0x${string}` | undefined;
              if (!peggedTokenAddr) continue;
              if (
                !tokenAddrToRepresentativeMarketId.has(
                  peggedTokenAddr.toLowerCase()
                )
              ) {
                tokenAddrToRepresentativeMarketId.set(
                  peggedTokenAddr.toLowerCase(),
                  marketId
                );
              }
            }

            const options: CompoundTargetOption[] = Array.from(
              tokenAddrToRepresentativeMarketId.entries()
            ).map(([peggedTokenAddrLower, representativeMarketId]) => {
              // Find *all* markets that share this pegged token
              const marketsForToken = anchorMarkets.filter(([_, m]) => {
                const p = (m as any)?.addresses?.peggedToken as
                  | `0x${string}`
                  | undefined;
                return p && p.toLowerCase() === peggedTokenAddrLower;
              });

              const symbol =
                anchorMarkets.find(([id]) => id === representativeMarketId)?.[1]
                  ?.peggedToken?.symbol || representativeMarketId;

              const pools = marketsForToken.flatMap(([mid, m]) => {
                const collateralSymbol =
                  (m as any)?.collateral?.symbol || "collateral";
                  const collateralPoolAddress = (m as any).addresses
                  ?.stabilityPoolCollateral as `0x${string}` | undefined;
                const sailPoolAddress = (m as any).addresses
                  ?.stabilityPoolLeveraged as `0x${string}` | undefined;

                // Prefer the APR used on the Anchor page (from `useAnchorMarketData`), which falls back to
                // contract APRs when live reward APRs are unavailable.
                const marketData = marketsDataMap.get(mid);
                const collateralAprFromMarketData =
                  marketData?.collateralPoolAPR
                    ? (marketData.collateralPoolAPR.collateral || 0) +
                      (marketData.collateralPoolAPR.steam || 0)
                    : undefined;
                const sailAprFromMarketData = marketData?.sailPoolAPR
                  ? (marketData.sailPoolAPR.collateral || 0) +
                    (marketData.sailPoolAPR.steam || 0)
                  : undefined;

                const items: CompoundTargetPoolApr[] = [];

                if (collateralPoolAddress) {
                  const apr =
                    collateralAprFromMarketData ??
                    allPoolRewards?.find(
                      (r) =>
                        r.poolAddress.toLowerCase() ===
                        collateralPoolAddress.toLowerCase()
                    )?.totalAPR;
                  items.push({
                    marketId: mid,
                    collateralSymbol,
                      poolType: "collateral",
                    poolAddress: collateralPoolAddress,
                    apr,
                  });
                }
                if (sailPoolAddress) {
                  const apr =
                    sailAprFromMarketData ??
                    allPoolRewards?.find(
                      (r) =>
                        r.poolAddress.toLowerCase() ===
                        sailPoolAddress.toLowerCase()
                    )?.totalAPR;
                  items.push({
                    marketId: mid,
                    collateralSymbol,
                    poolType: "sail",
                    poolAddress: sailPoolAddress,
                    apr,
                  });
                }
                return items;
              });

              return {
                marketId: representativeMarketId,
                symbol,
                pools,
              };
            });

            setCompoundTargetModal({
              selectedPools,
              positions: selectedPositions as CompoundSelectedPosition[],
              options,
            });

            setIsClaimAllModalOpen(false);
          }}
          onBuyTide={handleBuyTide}
          positions={claimAllPositions}
          isLoading={isClaimingAll || isCompoundingAll}
        />

        {compoundTargetModal && (
          <CompoundTargetTokenModal
            isOpen={true}
            onClose={() => {
              setCompoundTargetModal(null);
              // allow user to go back to pool selection step
              setIsClaimAllModalOpen(true);
            }}
            positions={compoundTargetModal.positions}
            options={compoundTargetModal.options}
            selectedClaimPools={compoundTargetModal.selectedPools}
            preflight={
              advancedPreflight
                ? {
                    key: advancedPreflight.key,
                    isLoading: advancedPreflight.isLoading,
                    error: advancedPreflight.error,
                    fees: advancedPreflight.fees,
                  }
                : null
            }
            onPreflight={runAdvancedPreflight}
            simplePreflight={
              simplePreflight
                ? {
                    key: simplePreflight.key,
                    isLoading: simplePreflight.isLoading,
                    error: simplePreflight.error,
                    fees: simplePreflight.fees,
                  }
                : null
            }
            onSimplePreflight={runSimplePreflight}
            onContinue={({ mode, targetMarketId, allocations }) => {
              // Advanced compound: allocations are selected inline, so skip the next modal entirely.
              if (mode === "single-token" && targetMarketId && allocations) {
                setCompoundTargetModal(null);
                void (async () => {
                  try {
                    const preflight = advancedPreflight?.isLoading
                      ? undefined
                      : advancedPreflight?.plan &&
                        advancedPreflight.plan.targetMarketId === targetMarketId
                      ? advancedPreflight.plan
                      : undefined;
                    await handleCompoundAllToSingleToken(
                      compoundTargetModal.selectedPools,
                      targetMarketId,
                      allocations,
                      preflight
                    );
                  } catch (error: any) {
                    setTransactionProgress({
                      isOpen: true,
                      title: "Compounding Rewards",
                      steps: [
                        {
                          id: "error",
                          label: "Error",
                          status: "error",
                          error: error?.message || "An error occurred",
                        },
                      ],
                      currentStepIndex: 0,
                    });
                  }
                })();
                return;
              }

              // Simple compound (and any other modes) continue to the next modal as before.
              setCompoundIntent({
                mode,
                selectedPools: compoundTargetModal.selectedPools,
                targetMarketId,
                    });

              const marketForPoolSelection =
                compoundTargetModal.positions[0]?.market;
              if (marketForPoolSelection) {
                handleCompoundRewards(marketForPoolSelection, "collateral", 0n);
              }
              setCompoundTargetModal(null);
            }}
        />
        )}

        {selectedMarketForClaim && (
          <AnchorClaimMarketModal
            isOpen={isClaimMarketModalOpen}
            onClose={() => setIsClaimMarketModalOpen(false)}
            onBasicClaim={handleClaimMarketBasicClaim}
            onCompound={handleClaimMarketCompound}
            onBuyTide={handleClaimMarketBuyTide}
            marketSymbol={
              anchorMarkets.find(([id]) => id === selectedMarketForClaim)?.[1]
                ?.peggedToken?.symbol || "Market"
            }
            isLoading={isClaiming || isCompounding}
          />
        )}

        {/* Compound Pool Selection Modal */}
        {compoundPoolSelection && (
          <CompoundPoolSelectionModal
            isOpen={true}
            onClose={() => {
              setCompoundPoolSelection(null);
              setCompoundIntent(null);
            }}
            onConfirm={async (allocations) => {
              setCompoundPoolSelection(null);
              try {
                // If we're coming from the Claim All -> Compound flow, branch based on intent.
                if (
                  compoundIntent?.mode === "single-token" &&
                  compoundIntent.targetMarketId
                ) {
                  await handleCompoundAllToSingleToken(
                    compoundIntent.selectedPools,
                    compoundIntent.targetMarketId,
                    allocations
                  );
                  setCompoundIntent(null);
                  return;
                }

                if (compoundIntent?.mode === "keep-per-token") {
                  await handleCompoundAllKeepPerToken(
                    compoundIntent.selectedPools,
                    allocations
                  );
                  setCompoundIntent(null);
                  return;
                }

                // Default: original single-market compound confirm flow
                const totalRewardAmount = BigInt(0); // Will be calculated in handleCompoundConfirm
                const market = compoundPoolSelection.market as any;
                const collateralPoolAddress = market?.addresses
                  ?.stabilityPoolCollateral as `0x${string}` | undefined;
                const sailPoolAddress = market?.addresses
                  ?.stabilityPoolLeveraged as `0x${string}` | undefined;

                const mappedAllocations = allocations
                  .map((a) => {
                    const poolId =
                      collateralPoolAddress &&
                      a.poolAddress.toLowerCase() ===
                        collateralPoolAddress.toLowerCase()
                        ? "collateral"
                        : sailPoolAddress &&
                          a.poolAddress.toLowerCase() ===
                            sailPoolAddress.toLowerCase()
                        ? "sail"
                        : null;
                    return poolId ? { poolId, percentage: a.percentage } : null;
                  })
                  .filter(Boolean) as Array<{
                  poolId: "collateral" | "sail";
                  percentage: number;
                }>;

                await handleCompoundConfirm(
                  compoundPoolSelection.market,
                  mappedAllocations,
                  totalRewardAmount
                );
              } catch (error: any) {
                // Show error in a simple alert or toast
                setTransactionProgress({
                  isOpen: true,
                  title: "Compounding Rewards",
                  steps: [
                    {
                      id: "error",
                      label: "Error",
                      status: "error",
                      error: error?.message || "An error occurred",
                    },
                  ],
                  currentStepIndex: 0,
                });
              }
            }}
            pools={compoundPoolSelection.pools}
            marketSymbol={
              compoundPoolSelection.market.peggedToken?.symbol ||
              compoundPoolSelection.market.id
            }
          />
        )}

        {compoundConfirmation && (
          <CompoundConfirmationModal
            isOpen={true}
            onClose={() => {
              setCompoundConfirmation(null);
              setIsCompounding(false);
            }}
            onConfirm={compoundConfirmation.onConfirm}
            steps={compoundConfirmation.steps}
            fees={compoundConfirmation.fees}
            feeErrors={compoundConfirmation.feeErrors}
          />
        )}

        {/* Early withdraw confirmation */}
        {earlyWithdrawModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className={`${HARBOR_FROSTED_MODAL_SHELL} shadow-xl max-w-md w-full p-4 rounded-lg`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[#1E4775] font-semibold">
                  Withdraw early?
                </h3>
                <button
                  onClick={() => setEarlyWithdrawModal(null)}
                  className="text-[#1E4775]/60 hover:text-[#1E4775]"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-[#1E4775]/80">
                Withdrawing now will incur the early withdrawal fee. The
                fee-free window opens in{" "}
                {formatTimeRemaining(
                  new Date(
                    Number(earlyWithdrawModal.start) * 1000
                  ).toISOString()
                )}{" "}
                and closes at{" "}
                {formatDateTime(
                  new Date(Number(earlyWithdrawModal.end) * 1000).toISOString()
                )}
                .
              </p>
              <div className="text-xs text-[#1E4775]/70 mt-2">
                Fee:{" "}
                {(Number(earlyWithdrawModal.earlyWithdrawFee) / 1e16).toFixed(
                  2
                )}
                %
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setEarlyWithdrawModal(null)}
                  className={INDEX_MODAL_CANCEL_BUTTON_CLASS_DESKTOP}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWithdrawAmountInput("");
                    setWithdrawAmountError(null);
                    setWithdrawAmountModal({
                      poolAddress: earlyWithdrawModal.poolAddress,
                      poolType: earlyWithdrawModal.poolType,
                      useEarly: true,
                      symbol: earlyWithdrawModal.symbol,
                      maxAmount: earlyWithdrawModal.poolBalance || 0n,
                    });
                    setEarlyWithdrawModal(null);
                  }}
                  className={INDEX_WITHDRAW_BUTTON_CLASS_DESKTOP_CORAL}
                >
                  Continue with fee
                </button>
              </div>
            </div>
          </div>
        )}

        {withdrawAmountModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className={`${HARBOR_FROSTED_MODAL_SHELL} max-w-lg w-full p-6 space-y-4`}>
              <div className="flex items-center justify-between">
                <h3 className="text-[#1E4775] font-semibold text-lg">
                  {withdrawAmountModal.useEarly
                    ? "Withdraw (fee applies)"
                    : "Withdraw"}
                </h3>
                <button
                  onClick={() => {
                    setWithdrawAmountModal(null);
                    setWithdrawAmountInput("");
                    setWithdrawAmountError(null);
                  }}
                  className="text-[#1E4775]/60 hover:text-[#1E4775]"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-[#1E4775]">
                    Enter Amount
                  </label>
                  {withdrawAmountModal?.maxAmount !== undefined && (
                    <span className="text-sm text-[#1E4775]/70">
                      Balance: {formatToken(withdrawAmountModal.maxAmount)}{" "}
                      {withdrawAmountModal.symbol || "pegged"}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    value={withdrawAmountInput}
                    onChange={(e) => {
                      setWithdrawAmountInput(e.target.value);
                      setWithdrawAmountError(null);
                    }}
                    type="text"
                    placeholder="0.0"
                    className={`w-full h-14 px-4 pr-24 bg-white/85 backdrop-blur-sm text-[#1E4775] border-2 ${
                      withdrawAmountError
                        ? "border-red-500"
                        : "border-[#1E4775]/30"
                    } focus:border-[#1E4775] focus:ring-2 focus:ring-[#1E4775]/20 focus:outline-none transition-all text-xl font-mono `}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!withdrawAmountModal?.maxAmount) return;
                      setWithdrawAmountInput(
                        formatEther(withdrawAmountModal.maxAmount)
                      );
                      setWithdrawAmountError(null);
                    }}
                    className={HARBOR_BTN_GLASS_MAX_CHIP_ROUND_CLASS}
                  >
                    MAX
                  </button>
                </div>
                {withdrawAmountError && (
                  <p className="mt-2 text-sm text-red-600">
                    {withdrawAmountError}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setWithdrawAmountModal(null);
                    setWithdrawAmountInput("");
                    setWithdrawAmountError(null);
                  }}
                  className={HARBOR_BTN_GLASS_PILL_OUTLINE_CLASS}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!withdrawAmountModal) return;
                    const raw = withdrawAmountInput.trim();
                    if (!raw) {
                      setWithdrawAmountError("Enter an amount to withdraw");
                      return;
                    }

                    let amountValue: bigint | undefined;
                    try {
                      amountValue = parseEther(raw);
                    } catch {
                      setWithdrawAmountError("Enter a valid amount");
                      return;
                    }

                    await handlePendingWithdraw(
                      withdrawAmountModal.poolAddress,
                      withdrawAmountModal.poolType,
                      withdrawAmountModal.useEarly,
                      amountValue
                    );

                    setWithdrawAmountModal(null);
                    setWithdrawAmountInput("");
                    setWithdrawAmountError(null);
                  }}
                  className={
                    withdrawAmountModal.useEarly
                      ? HARBOR_BTN_GLASS_PILL_CORAL_CLASS
                      : HARBOR_BTN_GLASS_PILL_NAVY_CLASS
                  }
                >
                  Confirm Withdraw
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Progress Modal */}
        {transactionProgress && (
          <TransactionProgressModal
            isOpen={transactionProgress.isOpen}
            onClose={() => {
              setTransactionProgress(null);
            }}
            title={transactionProgress.title}
            steps={transactionProgress.steps}
            currentStepIndex={transactionProgress.currentStepIndex}
            onRetry={transactionProgress.onRetry}
            onCancel={() => {
              if (cancelOperationRef.current) {
                // Call the cancel handler for claim all or compound
                cancelOperationRef.current();
                cancelOperationRef.current = null;
              } else {
                setTransactionProgress(null);
              }
            }}
            canCancel={isClaimingAll || isCompounding}
          />
        )}
    </>
  );
}
