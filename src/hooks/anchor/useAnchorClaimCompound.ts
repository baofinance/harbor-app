"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, usePublicClient, useSendTransaction, useWriteContract } from "wagmi";
import { rewardsABI } from "@/abis/rewards";
import {
  ERC20_ABI,
  MINTER_ABI_EXTENDED,
  STABILITY_POOL_ABI,
  WRAPPED_PRICE_ORACLE_ABI,
} from "@/abis/shared";

const wrappedPriceOracleABI = WRAPPED_PRICE_ORACLE_ABI;
import {
  CompoundTargetMode,
  CompoundSelectedPosition,
  CompoundTargetOption,
} from "@/components/CompoundTargetTokenModal";
import { TransactionStep } from "@/components/TransactionProgressModal";
import { FeeInfo } from "@/components/CompoundConfirmationModal";
import { PoolOption } from "@/components/CompoundPoolSelectionModal";
import { useAnchorTransactions } from "@/hooks/anchor/useAnchorTransactions";
import type { AnchorContractReads, AnchorMarketTuple } from "@/types/anchor";
import { runAnchorBuyTideFlow } from "@/utils/anchorBuyTideFlow";

const minterABI = MINTER_ABI_EXTENDED;

export type UseAnchorClaimCompoundParams = {
  anchorMarkets: AnchorMarketTuple[];
  reads: AnchorContractReads;
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
  refetchReads: () => Promise<unknown>;
  refetchUserDeposits: () => Promise<unknown>;
};

