"use client";

import React, { useState, useEffect, useMemo } from "react";
import { parseEther, formatEther } from "viem";
import {
  useAccount,
  useContractRead,
  useContractReads,
  useWriteContract,
  usePublicClient,
} from "wagmi";
import { BaseError, ContractFunctionRevertedError } from "viem";
import { ERC20_ABI } from "../config/contracts";
import { stabilityPoolABI } from "@/abis/stabilityPool";
import { aprABI } from "@/abis/apr";
import Image from "next/image";
import SimpleTooltip from "@/components/SimpleTooltip";

// Extended ERC20 ABI with symbol function
const ERC20_ABI_WITH_SYMBOL = [
  ...ERC20_ABI,
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const minterABI = [
  {
    inputs: [
      { name: "collateralIn", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "minPeggedOut", type: "uint256" },
    ],
    name: "mintPeggedToken",
    outputs: [{ type: "uint256", name: "peggedAmount" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "collateralAmount", type: "uint256" }],
    name: "calculateMintPeggedTokenOutput",
    outputs: [{ type: "uint256", name: "peggedAmount" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "peggedIn", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "minCollateralOut", type: "uint256" },
    ],
    name: "redeemPeggedToken",
    outputs: [{ type: "uint256", name: "collateralAmount" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "peggedAmount", type: "uint256" }],
    name: "calculateRedeemPeggedTokenOutput",
    outputs: [{ type: "uint256", name: "collateralAmount" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "peggedTokenPrice",
    outputs: [{ type: "uint256", name: "nav", internalType: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        name: "wrappedCollateralIn",
        type: "uint256",
      },
    ],
    name: "mintPeggedTokenDryRun",
    outputs: [
      { name: "incentiveRatio", type: "int256" },
      { name: "wrappedFee", type: "uint256" },
      { name: "wrappedCollateralTaken", type: "uint256" },
      { name: "peggedMinted", type: "uint256" },
      { name: "price", type: "uint256" },
      { name: "rate", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

interface AnchorDepositWithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  marketId: string;
  market: any;
  initialTab?: TabType;
  onSuccess?: () => void;
  simpleMode?: boolean;
  bestPoolType?: "collateral" | "sail";
  // For simple mode: all markets for the same ha token
  allMarkets?: Array<{ marketId: string; market: any }>;
}

type TabType = "mint" | "deposit" | "withdraw" | "redeem";
type ModalStep =
  | "input"
  | "approving"
  | "minting"
  | "depositing"
  | "withdrawing"
  | "redeeming"
  | "success"
  | "error";

// Helper function to get accepted deposit assets
function getAcceptedDepositAssets(
  collateralSymbol: string
): Array<{ symbol: string; name: string }> {
  const normalized = collateralSymbol.toLowerCase();
  if (normalized === "fxsave") {
    // USD-based markets: fxSAVE, fxUSD, USDC
    return [
      { symbol: "fxSAVE", name: "fxSAVE" },
      { symbol: "fxUSD", name: "fxUSD" },
      { symbol: "USDC", name: "USDC" },
    ];
  } else if (normalized === "wsteth") {
    // ETH-based markets: ETH, stETH, wstETH
    return [
      { symbol: "ETH", name: "Ethereum" },
      { symbol: "stETH", name: "Lido Staked ETH" },
      { symbol: "wstETH", name: "Wrapped Staked ETH" },
    ];
  }
  return [];
}

export const AnchorDepositWithdrawModal = ({
  isOpen,
  onClose,
  marketId,
  market,
  initialTab = "mint",
  onSuccess,
  simpleMode = false,
  bestPoolType = "collateral",
  allMarkets,
}: AnchorDepositWithdrawModalProps) => {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<ModalStep>("input");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [depositInStabilityPool, setDepositInStabilityPool] = useState(true);
  const [stabilityPoolType, setStabilityPoolType] = useState<
    "collateral" | "sail"
  >("collateral");
  const [withdrawFromCollateralPool, setWithdrawFromCollateralPool] =
    useState(false);
  const [withdrawFromSailPool, setWithdrawFromSailPool] = useState(false);
  const [redeemAfterWithdraw, setRedeemAfterWithdraw] = useState(false);

  // Simple mode: deposit asset selection
  const [selectedDepositAsset, setSelectedDepositAsset] = useState<string>("");

  // Simple mode: stability pool selection - now includes marketId and pool type
  const [selectedStabilityPool, setSelectedStabilityPool] = useState<{
    marketId: string;
    poolType: "none" | "collateral" | "sail";
  } | null>(null);

  // Selected market for minting (when multiple markets exist)
  const [selectedMarketId, setSelectedMarketId] = useState<string>(marketId);

  // Selected reward token for filtering pools (simple mode)
  const [selectedRewardToken, setSelectedRewardToken] = useState<string | null>(
    null
  );

  // Step tracking for simple mode (1: deposit token/amount, 2: reward token, 3: stability pool)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Selected redeem asset (collateral asset to redeem to)
  const [selectedRedeemAsset, setSelectedRedeemAsset] = useState<string>("");

  const publicClient = usePublicClient();

  // Get all markets for this ha token (use allMarkets if provided, otherwise just the single market)
  const marketsForToken =
    allMarkets && allMarkets.length > 0 ? allMarkets : [{ marketId, market }];

  // Debug: log markets being used
  useEffect(() => {
    if (isOpen && simpleMode) {
      console.log(
        `[Modal] marketsForToken (${marketsForToken.length}):`,
        marketsForToken.map((m) => ({
          marketId: m.marketId,
          marketName: m.market?.name,
          hasAddresses: !!m.market?.addresses,
          collateralSymbol: m.market?.collateral?.symbol,
        }))
      );
    }
  }, [marketsForToken, isOpen, simpleMode]);

  // Get selected market
  const selectedMarket =
    marketsForToken.find((m) => m.marketId === selectedMarketId)?.market ||
    market;

  // Find market for selected deposit asset (in simple mode, deposit asset determines which market to use)
  const marketForDepositAsset = useMemo(() => {
    if (!simpleMode || !selectedDepositAsset) return null;

    // Find the market whose collateral symbol matches the deposit asset
    // or whose accepted deposit assets include the selected asset
    for (const { market: m } of marketsForToken) {
      const collateralSymbol = m?.collateral?.symbol || "";
      const assets = getAcceptedDepositAssets(collateralSymbol);
      if (assets.some((asset) => asset.symbol === selectedDepositAsset)) {
        return m;
      }
    }
    return null;
  }, [selectedDepositAsset, marketsForToken, simpleMode]);

  // Use market for deposit asset if available, otherwise use selected market
  const activeMarketForFees = marketForDepositAsset || selectedMarket;
  const activeMinterAddress = activeMarketForFees?.addresses?.minter;
  const activeCollateralSymbol =
    activeMarketForFees?.collateral?.symbol || collateralSymbol;

  // Collect all unique deposit assets from all markets with their corresponding markets
  const allDepositAssetsWithMarkets = useMemo(() => {
    const assetMap = new Map<
      string,
      {
        symbol: string;
        name: string;
        market: any;
        minterAddress: string | undefined;
      }
    >();
    marketsForToken.forEach(({ market: m }) => {
      const collateralSymbol = m?.collateral?.symbol || "";
      const assets = getAcceptedDepositAssets(collateralSymbol);
      const minterAddr = m?.addresses?.minter;

      assets.forEach((asset) => {
        if (!assetMap.has(asset.symbol)) {
          assetMap.set(asset.symbol, {
            ...asset,
            market: m,
            minterAddress: minterAddr,
          });
        }
      });
    });

    return Array.from(assetMap.values());
  }, [marketsForToken]);

  // For dropdown display, we just need the asset info
  const allDepositAssets = useMemo(() => {
    return allDepositAssetsWithMarkets.map(({ symbol, name }) => ({
      symbol,
      name,
    }));
  }, [allDepositAssetsWithMarkets]);

  // Calculate fees for each deposit asset using a sample amount (1 token)
  const sampleAmountForFeeCalc = "1.0";
  const feeContracts = useMemo(() => {
    if (!simpleMode || !isOpen || activeTab !== "mint") return [];

    // Create contracts array with asset info for mapping
    const contracts: Array<{
      address: `0x${string}`;
      abi: typeof minterABI;
      functionName: "mintPeggedTokenDryRun";
      args: [bigint];
      assetSymbol: string;
    }> = [];

    allDepositAssetsWithMarkets.forEach((asset) => {
      if (
        asset.minterAddress &&
        typeof asset.minterAddress === "string" &&
        asset.minterAddress.startsWith("0x") &&
        asset.minterAddress.length === 42
      ) {
        contracts.push({
          address: asset.minterAddress as `0x${string}`,
          abi: minterABI,
          functionName: "mintPeggedTokenDryRun" as const,
          args: [parseEther(sampleAmountForFeeCalc)] as const,
          assetSymbol: asset.symbol,
        });
      }
    });

    return contracts;
  }, [allDepositAssetsWithMarkets, simpleMode, isOpen, activeTab]);

  const { data: feeDataForAllAssets } = useContractReads({
    contracts: feeContracts.map(({ assetSymbol, ...contract }) => contract),
    allowFailure: true,
    query: {
      enabled:
        feeContracts.length > 0 && isOpen && simpleMode && activeTab === "mint",
      retry: 1,
      refetchInterval: 30000, // Refetch every 30 seconds
    },
  });

  // Map fees to deposit assets using minter address as key
  const depositAssetsWithFees = useMemo(() => {
    // Create a map of asset symbol to fee result
    const feeMap = new Map<string, number | undefined>();

    // Debug: log fee contracts and data
    if (isOpen && simpleMode && activeTab === "mint") {
      console.log("[Modal] Fee calculation debug:", {
        feeContractsCount: feeContracts.length,
        feeContracts: feeContracts.map((c) => ({
          assetSymbol: c.assetSymbol,
          address: c.address,
          args: c.args,
        })),
        feeDataForAllAssets: feeDataForAllAssets,
        feeDataLength: feeDataForAllAssets?.length,
      });
    }

    feeContracts.forEach((contract, index) => {
      const feeResult = feeDataForAllAssets?.[index];
      let feePercentage: number | undefined = undefined;

      // Handle result structure - could be { status: "success", result: T } or just T
      let resultData: any = undefined;
      if (feeResult) {
        // Check if it has a status field (from allowFailure: true)
        if ("status" in feeResult && feeResult.status === "success") {
          resultData = feeResult.result;
        } else if ("status" in feeResult && feeResult.status === "failure") {
          console.warn(
            `[Modal] Failed to fetch fee for ${contract.assetSymbol}:`,
            feeResult.error
          );
          feeMap.set(contract.assetSymbol, undefined);
          return; // Skip to next contract
        } else if (!("status" in feeResult)) {
          // No status field, assume it's the result directly
          resultData = feeResult;
        }
      }

      // Process the result data
      if (resultData && Array.isArray(resultData) && resultData.length >= 2) {
        const wrappedFee = resultData[1] as bigint;
        const inputAmount = parseEther(sampleAmountForFeeCalc);
        if (inputAmount > 0n) {
          // Calculate fee percentage even if wrappedFee is 0 (to show 0%)
          feePercentage = (Number(wrappedFee) / Number(inputAmount)) * 100;
        }
        if (isOpen && simpleMode && activeTab === "mint") {
          console.log(`[Modal] Fee for ${contract.assetSymbol}:`, {
            wrappedFee: wrappedFee.toString(),
            inputAmount: inputAmount.toString(),
            feePercentage,
          });
        }
      } else if (isOpen && simpleMode && activeTab === "mint") {
        console.warn(
          `[Modal] Fee result for ${contract.assetSymbol} is invalid:`,
          {
            hasResult: !!feeResult,
            resultType: typeof feeResult,
            resultData: resultData,
            isArray: Array.isArray(resultData),
            length: Array.isArray(resultData) ? resultData.length : undefined,
          }
        );
      }

      // Map by asset symbol to match back to assets
      feeMap.set(contract.assetSymbol, feePercentage);
    });

    // Map fees back to assets
    const result = allDepositAssetsWithMarkets.map((asset) => ({
      ...asset,
      feePercentage: feeMap.get(asset.symbol),
    }));

    // Debug logging
    if (isOpen && simpleMode && activeTab === "mint") {
      console.log("[Modal] Deposit assets with fees:", {
        totalAssets: result.length,
        assetsWithFees: result.filter((a) => a.feePercentage !== undefined)
          .length,
        assets: result.map((a) => ({
          symbol: a.symbol,
          fee: a.feePercentage,
          minterAddress: a.minterAddress,
        })),
        feeContracts: feeContracts.length,
        feeDataLength: feeDataForAllAssets?.length,
      });
    }

    return result;
  }, [
    allDepositAssetsWithMarkets,
    feeDataForAllAssets,
    feeContracts,
    isOpen,
    simpleMode,
    activeTab,
  ]);

  // Collect all stability pools from all markets
  const allStabilityPools = useMemo(() => {
    const pools: Array<{
      marketId: string;
      market: any;
      poolType: "collateral" | "sail";
      address: `0x${string}`;
      marketName: string;
    }> = [];

    marketsForToken.forEach(({ marketId, market: m }) => {
      const marketName = m?.name || marketId;

      // Debug: log market structure
      if (isOpen && simpleMode) {
        console.log(`[Modal] Market ${marketId}:`, {
          hasAddresses: !!m?.addresses,
          addresses: m?.addresses,
          hasStabilityPoolCollateral: !!m?.addresses?.stabilityPoolCollateral,
          hasStabilityPoolLeveraged: !!m?.addresses?.stabilityPoolLeveraged,
        });
      }

      if (m?.addresses?.stabilityPoolCollateral) {
        pools.push({
          marketId,
          market: m,
          poolType: "collateral",
          address: m.addresses.stabilityPoolCollateral as `0x${string}`,
          marketName,
        });
      }
      if (m?.addresses?.stabilityPoolLeveraged) {
        pools.push({
          marketId,
          market: m,
          poolType: "sail",
          address: m.addresses.stabilityPoolLeveraged as `0x${string}`,
          marketName,
        });
      }
    });

    // Debug: log collected pools
    if (isOpen && simpleMode) {
      console.log(`[Modal] Collected ${pools.length} stability pools:`, pools);
    }

    return pools;
  }, [marketsForToken, isOpen, simpleMode]);

  const minterAddress = selectedMarket?.addresses?.minter;
  const collateralAddress = selectedMarket?.addresses?.collateralToken;
  const peggedTokenAddress = selectedMarket?.addresses?.peggedToken;
  const collateralSymbol = selectedMarket?.collateral?.symbol || "ETH";
  const peggedTokenSymbol = selectedMarket?.peggedToken?.symbol || "ha";

  // Validate minter address
  const isValidMinterAddress =
    minterAddress &&
    typeof minterAddress === "string" &&
    minterAddress.startsWith("0x") &&
    minterAddress.length === 42;

  // Get stability pool address based on selected type
  // In simple mode, use selectedStabilityPool; otherwise use depositInStabilityPool and stabilityPoolType
  const stabilityPoolAddress = (() => {
    if (activeTab === "deposit") {
      return stabilityPoolType === "collateral"
        ? (selectedMarket?.addresses?.stabilityPoolCollateral as
            | `0x${string}`
            | undefined)
        : (selectedMarket?.addresses?.stabilityPoolLeveraged as
            | `0x${string}`
            | undefined);
    }
    if (activeTab === "mint") {
      if (simpleMode) {
        // In simple mode, use selectedStabilityPool (which now includes marketId)
        if (!selectedStabilityPool || selectedStabilityPool.poolType === "none")
          return undefined;
        const poolMarket = marketsForToken.find(
          (m) => m.marketId === selectedStabilityPool.marketId
        )?.market;
        if (!poolMarket) return undefined;
        return selectedStabilityPool.poolType === "collateral"
          ? (poolMarket?.addresses?.stabilityPoolCollateral as
              | `0x${string}`
              | undefined)
          : (poolMarket?.addresses?.stabilityPoolLeveraged as
              | `0x${string}`
              | undefined);
      } else {
        // In advanced mode, use depositInStabilityPool and stabilityPoolType
        return depositInStabilityPool
          ? stabilityPoolType === "collateral"
            ? (selectedMarket?.addresses?.stabilityPoolCollateral as
                | `0x${string}`
                | undefined)
            : (selectedMarket?.addresses?.stabilityPoolLeveraged as
                | `0x${string}`
                | undefined)
          : undefined;
      }
    }
    return undefined;
  })();

  // Contract read hooks - collateral balance for mint, pegged balance for deposit/withdraw
  const { data: collateralBalanceData } = useContractRead({
    address: collateralAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled:
        !!address && !!collateralAddress && isOpen && activeTab === "mint",
      refetchInterval: 5000,
      retry: 1,
      allowFailure: true,
    },
  });

  const { data: peggedBalanceData } = useContractRead({
    address: peggedTokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled:
        !!address &&
        !!peggedTokenAddress &&
        isOpen &&
        (activeTab === "deposit" || activeTab === "withdraw"),
      refetchInterval: 5000,
      retry: 1,
      allowFailure: true,
    },
  });

  // Get stability pool balances for withdraw
  const collateralPoolAddress = selectedMarket?.addresses
    ?.stabilityPoolCollateral as `0x${string}` | undefined;
  const sailPoolAddress = selectedMarket?.addresses?.stabilityPoolLeveraged as
    | `0x${string}`
    | undefined;

  const { data: collateralPoolBalanceData } = useContractRead({
    address: collateralPoolAddress,
    abi: stabilityPoolABI,
    functionName: "assetBalanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled:
        !!address &&
        !!collateralPoolAddress &&
        isOpen &&
        activeTab === "withdraw",
      refetchInterval: 5000,
      retry: 1,
      allowFailure: true,
    },
  });

  const { data: sailPoolBalanceData } = useContractRead({
    address: sailPoolAddress,
    abi: stabilityPoolABI,
    functionName: "assetBalanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled:
        !!address && !!sailPoolAddress && isOpen && activeTab === "withdraw",
      refetchInterval: 5000,
      retry: 1,
      allowFailure: true,
    },
  });

  // Get user's current deposit (pegged token balance) for mint tab
  const { data: currentDepositData } = useContractRead({
    address: peggedTokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled:
        !!address && !!peggedTokenAddress && isOpen && activeTab === "mint",
      refetchInterval: 5000,
      retry: 1,
      allowFailure: true,
    },
  });

  // Get pegged token price to calculate USD value
  const { data: peggedTokenPrice } = useContractRead({
    address: minterAddress as `0x${string}`,
    abi: minterABI,
    functionName: "peggedTokenPrice",
    query: {
      enabled:
        !!minterAddress &&
        isValidMinterAddress &&
        isOpen &&
        (activeTab === "mint" || activeTab === "deposit"),
      retry: 1,
      allowFailure: true,
    },
  });

  // Fetch data for all stability pools from all markets (for simple mode)
  const poolContracts = useMemo(() => {
    if (!simpleMode || activeTab !== "mint" || !isOpen) return [];

    const contracts: any[] = [];
    allStabilityPools.forEach((pool) => {
      const isValidAddress =
        pool.address &&
        typeof pool.address === "string" &&
        pool.address.startsWith("0x") &&
        pool.address.length === 42;

      if (isValidAddress) {
        // APR
        contracts.push({
          address: pool.address,
          abi: aprABI,
          functionName: "getAPRBreakdown",
          args: address
            ? [address as `0x${string}`]
            : ["0x0000000000000000000000000000000000000000"],
        });
        // TVL
        contracts.push({
          address: pool.address,
          abi: stabilityPoolABI,
          functionName: "totalAssetSupply",
        });
        // Reward tokens
        contracts.push({
          address: pool.address,
          abi: stabilityPoolABI,
          functionName: "GAUGE_REWARD_TOKEN",
        });
        contracts.push({
          address: pool.address,
          abi: stabilityPoolABI,
          functionName: "LIQUIDATION_TOKEN",
        });
      }
    });
    return contracts;
  }, [allStabilityPools, simpleMode, activeTab, isOpen, address]);

  const { data: allPoolData } = useContractReads({
    contracts: poolContracts,
    query: {
      enabled: poolContracts.length > 0,
      refetchInterval: 30000,
      retry: 1,
      allowFailure: true,
    },
  });

  // Map pool data to pools (4 reads per pool: APR, TVL, gaugeRewardToken, liquidationToken)
  const poolsWithData = useMemo(() => {
    if (!allPoolData || allPoolData.length === 0) {
      if (isOpen && simpleMode) {
        console.log(
          "[Modal] No pool data available. allPoolData:",
          allPoolData,
          "allStabilityPools:",
          allStabilityPools
        );
      }
      return allStabilityPools.map((pool) => ({
        ...pool,
        apr: undefined,
        tvl: undefined,
        rewardTokens: [],
      }));
    }

    return allStabilityPools.map((pool, index) => {
      const baseIndex = index * 4;
      const aprData = allPoolData[baseIndex]?.result as
        | [bigint, bigint]
        | undefined;
      const tvl = allPoolData[baseIndex + 1]?.result as bigint | undefined;
      const gaugeRewardToken = allPoolData[baseIndex + 2]?.result as
        | `0x${string}`
        | undefined;
      const liquidationToken = allPoolData[baseIndex + 3]?.result as
        | `0x${string}`
        | undefined;

      // Debug logging
      if (isOpen && simpleMode) {
        console.log(`[Modal] Pool ${pool.marketId}-${pool.poolType}:`, {
          baseIndex,
          aprData: aprData ? "exists" : "missing",
          tvl: tvl ? formatEther(tvl) : "missing",
          gaugeRewardToken,
          liquidationToken,
          aprDataStatus: allPoolData[baseIndex]?.status,
          tvlStatus: allPoolData[baseIndex + 1]?.status,
          gaugeTokenStatus: allPoolData[baseIndex + 2]?.status,
          liquidationTokenStatus: allPoolData[baseIndex + 3]?.status,
        });
      }

      const apr =
        aprData && Array.isArray(aprData) && aprData.length >= 2
          ? (Number(aprData[0]) / 1e16) * 100 +
            (Number(aprData[1]) / 1e16) * 100
          : undefined;

      return {
        ...pool,
        apr,
        tvl,
        gaugeRewardToken,
        liquidationToken,
      };
    });
  }, [allPoolData, allStabilityPools, isOpen, simpleMode]);

  // Fetch reward token symbols for all pools
  const rewardTokenAddresses = useMemo(() => {
    const addresses: `0x${string}`[] = [];
    poolsWithData.forEach((pool) => {
      if (
        pool.gaugeRewardToken &&
        pool.gaugeRewardToken !== "0x0000000000000000000000000000000000000000"
      ) {
        addresses.push(pool.gaugeRewardToken);
      }
      if (
        pool.liquidationToken &&
        pool.liquidationToken !== "0x0000000000000000000000000000000000000000"
      ) {
        addresses.push(pool.liquidationToken);
      }
    });
    const uniqueAddresses = [...new Set(addresses)]; // Remove duplicates

    // Debug logging
    if (isOpen && simpleMode) {
      console.log("[Modal] Reward token addresses:", {
        total: uniqueAddresses.length,
        addresses: uniqueAddresses,
        fromPools: poolsWithData.map((p) => ({
          pool: `${p.marketId}-${p.poolType}`,
          gauge: p.gaugeRewardToken,
          liquidation: p.liquidationToken,
        })),
      });
    }

    return uniqueAddresses;
  }, [poolsWithData, isOpen, simpleMode]);

  const { data: rewardTokenSymbols } = useContractReads({
    contracts: rewardTokenAddresses.map((addr) => ({
      address: addr,
      abi: ERC20_ABI_WITH_SYMBOL,
      functionName: "symbol",
    })),
    query: {
      enabled:
        rewardTokenAddresses.length > 0 &&
        isOpen &&
        simpleMode &&
        activeTab === "mint",
      retry: 1,
      allowFailure: true,
    },
  });

  // Create a map of reward token addresses to symbols
  const rewardTokenSymbolMap = useMemo(() => {
    const map = new Map<string, string>();
    rewardTokenAddresses.forEach((addr, index) => {
      const symbol = rewardTokenSymbols?.[index]?.result as string | undefined;
      const status = rewardTokenSymbols?.[index]?.status;

      // Debug logging
      if (isOpen && simpleMode) {
        console.log(`[Modal] Reward token symbol fetch for ${addr}:`, {
          symbol,
          status,
          hasResult: !!rewardTokenSymbols?.[index]?.result,
        });
      }

      if (symbol) map.set(addr.toLowerCase(), symbol);
    });

    // Debug logging
    if (isOpen && simpleMode) {
      console.log("[Modal] Reward token symbol map:", {
        size: map.size,
        entries: Array.from(map.entries()),
      });
    }

    return map;
  }, [rewardTokenAddresses, rewardTokenSymbols, isOpen, simpleMode]);

  // Add symbols to pools (combine config reward tokens with fetched ones)
  const poolsWithSymbols = useMemo(() => {
    return poolsWithData.map((pool) => {
      // Get reward tokens from market config (default is collateral)
      const marketConfig = pool.market;
      const configRewardTokens = marketConfig?.rewardTokens?.default || [];
      const configAdditionalRewardTokens =
        marketConfig?.rewardTokens?.additional || [];
      const allConfigRewardTokens = [
        ...configRewardTokens,
        ...configAdditionalRewardTokens,
      ];

      // Get reward tokens from contract reads (if any)
      const contractRewardTokens = [
        pool.gaugeRewardToken
          ? rewardTokenSymbolMap.get(pool.gaugeRewardToken.toLowerCase())
          : undefined,
        pool.liquidationToken
          ? rewardTokenSymbolMap.get(pool.liquidationToken.toLowerCase())
          : undefined,
      ].filter((s): s is string => !!s);

      // Combine config and contract reward tokens, removing duplicates
      const allRewardTokens = [
        ...new Set([...allConfigRewardTokens, ...contractRewardTokens]),
      ];

      return {
        ...pool,
        rewardTokens: allRewardTokens,
      };
    });
  }, [poolsWithData, rewardTokenSymbolMap]);

  // Get all unique reward tokens from all pools with max APR for each
  const rewardTokenOptions = useMemo(() => {
    const tokenMap = new Map<
      string,
      { maxAPR: number | undefined; pools: typeof poolsWithSymbols }
    >();

    poolsWithSymbols.forEach((pool) => {
      pool.rewardTokens.forEach((token) => {
        if (!tokenMap.has(token)) {
          tokenMap.set(token, { maxAPR: undefined, pools: [] });
        }
        const tokenData = tokenMap.get(token)!;
        tokenData.pools.push(pool);
        // Use pool.apr if it's defined and (maxAPR is undefined or pool.apr is greater)
        if (pool.apr !== undefined && !isNaN(pool.apr)) {
          if (tokenData.maxAPR === undefined || pool.apr > tokenData.maxAPR) {
            tokenData.maxAPR = pool.apr;
          }
        }
      });
    });

    const options = Array.from(tokenMap.entries())
      .map(([token, data]) => ({
        token,
        maxAPR: data.maxAPR ?? 0, // Default to 0 if undefined for sorting
        maxAPRValue: data.maxAPR, // Keep original undefined for display
        poolCount: data.pools.length,
      }))
      .sort((a, b) => (b.maxAPR ?? 0) - (a.maxAPR ?? 0)); // Sort by max APR descending

    // Debug logging
    if (isOpen && simpleMode) {
      console.log("[Modal] Reward token options:", {
        total: options.length,
        options: options.map((opt) => ({
          token: opt.token,
          maxAPR: opt.maxAPRValue,
          poolCount: opt.poolCount,
        })),
        poolsWithSymbols: poolsWithSymbols.map((p) => ({
          pool: `${p.marketId}-${p.poolType}`,
          apr: p.apr,
          rewardTokens: p.rewardTokens,
        })),
      });
    }

    return options.map(({ maxAPRValue, ...rest }) => ({
      ...rest,
      maxAPR: maxAPRValue,
    }));
  }, [poolsWithSymbols, isOpen, simpleMode]);

  // Filter pools by selected reward token
  const filteredPools = useMemo(() => {
    if (!selectedRewardToken) return [];
    return poolsWithSymbols.filter((pool) =>
      pool.rewardTokens.includes(selectedRewardToken)
    );
  }, [poolsWithSymbols, selectedRewardToken]);

  // Get APR for selected stability pool (advanced mode)
  const isValidStabilityPoolAddress =
    stabilityPoolAddress &&
    typeof stabilityPoolAddress === "string" &&
    stabilityPoolAddress.startsWith("0x") &&
    stabilityPoolAddress.length === 42;
  const { data: aprData } = useContractRead({
    address: isValidStabilityPoolAddress ? stabilityPoolAddress : undefined,
    abi: aprABI,
    functionName: "getAPRBreakdown",
    args: address
      ? [address as `0x${string}`]
      : ["0x0000000000000000000000000000000000000000"],
    query: {
      enabled:
        !!isValidStabilityPoolAddress &&
        isOpen &&
        !simpleMode &&
        ((activeTab === "mint" && depositInStabilityPool) ||
          activeTab === "deposit"),
      refetchInterval: 30000,
      retry: 1,
      allowFailure: true,
    },
  });

  // Format APR
  const formatAPR = (apr: number): string => {
    if (apr === 0) return "0.00%";
    if (apr < 0.01) return "<0.01%";
    if (apr > 1000) return ">1000%";
    return `${apr.toFixed(2)}%`;
  };

  // Calculate total APR from breakdown
  const stabilityPoolAPR =
    aprData && Array.isArray(aprData) && aprData.length >= 2
      ? (Number(aprData[0]) / 1e16) * 100 + (Number(aprData[1]) / 1e16) * 100
      : 0;

  // Check allowance for collateral to minter (for mint tab)
  const { data: allowanceData, refetch: refetchAllowance } = useContractRead({
    address: collateralAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "allowance",
    args:
      address && minterAddress
        ? [address, minterAddress as `0x${string}`]
        : undefined,
    query: {
      enabled:
        !!address &&
        !!collateralAddress &&
        !!minterAddress &&
        isValidMinterAddress &&
        isOpen &&
        activeTab === "mint",
      refetchInterval: 5000,
      retry: 1,
      allowFailure: true,
    },
  });

  // Check allowance for pegged token to stability pool (for mint tab if depositing to stability pool, or for deposit tab)
  const {
    data: peggedTokenAllowanceData,
    refetch: refetchPeggedTokenAllowance,
  } = useContractRead({
    address: peggedTokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "allowance",
    args:
      address && stabilityPoolAddress
        ? [address, stabilityPoolAddress]
        : undefined,
    query: {
      enabled:
        !!address &&
        !!peggedTokenAddress &&
        !!stabilityPoolAddress &&
        isOpen &&
        ((activeTab === "mint" && depositInStabilityPool) ||
          activeTab === "deposit"),
      refetchInterval: 5000,
      retry: 1,
      allowFailure: true,
    },
  });

  // Calculate expected output based on active tab
  const { data: expectedMintOutput } = useContractRead({
    address: minterAddress as `0x${string}`,
    abi: minterABI,
    functionName: "calculateMintPeggedTokenOutput",
    args: amount && activeTab === "mint" ? [parseEther(amount)] : undefined,
    query: {
      enabled:
        !!minterAddress &&
        isValidMinterAddress &&
        !!amount &&
        parseFloat(amount) > 0 &&
        isOpen &&
        activeTab === "mint",
      retry: 1,
      allowFailure: true,
    },
  });

  // Calculate expected redeem output - need to check if withdrawing from stability pool or ha tokens
  // If from stability pool, we need to withdraw first to get pegged tokens, then redeem
  // If from ha tokens, we can redeem directly
  // Get minter address for selected redeem asset
  const selectedRedeemMarket = useMemo(() => {
    const assetSymbol = selectedRedeemAsset || collateralSymbol;
    return marketsForToken.find(
      ({ market: m }) => m?.collateral?.symbol === assetSymbol
    );
  }, [selectedRedeemAsset, collateralSymbol, marketsForToken]);

  const redeemMinterAddress = selectedRedeemMarket?.market?.addresses?.minter;
  const isValidRedeemMinterAddress =
    redeemMinterAddress &&
    typeof redeemMinterAddress === "string" &&
    redeemMinterAddress.startsWith("0x") &&
    redeemMinterAddress.length === 42;

  const { data: expectedRedeemOutput } = useContractRead({
    address: isValidRedeemMinterAddress
      ? (redeemMinterAddress as `0x${string}`)
      : isValidMinterAddress
      ? (minterAddress as `0x${string}`)
      : undefined,
    abi: minterABI,
    functionName: "calculateRedeemPeggedTokenOutput",
    args:
      amount && (activeTab === "withdraw" || activeTab === "redeem")
        ? [parseEther(amount)]
        : undefined,
    query: {
      enabled:
        (!!isValidRedeemMinterAddress || !!isValidMinterAddress) &&
        !!amount &&
        parseFloat(amount) > 0 &&
        isOpen &&
        (activeTab === "withdraw" || activeTab === "redeem"),
      retry: 1,
      allowFailure: true,
    },
  });

  // Calculate redeem fee (similar to mint fee)
  // The fee is the difference between input and output
  const redeemFeePercentage = useMemo(() => {
    if (!expectedRedeemOutput || !amount || parseFloat(amount) === 0)
      return undefined;
    const inputAmount = parseEther(amount);
    if (inputAmount === 0n) return undefined;
    // Fee = (input - output) / input * 100
    const fee = inputAmount - expectedRedeemOutput;
    return (Number(fee) / Number(inputAmount)) * 100;
  }, [expectedRedeemOutput, amount]);

  // Get fee information from dry run (for both simple and advanced modes)
  // In simple mode, use the market corresponding to the selected deposit asset
  const feeMinterAddress =
    simpleMode && activeMarketForFees ? activeMinterAddress : minterAddress;
  const isValidFeeMinterAddress =
    feeMinterAddress &&
    typeof feeMinterAddress === "string" &&
    feeMinterAddress.startsWith("0x") &&
    feeMinterAddress.length === 42;

  const { data: dryRunData } = useContractRead({
    address: feeMinterAddress as `0x${string}`,
    abi: minterABI,
    functionName: "mintPeggedTokenDryRun",
    args: amount && activeTab === "mint" ? [parseEther(amount)] : undefined,
    query: {
      enabled:
        !!isValidFeeMinterAddress &&
        !!amount &&
        parseFloat(amount) > 0 &&
        isOpen &&
        activeTab === "mint",
      retry: 1,
      allowFailure: true,
    },
  });

  // Get minter address for the selected stability pool's market (for collateral ratio display)
  const stabilityPoolMarket = useMemo(() => {
    if (!selectedStabilityPool || !simpleMode) return null;
    return marketsForToken.find(
      (m) => m.marketId === selectedStabilityPool.marketId
    )?.market;
  }, [selectedStabilityPool, marketsForToken, simpleMode]);

  const stabilityPoolMinterAddress = stabilityPoolMarket?.addresses?.minter;
  const isValidStabilityPoolMinter =
    stabilityPoolMinterAddress &&
    typeof stabilityPoolMinterAddress === "string" &&
    stabilityPoolMinterAddress.startsWith("0x") &&
    stabilityPoolMinterAddress.length === 42;

  // Fetch collateral ratio for the stability pool's market (only when pool is selected)
  const { data: collateralRatioData } = useContractRead({
    address: stabilityPoolMinterAddress as `0x${string}`,
    abi: minterABI,
    functionName: "collateralRatio",
    query: {
      enabled:
        !!isValidStabilityPoolMinter &&
        isOpen &&
        simpleMode &&
        activeTab === "mint" &&
        !!selectedStabilityPool,
      retry: 1,
      allowFailure: true,
    },
  });

  // Fetch config to get minimum collateral ratio for the stability pool's market
  const { data: minterConfigData } = useContractRead({
    address: stabilityPoolMinterAddress as `0x${string}`,
    abi: minterABI,
    functionName: "config",
    query: {
      enabled:
        !!isValidStabilityPoolMinter &&
        isOpen &&
        simpleMode &&
        activeTab === "mint" &&
        !!selectedStabilityPool,
      retry: 1,
      allowFailure: true,
    },
  });

  // Extract minimum collateral ratio from config (typically in the first band upper bound)
  const minCollateralRatio = useMemo(() => {
    if (!minterConfigData) return undefined;
    const config = minterConfigData as any;
    // Minimum collateral ratio is typically the first band upper bound
    const bands =
      config?.mintPeggedIncentiveConfig?.collateralRatioBandUpperBounds;
    if (bands && Array.isArray(bands) && bands.length > 0) {
      return bands[0] as bigint;
    }
    return undefined;
  }, [minterConfigData]);

  // Format collateral ratio as percentage
  const formatCollateralRatio = (ratio: bigint | undefined): string => {
    if (!ratio) return "-";
    // Collateral ratio is typically stored as a value where 1e18 = 100%
    return `${(Number(ratio) / 1e16).toFixed(2)}%`;
  };

  // Calculate fee percentage
  const feePercentage = useMemo(() => {
    if (!dryRunData || !amount || parseFloat(amount) === 0) return undefined;
    const dryRunResult = dryRunData as
      | [bigint, bigint, bigint, bigint, bigint, bigint]
      | undefined;
    if (!dryRunResult || dryRunResult.length < 2) return undefined;
    const wrappedFee = dryRunResult[1];
    const inputAmount = parseEther(amount);
    if (inputAmount === 0n) return undefined;
    return (Number(wrappedFee) / Number(inputAmount)) * 100;
  }, [dryRunData, amount]);

  // Contract write hooks
  const { writeContractAsync } = useWriteContract();

  const collateralBalance = collateralBalanceData || 0n;
  const peggedBalance = peggedBalanceData || 0n;
  const collateralPoolBalance = collateralPoolBalanceData || 0n;
  const sailPoolBalance = sailPoolBalanceData || 0n;
  const totalStabilityPoolBalance = collateralPoolBalance + sailPoolBalance;
  const allowance = allowanceData || 0n;
  const peggedTokenAllowance = peggedTokenAllowanceData || 0n;
  const amountBigInt = amount ? parseEther(amount) : 0n;
  const needsApproval =
    activeTab === "mint" && amountBigInt > 0 && amountBigInt > allowance;
  const needsPeggedTokenApproval =
    (activeTab === "mint" &&
      depositInStabilityPool &&
      expectedMintOutput &&
      expectedMintOutput > peggedTokenAllowance) ||
    (activeTab === "deposit" &&
      amountBigInt > 0 &&
      amountBigInt > peggedTokenAllowance);
  const currentDeposit = currentDepositData || 0n;

  // Auto-select pools to withdraw from based on holdings
  useEffect(() => {
    if (activeTab === "withdraw" && isOpen) {
      // Auto-select pools that have balances
      if (collateralPoolBalance > 0n) {
        setWithdrawFromCollateralPool(true);
      }
      if (sailPoolBalance > 0n) {
        setWithdrawFromSailPool(true);
      }
    } else if (activeTab !== "withdraw") {
      // Reset when switching away from withdraw tab
      setWithdrawFromCollateralPool(false);
      setWithdrawFromSailPool(false);
      setRedeemAfterWithdraw(false);
    }
  }, [activeTab, isOpen, collateralPoolBalance, sailPoolBalance]);

  // Get available balance based on active tab
  const getAvailableBalance = (): bigint => {
    if (activeTab === "mint") {
      return collateralBalance;
    } else if (activeTab === "deposit") {
      return peggedBalance;
    } else if (activeTab === "withdraw") {
      // For withdraw, sum up balances from selected pools
      let total = 0n;
      if (withdrawFromCollateralPool) total += collateralPoolBalance;
      if (withdrawFromSailPool) total += sailPoolBalance;
      return total;
    } else {
      // For redeem, use pegged token balance
      return peggedBalance;
    }
  };

  // Calculate current deposit USD value and ledger marks per day
  const currentDepositUSD =
    peggedTokenPrice && currentDeposit
      ? (Number(currentDeposit) * Number(peggedTokenPrice)) / 1e36
      : 0;
  const currentLedgerMarksPerDay = currentDepositUSD;

  // Calculate expected ledger marks per day after deposit
  const expectedDepositUSD =
    expectedMintOutput && peggedTokenPrice
      ? (Number(expectedMintOutput) * Number(peggedTokenPrice)) / 1e36
      : 0;
  const newTotalDepositUSD = currentDepositUSD + expectedDepositUSD;
  const newLedgerMarksPerDay = newTotalDepositUSD;

  // Update active tab when initialTab prop changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setAmount("");
      setStep("input");
      setError(null);
      setTxHash(null);
      if (initialTab === "mint") {
        // In simple mode, use step-by-step flow
        if (simpleMode) {
          setCurrentStep(1);
          setSelectedDepositAsset(collateralSymbol);
          // Don't pre-select pools in step-by-step mode - let user choose
          setSelectedStabilityPool(null);
          setDepositInStabilityPool(false);
          setSelectedRewardToken(null);
        } else {
          setDepositInStabilityPool(true);
          setStabilityPoolType("collateral");
        }
      } else if (initialTab === "deposit") {
        setStabilityPoolType(simpleMode ? bestPoolType : "collateral");
      } else if (initialTab === "redeem") {
        // Initialize selected redeem asset to the current market's collateral
        setSelectedRedeemAsset(collateralSymbol);
      }
    }
  }, [
    isOpen,
    initialTab,
    simpleMode,
    bestPoolType,
    collateralSymbol,
    marketId,
    marketsForToken,
  ]);

  // Auto-select collateral pool when entering Step 3
  useEffect(() => {
    if (
      currentStep === 3 &&
      selectedRewardToken &&
      filteredPools.length > 0 &&
      !selectedStabilityPool
    ) {
      // Find the first collateral pool
      const collateralPool = filteredPools.find(
        (pool) => pool.poolType === "collateral"
      );
      // If no collateral pool, select the first pool
      const poolToSelect = collateralPool || filteredPools[0];
      if (poolToSelect) {
        setSelectedStabilityPool({
          marketId: poolToSelect.marketId,
          poolType: poolToSelect.poolType,
        });
        setDepositInStabilityPool(true);
        setStabilityPoolType(poolToSelect.poolType);
        setSelectedMarketId(poolToSelect.marketId);
      }
    }
  }, [currentStep, selectedRewardToken, filteredPools, selectedStabilityPool]);

  const handleClose = () => {
    if (
      step === "approving" ||
      step === "minting" ||
      step === "depositing" ||
      step === "withdrawing"
    )
      return;
    setAmount("");
    setStep("input");
    setError(null);
    setTxHash(null);
    setRedeemAfterWithdraw(false);
    if (activeTab === "mint") {
      setDepositInStabilityPool(true);
      setStabilityPoolType("collateral");
    }
    onClose();
  };

  const handleTabChange = (tab: TabType) => {
    if (
      step === "approving" ||
      step === "minting" ||
      step === "depositing" ||
      step === "withdrawing"
    )
      return;
    setActiveTab(tab);
    setAmount("");
    setStep("input");
    setError(null);
    setTxHash(null);
    if (tab === "mint") {
      setDepositInStabilityPool(true);
      setStabilityPoolType("collateral");
    }
  };

  const handleMaxClick = () => {
    if (activeTab === "mint" && collateralBalance) {
      setAmount(formatEther(collateralBalance));
    } else if (activeTab === "deposit" && peggedBalance) {
      setAmount(formatEther(peggedBalance));
    } else if (activeTab === "withdraw") {
      const total = getAvailableBalance();
      if (total > 0n) {
        setAmount(formatEther(total));
      }
    } else if (activeTab === "redeem" && peggedBalance) {
      setAmount(formatEther(peggedBalance));
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      setError(null);
    }
  };

  const validateAmount = (): boolean => {
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return false;
    }
    if (activeTab === "mint" && amountBigInt > collateralBalance) {
      setError("Insufficient balance");
      return false;
    }
    if (activeTab === "deposit" && amountBigInt > peggedBalance) {
      setError("Insufficient balance");
      return false;
    }
    if (activeTab === "withdraw") {
      const sourceBalance = getAvailableBalance();
      if (amountBigInt > sourceBalance) {
        setError("Insufficient balance");
        return false;
      }
    }
    return true;
  };

  const handleMint = async () => {
    if (!validateAmount() || !address || !minterAddress) return;

    try {
      // Step 1: Approve collateral token for minter (if needed)
      if (needsApproval) {
        setStep("approving");
        setError(null);
        setTxHash(null);
        const approveHash = await writeContractAsync({
          address: collateralAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [minterAddress as `0x${string}`, amountBigInt],
        });
        setTxHash(approveHash);
        await publicClient?.waitForTransactionReceipt({ hash: approveHash });
        await refetchAllowance();
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await refetchAllowance();
      }

      // Step 2: Mint pegged token
      setStep("minting");
      setError(null);
      setTxHash(null);

      // Calculate minimum output (with 1% slippage tolerance)
      const minPeggedOut = expectedMintOutput
        ? (expectedMintOutput * 99n) / 100n
        : 0n;

      const mintHash = await writeContractAsync({
        address: minterAddress as `0x${string}`,
        abi: minterABI,
        functionName: "mintPeggedToken",
        args: [amountBigInt, address as `0x${string}`, minPeggedOut],
      });
      setTxHash(mintHash);
      await publicClient?.waitForTransactionReceipt({ hash: mintHash });

      // Refetch to get updated pegged token balance
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 3: If depositing to stability pool, approve and deposit
      if (
        depositInStabilityPool &&
        stabilityPoolAddress &&
        expectedMintOutput
      ) {
        // Check if we need to approve pegged token for stability pool
        if (needsPeggedTokenApproval) {
          setStep("approving");
          setError(null);
          setTxHash(null);
          const approvePeggedHash = await writeContractAsync({
            address: peggedTokenAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [stabilityPoolAddress, expectedMintOutput],
          });
          setTxHash(approvePeggedHash);
          await publicClient?.waitForTransactionReceipt({
            hash: approvePeggedHash,
          });
          await refetchPeggedTokenAllowance();
          await new Promise((resolve) => setTimeout(resolve, 1000));
          await refetchPeggedTokenAllowance();
        }

        // Deposit pegged token to stability pool
        setStep("depositing");
        setError(null);
        setTxHash(null);
        const poolDepositHash = await writeContractAsync({
          address: stabilityPoolAddress,
          abi: stabilityPoolABI,
          functionName: "deposit",
          args: [expectedMintOutput, address as `0x${string}`, 0n],
        });
        setTxHash(poolDepositHash);
        await publicClient?.waitForTransactionReceipt({
          hash: poolDepositHash,
        });
      }

      setStep("success");
      if (onSuccess) {
        await onSuccess();
      }
    } catch (err) {
      console.error("Mint error:", err);
      let errorMessage = "Transaction failed";

      if (err instanceof BaseError) {
        const revertError = err.walk(
          (err) => err instanceof ContractFunctionRevertedError
        );
        if (revertError instanceof ContractFunctionRevertedError) {
          errorMessage = `Contract error: ${
            revertError.data?.errorName || "Unknown error"
          }`;
        } else {
          errorMessage = err.shortMessage || err.message;
        }
      }

      setError(errorMessage);
      setStep("error");
    }
  };

  const handleDeposit = async () => {
    if (!validateAmount() || !address || !stabilityPoolAddress) return;

    try {
      // Step 1: Approve pegged token for stability pool (if needed)
      if (needsPeggedTokenApproval) {
        setStep("approving");
        setError(null);
        setTxHash(null);
        const approveHash = await writeContractAsync({
          address: peggedTokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [stabilityPoolAddress, amountBigInt],
        });
        setTxHash(approveHash);
        await publicClient?.waitForTransactionReceipt({ hash: approveHash });
        await refetchPeggedTokenAllowance();
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await refetchPeggedTokenAllowance();
      }

      // Step 2: Deposit pegged token to stability pool
      setStep("depositing");
      setError(null);
      setTxHash(null);
      const depositHash = await writeContractAsync({
        address: stabilityPoolAddress,
        abi: stabilityPoolABI,
        functionName: "deposit",
        args: [amountBigInt, address as `0x${string}`, 0n],
      });
      setTxHash(depositHash);
      await publicClient?.waitForTransactionReceipt({ hash: depositHash });

      setStep("success");
      if (onSuccess) {
        await onSuccess();
      }
    } catch (err) {
      console.error("Deposit error:", err);
      let errorMessage = "Transaction failed";

      if (err instanceof BaseError) {
        const revertError = err.walk(
          (err) => err instanceof ContractFunctionRevertedError
        );
        if (revertError instanceof ContractFunctionRevertedError) {
          errorMessage = `Contract error: ${
            revertError.data?.errorName || "Unknown error"
          }`;
        } else {
          errorMessage = err.shortMessage || err.message;
        }
      }

      setError(errorMessage);
      setStep("error");
    }
  };

  const handleWithdraw = async () => {
    if (!validateAmount() || !address || !minterAddress) return;

    try {
      setStep("withdrawing");
      setError(null);
      setTxHash(null);

      // Calculate total available from selected pools
      let totalAvailable = 0n;
      if (withdrawFromCollateralPool) totalAvailable += collateralPoolBalance;
      if (withdrawFromSailPool) totalAvailable += sailPoolBalance;

      if (amountBigInt > totalAvailable) {
        throw new Error("Insufficient balance in selected pools");
      }

      // Withdraw from selected pools proportionally
      let remainingAmount = amountBigInt;
      let peggedTokensReceived = 0n;

      // Withdraw from collateral pool if selected
      if (
        withdrawFromCollateralPool &&
        collateralPoolBalance > 0n &&
        remainingAmount > 0n
      ) {
        // Calculate proportional amount or use remaining, whichever is smaller
        const collateralProportion =
          (collateralPoolBalance * amountBigInt) / totalAvailable;
        const withdrawFromCollateral =
          remainingAmount > collateralPoolBalance
            ? collateralPoolBalance
            : collateralProportion > remainingAmount
            ? remainingAmount
            : collateralProportion;

        if (withdrawFromCollateral > 0n) {
          const collateralWithdrawHash = await writeContractAsync({
            address: collateralPoolAddress as `0x${string}`,
            abi: stabilityPoolABI,
            functionName: "withdraw",
            args: [withdrawFromCollateral, address as `0x${string}`, 0n],
          });
          setTxHash(collateralWithdrawHash);
          await publicClient?.waitForTransactionReceipt({
            hash: collateralWithdrawHash,
          });
          peggedTokensReceived += withdrawFromCollateral;
          remainingAmount -= withdrawFromCollateral;
        }
      }

      // Withdraw from sail pool if selected
      if (
        withdrawFromSailPool &&
        sailPoolBalance > 0n &&
        remainingAmount > 0n
      ) {
        // Use remaining amount
        const withdrawFromSail =
          remainingAmount > sailPoolBalance ? sailPoolBalance : remainingAmount;

        if (withdrawFromSail > 0n) {
          const sailWithdrawHash = await writeContractAsync({
            address: sailPoolAddress as `0x${string}`,
            abi: stabilityPoolABI,
            functionName: "withdraw",
            args: [withdrawFromSail, address as `0x${string}`, 0n],
          });
          setTxHash(sailWithdrawHash);
          await publicClient?.waitForTransactionReceipt({
            hash: sailWithdrawHash,
          });
          peggedTokensReceived += withdrawFromSail;
          remainingAmount -= withdrawFromSail;
        }
      }

      // Redeem pegged tokens for collateral (only if checkbox is checked)
      if (redeemAfterWithdraw && peggedTokensReceived > 0n) {
        // Calculate expected collateral output
        const expectedCollateral = (await publicClient?.readContract({
          address: minterAddress,
          abi: minterABI,
          functionName: "calculateRedeemPeggedTokenOutput",
          args: [peggedTokensReceived],
        })) as bigint | undefined;

        if (!expectedCollateral)
          throw new Error("Failed to calculate redeem output");

        const minCollateralOut = (expectedCollateral * 99n) / 100n;

        const redeemHash = await writeContractAsync({
          address: minterAddress as `0x${string}`,
          abi: minterABI,
          functionName: "redeemPeggedToken",
          args: [
            peggedTokensReceived,
            address as `0x${string}`,
            minCollateralOut,
          ],
        });
        setTxHash(redeemHash);
        await publicClient?.waitForTransactionReceipt({ hash: redeemHash });
      }

      setStep("success");
      if (onSuccess) {
        await onSuccess();
      }
    } catch (err) {
      console.error("Withdraw error:", err);
      let errorMessage = "Transaction failed";

      if (err instanceof BaseError) {
        const revertError = err.walk(
          (err) => err instanceof ContractFunctionRevertedError
        );
        if (revertError instanceof ContractFunctionRevertedError) {
          errorMessage = `Contract error: ${
            revertError.data?.errorName || "Unknown error"
          }`;
        } else {
          errorMessage = err.shortMessage || err.message;
        }
      }

      setError(errorMessage);
      setStep("error");
    }
  };

  const handleRedeem = async () => {
    if (!validateAmount() || !address) return;

    // Use the minter address for the selected redeem asset
    const targetMinterAddress = redeemMinterAddress || minterAddress;
    if (!targetMinterAddress) return;

    try {
      setStep("redeeming");
      setError(null);
      setTxHash(null);

      const minCollateralOut = expectedRedeemOutput
        ? (expectedRedeemOutput * 99n) / 100n
        : 0n;

      const redeemHash = await writeContractAsync({
        address: targetMinterAddress as `0x${string}`,
        abi: minterABI,
        functionName: "redeemPeggedToken",
        args: [amountBigInt, address as `0x${string}`, minCollateralOut],
      });
      setTxHash(redeemHash);
      await publicClient?.waitForTransactionReceipt({ hash: redeemHash });

      setStep("success");
      if (onSuccess) {
        await onSuccess();
      }
    } catch (err) {
      console.error("Redeem error:", err);
      let errorMessage = "Transaction failed";

      if (err instanceof BaseError) {
        const revertError = err.walk(
          (err) => err instanceof ContractFunctionRevertedError
        );
        if (revertError instanceof ContractFunctionRevertedError) {
          errorMessage = `Contract error: ${
            revertError.data?.errorName || "Unknown error"
          }`;
        } else {
          errorMessage = err.shortMessage || err.message;
        }
      }

      setError(errorMessage);
      setStep("error");
    }
  };

  const handleAction = () => {
    if (activeTab === "mint") {
      handleMint();
    } else if (activeTab === "deposit") {
      handleDeposit();
    } else if (activeTab === "withdraw") {
      handleWithdraw();
    } else if (activeTab === "redeem") {
      handleRedeem();
    }
  };

  const getButtonText = () => {
    if (activeTab === "mint") {
      switch (step) {
        case "approving":
          return "Approving...";
        case "minting":
          return "Minting...";
        case "depositing":
          return "Depositing...";
        case "success":
          return "Mint";
        case "error":
          return "Try Again";
        default:
          if (depositInStabilityPool) {
            return needsApproval || needsPeggedTokenApproval
              ? "Approve & Mint & Deposit"
              : "Mint & Deposit";
          }
          return needsApproval ? "Approve & Mint" : "Mint";
      }
    } else if (activeTab === "deposit") {
      switch (step) {
        case "approving":
          return "Approving...";
        case "depositing":
          return "Depositing...";
        case "success":
          return "Deposit";
        case "error":
          return "Try Again";
        default:
          return needsPeggedTokenApproval ? "Approve & Deposit" : "Deposit";
      }
    } else if (activeTab === "withdraw") {
      switch (step) {
        case "withdrawing":
          return "Withdrawing...";
        case "success":
          return "Withdraw";
        case "error":
          return "Try Again";
        default:
          return "Withdraw";
      }
    } else {
      // Redeem tab
      switch (step) {
        case "redeeming":
          return "Redeeming...";
        case "success":
          return "Redeem";
        case "error":
          return "Try Again";
        default:
          return "Redeem";
      }
    }
  };

  const isButtonDisabled = () => {
    if (step === "success") return false;
    if (activeTab === "mint") {
      return (
        step === "approving" ||
        step === "minting" ||
        step === "depositing" ||
        !amount ||
        parseFloat(amount) <= 0
      );
    } else if (activeTab === "deposit") {
      return (
        step === "approving" ||
        step === "depositing" ||
        !amount ||
        parseFloat(amount) <= 0
      );
    } else if (activeTab === "withdraw") {
      const sourceBalance = getAvailableBalance();
      return (
        step === "withdrawing" ||
        !amount ||
        parseFloat(amount) <= 0 ||
        amountBigInt > sourceBalance
      );
    } else {
      // Redeem tab
      return (
        step === "redeeming" ||
        !amount ||
        parseFloat(amount) <= 0 ||
        amountBigInt > peggedBalance
      );
    }
  };

  const isProcessing =
    step === "approving" ||
    step === "minting" ||
    step === "depositing" ||
    step === "withdrawing" ||
    step === "redeeming";
  const balance =
    activeTab === "mint"
      ? collateralBalance
      : activeTab === "deposit"
      ? peggedBalance
      : activeTab === "withdraw"
      ? getAvailableBalance()
      : peggedBalance;
  const balanceSymbol =
    activeTab === "mint" ? collateralSymbol : peggedTokenSymbol;

  // Calculate expected output based on tab
  const expectedOutput =
    activeTab === "mint"
      ? expectedMintOutput
      : activeTab === "deposit"
      ? undefined
      : activeTab === "withdraw" && redeemAfterWithdraw
      ? expectedRedeemOutput
      : activeTab === "redeem"
      ? expectedRedeemOutput
      : undefined;
  const outputSymbol =
    activeTab === "mint"
      ? peggedTokenSymbol
      : activeTab === "deposit"
      ? undefined
      : activeTab === "withdraw" && redeemAfterWithdraw
      ? collateralSymbol
      : activeTab === "withdraw"
      ? peggedTokenSymbol
      : activeTab === "redeem"
      ? selectedRedeemAsset || collateralSymbol
      : undefined;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative bg-white shadow-2xl w-full max-w-md mx-4 animate-in fade-in-0 scale-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-[#1E4775]/20">
          <h2 className="text-2xl font-bold text-[#1E4775]">
            {simpleMode
              ? "Deposit"
              : activeTab === "mint"
              ? "Mint"
              : activeTab === "deposit"
              ? "Deposit"
              : activeTab === "withdraw"
              ? "Withdraw"
              : "Redeem"}
          </h2>
          <button
            onClick={handleClose}
            className="text-[#1E4775]/50 hover:text-[#1E4775] transition-colors"
            disabled={isProcessing}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tabs - Hide in simple mode */}
        {!simpleMode && (
          <div className="flex border-b border-[#1E4775]/20">
            <button
              onClick={() => handleTabChange("mint")}
              disabled={isProcessing}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === "mint"
                  ? "text-[#1E4775] border-b-2 border-[#1E4775]"
                  : "text-[#1E4775]/50 hover:text-[#1E4775]"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Mint
            </button>
            <button
              onClick={() => handleTabChange("deposit")}
              disabled={isProcessing}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === "deposit"
                  ? "text-[#1E4775] border-b-2 border-[#1E4775]"
                  : "text-[#1E4775]/50 hover:text-[#1E4775]"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Deposit
            </button>
            <button
              onClick={() => handleTabChange("withdraw")}
              disabled={isProcessing}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === "withdraw"
                  ? "text-[#1E4775] border-b-2 border-[#1E4775]"
                  : "text-[#1E4775]/50 hover:text-[#1E4775]"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Withdraw
            </button>
            <button
              onClick={() => handleTabChange("redeem")}
              disabled={isProcessing}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === "redeem"
                  ? "text-[#1E4775] border-b-2 border-[#1E4775]"
                  : "text-[#1E4775]/50 hover:text-[#1E4775]"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Redeem
            </button>
          </div>
        )}

        <div className="p-6">
          {simpleMode && activeTab === "mint" ? (
            // Simple Mode: Step-by-Step Flow
            <div className="space-y-6">
              {/* Progress Steps Indicator */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center flex-1">
                  {/* Step 1 */}
                  <div className="flex items-center flex-1">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                        currentStep >= 1
                          ? "bg-[#1E4775] text-white border-[#1E4775]"
                          : "bg-white text-[#1E4775]/30 border-[#1E4775]/30"
                      } font-semibold text-sm`}
                    >
                      {currentStep > 1 ? "✓" : "1"}
                    </div>
                    <div className="flex-1 h-0.5 mx-2 bg-[#1E4775]/20">
                      <div
                        className={`h-full transition-all ${
                          currentStep >= 2
                            ? "bg-[#1E4775] w-full"
                            : "bg-transparent w-0"
                        }`}
                      />
                    </div>
                  </div>
                  {/* Step 2 */}
                  <div className="flex items-center flex-1">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                        currentStep >= 2
                          ? "bg-[#1E4775] text-white border-[#1E4775]"
                          : "bg-white text-[#1E4775]/30 border-[#1E4775]/30"
                      } font-semibold text-sm`}
                    >
                      {currentStep > 2 ? "✓" : "2"}
                    </div>
                    <div className="flex-1 h-0.5 mx-2 bg-[#1E4775]/20">
                      <div
                        className={`h-full transition-all ${
                          currentStep >= 3
                            ? "bg-[#1E4775] w-full"
                            : "bg-transparent w-0"
                        }`}
                      />
                    </div>
                  </div>
                  {/* Step 3 */}
                  <div className="flex items-center">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                        currentStep >= 3
                          ? "bg-[#1E4775] text-white border-[#1E4775]"
                          : "bg-white text-[#1E4775]/30 border-[#1E4775]/30"
                      } font-semibold text-sm`}
                    >
                      3
                    </div>
                  </div>
                </div>
              </div>

              {/* Step Labels */}
              <div className="flex justify-between text-xs text-[#1E4775]/70 mb-4">
                <div
                  className={`flex-1 text-center ${
                    currentStep === 1 ? "text-[#1E4775] font-semibold" : ""
                  }`}
                >
                  Deposit Token & Amount
                </div>
                <div
                  className={`flex-1 text-center ${
                    currentStep === 2 ? "text-[#1E4775] font-semibold" : ""
                  }`}
                >
                  Reward Token
                </div>
                <div
                  className={`flex-1 text-center ${
                    currentStep === 3 ? "text-[#1E4775] font-semibold" : ""
                  }`}
                >
                  Stability Pool
                </div>
              </div>

              {/* Step 1: Deposit Token & Amount */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in-0 slide-in-from-right-2 duration-200">
                  <div className="bg-[#B8EBD5]/20 border border-[#B8EBD5]/40 rounded-lg p-4 mb-4">
                    <h3 className="text-lg font-bold text-[#1E4775] mb-2">
                      Step 1: Choose Your Deposit
                    </h3>
                    <p className="text-sm text-[#1E4775]/80">
                      Select the token you want to deposit and enter the amount.
                      The deposit token determines which market you'll use. All
                      tokens will be converted to the market's collateral token
                      automatically.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-[#1E4775] mb-2">
                        Select Deposit Token
                      </label>
                      <select
                        value={selectedDepositAsset}
                        onChange={(e) =>
                          setSelectedDepositAsset(e.target.value)
                        }
                        disabled={isProcessing}
                        className="w-full px-4 py-3 bg-white text-[#1E4775] border-2 border-[#1E4775]/30 rounded-lg focus:border-[#1E4775] focus:ring-2 focus:ring-[#1E4775]/20 focus:outline-none text-base"
                      >
                        {depositAssetsWithFees.map((asset) => (
                          <option key={asset.symbol} value={asset.symbol}>
                            {asset.name} ({asset.symbol})
                            {asset.feePercentage !== undefined
                              ? ` - ${asset.feePercentage.toFixed(
                                  2
                                )}% estimated fee`
                              : " - Fee: -"}
                          </option>
                        ))}
                      </select>
                      {selectedDepositAsset &&
                        selectedDepositAsset !== activeCollateralSymbol && (
                          <p className="mt-2 text-xs text-[#1E4775]/60 flex items-center gap-1">
                            <span>ℹ️</span>
                            <span>
                              This will be converted to {activeCollateralSymbol}{" "}
                              on deposit
                            </span>
                          </p>
                        )}
                      {/* Fee Display for Selected Deposit Token */}
                      {selectedDepositAsset &&
                        (() => {
                          const selectedAssetData = depositAssetsWithFees.find(
                            (a) => a.symbol === selectedDepositAsset
                          );
                          // Use actual calculated fee if amount is entered, otherwise use estimated fee from dropdown
                          const displayFee =
                            amount &&
                            parseFloat(amount) > 0 &&
                            feePercentage !== undefined
                              ? feePercentage
                              : selectedAssetData?.feePercentage;

                          const hasFee = displayFee !== undefined;
                          const feeValue = hasFee ? displayFee : 0;

                          return (
                            <div
                              className={`mt-2 p-2 rounded text-xs ${
                                hasFee && feeValue > 2
                                  ? "bg-red-50 border border-red-200 text-red-700"
                                  : "bg-[#B8EBD5]/30 border border-[#B8EBD5]/50 text-[#1E4775]"
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <span>
                                  {amount && parseFloat(amount) > 0
                                    ? "Mint Fee:"
                                    : "Estimated Fee:"}
                                </span>
                                <span
                                  className={`font-semibold ${
                                    hasFee && feeValue > 2 ? "text-red-600" : ""
                                  }`}
                                >
                                  {hasFee
                                    ? `${feeValue.toFixed(2)}%${
                                        feeValue > 2 ? " ⚠️" : ""
                                      }`
                                    : "-"}
                                </span>
                              </div>
                              {amount &&
                                parseFloat(amount) > 0 &&
                                feePercentage !== undefined && (
                                  <p className="text-[10px] mt-1 opacity-75">
                                    Fee may vary based on amount and market
                                    conditions
                                  </p>
                                )}
                            </div>
                          );
                        })()}
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-semibold text-[#1E4775]">
                          Enter Amount
                        </label>
                        <span className="text-sm text-[#1E4775]/70">
                          Balance: {formatEther(collateralBalance)}{" "}
                          {activeCollateralSymbol}
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={amount}
                          onChange={handleAmountChange}
                          placeholder="0.0"
                          className={`w-full h-14 px-4 pr-24 bg-white text-[#1E4775] border-2 ${
                            error ? "border-red-500" : "border-[#1E4775]/30"
                          } focus:border-[#1E4775] focus:ring-2 focus:ring-[#1E4775]/20 focus:outline-none transition-all text-xl font-mono rounded-lg`}
                          disabled={isProcessing}
                        />
                        <button
                          onClick={handleMaxClick}
                          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-sm bg-[#FF8A7A] hover:bg-[#FF6B5A] text-white transition-colors disabled:bg-gray-300 disabled:text-gray-500 rounded-full font-medium"
                          disabled={isProcessing}
                        >
                          MAX
                        </button>
                      </div>
                      {error && (
                        <p className="mt-2 text-sm text-red-600">{error}</p>
                      )}
                    </div>

                    {/* Expected Output Preview */}
                    {expectedMintOutput && amount && parseFloat(amount) > 0 && (
                      <div className="bg-[#B8EBD5]/30 border border-[#B8EBD5]/50 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-[#1E4775]/70">
                            You will receive:
                          </span>
                          <span className="text-xl font-bold text-[#1E4775] font-mono">
                            {formatEther(expectedMintOutput)}{" "}
                            {peggedTokenSymbol}
                          </span>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        if (
                          selectedDepositAsset &&
                          amount &&
                          parseFloat(amount) > 0 &&
                          !error
                        ) {
                          setCurrentStep(2);
                        }
                      }}
                      disabled={
                        !selectedDepositAsset ||
                        !amount ||
                        parseFloat(amount) <= 0 ||
                        !!error ||
                        isProcessing
                      }
                      className="w-full py-3 px-4 bg-[#1E4775] text-white font-semibold rounded-lg hover:bg-[#17395F] transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                    >
                      Continue to Step 2 →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Reward Token */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-in fade-in-0 slide-in-from-right-2 duration-200">
                  <div className="bg-[#B8EBD5]/20 border border-[#B8EBD5]/40 rounded-lg p-4 mb-4">
                    <h3 className="text-lg font-bold text-[#1E4775] mb-2">
                      Step 2: Choose Your Reward Token
                    </h3>
                    <p className="text-sm text-[#1E4775]/80 mb-2">
                      Select a reward token to see available pools, or choose to
                      receive {peggedTokenSymbol} directly.
                    </p>
                    {/* Stability Pool Explanation */}
                    <div className="mt-2 pt-2 border-t border-[#1E4775]/20">
                      <p className="text-xs font-semibold text-[#1E4775] mb-1">
                        What is a Stability Pool?
                      </p>
                      <p className="text-xs text-[#1E4775]/80">
                        Earn rewards by depositing {peggedTokenSymbol}. If the
                        market's collateral ratio falls below its minimum, your
                        tokens are automatically converted to{" "}
                        {selectedStabilityPool?.poolType === "sail"
                          ? "Sail tokens"
                          : "collateral"}
                        .
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-[#1E4775] mb-2">
                        Select Reward Token
                      </label>
                      <select
                        value={selectedRewardToken || ""}
                        onChange={(e) => {
                          const token = e.target.value || null;
                          setSelectedRewardToken(token);
                          if (token) {
                            setSelectedStabilityPool(null);
                            setDepositInStabilityPool(false);
                          }
                        }}
                        disabled={isProcessing}
                        className="w-full px-4 py-3 bg-white text-[#1E4775] border-2 border-[#1E4775]/30 rounded-lg focus:border-[#1E4775] focus:ring-2 focus:ring-[#1E4775]/20 focus:outline-none text-base"
                      >
                        <option value="">
                          No Stability Pool (Receive {peggedTokenSymbol}{" "}
                          directly)
                        </option>
                        {rewardTokenOptions.map(({ token, maxAPR }) => (
                          <option key={token} value={token}>
                            {token}
                            {maxAPR !== undefined && !isNaN(maxAPR)
                              ? ` (up to ${formatAPR(maxAPR)} APR)`
                              : ""}
                          </option>
                        ))}
                      </select>
                      {selectedRewardToken && (
                        <p className="mt-2 text-xs text-[#1E4775]/60 flex items-center gap-1">
                          <span>ℹ️</span>
                          <span>
                            You'll earn {selectedRewardToken} as rewards for
                            providing stability to the protocol
                          </span>
                        </p>
                      )}
                      {!selectedRewardToken && (
                        <p className="mt-2 text-xs text-[#1E4775]/60 flex items-center gap-1">
                          <span>ℹ️</span>
                          <span>
                            You'll receive {peggedTokenSymbol} tokens directly
                            to your wallet without earning rewards
                          </span>
                        </p>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setCurrentStep(1)}
                        disabled={isProcessing}
                        className="flex-1 py-3 px-4 bg-white text-[#1E4775] border-2 border-[#1E4775]/30 font-semibold rounded-lg hover:bg-[#1E4775]/5 transition-colors disabled:opacity-50"
                      >
                        ← Back
                      </button>
                      <button
                        onClick={() => {
                          if (selectedRewardToken) {
                            // Go to step 3 to choose stability pool
                            setCurrentStep(3);
                          } else {
                            // Mint without stability pool deposit
                            setDepositInStabilityPool(false);
                            setSelectedStabilityPool(null);
                            handleMint();
                          }
                        }}
                        disabled={
                          !selectedDepositAsset ||
                          !amount ||
                          parseFloat(amount) <= 0 ||
                          !!error ||
                          isProcessing
                        }
                        className="flex-1 py-3 px-4 bg-[#1E4775] text-white font-semibold rounded-lg hover:bg-[#17395F] transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                      >
                        {isProcessing
                          ? "Processing..."
                          : selectedRewardToken
                          ? "Choose Pool Type →"
                          : "Mint (no stability pool deposit)"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Stability Pool Selection */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-in fade-in-0 slide-in-from-right-2 duration-200">
                  <div className="bg-[#B8EBD5]/20 border border-[#B8EBD5]/40 rounded-lg p-4 mb-4">
                    <h3 className="text-lg font-bold text-[#1E4775] mb-2">
                      {selectedRewardToken
                        ? "Step 3: Choose Stability Pool"
                        : "Review Your Selection"}
                    </h3>
                    <p className="text-sm text-[#1E4775]/80">
                      {selectedRewardToken
                        ? "Select which stability pool to deposit into."
                        : "Review your deposit details below. You'll receive the tokens directly to your wallet."}
                    </p>
                  </div>

                  {selectedRewardToken ? (
                    <div className="space-y-4">
                      {filteredPools.length === 0 ? (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                          No pools found with {selectedRewardToken} rewards.
                          Please select a different reward token.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {filteredPools.map((pool) => {
                            const poolKey = `${pool.marketId}-${pool.poolType}`;
                            const isSelected =
                              selectedStabilityPool?.marketId ===
                                pool.marketId &&
                              selectedStabilityPool?.poolType === pool.poolType;

                            return (
                              <label
                                key={poolKey}
                                className="flex items-start gap-2 p-2 bg-[#17395F]/5 border border-[#17395F]/20 rounded cursor-pointer hover:bg-[#17395F]/10 transition-colors"
                              >
                                <input
                                  type="radio"
                                  name="stabilityPool"
                                  checked={isSelected}
                                  onChange={() => {
                                    setSelectedStabilityPool({
                                      marketId: pool.marketId,
                                      poolType: pool.poolType,
                                    });
                                    setDepositInStabilityPool(true);
                                    setStabilityPoolType(pool.poolType);
                                    setSelectedMarketId(pool.marketId);
                                  }}
                                  disabled={isProcessing}
                                  className="mt-0.5 w-3.5 h-3.5 text-[#1E4775] border-[#1E4775]/30 focus:ring-1 focus:ring-[#1E4775]/20 cursor-pointer"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-xs font-medium text-[#1E4775]">
                                      {pool.poolType === "collateral"
                                        ? "Collateral"
                                        : "Sail"}
                                    </span>
                                    <span className="bg-[#FF8A7A] text-[#1E4775] text-[9px] px-1.5 py-0.5 rounded-full">
                                      {pool.poolType}
                                    </span>
                                    {marketsForToken.length > 1 && (
                                      <span className="text-[10px] text-[#1E4775]/60 truncate">
                                        {pool.marketName}
                                      </span>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-3 gap-x-2 gap-y-0.5 text-[10px]">
                                    <div>
                                      <span className="text-[#1E4775]/60">
                                        APR:
                                      </span>
                                      <span className="text-[#1E4775] font-medium ml-1">
                                        {pool.apr !== undefined
                                          ? pool.apr > 0
                                            ? formatAPR(pool.apr)
                                            : "-"
                                          : "..."}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-[#1E4775]/60">
                                        TVL:
                                      </span>
                                      <span className="text-[#1E4775] font-medium font-mono ml-1">
                                        {pool.tvl !== undefined
                                          ? pool.tvl
                                            ? `${formatEther(pool.tvl)}`
                                            : "-"
                                          : "..."}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-[#1E4775]/60">
                                        Rewards:
                                      </span>
                                      <span className="text-[#1E4775] font-medium ml-1 truncate">
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

                      {/* Collateral Ratio Display - Only for Stability Pool Selection */}
                      {selectedStabilityPool && stabilityPoolMarket && (
                        <div className="p-3 bg-[#B8EBD5]/20 border border-[#B8EBD5]/40 rounded-lg">
                          <h5 className="text-xs font-semibold text-[#1E4775] mb-2">
                            Market Health
                          </h5>
                          <div className="space-y-1.5 text-xs text-[#1E4775]">
                            <div className="flex justify-between">
                              <span className="text-[#1E4775]/70">
                                Current Collateral Ratio:
                              </span>
                              <span className="font-semibold">
                                {formatCollateralRatio(
                                  collateralRatioData as bigint | undefined
                                )}
                              </span>
                            </div>
                            {minCollateralRatio !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-[#1E4775]/70">
                                  Minimum Collateral Ratio:
                                </span>
                                <span className="font-semibold">
                                  {formatCollateralRatio(minCollateralRatio)}
                                </span>
                              </div>
                            )}
                            <p className="text-[10px] text-[#1E4775]/60 mt-2 pt-2 border-t border-[#1E4775]/10">
                              If the collateral ratio falls below the minimum,
                              your {peggedTokenSymbol} in the stability pool
                              will be converted to{" "}
                              {selectedStabilityPool?.poolType === "sail"
                                ? "Sail tokens"
                                : "collateral"}
                              .
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Review Summary */}
                      <div className="bg-[#B8EBD5]/20 border border-[#B8EBD5]/40 rounded-lg p-4 space-y-3">
                        <h4 className="font-semibold text-[#1E4775]">
                          Review Your Selection
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-[#1E4775]/70">Deposit:</span>
                            <span className="text-[#1E4775] font-medium">
                              {amount} {selectedDepositAsset}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#1E4775]/70">
                              You'll receive:
                            </span>
                            <span className="text-[#1E4775] font-medium font-mono">
                              {expectedMintOutput
                                ? formatEther(expectedMintOutput)
                                : "..."}{" "}
                              {peggedTokenSymbol}
                            </span>
                          </div>
                          {selectedStabilityPool && (
                            <div className="flex justify-between">
                              <span className="text-[#1E4775]/70">
                                Stability Pool:
                              </span>
                              <span className="text-[#1E4775] font-medium">
                                {selectedStabilityPool.poolType === "collateral"
                                  ? "Collateral"
                                  : "Sail"}
                                {marketsForToken.length > 1 &&
                                  ` (${selectedStabilityPool.marketId})`}
                              </span>
                            </div>
                          )}
                          {selectedRewardToken && (
                            <div className="flex justify-between">
                              <span className="text-[#1E4775]/70">
                                Reward Token:
                              </span>
                              <span className="text-[#1E4775] font-medium">
                                {selectedRewardToken}
                              </span>
                            </div>
                          )}
                          {feePercentage !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-[#1E4775]/70">Fee:</span>
                              <span
                                className={`font-medium ${
                                  feePercentage > 2
                                    ? "text-red-600"
                                    : "text-[#1E4775]"
                                }`}
                              >
                                {feePercentage.toFixed(2)}%
                                {feePercentage > 2 && " ⚠️"}
                              </span>
                            </div>
                          )}
                        </div>
                        {feePercentage !== undefined && feePercentage > 2 && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                            ⚠️ High fee warning: Fees above 2% may significantly
                            impact your returns
                          </div>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => setCurrentStep(2)}
                          disabled={isProcessing}
                          className="flex-1 py-3 px-4 bg-white text-[#1E4775] border-2 border-[#1E4775]/30 font-semibold rounded-lg hover:bg-[#1E4775]/5 transition-colors disabled:opacity-50"
                        >
                          ← Back
                        </button>
                        <button
                          onClick={handleMint}
                          disabled={
                            !selectedDepositAsset ||
                            !amount ||
                            parseFloat(amount) <= 0 ||
                            !!error ||
                            isProcessing ||
                            (selectedRewardToken && !selectedStabilityPool)
                          }
                          className="flex-1 py-3 px-4 bg-[#1E4775] text-white font-semibold rounded-lg hover:bg-[#17395F] transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                        >
                          {isProcessing ? "Processing..." : "Confirm & Mint"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    // No reward token selected - direct receive
                    <div className="space-y-4">
                      <div className="bg-[#B8EBD5]/20 border border-[#B8EBD5]/40 rounded-lg p-4 space-y-3">
                        <h4 className="font-semibold text-[#1E4775]">
                          Review Your Selection
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-[#1E4775]/70">Deposit:</span>
                            <span className="text-[#1E4775] font-medium">
                              {amount} {selectedDepositAsset}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#1E4775]/70">
                              You'll receive:
                            </span>
                            <span className="text-[#1E4775] font-medium font-mono">
                              {expectedMintOutput
                                ? formatEther(expectedMintOutput)
                                : "..."}{" "}
                              {peggedTokenSymbol}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#1E4775]/70">Delivery:</span>
                            <span className="text-[#1E4775] font-medium">
                              Direct to wallet (no stability pool)
                            </span>
                          </div>
                          {feePercentage !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-[#1E4775]/70">Fee:</span>
                              <span
                                className={`font-medium ${
                                  feePercentage > 2
                                    ? "text-red-600"
                                    : "text-[#1E4775]"
                                }`}
                              >
                                {feePercentage.toFixed(2)}%
                                {feePercentage > 2 && " ⚠️"}
                              </span>
                            </div>
                          )}
                        </div>
                        {feePercentage !== undefined && feePercentage > 2 && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                            ⚠️ High fee warning: Fees above 2% may significantly
                            impact your returns
                          </div>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => setCurrentStep(2)}
                          disabled={isProcessing}
                          className="flex-1 py-3 px-4 bg-white text-[#1E4775] border-2 border-[#1E4775]/30 font-semibold rounded-lg hover:bg-[#1E4775]/5 transition-colors disabled:opacity-50"
                        >
                          ← Back
                        </button>
                        <button
                          onClick={handleMint}
                          disabled={
                            !selectedDepositAsset ||
                            !amount ||
                            parseFloat(amount) <= 0 ||
                            !!error ||
                            isProcessing
                          }
                          className="flex-1 py-3 px-4 bg-[#1E4775] text-white font-semibold rounded-lg hover:bg-[#17395F] transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                        >
                          {isProcessing ? "Processing..." : "Confirm & Mint"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            // Advanced Mode: Original Content
            <>
              <div className="text-sm text-[#1E4775]/70">
                {activeTab === "mint" ? (
                  <>
                    Mint {peggedTokenSymbol} using {collateralSymbol}
                  </>
                ) : activeTab === "deposit" ? (
                  <>Deposit {peggedTokenSymbol} into stability pool</>
                ) : activeTab === "withdraw" ? (
                  <>Withdraw {peggedTokenSymbol} from stability pools</>
                ) : (
                  <>
                    Redeem {peggedTokenSymbol} for {collateralSymbol}
                  </>
                )}
              </div>

              {/* Pool Selection for Withdraw Tab */}
              {activeTab === "withdraw" && (
                <div className="space-y-3 pt-2 border-t border-[#1E4775]/10">
                  <label className="text-xs text-[#1E4775]/70 font-medium">
                    Select pools to withdraw from:
                  </label>
                  {market.addresses?.stabilityPoolCollateral && (
                    <label className="flex items-center justify-between p-3 bg-[#17395F]/5 border border-[#17395F]/20 rounded cursor-pointer hover:bg-[#17395F]/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={withdrawFromCollateralPool}
                          onChange={(e) => {
                            setWithdrawFromCollateralPool(e.target.checked);
                            if (!e.target.checked && !withdrawFromSailPool) {
                              setAmount("");
                            }
                          }}
                          disabled={
                            isProcessing || collateralPoolBalance === 0n
                          }
                          className="w-5 h-5 text-[#1E4775] border-[#1E4775]/30 rounded focus:ring-2 focus:ring-[#1E4775]/20 focus:ring-offset-0 cursor-pointer disabled:opacity-50"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[#1E4775]">
                            Collateral Pool
                          </span>
                          <span className="bg-[#FF8A7A] text-[#1E4775] text-[10px] px-2 py-0.5 rounded-full">
                            collateral
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-[#1E4775] font-mono">
                          {formatEther(collateralPoolBalance)}{" "}
                          {peggedTokenSymbol}
                        </div>
                      </div>
                    </label>
                  )}
                  {market.addresses?.stabilityPoolLeveraged && (
                    <label className="flex items-center justify-between p-3 bg-[#17395F]/5 border border-[#17395F]/20 rounded cursor-pointer hover:bg-[#17395F]/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={withdrawFromSailPool}
                          onChange={(e) => {
                            setWithdrawFromSailPool(e.target.checked);
                            if (
                              !e.target.checked &&
                              !withdrawFromCollateralPool
                            ) {
                              setAmount("");
                            }
                          }}
                          disabled={isProcessing || sailPoolBalance === 0n}
                          className="w-5 h-5 text-[#1E4775] border-[#1E4775]/30 rounded focus:ring-2 focus:ring-[#1E4775]/20 focus:ring-offset-0 cursor-pointer disabled:opacity-50"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[#1E4775]">
                            Sail Pool
                          </span>
                          <span className="bg-[#FF8A7A] text-[#1E4775] text-[10px] px-2 py-0.5 rounded-full">
                            sail
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-[#1E4775] font-mono">
                          {formatEther(sailPoolBalance)} {peggedTokenSymbol}
                        </div>
                      </div>
                    </label>
                  )}
                </div>
              )}

              {/* Redeem Tab: Asset Selector, Positions List, and Fee Display */}
              {activeTab === "redeem" && (
                <div className="space-y-4 pt-2 border-t border-[#1E4775]/10">
                  {/* Positions List */}
                  <div className="space-y-3">
                    <label className="text-xs text-[#1E4775]/70 font-medium">
                      Your Positions:
                    </label>

                    {/* Wallet Balance (ha tokens) */}
                    {peggedBalance > 0n && (
                      <div className="p-3 bg-[#17395F]/5 border border-[#17395F]/20 rounded">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[#1E4775]">
                              Wallet
                            </span>
                            <span className="bg-[#1E4775] text-white text-[10px] px-2 py-0.5 rounded-full">
                              {peggedTokenSymbol}
                            </span>
                          </div>
                          <div className="text-sm font-bold text-[#1E4775] font-mono">
                            {formatEther(peggedBalance)} {peggedTokenSymbol}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Stability Pool Positions - Show current market's pools */}
                    {(collateralPoolBalance > 0n || sailPoolBalance > 0n) && (
                      <div className="space-y-2">
                        {collateralPoolBalance > 0n && (
                          <div className="p-3 bg-[#17395F]/5 border border-[#17395F]/20 rounded">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-[#1E4775]">
                                  {selectedMarket?.name || marketId} -
                                  Collateral Pool
                                </span>
                                <span className="bg-[#FF8A7A] text-[#1E4775] text-[10px] px-2 py-0.5 rounded-full">
                                  collateral
                                </span>
                              </div>
                              <div className="text-sm font-bold text-[#1E4775] font-mono">
                                {formatEther(collateralPoolBalance)}{" "}
                                {peggedTokenSymbol}
                              </div>
                            </div>
                          </div>
                        )}
                        {sailPoolBalance > 0n && (
                          <div className="p-3 bg-[#17395F]/5 border border-[#17395F]/20 rounded">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-[#1E4775]">
                                  {selectedMarket?.name || marketId} - Sail Pool
                                </span>
                                <span className="bg-[#FF8A7A] text-[#1E4775] text-[10px] px-2 py-0.5 rounded-full">
                                  sail
                                </span>
                              </div>
                              <div className="text-sm font-bold text-[#1E4775] font-mono">
                                {formatEther(sailPoolBalance)}{" "}
                                {peggedTokenSymbol}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {peggedBalance === 0n &&
                      collateralPoolBalance === 0n &&
                      sailPoolBalance === 0n && (
                        <div className="p-3 bg-[#17395F]/5 border border-[#17395F]/20 rounded text-center text-sm text-[#1E4775]/50">
                          No positions found
                        </div>
                      )}
                  </div>

                  {/* Asset Selector */}
                  <div>
                    <label className="block text-xs text-[#1E4775]/70 font-medium mb-2">
                      Redeem to Asset:
                    </label>
                    <select
                      value={selectedRedeemAsset || collateralSymbol}
                      onChange={(e) => setSelectedRedeemAsset(e.target.value)}
                      disabled={isProcessing}
                      className="w-full px-4 py-3 bg-white text-[#1E4775] border-2 border-[#1E4775]/30 rounded-lg focus:border-[#1E4775] focus:ring-2 focus:ring-[#1E4775]/20 focus:outline-none text-base"
                    >
                      {Array.from(
                        new Set(
                          marketsForToken
                            .map(({ market: m }) => m?.collateral?.symbol)
                            .filter(Boolean)
                        )
                      ).map((symbol) => (
                        <option key={symbol} value={symbol}>
                          {symbol} -{" "}
                          {marketsForToken.find(
                            ({ market: m }) => m?.collateral?.symbol === symbol
                          )?.market?.collateral?.name || symbol}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#1E4775]/70">Amount</span>
                  <span className="text-[#1E4775]/70">
                    Balance: {formatEther(balance)} {balanceSymbol}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="0.0"
                    className={`w-full h-12 px-4 pr-20 bg-white text-[#1E4775] border ${
                      error ? "border-red-500" : "border-[#1E4775]/30"
                    } focus:border-[#1E4775] focus:ring-2 focus:ring-[#1E4775]/20 focus:outline-none transition-all text-lg font-mono`}
                    disabled={isProcessing}
                  />
                  <button
                    onClick={handleMaxClick}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-[#FF8A7A] hover:bg-[#FF6B5A] text-white transition-colors disabled:bg-gray-300 disabled:text-gray-500 rounded-full"
                    disabled={isProcessing}
                  >
                    MAX
                  </button>
                </div>
                <div className="text-right text-xs text-[#1E4775]/50">
                  {balanceSymbol}
                </div>
                {expectedOutput && amount && parseFloat(amount) > 0 && (
                  <div className="mt-3 p-3 bg-[#B8EBD5]/30 border border-[#B8EBD5]/50 rounded">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#1E4775]/70">
                        {simpleMode &&
                        activeTab === "mint" &&
                        depositInStabilityPool
                          ? `You'll receive:`
                          : activeTab === "withdraw" && !redeemAfterWithdraw
                          ? "You will receive (pegged tokens):"
                          : "You will receive:"}
                      </span>
                      <span className="text-lg font-bold text-[#1E4775]">
                        {formatEther(expectedOutput)} {outputSymbol}
                      </span>
                    </div>
                    {simpleMode &&
                      activeTab === "mint" &&
                      depositInStabilityPool && (
                        <div className="mt-2 text-xs text-[#1E4775]/60">
                          Deposited to:{" "}
                          {bestPoolType === "collateral"
                            ? "Collateral"
                            : "Sail"}{" "}
                          pool (optimized for best yield)
                        </div>
                      )}
                  </div>
                )}
                {/* Redeem Fee Display */}
                {activeTab === "redeem" &&
                  redeemFeePercentage !== undefined &&
                  amount &&
                  parseFloat(amount) > 0 && (
                    <div
                      className={`mt-3 p-3 border rounded ${
                        redeemFeePercentage > 2
                          ? "bg-red-50 border-red-300"
                          : "bg-[#B8EBD5]/30 border-[#B8EBD5]/50"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-[#1E4775]/70">
                          Redeem Fee:
                        </span>
                        <span
                          className={`text-lg font-bold font-mono ${
                            redeemFeePercentage > 2
                              ? "text-red-600"
                              : "text-[#1E4775]"
                          }`}
                        >
                          {redeemFeePercentage.toFixed(2)}%
                        </span>
                      </div>
                      {redeemFeePercentage > 2 && (
                        <div className="mt-2 text-xs text-red-600 font-medium">
                          ⚠️ High fee warning: Fees above 2% may significantly
                          impact your returns
                        </div>
                      )}
                    </div>
                  )}
                {/* Fee Display - Advanced Mode */}
                {activeTab === "mint" &&
                  !simpleMode &&
                  feePercentage !== undefined &&
                  amount &&
                  parseFloat(amount) > 0 && (
                    <div
                      className={`mt-3 p-3 border rounded ${
                        feePercentage > 2
                          ? "bg-red-50 border-red-300"
                          : "bg-[#B8EBD5]/30 border-[#B8EBD5]/50"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-[#1E4775]/70">Fee:</span>
                        <span
                          className={`text-lg font-bold font-mono ${
                            feePercentage > 2
                              ? "text-red-600"
                              : "text-[#1E4775]"
                          }`}
                        >
                          {feePercentage.toFixed(2)}%
                        </span>
                      </div>
                      {feePercentage > 2 && (
                        <div className="mt-2 text-xs text-red-600 font-medium">
                          ⚠️ High fee warning: Fees above 2% may significantly
                          impact your returns
                        </div>
                      )}
                    </div>
                  )}
                {activeTab === "withdraw" &&
                  !redeemAfterWithdraw &&
                  amount &&
                  parseFloat(amount) > 0 && (
                    <div className="mt-2 p-3 bg-[#17395F]/5 border border-[#17395F]/20 rounded">
                      <p className="text-xs text-[#1E4775]/70">
                        Withdrawing from stability pools will return pegged
                        tokens to your wallet. Check "Redeem after withdrawal"
                        to automatically convert to collateral.
                      </p>
                    </div>
                  )}
              </div>

              {/* Simple Mode Info - Show optimized selection */}
              {activeTab === "mint" && simpleMode && depositInStabilityPool && (
                <div className="mt-2 p-3 bg-[#B8EBD5]/30 border border-[#B8EBD5]/50 rounded">
                  <p className="text-xs text-[#1E4775]/70">
                    Optimized for best yield: Depositing to{" "}
                    <span className="font-semibold">
                      {bestPoolType === "collateral" ? "Collateral" : "Sail"}
                    </span>{" "}
                    pool
                  </p>
                </div>
              )}

              {/* Stability Pool Options - Only for Mint (Advanced Mode) */}
              {activeTab === "mint" && !simpleMode && (
                <div className="space-y-3 pt-2 border-t border-[#1E4775]/10">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={depositInStabilityPool}
                      onChange={(e) =>
                        setDepositInStabilityPool(e.target.checked)
                      }
                      className="w-5 h-5 text-[#1E4775] border-[#1E4775]/30 rounded focus:ring-2 focus:ring-[#1E4775]/20 focus:ring-offset-0 cursor-pointer"
                      disabled={isProcessing}
                    />
                    <span className="text-sm font-medium text-[#1E4775]">
                      Deposit in stability pool
                    </span>
                  </label>

                  {depositInStabilityPool && (
                    <div className="space-y-3 pl-8">
                      {/* Toggle for Collateral vs Sail */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[#1E4775]/70">
                          Pool type:
                        </span>
                        <div className="flex items-center bg-[#17395F]/10 rounded-lg p-1">
                          <button
                            type="button"
                            onClick={() => setStabilityPoolType("collateral")}
                            disabled={isProcessing}
                            className={`px-3 py-1.5 text-xs font-medium transition-all rounded ${
                              stabilityPoolType === "collateral"
                                ? "bg-[#1E4775] text-white shadow-sm"
                                : "text-[#1E4775]/70 hover:text-[#1E4775]"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            Collateral
                          </button>
                          <button
                            type="button"
                            onClick={() => setStabilityPoolType("sail")}
                            disabled={isProcessing}
                            className={`px-3 py-1.5 text-xs font-medium transition-all rounded ${
                              stabilityPoolType === "sail"
                                ? "bg-[#1E4775] text-white shadow-sm"
                                : "text-[#1E4775]/70 hover:text-[#1E4775]"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            Sail
                          </button>
                        </div>
                      </div>

                      {/* APR Display */}
                      <div className="p-2 bg-[#B8EBD5]/20 border border-[#B8EBD5]/30 rounded">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#1E4775]/70">
                            Pool APR:
                          </span>
                          <span className="text-sm font-bold text-[#1E4775]">
                            {stabilityPoolAddress
                              ? aprData &&
                                Array.isArray(aprData) &&
                                aprData.length >= 2
                                ? formatAPR(stabilityPoolAPR)
                                : aprData === undefined
                                ? "Loading..."
                                : "-"
                              : "-"}
                          </span>
                        </div>
                      </div>

                      {/* Explainer */}
                      <div className="p-3 bg-[#17395F]/5 border border-[#17395F]/20 rounded">
                        <p className="text-xs text-[#1E4775]/80 leading-relaxed">
                          {stabilityPoolType === "collateral" ? (
                            <>
                              <span className="font-semibold">
                                Collateral stability pool
                              </span>{" "}
                              redeems to{" "}
                              <span className="font-semibold">
                                market collateral
                              </span>{" "}
                              when the market is below min collateral ratio.
                            </>
                          ) : (
                            <>
                              <span className="font-semibold">
                                Sail stability pool
                              </span>{" "}
                              redeems to{" "}
                              <span className="font-semibold">Sail tokens</span>{" "}
                              when the market is below min collateral ratio.
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Stability Pool Type Selector - Only for Deposit */}
              {activeTab === "deposit" && (
                <div className="space-y-3 pt-2 border-t border-[#1E4775]/10">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#1E4775]/70">
                      Pool type:
                    </span>
                    <div className="flex items-center bg-[#17395F]/10 rounded-lg p-1">
                      <button
                        type="button"
                        onClick={() => setStabilityPoolType("collateral")}
                        disabled={isProcessing}
                        className={`px-3 py-1.5 text-xs font-medium transition-all rounded ${
                          stabilityPoolType === "collateral"
                            ? "bg-[#1E4775] text-white shadow-sm"
                            : "text-[#1E4775]/70 hover:text-[#1E4775]"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        Collateral
                      </button>
                      <button
                        type="button"
                        onClick={() => setStabilityPoolType("sail")}
                        disabled={isProcessing}
                        className={`px-3 py-1.5 text-xs font-medium transition-all rounded ${
                          stabilityPoolType === "sail"
                            ? "bg-[#1E4775] text-white shadow-sm"
                            : "text-[#1E4775]/70 hover:text-[#1E4775]"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        Sail
                      </button>
                    </div>
                  </div>

                  {/* APR Display */}
                  <div className="p-2 bg-[#B8EBD5]/20 border border-[#B8EBD5]/30 rounded">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#1E4775]/70">
                        Pool APR:
                      </span>
                      <span className="text-sm font-bold text-[#1E4775]">
                        {stabilityPoolAddress
                          ? aprData &&
                            Array.isArray(aprData) &&
                            aprData.length >= 2
                            ? formatAPR(stabilityPoolAPR)
                            : aprData === undefined
                            ? "Loading..."
                            : "-"
                          : "-"}
                      </span>
                    </div>
                  </div>

                  {/* Explainer */}
                  <div className="p-3 bg-[#17395F]/5 border border-[#17395F]/20 rounded">
                    <p className="text-xs text-[#1E4775]/80 leading-relaxed">
                      {stabilityPoolType === "collateral" ? (
                        <>
                          <span className="font-semibold">
                            Collateral stability pool
                          </span>{" "}
                          redeems to{" "}
                          <span className="font-semibold">
                            market collateral
                          </span>{" "}
                          when the market is below min collateral ratio.
                        </>
                      ) : (
                        <>
                          <span className="font-semibold">
                            Sail stability pool
                          </span>{" "}
                          redeems to{" "}
                          <span className="font-semibold">Sail tokens</span>{" "}
                          when the market is below min collateral ratio.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Redeem After Withdraw Checkbox - Only for Withdraw Tab */}
              {activeTab === "withdraw" && (
                <div className="space-y-3 pt-2 border-t border-[#1E4775]/10">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={redeemAfterWithdraw}
                      onChange={(e) => setRedeemAfterWithdraw(e.target.checked)}
                      className="w-5 h-5 text-[#1E4775] border-[#1E4775]/30 rounded focus:ring-2 focus:ring-[#1E4775]/20 focus:ring-offset-0 cursor-pointer"
                      disabled={isProcessing}
                    />
                    <span className="text-sm font-medium text-[#1E4775]">
                      Redeem after withdrawal
                    </span>
                  </label>
                  {redeemAfterWithdraw && (
                    <div className="p-3 bg-[#17395F]/5 border border-[#17395F]/20 rounded pl-8">
                      <p className="text-xs text-[#1E4775]/80 leading-relaxed">
                        After withdrawing from the stability pool, the pegged
                        tokens will be automatically redeemed for{" "}
                        <span className="font-semibold">collateral tokens</span>
                        .
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Current Deposit & Ledger Marks Info - Only for Mint */}
              {activeTab === "mint" && (
                <div className="space-y-3">
                  {currentDeposit > 0n && (
                    <div className="p-3 bg-[#17395F]/10 border border-[#17395F]/20 rounded">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-[#1E4775]/70">
                          Current Deposit:
                        </span>
                        <span className="text-sm font-semibold text-[#1E4775]">
                          {formatEther(currentDeposit)} {peggedTokenSymbol}
                        </span>
                      </div>
                      {currentDepositUSD > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-[#1E4775]/70">
                            Ledger marks per day:
                          </span>
                          <span className="text-sm font-bold text-[#1E4775]">
                            {currentLedgerMarksPerDay.toFixed(2)} ledger
                            marks/day
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Transaction Preview - Always visible */}
                  <div className="p-3 bg-[#B8EBD5]/30 border border-[#B8EBD5]/50 rounded">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-[#1E4775]/70">
                        {amount && parseFloat(amount) > 0 && expectedMintOutput
                          ? "After deposit:"
                          : "Current balance:"}
                      </span>
                      <span className="text-sm font-semibold text-[#1E4775]">
                        {amount && parseFloat(amount) > 0 && expectedMintOutput
                          ? `${formatEther(
                              currentDeposit + expectedMintOutput
                            )} ${peggedTokenSymbol}`
                          : `${formatEther(
                              currentDeposit
                            )} ${peggedTokenSymbol}`}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-500/30 text-red-600 text-sm">
                  {error}
                </div>
              )}

              {txHash && (
                <div className="text-xs text-center text-[#1E4775]/70">
                  Tx:{" "}
                  <a
                    href={`https://etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-[#1E4775]"
                  >
                    {txHash.slice(0, 10)}...{txHash.slice(-8)}
                  </a>
                </div>
              )}

              {step === "success" && (
                <div className="p-3 bg-[#B8EBD5]/20 border border-[#B8EBD5]/30 text-[#1E4775] text-sm text-center">
                  ✅{" "}
                  {activeTab === "mint"
                    ? "Mint"
                    : activeTab === "deposit"
                    ? "Deposit"
                    : activeTab === "withdraw"
                    ? "Withdraw"
                    : "Redeem"}{" "}
                  successful!
                </div>
              )}
            </>
          )}
        </div>

        {step === "success" && (
          <div className="flex gap-4 p-6 border-t border-[#1E4775]/20">
            <button
              onClick={handleClose}
              className="flex-1 py-2 px-4 bg-[#1E4775] hover:bg-[#17395F] text-white font-medium transition-colors rounded-full"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
