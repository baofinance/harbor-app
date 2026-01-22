"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { parseEther, formatEther, parseUnits, formatUnits } from "viem";
import {
  useAccount,
  useBalance,
  useContractRead,
  useContractReads,
  useWriteContract,
  usePublicClient,
  useSendTransaction,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { mainnet } from "wagmi/chains";
import { BaseError, ContractFunctionRevertedError } from "viem";
import { ERC20_ABI, STABILITY_POOL_ABI } from "@/abis/shared";
import { stabilityPoolABI } from "@/abis/stabilityPool";
import { aprABI } from "@/abis/apr";
import { ZAP_ABI, USDC_ZAP_ABI, WSTETH_ABI } from "@/abis";
import { MINTER_ETH_ZAP_V2_ABI, MINTER_USDC_ZAP_V2_ABI } from "@/config/contracts";
import Image from "next/image";
import SimpleTooltip from "@/components/SimpleTooltip";
import InfoTooltip from "@/components/InfoTooltip";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useAnchorLedgerMarks } from "@/hooks/useAnchorLedgerMarks";
import { useAnyTokenDeposit } from "@/hooks/useAnyTokenDeposit";
import { getDefiLlamaSwapTx } from "@/hooks/useDefiLlamaSwap";
import { useCollateralPrice } from "@/hooks/useCollateralPrice";
import { useCoinGeckoPrice } from "@/hooks/useCoinGeckoPrice";
import {
  TransactionProgressModal,
  TransactionStep,
} from "@/components/TransactionProgressModal";
import { TokenSelectorDropdown } from "@/components/TokenSelectorDropdown";

// -----------------------------------------------------------------------------
// Debug logging helpers
// -----------------------------------------------------------------------------
const DEBUG_TX =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_DEBUG_TX === "true";

function debugTx(label: string, data?: unknown) {
  if (!DEBUG_TX) return;
  // eslint-disable-next-line no-console
  console.log(`[AnchorTx] ${label}`, data ?? "");
}

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

// Format 18-decimal token amounts for UI without rounding small balances to zero.
// Used for ha token + stability pool balances in the withdraw modal.
const formatTokenAmount18 = (value: bigint): string => {
  if (value === 0n) return "0";

  const raw = formatUnits(value, 18); // decimal string
  const abs = Math.abs(parseFloat(raw));

  // Show more precision for smaller balances so users can see tiny deposits.
  const maxDecimals =
    abs >= 1
      ? 4
      : abs >= 0.01
        ? 6
        : abs >= 0.0001
          ? 8
          : 10;

  if (!raw.includes(".")) return raw;
  const [intPart, fracPart = ""] = raw.split(".");
  const slicedFrac = fracPart.slice(0, maxDecimals);
  const trimmed = slicedFrac.replace(/0+$/, "");
  const candidate = trimmed.length > 0 ? `${intPart}.${trimmed}` : intPart;

  // If truncation would display 0 for a non-zero value, show a "< min" hint.
  if ((candidate === "0" || candidate === "-0") && value !== 0n) {
    return `<0.${"0".repeat(Math.max(0, maxDecimals - 1))}1`;
  }
  return candidate;
};

// Format 18-decimal USD-wei amounts (1e18 = $1.00) for UI.
const formatUsd18 = (usdWei: bigint): string => {
  if (usdWei === 0n) return "$0";
  const raw = formatUnits(usdWei, 18);
  const abs = Math.abs(parseFloat(raw));
  if (abs > 0 && abs < 0.01) return "<$0.01";
  const maxDecimals = abs >= 1 ? 2 : abs >= 0.01 ? 4 : 6;
  return `$${formatNumber(raw, maxDecimals)}`;
};

// -----------------------------------------------------------------------------
// Chainlink feeds (mainnet) used as fallback when CoinGecko is unavailable
// -----------------------------------------------------------------------------
const CHAINLINK_FEEDS = {
  ETH_USD: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419" as `0x${string}`,
  BTC_USD: "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c" as `0x${string}`,
} as const;

// Common reward token addresses used by Harbor stability pools (mainnet).
// Used for APR fallback calculation when getAPRBreakdown is unavailable.
const FXSAVE_TOKEN_ADDRESS =
  "0x7743e50F534a7f9F1791DdE7dCD89F7783Eefc39" as `0x${string}`;
const WSTETH_TOKEN_ADDRESS =
  "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0" as `0x${string}`;
const STETH_TOKEN_ADDRESS =
  "0xae7ab96520de3a18e5e111b5eaab095312d7fe84" as `0x${string}`;

