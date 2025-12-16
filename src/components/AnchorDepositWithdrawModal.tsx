"use client";

import React, { useState, useEffect, useMemo } from "react";
import { parseEther, formatEther } from "viem";
import {
  useAccount,
  useBalance,
  useContractRead,
  useContractReads,
  useWriteContract,
  usePublicClient,
} from "wagmi";
import { useAnvilContractRead } from "@/hooks/useContractRead";
import { useAnvilContractReads } from "@/hooks/useContractReads";
import { shouldUseAnvil } from "@/config/environment";
import { publicClient as anvilPublicClient } from "@/config/rpc";
import { BaseError, ContractFunctionRevertedError } from "viem";
import { ERC20_ABI, STABILITY_POOL_ABI } from "@/abis/shared";
import { aprABI } from "@/abis/apr";
import Image from "next/image";
import SimpleTooltip from "@/components/SimpleTooltip";
import InfoTooltip from "@/components/InfoTooltip";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useAnchorLedgerMarks } from "@/hooks/useAnchorLedgerMarks";
import {
  TransactionProgressModal,
  TransactionStep,
} from "@/components/TransactionProgressModal";

// Helper function to format numbers nicely
const formatNumber = (
  value: string | number,
  maxDecimals: number = 2
): string => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";

  // For very large numbers, use compact notation
  if (num >= 1e6) {
    return num.toLocaleString(undefined, {
      maximumFractionDigits: maxDecimals,
      notation: "compact",
      compactDisplay: "short",
    });
  }

  // For smaller numbers, use regular formatting with limited decimals
  return num.toLocaleString(undefined, {
    maximumFractionDigits: maxDecimals,
    minimumFractionDigits: 0,
  });
};

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

