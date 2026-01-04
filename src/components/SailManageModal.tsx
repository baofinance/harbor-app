"use client";

import React, { useState, useEffect, useMemo } from "react";
import { parseEther, formatEther, parseUnits, formatUnits } from "viem";
import {
 useAccount,
 useBalance,
 useContractRead,
 useWriteContract,
 usePublicClient,
 useSendTransaction,
} from "wagmi";
import { BaseError, ContractFunctionRevertedError } from "viem";
import { ERC20_ABI, MINTER_ABI } from "@/abis/shared";
import { MINTER_ETH_ZAP_V2_ABI, MINTER_USDC_ZAP_V2_ABI } from "@/config/contracts";
import { useCollateralPrice } from "@/hooks/useCollateralPrice";
import SimpleTooltip from "@/components/SimpleTooltip";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import {
 TransactionProgressModal,
 TransactionStep,
} from "@/components/TransactionProgressModal";
import { useDefiLlamaSwap, getDefiLlamaSwapTx } from "@/hooks/useDefiLlamaSwap";
import { useUserTokens, useTokenDecimals } from "@/hooks/useUserTokens";
import { formatBalance } from "@/utils/formatters";

interface SailManageModalProps {
 isOpen: boolean;
 onClose: () => void;
 marketId: string;
 market: any;
 initialTab?:"mint" |"redeem";
 onSuccess?: () => void;
}

type ModalStep =
 |"input"
 |"approving"
 |"minting"
 |"redeeming"
 |"success"
 |"error";

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