const CHAINLINK_AGGREGATOR_ABI = [
  {
    inputs: [],
    name: "decimals",
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "latestRoundData",
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

const scaleChainlinkToUsdWei = (answer: bigint, decimals: number): bigint => {
  if (answer <= 0n) return 0n;
  if (decimals === 18) return answer;
  if (decimals < 18) return answer * 10n ** BigInt(18 - decimals);
  return answer / 10n ** BigInt(decimals - 18);
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
  initialDepositAsset?: string;
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
    return [
      {
        symbol: market.collateral.symbol,
        name: market.collateral.name || market.collateral.symbol,
      },
    ];
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
  initialDepositAsset,
}: AnchorDepositWithdrawModalProps) => {
  const { address, isConnected, connector } = useAccount();
  // NOTE: `useChainId()` can be misleading when the wallet is on an unsupported chain (e.g. Polygon),
  // so we treat it as a fallback and prefer `connector.getChainId()` when available.
  const chainId = useChainId();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();

  const [walletChainId, setWalletChainId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const readWalletChainId = async () => {
      if (!connector?.getChainId) {
        if (!cancelled) setWalletChainId(null);
        return;
      }
      try {
        const id = await connector.getChainId();
        if (!cancelled) setWalletChainId(id);
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[Network] Failed to read connector chainId:", e);
        }
        if (!cancelled) setWalletChainId(null);
      }
    };
    readWalletChainId();
    return () => {
      cancelled = true;
    };
  }, [connector]);

  const effectiveChainId = walletChainId ?? chainId;

  // Check if user is on the correct network (mainnet)
  const isCorrectNetwork = effectiveChainId === mainnet.id;
  const shouldShowNetworkSwitch = !isCorrectNetwork && isConnected;

  // Function to handle network switching (manual trigger from UI)
  const handleSwitchNetwork = async () => {
    try {
      await switchChain({ chainId: mainnet.id });
      setError(null);
      // Best-effort refresh from connector
      if (connector?.getChainId) {
        const id = await connector.getChainId();
        setWalletChainId(id);
      }
    } catch (err) {
      console.error("[Network Switch] Error:", err);
      setError(
        "Failed to switch network. Please switch to Ethereum Mainnet manually in your wallet."
      );
      setStep("error");
    }
  };

  // Helper function to ensure we're on the correct network before any transaction.
  // Auto-attempts to switch to mainnet, and only proceeds if the switch succeeds.
  const ensureCorrectNetwork = async (): Promise<boolean> => {
    if (!isConnected) return true;

    let currentWalletChainId: number | null = null;
    try {
      currentWalletChainId = connector?.getChainId ? await connector.getChainId() : null;
    } catch {
      currentWalletChainId = null;
    }

    const chainToCheck = currentWalletChainId ?? effectiveChainId;
    if (chainToCheck === mainnet.id) return true;

    try {
      await switchChain({ chainId: mainnet.id });
      // Best-effort refresh from connector
      if (connector?.getChainId) {
        const id = await connector.getChainId();
        setWalletChainId(id);
      }
      return true;
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[Network] Auto switch rejected/failed:", err);
      }
      setError("Please switch to Ethereum Mainnet to continue.");
      setStep("error");
      return false;
    }
  };

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
  const { poolDeposits, haBalances, error: marksError } = useAnchorLedgerMarks({
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
    useZap: false,
    zapAsset: null as string | null,
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

  // Track the last non-error step so the progress modal can highlight the step that actually failed.
  const lastNonErrorStepRef = useRef<ModalStep>("input");
  useEffect(() => {
    if (step !== "error") {
      lastNonErrorStepRef.current = step;
    }
  }, [step]);

  // Slippage input state for swap preview
  const [slippageTolerance, setSlippageTolerance] = useState<number>(0.5); // Default 0.5% slippage
  const [showSlippageInput, setShowSlippageInput] = useState(false);
  const [slippageInputValue, setSlippageInputValue] = useState("0.5");

  // Debounced amount for dry runs (reduces unnecessary contract calls)
  const [debouncedAmount, setDebouncedAmount] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAmount(amount);
    }, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [amount]);

  // Deposit/Mint tab options
  const [mintOnly, setMintOnly] = useState(false);
  const [depositInStabilityPool, setDepositInStabilityPool] = useState(true);
  const [stabilityPoolType, setStabilityPoolType] = useState<
    "collateral" | "sail"
  >("collateral");

  // Withdraw/Redeem tab options
  // Default: withdraw from pools + redeem selected ha tokens to collateral.
  const [withdrawOnly, setWithdrawOnly] = useState(false);
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
        // Use zap-specific label if using zap
        const approveLabel = progressConfig.useZap && progressConfig.zapAsset
          ? `Approve ${progressConfig.zapAsset.toUpperCase()} for zap`
          : "Approve collateral token";
        addStep(
          "approve-collateral",
          approveLabel,
          txHashes.approveCollateral
        );
      }
      if (progressConfig.includeMint) {
        // Use zap-specific label if using zap
        const mintLabel = progressConfig.useZap && progressConfig.zapAsset
          ? `Zap ${progressConfig.zapAsset.toUpperCase()} to pegged token`
          : "Mint pegged token";
        addStep("mint", mintLabel, txHashes.mint);
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
      // NOTE: Step list should reflect what we actually send to the wallet.
      // Rely primarily on progressConfig, but also include steps if we already have tx hashes
      // (e.g. allowance reads can be stale, causing an extra approve tx not pre-listed).
      const hasWithdrawCollateralTx = !!(txHashes.withdrawCollateral || txHashes.requestCollateral);
      const hasWithdrawSailTx = !!(txHashes.withdrawSail || txHashes.requestSail);
      const hasApproveRedeemTx = !!txHashes.approveRedeem;
      const hasRedeemTx = !!txHashes.redeem;

      if (progressConfig.includeWithdrawCollateral || hasWithdrawCollateralTx) {
        addStep(
          "withdraw-collateral",
          progressConfig.withdrawCollateralLabel ||
            "Withdraw from collateral pool",
          txHashes.withdrawCollateral || txHashes.requestCollateral
        );
      }
      if (progressConfig.includeWithdrawSail || hasWithdrawSailTx) {
        addStep(
          "withdraw-sail",
          progressConfig.withdrawSailLabel || "Withdraw from sail pool",
          txHashes.withdrawSail || txHashes.requestSail
        );
      }
      if (progressConfig.includeApproveRedeem || hasApproveRedeemTx) {
        addStep("approve-redeem", "Approve ha token", txHashes.approveRedeem);
      }
      if (progressConfig.includeRedeem || hasRedeemTx) {
        addStep("redeem", "Redeem ha for collateral", txHashes.redeem);
      }
    }

    // Determine current step index based on modal step state
    const getCurrentIndex = () => {
      const stepForIndex = step === "error" ? lastNonErrorStepRef.current : step;
      const approveCollateralIndex = steps.findIndex(
        (s) => s.id === "approve-collateral"
      );
      const approveDirectIndex = steps.findIndex((s) => s.id === "approve-direct");
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
      if (stepForIndex === "minting") return mintIndex >= 0 ? mintIndex : 0;
      if (stepForIndex === "approvingPegged")
        return approvePeggedIndex >= 0
          ? approvePeggedIndex
          : depositIndex >= 0
          ? depositIndex - 1
          : steps.length - 1;
      if (stepForIndex === "depositing")
        return depositIndex >= 0 ? depositIndex : steps.length - 1;
      if (
        stepForIndex === "withdrawing" ||
        stepForIndex === "withdrawingCollateral" ||
        stepForIndex === "requestingCollateral"
      ) {
        if (withdrawCollateralIndex >= 0) return withdrawCollateralIndex;
        if (withdrawSailIndex >= 0) return withdrawSailIndex;
      }
      if (stepForIndex === "withdrawingSail" || stepForIndex === "requestingSail") {
        if (withdrawSailIndex >= 0) return withdrawSailIndex;
        if (withdrawCollateralIndex >= 0) return withdrawCollateralIndex;
      }
      if (stepForIndex === "redeeming")
        return redeemIndex >= 0 ? redeemIndex : steps.length - 1;
      if (stepForIndex === "approving") {
        // "approving" is used in multiple flows:
        // - collateral mode: approve collateral token
        // - direct mode: approve ha token
        // - withdraw/redeem mode: approve redeem
        if (approveCollateralIndex >= 0) return approveCollateralIndex;
        if (approveDirectIndex >= 0) return approveDirectIndex;
        if (approveRedeemIndex >= 0) return approveRedeemIndex;
        if (redeemIndex >= 0) return Math.max(redeemIndex - 1, 0);
        return 0;
      }
      if (stepForIndex === "success") return steps.length - 1;
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

  // In withdraw mode for grouped markets, show each pool position per-market so users can see
  // (and select) collateral + sail deposits across different markets in the same ha token group.
  const groupedPoolPositions = useMemo(() => {
    if (!poolDeposits || poolDeposits.length === 0) return [];

    const rows: Array<{
      key: string;
      marketId: string;
      market: any;
      poolType: "collateral" | "sail";
      poolAddress: string;
      balance: bigint;
    }> = [];

    for (const entry of marketsForToken) {
      const m = entry.market;
      const collateralAddr = (m as any)?.addresses?.stabilityPoolCollateral as
        | string
        | undefined;
      const sailAddr = (m as any)?.addresses?.stabilityPoolLeveraged as
        | string
        | undefined;

      const collateralLower = collateralAddr?.toLowerCase();
      const sailLower = sailAddr?.toLowerCase();

      if (collateralLower) {
        const d = poolDeposits.find(
          (x) =>
            x.poolType === "collateral" &&
            x.poolAddress.toLowerCase() === collateralLower
        );
        const bal = d ? parseEther(d.balance) : 0n;
        if (bal > 0n) {
          rows.push({
            key: `${entry.marketId}-collateral`,
            marketId: entry.marketId,
            market: m,
            poolType: "collateral",
            poolAddress: collateralAddr!,
            balance: bal,
          });
        }
      }

      if (sailLower) {
        const d = poolDeposits.find(
          (x) =>
            x.poolType === "sail" && x.poolAddress.toLowerCase() === sailLower
        );
        const bal = d ? parseEther(d.balance) : 0n;
        if (bal > 0n) {
          rows.push({
            key: `${entry.marketId}-sail`,
            marketId: entry.marketId,
            market: m,
            poolType: "sail",
            poolAddress: sailAddr!,
            balance: bal,
          });
        }
      }
    }

    return rows;
  }, [poolDeposits, marketsForToken]);

  // If multiple markets share the same ha token (e.g. haBTC across BTC/fxUSD and BTC/stETH),
  // the "Manage" modal may open on a market that doesn't contain the user's stability pool deposit.
  // In withdraw mode, auto-select the market within the group that actually has a deposit so the UI
  // doesn't incorrectly show "no positions".
  const selectedMarketHasPoolDeposit = useMemo(() => {
    if (!poolDeposits || poolDeposits.length === 0) return false;
    const m = marketsForToken.find((x) => x.marketId === selectedMarketId)?.market;
    if (!m) return false;

    const collateralAddr = (m as any)?.addresses?.stabilityPoolCollateral as
      | string
      | undefined;
    const sailAddr = (m as any)?.addresses?.stabilityPoolLeveraged as
      | string
      | undefined;

    const collateralLower = collateralAddr?.toLowerCase();
    const sailLower = sailAddr?.toLowerCase();

    const collateralDeposit = collateralLower
      ? poolDeposits.find(
          (d) =>
            d.poolType === "collateral" &&
            d.poolAddress.toLowerCase() === collateralLower
        )
      : null;
    const sailDeposit = sailLower
      ? poolDeposits.find(
          (d) =>
            d.poolType === "sail" && d.poolAddress.toLowerCase() === sailLower
        )
      : null;

    const collateralBal = collateralDeposit ? parseEther(collateralDeposit.balance) : 0n;
    const sailBal = sailDeposit ? parseEther(sailDeposit.balance) : 0n;
    return collateralBal > 0n || sailBal > 0n;
  }, [poolDeposits, marketsForToken, selectedMarketId]);

  const marketIdWithAnyPoolDeposit = useMemo(() => {
    if (!poolDeposits || poolDeposits.length === 0) return null;
    if (!marketsForToken || marketsForToken.length <= 1) return null;

    for (const entry of marketsForToken) {
      const m = entry.market;
      const collateralAddr = (m as any)?.addresses?.stabilityPoolCollateral as
        | string
        | undefined;
      const sailAddr = (m as any)?.addresses?.stabilityPoolLeveraged as
        | string
        | undefined;

      const collateralLower = collateralAddr?.toLowerCase();
      const sailLower = sailAddr?.toLowerCase();

      const collateralDeposit = collateralLower
        ? poolDeposits.find(
            (d) =>
              d.poolType === "collateral" &&
              d.poolAddress.toLowerCase() === collateralLower
          )
        : null;
      const sailDeposit = sailLower
        ? poolDeposits.find(
            (d) =>
              d.poolType === "sail" && d.poolAddress.toLowerCase() === sailLower
          )
        : null;

      const collateralBal = collateralDeposit ? parseEther(collateralDeposit.balance) : 0n;
      const sailBal = sailDeposit ? parseEther(sailDeposit.balance) : 0n;

      if (collateralBal > 0n || sailBal > 0n) return entry.marketId;
    }
    return null;
  }, [poolDeposits, marketsForToken]);

  // Onchain fallback for selecting the correct market in withdraw mode:
  // If the marks subgraph is pointing at a different environment (e.g., prod) it may return no deposits.
  // In that case, we detect deposits directly via StabilityPool.assetBalanceOf across all markets in the group.
  const { contracts: groupBalanceContracts, indexMap: groupBalanceIndexMap } =
    useMemo(() => {
      const idxMap = new Map<
        number,
        { marketId: string; kind: "collateralPool" | "sailPool" }
      >();
      const items: any[] = [];

      if (!address || !marketsForToken || marketsForToken.length <= 1) {
        return { contracts: items, indexMap: idxMap };
      }

      for (const entry of marketsForToken) {
        const m = entry.market;
        const collateralAddr = (m as any)?.addresses?.stabilityPoolCollateral as
          | `0x${string}`
          | undefined;
        const sailAddr = (m as any)?.addresses?.stabilityPoolLeveraged as
          | `0x${string}`
          | undefined;

        if (collateralAddr) {
          idxMap.set(items.length, {
            marketId: entry.marketId,
            kind: "collateralPool",
          });
          items.push({
            address: collateralAddr,
            abi: STABILITY_POOL_ABI,
            functionName: "assetBalanceOf",
            args: [address as `0x${string}`],
          });
        }
        if (sailAddr) {
          idxMap.set(items.length, {
            marketId: entry.marketId,
            kind: "sailPool",
          });
          items.push({
            address: sailAddr,
            abi: STABILITY_POOL_ABI,
            functionName: "assetBalanceOf",
            args: [address as `0x${string}`],
          });
        }
      }

      return { contracts: items, indexMap: idxMap };
    }, [address, marketsForToken]);

  const { data: groupOnchainBalances } = useContractReads({
    contracts: groupBalanceContracts,
    query: {
      enabled:
        !!address &&
        isOpen &&
        activeTab === "withdraw" &&
        groupBalanceContracts.length > 0,
      refetchInterval: isOpen ? 15000 : false,
      retry: 1,
      allowFailure: true,
    },
  });

  const marketIdWithAnyOnchainPoolDeposit = useMemo(() => {
    if (!groupOnchainBalances || groupOnchainBalances.length === 0) return null;
    const balancesByMarket = new Map<
      string,
      { collateralPool: bigint; sailPool: bigint }
    >();

    groupOnchainBalances.forEach((res, idx) => {
      const meta = groupBalanceIndexMap.get(idx);
      if (!meta) return;
      const prev = balancesByMarket.get(meta.marketId) || {
        collateralPool: 0n,
        sailPool: 0n,
      };
      const val =
        res?.status === "success" && res.result !== undefined && res.result !== null
          ? (res.result as bigint)
          : 0n;
      if (meta.kind === "collateralPool") prev.collateralPool = val;
      if (meta.kind === "sailPool") prev.sailPool = val;
      balancesByMarket.set(meta.marketId, prev);
    });

    for (const [marketId, b] of balancesByMarket.entries()) {
      if (b.collateralPool > 0n || b.sailPool > 0n) return marketId;
    }
    return null;
  }, [groupOnchainBalances, groupBalanceIndexMap]);

  const selectedMarketHasOnchainPoolDeposit = useMemo(() => {
    if (!groupOnchainBalances || groupOnchainBalances.length === 0) return false;
    // If we only have one market, the per-market hooks below already cover it.
    if (!marketsForToken || marketsForToken.length <= 1) return false;

    // Reuse computed market id if any; if it equals selectedMarketId, we know selected has deposit.
    if (!marketIdWithAnyOnchainPoolDeposit) return false;
    return marketIdWithAnyOnchainPoolDeposit === selectedMarketId;
  }, [groupOnchainBalances, marketsForToken, marketIdWithAnyOnchainPoolDeposit, selectedMarketId]);

  useEffect(() => {
    if (!isOpen) return;
    if (activeTab !== "withdraw") return;
    // Prefer subgraph-based selection if available, but fall back to onchain detection.
    const preferredMarketId =
      marketIdWithAnyPoolDeposit || marketIdWithAnyOnchainPoolDeposit;

    const hasDeposit =
      selectedMarketHasPoolDeposit || selectedMarketHasOnchainPoolDeposit;

    if (hasDeposit) return;
    if (!preferredMarketId) return;
    if (selectedMarketId === preferredMarketId) return;

    if (process.env.NODE_ENV === "development") {
      console.log(
        "[AnchorDepositWithdrawModal] Auto-selecting market with pool deposit:",
        {
          from: selectedMarketId,
          to: preferredMarketId,
        }
      );
    }
    setSelectedMarketId(preferredMarketId);
  }, [
    isOpen,
    activeTab,
    selectedMarketHasPoolDeposit,
    marketIdWithAnyPoolDeposit,
    selectedMarketHasOnchainPoolDeposit,
    marketIdWithAnyOnchainPoolDeposit,
    selectedMarketId,
  ]);

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

  // Extract key addresses and symbols from selected market (needed for anyTokenDeposit hook)
  const minterAddress = selectedMarket?.addresses?.minter;
  // All markets deposit the wrapped collateral token (fxSAVE, wstETH, etc).
  // If this is missing, the config is wrong and we should fail fast.
  const collateralAddress = selectedMarket?.addresses
    ?.wrappedCollateralToken as `0x${string}` | undefined;
  const peggedTokenAddress = selectedMarket?.addresses?.peggedToken;
  const leveragedTokenAddress = selectedMarket?.addresses?.leveragedToken;
  const collateralSymbol = selectedMarket?.collateral?.symbol || "ETH";
  const peggedTokenSymbol = selectedMarket?.peggedToken?.symbol || "ha";

  // Get accepted deposit assets for "any token" functionality
  const acceptedDepositAssets = React.useMemo(
    () => getAcceptedDepositAssets(selectedMarket),
    [selectedMarket]
  );

  // "Any token" deposit hook - allows deposits from any token in user's wallet
  const anyTokenDeposit = useAnyTokenDeposit({
    collateralSymbol,
    marketAddresses: selectedMarket?.addresses,
    acceptedAssets: acceptedDepositAssets,
    depositTarget: {
      type: "minter",
      address: minterAddress || "",
      minterParams: {
        minPeggedOut: 0n, // Will be calculated based on slippage
        receiver: (address as `0x${string}`) || "0x0000000000000000000000000000000000000000",
      },
    },
    enabled: isOpen && activeTab === "deposit",
  });

  // Get BTC and ETH prices for fee conversion in BTC markets
  const { price: btcPrice } = useCoinGeckoPrice("bitcoin", 120000);
  const { price: ethPrice } = useCoinGeckoPrice("ethereum", 120000);
  // Reward token USD prices (used for APR fallback in stability pool selector)
  const { price: fxSAVEPrice } = useCoinGeckoPrice("fx-usd-saving", 120000);
  const { price: wstETHPrice } = useCoinGeckoPrice("wrapped-steth", 120000);
  const { price: stETHPrice } = useCoinGeckoPrice(
    "lido-staked-ethereum-steth",
    120000
  );

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
    // Prioritize markets where the selected asset is the native collateral (no swap needed)
    const normalizedAsset = selectedDepositAsset.toLowerCase();
    
    // First pass: find market where selected asset is the native wrapped collateral
    for (const { market: m } of marketsForToken) {
      const wrappedSymbol = m?.collateral?.symbol?.toLowerCase();
      if (wrappedSymbol === normalizedAsset) {
        return m;
      }
    }
    
    // Second pass: find best market where selected asset is in accepted assets (may need wrapping/zap/swap)
    const getAssetMarketPriority = (assetSymbol: string, m: any): number => {
      const sym = assetSymbol?.toLowerCase?.() || "";
      const collateralSym = m?.collateral?.symbol?.toLowerCase?.() || "";
      const underlyingSym = m?.collateral?.underlyingSymbol?.toLowerCase?.() || "";

      if (collateralSym && sym === collateralSym) return 100;
      if (underlyingSym && sym === underlyingSym) return 90;

      if (
        (sym === "eth" || sym === "steth" || sym === "wsteth") &&
        collateralSym === "wsteth"
      ) {
        return 80;
      }

      if (
        (sym === "fxusd" || sym === "fxsave" || sym === "usdc") &&
        collateralSym === "fxsave"
      ) {
        return 80;
      }

      return 0;
    };

    let bestMarket: any = null;
    let bestPriority = -1;
    for (const { market: m } of marketsForToken) {
      const assets = getAcceptedDepositAssets(m);
      if (assets.some((asset) => asset.symbol === selectedDepositAsset)) {
        const p = getAssetMarketPriority(selectedDepositAsset, m);
        if (p > bestPriority) {
          bestPriority = p;
          bestMarket = m;
      }
    }
    }
    if (bestMarket) return bestMarket;
    return null;
  }, [selectedDepositAsset, marketsForToken, simpleMode]);

  // Update selectedMarketId when deposit asset changes (Step 1 only)
  // This ensures the minting market is locked to the deposit asset
  // We only update in Step 1 to prevent resets when selecting pools in Step 3
  useEffect(() => {
    if (simpleMode && currentStep === 1 && marketForDepositAsset) {
      // Find the marketId for the marketForDepositAsset
      const matchingMarket = marketsForToken.find(
        ({ market: m }) => m === marketForDepositAsset
      );
      if (matchingMarket) {
        setSelectedMarketId(matchingMarket.marketId);
      }
    }
  }, [marketForDepositAsset, currentStep, simpleMode, marketsForToken]);

  // Use market for deposit asset if available, otherwise use selected market
  const activeMarketForFees = marketForDepositAsset || selectedMarket;
  const activeMinterAddress = activeMarketForFees?.addresses?.minter;
  const activeCollateralSymbol =
    activeMarketForFees?.collateral?.symbol ||
    selectedMarket?.collateral?.symbol ||
    "ETH";
  const activeWrappedCollateralSymbol =
    activeMarketForFees?.wrappedCollateral?.symbol || activeCollateralSymbol;

  // Collect all unique deposit assets from all markets with their corresponding markets
  const allDepositAssetsWithMarkets = useMemo(() => {
    const getAssetMarketPriority = (assetSymbol: string, m: any): number => {
      const sym = assetSymbol?.toLowerCase?.() || "";
      const collateralSym = m?.collateral?.symbol?.toLowerCase?.() || "";
      const underlyingSym = m?.collateral?.underlyingSymbol?.toLowerCase?.() || "";

      // Strongest signals: this market's collateral (wrapped or underlying) matches the asset.
      if (collateralSym && sym === collateralSym) return 100;
      if (underlyingSym && sym === underlyingSym) return 90;

      // Heuristics for multi-market ha tokens (e.g., haBTC across fxSAVE-collateral and wstETH-collateral markets)
      // Ensure ETH-based inputs map to the wstETH-collateral market.
      if (
        (sym === "eth" || sym === "steth" || sym === "wsteth") &&
        collateralSym === "wsteth"
      ) {
        return 80;
      }

      // Ensure USD-based inputs map to the fxSAVE-collateral market.
      if (
        (sym === "fxusd" || sym === "fxsave" || sym === "usdc") &&
        collateralSym === "fxsave"
      ) {
        return 80;
      }

      return 0;
    };

    const assetMap = new Map<
      string,
      {
        symbol: string;
        name: string;
        market: any;
        marketId: string;
        minterAddress: string | undefined;
        isPeggedToken?: boolean; // Flag to indicate this is a ha token (direct deposit, no minting)
      }
    >();
    marketsForToken.forEach(({ marketId, market: m }) => {
      const assets = getAcceptedDepositAssets(m);
      const minterAddr = m?.addresses?.minter;
      const peggedTokenSymbol = m?.peggedToken?.symbol || "ha";

      // Add collateral-based assets (require minting)
      assets.forEach((asset) => {
        const existing = assetMap.get(asset.symbol);
        const next = {
            ...asset,
            market: m,
          marketId,
            minterAddress: minterAddr,
            isPeggedToken: false,
        };

        if (!existing) {
          assetMap.set(asset.symbol, next);
          return;
        }

        const prevPriority = getAssetMarketPriority(existing.symbol, existing.market);
        const nextPriority = getAssetMarketPriority(next.symbol, next.market);
        if (nextPriority > prevPriority) {
          assetMap.set(asset.symbol, next);
        }
      });

      // Add ha token option (direct deposit to stability pool, no minting)
      if (!assetMap.has(peggedTokenSymbol)) {
        assetMap.set(peggedTokenSymbol, {
          symbol: peggedTokenSymbol,
          name: m?.peggedToken?.name || `${peggedTokenSymbol} Token`,
          market: m,
          marketId,
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

  // Dropdown deposit assets (no estimated fees shown)
  const depositAssetsForDropdown = useMemo(() => {
    let result = allDepositAssetsWithMarkets.map((asset) => ({
      ...asset,
      isUserToken: false,
    }));

    // Merge with "any token" assets from user's wallet
    if (anyTokenDeposit.allAvailableAssets.length > 0) {
      const existingSymbols = new Set(result.map((a) => a.symbol.toUpperCase()));

      anyTokenDeposit.allAvailableAssets.forEach((token) => {
        if (!existingSymbols.has(token.symbol.toUpperCase())) {
          result.push({
            symbol: token.symbol,
            name: token.name,
            marketId: selectedMarketId, // Use selected market for "any token" deposits
            market: selectedMarket,
            minterAddress: selectedMarket?.addresses?.minter,
            isUserToken: token.isUserToken ?? true,
            isPeggedToken: false,
          } as any);
      }
    });
    }

    return result;
  }, [
    allDepositAssetsWithMarkets,
    anyTokenDeposit.allAvailableAssets,
    selectedMarketId,
    selectedMarket,
  ]);

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
        // For market fees, we use wrapped collateral directly since we're comparing across markets
        // The sample amount should already be in wrapped collateral units
        const wrappedAmount = parseEther("1.0");
        
        contracts.push({
          address: minterAddr as `0x${string}`,
          abi: minterABI,
          functionName: "mintPeggedTokenDryRun" as const,
          args: [wrappedAmount] as const,
          marketId,
        });
      }
    });

    return contracts;
  }, [marketsForToken, simpleMode, isOpen, activeTab]);

  // Use production-compatible contract reads for market fees
  const { data: marketFeeData } = useContractReads({
    contracts: marketFeeContracts.map(({ marketId, ...contract }) => contract),
    allowFailure: true, // Allow individual contract reads to fail without breaking the whole batch
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
        const inputAmount = parseEther("1.0");
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
  // (Removed) Estimated fee fetching for dropdown options.

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

  // Check if selected deposit asset is ha token (works in both simple and advanced mode)
  const isDirectPeggedDeposit = useMemo(() => {
    if (!selectedDepositAsset || activeTab !== "deposit")
      return false;
    // Check if selected asset matches any market's pegged token symbol
    return marketsForToken.some(({ market: m }) => {
      const peggedTokenSymbol = m?.peggedToken?.symbol || "ha";
      return (
        selectedDepositAsset.toLowerCase() === peggedTokenSymbol.toLowerCase()
      );
    });
  }, [selectedDepositAsset, activeTab, marketsForToken]);

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
    if (!selectedDepositAsset) return null;
    
    // Use marketForDepositAsset in simple mode, selectedMarket in advanced mode
    const market = marketForDepositAsset || selectedMarket;
    if (!market) return null;

    const normalized = selectedDepositAsset.toLowerCase();
    
    if (process.env.NODE_ENV === "development") {
      console.log("[getSelectedAssetAddress]", {
        selectedDepositAsset,
        normalized,
        marketId: market?.id,
        marketName: market?.name,
        collateralSymbol: market?.collateral?.symbol,
        wrappedCollateralToken: market?.addresses?.wrappedCollateralToken,
        collateralToken: market?.addresses?.collateralToken,
      });
    }

    // Check if it's ha token - use Genesis contract's pegged token address if available, otherwise fall back to market config
    const peggedTokenSymbol = market?.peggedToken?.symbol || "ha";
    if (normalized === peggedTokenSymbol.toLowerCase()) {
      // Prefer the address from Genesis contract (source of truth)
      if (genesisPeggedTokenAddress) {
        return genesisPeggedTokenAddress as `0x${string}`;
      }
      // Fall back to market config address
      const address = market?.addresses?.peggedToken;
      return address ? (address as `0x${string}`) : null;
    }

    // Check if it's native ETH
    if (normalized === "eth") {
      return "0x0000000000000000000000000000000000000000" as `0x${string}`; // Marker for native ETH
    }

    // Check if it's wrapped collateral token (fxSAVE, wstETH, etc.)
    // collateral.symbol is the wrapped version (what's actually deposited)
    const wrappedCollateralSymbol = market?.collateral?.symbol || "";
    if (normalized === wrappedCollateralSymbol.toLowerCase()) {
      const address = market?.addresses?.wrappedCollateralToken;
      if (process.env.NODE_ENV === "development") {
        console.log("[getSelectedAssetAddress] Matched wrapped collateral:", {
          normalized,
          wrappedCollateralSymbol,
          address,
        });
      }
      return address ? (address as `0x${string}`) : null;
    }

    // Check if it's underlying collateral token (fxUSD, stETH, etc.)
    // collateral.underlyingSymbol is the base token
    const underlyingCollateralSymbol = market?.collateral?.underlyingSymbol || "";
    if (normalized === underlyingCollateralSymbol.toLowerCase()) {
      // Special case: for stETH in wstETH markets, use underlyingCollateralToken or hardcoded address
      // Do NOT use collateralToken as it might be wstETH
      if (normalized === "steth" && wrappedCollateralSymbol.toLowerCase() === "wsteth") {
        const stETHAddress = market?.addresses?.underlyingCollateralToken || 
                             "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84";
        return stETHAddress as `0x${string}`;
      }
      // For other underlying tokens (like fxUSD), use collateralToken
      const address = market?.addresses?.collateralToken;
      return address ? (address as `0x${string}`) : null;
    }

    // Backward compatibility fallbacks
    // stETH can be either wrapped (BTC/stETH market) or underlying (wstETH market)
    if (normalized === "steth") {
      // Check if this is a wstETH market (stETH is underlying) or BTC/stETH market (stETH is wrapped)
      const isWstETHMarket = wrappedCollateralSymbol.toLowerCase() === "wsteth";
      if (isWstETHMarket) {
        // For wstETH markets, stETH is the underlying collateral
        // Use underlyingCollateralToken if available (from contracts.ts), otherwise fallback to hardcoded stETH address
        // NOTE: Do NOT use collateralToken as it might be wstETH in some market configs
        const stETHAddress = market?.addresses?.underlyingCollateralToken || 
                             "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84";
        return stETHAddress as `0x${string}`;
      } else {
      // For BTC/stETH market, stETH is the wrapped collateral
        const address = market?.addresses?.wrappedCollateralToken;
        return address ? (address as `0x${string}`) : null;
      }
    }

    // wstETH is wrapped, stETH is underlying
    if (normalized === "wsteth") {
      const address = market?.addresses?.wrappedCollateralToken;
      return address ? (address as `0x${string}`) : null;
    }

    // fxSAVE is wrapped, fxUSD is underlying
    if (normalized === "fxsave") {
      const address = market?.addresses?.wrappedCollateralToken;
      return address ? (address as `0x${string}`) : null;
    }

    // fxUSD is the underlying token
    if (normalized === "fxusd") {
      const address = market?.addresses?.collateralToken;
      return address ? (address as `0x${string}`) : null;
    }

    // Check if it's USDC (standard USDC address on Ethereum mainnet)
    if (normalized === "usdc") {
      return "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as `0x${string}`;
    }

    return null;
  }, [selectedDepositAsset, marketForDepositAsset, selectedMarket, genesisPeggedTokenAddress]);

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
      refetchInterval: isOpen ? 15000 : false, // Only poll when modal is open, reduced from 5s to 15s
    },
  });

  // Contract read hooks - balance for selected deposit asset
  // Use Anvil-specific read if in development, otherwise use wagmi
  const useAnvilForBalance = false;
  const selectedAssetAddress = getSelectedAssetAddress;
  const anvilSelectedAssetResult = useContractRead({
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
    refetchInterval: isOpen ? 15000 : false, // Only poll when modal is open, reduced from 5s to 15s
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
      refetchInterval: isOpen ? 15000 : false, // Only poll when modal is open, reduced from 5s to 15s
      retry: 1,
      allowFailure: true,
    },
  });

  const wagmiSelectedAssetBalanceEnabled = 
    !!address &&
    !!selectedAssetAddress &&
    selectedAssetAddress !== "0x0000000000000000000000000000000000000000" &&
    isOpen &&
    activeTab === "deposit" &&
    simpleMode &&
    !!selectedDepositAsset &&
    !useAnvilForBalance;

  useEffect(() => {
    if (process.env.NODE_ENV === "development" && isOpen && activeTab === "deposit") {
      console.log("[Balance Read Enabled Check]", {
        enabled: wagmiSelectedAssetBalanceEnabled,
        address: !!address,
        selectedAssetAddress: selectedAssetAddress || "null",
        isOpen,
        activeTab,
        simpleMode,
        selectedDepositAsset: selectedDepositAsset || "null",
        useAnvilForBalance,
      });
    }
  }, [wagmiSelectedAssetBalanceEnabled, address, selectedAssetAddress, isOpen, activeTab, simpleMode, selectedDepositAsset, useAnvilForBalance]);

  const selectedAssetBalanceData = useAnvilForBalance
    ? anvilSelectedAssetResult.data
    : wagmiSelectedAssetResult.data;
  const selectedAssetBalanceError = useAnvilForBalance
    ? anvilSelectedAssetResult.error
    : wagmiSelectedAssetResult.error;
  const selectedAssetBalanceLoading = useAnvilForBalance
    ? anvilSelectedAssetResult.isLoading
    : wagmiSelectedAssetResult.isLoading;

  // Debug: Log the actual balance value being returned from the contract
  useEffect(() => {
    if (process.env.NODE_ENV === "development" && selectedDepositAsset) {
      console.log("[Balance Read from Contract]", {
        asset: selectedDepositAsset,
        address: selectedAssetAddress,
        hasData: !!selectedAssetBalanceData,
        rawBalance: selectedAssetBalanceData ? selectedAssetBalanceData.toString() : "null/undefined",
        formatted: selectedAssetBalanceData ? formatEther(selectedAssetBalanceData as bigint) : "null/undefined",
        isLoading: selectedAssetBalanceLoading,
        error: selectedAssetBalanceError?.message || null,
        wagmiResultData: wagmiSelectedAssetResult.data ? wagmiSelectedAssetResult.data.toString() : "null/undefined",
      });
    }
  }, [selectedAssetBalanceData, selectedDepositAsset, selectedAssetAddress, selectedAssetBalanceLoading, selectedAssetBalanceError, wagmiSelectedAssetResult.data]);

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
      refetchInterval: isOpen ? 15000 : false, // Only poll when modal is open, reduced from 5s to 15s
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

  const anvilBalanceResult = useContractRead({
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
    refetchInterval: isOpen ? 15000 : false, // Only poll when modal is open, reduced from 5s to 15s
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
      refetchInterval: isOpen ? 15000 : false, // Only poll when modal is open, reduced from 5s to 15s
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
  const useAnvilForPeggedBalance = false;

  const anvilPeggedBalanceResult = useContractRead({
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
    refetchInterval: isOpen ? 15000 : false, // Only poll when modal is open, reduced from 5s to 15s
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
      refetchInterval: isOpen ? 15000 : false, // Only poll when modal is open, reduced from 5s to 15s
      retry: 1,
      allowFailure: true,
    },
  });

  const peggedBalanceData = useAnvilForPeggedBalance
    ? anvilPeggedBalanceResult.data
    : wagmiPeggedBalanceResult.data;

  // Set default selection to ha token when user has ha tokens in wallet or when initialDepositAsset is provided
  useEffect(() => {
    if (
      isOpen &&
      activeTab === "deposit" &&
      simpleMode &&
      !selectedDepositAsset
    ) {
      // Priority: use initialDepositAsset if provided, otherwise use ha token if user has balance
      if (initialDepositAsset) {
        setSelectedDepositAsset(initialDepositAsset);
      } else if (
        peggedTokenSymbol &&
        peggedBalanceData !== undefined &&
        peggedBalanceData !== null &&
        peggedBalanceData > 0n
      ) {
        setSelectedDepositAsset(peggedTokenSymbol);
      }
    }
  }, [
    isOpen,
    activeTab,
    simpleMode,
    selectedDepositAsset,
    initialDepositAsset,
    peggedTokenSymbol,
    peggedBalanceData,
  ]);

  // Get stability pool balances for withdraw
  const collateralPoolAddress = selectedMarket?.addresses
    ?.stabilityPoolCollateral as `0x${string}` | undefined;
  const sailPoolAddress = selectedMarket?.addresses?.stabilityPoolLeveraged as
    | `0x${string}`
    | undefined;

  // ---------------------------------------------------------------------------
  // Stability Pool minimum-supply floor reads (used to prevent 0-withdraw txs)
  // ---------------------------------------------------------------------------
  const { data: collateralPoolTotalSupply } = useContractRead({
    address: collateralPoolAddress,
    abi: STABILITY_POOL_ABI,
    functionName: "totalAssetSupply",
    query: {
      enabled: !!collateralPoolAddress && isOpen && activeTab === "withdraw",
      retry: 1,
      allowFailure: true,
    },
  });

  const { data: collateralPoolMinTotalSupply } = useContractRead({
    address: collateralPoolAddress,
    abi: STABILITY_POOL_ABI,
    functionName: "MIN_TOTAL_ASSET_SUPPLY",
    query: {
      enabled: !!collateralPoolAddress && isOpen && activeTab === "withdraw",
      retry: 1,
      allowFailure: true,
    },
  });

  const { data: sailPoolTotalSupply } = useContractRead({
    address: sailPoolAddress,
    abi: STABILITY_POOL_ABI,
    functionName: "totalAssetSupply",
    query: {
      enabled: !!sailPoolAddress && isOpen && activeTab === "withdraw",
      retry: 1,
      allowFailure: true,
    },
  });

  const { data: sailPoolMinTotalSupply } = useContractRead({
    address: sailPoolAddress,
    abi: STABILITY_POOL_ABI,
    functionName: "MIN_TOTAL_ASSET_SUPPLY",
    query: {
      enabled: !!sailPoolAddress && isOpen && activeTab === "withdraw",
      retry: 1,
      allowFailure: true,
    },
  });

  // Collateral pool balance - use Anvil hook when on local chain
  const anvilCollateralPoolResult = useContractRead({
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
    refetchInterval: isOpen ? 15000 : false, // Only poll when modal is open, reduced from 5s to 15s
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
      refetchInterval: isOpen ? 15000 : false, // Only poll when modal is open, reduced from 5s to 15s
      retry: 1,
      allowFailure: true,
    },
  });

  const collateralPoolBalanceData = useAnvilForPeggedBalance
    ? anvilCollateralPoolResult.data
    : wagmiCollateralPoolResult.data;

  // Sail pool balance - use Anvil hook when on local chain
  const anvilSailPoolResult = useContractRead({
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
    refetchInterval: isOpen ? 15000 : false, // Only poll when modal is open, reduced from 5s to 15s
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
      refetchInterval: isOpen ? 15000 : false, // Only poll when modal is open, reduced from 5s to 15s
      retry: 1,
      allowFailure: true,
    },
  });

  const sailPoolBalanceData = useAnvilForPeggedBalance
    ? anvilSailPoolResult.data
    : wagmiSailPoolResult.data;

  // Early withdrawal fees - read from both pools
  const anvilCollateralPoolFeeResult = useContractRead({
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

  const anvilSailPoolFeeResult = useContractRead({
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
  const anvilCollateralWindowResult = useContractRead({
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

  const anvilSailWindowResult = useContractRead({
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

  // Read withdrawal request data for both pools to check if fee-free window is open
  const anvilCollateralRequestResult = useContractRead({
    address: collateralPoolAddress,
    abi: STABILITY_POOL_ABI,
    functionName: "getWithdrawalRequest",
    args: address ? [address] : undefined,
    enabled: !!collateralPoolAddress && !!address && isOpen && useAnvilForPeggedBalance && activeTab === "withdraw",
    refetchInterval: 30000,
  });

  const wagmiCollateralRequestResult = useContractRead({
    address: collateralPoolAddress,
    abi: STABILITY_POOL_ABI,
    functionName: "getWithdrawalRequest",
    args: address ? [address] : undefined,
    query: {
      enabled: !!collateralPoolAddress && !!address && isOpen && !useAnvilForPeggedBalance && activeTab === "withdraw",
      refetchInterval: 30000,
      allowFailure: true,
    },
  });

  const collateralPoolRequest: readonly [bigint, bigint] | undefined = useAnvilForPeggedBalance
    ? (anvilCollateralRequestResult.data as readonly [bigint, bigint] | undefined)
    : (wagmiCollateralRequestResult.data as readonly [bigint, bigint] | undefined);

  const anvilSailRequestResult = useContractRead({
    address: sailPoolAddress,
    abi: STABILITY_POOL_ABI,
    functionName: "getWithdrawalRequest",
    args: address ? [address] : undefined,
    enabled: !!sailPoolAddress && !!address && isOpen && useAnvilForPeggedBalance && activeTab === "withdraw",
    refetchInterval: 30000,
  });

  const wagmiSailRequestResult = useContractRead({
    address: sailPoolAddress,
    abi: STABILITY_POOL_ABI,
    functionName: "getWithdrawalRequest",
    args: address ? [address] : undefined,
    query: {
      enabled: !!sailPoolAddress && !!address && isOpen && !useAnvilForPeggedBalance && activeTab === "withdraw",
      refetchInterval: 30000,
      allowFailure: true,
    },
  });

  const sailPoolRequest: readonly [bigint, bigint] | undefined = useAnvilForPeggedBalance
    ? (anvilSailRequestResult.data as readonly [bigint, bigint] | undefined)
    : (wagmiSailRequestResult.data as readonly [bigint, bigint] | undefined);

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

  // Helper function to calculate remaining time in fee-free window and format display
  // Returns fee percentage (e.g., "1%") BEFORE window opens or AFTER window closes
  // Returns "(free)" DURING the open window (time remaining is shown in banner, not button)
  const getFeeFreeDisplay = useCallback((
    request: readonly [bigint, bigint] | undefined,
    feePercent: number | undefined
  ): string => {
    if (!request || !feePercent) {
      return `${feePercent?.toFixed(0) ?? "1"}%`;
    }

    const [start, end] = request;
    // Check if there's no active request
    if (start === 0n && end === 0n) {
      return `${feePercent.toFixed(0)}%`;
    }

    // Get current time
    const now = BigInt(Math.floor(Date.now() / 1000));
    
    // Check if window is currently open (now is between start and end)
    if (now >= start && now <= end) {
      // Window is OPEN - show "(free)" only, time remaining is shown in banner
      return "(free)";
    }

    // Window is NOT open (either before it opens: now < start, or after it closes: now > end)
    // Show fee percentage (e.g., "1%")
    return `${feePercent.toFixed(0)}%`;
  }, []);

  // Helper function to get request status text for button
  const getRequestStatusText = useCallback((
    request: readonly [bigint, bigint] | undefined
  ): string => {
    if (!request) {
      return "";
    }

    const [start, end] = request;
    // Check if there's no active request
    if (start === 0n && end === 0n) {
      return "";
    }

    // Get current time
    const now = BigInt(Math.floor(Date.now() / 1000));
    
    // Check if window is open
    if (now >= start && now <= end) {
      return " (open)";
    }

    // Check if window is coming (start > now)
    if (start > now) {
      return " (pending)";
    }

    // Window has passed (end < now)
    return "";
  }, []);

  // Helper function to format time as HH:MM
  const formatTime = (timestamp: bigint): string => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleTimeString("en-US", { 
      hour: "2-digit", 
      minute: "2-digit",
      hour12: false 
    });
  };

  // Helper function to get window banner info
  const getWindowBannerInfo = useCallback((
    request: readonly [bigint, bigint] | undefined,
    window: readonly [bigint, bigint] | undefined
  ): { type: "coming" | "open" | null; message: string } | null => {
    if (!request || !window) {
      return null;
    }

    const [start, end] = request;
    // Check if there's no active request
    if (start === 0n && end === 0n) {
      return null;
    }

    const [startDelay, endWindow] = window;
    const now = BigInt(Math.floor(Date.now() / 1000));
    
    // Check if window is open
    if (now >= start && now <= end) {
      const remainingSeconds = Number(end - now);
      const remainingHours = remainingSeconds / 3600;
      const remainingMinutes = Math.floor(remainingSeconds / 60);
      
      const startTimeStr = formatTime(start);
      const endTimeStr = formatTime(end);
      
      let timeRemaining: string;
      if (remainingHours < 1) {
        timeRemaining = `${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""} remaining`;
      } else {
        const hours = Math.floor(remainingHours);
        timeRemaining = `${hours} hour${hours !== 1 ? "s" : ""} remaining`;
      }
      
      return {
        type: "open",
        message: `Window open from ${startTimeStr} to ${endTimeStr} (${timeRemaining})`,
      };
    }

    // Check if window is coming (start > now)
    if (start > now) {
      const secondsUntilStart = Number(start - now);
      const minutesUntilStart = Math.floor(secondsUntilStart / 60);
      const startTimeStr = formatTime(start);
      
      return {
        type: "coming",
        message: `Withdraw window opens at ${startTimeStr} in ${minutesUntilStart} minute${minutesUntilStart !== 1 ? "s" : ""}`,
      };
    }

    // Window has passed
    return null;
  }, []);

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
      refetchInterval: isOpen ? 15000 : false, // Only poll when modal is open, reduced from 5s to 15s
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

  const pegTargetForPrice = useMemo(() => {
    const m =
      isDirectPeggedDeposit && marketForDepositAsset
        ? marketForDepositAsset
        : selectedMarket;
    return (m as any)?.pegTarget?.toLowerCase?.() || "usd";
  }, [isDirectPeggedDeposit, marketForDepositAsset, selectedMarket]);

  const needsBtcUsdFeed =
    pegTargetForPrice === "btc" || pegTargetForPrice === "bitcoin";
  const needsEthUsdFeed =
    pegTargetForPrice === "eth" || pegTargetForPrice === "ethereum";

  const chainlinkPegTargetContracts = useMemo(() => {
    const contracts: any[] = [];
    if (needsBtcUsdFeed) {
      contracts.push(
        {
          address: CHAINLINK_FEEDS.BTC_USD,
          abi: CHAINLINK_AGGREGATOR_ABI,
          functionName: "decimals",
        },
        {
          address: CHAINLINK_FEEDS.BTC_USD,
          abi: CHAINLINK_AGGREGATOR_ABI,
          functionName: "latestRoundData",
        }
      );
    }
    if (needsEthUsdFeed) {
      contracts.push(
        {
          address: CHAINLINK_FEEDS.ETH_USD,
          abi: CHAINLINK_AGGREGATOR_ABI,
          functionName: "decimals",
        },
        {
          address: CHAINLINK_FEEDS.ETH_USD,
          abi: CHAINLINK_AGGREGATOR_ABI,
          functionName: "latestRoundData",
        }
      );
    }
    return contracts;
  }, [needsBtcUsdFeed, needsEthUsdFeed]);

  const { data: chainlinkPegTargetData } = useContractReads({
    contracts: chainlinkPegTargetContracts,
    query: {
      enabled:
        chainlinkPegTargetContracts.length > 0 &&
        isOpen &&
        activeTab === "deposit",
      retry: 1,
      allowFailure: true,
    },
  });

  const { btcUsdWei, ethUsdWei } = useMemo(() => {
    let idx = 0;
    let btc = 0n;
    let eth = 0n;

    const readPrice = () => {
      const decRaw = chainlinkPegTargetData?.[idx]?.result as
        | bigint
        | number
        | undefined;
      const decimals =
        typeof decRaw === "bigint"
          ? Number(decRaw)
          : typeof decRaw === "number"
            ? decRaw
            : undefined;
      const round = chainlinkPegTargetData?.[idx + 1]?.result as
        | readonly [bigint, bigint, bigint, bigint, bigint]
        | undefined;
      const answer = round?.[1];
      idx += 2;
      if (decimals === undefined || answer === undefined) return 0n;
      return scaleChainlinkToUsdWei(answer, decimals);
    };

    if (needsBtcUsdFeed) btc = readPrice();
    if (needsEthUsdFeed) eth = readPrice();

    return { btcUsdWei: btc, ethUsdWei: eth };
  }, [chainlinkPegTargetData, needsBtcUsdFeed, needsEthUsdFeed]);

  const pegTargetUsdWei = useMemo(() => {
    if (pegTargetForPrice === "btc" || pegTargetForPrice === "bitcoin") {
      return btcPrice
        ? parseUnits(btcPrice.toFixed(8), 18)
        : btcUsdWei > 0n
          ? btcUsdWei
          : 0n;
    }
    if (pegTargetForPrice === "eth" || pegTargetForPrice === "ethereum") {
      return ethPrice
        ? parseUnits(ethPrice.toFixed(8), 18)
        : ethUsdWei > 0n
          ? ethUsdWei
          : 0n;
    }
    // USD-pegged
    return 10n ** 18n;
  }, [pegTargetForPrice, btcPrice, ethPrice, btcUsdWei, ethUsdWei]);

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

  const { data: allPoolData, isLoading: isPoolDataLoading } = useContractReads({
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

    const extractAprBreakdown = (
      val: unknown
    ): { collateral: bigint; steam: bigint } | null => {
      if (!val) return null;
      // viem can return tuples as arrays, named objects, or array-like objects with named keys.
      if (Array.isArray(val) && val.length >= 2) {
        const a = val[0];
        const b = val[1];
        if (typeof a === "bigint" && typeof b === "bigint") return { collateral: a, steam: b };
      }
      if (typeof val === "object") {
        const v: any = val as any;
        const a = v.collateralTokenAPR ?? v[0];
        const b = v.steamTokenAPR ?? v[1];
        if (typeof a === "bigint" && typeof b === "bigint") return { collateral: a, steam: b };
      }
      return null;
    };

    // IMPORTANT: poolContracts only includes reads for *valid* pool addresses.
    // So we must advance through allPoolData with a cursor, not by index*4.
    let cursor = 0;
    return allStabilityPools.map((pool) => {
      const isValidAddress =
        pool.address &&
        typeof pool.address === "string" &&
        pool.address.startsWith("0x") &&
        pool.address.length === 42;

      if (!isValidAddress) {
        return {
          ...pool,
          apr: undefined,
          tvl: undefined,
          rewardTokens: [],
        };
      }

      const aprBreakdown = extractAprBreakdown(allPoolData[cursor]?.result);
      const tvl = allPoolData[cursor + 1]?.result as bigint | undefined;
      const gaugeRewardToken = allPoolData[cursor + 2]?.result as
        | `0x${string}`
        | undefined;
      const liquidationToken = allPoolData[cursor + 3]?.result as
        | `0x${string}`
        | undefined;
      cursor += 4;

      const apr =
        aprBreakdown
          ? (Number(aprBreakdown.collateral) / 1e16) * 100 +
            (Number(aprBreakdown.steam) / 1e16) * 100
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

  // ---------------------------------------------------------------------------
  // APR fallback: compute APR from reward emission rates if getAPRBreakdown fails.
  // This fixes "APR: ..." in the stability pool selector while TVL loads fine.
  // ---------------------------------------------------------------------------
  const rewardTokenUsdPriceMap = useMemo(() => {
    const map = new Map<string, number>();
    if (fxSAVEPrice && fxSAVEPrice > 0)
      map.set(FXSAVE_TOKEN_ADDRESS.toLowerCase(), fxSAVEPrice);
    if (wstETHPrice && wstETHPrice > 0)
      map.set(WSTETH_TOKEN_ADDRESS.toLowerCase(), wstETHPrice);
    // Use stETH spot for stETH address (some pools may pay stETH directly)
    if (stETHPrice && stETHPrice > 0)
      map.set(STETH_TOKEN_ADDRESS.toLowerCase(), stETHPrice);
    return map;
  }, [fxSAVEPrice, wstETHPrice, stETHPrice]);

  const rewardDataMeta = useMemo(() => {
    // Only compute APR from the *collateral reward token* (wrapped collateral),
    // so we don't surface hs/leveraged reward tokens in the UI.
    const meta: Array<{ poolAddress: `0x${string}`; tokenAddress: `0x${string}` }> =
      [];
    if (!isOpen || !simpleMode || activeTab !== "deposit") return meta;

    for (const pool of poolsWithData) {
      const poolAddr = pool.address as unknown as string;
      const isValidPool =
        poolAddr &&
        typeof poolAddr === "string" &&
        poolAddr.startsWith("0x") &&
        poolAddr.length === 42;
      if (!isValidPool) continue;

      const wrapped = (pool.market as any)?.addresses?.wrappedCollateralToken as
        | `0x${string}`
        | undefined;
      if (!wrapped || !wrapped.startsWith("0x") || wrapped.length !== 42) continue;

      meta.push({
        poolAddress: pool.address as `0x${string}`,
        tokenAddress: wrapped.toLowerCase() as `0x${string}`,
      });
    }
    return meta;
  }, [poolsWithData, isOpen, simpleMode, activeTab]);

  const { data: rewardDataReads, isLoading: isRewardDataLoading } =
    useContractReads({
    contracts: rewardDataMeta.map((m) => ({
      address: m.poolAddress,
      abi: STABILITY_POOL_ABI,
      functionName: "rewardData",
      args: [m.tokenAddress],
    })),
    query: {
      enabled:
        rewardDataMeta.length > 0 &&
        isOpen &&
        simpleMode &&
        activeTab === "deposit",
      retry: 1,
      allowFailure: true,
    },
    });

  const poolAprFallbackByAddress = useMemo(() => {
    const map = new Map<string, number>();
    if (!rewardDataReads || rewardDataReads.length === 0) return map;

    const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;

    // Group reward rates by pool address (collateral reward token only)
    const ratesByPool = new Map<string, Array<{ token: string; rate: bigint }>>();
    for (let i = 0; i < rewardDataMeta.length; i++) {
      const meta = rewardDataMeta[i];
      const r = rewardDataReads[i];
      if (!meta || !r || r.status !== "success" || !r.result) continue;
      const tuple = r.result as [bigint, bigint, bigint, bigint]; // [lastUpdate, finishAt, rate, queued]
      const rate = tuple?.[2];
      if (typeof rate !== "bigint" || rate <= 0n) continue;

      const poolKey = String(meta.poolAddress).toLowerCase();
      const tokenKey = String(meta.tokenAddress).toLowerCase();
      const arr = ratesByPool.get(poolKey) ?? [];
      arr.push({ token: tokenKey, rate });
      ratesByPool.set(poolKey, arr);
    }

    for (const pool of poolsWithData) {
      const poolKey = String(pool.address).toLowerCase();
      const tvl = pool.tvl as bigint | undefined;
      if (!tvl || tvl <= 0n) continue;

      // We already have a USD conversion path for TVL in the modal (peggedTokenPrice * pegTargetUsdWei).
      // This assumes the current market's peggedTokenPrice is representative in simple mode.
      if (!peggedTokenPrice || (peggedTokenPrice as bigint) <= 0n || pegTargetUsdWei <= 0n)
        continue;

      const tvlUsdWei =
        (tvl * (peggedTokenPrice as bigint) * pegTargetUsdWei) / 10n ** 36n;
      const tvlUsd = parseFloat(formatUnits(tvlUsdWei, 18));
      if (!Number.isFinite(tvlUsd) || tvlUsd <= 0) continue;

      let totalApr = 0;
      const rates = ratesByPool.get(poolKey) ?? [];
      for (const rr of rates) {
        const tokenPriceUsd = rewardTokenUsdPriceMap.get(rr.token);
        if (!tokenPriceUsd || tokenPriceUsd <= 0) continue;

        const annualRewardsTokens = (Number(rr.rate) * SECONDS_PER_YEAR) / 1e18;
        const annualRewardsUsd = annualRewardsTokens * tokenPriceUsd;
        if (annualRewardsUsd > 0) {
          totalApr += (annualRewardsUsd / tvlUsd) * 100;
        }
      }

      if (totalApr > 0) map.set(poolKey, totalApr);
    }

    return map;
  }, [
    rewardDataMeta,
    rewardDataReads,
    poolsWithData,
    rewardTokenUsdPriceMap,
    peggedTokenPrice,
    pegTargetUsdWei,
  ]);

  const poolsWithAprFallback = useMemo(() => {
    return poolsWithData.map((pool) => {
      const key = String(pool.address).toLowerCase();
      const fallback = poolAprFallbackByAddress.get(key);
      return {
        ...pool,
        apr: pool.apr ?? fallback,
      };
    });
  }, [poolsWithData, poolAprFallbackByAddress]);

  // Fetch reward token symbols for all pools
  const rewardTokenAddresses = useMemo(() => {
    const addresses: `0x${string}`[] = [];
    // Only include the wrapped collateral token for each pool (collateral reward token)
    poolsWithAprFallback.forEach((pool) => {
      const wrapped = (pool.market as any)?.addresses?.wrappedCollateralToken as
        | `0x${string}`
        | undefined;
      if (
        wrapped &&
        wrapped !== "0x0000000000000000000000000000000000000000" &&
        wrapped.startsWith("0x") &&
        wrapped.length === 42
      ) {
        addresses.push(wrapped);
      }
    });
    const uniqueAddresses = [...new Set(addresses)]; // Remove duplicates

    // Debug logging

    return uniqueAddresses;
  }, [poolsWithAprFallback, isOpen, simpleMode]);

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
    return poolsWithAprFallback.map((pool) => {
      // Get reward tokens from market config (default is collateral)
      const marketConfig = pool.market;
      // Revert behavior: only show collateral reward tokens (config default),
      // not every registered/active reward token (e.g. leveraged/hs tokens).
      const configRewardTokens = marketConfig?.rewardTokens?.default || [];
      const allRewardTokens = [...new Set(configRewardTokens)];

      return {
        ...pool,
        rewardTokens: allRewardTokens,
      };
    });
  }, [poolsWithAprFallback, rewardTokenSymbolMap]);

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
  // Always filter by the selected reward token, regardless of deposit type
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
      refetchInterval: isOpen ? 15000 : false, // Only poll when modal is open, reduced from 5s to 15s
      retry: 1,
      allowFailure: true,
    },
  });

  // Check allowance for pegged token to stability pool (for mint tab if depositing to stability pool, or for deposit tab)
  // Use Anvil hook when on local chain
  const useAnvilForPeggedAllowance = false;

  const {
    data: anvilPeggedTokenAllowanceData,
    refetch: refetchAnvilPeggedTokenAllowance,
  } = useContractRead({
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
    refetchInterval: isOpen ? 15000 : false, // Only poll when modal is open, reduced from 5s to 15s
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
      refetchInterval: isOpen ? 15000 : false, // Only poll when modal is open, reduced from 5s to 15s
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
  const shouldUseAnvilHook = false;

  // Convert deposit amount to wrapped collateral units for dry run
  // Use debounced amount to reduce unnecessary contract calls
  const depositAmountInWrappedCollateral = useMemo(() => {
    if (!debouncedAmount || parseFloat(debouncedAmount) === 0 || activeTab !== "deposit") return undefined;
    
    // Skip dry run for very small amounts (< 0.0001) to reduce calls
    if (parseFloat(debouncedAmount) < 0.0001) return undefined;
    
    const depositAsset = selectedDepositAsset || collateralSymbol;
    const inputAmount = parseEther(debouncedAmount);
    
    // Determine which market we're depositing into
    const isFxSAVEMarket = activeWrappedCollateralSymbol === "fxSAVE";
    const isWstETHMarket = activeWrappedCollateralSymbol === "wstETH";
    
    // If depositing wrapped collateral directly (fxSAVE or wstETH), no conversion needed
    if (depositAsset === activeWrappedCollateralSymbol) {
      return inputAmount;
    }
    
    // If depositing pegged token (fxUSD or haETH), convert to wrapped collateral
    if (depositAsset === peggedTokenSymbol) {
      // fxSAVE = fxUSD / rate OR wstETH = haETH / rate
      const wrappedRate = marketForDepositAsset?.wrappedRate || selectedMarket?.wrappedRate || 10n**18n;
      return (inputAmount * 10n**18n) / wrappedRate;
    }
    
    // If depositing USDC (for USD market), convert USDC → fxUSD → fxSAVE
    if (depositAsset === "USDC" && isFxSAVEMarket) {
      // Parse USDC with 6 decimals - use debouncedAmount and validate
      const amountFloat = parseFloat(debouncedAmount);
      if (isNaN(amountFloat) || amountFloat <= 0) {
        return undefined;
      }
      const usdcAmount = BigInt(Math.floor(amountFloat * 10**6));
      // Convert to 18 decimals
      const usdcIn18Decimals = usdcAmount * 10n**12n;
      // Convert fxUSD to fxSAVE
      const wrappedRate = marketForDepositAsset?.wrappedRate || selectedMarket?.wrappedRate || 10n**18n;
      return (usdcIn18Decimals * 10n**18n) / wrappedRate;
    }
    
    // If depositing fxUSD (for USD market), convert fxUSD → fxSAVE
    if (depositAsset === "fxUSD" && isFxSAVEMarket) {
      // fxUSD is already in 18 decimals, just convert to fxSAVE using wrapped rate
      const wrappedRate = marketForDepositAsset?.wrappedRate || selectedMarket?.wrappedRate || 10n**18n;
      return (inputAmount * 10n**18n) / wrappedRate;
    }
    
    // If depositing ETH (for ETH market), convert ETH → wstETH
    if ((depositAsset === "ETH" || depositAsset === collateralSymbol) && isWstETHMarket) {
      // ETH → stETH (1:1) → wstETH (using rate)
      const wrappedRate = marketForDepositAsset?.wrappedRate || selectedMarket?.wrappedRate || 10n**18n;
      return (inputAmount * 10n**18n) / wrappedRate;
    }
    
    // If depositing stETH (for ETH market), convert stETH → wstETH
    if (depositAsset === "stETH" && isWstETHMarket) {
      // stETH → wstETH (using wrapped rate)
      const wrappedRate = marketForDepositAsset?.wrappedRate || selectedMarket?.wrappedRate || 10n**18n;
      return (inputAmount * 10n**18n) / wrappedRate;
    }
    
    // For other assets (swap assets handled separately), return undefined
    return undefined;
  }, [debouncedAmount, activeTab, selectedDepositAsset, collateralSymbol, activeWrappedCollateralSymbol, peggedTokenSymbol, marketForDepositAsset, selectedMarket]);

  // For ETH/stETH deposits, query wstETH contract for accurate conversion rate
  const wstETHAddressForConversion = useMemo(() => {
    const depositAsset = selectedDepositAsset || collateralSymbol;
    const isWstETHMarket = activeWrappedCollateralSymbol === "wstETH";
    if ((depositAsset === "ETH" || depositAsset === collateralSymbol || depositAsset === "stETH") && isWstETHMarket) {
      return marketForDepositAsset?.addresses?.wrappedCollateralToken || selectedMarket?.addresses?.wrappedCollateralToken;
    }
    return undefined;
  }, [selectedDepositAsset, collateralSymbol, activeWrappedCollateralSymbol, marketForDepositAsset, selectedMarket]);

  const ethOrStethAmount = useMemo(() => {
    const depositAsset = selectedDepositAsset || collateralSymbol;
    if ((depositAsset === "ETH" || depositAsset === collateralSymbol || depositAsset === "stETH") && debouncedAmount && parseFloat(debouncedAmount) > 0) {
      return parseEther(debouncedAmount);
    }
    return undefined;
  }, [selectedDepositAsset, collateralSymbol, debouncedAmount]);

  const { data: wstETHAmountFromContract } = useContractRead({
    address: wstETHAddressForConversion as `0x${string}`,
    abi: WSTETH_ABI,
    functionName: "getWstETHByStETH",
    args: ethOrStethAmount ? [ethOrStethAmount] : undefined,
    query: {
      enabled: !!wstETHAddressForConversion && !!ethOrStethAmount && activeTab === "deposit" && isOpen,
    },
  });

  // Use wstETH contract rate if available, otherwise fall back to depositAmountInWrappedCollateral
  const accurateDepositAmountInWrappedCollateral = useMemo(() => {
    if (wstETHAmountFromContract) {
      return wstETHAmountFromContract as bigint;
    }
    return depositAmountInWrappedCollateral;
  }, [wstETHAmountFromContract, depositAmountInWrappedCollateral]);

  // Calculate expected output based on active tab - use Anvil hook when on Anvil
  const { data: anvilExpectedMintOutput } = useContractRead({
    address: minterAddress as `0x${string}`,
    abi: minterABI,
    functionName: "mintPeggedTokenDryRun",
    args: accurateDepositAmountInWrappedCollateral ? [accurateDepositAmountInWrappedCollateral] : undefined,
    enabled:
      shouldUseAnvilHook &&
      !!minterAddress &&
      isValidMinterAddress &&
      !!accurateDepositAmountInWrappedCollateral &&
      accurateDepositAmountInWrappedCollateral > 0n &&
      isOpen &&
      activeTab === "deposit",
  });

  const { data: regularExpectedMintOutput } = useContractRead({
    address: minterAddress as `0x${string}`,
    abi: minterABI,
    functionName: "mintPeggedTokenDryRun",
    args: accurateDepositAmountInWrappedCollateral ? [accurateDepositAmountInWrappedCollateral] : undefined,
    query: {
      enabled:
        !shouldUseAnvilHook &&
        !!minterAddress &&
        isValidMinterAddress &&
        !!accurateDepositAmountInWrappedCollateral &&
        accurateDepositAmountInWrappedCollateral > 0n &&
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

  // For swap deposits, convert ParaSwap's estimated output to wrapped collateral for dry run
  // NOTE: We use the swap quote's actual toAmount (not a manual estimation)
  const swappedAmountForDryRun = useMemo(() => {
    if (!anyTokenDeposit.needsSwap || !anyTokenDeposit.swapQuote) return undefined;
    
    // Use ParaSwap's estimated output directly (already in smallest units: 6 for USDC, 18 for ETH)
    const swapEstimatedOutput = BigInt(anyTokenDeposit.swapQuote.toAmount);
    
    // Determine target market
    const isFxSAVEMarket = activeWrappedCollateralSymbol === "fxSAVE";
    const isWstETHMarket = activeWrappedCollateralSymbol === "wstETH";
    const isSwappingToUSDC = anyTokenDeposit.swapTargetToken !== "ETH";
    
    // Convert swap output to wrapped collateral (what minter expects)
    if (isSwappingToUSDC && isFxSAVEMarket) {
      // Swap gives us: USDC (6 decimals) → Need: fxSAVE (18 decimals)
      const usdcIn18Decimals = swapEstimatedOutput * 10n**12n; // Scale to 18 decimals
      const wrappedRate = marketForDepositAsset?.wrappedRate || selectedMarket?.wrappedRate || 10n**18n;
      const fxSaveAmount = (usdcIn18Decimals * 10n**18n) / wrappedRate; // USDC → fxUSD (1:1) → fxSAVE
      
      if (process.env.NODE_ENV === "development") {
        console.log("[Dry Run] Using ParaSwap quote output:", {
          fromSwapQuote_USDC: swapEstimatedOutput.toString(),
          convertedTo_fxSAVE: fxSaveAmount.toString(),
          wrappedRate: wrappedRate.toString(),
        });
      }
      
      return fxSaveAmount;
    }
    
    if (!isSwappingToUSDC && isWstETHMarket) {
      // Swap gives us: ETH (18 decimals) → Need: wstETH (18 decimals)
      const wrappedRate = marketForDepositAsset?.wrappedRate || selectedMarket?.wrappedRate || 10n**18n;
      const wstEthAmount = (swapEstimatedOutput * 10n**18n) / wrappedRate; // ETH → stETH (1:1) → wstETH
      
      if (process.env.NODE_ENV === "development") {
        console.log("[Dry Run] Using ParaSwap quote output:", {
          fromSwapQuote_ETH: swapEstimatedOutput.toString(),
          convertedTo_wstETH: wstEthAmount.toString(),
          wrappedRate: wrappedRate.toString(),
        });
      }
      
      return wstEthAmount;
    }
    
    // Invalid configuration
    if (process.env.NODE_ENV === "development") {
      console.error("[Dry Run] Cannot convert swap output - unknown market:", {
        isSwappingToUSDC,
        isFxSAVEMarket,
        isWstETHMarket,
      });
    }
    return undefined;
  }, [anyTokenDeposit.needsSwap, anyTokenDeposit.swapQuote, anyTokenDeposit.swapTargetToken, marketForDepositAsset, selectedMarket, activeWrappedCollateralSymbol]);

  // Dry run for swapped amounts to check if minter will accept full amount
  // Only run when swap quote is ready and amount is debounced
  const { data: swapDryRunOutput } = useContractRead({
    address: minterAddress as `0x${string}`,
    abi: minterABI,
    functionName: "mintPeggedTokenDryRun",
    args: swappedAmountForDryRun ? [swappedAmountForDryRun] : undefined,
    query: {
      enabled:
        !!minterAddress &&
        isValidMinterAddress &&
        !!swappedAmountForDryRun &&
        swappedAmountForDryRun > 0n &&
        anyTokenDeposit.needsSwap &&
        !anyTokenDeposit.isLoadingSwapQuote && // Don't run while swap quote is loading
        !!anyTokenDeposit.swapQuote && // Swap quote must be ready
        parseFloat(debouncedAmount) >= 0.00001 && // Lower threshold for swap assets (0.00001 instead of 0.0001)
        isOpen &&
        activeTab === "deposit",
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
      refetchInterval: isOpen ? 15000 : false, // Only poll when modal is open, reduced from 5s to 15s
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
    useContractRead({
      address: redeemDryRunAddress,
      abi: minterABI,
      functionName: "redeemPeggedTokenDryRun",
      args: redeemInputAmount && redeemInputAmount > 0n ? [redeemInputAmount] : undefined,
      enabled: shouldUseAnvilHook && redeemDryRunEnabled && !!redeemInputAmount && redeemInputAmount > 0n,
    });

  const { data: regularRedeemDryRunData, error: regularRedeemDryRunError } =
    useContractRead({
      address: redeemDryRunAddress,
      abi: minterABI,
      functionName: "redeemPeggedTokenDryRun",
      args: redeemInputAmount && redeemInputAmount > 0n ? [redeemInputAmount] : undefined,
      query: {
        enabled: !shouldUseAnvilHook && redeemDryRunEnabled && !!redeemInputAmount && redeemInputAmount > 0n,
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
    !false;

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
    if (false && redeemDryRun?.feePercentage !== undefined) {
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

  // Parse amount to BigInt, converting to wrapped collateral (fxSAVE) if needed
  // Use debounced amount to reduce unnecessary contract calls
  const parsedAmount = useMemo(() => {
    if (!debouncedAmount || parseFloat(debouncedAmount) <= 0) return undefined;
    
    // Skip dry run for very small amounts (< 0.0001) to reduce calls
    if (parseFloat(debouncedAmount) < 0.0001) return undefined;
    
    try {
      const inputAmount = parseEther(debouncedAmount);
      
      // Use marketForDepositAsset in simple mode, selectedMarket in advanced mode
      const relevantMarket = marketForDepositAsset || selectedMarket;
      
      // If user selected wrapped collateral (fxSAVE, wstETH), use amount as-is
      const wrappedCollateralSymbol = relevantMarket?.collateral?.symbol || "";
      const underlyingCollateralSymbol = relevantMarket?.collateral?.underlyingSymbol || "";
      
      if (selectedDepositAsset?.toLowerCase() === wrappedCollateralSymbol.toLowerCase()) {
        // User selected fxSAVE or wstETH directly
        return inputAmount;
      } else if (selectedDepositAsset?.toLowerCase() === underlyingCollateralSymbol.toLowerCase()) {
        // User selected fxUSD or stETH - need to convert to wrapped collateral for dry run
        // fxSAVE = fxUSD / rate (where rate is fxSAVE:fxUSD ratio, e.g., 1.07 means 1 fxSAVE = 1.07 fxUSD)
        // wstETH = stETH / rate
        const wrappedRate = relevantMarket?.wrappedRate;
        if (wrappedRate && wrappedRate > 0n) {
          // Convert: amountInWrapped = amountInUnderlying * 1e18 / rate
          const amountInWrapped = (inputAmount * BigInt(1e18)) / wrappedRate;
          return amountInWrapped;
        }
        // Fallback: 1:1 if no rate available
        return inputAmount;
      } else {
        // For other assets (USDC, ETH, etc.), use amount as-is
        // The actual conversion will happen in the contract
        return inputAmount;
      }
    } catch (error) {
      return undefined;
    }
  }, [debouncedAmount, selectedDepositAsset, marketForDepositAsset, selectedMarket]);

  const dryRunEnabled =
    !!isValidFeeMinterAddress &&
    !!parsedAmount &&
    isOpen &&
    activeTab === "deposit" &&
    !isDirectPeggedDeposit; // Only run for collateral deposits

  if (process.env.NODE_ENV === "development" && activeTab === "deposit") {
    console.log("[Dry Run Enabled Check]", {
      dryRunEnabled,
      isValidFeeMinterAddress,
      parsedAmount: parsedAmount?.toString(),
      isOpen,
      activeTab,
      isDirectPeggedDeposit,
      feeMinterAddress,
    });
  }

  // Dry run query using Anvil hook for local development
  // For ETH/stETH deposits, use accurate wstETH amount for fee calculation dry run
  const amountForFeeDryRun = useMemo(() => {
    // If we have accurate wstETH amount from contract, use it
    if (wstETHAmountFromContract) {
      return wstETHAmountFromContract as bigint;
    }
    // Otherwise use parsedAmount (for direct wstETH deposits or other assets)
    return parsedAmount;
  }, [wstETHAmountFromContract, parsedAmount]);

  const { data: anvilDryRunData, error: anvilDryRunError } = useContractRead({
    address: feeMinterAddress as `0x${string}`,
    abi: minterABI,
    functionName: "mintPeggedTokenDryRun",
    args: amountForFeeDryRun ? [amountForFeeDryRun] : undefined,
    enabled: shouldUseAnvilHook && dryRunEnabled && !!amountForFeeDryRun,
  });

  // Dry run query using regular hook for production
  const { data: regularDryRunData, error: regularDryRunError } =
    useContractRead({
      address: feeMinterAddress as `0x${string}`,
      abi: minterABI,
      functionName: "mintPeggedTokenDryRun",
      args: amountForFeeDryRun ? [amountForFeeDryRun] : undefined,
      query: {
        enabled: !shouldUseAnvilHook && dryRunEnabled && !!amountForFeeDryRun,
        retry: 1,
      },
    });

  // Use the appropriate dry run data based on environment
  const dryRunData = shouldUseAnvilHook ? anvilDryRunData : regularDryRunData;
  const dryRunError = shouldUseAnvilHook
    ? anvilDryRunError
    : regularDryRunError;

  if (process.env.NODE_ENV === "development" && activeTab === "deposit") {
    console.log("[Dry Run Data]", {
      dryRunData: dryRunData ? (Array.isArray(dryRunData) ? dryRunData.map(v => typeof v === "bigint" ? v.toString() : v) : dryRunData) : null,
      dryRunError: dryRunError?.message || null,
      parsedAmount: parsedAmount?.toString(),
    });
  }

  // Use dry run data's peggedMinted as fallback when calculateMintPeggedTokenOutput fails
  // dryRunData is an array: [incentiveRatio, fee, discount, peggedMinted, price, rate]
  const expectedMintOutput = useMemo(() => {
    // For swap deposits, use swapDryRunOutput
    if (anyTokenDeposit.needsSwap && swapDryRunOutput && Array.isArray(swapDryRunOutput) && swapDryRunOutput.length >= 4) {
      return swapDryRunOutput[3] as bigint;
    }
    
    // For swap deposits without dry run, estimate from swap quote
    // This provides a rough estimate when dry run isn't available (e.g., very small amounts)
    if (anyTokenDeposit.needsSwap && anyTokenDeposit.swapQuote && swappedAmountForDryRun && amount && parseFloat(amount) > 0) {
      // Use swappedAmountForDryRun as an estimate - it's the wrapped collateral amount
      // The minter typically mints close to 1:1 with wrapped collateral (minus fees)
      // This is a rough estimate, but better than showing 0
      const estimatedOutput = swappedAmountForDryRun * 95n / 100n; // Estimate 5% fee
      if (estimatedOutput > 0n) {
        if (process.env.NODE_ENV === "development") {
          console.log("[expectedMintOutput] Using estimated output from swap quote:", estimatedOutput.toString());
        }
        return estimatedOutput;
      }
    }
    
    // For regular deposits, use rawExpectedMintOutput
    if (rawExpectedMintOutput) return rawExpectedMintOutput;
    // Fallback to dry run data's peggedMinted (index 3)
    if (dryRunData && Array.isArray(dryRunData) && dryRunData.length >= 4) {
      return dryRunData[3] as bigint;
    }
    return undefined;
  }, [anyTokenDeposit.needsSwap, swapDryRunOutput, rawExpectedMintOutput, dryRunData, anyTokenDeposit.swapQuote, swappedAmountForDryRun, amount]);

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

  // Calculate fee percentage from dry run result and detect mint cap
  const feePercentage = useMemo(() => {
    // Don't calculate fee for direct pegged token deposits (no minting)
    if (isDirectPeggedDeposit) return undefined;

    // For swap deposits, use swapDryRunOutput
    if (anyTokenDeposit.needsSwap) {
      if (!swapDryRunOutput || !swappedAmountForDryRun || swappedAmountForDryRun === 0n) return undefined;
      
      const dryRunResult = swapDryRunOutput as [bigint, bigint, bigint, bigint, bigint, bigint] | undefined;
      if (!dryRunResult || dryRunResult.length < 2) return undefined;

      // Use incentiveRatio (index 0) from dry run to get the fee percentage
      const incentiveRatio = dryRunResult[0];
      const incentiveRatioBN = BigInt(incentiveRatio);
      
      // Check if minting is disallowed (incentiveRatio === 1e18)
      const isDisallowed = incentiveRatioBN === 1000000000000000000n; // 1e18
      if (isDisallowed) {
        return undefined; // Don't show fee if minting is disallowed
      }
      
      // Convert incentiveRatio to percentage: divide by 1e16 to get percentage
      let feePercent = 0;
      if (incentiveRatioBN > 0n) {
        feePercent = Number(incentiveRatioBN) / 1e16; // convert to percent
      } else if (incentiveRatioBN < 0n) {
        // Negative means discount, but we still show it as 0% fee
        feePercent = 0;
      }
      
      return feePercent;
    }

    // For regular deposits, use dryRunData
    // If there's an error, return undefined (will show fallback fee)
    if (dryRunError) {
      return undefined;
    }

    if (!dryRunData || !parsedAmount || parsedAmount === 0n) return undefined;

    // Handle both array and object formats
    let dryRunResult: [bigint, bigint, bigint, bigint, bigint, bigint] | undefined;
    if (Array.isArray(dryRunData)) {
      dryRunResult = dryRunData as [bigint, bigint, bigint, bigint, bigint, bigint];
    } else if (typeof dryRunData === "object" && dryRunData !== null) {
      // Handle object format if returned
      const obj = dryRunData as any;
      if (obj.incentiveRatio !== undefined) {
        dryRunResult = [
          BigInt(obj.incentiveRatio || 0),
          BigInt(obj.fee || 0),
          BigInt(obj.discount || 0),
          BigInt(obj.peggedMinted || 0),
          BigInt(obj.price || 0),
          BigInt(obj.rate || 0),
        ];
      }
    }
    
    if (!dryRunResult || dryRunResult.length < 1) {
    if (process.env.NODE_ENV === "development") {
        console.warn("[Fee Calculation] Invalid dry run result structure:", dryRunData);
    }
      return undefined;
    }

    // Use incentiveRatio (index 0) from dry run to get the fee percentage
    // This is the correct way as it returns the exact fee percentage for the current CR band
    // Format: incentiveRatio is in 1e18 units, where 0.25% = 0.0025 * 1e18 = 2500000000000000
    const incentiveRatio = dryRunResult[0];
    if (incentiveRatio === undefined || incentiveRatio === null) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[Fee Calculation] incentiveRatio is missing from dry run result");
      }
      return undefined;
    }
    
    const incentiveRatioBN = BigInt(incentiveRatio);
    
    // Check if minting is disallowed (incentiveRatio === 1e18)
    const isDisallowed = incentiveRatioBN === 1000000000000000000n; // 1e18
    if (isDisallowed) {
      return undefined; // Don't show fee if minting is disallowed
    }

    // Convert incentiveRatio to percentage: divide by 1e16 to get percentage
    // Positive values = fee, negative values = discount
    let feePercent = 0;
    if (incentiveRatioBN > 0n) {
      feePercent = Number(incentiveRatioBN) / 1e16; // convert to percent
    } else if (incentiveRatioBN < 0n) {
      // Negative means discount, but we still show it as 0% fee
      feePercent = 0;
    }
    
    if (process.env.NODE_ENV === "development") {
      console.log("[Fee Calculation Debug] Using incentiveRatio from dry run:", {
        dryRunData: Array.isArray(dryRunData) ? dryRunData.map(v => typeof v === "bigint" ? v.toString() : String(v)) : dryRunData,
        dryRunResult: dryRunResult.map(v => v.toString()),
        incentiveRatio: incentiveRatio.toString(),
        incentiveRatioBN: incentiveRatioBN.toString(),
        feePercent,
        parsedAmount: parsedAmount.toString(),
        selectedDepositAsset,
        activeCollateralSymbol,
        isWstETH: activeCollateralSymbol?.toLowerCase() === "wsteth",
        isFxSAVE: activeCollateralSymbol?.toLowerCase() === "fxsave",
      });
    }
    
    return feePercent;
  }, [anyTokenDeposit.needsSwap, swapDryRunOutput, swappedAmountForDryRun, dryRunData, dryRunError, parsedAmount, isDirectPeggedDeposit, activeMarketForFees, market, selectedDepositAsset, activeCollateralSymbol, btcPrice, ethPrice]);

  // Auto-adjust amount when minter refuses full deposit
  const [depositLimitWarning, setDepositLimitWarning] = useState<string | null>(null);
  const [tempMaxWarning, setTempMaxWarning] = useState<string | null>(null);
  const tempWarningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastAdjustedAmountRef = useRef<string | null>(null);

  // Helper function to calculate max acceptable amount for swap deposits
  const calculateMaxSwapAmount = useMemo(() => {
    // Skip for direct deposits (wstETH, fxSAVE) that don't need swaps
    const isWrappedCollateralDeposit = selectedDepositAsset?.toLowerCase() === "wsteth" || 
                                        selectedDepositAsset?.toLowerCase() === "fxsave";
    if (!anyTokenDeposit.needsSwap || !swapDryRunOutput || !swappedAmountForDryRun || !anyTokenDeposit.swapQuote || isWrappedCollateralDeposit) {
      return null;
    }

    const dryRunResult = swapDryRunOutput as [bigint, bigint, bigint, bigint, bigint, bigint] | undefined;
    if (!dryRunResult || dryRunResult.length < 3) return null;

    const wrappedCollateralTaken = dryRunResult[2];
    const takenRatio = Number(wrappedCollateralTaken) / Number(swappedAmountForDryRun);

    // If minter is taking less than 99.5% of swap output, there's a limit
    if (takenRatio >= 0.995 || wrappedCollateralTaken === 0n) {
      return null;
    }

    // Work backwards: wrappedCollateral → intermediate token (USDC/ETH) → input token
    const isFxSAVEMarket = activeWrappedCollateralSymbol === "fxSAVE";
    const isWstETHMarket = activeWrappedCollateralSymbol === "wstETH";
    let maxIntermediateAmount: bigint;
    const isSwappingToUSDC = anyTokenDeposit.swapTargetToken !== "ETH";
    
    if (isSwappingToUSDC && isFxSAVEMarket) {
      const wrappedRate = marketForDepositAsset?.wrappedRate || selectedMarket?.wrappedRate || 10n**18n;
      const fxUsdAmount = (wrappedCollateralTaken * wrappedRate) / 10n**18n;
      maxIntermediateAmount = fxUsdAmount / 10n**12n;
    } else if (!isSwappingToUSDC && isWstETHMarket) {
      const wrappedRate = marketForDepositAsset?.wrappedRate || selectedMarket?.wrappedRate || 10n**18n;
      const stEthAmount = (wrappedCollateralTaken * wrappedRate) / 10n**18n;
      maxIntermediateAmount = stEthAmount;
    } else {
      return null;
    }
    
    const swapFromAmount = BigInt(anyTokenDeposit.swapQuote.fromAmount);
    const swapToAmount = BigInt(anyTokenDeposit.swapQuote.toAmount);
    const maxInputAmount = (swapFromAmount * maxIntermediateAmount) / swapToAmount;
    const formattedMax = (Number(maxInputAmount) / (10 ** anyTokenDeposit.tokenDecimals)).toString();
    
    return formattedMax;
  }, [
    anyTokenDeposit.needsSwap,
    anyTokenDeposit.swapQuote,
    anyTokenDeposit.swapTargetToken,
    anyTokenDeposit.tokenDecimals,
    swapDryRunOutput,
    swappedAmountForDryRun,
    activeWrappedCollateralSymbol,
    marketForDepositAsset,
    selectedMarket,
    selectedDepositAsset,
  ]);

  // Check swap dry run for max acceptable amount and auto-adjust
  // Skip this entirely for direct deposits (wstETH, fxSAVE) that don't need swaps
  useEffect(() => {
    // Skip if not a swap deposit, or if it's a wrapped collateral (direct deposit, no swap needed)
    const isWrappedCollateralDeposit = selectedDepositAsset?.toLowerCase() === "wsteth" || 
                                        selectedDepositAsset?.toLowerCase() === "fxsave";
    if (!anyTokenDeposit.needsSwap || activeTab !== "deposit" || isWrappedCollateralDeposit) {
      setDepositLimitWarning(null);
      lastAdjustedAmountRef.current = null; // Reset tracking when not applicable
      return;
    }

    // If calculateMaxSwapAmount is not available yet, preserve existing warning
    // This prevents the warning from disappearing during recalculation
    if (!calculateMaxSwapAmount) {
      // Only clear warning if amount is 0 or empty - otherwise preserve it during recalculation
      if (!amount || parseFloat(amount) === 0) {
        setDepositLimitWarning(null);
        return;
      }
      // If we have an amount but no calculateMaxSwapAmount yet, preserve the warning
      // and wait for calculateMaxSwapAmount to become available
      // This ensures the warning doesn't disappear during recalculation
      if (process.env.NODE_ENV === "development") {
        console.log("[Swap Dry Run] calculateMaxSwapAmount not available yet, preserving warning for amount:", amount);
      }
      return;
    }

    const currentInputAmount = parseFloat(amount || "0");
    const maxInputAmountFloat = parseFloat(calculateMaxSwapAmount);
    const difference = currentInputAmount - maxInputAmountFloat;

    if (process.env.NODE_ENV === "development") {
      console.log("[Swap Dry Run Check]", {
        currentAmount: amount,
        maxAmount: calculateMaxSwapAmount,
        currentInputAmount,
        maxInputAmountFloat,
        difference,
        exceedsMax: currentInputAmount > maxInputAmountFloat,
        willAutoAdjust: currentInputAmount > maxInputAmountFloat,
      });
    }

    // Tolerance for comparing amounts (accounts for floating point precision)
    // Use a small tolerance only for "at max" detection, but adjust immediately if above max
    const tolerance = 0.0001; // Small tolerance for "at max" detection
    // Consider "at max" if within tolerance (either slightly above or at the max)
    // This ensures the warning persists even if calculateMaxSwapAmount is recalculated
    const isAtMax = Math.abs(difference) <= tolerance || currentInputAmount <= maxInputAmountFloat + tolerance;
    // If amount is greater than max (even slightly), always adjust it down
    // Use a very small threshold to account for floating point precision, but be aggressive about adjusting
    const exceedsMax = difference > 0.00001; // Adjust if more than 0.00001 above max

    if (process.env.NODE_ENV === "development") {
      console.log("[Swap Dry Run Check] Comparison:", {
        currentInputAmount,
        maxInputAmountFloat,
        difference,
        isAtMax,
        exceedsMax,
        willAdjust: exceedsMax,
      });
    }

    // If amount exceeds the max, always adjust it down
    // But only if we haven't already adjusted to this value (prevent infinite loops)
    if (exceedsMax) {
      const adjustedAmount = calculateMaxSwapAmount;
      
      // Prevent infinite loop: don't adjust if we've already adjusted to this value
      if (lastAdjustedAmountRef.current === adjustedAmount) {
        if (process.env.NODE_ENV === "development") {
          console.log("[Swap Dry Run] Skipping adjustment - already adjusted to this value:", adjustedAmount);
        }
        return;
      }
      
      if (process.env.NODE_ENV === "development") {
        console.log("[Swap Dry Run] Adjusting amount from", currentInputAmount, "to", calculateMaxSwapAmount, "difference:", difference);
      }
      // Always adjust - use the calculated max
      setAmount(adjustedAmount);
      anyTokenDeposit.setAmount(adjustedAmount); // Sync with hook
      lastAdjustedAmountRef.current = adjustedAmount; // Track the adjusted amount
      
      if (process.env.NODE_ENV === "development") {
        console.log("[Swap Dry Run] Amount adjusted successfully to:", adjustedAmount);
      }
      
      // Show warning message
      const warningMessage = `Maximum deposit limited to ${calculateMaxSwapAmount} ${selectedDepositAsset || ""} (after swap) to maintain collateral ratio.`;
      setDepositLimitWarning(warningMessage);

      // Set temporary warning near Max button
      const warningText = `Max: ${parseFloat(calculateMaxSwapAmount).toFixed(4)} ${selectedDepositAsset || ""}`;
      setTempMaxWarning(warningText);

      if (process.env.NODE_ENV === "development") {
        console.log("[Swap Dry Run] Setting warning:", {
          warningMessage,
          warningText,
        });
      }

      // Clear any existing timer
      if (tempWarningTimerRef.current) {
        clearTimeout(tempWarningTimerRef.current);
      }

      // Set new timer to clear temp warning after 5 seconds (keep depositLimitWarning visible)
      tempWarningTimerRef.current = setTimeout(() => {
        setTempMaxWarning(null);
        tempWarningTimerRef.current = null;
      }, 5000);
    } else if (isAtMax) {
      // Amount is at the max - show warning but don't adjust

      // Show warning message
      const warningMessage = `Maximum deposit limited to ${calculateMaxSwapAmount} ${selectedDepositAsset || ""} (after swap) to maintain collateral ratio.`;
      setDepositLimitWarning(warningMessage);

      // Set temporary warning near Max button
      const warningText = `Max: ${parseFloat(calculateMaxSwapAmount).toFixed(4)} ${selectedDepositAsset || ""}`;
      setTempMaxWarning(warningText);

      if (process.env.NODE_ENV === "development") {
        console.log("[Swap Dry Run] Setting warning:", {
          warningMessage,
          warningText,
          isAtMax,
          exceedsMax,
        });
      }

      // Clear any existing timer
      if (tempWarningTimerRef.current) {
        clearTimeout(tempWarningTimerRef.current);
      }

      // Set new timer to clear temp warning after 5 seconds (keep depositLimitWarning visible)
      tempWarningTimerRef.current = setTimeout(() => {
        setTempMaxWarning(null);
        tempWarningTimerRef.current = null;
      }, 5000);
    } else {
      // Input is below the max, clear warnings and reset adjustment tracking
      // Only clear if the amount is significantly below the max (not just slightly)
      // Use a larger threshold (1% of max) to ensure warnings persist when near the max
      // This prevents the warning from disappearing when calculateMaxSwapAmount is recalculated
      const clearThreshold = Math.max(0.001, maxInputAmountFloat * 0.01); // At least 0.001 or 1% of max
      const significantDifference = currentInputAmount < maxInputAmountFloat - clearThreshold;
      if (significantDifference) {
        // Reset adjustment tracking when amount is significantly below max
        // This allows re-adjustment if user increases amount again
        lastAdjustedAmountRef.current = null;
        if (process.env.NODE_ENV === "development") {
          console.log("[Swap Dry Run] Clearing warning - amount significantly below max:", {
            currentInputAmount,
            maxInputAmountFloat,
            difference: currentInputAmount - maxInputAmountFloat,
            clearThreshold,
          });
        }
        setDepositLimitWarning(null);
        if (tempWarningTimerRef.current) {
          clearTimeout(tempWarningTimerRef.current);
          tempWarningTimerRef.current = null;
        }
        setTempMaxWarning(null);
      } else {
        // Amount is very close to max but not quite at it - keep warning visible
        // This ensures the warning doesn't flicker when the amount is near the max
        // or when calculateMaxSwapAmount is recalculated
        if (process.env.NODE_ENV === "development") {
          console.log("[Swap Dry Run] Keeping warning - amount very close to max:", {
            currentInputAmount,
            maxInputAmountFloat,
            difference: currentInputAmount - maxInputAmountFloat,
            clearThreshold,
          });
        }
        // Always set the warning if we're near the max - don't check if it already exists
        // This ensures it persists even if calculateMaxSwapAmount changes slightly
        const warningMessage = `Maximum deposit limited to ${calculateMaxSwapAmount} ${selectedDepositAsset || ""} (after swap) to maintain collateral ratio.`;
        setDepositLimitWarning(warningMessage);
        
        // Also set temporary warning if not already set
        if (!tempMaxWarning) {
          const warningText = `Max: ${parseFloat(calculateMaxSwapAmount).toFixed(4)} ${selectedDepositAsset || ""}`;
          setTempMaxWarning(warningText);
          
          // Clear any existing timer
          if (tempWarningTimerRef.current) {
            clearTimeout(tempWarningTimerRef.current);
          }
          
          // Set new timer to clear temp warning after 5 seconds (keep depositLimitWarning visible)
          tempWarningTimerRef.current = setTimeout(() => {
            setTempMaxWarning(null);
            tempWarningTimerRef.current = null;
          }, 5000);
        }
      }
    }
  }, [
    anyTokenDeposit.needsSwap,
    calculateMaxSwapAmount,
    amount,
    selectedDepositAsset,
    activeTab,
    anyTokenDeposit.setAmount,
  ]);

  // Reset adjustment tracking when deposit asset changes
  useEffect(() => {
    lastAdjustedAmountRef.current = null;
  }, [selectedDepositAsset]);

  // Check direct deposit dry run for max acceptable amount
  useEffect(() => {
    // For swap deposits, this useEffect should not run - handled by swap dry run useEffect
    if (anyTokenDeposit.needsSwap) {
      return; // Don't clear warning - it's managed by the swap dry run useEffect
    }
    
    // Skip auto-adjustment for wrapped collateral deposits (wstETH, fxSAVE) - they should go directly to minter
    // The dry run might show limits, but we shouldn't auto-adjust for these direct deposits
    const isWrappedCollateralDeposit = selectedDepositAsset?.toLowerCase() === "wsteth" || 
                                        selectedDepositAsset?.toLowerCase() === "fxsave";
    if (isWrappedCollateralDeposit) {
      setDepositLimitWarning(null);
      if (tempWarningTimerRef.current) {
        clearTimeout(tempWarningTimerRef.current);
        tempWarningTimerRef.current = null;
      }
      setTempMaxWarning(null);
      lastAdjustedAmountRef.current = null;
      return;
    }
    
    if (isDirectPeggedDeposit || !dryRunData || !parsedAmount || activeTab !== "deposit") {
      setDepositLimitWarning(null);
      // Clear any pending timer
      if (tempWarningTimerRef.current) {
        clearTimeout(tempWarningTimerRef.current);
        tempWarningTimerRef.current = null;
      }
      setTempMaxWarning(null);
      return;
    }

    const dryRunResult = dryRunData as
      | [bigint, bigint, bigint, bigint, bigint, bigint]
      | undefined;
    
    if (!dryRunResult || dryRunResult.length < 3) {
      setDepositLimitWarning(null);
      // Clear any pending timer
      if (tempWarningTimerRef.current) {
        clearTimeout(tempWarningTimerRef.current);
        tempWarningTimerRef.current = null;
      }
      setTempMaxWarning(null);
      return;
    }

    // result[2] = wrappedCollateralTaken (actual amount minter will accept in fxSAVE)
    const wrappedCollateralTaken = dryRunResult[2];
    const takenRatio = Number(wrappedCollateralTaken) / Number(parsedAmount);

    // If minter is taking less than 99.5% of input, there's a limit
    if (takenRatio < 0.995 && wrappedCollateralTaken > 0n) {
      // Convert back to user's selected asset for display
      const wrappedCollateralSymbol = marketForDepositAsset?.collateral?.symbol || "";
      const underlyingCollateralSymbol = marketForDepositAsset?.collateral?.underlyingSymbol || "";
      const wrappedRate = marketForDepositAsset?.wrappedRate;
      
      let maxAcceptableInUserAsset: number;
      
      if (selectedDepositAsset?.toLowerCase() === wrappedCollateralSymbol.toLowerCase()) {
        // User selected fxSAVE - use amount directly
        maxAcceptableInUserAsset = Number(formatEther(wrappedCollateralTaken));
      } else if (selectedDepositAsset?.toLowerCase() === underlyingCollateralSymbol.toLowerCase()) {
        // User selected fxUSD - convert fxSAVE back to fxUSD
        // fxUSD = fxSAVE * rate
        if (wrappedRate && wrappedRate > 0n) {
          const amountInUnderlying = (wrappedCollateralTaken * wrappedRate) / BigInt(1e18);
          maxAcceptableInUserAsset = Number(formatEther(amountInUnderlying));
        } else {
          // Fallback: 1:1
          maxAcceptableInUserAsset = Number(formatEther(wrappedCollateralTaken));
        }
      } else {
        // For ETH/stETH deposits: convert wstETH back to ETH/stETH using wrapped rate
        // wrappedCollateralTaken is in wstETH, we need to convert back to ETH/stETH
        const isWstETHMarket = activeWrappedCollateralSymbol === "wstETH";
        if (isWstETHMarket && (selectedDepositAsset === "ETH" || selectedDepositAsset === collateralSymbol || selectedDepositAsset === "stETH")) {
          // wstETH → stETH → ETH (stETH and ETH are 1:1)
          // stETH = wstETH * wrappedRate / 1e18
          if (wrappedRate && wrappedRate > 0n) {
            const stEthAmount = (wrappedCollateralTaken * wrappedRate) / 10n**18n;
            maxAcceptableInUserAsset = Number(formatEther(stEthAmount));
          } else {
            // Fallback: assume 1:1 (shouldn't happen, but safe fallback)
        maxAcceptableInUserAsset = Number(formatEther(wrappedCollateralTaken));
          }
        } else {
          // For USDC, fxUSD, etc. - use wrapped amount directly
          maxAcceptableInUserAsset = Number(formatEther(wrappedCollateralTaken));
        }
      }
      
      const formattedMax = maxAcceptableInUserAsset.toFixed(4);
      const currentInputAmount = parseFloat(amount || "0");
      const maxInputAmountFloat = parseFloat(formattedMax);
      
      // Only auto-adjust if user's input EXCEEDS the max
      // But prevent infinite loops by checking if we've already adjusted to this value
      if (currentInputAmount > maxInputAmountFloat) {
        // Prevent infinite loop: don't adjust if we've already adjusted to this value
        if (lastAdjustedAmountRef.current === formattedMax) {
          if (process.env.NODE_ENV === "development") {
            console.log("[Direct Deposit Dry Run] Skipping adjustment - already adjusted to this value:", formattedMax);
          }
          return;
        }
        
        setAmount(formattedMax);
        lastAdjustedAmountRef.current = formattedMax; // Track the adjusted amount
        setDepositLimitWarning(
          `Maximum deposit limited to ${formattedMax} ${selectedDepositAsset || activeCollateralSymbol} to maintain collateral ratio.`
        );
        
        // Set temporary warning near Max button
        const warningText = `Max: ${formattedMax} ${selectedDepositAsset || activeCollateralSymbol}`;
        setTempMaxWarning(warningText);
        
        // Clear any existing timer
        if (tempWarningTimerRef.current) {
          clearTimeout(tempWarningTimerRef.current);
        }
        
        // Set new timer to clear warning after 3 seconds
        tempWarningTimerRef.current = setTimeout(() => {
          setTempMaxWarning(null);
          tempWarningTimerRef.current = null;
        }, 3000);
      } else {
        // Input is within limits, just clear any previous warning
        // Reset adjustment tracking when amount is within limits
        lastAdjustedAmountRef.current = null;
        setDepositLimitWarning(null);
      }
    } else {
      // No limit detected, clear warnings if no temp warning is active
      if (!tempMaxWarning) {
        setDepositLimitWarning(null);
      }
    }
  }, [
    dryRunData,
    parsedAmount,
    isDirectPeggedDeposit,
    activeTab,
    selectedDepositAsset,
    activeCollateralSymbol,
    marketForDepositAsset,
    tempMaxWarning,
  ]);


  // Contract write hooks
  const { writeContractAsync: originalWriteContractAsync } = useWriteContract();
  const { sendTransactionAsync: originalSendTransactionAsync } = useSendTransaction();
  
  // Wrapper functions that check network before executing transactions
  const writeContractAsync = async (
    ...args: Parameters<typeof originalWriteContractAsync>
  ) => {
    if (!(await ensureCorrectNetwork())) {
      throw new Error("Wrong network. Please switch to Ethereum Mainnet.");
    }
    return originalWriteContractAsync(...args);
  };

  const sendTransactionAsync = async (
    ...args: Parameters<typeof originalSendTransactionAsync>
  ) => {
    if (!(await ensureCorrectNetwork())) {
      throw new Error("Wrong network. Please switch to Ethereum Mainnet.");
    }
    return originalSendTransactionAsync(...args);
  };

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

    // For swap assets (user tokens), prefer anyTokenDeposit.balance which is already fetched
    if (anyTokenDeposit.needsSwap && anyTokenDeposit.balance !== undefined) {
      if (process.env.NODE_ENV === "development") {
        console.log("[AnchorDepositModal] Swap asset balance from anyTokenDeposit:", {
          asset: selectedDepositAsset,
          address: anyTokenDeposit.selectedAssetAddress,
          balance: anyTokenDeposit.balance.toString(),
        });
      }
      return anyTokenDeposit.balance;
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

    // For other assets, prefer contract read balance (selectedAssetBalanceData) as it's always for the correct address
    // Only use anyTokenDeposit.balance if it matches the selected asset address
    if (selectedAssetBalanceData !== undefined) {
      if (process.env.NODE_ENV === "development") {
        console.log("[AnchorDepositModal] Selected asset balance from contract read:", {
          asset: selectedDepositAsset,
          address: selectedAssetAddress,
          balance: selectedAssetBalanceData?.toString() || "0",
        });
      }
      return (selectedAssetBalanceData as bigint) || 0n;
    }

    // Fallback to anyTokenDeposit.balance only if the selected asset matches
    const anyTokenAssetMatches = anyTokenDeposit.selectedAssetAddress && 
      selectedAssetAddress && 
      anyTokenDeposit.selectedAssetAddress.toLowerCase() === selectedAssetAddress.toLowerCase();
    
    if (anyTokenAssetMatches && anyTokenDeposit.balance !== undefined && anyTokenDeposit.balance > 0n) {
      if (process.env.NODE_ENV === "development") {
        console.log("[AnchorDepositModal] Asset balance from anyTokenDeposit (fallback):", {
          asset: selectedDepositAsset,
          address: anyTokenDeposit.selectedAssetAddress,
          balance: anyTokenDeposit.balance.toString(),
        });
      }
      return anyTokenDeposit.balance;
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
    anyTokenDeposit.needsSwap,
    anyTokenDeposit.balance,
    anyTokenDeposit.selectedAssetAddress,
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

  const collateralPoolImmediateCap = useMemo(() => {
    if (
      collateralPoolBalance === 0n ||
      collateralPoolTotalSupply === undefined ||
      collateralPoolMinTotalSupply === undefined
    ) {
      return collateralPoolBalance;
    }
    const total = collateralPoolTotalSupply as bigint;
    const minTotal = collateralPoolMinTotalSupply as bigint;
    const poolRoom = total > minTotal ? total - minTotal : 0n;
    return collateralPoolBalance < poolRoom ? collateralPoolBalance : poolRoom;
  }, [collateralPoolBalance, collateralPoolTotalSupply, collateralPoolMinTotalSupply]);

  const sailPoolImmediateCap = useMemo(() => {
    if (
      sailPoolBalance === 0n ||
      sailPoolTotalSupply === undefined ||
      sailPoolMinTotalSupply === undefined
    ) {
      return sailPoolBalance;
    }
    const total = sailPoolTotalSupply as bigint;
    const minTotal = sailPoolMinTotalSupply as bigint;
    const poolRoom = total > minTotal ? total - minTotal : 0n;
    return sailPoolBalance < poolRoom ? sailPoolBalance : poolRoom;
  }, [sailPoolBalance, sailPoolTotalSupply, sailPoolMinTotalSupply]);

  const totalStabilityPoolBalance = collateralPoolBalance + sailPoolBalance;
  const allowance = allowanceData || 0n;
  const peggedTokenAllowance = peggedTokenAllowanceData || 0n;
  // Parse amount with correct decimals: USDC uses 6 decimals, others use 18 decimals
  const isUSDC = selectedDepositAsset?.toLowerCase() === "usdc";
  const isFxUSD = selectedDepositAsset?.toLowerCase() === "fxusd";
  const isNativeETH = selectedDepositAsset?.toLowerCase() === "eth";
  const isStETH = selectedDepositAsset?.toLowerCase() === "steth";
  const isFxSAVE = selectedDepositAsset?.toLowerCase() === "fxsave";
  const isWstETH = selectedDepositAsset?.toLowerCase() === "wsteth";
  
  // Determine if we should use zap contracts
  // Get market info for the selected deposit asset
  const depositAssetMarket = marketForDepositAsset;
  const depositAssetCollateralSymbol = depositAssetMarket?.collateral?.symbol?.toLowerCase() || "";
  const depositAssetWrappedCollateralSymbol = depositAssetMarket?.collateral?.underlyingSymbol?.toLowerCase() || "";
  const isWstETHMarket = depositAssetCollateralSymbol === "wsteth";
  const isFxUSDMarket = depositAssetCollateralSymbol === "fxusd" || depositAssetCollateralSymbol === "fxsave";
  
  // Check if selected asset is wrapped collateral (fxSAVE, wstETH) - these don't need zaps
  // Note: fxUSD is NOT wrapped collateral (it's the underlying collateral that needs zap)
  // Only fxSAVE (the wrapped version) should skip zaps
  // We check against wrappedCollateralSymbol (underlyingSymbol) not collateralSymbol
  const isWrappedCollateral = isFxSAVE || isWstETH || 
    (depositAssetMarket && depositAssetWrappedCollateralSymbol && selectedDepositAsset?.toLowerCase() === depositAssetWrappedCollateralSymbol);
  
  // Get zap contract address - use peggedTokenZap for minting pegged tokens
  const zapAddress = depositAssetMarket?.addresses?.peggedTokenZap as `0x${string}` | undefined;
  
  // Determine which zap to use
  const useZap = !!zapAddress && !isDirectPeggedDeposit && !isWrappedCollateral && activeTab === "deposit";
  const useETHZap = useZap && isWstETHMarket && (isNativeETH || isStETH);
  const useUSDCZap = useZap && isFxUSDMarket && (isUSDC || isFxUSD);
  
  // Get fxSAVE rate for USDC zap calculations
  const priceOracleAddress = depositAssetMarket?.addresses?.collateralPrice as `0x${string}` | undefined;
  const { maxRate: fxSAVERate } = useCollateralPrice(
    priceOracleAddress,
    { enabled: useUSDCZap && !!priceOracleAddress }
  );
  
  const amountBigInt = amount 
    ? (isUSDC ? parseUnits(amount, 6) : parseEther(amount))
    : 0n;
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
  const peggedTokenPriceUsdWei =
    peggedTokenPrice !== undefined && (peggedTokenPrice as bigint) > 0n && pegTargetUsdWei > 0n
      ? ((peggedTokenPrice as bigint) * pegTargetUsdWei) / 10n ** 18n
      : 0n;

  const currentDepositUSD =
    peggedTokenPriceUsdWei > 0n && currentDeposit
      ? parseFloat(formatUnits((currentDeposit * peggedTokenPriceUsdWei) / 10n ** 18n, 18))
      : 0;
  const currentLedgerMarksPerDay = currentDepositUSD;

  // Calculate expected ledger marks per day after deposit
  const expectedDepositUSD =
    expectedMintOutput && peggedTokenPriceUsdWei > 0n
      ? parseFloat(
          formatUnits((expectedMintOutput * peggedTokenPriceUsdWei) / 10n ** 18n, 18)
        )
      : 0;
  
  // Calculate USD value for direct pegged token deposits (e.g., haBTC)
  const directPeggedDepositUSD = useMemo(() => {
    if (!isDirectPeggedDeposit || !amount || parseFloat(amount) <= 0 || peggedTokenPriceUsdWei <= 0n) {
      return 0;
    }
    const amountBigInt = parseEther(amount);
    return parseFloat(
      formatUnits((amountBigInt * peggedTokenPriceUsdWei) / 10n ** 18n, 18)
    );
  }, [isDirectPeggedDeposit, amount, peggedTokenPriceUsdWei]);
  
  const newTotalDepositUSD = currentDepositUSD + expectedDepositUSD;
  const newLedgerMarksPerDay = newTotalDepositUSD;

  // Initialize modal state on open.
  // IMPORTANT: Do NOT depend on derived values like `collateralSymbol` here.
  // In grouped markets (e.g. haBTC shared across multiple markets), we may auto-select a different market
  // after the user clicks "Withdraw". That can change `selectedMarket`/`collateralSymbol` and would
  // otherwise re-run this effect, resetting the user's tab choice back to the initial tab.
  const hasInitializedOnOpen = useRef(false);
  useEffect(() => {
    if (!isOpen) {
      hasInitializedOnOpen.current = false;
      return;
    }
    if (hasInitializedOnOpen.current) return;
    hasInitializedOnOpen.current = true;

    // Resolve initial market + collateral symbol based on the market the modal was opened for.
    const initialMarket =
      marketsForToken.find((m) => m.marketId === marketId)?.market || market;
    const initialCollateralSymbol = initialMarket?.collateral?.symbol || "ETH";

    {
      const tab = getInitialTab();
      setActiveTab(tab);
      setAmount("");
      setStep("input");
      setError(null);
      setTxHash(null);
      // Ensure selectedMarketId is always initialized when opening the modal.
      // Withdraw flows (and several reads) depend on `selectedMarket` which is derived from `selectedMarketId`.
      setSelectedMarketId(marketId);
      if (tab === "deposit") {
        // In simple mode, use step-by-step flow
        if (simpleMode) {
          setCurrentStep(1);
          // Prefer an explicit initial deposit asset (e.g. ha token when opened from
          // "not earning yield" section). Otherwise default to the market's collateral.
          setSelectedDepositAsset(initialDepositAsset || initialCollateralSymbol);
          // Don't pre-select pools in step-by-step mode - let user choose
          setSelectedStabilityPool(null);
          setDepositInStabilityPool(false);
          setSelectedRewardToken(null);
        } else {
          setDepositInStabilityPool(true);
          setStabilityPoolType("collateral");
        }
      } else if (tab === "withdraw") {
        // Initialize selected redeem asset to the current market's collateral
        setSelectedRedeemAsset(initialCollateralSymbol);
      }
    }
  }, [
    isOpen,
    initialTab,
    simpleMode,
    bestPoolType,
    marketId,
    marketsForToken,
    market,
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
        // Don't change selectedMarketId here - it should remain tied to the deposit asset from Step 1
        // selectedMarketId is for minting, selectedStabilityPool.marketId is for the pool destination
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
      // Reset back to the market this modal was opened for (prevents withdraw showing no positions on reopen)
      setSelectedMarketId(marketId);
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
    // Clear temp warning when switching tabs
    if (tempMaxWarning) {
      setTempMaxWarning(null);
      if (tempWarningTimerRef.current) {
        clearTimeout(tempWarningTimerRef.current);
        tempWarningTimerRef.current = null;
      }
    }
    if (tab === "deposit") {
      setDepositInStabilityPool(!mintOnly);
      setStabilityPoolType("collateral");
    }
  };

  const handleMaxClick = () => {
    if (activeTab === "deposit") {
      if (simpleMode && selectedAssetBalance !== null) {
        // Use correct decimals for the selected asset
        const decimals = anyTokenDeposit.tokenDecimals || 18;
        const balanceAmount = formatUnits(selectedAssetBalance, decimals);
        
        // Simply set the amount to balance
        // The useEffect will adjust it to the calculated max once the dry run completes with this amount
        setAmount(balanceAmount);
        anyTokenDeposit.setAmount(balanceAmount); // Sync with hook
        
        if (process.env.NODE_ENV === "development") {
          console.log("[handleMaxClick] Set amount to balance:", balanceAmount, "useEffect will adjust if needed");
        }
        setAmount(isUSDC ? formatUnits(selectedAssetBalance, 6) : formatEther(selectedAssetBalance));
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
    
    // Clear temp warning immediately when user manually changes input
    if (tempMaxWarning) {
      setTempMaxWarning(null);
      if (tempWarningTimerRef.current) {
        clearTimeout(tempWarningTimerRef.current);
        tempWarningTimerRef.current = null;
      }
    }
    
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      // Cap at balance if value exceeds it (for deposit tab)
      // Prefer selectedAssetBalance when available (for USDC, fxUSD, etc. in simple mode)
      // Otherwise fall back to balance (collateral balance for advanced mode)
      const balanceToCheck = (simpleMode && selectedAssetBalance !== null && selectedAssetBalance !== undefined)
        ? selectedAssetBalance 
        : balance;
      
      if (value && activeTab === "deposit" && balanceToCheck && balanceToCheck > 0n) {
        try {
          // Use correct decimals: USDC uses 6, others use 18
          const decimals = isUSDC ? 6 : 18;
          const parsed = decimals === 6 ? parseUnits(value, 6) : parseEther(value);
          
          if (parsed > balanceToCheck) {
            // Format with correct decimals
            const cappedAmount = decimals === 6 
              ? formatUnits(balanceToCheck, 6)
              : formatEther(balanceToCheck);
            setAmount(cappedAmount);
            anyTokenDeposit.setAmount(cappedAmount); // Sync with hook
            setError(null);
            return;
          }
        } catch {
          // Allow partial input (e.g., trailing decimal)
        }
      }
      setAmount(value);
      anyTokenDeposit.setAmount(value); // Sync with hook
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
        const max =
          withdrawalMethods.collateralPool === "immediate"
            ? collateralPoolImmediateCap
            : collateralPoolBalance;
        result.collateralPool = amount > max;
      }
      if (positionAmounts.sailPool && sailPoolBalance) {
        const amount = parseEther(positionAmounts.sailPool);
        const max =
          withdrawalMethods.sailPool === "immediate"
            ? sailPoolImmediateCap
            : sailPoolBalance;
        result.sailPool = amount > max;
      }
    } catch {
      // Ignore parsing errors
    }

    return result;
  }, [
    positionAmounts,
    peggedBalance,
    collateralPoolBalance,
    sailPoolBalance,
    withdrawalMethods.collateralPool,
    withdrawalMethods.sailPool,
    collateralPoolImmediateCap,
    sailPoolImmediateCap,
  ]);

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
    // Ensure correct network before starting transaction (auto-attempt switch)
    if (!(await ensureCorrectNetwork())) return;
    // Clear any stale hashes from previous runs so the progress UI starts fresh
    setTxHashes({});

    debugTx("handleMint/start", {
      activeTab,
      simpleMode,
      currentStep,
      selectedDepositAsset,
      amount,
      amountBigInt: amountBigInt?.toString(),
      isDirectPeggedDeposit,
      mintOnly,
      depositInStabilityPool,
      stabilityPoolType,
      selectedStabilityPool,
      selectedMarketId,
      effectiveChainId,
      isCorrectNetwork,
      shouldShowNetworkSwitch,
    });
    
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

        debugTx("directHa/targets", {
          targetMarketId: selectedStabilityPool?.marketId,
          targetPoolAddress,
          targetPeggedTokenAddress,
          amountBigInt: amountBigInt.toString(),
        });

        // Use Anvil client for local development, regular publicClient for production
        const directDepositClient = false ? publicClient : publicClient;

        // Extra debug: read pool asset + user balance (helps diagnose "estimated to fail")
        try {
          const poolAssetToken = (await directDepositClient?.readContract({
            address: targetPoolAddress,
            abi: STABILITY_POOL_ABI,
            functionName: "ASSET_TOKEN",
          })) as `0x${string}` | undefined;

          const userHaBalance = (await directDepositClient?.readContract({
            address: targetPeggedTokenAddress,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [address as `0x${string}`],
          })) as bigint | undefined;

          debugTx("directHa/preflight", {
            pool: targetPoolAddress,
            poolAssetToken,
            expectedHa: targetPeggedTokenAddress,
            amount: amountBigInt.toString(),
            userHaBalance: userHaBalance?.toString(),
          });
        } catch (e: any) {
          debugTx("directHa/preflight/error", {
            message: e?.message,
          });
        }

        // Check allowance for pegged token to stability pool
        if (process.env.NODE_ENV === "development") {
          console.log("[handleMint] Checking allowance", {
            tokenAddress: targetPeggedTokenAddress,
            poolAddress: targetPoolAddress,
            userAddress: address,
            shouldUseAnvil: false,
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
        debugTx("directHa/allowance", {
          allowance: directPeggedAllowance.toString(),
          amount: amountBigInt.toString(),
          needsDirectApproval,
        });
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
        // Show progress modal for transaction feedback
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
            debugTx("directHa/approve", {
              token: targetPeggedTokenAddress,
              spender: targetPoolAddress,
              amount: amountBigInt.toString(),
            });
            
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
          debugTx("directHa/deposit", {
            pool: targetPoolAddress,
            args: [amountBigInt.toString(), address, "0"],
          });

          // Simulate first to capture revert data/selector
          try {
            debugTx("directHa/simulateDeposit", {
              pool: targetPoolAddress,
              args: [amountBigInt.toString(), address, "0"],
            });
            await directDepositClient?.simulateContract({
              address: targetPoolAddress,
              abi: STABILITY_POOL_ABI,
              functionName: "deposit",
              args: [amountBigInt, address as `0x${string}`, 0n],
              account: address as `0x${string}`,
            });
            debugTx("directHa/simulateDeposit/success");
          } catch (simErr: any) {
            debugTx("directHa/simulateDeposit/error", {
              message: simErr?.message,
              shortMessage: simErr?.shortMessage,
              cause: simErr?.cause?.message,
              data: simErr?.data,
              causeData: simErr?.cause?.data,
            });
            // Try to decode known custom errors (we add them to the ABI as we discover them)
            try {
              if (simErr instanceof BaseError) {
                const revertError = simErr.walk(
                  (e) => e instanceof ContractFunctionRevertedError
                );
                if (revertError instanceof ContractFunctionRevertedError) {
                  const errorName = revertError.data?.errorName || "";
                  const args = (revertError.data as any)?.args as
                    | readonly unknown[]
                    | undefined;
                  if (errorName === "DepositAmountLessThanMinimum" && args?.length === 2) {
                    const minimum = args[1] as bigint;
                    throw new Error(
                      `Deposit amount too small. Minimum deposit is ${formatEther(minimum)} ${peggedTokenSymbol}.`
                    );
                  }
                }
              }
            } catch (decodedErr) {
              throw decodedErr;
            }

            let msg =
              simErr?.cause?.message ||
              simErr?.shortMessage ||
              simErr?.message ||
              "Unknown error";
            if (
              typeof msg === "string" &&
              msg.toLowerCase().includes("unable to decode signature")
            ) {
              const match = msg.match(/\"(0x[0-9a-fA-F]{8})\"/);
              const selector = match?.[1] || "unknown";
              msg = `Deposit reverted with custom error ${selector}.`;
            }
            throw new Error(`Deposit would fail (simulate): ${msg}`);
          }
          
          if (process.env.NODE_ENV === "development") {
            console.log("[handleMint] About to call writeContractAsync with:", {
              address: targetPoolAddress,
              functionName: "deposit",
              args: [amountBigInt.toString(), address, "0"],
              amountBigInt: amountBigInt.toString(),
            });
          }

          const poolDepositHash = await writeContractAsync({
            address: targetPoolAddress,
            abi: STABILITY_POOL_ABI,
            functionName: "deposit",
            args: [amountBigInt, address as `0x${string}`, 0n],
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
        
        // Check if we need to swap the selected token first
        let swappedAmount = amountBigInt;
        let swappedTokenIsETH = anyTokenDeposit.isNativeETH;
        
        if (anyTokenDeposit.needsSwap && anyTokenDeposit.swapQuote) {
          // Step 0: Swap token to intermediate token (ETH or USDC)
          setStep("approving");
          setError(null);
          setTxHash(null);
          
          // Approve token for ParaSwap (if not ETH)
          if (!anyTokenDeposit.isNativeETH && anyTokenDeposit.needsSwapApproval) {
            // Check network before sending transaction
            if (!(await ensureCorrectNetwork())) {
              throw new Error("Wrong network. Please switch to Ethereum Mainnet.");
            }
            
            const swapApproveHash = await writeContractAsync({
              address: anyTokenDeposit.selectedAssetAddress as `0x${string}`,
              abi: ERC20_ABI,
              functionName: "approve",
              args: [
                "0x216b4b4ba9f3e719726886d34a177484278bfcae" as `0x${string}`, // ParaSwap TokenTransferProxy
                anyTokenDeposit.amountBigInt,
              ],
            });
            await publicClient?.waitForTransactionReceipt({ hash: swapApproveHash });
            await anyTokenDeposit.refetchSwapAllowance();
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
          
          // Execute swap
          setStep("minting"); // Reusing "minting" step for swap
          const fromTokenForSwap = anyTokenDeposit.isNativeETH ? "ETH" : (anyTokenDeposit.selectedAssetAddress as `0x${string}`);
          const toTokenForSwap = anyTokenDeposit.swapTargetToken as any;
          const swapTxData = await getDefiLlamaSwapTx(
            fromTokenForSwap,
            toTokenForSwap,
            anyTokenDeposit.amountBigInt,
            address as `0x${string}`,
            slippageTolerance,
            anyTokenDeposit.tokenDecimals,
            anyTokenDeposit.swapTargetToken === "ETH" ? 18 : 6
          );
          
          if (!swapTxData) {
            throw new Error("Failed to get swap transaction data");
          }
          
          // Check network before sending transaction
          if (!(await ensureCorrectNetwork())) {
            throw new Error("Wrong network. Please switch to Ethereum Mainnet.");
          }
          
          const swapHash = await sendTransactionAsync({
            to: swapTxData.to,
            data: swapTxData.data,
            value: swapTxData.value,
            gas: swapTxData.gas,
          });
          
          await publicClient?.waitForTransactionReceipt({ hash: swapHash });
          
          // Update swapped amount (ParaSwap returns in smallest units already)
          const isSwappedToUSDC = anyTokenDeposit.swapTargetToken !== "ETH";
          swappedAmount = BigInt(anyTokenDeposit.swapQuote.toAmount);
          swappedTokenIsETH = !isSwappedToUSDC;
        }
        
        // Check if we should use zap contracts (for ETH/USDC deposits)
        const useZap = anyTokenDeposit.useETHZap || anyTokenDeposit.useUSDCZap;
        const zapAddress = anyTokenDeposit.zapAddress;
        
        if (useZap && zapAddress) {
          // Use zap contract for efficient ETH → collateral or USDC → collateral conversion
          // Determine if approval is needed
          const needsZapApproval = (anyTokenDeposit.useETHZap && !anyTokenDeposit.isNativeETH && !anyTokenDeposit.needsSwap) || // stETH direct
            (anyTokenDeposit.useUSDCZap && !anyTokenDeposit.isNativeETH); // USDC/fxUSD (always needs approval)
          
          // If user selected a stability pool, we should complete the full flow (mint + deposit)
          // and show it in the progress modal.
          const shouldDepositToPool = simpleMode
            ? selectedStabilityPool &&
              selectedStabilityPool.poolType !== "none" &&
              !!stabilityPoolAddress
            : depositInStabilityPool && !mintOnly;

          // Set up progress modal before zap transaction
          // Determine the actual asset being zapped (after swap if applicable)
          let zapAssetName: string;
          if (anyTokenDeposit.useETHZap) {
            zapAssetName = swappedTokenIsETH ? "ETH" : "stETH";
          } else if (anyTokenDeposit.useUSDCZap) {
            // After swap, we always have USDC; otherwise check selected asset
            zapAssetName = anyTokenDeposit.needsSwap ? "USDC" : (anyTokenDeposit.selectedAsset?.toUpperCase() || "USDC");
          } else {
            zapAssetName = anyTokenDeposit.selectedAsset?.toUpperCase() || "TOKEN";
          }
          
          setProgressConfig({
            mode: "collateral",
            includeApproveCollateral: needsZapApproval,
            includeMint: true,
            // If a pool was selected, we want the full flow visible and executed.
            // Approval might be skipped at runtime if allowance is already sufficient.
            includeApprovePegged: !!shouldDepositToPool,
            includeDeposit: !!shouldDepositToPool,
            includeDirectApprove: false,
            includeDirectDeposit: false,
            useZap: true,
            zapAsset: zapAssetName,
            title: shouldDepositToPool ? "Mint & Deposit" : "Mint pegged token",
          });
          setProgressModalOpen(true);
          
          setStep(needsZapApproval ? "approving" : "minting");
          setError(null);
          setTxHash(null);
          
          if (anyTokenDeposit.useETHZap) {
            // ETH/stETH Zap: ETH → stETH → wstETH → Minter OR stETH → wstETH → Minter (via peggedTokenZap)
            // Determine which asset we're actually zapping (ETH or stETH)
            const isActuallyETH = anyTokenDeposit.isNativeETH || swappedTokenIsETH;
            const isActuallyStETH = !isActuallyETH && !anyTokenDeposit.needsSwap;
            
            // Calculate minPeggedOut for minter zap
            // Use swapDryRunOutput or expectedMintOutput from swap dry run if available (accounts for actual conversion and fees)
            // Otherwise fall back to estimation
            let minPeggedOut: bigint;
            let actualExpectedOutput: bigint | undefined;
            
            // For direct ETH deposits, try to get dry run output
            // First check if we have a dry run for the direct deposit amount
            if (isActuallyETH && !anyTokenDeposit.needsSwap) {
              // Try to find the market - use marketForDepositAsset, selectedMarket, or find by zap address
              let marketForDryRun = marketForDepositAsset;
              if (!marketForDryRun) {
                const selectedMarket = marketsForToken.find((x) => x.marketId === selectedMarketId)?.market;
                marketForDryRun = selectedMarket;
              }
              if (!marketForDryRun && zapAddress) {
                marketForDryRun = marketsForToken.find(
                  ({ market: m }) => 
                    m?.addresses?.peggedTokenZap?.toLowerCase() === zapAddress.toLowerCase() ||
                    m?.addresses?.leveragedTokenZap?.toLowerCase() === zapAddress.toLowerCase()
                )?.market;
            }
            
              if (marketForDryRun?.addresses?.minter && publicClient) {
                try {
                  // Convert ETH to wstETH for dry run
                  // Contract flow: ETH → stETH (1:1) → wstETH (via wstETH.wrap())
                  // So we need: ETH amount → stETH amount (1:1) → wstETH amount (via wstETH contract)
                  const wstETHAddress = marketForDryRun.addresses.wrappedCollateralToken as `0x${string}` | undefined;
                  
                  if (wstETHAddress) {
                    // ETH → stETH is 1:1, so stETH amount = ETH amount
                    const stEthAmount = swappedAmount;
                    
                    // Query wstETH contract for actual conversion rate
                    const wstEthAmount = await publicClient.readContract({
              address: wstETHAddress,
              abi: WSTETH_ABI,
              functionName: "getWstETHByStETH",
                      args: [stEthAmount],
                    });
                    
                    // Read dry run synchronously with actual wstETH amount
                    const dryRunResult = await publicClient.readContract({
                      address: marketForDryRun.addresses.minter as `0x${string}`,
                      abi: minterABI,
                      functionName: "mintPeggedTokenDryRun",
                      args: [wstEthAmount as bigint],
            });
                    if (dryRunResult && Array.isArray(dryRunResult) && dryRunResult.length >= 4) {
                      actualExpectedOutput = dryRunResult[3] as bigint;
                      if (process.env.NODE_ENV === "development") {
                        console.log("[ETH Zap] Direct deposit dry run result:", {
                          ethAmount: swappedAmount.toString(),
                          stEthAmount: stEthAmount.toString(),
                          wstEthAmount: (wstEthAmount as bigint).toString(),
                          peggedMinted: actualExpectedOutput.toString(),
                          minter: marketForDryRun.addresses.minter,
                        });
                      }
                    }
                  } else {
                    // Fallback to wrappedRate if wstETH address not available
                    const wrappedRate = marketForDryRun?.wrappedRate || selectedMarket?.wrappedRate;
                    if (wrappedRate && wrappedRate > 0n) {
                      const wstEthAmount = (swappedAmount * 10n ** 18n) / wrappedRate;
                      const dryRunResult = await publicClient.readContract({
                        address: marketForDryRun.addresses.minter as `0x${string}`,
                        abi: minterABI,
                        functionName: "mintPeggedTokenDryRun",
                        args: [wstEthAmount],
                      });
                      if (dryRunResult && Array.isArray(dryRunResult) && dryRunResult.length >= 4) {
                        actualExpectedOutput = dryRunResult[3] as bigint;
                      }
                    }
                  }
                } catch (err) {
                  // Dry run failed, will use fallback
                  if (process.env.NODE_ENV === "development") {
                    console.warn("[ETH Zap] Direct deposit dry run failed, using fallback:", err);
                  }
                }
              } else {
                if (process.env.NODE_ENV === "development") {
                  console.warn("[ETH Zap] No market found for dry run, will use fallback estimation");
                }
              }
            }
            
            // Prefer swapDryRunOutput directly (most reliable for swap deposits)
            if (swapDryRunOutput && Array.isArray(swapDryRunOutput) && swapDryRunOutput.length >= 4) {
              actualExpectedOutput = swapDryRunOutput[3] as bigint; // peggedMinted from dry run
            } else if (expectedMintOutput && expectedMintOutput > 0n) {
              actualExpectedOutput = expectedMintOutput;
            }
            
            if (actualExpectedOutput && actualExpectedOutput > 0n) {
              // Validate that actualExpectedOutput is reasonable
              // For ETH → haBTC, the output should be roughly similar to input (accounting for price differences)
              // But we need to be more lenient since BTC price is much higher than ETH
              // Check if output is more than 10x input (which would be unreasonable even for BTC)
              const maxReasonableOutput = swappedAmount * 10n; // Allow up to 10x for BTC markets
              const minReasonableOutput = swappedAmount / 1000n; // At least 0.1% of input
              
              // Also check if the ratio is suspicious (e.g., output is much higher than input for BTC markets)
              // For ETH → haBTC, the ratio should be roughly 1:1 (accounting for BTC price being ~20-30x ETH)
              // If the ratio is way off, the dry run might be wrong
              const outputRatio = Number(actualExpectedOutput) / Number(swappedAmount);
              const suspiciousRatio = outputRatio > 50 || outputRatio < 0.01; // BTC is ~20-30x ETH, so ratio should be reasonable
              
              if (actualExpectedOutput > maxReasonableOutput || actualExpectedOutput < minReasonableOutput || suspiciousRatio) {
                if (process.env.NODE_ENV === "development") {
                  console.warn("[ETH Zap] Dry run output seems unreasonable, using fallback:", {
                    actualExpectedOutput: actualExpectedOutput.toString(),
                    swappedAmount: swappedAmount.toString(),
                    ratio: outputRatio,
                    maxReasonable: maxReasonableOutput.toString(),
                    minReasonable: minReasonableOutput.toString(),
                    suspiciousRatio,
                  });
                }
                actualExpectedOutput = undefined; // Force fallback
              } else {
                // Use actual expected output from dry run and apply 2% slippage tolerance
                // TODO: Fine-tune this later with dynamic slippage and zapper fee calculations
                const slippagePercent = 2.0; // 2% slippage tolerance
                minPeggedOut = (actualExpectedOutput * BigInt(Math.floor((100 - slippagePercent) * 100))) / 10000n;
                
                if (process.env.NODE_ENV === "development") {
                  console.log("[ETH Zap] Using dry run output with 10% slippage:", {
                    actualExpectedOutput: actualExpectedOutput.toString(),
                    minPeggedOut: minPeggedOut.toString(),
                    slippagePercent,
                    ratio: Number(actualExpectedOutput) / Number(swappedAmount),
                  });
                }
              }
            }
            
            // If we don't have a valid actualExpectedOutput, use fallback estimation
            if (!actualExpectedOutput || actualExpectedOutput === 0n) {
              // Fallback: estimate from ETH/stETH amount (less accurate)
              // For direct ETH deposits, we need to account for ETH → stETH → wstETH conversion
              // The wrapped rate converts ETH to wstETH, so we should use that for estimation
              let estimatedPeggedOut: bigint;
              
              // Try to get wrapped rate for better estimation
              // Try multiple sources for wrapped rate
              let wrappedRate = marketForDepositAsset?.wrappedRate || selectedMarket?.wrappedRate;
              if (!wrappedRate && zapAddress) {
                const marketByZap = marketsForToken.find(
                  ({ market: m }) => 
                    m?.addresses?.peggedTokenZap?.toLowerCase() === zapAddress.toLowerCase() ||
                    m?.addresses?.leveragedTokenZap?.toLowerCase() === zapAddress.toLowerCase()
                )?.market;
                wrappedRate = marketByZap?.wrappedRate;
              }
              
              if (wrappedRate && wrappedRate > 0n) {
                // Convert ETH to wstETH using wrapped rate, then estimate mint output
                const wstEthAmount = (swappedAmount * 10n ** 18n) / wrappedRate;
                // Estimate: account for minting fees (~0.25%)
                estimatedPeggedOut = (wstEthAmount * 9975n) / 10000n;
              } else {
                // Fallback: assume 1:1 conversion (less accurate)
                // Estimate: account for conversion (ETH → stETH → wstETH) and minting fees (~0.25%)
                estimatedPeggedOut = (swappedAmount * 9975n) / 10000n; // Estimate 0.25% fee
              }
              
              // Apply 2% slippage tolerance for fallback estimation
              // TODO: Fine-tune this later with dynamic slippage and zapper fee calculations
              const slippagePercent = 2.0; // 2% slippage tolerance
              minPeggedOut = (estimatedPeggedOut * BigInt(Math.floor((100 - slippagePercent) * 100))) / 10000n;
              
              if (process.env.NODE_ENV === "development") {
                console.log("[ETH Zap] Using fallback estimation:", {
                  swappedAmount: swappedAmount.toString(),
                  wrappedRate: wrappedRate?.toString() || "none",
                  estimatedPeggedOut: estimatedPeggedOut.toString(),
                  minPeggedOut: minPeggedOut.toString(),
                  slippagePercent,
                });
              }
            }
            
            // Validate minPeggedOut is reasonable (at least 0.1% of input amount, or at least 1 wei)
            const minPeggedOutThreshold = swappedAmount > 1000n ? swappedAmount / 1000n : 1n; // 0.1% of input, or 1 wei minimum
            if (minPeggedOut < minPeggedOutThreshold) {
              const errorMsg = `Calculated minPeggedOut (${formatEther(minPeggedOut)} ETH) is too small relative to input amount (${formatEther(swappedAmount)} ETH). ` +
                `This usually indicates a calculation error. Please try again.`;
              if (process.env.NODE_ENV === "development") {
                console.error("[ETH Zap] minPeggedOut validation failed:", {
                  swappedAmount: swappedAmount.toString(),
                  minPeggedOut: minPeggedOut.toString(),
                  minPeggedOutThreshold: minPeggedOutThreshold.toString(),
                  actualExpectedOutput: actualExpectedOutput?.toString(),
                });
              }
              throw new Error(errorMsg);
            }
            
            if (process.env.NODE_ENV === "development") {
              console.log("[ETH Zap] Final values:", {
                swappedAmount: swappedAmount.toString(),
                minPeggedOut: minPeggedOut.toString(),
                minPeggedOutETH: formatEther(minPeggedOut),
                isActuallyETH,
                isActuallyStETH,
              });
            }
            
            // Check network before sending transaction
            if (!(await ensureCorrectNetwork())) {
              throw new Error("Wrong network. Please switch to Ethereum Mainnet.");
            }
            
            // Track pegged token balance before zap so we can compute minted amount for deposit.
            const balanceBeforeZap = peggedTokenAddress
              ? ((await publicClient?.readContract({
                  address: peggedTokenAddress as `0x${string}`,
                  abi: ERC20_ABI,
                  functionName: "balanceOf",
                  args: [address as `0x${string}`],
                })) as bigint | undefined)
              : undefined;

            // Call the correct zap function based on asset type
            let zapHash: `0x${string}`;
            if (isActuallyETH) {
              debugTx("zap/ethToPegged", {
                zapAddress,
                function: "zapEthToPegged",
                args: [address, minPeggedOut.toString()],
                value: swappedAmount.toString(),
              });
              zapHash = await writeContractAsync({
              address: zapAddress,
                abi: MINTER_ETH_ZAP_V2_ABI,
                functionName: "zapEthToPegged",
                args: [address as `0x${string}`, minPeggedOut],
              value: swappedAmount,
            });
            } else if (isActuallyStETH) {
              // Need approval for stETH first
              // Use underlyingCollateralToken (stETH), not wrappedCollateralToken (wstETH)
              // Try marketForDepositAsset first, then selectedMarket, then find market by zap address
              let stETHAddress = marketForDepositAsset?.addresses?.underlyingCollateralToken as `0x${string}` | undefined;
              
              // Fallback: try selectedMarket
              if (!stETHAddress) {
                const selectedMarket = marketsForToken.find((x) => x.marketId === selectedMarketId)?.market;
                stETHAddress = selectedMarket?.addresses?.underlyingCollateralToken as `0x${string}` | undefined;
              }
              
              // Fallback: find market by zap address
              if (!stETHAddress && zapAddress) {
                const marketByZap = marketsForToken.find(
                  ({ market: m }) => 
                    m?.addresses?.peggedTokenZap?.toLowerCase() === zapAddress.toLowerCase() ||
                    m?.addresses?.leveragedTokenZap?.toLowerCase() === zapAddress.toLowerCase()
                )?.market;
                stETHAddress = marketByZap?.addresses?.underlyingCollateralToken as `0x${string}` | undefined;
              }
              
              // Final fallback: use hardcoded stETH address (constant across all markets)
              if (!stETHAddress) {
                stETHAddress = "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84" as `0x${string}`;
              }
              
              if (!stETHAddress) throw new Error("stETH address not found. Please ensure you're depositing to a wstETH market.");
              
              // Check and approve stETH if needed
              const stETHAllowance = await publicClient?.readContract({
                address: stETHAddress,
                abi: ERC20_ABI,
                functionName: "allowance",
                args: [address as `0x${string}`, zapAddress],
              });
              
              const allowanceBigInt = (stETHAllowance as bigint) || 0n;
              if (allowanceBigInt < swappedAmount) {
                setStep("approving");
                const approveHash = await writeContractAsync({
                  address: stETHAddress,
                  abi: ERC20_ABI,
                  functionName: "approve",
                  args: [zapAddress, swappedAmount],
                });
                setTxHashes((prev) => ({ ...prev, approveCollateral: approveHash }));
                await publicClient?.waitForTransactionReceipt({ hash: approveHash });
                setStep("minting");
              }
              
              debugTx("zap/stEthToPegged", {
                zapAddress,
                function: "zapStEthToPegged",
                args: [swappedAmount.toString(), address, minPeggedOut.toString()],
              });
              zapHash = await writeContractAsync({
                address: zapAddress,
                abi: MINTER_ETH_ZAP_V2_ABI,
                functionName: "zapStEthToPegged",
                args: [swappedAmount, address as `0x${string}`, minPeggedOut],
              });
            } else {
              throw new Error("Invalid asset for ETH/stETH zap");
            }
            
            await publicClient?.waitForTransactionReceipt({ hash: zapHash });
            setTxHashes((prev) => ({ ...prev, mint: zapHash }));
            
            // If a pool was selected, continue by depositing the freshly minted pegged tokens.
            if (shouldDepositToPool) {
              if (!stabilityPoolAddress) {
                throw new Error(
                  "Stability pool address not found. Cannot deposit to stability pool."
                );
              }
              if (!peggedTokenAddress) {
                throw new Error(
                  "Pegged token address not found. Cannot deposit to stability pool."
                );
              }

              // Wait a bit for state to update after transaction
              await new Promise((resolve) => setTimeout(resolve, 2000));
              const balanceAfterZap = (await publicClient?.readContract({
                address: peggedTokenAddress as `0x${string}`,
                abi: ERC20_ABI,
                functionName: "balanceOf",
                args: [address as `0x${string}`],
              })) as bigint;

              const minted =
                balanceBeforeZap !== undefined
                  ? balanceAfterZap - balanceBeforeZap
                  : balanceAfterZap;
              const depositAmount = minted > 0n ? minted : balanceAfterZap;

              if (depositAmount <= 0n) {
                throw new Error(
                  "Mint succeeded but could not determine minted amount to deposit."
                );
              }

              // Approve pegged token for pool if needed
              const currentAllowance = (await publicClient?.readContract({
                address: peggedTokenAddress as `0x${string}`,
                abi: ERC20_ABI,
                functionName: "allowance",
                args: [address as `0x${string}`, stabilityPoolAddress],
              })) as bigint;

              if (currentAllowance < depositAmount) {
                setStep("approvingPegged");
                const approveHash = await writeContractAsync({
                  address: peggedTokenAddress as `0x${string}`,
                  abi: ERC20_ABI,
                  functionName: "approve",
                  args: [stabilityPoolAddress, depositAmount],
                });
                setTxHashes((prev) => ({ ...prev, approvePegged: approveHash }));
                await publicClient?.waitForTransactionReceipt({ hash: approveHash });
              }

              // Deposit to stability pool
              setStep("depositing");
              const depositHash = await writeContractAsync({
                address: stabilityPoolAddress,
                abi: STABILITY_POOL_ABI,
                functionName: "deposit",
                args: [depositAmount, address as `0x${string}`, 0n],
              });
              setTxHashes((prev) => ({ ...prev, deposit: depositHash }));
              await publicClient?.waitForTransactionReceipt({ hash: depositHash });
            }

            setStep("success");
            if (onSuccess) onSuccess();
            return;
          } else if (anyTokenDeposit.useUSDCZap) {
            // USDC/fxUSD Zap: USDC → fxUSD → fxSAVE → Minter OR fxUSD → fxSAVE → Minter (via peggedTokenZap)
            // Determine which asset we're actually zapping (USDC or fxUSD)
            const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as `0x${string}`;
            const isActuallyUSDC = anyTokenDeposit.needsSwap 
              ? true // After swap, we always have USDC
              : (anyTokenDeposit.selectedAssetAddress?.toLowerCase() === USDC_ADDRESS.toLowerCase());
            const isActuallyFxUSD = !isActuallyUSDC && !anyTokenDeposit.needsSwap;
            const minFxSaveOut = (swappedAmount * 99n) / 100n;
            
            // Get the asset address for approval
            const assetAddressForApproval = anyTokenDeposit.needsSwap 
              ? USDC_ADDRESS 
              : (anyTokenDeposit.selectedAssetAddress as `0x${string}`);
            
            if (!assetAddressForApproval) {
              throw new Error("Asset address not found for approval");
            }
            
              // Check network before sending transaction
              if (!(await ensureCorrectNetwork())) {
                throw new Error("Wrong network. Please switch to Ethereum Mainnet.");
              }
              
            // Read current allowance for the asset to zap contract
            const currentAllowance = await publicClient?.readContract({
              address: assetAddressForApproval,
              abi: ERC20_ABI,
              functionName: "allowance",
              args: [address as `0x${string}`, zapAddress],
            });
            
            const allowanceBigInt = (currentAllowance as bigint) || 0n;
            if (allowanceBigInt < swappedAmount) {
              setStep("approving");
              const zapApproveHash = await writeContractAsync({
                address: assetAddressForApproval,
                abi: ERC20_ABI,
                functionName: "approve",
                args: [zapAddress, swappedAmount],
              });
              setTxHashes((prev) => ({ ...prev, approveCollateral: zapApproveHash }));
              await publicClient?.waitForTransactionReceipt({ hash: zapApproveHash });
              setStep("minting");
            }
            
            // Calculate minPeggedOut for minter zap
            // Use swapDryRunOutput or expectedMintOutput from swap dry run if available (accounts for actual conversion and fees)
            // Otherwise fall back to estimation
            let minPeggedOut: bigint;
            let actualExpectedOutput: bigint | undefined;
            
            // Prefer swapDryRunOutput directly (most reliable for swap deposits)
            if (swapDryRunOutput && Array.isArray(swapDryRunOutput) && swapDryRunOutput.length >= 4) {
              actualExpectedOutput = swapDryRunOutput[3] as bigint; // peggedMinted from dry run
            } else if (expectedMintOutput && expectedMintOutput > 0n) {
              actualExpectedOutput = expectedMintOutput;
            }
            
            if (actualExpectedOutput && actualExpectedOutput > 0n) {
              // Use actual expected output from dry run and apply slippage tolerance
              // NOTE: Dynamic fees can change if collateral ratio crosses bands between dry run and execution
              // We use higher slippage tolerance to account for potential fee increases
              const slippageBps = Math.max(slippageTolerance || 1, 2.0); // Increased from 0.5% to 2% minimum
              minPeggedOut = (actualExpectedOutput * BigInt(Math.floor((100 - slippageBps) * 100))) / 10000n;
            } else {
              // Fallback: estimate based on asset type
              if (isActuallyUSDC) {
                // USDC has 6 decimals, pegged tokens have 18 decimals
                const usdcAmountIn18Decimals = swappedAmount * 10n ** 12n; // Convert 6 to 18 decimals
                // Estimate: account for conversion (USDC → fxUSD 1:1) and minting fees (~0.25%)
                const estimatedPeggedOut = (usdcAmountIn18Decimals * 9975n) / 10000n; // Estimate 0.25% fee
                const slippageBps = Math.max(slippageTolerance || 1, 2.0);
                minPeggedOut = (estimatedPeggedOut * BigInt(Math.floor((100 - slippageBps) * 100))) / 10000n;
              } else {
                // fxUSD already in 18 decimals
                // Estimate: account for conversion (fxUSD → fxSAVE) and minting fees (~0.25%)
                const estimatedPeggedOut = (swappedAmount * 9975n) / 10000n; // Estimate 0.25% fee
                const slippageBps = Math.max(slippageTolerance || 1, 2.0);
                minPeggedOut = (estimatedPeggedOut * BigInt(Math.floor((100 - slippageBps) * 100))) / 10000n;
              }
            }
            
            // Check network before sending transaction
            if (!(await ensureCorrectNetwork())) {
              throw new Error("Wrong network. Please switch to Ethereum Mainnet.");
            }
            
            // Track pegged token balance before zap so we can compute minted amount for deposit.
            const balanceBeforeZap = peggedTokenAddress
              ? ((await publicClient?.readContract({
                  address: peggedTokenAddress as `0x${string}`,
                  abi: ERC20_ABI,
                  functionName: "balanceOf",
                  args: [address as `0x${string}`],
                })) as bigint | undefined)
              : undefined;

            // Call the correct zap function based on asset type
            let zapHash: `0x${string}`;
            if (isActuallyUSDC) {
              debugTx("zap/usdcToPegged", {
                zapAddress,
                function: "zapUsdcToPegged",
                args: [
                  swappedAmount.toString(),
                  minFxSaveOut.toString(),
                  address,
                  minPeggedOut.toString(),
                ],
              });
              zapHash = await writeContractAsync({
              address: zapAddress,
                abi: MINTER_USDC_ZAP_V2_ABI,
                functionName: "zapUsdcToPegged",
                args: [
                  swappedAmount,
                  minFxSaveOut,
                  address as `0x${string}`,
                  minPeggedOut,
                ],
              });
            } else if (isActuallyFxUSD) {
              debugTx("zap/fxUsdToPegged", {
                zapAddress,
                function: "zapFxUsdToPegged",
                args: [
                  swappedAmount.toString(),
                  minFxSaveOut.toString(),
                  address,
                  minPeggedOut.toString(),
                ],
              });
              zapHash = await writeContractAsync({
                address: zapAddress,
                abi: MINTER_USDC_ZAP_V2_ABI,
                functionName: "zapFxUsdToPegged",
                args: [
                  swappedAmount,
                  minFxSaveOut,
                  address as `0x${string}`,
                  minPeggedOut,
                ],
            });
            } else {
              throw new Error("Invalid asset for USDC/fxUSD zap");
            }
            
            await publicClient?.waitForTransactionReceipt({ hash: zapHash });
            setTxHashes((prev) => ({ ...prev, mint: zapHash }));
            
            // If a pool was selected, continue by depositing the freshly minted pegged tokens.
            if (shouldDepositToPool) {
              if (!stabilityPoolAddress) {
                throw new Error(
                  "Stability pool address not found. Cannot deposit to stability pool."
                );
              }
              if (!peggedTokenAddress) {
                throw new Error(
                  "Pegged token address not found. Cannot deposit to stability pool."
                );
              }

              await new Promise((resolve) => setTimeout(resolve, 2000));
              const balanceAfterZap = (await publicClient?.readContract({
                address: peggedTokenAddress as `0x${string}`,
                abi: ERC20_ABI,
                functionName: "balanceOf",
                args: [address as `0x${string}`],
              })) as bigint;

              const minted =
                balanceBeforeZap !== undefined
                  ? balanceAfterZap - balanceBeforeZap
                  : balanceAfterZap;
              const depositAmount = minted > 0n ? minted : balanceAfterZap;

              if (depositAmount <= 0n) {
                throw new Error(
                  "Mint succeeded but could not determine minted amount to deposit."
                );
              }

              const currentAllowance = (await publicClient?.readContract({
                address: peggedTokenAddress as `0x${string}`,
                abi: ERC20_ABI,
                functionName: "allowance",
                args: [address as `0x${string}`, stabilityPoolAddress],
              })) as bigint;

              if (currentAllowance < depositAmount) {
                setStep("approvingPegged");
                const approveHash = await writeContractAsync({
                  address: peggedTokenAddress as `0x${string}`,
                  abi: ERC20_ABI,
                  functionName: "approve",
                  args: [stabilityPoolAddress, depositAmount],
                });
                setTxHashes((prev) => ({ ...prev, approvePegged: approveHash }));
                await publicClient?.waitForTransactionReceipt({ hash: approveHash });
              }

              setStep("depositing");
              const depositHash = await writeContractAsync({
                address: stabilityPoolAddress,
                abi: STABILITY_POOL_ABI,
                functionName: "deposit",
                args: [depositAmount, address as `0x${string}`, 0n],
              });
              setTxHashes((prev) => ({ ...prev, deposit: depositHash }));
              await publicClient?.waitForTransactionReceipt({ hash: depositHash });
            }

            setStep("success");
            if (onSuccess) onSuccess();
            return;
          }
        }
        
        // In simple mode, check if a stability pool is selected; in advanced mode, use depositInStabilityPool
        const shouldDepositToPool = simpleMode
          ? selectedStabilityPool &&
            selectedStabilityPool.poolType !== "none" &&
            !!stabilityPoolAddress
          : depositInStabilityPool && !mintOnly;
        const includeApprovePegged =
          shouldDepositToPool && needsPeggedTokenApproval;
        const includeDeposit = shouldDepositToPool;
        // Determine if we need approval (for zap or direct minting)
        const needsZapApproval = useZap && zapAddress && (
          (useETHZap && isStETH) || 
          (useUSDCZap && (isUSDC || isFxUSD))
        );
        const needsDirectApproval = !useZap && needsApproval;
        
        // Determine zap asset name for labels
        let zapAssetName: string | null = null;
        if (useZap) {
          if (isNativeETH) zapAssetName = "ETH";
          else if (isStETH) zapAssetName = "stETH";
          else if (isUSDC) zapAssetName = "USDC";
          else if (isFxUSD) zapAssetName = "fxUSD";
        }
        
        setProgressConfig({
          mode: "collateral",
          includeApproveCollateral: needsZapApproval || needsDirectApproval,
          includeMint: true,
          includeApprovePegged,
          includeDeposit,
          includeDirectApprove: false,
          includeDirectDeposit: false,
          useZap: !!useZap,
          zapAsset: zapAssetName,
          title: includeDeposit ? "Mint & Deposit" : "Mint pegged token",
        });
        // Show progress modal for transaction feedback
        setProgressModalOpen(true);
        // Use Anvil client for local development, regular publicClient for production
        const txClient = false ? publicClient : publicClient;

        debugTx("mintFlow/addresses", {
          selectedMarketId,
          minterAddress,
          collateralAddress,
          peggedTokenAddress,
          leveragedTokenAddress,
          stabilityPoolAddress,
          depositAssetMarket: depositAssetMarket?.id || depositAssetMarket?.name,
          depositAssetCollateralSymbol,
          depositAssetWrappedCollateralSymbol,
          isWrappedCollateral,
          zapAddress,
          useZap,
          useETHZap,
          useUSDCZap,
          fxSAVERate: fxSAVERate?.toString(),
        });

        debugTx("mintFlow/allowances", {
          collateralAllowance: allowance?.toString(),
          needsApproval,
          peggedAllowance: peggedTokenAllowance?.toString(),
          needsPeggedTokenApproval,
        });

        // Step 1: Handle approvals - for zap contracts or direct minting
        if (useZap && zapAddress) {
          // Handle approvals for zap contracts
          if (useETHZap && isStETH) {
            // Approve stETH to zap contract
            // Use underlyingCollateralToken (stETH), not wrappedCollateralToken (wstETH)
            // Try depositAssetMarket first, then selectedMarket, then find market by zap address
            let stETHAddress = depositAssetMarket?.addresses?.underlyingCollateralToken as `0x${string}` | undefined;
            
            // Fallback: try selectedMarket
            if (!stETHAddress) {
              const selectedMarket = marketsForToken.find((x) => x.marketId === selectedMarketId)?.market;
              stETHAddress = selectedMarket?.addresses?.underlyingCollateralToken as `0x${string}` | undefined;
            }
            
            // Fallback: find market by zap address
            if (!stETHAddress && zapAddress) {
              const marketByZap = marketsForToken.find(
                ({ market: m }) => 
                  m?.addresses?.peggedTokenZap?.toLowerCase() === zapAddress.toLowerCase() ||
                  m?.addresses?.leveragedTokenZap?.toLowerCase() === zapAddress.toLowerCase()
              )?.market;
              stETHAddress = marketByZap?.addresses?.underlyingCollateralToken as `0x${string}` | undefined;
            }
            
            if (!stETHAddress) throw new Error("stETH address not found. Please ensure you're depositing to a wstETH market.");
            
            // Read allowance for zap contract
            const allowance = await publicClient?.readContract({
              address: stETHAddress,
              abi: ERC20_ABI,
              functionName: "allowance",
              args: [address as `0x${string}`, zapAddress],
            });
            
            const currentAllowance = (allowance as bigint) || 0n;
            if (currentAllowance < amountBigInt) {
              setStep("approving");
              setError(null);
              setTxHash(null);

              debugTx("zap/steth/approve", {
                token: stETHAddress,
                spender: zapAddress,
                amount: amountBigInt.toString(),
                currentAllowance: currentAllowance.toString(),
              });

              const approveHash = await writeContractAsync({
                address: stETHAddress,
                abi: ERC20_ABI,
                functionName: "approve",
                args: [zapAddress, amountBigInt],
              });
              setTxHash(approveHash);
              setTxHashes((prev) => ({ ...prev, approveCollateral: approveHash }));
              await txClient?.waitForTransactionReceipt({ hash: approveHash });
              await new Promise((resolve) => setTimeout(resolve, 1000));
            } else {
              // Already approved - mark step as completed
              setTxHashes((prev) => ({ ...prev, approveCollateral: undefined }));
            }
          } else if (useUSDCZap && (isUSDC || isFxUSD)) {
            // Approve USDC or fxUSD to zap contract
            const assetAddress = isUSDC 
              ? "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as `0x${string}`
              : (depositAssetMarket?.addresses?.collateralToken as `0x${string}` | undefined);
            
            if (!assetAddress) throw new Error("Asset address not found");
            
            // Read allowance for zap contract
            const allowance = await publicClient?.readContract({
              address: assetAddress,
              abi: ERC20_ABI,
              functionName: "allowance",
              args: [address as `0x${string}`, zapAddress],
            });
            
            const currentAllowance = (allowance as bigint) || 0n;
            if (currentAllowance < amountBigInt) {
              setStep("approving");
              setError(null);
              setTxHash(null);

              debugTx("zap/usdcOrFxUsd/approve", {
                token: assetAddress,
                spender: zapAddress,
                amount: amountBigInt.toString(),
                currentAllowance: currentAllowance.toString(),
              });

              const approveHash = await writeContractAsync({
                address: assetAddress,
                abi: ERC20_ABI,
                functionName: "approve",
                args: [zapAddress, amountBigInt],
              });
              setTxHash(approveHash);
              setTxHashes((prev) => ({ ...prev, approveCollateral: approveHash }));
              await txClient?.waitForTransactionReceipt({ hash: approveHash });
              await new Promise((resolve) => setTimeout(resolve, 1000));
            } else {
              // Already approved - mark step as completed
              setTxHashes((prev) => ({ ...prev, approveCollateral: undefined }));
            }
          }
          // ETH doesn't need approval (native token) - if approval step is shown, it will be auto-completed
        } else if (needsApproval) {
          // Direct minting - approve wrapped collateral to minter
          setStep("approving");
          setError(null);
          setTxHash(null);

          debugTx("directMint/approveCollateral", {
            token: collateralAddress,
            spender: minterAddress,
            amount: amountBigInt.toString(),
            currentAllowance: allowance?.toString(),
          });

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

        // Step 2: Mint pegged token (via zap or direct)
        setStep("minting");
        setError(null);
        setTxHash(null);

        // For zap transactions, capture balance before minting to calculate actual minted amount
        let balanceBeforeZap: bigint | undefined;
        if (useZap && zapAddress && peggedTokenAddress) {
          try {
            balanceBeforeZap = await publicClient?.readContract({
              address: peggedTokenAddress as `0x${string}`,
              abi: ERC20_ABI,
              functionName: "balanceOf",
              args: [address as `0x${string}`],
            }) as bigint | undefined;
            if (process.env.NODE_ENV === "development") {
              console.log("[handleMint] Balance before zap:", balanceBeforeZap?.toString());
            }
          } catch (err) {
            if (process.env.NODE_ENV === "development") {
              console.warn("[handleMint] Failed to read balance before zap:", err);
            }
          }
        }

        // Calculate minimum output based on zap type or direct minting
        let minPeggedOut: bigint;
        
        if (useUSDCZap) {
          // For USDC/fxUSD zap: use expectedMintOutput from dry run if available
          // This accounts for actual conversion (USDC → fxUSD → fxSAVE) and minting fees
          // NOTE: Dynamic fees can change if collateral ratio crosses bands between dry run and execution
          // We use higher slippage tolerance to account for potential fee increases
          if (expectedMintOutput && expectedMintOutput > 0n) {
            // Apply slippage tolerance (default 1%, minimum 0.5%)
            // Use higher tolerance (2%) to account for dynamic fee changes if collateral ratio crosses bands
            const slippageBps = Math.max(slippageTolerance || 1, 2.0); // Increased from 0.5% to 2% minimum
            minPeggedOut = (expectedMintOutput * BigInt(Math.floor((100 - slippageBps) * 100))) / 10000n;
          } else if (fxSAVERate && fxSAVERate > 0n) {
            // Fallback: estimate using fxSAVE rate (less accurate, but better than 0)
          // USDC has 6 decimals, fxUSD has 18 decimals
          let amountIn18Decimals: bigint;
          if (isUSDC) {
            // USDC: convert from 6 decimals to 18 decimals
            amountIn18Decimals = amountBigInt * 10n ** 12n;
          } else {
            // fxUSD: already in 18 decimals
            amountIn18Decimals = amountBigInt;
          }
            // Convert to fxSAVE using wrapped rate
            // fxSAVERate is in 18 decimals: rate = (fxSAVE_amount * 10^18) / fxUSD_amount
            // So: fxSAVE_amount = (fxUSD_amount * 10^18) / fxSAVERate
            // For fxUSD (already 18 decimals): fxSAVE = (fxUSD * 10^18) / rate
            // For USDC (converted to 18 decimals): fxSAVE = (USDC_in_18 * 10^18) / rate
            const fxSaveAmount = (amountIn18Decimals * 10n ** 18n) / fxSAVERate;
            // Estimate mint output: be more conservative with fees
            // Account for conversion fees (~0.1%) + minting fees (~0.25%) = ~0.35% total
            const estimatedPeggedOut = (fxSaveAmount * 9965n) / 10000n; // Estimate 0.35% total fee
            const slippageBps = Math.max(slippageTolerance || 1, 2.0); // Increased from 0.5% to 2% minimum
            minPeggedOut = (estimatedPeggedOut * BigInt(Math.floor((100 - slippageBps) * 100))) / 10000n;
        } else {
            throw new Error("Cannot calculate minPeggedOut: expectedMintOutput and fxSAVERate both unavailable");
          }
        } else {
          // For direct minting or ETH zap: use expectedMintOutput with slippage tolerance
          // NOTE: Dynamic fees can change if collateral ratio crosses bands between dry run and execution
          // We use higher slippage tolerance to account for potential fee increases
          const slippageBps = Math.max(slippageTolerance || 1, 2.0); // Increased from 0.5% to 2% minimum
          minPeggedOut = expectedMintOutput
            ? (expectedMintOutput * BigInt(Math.floor((100 - slippageBps) * 100))) / 10000n
            : 0n;
        }

        let mintHash: `0x${string}`;

        if (useZap && zapAddress) {
          const minFxSaveOut = (amountBigInt * 99n) / 100n;
          // Use zap contract to mint
          if (useETHZap) {
            // ETH/stETH zap for wstETH markets
            if (isNativeETH) {
              debugTx("zap/ethToPegged", {
                zapAddress,
                function: "zapEthToPegged",
                args: [address, minPeggedOut.toString()],
                value: amountBigInt.toString(),
              });
              mintHash = await writeContractAsync({
                address: zapAddress,
                abi: MINTER_ETH_ZAP_V2_ABI,
                functionName: "zapEthToPegged",
                args: [address as `0x${string}`, minPeggedOut],
                value: amountBigInt,
              });
            } else if (isStETH) {
              debugTx("zap/stEthToPegged", {
                zapAddress,
                function: "zapStEthToPegged",
                args: [
                  amountBigInt.toString(),
                  address,
                  minPeggedOut.toString(),
                ],
              });
              mintHash = await writeContractAsync({
                address: zapAddress,
                abi: MINTER_ETH_ZAP_V2_ABI,
                functionName: "zapStEthToPegged",
                args: [amountBigInt, address as `0x${string}`, minPeggedOut],
              });
            } else {
              throw new Error("Invalid asset for ETH zap");
            }
          } else if (useUSDCZap) {
            // USDC/fxUSD zap for fxSAVE markets
            if (!fxSAVERate || fxSAVERate === 0n) {
              throw new Error("fxSAVE rate not available");
            }
            
            if (isUSDC) {
              debugTx("zap/usdcToPegged", {
                zapAddress,
                function: "zapUsdcToPegged",
                args: [
                  amountBigInt.toString(),
                  minFxSaveOut.toString(),
                  address,
                  minPeggedOut.toString(),
                ],
              });
              mintHash = await writeContractAsync({
                address: zapAddress,
                abi: MINTER_USDC_ZAP_V2_ABI,
                functionName: "zapUsdcToPegged",
                args: [
                  amountBigInt,
                  minFxSaveOut,
                  address as `0x${string}`,
                  minPeggedOut,
                ],
              });
            } else if (isFxUSD) {
              debugTx("zap/fxUsdToPegged", {
                zapAddress,
                function: "zapFxUsdToPegged",
                args: [
                  amountBigInt.toString(),
                  minFxSaveOut.toString(),
                  address,
                  minPeggedOut.toString(),
                ],
              });
              mintHash = await writeContractAsync({
                address: zapAddress,
                abi: MINTER_USDC_ZAP_V2_ABI,
                functionName: "zapFxUsdToPegged",
                args: [
                  amountBigInt,
                  minFxSaveOut,
                  address as `0x${string}`,
                  minPeggedOut,
                ],
              });
            } else {
              throw new Error("Invalid asset for USDC zap");
            }
          } else {
            throw new Error("Invalid zap configuration");
          }
        } else {
          debugTx("directMint/mintPeggedToken", {
            minterAddress,
            function: "mintPeggedToken",
            args: [amountBigInt.toString(), address, minPeggedOut.toString()],
          });
          // Direct minting (no zap)
          if (process.env.NODE_ENV === "development") {
            console.log("[handleMint] About to mint pegged token:", {
              minterAddress,
              amountBigInt: amountBigInt.toString(),
              receiver: address,
              minPeggedOut: minPeggedOut.toString(),
              expectedMintOutput: expectedMintOutput?.toString(),
            });
          }

          mintHash = await writeContractAsync({
            address: minterAddress as `0x${string}`,
            abi: minterABI,
            functionName: "mintPeggedToken",
            args: [amountBigInt, address as `0x${string}`, minPeggedOut],
          });
        }

        if (process.env.NODE_ENV === "development") {
          console.log("[handleMint] Mint transaction hash:", mintHash, {
            useZap,
            zapAddress,
            useETHZap,
            useUSDCZap,
          });
        }

        setTxHash(mintHash);
        setTxHashes((prev) => ({ ...prev, mint: mintHash }));
        await txClient?.waitForTransactionReceipt({ hash: mintHash });

        // Refetch to get updated pegged token balance
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        // For zap transactions, calculate the actual minted amount from balance change
        let actualMintedAmount: bigint | undefined;
        if (useZap && zapAddress && peggedTokenAddress && balanceBeforeZap !== undefined) {
          try {
            // Wait a bit for state to update after transaction
            await new Promise((resolve) => setTimeout(resolve, 2000));
            const balanceAfter = await publicClient?.readContract({
              address: peggedTokenAddress as `0x${string}`,
              abi: ERC20_ABI,
              functionName: "balanceOf",
              args: [address as `0x${string}`],
            }) as bigint | undefined;
            if (balanceAfter !== undefined) {
              actualMintedAmount = balanceAfter - balanceBeforeZap;
              if (process.env.NODE_ENV === "development") {
                console.log("[handleMint] Actual minted amount from zap:", {
                  balanceBefore: balanceBeforeZap.toString(),
                  balanceAfter: balanceAfter.toString(),
                  actualMintedAmount: actualMintedAmount.toString(),
                });
              }
            }
          } catch (err) {
            if (process.env.NODE_ENV === "development") {
              console.warn("[handleMint] Failed to read actual minted amount:", err);
            }
          }
        }

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
          const readClient = false ? publicClient : publicClient;

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

          // Determine deposit amount based on whether we used zap or direct minting
          let depositAmount: bigint | undefined;
          
          if (useZap && zapAddress) {
            // For zap transactions, use the actual minted amount we calculated from balance change
            // This is more accurate than expectedMintOutput which assumes wrapped collateral input
            depositAmount = actualMintedAmount;
            
            // Fallback: if we couldn't calculate actualMintedAmount, use the actual balance
            if (!depositAmount || depositAmount === 0n) {
              if (actualPeggedBalance && actualPeggedBalance > 0n) {
                if (process.env.NODE_ENV === "development") {
                  console.log(
                    "[handleMint] Using actualPeggedBalance for zap deposit (actualMintedAmount unavailable)"
                  );
                }
                depositAmount = actualPeggedBalance;
              }
            }
          } else {
            // For direct minting, use expectedMintOutput (from dry run)
            depositAmount = expectedMintOutput;

            // Fallback 1: If expectedMintOutput is undefined, try using amountBigInt
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
            // Sanity-check the pool's asset token.
            // Both Collateral + Sail pools should accept the pegged (ha) token as the deposit asset.
            try {
              const poolAssetToken = (await readClient?.readContract({
                address: stabilityPoolAddress,
                abi: STABILITY_POOL_ABI,
                functionName: "ASSET_TOKEN",
              })) as `0x${string}` | undefined;

              debugTx("pool/assetToken", {
                stabilityPoolAddress,
                poolAssetToken,
                expectedPeggedToken: peggedTokenAddress,
              });

              if (
                poolAssetToken &&
                peggedTokenAddress &&
                poolAssetToken.toLowerCase() !== peggedTokenAddress.toLowerCase()
              ) {
                let poolAssetSymbol: string | null = null;
                try {
                  poolAssetSymbol = (await readClient?.readContract({
                    address: poolAssetToken,
                    abi: ERC20_ABI_WITH_SYMBOL,
                    functionName: "symbol",
                  })) as string;
                } catch {}

                throw new Error(
                  `Pool configuration mismatch: selected pool ASSET_TOKEN is ${
                    poolAssetSymbol ? `${poolAssetSymbol} (${poolAssetToken})` : poolAssetToken
                  }, but expected ${peggedTokenSymbol} (${peggedTokenAddress}).`
                );
              }
            } catch (assetCheckErr) {
              throw assetCheckErr;
            }

            debugTx("pool/simulateDeposit", {
              stabilityPoolAddress,
              args: [depositAmount.toString(), address, "0"],
            });
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
            debugTx("pool/simulateDeposit/error", {
              message: simErr?.message,
              shortMessage: simErr?.shortMessage,
              cause: simErr?.cause?.message,
              data: simErr?.data,
            });
            if (process.env.NODE_ENV === "development") {
              console.error("[handleMint] Deposit simulation failed:", simErr);
              console.error("[handleMint] Simulation error details:", {
                message: simErr?.message,
                cause: simErr?.cause?.message,
                shortMessage: simErr?.shortMessage,
              });
            }

            // Try to decode known custom errors (we add them to the ABI as we discover them)
            try {
              if (simErr instanceof BaseError) {
                const revertError = simErr.walk(
                  (e) => e instanceof ContractFunctionRevertedError
                );
                if (revertError instanceof ContractFunctionRevertedError) {
                  const errorName = revertError.data?.errorName || "";
                  const args = (revertError.data as any)?.args as
                    | readonly unknown[]
                    | undefined;
                  if (
                    errorName === "DepositAmountLessThanMinimum" &&
                    args?.length === 2
                  ) {
                    const minimum = args[1] as bigint;
                    throw new Error(
                      `Deposit amount too small. Minimum deposit is ${formatEther(minimum)} ${peggedTokenSymbol}.`
                    );
                  }
                }
              }
            } catch (decodedErr) {
              throw decodedErr;
            }

            // Try to extract a meaningful error message
            let errorMsg =
              simErr?.cause?.message ||
              simErr?.shortMessage ||
              simErr?.message ||
              "Unknown error";

            // If viem can't decode a custom error selector, show a concise message.
            // Example: Unable to decode signature "0x14960154"...
            if (
              typeof errorMsg === "string" &&
              errorMsg.toLowerCase().includes("unable to decode signature")
            ) {
              const match = errorMsg.match(/\"(0x[0-9a-fA-F]{8})\"/);
              const selector = match?.[1] || "unknown";
              errorMsg = `Deposit reverted with custom error ${selector}. This pool may currently restrict deposits (e.g. paused / genesis mode).`;
            }
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
          const errorName = revertError.data?.errorName || "";
          
          // Check for collateral ratio errors
          if (
            errorName.includes("InvalidRatio") ||
            errorName.includes("InsufficientCollateral") ||
            errorName === "ActionPaused"
          ) {
            if (errorName === "ActionPaused") {
              errorMessage = "Minting is currently paused. Please try again later.";
            } else {
              errorMessage = "This deposit would bring the collateral ratio below the minimum allowed. Please deposit a smaller amount or try again later when market conditions improve.";
            }
          } else if (errorName === "MintInsufficientAmount") {
            errorMessage = "The minted amount would be too small. Please deposit a larger amount.";
          } else if (errorName === "MintZeroAmount") {
            errorMessage = "Invalid deposit amount. Please check your input.";
          } else if (errorName === "InvalidOraclePrice" || errorName === "ZeroOraclePrice") {
            errorMessage = "Oracle price unavailable. Please try again in a few moments.";
          } else {
            errorMessage = `Contract error: ${errorName || "Unknown error"}`;
          }
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

      // Check for user rejection first (most common case)
      const errMessage = err instanceof Error ? err.message : String(err);
      const errShortMessage = err instanceof BaseError ? err.shortMessage : "";
      const lowerMessage = (errMessage + " " + errShortMessage).toLowerCase();
      
      if (lowerMessage.includes("user rejected") || lowerMessage.includes("user denied") || lowerMessage.includes("rejected the request") || err?.name === "UserRejectedRequestError") {
        errorMessage = "Transaction cancelled";
      } else if (err instanceof BaseError) {
        const revertError = err.walk(
          (err) => err instanceof ContractFunctionRevertedError
        );
        if (revertError instanceof ContractFunctionRevertedError) {
          errorMessage = revertError.reason || revertError.data?.errorName || "Transaction failed";
        } else {
          // Extract concise error message
          const msg = err.message || err.shortMessage || "Transaction failed";
          errorMessage = msg.replace(/^[^:]+:\s*/i, "").replace(/\s*\([^)]+\)$/, "") || "Transaction failed";
        }
      } else if (err instanceof Error) {
        errorMessage = err.message.replace(/^[^:]+:\s*/i, "").replace(/\s*\([^)]+\)$/, "") || "Transaction failed";
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
    // Ensure correct network before starting transaction (auto-attempt switch)
    if (!(await ensureCorrectNetwork())) return;
    // Clear any stale hashes from previous runs so the progress UI starts fresh
    setTxHashes({});
    
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
      let walletBalBeforeForDelta = 0n;
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

      const shouldAutoRedeem =
        !withdrawOnly &&
        (walletAmount > 0n || collateralIsImmediate || sailIsImmediate);

      const estimatedNeedsRedeemApproval =
        shouldAutoRedeem &&
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
          shouldAutoRedeem && redeemableTotal > 0n && estimatedNeedsRedeemApproval,
        includeRedeem: shouldAutoRedeem && redeemableTotal > 0n,
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
      // Show progress modal for transaction feedback
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
            collateralPoolImmediateCap: collateralPoolImmediateCap.toString(),
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
        // Guard against StabilityPool MIN_TOTAL_ASSET_SUPPLY floor causing 0-withdraw "success" txs
        if (withdrawalMethods.collateralPool === "immediate") {
          if (collateralPoolImmediateCap === 0n) {
            throw new Error(
              "Early withdraw is temporarily unavailable: the pool is at its minimum total supply. Use Request (free) or wait for TVL to increase."
            );
          }
          if (collateralAmount > collateralPoolImmediateCap) {
            throw new Error(
              `Early withdraw capped by pool minimum supply. Max withdrawable now: ${formatEther(
                collateralPoolImmediateCap
              )} ${peggedTokenSymbol}`
            );
          }
        }
        totalPeggedTokens += collateralAmount;
      }

      // Validate request-withdraw selections (requestWithdrawal has no amount, but user must have a deposit)
      if (
        selectedPositions.collateralPool &&
        withdrawalMethods.collateralPool === "request"
      ) {
        if (!collateralPoolAddress) {
          throw new Error("Collateral pool not configured for this market");
        }
        if (collateralPoolBalance === 0n) {
          throw new Error("No collateral pool deposit found to request withdrawal");
        }
      }
      if (selectedPositions.sailPool && withdrawalMethods.sailPool === "request") {
        if (!sailPoolAddress) {
          throw new Error("Sail pool not configured for this market");
        }
        if (sailPoolBalance === 0n) {
          throw new Error("No sail pool deposit found to request withdrawal");
        }
      }

      // Validate sail pool amount
      if (sailAmount > 0n) {
        console.log("[handleWithdrawExecution] Validating sail pool amount:", {
          sailAmount: sailAmount.toString(),
          sailPoolBalance: sailPoolBalance.toString(),
          sailPoolImmediateCap: sailPoolImmediateCap.toString(),
          sailPoolAddress,
        });
        if (sailAmount > sailPoolBalance) {
          throw new Error(
            `Insufficient balance in sail pool. Have: ${formatEther(
              sailPoolBalance
            )}, Want: ${formatEther(sailAmount)}`
          );
        }
        // Guard against StabilityPool MIN_TOTAL_ASSET_SUPPLY floor causing 0-withdraw "success" txs
        if (withdrawalMethods.sailPool === "immediate") {
          if (sailPoolImmediateCap === 0n) {
            throw new Error(
              "Early withdraw is temporarily unavailable: the pool is at its minimum total supply. Use Request (free) or wait for TVL to increase."
            );
          }
          if (sailAmount > sailPoolImmediateCap) {
            throw new Error(
              `Early withdraw capped by pool minimum supply. Max withdrawable now: ${formatEther(
                sailPoolImmediateCap
              )} ${peggedTokenSymbol}`
            );
          }
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

      const txClient = false ? publicClient : publicClient;
      // If we plan to redeem, snapshot wallet balance BEFORE any pool withdrawals so we can compute
      // what actually arrived from pools (fees/rounding can reduce received amount).
      if (shouldAutoRedeem && txClient) {
        try {
          walletBalBeforeForDelta =
            ((await txClient.readContract({
              address: peggedTokenAddress as `0x${string}`,
              abi: ERC20_ABI,
              functionName: "balanceOf",
              args: [address as `0x${string}`],
            })) as bigint) || 0n;
        } catch {
          walletBalBeforeForDelta = 0n;
        }
      }

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
        const method = withdrawalMethods.collateralPool;
        const withdrawFromCollateral = collateralAmount;

          console.log("[handleWithdrawExecution] Collateral pool withdrawal:", {
            method,
          amount:
            method === "request"
              ? "(requestWithdrawal)"
              : withdrawFromCollateral.toString(),
            poolAddress: collateralPoolAddress,
            userAddress: address,
          });

          if (method === "request") {
          // Request withdrawal - starts the fee-free window (no amount parameters)
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
        } else if (withdrawFromCollateral > 0n) {
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

      // Withdraw from sail pool if selected
      if (
        selectedPositions.sailPool &&
        sailPoolAddress &&
        (withdrawalMethods.sailPool === "request" || positionAmounts.sailPool)
      ) {
        const sailMethod = withdrawalMethods.sailPool;
        const withdrawFromSail = sailAmount;

          console.log("[handleWithdrawExecution] Sail pool withdrawal:", {
            method: sailMethod,
          amount:
            sailMethod === "request"
              ? "(requestWithdrawal)"
              : withdrawFromSail.toString(),
            poolAddress: sailPoolAddress,
            userAddress: address,
          });

          if (sailMethod === "request") {
          // Request withdrawal - starts the fee-free window (no amount parameters)
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
        } else if (withdrawFromSail > 0n) {
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

      // Redeem pegged tokens for collateral (default behavior unless "Withdraw only" is checked).
      // IMPORTANT: We must redeem an amount that is actually in-wallet *after* pool withdrawals
      // to avoid wallet simulation failures due to temporarily insufficient balance/allowance.
      if (shouldAutoRedeem) {
        const client = false ? publicClient : publicClient;
        if (!client) throw new Error("No client available for contract reads");

        // NOTE: wallet tokens are already in-wallet. Pool withdrawals should increase wallet balance.
        // We already computed walletAmount above as the amount the user selected to redeem from wallet.
        // After withdrawals, compute the *delta* and redeem walletAmount + delta.
        const walletBalAfter = ((await client.readContract({
          address: peggedTokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [address as `0x${string}`],
        })) as bigint) || 0n;

        const deltaFromPools =
          walletBalAfter > walletBalBeforeForDelta
            ? walletBalAfter - walletBalBeforeForDelta
            : 0n;
        let redeemAmount = walletAmount + deltaFromPools;

        // Clamp to current wallet balance to avoid any race/rounding/fee surprises.
        if (redeemAmount > walletBalAfter) redeemAmount = walletBalAfter;

        if (process.env.NODE_ENV === "development") {
          console.log("[handleWithdrawExecution] Redeem amount computed (post-withdraw):", {
            walletBalBefore: walletBalBeforeForDelta.toString(),
            walletBalAfter: walletBalAfter.toString(),
            walletAmount: walletAmount.toString(),
            deltaFromPools: deltaFromPools.toString(),
            redeemAmount: redeemAmount.toString(),
          });
        }

        if (redeemAmount > 0n) {
          // Step 1: Check/approve pegged token for minter (if needed)
        let currentAllowance = 0n;
        try {
          currentAllowance =
            ((await client.readContract({
              address: peggedTokenAddress as `0x${string}`,
              abi: ERC20_ABI,
              functionName: "allowance",
                args: [
                  address as `0x${string}`,
                  minterAddress as `0x${string}`,
                ],
            })) as bigint) || 0n;
        } catch (allowErr) {
          console.warn(
            "[handleWithdrawExecution] Allowance read failed, assuming 0",
            allowErr
          );
          currentAllowance = 0n;
        }

          const needsApproval = redeemAmount > currentAllowance;
        console.log("[handleWithdrawExecution] Redeem approval check:", {
            redeemAmount: redeemAmount.toString(),
          currentAllowance: currentAllowance.toString(),
          needsApproval,
        });

        if (needsApproval) {
          setStep("approving");
          setError(null);
          setTxHash(null);

          const approveHash = await writeContractAsync({
            address: peggedTokenAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "approve",
              args: [minterAddress as `0x${string}`, redeemAmount],
          });
          setTxHash(approveHash);
          setTxHashes((prev) => ({ ...prev, approveRedeem: approveHash }));
          await client.waitForTransactionReceipt({ hash: approveHash });
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // Step 2: Redeem pegged tokens
        setStep("redeeming");
        setError(null);
        setTxHash(null);

          let minCollateralOut = 0n;
        try {
          const freshDryRunResult = (await client.readContract({
            address: minterAddress as `0x${string}`,
            abi: minterABI,
            functionName: "redeemPeggedTokenDryRun",
              args: [redeemAmount],
            })) as [bigint, bigint, bigint, bigint, bigint, bigint, bigint] | undefined;

            if (freshDryRunResult && Array.isArray(freshDryRunResult) && freshDryRunResult.length >= 5) {
            const wrappedCollateralReturned = freshDryRunResult[4];
            minCollateralOut = (wrappedCollateralReturned * 99n) / 100n;
            }
          } catch {}

        let redeemHash: `0x${string}` | undefined;
        try {
          redeemHash = await writeContractAsync({
            address: minterAddress as `0x${string}`,
            abi: minterABI,
            functionName: "redeemPeggedToken",
              args: [redeemAmount, address as `0x${string}`, minCollateralOut],
          });
        } catch (redeemErr: any) {
          console.warn(
            "[handleWithdrawExecution] redeemPeggedToken reverted with minCollateralOut, retrying with 0",
            redeemErr
          );
          redeemHash = await writeContractAsync({
            address: minterAddress as `0x${string}`,
            abi: minterABI,
            functionName: "redeemPeggedToken",
              args: [redeemAmount, address as `0x${string}`, 0n],
          });
        }

        setTxHash(redeemHash);
        setTxHashes((prev) => ({ ...prev, redeem: redeemHash }));
        await client.waitForTransactionReceipt({ hash: redeemHash });
        }
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
    // Ensure correct network before starting transaction (auto-attempt switch)
    if (!(await ensureCorrectNetwork())) return;
    // Clear any stale hashes from previous runs so the progress UI starts fresh
    setTxHashes({});
    if (!address) return;

    // Use the minter address for the selected redeem asset
    const targetMinterAddress = redeemMinterAddress || minterAddress;
    if (!targetMinterAddress) return;

    // Get the pegged token address for the selected redeem market
    const targetPeggedTokenAddress =
      selectedRedeemMarket?.market?.addresses?.peggedToken ||
      peggedTokenAddress;
    if (!targetPeggedTokenAddress) return;

    // Redeem mode uses the withdraw-position input (wallet) rather than the shared `amount` field.
    const redeemAmount = redeemInputAmount;
    if (!redeemAmount || redeemAmount <= 0n) {
      setError("Please enter a valid amount to redeem");
      setStep("error");
      return;
    }
    // Redeeming requires the ha tokens to already be in-wallet.
    if (redeemAmount > peggedBalance) {
      setError("Insufficient ha token balance in wallet");
      setStep("error");
      return;
    }

    try {
      // Check if we need to approve pegged token for minter (explicit RPC read, Anvil-aware)
      let currentAllowance = peggedTokenMinterAllowanceData || 0n;
      try {
        const client = false ? publicClient : publicClient;
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
      // Show progress modal for transaction feedback
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
        // Retry once with minCollateralOut=0 to bypass slippage floor and surface real issues.
        if (minCollateralOut > 0n) {
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

      // Check for user rejection first (most common case)
      const errMessage = err instanceof Error ? err.message : String(err);
      const errShortMessage = err instanceof BaseError ? err.shortMessage : "";
      const lowerMessage = (errMessage + " " + errShortMessage).toLowerCase();
      
      if (lowerMessage.includes("user rejected") || lowerMessage.includes("user denied") || lowerMessage.includes("rejected the request") || err?.name === "UserRejectedRequestError") {
        errorMessage = "Transaction cancelled";
      } else if (err instanceof BaseError) {
        const revertError = err.walk(
          (err) => err instanceof ContractFunctionRevertedError
        );
        if (revertError instanceof ContractFunctionRevertedError) {
          errorMessage = revertError.reason || revertError.data?.errorName || "Transaction failed";
        } else {
          // Extract concise error message
          const msg = err.message || err.shortMessage || "Transaction failed";
          errorMessage = msg.replace(/^[^:]+:\s*/i, "").replace(/\s*\([^)]+\)$/, "") || "Transaction failed";
        }
      } else if (err instanceof Error) {
        errorMessage = err.message.replace(/^[^:]+:\s*/i, "").replace(/\s*\([^)]+\)$/, "") || "Transaction failed";
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
      // Withdrawal method is selected inline - go directly to execution
        handleWithdrawExecution();
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
      // Check if fee is excessively high (>50% means you'd lose more than half your deposit)
      const hasExcessiveFee = feePercentage !== undefined && feePercentage > 50;
      
      return (
        step === "approving" ||
        step === "minting" ||
        step === "depositing" ||
        !amount ||
        parseFloat(amount) <= 0 ||
        hasExcessiveFee
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
      : activeTab === "withdraw" && !withdrawOnly
      ? expectedRedeemOutput
      : undefined;
  const outputSymbol =
    activeTab === "deposit"
      ? peggedTokenSymbol // Always use selected market's pegged token
      : activeTab === "withdraw" && !withdrawOnly
      ? selectedRedeemAsset || collateralSymbol
      : undefined;

  if (!isOpen) return null;

  // Check if any request withdrawals were made
  const hasRequestWithdrawals =
    (selectedPositions.collateralPool &&
      withdrawalMethods.collateralPool === "request") ||
    (selectedPositions.sailPool && withdrawalMethods.sailPool === "request");

  return (
    <>
      {/* Progress Modal for transaction feedback */}
      {showProgressModal && (
        <TransactionProgressModal
          isOpen={showProgressModal}
          onClose={handleProgressClose}
          title={progressConfig.title || "Processing Transaction"}
          steps={progressSteps}
          currentStepIndex={currentProgressIndex}
          canCancel={false}
          errorMessage={
            error || undefined
          }
          onRetry={
            shouldShowNetworkSwitch || (error?.toLowerCase().includes("switch") || error?.toLowerCase().includes("mainnet"))
              ? handleSwitchNetwork
              : handleProgressRetry
          }
          retryButtonLabel={
            shouldShowNetworkSwitch || (error?.toLowerCase().includes("switch") || error?.toLowerCase().includes("mainnet"))
              ? "Switch Network"
              : "Try Again"
          }
        />
      )}

      {/* Main Modal - hide when progress modal is showing */}
      {!showProgressModal && isOpen && (
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
                        {(() => {
                          const nativeAssets = depositAssetsForDropdown.filter(a => !a.isUserToken);
                          const userTokens = depositAssetsForDropdown.filter(a => a.isUserToken);
                          
                          const tokenGroups = [
                            ...(nativeAssets.length > 0 ? [{
                              label: "Supported Assets",
                              tokens: nativeAssets.map((asset) => ({
                                symbol: asset.symbol,
                                name: asset.name,
                                isUserToken: false,
                              })),
                            }] : []),
                            ...(userTokens.length > 0 ? [{
                              label: "Other Tokens (via Swap)",
                              tokens: userTokens.map((asset) => ({
                                symbol: asset.symbol,
                                name: asset.name,
                                isUserToken: true,
                              })),
                            }] : []),
                          ];
                          
                          return (
                            <TokenSelectorDropdown
                          value={selectedDepositAsset}
                              onChange={(newAsset) => {
                            setSelectedDepositAsset(newAsset);
                            anyTokenDeposit.setSelectedAsset(newAsset); // Sync with hook
                            setAmount(""); // Reset amount when changing asset
                            setError(null); // Clear any errors
                            // Clear temp warning when changing asset
                            if (tempMaxWarning) {
                              setTempMaxWarning(null);
                              if (tempWarningTimerRef.current) {
                                clearTimeout(tempWarningTimerRef.current);
                                tempWarningTimerRef.current = null;
                              }
                            }
                          }}
                              options={tokenGroups}
                          disabled={isProcessing}
                              placeholder="Select Deposit Token"
                            />
                            );
                          })()}
                        {/* Swap info for "any token" deposits */}
                        {anyTokenDeposit.needsSwap && selectedDepositAsset && amount && parseFloat(amount) > 0 && (() => {
                          const isSwappingToUSDC = anyTokenDeposit.swapTargetToken !== "ETH";
                          const targetToken = isSwappingToUSDC ? "USDC" : "ETH";
                          const targetDecimals = isSwappingToUSDC ? 2 : 6;
                          
                          // ParaSwap returns toAmount in smallest units, need to convert to decimal
                          const toAmountDecimals = isSwappingToUSDC ? 6 : 18; // USDC=6, ETH=18
                          const toAmountFormatted = anyTokenDeposit.swapQuote 
                            ? (parseFloat(anyTokenDeposit.swapQuote.toAmount) / (10 ** toAmountDecimals)).toFixed(targetDecimals)
                            : "0";
                          
                          return (
                            <div className="mt-2 text-xs text-[#1E4775]/50 italic">
                              {anyTokenDeposit.isLoadingSwapQuote ? (
                                <>
                                  {parseFloat(amount).toFixed(6)} {selectedDepositAsset} → Calculating swap... → {activeWrappedCollateralSymbol}
                                </>
                              ) : anyTokenDeposit.swapQuote ? (
                                <>
                                  {parseFloat(amount).toFixed(6)} {selectedDepositAsset} → {toAmountFormatted} {targetToken} → {activeWrappedCollateralSymbol}
                                </>
                              ) : null}
                            </div>
                          );
                        })()}
                        {selectedDepositAsset &&
                          !anyTokenDeposit.needsSwap &&
                          selectedDepositAsset !== activeCollateralSymbol &&
                          selectedDepositAsset !==
                            activeWrappedCollateralSymbol &&
                          !isDirectPeggedDeposit && (
                            <p className="mt-2 text-xs text-[#1E4775]/60 flex items-center gap-1">
                              <span>ℹ️</span>
                              <span>
                                This will be converted to{" "}
                                {activeWrappedCollateralSymbol} on deposit
                              </span>
                            </p>
                          )}
                        {isDirectPeggedDeposit && (
                          <p className="mt-2 text-xs text-[#1E4775]/60 flex items-center gap-1">
                            <span>ℹ️</span>
                            <span>
                              Depositing{" "}
                              {marketForDepositAsset?.peggedToken?.symbol ||
                                "ha"}
                              {" "}
                              directly to stability pool. No minting required.
                            </span>
                          </p>
                        )}
                        {/* Fee Display for Selected Deposit Token */}
                        {selectedDepositAsset &&
                          !isDirectPeggedDeposit &&
                          (() => {
                            // Use actual calculated fee if amount is entered; otherwise show feeRange (if available)
                            const displayFee =
                              amount &&
                              parseFloat(amount) > 0 &&
                              feePercentage !== undefined
                                ? feePercentage
                                : undefined;

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
                            Balance:{" "}
                            {selectedAssetBalance !== null
                              ? (isUSDC 
                                  ? formatUnits(selectedAssetBalance, 6)
                                  : formatEther(selectedAssetBalance))
                              : (isUSDC
                                  ? formatUnits(collateralBalance, 6)
                                  : formatEther(collateralBalance))}
                            {" "}
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
                          {/* Warning - always reserve space to prevent layout shift */}
                          <div className="absolute right-20 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                            {tempMaxWarning ? (
                              <div className="px-2.5 py-1 text-xs bg-[#FF8A7A]/90 border border-[#FF8A7A] text-white rounded-md font-semibold whitespace-nowrap shadow-lg animate-pulse-once">
                                ⚠️ {tempMaxWarning}
                              </div>
                            ) : (
                              <div className="px-2.5 py-1 text-xs invisible whitespace-nowrap">
                                {/* Invisible placeholder to reserve space */}
                                ⚠️ Max: 0.0000
                              </div>
                            )}
                          </div>
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

                      {/* Mint Only Checkbox - Only show in Step 1, below amount input, and only if not depositing haToken directly */}
                      {currentStep === 1 && !isDirectPeggedDeposit && (
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

                      {/* Swap Preview - show when using any token deposit (always visible when swap asset is selected) */}
                      {anyTokenDeposit.needsSwap && (() => {
                        const targetToken = anyTokenDeposit.swapTargetToken === "ETH" ? "ETH" : "USDC";
                        const targetDecimals = targetToken === "USDC" ? 6 : 18;
                        const toAmountFormatted = anyTokenDeposit.swapQuote && anyTokenDeposit.swapQuote.toAmount > 0n
                          ? Number(anyTokenDeposit.swapQuote.toAmount) / (10 ** targetDecimals)
                          : 0;
                        
                        return (
                          <div className="p-2 bg-blue-50 border border-blue-200 space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-blue-700">Swap via ParaSwap:</span>
                              <span className="font-mono text-blue-900">
                                {toAmountFormatted > 0 
                                  ? `${toAmountFormatted.toFixed(targetDecimals === 6 ? 2 : 6)} ${targetToken}`
                                  : `0.${'0'.repeat(targetDecimals === 6 ? 2 : 6)} ${targetToken}`}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-blue-700">Slippage Tolerance:</span>
                              {showSlippageInput ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={slippageInputValue}
                                    onChange={(e) => {
                                      const input = e.target.value;
                                      // Allow empty, numbers, and decimal point
                                      if (input === "" || /^\d*\.?\d*$/.test(input)) {
                                        setSlippageInputValue(input);
                                      }
                                    }}
                                    onBlur={() => {
                                      const val = parseFloat(slippageInputValue);
                                      if (!isNaN(val) && val >= 0.1 && val <= 50) {
                                        setSlippageTolerance(val);
                                      } else {
                                        // Reset to current valid value if invalid
                                        setSlippageInputValue(slippageTolerance.toFixed(1));
                                      }
                                      setShowSlippageInput(false);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        const val = parseFloat(slippageInputValue);
                                        if (!isNaN(val) && val >= 0.1 && val <= 50) {
                                          setSlippageTolerance(val);
                                        } else {
                                          setSlippageInputValue(slippageTolerance.toFixed(1));
                                        }
                                        setShowSlippageInput(false);
                                      } else if (e.key === 'Escape') {
                                        setSlippageInputValue(slippageTolerance.toFixed(1));
                                        setShowSlippageInput(false);
                                      }
                                    }}
                                    autoFocus
                                    className="w-16 px-1 py-0.5 text-right font-mono text-blue-900 border border-blue-300 focus:outline-none focus:border-blue-500"
                                  />
                                  <span className="text-blue-900">%</span>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSlippageInputValue(slippageTolerance.toFixed(1));
                                    setShowSlippageInput(true);
                                  }}
                                  className="font-mono text-blue-900 hover:text-blue-600 underline decoration-dotted cursor-pointer"
                                >
                                  {slippageTolerance.toFixed(1)}%
                                </button>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-blue-700">ParaSwap Fee:</span>
                              <span className="font-mono text-blue-700">
                                {anyTokenDeposit.swapQuote?.fee ? anyTokenDeposit.swapQuote.fee.toFixed(2) : "0.00"}%
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Expected Output Preview - always show for all non-direct pegged deposits, even if 0 */}
                      {!isDirectPeggedDeposit && (
                        <div className="bg-[rgb(var(--surface-selected-rgb))]/30 border border-[rgb(var(--surface-selected-border-rgb))]/50 p-2.5">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-[#1E4775]/70">
                              You will receive:
                            </span>
                            <span className="text-xl font-bold text-[#1E4775] font-mono">
                              {expectedMintOutput && amount && parseFloat(amount) > 0
                                ? Number(formatEther(expectedMintOutput)).toFixed(6)
                                : "0.000000"}
                              {" "}
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
                                {parseFloat(amount).toFixed(6)}
                                {" "}
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
                        <TokenSelectorDropdown
                          value={selectedRewardToken || ""}
                          onChange={(token) => {
                            const selectedToken = token || null;
                            setSelectedRewardToken(selectedToken);
                            if (selectedToken) {
                              setSelectedStabilityPool(null);
                              setDepositInStabilityPool(false);
                            }
                          }}
                          options={rewardTokenOptions.map(({ token, maxAPR }) => ({
                            symbol: token,
                            name: token,
                            // Show APR in the description/subtitle area
                            description: maxAPR !== undefined && !isNaN(maxAPR)
                              ? `up to ${formatAPR(maxAPR)} APR`
                              : undefined,
                          }))}
                          disabled={isProcessing}
                          placeholder="Select a reward token"
                        />
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
                                      // Don't change selectedMarketId here - it should remain tied to the deposit asset from Step 1
                                      // selectedMarketId is for minting, selectedStabilityPool.marketId is for the pool destination
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
                                                A{" "}
                                                {pool.poolType === "collateral"
                                                  ? "collateral"
                                                  : "sail"}
                                                {" "}
                                                pool holds anchor tokens (ha
                                                tokens) and provides stability
                                                to the market.
                                              </p>
                                              <p>
                                                <span className="font-medium">
                                                  Rewards:
                                                </span>
                                                {" "}
                                                By depositing in this pool, you
                                                earn rewards for providing
                                                liquidity for rebalances.
                                              </p>
                                              <p>
                                                <span className="font-medium">
                                                  Rebalancing:
                                                </span>
                                                {" "}
                                                When the market reaches its
                                                minimum collateral ratio, it
                                                rebalances by converting your
                                                anchor tokens to{" "}
                                                {pool.poolType === "collateral"
                                                  ? "market collateral"
                                                  : "sail tokens (hs tokens)"}
                                                {" "}
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
                                      <div>
                                        <span className="text-[#1E4775]/60">
                                          TVL:
                                        </span>
                                        <span className="text-[#1E4775] font-medium font-mono ml-1 truncate inline-block max-w-[120px] align-bottom">
                                          {pool.tvl !== undefined &&
                                          peggedTokenPrice !== undefined &&
                                          (peggedTokenPrice as bigint) > 0n &&
                                          pegTargetUsdWei > 0n
                                            ? formatUsd18(
                                                (pool.tvl *
                                                  (peggedTokenPrice as bigint) *
                                                  pegTargetUsdWei) /
                                                  10n ** 36n
                                              )
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
                                      ? directPeggedDepositUSD > 0
                                        ? `$${directPeggedDepositUSD.toLocaleString(
                                          undefined,
                                          {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          }
                                        )}`
                                        : "..."
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
                                  {" "}
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

                        {/* Deposit Limit Warning */}
                        {depositLimitWarning && (
                          <div className="mt-2 p-2 border text-xs bg-yellow-50 border-yellow-300 text-yellow-800">
                            <div className="font-semibold mb-1">ℹ️ Deposit amount adjusted</div>
                            <div>{depositLimitWarning}</div>
                          </div>
                        )}

                        {/* Fee Warning */}
                        {!depositLimitWarning && feePercentage !== undefined && feePercentage > 2 && (
                          <div className={`mt-2 p-2 border text-xs ${
                            feePercentage > 50
                              ? "bg-red-100 border-red-400 text-red-800" 
                              : "bg-red-50 border-red-200 text-red-700"
                          }`}>
                            {feePercentage > 50 ? (
                              <>
                                <div className="font-semibold mb-1">🚫 Deposit amount too large</div>
                                <div>
                                  This deposit would bring the collateral ratio too low, resulting in a {feePercentage.toFixed(1)}% fee. 
                                  Please reduce your deposit amount to continue.
                                </div>
                              </>
                            ) : (
                              <>
                                ⚠️ High fee warning: Fees above 2% may significantly impact your returns
                              </>
                            )}
                          </div>
                        )}


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
                                {" "}
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
                          {/* Deposit Limit Warning */}
                          {depositLimitWarning && (
                            <div className="mt-2 p-2 border text-xs bg-yellow-50 border-yellow-300 text-yellow-800">
                              <div className="font-semibold mb-1">ℹ️ Deposit amount adjusted</div>
                              <div>{depositLimitWarning}</div>
                            </div>
                          )}

                          {/* Fee Warning */}
                          {!depositLimitWarning && feePercentage !== undefined && feePercentage > 2 && (
                            <div className={`mt-2 p-2 border text-xs ${
                              feePercentage > 50
                                ? "bg-red-100 border-red-400 text-red-800" 
                                : "bg-red-50 border-red-200 text-red-700"
                            }`}>
                              {feePercentage > 50 ? (
                                <>
                                  <div className="font-semibold mb-1">🚫 Deposit amount too large</div>
                                  <div>
                                    This deposit would bring the collateral ratio too low, resulting in a {feePercentage.toFixed(1)}% fee. 
                                    Please reduce your deposit amount to continue.
                                  </div>
                                </>
                              ) : (
                                <>
                                  ⚠️ High fee warning: Fees above 2% may significantly impact your returns
                                </>
                              )}
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

                {/* Withdraw Options - Only for Withdraw Tab */}
                {activeTab === "withdraw" && (
                  <div className="flex items-center gap-4 pt-2 border-t border-[#1E4775]/10 mb-3">
                    <div className="flex-1">
                      <div className="p-2 bg-[#17395F]/5 border border-[#17395F]/20 text-xs text-[#1E4775]/80 flex items-start justify-between gap-3">
                        <span>
                          Select positions to withdraw. If you include wallet tokens and/or do immediate pool withdrawals,
                          we will automatically redeem the resulting ha tokens to collateral.
                        </span>
                      </div>
                      <label className="mt-2 flex items-center gap-2 text-xs text-[#1E4775]/80">
                        <input
                          type="checkbox"
                          checked={withdrawOnly}
                          onChange={(e) => setWithdrawOnly(e.target.checked)}
                          disabled={isProcessing}
                          className="w-4 h-4 text-[#1E4775] border-[#1E4775]/30 focus:ring-2 focus:ring-[#1E4775]/20 focus:ring-offset-0 cursor-pointer disabled:opacity-50"
                        />
                        Withdraw only (do not redeem to collateral)
                      </label>
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

                    {/* Stability pool positions (inline withdraw controls per pool row) */}
                    {(() => {
                      const poolRows: Array<{
                        key: string;
                        marketId: string;
                        market: any;
                        poolType: "collateral" | "sail";
                        balance: bigint;
                      }> =
                        marketsForToken.length > 1
                          ? groupedPoolPositions.map((p) => ({
                              key: p.key,
                              marketId: p.marketId,
                              market: p.market,
                              poolType: p.poolType,
                              balance: p.balance,
                            }))
                          : [
                              ...(selectedMarket?.addresses
                                ?.stabilityPoolCollateral &&
                              collateralPoolBalance > 0n
                                ? [
                                    {
                                      key: `${selectedMarketId}-collateral`,
                                      marketId: selectedMarketId,
                                      market: selectedMarket,
                                      poolType: "collateral" as const,
                                      balance: collateralPoolBalance,
                                    },
                                  ]
                                : []),
                              ...(selectedMarket?.addresses
                                ?.stabilityPoolLeveraged &&
                              sailPoolBalance > 0n
                                ? [
                                    {
                                      key: `${selectedMarketId}-sail`,
                                      marketId: selectedMarketId,
                                      market: selectedMarket,
                                      poolType: "sail" as const,
                                      balance: sailPoolBalance,
                                    },
                                  ]
                                : []),
                            ];

                      if (poolRows.length === 0) return null;

                      return (
                      <div className="p-3 bg-[#17395F]/5 border border-[#17395F]/20">
                          <div className="text-xs font-semibold text-[#1E4775] mb-2">
                            Your stability pool positions
                          </div>

                          <div className="space-y-2">
                            {poolRows.map((p) => {
                              const marketLabel =
                                p.market?.collateral?.symbol || p.marketId;
                              const poolLabel =
                                p.poolType === "collateral"
                                  ? "Collateral Pool"
                                  : "Sail Pool";
                              const isSelected =
                                p.marketId === selectedMarketId &&
                                ((p.poolType === "collateral" &&
                                  selectedPositions.collateralPool) ||
                                  (p.poolType === "sail" &&
                                    selectedPositions.sailPool));

                              const modeKey =
                                p.poolType === "collateral"
                                  ? "collateralPool"
                                  : "sailPool";
                              const isImmediate =
                                (p.poolType === "collateral"
                                  ? withdrawalMethods.collateralPool
                                  : withdrawalMethods.sailPool) === "immediate";
                              const request =
                                p.poolType === "collateral"
                                  ? collateralPoolRequest
                                  : sailPoolRequest;
                              const window =
                                p.poolType === "collateral"
                                  ? collateralPoolWindow
                                  : sailPoolWindow;
                              const feePercent =
                                p.poolType === "collateral"
                                  ? collateralPoolFeePercent
                                  : sailPoolFeePercent;
                              const immediateCap =
                                p.poolType === "collateral"
                                  ? collateralPoolImmediateCap
                                  : sailPoolImmediateCap;
                              const exceeds =
                                p.poolType === "collateral"
                                  ? positionExceedsBalance.collateralPool
                                  : positionExceedsBalance.sailPool;
                              const amountValue =
                                p.poolType === "collateral"
                                  ? positionAmounts.collateralPool
                                  : positionAmounts.sailPool;

                              return (
                                <div
                                  key={p.key}
                                  className={`bg-white border ${
                                    isSelected
                                      ? "border-[#1E4775]"
                                      : "border-[#1E4775]/20"
                                  }`}
                                >
                                  <div className="flex items-center justify-between px-3 py-2">
                                    <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                                        checked={isSelected}
                              onChange={(e) => {
                                          const checked = e.target.checked;

                                          // Switching markets: reset to only the selected pool
                                          const switchingMarket =
                                            p.marketId !== selectedMarketId;
                                          if (switchingMarket) {
                                            setSelectedMarketId(p.marketId);
                                setSelectedPositions((prev) => ({
                                  ...prev,
                                              collateralPool:
                                                checked &&
                                                p.poolType === "collateral",
                                              sailPool:
                                                checked && p.poolType === "sail",
                                            }));
                                            setWithdrawFromCollateralPool(
                                              checked &&
                                                p.poolType === "collateral"
                                            );
                                            setWithdrawFromSailPool(
                                              checked && p.poolType === "sail"
                                            );
                                  setPositionAmounts((prev) => ({
                                    ...prev,
                                              collateralPool: "",
                                              sailPool: "",
                                            }));
                                            setWithdrawalMethods((prev) => ({
                                  ...prev,
                                              collateralPool: "immediate",
                                              sailPool: "immediate",
                                            }));
                                            return;
                                          }

                                          // Same market: toggle this pool only
                                          if (p.poolType === "collateral") {
                                  setSelectedPositions((prev) => ({
                                    ...prev,
                                              collateralPool: checked,
                                            }));
                                            setWithdrawFromCollateralPool(checked);
                                            if (!checked) {
                                    setPositionAmounts((prev) => ({
                                      ...prev,
                                      collateralPool: "",
                                    }));
                                            }
                                          } else {
                                            setSelectedPositions((prev) => ({
                                              ...prev,
                                              sailPool: checked,
                                            }));
                                            setWithdrawFromSailPool(checked);
                                            if (!checked) {
                                              setPositionAmounts((prev) => ({
                                                ...prev,
                                                sailPool: "",
                                              }));
                                            }
                                  }
                                }}
                                disabled={isProcessing}
                                className="w-5 h-5 text-[#1E4775] border-[#1E4775]/30 focus:ring-2 focus:ring-[#1E4775]/20 focus:ring-offset-0 cursor-pointer disabled:opacity-50"
                              />
                                      <div className="min-w-0">
                                        <div className="text-sm font-medium text-[#1E4775] truncate">
                                          {poolLabel}{" "}
                                          <span className="text-[#1E4775]/50">
                                            ({marketLabel})
                              </span>
                            </div>
                                      </div>
                                    </div>
                                    <div className="text-sm text-[#1E4775]/70 font-mono flex-shrink-0">
                                      {formatTokenAmount18(p.balance)}{" "}
                              {peggedTokenSymbol}
                            </div>
                          </div>

                                  {isSelected && (
                                    <div className="px-3 pb-3">
                              {/* Withdrawal Method Toggle */}
                              <div className="flex items-center bg-[#17395F]/10 p-1 mb-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setWithdrawalMethods((prev) => ({
                                      ...prev,
                                              [modeKey]: "immediate",
                                    }))
                                  }
                                  disabled={isProcessing}
                                  className={`flex-1 px-3 py-1.5 text-xs font-medium transition-all ${
                                            isImmediate
                                      ? "bg-[#1E4775] text-white shadow-sm"
                                      : "text-[#1E4775]/70 hover:text-[#1E4775]"
                                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                  Early Withdraw
                                          {(() => {
                                            const display = getFeeFreeDisplay(
                                              request,
                                              feePercent
                                            );
                                            return ` (${display})`;
                                          })()}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setWithdrawalMethods((prev) => ({
                                      ...prev,
                                              [modeKey]: "request",
                                    }))
                                  }
                                  disabled={isProcessing}
                                  className={`flex-1 px-3 py-1.5 text-xs font-medium transition-all ${
                                            !isImmediate
                                      ? "bg-[#1E4775] text-white shadow-sm"
                                      : "text-[#1E4775]/70 hover:text-[#1E4775]"
                                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                          Request Withdraw
                                          {getRequestStatusText(request)}
                                </button>
                              </div>

                                      {/* Window status banner */}
                                      {(() => {
                                        const bannerInfo =
                                          getWindowBannerInfo(request, window);
                                        if (!bannerInfo) return null;

                                        if (bannerInfo.type === "coming") {
                                          return (
                                            <div className="mt-2 px-3 py-2 bg-[#FF8A7A]/20 border border-[#FF8A7A]/40 rounded text-[10px] text-[#FF8A7A] font-medium">
                                              {bannerInfo.message}
                                            </div>
                                          );
                                        }
                                        if (bannerInfo.type === "open") {
                                          return (
                                            <div className="mt-2 px-3 py-2 bg-[#7FD4C0]/20 border border-[#7FD4C0]/40 rounded text-[10px] text-[#7FD4C0] font-medium">
                                              {bannerInfo.message}
                                            </div>
                                          );
                                        }
                                        return null;
                                      })()}

                              {/* Amount input - only show for immediate withdrawals */}
                                      {isImmediate && (
                                <div className="relative mt-2">
                                  <input
                                    type="text"
                                            value={amountValue}
                                    onChange={(e) =>
                                      handlePositionAmountChange(
                                                modeKey as any,
                                        e.target.value,
                                                immediateCap
                                      )
                                    }
                                    placeholder="0.0"
                                    className={`w-full h-10 px-3 pr-16 bg-white text-[#1E4775] border focus:ring-2 focus:outline-none text-sm font-mono ${
                                              exceeds
                                        ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                                        : "border-[#1E4775]/30 focus:border-[#1E4775] focus:ring-[#1E4775]/20"
                                    }`}
                                    disabled={isProcessing}
                                  />
                                  <button
                                    onClick={() => {
                                      setPositionAmounts((prev) => ({
                                        ...prev,
                                                [modeKey]: formatEther(
                                                  immediateCap
                                        ),
                                      }));
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-[#FF8A7A] hover:bg-[#FF6B5A] text-white transition-colors disabled:bg-gray-300 disabled:text-gray-500 rounded-full"
                                            disabled={
                                              isProcessing || immediateCap === 0n
                                            }
                                  >
                                    MAX
                                  </button>
                                </div>
                              )}

                                      {isImmediate && immediateCap === 0n && (
                                <p className="text-[10px] text-[#1E4775]/60 mt-1">
                                          Early withdraw is temporarily unavailable:
                                          the pool is at its minimum total supply.
                                          Use Request (free) or wait for TVL to
                                          increase.
                                        </p>
                                      )}

                                      {/* Info message for request method - only show if no window banner */}
                                      {!isImmediate &&
                                        !getWindowBannerInfo(request, window) && (
                                          <p className="text-[10px] text-[#1E4775]/60 mt-1">
                                            Creates a withdrawal request. You can
                                            withdraw without a fee for{" "}
                                            {window
                                              ? formatDuration(window[1])
                                              : "..."}{" "}
                                            after a{" "}
                                            {window
                                              ? formatDuration(window[0])
                                              : "..."}{" "}
                                  delay.
                                </p>
                          )}
                        </div>
                      )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

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
                            Balance: {formatTokenAmount18(peggedBalance)}
                              {" "}
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

                    {/* Pool position controls are now rendered inline above */}

                    {/* No positions message */}
                    {((withdrawOnly &&
                      collateralPoolBalance === 0n &&
                      sailPoolBalance === 0n) ||
                      (!withdrawOnly &&
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
                {false && activeTab === "withdraw" && false && (
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
                                  {formatTokenAmount18(collateralPoolBalance)}
                                  {" "}
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
                                  {formatTokenAmount18(sailPoolBalance)}
                                  {" "}
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
                                  {Number(formatEther(
                                    redeemDryRun.netCollateralReturned || 0n
                                  )).toFixed(6)}
                                  {" "}
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
                                      {Number(formatEther(redeemDryRun.fee)).toFixed(6)} wstETH)
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
                                      % ({Number(formatEther(redeemDryRun.discount)).toFixed(6)}
                                      {" "}
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
                            {symbol} -{" "}
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
                        Balance: {formatEther(balance)}{" "}{balanceSymbol}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={amount}
                        onChange={handleAmountChange}
                        placeholder="0.0"
                        className={`w-full px-3 pr-20 py-2 bg-white text-[#1E4775] border ${
                          error ? "border-red-500" : "border-[#1E4775]/30"
                        } focus:border-[#1E4775] focus:ring-2 focus:ring-[#1E4775]/20 focus:outline-none transition-all text-lg font-mono`}
                        disabled={isProcessing}
                      />
                      {/* Warning - always reserve space to prevent layout shift */}
                      <div className="absolute right-16 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                        {tempMaxWarning ? (
                          <div className="px-2.5 py-1 text-xs bg-[#FF8A7A]/90 border border-[#FF8A7A] text-white rounded-md font-semibold whitespace-nowrap shadow-lg animate-pulse-once">
                            ⚠️ {tempMaxWarning}
                          </div>
                        ) : (
                          <div className="px-2.5 py-1 text-xs invisible whitespace-nowrap">
                            {/* Invisible placeholder to reserve space */}
                            ⚠️ Max: 0.0000
                          </div>
                        )}
                      </div>
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
                              {Number(formatEther(expectedOutput)).toFixed(6)} {outputSymbol}
                            </span>
                          </div>
                          {simpleMode &&
                            activeTab === "deposit" &&
                            depositInStabilityPool && (
                              <div className="mt-2 text-xs text-[#1E4775]/60">
                                Deposited to:{" "}
                                {bestPoolType === "collateral"
                                  ? "Collateral"
                                  : "Sail"}
                                {" "}
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
                              {Number(formatEther(
                                redeemDryRun.netCollateralReturned || 0n
                              )).toFixed(6)}
                              {" "}
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
                                      {" "}
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
                                  {Number(formatEther(redeemDryRun.fee)).toFixed(6)}
                                  {" "}
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
                                  ({Number(formatEther(redeemDryRun.discount)).toFixed(6)}
                                  {" "}
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
                        Optimized for best yield: Depositing to{" "}
                        <span className="font-semibold">
                          {bestPoolType === "collateral"
                            ? "Collateral"
                            : "Sail"}
                        </span>
                        {" "}
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
                {activeTab === "deposit" && !simpleMode && !isDirectPeggedDeposit && (
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
                                {" "}
                                converts anchor tokens to{" "}
                                <span className="font-semibold">
                                  market collateral
                                </span>
                                {" "}
                                at market rates when the market reaches its
                                minimum collateral ratio.
                              </>
                            ) : (
                              <>
                                <span className="font-semibold">
                                  Sail stability pool
                                </span>
                                {" "}
                                converts anchor tokens to{" "}
                                <span className="font-semibold">
                                  Sail tokens
                                </span>
                                {" "}
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
                            {" "}
                            converts anchor tokens to{" "}
                            <span className="font-semibold">
                              market collateral
                            </span>
                            {" "}
                            at market rates when the market reaches its minimum
                            collateral ratio.
                          </>
                        ) : (
                          <>
                            <span className="font-semibold">
                              Sail stability pool
                            </span>
                            {" "}
                            converts anchor tokens to{" "}
                            <span className="font-semibold">Sail tokens</span>
                            {" "}
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
                  <div className="p-3 bg-[rgb(var(--surface-selected-rgb))]/20 border border-[rgb(var(--surface-selected-border-rgb))]/30 text-[#1E4775] text-sm text-center">
                    ✅{" "}
                    {activeTab === "deposit"
                      ? "Mint"
                      : activeTab === "withdraw"
                      ? "Withdraw"
                      : "Redeem"}
                    {" "}
                    successful!
                  </div>
                )}
              </>
            )}
          </div>

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
      )}
    </>
  );
};