// Local copy of the minter ABI (includes mint, redeem, price, and dry-run helpers)
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
      { name: "fee", type: "uint256" },
      { name: "discount", type: "uint256" },
      { name: "peggedMinted", type: "uint256" },
      { name: "price", type: "uint256" },
      { name: "rate", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "peggedIn", type: "uint256" }],
    name: "redeemPeggedTokenDryRun",
    outputs: [
      { name: "incentiveRatio", type: "int256" },
      { name: "fee", type: "uint256" },
      { name: "discount", type: "uint256" },
      { name: "peggedRedeemed", type: "uint256" },
      { name: "wrappedCollateralReturned", type: "uint256" },
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

type TabType = "deposit" | "withdraw";
type ModalStep =
  | "input"
  | "approving"
  | "approvingPegged"
  | "minting"
  | "depositing"
  | "withdrawal-method-selection"
  | "withdrawing"
  | "withdrawingCollateral"
  | "withdrawingSail"
  | "requestingCollateral"
  | "requestingSail"
  | "redeeming"
  | "success"
  | "error";

type TransactionStatus = {
  id: string;
  label: string;
  status: "pending" | "processing" | "success" | "error";
  hash?: string;
  error?: string;
};

// Helper function to get accepted deposit assets from market config
function getAcceptedDepositAssets(
  market: any
): Array<{ symbol: string; name: string }> {
  // Use acceptedAssets from market config if available
  if (market?.acceptedAssets && Array.isArray(market.acceptedAssets)) {
    return market.acceptedAssets;
  }
  // Fallback: return collateral token as the only accepted asset
  if (market?.collateral?.symbol) {
    return [{ symbol: market.collateral.symbol, name: market.collateral.name || market.collateral.symbol }];
  }
  return [];
}

export const AnchorDepositWithdrawModal = ({
  isOpen,
  onClose,
  marketId,
  market,
  initialTab = "deposit",
  onSuccess,
  simpleMode = false,
  bestPoolType = "collateral",
  allMarkets,
}: AnchorDepositWithdrawModalProps) => {
  const { address, isConnected } = useAccount();

  // Map old initialTab to new tab structure
  const getInitialTab = (): TabType => {
    if (
      initialTab === "mint" ||
      initialTab === "deposit" ||
      initialTab === "deposit-mint"
    ) {
      return "deposit";
    }
    if (
      initialTab === "withdraw" ||
      initialTab === "redeem" ||
      initialTab === "withdraw-redeem"
    ) {
      return "withdraw";
    }
    return "deposit";
  };

  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab());

  // Get positions from subgraph (same as expanded view)
  const { poolDeposits, haBalances } = useAnchorLedgerMarks({
    enabled: isOpen && activeTab === "withdraw",
  });
  const defaultProgressConfig = {
    mode: null as "collateral" | "direct" | "withdraw" | null,
    includeApproveCollateral: false,
    includeMint: false,
    includeApprovePegged: false,
    includeDeposit: false,
    includeDirectApprove: false,
    includeDirectDeposit: false,
    includeWithdrawCollateral: false,
    includeWithdrawSail: false,
    includeApproveRedeem: false,
    includeRedeem: false,
    withdrawCollateralLabel: "Withdraw from collateral pool",
    withdrawSailLabel: "Withdraw from sail pool",
    title: "Processing",
  };

  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<ModalStep>("input");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txHashes, setTxHashes] = useState<{
    approveCollateral?: string;
    mint?: string;
    approvePegged?: string;
    deposit?: string;
    directApprove?: string;
    directDeposit?: string;
    withdrawCollateral?: string;
    withdrawSail?: string;
    requestCollateral?: string;
    requestSail?: string;
    approveRedeem?: string;
    redeem?: string;
  }>({});

  const [progressConfig, setProgressConfig] = useState(defaultProgressConfig);
  const [progressModalOpen, setProgressModalOpen] = useState(false);

  // Deposit/Mint tab options
  const [mintOnly, setMintOnly] = useState(false);
  const [depositInStabilityPool, setDepositInStabilityPool] = useState(true);
  const [stabilityPoolType, setStabilityPoolType] = useState<
    "collateral" | "sail"
  >("collateral");

  // Withdraw/Redeem tab options
  const [withdrawOnly, setWithdrawOnly] = useState(false);
  const [redeemOnly, setRedeemOnly] = useState(false);
  const [withdrawFromCollateralPool, setWithdrawFromCollateralPool] =
    useState(false);
  const [withdrawFromSailPool, setWithdrawFromSailPool] = useState(false);

  // Withdrawal method per position:"immediate" (with fee) or"request" (free, wait for window)
  const [withdrawalMethods, setWithdrawalMethods] = useState<{
    collateralPool: "immediate" | "request";
    sailPool: "immediate" | "request";
  }>({
    collateralPool: "immediate",
    sailPool: "immediate",
  });

  // Transaction status tracking
  const [transactionSteps, setTransactionSteps] = useState<TransactionStatus[]>(
    []
  );

  // Selected positions for withdrawal (multiple selections allowed)
  const [selectedPositions, setSelectedPositions] = useState<{
    wallet: boolean;
    collateralPool: boolean;
    sailPool: boolean;
  }>({
    wallet: false,
    collateralPool: false,
    sailPool: false,
  });

  // Track if we've initialized positions for the current withdraw session
  // This prevents resetting selections when balances update from polling
  const hasInitializedWithdraw = React.useRef(false);

  // Individual amounts for each position
  const [positionAmounts, setPositionAmounts] = useState<{
    wallet: string;
    collateralPool: string;
    sailPool: string;
  }>({
    wallet: "",
    collateralPool: "",
    sailPool: "",
  });

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

  // Progress modal state (reuses TransactionProgressModal)
  const progressSteps = useMemo<TransactionStep[]>(() => {
    if (!progressConfig.mode) return [];

    const steps: TransactionStep[] = [];
    const addStep = (id: string, label: string, txHash?: string) =>
      steps.push({ id, label, status: "pending", txHash });

    if (progressConfig.mode === "collateral") {
      if (progressConfig.includeApproveCollateral) {
        addStep(
          "approve-collateral",
          "Approve collateral token",
          txHashes.approveCollateral
        );
      }
      if (progressConfig.includeMint) {
        addStep("mint", "Mint pegged token", txHashes.mint);
      }
      if (progressConfig.includeApprovePegged) {
        addStep(
          "approve-pegged",
          "Approve pegged token",
          txHashes.approvePegged
        );
      }
      if (progressConfig.includeDeposit) {
        addStep("deposit", "Deposit to stability pool", txHashes.deposit);
      }
    } else if (progressConfig.mode === "direct") {
      if (progressConfig.includeDirectApprove) {
        addStep("approve-direct", "Approve ha token", txHashes.directApprove);
      }
      if (progressConfig.includeDirectDeposit) {
        addStep(
          "deposit-direct",
          "Deposit to stability pool",
          txHashes.directDeposit
        );
      }
    } else if (progressConfig.mode === "withdraw") {
      if (progressConfig.includeWithdrawCollateral) {
        addStep(
          "withdraw-collateral",
          progressConfig.withdrawCollateralLabel ||
            "Withdraw from collateral pool",
          txHashes.withdrawCollateral || txHashes.requestCollateral
        );
      }
      if (progressConfig.includeWithdrawSail) {
        addStep(
          "withdraw-sail",
          progressConfig.withdrawSailLabel || "Withdraw from sail pool",
          txHashes.withdrawSail || txHashes.requestSail
        );
      }
      if (progressConfig.includeApproveRedeem) {
        addStep("approve-redeem", "Approve ha token", txHashes.approveRedeem);
      }
      if (progressConfig.includeRedeem) {
        addStep("redeem", "Redeem ha for collateral", txHashes.redeem);
      }
    }

    // Determine current step index based on modal step state
    const getCurrentIndex = () => {
      const mintIndex = steps.findIndex((s) => s.id === "mint");
      const approvePeggedIndex = steps.findIndex(
        (s) => s.id === "approve-pegged"
      );
      const depositIndex = steps.findIndex((s) => s.id.startsWith("deposit"));
      const withdrawCollateralIndex = steps.findIndex(
        (s) => s.id === "withdraw-collateral"
      );
      const withdrawSailIndex = steps.findIndex(
        (s) => s.id === "withdraw-sail"
      );
      const approveRedeemIndex = steps.findIndex(
        (s) => s.id === "approve-redeem"
      );
      const redeemIndex = steps.findIndex((s) => s.id === "redeem");
      if (step === "minting") return mintIndex >= 0 ? mintIndex : 0;
      if (step === "approvingPegged")
        return approvePeggedIndex >= 0
          ? approvePeggedIndex
          : depositIndex >= 0
          ? depositIndex - 1
          : steps.length - 1;
      if (step === "depositing")
        return depositIndex >= 0 ? depositIndex : steps.length - 1;
      if (
        step === "withdrawing" ||
        step === "withdrawingCollateral" ||
        step === "requestingCollateral"
      ) {
        if (withdrawCollateralIndex >= 0) return withdrawCollateralIndex;
        if (withdrawSailIndex >= 0) return withdrawSailIndex;
      }
      if (step === "withdrawingSail" || step === "requestingSail") {
        if (withdrawSailIndex >= 0) return withdrawSailIndex;
        if (withdrawCollateralIndex >= 0) return withdrawCollateralIndex;
      }
      if (step === "redeeming")
        return redeemIndex >= 0 ? redeemIndex : steps.length - 1;
      if (step === "approving")
        return approveRedeemIndex >= 0
          ? approveRedeemIndex
          : redeemIndex >= 0
          ? Math.max(redeemIndex - 1, 0)
          : steps.length - 1;
      if (step === "success") return steps.length - 1;
      return 0;
    };

    const currentIdx = Math.max(0, getCurrentIndex());
    const isError = step === "error";
    steps.forEach((s, idx) => {
      if (isError && idx === currentIdx) {
        s.status = "error";
      } else if (idx < currentIdx || step === "success") {
        s.status = "completed";
      } else if (idx === currentIdx) {
        s.status = isError ? "error" : "in_progress";
      } else {
        s.status = "pending";
      }
    });

    return steps;
  }, [progressConfig, step, txHashes]);

  const currentProgressIndex = useMemo(() => {
    const activeIdx = progressSteps.findIndex(
      (s) => s.status === "in_progress"
    );
    if (activeIdx >= 0) return activeIdx;
    const pendingIdx = progressSteps.findIndex((s) => s.status === "pending");
    if (pendingIdx >= 0) return pendingIdx;
    if (progressSteps.length === 0) return 0;
    return progressSteps.length - 1;
  }, [progressSteps]);

  const handleProgressClose = () => {
    setProgressModalOpen(false);
    setProgressConfig(defaultProgressConfig);
    setTxHashes({});
    // Close the manage modal when user closes the progress modal (for both deposit and withdraw)
    onClose();
  };

  const showProgressModal =
    progressModalOpen && progressSteps.length > 0 && step !== "input";

  // Handler for"Try Again" button in progress modal
  const handleProgressRetry = () => {
    setProgressModalOpen(false);
    setProgressConfig(defaultProgressConfig);
    setTxHashes({});
    setStep("input");
    setError(null);
  };

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

    // Check if selected asset is a ha token (pegged token)
    for (const { market: m } of marketsForToken) {
      const peggedTokenSymbol = m?.peggedToken?.symbol || "ha";
      if (
        selectedDepositAsset.toLowerCase() === peggedTokenSymbol.toLowerCase()
      ) {
        return m;
      }
    }

    // Find the market whose collateral symbol matches the deposit asset
    // or whose accepted deposit assets include the selected asset
    for (const { market: m } of marketsForToken) {
      const assets = getAcceptedDepositAssets(m);
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
        isPeggedToken?: boolean; // Flag to indicate this is a ha token (direct deposit, no minting)
      }
    >();
    marketsForToken.forEach(({ market: m }) => {
      const assets = getAcceptedDepositAssets(m);
      const minterAddr = m?.addresses?.minter;
      const peggedTokenSymbol = m?.peggedToken?.symbol || "ha";

      // Add collateral-based assets (require minting)
      assets.forEach((asset) => {
        if (!assetMap.has(asset.symbol)) {
          assetMap.set(asset.symbol, {
            ...asset,
            market: m,
            minterAddress: minterAddr,
            isPeggedToken: false,
          });
        }
      });

      // Add ha token option (direct deposit to stability pool, no minting)
      if (!assetMap.has(peggedTokenSymbol)) {
        assetMap.set(peggedTokenSymbol, {
          symbol: peggedTokenSymbol,
          name: m?.peggedToken?.name || `${peggedTokenSymbol} Token`,
          market: m,
          minterAddress: undefined, // No minter needed for direct ha deposits
          isPeggedToken: true,
        });
      }
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
    if (!simpleMode || !isOpen || activeTab !== "deposit") return [];

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

  // Calculate fees for each market separately (for showing per-market fees)
  const marketFeeContracts = useMemo(() => {
    if (!simpleMode || !isOpen || activeTab !== "deposit") return [];

    const contracts: Array<{
      address: `0x${string}`;
      abi: typeof minterABI;
      functionName: "mintPeggedTokenDryRun";
      args: [bigint];
      marketId: string;
    }> = [];

    marketsForToken.forEach(({ marketId, market: m }) => {
      const minterAddr = m?.addresses?.minter;
      if (
        minterAddr &&
        typeof minterAddr === "string" &&
        minterAddr.startsWith("0x") &&
        minterAddr.length === 42
      ) {
        contracts.push({
          address: minterAddr as `0x${string}`,
          abi: minterABI,
          functionName: "mintPeggedTokenDryRun" as const,
          args: [parseEther(sampleAmountForFeeCalc)] as const,
          marketId,
        });
      }
    });

    return contracts;
  }, [marketsForToken, simpleMode, isOpen, activeTab]);

  // Use production-compatible contract reads for market fees
  const { data: marketFeeData } = useContractReads({
    contracts: marketFeeContracts.map(({ marketId, ...contract }) => contract),
    query: {
      enabled:
        marketFeeContracts.length > 0 &&
        isOpen &&
        simpleMode &&
        activeTab === "deposit",
      refetchInterval: 30000,
    },
  });

  // Map fees to markets
  const marketFeesMap = useMemo(() => {
    const feeMap = new Map<string, number | undefined>();

    marketFeeContracts.forEach((contract, index) => {
      const feeResult = marketFeeData?.[index];
      let feePercentage: number | undefined = undefined;

      let resultData: any = undefined;
      if (feeResult) {
        if ("status" in feeResult && feeResult.status === "success") {
          resultData = feeResult.result;
        } else if ("status" in feeResult && feeResult.status === "failure") {
          feeMap.set(contract.marketId, undefined);
          return;
        } else if (!("status" in feeResult)) {
          resultData = feeResult;
        }
      }

      if (resultData && Array.isArray(resultData) && resultData.length >= 2) {
        const wrappedFee = resultData[1] as bigint;
        const inputAmount = parseEther(sampleAmountForFeeCalc);
        if (inputAmount > 0n) {
          feePercentage = (Number(wrappedFee) / Number(inputAmount)) * 100;
        }
      }

      feeMap.set(contract.marketId, feePercentage);
    });

    return feeMap;
  }, [marketFeeContracts, marketFeeData]);

  // Calculate fee range across all markets
  const feeRange = useMemo(() => {
    const fees = Array.from(marketFeesMap.values()).filter(
      (f): f is number => f !== undefined
    );
    if (fees.length === 0) return null;

    const minFee = Math.min(...fees);
    const maxFee = Math.max(...fees);

    return {
      min: minFee,
      max: maxFee,
      hasRange: minFee !== maxFee,
      count: fees.length,
    };
  }, [marketFeesMap]);

  // Use production-compatible contract reads (works on both mainnet and Anvil)
  const {
    data: feeDataForAllAssets,
    isLoading: feeLoading,
    error: feeError,
  } = useContractReads({
    contracts: feeContracts.map(({ assetSymbol, ...contract }) => contract),
    query: {
      enabled:
        feeContracts.length > 0 &&
        isOpen &&
        simpleMode &&
        activeTab === "deposit",
      refetchInterval: 30000, // Refetch every 30 seconds
    },
  });

  // Debug: Log fee data state changes
  useEffect(() => {
    // Fee data state tracking
  }, [
    feeDataForAllAssets,
    feeLoading,
    feeError,
    feeContracts.length,
    isOpen,
    simpleMode,
    activeTab,
  ]);

  // Map fees to deposit assets using minter address as key
  const depositAssetsWithFees = useMemo(() => {
    // Create a map of asset symbol to fee result
    const feeMap = new Map<string, number | undefined>();

    feeContracts.forEach((contract, index) => {
      const feeResult = feeDataForAllAssets?.[index];
      let feePercentage: number | undefined = undefined;

      // Handle result structure - could be { status:"success", result: T } or just T
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
      } else if (isOpen && simpleMode && activeTab === "deposit") {
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

  // Check if selected deposit asset is ha token (in simple mode)
  const isDirectPeggedDeposit = useMemo(() => {
    if (!simpleMode || !selectedDepositAsset || activeTab !== "deposit")
      return false;
    // Check if selected asset matches any market's pegged token symbol
    return marketsForToken.some(({ market: m }) => {
      const peggedTokenSymbol = m?.peggedToken?.symbol || "ha";
      return (
        selectedDepositAsset.toLowerCase() === peggedTokenSymbol.toLowerCase()
      );
    });
  }, [simpleMode, selectedDepositAsset, activeTab, marketsForToken]);

  // Read pegged token address from Genesis contract (source of truth)
  const { data: genesisPeggedTokenAddress } = useContractRead({
    address: marketForDepositAsset?.addresses?.genesis as `0x${string}`,
    abi: [
      {
        inputs: [],
        name: "peggedToken",
        outputs: [{ type: "address", name: "token" }],
        stateMutability: "view",
        type: "function",
      },
    ],
    functionName: "peggedToken",
    query: {
      enabled:
        !!marketForDepositAsset?.addresses?.genesis &&
        isOpen &&
        activeTab === "deposit" &&
        simpleMode &&
        isDirectPeggedDeposit,
      retry: 1,
      allowFailure: true,
    },
  });

  // Get token address for selected deposit asset
  const getSelectedAssetAddress = useMemo(() => {
    if (!selectedDepositAsset || !marketForDepositAsset) return null;

    const normalized = selectedDepositAsset.toLowerCase();
    const market = marketForDepositAsset;

    // Check if it's ha token - use Genesis contract's pegged token address if available, otherwise fall back to market config
    const peggedTokenSymbol = market?.peggedToken?.symbol || "ha";
    if (normalized === peggedTokenSymbol.toLowerCase()) {
      // Prefer the address from Genesis contract (source of truth)
      if (genesisPeggedTokenAddress) {
        return genesisPeggedTokenAddress as `0x${string}`;
      }
      // Fall back to market config address
      return market?.addresses?.peggedToken as `0x${string}` | undefined;
    }

    // Check if it's native ETH
    if (normalized === "eth") {
      return "0x0000000000000000000000000000000000000000" as `0x${string}`; // Marker for native ETH
    }

    // Check if it's collateral token (wstETH)
    const collateralSymbol = market?.collateral?.symbol || "";
    if (normalized === collateralSymbol.toLowerCase()) {
      return market?.addresses?.collateralToken as `0x${string}` | undefined;
    }

    // Check if it's stETH (wrappedCollateralToken)
    if (normalized === "steth") {
      return market?.addresses?.wrappedCollateralToken as
        | `0x${string}`
        | undefined;
    }

    return null;
  }, [selectedDepositAsset, marketForDepositAsset, genesisPeggedTokenAddress]);

  const isSelectedAssetNativeETH =
    selectedDepositAsset?.toLowerCase() === "eth";

  // Get native ETH balance (for ETH deposits)
  const { data: nativeBalanceData } = useBalance({
    address: address,
    query: {
      enabled:
        !!address &&
        isOpen &&
        activeTab === "deposit" &&
        isSelectedAssetNativeETH &&
        simpleMode,
      refetchInterval: 5000,
    },
  });

  // Contract read hooks - balance for selected deposit asset
  // Use Anvil-specific read if in development, otherwise use wagmi
  const useAnvilForBalance = shouldUseAnvil();
  const selectedAssetAddress = getSelectedAssetAddress;
  const anvilSelectedAssetResult = useAnvilContractRead({
    address:
      selectedAssetAddress &&
      selectedAssetAddress !== "0x0000000000000000000000000000000000000000"
        ? selectedAssetAddress
        : undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    enabled:
      !!address &&
      !!selectedAssetAddress &&
      selectedAssetAddress !== "0x0000000000000000000000000000000000000000" &&
      isOpen &&
      activeTab === "deposit" &&
      simpleMode &&
      !!selectedDepositAsset &&
      useAnvilForBalance,
    refetchInterval: 5000,
  });

  const wagmiSelectedAssetResult = useContractRead({
    address:
      selectedAssetAddress &&
      selectedAssetAddress !== "0x0000000000000000000000000000000000000000"
        ? selectedAssetAddress
        : undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled:
        !!address &&
        !!selectedAssetAddress &&
        selectedAssetAddress !== "0x0000000000000000000000000000000000000000" &&
        isOpen &&
        activeTab === "deposit" &&
        simpleMode &&
        !!selectedDepositAsset &&
        !useAnvilForBalance,
      refetchInterval: 5000,
      retry: 1,
      allowFailure: true,
    },
  });

  const selectedAssetBalanceData = useAnvilForBalance
    ? anvilSelectedAssetResult.data
    : wagmiSelectedAssetResult.data;
  const selectedAssetBalanceError = useAnvilForBalance
    ? anvilSelectedAssetResult.error
    : wagmiSelectedAssetResult.error;
  const selectedAssetBalanceLoading = useAnvilForBalance
    ? anvilSelectedAssetResult.isLoading
    : wagmiSelectedAssetResult.isLoading;

  // Debug: Log selected asset balance read status
  useEffect(() => {
    if (
      process.env.NODE_ENV === "development" &&
      isOpen &&
      simpleMode &&
      selectedDepositAsset &&
      activeTab === "deposit"
    ) {
      console.log("[AnchorDepositModal] Selected asset balance read status:", {
        selectedDepositAsset,
        selectedAssetAddress,
        userAddress: address,
        data: selectedAssetBalanceData?.toString(),
        error: selectedAssetBalanceError?.message,
        isLoading: selectedAssetBalanceLoading,
        enabled:
          !!address &&
          !!selectedAssetAddress &&
          selectedAssetAddress !==
            "0x0000000000000000000000000000000000000000" &&
          isOpen &&
          activeTab === "deposit" &&
          simpleMode &&
          !!selectedDepositAsset,
      });
    }
  }, [
    isOpen,
    simpleMode,
    selectedDepositAsset,
    selectedAssetAddress,
    address,
    selectedAssetBalanceData,
    selectedAssetBalanceError,
    selectedAssetBalanceLoading,
    activeTab,
  ]);

  // Contract read hooks - collateral balance for mint (only when not using ha token directly)
  const { data: collateralBalanceData } = useContractRead({
    address: collateralAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled:
        !!address &&
        !!collateralAddress &&
        isOpen &&
        activeTab === "deposit" &&
        !simpleMode,
      refetchInterval: 5000,
      retry: 1,
      allowFailure: true,
    },
  });

  // Contract read hooks - pegged token balance for direct ha deposits (in simple mode)
  // Use Genesis contract's pegged token address if available, otherwise use market config
  // Priority: 1) Genesis contract peggedToken() 2) Market config peggedToken 3) Direct from contracts.ts
  const peggedTokenAddressForBalance =
    genesisPeggedTokenAddress || marketForDepositAsset?.addresses?.peggedToken;

  // Debug: Log the address being used
  useEffect(() => {
    if (
      process.env.NODE_ENV === "development" &&
      isOpen &&
      isDirectPeggedDeposit
    ) {
      console.log("[AnchorDepositModal] Ha token balance check setup:", {
        selectedDepositAsset,
        marketForDepositAsset: marketForDepositAsset?.name,
        genesisPeggedTokenAddress,
        marketConfigPeggedTokenAddress:
          marketForDepositAsset?.addresses?.peggedToken,
        peggedTokenAddressForBalance,
        address,
        useAnvil: useAnvilForBalance,
        enabled:
          !!address &&
          !!peggedTokenAddressForBalance &&
          isOpen &&
          activeTab === "deposit" &&
          isDirectPeggedDeposit &&
          simpleMode,
      });
    }
  }, [
    isOpen,
    isDirectPeggedDeposit,
    selectedDepositAsset,
    marketForDepositAsset,
    genesisPeggedTokenAddress,
    peggedTokenAddressForBalance,
    address,
    activeTab,
    simpleMode,
    useAnvilForBalance,
  ]);

  const anvilBalanceResult = useAnvilContractRead({
    address: peggedTokenAddressForBalance as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    enabled:
      !!address &&
      !!peggedTokenAddressForBalance &&
      isOpen &&
      activeTab === "deposit" &&
      isDirectPeggedDeposit &&
      simpleMode &&
      useAnvilForBalance,
    refetchInterval: 5000,
  });

  const wagmiBalanceResult = useContractRead({
    address: peggedTokenAddressForBalance as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled:
        !!address &&
        !!peggedTokenAddressForBalance &&
        isOpen &&
        activeTab === "deposit" &&
        isDirectPeggedDeposit &&
        simpleMode &&
        !useAnvilForBalance,
      refetchInterval: 5000,
      retry: 1,
      allowFailure: true,
    },
  });

  const directPeggedBalanceData = useAnvilForBalance
    ? anvilBalanceResult.data
    : wagmiBalanceResult.data;
  const directPeggedBalanceError = useAnvilForBalance
    ? anvilBalanceResult.error
    : wagmiBalanceResult.error;
  const directPeggedBalanceLoading = useAnvilForBalance
    ? anvilBalanceResult.isLoading
    : wagmiBalanceResult.isLoading;

  // Debug: Log balance read status
  useEffect(() => {
    if (
      process.env.NODE_ENV === "development" &&
      isOpen &&
      isDirectPeggedDeposit
    ) {
      console.log("[AnchorDepositModal] Ha token balance read status:", {
        address: peggedTokenAddressForBalance,
        userAddress: address,
        data: directPeggedBalanceData?.toString(),
        error: directPeggedBalanceError?.message,
        isLoading: directPeggedBalanceLoading,
        enabled:
          !!address &&
          !!peggedTokenAddressForBalance &&
          isOpen &&
          activeTab === "deposit" &&
          isDirectPeggedDeposit &&
          simpleMode,
      });
    }
  }, [
    isOpen,
    isDirectPeggedDeposit,
    peggedTokenAddressForBalance,
    address,
    directPeggedBalanceData,
    directPeggedBalanceError,
    directPeggedBalanceLoading,
    activeTab,
    simpleMode,
  ]);

  // Read pegged token balance - use Anvil hook when on local chain
  const useAnvilForPeggedBalance = shouldUseAnvil();

  const anvilPeggedBalanceResult = useAnvilContractRead({
    address: peggedTokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    enabled:
      !!address &&
      !!peggedTokenAddress &&
      isOpen &&
      (activeTab === "deposit" || activeTab === "withdraw") &&
      useAnvilForPeggedBalance,
    refetchInterval: 5000,
  });

  const wagmiPeggedBalanceResult = useContractRead({
    address: peggedTokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled:
        !!address &&
        !!peggedTokenAddress &&
        isOpen &&
        (activeTab === "deposit" || activeTab === "withdraw") &&
        !useAnvilForPeggedBalance,
      refetchInterval: 5000,
      retry: 1,
      allowFailure: true,
    },
  });

  const peggedBalanceData = useAnvilForPeggedBalance
    ? anvilPeggedBalanceResult.data
    : wagmiPeggedBalanceResult.data;

  // Get stability pool balances for withdraw
  const collateralPoolAddress = selectedMarket?.addresses
    ?.stabilityPoolCollateral as `0x${string}` | undefined;
  const sailPoolAddress = selectedMarket?.addresses?.stabilityPoolLeveraged as
    | `0x${string}`
    | undefined;

  // Collateral pool balance - use Anvil hook when on local chain
  const anvilCollateralPoolResult = useAnvilContractRead({
    address: collateralPoolAddress,
    abi: STABILITY_POOL_ABI,
    functionName: "assetBalanceOf",
    args: address ? [address] : undefined,
    enabled:
      !!address &&
      !!collateralPoolAddress &&
      isOpen &&
      activeTab === "withdraw" &&
      useAnvilForPeggedBalance,
    refetchInterval: 5000,
  });

  const wagmiCollateralPoolResult = useContractRead({
    address: collateralPoolAddress,
    abi: STABILITY_POOL_ABI,
    functionName: "assetBalanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled:
        !!address &&
        !!collateralPoolAddress &&
        isOpen &&
        activeTab === "withdraw" &&
        !useAnvilForPeggedBalance,
      refetchInterval: 5000,
      retry: 1,
      allowFailure: true,
    },
  });

  const collateralPoolBalanceData = useAnvilForPeggedBalance
    ? anvilCollateralPoolResult.data
    : wagmiCollateralPoolResult.data;

  // Sail pool balance - use Anvil hook when on local chain
  const anvilSailPoolResult = useAnvilContractRead({
    address: sailPoolAddress,
    abi: STABILITY_POOL_ABI,
    functionName: "assetBalanceOf",
    args: address ? [address] : undefined,
    enabled:
      !!address &&
      !!sailPoolAddress &&
      isOpen &&
      activeTab === "withdraw" &&
      useAnvilForPeggedBalance,
    refetchInterval: 5000,
  });

  const wagmiSailPoolResult = useContractRead({
    address: sailPoolAddress,
    abi: STABILITY_POOL_ABI,
    functionName: "assetBalanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled:
        !!address &&
        !!sailPoolAddress &&
        isOpen &&
        activeTab === "withdraw" &&
        !useAnvilForPeggedBalance,
      refetchInterval: 5000,
      retry: 1,
      allowFailure: true,
    },
  });

  const sailPoolBalanceData = useAnvilForPeggedBalance
    ? anvilSailPoolResult.data
    : wagmiSailPoolResult.data;

  // Early withdrawal fees - read from both pools
  const anvilCollateralPoolFeeResult = useAnvilContractRead({
    address: collateralPoolAddress,
    abi: STABILITY_POOL_ABI,
    functionName: "getEarlyWithdrawalFee",
    enabled: !!collateralPoolAddress && isOpen && useAnvilForPeggedBalance,
    refetchInterval: 30000,
  });

  const wagmiCollateralPoolFeeResult = useContractRead({
    address: collateralPoolAddress,
    abi: STABILITY_POOL_ABI,
    functionName: "getEarlyWithdrawalFee",
    query: {
      enabled: !!collateralPoolAddress && isOpen && !useAnvilForPeggedBalance,
      refetchInterval: 30000,
      allowFailure: true,
    },
  });

  const collateralPoolEarlyFee = useAnvilForPeggedBalance
    ? anvilCollateralPoolFeeResult.data
    : wagmiCollateralPoolFeeResult.data;

  const anvilSailPoolFeeResult = useAnvilContractRead({
    address: sailPoolAddress,
    abi: STABILITY_POOL_ABI,
    functionName: "getEarlyWithdrawalFee",
    enabled: !!sailPoolAddress && isOpen && useAnvilForPeggedBalance,
    refetchInterval: 30000,
  });

  const wagmiSailPoolFeeResult = useContractRead({
    address: sailPoolAddress,
    abi: STABILITY_POOL_ABI,
    functionName: "getEarlyWithdrawalFee",
    query: {
      enabled: !!sailPoolAddress && isOpen && !useAnvilForPeggedBalance,
      refetchInterval: 30000,
      allowFailure: true,
    },
  });

  const sailPoolEarlyFee = useAnvilForPeggedBalance
    ? anvilSailPoolFeeResult.data
    : wagmiSailPoolFeeResult.data;

  // Read withdrawal window data from both pools
  const anvilCollateralWindowResult = useAnvilContractRead({
    address: collateralPoolAddress,
    abi: STABILITY_POOL_ABI,
    functionName: "getWithdrawalWindow",
    enabled: !!collateralPoolAddress && isOpen && useAnvilForPeggedBalance,
    refetchInterval: 30000,
  });

  const wagmiCollateralWindowResult = useContractRead({
    address: collateralPoolAddress,
    abi: STABILITY_POOL_ABI,
    functionName: "getWithdrawalWindow",
    query: {
      enabled: !!collateralPoolAddress && isOpen && !useAnvilForPeggedBalance,
      refetchInterval: 30000,
    },
  });

  const collateralPoolWindow = useAnvilForPeggedBalance
    ? anvilCollateralWindowResult.data
    : wagmiCollateralWindowResult.data;

  const anvilSailWindowResult = useAnvilContractRead({
    address: sailPoolAddress,
    abi: STABILITY_POOL_ABI,
    functionName: "getWithdrawalWindow",
    enabled: !!sailPoolAddress && isOpen && useAnvilForPeggedBalance,
    refetchInterval: 30000,
  });

  const wagmiSailWindowResult = useContractRead({
    address: sailPoolAddress,
    abi: STABILITY_POOL_ABI,
    functionName: "getWithdrawalWindow",
    query: {
      enabled: !!sailPoolAddress && isOpen && !useAnvilForPeggedBalance,
      refetchInterval: 30000,
    },
  });

  const sailPoolWindow = useAnvilForPeggedBalance
    ? anvilSailWindowResult.data
    : wagmiSailWindowResult.data;

  // Helper function to format seconds to hours
  const formatDuration = (seconds: bigint | number): string => {
    const totalSeconds = Number(seconds);
    const hours = Math.round(totalSeconds / 3600);
    if (hours === 0) {
      const minutes = Math.floor(totalSeconds / 60);
      return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
    }
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  };

  // Convert fee from wei (1e18 scale) to percentage
  const collateralPoolFeePercent = useMemo(() => {
    if (!collateralPoolEarlyFee) return undefined;
    const percent = (Number(collateralPoolEarlyFee) / 1e18) * 100;
    if (process.env.NODE_ENV === "development") {
      console.log("[AnchorDepositWithdrawModal] Collateral Pool Early Fee:", {
        raw: collateralPoolEarlyFee,
        percent,
        address: collateralPoolAddress,
      });
    }
    return percent;
  }, [collateralPoolEarlyFee, collateralPoolAddress]);

  const sailPoolFeePercent = useMemo(() => {
    if (!sailPoolEarlyFee) return undefined;
    const percent = (Number(sailPoolEarlyFee) / 1e18) * 100;
    if (process.env.NODE_ENV === "development") {
      console.log("[AnchorDepositWithdrawModal] Sail Pool Early Fee:", {
        raw: sailPoolEarlyFee,
        percent,
        address: sailPoolAddress,
      });
    }
    return percent;
  }, [sailPoolEarlyFee, sailPoolAddress]);

  // Calculate early withdrawal fee amounts based on withdrawal amounts
  const earlyWithdrawalFees = useMemo(() => {
    const fees: Array<{
      poolType: "collateral" | "sail";
      amount: bigint;
      feePercent: number;
      withdrawalAmount: bigint;
    }> = [];

    // Collateral pool fee
    if (
      selectedPositions.collateralPool &&
      positionAmounts.collateralPool &&
      withdrawalMethods.collateralPool === "immediate" &&
      collateralPoolEarlyFee &&
      collateralPoolFeePercent !== undefined
    ) {
      const withdrawalAmount = parseEther(positionAmounts.collateralPool);
      const feeAmount =
        (withdrawalAmount * collateralPoolEarlyFee) / parseEther("1");
      fees.push({
        poolType: "collateral",
        amount: feeAmount,
        feePercent: collateralPoolFeePercent,
        withdrawalAmount,
      });
    }

    // Sail pool fee
    if (
      selectedPositions.sailPool &&
      positionAmounts.sailPool &&
      withdrawalMethods.sailPool === "immediate" &&
      sailPoolEarlyFee &&
      sailPoolFeePercent !== undefined
    ) {
      const withdrawalAmount = parseEther(positionAmounts.sailPool);
      const feeAmount = (withdrawalAmount * sailPoolEarlyFee) / parseEther("1");
      fees.push({
        poolType: "sail",
        amount: feeAmount,
        feePercent: sailPoolFeePercent,
        withdrawalAmount,
      });
    }

    return fees;
  }, [
    selectedPositions,
    positionAmounts,
    withdrawalMethods,
    collateralPoolEarlyFee,
    collateralPoolFeePercent,
    sailPoolEarlyFee,
    sailPoolFeePercent,
  ]);

  const showEarlyWithdrawalFees =
    earlyWithdrawalFees.length > 0 &&
    (withdrawalMethods.collateralPool === "immediate" ||
      withdrawalMethods.sailPool === "immediate");

  // Get user's current deposit (pegged token balance) for mint tab
  const { data: currentDepositData } = useContractRead({
    address: peggedTokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled:
        !!address && !!peggedTokenAddress && isOpen && activeTab === "deposit",
      refetchInterval: 5000,
      retry: 1,
      allowFailure: true,
    },
  });

  // Get the minter address for the market we're depositing into
  // For ha token deposits, use the market for the deposit asset
  // For other deposits, use the selected market
  const minterAddressForPrice = useMemo(() => {
    if (isDirectPeggedDeposit && marketForDepositAsset?.addresses?.minter) {
      return marketForDepositAsset.addresses.minter;
    }
    return minterAddress;
  }, [isDirectPeggedDeposit, marketForDepositAsset, minterAddress]);

  const isValidMinterAddressForPrice =
    minterAddressForPrice &&
    typeof minterAddressForPrice === "string" &&
    minterAddressForPrice.startsWith("0x") &&
    minterAddressForPrice.length === 42;

  // Get pegged token price to calculate USD value
  const { data: peggedTokenPrice } = useContractRead({
    address: minterAddressForPrice as `0x${string}`,
    abi: minterABI,
    functionName: "peggedTokenPrice",
    query: {
      enabled:
        !!minterAddressForPrice &&
        isValidMinterAddressForPrice &&
        isOpen &&
        activeTab === "deposit",
      retry: 1,
      allowFailure: true,
    },
  });

  // Fetch data for all stability pools from all markets (for simple mode)
  const poolContracts = useMemo(() => {
    if (!simpleMode || activeTab !== "deposit" || !isOpen) return [];

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
          abi: STABILITY_POOL_ABI,
          functionName: "totalAssetSupply",
        });
        // Reward tokens
        contracts.push({
          address: pool.address,
          abi: STABILITY_POOL_ABI,
          functionName: "GAUGE_REWARD_TOKEN",
        });
        contracts.push({
          address: pool.address,
          abi: STABILITY_POOL_ABI,
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
        activeTab === "deposit",
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

      if (symbol) map.set(addr.toLowerCase(), symbol);
    });

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

    return options.map(({ maxAPRValue, ...rest }) => ({
      ...rest,
      maxAPR: maxAPRValue,
    }));
  }, [poolsWithSymbols, isOpen, simpleMode]);

  // If there's only one reward token option in simple deposit flow, skip the reward step
  const skipRewardStep =
    simpleMode &&
    activeTab === "deposit" &&
    !mintOnly &&
    rewardTokenOptions.length === 1;

  const stabilityStep = skipRewardStep ? 2 : 3;

  // Auto-select the single reward token when skipping the reward step
  useEffect(() => {
    if (skipRewardStep && rewardTokenOptions.length === 1) {
      const soleToken = rewardTokenOptions[0].token;
      if (selectedRewardToken !== soleToken) {
        setSelectedRewardToken(soleToken);
      }
      // Ensure we don't get stuck on a non-existent step
      if (currentStep === 2) {
        setCurrentStep(2);
      }
    }
  }, [skipRewardStep, rewardTokenOptions, selectedRewardToken, currentStep]);

  // Filter pools by selected reward token
  // For ha token deposits (isDirectPeggedDeposit), show all pools (both collateral and sail)
  // For other deposits, filter by selected reward token
  const filteredPools = useMemo(() => {
    // If depositing ha tokens directly, show all pools (both collateral and sail)
    if (isDirectPeggedDeposit) {
      return poolsWithSymbols;
    }
    // Otherwise, filter by selected reward token
    if (!selectedRewardToken) return [];
    return poolsWithSymbols.filter((pool) =>
      pool.rewardTokens.includes(selectedRewardToken)
    );
  }, [poolsWithSymbols, selectedRewardToken, isDirectPeggedDeposit]);

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
        ((activeTab === "deposit" && depositInStabilityPool) ||
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
        activeTab === "deposit",
      refetchInterval: 5000,
      retry: 1,
      allowFailure: true,
    },
  });

  // Check allowance for pegged token to stability pool (for mint tab if depositing to stability pool, or for deposit tab)
  // Use Anvil hook when on local chain
  const useAnvilForPeggedAllowance = shouldUseAnvil();

  const {
    data: anvilPeggedTokenAllowanceData,
    refetch: refetchAnvilPeggedTokenAllowance,
  } = useAnvilContractRead({
    address: peggedTokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "allowance",
    args:
      address && stabilityPoolAddress
        ? [address, stabilityPoolAddress]
        : undefined,
    enabled:
      useAnvilForPeggedAllowance &&
      !!address &&
      !!peggedTokenAddress &&
      !!stabilityPoolAddress &&
      isOpen &&
      activeTab === "deposit",
    refetchInterval: 5000,
  });

  const {
    data: wagmiPeggedTokenAllowanceData,
    refetch: refetchWagmiPeggedTokenAllowance,
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
        !useAnvilForPeggedAllowance &&
        !!address &&
        !!peggedTokenAddress &&
        !!stabilityPoolAddress &&
        isOpen &&
        activeTab === "deposit",
      refetchInterval: 5000,
      retry: 1,
      allowFailure: true,
    },
  });

  // Combine Anvil and wagmi results for pegged token allowance
  const peggedTokenAllowanceData = useAnvilForPeggedAllowance
    ? anvilPeggedTokenAllowanceData
    : wagmiPeggedTokenAllowanceData;
  const refetchPeggedTokenAllowance = useAnvilForPeggedAllowance
    ? refetchAnvilPeggedTokenAllowance
    : refetchWagmiPeggedTokenAllowance;

  // Use Anvil hook flag (shared by redeem + mint fee dry-runs)
  const shouldUseAnvilHook = shouldUseAnvil();

  // Calculate expected output based on active tab - use Anvil hook when on Anvil
  const { data: anvilExpectedMintOutput } = useAnvilContractRead({
    address: minterAddress as `0x${string}`,
    abi: minterABI,
    functionName: "mintPeggedTokenDryRun",
    args: amount && activeTab === "deposit" ? [parseEther(amount)] : undefined,
    enabled:
      shouldUseAnvilHook &&
      !!minterAddress &&
      isValidMinterAddress &&
      !!amount &&
      parseFloat(amount) > 0 &&
      isOpen &&
      activeTab === "deposit",
  });

  const { data: regularExpectedMintOutput } = useContractRead({
    address: minterAddress as `0x${string}`,
    abi: minterABI,
    functionName: "mintPeggedTokenDryRun",
    args: amount && activeTab === "deposit" ? [parseEther(amount)] : undefined,
    query: {
      enabled:
        !shouldUseAnvilHook &&
        !!minterAddress &&
        isValidMinterAddress &&
        !!amount &&
        parseFloat(amount) > 0 &&
        isOpen &&
        activeTab === "deposit",
      retry: 1,
      allowFailure: true,
    },
  });

  // Use the appropriate expected mint output based on environment
  // Extract peggedMinted (index 3) from mintPeggedTokenDryRun
  const rawExpectedMintOutput = useMemo(() => {
    const data = shouldUseAnvilHook
      ? anvilExpectedMintOutput
      : regularExpectedMintOutput;
    if (!data) return undefined;
    if (Array.isArray(data)) return data[3] as bigint;
    if (typeof data === "object" && "peggedMinted" in data) {
      return (data as any).peggedMinted as bigint;
    }
    return undefined;
  }, [anvilExpectedMintOutput, regularExpectedMintOutput, shouldUseAnvilHook]);

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

  // Check allowance for pegged token to the redeem minter (uses the redeem market)
  const redeemAllowancePeggedTokenAddress =
    selectedRedeemMarket?.market?.addresses?.peggedToken || peggedTokenAddress;
  const redeemAllowanceMinterAddress =
    selectedRedeemMarket?.market?.addresses?.minter || minterAddress;

  const {
    data: peggedTokenMinterAllowanceData,
    refetch: refetchPeggedTokenMinterAllowance,
  } = useContractRead({
    address: redeemAllowancePeggedTokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "allowance",
    args:
      address && redeemAllowanceMinterAddress
        ? [address, redeemAllowanceMinterAddress as `0x${string}`]
        : undefined,
    query: {
      enabled:
        !!address &&
        !!redeemAllowancePeggedTokenAddress &&
        !!redeemAllowanceMinterAddress &&
        isOpen &&
        activeTab === "withdraw",
      refetchInterval: 5000,
      retry: 1,
      allowFailure: true,
    },
  });

  // Calculate total amount for redeem output calculation (from position amounts or single amount)
  const redeemInputAmount = useMemo(() => {
    if (
      activeTab === "withdraw" &&
      (positionAmounts.wallet ||
        positionAmounts.collateralPool ||
        positionAmounts.sailPool)
    ) {
      // Sum up all position amounts
      let total = 0n;
      if (positionAmounts.wallet && parseFloat(positionAmounts.wallet) > 0) {
        total += parseEther(positionAmounts.wallet);
      }
      if (
        positionAmounts.collateralPool &&
        parseFloat(positionAmounts.collateralPool) > 0
      ) {
        total += parseEther(positionAmounts.collateralPool);
      }
      if (
        positionAmounts.sailPool &&
        parseFloat(positionAmounts.sailPool) > 0
      ) {
        total += parseEther(positionAmounts.sailPool);
      }
      return total > 0n ? total : undefined;
    }
    // Use single amount field
    if (amount && parseFloat(amount) > 0) {
      return parseEther(amount);
    }
    return undefined;
  }, [activeTab, positionAmounts, amount]);

  // Dry-run redeem to fetch fee/discount and output before user confirms
  const redeemDryRunAddress = isValidRedeemMinterAddress
    ? (redeemMinterAddress as `0x${string}`)
    : isValidMinterAddress
    ? (minterAddress as `0x${string}`)
    : undefined;

  const redeemDryRunEnabled =
    !!redeemDryRunAddress &&
    !!redeemInputAmount &&
    redeemInputAmount > 0n &&
    isOpen &&
    activeTab === "withdraw" &&
    !withdrawOnly;

  // Prefer the anvil hook on local dev (matches mint-fee flow)
  const { data: anvilRedeemDryRunData, error: anvilRedeemDryRunError } =
    useAnvilContractRead({
      address: redeemDryRunAddress as `0x${string}`,
      abi: minterABI,
      functionName: "redeemPeggedTokenDryRun",
      args: redeemInputAmount ? [redeemInputAmount] : undefined,
      enabled: shouldUseAnvilHook && redeemDryRunEnabled,
    });

  const { data: regularRedeemDryRunData, error: regularRedeemDryRunError } =
    useContractRead({
      address: redeemDryRunAddress as `0x${string}`,
      abi: minterABI,
      functionName: "redeemPeggedTokenDryRun",
      args: redeemInputAmount ? [redeemInputAmount] : undefined,
      query: {
        enabled: !shouldUseAnvilHook && redeemDryRunEnabled,
        retry: 1,
        allowFailure: true,
      },
    });

  const redeemDryRunData = shouldUseAnvilHook
    ? anvilRedeemDryRunData
    : regularRedeemDryRunData;
  const redeemDryRunError = shouldUseAnvilHook
    ? anvilRedeemDryRunError
    : regularRedeemDryRunError;
  const redeemDryRunLoading =
    redeemDryRunEnabled && !redeemDryRunError && redeemDryRunData === undefined;

  // Surface dry-run errors for debugging
  useEffect(() => {
    if (redeemDryRunError) {
      console.error("[redeemPeggedTokenDryRun] error", redeemDryRunError);
    }
  }, [redeemDryRunError]);

  const redeemDryRun = useMemo(() => {
    if (!redeemDryRunData || !Array.isArray(redeemDryRunData)) return null;
    const [
      incentiveRatio,
      fee,
      discount,
      peggedRedeemed,
      wrappedCollateralReturned,
      price,
      rate,
    ] = redeemDryRunData as unknown as [
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint
    ];

    const incentiveRatioBN = BigInt(incentiveRatio);
    const isDisallowed = incentiveRatioBN === 1000000000000000000n; // 1e18

    let feePercentage = 0;
    let discountPercentage = 0;
    if (incentiveRatioBN > 0n) {
      feePercentage = Number(incentiveRatioBN) / 1e16; // convert to percent
    } else if (incentiveRatioBN < 0n) {
      discountPercentage = Number(-incentiveRatioBN) / 1e16;
    }

    return {
      incentiveRatio: incentiveRatioBN,
      fee,
      discount,
      peggedRedeemed,
      wrappedCollateralReturned,
      price,
      rate,
      feePercentage,
      discountPercentage,
      isDisallowed,
      netCollateralReturned: wrappedCollateralReturned,
    };
  }, [redeemDryRunData]);

  // On Anvil, the redeem view call can revert; skip it and rely on dry-run instead
  const enableRedeemView =
    (!!isValidRedeemMinterAddress || !!isValidMinterAddress) &&
    !!redeemInputAmount &&
    redeemInputAmount > 0n &&
    isOpen &&
    activeTab === "withdraw" &&
    !shouldUseAnvil();

  const { data: expectedRedeemOutput } = useContractRead({
    address: isValidRedeemMinterAddress
      ? (redeemMinterAddress as `0x${string}`)
      : isValidMinterAddress
      ? (minterAddress as `0x${string}`)
      : undefined,
    abi: minterABI,
    functionName: "calculateRedeemPeggedTokenOutput",
    args: redeemInputAmount ? [redeemInputAmount] : undefined,
    query: {
      enabled: enableRedeemView,
      retry: 1,
      allowFailure: true,
    },
  });

  // Calculate redeem fee: on Anvil prefer the dry-run feePercentage (same units), otherwise fall back to view ratio
  const redeemFeePercentage = useMemo(() => {
    if (shouldUseAnvil() && redeemDryRun?.feePercentage !== undefined) {
      return redeemDryRun.feePercentage;
    }

    const output =
      redeemDryRun?.wrappedCollateralReturned || expectedRedeemOutput;

    if (!output || !redeemInputAmount || redeemInputAmount === 0n)
      return undefined;

    const inputValue = Number(redeemInputAmount);
    const outputValue = Number(output);

    if (outputValue >= inputValue) return 0;

    return ((inputValue - outputValue) / inputValue) * 100;
  }, [expectedRedeemOutput, redeemDryRun, redeemInputAmount]);

  // Get fee information from dry run (for both simple and advanced modes)
  // In simple mode, use the market corresponding to the selected deposit asset
  // Only run dry run for collateral deposits (not direct ha token deposits)
  const feeMinterAddress =
    simpleMode && activeMarketForFees ? activeMinterAddress : minterAddress;
  const isValidFeeMinterAddress =
    feeMinterAddress &&
    typeof feeMinterAddress === "string" &&
    feeMinterAddress.startsWith("0x") &&
    feeMinterAddress.length === 42;

  // Parse amount to BigInt, handling invalid inputs
  const parsedAmount = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0) return undefined;
    try {
      return parseEther(amount);
    } catch (error) {
      return undefined;
    }
  }, [amount]);

  const dryRunEnabled =
    !!isValidFeeMinterAddress &&
    !!parsedAmount &&
    isOpen &&
    activeTab === "deposit" &&
    !isDirectPeggedDeposit; // Only run for collateral deposits

  // Dry run query using Anvil hook for local development
  const { data: anvilDryRunData, error: anvilDryRunError } =
    useAnvilContractRead({
      address: feeMinterAddress as `0x${string}`,
      abi: minterABI,
      functionName: "mintPeggedTokenDryRun",
      args: parsedAmount ? [parsedAmount] : undefined,
      enabled: shouldUseAnvilHook && dryRunEnabled && !!parsedAmount,
    });

  // Dry run query using regular hook for production
  const { data: regularDryRunData, error: regularDryRunError } =
    useContractRead({
      address: feeMinterAddress as `0x${string}`,
      abi: minterABI,
      functionName: "mintPeggedTokenDryRun",
      args: parsedAmount ? [parsedAmount] : undefined,
      query: {
        enabled: !shouldUseAnvilHook && dryRunEnabled && !!parsedAmount,
        retry: 1,
      },
    });

  // Use the appropriate dry run data based on environment
  const dryRunData = shouldUseAnvilHook ? anvilDryRunData : regularDryRunData;
  const dryRunError = shouldUseAnvilHook
    ? anvilDryRunError
    : regularDryRunError;

  // Use dry run data's peggedMinted as fallback when calculateMintPeggedTokenOutput fails
  // dryRunData is an array: [incentiveRatio, fee, discount, peggedMinted, price, rate]
  const expectedMintOutput = useMemo(() => {
    if (rawExpectedMintOutput) return rawExpectedMintOutput;
    // Fallback to dry run data's peggedMinted (index 3)
    if (dryRunData && Array.isArray(dryRunData) && dryRunData.length >= 4) {
      return dryRunData[3] as bigint;
    }
    return undefined;
  }, [rawExpectedMintOutput, dryRunData]);

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
        activeTab === "deposit" &&
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
        activeTab === "deposit" &&
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

  // Calculate fee percentage from dry run result
  const feePercentage = useMemo(() => {
    // Don't calculate fee for direct pegged token deposits (no minting)
    if (isDirectPeggedDeposit) return undefined;

    // If there's an error, return undefined (will show fallback fee)
    if (dryRunError) {
      return undefined;
    }

    if (!dryRunData || !parsedAmount || parsedAmount === 0n) return undefined;

    const dryRunResult = dryRunData as
      | [bigint, bigint, bigint, bigint, bigint, bigint]
      | undefined;
    if (!dryRunResult || dryRunResult.length < 2) return undefined;

    const wrappedFee = dryRunResult[1];

    // Calculate fee as percentage: (fee / input) * 100
    const feePercent = (Number(wrappedFee) / Number(parsedAmount)) * 100;
    return feePercent;
  }, [dryRunData, dryRunError, parsedAmount, isDirectPeggedDeposit]);

  // Contract write hooks
  const { writeContractAsync } = useWriteContract();

  const collateralBalance = collateralBalanceData || 0n;

  // Get ha token balance from subgraph (preferred) or contract read
  const peggedTokenAddressLower = peggedTokenAddress?.toLowerCase();
  const subgraphHaBalance = haBalances?.find(
    (b) => b.tokenAddress.toLowerCase() === peggedTokenAddressLower
  );
  const peggedBalanceFromSubgraph = subgraphHaBalance
    ? parseEther(subgraphHaBalance.balance)
    : 0n;

  const peggedBalanceContract = peggedBalanceData || 0n;
  const peggedBalance =
    peggedBalanceFromSubgraph > 0n
      ? peggedBalanceFromSubgraph
      : peggedBalanceContract;
  const directPeggedBalance = directPeggedBalanceData || 0n;

  // Get balance for selected deposit asset in simple mode
  const selectedAssetBalance = useMemo(() => {
    if (!simpleMode || !selectedDepositAsset || activeTab !== "deposit")
      return null;

    if (isSelectedAssetNativeETH) {
      return nativeBalanceData?.value || 0n;
    }

    // For ha token, prefer the balance from Genesis contract's pegged token
    if (isDirectPeggedDeposit) {
      // Use directPeggedBalanceData if available (from Genesis contract address or market config)
      if (directPeggedBalanceData !== undefined) {
        if (process.env.NODE_ENV === "development") {
          console.log("[AnchorDepositModal] Ha token balance:", {
            address: peggedTokenAddressForBalance,
            balance: directPeggedBalanceData?.toString() || "0",
            genesisPeggedTokenAddress,
            marketPeggedTokenAddress:
              marketForDepositAsset?.addresses?.peggedToken,
            isDirectPeggedDeposit,
            marketName: marketForDepositAsset?.name,
          });
        }
        return (directPeggedBalanceData as bigint) || 0n;
      }
      // If directPeggedBalanceData is not available, try selectedAssetBalanceData
      if (selectedAssetBalanceData !== undefined) {
        if (process.env.NODE_ENV === "development") {
          console.log("[AnchorDepositModal] Ha token balance (fallback):", {
            address: selectedAssetAddress,
            balance: selectedAssetBalanceData?.toString() || "0",
          });
        }
        return (selectedAssetBalanceData as bigint) || 0n;
      }
      // Return 0n if no balance data available (will show 0 balance)
      if (process.env.NODE_ENV === "development") {
        console.warn("[AnchorDepositModal] No balance data for ha token:", {
          peggedTokenAddressForBalance,
          selectedAssetAddress,
          marketForDepositAsset: marketForDepositAsset?.name,
        });
      }
      return 0n;
    }

    if (selectedAssetBalanceData !== undefined) {
      if (process.env.NODE_ENV === "development") {
        console.log("[AnchorDepositModal] Selected asset balance:", {
          asset: selectedDepositAsset,
          address: selectedAssetAddress,
          balance: selectedAssetBalanceData?.toString() || "0",
        });
      }
      return (selectedAssetBalanceData as bigint) || 0n;
    }

    return null;
  }, [
    simpleMode,
    selectedDepositAsset,
    activeTab,
    isSelectedAssetNativeETH,
    nativeBalanceData,
    selectedAssetBalanceData,
    isDirectPeggedDeposit,
    directPeggedBalanceData,
    peggedTokenAddressForBalance,
    genesisPeggedTokenAddress,
    marketForDepositAsset,
    selectedAssetAddress,
  ]);

  // Get symbol for selected deposit asset
  const selectedAssetSymbol = useMemo(() => {
    if (!selectedDepositAsset) return "";
    return selectedDepositAsset;
  }, [selectedDepositAsset]);
  // Get balances from contract reads (fallback)
  const collateralPoolBalanceContract = collateralPoolBalanceData || 0n;
  const sailPoolBalanceContract = sailPoolBalanceData || 0n;

  // Get balances from subgraph (preferred, same as expanded view)
  const collateralPoolAddressLower = collateralPoolAddress?.toLowerCase();
  const sailPoolAddressLower = sailPoolAddress?.toLowerCase();

  const subgraphCollateralDeposit = poolDeposits?.find(
    (d) =>
      d.poolAddress.toLowerCase() === collateralPoolAddressLower &&
      d.poolType === "collateral"
  );
  const subgraphSailDeposit = poolDeposits?.find(
    (d) =>
      d.poolAddress.toLowerCase() === sailPoolAddressLower &&
      d.poolType === "sail"
  );

  // Use subgraph balances if available, otherwise fallback to contract reads
  const collateralPoolBalance = subgraphCollateralDeposit
    ? parseEther(subgraphCollateralDeposit.balance)
    : collateralPoolBalanceContract;
  const sailPoolBalance = subgraphSailDeposit
    ? parseEther(subgraphSailDeposit.balance)
    : sailPoolBalanceContract;

  const totalStabilityPoolBalance = collateralPoolBalance + sailPoolBalance;
  const allowance = allowanceData || 0n;
  const peggedTokenAllowance = peggedTokenAllowanceData || 0n;
  const amountBigInt = amount ? parseEther(amount) : 0n;
  const needsApproval =
    activeTab === "deposit" && amountBigInt > 0 && amountBigInt > allowance;
  const needsPeggedTokenApproval =
    (activeTab === "deposit" &&
      depositInStabilityPool &&
      expectedMintOutput &&
      expectedMintOutput > peggedTokenAllowance) ||
    (activeTab === "deposit" &&
      amountBigInt > 0 &&
      amountBigInt > peggedTokenAllowance);
  const currentDeposit = currentDepositData || 0n;

  // Reset positions only when modal opens or tab changes, NOT on balance updates
  useEffect(() => {
    if (activeTab === "withdraw" && isOpen) {
      // Only initialize once per withdraw session
      if (!hasInitializedWithdraw.current) {
        if (process.env.NODE_ENV === "development") {
          console.log(
            "[AnchorDepositWithdrawModal] Withdraw tab - initializing (first time):",
            {
              peggedBalance: peggedBalance?.toString() || "0",
              collateralPoolBalance: collateralPoolBalance?.toString() || "0",
              sailPoolBalance: sailPoolBalance?.toString() || "0",
            }
          );
        }
        // Start with all positions unchecked by default
        setSelectedPositions({
          wallet: false,
          collateralPool: false,
          sailPool: false,
        });
        setWithdrawFromCollateralPool(false);
        setWithdrawFromSailPool(false);
        hasInitializedWithdraw.current = true;
      }
    } else if (activeTab !== "withdraw") {
      // Reset when switching away from withdraw tab
      setSelectedPositions({
        wallet: false,
        collateralPool: false,
        sailPool: false,
      });
      setWithdrawFromCollateralPool(false);
      setWithdrawFromSailPool(false);
      setPositionAmounts({
        wallet: "",
        collateralPool: "",
        sailPool: "",
      });
      hasInitializedWithdraw.current = false;
    }
  }, [activeTab, isOpen]);

  // Reset the ref when modal closes
  useEffect(() => {
    if (!isOpen) {
      hasInitializedWithdraw.current = false;
    }
  }, [isOpen]);

  // Get available balance based on active tab
  const getAvailableBalance = (): bigint => {
    if (activeTab === "deposit") {
      // For deposit tab, return collateral balance for minting or pegged balance for direct deposit
      return isDirectPeggedDeposit ? peggedBalance : collateralBalance;
    } else if (activeTab === "withdraw") {
      // For withdraw, sum up balances from selected positions
      let total = 0n;
      if (selectedPositions.wallet) total += peggedBalance;
      if (selectedPositions.collateralPool) total += collateralPoolBalance;
      if (selectedPositions.sailPool) total += sailPoolBalance;
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
      if (initialTab === "mint" || initialTab === "deposit") {
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
      } else if (initialTab === "redeem" || initialTab === "withdraw") {
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

  // Auto-select collateral pool when entering Step 3 (only if not mint only)
  useEffect(() => {
    if (
      !mintOnly &&
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
  }, [
    currentStep,
    selectedRewardToken,
    filteredPools,
    selectedStabilityPool,
    mintOnly,
  ]);

  const handleClose = () => {
    // Always allow closing, even during processing
    // Reset state when closing
    setAmount("");
    setStep("input");
    setError(null);
    setTxHash(null);
    setPositionAmounts({
      wallet: "",
      collateralPool: "",
      sailPool: "",
    });
    if (activeTab === "deposit") {
      setDepositInStabilityPool(!mintOnly);
      setStabilityPoolType("collateral");
    }
    // Reset simple mode state
    if (simpleMode) {
      setCurrentStep(1);
      setSelectedDepositAsset("");
      setSelectedRewardToken(null);
      setSelectedStabilityPool(null);
      setSelectedMarketId(null);
    }
    onClose();
  };

  const handleCancel = () => {
    // Reset processing state
    setStep("input");
    setError(null);
    setTxHash(null);
  };

  const handleBackToWithdrawInput = () => {
    setStep("input");
    setError(null);
    setTxHash(null);
    setIsProcessing(false);
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
    if (tab === "deposit") {
      setDepositInStabilityPool(!mintOnly);
      setStabilityPoolType("collateral");
    }
  };

  const handleMaxClick = () => {
    if (activeTab === "deposit") {
      if (simpleMode && selectedAssetBalance !== null) {
        setAmount(formatEther(selectedAssetBalance));
      } else if (isDirectPeggedDeposit && directPeggedBalance) {
        setAmount(formatEther(directPeggedBalance));
      } else if (collateralBalance) {
        setAmount(formatEther(collateralBalance));
      }
    } else if (activeTab === "deposit" && peggedBalance) {
      setAmount(formatEther(peggedBalance));
    } else if (activeTab === "withdraw") {
      const total = getAvailableBalance();
      if (total > 0n) {
        setAmount(formatEther(total));
      }
    } else if (activeTab === "withdraw" && peggedBalance) {
      setAmount(formatEther(peggedBalance));
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      // Cap at balance if value exceeds it (for deposit tab)
      if (value && activeTab === "deposit" && balance > 0n) {
        try {
          const parsed = parseEther(value);
          if (parsed > balance) {
            setAmount(formatEther(balance));
            setError(null);
            return;
          }
        } catch {
          // Allow partial input (e.g., trailing decimal)
        }
      }
      setAmount(value);
      setError(null);
    }
  };

  // Helper to validate and cap position amounts at their respective balances
  const handlePositionAmountChange = (
    field: "wallet" | "collateralPool" | "sailPool",
    value: string,
    maxBalance: bigint
  ) => {
    // Only allow valid number format
    if (value !== "" && !/^\d*\.?\d*$/.test(value)) {
      return;
    }

    // If empty, just set it
    if (value === "") {
      setPositionAmounts((prev) => ({ ...prev, [field]: value }));
      return;
    }

    // Try to parse the value
    try {
      const parsedValue = parseEther(value);
      // If exceeds balance, cap at balance
      if (parsedValue > maxBalance) {
        setPositionAmounts((prev) => ({
          ...prev,
          [field]: formatEther(maxBalance),
        }));
      } else {
        setPositionAmounts((prev) => ({ ...prev, [field]: value }));
      }
    } catch {
      // If parsing fails (e.g., trailing decimal), allow the input
      setPositionAmounts((prev) => ({ ...prev, [field]: value }));
    }
  };

  // Check if any position amount exceeds its balance
  const positionExceedsBalance = useMemo(() => {
    const result = {
      wallet: false,
      collateralPool: false,
      sailPool: false,
    };

    try {
      if (positionAmounts.wallet && peggedBalance) {
        const amount = parseEther(positionAmounts.wallet);
        result.wallet = amount > peggedBalance;
      }
      if (positionAmounts.collateralPool && collateralPoolBalance) {
        const amount = parseEther(positionAmounts.collateralPool);
        result.collateralPool = amount > collateralPoolBalance;
      }
      if (positionAmounts.sailPool && sailPoolBalance) {
        const amount = parseEther(positionAmounts.sailPool);
        result.sailPool = amount > sailPoolBalance;
      }
    } catch {
      // Ignore parsing errors
    }

    return result;
  }, [positionAmounts, peggedBalance, collateralPoolBalance, sailPoolBalance]);

  const validateAmount = (): boolean => {
    if (process.env.NODE_ENV === "development") {
      console.log("[validateAmount] Starting validation", {
        amount,
        amountBigInt: amountBigInt.toString(),
        activeTab,
        simpleMode,
        isDirectPeggedDeposit,
        selectedAssetBalance: selectedAssetBalance?.toString(),
        directPeggedBalance: directPeggedBalance?.toString(),
        directPeggedBalanceLoading,
        collateralBalance: collateralBalance?.toString(),
        peggedBalance: peggedBalance?.toString(),
      });
    }

    if (!amount || parseFloat(amount) <= 0) {
      if (process.env.NODE_ENV === "development") {
        console.log("[validateAmount] Invalid amount:", {
          amount,
          parsed: parseFloat(amount),
        });
      }
      setError("Please enter a valid amount");
      return false;
    }
    if (activeTab === "deposit") {
      if (simpleMode && selectedAssetBalance !== null) {
        if (amountBigInt > selectedAssetBalance) {
          if (process.env.NODE_ENV === "development") {
            console.log("[validateAmount] Insufficient balance (simple mode)", {
              amountBigInt: amountBigInt.toString(),
              selectedAssetBalance: selectedAssetBalance.toString(),
            });
          }
          setError("Insufficient balance");
          return false;
        }
      } else if (isDirectPeggedDeposit) {
        // For direct pegged deposits, only check balance if it's loaded
        if (!directPeggedBalanceLoading && amountBigInt > directPeggedBalance) {
          if (process.env.NODE_ENV === "development") {
            console.log(
              "[validateAmount] Insufficient balance (direct pegged)",
              {
                amountBigInt: amountBigInt.toString(),
                directPeggedBalance: directPeggedBalance.toString(),
                isLoading: directPeggedBalanceLoading,
              }
            );
          }
          setError("Insufficient balance");
          return false;
        }
        // If still loading, skip balance check (will be validated on-chain)
        if (directPeggedBalanceLoading) {
          if (process.env.NODE_ENV === "development") {
            console.log(
              "[validateAmount] Balance still loading, skipping check"
            );
          }
        }
      } else if (!isDirectPeggedDeposit && amountBigInt > collateralBalance) {
        if (process.env.NODE_ENV === "development") {
          console.log("[validateAmount] Insufficient balance (collateral)", {
            amountBigInt: amountBigInt.toString(),
            collateralBalance: collateralBalance.toString(),
          });
        }
        setError("Insufficient balance");
        return false;
      }
    }
    // Note: For collateral deposits (!isDirectPeggedDeposit), we don't check pegged balance
    // because the user is depositing collateral to MINT pegged tokens, not depositing existing pegged tokens.
    // The pegged balance check only applies to direct pegged deposits, which is handled above.
    if (activeTab === "withdraw") {
      const sourceBalance = getAvailableBalance();
      if (amountBigInt > sourceBalance) {
        if (process.env.NODE_ENV === "development") {
          console.log("[validateAmount] Insufficient balance (withdraw)", {
            amountBigInt: amountBigInt.toString(),
            sourceBalance: sourceBalance.toString(),
          });
        }
        setError("Insufficient balance");
        return false;
      }
    }

    if (process.env.NODE_ENV === "development") {
      console.log("[validateAmount] Validation passed");
    }
    return true;
  };

  const handleMint = async () => {
    if (process.env.NODE_ENV === "development") {
      console.log("[handleMint] Starting deposit flow", {
        isDirectPeggedDeposit,
        simpleMode,
        selectedStabilityPool,
        amount,
        address,
        validateAmountResult: validateAmount(),
        writeContractAsync: !!writeContractAsync,
      });
    }

    if (!validateAmount() || !address) {
      if (process.env.NODE_ENV === "development") {
        console.log("[handleMint] Validation failed or no address");
      }
      return;
    }

    // Check if wallet is connected
    if (!isConnected) {
      const errorMsg = "Please connect your wallet to continue.";
      setError(errorMsg);
      setStep("error");
      if (process.env.NODE_ENV === "development") {
        console.error("[handleMint] Wallet is not connected");
      }
      return;
    }

    // Check if writeContractAsync is available
    if (!writeContractAsync) {
      const errorMsg =
        "Wallet connection error. Please ensure your wallet is connected and try again.";
      setError(errorMsg);
      setStep("error");
      if (process.env.NODE_ENV === "development") {
        console.error("[handleMint] writeContractAsync is not available");
      }
      return;
    }

    // For direct ha token deposits, we need a stability pool
    if (isDirectPeggedDeposit) {
      if (simpleMode) {
        if (
          !selectedStabilityPool ||
          selectedStabilityPool.poolType === "none"
        ) {
          setError("Please select a stability pool for ha token deposit");
          if (process.env.NODE_ENV === "development") {
            console.log("[handleMint] No stability pool selected");
          }
          return;
        }
      } else {
        if (!stabilityPoolAddress) {
          setError("Please select a stability pool for ha token deposit");
          if (process.env.NODE_ENV === "development") {
            console.log(
              "[handleMint] No stability pool address in advanced mode"
            );
          }
          return;
        }
      }
    } else {
      // For collateral deposits, we need a minter
      if (!minterAddress) {
        if (process.env.NODE_ENV === "development") {
          console.log("[handleMint] No minter address");
        }
        return;
      }
    }

    try {
      if (isDirectPeggedDeposit) {
        // Direct ha token deposit to stability pool - skip minting
        let targetPoolAddress: `0x${string}` | undefined;
        let targetPeggedTokenAddress: `0x${string}` | undefined;
        let targetMarket: any;

        if (simpleMode && selectedStabilityPool) {
          // Find the market for the selected stability pool
          targetMarket = marketsForToken.find(
            (m) => m.marketId === selectedStabilityPool.marketId
          )?.market;

          if (!targetMarket) {
            setError("Market not found for selected stability pool");
            return;
          }

          targetPoolAddress =
            selectedStabilityPool.poolType === "collateral"
              ? (targetMarket?.addresses?.stabilityPoolCollateral as
                  | `0x${string}`
                  | undefined)
              : (targetMarket?.addresses?.stabilityPoolLeveraged as
                  | `0x${string}`
                  | undefined);

          targetPeggedTokenAddress = targetMarket?.addresses?.peggedToken as
            | `0x${string}`
            | undefined;
        } else {
          // Advanced mode - use stabilityPoolAddress
          targetPoolAddress = stabilityPoolAddress;
          targetPeggedTokenAddress = marketForDepositAsset?.addresses
            ?.peggedToken as `0x${string}` | undefined;
        }

        if (!targetPoolAddress) {
          setError("Stability pool address not found");
          return;
        }

        if (!targetPeggedTokenAddress) {
          setError("Pegged token address not found");
          return;
        }

        // Use Anvil client for local development, regular publicClient for production
        const directDepositClient = shouldUseAnvil()
          ? anvilPublicClient
          : publicClient;

        // Check allowance for pegged token to stability pool
        if (process.env.NODE_ENV === "development") {
          console.log("[handleMint] Checking allowance", {
            tokenAddress: targetPeggedTokenAddress,
            poolAddress: targetPoolAddress,
            userAddress: address,
            shouldUseAnvil: shouldUseAnvil(),
          });
        }

        let directPeggedAllowance = 0n;
        try {
          const client = directDepositClient;

          if (!client) {
            if (process.env.NODE_ENV === "development") {
              console.warn(
                "[handleMint] No client available for allowance check"
              );
            }
            directPeggedAllowance = 0n;
          } else {
            directPeggedAllowance =
              (await client.readContract({
                address: targetPeggedTokenAddress,
                abi: ERC20_ABI,
                functionName: "allowance",
                args: [address as `0x${string}`, targetPoolAddress],
              })) || 0n;
          }
        } catch (allowanceError) {
          // If reading allowance fails, assume 0 (will need approval)
          if (process.env.NODE_ENV === "development") {
            console.warn(
              "[handleMint] Failed to read allowance, assuming 0:",
              allowanceError
            );
          }
          directPeggedAllowance = 0n;
        }

        if (process.env.NODE_ENV === "development") {
          console.log("[handleMint] Allowance check result", {
            allowance: directPeggedAllowance.toString(),
            amount: amountBigInt.toString(),
            needsApproval: amountBigInt > directPeggedAllowance,
          });
        }

        const needsDirectApproval = amountBigInt > directPeggedAllowance;
        setProgressConfig({
          mode: "direct",
          includeApproveCollateral: false,
          includeMint: false,
          includeApprovePegged: false,
          includeDeposit: false,
          includeDirectApprove: needsDirectApproval,
          includeDirectDeposit: true,
          title: "Deposit ha token",
        });
        setProgressModalOpen(true);

        // Step 1: Approve pegged token for stability pool (if needed)
        if (needsDirectApproval) {
          setStep("approving");
          setError(null);
          setTxHash(null);

          if (process.env.NODE_ENV === "development") {
            console.log("[handleMint] Approving token", {
              tokenAddress: targetPeggedTokenAddress,
              spender: targetPoolAddress,
              amount: amountBigInt.toString(),
              address,
              publicClient: !!publicClient,
            });
          }

          try {
            const approveHash = await writeContractAsync({
              address: targetPeggedTokenAddress,
              abi: ERC20_ABI,
              functionName: "approve",
              args: [targetPoolAddress, amountBigInt],
            });

            if (process.env.NODE_ENV === "development") {
              console.log(
                "[handleMint] Approval transaction hash:",
                approveHash
              );
            }

            setTxHash(approveHash);
            setTxHashes((prev) => ({ ...prev, directApprove: approveHash }));
            await directDepositClient?.waitForTransactionReceipt({
              hash: approveHash,
            });
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } catch (approveErr) {
            if (process.env.NODE_ENV === "development") {
              console.error("[handleMint] Approval error:", approveErr);
            }
            throw approveErr; // Re-throw to be caught by outer catch
          }
        }

        // Step 2: Deposit pegged token directly to stability pool
        setStep("depositing");
        setError(null);
        setTxHash(null);

        // Log deposit parameters for debugging
        if (process.env.NODE_ENV === "development") {
          console.log("[handleMint] Depositing to stability pool:", {
            poolAddress: targetPoolAddress,
            amount: amountBigInt.toString(),
            receiver: address,
            peggedTokenAddress: targetPeggedTokenAddress,
            address,
            publicClient: !!publicClient,
            writeContractAsync: !!writeContractAsync,
          });
        }

        try {
          if (process.env.NODE_ENV === "development") {
            console.log("[handleMint] About to call writeContractAsync with:", {
              address: targetPoolAddress,
              functionName: "deposit",
              args: [amountBigInt.toString(), address],
              amountBigInt: amountBigInt.toString(),
            });
          }

          const poolDepositHash = await writeContractAsync({
            address: targetPoolAddress,
            abi: STABILITY_POOL_ABI,
            functionName: "deposit",
            args: [amountBigInt, address as `0x${string}`],
          });

          if (!poolDepositHash) {
            throw new Error(
              "Transaction was not sent to wallet. No transaction hash returned."
            );
          }

          if (process.env.NODE_ENV === "development") {
            console.log(
              "[handleMint] Deposit transaction hash:",
              poolDepositHash
            );
          }

          setTxHash(poolDepositHash);
          setTxHashes((prev) => ({ ...prev, directDeposit: poolDepositHash }));
          await directDepositClient?.waitForTransactionReceipt({
            hash: poolDepositHash,
          });
        } catch (depositErr: any) {
          if (process.env.NODE_ENV === "development") {
            console.error("[handleMint] Deposit error:", depositErr);
            console.error("[handleMint] Error details:", {
              message: depositErr?.message,
              name: depositErr?.name,
              cause: depositErr?.cause,
              stack: depositErr?.stack,
            });
          }

          // Check if it's a user rejection
          if (
            depositErr?.name === "UserRejectedRequestError" ||
            depositErr?.message?.includes("User rejected") ||
            depositErr?.message?.includes("user rejected")
          ) {
            throw new Error("Transaction was rejected by user");
          }

          // Check if it's a connection/wallet issue
          if (
            depositErr?.message?.includes("not connected") ||
            depositErr?.message?.includes("No wallet") ||
            !depositErr?.message
          ) {
            throw new Error(
              "Wallet connection error. Please ensure your wallet is connected and try again."
            );
          }

          throw depositErr; // Re-throw to be caught by outer catch
        }
      } else {
        // Collateral deposit flow: mint then optionally deposit to stability pool
        // In simple mode, check if a stability pool is selected; in advanced mode, use depositInStabilityPool
        const shouldDepositToPool = simpleMode
          ? selectedStabilityPool &&
            selectedStabilityPool.poolType !== "none" &&
            !!stabilityPoolAddress
          : depositInStabilityPool && !mintOnly;
        const includeApprovePegged =
          shouldDepositToPool && needsPeggedTokenApproval;
        const includeDeposit = shouldDepositToPool;
        setProgressConfig({
          mode: "collateral",
          includeApproveCollateral: needsApproval,
          includeMint: true,
          includeApprovePegged,
          includeDeposit,
          includeDirectApprove: false,
          includeDirectDeposit: false,
          title: includeDeposit ? "Mint & Deposit" : "Mint pegged token",
        });
        setProgressModalOpen(true);
        // Use Anvil client for local development, regular publicClient for production
        const txClient = shouldUseAnvil() ? anvilPublicClient : publicClient;

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
          setTxHashes((prev) => ({ ...prev, approveCollateral: approveHash }));
          await txClient?.waitForTransactionReceipt({ hash: approveHash });
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

        if (process.env.NODE_ENV === "development") {
          console.log("[handleMint] About to mint pegged token:", {
            minterAddress,
            amountBigInt: amountBigInt.toString(),
            receiver: address,
            minPeggedOut: minPeggedOut.toString(),
            expectedMintOutput: expectedMintOutput?.toString(),
          });
        }

        const mintHash = await writeContractAsync({
          address: minterAddress as `0x${string}`,
          abi: minterABI,
          functionName: "mintPeggedToken",
          args: [amountBigInt, address as `0x${string}`, minPeggedOut],
        });

        if (process.env.NODE_ENV === "development") {
          console.log("[handleMint] Mint transaction hash:", mintHash);
        }

        setTxHash(mintHash);
        setTxHashes((prev) => ({ ...prev, mint: mintHash }));
        await txClient?.waitForTransactionReceipt({ hash: mintHash });

        // Refetch to get updated pegged token balance
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Step 3: If depositing to stability pool (and not mint only), approve and deposit
        if (process.env.NODE_ENV === "development") {
          console.log(
            "[handleMint] Checking if should deposit to stability pool:",
            {
              depositInStabilityPool,
              mintOnly,
              stabilityPoolAddress,
              simpleMode,
              selectedStabilityPool,
              shouldDepositToPool,
            }
          );
        }

        if (shouldDepositToPool) {
          if (!stabilityPoolAddress) {
            throw new Error(
              "Stability pool address not found. Cannot deposit to stability pool."
            );
          }

          // Use Anvil client for local development, regular publicClient for production
          const readClient = shouldUseAnvil()
            ? anvilPublicClient
            : publicClient;

          // Read actual pegged token balance after minting
          let actualPeggedBalance: bigint | undefined;
          try {
            actualPeggedBalance = await readClient?.readContract({
              address: peggedTokenAddress as `0x${string}`,
              abi: ERC20_ABI,
              functionName: "balanceOf",
              args: [address as `0x${string}`],
            });
          } catch (readErr) {
            if (process.env.NODE_ENV === "development") {
              console.warn(
                "[handleMint] Failed to read pegged balance, using expected output:",
                readErr
              );
            }
          }

          // Use expectedMintOutput for the deposit (what was just minted)
          // If expectedMintOutput is undefined (contract call failed), use the amount we sent to mint
          // as the fallback - this is what the user input as the deposit amount
          let depositAmount = expectedMintOutput;

          // Fallback 1: If expectedMintOutput is undefined, try using amountBigInt
          // This is reasonable because mint typically returns ~1:1 with collateral (adjusted for oracle price)
          if (!depositAmount || depositAmount === 0n) {
            if (process.env.NODE_ENV === "development") {
              console.log(
                "[handleMint] expectedMintOutput unavailable, using amountBigInt as fallback"
              );
            }
            depositAmount = amountBigInt;
          }

          // Fallback 2: If we still don't have a valid amount, try the actual balance
          if (!depositAmount || depositAmount === 0n) {
            if (actualPeggedBalance && actualPeggedBalance > 0n) {
              if (process.env.NODE_ENV === "development") {
                console.log(
                  "[handleMint] Using actualPeggedBalance as last resort fallback"
                );
              }
              depositAmount = actualPeggedBalance;
            }
          }

          if (process.env.NODE_ENV === "development") {
            console.log("[handleMint] Deposit amount calculation:", {
              actualPeggedBalance: actualPeggedBalance?.toString(),
              expectedMintOutput: expectedMintOutput?.toString(),
              amountBigInt: amountBigInt.toString(),
              depositAmount: depositAmount?.toString(),
              note: "Using expectedMintOutput or fallback to amountBigInt/actualPeggedBalance",
            });
          }

          if (!depositAmount || depositAmount === 0n) {
            throw new Error(
              `Failed to determine deposit amount. Expected mint output: ${expectedMintOutput?.toString()}`
            );
          }

          // Verify user has enough balance
          if (
            actualPeggedBalance !== undefined &&
            actualPeggedBalance < depositAmount
          ) {
            throw new Error(
              `Insufficient balance for deposit. Have: ${actualPeggedBalance?.toString()}, Need: ${depositAmount.toString()}`
            );
          }

          // Check if we need to approve pegged token for stability pool
          let currentAllowance: bigint | undefined;
          try {
            currentAllowance = await readClient?.readContract({
              address: peggedTokenAddress as `0x${string}`,
              abi: ERC20_ABI,
              functionName: "allowance",
              args: [address as `0x${string}`, stabilityPoolAddress],
            });
          } catch (allowanceErr) {
            if (process.env.NODE_ENV === "development") {
              console.warn(
                "[handleMint] Failed to read allowance, will request approval:",
                allowanceErr
              );
            }
            currentAllowance = 0n;
          }

          // Always check fresh allowance - if includeApprovePegged was set in progress config, we should do approval
          // This ensures the progress modal steps match what actually happens
          const needsPeggedApproval =
            includeApprovePegged || depositAmount > (currentAllowance || 0n);
          if (process.env.NODE_ENV === "development") {
            console.log("[handleMint] Pegged token allowance check:", {
              currentAllowance: currentAllowance?.toString(),
              depositAmount: depositAmount.toString(),
              needsPeggedApproval,
              includeApprovePegged,
              peggedTokenAddress,
              stabilityPoolAddress,
            });
          }

          if (needsPeggedApproval) {
            setStep("approvingPegged");
            setError(null);
            setTxHash(null);
            if (process.env.NODE_ENV === "development") {
              console.log(
                "[handleMint] Approving pegged token for stability pool:",
                {
                  peggedTokenAddress,
                  stabilityPoolAddress,
                  depositAmount: depositAmount.toString(),
                }
              );
            }
            const approvePeggedHash = await writeContractAsync({
              address: peggedTokenAddress as `0x${string}`,
              abi: ERC20_ABI,
              functionName: "approve",
              args: [stabilityPoolAddress, depositAmount],
            });
            setTxHash(approvePeggedHash);
            setTxHashes((prev) => ({
              ...prev,
              approvePegged: approvePeggedHash,
            }));
            await readClient?.waitForTransactionReceipt({
              hash: approvePeggedHash,
            });

            // Wait for approval to propagate and verify it's sufficient
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Verify allowance is now sufficient before proceeding
            let verifiedAllowance = 0n;
            let retries = 0;
            const maxRetries = 5;
            while (retries < maxRetries) {
              try {
                verifiedAllowance =
                  (await readClient?.readContract({
                    address: peggedTokenAddress as `0x${string}`,
                    abi: ERC20_ABI,
                    functionName: "allowance",
                    args: [address as `0x${string}`, stabilityPoolAddress],
                  })) || 0n;

                if (process.env.NODE_ENV === "development") {
                  console.log(
                    `[handleMint] Allowance verification attempt ${
                      retries + 1
                    }:`,
                    {
                      verifiedAllowance: verifiedAllowance.toString(),
                      depositAmount: depositAmount.toString(),
                      sufficient: verifiedAllowance >= depositAmount,
                    }
                  );
                }

                if (verifiedAllowance >= depositAmount) {
                  break;
                }
              } catch (verifyErr) {
                if (process.env.NODE_ENV === "development") {
                  console.warn(
                    `[handleMint] Allowance verification attempt ${
                      retries + 1
                    } failed:`,
                    verifyErr
                  );
                }
              }

              retries++;
              if (retries < maxRetries) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
              }
            }

            if (verifiedAllowance < depositAmount) {
              throw new Error(
                `Approval not confirmed. Expected allowance >= ${depositAmount.toString()}, got ${verifiedAllowance.toString()}. Please try again.`
              );
            }

            await refetchPeggedTokenAllowance();
          }

          // Deposit pegged token to stability pool
          setStep("depositing");
          setError(null);
          setTxHash(null);

          // Verify user has sufficient balance
          let userPeggedBalance: bigint | undefined;
          try {
            userPeggedBalance = await readClient?.readContract({
              address: peggedTokenAddress as `0x${string}`,
              abi: ERC20_ABI,
              functionName: "balanceOf",
              args: [address as `0x${string}`],
            });
          } catch (balanceErr) {
            if (process.env.NODE_ENV === "development") {
              console.warn(
                "[handleMint] Could not read user balance:",
                balanceErr
              );
            }
          }

          // Final allowance check
          let finalAllowance: bigint | undefined;
          try {
            finalAllowance = await readClient?.readContract({
              address: peggedTokenAddress as `0x${string}`,
              abi: ERC20_ABI,
              functionName: "allowance",
              args: [address as `0x${string}`, stabilityPoolAddress],
            });
          } catch (allowanceErr) {
            if (process.env.NODE_ENV === "development") {
              console.warn(
                "[handleMint] Could not read final allowance:",
                allowanceErr
              );
            }
          }

          if (process.env.NODE_ENV === "development") {
            console.log("[handleMint] About to deposit to stability pool:", {
              stabilityPoolAddress,
              peggedTokenAddress,
              depositAmount: depositAmount.toString(),
              userPeggedBalance: userPeggedBalance?.toString(),
              finalAllowance: finalAllowance?.toString(),
              receiver: address,
              hasEnoughBalance: userPeggedBalance
                ? userPeggedBalance >= depositAmount
                : "unknown",
              hasEnoughAllowance: finalAllowance
                ? finalAllowance >= depositAmount
                : "unknown",
            });
          }

          // Check balance
          if (
            userPeggedBalance !== undefined &&
            userPeggedBalance < depositAmount
          ) {
            throw new Error(
              `Insufficient balance. Have ${userPeggedBalance.toString()} but need ${depositAmount.toString()}`
            );
          }

          // Check allowance one more time
          if (finalAllowance !== undefined && finalAllowance < depositAmount) {
            throw new Error(
              `Insufficient allowance. Approved ${finalAllowance.toString()} but need ${depositAmount.toString()}`
            );
          }

          // Check if user has enough balance
          if (
            userPeggedBalance !== undefined &&
            userPeggedBalance < depositAmount
          ) {
            throw new Error(
              `Insufficient pegged token balance. Have ${userPeggedBalance.toString()} but need ${depositAmount.toString()}`
            );
          }

          // Try to simulate the deposit first to get a better error message
          try {
            await readClient?.simulateContract({
              address: stabilityPoolAddress,
              abi: STABILITY_POOL_ABI,
              functionName: "deposit",
              args: [depositAmount, address as `0x${string}`, 0n],
              account: address as `0x${string}`,
            });
            if (process.env.NODE_ENV === "development") {
              console.log("[handleMint] Deposit simulation succeeded");
            }
          } catch (simErr: any) {
            if (process.env.NODE_ENV === "development") {
              console.error("[handleMint] Deposit simulation failed:", simErr);
              console.error("[handleMint] Simulation error details:", {
                message: simErr?.message,
                cause: simErr?.cause?.message,
                shortMessage: simErr?.shortMessage,
              });
            }
            // Try to extract a meaningful error message
            const errorMsg =
              simErr?.cause?.message ||
              simErr?.shortMessage ||
              simErr?.message ||
              "Unknown error";
            throw new Error(
              `Deposit would fail: ${errorMsg}. The stability pool may be in genesis mode or have other restrictions.`
            );
          }

          const poolDepositHash = await writeContractAsync({
            address: stabilityPoolAddress,
            abi: STABILITY_POOL_ABI,
            functionName: "deposit",
            args: [depositAmount, address as `0x${string}`, 0n],
            account: address as `0x${string}`,
            gas: 500000n, // Add explicit gas limit for Anvil
          });

          if (!poolDepositHash) {
            throw new Error(
              "Transaction was not sent to wallet. No transaction hash returned."
            );
          }

          if (process.env.NODE_ENV === "development") {
            console.log(
              "[handleMint] Deposit transaction hash:",
              poolDepositHash
            );
          }

          setTxHash(poolDepositHash);
          setTxHashes((prev) => ({ ...prev, deposit: poolDepositHash }));
          await readClient?.waitForTransactionReceipt({
            hash: poolDepositHash,
          });
        }
      }

      setStep("success");
      if (onSuccess) {
        await onSuccess();
      }
    } catch (err) {
      console.error("[handleMint] Error:", err);
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
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      if (process.env.NODE_ENV === "development") {
        console.error("[handleMint] Full error details:", {
          error: err,
          errorMessage,
          stack: err instanceof Error ? err.stack : undefined,
        });
      }

      setError(errorMessage);
      setStep("error");
    }
  };

  const handleDeposit = async () => {
    if (!validateAmount() || !address || !stabilityPoolAddress) return;

    // Check if wallet is connected
    if (!isConnected) {
      setError("Please connect your wallet to continue.");
      setStep("error");
      return;
    }

    // Check if writeContractAsync is available
    if (!writeContractAsync) {
      setError(
        "Wallet connection error. Please ensure your wallet is connected and try again."
      );
      setStep("error");
      return;
    }

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

      if (process.env.NODE_ENV === "development") {
        console.log("[handleDeposit] About to deposit to stability pool:", {
          address: stabilityPoolAddress,
          amount: amountBigInt.toString(),
          receiver: address,
        });
      }

      const depositHash = await writeContractAsync({
        address: stabilityPoolAddress,
        abi: STABILITY_POOL_ABI,
        functionName: "deposit",
        args: [amountBigInt, address as `0x${string}`, 0n],
        account: address as `0x${string}`,
      });

      if (!depositHash) {
        throw new Error(
          "Transaction was not sent to wallet. No transaction hash returned."
        );
      }

      setTxHash(depositHash);
      await publicClient?.waitForTransactionReceipt({ hash: depositHash });

      setStep("success");
      if (onSuccess) {
        await onSuccess();
      }
    } catch (err: any) {
      console.error("Deposit error:", err);
      let errorMessage = "Transaction failed";

      // Check if it's a user rejection
      if (
        err?.name === "UserRejectedRequestError" ||
        err?.message?.includes("User rejected") ||
        err?.message?.includes("user rejected")
      ) {
        errorMessage = "Transaction was rejected by user";
      } else if (err instanceof BaseError) {
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
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      // Check if it's a connection/wallet issue
      if (
        err?.message?.includes("not connected") ||
        err?.message?.includes("No wallet") ||
        !errorMessage ||
        errorMessage === "Transaction failed"
      ) {
        errorMessage =
          "Wallet connection error. Please ensure your wallet is connected and try again.";
      }

      setError(errorMessage);
      setStep("error");
    }
  };

  const handleWithdrawMethodSelection = () => {
    // Withdrawal method is now selected inline in the position cards
    // Go directly to execution
    handleWithdrawExecution();
  };

  const handleWithdrawExecution = async () => {
    console.log("[handleWithdrawExecution] Starting withdrawal execution", {
      address,
      minterAddress,
      selectedPositions,
      positionAmounts,
      withdrawalMethods,
      withdrawOnly,
      writeContractAsync: !!writeContractAsync,
    });

    if (!address || !minterAddress) {
      console.error(
        "[handleWithdrawExecution] Missing address or minterAddress",
        {
          address,
          minterAddress,
        }
      );
      setError("Wallet not connected or minter not configured");
      return;
    }

    // Check if writeContractAsync is available
    if (!writeContractAsync) {
      const errorMsg =
        "Wallet connection error. Please ensure your wallet is connected and try again.";
      setError(errorMsg);
      setStep("error");
      console.error(
        "[handleWithdrawExecution] writeContractAsync is not available"
      );
      return;
    }

    try {
      // Validate individual amounts
      let totalPeggedTokens = 0n;
      const walletAmount =
        selectedPositions.wallet && positionAmounts.wallet
          ? parseEther(positionAmounts.wallet)
          : 0n;
      const collateralAmount =
        selectedPositions.collateralPool &&
        withdrawalMethods.collateralPool !== "request" &&
        positionAmounts.collateralPool
          ? parseEther(positionAmounts.collateralPool)
          : 0n;
      const sailAmount =
        selectedPositions.sailPool &&
        withdrawalMethods.sailPool !== "request" &&
        positionAmounts.sailPool
          ? parseEther(positionAmounts.sailPool)
          : 0n;
      const collateralIsImmediate =
        collateralAmount > 0n &&
        selectedPositions.collateralPool &&
        withdrawalMethods.collateralPool !== "request";
      const sailIsImmediate =
        sailAmount > 0n &&
        selectedPositions.sailPool &&
        withdrawalMethods.sailPool !== "request";
      const redeemableTotal =
        walletAmount +
        (collateralIsImmediate ? collateralAmount : 0n) +
        (sailIsImmediate ? sailAmount : 0n);
      const estimatedNeedsRedeemApproval =
        !withdrawOnly &&
        redeemableTotal > 0n &&
        (peggedTokenMinterAllowanceData !== undefined
          ? redeemableTotal > peggedTokenMinterAllowanceData
          : true);

      setProgressConfig({
        mode: "withdraw",
        includeApproveCollateral: false,
        includeMint: false,
        includeApprovePegged: false,
        includeDeposit: false,
        includeDirectApprove: false,
        includeDirectDeposit: false,
        includeWithdrawCollateral:
          (!!collateralPoolAddress &&
            withdrawalMethods.collateralPool === "request") ||
          (collateralAmount > 0n && !!collateralPoolAddress),
        includeWithdrawSail:
          (!!sailPoolAddress && withdrawalMethods.sailPool === "request") ||
          (sailAmount > 0n && !!sailPoolAddress),
        includeApproveRedeem:
          !withdrawOnly && redeemableTotal > 0n && estimatedNeedsRedeemApproval,
        includeRedeem: !withdrawOnly && redeemableTotal > 0n,
        withdrawCollateralLabel:
          withdrawalMethods.collateralPool === "request"
            ? "Request withdraw (collateral pool)"
            : "Withdraw from collateral pool",
        withdrawSailLabel:
          withdrawalMethods.sailPool === "request"
            ? "Request withdraw (sail pool)"
            : "Withdraw from sail pool",
        title: withdrawOnly ? "Withdraw" : "Withdraw & Redeem",
      });
      setProgressModalOpen(true);

      // Validate wallet amount
      if (walletAmount > 0n) {
        console.log("[handleWithdrawExecution] Validating wallet amount:", {
          walletAmount: walletAmount.toString(),
          peggedBalance: peggedBalance.toString(),
        });
        if (walletAmount > peggedBalance) {
          throw new Error("Insufficient balance in wallet");
        }
        totalPeggedTokens += walletAmount;
      }

      // Validate collateral pool amount
      if (collateralAmount > 0n) {
        console.log(
          "[handleWithdrawExecution] Validating collateral pool amount:",
          {
            collateralAmount: collateralAmount.toString(),
            collateralPoolBalance: collateralPoolBalance.toString(),
            collateralPoolAddress,
          }
        );
        if (collateralAmount > collateralPoolBalance) {
          throw new Error(
            `Insufficient balance in collateral pool. Have: ${formatEther(
              collateralPoolBalance
            )}, Want: ${formatEther(collateralAmount)}`
          );
        }
        totalPeggedTokens += collateralAmount;
      }

      // Validate sail pool amount
      if (sailAmount > 0n) {
        console.log("[handleWithdrawExecution] Validating sail pool amount:", {
          sailAmount: sailAmount.toString(),
          sailPoolBalance: sailPoolBalance.toString(),
          sailPoolAddress,
        });
        if (sailAmount > sailPoolBalance) {
          throw new Error(
            `Insufficient balance in sail pool. Have: ${formatEther(
              sailPoolBalance
            )}, Want: ${formatEther(sailAmount)}`
          );
        }
        totalPeggedTokens += sailAmount;
      }

      if (
        totalPeggedTokens === 0n &&
        withdrawalMethods.collateralPool !== "request" &&
        withdrawalMethods.sailPool !== "request" &&
        !(selectedPositions.wallet && walletAmount > 0n)
      ) {
        throw new Error(
          "Please select at least one position and enter an amount"
        );
      }

      const txClient = shouldUseAnvil() ? anvilPublicClient : publicClient;

      setStep("withdrawing");
      setError(null);
      setTxHash(null);

      let peggedTokensReceived = 0n;

      // Withdraw from wallet (ha tokens) if selected
      // Note: Wallet tokens are already in wallet, so we don't need to withdraw them
      // We just need to account for them in the total
      if (selectedPositions.wallet && positionAmounts.wallet) {
        const walletAmount = parseEther(positionAmounts.wallet);
        peggedTokensReceived += walletAmount;
      }

      // Withdraw from collateral pool if selected
      if (
        selectedPositions.collateralPool &&
        collateralPoolAddress &&
        (withdrawalMethods.collateralPool === "request" ||
          positionAmounts.collateralPool)
      ) {
        const withdrawFromCollateral = collateralAmount;

        if (withdrawFromCollateral > 0n) {
          const method = withdrawalMethods.collateralPool;
          console.log("[handleWithdrawExecution] Collateral pool withdrawal:", {
            method,
            amount: withdrawFromCollateral.toString(),
            poolAddress: collateralPoolAddress,
            userAddress: address,
          });

          if (method === "request") {
            // Request withdrawal - starts the fee-free window (no parameters)
            setStep("requestingCollateral");
            console.log(
              "[handleWithdrawExecution] Calling requestWithdrawal on collateral pool:",
              {
                address: collateralPoolAddress,
              }
            );
            const requestHash = await writeContractAsync({
              address: collateralPoolAddress as `0x${string}`,
              abi: STABILITY_POOL_ABI,
              functionName: "requestWithdrawal",
              args: [],
            });
            setTxHash(requestHash);
            setTxHashes((prev) => ({
              ...prev,
              requestCollateral: requestHash,
            }));
            await txClient?.waitForTransactionReceipt({
              hash: requestHash,
            });
            // Don't add to peggedTokensReceived - tokens stay in pool until user calls withdraw during window
          } else {
            // Immediate withdrawal - use direct withdraw function
            setStep("withdrawingCollateral");

            const collateralWithdrawHash = await writeContractAsync({
              address: collateralPoolAddress as `0x${string}`,
              abi: STABILITY_POOL_ABI,
              functionName: "withdraw",
              args: [withdrawFromCollateral, address as `0x${string}`, 0n], // assetAmount, receiver, minAmount
            });
            setTxHash(collateralWithdrawHash);
            setTxHashes((prev) => ({
              ...prev,
              withdrawCollateral: collateralWithdrawHash,
            }));
            await txClient?.waitForTransactionReceipt({
              hash: collateralWithdrawHash,
            });
            peggedTokensReceived += withdrawFromCollateral;
          }
        }
      }

      // Withdraw from sail pool if selected
      if (
        selectedPositions.sailPool &&
        sailPoolAddress &&
        (withdrawalMethods.sailPool === "request" || positionAmounts.sailPool)
      ) {
        const withdrawFromSail = sailAmount;

        if (withdrawFromSail > 0n) {
          const sailMethod = withdrawalMethods.sailPool;
          console.log("[handleWithdrawExecution] Sail pool withdrawal:", {
            method: sailMethod,
            amount: withdrawFromSail.toString(),
            poolAddress: sailPoolAddress,
            userAddress: address,
          });

          if (sailMethod === "request") {
            // Request withdrawal - starts the fee-free window (no parameters)
            setStep("requestingSail");
            console.log(
              "[handleWithdrawExecution] Calling requestWithdrawal on sail pool:",
              {
                address: sailPoolAddress,
              }
            );
            const requestHash = await writeContractAsync({
              address: sailPoolAddress as `0x${string}`,
              abi: STABILITY_POOL_ABI,
              functionName: "requestWithdrawal",
              args: [],
            });
            setTxHash(requestHash);
            setTxHashes((prev) => ({ ...prev, requestSail: requestHash }));
            await txClient?.waitForTransactionReceipt({
              hash: requestHash,
            });
            // Don't add to peggedTokensReceived - tokens stay in pool until user calls withdraw during window
          } else {
            // Immediate withdrawal - use direct withdraw function
            setStep("withdrawingSail");

            const sailWithdrawHash = await writeContractAsync({
              address: sailPoolAddress as `0x${string}`,
              abi: STABILITY_POOL_ABI,
              functionName: "withdraw",
              args: [withdrawFromSail, address as `0x${string}`, 0n], // assetAmount, receiver, minAmount
            });
            setTxHash(sailWithdrawHash);
            setTxHashes((prev) => ({
              ...prev,
              withdrawSail: sailWithdrawHash,
            }));
            await txClient?.waitForTransactionReceipt({
              hash: sailWithdrawHash,
            });
            peggedTokensReceived += withdrawFromSail;
          }
        }
      }

      // Redeem pegged tokens for collateral (default behavior unless"Withdraw only" is checked)
      if (!withdrawOnly && peggedTokensReceived > 0n) {
        // Use the correct client based on environment
        const client = shouldUseAnvil() ? anvilPublicClient : publicClient;

        if (!client) {
          throw new Error("No client available for contract reads");
        }

        // Step 1: Check and approve pegged token for minter (if needed)
        let currentAllowance = 0n;
        try {
          currentAllowance =
            ((await client.readContract({
              address: peggedTokenAddress as `0x${string}`,
              abi: ERC20_ABI,
              functionName: "allowance",
              args: [address as `0x${string}`, minterAddress as `0x${string}`],
            })) as bigint) || 0n;
        } catch (allowErr) {
          console.warn(
            "[handleWithdrawExecution] Allowance read failed, assuming 0",
            allowErr
          );
          currentAllowance = 0n;
        }

        const needsApproval = peggedTokensReceived > currentAllowance;
        console.log("[handleWithdrawExecution] Redeem approval check:", {
          peggedTokensReceived: peggedTokensReceived.toString(),
          currentAllowance: currentAllowance.toString(),
          needsApproval,
        });

        if (needsApproval) {
          setStep("approving");
          setError(null);
          setTxHash(null);

          console.log(
            "[handleWithdrawExecution] Approving pegged token for minter:",
            {
              peggedTokenAddress,
              minterAddress,
              amount: peggedTokensReceived.toString(),
            }
          );

          const approveHash = await writeContractAsync({
            address: peggedTokenAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [minterAddress as `0x${string}`, peggedTokensReceived],
          });
          setTxHash(approveHash);
          setTxHashes((prev) => ({ ...prev, approveRedeem: approveHash }));
          await client.waitForTransactionReceipt({ hash: approveHash });
          // Small delay to allow state to propagate
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // Step 2: Redeem pegged tokens
        setStep("redeeming");
        setError(null);
        setTxHash(null);

        // Do a fresh dry-run with the exact amount we're about to redeem
        let minCollateralOut: bigint;
        console.log("[Redeem] Performing fresh dry-run for exact amount:", {
          peggedTokensReceived: peggedTokensReceived.toString(),
        });

        try {
          const freshDryRunResult = (await client.readContract({
            address: minterAddress as `0x${string}`,
            abi: minterABI,
            functionName: "redeemPeggedTokenDryRun",
            args: [peggedTokensReceived],
          })) as
            | [bigint, bigint, bigint, bigint, bigint, bigint, bigint]
            | undefined;

          if (
            freshDryRunResult &&
            Array.isArray(freshDryRunResult) &&
            freshDryRunResult.length >= 5
          ) {
            const wrappedCollateralReturned = freshDryRunResult[4];
            minCollateralOut = (wrappedCollateralReturned * 99n) / 100n;
            console.log("[Redeem] Fresh dry-run result:", {
              wrappedCollateralReturned: wrappedCollateralReturned.toString(),
              minCollateralOut: minCollateralOut.toString(),
            });
          } else if (redeemDryRun?.wrappedCollateralReturned) {
            // Fall back to cached dry-run if fresh one fails
            minCollateralOut =
              (redeemDryRun.wrappedCollateralReturned * 99n) / 100n;
            console.log("[Redeem] Using cached dry-run result:", {
              wrappedCollateralReturned:
                redeemDryRun.wrappedCollateralReturned.toString(),
              minCollateralOut: minCollateralOut.toString(),
            });
          } else {
            // Use 0 to skip slippage check
            minCollateralOut = 0n;
            console.log(
              "[Redeem] No dry-run result, using minCollateralOut = 0"
            );
          }
        } catch (dryRunError) {
          console.warn(
            "[Redeem] Fresh dry-run failed, using minCollateralOut = 0:",
            dryRunError
          );
          minCollateralOut = 0n;
        }

        let redeemHash: `0x${string}` | undefined;
        try {
          redeemHash = await writeContractAsync({
            address: minterAddress as `0x${string}`,
            abi: minterABI,
            functionName: "redeemPeggedToken",
            args: [
              peggedTokensReceived,
              address as `0x${string}`,
              minCollateralOut,
            ],
          });
        } catch (redeemErr: any) {
          // If redeem fails, try again with minCollateralOut = 0 to bypass slippage checks
          console.warn(
            "[handleWithdrawExecution] redeemPeggedToken reverted with minCollateralOut, retrying with 0",
            redeemErr
          );
          redeemHash = await writeContractAsync({
            address: minterAddress as `0x${string}`,
            abi: minterABI,
            functionName: "redeemPeggedToken",
            args: [peggedTokensReceived, address as `0x${string}`, 0n],
          });
        }
        setTxHash(redeemHash);
        setTxHashes((prev) => ({ ...prev, redeem: redeemHash }));
        await client.waitForTransactionReceipt({ hash: redeemHash });
      }

      setStep("success");
      if (onSuccess) {
        await onSuccess();
      }
    } catch (err: any) {
      console.error("Withdraw error:", err);
      console.error("Withdraw error details:", {
        message: err?.message,
        shortMessage: err?.shortMessage,
        cause: err?.cause,
        details: err?.details,
        name: err?.name,
      });
      let errorMessage = "Transaction failed";

      if (err instanceof BaseError) {
        const revertError = err.walk(
          (err) => err instanceof ContractFunctionRevertedError
        );
        if (revertError instanceof ContractFunctionRevertedError) {
          errorMessage = `Contract error: ${
            revertError.data?.errorName || "Unknown error"
          }`;
          console.error("Revert error data:", revertError.data);
        } else {
          errorMessage = err.shortMessage || err.message;
        }
      } else if (err?.message) {
        errorMessage = err.message;
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

    // Get the pegged token address for the selected redeem market
    const targetPeggedTokenAddress =
      selectedRedeemMarket?.market?.addresses?.peggedToken ||
      peggedTokenAddress;
    if (!targetPeggedTokenAddress) return;

    // Use the summed redeem input (positions or single amount)
    const redeemAmount = redeemInputAmount || amountBigInt;
    if (!redeemAmount || redeemAmount <= 0n) return;

    try {
      // Check if we need to approve pegged token for minter (explicit RPC read, Anvil-aware)
      let currentAllowance = peggedTokenMinterAllowanceData || 0n;
      try {
        const client = shouldUseAnvil() ? anvilPublicClient : publicClient;
        if (client) {
          currentAllowance =
            (await client.readContract({
              address: targetPeggedTokenAddress,
              abi: ERC20_ABI,
              functionName: "allowance",
              args: [address as `0x${string}`, targetMinterAddress],
            })) || 0n;
        }
      } catch (allowErr) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "[handleRedeem] Allowance read failed, assuming 0",
            allowErr
          );
        }
        currentAllowance = 0n;
      }

      const needsApproval = redeemAmount > currentAllowance;

      // Set up progress modal for redeem flow
      setProgressConfig({
        mode: "withdraw",
        includeApproveCollateral: false,
        includeMint: false,
        includeApprovePegged: false,
        includeDeposit: false,
        includeDirectApprove: false,
        includeDirectDeposit: false,
        includeWithdrawCollateral: false,
        includeWithdrawSail: false,
        includeApproveRedeem: needsApproval,
        includeRedeem: true,
        title: "Redeem",
      });
      setProgressModalOpen(true);

      if (process.env.NODE_ENV === "development") {
        console.log("[handleRedeem] Starting redeem flow:", {
          targetMinterAddress,
          targetPeggedTokenAddress,
          amount: redeemAmount.toString(),
          currentAllowance: currentAllowance.toString(),
          needsApproval,
        });
      }

      // Step 1: Approve pegged token for minter (if needed)
      if (needsApproval) {
        setStep("approving");
        setError(null);
        setTxHash(null);

        if (process.env.NODE_ENV === "development") {
          console.log("[handleRedeem] Approving pegged token for minter:", {
            peggedTokenAddress: targetPeggedTokenAddress,
            minterAddress: targetMinterAddress,
            amount: redeemAmount.toString(),
          });
        }

        const approveHash = await writeContractAsync({
          address: targetPeggedTokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [targetMinterAddress as `0x${string}`, redeemAmount],
        });
        setTxHash(approveHash);
        setTxHashes((prev) => ({ ...prev, approveRedeem: approveHash }));
        await publicClient?.waitForTransactionReceipt({ hash: approveHash });
        await refetchPeggedTokenMinterAllowance();
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await refetchPeggedTokenMinterAllowance();
      }

      // Step 2: Redeem pegged token
      setStep("redeeming");
      setError(null);
      setTxHash(null);

      const minCollateralOut = redeemDryRun?.wrappedCollateralReturned
        ? (redeemDryRun.wrappedCollateralReturned * 99n) / 100n
        : 0n;

      if (process.env.NODE_ENV === "development") {
        console.log("[handleRedeem] Calling redeemPeggedToken:", {
          minterAddress: targetMinterAddress,
          amount: redeemAmount.toString(),
          minCollateralOut: minCollateralOut.toString(),
        });
      }

      let redeemHash: `0x${string}` | undefined;
      try {
        redeemHash = await writeContractAsync({
          address: targetMinterAddress as `0x${string}`,
          abi: minterABI,
          functionName: "redeemPeggedToken",
          args: [redeemAmount, address as `0x${string}`, minCollateralOut],
        });
      } catch (callErr: any) {
        // On Anvil, some view prechecks may revert; retry with zero floor to surface allowance/amount issues
        if (shouldUseAnvil() && minCollateralOut > 0n) {
          if (process.env.NODE_ENV === "development") {
            console.warn(
              "[handleRedeem] redeemPeggedToken reverted with minCollateralOut, retrying with 0",
              callErr
            );
          }
          redeemHash = await writeContractAsync({
            address: targetMinterAddress as `0x${string}`,
            abi: minterABI,
            functionName: "redeemPeggedToken",
            args: [redeemAmount, address as `0x${string}`, 0n],
          });
        } else {
          throw callErr;
        }
      }
      setTxHash(redeemHash);
      setTxHashes((prev) => ({ ...prev, redeem: redeemHash }));
      await publicClient?.waitForTransactionReceipt({ hash: redeemHash });

      setStep("success");
      if (onSuccess) {
        await onSuccess();
      }
    } catch (err: any) {
      console.error("Redeem error:", err);
      let errorMessage = "Transaction failed";

      // Check if it's a user rejection
      if (
        err?.name === "UserRejectedRequestError" ||
        err?.message?.includes("User rejected") ||
        err?.message?.includes("user rejected")
      ) {
        errorMessage = "Transaction was rejected by user";
      } else if (err instanceof BaseError) {
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
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setStep("error");
    }
  };

  const handleAction = () => {
    // If in error state, reset to input and allow retry
    if (step === "error") {
      setStep("input");
      setError(null);
      setTxHash(null);
      return;
    }

    if (activeTab === "deposit") {
      handleMint();
    } else if (activeTab === "withdraw") {
      if (redeemOnly) {
        handleRedeem();
      } else {
        // Withdrawal method is now selected inline - go directly to execution
        handleWithdrawExecution();
      }
    }
  };

  const getButtonText = () => {
    if (activeTab === "deposit") {
      switch (step) {
        case "approving":
          return "Approving...";
        case "minting":
          return "Minting...";
        case "depositing":
          return "Depositing...";
        case "success":
          return mintOnly ? "Mint" : "Mint & Deposit";
        case "error":
          return "Try Again";
        default:
          if (mintOnly) {
            return needsApproval ? "Approve & Mint" : "Mint";
          } else {
            return needsApproval || needsPeggedTokenApproval
              ? "Approve & Mint & Deposit"
              : "Mint & Deposit";
          }
      }
    } else if (activeTab === "withdraw") {
      const baseLabel = "Proceed";

      if (withdrawOnly) {
        switch (step) {
          case "withdrawing":
            return "Withdrawing...";
          case "success":
            return baseLabel;
          case "error":
            return "Try Again";
          default:
            return baseLabel;
        }
      } else if (redeemOnly) {
        switch (step) {
          case "approving":
            return "Approving...";
          case "redeeming":
            return "Redeeming...";
          case "success":
            return baseLabel;
          case "error":
            return "Try Again";
          default:
            return baseLabel;
        }
      } else {
        switch (step) {
          case "approving":
            return "Approving...";
          case "withdrawing":
            return "Withdrawing...";
          case "redeeming":
            return "Redeeming...";
          case "success":
            return baseLabel;
          case "error":
            return "Try Again";
          default:
            return baseLabel;
        }
      }
    }
    return "Submit";
  };

  const isButtonDisabled = () => {
    if (step === "success") return false;
    if (step === "error") return false; // Allow retry when in error state
    if (activeTab === "deposit") {
      return (
        step === "approving" ||
        step === "minting" ||
        step === "depositing" ||
        !amount ||
        parseFloat(amount) <= 0
      );
    } else if (activeTab === "withdraw") {
      // Check if at least one position is selected with a valid amount
      const hasRequestSelected =
        (selectedPositions.collateralPool &&
          withdrawalMethods.collateralPool === "request") ||
        (selectedPositions.sailPool &&
          withdrawalMethods.sailPool === "request");

      const hasValidAmount =
        (selectedPositions.wallet &&
          positionAmounts.wallet &&
          parseFloat(positionAmounts.wallet) > 0) ||
        (selectedPositions.collateralPool &&
          withdrawalMethods.collateralPool !== "request" &&
          positionAmounts.collateralPool &&
          parseFloat(positionAmounts.collateralPool) > 0) ||
        (selectedPositions.sailPool &&
          withdrawalMethods.sailPool !== "request" &&
          positionAmounts.sailPool &&
          parseFloat(positionAmounts.sailPool) > 0) ||
        hasRequestSelected;

      return (
        step === "approving" ||
        step === "withdrawing" ||
        step === "redeeming" ||
        !hasValidAmount
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
  // For mint tab: use ha token balance if ha token is selected, otherwise use collateral balance
  const balance =
    activeTab === "deposit"
      ? isDirectPeggedDeposit
        ? directPeggedBalance
        : collateralBalance
      : activeTab === "deposit"
      ? peggedBalance
      : activeTab === "withdraw"
      ? getAvailableBalance()
      : peggedBalance;
  const balanceSymbol =
    activeTab === "deposit"
      ? isDirectPeggedDeposit
        ? marketForDepositAsset?.peggedToken?.symbol || peggedTokenSymbol
        : collateralSymbol
      : peggedTokenSymbol;

  // Calculate expected output based on tab
  const expectedOutput =
    activeTab === "deposit"
      ? expectedMintOutput
      : activeTab === "withdraw" && (!withdrawOnly || redeemOnly)
      ? expectedRedeemOutput
      : undefined;
  const outputSymbol =
    activeTab === "deposit"
      ? peggedTokenSymbol
      : activeTab === "withdraw" && (!withdrawOnly || redeemOnly)
      ? selectedRedeemAsset || collateralSymbol
      : activeTab === "withdraw"
      ? peggedTokenSymbol
      : undefined;

  if (!isOpen) return null;

  // Check if any request withdrawals were made
  const hasRequestWithdrawals =
    (selectedPositions.collateralPool &&
      withdrawalMethods.collateralPool === "request") ||
    (selectedPositions.sailPool && withdrawalMethods.sailPool === "request");

  // When progress modal is showing, hide the main manage modal
  if (showProgressModal) {
    return (
      <TransactionProgressModal
        isOpen={showProgressModal}
        onClose={handleProgressClose}
        title={progressConfig.title}
        steps={progressSteps}
        currentStepIndex={currentProgressIndex}
        onRetry={step === "error" ? handleProgressRetry : undefined}
        errorMessage={error || undefined}
        renderSuccessContent={
          hasRequestWithdrawals
            ? () => (
                <div className="p-3 bg-blue-50 border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Tip:</strong> You can view and manage your
                    withdrawal requests by expanding the market card on the
                    Anchor page.
                  </p>
                </div>
              )
            : undefined
        }
      />
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={handleClose}
        />

        <div className="relative bg-white shadow-2xl w-full max-w-xl mx-4 max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-0 scale-in-95 duration-200">
          {/* Header with tabs and close button */}
          <div className="flex items-center justify-between p-0 pt-3 px-3 border-b border-[#d1d7e5]">
            {/* Tab-style header - takes most of width but leaves room for X */}
            <div className="flex flex-1 mr-4 border border-[#d1d7e5] border-b-0 overflow-hidden">
              <button
                onClick={() => handleTabChange("deposit")}
                disabled={isProcessing}
                className={`flex-1 py-3 text-base font-semibold transition-colors ${
                  activeTab === "deposit"
                    ? "bg-[#1E4775] text-white"
                    : "bg-[#eef1f7] text-[#4b5a78]"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Deposit
              </button>
              <button
                onClick={() => handleTabChange("withdraw")}
                disabled={isProcessing}
                className={`flex-1 py-3 text-base font-semibold transition-colors ${
                  activeTab === "withdraw"
                    ? "bg-[#1E4775] text-white"
                    : "bg-[#eef1f7] text-[#4b5a78]"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Withdraw
              </button>
            </div>
            <button
              onClick={handleClose}
              className="text-[#1E4775]/50 hover:text-[#1E4775] transition-colors disabled:opacity-30 flex-shrink-0"
              title={
                isProcessing ? "Close modal (will cancel transaction)" : "Close"
              }
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

          <div className="p-5 flex-1 overflow-y-auto">
            {simpleMode && activeTab === "deposit" ? (
              // Simple Mode: Step-by-Step Flow
              <div className="space-y-4">
                {/* Step Labels with arrows */}
                <div className="flex items-center justify-center text-xs text-[#1E4775]/50 pb-3 border-b border-[#d1d7e5]">
                  <div
                    className={`${
                      currentStep === 1 ? "text-[#1E4775] font-semibold" : ""
                    }`}
                  >
                    1. Deposit Token & Amount
                  </div>
                  {!mintOnly && !skipRewardStep && (
                    <>
                      <svg
                        className="w-4 h-4 mx-3 text-[#1E4775]/30"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                      <div
                        className={`${
                          currentStep === 2
                            ? "text-[#1E4775] font-semibold"
                            : ""
                        }`}
                      >
                        2. Reward Token
                      </div>
                      <svg
                        className="w-4 h-4 mx-3 text-[#1E4775]/30"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                      <div
                        className={`${
                          currentStep === 3
                            ? "text-[#1E4775] font-semibold"
                            : ""
                        }`}
                      >
                        3. Stability Pool
                      </div>
                    </>
                  )}
                  {!mintOnly && skipRewardStep && (
                    <>
                      <svg
                        className="w-4 h-4 mx-3 text-[#1E4775]/30"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                      <div
                        className={`${
                          currentStep === 2
                            ? "text-[#1E4775] font-semibold"
                            : ""
                        }`}
                      >
                        2. Stability Pool
                      </div>
                    </>
                  )}
                </div>

                {/* Step 1: Deposit Token & Amount */}
                {currentStep === 1 && (
                  <div className="space-y-4 animate-in fade-in-0 slide-in-from-right-2 duration-200">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-semibold text-[#1E4775] mb-1.5">
                          Select Deposit Token
                        </label>
                        <select
                          value={selectedDepositAsset}
                          onChange={(e) => {
                            setSelectedDepositAsset(e.target.value);
                            setAmount(""); // Reset amount when changing asset
                            setError(null); // Clear any errors
                          }}
                          disabled={isProcessing}
                          className="w-full px-4 py-3 bg-white text-[#1E4775] border-2 border-[#1E4775]/30 focus:border-[#1E4775] focus:ring-2 focus:ring-[#1E4775]/20 focus:outline-none text-base"
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
                          selectedDepositAsset !== activeCollateralSymbol &&
                          !isDirectPeggedDeposit && (
                            <p className="mt-2 text-xs text-[#1E4775]/60 flex items-center gap-1">
                              <span>ℹ️</span>
                              <span>
                                This will be converted to{""}
                                {activeCollateralSymbol} on deposit
                              </span>
                            </p>
                          )}
                        {isDirectPeggedDeposit && (
                          <p className="mt-2 text-xs text-[#1E4775]/60 flex items-center gap-1">
                            <span>ℹ️</span>
                            <span>
                              Depositing{""}
                              {marketForDepositAsset?.peggedToken?.symbol ||
                                "ha"}
                              {""}
                              directly to stability pool. No minting required.
                            </span>
                          </p>
                        )}
                        {/* Fee Display for Selected Deposit Token */}
                        {selectedDepositAsset &&
                          !isDirectPeggedDeposit &&
                          (() => {
                            const selectedAssetData =
                              depositAssetsWithFees.find(
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
                            const showRange =
                              feeRange &&
                              feeRange.hasRange &&
                              marketsForToken.length > 1;

                            return (
                              <div className="mt-2 text-xs text-[#1E4775]">
                                <span className="flex items-center gap-1.5">
                                  {amount && parseFloat(amount) > 0
                                    ? "Mint Fee:"
                                    : showRange
                                    ? "Fee Range:"
                                    : "Fee:"}
                                  <SimpleTooltip
                                    side="right"
                                    label={
                                      <div className="space-y-2">
                                        <p className="font-semibold">
                                          Dynamic Minting Fees
                                        </p>
                                        <p>
                                          Minting fees are dynamic and adjust to
                                          incentivize deposits/withdrawals that
                                          help improve market health. When the
                                          market is nearing the minimum
                                          collateral ratio, fees increase for
                                          minting anchor tokens (to discourage
                                          actions that reduce the collateral
                                          ratio further) and decrease for
                                          minting sail tokens (to encourage
                                          actions that help improve the
                                          collateral ratio).
                                        </p>
                                        <p>
                                          The fee you see is calculated in
                                          real-time based on your deposit amount
                                          and the current market conditions.
                                        </p>
                                      </div>
                                    }
                                  >
                                    <span className="inline-flex h-4 w-4 items-center justify-center text-[#1E4775]/60 hover:text-[#1E4775] cursor-help">
                                      <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                        className="h-3.5 w-3.5"
                                      >
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M12 16v-4" />
                                        <path d="M12 8h.01" />
                                      </svg>
                                    </span>
                                  </SimpleTooltip>
                                  <span
                                    className={`font-semibold ${
                                      hasFee && feeValue > 2
                                        ? "text-red-600"
                                        : "text-[#1E4775]"
                                    }`}
                                  >
                                    {showRange &&
                                    !(amount && parseFloat(amount) > 0)
                                      ? `${feeRange.min.toFixed(
                                          2
                                        )}% - ${feeRange.max.toFixed(2)}%`
                                      : hasFee
                                      ? `${feeValue.toFixed(2)}%${
                                          feeValue > 2 ? " ⚠️" : ""
                                        }`
                                      : feeRange
                                      ? `${feeRange.min.toFixed(2)}%`
                                      : "-"}
                                  </span>
                                </span>
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
                            Balance:{""}
                            {selectedAssetBalance !== null
                              ? formatEther(selectedAssetBalance)
                              : formatEther(collateralBalance)}
                            {""}
                            {selectedDepositAsset || activeCollateralSymbol}
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
                            } focus:border-[#1E4775] focus:ring-2 focus:ring-[#1E4775]/20 focus:outline-none transition-all text-xl font-mono `}
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

                      {/* Mint Only Checkbox - Only show in Step 1, below amount input */}
                      {currentStep === 1 && (
                        <div className="pt-2">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={mintOnly}
                              onChange={(e) => {
                                setMintOnly(e.target.checked);
                                setDepositInStabilityPool(!e.target.checked);
                                if (e.target.checked) {
                                  // Reset to step 1 if switching to mint only
                                  setCurrentStep(1);
                                }
                              }}
                              className="w-5 h-5 text-[#1E4775] border-[#1E4775]/30 focus:ring-2 focus:ring-[#1E4775]/20 focus:ring-offset-0 cursor-pointer"
                              disabled={isProcessing}
                            />
                            <span className="text-sm font-medium text-[#1E4775]">
                              Mint only (do not deposit to stability pool)
                            </span>
                          </label>
                          {mintOnly && (
                            <p className="mt-1.5 text-xs text-[#1E4775]/60 pl-8">
                              You'll receive ha tokens directly to your wallet.
                              No stability pool deposit required.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Expected Output Preview - only for collateral deposits */}
                      {!isDirectPeggedDeposit &&
                        expectedMintOutput &&
                        amount &&
                        parseFloat(amount) > 0 && (
                          <div className="bg-[rgb(var(--surface-selected-rgb))]/30 border border-[rgb(var(--surface-selected-border-rgb))]/50 p-2.5">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-[#1E4775]/70">
                                You will receive:
                              </span>
                              <span className="text-xl font-bold text-[#1E4775] font-mono">
                                {formatEther(expectedMintOutput)}
                                {""}
                                {peggedTokenSymbol}
                              </span>
                            </div>
                          </div>
                        )}

                      {/* Direct ha deposit preview */}
                      {isDirectPeggedDeposit &&
                        amount &&
                        parseFloat(amount) > 0 && (
                          <div className="bg-[rgb(var(--surface-selected-rgb))]/30 border border-[rgb(var(--surface-selected-border-rgb))]/50 p-2.5">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-[#1E4775]/70">
                                You will deposit:
                              </span>
                              <span className="text-xl font-bold text-[#1E4775] font-mono">
                                {amount}
                                {""}
                                {marketForDepositAsset?.peggedToken?.symbol ||
                                  peggedTokenSymbol}
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
                            if (mintOnly) {
                              // If mint only, go directly to minting
                              handleMint();
                            } else if (isDirectPeggedDeposit) {
                              // If ha token is selected, check if there are multiple reward token options
                              // If multiple options, go to reward selection; otherwise go straight to stability pool
                              if (
                                rewardTokenOptions.length > 1 &&
                                !skipRewardStep
                              ) {
                                setCurrentStep(2);
                              } else {
                                // If only one or no reward tokens, skip to stability pool
                                // Auto-select the single reward token if it exists
                                if (rewardTokenOptions.length === 1) {
                                  setSelectedRewardToken(
                                    rewardTokenOptions[0].token
                                  );
                                }
                                setCurrentStep(stabilityStep);
                              }
                            } else {
                              // Otherwise go to reward selection unless we're skipping it
                              if (skipRewardStep) {
                                setCurrentStep(stabilityStep);
                              } else {
                                setCurrentStep(2);
                              }
                            }
                          }
                        }}
                        disabled={
                          !selectedDepositAsset ||
                          !amount ||
                          parseFloat(amount) <= 0 ||
                          !!error ||
                          isProcessing
                        }
                        className="w-full mt-4 py-3 px-4 bg-[#1E4775] text-white font-semibold hover:bg-[#17395F] transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                      >
                        {mintOnly
                          ? "Mint"
                          : isDirectPeggedDeposit
                          ? rewardTokenOptions.length > 1 && !skipRewardStep
                            ? "Continue to Step 2 →"
                            : "Continue to Stability Pool →"
                          : skipRewardStep
                          ? "Continue to Stability Pool →"
                          : "Continue to Step 2 →"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Reward Token - Only show if not mint only */}
                {currentStep === 2 && !mintOnly && !skipRewardStep && (
                  <div className="space-y-4 animate-in fade-in-0 slide-in-from-right-2 duration-200">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-semibold text-[#1E4775] mb-1.5">
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
                          className="w-full px-4 py-3 bg-white text-[#1E4775] border-2 border-[#1E4775]/30 focus:border-[#1E4775] focus:ring-2 focus:ring-[#1E4775]/20 focus:outline-none text-base"
                        >
                          <option value="" disabled>
                            Select a reward token
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
                          className="flex-1 py-3 px-4 bg-white text-[#1E4775] border-2 border-[#1E4775]/30 font-semibold hover:bg-[#1E4775]/5 transition-colors disabled:opacity-50"
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
                          className="flex-1 py-3 px-4 bg-[#1E4775] text-white font-semibold hover:bg-[#17395F] transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
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

                {/* Step 3: Stability Pool Selection - Only show if not mint only */}
                {currentStep === stabilityStep && !mintOnly && (
                  <div className="space-y-4 animate-in fade-in-0 slide-in-from-right-2 duration-200">
                    {selectedRewardToken || isDirectPeggedDeposit ? (
                      <div className="space-y-4">
                        {filteredPools.length === 0 ? (
                          <div className="p-2 bg-yellow-50 border border-yellow-200 text-xs text-yellow-800">
                            {isDirectPeggedDeposit
                              ? "No stability pools available for this market."
                              : `No pools found with ${selectedRewardToken} rewards. Please select a different reward token.`}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {filteredPools.map((pool) => {
                              const poolKey = `${pool.marketId}-${pool.poolType}`;
                              const isSelected =
                                selectedStabilityPool?.marketId ===
                                  pool.marketId &&
                                selectedStabilityPool?.poolType ===
                                  pool.poolType;
                              const poolFee = marketFeesMap.get(pool.marketId);

                              return (
                                <label
                                  key={poolKey}
                                  className="flex items-start gap-2 p-2 bg-[#17395F]/5 border border-[#17395F]/20 cursor-pointer hover:bg-[#17395F]/10 transition-colors"
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
                                          ? "Collateral Pool"
                                          : "Sail Pool"}
                                      </span>
                                      <SimpleTooltip
                                        side="right"
                                        label={
                                          <div className="space-y-2 max-w-xs">
                                            <p className="font-semibold text-base">
                                              {pool.poolType === "collateral"
                                                ? "Collateral Pool"
                                                : "Sail Pool"}
                                            </p>
                                            <div className="space-y-2 text-sm">
                                              <p>
                                                A{""}
                                                {pool.poolType === "collateral"
                                                  ? "collateral"
                                                  : "sail"}
                                                {""}
                                                pool holds anchor tokens (ha
                                                tokens) and provides stability
                                                to the market.
                                              </p>
                                              <p>
                                                <span className="font-medium">
                                                  Rewards:
                                                </span>
                                                {""}
                                                By depositing in this pool, you
                                                earn rewards for providing
                                                liquidity for rebalances.
                                              </p>
                                              <p>
                                                <span className="font-medium">
                                                  Rebalancing:
                                                </span>
                                                {""}
                                                When the market reaches its
                                                minimum collateral ratio, it
                                                rebalances by converting your
                                                anchor tokens to{""}
                                                {pool.poolType === "collateral"
                                                  ? "collateral"
                                                  : "sail tokens (hs tokens)"}
                                                {""}
                                                at market rates.
                                              </p>
                                            </div>
                                          </div>
                                        }
                                      >
                                        <span className="inline-flex h-3.5 w-3.5 items-center justify-center text-[#1E4775]/60 hover:text-[#1E4775] cursor-help">
                                          <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="w-3 h-3"
                                          >
                                            <circle cx="12" cy="12" r="10" />
                                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                                            <path d="M12 17h.01" />
                                          </svg>
                                        </span>
                                      </SimpleTooltip>
                                      {marketsForToken.length > 1 && (
                                        <span className="text-[10px] text-[#1E4775]/60 truncate">
                                          {pool.marketName}
                                        </span>
                                      )}
                                    </div>
                                    <div
                                      className={`grid gap-x-2 gap-y-0.5 text-[10px] ${
                                        isDirectPeggedDeposit
                                          ? "grid-cols-3"
                                          : "grid-cols-4"
                                      }`}
                                    >
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
                                        <span className="text-[#1E4775] font-medium font-mono ml-1 truncate inline-block max-w-[120px] align-bottom">
                                          {pool.tvl !== undefined
                                            ? pool.tvl
                                              ? formatNumber(
                                                  Number(formatEther(pool.tvl)),
                                                  2
                                                )
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

                        {/* Review Summary */}
                        <div className="bg-[rgb(var(--surface-selected-rgb))]/20 border border-[rgb(var(--surface-selected-border-rgb))]/40 p-2 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-[#1E4775] text-sm">
                              Review Your Selection
                            </h4>
                            {feePercentage !== undefined &&
                              feePercentage > 2 && (
                                <span className="text-red-600 text-[11px] font-semibold">
                                  ⚠️ high fee
                                </span>
                              )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {selectedStabilityPool ? (
                              <>
                                <div>
                                  <span className="text-[#1E4775]/70 block">
                                    Depositing
                                  </span>
                                  <span className="text-[#1E4775] font-medium font-mono">
                                    {amount && parseFloat(amount) > 0
                                      ? isDirectPeggedDeposit
                                        ? `${amount} ${peggedTokenSymbol}`
                                        : `${amount} ${
                                            selectedDepositAsset ||
                                            activeCollateralSymbol
                                          }`
                                      : "..."}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[#1E4775]/70 block">
                                    Value
                                  </span>
                                  <span className="text-[#1E4775] font-medium font-mono">
                                    {isDirectPeggedDeposit &&
                                    amount &&
                                    parseFloat(amount) > 0
                                      ? `$${parseFloat(amount).toLocaleString(
                                          undefined,
                                          {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          }
                                        )}`
                                      : expectedDepositUSD > 0
                                      ? `$${expectedDepositUSD.toLocaleString(
                                          undefined,
                                          {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          }
                                        )}`
                                      : "..."}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[#1E4775]/70 block">
                                    Stability Pool
                                  </span>
                                  <span className="text-[#1E4775] font-medium">
                                    {selectedStabilityPool.poolType ===
                                    "collateral"
                                      ? "Collateral"
                                      : "Sail"}
                                    {marketsForToken.length > 1 &&
                                      ` (${selectedStabilityPool.marketId})`}
                                  </span>
                                </div>
                                {selectedRewardToken && (
                                  <div>
                                    <span className="text-[#1E4775]/70 block">
                                      Reward Token
                                    </span>
                                    <span className="text-[#1E4775] font-medium">
                                      {selectedRewardToken}
                                    </span>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="col-span-2">
                                <span className="text-[#1E4775]/70 block">
                                  You'll receive
                                </span>
                                <span className="text-[#1E4775] font-medium font-mono">
                                  {expectedMintOutput
                                    ? formatEther(expectedMintOutput)
                                    : "..."}
                                  {""}
                                  {peggedTokenSymbol}
                                </span>
                              </div>
                            )}
                            {feePercentage !== undefined && (
                              <div className="col-span-2">
                                <span className="text-[#1E4775]/70 block">
                                  Fee
                                </span>
                                <span
                                  className={`font-semibold ${
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
                        </div>

                        {/* Progress Steps Indicator */}
                        <div className="flex items-center justify-between mb-3 bg-[#f3f6fb] border border-[#d1d7e5] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                          <div className="flex items-center flex-1">
                            {/* Step 1 */}
                            <div className="flex items-center flex-1">
                              <div
                                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
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
                            {!mintOnly && !skipRewardStep && (
                              <>
                                {/* Step 2 */}
                                <div className="flex items-center flex-1">
                                  <div
                                    className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
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
                                    className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                                      currentStep >= 3
                                        ? "bg-[#1E4775] text-white border-[#1E4775]"
                                        : "bg-white text-[#1E4775]/30 border-[#1E4775]/30"
                                    } font-semibold text-sm`}
                                  >
                                    3
                                  </div>
                                </div>
                              </>
                            )}
                            {!mintOnly && skipRewardStep && (
                              <>
                                {/* Step 2 becomes stability pool */}
                                <div className="flex items-center">
                                  <div
                                    className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                                      currentStep >= 2
                                        ? "bg-[#1E4775] text-white border-[#1E4775]"
                                        : "bg-white text-[#1E4775]/30 border-[#1E4775]/30"
                                    } font-semibold text-sm`}
                                  >
                                    2
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-3">
                          {isProcessing ? (
                            <>
                              <button
                                onClick={handleCancel}
                                className="flex-1 py-2 px-4 bg-white text-[#1E4775] border-2 border-[#1E4775]/30 font-semibold hover:bg-[#1E4775]/5 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                disabled
                                className="flex-1 py-2 px-4 bg-[#1E4775]/50 text-white font-semibold cursor-not-allowed"
                              >
                                Processing...
                              </button>
                            </>
                          ) : step === "error" ? (
                            <>
                              <button
                                onClick={handleCancel}
                                className="flex-1 py-2 px-4 bg-white text-[#1E4775] border-2 border-[#1E4775]/30 font-semibold hover:bg-[#1E4775]/5 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleMint}
                                className="flex-1 py-2 px-4 bg-[#1E4775] text-white font-semibold hover:bg-[#17395F] transition-colors"
                              >
                                Try Again
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() =>
                                  setCurrentStep(skipRewardStep ? 1 : 2)
                                }
                                disabled={isProcessing}
                                className="flex-1 py-3 px-4 bg-white text-[#1E4775] border-2 border-[#1E4775]/30 font-semibold hover:bg-[#1E4775]/5 transition-colors disabled:opacity-50"
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
                                  (selectedRewardToken &&
                                    !selectedStabilityPool)
                                }
                                className="flex-1 py-3 px-4 bg-[#1E4775] text-white font-semibold hover:bg-[#17395F] transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                              >
                                {isDirectPeggedDeposit && selectedStabilityPool
                                  ? "Deposit"
                                  : selectedStabilityPool
                                  ? "Mint & Deposit"
                                  : "Mint"}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      // No reward token selected - direct receive
                      <div className="space-y-4">
                        <div className="bg-[rgb(var(--surface-selected-rgb))]/20 border border-[rgb(var(--surface-selected-border-rgb))]/40 p-2.5 space-y-2">
                          <h4 className="font-semibold text-[#1E4775]">
                            Review Your Selection
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-[#1E4775]/70">
                                Deposit:
                              </span>
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
                                  : "..."}
                                {""}
                                {peggedTokenSymbol}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#1E4775]/70">
                                Delivery:
                              </span>
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
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 text-xs text-red-700">
                              ⚠️ High fee warning: Fees above 2% may
                              significantly impact your returns
                            </div>
                          )}
                        </div>

                        <div className="flex gap-3">
                          {isProcessing ? (
                            <>
                              <button
                                onClick={handleCancel}
                                className="flex-1 py-2 px-4 bg-white text-[#1E4775] border-2 border-[#1E4775]/30 font-semibold hover:bg-[#1E4775]/5 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                disabled
                                className="flex-1 py-2 px-4 bg-[#1E4775]/50 text-white font-semibold cursor-not-allowed"
                              >
                                Processing...
                              </button>
                            </>
                          ) : step === "error" ? (
                            <>
                              <button
                                onClick={handleCancel}
                                className="flex-1 py-2 px-4 bg-white text-[#1E4775] border-2 border-[#1E4775]/30 font-semibold hover:bg-[#1E4775]/5 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleMint}
                                className="flex-1 py-2 px-4 bg-[#1E4775] text-white font-semibold hover:bg-[#17395F] transition-colors"
                              >
                                Try Again
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setCurrentStep(2)}
                                disabled={isProcessing}
                                className="flex-1 py-3 px-4 bg-white text-[#1E4775] border-2 border-[#1E4775]/30 font-semibold hover:bg-[#1E4775]/5 transition-colors disabled:opacity-50"
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
                                className="flex-1 py-3 px-4 bg-[#1E4775] text-white font-semibold hover:bg-[#17395F] transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                              >
                                Confirm & Mint
                              </button>
                            </>
                          )}
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
                  {activeTab === "deposit" ? (
                    <>
                      {mintOnly ? (
                        <>
                          Mint {peggedTokenSymbol} using {collateralSymbol}
                        </>
                      ) : (
                        <>
                          Mint {peggedTokenSymbol} and deposit into stability
                          pool
                        </>
                      )}
                    </>
                  ) : null}
                </div>

                {/* Withdraw/Redeem Options - Only for Withdraw Tab */}
                {activeTab === "withdraw" && (
                  <div className="flex items-center gap-4 pt-2 border-t border-[#1E4775]/10 mb-3">
                    <div className="flex-1">
                      <div className="p-2 bg-[#17395F]/5 border border-[#17395F]/20 text-xs text-[#1E4775]/80 flex items-start justify-between gap-3">
                        <span>
                          Withdrawing from stability pools will return pegged
                          tokens to your wallet. These will be automatically
                          redeemed for collateral.
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const next = !redeemOnly;
                            setRedeemOnly(next);
                            if (next) setWithdrawOnly(false);
                          }}
                          disabled={isProcessing}
                          className={`px-3 py-1 border text-[11px] font-semibold transition-colors ${
                            redeemOnly
                              ? "bg-[#1E4775] text-white border-[#1E4775]"
                              : "bg-white text-[#1E4775] border-[#1E4775]/40 hover:bg-[#e8edf7]"
                          } disabled:opacity-50`}
                        >
                          Redeem only
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Transaction Status List */}
                {(step === "withdrawing" || step === "redeeming") &&
                  transactionSteps.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-[#1E4775] mb-3">
                        Transaction Status:
                      </div>
                      {transactionSteps.map((txStep) => (
                        <div
                          key={txStep.id}
                          className="p-3 bg-[#17395F]/5 border border-[#17395F]/20"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {txStep.status === "pending" && (
                                <div className="w-4 h-4 border-2 border-[#1E4775]/30 rounded-full" />
                              )}
                              {txStep.status === "processing" && (
                                <div className="w-4 h-4 border-2 border-[#1E4775] border-t-transparent rounded-full animate-spin" />
                              )}
                              {txStep.status === "success" && (
                                <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                  <svg
                                    className="w-3 h-3 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                </div>
                              )}
                              {txStep.status === "error" && (
                                <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                  <svg
                                    className="w-3 h-3 text-white"
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
                                </div>
                              )}
                              <span className="text-sm text-[#1E4775] font-medium">
                                {txStep.label}
                              </span>
                            </div>
                            {txStep.hash && (
                              <a
                                href={`https://etherscan.io/tx/${txStep.hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[#1E4775]/70 hover:text-[#1E4775] underline"
                              >
                                View
                              </a>
                            )}
                          </div>
                          {txStep.error && (
                            <div className="mt-2 text-xs text-red-600">
                              {txStep.error}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                {/* Positions List for Withdraw Tab */}
                {activeTab === "withdraw" && step === "input" && (
                  <div className="space-y-3 pt-2 border-t border-[#1E4775]/10">
                    <label className="text-xs text-[#1E4775]/70 font-medium">
                      Select positions and enter amounts:
                    </label>

                    {/* Wallet Position (ha tokens) - Only show if NOT"Withdraw only" */}
                    {!withdrawOnly && peggedBalance > 0n && (
                      <div className="p-3 bg-[#17395F]/5 border border-[#17395F]/20">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedPositions.wallet}
                              onChange={(e) => {
                                setSelectedPositions((prev) => ({
                                  ...prev,
                                  wallet: e.target.checked,
                                }));
                                if (!e.target.checked) {
                                  setPositionAmounts((prev) => ({
                                    ...prev,
                                    wallet: "",
                                  }));
                                }
                              }}
                              disabled={isProcessing}
                              className="w-5 h-5 text-[#1E4775] border-[#1E4775]/30 focus:ring-2 focus:ring-[#1E4775]/20 focus:ring-offset-0 cursor-pointer disabled:opacity-50"
                            />
                            <span className="text-sm font-medium text-[#1E4775]">
                              In Wallet
                            </span>
                          </div>
                          <div className="text-sm text-[#1E4775]/70 font-mono">
                            Balance: {formatNumber(formatEther(peggedBalance))}
                            {""}
                            {peggedTokenSymbol}
                          </div>
                        </div>
                        {selectedPositions.wallet && (
                          <div className="relative mt-2">
                            <input
                              type="text"
                              value={positionAmounts.wallet}
                              onChange={(e) =>
                                handlePositionAmountChange(
                                  "wallet",
                                  e.target.value,
                                  peggedBalance
                                )
                              }
                              placeholder="0.0"
                              className={`w-full h-10 px-3 pr-16 bg-white text-[#1E4775] border focus:ring-2 focus:outline-none text-sm font-mono ${
                                positionExceedsBalance.wallet
                                  ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                                  : "border-[#1E4775]/30 focus:border-[#1E4775] focus:ring-[#1E4775]/20"
                              }`}
                              disabled={isProcessing}
                            />
                            <button
                              onClick={() => {
                                setPositionAmounts((prev) => ({
                                  ...prev,
                                  wallet: formatEther(peggedBalance),
                                }));
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-[#FF8A7A] hover:bg-[#FF6B5A] text-white transition-colors disabled:bg-gray-300 disabled:text-gray-500 rounded-full"
                              disabled={isProcessing}
                            >
                              MAX
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Collateral Pool Position - Only show if NOT"Redeem only" */}
                    {!redeemOnly &&
                      market.addresses?.stabilityPoolCollateral &&
                      collateralPoolBalance > 0n && (
                        <div className="p-3 bg-[#17395F]/5 border border-[#17395F]/20">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selectedPositions.collateralPool}
                                onChange={(e) => {
                                  setSelectedPositions((prev) => ({
                                    ...prev,
                                    collateralPool: e.target.checked,
                                  }));
                                  setWithdrawFromCollateralPool(
                                    e.target.checked
                                  );
                                  if (!e.target.checked) {
                                    setPositionAmounts((prev) => ({
                                      ...prev,
                                      collateralPool: "",
                                    }));
                                  }
                                }}
                                disabled={isProcessing}
                                className="w-5 h-5 text-[#1E4775] border-[#1E4775]/30 focus:ring-2 focus:ring-[#1E4775]/20 focus:ring-offset-0 cursor-pointer disabled:opacity-50"
                              />
                              <span className="text-sm font-medium text-[#1E4775]">
                                Collateral Pool
                              </span>
                            </div>
                            <div className="text-sm text-[#1E4775]/70 font-mono">
                              Balance:{""}
                              {formatNumber(formatEther(collateralPoolBalance))}
                              {""}
                              {peggedTokenSymbol}
                            </div>
                          </div>
                          {selectedPositions.collateralPool && (
                            <>
                              {/* Withdrawal Method Toggle */}
                              <div className="flex items-center bg-[#17395F]/10 p-1 mb-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setWithdrawalMethods((prev) => ({
                                      ...prev,
                                      collateralPool: "immediate",
                                    }))
                                  }
                                  disabled={isProcessing}
                                  className={`flex-1 px-3 py-1.5 text-xs font-medium transition-all ${
                                    withdrawalMethods.collateralPool ===
                                    "immediate"
                                      ? "bg-[#1E4775] text-white shadow-sm"
                                      : "text-[#1E4775]/70 hover:text-[#1E4775]"
                                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                  Early Withdraw
                                  {collateralPoolFeePercent !== undefined
                                    ? ` (${collateralPoolFeePercent.toFixed(
                                        2
                                      )}% fee)`
                                    : " (with fee)"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setWithdrawalMethods((prev) => ({
                                      ...prev,
                                      collateralPool: "request",
                                    }))
                                  }
                                  disabled={isProcessing}
                                  className={`flex-1 px-3 py-1.5 text-xs font-medium transition-all ${
                                    withdrawalMethods.collateralPool ===
                                    "request"
                                      ? "bg-[#1E4775] text-white shadow-sm"
                                      : "text-[#1E4775]/70 hover:text-[#1E4775]"
                                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                  Request (free)
                                </button>
                              </div>
                              {/* Amount input - only show for immediate withdrawals */}
                              {withdrawalMethods.collateralPool ===
                                "immediate" && (
                                <div className="relative mt-2">
                                  <input
                                    type="text"
                                    value={positionAmounts.collateralPool}
                                    onChange={(e) =>
                                      handlePositionAmountChange(
                                        "collateralPool",
                                        e.target.value,
                                        collateralPoolBalance
                                      )
                                    }
                                    placeholder="0.0"
                                    className={`w-full h-10 px-3 pr-16 bg-white text-[#1E4775] border focus:ring-2 focus:outline-none text-sm font-mono ${
                                      positionExceedsBalance.collateralPool
                                        ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                                        : "border-[#1E4775]/30 focus:border-[#1E4775] focus:ring-[#1E4775]/20"
                                    }`}
                                    disabled={isProcessing}
                                  />
                                  <button
                                    onClick={() => {
                                      setPositionAmounts((prev) => ({
                                        ...prev,
                                        collateralPool: formatEther(
                                          collateralPoolBalance
                                        ),
                                      }));
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-[#FF8A7A] hover:bg-[#FF6B5A] text-white transition-colors disabled:bg-gray-300 disabled:text-gray-500 rounded-full"
                                    disabled={isProcessing}
                                  >
                                    MAX
                                  </button>
                                </div>
                              )}
                              {/* Info message for request method */}
                              {withdrawalMethods.collateralPool ===
                                "request" && (
                                <p className="text-[10px] text-[#1E4775]/60 mt-1">
                                  Creates a withdrawal request. You can withdraw
                                  without a fee for{""}
                                  {collateralPoolWindow
                                    ? formatDuration(collateralPoolWindow[1])
                                    : "..."}
                                  {""}
                                  after a{""}
                                  {collateralPoolWindow
                                    ? formatDuration(collateralPoolWindow[0])
                                    : "..."}
                                  {""}
                                  delay.
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      )}

                    {/* Sail Pool Position - Only show if NOT"Redeem only" */}
                    {!redeemOnly &&
                      market.addresses?.stabilityPoolLeveraged &&
                      sailPoolBalance > 0n && (
                        <div className="p-3 bg-[#17395F]/5 border border-[#17395F]/20">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selectedPositions.sailPool}
                                onChange={(e) => {
                                  setSelectedPositions((prev) => ({
                                    ...prev,
                                    sailPool: e.target.checked,
                                  }));
                                  setWithdrawFromSailPool(e.target.checked);
                                  if (!e.target.checked) {
                                    setPositionAmounts((prev) => ({
                                      ...prev,
                                      sailPool: "",
                                    }));
                                  }
                                }}
                                disabled={isProcessing}
                                className="w-5 h-5 text-[#1E4775] border-[#1E4775]/30 focus:ring-2 focus:ring-[#1E4775]/20 focus:ring-offset-0 cursor-pointer disabled:opacity-50"
                              />
                              <span className="text-sm font-medium text-[#1E4775]">
                                Sail Pool
                              </span>
                            </div>
                            <div className="text-sm text-[#1E4775]/70 font-mono">
                              Balance:{""}
                              {formatNumber(formatEther(sailPoolBalance))}
                              {""}
                              {peggedTokenSymbol}
                            </div>
                          </div>
                          {selectedPositions.sailPool && (
                            <>
                              {/* Withdrawal Method Toggle */}
                              <div className="flex items-center bg-[#17395F]/10 p-1 mb-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setWithdrawalMethods((prev) => ({
                                      ...prev,
                                      sailPool: "immediate",
                                    }))
                                  }
                                  disabled={isProcessing}
                                  className={`flex-1 px-3 py-1.5 text-xs font-medium transition-all ${
                                    withdrawalMethods.sailPool === "immediate"
                                      ? "bg-[#1E4775] text-white shadow-sm"
                                      : "text-[#1E4775]/70 hover:text-[#1E4775]"
                                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                  Early Withdraw
                                  {sailPoolFeePercent !== undefined
                                    ? ` (${sailPoolFeePercent.toFixed(2)}% fee)`
                                    : " (with fee)"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setWithdrawalMethods((prev) => ({
                                      ...prev,
                                      sailPool: "request",
                                    }))
                                  }
                                  disabled={isProcessing}
                                  className={`flex-1 px-3 py-1.5 text-xs font-medium transition-all ${
                                    withdrawalMethods.sailPool === "request"
                                      ? "bg-[#1E4775] text-white shadow-sm"
                                      : "text-[#1E4775]/70 hover:text-[#1E4775]"
                                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                  Request (free)
                                </button>
                              </div>
                              {/* Amount input - only show for immediate withdrawals */}
                              {withdrawalMethods.sailPool === "immediate" && (
                                <div className="relative mt-2">
                                  <input
                                    type="text"
                                    value={positionAmounts.sailPool}
                                    onChange={(e) =>
                                      handlePositionAmountChange(
                                        "sailPool",
                                        e.target.value,
                                        sailPoolBalance
                                      )
                                    }
                                    placeholder="0.0"
                                    className={`w-full h-10 px-3 pr-16 bg-white text-[#1E4775] border focus:ring-2 focus:outline-none text-sm font-mono ${
                                      positionExceedsBalance.sailPool
                                        ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                                        : "border-[#1E4775]/30 focus:border-[#1E4775] focus:ring-[#1E4775]/20"
                                    }`}
                                    disabled={isProcessing}
                                  />
                                  <button
                                    onClick={() => {
                                      setPositionAmounts((prev) => ({
                                        ...prev,
                                        sailPool: formatEther(sailPoolBalance),
                                      }));
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-[#FF8A7A] hover:bg-[#FF6B5A] text-white transition-colors disabled:bg-gray-300 disabled:text-gray-500 rounded-full"
                                    disabled={isProcessing}
                                  >
                                    MAX
                                  </button>
                                </div>
                              )}
                              {/* Info message for request method */}
                              {withdrawalMethods.sailPool === "request" && (
                                <p className="text-[10px] text-[#1E4775]/60 mt-1">
                                  Creates a withdrawal request. You can withdraw
                                  without a fee for{""}
                                  {sailPoolWindow
                                    ? formatDuration(sailPoolWindow[1])
                                    : "..."}
                                  {""}
                                  after a{""}
                                  {sailPoolWindow
                                    ? formatDuration(sailPoolWindow[0])
                                    : "..."}
                                  {""}
                                  delay.
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      )}

                    {/* No positions message */}
                    {((withdrawOnly &&
                      collateralPoolBalance === 0n &&
                      sailPoolBalance === 0n) ||
                      (redeemOnly && peggedBalance === 0n) ||
                      (!withdrawOnly &&
                        !redeemOnly &&
                        peggedBalance === 0n &&
                        collateralPoolBalance === 0n &&
                        sailPoolBalance === 0n)) && (
                      <div className="p-3 bg-[#17395F]/5 border border-[#17395F]/20 text-center text-sm text-[#1E4775]/50">
                        No positions found
                      </div>
                    )}
                  </div>
                )}

                {/* Old Redeem Tab - Removed, now handled in main positions list */}
                {false && activeTab === "withdraw" && redeemOnly && (
                  <div className="space-y-3 pt-2 border-t border-[#1E4775]/10">
                    {/* Positions List */}
                    <div className="space-y-3">
                      <label className="text-xs text-[#1E4775]/70 font-medium">
                        Your Positions:
                      </label>

                      {/* Wallet Balance (ha tokens) */}
                      {peggedBalance > 0n && (
                        <div className="p-2 bg-[#17395F]/5 border border-[#17395F]/20">
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
                            <div className="p-2 bg-[#17395F]/5 border border-[#17395F]/20">
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
                                  {formatEther(collateralPoolBalance)}
                                  {""}
                                  {peggedTokenSymbol}
                                </div>
                              </div>
                            </div>
                          )}
                          {sailPoolBalance > 0n && (
                            <div className="p-2 bg-[#17395F]/5 border border-[#17395F]/20">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-[#1E4775]">
                                    {selectedMarket?.name || marketId} - Sail
                                    Pool
                                  </span>
                                  <span className="bg-[#FF8A7A] text-[#1E4775] text-[10px] px-2 py-0.5 rounded-full">
                                    sail
                                  </span>
                                </div>
                                <div className="text-sm font-bold text-[#1E4775] font-mono">
                                  {formatEther(sailPoolBalance)}
                                  {""}
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
                          <div className="p-3 bg-[#17395F]/5 border border-[#17395F]/20 text-center text-sm text-[#1E4775]/50">
                            No positions found
                          </div>
                        )}
                    </div>

                    {/* Redeem Fee Display - Always visible in withdraw (when not withdraw-only) */}
                    {activeTab === "withdraw" && !withdrawOnly && (
                      <div
                        className={`mt-3 p-3 border ${
                          redeemDryRun?.feePercentage !== undefined &&
                          redeemDryRun?.feePercentage > 2
                            ? "bg-red-50 border-red-300"
                            : "bg-[rgb(var(--surface-selected-rgb))]/30 border-[rgb(var(--surface-selected-border-rgb))]/50"
                        }`}
                      >
                        {(!amount || parseFloat(amount || "0") <= 0) &&
                          (!redeemInputAmount || redeemInputAmount === 0n) && (
                            <div className="text-xs text-[#1E4775]/70">
                              Enter an amount to see fee and net receive.
                            </div>
                          )}

                        {redeemInputAmount &&
                          redeemInputAmount > 0n &&
                          redeemDryRunLoading && (
                            <div className="text-xs text-[#1E4775]/70">
                              Calculating fee...
                            </div>
                          )}

                        {redeemInputAmount &&
                          redeemInputAmount > 0n &&
                          !redeemDryRunLoading &&
                          redeemDryRunError && (
                            <div className="text-xs text-red-600">
                              Fee unavailable (dry-run error)
                            </div>
                          )}

                        {redeemInputAmount &&
                          redeemInputAmount > 0n &&
                          !redeemDryRunLoading &&
                          !redeemDryRun &&
                          !redeemDryRunError && (
                            <div className="text-xs text-[#1E4775]/70">
                              Fee unavailable
                            </div>
                          )}

                        {redeemInputAmount &&
                          redeemInputAmount > 0n &&
                          redeemDryRun && (
                            <div className="space-y-2">
                              {redeemDryRun.isDisallowed && (
                                <div className="p-2 bg-red-50 border border-red-200 text-xs text-red-700">
                                  ⚠️ Redemption currently disallowed (100% fee).
                                  Please try again later.
                                </div>
                              )}

                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-[#1E4775]/70">
                                  You will receive:
                                </span>
                                <span className="text-lg font-bold text-[#1E4775] font-mono">
                                  {formatEther(
                                    redeemDryRun.netCollateralReturned || 0n
                                  )}
                                  {""}
                                  {selectedRedeemAsset || collateralSymbol}
                                </span>
                              </div>

                              <div className="pt-2 border-t border-[#1E4775]/20 space-y-1 text-xs">
                                {redeemDryRun.feePercentage !== undefined && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-[#1E4775]/70">
                                      Fee:
                                    </span>
                                    <span
                                      className={`font-bold font-mono ${
                                        redeemDryRun.feePercentage > 2
                                          ? "text-red-600"
                                          : "text-[#1E4775]"
                                      }`}
                                    >
                                      {redeemDryRun.feePercentage.toFixed(2)}% (
                                      {formatEther(redeemDryRun.fee)} wstETH)
                                      {redeemDryRun.feePercentage > 2 && " ⚠️"}
                                    </span>
                                  </div>
                                )}

                                {redeemDryRun.discountPercentage > 0 && (
                                  <div className="flex justify-between items-center text-green-700">
                                    <span>Bonus:</span>
                                    <span className="font-bold font-mono">
                                      {redeemDryRun.discountPercentage.toFixed(
                                        2
                                      )}
                                      % ({formatEther(redeemDryRun.discount)}
                                      {""}
                                      wstETH)
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    )}

                    {/* Asset Selector */}
                    <div>
                      <label className="block text-xs text-[#1E4775]/70 font-medium mb-2">
                        Redeem to Asset:
                      </label>
                      <select
                        value={selectedRedeemAsset || collateralSymbol}
                        onChange={(e) => setSelectedRedeemAsset(e.target.value)}
                        disabled={isProcessing}
                        className="w-full px-4 py-3 bg-white text-[#1E4775] border-2 border-[#1E4775]/30 focus:border-[#1E4775] focus:ring-2 focus:ring-[#1E4775]/20 focus:outline-none text-base"
                      >
                        {Array.from(
                          new Set(
                            marketsForToken
                              .map(({ market: m }) => m?.collateral?.symbol)
                              .filter(Boolean)
                          )
                        ).map((symbol) => (
                          <option key={symbol} value={symbol}>
                            {symbol} -{""}
                            {marketsForToken.find(
                              ({ market: m }) =>
                                m?.collateral?.symbol === symbol
                            )?.market?.collateral?.name || symbol}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Amount Input - Only for Deposit Tab */}
                {activeTab === "deposit" && (
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
                    {expectedOutput &&
                      ((amount && parseFloat(amount) > 0) ||
                        (activeTab === "withdraw" &&
                          redeemInputAmount &&
                          redeemInputAmount > 0n)) && (
                        <div className="mt-2 p-2 bg-[rgb(var(--surface-selected-rgb))]/30 border border-[rgb(var(--surface-selected-border-rgb))]/50">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-[#1E4775]/70">
                              {simpleMode &&
                              activeTab === "deposit" &&
                              depositInStabilityPool
                                ? `You'll receive:`
                                : activeTab === "withdraw" && withdrawOnly
                                ? "You will receive (pegged tokens):"
                                : "You will receive:"}
                            </span>
                            <span className="text-lg font-bold text-[#1E4775]">
                              {formatEther(expectedOutput)} {outputSymbol}
                            </span>
                          </div>
                          {simpleMode &&
                            activeTab === "deposit" &&
                            depositInStabilityPool && (
                              <div className="mt-2 text-xs text-[#1E4775]/60">
                                Deposited to:{""}
                                {bestPoolType === "collateral"
                                  ? "Collateral"
                                  : "Sail"}
                                {""}
                                pool (optimized for best yield)
                              </div>
                            )}
                        </div>
                      )}
                    {/* Fee Display - Advanced Mode (Deposit only - Withdraw uses dry-run box below) */}
                    {!simpleMode &&
                      activeTab === "deposit" &&
                      feePercentage !== undefined &&
                      amount &&
                      parseFloat(amount) > 0 && (
                        <div
                          className={`mt-2 p-2 border ${
                            feePercentage > 2
                              ? "bg-red-50 border-red-300"
                              : "bg-[rgb(var(--surface-selected-rgb))]/30 border-[rgb(var(--surface-selected-border-rgb))]/50"
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-[#1E4775]/70">
                              Mint Fee:
                            </span>
                            <span
                              className={`text-base font-bold font-mono ${
                                feePercentage > 2
                                  ? "text-red-600"
                                  : "text-[#1E4775]"
                              }`}
                            >
                              {feePercentage.toFixed(2)}%
                              {feePercentage > 2 && " ⚠️"}
                            </span>
                          </div>
                          {feePercentage > 2 && (
                            <div className="mt-2 text-xs text-red-600 font-medium">
                              ⚠️ High fee warning: Fees above 2% may
                              significantly impact your returns
                            </div>
                          )}
                        </div>
                      )}
                  </div>
                )}

                {/* Redeem Fee box - always visible in withdraw (non withdraw-only) */}
                {activeTab === "withdraw" && !withdrawOnly && (
                  <div
                    className={`mt-3 p-3 border ${
                      redeemDryRun?.feePercentage !== undefined &&
                      redeemDryRun?.feePercentage > 2
                        ? "bg-red-50 border-red-300"
                        : "bg-[rgb(var(--surface-selected-rgb))]/30 border-[rgb(var(--surface-selected-border-rgb))]/50"
                    }`}
                  >
                    {(!amount || parseFloat(amount || "0") <= 0) &&
                      (!redeemInputAmount || redeemInputAmount === 0n) && (
                        <div className="text-xs text-[#1E4775]/70">
                          Enter an amount to see fee and net receive.
                        </div>
                      )}

                    {redeemInputAmount &&
                      redeemInputAmount > 0n &&
                      redeemDryRunLoading && (
                        <div className="text-xs text-[#1E4775]/70">
                          Calculating fee...
                        </div>
                      )}

                    {redeemInputAmount &&
                      redeemInputAmount > 0n &&
                      !redeemDryRunLoading &&
                      redeemDryRunError && (
                        <div className="text-xs text-red-600 space-y-1">
                          <div>Fee unavailable (dry-run error)</div>
                          <div className="text-[11px] text-red-500/80 break-words">
                            {redeemDryRunError?.shortMessage ||
                              redeemDryRunError?.message ||
                              "Error calling redeemPeggedTokenDryRun"}
                          </div>
                        </div>
                      )}

                    {redeemInputAmount &&
                      redeemInputAmount > 0n &&
                      !redeemDryRunLoading &&
                      !redeemDryRun &&
                      !redeemDryRunError && (
                        <div className="text-xs text-[#1E4775]/70">
                          Fee unavailable
                        </div>
                      )}

                    {redeemInputAmount &&
                      redeemInputAmount > 0n &&
                      redeemDryRun && (
                        <div className="space-y-2">
                          {redeemDryRun.isDisallowed && (
                            <div className="p-2 bg-red-50 border border-red-200 text-xs text-red-700">
                              ⚠️ Redemption currently disallowed (100% fee).
                              Please try again later.
                            </div>
                          )}

                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-[#1E4775]/70">
                              You will receive:
                            </span>
                            <span className="text-lg font-bold text-[#1E4775] font-mono">
                              {formatEther(
                                redeemDryRun.netCollateralReturned || 0n
                              )}
                              {""}
                              {selectedRedeemAsset || collateralSymbol}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-[#1E4775]/20 space-y-1 text-xs">
                            {/* Early Withdrawal Fees */}
                            {showEarlyWithdrawalFees && step !== "input" && (
                              <>
                                {earlyWithdrawalFees.map((fee, idx) => (
                                  <div
                                    key={`${fee.poolType}-${idx}`}
                                    className="flex justify-between items-center"
                                  >
                                    <span className="text-[#1E4775]/70">
                                      Early Withdrawal Fee (
                                      {fee.poolType === "collateral"
                                        ? "Collateral Pool"
                                        : "Sail Pool"}
                                      ):
                                    </span>
                                    <span className="font-bold font-mono text-[#1E4775]">
                                      {fee.feePercent.toFixed(2)}% (
                                      {formatEther(fee.amount)}
                                      {""}
                                      {peggedTokenSymbol})
                                    </span>
                                  </div>
                                ))}
                              </>
                            )}

                            {/* Redemption Fee */}
                            {redeemDryRun.feePercentage !== undefined && (
                              <div className="flex justify-between items-center">
                                <span className="text-[#1E4775]/70">
                                  Redemption Fee:
                                </span>
                                <span
                                  className={`font-bold font-mono ${
                                    redeemDryRun.feePercentage > 2
                                      ? "text-red-600"
                                      : "text-[#1E4775]"
                                  }`}
                                >
                                  {redeemDryRun.feePercentage.toFixed(2)}% (
                                  {formatEther(redeemDryRun.fee)}
                                  {""}
                                  {selectedRedeemAsset || collateralSymbol})
                                  {redeemDryRun.feePercentage > 2 && " ⚠️"}
                                </span>
                              </div>
                            )}

                            {redeemDryRun.discountPercentage > 0 && (
                              <div className="flex justify-between items-center text-green-700">
                                <span>Bonus:</span>
                                <span className="font-bold font-mono">
                                  {redeemDryRun.discountPercentage.toFixed(2)}%
                                  ({formatEther(redeemDryRun.discount)}
                                  {""}
                                  {selectedRedeemAsset || collateralSymbol})
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                )}

                {/* Simple Mode Info - Show optimized selection */}
                {activeTab === "deposit" &&
                  simpleMode &&
                  depositInStabilityPool && (
                    <div className="mt-1.5 p-2 bg-[rgb(var(--surface-selected-rgb))]/30 border border-[rgb(var(--surface-selected-border-rgb))]/50">
                      <p className="text-xs text-[#1E4775]/70">
                        Optimized for best yield: Depositing to{""}
                        <span className="font-semibold">
                          {bestPoolType === "collateral"
                            ? "Collateral"
                            : "Sail"}
                        </span>
                        {""}
                        pool
                      </p>
                    </div>
                  )}

                {/* Simple Mode Withdraw Button */}
                {activeTab === "withdraw" &&
                  simpleMode &&
                  step !== "success" && (
                    <div className="flex gap-3 pt-4 border-t border-[#1E4775]/20">
                      {isProcessing ? (
                        <>
                          <button
                            onClick={handleCancel}
                            className="flex-1 py-2 px-4 bg-white text-[#1E4775] border-2 border-[#1E4775]/30 font-semibold hover:bg-[#1E4775]/5 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            disabled
                            className="flex-1 py-2 px-4 bg-[#1E4775]/50 text-white font-semibold cursor-not-allowed"
                          >
                            Processing...
                          </button>
                        </>
                      ) : step === "error" ? (
                        <>
                          <button
                            onClick={handleCancel}
                            className="flex-1 py-2 px-4 bg-white text-[#1E4775] border-2 border-[#1E4775]/30 font-semibold hover:bg-[#1E4775]/5 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleAction}
                            className="flex-1 py-2 px-4 bg-[#1E4775] text-white font-semibold hover:bg-[#17395F] transition-colors"
                          >
                            Try Again
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={
                              step === "input"
                                ? handleCancel
                                : handleBackToWithdrawInput
                            }
                            className="flex-1 py-2 px-4 bg-white text-[#1E4775] border-2 border-[#1E4775]/30 font-semibold hover:bg-[#1E4775]/5 transition-colors"
                          >
                            {step === "input" ? "Cancel" : "Back"}
                          </button>
                          <button
                            onClick={handleAction}
                            disabled={isButtonDisabled()}
                            className="flex-1 py-3 px-4 bg-[#1E4775] text-white font-semibold hover:bg-[#17395F] transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                          >
                            {getButtonText()}
                          </button>
                        </>
                      )}
                    </div>
                  )}

                {/* Mint Only / Deposit Options - Only for Deposit Tab (Advanced Mode) */}
                {activeTab === "deposit" && !simpleMode && (
                  <div className="space-y-2 pt-2 border-t border-[#1E4775]/10">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mintOnly}
                        onChange={(e) => {
                          setMintOnly(e.target.checked);
                          setDepositInStabilityPool(!e.target.checked);
                        }}
                        className="w-5 h-5 text-[#1E4775] border-[#1E4775]/30 focus:ring-2 focus:ring-[#1E4775]/20 focus:ring-offset-0 cursor-pointer"
                        disabled={isProcessing}
                      />
                      <span className="text-sm font-medium text-[#1E4775]">
                        Mint only (do not deposit to stability pool)
                      </span>
                    </label>

                    {!mintOnly && (
                      <label className="flex items-center gap-3 cursor-pointer pl-8">
                        <input
                          type="checkbox"
                          checked={depositInStabilityPool}
                          onChange={(e) =>
                            setDepositInStabilityPool(e.target.checked)
                          }
                          className="w-5 h-5 text-[#1E4775] border-[#1E4775]/30 focus:ring-2 focus:ring-[#1E4775]/20 focus:ring-offset-0 cursor-pointer"
                          disabled={isProcessing}
                        />
                        <span className="text-sm font-medium text-[#1E4775]">
                          Deposit in stability pool
                        </span>
                      </label>
                    )}

                    {depositInStabilityPool && (
                      <div className="space-y-3 pl-8">
                        {/* Toggle for Collateral vs Sail */}
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-[#1E4775]/70">
                            Pool type:
                          </span>
                          <div className="flex items-center bg-[#17395F]/10 p-1">
                            <button
                              type="button"
                              onClick={() => setStabilityPoolType("collateral")}
                              disabled={isProcessing}
                              className={`px-3 py-1.5 text-xs font-medium transition-all ${
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
                              className={`px-3 py-1.5 text-xs font-medium transition-all ${
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
                        <div className="p-2 bg-[rgb(var(--surface-selected-rgb))]/20 border border-[rgb(var(--surface-selected-border-rgb))]/30">
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
                        <div className="p-2 bg-[#17395F]/5 border border-[#17395F]/20">
                          <p className="text-xs text-[#1E4775]/80 leading-relaxed">
                            {stabilityPoolType === "collateral" ? (
                              <>
                                <span className="font-semibold">
                                  Collateral stability pool
                                </span>
                                {""}
                                converts anchor tokens to{""}
                                <span className="font-semibold">
                                  market collateral
                                </span>
                                {""}
                                at market rates when the market reaches its
                                minimum collateral ratio.
                              </>
                            ) : (
                              <>
                                <span className="font-semibold">
                                  Sail stability pool
                                </span>
                                {""}
                                converts anchor tokens to{""}
                                <span className="font-semibold">
                                  Sail tokens
                                </span>
                                {""}
                                at market rates when the market reaches its
                                minimum collateral ratio.
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
                  <div className="space-y-2 pt-2 border-t border-[#1E4775]/10">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#1E4775]/70">
                        Pool type:
                      </span>
                      <div className="flex items-center bg-[#17395F]/10 p-1">
                        <button
                          type="button"
                          onClick={() => setStabilityPoolType("collateral")}
                          disabled={isProcessing}
                          className={`px-3 py-1.5 text-xs font-medium transition-all ${
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
                          className={`px-3 py-1.5 text-xs font-medium transition-all ${
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
                    <div className="p-2 bg-[rgb(var(--surface-selected-rgb))]/20 border border-[rgb(var(--surface-selected-border-rgb))]/30">
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
                    <div className="p-2 bg-[#17395F]/5 border border-[#17395F]/20">
                      <p className="text-xs text-[#1E4775]/80 leading-relaxed">
                        {stabilityPoolType === "collateral" ? (
                          <>
                            <span className="font-semibold">
                              Collateral stability pool
                            </span>
                            {""}
                            converts anchor tokens to{""}
                            <span className="font-semibold">
                              market collateral
                            </span>
                            {""}
                            at market rates when the market reaches its minimum
                            collateral ratio.
                          </>
                        ) : (
                          <>
                            <span className="font-semibold">
                              Sail stability pool
                            </span>
                            {""}
                            converts anchor tokens to{""}
                            <span className="font-semibold">Sail tokens</span>
                            {""}
                            at market rates when the market reaches its minimum
                            collateral ratio.
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Current Deposit & Ledger Marks Info - Only for Deposit Tab */}
                {activeTab === "deposit" && (
                  <div className="space-y-3">
                    {currentDeposit > 0n && (
                      <div className="p-2 bg-[#17395F]/10 border border-[#17395F]/20">
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
                    <div className="p-2 bg-[rgb(var(--surface-selected-rgb))]/30 border border-[rgb(var(--surface-selected-border-rgb))]/50">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-[#1E4775]/70">
                          {amount &&
                          parseFloat(amount) > 0 &&
                          expectedMintOutput
                            ? "After deposit:"
                            : "Current balance:"}
                        </span>
                        <span className="text-sm font-semibold text-[#1E4775]">
                          {amount &&
                          parseFloat(amount) > 0 &&
                          expectedMintOutput
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

                {/* Step Progress Indicator */}
                {isProcessing &&
                  activeTab === "deposit" &&
                  !isDirectPeggedDeposit && (
                    <div className="p-3 bg-[rgb(var(--surface-selected-rgb))]/20 border border-[rgb(var(--surface-selected-border-rgb))]/40">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-[#1E4775]">
                          Transaction Progress
                        </span>
                        <span className="text-xs text-[#1E4775]/70">
                          {step === "approving"
                            ? "Step 1 of 3"
                            : step === "minting"
                            ? "Step 2 of 3"
                            : step === "depositing"
                            ? "Step 3 of 3"
                            : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Step 1: Approve */}
                        <div className="flex-1 flex items-center gap-2">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                              step === "approving"
                                ? "bg-[#1E4775] text-white"
                                : step === "minting" ||
                                  step === "depositing" ||
                                  step === "success"
                                ? "bg-[rgb(var(--surface-selected-rgb))] text-[#1E4775]"
                                : "bg-[#1E4775]/20 text-[#1E4775]/50"
                            }`}
                          >
                            {step === "approving" ? (
                              <ArrowPathIcon className="w-4 h-4 animate-spin" />
                            ) : step === "minting" ||
                              step === "depositing" ||
                              step === "success" ? (
                              "✓"
                            ) : (
                              "1"
                            )}
                          </div>
                          <span
                            className={`text-xs ${
                              step === "approving"
                                ? "font-semibold text-[#1E4775]"
                                : step === "minting" ||
                                  step === "depositing" ||
                                  step === "success"
                                ? "text-[#1E4775]/70"
                                : "text-[#1E4775]/50"
                            }`}
                          >
                            Approve
                          </span>
                        </div>
                        <div className="h-0.5 flex-1 bg-[#1E4775]/20" />
                        {/* Step 2: Mint */}
                        <div className="flex-1 flex items-center gap-2">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                              step === "minting"
                                ? "bg-[#1E4775] text-white"
                                : step === "depositing" || step === "success"
                                ? "bg-[rgb(var(--surface-selected-rgb))] text-[#1E4775]"
                                : "bg-[#1E4775]/20 text-[#1E4775]/50"
                            }`}
                          >
                            {step === "minting" ? (
                              <ArrowPathIcon className="w-4 h-4 animate-spin" />
                            ) : step === "depositing" || step === "success" ? (
                              "✓"
                            ) : (
                              "2"
                            )}
                          </div>
                          <span
                            className={`text-xs ${
                              step === "minting"
                                ? "font-semibold text-[#1E4775]"
                                : step === "depositing" || step === "success"
                                ? "text-[#1E4775]/70"
                                : "text-[#1E4775]/50"
                            }`}
                          >
                            Mint
                          </span>
                        </div>
                        <div className="h-0.5 flex-1 bg-[#1E4775]/20" />
                        {/* Step 3: Deposit */}
                        {depositInStabilityPool && (
                          <>
                            <div className="flex-1 flex items-center gap-2">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                                  step === "depositing"
                                    ? "bg-[#1E4775] text-white"
                                    : step === "success"
                                    ? "bg-[rgb(var(--surface-selected-rgb))] text-[#1E4775]"
                                    : "bg-[#1E4775]/20 text-[#1E4775]/50"
                                }`}
                              >
                                {step === "depositing" ? (
                                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                ) : step === "success" ? (
                                  "✓"
                                ) : (
                                  "3"
                                )}
                              </div>
                              <span
                                className={`text-xs ${
                                  step === "depositing"
                                    ? "font-semibold text-[#1E4775]"
                                    : step === "success"
                                    ? "text-[#1E4775]/70"
                                    : "text-[#1E4775]/50"
                                }`}
                              >
                                Deposit
                              </span>
                            </div>
                          </>
                        )}
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
                    Tx:{""}
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
                  <div className="p-3 bg-[rgb(var(--surface-selected-rgb))]/20 border border-[rgb(var(--surface-selected-border-rgb))]/30 text-[#1E4775] text-sm text-center">
                    ✅{""}
                    {activeTab === "deposit"
                      ? "Mint"
                      : activeTab === "withdraw"
                      ? "Withdraw"
                      : "Redeem"}
                    {""}
                    successful!
                  </div>
                )}
              </>
            )}
          </div>

          {step === "success" && (
            <div className="flex gap-3 p-4 border-t border-[#1E4775]/20">
              <button
                onClick={handleClose}
                className="flex-1 py-2 px-4 bg-[#1E4775] hover:bg-[#17395F] text-white font-medium transition-colors rounded-full"
              >
                Close
              </button>
            </div>
          )}

          {step !== "success" && !simpleMode && (
            <div className="flex gap-3 p-4 border-t border-[#1E4775]/20">
              {isProcessing ? (
                <>
                  <button
                    onClick={handleCancel}
                    className="flex-1 py-2 px-4 bg-white text-[#1E4775] border-2 border-[#1E4775]/30 font-medium transition-colors rounded-full hover:bg-[#1E4775]/5"
                  >
                    Cancel
                  </button>
                  <button
                    disabled
                    className="flex-1 py-2 px-4 bg-[#1E4775]/50 text-white font-medium rounded-full cursor-not-allowed"
                  >
                    {getButtonText()}
                  </button>
                </>
              ) : step === "error" ? (
                <>
                  <button
                    onClick={handleCancel}
                    className="flex-1 py-2 px-4 bg-white text-[#1E4775] border-2 border-[#1E4775]/30 font-medium transition-colors rounded-full hover:bg-[#1E4775]/5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAction}
                    className="flex-1 py-2 px-4 bg-[#1E4775] hover:bg-[#17395F] text-white font-medium transition-colors rounded-full"
                  >
                    {getButtonText()}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={
                      step === "input"
                        ? handleCancel
                        : handleBackToWithdrawInput
                    }
                    className="flex-1 py-2 px-4 bg-white text-[#1E4775] border-2 border-[#1E4775]/30 font-medium transition-colors rounded-full hover:bg-[#1E4775]/5"
                  >
                    {step === "input" ? "Cancel" : "Back"}
                  </button>
                  <button
                    onClick={handleAction}
                    disabled={isButtonDisabled()}
                    className="flex-1 py-2 px-4 bg-[#1E4775] hover:bg-[#17395F] text-white font-medium transition-colors rounded-full disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                  >
                    {getButtonText()}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
