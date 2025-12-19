import React, { useState, useEffect, useCallback, useMemo } from "react";
import { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import { Georama } from "next/font/google";
import clsx from "clsx";
import { formatEther, parseEther } from "viem";
import {
  useAccount,
  useChainId,
  useBalance,
  useContractRead,
  useContractReads,
  useWriteContract,
  usePublicClient,
  useWalletClient,
} from "wagmi";
import { markets } from "../config/markets";
import MintRedeemStatusModal from "./MintRedeemStatusModal";
import type { Market as MarketCfg } from "../config/markets";
import { minterABI } from "@/abis/minter";
import { ERC20_ABI } from "@/abis/shared";
import { MINTER_ETH_ZAP_V2_ABI, MINTER_USDC_ZAP_V2_ABI } from "@/config/contracts";
import { parseUnits } from "viem";

// Constants (to be moved from page.tsx)
const tokens = {
  LONG: ["haUSD", "longBTC", "longETH", "longTSLA", "longSP500"],
  STEAMED: [
    "hsETH",
    "hsBTC",
    "hsTSLA",
    "hsSP500",
    "hsETH-DOWN",
    "hsBTC-DOWN",
    "hsTSLA-DOWN",
    "hsSP500-DOWN",
  ],
};

// Minimal Genesis ABI to check if genesis has ended
const genesisABI = [
  {
    inputs: [],
    name: "genesisIsEnded",
    outputs: [{ type: "bool", name: "ended" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Helper Functions (to be moved from page.tsx)
const formatPercent = (value: bigint | number) => {
  if (typeof value === "bigint") value = Number(value);
  if (isNaN(value) || typeof value !== "number") return "-";
  return (value / 1e16).toFixed(2) + "%";
};
const formatEtherValue = (value: bigint | number) => {
  if (typeof value === "bigint") value = Number(value);
  if (isNaN(value) || typeof value !== "number") return "-";
  return (value / 1e18).toFixed(6);
};
const formatMinimal = (value: bigint | number) => {
  if (typeof value === "bigint") value = Number(value) / 1e18;
  if (typeof value === "string") value = Number(value);
  if (isNaN(value)) return "-";
  if (value === 0) return "0";
  return value % 1 === 0
    ? value.toString()
    : value
        .toLocaleString("en-US", { maximumFractionDigits: 6 })
        .replace(/\.?0+$/, "");
};
const formatOraclePrice = (value: bigint | number) => {
  if (typeof value === "bigint") value = Number(value);
  if (isNaN(value) || typeof value !== "number") return "-";
  return "$" + (value / 1e18).toFixed(2);
};
const formatLeverageRatio = (value: bigint | undefined) => {
  if (!value) return "-";
  if (value > BigInt("1" + "0".repeat(30))) return "-"; // Basic overflow check
  return (Number(value) / 1e18).toFixed(2) + "x";
};
const formatBalance = (balance: bigint | undefined) => {
  if (!balance) return "-";
  try {
    return Number(formatEther(balance)).toFixed(6);
  } catch {
    return "-";
  }
};
// Format fee ratio as percentage
const formatFeeRatio = (value: bigint | undefined) => {
  if (!value) return "-";
  const ratio = Number(value) / 1e18;
  return `${(ratio * 100).toFixed(2)}%`;
};
// Format a fee (positive) or discount (negative) amount in wrapped collateral units
const formatFeeToken = (value: bigint | number | undefined) => {
  if (value === undefined) return "-";
  const bi = typeof value === "bigint" ? value : BigInt(value);
  return `${formatMinimal(bi)} wstETH`;
};

type Market = {
  id: string;
  name: string;
  addresses: {
    collateralToken: string;
    peggedToken: string;
    leveragedToken: string;
    minter: string;
    priceOracle: string;
  };
};

type TokenType = "LONG" | "STEAMED";

interface MintRedeemFormProps {
  currentMarket: Market;
  isConnected: boolean;
  userAddress: string | undefined;
  marketInfo?: MarketCfg;
  selectedType: TokenType;
  // publicClient: any; // Not passing publicClient, component will get its own
}

const MintRedeemForm: React.FC<MintRedeemFormProps> = ({
  currentMarket,
  isConnected,
  userAddress,
  marketInfo,
  selectedType,
}) => {
  const [mounted, setMounted] = useState(false);
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient({ chainId });
  const publicClient = usePublicClient({ chainId });

  // State variables previously in App component, now local to MintRedeemForm
  const [isFlipped, setIsFlipped] = useState(false);
  const [isCollateralAtTop, setIsCollateralAtTop] = useState(true);
  const [inputAmount, setInputAmount] = useState<string>("");
  const [outputAmount, setOutputAmount] = useState<string>("");
  const [isPending, setIsPending] = useState(false);
  // Asset selection for zap functionality - default to wrapped collateral
  const collateralSymbol = marketInfo?.collateral?.symbol?.toLowerCase() || "";
  const isWstETHMarket = collateralSymbol === "wsteth";
  const isFxUSDMarket = collateralSymbol === "fxusd" || collateralSymbol === "fxsave";
  
  // Determine default asset based on market type
  const defaultAsset = isWstETHMarket ? "wstETH" : isFxUSDMarket ? "fxSAVE" : "collateral";
  const [selectedAsset, setSelectedAsset] = useState<string>(defaultAsset);
  
  // Get zap contract addresses from market config
  const zapAddress = selectedType === "LONG" 
    ? (marketInfo?.addresses?.peggedTokenZap as `0x${string}` | undefined)
    : (marketInfo?.addresses?.leveragedTokenZap as `0x${string}` | undefined);
  
  // Determine which zap to use and which asset
  const isNativeETH = selectedAsset.toLowerCase() === "eth";
  const isStETH = selectedAsset.toLowerCase() === "steth";
  const isUSDC = selectedAsset.toLowerCase() === "usdc";
  const isFxUSD = selectedAsset.toLowerCase() === "fxusd";
  const isWrappedCollateral = selectedAsset.toLowerCase() === collateralSymbol.toLowerCase() || 
                              (isWstETHMarket && selectedAsset.toLowerCase() === "wsteth") ||
                              (isFxUSDMarket && selectedAsset.toLowerCase() === "fxsave");
  
  const useZap = !!zapAddress && !isWrappedCollateral && isCollateralAtTop;
  const useETHZap = useZap && isWstETHMarket && (isNativeETH || isStETH);
  const useUSDCZap = useZap && isFxUSDMarket && (isUSDC || isFxUSD);
  const [shakeCollateralNeeded, setShakeCollateralNeeded] = useState(false);
  const [inputAdjusted, setInputAdjusted] = useState(false);
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [outputAdjusted, setOutputAdjusted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingStep, setPendingStep] = useState<string | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | undefined>();
  const [transactionDetails, setTransactionDetails] = useState({
    type: "mint" as "mint" | "redeem",
    tokenType: "LONG" as "LONG" | "STEAMED",
    inputAmount: "",
    outputAmount: "",
    inputToken: "",
    outputToken: "",
  });
  const [isMaxClick, setIsMaxClick] = useState(false);
  // Tracks if the user manually edited the output amount (used for reverse calculation)
  const [isOutputManual, setIsOutputManual] = useState(false);
  const [showGenesisBanner, setShowGenesisBanner] = useState(true);

  // Default to the first token in the selected type
  const [selectedToken, setSelectedToken] = useState<string>(
    tokens[selectedType][0]
  );

  // Get market info from prop or fallback to config lookup
  const marketInfoData =
    marketInfo || markets[currentMarket.id as keyof typeof markets];

  // On-chain check: has genesis been ended?
  const { data: onChainEnded, refetch: refetchOnChainEnded } = useContractRead({
    address: marketInfoData?.addresses.genesis as `0x${string}` | undefined,
    abi: genesisABI,
    functionName: "genesisIsEnded",
    query: {
      enabled: !!marketInfoData?.addresses.genesis,
    },
  });

  // Overlay is active only if the config says genesis AND on-chain it hasn't been ended
  const isGenesisActive =
    marketInfoData?.status === "genesis" && onChainEnded !== true;

  // Wagmi hooks (useContractRead, useContractReads, useContractWrite)
  // These will use currentMarket.addresses directly

  const { data: collateralBalance, refetch: refetchCollateralBalance } =
    useContractReads({
      contracts: [
        {
          address: currentMarket.addresses.collateralToken as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: userAddress ? [userAddress as `0x${string}`] : undefined,
        },
        {
          address: currentMarket.addresses.collateralToken as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: userAddress
            ? [
                userAddress as `0x${string}`,
                currentMarket.addresses.minter as `0x${string}`,
              ]
            : undefined,
        },
      ],
      query: {
        enabled: mounted && !!userAddress,
      },
    });

  const { data: peggedBalance, refetch: refetchPeggedBalance } =
    useContractReads({
      contracts: [
        {
          address: currentMarket.addresses.peggedToken as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: userAddress ? [userAddress as `0x${string}`] : undefined,
        },
        {
          address: currentMarket.addresses.peggedToken as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: userAddress
            ? [
                userAddress as `0x${string}`,
                currentMarket.addresses.minter as `0x${string}`,
              ]
            : undefined,
        },
      ],
      query: {
        enabled: mounted && !!userAddress,
      },
    });

  const { data: leveragedBalance, refetch: refetchLeveragedBalance } =
    useContractReads({
      contracts: [
        {
          address: currentMarket.addresses.leveragedToken as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: userAddress ? [userAddress as `0x${string}`] : undefined,
        },
        {
          address: currentMarket.addresses.leveragedToken as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: userAddress
            ? [
                userAddress as `0x${string}`,
                currentMarket.addresses.minter as `0x${string}`,
              ]
            : undefined,
        },
      ],
      query: {
        enabled: mounted && !!userAddress,
      },
    });

  const { data, refetch: refetchMarketData } = useContractReads({
    contracts: [
      {
        address: currentMarket.addresses.minter as `0x${string}`,
        abi: minterABI,
        functionName: "leverageRatio",
      },
      {
        address: currentMarket.addresses.minter as `0x${string}`,
        abi: minterABI,
        functionName: "mintPeggedTokenIncentiveRatio",
      },
      {
        address: currentMarket.addresses.minter as `0x${string}`,
        abi: minterABI,
        functionName: "redeemPeggedTokenIncentiveRatio",
      },
    ],
    query: {
      enabled: mounted,
    },
  });

  const { data: mintPeggedDryRunResult, refetch: refetchMintPeggedDryRun } =
    useContractRead({
      address: currentMarket.addresses.minter as `0x${string}`,
      abi: minterABI,
      functionName: "mintPeggedTokenDryRun",
      args: [inputAmount ? parseEther(inputAmount) : BigInt(0)],
      query: {
        enabled:
          mounted &&
          isCollateralAtTop &&
          selectedType === "LONG" &&
          !!inputAmount &&
          parseFloat(inputAmount) > 0,
      },
    });

  const {
    data: redeemPeggedDryRunResult,
    error: redeemPeggedDryRunError,
    refetch: refetchRedeemPeggedDryRun,
  } = useContractRead({
    address: currentMarket.addresses.minter as `0x${string}`,
    abi: minterABI,
    functionName: "redeemPeggedTokenDryRun",
    args: [inputAmount ? parseEther(inputAmount) : BigInt(0)],
    query: {
      enabled:
        mounted &&
        !isCollateralAtTop &&
        selectedType === "LONG" &&
        !!inputAmount &&
        parseFloat(inputAmount) > 0,
    },
  });

  const {
    data: redeemLeveragedDryRunResult,
    error: redeemLeveragedDryRunError,
    refetch: refetchRedeemLeveragedDryRun,
  } = useContractRead({
    address: currentMarket.addresses.minter as `0x${string}`,
    abi: minterABI,
    functionName: "redeemLeveragedTokenDryRun",
    args: [inputAmount ? parseEther(inputAmount) : BigInt(0)],
    query: {
      enabled:
        mounted &&
        !isCollateralAtTop &&
        selectedType === "STEAMED" &&
        !!inputAmount &&
        parseFloat(inputAmount) > 0,
    },
  });

  const {
    data: mintLeveragedDryRunResult,
    refetch: refetchMintLeveragedDryRun,
  } = useContractRead({
    address: currentMarket.addresses.minter as `0x${string}`,
    abi: minterABI,
    functionName: "mintLeveragedTokenDryRun",
    args: [inputAmount ? parseEther(inputAmount) : BigInt(0)],
    query: {
      enabled:
        mounted &&
        isCollateralAtTop &&
        selectedType === "STEAMED" &&
        !!inputAmount &&
        parseFloat(inputAmount) > 0,
    },
  });

  // Reverse calculation contract reads for output → input calculation
  const { data: reverseMintPeggedDryRunResult } = useContractRead({
    address: currentMarket.addresses.minter as `0x${string}`,
    abi: minterABI,
    functionName: "mintPeggedTokenDryRun",
    args: [outputAmount ? parseEther(outputAmount) : BigInt(0)],
    query: {
      enabled:
        mounted &&
        isCollateralAtTop &&
        selectedType === "LONG" &&
        !!outputAmount &&
        parseFloat(outputAmount) > 0,
    },
  });

  const { data: reverseMintLeveragedDryRunResult } = useContractRead({
    address: currentMarket.addresses.minter as `0x${string}`,
    abi: minterABI,
    functionName: "mintLeveragedTokenDryRun",
    args: [outputAmount ? parseEther(outputAmount) : BigInt(0)],
    query: {
      enabled:
        mounted &&
        isCollateralAtTop &&
        selectedType === "STEAMED" &&
        !!outputAmount &&
        parseFloat(outputAmount) > 0,
    },
  });

  const { data: reverseRedeemLeveragedDryRunResult } = useContractRead({
    address: currentMarket.addresses.minter as `0x${string}`,
    abi: minterABI,
    functionName: "redeemLeveragedTokenDryRun",
    args: [outputAmount ? parseEther(outputAmount) : BigInt(0)],
    query: {
      enabled:
        mounted &&
        !isCollateralAtTop &&
        selectedType === "STEAMED" &&
        !!outputAmount &&
        parseFloat(outputAmount) > 0,
    },
  });

  const { data: reverseRedeemPeggedDryRunResult } = useContractRead({
    address: currentMarket.addresses.minter as `0x${string}`,
    abi: minterABI,
    functionName: "redeemPeggedTokenDryRun",
    args: [outputAmount ? parseEther(outputAmount) : BigInt(0)],
    query: {
      enabled:
        mounted &&
        !isCollateralAtTop &&
        selectedType === "LONG" &&
        !!outputAmount &&
        parseFloat(outputAmount) > 0,
    },
  });

  // Calculate fee ratio for leveraged tokens (index 0 from dry run)
  const dryRunFeeRatio = useMemo(() => {
    if (!inputAmount || parseFloat(inputAmount) === 0) return undefined;
    if (
      isCollateralAtTop &&
      selectedType === "STEAMED" &&
      Array.isArray(mintLeveragedDryRunResult)
    ) {
      return mintLeveragedDryRunResult[0] as bigint;
    }
    if (
      !isCollateralAtTop &&
      selectedType === "STEAMED" &&
      Array.isArray(redeemLeveragedDryRunResult)
    ) {
      return redeemLeveragedDryRunResult[0] as bigint;
    }
    return undefined;
  }, [
    inputAmount,
    isCollateralAtTop,
    selectedType,
    mintLeveragedDryRunResult,
    redeemLeveragedDryRunResult,
  ]);

  // Calculate fee or discount (absolute wrapped collateral amount) based on dry-run results
  const dryRunFee = useMemo(() => {
    if (!inputAmount || parseFloat(inputAmount) === 0) return undefined;
    if (isCollateralAtTop) {
      if (selectedType === "LONG" && Array.isArray(mintPeggedDryRunResult)) {
        return mintPeggedDryRunResult[1] as bigint;
      }
      if (
        selectedType === "STEAMED" &&
        Array.isArray(mintLeveragedDryRunResult)
      ) {
        return mintLeveragedDryRunResult[1] as bigint;
      }
    } else {
      if (selectedType === "LONG" && Array.isArray(redeemPeggedDryRunResult)) {
        // For redeem, use the fee amount directly (not the difference)
        return redeemPeggedDryRunResult[1] as bigint;
      }
      if (
        selectedType === "STEAMED" &&
        Array.isArray(redeemLeveragedDryRunResult)
      ) {
        return redeemLeveragedDryRunResult[1] as bigint;
      }
    }
    return undefined;
  }, [
    inputAmount,
    isCollateralAtTop,
    selectedType,
    mintPeggedDryRunResult,
    mintLeveragedDryRunResult,
    redeemPeggedDryRunResult,
    redeemLeveragedDryRunResult,
  ]);

  // Calculate fee percentage for pegged token
  const peggedTokenFeePercentage = useMemo(() => {
    if (!inputAmount || parseFloat(inputAmount) === 0 || !dryRunFee)
      return undefined;

    // For redeem operations, calculate fee percentage relative to output (wstETH)
    if (!isCollateralAtTop && selectedType === "LONG") {
      if (
        Array.isArray(redeemPeggedDryRunResult) &&
        redeemPeggedDryRunResult.length > 4
      ) {
        const outputAmountBigInt = redeemPeggedDryRunResult[4] as bigint; // wrappedCollateralReturned
        if (outputAmountBigInt === 0n) return undefined;

        const feePercentage =
          (Number(dryRunFee) / Number(outputAmountBigInt)) * 100;

        // Debug logging for fee calculation
        console.log("💰 Fee calculation debug (redeem):", {
          inputAmount,
          dryRunFee: dryRunFee.toString(),
          outputAmountBigInt: outputAmountBigInt.toString(),
          feePercentage,
          isCollateralAtTop,
          selectedType,
        });

        return feePercentage;
      }
    }

    // For mint operations, calculate fee percentage relative to input (collateral)
    const inputAmountBigInt = parseEther(inputAmount);
    if (inputAmountBigInt === 0n) return undefined;

    const feePercentage = (Number(dryRunFee) / Number(inputAmountBigInt)) * 100;

    // Debug logging for fee calculation
    console.log("💰 Fee calculation debug (mint):", {
      inputAmount,
      inputAmountBigInt: inputAmountBigInt.toString(),
      dryRunFee: dryRunFee.toString(),
      feePercentage,
      isCollateralAtTop,
      selectedType,
    });

    return feePercentage;
  }, [
    inputAmount,
    dryRunFee,
    isCollateralAtTop,
    selectedType,
    redeemPeggedDryRunResult,
  ]);

  useEffect(() => {
    if (
      isCollateralAtTop &&
      selectedType === "LONG" &&
      inputAmount &&
      Array.isArray(mintPeggedDryRunResult) &&
      mintPeggedDryRunResult.length > 2
    ) {
      try {
        const parsedInputAmount = parseEther(inputAmount);
        const collateralNeededFromDryRun = mintPeggedDryRunResult[2] as bigint; // collateralTaken
        if (
          typeof collateralNeededFromDryRun === "bigint" &&
          collateralNeededFromDryRun < parsedInputAmount
        ) {
          // Auto-adjust input amount to collateral needed
          const adjustedAmount = formatEther(collateralNeededFromDryRun);
          setInputAmount(adjustedAmount);
          setInputAdjusted(true);
          setAdjustmentReason("Input reduced to maximum mintable amount");
          setTimeout(() => setInputAdjusted(false), 3000);
        }
      } catch (e) {
        console.error("Error parsing input amount for adjustment:", e);
      }
    }
  }, [inputAmount, mintPeggedDryRunResult, isCollateralAtTop, selectedType]);

  // Auto-adjust input for STEAMED token minting
  useEffect(() => {
    if (
      isCollateralAtTop &&
      selectedType === "STEAMED" &&
      inputAmount &&
      Array.isArray(mintLeveragedDryRunResult) &&
      mintLeveragedDryRunResult.length > 3
    ) {
      try {
        const parsedInputAmount = parseEther(inputAmount);
        const collateralNeededFromDryRun =
          mintLeveragedDryRunResult[3] as bigint; // wrappedCollateralUsed
        if (
          typeof collateralNeededFromDryRun === "bigint" &&
          collateralNeededFromDryRun < parsedInputAmount
        ) {
          // Auto-adjust input amount to collateral needed
          const adjustedAmount = formatEther(collateralNeededFromDryRun);
          setInputAmount(adjustedAmount);
          setInputAdjusted(true);
          setAdjustmentReason("Input reduced to maximum mintable amount");
          setTimeout(() => setInputAdjusted(false), 3000);
        }
      } catch (e) {
        console.error("Error parsing input amount for STEAMED adjustment:", e);
      }
    }
  }, [inputAmount, mintLeveragedDryRunResult, isCollateralAtTop, selectedType]);

  // Reverse calculation: Update input when output changes
  useEffect(() => {
    // Only run reverse calculation if the user manually edited the output
    if (!isOutputManual) {
      // Skip if output wasn't manually set
      return;
    }

    // Extra guard: also skip if MAX was clicked recently
    if (isMaxClick) {
      console.log("🔄 Skipping reverse calculation due to MAX click");
      return;
    }

    if (outputAmount && parseFloat(outputAmount) > 0) {
      console.log("🔄 Running reverse calculation for output:", outputAmount);
      if (isCollateralAtTop) {
        // Mint mode
        if (
          selectedType === "LONG" &&
          Array.isArray(reverseMintPeggedDryRunResult)
        ) {
          // For minting pegged tokens, we need to find the collateral input that produces the desired output
          // The dry run result gives us the collateral taken (index 2)
          const collateralNeeded = reverseMintPeggedDryRunResult[2] as bigint;
          if (typeof collateralNeeded === "bigint") {
            const calculatedInput = formatEther(collateralNeeded);
            console.log(
              "🔄 Setting input to calculated value:",
              calculatedInput
            );
            setInputAmount(calculatedInput);
            setIsOutputManual(false); // Prevent further loops
            setOutputAdjusted(true);
            setTimeout(() => setOutputAdjusted(false), 3000);
          }
        } else if (
          selectedType === "STEAMED" &&
          Array.isArray(reverseMintLeveragedDryRunResult)
        ) {
          // For minting leveraged tokens, we need the collateral used (index 3)
          const collateralNeeded =
            reverseMintLeveragedDryRunResult[3] as bigint;
          if (typeof collateralNeeded === "bigint") {
            const calculatedInput = formatEther(collateralNeeded);
            console.log(
              "🔄 Setting input to calculated value:",
              calculatedInput
            );
            setInputAmount(calculatedInput);
            setIsOutputManual(false);
            setOutputAdjusted(true);
            setTimeout(() => setOutputAdjusted(false), 3000);
          }
        }
      } else {
        // Redeem mode
        if (
          selectedType === "LONG" &&
          Array.isArray(reverseRedeemPeggedDryRunResult)
        ) {
          // For redeeming pegged tokens, we need the pegged input that produces the desired collateral output
          // The dry run result gives us the pegged redeemed (index 3)
          const peggedNeeded = reverseRedeemPeggedDryRunResult[3] as bigint;
          if (typeof peggedNeeded === "bigint") {
            const calculatedInput = formatEther(peggedNeeded);
            console.log(
              "🔄 Setting input to calculated value:",
              calculatedInput
            );
            setInputAmount(calculatedInput);
            setIsOutputManual(false);
            setOutputAdjusted(true);
            setTimeout(() => setOutputAdjusted(false), 3000);
          }
        } else if (
          selectedType === "STEAMED" &&
          Array.isArray(reverseRedeemLeveragedDryRunResult)
        ) {
          // For redeeming leveraged tokens, we need the leveraged input that produces the desired collateral output
          // The dry run result gives us the leveraged redeemed (index 2)
          const leveragedNeeded =
            reverseRedeemLeveragedDryRunResult[2] as bigint;
          if (typeof leveragedNeeded === "bigint") {
            const calculatedInput = formatEther(leveragedNeeded);
            console.log(
              "🔄 Setting input to calculated value:",
              calculatedInput
            );
            setInputAmount(calculatedInput);
            setIsOutputManual(false);
            setOutputAdjusted(true);
            setTimeout(() => setOutputAdjusted(false), 3000);
          }
        }
      }
    }
  }, [
    outputAmount,
    isCollateralAtTop,
    selectedType,
    reverseMintPeggedDryRunResult,
    reverseMintLeveragedDryRunResult,
    reverseRedeemPeggedDryRunResult,
    reverseRedeemLeveragedDryRunResult,
    isMaxClick,
    isOutputManual,
  ]);

  const { data: outputData, refetch: refetchOutput } = useContractReads({
    contracts: [
      {
        address: currentMarket.addresses.minter as `0x${string}`,
        abi: minterABI,
        functionName: isCollateralAtTop
          ? selectedType === "LONG"
            ? "mintPeggedTokenDryRun"
            : "calculateMintLeveragedTokenOutput"
          : selectedType === "LONG"
          ? "calculateRedeemPeggedTokenOutput"
          : "calculateRedeemLeveragedTokenOutput",
        args: [inputAmount ? parseEther(inputAmount) : BigInt(0)],
      },
    ],
    query: {
      enabled:
        mounted &&
        !!inputAmount &&
        parseFloat(inputAmount) > 0 &&
        !(isCollateralAtTop && selectedType === "LONG"), // Disable if using dry run
    },
  });

  const { writeContractAsync } = useWriteContract();

  // Effect Hooks
  useEffect(() => setMounted(true), []);

  // Debug logging for dry-run query conditions
  useEffect(() => {
    console.log("🔍 Dry-run Query Conditions:", {
      mounted,
      isCollateralAtTop,
      selectedType,
      inputAmount,
      inputAmountFloat: inputAmount ? parseFloat(inputAmount) : 0,
      mintPeggedEnabled:
        mounted &&
        isCollateralAtTop &&
        selectedType === "LONG" &&
        !!inputAmount &&
        parseFloat(inputAmount) > 0,
      redeemPeggedEnabled:
        mounted &&
        !isCollateralAtTop &&
        selectedType === "LONG" &&
        !!inputAmount &&
        parseFloat(inputAmount) > 0,
      mintLeveragedEnabled:
        mounted &&
        isCollateralAtTop &&
        selectedType === "STEAMED" &&
        !!inputAmount &&
        parseFloat(inputAmount) > 0,
      redeemLeveragedEnabled:
        mounted &&
        !isCollateralAtTop &&
        selectedType === "STEAMED" &&
        !!inputAmount &&
        parseFloat(inputAmount) > 0,
    });
  }, [mounted, isCollateralAtTop, selectedType, inputAmount]);

  useEffect(() => {
    if (isCollateralAtTop) {
      // Mint mode
      if (
        selectedType === "LONG" &&
        Array.isArray(mintPeggedDryRunResult) &&
        mintPeggedDryRunResult.length > 2
      ) {
        // Debug logging for dry run results
        console.log("🔍 Mint Pegged Dry Run Results:", {
          inputAmount,
          inputAmountWei: inputAmount
            ? parseEther(inputAmount).toString()
            : "0",
          fullResult: mintPeggedDryRunResult,
          incentiveRatio: mintPeggedDryRunResult[0]?.toString(),
          wrappedFee: formatEther(mintPeggedDryRunResult[1] as bigint),
          wrappedCollateralTaken: formatEther(
            mintPeggedDryRunResult[2] as bigint
          ),
          peggedMinted: formatEther(mintPeggedDryRunResult[3] as bigint),
          price: mintPeggedDryRunResult[4]?.toString(),
          rate: mintPeggedDryRunResult[5]?.toString(),
        });

        const peggedMinted = mintPeggedDryRunResult[3] as bigint; // peggedMinted
        if (typeof peggedMinted === "bigint")
          setOutputAmount(formatEther(peggedMinted));
        else setOutputAmount("");
      } else if (
        selectedType === "STEAMED" && // Minting Leveraged
        Array.isArray(mintLeveragedDryRunResult) &&
        mintLeveragedDryRunResult.length > 4
      ) {
        // Debug logging for leveraged mint dry run
        console.log("🔍 Mint Leveraged Dry Run Results:", {
          inputAmount,
          inputAmountWei: inputAmount
            ? parseEther(inputAmount).toString()
            : "0",
          fullResult: mintLeveragedDryRunResult,
          incentiveRatio: mintLeveragedDryRunResult[0]?.toString(),
          wrappedFee: formatEther(mintLeveragedDryRunResult[1] as bigint),
          wrappedDiscount: formatEther(mintLeveragedDryRunResult[2] as bigint),
          wrappedCollateralUsed: formatEther(
            mintLeveragedDryRunResult[3] as bigint
          ),
          leveragedMinted: formatEther(mintLeveragedDryRunResult[4] as bigint),
          price: mintLeveragedDryRunResult[5]?.toString(),
          rate: mintLeveragedDryRunResult[6]?.toString(),
        });

        const leveragedMinted = mintLeveragedDryRunResult[4] as bigint;
        if (typeof leveragedMinted === "bigint")
          setOutputAmount(formatEther(leveragedMinted));
        else setOutputAmount("");
      } else if (outputData && outputData[0]?.status === "success") {
        const res = outputData[0]?.result;
        let minted: bigint | undefined;
        if (typeof res === "bigint") {
          minted = res;
        } else if (Array.isArray(res) && res.length >= 4) {
          minted = res[3] as bigint; // peggedMinted from dry run
        } else if (res && typeof res === "object" && "peggedMinted" in res) {
          minted = (res as any).peggedMinted as bigint;
        }
        if (minted !== undefined) {
          setOutputAmount(formatEther(minted));
        } else {
          setOutputAmount("");
        }
      } else if (!inputAmount) {
        setOutputAmount("");
      }
    } else {
      // Redeem mode
      if (
        selectedType === "LONG" &&
        Array.isArray(redeemPeggedDryRunResult) &&
        redeemPeggedDryRunResult.length > 4
      ) {
        // Debug logging for pegged redeem dry run
        console.log("🔍 Redeem Pegged Dry Run Results:", {
          inputAmount,
          inputAmountWei: inputAmount
            ? parseEther(inputAmount).toString()
            : "0",
          fullResult: redeemPeggedDryRunResult,
          incentiveRatio: redeemPeggedDryRunResult[0]?.toString(),
          wrappedFee: formatEther(redeemPeggedDryRunResult[1] as bigint),
          wrappedDiscount: formatEther(redeemPeggedDryRunResult[2] as bigint),
          peggedRedeemed: formatEther(redeemPeggedDryRunResult[3] as bigint),
          wrappedCollateralReturned: formatEther(
            redeemPeggedDryRunResult[4] as bigint
          ),
          price: redeemPeggedDryRunResult[5]?.toString(),
          rate: redeemPeggedDryRunResult[6]?.toString(),
        });

        const collateralReturned = redeemPeggedDryRunResult[4] as bigint;
        if (typeof collateralReturned === "bigint")
          setOutputAmount(formatEther(collateralReturned));
        else setOutputAmount("");
      } else if (
        selectedType === "STEAMED" &&
        Array.isArray(redeemLeveragedDryRunResult) &&
        redeemLeveragedDryRunResult.length > 3
      ) {
        // Debug logging for leveraged redeem dry run
        console.log("🔍 Redeem Leveraged Dry Run Results:", {
          inputAmount,
          inputAmountWei: inputAmount
            ? parseEther(inputAmount).toString()
            : "0",
          fullResult: redeemLeveragedDryRunResult,
          incentiveRatio: redeemLeveragedDryRunResult[0]?.toString(),
          wrappedFee: formatEther(redeemLeveragedDryRunResult[1] as bigint),
          leveragedRedeemed: formatEther(
            redeemLeveragedDryRunResult[2] as bigint
          ),
          wrappedCollateralReturned: formatEther(
            redeemLeveragedDryRunResult[3] as bigint
          ),
          price: redeemLeveragedDryRunResult[4]?.toString(),
          rate: redeemLeveragedDryRunResult[5]?.toString(),
        });

        const collateralReturned = redeemLeveragedDryRunResult[3] as bigint;
        if (typeof collateralReturned === "bigint")
          setOutputAmount(formatEther(collateralReturned));
        else setOutputAmount("");
      } else if (!inputAmount) {
        setOutputAmount("");
      }
    }
  }, [
    mintPeggedDryRunResult,
    redeemPeggedDryRunResult,
    mintLeveragedDryRunResult,
    redeemLeveragedDryRunResult,
    outputData,
    inputAmount,
    isCollateralAtTop,
    selectedType,
    setOutputAmount,
  ]);

  useEffect(() => {
    setInputAmount("");
    setOutputAmount("");
  }, [isCollateralAtTop, selectedType, currentMarket.id]);

  // Event Handlers
  const handleInputAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      // Allow only numbers and a single dot
      setInputAmount(value);
      setIsOutputManual(false); // User changed input, not output
      if (!value || parseFloat(value) === 0) {
        setOutputAmount("");
      }
    }
  };

  const handleOutputAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setOutputAmount(value);
      setIsOutputManual(true); // User manually changed output
      // Clear input when output is cleared
      if (!value || parseFloat(value) === 0) {
        setInputAmount("");
        setOutputAdjusted(false);
      }
    }
  };

  const handleMaxClick = () => {
    const balanceToSetResult = isCollateralAtTop
      ? collateralBalance?.[0]?.result
      : selectedType === "LONG"
      ? peggedBalance?.[0]?.result
      : leveragedBalance?.[0]?.result;

    console.log("🔍 handleMaxClick debug:", {
      isCollateralAtTop,
      selectedType,
      collateralBalance: collateralBalance?.[0]?.result?.toString(),
      peggedBalance: peggedBalance?.[0]?.result?.toString(),
      leveragedBalance: leveragedBalance?.[0]?.result?.toString(),
      balanceToSetResult: balanceToSetResult?.toString(),
    });

    if (typeof balanceToSetResult === "bigint") {
      const formattedAmount = formatEther(balanceToSetResult);
      console.log("📊 Setting input amount to:", formattedAmount);
      setIsMaxClick(true);
      setIsOutputManual(false); // Disable reverse calculation after MAX
      setInputAmount(formattedAmount);
      // Reset the flag after a longer delay to prevent reverse calculation from running
      setTimeout(() => {
        console.log("🔄 Resetting isMaxClick flag");
        setIsMaxClick(false);
      }, 500);
    } else {
      console.log("⚠️ No valid balance found for MAX click");
    }
  };

  // Function to refetch all relevant data after successful transaction
  const refetchAllData = async () => {
    try {
      console.log("🔄 Refetching all market data after transaction...");
      // Refetch all balance data, dry run results, and market state
      await Promise.all([
        refetchCollateralBalance(),
        refetchPeggedBalance(),
        refetchLeveragedBalance(),
        refetchMintPeggedDryRun(),
        refetchMintLeveragedDryRun(),
        refetchRedeemPeggedDryRun(),
        refetchRedeemLeveragedDryRun(),
        refetchMarketData(),
        refetchOnChainEnded(),
      ]);
      console.log("✅ All market data refetched successfully");
    } catch (error) {
      console.error("Error refetching data:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !inputAmount ||
      parseFloat(inputAmount) <= 0 ||
      !userAddress ||
      !walletClient
    )
      return;

    // Set up transaction details for the modal
    const transactionType = isCollateralAtTop ? "mint" : "redeem";
    const inputToken = isCollateralAtTop
      ? "wstETH"
      : selectedType === "LONG"
      ? marketInfoData?.peggedToken.name || "ZHE"
      : marketInfoData?.leveragedToken.name || "STEAMED";
    const outputToken = isCollateralAtTop
      ? selectedType === "LONG"
        ? marketInfoData?.peggedToken.name || "ZHE"
        : marketInfoData?.leveragedToken.name || "STEAMED"
      : "wstETH";

    setTransactionDetails({
      type: transactionType,
      tokenType: selectedType,
      inputAmount,
      outputAmount: outputAmount || "0",
      inputToken,
      outputToken,
    });

    // Show modal immediately
    setShowStatusModal(true);
    setTransactionHash(undefined);

    setIsPending(true);
    setPendingStep(null);
    try {
      // Parse amount with correct decimals based on selected asset
      // USDC uses 6 decimals, fxSAVE/fxUSD/ETH/stETH/wstETH use 18 decimals
      const parsedAmount = isUSDC 
        ? parseUnits(inputAmount, 6)
        : parseEther(inputAmount);
      let approveFn,
        currentAllowanceBigInt: bigint = BigInt(0);
      let needsApproval = false;

      if (isCollateralAtTop) {
        // Handle approvals for zap contracts or direct minting
        if (useZap && zapAddress) {
          if (useETHZap && isStETH) {
            // Approve stETH to zap contract - need to read allowance first
            const stETHAddress = marketInfo?.addresses?.wrappedCollateralToken as `0x${string}` | undefined;
            if (!stETHAddress) throw new Error("stETH address not found");
            
            // Read allowance using publicClient
            const allowance = await publicClient.readContract({
              address: stETHAddress,
              abi: ERC20_ABI,
              functionName: "allowance",
              args: [userAddress as `0x${string}`, zapAddress],
            });
            
            const currentAllowance = allowance as bigint;
            needsApproval = currentAllowance < parsedAmount;
            if (needsApproval) {
              setPendingStep("approval");
              await writeContractAsync({
                address: stETHAddress,
                abi: ERC20_ABI,
                functionName: "approve",
                args: [zapAddress, parsedAmount],
              });
            }
          } else if (useUSDCZap && (isUSDC || isFxUSD)) {
            // Approve USDC or fxUSD to zap contract
            const assetAddress = isUSDC 
              ? "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as `0x${string}`
              : (marketInfo?.addresses?.collateralToken as `0x${string}` | undefined);
            
            if (!assetAddress) throw new Error("Asset address not found");
            
            // parsedAmount already has correct decimals (6 for USDC, 18 for fxUSD)
            const amountForApproval = parsedAmount;
            
            // Read allowance using publicClient
            const allowance = await publicClient.readContract({
              address: assetAddress,
              abi: ERC20_ABI,
              functionName: "allowance",
              args: [userAddress as `0x${string}`, zapAddress],
            });
            
            const currentAllowance = allowance as bigint;
            needsApproval = currentAllowance < amountForApproval;
            if (needsApproval) {
              setPendingStep("approval");
              await writeContractAsync({
                address: assetAddress,
                abi: ERC20_ABI,
                functionName: "approve",
                args: [zapAddress, amountForApproval],
              });
            }
          }
          // ETH doesn't need approval (native token)
        } else {
          // Direct minting - approve wrapped collateral to minter
          currentAllowanceBigInt =
            (collateralBalance?.[1]?.result as bigint) ?? BigInt(0);
          needsApproval = currentAllowanceBigInt < parsedAmount;
          if (needsApproval) {
            setPendingStep("approval");
            await writeContractAsync({
              address: currentMarket.addresses.collateralToken as `0x${string}`,
              abi: ERC20_ABI,
              functionName: "approve",
              args: [
                currentMarket.addresses.minter as `0x${string}`,
                parsedAmount,
              ],
            });
          }
        }
      } else if (selectedType === "LONG") {
        currentAllowanceBigInt =
          (peggedBalance?.[1]?.result as bigint) ?? BigInt(0);
        needsApproval = currentAllowanceBigInt < parsedAmount;
        if (needsApproval) {
          setPendingStep("approval");
          await writeContractAsync({
            address: currentMarket.addresses.peggedToken as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [
              currentMarket.addresses.minter as `0x${string}`,
              parsedAmount,
            ],
          });
        }
      } else {
        currentAllowanceBigInt =
          (leveragedBalance?.[1]?.result as bigint) ?? BigInt(0);
        needsApproval = currentAllowanceBigInt < parsedAmount;
        if (needsApproval) {
          setPendingStep("approval");
          await writeContractAsync({
            address: currentMarket.addresses.leveragedToken as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [
              currentMarket.addresses.minter as `0x${string}`,
              parsedAmount,
            ],
          });
        }
      }

      // 2. Proceed with mint/redeem
      setPendingStep("mintOrRedeem");
      if (isCollateralAtTop) {
        // Check if we should use zap contract
        if (useZap && zapAddress) {
          if (useETHZap) {
            // ETH/stETH zap for wstETH markets
            if (selectedType === "LONG") {
              // Mint pegged token via zap
              let minPeggedOut = parsedAmount;
              if (
                Array.isArray(mintPeggedDryRunResult) &&
                mintPeggedDryRunResult.length > 2 &&
                typeof mintPeggedDryRunResult[3] === "bigint"
              ) {
                minPeggedOut = mintPeggedDryRunResult[3] as bigint;
              }
              // Calculate minWstEthOut with 0.5% slippage
              const minWstEthOut = (parsedAmount * 995n) / 1000n;
              
              if (isNativeETH) {
                const hash = await writeContractAsync({
                  address: zapAddress,
                  abi: MINTER_ETH_ZAP_V2_ABI,
                  functionName: "zapEthToPegged",
                  args: [userAddress as `0x${string}`, minPeggedOut, minWstEthOut],
                  value: parsedAmount,
                });
                setTransactionHash(hash);
              } else if (isStETH) {
                // Need approval for stETH first
                const stETHAddress = marketInfo?.addresses?.wrappedCollateralToken as `0x${string}` | undefined;
                if (!stETHAddress) throw new Error("stETH address not found");
                
                const hash = await writeContractAsync({
                  address: zapAddress,
                  abi: MINTER_ETH_ZAP_V2_ABI,
                  functionName: "zapStEthToPegged",
                  args: [parsedAmount, userAddress as `0x${string}`, minPeggedOut, minWstEthOut],
                });
                setTransactionHash(hash);
              }
            } else {
              // Mint leveraged token via zap
              let minLeveragedOut = parsedAmount;
              if (
                Array.isArray(mintLeveragedDryRunResult) &&
                mintLeveragedDryRunResult.length > 4 &&
                typeof mintLeveragedDryRunResult[4] === "bigint"
              ) {
                minLeveragedOut = mintLeveragedDryRunResult[4] as bigint;
              }
              const minWstEthOut = (parsedAmount * 995n) / 1000n;
              
              if (isNativeETH) {
                const hash = await writeContractAsync({
                  address: zapAddress,
                  abi: MINTER_ETH_ZAP_V2_ABI,
                  functionName: "zapEthToLeveraged",
                  args: [userAddress as `0x${string}`, minLeveragedOut, minWstEthOut],
                  value: parsedAmount,
                });
                setTransactionHash(hash);
              } else if (isStETH) {
                const stETHAddress = marketInfo?.addresses?.wrappedCollateralToken as `0x${string}` | undefined;
                if (!stETHAddress) throw new Error("stETH address not found");
                
                const hash = await writeContractAsync({
                  address: zapAddress,
                  abi: MINTER_ETH_ZAP_V2_ABI,
                  functionName: "zapStEthToLeveraged",
                  args: [parsedAmount, userAddress as `0x${string}`, minLeveragedOut, minWstEthOut],
                });
                setTransactionHash(hash);
              }
            }
          } else if (useUSDCZap) {
            // USDC/fxUSD zap for fxSAVE markets
            // USDC uses 6 decimals, fxUSD uses 18 decimals
            // parsedAmount already has correct decimals from above (6 for USDC, 18 for fxUSD)
            const amountForZap = parsedAmount;
            
            if (selectedType === "LONG") {
              // Mint pegged token via zap
              let minPeggedOut = parsedAmount;
              if (
                Array.isArray(mintPeggedDryRunResult) &&
                mintPeggedDryRunResult.length > 2 &&
                typeof mintPeggedDryRunResult[3] === "bigint"
              ) {
                minPeggedOut = mintPeggedDryRunResult[3] as bigint;
              }
              
              if (isUSDC) {
                const hash = await writeContractAsync({
                  address: zapAddress,
                  abi: MINTER_USDC_ZAP_V2_ABI,
                  functionName: "zapUsdcToPegged",
                  args: [amountForZap, userAddress as `0x${string}`, minPeggedOut],
                });
                setTransactionHash(hash);
              } else if (isFxUSD) {
                const hash = await writeContractAsync({
                  address: zapAddress,
                  abi: MINTER_USDC_ZAP_V2_ABI,
                  functionName: "zapFxUsdToPegged",
                  args: [amountForZap, userAddress as `0x${string}`, minPeggedOut],
                });
                setTransactionHash(hash);
              }
            } else {
              // Mint leveraged token via zap
              let minLeveragedOut = parsedAmount;
              if (
                Array.isArray(mintLeveragedDryRunResult) &&
                mintLeveragedDryRunResult.length > 4 &&
                typeof mintLeveragedDryRunResult[4] === "bigint"
              ) {
                minLeveragedOut = mintLeveragedDryRunResult[4] as bigint;
              }
              
              if (isUSDC) {
                const hash = await writeContractAsync({
                  address: zapAddress,
                  abi: MINTER_USDC_ZAP_V2_ABI,
                  functionName: "zapUsdcToLeveraged",
                  args: [amountForZap, userAddress as `0x${string}`, minLeveragedOut],
                });
                setTransactionHash(hash);
              } else if (isFxUSD) {
                const hash = await writeContractAsync({
                  address: zapAddress,
                  abi: MINTER_USDC_ZAP_V2_ABI,
                  functionName: "zapFxUsdToLeveraged",
                  args: [amountForZap, userAddress as `0x${string}`, minLeveragedOut],
                });
                setTransactionHash(hash);
              }
            }
          }
        } else {
          // Direct minting (no zap)
          if (selectedType === "LONG") {
            let minPeggedOut = parsedAmount;
            if (
              Array.isArray(mintPeggedDryRunResult) &&
              mintPeggedDryRunResult.length > 2 &&
              typeof mintPeggedDryRunResult[3] === "bigint"
            ) {
              minPeggedOut = mintPeggedDryRunResult[3] as bigint; // peggedMinted
            }
            const hash = await writeContractAsync({
              address: currentMarket.addresses.minter as `0x${string}`,
              abi: minterABI,
              functionName: "mintPeggedToken",
              args: [parsedAmount, userAddress as `0x${string}`, minPeggedOut],
            });
            setTransactionHash(hash);
          } else {
            // Minting Leveraged Token
            let minLeveragedOut = parsedAmount; // Default to input amount
            console.log("💰 Preparing mintLeveragedToken transaction:", {
              inputAmount,
              parsedAmount: parsedAmount.toString(),
              mintLeveragedDryRunResult,
              mintLeveragedDryRunResultLength: Array.isArray(
                mintLeveragedDryRunResult
              )
                ? mintLeveragedDryRunResult.length
                : 0,
            });
            if (
              // Prefer dry run result if available
              Array.isArray(mintLeveragedDryRunResult) &&
              mintLeveragedDryRunResult.length > 4 &&
              typeof mintLeveragedDryRunResult[4] === "bigint"
            ) {
              minLeveragedOut = mintLeveragedDryRunResult[4] as bigint;
              console.log(
                "✅ Using dry-run result for minLeveragedOut:",
                formatEther(minLeveragedOut)
              );
            } else if (outputAmount && parseFloat(outputAmount) > 0) {
              // Fallback to calculated outputAmount
              try {
                minLeveragedOut = parseEther(outputAmount);
                console.log(
                  "📊 Using outputAmount for minLeveragedOut:",
                  formatEther(minLeveragedOut)
                );
              } catch (e) {
                console.error(
                  "Error parsing outputAmount for minLeveragedOut:",
                  e
                );
              }
            } else {
              console.log(
                "⚠️ Using default parsedAmount for minLeveragedOut:",
                formatEther(minLeveragedOut)
              );
            }
            const hash = await writeContractAsync({
              address: currentMarket.addresses.minter as `0x${string}`,
              abi: minterABI,
              functionName: "mintLeveragedToken",
              args: [parsedAmount, userAddress as `0x${string}`, minLeveragedOut],
            });
            setTransactionHash(hash);
          }
        }
      } else {
        if (selectedType === "LONG") {
          let minCollateralOut = parsedAmount;
          if (
            Array.isArray(redeemPeggedDryRunResult) &&
            redeemPeggedDryRunResult.length > 4 &&
            typeof redeemPeggedDryRunResult[4] === "bigint"
          ) {
            minCollateralOut = redeemPeggedDryRunResult[4] as bigint;
          }
          const hash = await writeContractAsync({
            address: currentMarket.addresses.minter as `0x${string}`,
            abi: minterABI,
            functionName: "redeemPeggedToken",
            args: [
              parsedAmount,
              userAddress as `0x${string}`,
              minCollateralOut,
            ],
          });
          setTransactionHash(hash);
        } else {
          let minCollateralOut = parsedAmount;
          if (
            Array.isArray(redeemLeveragedDryRunResult) &&
            redeemLeveragedDryRunResult.length > 3 &&
            typeof redeemLeveragedDryRunResult[3] === "bigint"
          ) {
            minCollateralOut = redeemLeveragedDryRunResult[3] as bigint;
          }
          const hash = await writeContractAsync({
            address: currentMarket.addresses.minter as `0x${string}`,
            abi: minterABI,
            functionName: "redeemLeveragedToken",
            args: [
              parsedAmount,
              userAddress as `0x${string}`,
              minCollateralOut,
            ],
          });
          setTransactionHash(hash);
        }
      }
      setInputAmount("");
      setOutputAmount("");
    } catch (error) {
      console.error("Transaction failed:", error);
      // Enhanced error logging for debugging
      if (error && typeof error === "object" && error !== null) {
        const errObj = error as Record<string, unknown>;
        for (const key in errObj) {
          if (Object.prototype.hasOwnProperty.call(errObj, key)) {
            console.error(`[ERROR DETAIL] ${key}:`, errObj[key]);
          }
        }
        try {
          console.error(
            "[ERROR STRINGIFIED]",
            JSON.stringify(error, Object.getOwnPropertyNames(error))
          );
        } catch (stringifyErr) {
          console.error("[ERROR STRINGIFY FAILED]", stringifyErr);
        }
      }
      alert("Transaction failed. See console for details.");
    } finally {
      setIsPending(false);
      setPendingStep(null);
    }
  };

  const leverageRatioResult = data?.[0]?.result as bigint | undefined;
  const mintFeeResult = data?.[1]?.result as bigint | undefined; // This is mintPeggedTokenIncentiveRatio
  const redeemFeeResult = data?.[2]?.result as bigint | undefined; // This is redeemPeggedTokenIncentiveRatio

  // Log when dry-run results change
  useEffect(() => {
    if (mintPeggedDryRunResult) {
      console.log("🔄 mintPeggedDryRunResult updated:", mintPeggedDryRunResult);
    }
  }, [mintPeggedDryRunResult]);

  useEffect(() => {
    if (redeemPeggedDryRunResult) {
      console.log(
        "🔄 redeemPeggedDryRunResult updated:",
        redeemPeggedDryRunResult
      );
    }
  }, [redeemPeggedDryRunResult]);

  useEffect(() => {
    if (mintLeveragedDryRunResult) {
      console.log(
        "🔄 mintLeveragedDryRunResult updated:",
        mintLeveragedDryRunResult
      );
    }
  }, [mintLeveragedDryRunResult]);

  useEffect(() => {
    if (redeemLeveragedDryRunResult) {
      console.log(
        "🔄 redeemLeveragedDryRunResult updated:",
        redeemLeveragedDryRunResult
      );
    }
  }, [redeemLeveragedDryRunResult]);

  if (!mounted) {
    // Optional: render a simpler loading state for this component if needed
    return (
      <div className="px-6 py-2">
        <h2 className={`text-2xl text-white mb-4`}>Loading Form...</h2>
      </div>
    );
  }

  // JSX for Mint & Redeem section (to be copied from page.tsx)
  return (
    <div className="py-2">
      {isGenesisActive && (
        <div className="bg-red-400/10 border border-red-400/20 text-red-200 text-sm p-4 mb-4">
          <strong>Genesis Active:</strong> Minting and redeeming are currently
          disabled for this market.
        </div>
      )}
      <div
        className={clsx(
          "w-full mx-auto flex flex-col transition-all duration-300",
          {
            "blur-sm pointer-events-none": isGenesisActive,
          }
        )}
      >
        <div className="relative w-full">
          <div className="relative grid w-full">
            {/* Front Side (PEGGED) */}
            <div className="col-start-1 row-start-1 bg-transparent">
              <div
                className={`relative transition-opacity duration-200 ${
                  selectedType === "LONG"
                    ? "opacity-100 z-10 pointer-events-auto"
                    : "opacity-0 z-0 pointer-events-none"
                }`}
              >
                <div className="pt-4 pb-1 flex flex-col gap-4 min-h-[480px]">
                  <form onSubmit={handleSubmit} className="flex flex-col gap-0">
                    <div className="flex flex-col gap-y-0">
                      {/* From Token Input */}
                      <div className="space-y-2 p-4">
                        <div className="flex items-center justify-between">
                          <label className="text-md font-medium text-zinc-400">
                            From
                          </label>
                          <span className="text-sm text-zinc-500">
                            Balance:{""}
                            {isCollateralAtTop ? (
                              <>
                                {formatBalance(
                                  collateralBalance?.[0]?.result as
                                    | bigint
                                    | undefined
                                )}
                                {""}
                                wstETH
                              </>
                            ) : (
                              <>
                                {formatBalance(
                                  peggedBalance?.[0]?.result as
                                    | bigint
                                    | undefined
                                )}
                                {""}
                                {marketInfoData?.peggedToken.name || "haUSD"}
                              </>
                            )}
                          </span>
                        </div>
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={inputAmount}
                            onChange={handleInputAmountChange}
                            placeholder="0.0"
                            className="w-full text-2xl sm:text-3xl font-semibold bg-transparent text-white focus:outline-none pr-24"
                            tabIndex={0}
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-end">
                            <div className="flex items-center gap-4">
                              <button
                                type="button"
                                onClick={handleMaxClick}
                                className="text-white/70 hover:text-white text-sm transition-colors"
                              >
                                MAX
                              </button>
                              <span className="text-white/70">
                                {isCollateralAtTop
                                  ? "wstETH"
                                  : marketInfoData?.peggedToken.name || "haUSD"}
                              </span>
                            </div>
                            <div style={{ minHeight: "1rem" }}>
                              {isCollateralAtTop && (
                                <button
                                  onClick={() =>
                                    window.open(
                                      "https://swap.defillama.com/?chain=ethereum&from=0x0000000000000000000000000000000000000000&tab=swap&to=0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
                                      "_blank"
                                    )
                                  }
                                  className="text-white/60 hover:text-white/80 text-[10px] transition-colors"
                                >
                                  Get wstETH
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        <div
                          className={
                            selectedType === "LONG"
                              ? inputAdjusted && isCollateralAtTop
                                ? "text-sm text-yellow-400 font-semibold mt-1"
                                : "text-sm text-white/60 mt-1"
                              : "text-sm mt-1"
                          }
                          style={{ minHeight: "1.25rem" }}
                        >
                          {selectedType === "LONG" &&
                          isCollateralAtTop &&
                          inputAdjusted ? (
                            <>⚠️ {adjustmentReason}</>
                          ) : (
                            <span className="opacity-0">&nbsp;</span>
                          )}
                        </div>
                      </div>

                      {/* Swap Direction */}
                      <div className="relative h-0 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() =>
                            setIsCollateralAtTop(!isCollateralAtTop)
                          }
                          className="hover:outline-white/20 bg-transparent text-white h-12 w-12 flex items-center justify-center transition-colors focus:outline-none z-10"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={`w-5 h-5 transition-transform duration-300 ${
                              !isCollateralAtTop ? "rotate-180" : "rotate-0"
                            }`}
                          >
                            <path d="M12 4v16m-6-6 6 6 6-6" />
                          </svg>
                        </button>
                      </div>

                      {/* To Token Input */}
                      <div className="space-y-2 p-4 mt-1">
                        <div className="flex items-center justify-between">
                          <label className="text-md font-medium text-zinc-400">
                            To
                          </label>
                          <span className="text-sm text-zinc-500">
                            Balance:{""}
                            {isCollateralAtTop ? (
                              <>
                                {formatBalance(
                                  peggedBalance?.[0]?.result as
                                    | bigint
                                    | undefined
                                )}
                                {""}
                                {marketInfoData?.peggedToken.name || "haUSD"}
                              </>
                            ) : (
                              <>
                                {formatBalance(
                                  collateralBalance?.[0]?.result as
                                    | bigint
                                    | undefined
                                )}
                                {""}
                                wstETH
                              </>
                            )}
                          </span>
                        </div>
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={outputAmount}
                            onChange={handleOutputAmountChange}
                            placeholder="0.0"
                            className="w-full bg-transparent text-2xl sm:text-3xl font-semibold text-white focus:outline-none pr-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            tabIndex={0}
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-4">
                            <span className="text-white/70">
                              {isCollateralAtTop
                                ? marketInfoData?.peggedToken.name || "haUSD"
                                : "wstETH"}
                            </span>
                          </div>
                        </div>
                        {/* Removed invisible placeholder and extra margin here for PEGGED tab */}
                        <div
                          className={`text-sm mt-0 ${
                            !isCollateralAtTop &&
                            selectedType === "LONG" &&
                            redeemPeggedDryRunError
                              ? "text-red-500 font-semibold"
                              : "invisible"
                          }`}
                          style={{ minHeight: "0.25rem" }}
                        >
                          Invalid amount or not enough balance
                        </div>
                      </div>
                    </div>

                    {/* Fee Display - Always visible */}
                    <div className="p-2 mt-1 mb-0">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-400">Fee:</span>
                        <div className="text-right">
                          <div className="text-indigo-400 font-medium">
                            {inputAmount && parseFloat(inputAmount) > 0
                              ? selectedType === "LONG"
                                ? formatFeeToken(dryRunFee)
                                : dryRunFeeRatio
                                ? `${formatFeeToken(
                                    dryRunFee
                                  )} (${formatFeeRatio(dryRunFeeRatio)})`
                                : formatFeeToken(dryRunFee)
                              : "-"}
                          </div>
                          {selectedType === "LONG" ? (
                            peggedTokenFeePercentage !== undefined &&
                            inputAmount &&
                            parseFloat(inputAmount) > 0 ? (
                              <div className="text-xs text-zinc-500">
                                {peggedTokenFeePercentage < 0.01
                                  ? peggedTokenFeePercentage.toFixed(6)
                                  : peggedTokenFeePercentage.toFixed(2)}
                                %
                              </div>
                            ) : (
                              <div className="text-xs text-zinc-500">-</div>
                            )
                          ) : (
                            // Placeholder to keep consistent height with pegged fee box
                            <div className="text-xs text-zinc-500 opacity-0">
                              -
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div>
                      {!isConnected ? (
                        <button
                          type="submit"
                          disabled
                          className={`w-full p-4 text-center text-xl text-zinc-500 cursor-not-allowed font-medium rounded-full`}
                        >
                          Connect Wallet
                        </button>
                      ) : isPending && pendingStep === "approval" ? (
                        <button
                          type="submit"
                          disabled
                          className={`w-full p-4 text-center text-xl text-zinc-500 cursor-not-allowed font-medium rounded-full`}
                        >
                          Waiting for approval transaction...
                        </button>
                      ) : isPending && pendingStep === "mintOrRedeem" ? (
                        <button
                          type="submit"
                          disabled
                          className={`w-full p-4 text-center text-xl text-zinc-500 cursor-not-allowed font-medium rounded-full`}
                        >
                          Waiting for mint/redeem transaction...
                        </button>
                      ) : (
                        <button
                          onClick={handleSubmit}
                          disabled={
                            !inputAmount || parseFloat(inputAmount) <= 0
                          }
                          className={`w-full h-[60px] p-4 text-center text-xl hover:outline-white/20 text-white font-medium disabled:outline-white/5 disabled:text-zinc-500 disabled:cursor-not-allowed transition-colors duration-200 rounded-full`}
                        >
                          {(() => {
                            if (!inputAmount || parseFloat(inputAmount) <= 0)
                              return "Enter Amount";
                            return isCollateralAtTop ? "MINT" : "REDEEM";
                          })()}
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Back Side (LEVERAGE) */}
            <div className="col-start-1 row-start-1 bg-transparent">
              <div
                className={`relative transition-opacity duration-200 ${
                  selectedType === "STEAMED"
                    ? "opacity-100 z-10 pointer-events-auto"
                    : "opacity-0 z-0 pointer-events-none"
                }`}
              >
                <div className="pt-4 pb-1 flex flex-col gap-4 min-h-[480px]">
                  <form onSubmit={handleSubmit} className="flex flex-col gap-0">
                    <div className="flex flex-col gap-y-0">
                      {/* From Token Input */}
                      <div className="space-y-2 p-4">
                        <div className="flex items-center justify-between">
                          <label className="text-md font-medium text-zinc-400">
                            From
                          </label>
                          <span className="text-sm text-zinc-500">
                            Balance:{""}
                            {isCollateralAtTop ? (
                              <>
                                {formatBalance(
                                  collateralBalance?.[0]?.result as
                                    | bigint
                                    | undefined
                                )}
                                {""}
                                wstETH
                              </>
                            ) : (
                              <>
                                {formatBalance(
                                  leveragedBalance?.[0]?.result as
                                    | bigint
                                    | undefined
                                )}
                                {""}
                                {marketInfoData?.leveragedToken.name ||
                                  "steamedETH"}
                              </>
                            )}
                          </span>
                        </div>
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={inputAmount}
                            onChange={handleInputAmountChange}
                            placeholder="0.0"
                            className="w-full bg-transparent text-2xl sm:text-3xl font-semibold text-white focus:outline-none pr-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            tabIndex={0}
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-end">
                            <div className="flex items-center gap-4">
                              <button
                                type="button"
                                onClick={handleMaxClick}
                                className="text-white/70 hover:text-white text-sm transition-colors"
                              >
                                MAX
                              </button>
                              <span className="text-white/70">
                                {isCollateralAtTop
                                  ? "wstETH"
                                  : marketInfoData?.leveragedToken.name ||
                                    "steamedETH"}
                              </span>
                            </div>
                            <div style={{ minHeight: "1rem" }}>
                              {isCollateralAtTop && (
                                <button
                                  onClick={() =>
                                    window.open(
                                      "https://swap.defillama.com/?chain=ethereum&from=0x0000000000000000000000000000000000000000&tab=swap&to=0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
                                      "_blank"
                                    )
                                  }
                                  className="text-white/60 hover:text-white/80 text-[10px] transition-colors"
                                >
                                  Get wstETH
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        <div
                          className={
                            selectedType === "STEAMED"
                              ? inputAdjusted && isCollateralAtTop
                                ? "text-sm text-yellow-400 font-semibold mt-1"
                                : "text-sm text-white/60 mt-1"
                              : "text-sm mt-1"
                          }
                          style={{ minHeight: "1.25rem" }}
                        >
                          {selectedType === "STEAMED" &&
                          isCollateralAtTop &&
                          inputAdjusted ? (
                            <>⚠️ {adjustmentReason}</>
                          ) : (
                            <span className="opacity-0">&nbsp;</span>
                          )}
                        </div>
                      </div>

                      {/* Swap Direction - LEVERAGE */}
                      <div className="relative h-0 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() =>
                            setIsCollateralAtTop(!isCollateralAtTop)
                          }
                          className="hover:outline-white/20 bg-transparent text-white h-12 w-12 flex items-center justify-center transition-colors focus:outline-none z-10"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={`w-5 h-5 transition-transform duration-300 ${
                              !isCollateralAtTop ? "rotate-180" : "rotate-0"
                            }`}
                          >
                            <path d="M12 4v16m-6-6 6 6 6-6" />
                          </svg>
                        </button>
                      </div>

                      {/* To Token Input */}
                      <div className="space-y-2 p-4 mt-1">
                        <div className="flex items-center justify-between">
                          <label className="text-md font-medium text-zinc-400">
                            To
                          </label>
                          <span className="text-sm text-zinc-500">
                            Balance:{""}
                            {isCollateralAtTop ? (
                              <>
                                {formatBalance(
                                  leveragedBalance?.[0]?.result as
                                    | bigint
                                    | undefined
                                )}
                                {""}
                                {marketInfoData?.leveragedToken.name ||
                                  "steamedETH"}
                              </>
                            ) : (
                              <>
                                {formatBalance(
                                  collateralBalance?.[0]?.result as
                                    | bigint
                                    | undefined
                                )}
                                {""}
                                wstETH
                              </>
                            )}
                          </span>
                        </div>
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={outputAmount}
                            onChange={handleOutputAmountChange}
                            placeholder="0.0"
                            className="w-full bg-transparent text-2xl sm:text-3xl font-semibold text-white focus:outline-none pr-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            tabIndex={0}
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-4">
                            <span className="text-white/70">
                              {isCollateralAtTop
                                ? marketInfoData?.leveragedToken.name ||
                                  "steamedETH"
                                : "wstETH"}
                            </span>
                          </div>
                        </div>
                        <div
                          className={`text-sm mt-0 ${
                            !isCollateralAtTop &&
                            selectedType === "STEAMED" &&
                            redeemLeveragedDryRunError
                              ? "text-red-500 font-semibold"
                              : "invisible"
                          }`}
                          style={{ minHeight: "0.25rem" }}
                        >
                          Invalid amount or not enough balance
                        </div>
                      </div>
                    </div>

                    {/* Fee Display - Always visible */}
                    <div className="p-2 mt-1 mb-0">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-400">Fee:</span>
                        <div className="text-right">
                          <div className="text-indigo-400 font-medium">
                            {inputAmount && parseFloat(inputAmount) > 0
                              ? formatFeeToken(dryRunFee)
                              : "-"}
                          </div>
                          {selectedType === "LONG" ? (
                            peggedTokenFeePercentage !== undefined &&
                            inputAmount &&
                            parseFloat(inputAmount) > 0 ? (
                              <div className="text-xs text-zinc-500">
                                {peggedTokenFeePercentage < 0.01
                                  ? peggedTokenFeePercentage.toFixed(6)
                                  : peggedTokenFeePercentage.toFixed(2)}
                                %
                              </div>
                            ) : (
                              <div className="text-xs text-zinc-500">-</div>
                            )
                          ) : // For leveraged tokens, show the fee ratio percentage
                          dryRunFeeRatio &&
                            inputAmount &&
                            parseFloat(inputAmount) > 0 ? (
                            <div className="text-xs text-zinc-500">
                              {formatFeeRatio(dryRunFeeRatio)}
                            </div>
                          ) : (
                            <div className="text-xs text-zinc-500">-</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Submit Button for LEVERAGE */}
                    <div>
                      {!isConnected ? (
                        <button
                          type="submit"
                          disabled
                          className={`w-full p-4 text-center text-xl text-zinc-500 cursor-not-allowed font-medium rounded-full`}
                        >
                          Connect Wallet
                        </button>
                      ) : isPending && pendingStep === "approval" ? (
                        <button
                          type="submit"
                          disabled
                          className={`w-full p-4 text-center text-xl text-zinc-500 cursor-not-allowed font-medium rounded-full`}
                        >
                          Waiting for approval transaction...
                        </button>
                      ) : isPending && pendingStep === "mintOrRedeem" ? (
                        <button
                          type="submit"
                          disabled
                          className={`w-full p-4 text-center text-xl text-zinc-500 cursor-not-allowed font-medium rounded-full`}
                        >
                          Waiting for mint/redeem transaction...
                        </button>
                      ) : (
                        <button
                          onClick={handleSubmit}
                          disabled={
                            !inputAmount || parseFloat(inputAmount) <= 0
                          }
                          className={`w-full h-[60px] p-4 text-center text-xl hover:outline-white/20 text-white font-medium disabled:outline-white/5 disabled:text-zinc-500 disabled:cursor-not-allowed transition-colors duration-200 rounded-full`}
                        >
                          {(() => {
                            if (!inputAmount || parseFloat(inputAmount) <= 0)
                              return "Enter Amount";
                            return isCollateralAtTop ? "MINT" : "REDEEM";
                          })()}
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Modal skeleton */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-[#181818] p-8 shadow-lg w-full max-w-md">
              <h3 className="text-xl font-bold mb-4 text-white">
                Confirm Mint Transaction
              </h3>
              <div className="space-y-2 text-white text-sm">
                <div className="flex justify-between">
                  <span>Collateral Used:</span>
                  <span>{/* TODO: Show value */}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fee:</span>
                  <span>{/* TODO: Show value */}</span>
                </div>
                <div className="flex justify-between">
                  <span>Oracle Price:</span>
                  <span>{/* TODO: Show value */}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pegged Minted:</span>
                  <span>{/* TODO: Show value */}</span>
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <button
                  className="px-4 py-2 bg-[#2A2A2A] text-white hover:bg-[#333]"
                  onClick={() => setShowConfirmModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 hover:outline-white/20 text-white font-bold"
                  // TODO: Wire up to actual mint
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Status Modal */}
        <MintRedeemStatusModal
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          transactionType={transactionDetails.type}
          tokenType={transactionDetails.tokenType}
          inputAmount={transactionDetails.inputAmount}
          outputAmount={transactionDetails.outputAmount}
          inputToken={transactionDetails.inputToken}
          outputToken={transactionDetails.outputToken}
          transactionHash={transactionHash}
          onTransactionSuccess={async () => {
            setInputAmount("");
            setOutputAmount("");
            setIsPending(false);
            setPendingStep(null);
            // Refetch all data to update balances and other contract state
            await refetchAllData();
          }}
        />
      </div>
    </div>
  );
};

export default MintRedeemForm;