export const SailManageModal = ({
 isOpen,
 onClose,
 marketId,
 market,
 initialTab ="mint",
 onSuccess,
}: SailManageModalProps) => {
 const { address, isConnected } = useAccount();
 const publicClient = usePublicClient();
 const { writeContractAsync } = useWriteContract();
 const { sendTransactionAsync } = useSendTransaction();

 const [activeTab, setActiveTab] = useState<"mint" |"redeem">(initialTab);
 const [amount, setAmount] = useState("");
 const [selectedDepositAsset, setSelectedDepositAsset] = useState<
 string | null
 >(null);
 const [showCustomTokenInput, setShowCustomTokenInput] = useState(false);
 const [customTokenAddress, setCustomTokenAddress] = useState<string>("");
 const [step, setStep] = useState<ModalStep>("input");
 const [error, setError] = useState<string | null>(null);
 const [txHash, setTxHash] = useState<string | null>(null);

 // Progress modal state
 const [progressModal, setProgressModal] = useState<{
 isOpen: boolean;
 title: string;
 steps: TransactionStep[];
 currentStepIndex: number;
 } | null>(null);

 const minterAddress = market.addresses?.minter as `0x${string}` | undefined;
 const leveragedTokenAddress = market.addresses?.leveragedToken as
 | `0x${string}`
 | undefined;
 const collateralAddress = market.addresses?.collateralToken as
 | `0x${string}`
 | undefined;
 const wrappedCollateralAddress = market.addresses?.wrappedCollateralToken as
 | `0x${string}`
 | undefined;

 const collateralSymbol = market.collateral?.symbol ||"ETH";
 const leveragedTokenSymbol = market.leveragedToken?.symbol ||"hs";
 const collateralSymbolLower = collateralSymbol.toLowerCase();
 const wrappedCollateralSymbol = market.collateral?.underlyingSymbol || "";
 const wrappedCollateralSymbolLower = wrappedCollateralSymbol.toLowerCase();

 // Determine market type
 const isWstETHMarket = collateralSymbolLower === "wsteth";
 const isFxUSDMarket = collateralSymbolLower === "fxusd" || collateralSymbolLower === "fxsave";

 // Get accepted deposit assets
 const acceptedAssets = useMemo(
   () => getAcceptedDepositAssets(market),
   [market]
 );

 // Fetch user wallet tokens (for "any token" deposit selection)
 const { tokens: userTokens } = useUserTokens();

 // Determine asset types
 const isUSDC = selectedDepositAsset?.toLowerCase() === "usdc";
 const isFxUSD = selectedDepositAsset?.toLowerCase() === "fxusd";
 const isNativeETH = selectedDepositAsset?.toLowerCase() === "eth";
 const isStETH = selectedDepositAsset?.toLowerCase() === "steth";
 const isFxSAVE = selectedDepositAsset?.toLowerCase() === "fxsave";
 const isWstETH = selectedDepositAsset?.toLowerCase() === "wsteth";
 const isCustomToken =
   selectedDepositAsset === "custom" &&
   customTokenAddress &&
   customTokenAddress.startsWith("0x") &&
   customTokenAddress.length === 42;
 
 // Check if selected asset is wrapped collateral (fxSAVE, wstETH) - these don't need zaps
 // Note: fxUSD is NOT wrapped collateral (it's the underlying collateral that needs zap)
 // Only fxSAVE (the wrapped version) should skip zaps
 // We check against wrappedCollateralSymbol (underlyingSymbol) not collateralSymbol
 const isWrappedCollateral = isFxSAVE || isWstETH || 
   (wrappedCollateralSymbolLower && selectedDepositAsset?.toLowerCase() === wrappedCollateralSymbolLower);

// Get zap contract address - use leveragedTokenZap for minting leveraged tokens
const zapAddress = market.addresses?.leveragedTokenZap as `0x${string}` | undefined;

 // Format display helper (after isUSDC is defined)
 const formatDisplay = (
   value?: bigint | null,
   maximumFractionDigits: number = 4
 ) => {
   if (!value || value === 0n) return"0.00";
   // USDC uses 6 decimals, others use 18 decimals
   const num = isUSDC 
     ? Number(formatUnits(value, 6))
     : Number(formatEther(value));
   if (!Number.isFinite(num)) return"0.00";
   return new Intl.NumberFormat("en-US", {
     minimumFractionDigits: 0,
     maximumFractionDigits,
   }).format(num);
 };

 // Set default deposit asset
 useEffect(() => {
 if (acceptedAssets.length > 0 && !selectedDepositAsset) {
 setSelectedDepositAsset(acceptedAssets[0].symbol);
 }
 }, [acceptedAssets, selectedDepositAsset]);

 // Get deposit asset address (extended to support user tokens + custom token address)
 const depositAssetAddress = useMemo(() => {
   if (!selectedDepositAsset) return undefined;
   const normalized = selectedDepositAsset.toLowerCase();
   if (normalized ==="eth") return undefined; // Native ETH
   if (normalized === "custom") {
     return (customTokenAddress as `0x${string}` | undefined) || undefined;
   }
   // Check user tokens first (only ERC20s; ETH handled above)
   const userToken = userTokens.find(
     (t) => t.symbol.toUpperCase() === selectedDepositAsset.toUpperCase()
   );
   if (userToken && userToken.address !== "ETH") {
     return userToken.address as `0x${string}`;
   }
   if (normalized ==="usdc") return "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as `0x${string}`; // USDC
   // wstETH is the collateral token
   if (normalized ==="wsteth") return market.addresses?.collateralToken;
   // stETH is the wrapped collateral token
   if (normalized ==="steth") return market.addresses?.wrappedCollateralToken;
   // fxUSD uses collateral token address
   if (normalized ==="fxusd") return market.addresses?.collateralToken;
   if (normalized === "fxsave") return market.addresses?.wrappedCollateralToken;
   return market.addresses?.collateralToken; // Default
 }, [selectedDepositAsset, market.addresses, userTokens, customTokenAddress]);

// Determine which zap to use
const useZap = !!zapAddress && !isWrappedCollateral && activeTab === "mint";

// Swap support: non-supported tokens swap to ETH (wstETH markets) or USDC (fxSAVE markets)
const isDirectlyAccepted =
  (isFxUSDMarket && (isUSDC || isFxUSD || isFxSAVE)) ||
  (isWstETHMarket && (isNativeETH || isStETH || isWstETH));

const hasValidTokenAddress =
  isNativeETH ||
  (!!depositAssetAddress &&
    typeof depositAssetAddress === "string" &&
    depositAssetAddress.startsWith("0x") &&
    depositAssetAddress.length === 42);

const needsSwap =
  activeTab === "mint" &&
  !!selectedDepositAsset &&
  selectedDepositAsset !== "" &&
  !isDirectlyAccepted &&
  hasValidTokenAddress;

const useETHZap = useZap && isWstETHMarket && (isNativeETH || isStETH || needsSwap);
const useUSDCZap = useZap && isFxUSDMarket && (isUSDC || isFxUSD || needsSwap);

// Get fxSAVE rate for USDC zap calculations
const priceOracleAddress = market.addresses?.collateralPrice as `0x${string}` | undefined;
const { maxRate: fxSAVERate } = useCollateralPrice(
  priceOracleAddress,
  { enabled: useUSDCZap && !!priceOracleAddress }
);

 // Token decimals (for parsing amounts, swap quoting, etc.)
 const tokenAddressForDecimals =
   isNativeETH || !depositAssetAddress ? undefined : (depositAssetAddress as `0x${string}`);
 const { decimals: selectedTokenDecimals } = useTokenDecimals(tokenAddressForDecimals);
 const hasValidDecimals = isNativeETH || (selectedTokenDecimals != null && selectedTokenDecimals > 0);

 // Common swap targets
 const USDC_ADDRESS =
   "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as `0x${string}`;
 const ETH_ADDRESS = "ETH" as const;

 // Swap quote (Velora/ParaSwap via DefiLlama) for "any token" deposits
 const swapTargetToken = isWstETHMarket ? ETH_ADDRESS : USDC_ADDRESS;
 const fromTokenForSwap = isNativeETH ? "ETH" : (depositAssetAddress as `0x${string}`);
 const toTokenDecimals = swapTargetToken === "ETH" ? 18 : 6;
 const { data: swapQuote, isLoading: isLoadingSwapQuote, error: swapQuoteError } =
   useDefiLlamaSwap(
     fromTokenForSwap,
     swapTargetToken as any,
     amount && parseFloat(amount) > 0 ? amount : "1",
     !!isOpen &&
       activeTab === "mint" &&
       needsSwap &&
       !!fromTokenForSwap &&
       !!amount &&
       parseFloat(amount) > 0 &&
       !!hasValidDecimals,
     selectedTokenDecimals,
     toTokenDecimals
   );

 // Merge accepted assets with user tokens for dropdown (avoid duplicates)
 const allAvailableAssets = useMemo(() => {
   const acceptedUpper = new Set(acceptedAssets.map((a) => a.symbol.toUpperCase()));
   const filteredUserTokens = userTokens.filter(
     (t) => !acceptedUpper.has(t.symbol.toUpperCase()) && t.balance > 0n
   );
   return { filteredUserTokens };
 }, [acceptedAssets, userTokens]);

 // Get native ETH balance (when ETH is selected) - use useBalance
 const { data: nativeEthBalance } = useBalance({
 address: address,
 query: {
 enabled:
 isOpen &&
 !!address &&
 activeTab ==="mint" &&
 selectedDepositAsset ==="ETH",
 refetchInterval: isOpen ? 15000 : false, // Only poll when modal is open, reduced from 5s to 15s
 },
 });

 // Get user balance for deposit asset (wstETH, stETH, USDC, fxUSD, etc.)
 const { data: depositAssetBalanceData } = useContractRead({
   address: depositAssetAddress as `0x${string}`,
   abi: ERC20_ABI,
   functionName:"balanceOf",
   args: address ? [address] : undefined,
   query: {
     enabled:
       isOpen &&
       !!address &&
       activeTab ==="mint" &&
       !!depositAssetAddress &&
       selectedDepositAsset !=="ETH",
     refetchInterval: isOpen ? 15000 : false, // Only poll when modal is open, reduced from 5s to 15s
     retry: 1,
   },
 });

 // Get allowance for zap contract (if using zap)
 const { data: zapAllowanceData } = useContractRead({
   address: depositAssetAddress as `0x${string}`,
   abi: ERC20_ABI,
   functionName:"allowance",
   args: address && zapAddress && depositAssetAddress ? [address, zapAddress] : undefined,
   query: {
     enabled:
       isOpen &&
       !!address &&
       !!zapAddress &&
       !!depositAssetAddress &&
       activeTab ==="mint" &&
       useZap &&
       (useETHZap || useUSDCZap) &&
       !isNativeETH,
     retry: 1,
   },
 });

 // Get user leveraged token balance
 const { data: leveragedTokenBalance } = useContractRead({
 address: leveragedTokenAddress,
 abi: ERC20_ABI,
 functionName:"balanceOf",
 args: address ? [address] : undefined,
 query: {
 enabled:
 isOpen &&
 !!address &&
 !!leveragedTokenAddress &&
 activeTab ==="redeem",
 },
 });

 // Get allowance for deposit asset (for direct minting or zap)
 const allowanceTarget = useZap && zapAddress ? zapAddress : minterAddress;
 const { data: depositAssetAllowance } = useContractRead({
   address: depositAssetAddress,
   abi: ERC20_ABI,
   functionName:"allowance",
   args:
     address && allowanceTarget && depositAssetAddress
       ? [address, allowanceTarget]
       : undefined,
   query: {
     enabled:
       isOpen &&
       !!address &&
       !!allowanceTarget &&
       !!depositAssetAddress &&
       activeTab ==="mint" &&
       !isNativeETH,
   },
 });

 // Swap allowance (for ParaSwap / Velora swaps)
 const PARASWAP_TOKEN_TRANSFER_PROXY =
   "0x216b4b4ba9f3e719726886d34a177484278bfcae" as `0x${string}`;
 const { data: swapAllowance } = useContractRead({
   address: depositAssetAddress,
   abi: ERC20_ABI,
   functionName: "allowance",
   args: address ? [address, PARASWAP_TOKEN_TRANSFER_PROXY] : undefined,
   query: {
     enabled:
       isOpen &&
       !!address &&
       activeTab === "mint" &&
       needsSwap &&
       !isNativeETH &&
       !!depositAssetAddress,
     retry: 1,
   },
 });

 // Post-swap USDC approval to leveraged zap (fxSAVE markets)
 const { data: usdcZapAllowance } = useContractRead({
   address: USDC_ADDRESS,
   abi: ERC20_ABI,
   functionName: "allowance",
   args: address && zapAddress ? [address, zapAddress] : undefined,
   query: {
     enabled:
       isOpen &&
       !!address &&
       activeTab === "mint" &&
       needsSwap &&
       !isWstETHMarket &&
       !!zapAddress,
     retry: 1,
   },
 });

 // Get allowance for leveraged token
 const { data: leveragedTokenAllowance } = useContractRead({
 address: leveragedTokenAddress,
 abi: ERC20_ABI,
 functionName:"allowance",
 args:
 address && minterAddress && leveragedTokenAddress
 ? [address, minterAddress]
 : undefined,
 query: {
 enabled:
 isOpen &&
 !!address &&
 !!minterAddress &&
 !!leveragedTokenAddress &&
 activeTab ==="redeem",
 },
 });

 // Parse amount safely with correct decimals
 const parsedAmount = useMemo(() => {
   if (!amount || amount === "") return undefined;
   try {
     if (activeTab === "redeem") {
       // Leveraged token amounts are 18 decimals
       return parseEther(amount);
     }

     // Mint side: use token decimals (USDC=6, others vary)
     if (isNativeETH) return parseEther(amount);

     const decimals =
       selectedDepositAsset?.toLowerCase() === "usdc"
         ? 6
         : selectedTokenDecimals ?? 18;

     return parseUnits(amount, decimals);
   } catch {
     return undefined;
   }
 }, [amount, activeTab, isNativeETH, selectedDepositAsset, selectedTokenDecimals]);

 // Dry run for mint
 const mintDryRunEnabled =
 activeTab ==="mint" &&
 !!parsedAmount &&
 !!minterAddress &&
 parsedAmount > 0n;

 const { data: mintDryRunResult, error: mintDryRunErr } = useContractRead({
 address: minterAddress,
 abi: MINTER_ABI,
 functionName:"mintLeveragedTokenDryRun",
 args: parsedAmount ? [parsedAmount] : undefined,
 query: {
 enabled: mintDryRunEnabled,
 },
 });

 // Dry run for redeem
 const redeemDryRunEnabled =
 activeTab ==="redeem" &&
 !!parsedAmount &&
 !!minterAddress &&
 parsedAmount > 0n;

 const { data: redeemDryRunResult, error: redeemDryRunErr } =
 useContractRead({
 address: minterAddress,
 abi: MINTER_ABI,
 functionName:"redeemLeveragedTokenDryRun",
 args: parsedAmount ? [parsedAmount] : undefined,
 query: {
 enabled: redeemDryRunEnabled,
 },
 });

 // Calculate fees and outputs
 const mintFee = useMemo(() => {
 if (!mintDryRunResult || !parsedAmount || parsedAmount === 0n) return 0n;
 const [
 incentiveRatio,
 wrappedFee,
 wrappedDiscount,
 wrappedCollateralUsed,
 leveragedMinted,
 price,
 rate,
 ] = mintDryRunResult as [
 bigint,
 bigint,
 bigint,
 bigint,
 bigint,
 bigint,
 bigint
 ];
 return wrappedFee;
 }, [mintDryRunResult, parsedAmount]);

 const mintFeePercentage = useMemo(() => {
 if (!mintFee || !parsedAmount || parsedAmount === 0n) return 0;
 return (Number(mintFee) / Number(parsedAmount)) * 100;
 }, [mintFee, parsedAmount]);

 const expectedMintOutput = useMemo(() => {
 if (!mintDryRunResult || !parsedAmount || parsedAmount === 0n)
 return undefined;
 const [
 incentiveRatio,
 wrappedFee,
 wrappedDiscount,
 wrappedCollateralUsed,
 leveragedMinted,
 price,
 rate,
 ] = mintDryRunResult as [
 bigint,
 bigint,
 bigint,
 bigint,
 bigint,
 bigint,
 bigint
 ];
 return leveragedMinted;
 }, [mintDryRunResult, parsedAmount]);

 const redeemFee = useMemo(() => {
 if (!redeemDryRunResult || !parsedAmount || parsedAmount === 0n) return 0n;
 const [
 incentiveRatio,
 wrappedFee,
 leveragedRedeemed,
 wrappedCollateralReturned,
 price,
 rate,
 ] = redeemDryRunResult as [bigint, bigint, bigint, bigint, bigint, bigint];
 return wrappedFee;
 }, [redeemDryRunResult, parsedAmount]);

 const expectedRedeemOutput = useMemo(() => {
 if (!redeemDryRunResult || !parsedAmount || parsedAmount === 0n)
 return undefined;
 const [
 incentiveRatio,
 wrappedFee,
 leveragedRedeemed,
 wrappedCollateralReturned,
 price,
 rate,
 ] = redeemDryRunResult as [bigint, bigint, bigint, bigint, bigint, bigint];
 return wrappedCollateralReturned;
 }, [redeemDryRunResult, parsedAmount]);

 const redeemFeePercentage = useMemo(() => {
 // Fee percentage should be based on wrapped collateral output, not leveraged input
 if (!redeemFee || !expectedRedeemOutput || expectedRedeemOutput === 0n)
 return 0;
 // Calculate percentage based on fee relative to gross output (output + fee)
 const grossOutput = expectedRedeemOutput + redeemFee;
 return (Number(redeemFee) / Number(grossOutput)) * 100;
 }, [redeemFee, expectedRedeemOutput]);

 // Reset state when modal opens/closes
 useEffect(() => {
 if (!isOpen) {
 setAmount("");
 setStep("input");
 setError(null);
 setTxHash(null);
 setActiveTab(initialTab);
 }
 }, [isOpen, initialTab]);

 // Handle tab change
 const handleTabChange = (tab:"mint" |"redeem") => {
 if (step ==="input") {
 setActiveTab(tab);
 setAmount("");
 setError(null);
 }
 };

 // Validate amount
 const validateAmount = (): boolean => {
 if (!amount || parseFloat(amount) <= 0) {
 setError("Please enter a valid amount");
 return false;
 }

 if (activeTab ==="mint") {
 // Custom token address validation
 if (selectedDepositAsset === "custom") {
   if (!customTokenAddress || !customTokenAddress.startsWith("0x") || customTokenAddress.length !== 42) {
     setError("Please enter a valid token address");
     return false;
   }
 }

 // If a swap is required, ensure the quote is available before proceeding
 if (needsSwap && !swapQuote) {
   setError("Swap quote not ready yet. Please wait a moment and try again.");
   return false;
 }

 // Use native ETH balance if ETH is selected, otherwise use deposit asset balance
 let balance = 0n;
 if (selectedDepositAsset ==="ETH") {
 balance = nativeEthBalance?.value || 0n;
 } else {
 // Handle both direct bigint and { result: bigint } formats for ERC20 tokens
 if (depositAssetBalanceData) {
 if (
 typeof depositAssetBalanceData ==="object" &&
"result" in depositAssetBalanceData
 ) {
 balance = (depositAssetBalanceData.result as bigint) || 0n;
 } else {
 balance = depositAssetBalanceData as bigint;
 }
 }
 }
 if (parsedAmount && parsedAmount > balance) {
 setError("Insufficient balance");
 return false;
 }
 } else {
 // Handle both direct bigint and { result: bigint } formats
 let balance = 0n;
 if (leveragedTokenBalance) {
 if (
 typeof leveragedTokenBalance ==="object" &&
"result" in leveragedTokenBalance
 ) {
 balance = (leveragedTokenBalance.result as bigint) || 0n;
 } else {
 balance = leveragedTokenBalance as bigint;
 }
 }
 if (parsedAmount && parsedAmount > balance) {
 setError("Insufficient balance");
 return false;
 }
 }

 return true;
 };

 // Helper to update a step in the progress modal
 const updateProgressStep = (
 stepId: string,
 updates: Partial<TransactionStep>
 ) => {
 setProgressModal((prev) => {
 if (!prev) return prev;
 const newSteps = prev.steps.map((s) =>
 s.id === stepId ? { ...s, ...updates } : s
 );
 // Find new current step index (first non-completed step)
 const newCurrentIndex = newSteps.findIndex(
 (s) => s.status !=="completed"
 );
 return {
 ...prev,
 steps: newSteps,
 currentStepIndex:
 newCurrentIndex === -1 ? newSteps.length - 1 : newCurrentIndex,
 };
 });
 };

 // Handle mint
 const handleMint = async () => {
 if (!validateAmount() || !address || !minterAddress || !parsedAmount)
 return;

 setError(null);

 // Check if we need to wrap ETH first
 if (selectedDepositAsset ==="ETH" && !wrappedCollateralAddress) {
 setError("Wrapped collateral token address not found");
 return;
 }

 const includeSwap = needsSwap && !!swapQuote;
 const swapOutAmount = includeSwap ? swapQuote!.toAmount : 0n;

 // Determine if approval is needed (for zap or direct minting)
 // If we're swapping first, approvals are handled separately (swap approval + post-swap USDC approval).
 const needsZapApproval =
   !includeSwap && useZap && zapAddress && depositAssetAddress && !isNativeETH
     ? ((depositAssetAllowance as bigint) || 0n) < parsedAmount
     : false;
 const needsDirectApproval =
   !includeSwap && !useZap && depositAssetAddress
     ? ((depositAssetAllowance as bigint) || 0n) < parsedAmount
     : false;
 const needsApproval = needsZapApproval || needsDirectApproval;

 // Swap approvals
 const needsSwapApproval =
   includeSwap &&
   !isNativeETH &&
   !!depositAssetAddress &&
   (((swapAllowance as bigint) || 0n) < parsedAmount);

 // Post-swap USDC approval to leveraged zap
 const needsPostSwapUsdcApproval =
   includeSwap &&
   !isWstETHMarket &&
   !!zapAddress &&
   (((usdcZapAllowance as bigint) || 0n) < swapOutAmount);

 // Determine zap asset name for labels
 let zapAssetName: string | null = null;
 if (useZap) {
   if (isNativeETH) zapAssetName = "ETH";
   else if (isStETH) zapAssetName = "stETH";
   else if (isUSDC) zapAssetName = "USDC";
   else if (isFxUSD) zapAssetName = "fxUSD";
 }

 // Build steps
 const steps: TransactionStep[] = [];
 if (needsSwapApproval) {
   steps.push({
     id: "approveSwap",
     label: `Approve ${selectedDepositAsset} for swap`,
     status: "pending",
     details: `Approve ${selectedDepositAsset} for swapping via Velora`,
   });
 }
 if (includeSwap) {
   const swapTargetLabel = isWstETHMarket ? "ETH" : "USDC";
   steps.push({
     id: "swap",
     label: `Swap ${selectedDepositAsset} → ${swapTargetLabel}`,
     status: "pending",
     details: "Execute swap via Velora",
   });
 }
 if (needsPostSwapUsdcApproval) {
   steps.push({
     id: "approvePostSwap",
     label: "Approve USDC for zap",
     status: "pending",
     details: "Approve USDC for minting via zap",
   });
 }
 if (needsApproval) {
   const approveLabel = useZap && zapAssetName
     ? `Approve ${zapAssetName} for zap`
     : `Approve ${selectedDepositAsset || collateralSymbol}`;
   steps.push({
     id:"approve",
     label: approveLabel,
     status:"pending",
     details: `Approve ${
       useZap && zapAssetName ? zapAssetName : (selectedDepositAsset || collateralSymbol)
     } for minting`,
   });
 }
 const mintLabel = useZap && zapAssetName
   ? `Zap ${zapAssetName} to ${leveragedTokenSymbol}`
   : `Mint ${leveragedTokenSymbol}`;
 steps.push({
   id:"mint",
   label: mintLabel,
   status:"pending",
   details: `Mint ${
     expectedMintOutput
     ? Number(formatEther(expectedMintOutput)).toFixed(4)
     :"..."
   } ${leveragedTokenSymbol}`,
 });

 // Open progress modal
 setProgressModal({
 isOpen: true,
 title: `Mint ${leveragedTokenSymbol}`,
 steps,
 currentStepIndex: 0,
 });

 try {
   // Step 1a: Approve source token for swap (if needed)
   if (needsSwapApproval && depositAssetAddress) {
     updateProgressStep("approveSwap", { status: "in_progress" });
     const approveHash = await writeContractAsync({
       address: depositAssetAddress,
       abi: ERC20_ABI,
       functionName: "approve",
       args: [PARASWAP_TOKEN_TRANSFER_PROXY, parsedAmount],
     });
     await publicClient?.waitForTransactionReceipt({ hash: approveHash });
     updateProgressStep("approveSwap", {
       status: "completed",
       txHash: approveHash,
     });
   }

   // Step 1b: Swap (if needed)
   let effectiveMintAmount: bigint = parsedAmount;
   if (includeSwap && swapQuote && address) {
     updateProgressStep("swap", { status: "in_progress" });

     // Build the swap transaction right before sending (ParaSwap tx builder checks allowance)
     const swapTx = await getDefiLlamaSwapTx(
       fromTokenForSwap,
       swapTargetToken as any,
       parsedAmount,
       address as `0x${string}`,
       1.0,
       selectedTokenDecimals ?? 18,
       toTokenDecimals
     );

     const swapHash = await sendTransactionAsync({
       to: swapTx.to,
       data: swapTx.data,
       value: swapTx.value,
       gas: swapTx.gas,
     });

     await publicClient?.waitForTransactionReceipt({ hash: swapHash });
     updateProgressStep("swap", { status: "completed", txHash: swapHash });

     // Use quote output as the effective amount for zap input (ETH=18, USDC=6)
     effectiveMintAmount = swapOutAmount;
   }

   // Step 1c: Approve post-swap USDC for zap (fxSAVE markets)
   if (needsPostSwapUsdcApproval && zapAddress) {
     updateProgressStep("approvePostSwap", { status: "in_progress" });
     const approveHash = await writeContractAsync({
       address: USDC_ADDRESS,
       abi: ERC20_ABI,
       functionName: "approve",
       args: [zapAddress, effectiveMintAmount],
     });
     await publicClient?.waitForTransactionReceipt({ hash: approveHash });
     updateProgressStep("approvePostSwap", {
       status: "completed",
       txHash: approveHash,
     });
   }

   // Step 2: Approve (if needed, no-swap path)
   if (needsApproval && depositAssetAddress) {
     updateProgressStep("approve", { status:"in_progress" });
     const approveTarget = useZap && zapAddress ? zapAddress : minterAddress;
     const approveHash = await writeContractAsync({
       address: depositAssetAddress,
       abi: ERC20_ABI,
       functionName:"approve",
       args: [approveTarget, parsedAmount],
     });
     await publicClient?.waitForTransactionReceipt({ hash: approveHash });
     updateProgressStep("approve", {
       status:"completed",
       txHash: approveHash,
     });
   }

   // Step 3: Mint (via zap or direct)
   updateProgressStep("mint", { status:"in_progress" });
   
   // Calculate minimum output based on zap type or direct minting
   let minOutput: bigint;
   const amountForMint = includeSwap ? effectiveMintAmount : parsedAmount;
   
   if (useUSDCZap && fxSAVERate && fxSAVERate > 0n) {
     // For USDC/fxUSD zap: minOutput = amount / fxSAVE rate
     let amountIn18Decimals: bigint;
     if (includeSwap ? !isWstETHMarket : isUSDC) {
       // USDC: convert from 6 decimals to 18 decimals
       amountIn18Decimals = amountForMint * 10n ** 12n;
     } else {
       // fxUSD: already in 18 decimals
       amountIn18Decimals = amountForMint;
     }
     const leveragedOutBeforeSlippage = amountIn18Decimals / fxSAVERate;
     minOutput = (leveragedOutBeforeSlippage * 995n) / 1000n; // 0.5% slippage
   } else {
     // For direct minting or ETH zap: use expectedMintOutput with 1% slippage
     minOutput = expectedMintOutput
       ? (expectedMintOutput * 99n) / 100n
       : 0n;
   }

   let mintHash: `0x${string}`;

   if (useZap && zapAddress) {
     // Use zap contract to mint
     if (useETHZap) {
       // ETH/stETH zap for wstETH markets
       const minWstEthOut = (amountForMint * 995n) / 1000n; // 0.5% slippage
       
       if (includeSwap || isNativeETH) {
         mintHash = await writeContractAsync({
           address: zapAddress,
           abi: MINTER_ETH_ZAP_V2_ABI,
           functionName: "zapEthToLeveraged",
           args: [address as `0x${string}`, minOutput, minWstEthOut],
           value: amountForMint,
         });
       } else if (isStETH) {
         const stETHAddress = market.addresses?.wrappedCollateralToken as `0x${string}` | undefined;
         if (!stETHAddress) throw new Error("stETH address not found");
         
         mintHash = await writeContractAsync({
           address: zapAddress,
           abi: MINTER_ETH_ZAP_V2_ABI,
           functionName: "zapStEthToLeveraged",
           args: [amountForMint, address as `0x${string}`, minOutput, minWstEthOut],
         });
       } else {
         throw new Error("Invalid asset for ETH zap");
       }
     } else if (useUSDCZap) {
       // USDC/fxUSD zap for fxSAVE markets
       if (!fxSAVERate || fxSAVERate === 0n) {
         throw new Error("fxSAVE rate not available");
       }
       
       if (includeSwap || isUSDC) {
         mintHash = await writeContractAsync({
           address: zapAddress,
           abi: MINTER_USDC_ZAP_V2_ABI,
           functionName: "zapUsdcToLeveraged",
           args: [amountForMint, address as `0x${string}`, minOutput],
         });
       } else if (isFxUSD) {
         mintHash = await writeContractAsync({
           address: zapAddress,
           abi: MINTER_USDC_ZAP_V2_ABI,
           functionName: "zapFxUsdToLeveraged",
           args: [amountForMint, address as `0x${string}`, minOutput],
         });
       } else {
         throw new Error("Invalid asset for USDC zap");
       }
     } else {
       throw new Error("Invalid zap configuration");
     }
   } else {
     // Direct minting (no zap)
     mintHash = await writeContractAsync({
       address: minterAddress,
       abi: MINTER_ABI,
       functionName:"mintLeveragedToken",
       args: [parsedAmount, address, minOutput],
     });
   }
   
   await publicClient?.waitForTransactionReceipt({ hash: mintHash });
   updateProgressStep("mint", { status:"completed", txHash: mintHash });

 setTxHash(mintHash);
 if (onSuccess) onSuccess();
 } catch (err) {
 console.error("Mint error:", err);
 let errorMessage ="Transaction failed";
 if (err instanceof BaseError) {
 const revertError = err.walk(
 (e) => e instanceof ContractFunctionRevertedError
 );
 if (revertError instanceof ContractFunctionRevertedError) {
 errorMessage = revertError.reason ||"Transaction failed";
 } else {
 errorMessage = err.message ||"Transaction failed";
 }
 }
 // Mark current step as error
 setProgressModal((prev) => {
 if (!prev) return prev;
 const newSteps = prev.steps.map((s) =>
 s.status ==="in_progress"
 ? { ...s, status:"error" as const, error: errorMessage }
 : s
 );
 return { ...prev, steps: newSteps };
 });
 }
 };

 // Handle redeem
 const handleRedeem = async () => {
 if (
 !validateAmount() ||
 !address ||
 !minterAddress ||
 !parsedAmount ||
 !leveragedTokenAddress
 )
 return;

 setError(null);

 // Determine if approval is needed
 const needsApproval =
 ((leveragedTokenAllowance as bigint) || 0n) < parsedAmount;

 // Build steps
 const steps: TransactionStep[] = [];
 if (needsApproval) {
 steps.push({
 id:"approve",
 label: `Approve ${leveragedTokenSymbol}`,
 status:"pending",
 details: `Approve ${leveragedTokenSymbol} for redeeming`,
 });
 }
 steps.push({
 id:"redeem",
 label: `Redeem ${leveragedTokenSymbol}`,
 status:"pending",
 details: `Receive ${
 expectedRedeemOutput
 ? Number(formatEther(expectedRedeemOutput)).toFixed(4)
 :"..."
 } ${collateralSymbol}`,
 });

 // Open progress modal
 setProgressModal({
 isOpen: true,
 title: `Redeem ${leveragedTokenSymbol}`,
 steps,
 currentStepIndex: 0,
 });

 try {
 // Step 1: Approve (if needed)
 if (needsApproval) {
 updateProgressStep("approve", { status:"in_progress" });
 const approveHash = await writeContractAsync({
 address: leveragedTokenAddress,
 abi: ERC20_ABI,
 functionName:"approve",
 args: [minterAddress, parsedAmount],
 });
 await publicClient?.waitForTransactionReceipt({ hash: approveHash });
 updateProgressStep("approve", {
 status:"completed",
 txHash: approveHash,
 });
 }

 // Step 2: Redeem
 updateProgressStep("redeem", { status:"in_progress" });
 const minOutput = expectedRedeemOutput
 ? (expectedRedeemOutput * 99n) / 100n
 : 0n;

 const redeemHash = await writeContractAsync({
 address: minterAddress,
 abi: MINTER_ABI,
 functionName:"redeemLeveragedToken",
 args: [parsedAmount, address, minOutput],
 });
 await publicClient?.waitForTransactionReceipt({ hash: redeemHash });
 updateProgressStep("redeem", { status:"completed", txHash: redeemHash });

 setTxHash(redeemHash);
 if (onSuccess) onSuccess();
 } catch (err) {
 console.error("Redeem error:", err);
 let errorMessage ="Transaction failed";
 if (err instanceof BaseError) {
 const revertError = err.walk(
 (e) => e instanceof ContractFunctionRevertedError
 );
 if (revertError instanceof ContractFunctionRevertedError) {
 errorMessage = revertError.reason ||"Transaction failed";
 } else {
 errorMessage = err.message ||"Transaction failed";
 }
 }
 // Mark current step as error
 setProgressModal((prev) => {
 if (!prev) return prev;
 const newSteps = prev.steps.map((s) =>
 s.status ==="in_progress"
 ? { ...s, status:"error" as const, error: errorMessage }
 : s
 );
 return { ...prev, steps: newSteps };
 });
 }
 };

 // Handle close
 const handleClose = () => {
 if (step ==="approving" || step ==="minting" || step ==="redeeming") {
 if (
 !confirm(
"Transaction is processing. Are you sure you want to close this modal?"
 )
 ) {
 return;
 }
 }
 onClose();
 };

 // Handle cancel
 const handleCancel = () => {
 setStep("input");
 setError(null);
 };

 if (!isOpen) return null;

 const isProcessing =
 step ==="approving" || step ==="minting" || step ==="redeeming";

 // Get current balance based on selected asset and tab
 const currentBalance = useMemo(() => {
 if (activeTab ==="mint") {
 if (selectedDepositAsset ==="ETH") {
 return nativeEthBalance?.value || 0n;
 }
 // Handle both direct bigint and { result: bigint } formats for ERC20 tokens
 if (depositAssetBalanceData) {
 if (
 typeof depositAssetBalanceData ==="object" &&
"result" in depositAssetBalanceData
 ) {
 return (depositAssetBalanceData.result as bigint) || 0n;
 }
 return depositAssetBalanceData as bigint;
 }
 return 0n;
 } else {
 // Handle both direct bigint and { result: bigint } formats
 if (
 leveragedTokenBalance &&
 typeof leveragedTokenBalance ==="object" &&
"result" in leveragedTokenBalance
 ) {
 return (leveragedTokenBalance.result as bigint) || 0n;
 }
 return (leveragedTokenBalance as bigint) || 0n;
 }
 }, [
 activeTab,
 selectedDepositAsset,
 nativeEthBalance,
 depositAssetBalanceData,
 leveragedTokenBalance,
 ]);

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center">
 <div
 className="absolute inset-0 bg-black/40 backdrop-blur-sm"
 onClick={handleClose}
 />

 <div className="relative bg-white shadow-2xl w-full max-w-xl mx-4 animate-in fade-in-0 scale-in-95 duration-200 overflow-hidden">
 {/* Header with tabs and close button */}
 <div className="flex items-center justify-between p-0 pt-3 px-3 border-b border-[#d1d7e5]">
 {/* Tab-style header - takes most of width but leaves room for X */}
 <div className="flex flex-1 mr-4 border border-[#d1d7e5] border-b-0 overflow-hidden">
 <button
 onClick={() => handleTabChange("mint")}
 disabled={isProcessing}
 className={`flex-1 py-3 text-base font-semibold transition-colors ${
 activeTab ==="mint"
 ?"bg-[#1E4775] text-white"
 :"bg-[#eef1f7] text-[#4b5a78]"
 } disabled:opacity-50 disabled:cursor-not-allowed`}
 >
 Mint
 </button>
 <button
 onClick={() => handleTabChange("redeem")}
 disabled={isProcessing}
 className={`flex-1 py-3 text-base font-semibold transition-colors ${
 activeTab ==="redeem"
 ?"bg-[#1E4775] text-white"
 :"bg-[#eef1f7] text-[#4b5a78]"
 } disabled:opacity-50 disabled:cursor-not-allowed`}
 >
 Redeem
 </button>
 </div>
 <button
 onClick={handleClose}
 className="text-[#1E4775]/50 hover:text-[#1E4775] transition-colors disabled:opacity-30"
 disabled={isProcessing}
 >
 <svg
 className="w-5 h-5"
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

 <div className="p-4">
 {step ==="success" ? (
 <div className="text-center py-8">
 <div className="text-6xl mb-4">✓</div>
 <h3 className="text-xl font-bold text-[#1E4775] mb-2">
 Transaction Successful!
 </h3>
 <p className="text-sm text-[#1E4775]/70 mb-4">
 {activeTab ==="mint"
 ?"Your sail tokens have been minted successfully."
 :"Your sail tokens have been redeemed successfully."}
 </p>
 {txHash && (
 <a
 href={`https://etherscan.io/tx/${txHash}`}
 target="_blank"
 rel="noopener noreferrer"
 className="text-sm text-[#1E4775] hover:underline"
 >
 View on Etherscan
 </a>
 )}
 </div>
 ) : step ==="error" ? (
 <div className="text-center py-8">
 <div className="text-6xl mb-4 text-red-500">✗</div>
 <h3 className="text-xl font-bold text-red-600 mb-2">
 Transaction Failed
 </h3>
 <p className="text-sm text-red-500 mb-4">{error}</p>
 <div className="flex gap-3">
 <button
 onClick={handleCancel}
 className="flex-1 py-2 px-4 bg-white text-[#1E4775] border-2 border-[#1E4775]/30 font-semibold hover:bg-[#1E4775]/5 transition-colors"
 >
 Cancel
 </button>
 <button
 onClick={activeTab ==="mint" ? handleMint : handleRedeem}
 className="flex-1 py-2 px-4 bg-[#1E4775] text-white font-semibold hover:bg-[#17395F] transition-colors"
 >
 Try Again
 </button>
 </div>
 </div>
 ) : (
 <div className="space-y-4">
 {/* Input Section */}
 <div>
 {activeTab ==="mint" && (
 <div className="mb-3">
 <div className="space-y-2">
   <label className="text-sm text-[#1E4775]/70">Deposit Asset</label>
   <select
     value={selectedDepositAsset || ""}
     onChange={(e) => {
       const newValue = e.target.value;
       if (newValue === "custom") {
         setShowCustomTokenInput(true);
         setSelectedDepositAsset("custom");
       } else {
         setShowCustomTokenInput(false);
         setSelectedDepositAsset(newValue);
         setCustomTokenAddress("");
       }
     }}
     disabled={isProcessing}
     className="w-full h-12 px-4 bg-white text-[#1E4775] border border-[#1E4775]/20 focus:border-[#1E4775]/40 focus:ring-1 focus:ring-[#1E4775]/20 focus:outline-none transition-all text-sm"
   >
     {acceptedAssets.length > 0 && (
       <optgroup label="Supported Assets">
         {acceptedAssets.map((asset) => (
           <option key={asset.symbol} value={asset.symbol}>
             {asset.name} ({asset.symbol})
           </option>
         ))}
       </optgroup>
     )}

     {allAvailableAssets.filteredUserTokens.length > 0 && (
       <optgroup label="Other Tokens (via Swap)">
         {allAvailableAssets.filteredUserTokens.map((token) => (
           <option key={token.symbol} value={token.symbol}>
             {token.name} ({token.symbol}) - {token.balanceFormatted}
           </option>
         ))}
       </optgroup>
     )}

     <option value="custom">+ Add Custom Token Address</option>
   </select>

   {showCustomTokenInput && (
     <div className="space-y-2">
       <input
         type="text"
         value={customTokenAddress}
         onChange={(e) => setCustomTokenAddress(e.target.value.trim())}
         placeholder="0x..."
         className="w-full h-10 px-3 bg-white text-[#1E4775] border border-[#1E4775]/30 focus:border-[#1E4775] focus:ring-2 focus:ring-[#1E4775]/20 focus:outline-none transition-all text-sm font-mono"
         disabled={isProcessing}
       />
       {customTokenAddress &&
         (!customTokenAddress.startsWith("0x") ||
           customTokenAddress.length !== 42) && (
           <div className="text-xs text-red-600">
             Invalid address format. Must start with 0x and be 42 characters.
           </div>
         )}
     </div>
   )}

   {/* Any-token support notice */}
   <div className="p-2.5 bg-blue-50 border border-blue-200 text-xs text-blue-700">
     <div className="flex items-start gap-2">
       <ArrowPathIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
       <div>
         <span className="font-semibold">Tip:</span> You can deposit any ERC20
         token! Non-collateral tokens will be automatically swapped via Velora.
       </div>
     </div>
   </div>

   {/* Swap quote status */}
   {needsSwap && (
     <div className="text-xs text-[#1E4775]/70">
       {isLoadingSwapQuote
         ? "Fetching swap quote..."
         : swapQuoteError
         ? "Swap quote unavailable (try a smaller amount or a different token)."
         : swapQuote
         ? `Will swap to ${isWstETHMarket ? "ETH" : "USDC"} before minting.`
         : null}
     </div>
   )}
 </div>
 </div>
 )}
 <div className="flex justify-between items-center mb-1.5">
 <label className="text-sm font-semibold text-[#1E4775]">
 {activeTab ==="mint" ?"Deposit Amount" :"Redeem Amount"}
 </label>
 <span className="text-sm text-[#1E4775]/70">
 Balance:{" "}
 {activeTab === "mint"
   ? formatBalance(
       currentBalance,
       selectedDepositAsset || collateralSymbol,
       4,
       selectedDepositAsset?.toLowerCase() === "usdc"
         ? 6
         : isNativeETH
         ? 18
         : selectedTokenDecimals ?? 18
     )
   : formatBalance(currentBalance, leveragedTokenSymbol, 4, 18)}
 </span>
 </div>
 <div className="relative">
 <input
 type="text"
 value={amount}
 onChange={(e) => {
 const value = e.target.value;
 if (value ==="" || /^\d*\.?\d*$/.test(value)) {
 // Cap at balance if value exceeds it
 if (value && currentBalance) {
 try {
         const decimals =
           activeTab === "redeem"
             ? 18
             : isNativeETH
             ? 18
             : selectedDepositAsset?.toLowerCase() === "usdc"
             ? 6
             : selectedTokenDecimals ?? 18;
         const parsed =
           activeTab === "mint" && isNativeETH
             ? parseEther(value)
             : parseUnits(value, decimals);
         if (parsed > currentBalance) {
           const formatted =
             activeTab === "mint" && isNativeETH
               ? formatEther(currentBalance)
               : formatUnits(currentBalance, decimals);
           setAmount(formatted);
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
 }}
 placeholder="0.0"
 disabled={isProcessing}
 className={`w-full h-14 px-4 pr-24 bg-white text-[#1E4775] border-2 ${
 parsedAmount &&
 currentBalance &&
 parsedAmount > currentBalance
 ?"border-red-500 focus:ring-red-200"
 :"border-[#1E4775]/30 focus:ring-[#1E4775]/20"
 } focus:border-[#1E4775] focus:ring-2 focus:outline-none transition-all text-xl font-mono disabled:opacity-50`}
 />
 <button
 onClick={() => {
   if (currentBalance) {
     const decimals =
       activeTab === "redeem"
         ? 18
         : isNativeETH
         ? 18
         : selectedDepositAsset?.toLowerCase() === "usdc"
         ? 6
         : selectedTokenDecimals ?? 18;
     const formatted =
       activeTab === "mint" && isNativeETH
         ? formatEther(currentBalance)
         : formatUnits(currentBalance, decimals);
     setAmount(formatted);
     setError(null);
   }
 }}
 disabled={isProcessing || !currentBalance}
 className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-sm bg-[#FF8A7A] hover:bg-[#FF6B5A] text-white transition-colors disabled:bg-gray-300 disabled:text-gray-500 rounded-full font-medium"
 >
 MAX
 </button>
 </div>
 </div>

 {/* Error Display */}
 {error && (
 <div className="p-2 bg-red-50 border border-red-200 text-xs text-red-600">
 {error}
 </div>
 )}

 {/* Fee Display */}
 {activeTab ==="mint" && (
 <div className="text-xs text-[#1E4775]">
 <span className="flex items-center gap-1.5">
 Mint Fee:{""}
 <span
 className={`font-semibold ${
 mintFeePercentage > 2
 ?"text-red-600"
 :"text-[#1E4775]"
 }`}
 >
 {parsedAmount &&
 parsedAmount > 0n &&
 mintFeePercentage !== undefined
 ? `${mintFeePercentage.toFixed(2)}%`
 :"-"}
 {parsedAmount && parsedAmount > 0n && mintFee > 0n && (
 <span className="ml-1 font-normal text-[#1E4775]/60">
 ({formatDisplay(mintFee, 4)}{""}
 {selectedDepositAsset || collateralSymbol})
 </span>
 )}
 </span>
 </span>
 </div>
 )}

 {activeTab ==="redeem" && (
 <div className="text-xs text-[#1E4775]">
 <span className="flex items-center gap-1.5">
 Redeem Fee:{""}
 <span
 className={`font-semibold ${
 redeemFeePercentage > 2
 ?"text-red-600"
 :"text-[#1E4775]"
 }`}
 >
 {parsedAmount &&
 parsedAmount > 0n &&
 redeemFeePercentage !== undefined
 ? `${redeemFeePercentage.toFixed(2)}%`
 :"-"}
 {parsedAmount && parsedAmount > 0n && redeemFee > 0n && (
 <span className="ml-1 font-normal text-[#1E4775]/60">
 ({formatDisplay(redeemFee, 4)} {collateralSymbol})
 </span>
 )}
 </span>
 </span>
 </div>
 )}

 {/* Transaction Summary */}
 {activeTab ==="mint" && (
 <div className="p-2 bg-[#17395F]/5 border border-[#17395F]/20">
 <h4 className="text-xs font-semibold text-[#1E4775] mb-1.5">
 Transaction Summary
 </h4>
 <div className="space-y-1 text-xs text-[#1E4775]/80">
 <div className="flex justify-between">
 <span>You deposit:</span>
 <span className="font-mono">
 {parsedAmount && parsedAmount > 0n
 ? `${formatDisplay(parsedAmount, 4)} ${
 selectedDepositAsset || collateralSymbol
 }`
 :"0.00"}
 </span>
 </div>
 <div className="flex justify-between">
 <span>You receive:</span>
 <span className="font-mono">
 {expectedMintOutput && parsedAmount && parsedAmount > 0n
 ? `${formatDisplay(
 expectedMintOutput,
 4
 )} ${leveragedTokenSymbol}`
 :"0.00"}
 </span>
 </div>
 </div>
 </div>
 )}

 {activeTab ==="redeem" && (
 <div className="p-2 bg-[#17395F]/5 border border-[#17395F]/20">
 <h4 className="text-xs font-semibold text-[#1E4775] mb-1.5">
 Transaction Summary
 </h4>
 <div className="space-y-1 text-xs text-[#1E4775]/80">
 <div className="flex justify-between">
 <span>You redeem:</span>
 <span className="font-mono">
 {parsedAmount && parsedAmount > 0n
 ? `${formatDisplay(
 parsedAmount,
 4
 )} ${leveragedTokenSymbol}`
 :"0.00"}
 </span>
 </div>
 <div className="flex justify-between">
 <span>You receive:</span>
 <span className="font-mono">
 {expectedRedeemOutput &&
 parsedAmount &&
 parsedAmount > 0n
 ? `${formatDisplay(
 expectedRedeemOutput,
 4
 )} ${collateralSymbol}`
 :"0.00"}
 </span>
 </div>
 </div>
 </div>
 )}

 {/* Processing Indicator - only show if progress modal is not open */}
 {isProcessing && !progressModal && (
 <div className="text-center py-4">
 <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E4775]"></div>
 <p className="mt-2 text-sm text-[#1E4775]">
 {step ==="approving"
 ?"Approving..."
 : step ==="minting"
 ?"Minting sail tokens..."
 :"Redeeming sail tokens..."}
 </p>
 </div>
 )}

 {/* Action Buttons */}
 {!isProcessing && (
 <div className="flex gap-3 pt-2 border-t border-[#1E4775]/20">
 {(step ==="error" || step ==="input") && (
 <button
 onClick={handleClose}
 className="flex-1 py-3 px-4 bg-white text-[#1E4775] border-2 border-[#1E4775]/30 font-semibold hover:bg-[#1E4775]/5 transition-colors"
 >
 Cancel
 </button>
 )}
 <button
 onClick={activeTab ==="mint" ? handleMint : handleRedeem}
 disabled={
 !isConnected ||
 !amount ||
 parseFloat(amount) <= 0 ||
 (activeTab ==="mint" &&
 parsedAmount &&
 parsedAmount > currentBalance) ||
 (activeTab ==="redeem" &&
 parsedAmount &&
 parsedAmount > currentBalance)
 }
 className="flex-1 py-3 px-4 bg-[#1E4775] text-white font-semibold hover:bg-[#17395F] transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
 >
 {activeTab ==="mint" ?"Mint" :"Redeem"}
 </button>
 </div>
 )}
 </div>
 )}
 </div>
 </div>

 {/* Transaction Progress Modal */}
 {progressModal && (
 <TransactionProgressModal
 isOpen={progressModal.isOpen}
 onClose={() => {
 setProgressModal(null);
 // Reset form if all steps completed
 if (progressModal.steps.every((s) => s.status ==="completed")) {
 setAmount("");
 setStep("input");
 }
 }}
 title={progressModal.title}
 steps={progressModal.steps}
 currentStepIndex={progressModal.currentStepIndex}
 />
 )}
 </div>
 );
};