export function useAnchorClaimCompound({
  anchorMarkets,
  reads,
  peggedPriceUSDMap,
  allPoolRewards,
  poolRewardsMap,
  refetchReads,
  refetchUserDeposits,
}: UseAnchorClaimCompoundParams) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();
  const publicClient = usePublicClient();

  const [compoundModal, setCompoundModal] = useState<{
    marketId: string;
    market: any;
    poolType: "collateral" | "sail";
    rewardAmount: bigint;
  } | null>(null);
  const [compoundPoolSelection, setCompoundPoolSelection] = useState<{
    market: any;
    pools: PoolOption[];
  } | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isCompounding, setIsCompounding] = useState(false);
  const [isClaimingAll, setIsClaimingAll] = useState(false);
  const [isCompoundingAll, setIsCompoundingAll] = useState(false);
  const [earlyWithdrawModal, setEarlyWithdrawModal] = useState<{
    poolAddress: `0x${string}`;
    poolType: "collateral" | "sail";
    start: bigint;
    end: bigint;
    earlyWithdrawFee: bigint;
    symbol?: string;
    poolBalance?: bigint;
  } | null>(null);
  const [withdrawAmountModal, setWithdrawAmountModal] = useState<{
    poolAddress: `0x${string}`;
    poolType: "collateral" | "sail";
    useEarly: boolean;
    symbol?: string;
    maxAmount?: bigint;
  } | null>(null);
  const [withdrawAmountInput, setWithdrawAmountInput] = useState("");
  const [withdrawAmountError, setWithdrawAmountError] = useState<string | null>(
    null
  );
  const [transactionProgress, setTransactionProgress] = useState<{
    isOpen: boolean;
    title: string;
    steps: TransactionStep[];
    currentStepIndex: number;
  } | null>(null);
  const [compoundConfirmation, setCompoundConfirmation] = useState<{
    steps: TransactionStep[];
    fees: FeeInfo[];
    feeErrors?: string[];
    onConfirm: () => void;
  } | null>(null);
  const [compoundTargetModal, setCompoundTargetModal] = useState<{
    selectedPools: Array<{ marketId: string; poolType: "collateral" | "sail" }>;
    positions: CompoundSelectedPosition[];
    options: CompoundTargetOption[];
  } | null>(null);
  const [compoundIntent, setCompoundIntent] = useState<{
    mode: CompoundTargetMode;
    selectedPools: Array<{ marketId: string; poolType: "collateral" | "sail" }>;
    targetMarketId?: string;
  } | null>(null);
  const [advancedPreflight, setAdvancedPreflight] = useState<{
    key: string;
    isLoading: boolean;
    error?: string;
    fees: Array<{
      id: string;
      label: string;
      tokenSymbol: string;
      feeFormatted: string;
      feePercentage?: number;
      details?: string;
    }>;
    plan?: {
      targetMarketId: string;
      allocations: Array<{ poolAddress: `0x${string}`; percentage: number }>;
      selectedClaimPools: Array<{
        marketId: string;
        poolType: "collateral" | "sail";
      }>;
      redeemPegged: Array<{
        peggedToken: `0x${string}`;
        amount: bigint;
        minter: `0x${string}`;
        wrappedCollateralToken: `0x${string}`;
        expectedOut: bigint;
      }>;
      redeemLeveraged: Array<{
        marketId: string;
        leveragedToken: `0x${string}`;
        amount: bigint;
        minter: `0x${string}`;
        expectedOut: bigint;
      }>;
      mint: Array<{
        wrappedToken: `0x${string}`;
        amount: bigint;
        minter: `0x${string}`;
        expectedMint: bigint;
      }>;
    };
  } | null>(null);
  const [simplePreflight, setSimplePreflight] = useState<{
    key: string;
    isLoading: boolean;
    error?: string;
    fees: Array<{
      id: string;
      label: string;
      tokenSymbol: string;
      feeFormatted: string;
      feePercentage?: number;
      details?: string;
    }>;
  } | null>(null);
  const cancelOperationRef = useRef<(() => void) | null>(null);
  const [isClaimAllModalOpen, setIsClaimAllModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedMarketForClaim, setSelectedMarketForClaim] = useState<
    string | null
  >("all");
  const [isClaimMarketModalOpen, setIsClaimMarketModalOpen] = useState(false);

  const {
    handlePendingWithdraw,
    handleClaimRewards,
    handleCompoundRewards,
    createCompoundHandlers,
    handleClaimAll,
    handleCompoundAll,
    updateProgressStep,
    setCurrentStep,
    isUserRejection,
  } = useAnchorTransactions({
    anchorMarkets,
    reads,
    peggedPriceUSDMap,
    allPoolRewards,
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
    isClaimingAll,
    isCompoundingAll,
  });

  const handleCompoundConfirm = async (
    market: any,
    allocations: Array<{ poolId: "collateral" | "sail"; percentage: number }>,
    rewardAmount: bigint
  ) => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

    const minterAddress = market.addresses?.minter as `0x${string}` | undefined;
    const collateralPoolAddress = market.addresses?.stabilityPoolCollateral as
      | `0x${string}`
      | undefined;
    const sailPoolAddress = market.addresses?.stabilityPoolLeveraged as
      | `0x${string}`
      | undefined;
    const collateralAddress = market.addresses?.collateralToken as
      | `0x${string}`
      | undefined;
    const peggedTokenAddress = market.addresses?.peggedToken as
      | `0x${string}`
      | undefined;
    const leveragedTokenAddress = market.addresses?.leveragedToken as
      | `0x${string}`
      | undefined;

    if (!minterAddress || !address) {
      throw new Error("Missing required addresses");
    }

    const marketSymbol = market.peggedToken?.symbol || market.id;
    const collateralSymbol =
      market.collateralToken?.symbol ||
      market.collateral?.symbol ||
      "collateral";
    const leveragedSymbol =
      market.leveragedToken?.symbol || market.sail?.symbol || "sail";

    // Validate allocations
    if (allocations.length === 0) {
      throw new Error("No pools selected for compounding");
    }

    // Filter allocations to only include pools with percentage > 0
    const activeAllocations = allocations.filter((a) => a.percentage > 0);
    if (activeAllocations.length === 0) {
      throw new Error("No pools selected for compounding");
    }

    // Get pool addresses for ALL pools that have rewards - we'll claim from each one
    interface PoolWithRewards {
      poolType: "collateral" | "sail";
      poolAddress: `0x${string}`;
      rewards: {
        poolAddress: string;
        rewardTokens?: Array<{
          address: string;
          symbol: string;
          claimable: bigint;
        }>;
      };
    }
    const poolsWithRewards: PoolWithRewards[] = [];

    if (collateralPoolAddress) {
      const collateralRewards = allPoolRewards?.find(
        (r) =>
          r.poolAddress.toLowerCase() === collateralPoolAddress.toLowerCase() &&
          r.rewardTokens?.some((rt) => rt.claimable > 0n)
      );
      if (collateralRewards) {
        poolsWithRewards.push({
          poolType: "collateral",
          poolAddress: collateralPoolAddress,
          rewards: collateralRewards,
        });
      }
    }
    if (sailPoolAddress) {
      const sailRewards = allPoolRewards?.find(
        (r) =>
          r.poolAddress.toLowerCase() === sailPoolAddress.toLowerCase() &&
          r.rewardTokens?.some((rt) => rt.claimable > 0n)
      );
      if (sailRewards) {
        poolsWithRewards.push({
          poolType: "sail",
          poolAddress: sailPoolAddress,
          rewards: sailRewards,
        });
      }
    }

    if (poolsWithRewards.length === 0) {
      throw new Error("No pools with claimable rewards found");
    }

    if (!collateralAddress || !peggedTokenAddress) {
      throw new Error("Missing required token addresses");
    }

    // Initialize progress modal early to show errors if they occur
    const initialSteps: TransactionStep[] = [
      {
        id: "setup",
        label: "Setting up compound process...",
        status: "in_progress",
      },
    ];

    setTransactionProgress({
      isOpen: true,
      title: "Compounding Rewards",
      steps: initialSteps,
      currentStepIndex: 0,
    });

    // Track if the process has been cancelled (defined outside try block so it's accessible everywhere)
    const cancelRef = { current: false };

    // Declare variables outside try blocks so they're accessible in both setup and execution phases
    let steps: TransactionStep[] = [];
    let leveragedReceived = 0n;
    let totalCollateralForMinting = 0n;
    let collateralReceived = 0n;
    let haReceived = 0n;
    let expectedOutput: bigint | undefined;

    // Interface for categorized rewards (declared here for type access in both blocks)
    interface CategorizedReward {
      address: `0x${string}`;
      symbol: string;
      amount: bigint;
      type: "collateral" | "ha" | "hs";
    }
    let categorizedRewards: CategorizedReward[] = [];

    try {
      // Step 1: Get claimable rewards from ALL pools that have rewards
      if (!allPoolRewards || allPoolRewards.length === 0) {
        throw new Error(
          "Rewards data not loaded yet. Please wait and try again."
        );
      }

      // Aggregate rewards from ALL pools
      const allClaimableRewards: Array<{
        address: `0x${string}`;
        symbol: string;
        claimable: bigint;
      }> = [];

      poolsWithRewards.forEach((pool) => {
        if (pool.rewards?.rewardTokens) {
          pool.rewards.rewardTokens.forEach((rt) => {
            if (rt.claimable > 0n) {
              // Check if we already have this token, if so add to it
              const existing = allClaimableRewards.find(
                (r) => r.address.toLowerCase() === rt.address.toLowerCase()
              );
              if (existing) {
                existing.claimable += rt.claimable;
              } else {
                allClaimableRewards.push({
                  address: rt.address as `0x${string}`,
                  symbol: rt.symbol,
                  claimable: rt.claimable,
                });
              }
            }
          });
        }
      });

      if (allClaimableRewards.length === 0) {
        updateProgressStep("setup", {
          status: "error",
          error: "No rewards available to compound",
        });
        throw new Error("No rewards available to compound");
      }

      // Categorize reward tokens by type (collateral, ha, hs)
      categorizedRewards = allClaimableRewards.map((r) => {
        const tokenLower = r.address.toLowerCase();
        let tokenType: "collateral" | "ha" | "hs" = "collateral";

        // Check if it's the collateral token
        if (
          collateralAddress &&
          tokenLower === collateralAddress.toLowerCase()
        ) {
          tokenType = "collateral";
        }
        // Check if it's the pegged token (ha)
        else if (
          peggedTokenAddress &&
          tokenLower === peggedTokenAddress.toLowerCase()
        ) {
          tokenType = "ha";
        }
        // Check if it's the leveraged token (hs)
        else if (
          leveragedTokenAddress &&
          tokenLower === leveragedTokenAddress.toLowerCase()
        ) {
          tokenType = "hs";
        }
        // Default to collateral if we can't identify
        else {
          tokenType = "collateral";
        }

        return {
          address: r.address,
          symbol: r.symbol,
          amount: r.claimable,
          type: tokenType,
        };
      });

      // Extract amounts by type
      collateralReceived = categorizedRewards
        .filter((r) => r.type === "collateral")
        .reduce((sum, r) => sum + r.amount, 0n);

      haReceived = categorizedRewards
        .filter((r) => r.type === "ha")
        .reduce((sum, r) => sum + r.amount, 0n);

      leveragedReceived = categorizedRewards
        .filter((r) => r.type === "hs")
        .reduce((sum, r) => sum + r.amount, 0n);

      // Build all steps upfront based on reward types
      // Create claim steps for EACH pool that has rewards
      steps = [];

      poolsWithRewards.forEach((pool) => {
        const poolName = pool.poolType === "collateral" ? "Collateral" : "Sail";
        const fullPoolName = `${marketSymbol} ${poolName} Pool`;

        // Get rewards specific to this pool for the details
        const poolRewardDetails = pool.rewards?.rewardTokens
          ?.filter((rt) => rt.claimable > 0n)
          .map((rt) => {
            const amount = Number(rt.claimable) / 1e18;
            let formatted: string;
            if (amount >= 1) {
              formatted = amount.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 6,
              });
            } else if (amount >= 0.01) {
              formatted = amount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 6,
              });
            } else {
              formatted = amount
                .toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 18,
                  useGrouping: false,
                })
                .replace(/\.?0+$/, "");
            }
            return `${formatted} ${rt.symbol}`;
          })
          .join(",");

        steps.push({
          id: `claim-${pool.poolType}`,
          label: `Claim rewards from ${fullPoolName}`,
          status: "pending" as const,
          details: poolRewardDetails
            ? `Claiming ${poolRewardDetails}`
            : undefined,
        });
      });

      // Add redeem steps if we'll receive hs (leveraged) tokens
      // We'll attach fee info to the redeem step after calculating fees
      let redeemStepIndex: number | null = null;
      if (leveragedReceived > 0n && leveragedTokenAddress) {
        steps.push(
          {
            id: "approve-leveraged",
            label: "Approve leveraged tokens for redemption",
            status: "pending",
            details: (() => {
              const amount = Number(leveragedReceived) / 1e18;
              const formatted =
                amount >= 1
                  ? amount.toLocaleString(undefined, {
                      maximumFractionDigits: 6,
                    })
                  : amount
                      .toLocaleString(undefined, {
                        maximumFractionDigits: 18,
                        useGrouping: false,
                      })
                      .replace(/\.?0+$/, "");
              return `Approve ${formatted} ${
                categorizedRewards.find((r) => r.type === "hs")?.symbol || "hs"
              }`;
            })(),
          },
          {
            id: "redeem",
            label: "Redeem leveraged tokens for collateral",
            status: "pending",
            details: (() => {
              const amount = Number(leveragedReceived) / 1e18;
              const formatted =
                amount >= 1
                  ? amount.toLocaleString(undefined, {
                      maximumFractionDigits: 6,
                    })
                  : amount
                      .toLocaleString(undefined, {
                        maximumFractionDigits: 18,
                        useGrouping: false,
                      })
                      .replace(/\.?0+$/, "");
              return `Redeem ${formatted} ${
                categorizedRewards.find((r) => r.type === "hs")?.symbol || "hs"
              } → ${collateralSymbol}`;
            })(),
          }
        );
        redeemStepIndex = steps.length - 1; // The redeem step is the last one we just added
      }

      // Add mint steps only if we have collateral to mint (from direct collateral rewards or from redeemed hs tokens)
      // Note: ha tokens don't need minting, they can be deposited directly
      const needsMinting = collateralReceived > 0n || leveragedReceived > 0n;

      // We'll attach fee info to the mint step after calculating fees
      let mintStepIndex: number | null = null;
      if (needsMinting) {
        steps.push(
          {
            id: "approve-collateral",
            label: `Approve ${collateralSymbol} for minting`,
            status: "pending",
            details:
              collateralReceived > 0n
                ? (() => {
                    const amount = Number(collateralReceived) / 1e18;
                    let formatted: string;
                    if (amount >= 1) {
                      formatted = amount.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 6,
                      });
                    } else if (amount >= 0.01) {
                      formatted = amount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6,
                      });
                    } else {
                      formatted = amount
                        .toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 18,
                          useGrouping: false,
                        })
                        .replace(/\.?0+$/, "");
                    }
                    return `Approve ${formatted} ${collateralSymbol}`;
                  })()
                : `Approve ${collateralSymbol} from redemption`,
          },
          {
            id: "mint",
            label: "Mint anchor tokens",
            status: "pending",
            details: "Mint anchor tokens from collateral",
          }
        );
        mintStepIndex = steps.length - 1; // The mint step is the last one we just added
      }

      // Add deposit steps for each selected pool
      // If we have ha tokens directly, we can deposit them without minting
      const hasHaTokens = haReceived > 0n;
      const willHaveHaTokens = needsMinting || hasHaTokens;

      if (willHaveHaTokens) {
        // Add approve and deposit steps for each selected pool
        activeAllocations.forEach((allocation) => {
          const poolName =
            allocation.poolId === "collateral" ? "Collateral" : "Sail";

          steps.push({
            id: `approve-pegged-${allocation.poolId}`,
            label: `Approve pegged tokens for ${poolName} Pool`,
            status: "pending",
            details: `Approve anchor tokens for ${poolName.toLowerCase()} pool deposit`,
          });

          steps.push({
            id: `deposit-${allocation.poolId}`,
            label: `Deposit to ${poolName} Pool`,
            status: "pending",
            details: `Deposit ${
              allocation.percentage
            }% to ${poolName.toLowerCase()} pool`,
          });
        });
      }

      // Fetch collateral price from price oracle for accurate USD calculations
      let collateralPriceUSD = 0;
      const priceOracleAddress = market.addresses?.collateralPrice as
        | `0x${string}`
        | undefined;
      if (priceOracleAddress && publicClient) {
        try {
          const client = false ? publicClient : publicClient;
          const priceResult = await client?.readContract({
            address: priceOracleAddress,
            abi: wrappedPriceOracleABI,
            functionName: "latestAnswer",
          });

          if (
            priceResult &&
            Array.isArray(priceResult) &&
            priceResult.length >= 2
          ) {
            // Use maxUnderlyingPrice (index 1), prices are in 18 decimals
            const maxPrice = priceResult[1] as bigint;
            collateralPriceUSD = Number(maxPrice) / 1e18;
          }
        } catch (priceError) {}
      }

      // Calculate all fees upfront
      const fees: FeeInfo[] = [];
      const feeErrors: string[] = [];

      totalCollateralForMinting = collateralReceived;

      // Calculate redeem fee if we'll receive leveraged tokens
      if (leveragedReceived > 0n && leveragedTokenAddress) {
        if (!publicClient) {
          throw new Error("Public client not available");
        }

        // Use the appropriate client based on environment (same as deposit modal)
        const client = false ? publicClient : publicClient;
        if (!client) {
          throw new Error("Public client not available");
        }

        let redeemDryRunResult:
          | [bigint, bigint, bigint, bigint, bigint, bigint]
          | undefined;
        // Retry logic similar to deposit modal (retry: 1)
        let lastError: any = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            redeemDryRunResult = (await client.readContract({
              address: minterAddress,
              abi: minterABI,
              functionName: "redeemLeveragedTokenDryRun",
              args: [leveragedReceived],
            })) as [bigint, bigint, bigint, bigint, bigint, bigint] | undefined;
            // If successful, break out of retry loop
            if (redeemDryRunResult) break;
          } catch (error: any) {
            lastError = error;
            // Wait a bit before retrying (only on first attempt)
            if (attempt === 0) {
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          }
        }

        // If still failed after retries, log but don't throw
        if (!redeemDryRunResult && lastError) {
          // Contract call failed - fees won't be shown upfront
          // User will see fees during actual transaction
        }

        if (
          redeemDryRunResult &&
          Array.isArray(redeemDryRunResult) &&
          redeemDryRunResult.length >= 4
        ) {
          const wrappedFee = redeemDryRunResult[1] as bigint;
          const wrappedCollateralReturned = redeemDryRunResult[3] as bigint;

          // Validate that wrappedFee is a valid bigint
          if (
            wrappedFee !== undefined &&
            typeof wrappedFee === "bigint" &&
            wrappedFee >= 0n
          ) {
            // Format fee amount nicely
            const feeAmountNum = Number(wrappedFee) / 1e18;
            let feeFormatted: string;
            if (feeAmountNum >= 1) {
              feeFormatted = feeAmountNum.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 6,
              });
            } else if (feeAmountNum >= 0.01) {
              feeFormatted = feeAmountNum.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 6,
              });
            } else if (feeAmountNum >= 0.0001) {
              // For amounts between 0.0001 and 0.01, show up to 6 decimals
              feeFormatted = feeAmountNum
                .toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 6,
                  useGrouping: false,
                })
                .replace(/\.?0+$/, "");
            } else {
              // For very small amounts (< 0.0001), show up to 8 significant digits
              const significantDigits = 8;
              const magnitude = Math.floor(Math.log10(Math.abs(feeAmountNum)));
              const decimals = Math.max(0, significantDigits - magnitude - 1);
              feeFormatted = feeAmountNum
                .toFixed(decimals)
                .replace(/\.?0+$/, "");
            }
            const feePercentage =
              leveragedReceived > 0n
                ? (Number(wrappedFee) / Number(leveragedReceived)) * 100
                : 0;

            // Calculate USD value using the fetched collateral price
            let feeUSD: number | undefined;
            if (collateralPriceUSD > 0) {
              feeUSD = parseFloat(feeFormatted) * collateralPriceUSD;
            }

            const redeemFee = {
              feeAmount: wrappedFee,
              feeFormatted,
              feeUSD,
              feePercentage,
              tokenSymbol: collateralSymbol, // Fee is in wrapped collateral, not leveraged token
              label: "Redeem Leveraged Tokens",
            };
            fees.push(redeemFee);

            // Attach fee to the redeem step
            if (redeemStepIndex !== null && steps[redeemStepIndex]) {
              steps[redeemStepIndex].fee = {
                amount: wrappedFee,
                formatted: feeFormatted,
                usd: feeUSD,
                percentage: feePercentage,
                tokenSymbol: collateralSymbol, // Fee is in wrapped collateral, not leveraged token
              };
            }

            // Update total collateral for minting
            if (
              wrappedCollateralReturned !== undefined &&
              typeof wrappedCollateralReturned === "bigint"
            ) {
              totalCollateralForMinting =
                collateralReceived + wrappedCollateralReturned;
            }
          }
        }
      }

      // Calculate mint fee
      if (totalCollateralForMinting > 0n) {
        if (!publicClient) {
          throw new Error("Public client not available");
        }

        // Use the appropriate client based on environment (same as deposit modal)
        const client = false ? publicClient : publicClient;
        if (!client) {
          throw new Error("Public client not available");
        }

        let mintDryRunResult:
          | [bigint, bigint, bigint, bigint, bigint, bigint]
          | undefined;
        // Retry logic similar to deposit modal (retry: 1)
        let lastError: any = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            mintDryRunResult = (await client.readContract({
              address: minterAddress,
              abi: minterABI,
              functionName: "mintPeggedTokenDryRun",
              args: [totalCollateralForMinting],
            })) as [bigint, bigint, bigint, bigint, bigint, bigint] | undefined;
            // If successful, break out of retry loop
            if (
              mintDryRunResult &&
              Array.isArray(mintDryRunResult) &&
              mintDryRunResult.length >= 2
            ) {
              break;
            }
          } catch (error: any) {
            lastError = error;
            // Wait a bit before retrying (only on first attempt)
            if (attempt === 0) {
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          }
        }

        if (
          mintDryRunResult &&
          Array.isArray(mintDryRunResult) &&
          mintDryRunResult.length >= 2
        ) {
          const wrappedFee = mintDryRunResult[1] as bigint;

          // Validate that wrappedFee is a valid bigint
          if (
            wrappedFee !== undefined &&
            typeof wrappedFee === "bigint" &&
            wrappedFee >= 0n
          ) {
            // Format fee amount nicely
            const feeAmountNum = Number(wrappedFee) / 1e18;
            let feeFormatted: string;
            if (feeAmountNum >= 1) {
              feeFormatted = feeAmountNum.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 6,
              });
            } else if (feeAmountNum >= 0.01) {
              feeFormatted = feeAmountNum.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 6,
              });
            } else if (feeAmountNum >= 0.0001) {
              // For amounts between 0.0001 and 0.01, show up to 6 decimals
              feeFormatted = feeAmountNum
                .toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 6,
                  useGrouping: false,
                })
                .replace(/\.?0+$/, "");
            } else {
              // For very small amounts (< 0.0001), show up to 8 significant digits
              const significantDigits = 8;
              const magnitude = Math.floor(Math.log10(Math.abs(feeAmountNum)));
              const decimals = Math.max(0, significantDigits - magnitude - 1);
              feeFormatted = feeAmountNum
                .toFixed(decimals)
                .replace(/\.?0+$/, "");
            }
            const feePercentage =
              totalCollateralForMinting > 0n
                ? (Number(wrappedFee) / Number(totalCollateralForMinting)) * 100
                : 0;

            // Calculate USD value using the fetched collateral price
            let feeUSD: number | undefined;
            if (collateralPriceUSD > 0) {
              feeUSD = parseFloat(feeFormatted) * collateralPriceUSD;
            }

            const mintFee = {
              feeAmount: wrappedFee,
              feeFormatted,
              feeUSD,
              feePercentage,
              tokenSymbol: collateralSymbol,
              label: "Mint Pegged Tokens",
            };
            fees.push(mintFee);

            // Attach fee to the mint step
            if (mintStepIndex !== null && steps[mintStepIndex]) {
              steps[mintStepIndex].fee = {
                amount: wrappedFee,
                formatted: feeFormatted,
                usd: feeUSD,
                percentage: feePercentage,
                tokenSymbol: collateralSymbol,
              };
            }
          }
        } else if (lastError) {
          // Track fee estimation error
          feeErrors.push(
            `Failed to estimate mint fee: ${
              lastError.message || "Unknown error"
            }`
          );
          // Removed debug logging
        }
      }

      const handleCancel = () => {
        cancelRef.current = true;
        setIsCompounding(false);
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

      // Store cancel handler in ref so TransactionProgressModal can access it
      cancelOperationRef.current = handleCancel;

      // Show confirmation modal first (always show it, even if no fees, to show steps)
      await new Promise<void>((resolve, reject) => {
        setCompoundConfirmation({
          steps,
          fees,
          feeErrors,
          onConfirm: () => {
            // Close confirmation modal first
            setCompoundConfirmation(null);
            // Resolve immediately - UI updates will happen in next tick
            resolve();
          },
        });
      });

      // Now show the progress modal after confirmation
      setTransactionProgress({
        isOpen: true,
        title: "Compounding Rewards",
        steps,
        currentStepIndex: 0,
      });

      // Small delay to ensure UI updates
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (setupError: any) {
      // Handle errors during setup phase
      const errorMessage =
        setupError?.message || "Failed to set up compound process";
      updateProgressStep("setup", {
        status: "error",
        error: errorMessage,
      });
      setIsCompounding(false);
      return; // Exit early - don't proceed with transactions
    }

    // Wait a moment after confirmation to ensure UI is ready
    await new Promise((resolve) => setTimeout(resolve, 200));

    try {
      setIsCompounding(true);

      // Verify writeContractAsync is available
      if (typeof writeContractAsync !== "function") {
        throw new Error("writeContractAsync is not a function");
      }

      // Find the index of a step dynamically
      const findStepIndex = (stepId: string): number => {
        return steps.findIndex((s) => s.id === stepId);
      };

      // Step 1: Claim rewards from ALL pools that have rewards
      for (let i = 0; i < poolsWithRewards.length; i++) {
        const pool = poolsWithRewards[i];
        const stepId = `claim-${pool.poolType}`;

        if (cancelRef.current) throw new Error("Cancelled by user");

        // Update progress to show we're starting this claim
        const stepIndex = findStepIndex(stepId);
        setCurrentStep(stepIndex);
        updateProgressStep(stepId, { status: "in_progress" });

        // Wait a moment to ensure UI updates
        await new Promise((resolve) => setTimeout(resolve, 100));

        if (cancelRef.current) throw new Error("Cancelled by user");

        // Execute the claim transaction for this pool
        updateProgressStep(stepId, {
          status: "in_progress",
          details: "Sending transaction to wallet...",
        });

        const claimHash = await writeContractAsync({
          address: pool.poolAddress,
          abi: rewardsABI,
          functionName: "claim",
        });
        updateProgressStep(stepId, {
          status: "in_progress",
          txHash: claimHash as string,
          details: "Waiting for transaction confirmation...",
        });
        await publicClient?.waitForTransactionReceipt({
          hash: claimHash as `0x${string}`,
        });
        updateProgressStep(stepId, {
          status: "completed",
          txHash: claimHash as string,
          details: "Transaction confirmed",
        });

        // Small delay to ensure UI updates before moving to next step
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      // Step 2: If we received leveraged tokens, redeem them for collateral
      let currentStepIndex = poolsWithRewards.length;

      if (leveragedReceived > 0n && leveragedTokenAddress) {
        // Approve leveraged token for minter if needed
        if (cancelRef.current) throw new Error("Cancelled by user");
        currentStepIndex = findStepIndex("approve-leveraged");
        setCurrentStep(currentStepIndex);
        updateProgressStep("approve-leveraged", { status: "in_progress" });
        const leveragedAllowance = (await publicClient?.readContract({
          address: leveragedTokenAddress,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, minterAddress],
        })) as bigint | undefined;

        if (!leveragedAllowance || leveragedAllowance < leveragedReceived) {
          const approveLeveragedHash = await writeContractAsync({
            address: leveragedTokenAddress,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [minterAddress, leveragedReceived],
          });
          updateProgressStep("approve-leveraged", {
            status: "in_progress",
            txHash: approveLeveragedHash as string,
            details: "Waiting for transaction confirmation...",
          });
          await publicClient?.waitForTransactionReceipt({
            hash: approveLeveragedHash as `0x${string}`,
          });
          updateProgressStep("approve-leveraged", {
            status: "completed",
            txHash: approveLeveragedHash as string,
            details: "Transaction confirmed",
          });
        } else {
          updateProgressStep("approve-leveraged", {
            status: "completed",
            details: "Already approved",
          });
        }

        // Redeem leveraged tokens for collateral
        if (cancelRef.current) throw new Error("Cancelled by user");
        currentStepIndex = findStepIndex("redeem");
        setCurrentStep(currentStepIndex);
        updateProgressStep("redeem", { status: "in_progress" });

        const collateralFromRedeem = (await publicClient?.readContract({
          address: minterAddress,
          abi: minterABI,
          functionName: "calculateRedeemLeveragedTokenOutput",
          args: [leveragedReceived],
        })) as bigint | undefined;

        if (!collateralFromRedeem)
          throw new Error("Failed to calculate redeem output");

        const minCollateralOut = (collateralFromRedeem * 99n) / 100n;
        const redeemHash = await writeContractAsync({
          address: minterAddress,
          abi: minterABI,
          functionName: "redeemLeveragedToken",
          args: [leveragedReceived, address, minCollateralOut],
        });
        updateProgressStep("redeem", {
          status: "in_progress",
          txHash: redeemHash as string,
          details: "Waiting for transaction confirmation...",
        });
        await publicClient?.waitForTransactionReceipt({
          hash: redeemHash as `0x${string}`,
        });
        updateProgressStep("redeem", {
          status: "completed",
          txHash: redeemHash as string,
          details: "Transaction confirmed",
        });
      }

      // Step 3: Mint ha tokens from total collateral
      if (totalCollateralForMinting === 0n) {
        throw new Error("No collateral available for minting");
      }

      // Calculate mint output (use dry run to get peggedMinted)
      const dryRunResult = (await publicClient?.readContract({
        address: minterAddress,
        abi: minterABI,
        functionName: "mintPeggedTokenDryRun",
        args: [totalCollateralForMinting],
      })) as [bigint, bigint, bigint, bigint, bigint, bigint] | undefined;

      const expectedOutput = dryRunResult?.[3];

      if (!expectedOutput) throw new Error("Failed to calculate mint output");

      // Approve collateral for minter if needed
      if (cancelRef.current) throw new Error("Cancelled by user");
      currentStepIndex = findStepIndex("approve-collateral");
      setCurrentStep(currentStepIndex);
      updateProgressStep("approve-collateral", { status: "in_progress" });
      const allowance = (await publicClient?.readContract({
        address: collateralAddress,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, minterAddress],
      })) as bigint | undefined;

      if (cancelRef.current) throw new Error("Cancelled by user");
      if (!allowance || allowance < totalCollateralForMinting) {
        const approveHash = await writeContractAsync({
          address: collateralAddress,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [minterAddress, totalCollateralForMinting],
        });
        updateProgressStep("approve-collateral", {
          status: "in_progress",
          txHash: approveHash as string,
          details: "Waiting for transaction confirmation...",
        });
        await publicClient?.waitForTransactionReceipt({
          hash: approveHash as `0x${string}`,
        });
        updateProgressStep("approve-collateral", {
          status: "completed",
          txHash: approveHash as string,
          details: "Transaction confirmed",
        });
      } else {
        updateProgressStep("approve-collateral", {
          status: "completed",
          details: "Already approved",
        });
      }

      // Mint pegged tokens
      if (cancelRef.current) throw new Error("Cancelled by user");
      currentStepIndex = findStepIndex("mint");
      setCurrentStep(currentStepIndex);
      updateProgressStep("mint", { status: "in_progress" });
      const minPeggedOut = (expectedOutput * 99n) / 100n;
      const mintHash = await writeContractAsync({
        address: minterAddress,
        abi: minterABI,
        functionName: "mintPeggedToken",
        args: [totalCollateralForMinting, address, minPeggedOut],
      });
      updateProgressStep("mint", {
        status: "in_progress",
        txHash: mintHash as string,
        details: "Waiting for transaction confirmation...",
      });
      await publicClient?.waitForTransactionReceipt({
        hash: mintHash as `0x${string}`,
      });
      updateProgressStep("mint", {
        status: "completed",
        txHash: mintHash as string,
        details: "Transaction confirmed",
      });

      // Step 4: Approve and deposit to each stability pool
      // Use only ha tokens from this flow: claimed ha rewards + newly minted ha
      const mintedHaFromThisFlow = expectedOutput || 0n;
      const depositAmount = haReceived + mintedHaFromThisFlow;
      if (depositAmount === 0n) {
        throw new Error("No ha tokens from rewards/mint to deposit");
      }

      // Deposit to all selected pools based on percentage allocations
      // Calculate deposit amounts based on percentages
      let remainingAmount = depositAmount;

      for (let i = 0; i < activeAllocations.length; i++) {
        const allocation = activeAllocations[i];
        const poolType = allocation.poolId;
        const targetPoolAddress =
          poolType === "collateral" ? collateralPoolAddress : sailPoolAddress;
        const poolName = poolType === "collateral" ? "Collateral" : "Sail";

        if (!targetPoolAddress) {
          throw new Error(`Pool address not found for ${poolType} pool`);
        }

        // Calculate deposit amount based on percentage
        // For the last pool, use remaining amount to account for rounding
        let poolDepositAmount: bigint;
        if (i === activeAllocations.length - 1) {
          poolDepositAmount = remainingAmount;
        } else {
          // Calculate: depositAmount * percentage / 100
          poolDepositAmount =
            (depositAmount * BigInt(allocation.percentage)) / 100n;
          remainingAmount -= poolDepositAmount;
        }

        // Step: Approve for this pool
        if (cancelRef.current) throw new Error("Cancelled by user");
        const approveStepId = `approve-pegged-${poolType}`;
        currentStepIndex = findStepIndex(approveStepId);
        setCurrentStep(currentStepIndex);
        updateProgressStep(approveStepId, { status: "in_progress" });

        // Check allowance for this pool
        const poolAllowance = (await publicClient?.readContract({
          address: peggedTokenAddress,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, targetPoolAddress],
        })) as bigint | undefined;

        if (!poolAllowance || poolAllowance < poolDepositAmount) {
          const approveHash = await writeContractAsync({
            address: peggedTokenAddress,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [targetPoolAddress, poolDepositAmount],
          });
          updateProgressStep(approveStepId, {
            status: "in_progress",
            txHash: approveHash as string,
            details: "Waiting for transaction confirmation...",
          });
          await publicClient?.waitForTransactionReceipt({
            hash: approveHash as `0x${string}`,
          });
          updateProgressStep(approveStepId, {
            status: "completed",
            txHash: approveHash as string,
            details: "Transaction confirmed",
          });
        } else {
          updateProgressStep(approveStepId, {
            status: "completed",
            details: "Already approved",
          });
        }

        // Step: Deposit to this pool
        if (cancelRef.current) throw new Error("Cancelled by user");
        const depositStepId = `deposit-${poolType}`;
        currentStepIndex = findStepIndex(depositStepId);
        setCurrentStep(currentStepIndex);
        updateProgressStep(depositStepId, { status: "in_progress" });

        const minDepositAmount = (poolDepositAmount * 99n) / 100n;
        const depositHash = await writeContractAsync({
          address: targetPoolAddress,
          abi: STABILITY_POOL_ABI,
          functionName: "deposit",
          args: [poolDepositAmount, address, minDepositAmount],
        });
        updateProgressStep(depositStepId, {
          status: "in_progress",
          txHash: depositHash as string,
          details: "Waiting for transaction confirmation...",
        });
        await publicClient?.waitForTransactionReceipt({
          hash: depositHash as `0x${string}`,
        });
        updateProgressStep(depositStepId, {
          status: "completed",
          txHash: depositHash as string,
          details: "Transaction confirmed",
        });

        // Small delay between pools to ensure UI updates
        if (i < activeAllocations.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      // Wait for blockchain state to update
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // Refetch all contract data
      await Promise.all([refetchReads(), refetchUserDeposits()]);
    } catch (error: any) {
      const errorMessage = isUserRejection(error)
        ? "User declined the transaction"
        : error.message || "Transaction failed";

      // If user rejected or cancelled, mark all remaining steps as cancelled
      if (isUserRejection(error) || error.message === "Cancelled by user") {
        if (transactionProgress) {
          transactionProgress.steps.forEach((step, index) => {
            if (
              index > transactionProgress.currentStepIndex &&
              step.status === "pending"
            ) {
              updateProgressStep(step.id, {
                status: "error",
                error: "Cancelled - previous transaction declined",
              });
            }
          });
        }
      }

      // Mark current step as error
      if (transactionProgress) {
        const currentStep =
          transactionProgress.steps[transactionProgress.currentStepIndex];
        if (currentStep) {
          updateProgressStep(currentStep.id, {
            status: "error",
            error: errorMessage,
          });
        } else {
          // If no current step, mark the first pending step as error
          const firstPendingStep = transactionProgress.steps.find(
            (s) => s.status === "pending"
          );
          if (firstPendingStep) {
            updateProgressStep(firstPendingStep.id, {
              status: "error",
              error: errorMessage,
            });
          }
        }
      } else {
        // If transactionProgress is null, create it to show the error
        setTransactionProgress({
          isOpen: true,
          title: "Compounding Rewards",
          steps: steps.map((s, i) =>
            i === 0
              ? { ...s, status: "error" as const, error: errorMessage }
              : s
          ),
          currentStepIndex: 0,
        });
      }
      // Don't close modal on error - let user see what failed
    } finally {
      setIsCompounding(false);
      cancelOperationRef.current = null;
    }
  };

  // Claim all, compound all, and buy $TIDE handlers
  // handleClaimAll, handleCompoundAll are now provided by useAnchorTransactions hook

  const handleBuyTide = async (
    selectedPools: Array<{
      marketId: string;
      poolType: "collateral" | "sail";
    }> = []
  ) => {
    if (!address || !publicClient || isClaimingAll) return;

    try {
      setIsClaimingAll(true);
      setIsClaimAllModalOpen(false);

      const result = await runAnchorBuyTideFlow({
        address,
        publicClient,
        anchorMarkets,
        selectedPools,
        getPoolRewardTokens,
        writeContractAsync,
        sendTransactionAsync,
        ensureAllowance,
        setTransactionProgress,
        updateProgressStep,
        setCurrentStep,
        isUserRejection,
      });

      if (result.ok) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await Promise.all([refetchReads(), refetchUserDeposits()]);
      }
    } finally {
      setIsClaimingAll(false);
    }
  };

  const ensureAllowance = useCallback(
    async (token: `0x${string}`, spender: `0x${string}`, amount: bigint) => {
      if (!address || !publicClient) return;
      if (amount <= 0n) return;
      const formatTxError = (e: any): string => {
        const msgRaw =
          e?.shortMessage ||
          e?.cause?.shortMessage ||
          e?.cause?.message ||
          e?.message ||
          String(e);

        const msg = String(msgRaw);
        const lower = msg.toLowerCase();

        // Hardware wallets / connectors sometimes surface this as an "unknown RPC error"
        // but it's actually just a disconnected signer device.
        if (
          lower.includes("device disconnected") ||
          lower.includes("disconnected during action")
        ) {
          return "Wallet device disconnected. Reconnect your wallet and try again.";
        }
        if (
          lower.includes("user rejected") ||
          lower.includes("user denied") ||
          lower.includes("rejected the request") ||
          lower.includes("request rejected")
        ) {
          return "Transaction was rejected in your wallet.";
        }

        // Strip noisy viem request dumps (Request Arguments / Contract Call blobs).
        const trimmed = msg.split("Request Arguments:")[0]?.trim();
        return trimmed || "Transaction failed. Please try again.";
      };

      const readAllowance = async () => {
        const currentAllowance = (await publicClient.readContract({
          address: token,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, spender],
        })) as bigint;
        return currentAllowance ?? 0n;
      };

      const sendApprove = async () => {
        const approveHash = await writeContractAsync({
          address: token,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [spender, amount],
        });
        await publicClient.waitForTransactionReceipt({
          hash: approveHash as `0x${string}`,
        });
      };

      const allowance0 = await readAllowance();
      if (allowance0 >= amount) return;

      try {
        await sendApprove();
      } catch (e: any) {
        const msg = (e?.message || "").toLowerCase();
        const isNonceError =
          msg.includes("nonce") &&
          (msg.includes("lower") || msg.includes("too low"));

        // If we hit a nonce sync issue (usually due to pending txs / wallet nonce cache),
        // wait briefly, re-check allowance (maybe the approval already mined), then retry once.
        if (isNonceError) {
          await new Promise((r) => setTimeout(r, 1500));
          const allowance1 = await readAllowance();
          if (allowance1 >= amount) return;
          await sendApprove();
          return;
        }

        throw new Error(formatTxError(e));
      }
    },
    [address, publicClient, writeContractAsync]
  );

  const readErc20Balance = useCallback(
    async (token: `0x${string}`) => {
      if (!address || !publicClient) return 0n;
      const bal = (await publicClient.readContract({
        address: token,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address],
      })) as bigint;
      return bal ?? 0n;
    },
    [address, publicClient]
  );

  const getSelectedPoolsByMarket = useCallback(
    (
      selectedPools: Array<{
        marketId: string;
        poolType: "collateral" | "sail";
      }>
    ) => {
      const map = new Map<string, Array<"collateral" | "sail">>();
      for (const p of selectedPools) {
        const arr = map.get(p.marketId) ?? [];
        if (!arr.includes(p.poolType)) arr.push(p.poolType);
        map.set(p.marketId, arr);
      }
      return map;
    },
    []
  );

  const getPoolRewardTokens = useCallback(
    (poolAddress: `0x${string}`) => {
      const poolReward = allPoolRewards?.find(
        (r) => r.poolAddress.toLowerCase() === poolAddress.toLowerCase()
      );
      return poolReward?.rewardTokens ?? [];
    },
    [allPoolRewards]
  );

  const formatTokenAmount = useCallback((amount: bigint): string => {
    const num = Number(amount) / 1e18;
    if (!Number.isFinite(num) || num === 0) return "0";
    if (num >= 1)
      return num.toLocaleString(undefined, { maximumFractionDigits: 6 });
    return num
      .toLocaleString(undefined, {
        maximumFractionDigits: 8,
        useGrouping: false,
      })
      .replace(/\.?0+$/, "");
  }, []);

  const runAdvancedPreflight = useCallback(
    async (args: {
      targetMarketId: string;
      allocations: Array<{ poolAddress: `0x${string}`; percentage: number }>;
      selectedClaimPools: Array<{
        marketId: string;
        poolType: "collateral" | "sail";
      }>;
    }) => {
      if (!publicClient) {
        setAdvancedPreflight({
          key: "",
          isLoading: false,
          error: "Public client not available",
          fees: [],
        });
        return;
      }

      const key = JSON.stringify({
        t: args.targetMarketId,
        a: args.allocations
          .slice()
          .sort((x, y) => x.poolAddress.localeCompare(y.poolAddress))
          .map((x) => [x.poolAddress.toLowerCase(), x.percentage]),
        c: args.selectedClaimPools
          .slice()
          .sort((x, y) =>
            `${x.marketId}-${x.poolType}`.localeCompare(
              `${y.marketId}-${y.poolType}`
            )
          ),
      });

      setAdvancedPreflight({
        key,
        isLoading: true,
        fees: [],
      });

      try {
        const targetMarket = anchorMarkets.find(
          ([id]) => id === args.targetMarketId
        )?.[1];
        if (!targetMarket) throw new Error("Target market not found");
        const targetPegged = targetMarket.addresses?.peggedToken as
          | `0x${string}`
          | undefined;
        if (!targetPegged) throw new Error("Target pegged token missing");

        // Aggregate claimable rewards from selected claim pools using `allPoolRewards`
        const peggedByToken = new Map<`0x${string}`, bigint>();
        const leveragedByMarket = new Map<string, bigint>();
        const wrappedByToken = new Map<`0x${string}`, bigint>();

        for (const { marketId, poolType } of args.selectedClaimPools) {
          const market = anchorMarkets.find(([id]) => id === marketId)?.[1];
          if (!market) continue;
          const poolAddress =
            poolType === "collateral"
              ? (market.addresses?.stabilityPoolCollateral as
                  | `0x${string}`
                  | undefined)
              : (market.addresses?.stabilityPoolLeveraged as
                  | `0x${string}`
                  | undefined);
          if (!poolAddress) continue;
          const rts = getPoolRewardTokens(poolAddress);

          const peggedTokenAddr = market.addresses?.peggedToken as
            | `0x${string}`
            | undefined;
          const leveragedTokenAddr = market.addresses?.leveragedToken as
            | `0x${string}`
            | undefined;
          const wrappedTokenAddr = market.addresses?.wrappedCollateralToken as
            | `0x${string}`
            | undefined;

          for (const rt of rts) {
            if (!rt.claimable || rt.claimable <= 0n) continue;
            const addr = (
              rt.address as `0x${string}`
            ).toLowerCase() as `0x${string}`;
            if (peggedTokenAddr && addr === peggedTokenAddr.toLowerCase()) {
              peggedByToken.set(
                peggedTokenAddr,
                (peggedByToken.get(peggedTokenAddr) ?? 0n) + rt.claimable
              );
            } else if (
              leveragedTokenAddr &&
              addr === leveragedTokenAddr.toLowerCase()
            ) {
              leveragedByMarket.set(
                marketId,
                (leveragedByMarket.get(marketId) ?? 0n) + rt.claimable
              );
            } else if (
              wrappedTokenAddr &&
              addr === wrappedTokenAddr.toLowerCase()
            ) {
              wrappedByToken.set(
                wrappedTokenAddr,
                (wrappedByToken.get(wrappedTokenAddr) ?? 0n) + rt.claimable
              );
            } else {
              // Unknown reward token type for this market; ignore for now.
            }
          }
        }

        // Build redeem leveraged plans (market-specific)
        const redeemLeveragedPlan: Array<{
          marketId: string;
          leveragedToken: `0x${string}`;
          amount: bigint;
          minter: `0x${string}`;
          expectedOut: bigint;
          fee: bigint;
        }> = [];
        for (const [marketId, amount] of leveragedByMarket.entries()) {
          const market = anchorMarkets.find(([id]) => id === marketId)?.[1];
          const minter = market?.addresses?.minter as `0x${string}` | undefined;
          const leveragedToken = market?.addresses?.leveragedToken as
            | `0x${string}`
            | undefined;
          if (!minter || !leveragedToken) continue;
          const dry = (await publicClient.readContract({
            address: minter,
            abi: minterABI,
            functionName: "redeemLeveragedTokenDryRun",
            args: [amount],
          })) as [bigint, bigint, bigint, bigint, bigint, bigint];
          const fee = dry?.[1] ?? 0n;
          const out = dry?.[3] ?? 0n;
          redeemLeveragedPlan.push({
            marketId,
            leveragedToken,
            amount,
            minter,
            expectedOut: out,
            fee,
          });

          const wrappedToken = market?.addresses?.wrappedCollateralToken as
            | `0x${string}`
            | undefined;
          if (wrappedToken) {
            wrappedByToken.set(
              wrappedToken,
              (wrappedByToken.get(wrappedToken) ?? 0n) + out
            );
          }
        }

        // Redeem non-target pegged via best market (lowest fee %)
        const redeemPeggedPlan: Array<{
          peggedToken: `0x${string}`;
          amount: bigint;
          minter: `0x${string}`;
          wrappedCollateralToken: `0x${string}`;
          expectedOut: bigint;
          fee: bigint;
          feePct?: number;
          marketId: string;
          tokenSymbol: string;
        }> = [];

        for (const [peggedToken, amount] of peggedByToken.entries()) {
          if (peggedToken.toLowerCase() === targetPegged.toLowerCase())
            continue;
          const candidates = anchorMarkets
            .map(([id, m]) => ({ id, market: m }))
            .filter(({ market }) => {
              const p = (market as any)?.addresses?.peggedToken as
                | `0x${string}`
                | undefined;
              return p && p.toLowerCase() === peggedToken.toLowerCase();
            });
          let best: null | {
            marketId: string;
            minter: `0x${string}`;
            wrapped: `0x${string}`;
            fee: bigint;
            out: bigint;
            feePct?: number;
            tokenSymbol: string;
          } = null;

          for (const c of candidates) {
            const minter = (c.market as any).addresses?.minter as
              | `0x${string}`
              | undefined;
            const wrapped = (c.market as any).addresses
              ?.wrappedCollateralToken as `0x${string}` | undefined;
            if (!minter || !wrapped) continue;
            const dry = (await publicClient.readContract({
              address: minter,
              abi: minterABI as any,
              functionName: "redeemPeggedTokenDryRun" as any,
              args: [amount],
            })) as [bigint, bigint, bigint, bigint, bigint, bigint, bigint];
            const fee = dry?.[1] ?? 0n;
            const out = dry?.[4] ?? 0n;
            const denom = fee + out;
            const feePct =
              denom > 0n ? (Number(fee) / Number(denom)) * 100 : undefined;
            const tokenSymbol = (c.market as any)?.peggedToken?.symbol || "ha";

            if (
              !best ||
              (feePct !== undefined &&
                best.feePct !== undefined &&
                feePct < best.feePct - 1e-9) ||
              (feePct !== undefined && best.feePct === undefined) ||
              (feePct === best.feePct && out > best.out)
            ) {
              best = {
                marketId: c.id,
                minter,
                wrapped,
                fee,
                out,
                feePct,
                tokenSymbol,
              };
            }
          }
          if (!best) throw new Error("Failed to compute redeem dry run");
          redeemPeggedPlan.push({
            peggedToken,
            amount,
            minter: best.minter,
            wrappedCollateralToken: best.wrapped,
            expectedOut: best.out,
            fee: best.fee,
            feePct: best.feePct,
            marketId: best.marketId,
            tokenSymbol: best.tokenSymbol,
          });
          wrappedByToken.set(
            best.wrapped,
            (wrappedByToken.get(best.wrapped) ?? 0n) + best.out
          );
        }

        // Mint target token per wrapped collateral token via best market (lowest fee %)
        const mintPlan: Array<{
          wrappedToken: `0x${string}`;
          amount: bigint;
          minter: `0x${string}`;
          expectedMint: bigint;
          fee: bigint;
          feePct?: number;
          marketId: string;
          collateralSymbol: string;
        }> = [];

        const targetMintMarkets = anchorMarkets
          .map(([id, m]) => ({ id, market: m }))
          .filter(({ market }) => {
            const p = (market as any)?.addresses?.peggedToken as
              | `0x${string}`
              | undefined;
            const minter = (market as any)?.addresses?.minter as
              | `0x${string}`
              | undefined;
            const wrapped = (market as any)?.addresses
              ?.wrappedCollateralToken as `0x${string}` | undefined;
            return (
              !!p &&
              !!minter &&
              !!wrapped &&
              p.toLowerCase() === targetPegged.toLowerCase()
            );
          });

        for (const [wrappedToken, amount] of wrappedByToken.entries()) {
          if (amount <= 0n) continue;
          const candidates = targetMintMarkets.filter(({ market }) => {
            const w = (market as any)?.addresses?.wrappedCollateralToken as
              | `0x${string}`
              | undefined;
            return w && w.toLowerCase() === wrappedToken.toLowerCase();
          });
          if (candidates.length === 0) continue;
          let best: null | {
            marketId: string;
            minter: `0x${string}`;
            minted: bigint;
            fee: bigint;
            feePct?: number;
            collateralSymbol: string;
          } = null;

          for (const c of candidates) {
            const minter = (c.market as any).addresses?.minter as
              | `0x${string}`
              | undefined;
            if (!minter) continue;
            const dry = (await publicClient.readContract({
              address: minter,
              abi: minterABI,
              functionName: "mintPeggedTokenDryRun",
              args: [amount],
            })) as [bigint, bigint, bigint, bigint, bigint, bigint];
            const fee = dry?.[1] ?? 0n;
            const taken = dry?.[2] ?? 0n;
            const minted = dry?.[3] ?? 0n;
            const feePct =
              taken > 0n ? (Number(fee) / Number(taken)) * 100 : undefined;
            const collateralSymbol =
              (c.market as any)?.collateral?.symbol || "collateral";

            if (
              !best ||
              (feePct !== undefined &&
                best.feePct !== undefined &&
                feePct < best.feePct - 1e-9) ||
              (feePct !== undefined && best.feePct === undefined) ||
              (feePct === best.feePct && minted > best.minted)
            ) {
              best = {
                marketId: c.id,
                minter,
                minted,
                fee,
                feePct,
                collateralSymbol,
              };
            }
          }
          if (!best) continue;
          mintPlan.push({
            wrappedToken,
            amount,
            minter: best.minter,
            expectedMint: best.minted,
            fee: best.fee,
            feePct: best.feePct,
            marketId: best.marketId,
            collateralSymbol: best.collateralSymbol,
          });
        }

        const fees = [
          ...redeemLeveragedPlan.map((p) => {
            const market = anchorMarkets.find(([id]) => id === p.marketId)?.[1];
            const tokenSymbol = market?.collateral?.symbol || "collateral";
            const feePct =
              p.fee + p.expectedOut > 0n
                ? (Number(p.fee) / Number(p.fee + p.expectedOut)) * 100
                : undefined;
            return {
              id: `redeem-hs-${p.marketId}`,
              label: `Redeem leveraged (${p.marketId})`,
              tokenSymbol,
              feeFormatted: formatTokenAmount(p.fee),
              feePercentage: feePct,
              details: `Redeem ${formatTokenAmount(
                p.amount
              )} hs → ${formatTokenAmount(p.expectedOut)} ${tokenSymbol}`,
            };
          }),
          ...redeemPeggedPlan.map((p) => {
            const market = anchorMarkets.find(([id]) => id === p.marketId)?.[1];
            const tokenSymbol = market?.collateral?.symbol || "collateral";
            return {
              id: `redeem-ha-${p.peggedToken.toLowerCase()}`,
              label: `Redeem ${p.tokenSymbol} (${p.marketId})`,
              tokenSymbol,
              feeFormatted: formatTokenAmount(p.fee),
              feePercentage: p.feePct,
              details: `Redeem ${formatTokenAmount(p.amount)} ${
                p.tokenSymbol
              } → ${formatTokenAmount(p.expectedOut)} ${tokenSymbol}`,
            };
          }),
          ...mintPlan.map((p) => ({
            id: `mint-${p.wrappedToken.toLowerCase()}`,
            label: `Mint ${
              (targetMarket as any)?.peggedToken?.symbol || "ha"
            } (${p.marketId})`,
            tokenSymbol: p.collateralSymbol,
            feeFormatted: formatTokenAmount(p.fee),
            feePercentage: p.feePct,
            details: `Mint ${formatTokenAmount(
              p.expectedMint
            )} from ${formatTokenAmount(p.amount)} ${p.collateralSymbol}`,
          })),
        ];

        setAdvancedPreflight({
          key,
          isLoading: false,
          fees,
          plan: {
            targetMarketId: args.targetMarketId,
            allocations: args.allocations,
            selectedClaimPools: args.selectedClaimPools,
            redeemPegged: redeemPeggedPlan.map((p) => ({
              peggedToken: p.peggedToken,
              amount: p.amount,
              minter: p.minter,
              wrappedCollateralToken: p.wrappedCollateralToken,
              expectedOut: p.expectedOut,
            })),
            redeemLeveraged: redeemLeveragedPlan.map((p) => ({
              marketId: p.marketId,
              leveragedToken: p.leveragedToken,
              amount: p.amount,
              minter: p.minter,
              expectedOut: p.expectedOut,
            })),
            mint: mintPlan.map((p) => ({
              wrappedToken: p.wrappedToken,
              amount: p.amount,
              minter: p.minter,
              expectedMint: p.expectedMint,
            })),
          },
        });
      } catch (e: any) {
        setAdvancedPreflight({
          key,
          isLoading: false,
          error: e?.message || "Failed to calculate fees",
          fees: [],
        });
      }
    },
    [anchorMarkets, formatTokenAmount, getPoolRewardTokens, publicClient]
  );

  const runSimplePreflight = useCallback(
    async (args: {
      selectedClaimPools: Array<{
        marketId: string;
        poolType: "collateral" | "sail";
      }>;
    }) => {
      if (!publicClient) {
        setSimplePreflight({
          key: "",
          isLoading: false,
          error: "Public client not available",
          fees: [],
        });
        return;
      }

      const key = JSON.stringify({
        c: args.selectedClaimPools
          .slice()
          .sort((x, y) =>
            `${x.marketId}-${x.poolType}`.localeCompare(
              `${y.marketId}-${y.poolType}`
            )
          ),
      });

      setSimplePreflight({
        key,
        isLoading: true,
        fees: [],
      });

      try {
        // Aggregate claimable rewards from selected pools using `allPoolRewards`
        const leveragedByMarket = new Map<string, bigint>();
        const wrappedByMarket = new Map<string, bigint>();

        for (const { marketId, poolType } of args.selectedClaimPools) {
          const market = anchorMarkets.find(([id]) => id === marketId)?.[1];
          if (!market) continue;
          const poolAddress =
            poolType === "collateral"
              ? (market.addresses?.stabilityPoolCollateral as
                  | `0x${string}`
                  | undefined)
              : (market.addresses?.stabilityPoolLeveraged as
                  | `0x${string}`
                  | undefined);
          if (!poolAddress) continue;

          const leveragedTokenAddr = market.addresses?.leveragedToken as
            | `0x${string}`
            | undefined;
          const wrappedTokenAddr = market.addresses?.wrappedCollateralToken as
            | `0x${string}`
            | undefined;
          if (!wrappedTokenAddr) continue;

          const rts = getPoolRewardTokens(poolAddress);
          for (const rt of rts) {
            if (!rt.claimable || rt.claimable <= 0n) continue;
            const addr = (
              rt.address as `0x${string}`
            ).toLowerCase() as `0x${string}`;
            if (
              leveragedTokenAddr &&
              addr === leveragedTokenAddr.toLowerCase()
            ) {
              leveragedByMarket.set(
                marketId,
                (leveragedByMarket.get(marketId) ?? 0n) + rt.claimable
              );
            } else if (addr === wrappedTokenAddr.toLowerCase()) {
              wrappedByMarket.set(
                marketId,
                (wrappedByMarket.get(marketId) ?? 0n) + rt.claimable
              );
            } else {
              // pegged token rewards have no protocol fee for conversion, so ignore here
            }
          }
        }

        const fees: Array<{
          id: string;
          label: string;
          tokenSymbol: string;
          feeFormatted: string;
          feePercentage?: number;
          details?: string;
        }> = [];

        for (const [marketId, leveragedAmount] of leveragedByMarket.entries()) {
          if (leveragedAmount <= 0n) continue;
          const market = anchorMarkets.find(([id]) => id === marketId)?.[1];
          const minter = market?.addresses?.minter as `0x${string}` | undefined;
          if (!market || !minter) continue;
          const collateralSymbol = market?.collateral?.symbol || "collateral";

          const dry = (await publicClient.readContract({
            address: minter,
            abi: minterABI,
            functionName: "redeemLeveragedTokenDryRun",
            args: [leveragedAmount],
          })) as [bigint, bigint, bigint, bigint, bigint, bigint];
          const fee = dry?.[1] ?? 0n;
          const out = dry?.[3] ?? 0n;
          const feePct =
            fee + out > 0n
              ? (Number(fee) / Number(fee + out)) * 100
              : undefined;

          fees.push({
            id: `simple-redeem-hs-${marketId}`,
            label: `Redeem leveraged (${marketId})`,
            tokenSymbol: collateralSymbol,
            feeFormatted: formatTokenAmount(fee),
            feePercentage: feePct,
            details: `Redeem ${formatTokenAmount(
              leveragedAmount
            )} hs → ${formatTokenAmount(out)} ${collateralSymbol}`,
          });

          // Redemption produces wrapped collateral which will be minted into pegged
          wrappedByMarket.set(
            marketId,
            (wrappedByMarket.get(marketId) ?? 0n) + out
          );
        }

        for (const [marketId, wrappedAmount] of wrappedByMarket.entries()) {
          if (wrappedAmount <= 0n) continue;
          const market = anchorMarkets.find(([id]) => id === marketId)?.[1];
          const minter = market?.addresses?.minter as `0x${string}` | undefined;
          if (!market || !minter) continue;
          const collateralSymbol = market?.collateral?.symbol || "collateral";
          const peggedSymbol = market?.peggedToken?.symbol || "ha";

          const dry = (await publicClient.readContract({
            address: minter,
            abi: minterABI,
            functionName: "mintPeggedTokenDryRun",
            args: [wrappedAmount],
          })) as [bigint, bigint, bigint, bigint, bigint, bigint];
          const fee = dry?.[1] ?? 0n;
          const taken = dry?.[2] ?? 0n;
          const minted = dry?.[3] ?? 0n;
          const feePct =
            taken > 0n ? (Number(fee) / Number(taken)) * 100 : undefined;

          fees.push({
            id: `simple-mint-${marketId}`,
            label: `Mint ${peggedSymbol} (${marketId})`,
            tokenSymbol: collateralSymbol,
            feeFormatted: formatTokenAmount(fee),
            feePercentage: feePct,
            details: `Mint ${formatTokenAmount(
              minted
            )} ${peggedSymbol} from ${formatTokenAmount(
              wrappedAmount
            )} ${collateralSymbol}`,
          });
        }

        setSimplePreflight({
          key,
          isLoading: false,
          fees,
        });
      } catch (e: any) {
        setSimplePreflight({
          key,
          isLoading: false,
          error: e?.message || "Failed to calculate fees",
          fees: [],
        });
      }
    },
    [anchorMarkets, formatTokenAmount, getPoolRewardTokens, publicClient]
  );

  const handleCompoundAllKeepPerToken = useCallback(
    async (
      selectedPools: Array<{
        marketId: string;
        poolType: "collateral" | "sail";
      }>,
      allocations: Array<{ poolAddress: `0x${string}`; percentage: number }>
    ) => {
      if (!address || !publicClient) throw new Error("Wallet not connected");

      const selectedByMarket = getSelectedPoolsByMarket(selectedPools);
      const marketsToProcess = Array.from(selectedByMarket.keys());
      if (marketsToProcess.length === 0) return;

      // Snapshot initial balances so we only act on newly-claimed rewards.
      const initialByMarket = new Map<
        string,
        { pegged: bigint; leveraged: bigint; wrapped: bigint }
      >();
      for (const marketId of marketsToProcess) {
        const market = anchorMarkets.find(([id]) => id === marketId)?.[1];
        if (!market) continue;
        const peggedTokenAddress = market.addresses?.peggedToken as
          | `0x${string}`
          | undefined;
        const leveragedTokenAddress = market.addresses?.leveragedToken as
          | `0x${string}`
          | undefined;
        const wrappedCollateralToken = market.addresses
          ?.wrappedCollateralToken as `0x${string}` | undefined;
        if (!peggedTokenAddress || !wrappedCollateralToken) continue;
        const pegged = await readErc20Balance(peggedTokenAddress);
        const leveraged = leveragedTokenAddress
          ? await readErc20Balance(leveragedTokenAddress)
          : 0n;
        const wrapped = await readErc20Balance(wrappedCollateralToken);
        initialByMarket.set(marketId, { pegged, leveraged, wrapped });
      }

      const steps: TransactionStep[] = [];
      for (const marketId of marketsToProcess) {
        const poolTypes = selectedByMarket.get(marketId) ?? [];
        for (const poolType of poolTypes) {
          steps.push({
            id: `claim-${marketId}-${poolType}`,
            label: `Claim rewards from ${marketId} ${poolType} pool`,
            status: "pending",
          });
        }
      }
      steps.push({
        id: "compound",
        label: "Redeem / Mint / Deposit",
        status: "pending",
      });

      setTransactionProgress({
        isOpen: true,
        title: "Compounding Rewards",
        steps,
        currentStepIndex: 0,
      });

      // Step 1: claim from each selected pool
      let stepIndex = 0;
      for (const marketId of marketsToProcess) {
        const market = anchorMarkets.find(([id]) => id === marketId)?.[1];
        if (!market) continue;
        const poolTypes = selectedByMarket.get(marketId) ?? [];
        for (const poolType of poolTypes) {
          const stepId = `claim-${marketId}-${poolType}`;
          setCurrentStep(stepIndex);
          updateProgressStep(stepId, { status: "in_progress" });

          const poolAddress =
            poolType === "collateral"
              ? (market.addresses?.stabilityPoolCollateral as
                  | `0x${string}`
                  | undefined)
              : (market.addresses?.stabilityPoolLeveraged as
                  | `0x${string}`
                  | undefined);
          if (!poolAddress) {
            updateProgressStep(stepId, {
              status: "error",
              error: "Pool address not found",
            });
            stepIndex++;
            continue;
          }

          const hash = await writeContractAsync({
            address: poolAddress,
            abi: rewardsABI,
            functionName: "claim",
          });
          updateProgressStep(stepId, {
            status: "in_progress",
            txHash: hash as string,
          });
          await publicClient.waitForTransactionReceipt({
            hash: hash as `0x${string}`,
          });
          updateProgressStep(stepId, {
            status: "completed",
            txHash: hash as string,
          });
          stepIndex++;
        }
      }

      // Step 2: per-market redeem/mint/deposit using the chosen pool list (by address)
      setCurrentStep(stepIndex);
      updateProgressStep("compound", { status: "in_progress" });

      for (const marketId of marketsToProcess) {
        const market = anchorMarkets.find(([id]) => id === marketId)?.[1];
        if (!market) continue;

        const minterAddress = market.addresses?.minter as
          | `0x${string}`
          | undefined;
        const peggedTokenAddress = market.addresses?.peggedToken as
          | `0x${string}`
          | undefined;
        const leveragedTokenAddress = market.addresses?.leveragedToken as
          | `0x${string}`
          | undefined;
        const wrappedCollateralToken = market.addresses
          ?.wrappedCollateralToken as `0x${string}` | undefined;
        const collateralPoolAddress = market.addresses
          ?.stabilityPoolCollateral as `0x${string}` | undefined;
        const sailPoolAddress = market.addresses?.stabilityPoolLeveraged as
          | `0x${string}`
          | undefined;

        if (!minterAddress || !peggedTokenAddress || !wrappedCollateralToken)
          continue;

        const initial = initialByMarket.get(marketId);
        if (!initial) continue;
        const peggedAfterClaim = await readErc20Balance(peggedTokenAddress);
        const leveragedAfterClaim = leveragedTokenAddress
          ? await readErc20Balance(leveragedTokenAddress)
          : 0n;
        const wrappedAfterClaim = await readErc20Balance(
          wrappedCollateralToken
        );

        const claimedPegged =
          peggedAfterClaim > initial.pegged
            ? peggedAfterClaim - initial.pegged
            : 0n;
        const claimedLeveraged =
          leveragedAfterClaim > initial.leveraged
            ? leveragedAfterClaim - initial.leveraged
            : 0n;
        // wrapped delta will be re-read after redemptions; keep initial baseline
        void wrappedAfterClaim;

        // Redeem leveraged -> wrapped collateral
        if (claimedLeveraged > 0n && leveragedTokenAddress) {
          await ensureAllowance(
            leveragedTokenAddress,
            minterAddress,
            claimedLeveraged
          );
          // Compute min out via dry run
          let minOut = 0n;
          try {
            const dry = (await publicClient.readContract({
              address: minterAddress,
              abi: minterABI,
              functionName: "redeemLeveragedTokenDryRun",
              args: [claimedLeveraged],
            })) as [bigint, bigint, bigint, bigint, bigint, bigint];
            if (dry && Array.isArray(dry) && dry.length >= 4) {
              const returned = dry[3] as bigint;
              minOut = (returned * 99n) / 100n;
            }
          } catch {}

          const redeemHash = await writeContractAsync({
            address: minterAddress,
            abi: minterABI,
            functionName: "redeemLeveragedToken",
            args: [claimedLeveraged, address, minOut],
          });
          await publicClient.waitForTransactionReceipt({
            hash: redeemHash as `0x${string}`,
          });
        }

        // Mint pegged from *new* wrapped collateral (claims + redemptions)
        const wrappedAfterRedeem = await readErc20Balance(
          wrappedCollateralToken
        );
        const collateralToMint =
          wrappedAfterRedeem > initial.wrapped
            ? wrappedAfterRedeem - initial.wrapped
            : 0n;
        if (collateralToMint > 0n) {
          await ensureAllowance(
            wrappedCollateralToken,
            minterAddress,
            collateralToMint
          );
          let minPeggedOut = 0n;
          try {
            const dry = (await publicClient.readContract({
              address: minterAddress,
              abi: minterABI,
              functionName: "mintPeggedTokenDryRun",
              args: [collateralToMint],
            })) as [bigint, bigint, bigint, bigint, bigint, bigint];
            if (dry && Array.isArray(dry) && dry.length >= 4) {
              const peggedMinted = dry[3] as bigint;
              minPeggedOut = (peggedMinted * 99n) / 100n;
            }
          } catch {}

          const mintHash = await writeContractAsync({
            address: minterAddress,
            abi: minterABI,
            functionName: "mintPeggedToken",
            args: [collateralToMint, address, minPeggedOut],
          });
          await publicClient.waitForTransactionReceipt({
            hash: mintHash as `0x${string}`,
          });
        }

        const peggedAfterMint = await readErc20Balance(peggedTokenAddress);
        const totalPeggedToDeposit =
          peggedAfterMint > initial.pegged
            ? peggedAfterMint - initial.pegged
            : 0n;
        if (totalPeggedToDeposit <= 0n) continue;

        // Deposit to selected pools that belong to this market (collateral/sail pools for this market)
        const validPoolSet = new Set<string>(
          [collateralPoolAddress, sailPoolAddress]
            .filter(Boolean)
            .map((x) => (x as string).toLowerCase())
        );
        const active = allocations
          .filter((a) => a.percentage > 0)
          .filter((a) => validPoolSet.has(a.poolAddress.toLowerCase()));
        const sum = active.reduce((s, a) => s + a.percentage, 0);
        if (sum === 0) continue;

        for (const a of active) {
          const poolAddress = a.poolAddress as `0x${string}`;
          const pct = (a.percentage * 100) / sum;
          const amt = (totalPeggedToDeposit * BigInt(Math.round(pct))) / 100n;
          if (amt <= 0n) continue;
          await ensureAllowance(peggedTokenAddress, poolAddress, amt);
          const depositHash = await writeContractAsync({
            address: poolAddress,
            abi: STABILITY_POOL_ABI,
            functionName: "deposit",
            args: [amt, address, 0n],
          });
          await publicClient.waitForTransactionReceipt({
            hash: depositHash as `0x${string}`,
          });
        }
      }

      updateProgressStep("compound", { status: "completed" });
    },
    [
      address,
      publicClient,
      anchorMarkets,
      writeContractAsync,
      updateProgressStep,
      setCurrentStep,
      setTransactionProgress,
      ensureAllowance,
      readErc20Balance,
      getSelectedPoolsByMarket,
      getPoolRewardTokens,
    ]
  );

  const handleCompoundAllToSingleToken = useCallback(
    async (
      selectedPools: Array<{
        marketId: string;
        poolType: "collateral" | "sail";
      }>,
      targetMarketId: string,
      allocations: Array<{ poolAddress: `0x${string}`; percentage: number }>,
      preflightPlan?: NonNullable<typeof advancedPreflight>["plan"]
    ) => {
      if (!address || !publicClient) throw new Error("Wallet not connected");

      const targetMarket = anchorMarkets.find(
        ([id]) => id === targetMarketId
      )?.[1];
      if (!targetMarket) throw new Error("Target market not found");

      const targetPegged = targetMarket.addresses?.peggedToken as
        | `0x${string}`
        | undefined;
      const targetCollateralPool = targetMarket.addresses
        ?.stabilityPoolCollateral as `0x${string}` | undefined;
      const targetSailPool = targetMarket.addresses?.stabilityPoolLeveraged as
        | `0x${string}`
        | undefined;

      if (!targetPegged) {
        throw new Error("Missing target market addresses");
      }

      const selectedByMarket = getSelectedPoolsByMarket(selectedPools);
      const marketsToProcess = Array.from(selectedByMarket.keys());
      if (marketsToProcess.length === 0) return;

      // Snapshot balances so we only act on newly-claimed rewards.
      // NOTE: pegged tokens can be shared across multiple markets, so we snapshot per-token-address to avoid double counting.
      const initialPeggedByToken = new Map<`0x${string}`, bigint>();
      const initialLeveragedByMarket = new Map<string, bigint>();
      const initialWrappedByToken = new Map<`0x${string}`, bigint>();

      for (const marketId of marketsToProcess) {
        const m = anchorMarkets.find(([id]) => id === marketId)?.[1];
        if (!m) continue;
        const peggedTokenAddress = m.addresses?.peggedToken as
          | `0x${string}`
          | undefined;
        const leveragedTokenAddress = m.addresses?.leveragedToken as
          | `0x${string}`
          | undefined;
        const wrappedCollateralToken = m.addresses?.wrappedCollateralToken as
          | `0x${string}`
          | undefined;

        if (
          peggedTokenAddress &&
          !initialPeggedByToken.has(peggedTokenAddress)
        ) {
          initialPeggedByToken.set(
            peggedTokenAddress,
            await readErc20Balance(peggedTokenAddress)
          );
        }
        if (leveragedTokenAddress) {
          initialLeveragedByMarket.set(
            marketId,
            await readErc20Balance(leveragedTokenAddress)
          );
        }
        if (
          wrappedCollateralToken &&
          !initialWrappedByToken.has(wrappedCollateralToken)
        ) {
          initialWrappedByToken.set(
            wrappedCollateralToken,
            await readErc20Balance(wrappedCollateralToken)
          );
        }
      }

      const claimSteps: TransactionStep[] = [];
      for (const marketId of marketsToProcess) {
        const poolTypes = selectedByMarket.get(marketId) ?? [];
        for (const poolType of poolTypes) {
          claimSteps.push({
            id: `claim-${marketId}-${poolType}`,
            label: `Claim rewards from ${marketId} ${poolType} pool`,
            status: "pending",
          });
        }
      }

      // If we have a preflight plan (computed before continuing), show the full set of steps up front.
      // This prevents the progress modal from only showing claim steps during the initial phase.
      const preActionSteps: TransactionStep[] = preflightPlan
        ? [
            ...preflightPlan.redeemLeveraged.map((p) => ({
              id: `redeem-hs-${p.marketId}`,
              label: `Redeem leveraged rewards (${p.marketId})`,
              status: "pending" as const,
              details: "Redeem leveraged rewards → wrapped collateral",
            })),
            ...preflightPlan.redeemPegged.map((p) => {
              const tokenSymbol =
                anchorMarkets.find(([_, m]) => {
                  const addr = (m as any)?.addresses?.peggedToken as
                    | `0x${string}`
                    | undefined;
                  return (
                    addr && addr.toLowerCase() === p.peggedToken.toLowerCase()
                  );
                })?.[1]?.peggedToken?.symbol || "ha";
              return {
                id: `redeem-ha-${p.peggedToken.slice(2, 8)}`,
                label: `Redeem ${tokenSymbol} → collateral`,
                status: "pending" as const,
                details: "Redeem non-target Anchor tokens → wrapped collateral",
              };
            }),
            ...preflightPlan.mint.map((p) => ({
              id: `mint-${p.wrappedToken.slice(2, 8)}`,
              label: `Mint ${
                targetMarket.peggedToken?.symbol || "ha"
              } from collateral`,
              status: "pending" as const,
              details: "Mint target Anchor token from wrapped collateral",
            })),
            ...allocations
              .filter((a) => a.percentage > 0)
              .map((a) => ({
                id: `deposit-${a.poolAddress.toLowerCase()}`,
                label: "Deposit to selected pool",
                status: "pending" as const,
                details: `${a.percentage}% allocation`,
              })),
          ]
        : [];

      setTransactionProgress({
        isOpen: true,
        title: "Compounding Rewards",
        steps: [...claimSteps, ...preActionSteps],
        currentStepIndex: 0,
      });

      // Step 1: claim from each selected pool
      let stepIndex = 0;
      for (const marketId of marketsToProcess) {
        const market = anchorMarkets.find(([id]) => id === marketId)?.[1];
        if (!market) continue;
        const poolTypes = selectedByMarket.get(marketId) ?? [];
        for (const poolType of poolTypes) {
          const stepId = `claim-${marketId}-${poolType}`;
          setCurrentStep(stepIndex);
          updateProgressStep(stepId, { status: "in_progress" });

          const poolAddress =
            poolType === "collateral"
              ? (market.addresses?.stabilityPoolCollateral as
                  | `0x${string}`
                  | undefined)
              : (market.addresses?.stabilityPoolLeveraged as
                  | `0x${string}`
                  | undefined);
          if (!poolAddress) {
            updateProgressStep(stepId, {
              status: "error",
              error: "Pool address not found",
            });
            stepIndex++;
            continue;
          }

          const hash = await writeContractAsync({
            address: poolAddress,
            abi: rewardsABI,
            functionName: "claim",
          });
          updateProgressStep(stepId, {
            status: "in_progress",
            txHash: hash as string,
          });
          await publicClient.waitForTransactionReceipt({
            hash: hash as `0x${string}`,
          });
          updateProgressStep(stepId, {
            status: "completed",
            txHash: hash as string,
          });
          stepIndex++;
        }
      }

      const initialTargetPegged = await readErc20Balance(targetPegged);

      // 2a) Redeem leveraged tokens (must use the market minter)
      type RedeemLeveragedPlan = {
        id: string;
        marketId: string;
        minter: `0x${string}`;
        leveragedToken: `0x${string}`;
        amount: bigint;
        fee: bigint;
        expectedOut: bigint;
        minOut: bigint;
      };
      const leveragedPlans: RedeemLeveragedPlan[] = [];
      for (const marketId of marketsToProcess) {
        const market = anchorMarkets.find(([id]) => id === marketId)?.[1];
        if (!market) continue;
        const minterAddress = market.addresses?.minter as
          | `0x${string}`
          | undefined;
        const leveragedTokenAddress = market.addresses?.leveragedToken as
          | `0x${string}`
          | undefined;
        if (!minterAddress || !leveragedTokenAddress) continue;

        const initialLeveraged = initialLeveragedByMarket.get(marketId) ?? 0n;
        const leveragedAfterClaim = await readErc20Balance(
          leveragedTokenAddress
        );
        const claimedLeveraged =
          leveragedAfterClaim > initialLeveraged
            ? leveragedAfterClaim - initialLeveraged
            : 0n;
        if (claimedLeveraged <= 0n) continue;

        // No post-claim dry-run: use the preflight ratios if available.
        let fee = 0n;
        let expectedOut = 0n;
        if (preflightPlan) {
          const pre = preflightPlan.redeemLeveraged?.find(
            (x) => x.marketId === marketId
          );
          expectedOut =
            pre && pre.amount > 0n
              ? (pre.expectedOut * claimedLeveraged) / pre.amount
              : 0n;
        } else {
          try {
            const dry = (await publicClient.readContract({
              address: minterAddress,
              abi: minterABI,
              functionName: "redeemLeveragedTokenDryRun",
              args: [claimedLeveraged],
            })) as [bigint, bigint, bigint, bigint, bigint, bigint];
            if (dry && Array.isArray(dry) && dry.length >= 4) {
              fee = dry[1] as bigint; // wrappedFee
              const returned = dry[3] as bigint;
              expectedOut = returned;
            }
          } catch {}
        }
        const minOut = expectedOut > 0n ? (expectedOut * 99n) / 100n : 0n;

        leveragedPlans.push({
          id: `redeem-hs-${marketId}`,
          marketId,
          minter: minterAddress,
          leveragedToken: leveragedTokenAddress,
          amount: claimedLeveraged,
          fee,
          expectedOut,
          minOut,
        });
      }

      // 2b) Redeem non-target pegged tokens using the best market by dry-run (max collateral returned)
      const claimedPeggedByToken = new Map<`0x${string}`, bigint>();
      for (const [token, initial] of initialPeggedByToken.entries()) {
        const after = await readErc20Balance(token);
        const delta = after > initial ? after - initial : 0n;
        if (delta > 0n) claimedPeggedByToken.set(token, delta);
      }

      type RedeemPeggedPlan = {
        id: string;
        peggedToken: `0x${string}`;
        amount: bigint;
        chosenMarketId: string;
        minter: `0x${string}`;
        wrappedCollateralToken: `0x${string}`;
        fee: bigint;
        feePct?: number;
        expectedOut: bigint;
        minOut: bigint;
        tokenSymbol: string;
      };
      const peggedPlans: RedeemPeggedPlan[] = [];

      const formatToken = (amount: bigint): string => {
        const num = Number(amount) / 1e18;
        if (!Number.isFinite(num) || num === 0) return "0";
        if (num >= 1)
          return num.toLocaleString(undefined, { maximumFractionDigits: 6 });
        return num
          .toLocaleString(undefined, {
            maximumFractionDigits: 8,
            useGrouping: false,
          })
          .replace(/\.?0+$/, "");
      };

      for (const [peggedTokenAddr, amount] of claimedPeggedByToken.entries()) {
        if (peggedTokenAddr.toLowerCase() === targetPegged.toLowerCase())
          continue; // keep target token

        let chosenMinter: `0x${string}` | undefined;
        let chosenWrapped: `0x${string}` | undefined;
        let chosenMarketId: string | undefined;
        let expectedOut = 0n;
        let fee = 0n;
        let feePct: number | undefined;

        if (preflightPlan) {
          const pre = preflightPlan.redeemPegged?.find(
            (x) => x.peggedToken.toLowerCase() === peggedTokenAddr.toLowerCase()
          );
          if (!pre)
            throw new Error("Missing preflight plan for pegged redemption");
          chosenMinter = pre.minter;
          chosenWrapped = pre.wrappedCollateralToken;
          expectedOut =
            pre.amount > 0n ? (pre.expectedOut * amount) / pre.amount : 0n;
          chosenMarketId =
            anchorMarkets.find(
              ([id, m]) =>
                (
                  (m as any).addresses?.minter as `0x${string}` | undefined
                )?.toLowerCase() === chosenMinter!.toLowerCase()
            )?.[0] || "preflight";
        } else {
          // Candidate minters for this pegged token
          const candidates = anchorMarkets
            .map(([id, m]) => ({ id, market: m }))
            .filter(({ market }) => {
              const p = (market as any).addresses?.peggedToken as
                | `0x${string}`
                | undefined;
              const minter = (market as any).addresses?.minter as
                | `0x${string}`
                | undefined;
              return (
                !!p &&
                !!minter &&
                p.toLowerCase() === peggedTokenAddr.toLowerCase()
              );
            });

          if (candidates.length === 0) {
            throw new Error(
              "No redeem market found for a claimed pegged token"
            );
          }

          let best: {
            marketId: string;
            minter: `0x${string}`;
            wrappedCollateralToken: `0x${string}`;
            collateralOut: bigint;
            fee: bigint;
            feePct?: number;
          } | null = null;

          for (const c of candidates) {
            const minter = (c.market as any).addresses?.minter as
              | `0x${string}`
              | undefined;
            const wrapped = (c.market as any).addresses
              ?.wrappedCollateralToken as `0x${string}` | undefined;
            if (!minter || !wrapped) continue;
            try {
              const dry = (await publicClient.readContract({
                address: minter,
                abi: minterABI as any,
                functionName: "redeemPeggedTokenDryRun" as any,
                args: [amount],
              })) as
                | [bigint, bigint, bigint, bigint, bigint, bigint, bigint]
                | undefined;
              const fee =
                dry && Array.isArray(dry) && dry.length >= 2
                  ? (dry[1] as bigint)
                  : 0n;
              const returned =
                dry && Array.isArray(dry) && dry.length >= 5
                  ? (dry[4] as bigint)
                  : 0n;
              const denom = fee + returned;
              const feePct =
                denom > 0n ? (Number(fee) / Number(denom)) * 100 : undefined;

              // Choose the lowest fee percent; tie-break on best net out.
              if (
                !best ||
                (feePct !== undefined &&
                  best.feePct !== undefined &&
                  feePct < best.feePct - 1e-9) ||
                (feePct !== undefined && best.feePct === undefined) ||
                (feePct === best.feePct && returned > best.collateralOut)
              ) {
                best = {
                  marketId: c.id,
                  minter,
                  wrappedCollateralToken: wrapped,
                  collateralOut: returned,
                  fee,
                  feePct,
                };
              }
            } catch {
              // ignore failed dry run candidates
            }
          }

          if (!best) {
            throw new Error(
              "Failed to dry-run redeem on all candidate markets"
            );
          }

          chosenMinter = best.minter;
          chosenWrapped = best.wrappedCollateralToken;
          chosenMarketId = best.marketId;
          expectedOut = best.collateralOut;
          fee = best.fee;
          feePct = best.feePct;
        }

        const minOut = expectedOut > 0n ? (expectedOut * 99n) / 100n : 0n;
        const tokenSymbol =
          anchorMarkets.find(([_, m]) => {
            const p = (m as any).addresses?.peggedToken as
              | `0x${string}`
              | undefined;
            return p && p.toLowerCase() === peggedTokenAddr.toLowerCase();
          })?.[1]?.peggedToken?.symbol || "ha";

        peggedPlans.push({
          id: `redeem-ha-${peggedTokenAddr.slice(2, 8)}`,
          peggedToken: peggedTokenAddr,
          amount,
          chosenMarketId: chosenMarketId || "preflight",
          minter: chosenMinter!,
          wrappedCollateralToken: chosenWrapped!,
          fee,
          feePct,
          expectedOut,
          minOut,
          tokenSymbol,
        });

        // Track this wrapped collateral token for minting deltas later
        if (chosenWrapped && !initialWrappedByToken.has(chosenWrapped)) {
          initialWrappedByToken.set(
            chosenWrapped,
            await readErc20Balance(chosenWrapped)
          );
        }
      }

      // Determine all wrapped collateral token deltas (claims + redemptions)
      const wrappedDeltas: Array<{ token: `0x${string}`; amount: bigint }> = [];
      for (const [token, initial] of initialWrappedByToken.entries()) {
        const after = await readErc20Balance(token);
        const delta = after > initial ? after - initial : 0n;
        if (delta > 0n) wrappedDeltas.push({ token, amount: delta });
      }

      // Candidate mint markets for the target token (may include multiple collaterals)
      const targetMintMarkets = anchorMarkets
        .map(([id, m]) => ({ id, market: m }))
        .filter(({ market }) => {
          const p = (market as any).addresses?.peggedToken as
            | `0x${string}`
            | undefined;
          const minter = (market as any).addresses?.minter as
            | `0x${string}`
            | undefined;
          const wrapped = (market as any).addresses?.wrappedCollateralToken as
            | `0x${string}`
            | undefined;
          return (
            !!p &&
            !!minter &&
            !!wrapped &&
            p.toLowerCase() === targetPegged.toLowerCase()
          );
        });

      type MintPlan = {
        id: string;
        wrappedToken: `0x${string}`;
        amount: bigint;
        chosenMarketId: string;
        minter: `0x${string}`;
        fee: bigint;
        feePct?: number;
        expectedMint: bigint;
        minPeggedOut: bigint;
      };
      const mintPlans: MintPlan[] = [];

      for (const { token: wrappedToken, amount } of wrappedDeltas) {
        let chosenMinter: `0x${string}` | undefined;
        let expectedMint = 0n;
        let fee = 0n;
        let feePct: number | undefined;

        if (preflightPlan) {
          const pre = preflightPlan.mint?.find(
            (x) => x.wrappedToken.toLowerCase() === wrappedToken.toLowerCase()
          );
          if (!pre) throw new Error("Missing preflight plan for mint");
          chosenMinter = pre.minter;
          expectedMint =
            pre.amount > 0n ? (pre.expectedMint * amount) / pre.amount : 0n;
        } else {
          // Find candidate minters that accept this wrapped collateral for the target token
          const candidates = targetMintMarkets
            .map(({ market }) => ({
              minter: (market as any).addresses?.minter as
                | `0x${string}`
                | undefined,
              wrapped: (market as any).addresses?.wrappedCollateralToken as
                | `0x${string}`
                | undefined,
              marketId: (market as any).id as string | undefined,
            }))
            .filter(
              (x) =>
                !!x.minter &&
                !!x.wrapped &&
                x.wrapped.toLowerCase() === wrappedToken.toLowerCase()
            ) as Array<{ minter: `0x${string}`; wrapped: `0x${string}` }>;

          if (candidates.length === 0) {
            throw new Error(
              "No mint market found for one of the collateral types produced by redemption"
            );
          }

          let best: {
            minter: `0x${string}`;
            peggedOut: bigint;
            fee: bigint;
            feePct?: number;
          } | null = null;
          for (const c of candidates) {
            try {
              const dry = (await publicClient.readContract({
                address: c.minter,
                abi: minterABI,
                functionName: "mintPeggedTokenDryRun",
                args: [amount],
              })) as
                | [bigint, bigint, bigint, bigint, bigint, bigint]
                | undefined;
              const fee =
                dry && Array.isArray(dry) && dry.length >= 2
                  ? (dry[1] as bigint)
                  : 0n;
              const taken =
                dry && Array.isArray(dry) && dry.length >= 3
                  ? (dry[2] as bigint)
                  : 0n;
              const minted =
                dry && Array.isArray(dry) && dry.length >= 4
                  ? (dry[3] as bigint)
                  : 0n;
              const feePct =
                taken > 0n ? (Number(fee) / Number(taken)) * 100 : undefined;

              if (
                !best ||
                (feePct !== undefined &&
                  best.feePct !== undefined &&
                  feePct < best.feePct - 1e-9) ||
                (feePct !== undefined && best.feePct === undefined) ||
                (feePct === best.feePct && minted > best.peggedOut)
              ) {
                best = { minter: c.minter, peggedOut: minted, fee, feePct };
              }
            } catch {
              // ignore failed candidates
            }
          }

          if (!best)
            throw new Error("Failed to dry-run mint on all candidate markets");
          chosenMinter = best.minter;
          expectedMint = best.peggedOut;
          fee = best.fee;
          feePct = best.feePct;
        }

        const minPeggedOut =
          expectedMint > 0n ? (expectedMint * 99n) / 100n : 0n;
        mintPlans.push({
          id: `mint-${wrappedToken.slice(2, 8)}`,
          wrappedToken,
          amount,
          chosenMarketId: targetMarketId,
          minter: chosenMinter!,
          fee,
          feePct,
          expectedMint,
          minPeggedOut,
        });
      }

      // Deposit steps can be expanded to show per-pool approvals/deposits; for now show per-pool deposit steps
      const depositSteps: TransactionStep[] = allocations
        .filter((a) => a.percentage > 0)
        .map((a) => ({
          id: `deposit-${a.poolAddress.toLowerCase()}`,
          label: "Deposit to selected pool",
          status: "pending" as const,
          details: `${a.percentage}% allocation`,
        }));

      // Replace the steps list with explicit action steps including fees
      const actionSteps: TransactionStep[] = [
        ...leveragedPlans.map((p) => ({
          id: p.id,
          label: `Redeem leveraged rewards (${p.marketId})`,
          status: "pending" as const,
          details: `Redeem ${formatToken(p.amount)} hs → wrapped collateral`,
          fee:
            p.fee > 0n
              ? {
                  amount: p.fee,
                  formatted: formatToken(p.fee),
                  percentage:
                    p.fee + p.expectedOut > 0n
                      ? (Number(p.fee) / Number(p.fee + p.expectedOut)) * 100
                      : undefined,
                  tokenSymbol: targetMarket?.collateral?.symbol || "collateral",
                }
              : undefined,
        })),
        ...peggedPlans.map((p) => ({
          id: p.id,
          label: `Redeem ${p.tokenSymbol} → collateral`,
          status: "pending" as const,
          details: `Using ${p.chosenMarketId}: redeem ${formatToken(
            p.amount
          )} ${p.tokenSymbol} → ${formatToken(
            p.expectedOut
          )} wrapped collateral`,
          fee:
            p.fee > 0n
              ? {
                  amount: p.fee,
                  formatted: formatToken(p.fee),
                  percentage: p.feePct,
                  tokenSymbol: targetMarket?.collateral?.symbol || "collateral",
                }
              : undefined,
        })),
        ...mintPlans.map((p) => ({
          id: p.id,
          label: `Mint ${
            targetMarket.peggedToken?.symbol || "ha"
          } from collateral`,
          status: "pending" as const,
          details: `Mint ${formatToken(p.expectedMint)} ${
            targetMarket.peggedToken?.symbol || "ha"
          } from ${formatToken(p.amount)} wrapped collateral`,
          fee:
            p.fee > 0n
              ? {
                  amount: p.fee,
                  formatted: formatToken(p.fee),
                  percentage: p.feePct,
                  tokenSymbol: targetMarket?.collateral?.symbol || "collateral",
                }
              : undefined,
        })),
        ...depositSteps,
      ];

      setTransactionProgress({
        isOpen: true,
        title: "Compounding Rewards",
        steps: [
          ...claimSteps.map((s) => ({ ...s, status: "completed" as const })),
          ...actionSteps,
        ],
        currentStepIndex: claimSteps.length,
      });

      // Execute leveraged redeems
      for (const p of leveragedPlans) {
        setCurrentStep(
          claimSteps.length + actionSteps.findIndex((s) => s.id === p.id)
        );
        updateProgressStep(p.id, { status: "in_progress" });
        await ensureAllowance(p.leveragedToken, p.minter, p.amount);
        const hash = await writeContractAsync({
          address: p.minter,
          abi: minterABI,
          functionName: "redeemLeveragedToken",
          args: [p.amount, address, p.minOut],
        });
        updateProgressStep(p.id, {
          status: "in_progress",
          txHash: hash as string,
        });
        await publicClient.waitForTransactionReceipt({
          hash: hash as `0x${string}`,
        });
        updateProgressStep(p.id, {
          status: "completed",
          txHash: hash as string,
        });
      }

      // Execute pegged redeems
      for (const p of peggedPlans) {
        setCurrentStep(
          claimSteps.length + actionSteps.findIndex((s) => s.id === p.id)
        );
        updateProgressStep(p.id, { status: "in_progress" });
        await ensureAllowance(p.peggedToken, p.minter, p.amount);
        const hash = await writeContractAsync({
          address: p.minter,
          abi: minterABI as any,
          functionName: "redeemPeggedToken" as any,
          args: [p.amount, address, p.minOut],
        });
        updateProgressStep(p.id, {
          status: "in_progress",
          txHash: hash as string,
        });
        await publicClient.waitForTransactionReceipt({
          hash: hash as `0x${string}`,
        });
        updateProgressStep(p.id, {
          status: "completed",
          txHash: hash as string,
        });
      }

      // Execute mints
      for (const p of mintPlans) {
        setCurrentStep(
          claimSteps.length + actionSteps.findIndex((s) => s.id === p.id)
        );
        updateProgressStep(p.id, { status: "in_progress" });
        await ensureAllowance(p.wrappedToken, p.minter, p.amount);
        const hash = await writeContractAsync({
          address: p.minter,
          abi: minterABI,
          functionName: "mintPeggedToken",
          args: [p.amount, address, p.minPeggedOut],
        });
        updateProgressStep(p.id, {
          status: "in_progress",
          txHash: hash as string,
        });
        await publicClient.waitForTransactionReceipt({
          hash: hash as `0x${string}`,
        });
        updateProgressStep(p.id, {
          status: "completed",
          txHash: hash as string,
        });
      }

      // Step 4: deposit target pegged into selected pools (by address)
      // Recompute how much target pegged we actually ended up with and deposit according to allocation.
      const targetPeggedAfterMint = await readErc20Balance(targetPegged);
      const totalPeggedToDeposit =
        targetPeggedAfterMint > initialTargetPegged
          ? targetPeggedAfterMint - initialTargetPegged
          : 0n;
      if (totalPeggedToDeposit > 0n) {
        // Only deposit into pools that match the chosen target token (same pegged token address).
        // We assume the modal only lists valid pools, but still normalize percentages defensively.
        const active = allocations.filter((a) => a.percentage > 0);
        const sum = active.reduce((s, a) => s + a.percentage, 0);
        if (sum === 0) return;

        for (const a of active) {
          const poolAddress = a.poolAddress as `0x${string}`;
          const stepId = `deposit-${poolAddress.toLowerCase()}`;
          const pct = (a.percentage * 100) / sum;
          const amt = (totalPeggedToDeposit * BigInt(Math.round(pct))) / 100n;
          if (amt <= 0n) continue;
          try {
            // Show progress for the specific deposit row (approval + deposit happen here).
            const idx = actionSteps.findIndex((s) => s.id === stepId);
            if (idx >= 0) setCurrentStep(claimSteps.length + idx);
            updateProgressStep(stepId, {
              status: "in_progress",
              details: `${a.percentage}% allocation (approving & depositing…)`,
            });

            await ensureAllowance(targetPegged, poolAddress, amt);
            updateProgressStep(stepId, {
              status: "in_progress",
              details: `${a.percentage}% allocation (depositing…)`,
            });

            const depositHash = await writeContractAsync({
              address: poolAddress,
              abi: STABILITY_POOL_ABI,
              functionName: "deposit",
              args: [amt, address, 0n],
            });
            await publicClient.waitForTransactionReceipt({
              hash: depositHash as `0x${string}`,
            });

            updateProgressStep(stepId, {
              status: "completed",
              txHash: depositHash as string,
              details: `${a.percentage}% allocation (${formatToken(
                amt
              )} deposited)`,
            });
          } catch (e: any) {
            updateProgressStep(stepId, {
              status: "error",
              error: e?.message || "Deposit failed",
            });
            throw e;
          }
        }
      }
    },
    [
      address,
      publicClient,
      anchorMarkets,
      writeContractAsync,
      updateProgressStep,
      setCurrentStep,
      setTransactionProgress,
      ensureAllowance,
      readErc20Balance,
      getSelectedPoolsByMarket,
      getPoolRewardTokens,
    ]
  );

  // Individual market claim handlers
  const handleClaimMarketBasicClaim = async () => {
    if (!address || !selectedMarketForClaim || isClaiming) return;
    const market = anchorMarkets.find(
      ([id]) => id === selectedMarketForClaim
    )?.[1];
    if (!market) return;

    try {
      setIsClaiming(true);
      if ((market as any).addresses?.stabilityPoolCollateral) {
        await handleClaimRewards(market, "collateral");
      }
      if ((market as any).addresses?.stabilityPoolLeveraged) {
        await handleClaimRewards(market, "sail");
      }
      // Wait for blockchain state to update
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // Refetch all contract data
      await Promise.all([refetchReads(), refetchUserDeposits()]);
    } catch (e) {
      // Failed to claim market rewards
    } finally {
      setIsClaiming(false);
    }
  };

  const handleClaimMarketCompound = async () => {
    if (!address || !selectedMarketForClaim || isCompounding) return;
    if (!publicClient) return;
    const market = anchorMarkets.find(
      ([id]) => id === selectedMarketForClaim
    )?.[1];
    if (!market) return;

    try {
      setIsCompounding(true);
      // Collect rewards for this market
      const marketRewards: Array<{
        poolType: "collateral" | "sail";
        rewardAmount: bigint;
      }> = [];

      if ((market as any).addresses?.stabilityPoolCollateral) {
        const rewards = await publicClient.readContract({
          address: (market as any).addresses.stabilityPoolCollateral,
          abi: rewardsABI,
          functionName: "getClaimableRewards",
          args: [address],
        });
        if (rewards && rewards > 0n) {
          marketRewards.push({ poolType: "collateral", rewardAmount: rewards });
        }
      }

      if ((market as any).addresses?.stabilityPoolLeveraged) {
        const rewards = await publicClient.readContract({
          address: (market as any).addresses.stabilityPoolLeveraged,
          abi: rewardsABI,
          functionName: "getClaimableRewards",
          args: [address],
        });
        if (rewards && rewards > 0n) {
          marketRewards.push({ poolType: "sail", rewardAmount: rewards });
        }
      }

      if (marketRewards.length === 0) return;

      // Claim and compound rewards (similar to handleCompoundAll but for single market)
      // This is a simplified version - you may want to reuse the compound logic
      for (const { poolType, rewardAmount } of marketRewards) {
        if (poolType === "collateral") {
          await handleClaimRewards(market, "collateral");
          // Then mint and deposit (simplified - you may want to add a compound modal)
        } else {
          await handleClaimRewards(market, "sail");
          // Then redeem sail, mint pegged, and deposit (simplified)
        }
      }
    } catch (e) {
      // Failed to compound market rewards
    } finally {
      setIsCompounding(false);
    }
  };

  const handleClaimMarketBuyTide = async () => {
    if (!address || !publicClient || !selectedMarketForClaim || isClaiming) {
      return;
    }

    const market = anchorMarkets.find(
      ([id]) => id === selectedMarketForClaim
    )?.[1];
    if (!market) return;

    const selectedPools: Array<{
      marketId: string;
      poolType: "collateral" | "sail";
    }> = [];

    if ((market as any).addresses?.stabilityPoolCollateral) {
      selectedPools.push({
        marketId: selectedMarketForClaim,
        poolType: "collateral",
      });
    }
    if ((market as any).addresses?.stabilityPoolLeveraged) {
      selectedPools.push({
        marketId: selectedMarketForClaim,
        poolType: "sail",
      });
    }

    try {
      setIsClaiming(true);
      setIsClaimMarketModalOpen(false);

      const result = await runAnchorBuyTideFlow({
        address,
        publicClient,
        anchorMarkets,
        selectedPools,
        getPoolRewardTokens,
        writeContractAsync,
        sendTransactionAsync,
        ensureAllowance,
        setTransactionProgress,
        updateProgressStep,
        setCurrentStep,
        isUserRejection,
      });

      if (result.ok) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await Promise.all([refetchReads(), refetchUserDeposits()]);
      }
    } finally {
      setIsClaiming(false);
    }
  };

  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  return {
    compoundModal,
    setCompoundModal,
    compoundPoolSelection,
    setCompoundPoolSelection,
    isClaiming,
    setIsClaiming,
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
    setAdvancedPreflight,
    simplePreflight,
    setSimplePreflight,
    cancelOperationRef,
    isClaimAllModalOpen,
    setIsClaimAllModalOpen,
    isDropdownOpen,
    setIsDropdownOpen,
    selectedMarketForClaim,
    setSelectedMarketForClaim,
    isClaimMarketModalOpen,
    setIsClaimMarketModalOpen,
    dropdownRef,
    handlePendingWithdraw,
    handleClaimRewards,
    handleCompoundRewards,
    createCompoundHandlers,
    handleClaimAll,
    handleCompoundAll,
    updateProgressStep,
    setCurrentStep,
    isUserRejection,
    handleCompoundConfirm,
    handleBuyTide,
    ensureAllowance,
    readErc20Balance,
    getSelectedPoolsByMarket,
    getPoolRewardTokens,
    formatTokenAmount,
    runAdvancedPreflight,
    runSimplePreflight,
    handleCompoundAllKeepPerToken,
    handleCompoundAllToSingleToken,
    handleClaimMarketBasicClaim,
    handleClaimMarketCompound,
    handleClaimMarketBuyTide,
  };
}
