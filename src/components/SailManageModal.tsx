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
import { WSTETH_ABI } from "@/abis";
import { MINTER_ETH_ZAP_V2_ABI, MINTER_USDC_ZAP_V3_ABI } from "@/config/contracts";
import { STETH_ZAP_PERMIT_ABI, calculateDeadline } from "@/utils/permit";
import { usePermitOrApproval } from "@/hooks/usePermitOrApproval";
import { useCollateralPrice } from "@/hooks/useCollateralPrice";
import SimpleTooltip from "@/components/SimpleTooltip";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { Info, RefreshCw } from "lucide-react";
import {
  TransactionProgressModal,
  TransactionStep,
} from "@/components/TransactionProgressModal";
import { useDefiLlamaSwap, getDefiLlamaSwapTx } from "@/hooks/useDefiLlamaSwap";
import { useUserTokens, useTokenDecimals } from "@/hooks/useUserTokens";
import { formatBalance } from "@/utils/formatters";
import { getAcceptedDepositAssets } from "@/utils/markets";
import {
  DEFAULT_MODAL_OPTIONS,
  MODAL_ERROR_MESSAGES,
  DEFAULT_AMOUNT,
  DEFAULT_ERROR,
  DEFAULT_TX_HASH,
  DEFAULT_CURRENT_STEP_INDEX,
  type ProgressModalState,
} from "@/utils/modal";
import { validateAmountInput } from "@/utils/validation";
import { AmountInputBlock } from "@/components/AmountInputBlock";
import { TokenSelectorDropdown } from "@/components/TokenSelectorDropdown";
import { useCoinGeckoPrice } from "@/hooks/useCoinGeckoPrice";
import { getLogoPath } from "@/lib/logos";
import {
  ActionButtons,
  BaseManageModal,
  type BaseManageModalConfig,
  type BaseManageModalTabConfig,
  type TabContentContext,
  ErrorBanner,
  NotificationsSection,
  PermitToggle,
  TransactionOverviewCard,
  type NotificationItem,
  type OverviewRow,
} from "@/components/modal";

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
  const { handlePermitOrApproval } = usePermitOrApproval();

 const [activeTab, setActiveTab] = useState<"mint" |"redeem">(initialTab);
 const [amount, setAmount] = useState(DEFAULT_AMOUNT);
 const [selectedDepositAsset, setSelectedDepositAsset] = useState<
 string | null
 >(null);
 const [showCustomTokenInput, setShowCustomTokenInput] = useState(false);
 const [customTokenAddress, setCustomTokenAddress] = useState<string>("");
 const [step, setStep] = useState<ModalStep>("input");
 const [error, setError] = useState<string | null>(DEFAULT_ERROR);
 const [txHash, setTxHash] = useState<string | null>(DEFAULT_TX_HASH);
 const [showNotifications, setShowNotifications] = useState(DEFAULT_MODAL_OPTIONS.showNotifications);
 const [permitEnabled, setPermitEnabled] = useState(DEFAULT_MODAL_OPTIONS.permitEnabled);

 const [progressModal, setProgressModal] = useState<ProgressModalState | null>(null);

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
 // wrappedCollateralSymbol is actually the underlying (fxUSD), so we check against collateralSymbol (fxSAVE)
 const isWrappedCollateral = isFxSAVE || isWstETH || 
   (collateralSymbolLower && selectedDepositAsset?.toLowerCase() === collateralSymbolLower);

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

