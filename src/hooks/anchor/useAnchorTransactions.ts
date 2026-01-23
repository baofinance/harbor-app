import { useCallback, useRef } from "react";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { rewardsABI } from "@/abis/rewards";
import { STABILITY_POOL_ABI } from "@/abis/shared";
import { minterABI as fullMinterABI } from "@/abis/minter";
import { TransactionStep, FeeInfo } from "@/components/CompoundConfirmationModal";
import { PoolOption } from "@/components/CompoundPoolSelectionModal";

const wrappedPriceOracleABI = [
  {
    inputs: [],
    name: "latestAnswer",
    outputs: [
      { name: "minUnderlyingPrice", type: "uint256" },
      { name: "maxUnderlyingPrice", type: "uint256" },
      { name: "minWrappedRate", type: "uint256" },
      { name: "maxWrappedRate", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Helper function to check if error is due to user rejection
 */
function isUserRejection(error: any): boolean {
  if (!error) return false;
  const errorMessage = error.message?.toLowerCase() || "";
  const errorCode = error.code;

  // Check for common rejection messages
  if (
    errorMessage.includes("user rejected") ||
    errorMessage.includes("user denied") ||
    errorMessage.includes("rejected") ||
    errorMessage.includes("denied") ||
    errorMessage.includes("action rejected") ||
    errorMessage.includes("user cancelled") ||
    errorMessage.includes("user canceled")
  ) {
    return true;
  }

  // Check for common rejection error codes
  // 4001 = MetaMask user rejection, 4900 = Uniswap user rejection, etc.
  if (errorCode === 4001 || errorCode === 4900) {
    return true;
  }

  return false;
}

interface UseAnchorTransactionsOptions {
  anchorMarkets: Array<[string, any]>;
  reads: any;
  // USD price for each pegged token (18 decimals). Source of truth on Anchor page.
  // Using this avoids recomputing USD from peggedTokenPrice + pegTarget USD and keeps TVLs consistent across UIs.
  peggedPriceUSDMap?: Record<string, bigint | undefined>;
  allPoolRewards?: Array<{
    poolAddress: string;
    rewardTokens?: Array<{
      address: string;
      symbol: string;
      claimable: bigint;
    }>;
    totalAPR?: number;
    tvl?: bigint;
  }>;
  poolRewardsMap: Map<`0x${string}`, any>;
  transactionProgress: {
    isOpen: boolean;
    title: string;
    steps: TransactionStep[];
    currentStepIndex: number;
  } | null;
  setTransactionProgress: (progress: {
    isOpen: boolean;
    title: string;
    steps: TransactionStep[];
    currentStepIndex: number;
  } | null) => void;
  setCompoundConfirmation: (confirmation: {
    steps: TransactionStep[];
    fees: FeeInfo[];
    feeErrors?: string[];
    onConfirm: () => void;
  } | null) => void;
  setCompoundPoolSelection: (selection: {
    market: any;
    pools: PoolOption[];
  } | null) => void;
  setIsClaiming: (isClaiming: boolean) => void;
  setIsCompounding: (isCompounding: boolean) => void;
  setIsClaimingAll: (isClaimingAll: boolean) => void;
  setIsCompoundingAll: (isCompoundingAll: boolean) => void;
  setEarlyWithdrawModal: (modal: any) => void;
  refetchReads: () => Promise<any>;
  refetchUserDeposits: () => Promise<any>;
  cancelOperationRef: React.MutableRefObject<(() => void) | null>;
  isClaimingAll?: boolean;
  isCompoundingAll?: boolean;
}

/**
 * Hook to manage all anchor transaction handlers (claim, compound, withdraw)
 */
export function useAnchorTransactions({
  anchorMarkets,
  reads,
  peggedPriceUSDMap,
  allPoolRewards = [],
  poolRewardsMap,
  transactionProgress,
  setTransactionProgress,
  setCompoundConfirmation,
  setCompoundPoolSelection,
  setIsClaiming,
  setIsCompounding,
  setIsClaimingAll,
  setIsCompoundingAll,
  setEarlyWithdrawModal,
  refetchReads,
  refetchUserDeposits,
  cancelOperationRef,
  isClaimingAll = false,
  isCompoundingAll = false,
}: UseAnchorTransactionsOptions) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  // Helper to update progress step
  const updateProgressStep = useCallback(
    (stepId: string, updates: Partial<TransactionStep>) => {
      setTransactionProgress((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          steps: prev.steps.map((step) =>
            step.id === stepId ? { ...step, ...updates } : step
          ),
        };
      });
    },
    [setTransactionProgress]
  );

  // Helper to set current step
  const setCurrentStep = useCallback(
    (stepIndex: number) => {
      setTransactionProgress((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          currentStepIndex: stepIndex,
        };
      });
    },
    [setTransactionProgress]
  );

  // Handle pending withdrawal (fee-free when window is open, fee when not)
  const handlePendingWithdraw = useCallback(
    async (
      poolAddress: `0x${string}`,
      poolType: "collateral" | "sail",
      useEarly: boolean,
      amount?: bigint
    ) => {
      if (!address) return;
      const client = publicClient;
      if (!client) return;

      // For fee-free withdrawals, require an amount
      if (!useEarly && amount === undefined) return;

      setTransactionProgress({
        isOpen: true,
        title: useEarly ? "Early Withdraw" : "Withdraw",
        steps: [
          {
            id: "withdraw",
            label: useEarly ? "Withdraw (fee applies)" : "Withdraw",
            status: "in_progress",
          },
        ],
        currentStepIndex: 0,
      });

      try {
        const fn = useEarly ? "withdrawEarly" : "withdraw";
        const args = useEarly
          ? [address as `0x${string}`, 0n]
          : [amount as bigint, address as `0x${string}`, 0n];

        const tx = await writeContractAsync({
          address: poolAddress,
          abi: STABILITY_POOL_ABI,
          functionName: fn,
          args,
        });

        await client.waitForTransactionReceipt({ hash: tx });
        await Promise.allSettled([refetchReads(), refetchUserDeposits()]);
      } catch (err) {
        console.error("Pending withdraw error", err);
      } finally {
        setTransactionProgress(null);
        setEarlyWithdrawModal(null);
      }
    },
    [
      address,
      publicClient,
      writeContractAsync,
      setTransactionProgress,
      setEarlyWithdrawModal,
      refetchReads,
      refetchUserDeposits,
    ]
  );

  // Handle claiming rewards from a single pool
  const handleClaimRewards = useCallback(
    async (market: any, poolType: "collateral" | "sail") => {
      if (!address) return;
      const poolAddress =
        poolType === "collateral"
          ? (market.addresses?.stabilityPoolCollateral as
              | `0x${string}`
              | undefined)
          : (market.addresses?.stabilityPoolLeveraged as
              | `0x${string}`
              | undefined);

      if (!poolAddress) return;

      const marketSymbol = market.peggedToken?.symbol || market.id;
      const poolName = `${marketSymbol} ${poolType} pool`;

      // Initialize progress modal
      const steps: TransactionStep[] = [
        {
          id: "claim",
          label: `Claim rewards from ${poolName}`,
          status: "pending",
        },
      ];

      setTransactionProgress({
        isOpen: true,
        title: "Claiming Rewards",
        steps,
        currentStepIndex: 0,
      });

      try {
        setIsClaiming(true);
        setCurrentStep(0);
        updateProgressStep("claim", { status: "in_progress" });

        // Call claim() directly on the Stability Pool contract
        const hash = await writeContractAsync({
          address: poolAddress,
          abi: rewardsABI,
          functionName: "claim",
        });

        updateProgressStep("claim", {
          status: "in_progress",
          txHash: hash as string,
          details: "Waiting for transaction confirmation...",
        });

        const receipt = await publicClient?.waitForTransactionReceipt({
          hash: hash as `0x${string}`,
        });

        updateProgressStep("claim", {
          status: "completed",
          txHash: hash as string,
          details: "Transaction confirmed",
        });

        // Wait for blockchain state to update
        await new Promise((resolve) => setTimeout(resolve, 2000));
        // Refetch all contract data
        await Promise.all([refetchReads(), refetchUserDeposits()]);
      } catch (error: any) {
        const errorMessage = isUserRejection(error)
          ? "User declined the transaction"
          : error.message || "Transaction failed";
        updateProgressStep("claim", {
          status: "error",
          error: errorMessage,
        });
      } finally {
        setIsClaiming(false);
      }
    },
    [
      address,
      writeContractAsync,
      publicClient,
      setTransactionProgress,
      setIsClaiming,
      setCurrentStep,
      updateProgressStep,
      refetchReads,
      refetchUserDeposits,
    ]
  );

  // Handle compound rewards - shows pool selection modal
  const handleCompoundRewards = useCallback(
    (
      market: any,
      poolType: "collateral" | "sail",
      rewardAmount: bigint
    ) => {
      // Show pool selection modal instead of directly calling handleCompoundConfirm
      const collateralPoolAddress = market.addresses?.stabilityPoolCollateral as
        | `0x${string}`
        | undefined;
      const sailPoolAddress = market.addresses?.stabilityPoolLeveraged as
        | `0x${string}`
        | undefined;

      // Determine marketId so we can pull the correct USD price for TVL calculations
      const marketId =
        anchorMarkets.find(([_, m]) => m === market)?.[0] ??
        (market?.id as string | undefined);
      const peggedTokenUsdWei =
        marketId && peggedPriceUSDMap ? peggedPriceUSDMap[marketId] : undefined;

      const pools: PoolOption[] = [];

      if (collateralPoolAddress) {
        // Get APR and TVL for collateral pool if available
        const collateralPoolData = allPoolRewards?.find(
          (r) =>
            r.poolAddress.toLowerCase() === collateralPoolAddress.toLowerCase()
        );
        const collateralPoolAPR = collateralPoolData?.totalAPR;

        // Calculate TVL USD using the same pegged-token USD map used elsewhere on Anchor page
        let collateralTVLUSD: number | undefined;
        if (collateralPoolData?.tvl !== undefined && peggedTokenUsdWei) {
          const tvlTokens = Number(collateralPoolData.tvl) / 1e18;
          const peggedPriceUSD = Number(peggedTokenUsdWei) / 1e18;
          collateralTVLUSD = tvlTokens * peggedPriceUSD;
        }

        pools.push({
          id: `${marketId || market.id}-collateral`,
          name: `${market.peggedToken?.symbol || market.id} Collateral Pool`,
          address: collateralPoolAddress,
          apr: collateralPoolAPR,
          tvl: collateralPoolData?.tvl,
          tvlUSD: collateralTVLUSD,
          enabled: true,
        });
      }

      if (sailPoolAddress) {
        // Get APR and TVL for sail pool if available
        const sailPoolData = allPoolRewards?.find(
          (r) => r.poolAddress.toLowerCase() === sailPoolAddress.toLowerCase()
        );
        const sailPoolAPR = sailPoolData?.totalAPR;

        // Calculate TVL USD using the same pegged-token USD map used elsewhere on Anchor page
        let sailTVLUSD: number | undefined;
        if (sailPoolData?.tvl !== undefined && peggedTokenUsdWei) {
          const tvlTokens = Number(sailPoolData.tvl) / 1e18;
          const peggedPriceUSD = Number(peggedTokenUsdWei) / 1e18;
          sailTVLUSD = tvlTokens * peggedPriceUSD;
        }

        pools.push({
          id: `${marketId || market.id}-sail`,
          name: `${market.peggedToken?.symbol || market.id} Sail Pool`,
          address: sailPoolAddress,
          apr: sailPoolAPR,
          tvl: sailPoolData?.tvl,
          tvlUSD: sailTVLUSD,
          enabled: true,
        });
      }

      if (pools.length === 0) {
        // No pools available, show error or fallback
        return;
      }

      setCompoundPoolSelection({
        market,
        pools,
      });
    },
    [
      anchorMarkets,
      allPoolRewards,
      peggedPriceUSDMap,
      setCompoundPoolSelection,
    ]
  );

  // Create handlers for AnchorMarketExpandedView compound buttons
  const createCompoundHandlers = useCallback(
    (market: any) => {
      const collateralPoolAddress = market?.addresses?.stabilityPoolCollateral as
        | `0x${string}`
        | undefined;
      const sailPoolAddress = market?.addresses?.stabilityPoolLeveraged as
        | `0x${string}`
        | undefined;

      const collateralPoolReward = collateralPoolAddress
        ? poolRewardsMap.get(collateralPoolAddress)
        : undefined;
      const sailPoolReward = sailPoolAddress
        ? poolRewardsMap.get(sailPoolAddress)
        : undefined;

      return {
        onCompoundCollateralRewards: () => {
          const rewardAmount =
            collateralPoolReward && collateralPoolReward.claimableValue > 0
              ? BigInt(
                  Math.floor(collateralPoolReward.claimableValue * 1e18)
                )
              : 0n;
          handleCompoundRewards(market, "collateral", rewardAmount);
        },
        onCompoundSailRewards: () => {
          const rewardAmount =
            sailPoolReward && sailPoolReward.claimableValue > 0
              ? BigInt(Math.floor(sailPoolReward.claimableValue * 1e18))
              : 0n;
          handleCompoundRewards(market, "sail", rewardAmount);
        },
      };
    },
    [poolRewardsMap, handleCompoundRewards]
  );

  // Handle claim all rewards
  const handleClaimAll = useCallback(
    async (
      selectedPools: Array<{
        marketId: string;
        poolType: "collateral" | "sail";
      }> = []
    ) => {
      if (!address || isClaimingAll) return;
      try {
        setIsClaimingAll(true);

        // If no pools selected, claim from all pools (backward compatibility)
        const poolsToClaim =
          selectedPools.length > 0
            ? selectedPools
            : anchorMarkets.flatMap(([id, m]) => {
                const pools: Array<{
                  marketId: string;
                  poolType: "collateral" | "sail";
                }> = [];
                if ((m as any).addresses?.stabilityPoolCollateral) {
                  pools.push({ marketId: id, poolType: "collateral" });
                }
                if ((m as any).addresses?.stabilityPoolLeveraged) {
                  pools.push({ marketId: id, poolType: "sail" });
                }
                return pools;
              });

        // Check if there are pools to claim
        if (poolsToClaim.length === 0) {
          setIsClaimingAll(false);
          return;
        }

        // Initialize progress modal with steps for each pool
        const steps: TransactionStep[] = poolsToClaim.map(
          ({ marketId, poolType }) => {
            const market = anchorMarkets.find(([id]) => id === marketId)?.[1];
            const marketSymbol = market?.peggedToken?.symbol || marketId;
            return {
              id: `${marketId}-${poolType}`,
              label: `Claim rewards from ${marketSymbol} ${poolType} pool`,
              status: "pending",
            };
          }
        );

        // Track if the process has been cancelled
        const cancelRef = { current: false };

        const handleCancel = () => {
          cancelRef.current = true;
          setIsClaimingAll(false);
          // Mark all pending steps as cancelled
          steps.forEach((step) => {
            if (step.status === "pending") {
              updateProgressStep(step.id, {
                status: "error",
                error: "Cancelled by user",
              });
            }
          });
        };

        setTransactionProgress({
          isOpen: true,
          title: "Claiming All Rewards",
          steps,
          currentStepIndex: 0,
        });

        let completedCount = 0;
        let errorCount = 0;

        for (let i = 0; i < poolsToClaim.length; i++) {
          // Check if cancelled before processing each transaction
          if (cancelRef.current) {
            break;
          }
          const { marketId, poolType } = poolsToClaim[i];

          const market = anchorMarkets.find(([id]) => id === marketId)?.[1];
          if (!market) {
            const stepId = `${marketId}-${poolType}`;
            setCurrentStep(i);
            updateProgressStep(stepId, {
              status: "error",
              error: `Market ${marketId} not found`,
            });
            errorCount++;
            continue;
          }

          const stepId = `${marketId}-${poolType}`;
          setCurrentStep(i);
          updateProgressStep(stepId, { status: "in_progress" });

          try {
            const poolAddress =
              poolType === "collateral"
                ? ((market as any).addresses?.stabilityPoolCollateral as
                    | `0x${string}`
                    | undefined)
                : ((market as any).addresses?.stabilityPoolLeveraged as
                    | `0x${string}`
                    | undefined);

            if (!poolAddress) {
              updateProgressStep(stepId, {
                status: "error",
                error: "Pool address not found",
              });
              errorCount++;
              continue;
            }

            // Call claim() directly on the Stability Pool contract
            const hash = await writeContractAsync({
              address: poolAddress,
              abi: rewardsABI,
              functionName: "claim",
            });

            updateProgressStep(stepId, {
              status: "in_progress",
              txHash: hash as string,
              details: "Waiting for transaction confirmation...",
            });

            await publicClient?.waitForTransactionReceipt({
              hash: hash as `0x${string}`,
            });

            updateProgressStep(stepId, {
              status: "completed",
              txHash: hash as string,
              details: "Transaction confirmed",
            });
            completedCount++;
          } catch (e: any) {
            const errorMessage = isUserRejection(e)
              ? "User declined the transaction"
              : e.message || "Transaction failed";
            updateProgressStep(stepId, {
              status: "error",
              error: errorMessage,
            });
            errorCount++;

            // If user rejected, stop processing remaining transactions
            if (isUserRejection(e)) {
              cancelRef.current = true;
              // Mark remaining pending steps as cancelled
              for (let j = i + 1; j < poolsToClaim.length; j++) {
                const remainingStepId = `${poolsToClaim[j].marketId}-${poolsToClaim[j].poolType}`;
                updateProgressStep(remainingStepId, {
                  status: "error",
                  error: "Cancelled - previous transaction declined",
                });
              }
              break;
            }
          }
        }

        // Clear cancel handler ref
        cancelOperationRef.current = null;

        // Only refetch and close if at least one transaction completed
        if (completedCount > 0) {
          // Wait for blockchain state to update
          await new Promise((resolve) => setTimeout(resolve, 2000));
          // Refetch all contract data
          await Promise.all([refetchReads(), refetchUserDeposits()]);
        }
      } catch (error: any) {
        const errorMessage = isUserRejection(error)
          ? "User declined the transaction"
          : error.message || "Fatal error occurred";
        // Mark all pending steps as error if there's a fatal error
        if (transactionProgress) {
          transactionProgress.steps.forEach((step) => {
            if (step.status === "pending" || step.status === "in_progress") {
              updateProgressStep(step.id, {
                status: "error",
                error: errorMessage,
              });
            }
          });
        }
      } finally {
        setIsClaimingAll(false);
      }
    },
    [
      address,
      anchorMarkets,
      writeContractAsync,
      publicClient,
      setTransactionProgress,
      setIsClaimingAll,
      setCurrentStep,
      updateProgressStep,
      cancelOperationRef,
      refetchReads,
      refetchUserDeposits,
      transactionProgress,
      isClaimingAll,
    ]
  );

  // Handle compound all - finds first market with rewards and shows pool selection
  const handleCompoundAll = useCallback(
    async (
      selectedPools: Array<{
        marketId: string;
        poolType: "collateral" | "sail";
      }> = []
    ) => {
      if (!address || isCompoundingAll) return;

      // First, find the first *selected pool* with rewards to compound
      let marketWithRewards: any = null;
      let poolTypeWithRewards: "collateral" | "sail" = "collateral";
      let totalRewardAmount = 0n;

      // If no pools selected, use all pools with rewards
      const poolsToCompound =
        selectedPools.length > 0
          ? selectedPools
          : anchorMarkets.flatMap(([id, m]) => {
              const pools: Array<{
                marketId: string;
                poolType: "collateral" | "sail";
              }> = [];
              if ((m as any).addresses?.stabilityPoolCollateral) {
                pools.push({ marketId: id, poolType: "collateral" });
              }
              if ((m as any).addresses?.stabilityPoolLeveraged) {
                pools.push({ marketId: id, poolType: "sail" });
              }
              return pools;
            });

      // Find the first selected pool (marketId + poolType) that actually has rewards.
      for (const { marketId, poolType } of poolsToCompound) {
        const market = anchorMarkets.find(([id]) => id === marketId)?.[1];
        if (!market) continue;

        const poolAddress =
          poolType === "collateral"
            ? ((market as any).addresses?.stabilityPoolCollateral as
                | `0x${string}`
                | undefined)
            : ((market as any).addresses?.stabilityPoolLeveraged as
                | `0x${string}`
                | undefined);

        if (!poolAddress) continue;

        const poolReward = allPoolRewards?.find(
          (r) => r.poolAddress.toLowerCase() === poolAddress.toLowerCase()
        );

        if (!poolReward?.rewardTokens?.some((rt) => rt.claimable > 0n)) {
          continue;
        }

        marketWithRewards = market;
        poolTypeWithRewards = poolType;
          totalRewardAmount = poolReward.rewardTokens.reduce(
            (sum, rt) => sum + rt.claimable,
            0n
          );
          break;
      }

      if (!marketWithRewards) {
        // No rewards to compound
        return;
      }

      // Show pool selection modal for this market
      handleCompoundRewards(
        marketWithRewards,
        poolTypeWithRewards,
        totalRewardAmount
      );
    },
    [address, anchorMarkets, allPoolRewards, handleCompoundRewards, isCompoundingAll]
  );

  // Note: handleCompoundConfirm is extremely large (1000+ lines) and complex
  // It should be extracted separately or kept in the page component for now
  // This hook provides the foundation handlers

  return {
    handlePendingWithdraw,
    handleClaimRewards,
    handleCompoundRewards,
    createCompoundHandlers,
    handleClaimAll,
    handleCompoundAll,
    updateProgressStep,
    setCurrentStep,
    isUserRejection,
  };
}