// Get USD prices for overview display
const { price: ethPrice } = useCoinGeckoPrice("ethereum", 120000);
const { price: wstETHPrice } = useCoinGeckoPrice("wrapped-steth", 120000);
const { price: fxSAVEPrice } = useCoinGeckoPrice("fx-usd-saving", 120000);

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
 // If using zap (ETH zap or USDC zap), approve to zapAddress
 // Only direct mints (wstETH, fxSAVE) approve to minterAddress
 // Note: useETHZap and useUSDCZap already check for zapAddress via useZap, so if they're true, zapAddress must exist
 const allowanceTarget = useETHZap || useUSDCZap
   ? zapAddress!
   : minterAddress;
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

 // For ETH zaps, convert ETH → wstETH for dry run
 // Contract flow: ETH → stETH (1:1) → wstETH (via wstETH.wrap())
 const wstETHAddress = useETHZap && isNativeETH && !needsSwap
   ? (market.addresses?.wrappedCollateralToken as `0x${string}` | undefined)
   : undefined;
 
 const { data: wstETHAmountForDryRun } = useContractRead({
   address: wstETHAddress,
   abi: WSTETH_ABI,
   functionName: "getWstETHByStETH",
   args: parsedAmount && wstETHAddress ? [parsedAmount] : undefined, // ETH → stETH is 1:1, so use parsedAmount as stETH
   query: {
     enabled: !!wstETHAddress && !!parsedAmount && parsedAmount > 0n && activeTab === "mint" && useETHZap && isNativeETH && !needsSwap,
   },
 });

 // Dry run for mint
 // For ETH zaps, use wstETH amount; for others, use parsedAmount directly
 const amountForDryRun = useETHZap && isNativeETH && !needsSwap && wstETHAmountForDryRun
   ? (wstETHAmountForDryRun as bigint)
   : parsedAmount;

 const mintDryRunEnabled =
 activeTab ==="mint" &&
 !!amountForDryRun &&
 !!minterAddress &&
 amountForDryRun > 0n;

 const { data: mintDryRunResult, error: mintDryRunErr } = useContractRead({
 address: minterAddress,
 abi: MINTER_ABI,
 functionName:"mintLeveragedTokenDryRun",
 args: amountForDryRun ? [amountForDryRun] : undefined,
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

 // Handle tab change (clear error when switching, aligned with Genesis/Anchor)
 const handleTabChange = (tab:"mint" |"redeem") => {
 if (step ==="input" || step ==="error") {
 setActiveTab(tab);
 setAmount("");
 setError(null);
 setTxHash(null);
 setStep("input");
 }
 };

 // Validate amount
 const validateAmount = (): boolean => {
 if (!amount || parseFloat(amount) <= 0) {
 setError(MODAL_ERROR_MESSAGES.INVALID_AMOUNT);
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
 setError(MODAL_ERROR_MESSAGES.INSUFFICIENT_BALANCE);
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
 setError(MODAL_ERROR_MESSAGES.INSUFFICIENT_BALANCE);
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
 // For zap (ETH zap or USDC zap), check if we need approval to zapAddress
 // For direct mint, check if we need approval to minterAddress
 const needsZapApproval =
   !includeSwap && (useETHZap || useUSDCZap) && zapAddress && depositAssetAddress && !isNativeETH
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
   // If using zap (ETH zap or USDC zap), approve to zapAddress
   // Only direct mints (wstETH, fxSAVE) approve to minterAddress
   // Note: useETHZap and useUSDCZap already check for zapAddress via useZap, so if they're true, zapAddress must exist
   if (needsApproval && depositAssetAddress) {
     updateProgressStep("approve", { status:"in_progress" });
     const approveTarget = useETHZap || useUSDCZap
       ? zapAddress!
       : minterAddress;
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
   
   // Default slippage tolerance (1%, minimum 2% to account for dynamic fees)
   // NOTE: Dynamic fees can change if collateral ratio crosses bands between dry run and execution
   // We use higher slippage tolerance to account for potential fee increases
   const slippageTolerance = 1; // Could be made configurable in the future
   const slippageBps = Math.max(slippageTolerance, 2.0); // Increased from 0.5% to 2% minimum
   
   if (useUSDCZap) {
     // For USDC/fxUSD zap: use expectedMintOutput from dry run if available
     // This accounts for actual conversion (USDC → fxUSD → fxSAVE) and minting fees
     if (expectedMintOutput && expectedMintOutput > 0n) {
       // Apply slippage tolerance
       minOutput = (expectedMintOutput * BigInt(Math.floor((100 - slippageBps) * 100))) / 10000n;
     } else if (fxSAVERate && fxSAVERate > 0n) {
       // Fallback: estimate using fxSAVE rate (less accurate, but better than 0)
       let amountIn18Decimals: bigint;
       if (includeSwap ? !isWstETHMarket : isUSDC) {
         // USDC: convert from 6 decimals to 18 decimals
         amountIn18Decimals = amountForMint * 10n ** 12n;
       } else {
         // fxUSD: already in 18 decimals
         amountIn18Decimals = amountForMint;
       }
       // Convert to fxSAVE using wrapped rate, then estimate mint output (account for ~0.25% fee)
       const fxSaveAmount = (amountIn18Decimals * 10n ** 18n) / fxSAVERate;
       const estimatedLeveragedOut = (fxSaveAmount * 9975n) / 10000n; // Estimate 0.25% fee
       minOutput = (estimatedLeveragedOut * BigInt(Math.floor((100 - slippageBps) * 100))) / 10000n;
     } else {
       throw new Error("Cannot calculate minOutput: expectedMintOutput and fxSAVERate both unavailable");
     }
   } else {
     // For direct minting or ETH zap: use expectedMintOutput with slippage tolerance
     // TODO: Fine-tune this later with dynamic slippage and zapper fee calculations
     const ethZapSlippage = slippageBps; // Use default 2% slippage for all
     minOutput = expectedMintOutput
       ? (expectedMintOutput * BigInt(Math.floor((100 - ethZapSlippage) * 100))) / 10000n
       : 0n;
   }

   let mintHash: `0x${string}`;

   // FXUSD must always use zap - if zapAddress is missing, throw error
   if (isFxUSD && isFxUSDMarket && !zapAddress) {
     throw new Error("Zap contract address (leveragedTokenZap) is missing from market config. FXUSD deposits require a zap contract.");
   }

   if (useZap && zapAddress) {
     // Use zap contract to mint
     if (useETHZap) {
       // ETH/stETH zap for wstETH markets
       if (includeSwap || isNativeETH) {
         mintHash = await writeContractAsync({
           address: zapAddress,
           abi: MINTER_ETH_ZAP_V2_ABI,
           functionName: "zapEthToLeveraged",
           args: [address as `0x${string}`, minOutput],
           value: amountForMint,
         });
       } else if (isStETH) {
         // Use underlyingCollateralToken (stETH), not wrappedCollateralToken (wstETH)
         let stETHAddress = market.addresses?.underlyingCollateralToken as `0x${string}` | undefined;
         
         // Fallback: use hardcoded stETH address (constant across all markets)
         if (!stETHAddress) {
           stETHAddress = "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84" as `0x${string}`;
         }
         
        if (!stETHAddress) {
          throw new Error("stETH address not found. Please ensure you're depositing to a wstETH market.");
        }
        
        // Try to use permit first when enabled, fallback to approval if not supported or fails
        const permitResult = permitEnabled
          ? await handlePermitOrApproval(stETHAddress, zapAddress, amountForMint)
          : { usePermit: false };
        let usePermit = permitResult?.usePermit && !!permitResult.permitSig && !!permitResult.deadline;
        
        if (usePermit && permitResult.permitSig && permitResult.deadline) {
          // Use permit function - zapStEthToLeveragedWithPermit
          try {
            mintHash = await writeContractAsync({
              address: zapAddress,
              abi: [...MINTER_ETH_ZAP_V2_ABI, ...STETH_ZAP_PERMIT_ABI] as const,
              functionName: "zapStEthToLeveragedWithPermit",
              args: [
                amountForMint,
                address as `0x${string}`,
                minOutput,
                permitResult.deadline,
                permitResult.permitSig.v,
                permitResult.permitSig.r,
                permitResult.permitSig.s,
              ],
            });
          } catch (permitError) {
            console.error("Permit zap failed, falling back to approval:", permitError);
            // Fall through to approval flow below
            usePermit = false;
          }
        }
        
        if (!usePermit) {
          // Fallback: Use traditional approval + zap
          const stETHAllowance = await publicClient?.readContract({
            address: stETHAddress,
            abi: ERC20_ABI,
            functionName: "allowance",
            args: [address as `0x${string}`, zapAddress],
          });
          
          const allowanceBigInt = (stETHAllowance as bigint) || 0n;
          if (allowanceBigInt < amountForMint) {
            updateProgressStep("approve", { status: "in_progress" });
            const approveHash = await writeContractAsync({
              address: stETHAddress,
              abi: ERC20_ABI,
              functionName: "approve",
              args: [zapAddress, amountForMint],
            });
            updateProgressStep("approve", { status: "completed", txHash: approveHash });
            await publicClient?.waitForTransactionReceipt({ hash: approveHash });
          }
          
          mintHash = await writeContractAsync({
            address: zapAddress,
            abi: MINTER_ETH_ZAP_V2_ABI,
            functionName: "zapStEthToLeveraged",
            args: [amountForMint, address as `0x${string}`, minOutput],
          });
        }
       } else {
         throw new Error("Invalid asset for ETH zap");
       }
     } else if (useUSDCZap) {
       // USDC/fxUSD zap for fxSAVE markets
       if (!fxSAVERate || fxSAVERate === 0n) {
         throw new Error("fxSAVE rate not available");
       }
       
       // Determine which asset we're actually zapping (USDC or fxUSD)
       const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as `0x${string}`;
       const isActuallyUSDC = includeSwap || isUSDC;
       const isActuallyFxUSD = isFxUSD;
       
       // Get the asset address for approval
       const assetAddressForApproval = isActuallyUSDC 
         ? USDC_ADDRESS 
         : (market.addresses?.collateralToken as `0x${string}` | undefined);
       
      if (!assetAddressForApproval) {
        throw new Error("Asset address not found for approval");
      }
      
      // Same permit flow as Genesis/Anchor when enabled: require deadline for zap…WithPermit (must match signed message).
      const permitResult = permitEnabled
        ? await handlePermitOrApproval(assetAddressForApproval, zapAddress, amountForMint)
        : { usePermit: false };
      let usePermit = permitResult?.usePermit && !!permitResult.permitSig && !!permitResult?.deadline;
      
      // Calculate minFxSaveOut for permit functions (1% slippage buffer)
      const minFxSaveOut = (amountForMint * 99n) / 100n;
      
      if (usePermit && permitResult.permitSig && permitResult.deadline) {
        // Use permit functions - requires minFxSaveOut parameter; use exact signed deadline.
        const permitDeadline = permitResult.deadline;
        try {
          if (isActuallyUSDC) {
            mintHash = await writeContractAsync({
              address: zapAddress,
              abi: MINTER_USDC_ZAP_V3_ABI,
              functionName: "zapUsdcToLeveragedWithPermit",
              args: [
                amountForMint,
                minFxSaveOut,
                address as `0x${string}`,
                minOutput,
                permitDeadline,
                permitResult.permitSig.v,
                permitResult.permitSig.r,
                permitResult.permitSig.s,
              ],
            });
          } else if (isActuallyFxUSD) {
            mintHash = await writeContractAsync({
              address: zapAddress,
              abi: MINTER_USDC_ZAP_V3_ABI,
              functionName: "zapFxUsdToLeveragedWithPermit",
              args: [
                amountForMint,
                minFxSaveOut,
                address as `0x${string}`,
                minOutput,
                permitDeadline,
                permitResult.permitSig.v,
                permitResult.permitSig.r,
                permitResult.permitSig.s,
              ],
            });
          } else {
            throw new Error("Invalid asset for USDC zap");
          }
        } catch (permitError) {
          console.error("Permit zap failed, falling back to approval:", permitError);
          // Fall through to approval flow below
          usePermit = false;
        }
      }
      
      if (!usePermit) {
        // Fallback: Use traditional approval + zap
        const approvalTarget = zapAddress;
        
        // Check and approve asset if needed
        const currentAllowance = await publicClient?.readContract({
          address: assetAddressForApproval,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address as `0x${string}`, approvalTarget],
        });
        
        const allowanceBigInt = (currentAllowance as bigint) || 0n;
        if (allowanceBigInt < amountForMint) {
          // Add approval step to progress modal if it doesn't exist
          setProgressModal((prev) => {
            if (!prev) return prev;
            const hasApproveStep = prev.steps.some(s => s.id === "approve");
            if (!hasApproveStep) {
              // Insert approval step before mint step
              const mintIndex = prev.steps.findIndex(s => s.id === "mint");
              const newSteps = [...prev.steps];
              newSteps.splice(mintIndex, 0, {
                id: "approve",
                label: `Approve ${isActuallyFxUSD ? "fxUSD" : "USDC"} for zap`,
                status: "pending",
                details: `Approve ${isActuallyFxUSD ? "fxUSD" : "USDC"} for minting via zap`,
              });
              return { ...prev, steps: newSteps };
            }
            return prev;
          });
          
          updateProgressStep("approve", { status: "in_progress" });
          const approveHash = await writeContractAsync({
            address: assetAddressForApproval,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [approvalTarget, amountForMint],
          });
          updateProgressStep("approve", { status: "completed", txHash: approveHash });
          await publicClient?.waitForTransactionReceipt({ hash: approveHash });
        }
        
        if (isActuallyUSDC) {
          mintHash = await writeContractAsync({
            address: zapAddress,
            abi: MINTER_USDC_ZAP_V3_ABI,
            functionName: "zapUsdcToLeveraged",
            args: [
              amountForMint,
              minFxSaveOut,
              address as `0x${string}`,
              minOutput,
            ],
          });
        } else if (isActuallyFxUSD) {
          mintHash = await writeContractAsync({
            address: zapAddress,
            abi: MINTER_USDC_ZAP_V3_ABI,
            functionName: "zapFxUsdToLeveraged",
            args: [
              amountForMint,
              minFxSaveOut,
              address as `0x${string}`,
              minOutput,
            ],
          });
        } else {
          throw new Error("Invalid asset for USDC zap");
        }
      }
     } else {
       throw new Error("Invalid zap configuration");
     }
   } else {
     // Direct minting (no zap) - only for wrapped collateral (wstETH, fxSAVE)
     // FXUSD should never reach here - it must use zap
     if (isFxUSD && isFxUSDMarket) {
       const errorMsg = `FXUSD deposits must use zap contract. 
         useZap: ${useZap}, 
         zapAddress: ${zapAddress || 'undefined'}, 
         useUSDCZap: ${useUSDCZap}, 
         isWrappedCollateral: ${isWrappedCollateral},
         market.addresses?.leveragedTokenZap: ${market.addresses?.leveragedTokenZap || 'undefined'}`;
       throw new Error(errorMsg);
     }
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
 
 // Check for user rejection first (most common case)
 const errMessage = err instanceof Error ? err.message : String(err);
 const errShortMessage = err instanceof BaseError ? err.shortMessage : "";
 const lowerMessage = (errMessage + " " + errShortMessage).toLowerCase();
 
 if (lowerMessage.includes("user rejected") || lowerMessage.includes("user denied") || lowerMessage.includes("rejected the request")) {
   errorMessage = "Transaction was rejected. Please try again.";
 } else if (err instanceof BaseError) {
   const revertError = err.walk(
     (e) => e instanceof ContractFunctionRevertedError
   );
   if (revertError instanceof ContractFunctionRevertedError) {
     errorMessage = revertError.reason || revertError.data?.message || "Transaction failed";
   } else {
     const msg = err.message || err.shortMessage || "Transaction failed";
     errorMessage = msg.replace(/^[^:]+:\s*/i, "").replace(/\s*\([^)]+\)$/, "") || "Transaction failed";
   }
 } else if (err instanceof Error) {
   errorMessage = err.message.replace(/^[^:]+:\s*/i, "").replace(/\s*\([^)]+\)$/, "") || "Transaction failed";
 }
 console.error("Full error details:", {
   error: err,
   message: errorMessage,
   useZap,
   useUSDCZap,
   zapAddress,
   depositAssetAddress,
   isFxUSD,
 });
 setProgressModal(null);
 setError(errorMessage);
 setStep("error");
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
 
 // Check for user rejection first (most common case)
 const errMessage = err instanceof Error ? err.message : String(err);
 const errShortMessage = err instanceof BaseError ? err.shortMessage : "";
 const lowerMessage = (errMessage + " " + errShortMessage).toLowerCase();
 
 if (lowerMessage.includes("user rejected") || lowerMessage.includes("user denied") || lowerMessage.includes("rejected the request")) {
   errorMessage = "Transaction was rejected. Please try again.";
 } else if (err instanceof BaseError) {
   const revertError = err.walk(
     (e) => e instanceof ContractFunctionRevertedError
   );
   if (revertError instanceof ContractFunctionRevertedError) {
     errorMessage = revertError.reason || "Transaction failed";
   } else {
     const msg = err.message || err.shortMessage || "Transaction failed";
     errorMessage = msg.replace(/^[^:]+:\s*/i, "").replace(/\s*\([^)]+\)$/, "") || "Transaction failed";
   }
 } else if (err instanceof Error) {
   errorMessage = err.message.replace(/^[^:]+:\s*/i, "").replace(/\s*\([^)]+\)$/, "") || "Transaction failed";
 }
 setProgressModal(null);
 setError(errorMessage);
 setStep("error");
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

 const primaryToken = market?.leveragedToken
   ? {
       symbol: market.leveragedToken.symbol,
       icon: (market.leveragedToken as { icon?: string })?.icon ?? getLogoPath(leveragedTokenSymbol),
     }
   : { symbol: leveragedTokenSymbol, icon: getLogoPath(leveragedTokenSymbol) };

 const renderSailContent = (ctx: TabContentContext) => {
   if (step === "success") {
     return (
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
     );
   }
   return (
 <div className="space-y-4">
 {/* Input Section */}
 <div className="space-y-3">
 {activeTab ==="mint" && (
 <div className="space-y-2">
   <label className="text-sm font-semibold text-[#1E4775]">Select Deposit Token</label>
   {(() => {
     const tokenGroups = [
       ...(acceptedAssets.length > 0 ? [{
         label: "Supported Assets",
         tokens: acceptedAssets.map((asset) => ({
           symbol: asset.symbol,
           name: asset.name,
         })),
       }] : []),
       ...(allAvailableAssets.filteredUserTokens.length > 0 ? [{
         label: "Other Tokens (via Swap)",
         tokens: allAvailableAssets.filteredUserTokens.map((token) => ({
           symbol: token.symbol,
           name: token.name,
           isUserToken: true,
         })),
       }] : []),
     ];
     
     return (
       <TokenSelectorDropdown
         value={selectedDepositAsset || ""}
         onChange={(newAsset) => {
           if (newAsset === "custom") {
             setShowCustomTokenInput(true);
             setSelectedDepositAsset("custom");
           } else {
             setShowCustomTokenInput(false);
             setSelectedDepositAsset(newAsset);
             setCustomTokenAddress("");
             setAmount(""); // Reset amount when changing asset
             setError(null); // Clear any errors
           }
         }}
         options={tokenGroups}
         disabled={isProcessing}
         placeholder="Select Deposit Token"
         showCustomOption={true}
         onCustomOptionClick={() => {
           setShowCustomTokenInput(true);
           setSelectedDepositAsset("custom");
         }}
         customOptionLabel="+ Add Custom Token Address"
       />
     );
   })()}

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
 )}

 {/* Notifications - between deposit token and enter amount (match Anchor) */}
 <NotificationsSection
   notifications={
     activeTab === "mint"
       ? ([
           {
             tone: "success" as const,
             title: "Tip",
             icon: <RefreshCw className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-600" />,
             content:
               "You can deposit any ERC20 token! Non-collateral tokens will be automatically swapped via Velora.",
           },
           {
             title: "Info",
             icon: <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />,
             content:
               "For large deposits, Harbor recommends using wstETH or fxSAVE instead of the built-in swap and zaps.",
           },
         ] as NotificationItem[])
       : ([
           {
             title: "Info",
             icon: <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />,
             content: `You will receive collateral (e.g. ${collateralSymbol}) in your wallet.`,
           },
         ] as NotificationItem[])
   }
   expanded={showNotifications}
   onToggle={() => setShowNotifications((prev) => !prev)}
   badgeCount={activeTab === "mint" ? 2 : 1}
   badgeColor="blue"
 />

 <AmountInputBlock
   label="Enter Amount"
   value={amount}
   onChange={(e) => {
     const v = e.target.value;
     if (!validateAmountInput(v)) return;
     if (v && currentBalance) {
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
           activeTab === "mint" && isNativeETH ? parseEther(v) : parseUnits(v, decimals);
         if (parsed > currentBalance) {
           const fmt =
             activeTab === "mint" && isNativeETH
               ? formatEther(currentBalance)
               : formatUnits(currentBalance, decimals);
           setAmount(fmt);
           setError(null);
           return;
         }
       } catch {
         /* allow partial input */
       }
     }
     setAmount(v);
     setError(null);
   }}
   onMax={() => {
     if (currentBalance) {
       const decimals =
         activeTab === "redeem"
           ? 18
           : isNativeETH
             ? 18
             : selectedDepositAsset?.toLowerCase() === "usdc"
               ? 6
               : selectedTokenDecimals ?? 18;
       const fmt =
         activeTab === "mint" && isNativeETH
           ? formatEther(currentBalance)
           : formatUnits(currentBalance, decimals);
       setAmount(fmt);
       setError(null);
     }
   }}
   disabled={isProcessing}
   balanceContent={
     <>
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
     </>
   }
   error={
     parsedAmount && currentBalance && parsedAmount > currentBalance
       ? "Amount exceeds balance"
       : undefined
   }
   inputClassName={`w-full h-14 px-4 pr-24 bg-white text-[#1E4775] border-2 text-xl font-mono disabled:opacity-50 focus:ring-2 focus:outline-none transition-all ${
     parsedAmount && currentBalance && parsedAmount > currentBalance
       ? "border-red-500 focus:border-red-500 focus:ring-red-200"
       : "border-[#1E4775]/30 focus:border-[#1E4775] focus:ring-[#1E4775]/20"
   }`}
   maxButtonClassName="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-sm bg-[#FF8A7A] hover:bg-[#FF6B5A] text-white transition-colors disabled:bg-gray-300 disabled:text-gray-500 font-medium rounded-none"
 />

 {/* Permit toggle - mint only (match Anchor: text-xs, same switch size) */}
 {activeTab === "mint" && (
   <PermitToggle
     enabled={permitEnabled}
     onChange={setPermitEnabled}
     disabled={isProcessing}
   />
 )}

 {/* Transaction Overview - Anchor-style spacing below */}
 {(() => {
   if (activeTab === "mint") {
     const mintReceive =
       expectedMintOutput && parsedAmount && parsedAmount > 0n
         ? `${Number(formatEther(expectedMintOutput)).toFixed(6)} ${leveragedTokenSymbol}`
         : "...";
     let mintUsd: string | undefined;
     if (expectedMintOutput && parsedAmount && parsedAmount > 0n) {
       const leveragedAmount = Number(formatEther(expectedMintOutput));
       const depositTokenSym = (selectedDepositAsset || collateralSymbol)?.toLowerCase() ?? "";
       let depositPriceUSD = 0;
       if (depositTokenSym === "wsteth" || depositTokenSym === "steth") depositPriceUSD = wstETHPrice || 0;
       else if (depositTokenSym === "fxsave") depositPriceUSD = fxSAVEPrice || 0;
       else if (depositTokenSym === "eth" || depositTokenSym === "weth") depositPriceUSD = ethPrice || 0;
       else if (depositTokenSym === "usdc" || depositTokenSym === "fxusd") depositPriceUSD = 1.0;
       const depositAmountNum = amount && parseFloat(amount) > 0 ? parseFloat(amount) : 0;
       const usdValue =
         depositPriceUSD > 0 && depositAmountNum > 0
           ? depositAmountNum * depositPriceUSD
           : (() => {
               const col = collateralSymbol.toLowerCase();
               let p = 0;
               if (col === "wsteth" || col === "steth") p = wstETHPrice || 0;
               else if (col === "fxsave") p = fxSAVEPrice || 0;
               else if (col === "eth") p = ethPrice || 0;
               else if (col === "usdc" || col === "fxusd") p = 1.0;
               return p > 0 ? leveragedAmount * p : 0;
             })();
       if (usdValue > 0)
         mintUsd = `$${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
     }
     const rows: OverviewRow[] = [{ label: "You will receive:", value: mintReceive, subValue: mintUsd }];
     const conversionLine =
       expectedMintOutput && expectedMintOutput > 0n && amount && parseFloat(amount) > 0
         ? `(${parseFloat(amount).toFixed(6)} ${selectedDepositAsset || collateralSymbol} ≈ ${Number(formatEther(expectedMintOutput)).toFixed(6)} ${leveragedTokenSymbol})`
         : undefined;
     return (
       <TransactionOverviewCard
         rows={rows}
         conversionLine={conversionLine}
         conversionLineAlign="right"
         feeLabel={mintFeePercentage != null ? "Mint Fee:" : undefined}
         feeValue={mintFeePercentage != null ? `${mintFeePercentage.toFixed(2)}%` : undefined}
         feeWarning={mintFeePercentage != null && mintFeePercentage > 2}
       />
     );
   }
   const redeemReceive =
     expectedRedeemOutput && parsedAmount && parsedAmount > 0n
       ? `${Number(formatEther(expectedRedeemOutput)).toFixed(6)} ${collateralSymbol}`
       : "...";
   let redeemUsd: string | undefined;
   if (expectedRedeemOutput && parsedAmount && parsedAmount > 0n) {
     const collateralAmount = Number(formatEther(expectedRedeemOutput));
     const col = collateralSymbol.toLowerCase();
     let priceUSD = 0;
     if (col === "wsteth" || col === "steth") priceUSD = wstETHPrice || 0;
     else if (col === "fxsave") priceUSD = fxSAVEPrice || 0;
     else if (col === "eth") priceUSD = ethPrice || 0;
     else if (col === "usdc" || col === "fxusd") priceUSD = 1.0;
     const usdValue = priceUSD > 0 ? collateralAmount * priceUSD : 0;
     if (usdValue > 0)
       redeemUsd = `$${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
   }
   const rows: OverviewRow[] = [{ label: "You will receive:", value: redeemReceive, subValue: redeemUsd }];
   const conversionLine =
     expectedRedeemOutput && expectedRedeemOutput > 0n && amount && parseFloat(amount) > 0
       ? `(${parseFloat(amount).toFixed(6)} ${leveragedTokenSymbol} ≈ ${Number(formatEther(expectedRedeemOutput)).toFixed(6)} ${collateralSymbol})`
       : undefined;
   return (
     <TransactionOverviewCard
       rows={rows}
       conversionLine={conversionLine}
       conversionLineAlign="right"
       feeLabel={redeemFeePercentage != null ? "Redemption Fee:" : undefined}
       feeValue={redeemFeePercentage != null ? `${redeemFeePercentage.toFixed(2)}%` : undefined}
       feeWarning={redeemFeePercentage != null && redeemFeePercentage > 2}
     />
   );
 })()}

 {/* Error - beneath transaction overview (match Genesis/Anchor) */}
 {error && <ErrorBanner message={error} />}

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

 {/* Action Buttons - no line above; Anchor-style mt-4 spacing */}
 {!isProcessing && (
 <ActionButtons
   primaryLabel={step === "error" ? "Try Again" : activeTab === "mint" ? "Mint" : "Redeem"}
   primaryAction={activeTab === "mint" ? handleMint : handleRedeem}
   primaryDisabled={
     step !== "error" &&
     (!isConnected ||
       !amount ||
       parseFloat(amount) <= 0 ||
       (activeTab === "mint" && !!parsedAmount && parsedAmount > currentBalance) ||
       (activeTab === "redeem" && !!parsedAmount && parsedAmount > currentBalance))
   }
   secondaryLabel="Cancel"
   secondaryAction={
     step === "error" || step === "input"
       ? () => (step === "error" ? handleCancel() : handleClose())
       : undefined
   }
   variant="pearl"
 />
 )}
 </div>
 </div>
     );
   };

 const config: BaseManageModalConfig = {
   protocol: "Sail",
   header: { primaryToken },
   tabs: [
     {
       id: "mint",
       label: "Mint",
       disabled: isProcessing,
       sectionHeading: "Deposit Collateral & Amount",
       renderContent: renderSailContent,
     },
     {
       id: "redeem",
       label: "Redeem",
       disabled: isProcessing,
       sectionHeading: "Withdraw Collateral & Amount",
       renderContent: renderSailContent,
     },
   ],
   initialTab,
   sectionHeadingWithBorder: true,
   onTabChange: (id) => handleTabChange(id as "mint" | "redeem"),
 };

 return (
   <>
     <BaseManageModal isOpen={isOpen} onClose={handleClose} config={config} />
     {progressModal && (
       <TransactionProgressModal
         isOpen={progressModal.isOpen}
         onClose={() => {
           setProgressModal(null);
           if (progressModal.steps.every((s) => s.status === "completed")) {
             setAmount("");
             setStep("input");
           }
         }}
         title={progressModal.title}
         steps={progressModal.steps}
         currentStepIndex={progressModal.currentStepIndex}
         progressVariant="horizontal"
         errorMessage={progressModal.steps.find((s) => s.status === "error")?.error}
       />
     )}
   </>
 );
};
