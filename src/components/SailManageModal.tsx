"use client";

import React, { useState, useEffect, useMemo } from "react";
import { flushSync } from "react-dom";
import { parseEther, formatEther, parseUnits, formatUnits } from "viem";
import {
 useAccount,
 useBalance,
 useContractRead,
 useWriteContract,
 usePublicClient,
 useSendTransaction,
 useSwitchChain,
 useChainId,
} from "wagmi";
import { BaseError, ContractFunctionRevertedError } from "viem";
import { ERC20_ABI, MINTER_ABI } from "@/abis/shared";
import { WSTETH_ABI } from "@/abis";
import { MINTER_ETH_ZAP_V3_ABI } from "@/abis";
import { MINTER_USDC_ZAP_V3_ABI } from "@/abis";
import { calculateDeadline } from "@/utils/permit";
import { usePermitFlow } from "@/hooks/usePermitFlow";
import { useCollateralPrice } from "@/hooks/useCollateralPrice";
import {
  DEFAULT_WRAP_LEG_SLIPPAGE_BPS,
  minWrappedCollateralAfterUnderlyingToWrapped,
  minWrappedCollateralForEthBaseZap,
} from "@/utils/minterZapV4";
import SimpleTooltip from "@/components/SimpleTooltip";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { InfoCallout } from "@/components/InfoCallout";
import { ModalNotificationsPanel } from "@/components/ModalNotificationsPanel";
import { AlertOctagon, Bell, Info, RefreshCw } from "lucide-react";
import {
  TransactionProgressModal,
  TransactionStep,
} from "@/components/TransactionProgressModal";
import { useTransactionProgress } from "@/hooks/useTransactionProgress";
import { useDefiLlamaSwap, getDefiLlamaSwapTx } from "@/hooks/useDefiLlamaSwap";
import { useUserTokens, useTokenDecimals } from "@/hooks/useUserTokens";
import { amountToUSD } from "@/utils/tokenPriceToUSD";
import { TokenSelectorDropdown } from "@/components/TokenSelectorDropdown";
import { TokenAmountSection } from "@/components/TokenAmountSection";
import { DepositModalShell } from "@/components/DepositModalShell";
import { ProtocolBanner } from "@/components/ProtocolBanner";
import { DepositModalTabHeader } from "@/components/DepositModalTabHeader";
import { TransactionSuccessMessage } from "@/components/TransactionSuccessMessage";
import { useCoinGeckoPrice } from "@/hooks/useCoinGeckoPrice";
import { getDepositMode } from "@/utils/depositMode";
import type { DefinedMarket } from "@/config/markets";

interface SailManageModalProps {
 isOpen: boolean;
 onClose: () => void;
 marketId: string;
 market: DefinedMarket;
 initialTab?:"mint" |"redeem";
 onSuccess?: () => void;
 /** USD price of leveraged token (e.g. hsSTETH-EUR). Used for value-based output estimation when swap+dry-run yields wrong results. */
 leveragedTokenPriceUSD?: number;
 /** Pre-loaded prices from parent (Sail page). Avoids $0.00 when modal mounts before CoinGecko responds. */
 ethPrice?: number | null;
 wstETHPrice?: number | null;
 fxSAVEPrice?: number | null;
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
 market: DefinedMarket
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
 leveragedTokenPriceUSD,
 ethPrice: ethPriceProp,
 wstETHPrice: wstETHPriceProp,
 fxSAVEPrice: fxSAVEPriceProp,
}: SailManageModalProps) => {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const depositMode = getDepositMode(market);
  const { collateralOnly: isCollateralOnlyChain, nativeTokenLabel, isMegaEth } = depositMode;
  const marketChainId = (market as DefinedMarket & { chainId?: number }).chainId ?? 1;
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();
  const { switchChain } = useSwitchChain();
  const connectedChainId = useChainId();

  const ensureCorrectNetwork = async (): Promise<boolean> => {
    if (connectedChainId === marketChainId) return true;
    try {
      await switchChain({ chainId: marketChainId });
      return true;
    } catch (err) {
      if (process.env.NODE_ENV === "development") console.warn("[SailManage] Switch network rejected:", err);
      setError(`Please switch to ${marketChainId === 4326 ? "MegaETH" : "Ethereum Mainnet"} to continue.`);
      return false;
    }
  };

 const [activeTab, setActiveTab] = useState<"mint" |"redeem">(initialTab);
 const [amount, setAmount] = useState("");
 const [selectedDepositAsset, setSelectedDepositAsset] = useState<
 string | null
 >(null);
  const {
    isPermitCapable,
    disableReason,
    handlePermitOrApproval,
    permitEnabled,
    setPermitEnabled,
  } = usePermitFlow({
    enabled: isOpen && !!address,
    depositAssetSymbol: selectedDepositAsset ?? undefined,
  });
 const [showCustomTokenInput, setShowCustomTokenInput] = useState(false);
 const [customTokenAddress, setCustomTokenAddress] = useState<string>("");
 const [step, setStep] = useState<ModalStep>("input");
 const [error, setError] = useState<string | null>(null);
 const [txHash, setTxHash] = useState<string | null>(null);
 const [showNotifications, setShowNotifications] = useState(false);

 const progress = useTransactionProgress();

 const resetSailMintFormKeepToken = () => {
   setAmount("");
   setStep("input");
   setError(null);
   setTxHash(null);
   progress.reset();
 };

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
 /** Some markets omit zap / underlying fields on `addresses`; index for safe access. */
 const addressByName = market.addresses as Record<
   string,
   `0x${string}` | undefined
 >;

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
const zapAddress = addressByName.leveragedTokenZap;

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
  !isCollateralOnlyChain &&
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
  {
    enabled:
      (useUSDCZap || useETHZap) && !!priceOracleAddress,
  }
);

// Get USD prices for overview display (use props from Sail page when available - they're pre-loaded)
const { price: ethPriceFromHook } = useCoinGeckoPrice("ethereum", 120000);
const { price: wstETHPriceFromHook } = useCoinGeckoPrice("wrapped-steth", 120000);
const { price: fxSAVEPriceFromHook } = useCoinGeckoPrice("fx-usd-saving", 120000);
const ethPrice = ethPriceProp ?? ethPriceFromHook ?? 0;
const wstETHPrice = wstETHPriceProp ?? wstETHPriceFromHook ?? 0;
const fxSAVEPrice = fxSAVEPriceProp ?? fxSAVEPriceFromHook ?? 1.08;

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

 // Merge accepted assets with user tokens for dropdown (avoid duplicates). Non-mainnet: collateral only.
 const allAvailableAssets = useMemo(() => {
   if (isCollateralOnlyChain) return { filteredUserTokens: [] };
   const acceptedUpper = new Set(acceptedAssets.map((a) => a.symbol.toUpperCase()));
   const filteredUserTokens = userTokens.filter(
     (t) => !acceptedUpper.has(t.symbol.toUpperCase()) && t.balance > 0n
   );
   return { filteredUserTokens };
 }, [acceptedAssets, userTokens, isCollateralOnlyChain]);

 // Get native ETH balance (when ETH is selected) - use useBalance (market's chain for multi-chain)
 const { data: nativeEthBalance } = useBalance({
 address: address,
 chainId: marketChainId,
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
   chainId: marketChainId,
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
   chainId: marketChainId,
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
 chainId: marketChainId,
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
   chainId: marketChainId,
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
   chainId: marketChainId,
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
   chainId: marketChainId,
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
 chainId: marketChainId,
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
 // Need wstETH address for both: native ETH direct mint, and swap-to-ETH (needsSwap) to convert swap output for dry run
 const wstETHAddress = useETHZap && (isNativeETH && !needsSwap || needsSwap)
   ? (market.addresses?.collateralToken as `0x${string}` | undefined) // wstETH for wstETH markets
   : undefined;
 
 const { data: wstETHAmountForDryRun } = useContractRead({
   address: wstETHAddress,
   abi: WSTETH_ABI,
   functionName: "getWstETHByStETH",
   args: parsedAmount && wstETHAddress ? [parsedAmount] : undefined, // ETH → stETH is 1:1, so use parsedAmount as stETH
   chainId: marketChainId,
   query: {
     enabled: !!wstETHAddress && !!parsedAmount && parsedAmount > 0n && activeTab === "mint" && useETHZap && isNativeETH && !needsSwap,
   },
 });

 // When swapping to ETH for ETH zap: convert swap output (ETH) to wstETH for dry run
 const swapOutputAsStETH = needsSwap && swapQuote?.toAmount ? (swapQuote.toAmount as bigint) : undefined;
 const { data: wstETHAmountFromSwapForDryRun } = useContractRead({
   address: wstETHAddress,
   abi: WSTETH_ABI,
   functionName: "getWstETHByStETH",
   args: swapOutputAsStETH && wstETHAddress ? [swapOutputAsStETH] : undefined,
   chainId: marketChainId,
   query: {
     enabled: !!wstETHAddress && !!swapOutputAsStETH && swapOutputAsStETH > 0n && activeTab === "mint" && useETHZap && needsSwap,
   },
 });

 // Dry run for mint
 // mintLeveragedTokenDryRun expects collateral amount (fxSAVE for USDC zap, wstETH for ETH zap, etc.)
 // For fxUSD/USDC zap: convert input to expected fxSAVE via wrapped rate; minter dry run expects fxSAVE
 const effectiveZapInput = needsSwap && swapQuote ? swapQuote.toAmount : parsedAmount;
 const expectedFxSaveForDryRun = useMemo(() => {
   if (!useUSDCZap || !fxSAVERate || fxSAVERate === 0n || !effectiveZapInput || effectiveZapInput === 0n)
     return undefined;
   const isUsdcInput = needsSwap || isUSDC; // needsSwap outputs USDC; otherwise isUSDC or isFxUSD
   if (isUsdcInput)
     return ((effectiveZapInput * 10n ** 12n) * 10n ** 18n) / fxSAVERate;
   return (effectiveZapInput * 10n ** 18n) / fxSAVERate; // fxUSD 18 decimals
 }, [useUSDCZap, fxSAVERate, effectiveZapInput, needsSwap, isUSDC]);

 const amountForDryRun = useETHZap && isNativeETH && !needsSwap && wstETHAmountForDryRun
   ? (wstETHAmountForDryRun as bigint)
   : useETHZap && needsSwap && wstETHAmountFromSwapForDryRun
     ? (wstETHAmountFromSwapForDryRun as bigint)
     : useUSDCZap
       ? (expectedFxSaveForDryRun ?? undefined)
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
 chainId: marketChainId,
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
 chainId: marketChainId,
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
 // Value-based estimation: inputValueUSD / leveragedTokenPriceUSD
 // Used when dry run understates output (e.g. ~10% low for USDC zap) - 300 USDC should give ~$298 worth, not ~$275
 const valueBasedOutput = (() => {
   if (!leveragedTokenPriceUSD || leveragedTokenPriceUSD <= 0 || !parsedAmount || parsedAmount === 0n)
     return undefined;
   let inputTokenPrice = 0;
   let inputDecimals = 18;
   const dep = selectedDepositAsset?.toLowerCase();
   if (dep === "fxsave") {
     inputTokenPrice = fxSAVEPrice || 1.076;
     inputDecimals = selectedTokenDecimals ?? 18;
   } else if (dep === "usdc") {
     inputTokenPrice = 1;
     inputDecimals = 6;
   } else if (dep === "fxusd") {
     inputTokenPrice = 1;
     inputDecimals = selectedTokenDecimals ?? 18;
   } else if (userTokens.some((t) => t.symbol?.toUpperCase() === selectedDepositAsset?.toUpperCase())) {
     const sym = selectedDepositAsset?.toUpperCase() || "";
     inputTokenPrice = sym === "USDC" || sym === "FXUSD" ? 1 : fxSAVEPrice || 1.076;
     inputDecimals = selectedTokenDecimals ?? 18;
   } else return undefined;
   const inputValueUSD = (Number(parsedAmount) / 10 ** inputDecimals) * inputTokenPrice;
   if (inputValueUSD <= 0) return undefined;
   // Subtract ~1% for fees (mint fee, zap slippage) to avoid overstating
   const adjustedInputUSD = inputValueUSD * 0.99;
   const outputTokens = adjustedInputUSD / leveragedTokenPriceUSD;
   if (outputTokens <= 0 || !Number.isFinite(outputTokens)) return undefined;
   try {
     return parseEther(outputTokens.toFixed(18));
   } catch {
     return undefined;
   }
 })();

 if (!parsedAmount || parsedAmount === 0n) return undefined;

 // Prefer value-based when dry run understates: (1) swap-to-mint path, or (2) USDC zap returning >5% less than value-based
 if (needsSwap && useETHZap && valueBasedOutput) return valueBasedOutput;

 if (mintDryRunResult && amountForDryRun && amountForDryRun > 0n) {
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
   // Contract can return inflated leveragedMinted (e.g. collateral * rate instead of collateral / price).
   if (price > 0n && leveragedMinted > amountForDryRun) {
     const dryRunOutput = (amountForDryRun * 10n ** 18n) / price;
     if (valueBasedOutput && dryRunOutput < valueBasedOutput / 10n) return valueBasedOutput;
     return dryRunOutput;
   }
   // When dry run understates by >5% vs value-based (e.g. USDC zap showing ~8% less), use value-based
   if (valueBasedOutput && leveragedMinted < (valueBasedOutput * 95n) / 100n) return valueBasedOutput;
   return leveragedMinted;
 }
 return valueBasedOutput;
 }, [mintDryRunResult, parsedAmount, amountForDryRun, needsSwap, useETHZap, leveragedTokenPriceUSD, selectedDepositAsset, fxSAVEPrice, selectedTokenDecimals, userTokens]);

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
 if (depositAssetBalanceData !== undefined && depositAssetBalanceData !== null) {
 if (typeof depositAssetBalanceData === "bigint") {
 balance = depositAssetBalanceData;
 } else if (typeof depositAssetBalanceData === "object" && "result" in depositAssetBalanceData) {
 balance = ((depositAssetBalanceData as { result: bigint }).result) || 0n;
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
 if (leveragedTokenBalance !== undefined && leveragedTokenBalance !== null) {
 if (typeof leveragedTokenBalance === "bigint") {
 balance = leveragedTokenBalance;
 } else if (typeof leveragedTokenBalance === "object" && "result" in leveragedTokenBalance) {
 balance = ((leveragedTokenBalance as { result: bigint }).result) || 0n;
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

 const updateProgressStep = (stepId: string, updates: Partial<TransactionStep>) => {
   progress.updateStep(stepId, updates, {
     advanceOnComplete: updates.status === "completed",
   });
 };

 // Handle mint
 const handleMint = async () => {
 if (!validateAmount() || !address || !minterAddress || !parsedAmount)
 return;

 // Switch to market chain only when user starts the transaction (not on modal open)
 if (!(await ensureCorrectNetwork())) return;

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
 // When permit is enabled for zap flows (stETH, USDC, fxUSD), we skip the approve step—permit is used inside the mint step
 const willUsePermitForZap =
   permitEnabled && (useETHZap || useUSDCZap) && !includeSwap && !isNativeETH;

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
     details: "Approve token for swap via Velora DEX",
   });
 }
 if (includeSwap) {
   const swapTargetLabel = isWstETHMarket ? "ETH" : "USDC";
   steps.push({
     id: "swap",
     label: `Swap ${selectedDepositAsset} → ${swapTargetLabel}`,
     status: "pending",
     details: "Swap tokens via Velora DEX",
   });
 }
 if (needsPostSwapUsdcApproval) {
   steps.push({
     id: "approvePostSwap",
     label: "Approve USDC for deposit",
     status: "pending",
     details: "Approve USDC for deposit via zap",
   });
 }
 if (needsApproval && !willUsePermitForZap) {
   const approveLabel = useZap && zapAssetName
     ? `Approve ${zapAssetName} for deposit`
     : `Approve ${selectedDepositAsset || collateralSymbol} for deposit`;
   steps.push({
     id:"approve",
     label: approveLabel,
     status:"pending",
     details: "Approve token for deposit",
   });
 }
 if (willUsePermitForZap && zapAssetName) {
   steps.push({
     id: "signPermit",
     label: `Sign permit for ${zapAssetName} (no gas)`,
     status: "pending",
     details: "Sign EIP-2612 permit to authorize deposit (no gas fee)",
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

 progress.open(steps, `Mint ${leveragedTokenSymbol}`);
 flushSync(() => {}); // Force React to paint before first action

 try {
   // Step 1a: Approve source token for swap (if needed)
   if (needsSwapApproval && depositAssetAddress) {
     updateProgressStep("approveSwap", { status: "in_progress" });
     const approveHash = await writeContractAsync({
       address: depositAssetAddress,
       abi: ERC20_ABI,
       functionName: "approve",
       args: [PARASWAP_TOKEN_TRANSFER_PROXY, parsedAmount],
       chainId: marketChainId,
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
       chainId: marketChainId,
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
       chainId: marketChainId,
     });
     await publicClient?.waitForTransactionReceipt({ hash: approveHash });
     updateProgressStep("approvePostSwap", {
       status: "completed",
       txHash: approveHash,
     });
   }

   // Step 2: Approve (if needed, no-swap path)
   // Skip when willUsePermitForZap: permit is used inside the mint step instead
   // If using zap (ETH zap or USDC zap), approve to zapAddress
   // Only direct mints (wstETH, fxSAVE) approve to minterAddress
   // Note: useETHZap and useUSDCZap already check for zapAddress via useZap, so if they're true, zapAddress must exist
   if (needsApproval && !willUsePermitForZap && depositAssetAddress) {
     updateProgressStep("approve", { status:"in_progress" });
     const approveTarget = useETHZap || useUSDCZap
       ? zapAddress!
       : minterAddress;
     const approveHash = await writeContractAsync({
       address: depositAssetAddress,
       abi: ERC20_ABI,
       functionName:"approve",
       args: [approveTarget, parsedAmount],
       chainId: marketChainId,
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
     // When mint fee 1%, use 4% slippage for fxUSD (Anchor fix: revert after permit/transferFrom), else 3%
     const isActuallyFxUSD = isFxUSD && !includeSwap;
     const usdcFxSlippageBps = isActuallyFxUSD ? 4.0 : 3.0;
     if (expectedMintOutput && expectedMintOutput > 0n) {
       minOutput = (expectedMintOutput * BigInt(Math.floor((100 - usdcFxSlippageBps) * 100))) / 10000n;
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
       minOutput = (estimatedLeveragedOut * BigInt(Math.floor((100 - usdcFxSlippageBps) * 100))) / 10000n;
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

   let mintHash!: `0x${string}`;

   // FXUSD must always use zap - if zapAddress is missing, throw error
   if (isFxUSD && isFxUSDMarket && !zapAddress) {
     throw new Error("Zap contract address (leveragedTokenZap) is missing from market config. FXUSD deposits require a zap contract.");
   }

   if (useZap && zapAddress) {
     // Use zap contract to mint
     if (useETHZap) {
       const minWrappedCollateralOut =
         includeSwap || isNativeETH
           ? await minWrappedCollateralForEthBaseZap(
               publicClient ?? undefined,
               zapAddress,
               amountForMint,
               fxSAVERate,
               DEFAULT_WRAP_LEG_SLIPPAGE_BPS
             )
           : minWrappedCollateralAfterUnderlyingToWrapped(
               amountForMint,
               fxSAVERate,
               DEFAULT_WRAP_LEG_SLIPPAGE_BPS
             );
       // ETH/stETH zap for wstETH markets
       if (includeSwap || isNativeETH) {
         mintHash = await writeContractAsync({
           address: zapAddress,
           abi: MINTER_ETH_ZAP_V3_ABI,
           functionName: "zapBaseAssetToLeveraged",
           args: [
             minWrappedCollateralOut,
             address as `0x${string}`,
             minOutput,
           ],
           value: amountForMint,
           chainId: marketChainId,
         });
       } else if (isStETH) {
         // Use underlyingCollateralToken (stETH), not wrappedCollateralToken (wstETH)
         let stETHAddress = addressByName.underlyingCollateralToken;
         
         // Fallback: use hardcoded stETH address (constant across all markets)
         if (!stETHAddress) {
           stETHAddress = "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84" as `0x${string}`;
         }
         
        if (!stETHAddress) {
          throw new Error("stETH address not found. Please ensure you're depositing to a wstETH market.");
        }
        
        // Try to use permit first when enabled, fallback to approval if not supported or fails
        if (permitEnabled) updateProgressStep("signPermit", { status: "in_progress" });
        const permitResult = permitEnabled
          ? await handlePermitOrApproval(stETHAddress, zapAddress, amountForMint)
          : { usePermit: false };
        if (permitEnabled && permitResult?.usePermit)
          updateProgressStep("signPermit", { status: "completed" });
        let usePermit = permitResult != null && permitResult.usePermit && !!permitResult.permitSig && !!permitResult.deadline;
        
        if (usePermit && permitResult && permitResult.permitSig && permitResult.deadline) {
          try {
            mintHash = await writeContractAsync({
              address: zapAddress,
              abi: MINTER_ETH_ZAP_V3_ABI,
              functionName: "zapCollateralToLeveragedWithPermit",
              args: [
                amountForMint,
                minWrappedCollateralOut,
                address as `0x${string}`,
                minOutput,
                permitResult.deadline,
                permitResult.permitSig.v,
                permitResult.permitSig.r,
                permitResult.permitSig.s,
              ],
              chainId: marketChainId,
            });
          } catch (permitError) {
            console.error("Permit zap failed, falling back to approval:", permitError);
            // Fall through to approval flow below
            usePermit = false;
          }
        }
        
        if (!usePermit) {
          // Fallback: Use traditional approval + zap. Remove signPermit so we show only [approve, mint].
          const stETHAllowance = await publicClient?.readContract({
            address: stETHAddress,
            abi: ERC20_ABI,
            functionName: "allowance",
            args: [address as `0x${string}`, zapAddress],
          });
          const allowanceBigInt = (stETHAllowance as bigint) || 0n;
          const needsStEthApproval = allowanceBigInt < amountForMint;
          progress.setSteps((prev) => {
            let newSteps = prev.filter((s) => s.id !== "signPermit");
            if (needsStEthApproval && !newSteps.some((s) => s.id === "approve")) {
              const mintIdx = newSteps.findIndex((s) => s.id === "mint");
              newSteps = [...newSteps];
              newSteps.splice(mintIdx, 0, { id: "approve", label: "Approve stETH for deposit", status: "pending", details: "Approve stETH for deposit via zap" });
            }
            const newIndex = newSteps.findIndex((s) => s.status !== "completed");
            return { steps: newSteps, currentStepIndex: newIndex === -1 ? newSteps.length - 1 : newIndex };
          });
          if (needsStEthApproval) {
            updateProgressStep("approve", { status: "in_progress" });
            const approveHash = await writeContractAsync({
              address: stETHAddress,
              abi: ERC20_ABI,
              functionName: "approve",
              args: [zapAddress, amountForMint],
              chainId: marketChainId,
            });
            updateProgressStep("approve", { status: "completed", txHash: approveHash });
            await publicClient?.waitForTransactionReceipt({ hash: approveHash });
          }
          
          mintHash = await writeContractAsync({
            address: zapAddress,
            abi: MINTER_ETH_ZAP_V3_ABI,
            functionName: "zapCollateralToLeveraged",
            args: [
              amountForMint,
              minWrappedCollateralOut,
              address as `0x${string}`,
              minOutput,
            ],
            chainId: marketChainId,
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
      if (permitEnabled) updateProgressStep("signPermit", { status: "in_progress" });
      const permitResult = permitEnabled
        ? await handlePermitOrApproval(assetAddressForApproval, zapAddress, amountForMint)
        : { usePermit: false };
      if (permitEnabled && permitResult?.usePermit)
        updateProgressStep("signPermit", { status: "completed" });
      let usePermit = permitResult != null && permitResult.usePermit && !!permitResult.permitSig && !!permitResult.deadline;
      
      // Calculate minFxSaveOut: use wrappedRate like Anchor (expectedFxSave = amount/rate), not % of input.
      // Using % of input caused SlippageExceeded for fxUSD (e.g. 5 fxUSD → ~4.65 fxSAVE, we required 4.8).
      const minFxSaveSlipPct = isActuallyFxUSD ? 4 : 3; // 4% for fxUSD, 3% for USDC (mint fee 1%)
      let minFxSaveOut: bigint;
      if (fxSAVERate && fxSAVERate > 0n) {
        const expectedFxSave = isActuallyUSDC
          ? ((amountForMint * 10n ** 12n) * 10n ** 18n) / fxSAVERate
          : (amountForMint * 10n ** 18n) / fxSAVERate;
        minFxSaveOut = (expectedFxSave * BigInt(100 - minFxSaveSlipPct)) / 100n;
      } else {
        minFxSaveOut = (amountForMint * BigInt(100 - (isActuallyFxUSD ? 15 : minFxSaveSlipPct)) * 100n) / 10000n;
      }
      
      if (usePermit && permitResult && permitResult.permitSig && permitResult.deadline) {
        // Use permit functions - requires minFxSaveOut parameter; use exact signed deadline.
        const permitDeadline = permitResult.deadline;
        try {
          if (isActuallyUSDC) {
            mintHash = await writeContractAsync({
              address: zapAddress,
              abi: MINTER_USDC_ZAP_V3_ABI,
              functionName: "zapBaseAssetToLeveragedWithPermit",
              chainId: marketChainId,
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
              functionName: "zapCollateralToLeveragedWithPermit",
              chainId: marketChainId,
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
        // Fallback: Use traditional approval + zap. Remove signPermit step so we show only [approve, mint].
        progress.setSteps((prev) => {
          const newSteps = prev.filter((s) => s.id !== "signPermit");
          const newIndex = newSteps.findIndex((s) => s.status !== "completed");
          return { steps: newSteps, currentStepIndex: newIndex === -1 ? newSteps.length - 1 : newIndex };
        });
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
          progress.setSteps((prev) => {
            const hasApproveStep = prev.some(s => s.id === "approve");
            if (!hasApproveStep) {
              const mintIndex = prev.findIndex(s => s.id === "mint");
              const newSteps = [...prev];
              newSteps.splice(mintIndex, 0, {
                id: "approve",
                label: `Approve ${isActuallyFxUSD ? "fxUSD" : "USDC"} for deposit`,
                status: "pending",
                details: `Approve ${isActuallyFxUSD ? "fxUSD" : "USDC"} for deposit via zap`,
              });
              const newIndex = newSteps.findIndex((s) => s.status !== "completed");
              return { steps: newSteps, currentStepIndex: newIndex === -1 ? newSteps.length - 1 : newIndex };
            }
            return prev;
          });
          
          updateProgressStep("approve", { status: "in_progress" });
          const approveHash = await writeContractAsync({
            address: assetAddressForApproval,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [approvalTarget, amountForMint],
            chainId: marketChainId,
          });
          updateProgressStep("approve", { status: "completed", txHash: approveHash });
          await publicClient?.waitForTransactionReceipt({ hash: approveHash });
        }
        
        if (isActuallyUSDC) {
          mintHash = await writeContractAsync({
            address: zapAddress,
            abi: MINTER_USDC_ZAP_V3_ABI,
            functionName: "zapBaseAssetToLeveraged",
            chainId: marketChainId,
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
            functionName: "zapCollateralToLeveraged",
            chainId: marketChainId,
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
         market.addresses?.leveragedTokenZap: ${addressByName.leveragedTokenZap || 'undefined'}`;
       throw new Error(errorMsg);
     }
     mintHash = await writeContractAsync({
       address: minterAddress,
       abi: MINTER_ABI,
       functionName:"mintLeveragedToken",
       args: [parsedAmount, address, minOutput],
       chainId: marketChainId,
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
     errorMessage = revertError.reason || revertError.data?.errorName || "Transaction failed";
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
 progress.close();
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

 // Switch to market chain only when user starts the transaction (not on modal open)
 if (!(await ensureCorrectNetwork())) return;

 setError(null);

 // Determine if approval is needed
 const needsApproval =
 ((leveragedTokenAllowance as bigint) || 0n) < parsedAmount;

 // Build steps
 const steps: TransactionStep[] = [];
 if (needsApproval) {
 steps.push({
 id:"approve",
 label: `Approve ${leveragedTokenSymbol} for redemption`,
 status:"pending",
 details: "Approve token for redemption",
 });
 }
 steps.push({
 id:"redeem",
 label: `Redeem ${leveragedTokenSymbol} for collateral`,
 status:"pending",
 details: `Receive ${expectedRedeemOutput ? Number(formatEther(expectedRedeemOutput)).toFixed(4) : "..."} ${collateralSymbol}`,
 });

 // Open progress modal
 progress.open(steps, `Redeem ${leveragedTokenSymbol}`);
 flushSync(() => {}); // Force React to paint before first action

 try {
 // Step 1: Approve (if needed)
 if (needsApproval) {
 updateProgressStep("approve", { status:"in_progress" });
 const approveHash = await writeContractAsync({
 address: leveragedTokenAddress,
 abi: ERC20_ABI,
 functionName:"approve",
 args: [minterAddress, parsedAmount],
 chainId: marketChainId,
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
 chainId: marketChainId,
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
 progress.close();
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
 if (depositAssetBalanceData !== undefined && depositAssetBalanceData !== null) {
 if (typeof depositAssetBalanceData === "bigint") {
 return depositAssetBalanceData;
 }
 if (typeof depositAssetBalanceData === "object" && "result" in depositAssetBalanceData) {
 return ((depositAssetBalanceData as { result: bigint }).result) || 0n;
 }
 return depositAssetBalanceData as bigint;
 }
 return 0n;
 } else {
 // Handle both direct bigint and { result: bigint } formats
 if (leveragedTokenBalance !== undefined && leveragedTokenBalance !== null) {
 if (typeof leveragedTokenBalance === "bigint") {
 return leveragedTokenBalance;
 }
 if (typeof leveragedTokenBalance === "object" && "result" in leveragedTokenBalance) {
 return ((leveragedTokenBalance as { result: bigint }).result) || 0n;
 }
 return leveragedTokenBalance as bigint;
 }
 return 0n;
 }
 }, [
 activeTab,
 selectedDepositAsset,
 nativeEthBalance,
 depositAssetBalanceData,
 leveragedTokenBalance,
 ]);

 return (
 <>
 {progress.isOpen && (
   <TransactionProgressModal
     isOpen={progress.isOpen}
     onClose={() => {
       progress.close();
       if (progress.steps.every((s) => s.status === "completed")) {
         setAmount("");
         setStep("input");
       }
     }}
     title={progress.title}
     steps={progress.steps}
     currentStepIndex={progress.currentStepIndex}
     progressVariant="horizontal"
     errorMessage={progress.steps.find((s) => s.status === "error")?.error}
   />
 )}
 {!progress.isOpen && isOpen && (
 <DepositModalShell
   isOpen={isOpen}
   onClose={handleClose}
   banner={
     market?.leveragedToken?.symbol ? (
       <ProtocolBanner
         protocolName="Sail"
         tokenSymbol={leveragedTokenSymbol}
         tokenIcon={(market.leveragedToken as { icon?: string })?.icon}
       />
     ) : undefined
   }
   header={
     <DepositModalTabHeader
       tabs={[
         { value: "mint", label: "Mint" },
         { value: "redeem", label: "Redeem" },
       ]}
       activeTab={activeTab}
       onTabChange={(v) => handleTabChange(v as "mint" | "redeem")}
       disabled={isProcessing}
     />
   }
   closeDisabled={isProcessing}
   contentClassName="p-4"
 >
 {step ==="success" ? (
 <TransactionSuccessMessage
   message={
     activeTab === "mint"
       ? "Your sail tokens have been minted successfully."
       : "Your sail tokens have been redeemed successfully."
   }
   txHash={txHash}
 />
 ) : (
 <div className="space-y-4">
   <div className="flex items-center justify-center text-xs text-[#1E4775]/50 pb-3 border-b border-[#d1d7e5]">
     <div className="text-[#1E4775] font-semibold">
       {activeTab === "mint" ? "Deposit Collateral & Amount" : "Withdraw Collateral & Amount"}
     </div>
   </div>
 {/* Input Section */}
 <TokenAmountSection
   tokenSelector={
     activeTab === "mint"
       ? {
           value: selectedDepositAsset || "",
           onChange: (newAsset) => {
             if (newAsset === "custom") {
               setShowCustomTokenInput(true);
               setSelectedDepositAsset("custom");
             } else {
               setShowCustomTokenInput(false);
               setSelectedDepositAsset(newAsset);
               setCustomTokenAddress("");
             }
             resetSailMintFormKeepToken();
           },
           options: [
             ...(acceptedAssets.length > 0
               ? [{
                   label: isCollateralOnlyChain ? (isMegaEth ? "Collateral (MegaETH)" : "Collateral") : "Supported Assets",
                   tokens: acceptedAssets.map((a) => ({
                     symbol: a.symbol,
                     name: (isMegaEth && a.symbol?.toUpperCase() === "ETH") ? nativeTokenLabel : a.name,
                   })),
                 }]
               : []),
             ...(!isCollateralOnlyChain && allAvailableAssets.filteredUserTokens.length > 0
               ? [{
                   label: "Other Tokens (via Swap)",
                   tokens: allAvailableAssets.filteredUserTokens.map((t) => ({
                     symbol: t.symbol,
                     name: t.name,
                     isUserToken: true,
                   })),
                 }]
               : []),
           ],
           label: "Select Deposit Token",
           placeholder: "Select Deposit Token",
           disabled: isProcessing,
           showCustomOption: !isCollateralOnlyChain,
           onCustomOptionClick: () => {
             setShowCustomTokenInput(true);
             setSelectedDepositAsset("custom");
             resetSailMintFormKeepToken();
           },
           customOptionLabel: "+ Add Custom Token Address",
         }
       : undefined
   }
   customToken={
     activeTab === "mint" && showCustomTokenInput
       ? {
           value: customTokenAddress,
           onChange: setCustomTokenAddress,
           show: true,
           disabled: isProcessing,
         }
       : undefined
   }
   betweenTokenAndAmount={
     <>
       {activeTab === "mint" && !isCollateralOnlyChain && needsSwap && (
         <div className="text-xs text-[#1E4775]/70">
           {isLoadingSwapQuote
             ? "Fetching swap quote..."
             : swapQuoteError
               ? "Swap quote unavailable (try a smaller amount or a different token)."
               : swapQuote
                 ? `Will swap to ${isWstETHMarket ? nativeTokenLabel : "USDC"} before minting.`
                 : null}
         </div>
       )}
       <ModalNotificationsPanel
         expanded={showNotifications}
         onToggle={() => setShowNotifications((prev) => !prev)}
         badge={
           <span className="flex items-center gap-1 bg-blue-100 px-2 py-0.5 text-xs text-blue-600">
             <Bell className="h-3 w-3" />
             {activeTab === "mint" ? 2 : 1}
           </span>
         }
       >
         {activeTab === "mint" && (
           <>
             {!isCollateralOnlyChain && (
               <InfoCallout
                 tone="success"
                 icon={<RefreshCw className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-600" />}
                 title="Tip"
               >
                 You can deposit any ERC20 token! Non-collateral tokens will be automatically swapped via Velora.
               </InfoCallout>
             )}
             <InfoCallout
               title="Info"
               icon={<Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />}
             >
               For large deposits, Harbor recommends using wstETH or fxSAVE instead of the built-in swap and zaps.
             </InfoCallout>
           </>
         )}
         {activeTab === "redeem" && (
           <InfoCallout
             title="Info"
             icon={<Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />}
           >
             You will receive collateral (e.g. {collateralSymbol}) in your wallet.
           </InfoCallout>
         )}
       </ModalNotificationsPanel>
     </>
   }
   amount={{
     value: amount,
     setValue: setAmount,
     balance: currentBalance,
     decimals:
       activeTab === "redeem"
         ? 18
         : isNativeETH
           ? 18
           : selectedDepositAsset?.toLowerCase() === "usdc"
             ? 6
             : selectedTokenDecimals ?? 18,
     label: "Enter Amount",
     disabled: isProcessing,
     error,
     isNativeETH: activeTab === "mint" && isNativeETH,
     capAtBalance: true,
     onErrorClear: () => setError(null),
     balanceSymbol:
       activeTab === "mint"
         ? selectedDepositAsset || collateralSymbol
         : leveragedTokenSymbol,
     balanceMaxDecimals: 4,
   }}
   afterAmount={
     activeTab === "mint" ? (
   <div className="flex items-center justify-between rounded-md border border-[#1E4775]/20 bg-[#17395F]/5 px-3 py-2 text-xs">
     <div className="text-[#1E4775]/80">
       Use permit (gasless approval) for this deposit
     </div>
     {disableReason ? (
       <SimpleTooltip label={disableReason}>
         <span className="flex items-center gap-2 text-[#1E4775]/80 cursor-not-allowed opacity-70">
           <span className={permitEnabled ? "text-[#1E4775]" : "text-[#1E4775]/60"}>Off</span>
           <button
             type="button"
             disabled
             className="relative inline-flex h-5 w-9 items-center rounded-full bg-[#1E4775]/30 cursor-not-allowed"
             aria-label="Permit disabled"
           >
             <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
           </button>
         </span>
       </SimpleTooltip>
     ) : (
       <label className="flex items-center gap-2 text-[#1E4775]/80 cursor-pointer">
         <span className={permitEnabled ? "text-[#1E4775]" : "text-[#1E4775]/60"}>
           {permitEnabled ? "On" : "Off"}
         </span>
         <button
           type="button"
           onClick={() => setPermitEnabled((prev) => !prev)}
           className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
             permitEnabled ? "bg-[#1E4775]" : "bg-[#1E4775]/30"
           }`}
           aria-pressed={permitEnabled}
           aria-label="Toggle permit usage"
           disabled={isProcessing}
         >
           <span
             className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
               permitEnabled ? "translate-x-4" : "translate-x-1"
             }`}
           />
         </button>
       </label>
     )}
   </div>
 ) : null
   }
 />

 {/* Transaction Overview - Anchor-style spacing below */}
 <div className="space-y-2 mt-2 mb-4">
   <label className="block text-sm font-semibold text-[#1E4775] mb-1.5">
     Transaction Overview
   </label>
   <div className="rounded-md border border-[#1E4775]/10 bg-[#17395F]/5 p-2.5">
     {activeTab === "mint" && (
       <div className="space-y-2">
         <div className="flex justify-between items-center">
           <span className="text-sm font-medium text-[#1E4775]/70">
             You will receive:
           </span>
           <div className="text-right">
             <div className="text-lg font-bold text-[#1E4775] font-mono">
               {expectedMintOutput && parsedAmount && parsedAmount > 0n
                 ? `${Number(formatEther(expectedMintOutput)).toFixed(6)} ${leveragedTokenSymbol}`
                 : "..."}
             </div>
             {(() => {
               if (!expectedMintOutput || expectedMintOutput === 0n || !parsedAmount || parsedAmount === 0n) return null;
               const leveragedAmount = Number(formatEther(expectedMintOutput));
               const usdValue = amountToUSD(leveragedAmount, leveragedTokenSymbol, {
                 ethPrice: ethPrice ?? 0,
                 wstETHPrice: wstETHPrice ?? 0,
                 fxSAVEPrice: fxSAVEPrice ?? 1.08,
                 leveragedPriceUSD: leveragedTokenPriceUSD ?? 0,
               }, collateralSymbol);
               return usdValue > 0 ? (
                 <div className="text-xs text-[#1E4775]/50 font-mono">
                   ${usdValue.toLocaleString(undefined, {
                     minimumFractionDigits: 2,
                     maximumFractionDigits: 2,
                   })}
                 </div>
               ) : null;
             })()}
           </div>
         </div>
         {expectedMintOutput && expectedMintOutput > 0n && amount && parseFloat(amount) > 0 && (
           <div className="text-xs text-[#1E4775]/50 italic text-right">
             ({parseFloat(amount).toFixed(6)} {selectedDepositAsset || collateralSymbol} ≈ {Number(formatEther(expectedMintOutput)).toFixed(6)} {leveragedTokenSymbol})
           </div>
         )}
         {mintFeePercentage !== undefined && parsedAmount && parsedAmount > 0n && (
           <div className="pt-2 border-t border-[#1E4775]/20">
             <div className="flex justify-end items-center gap-2 text-xs text-right">
               <span
                 className={`font-bold font-mono ${
                   mintFeePercentage > 2 && mintFeePercentage <= 100 ? "text-red-600" : "text-[#1E4775]"
                 }`}
               >
                 Mint Fee: {mintFeePercentage > 100 ? "~1.00" : mintFeePercentage.toFixed(2)}%
                 {mintFeePercentage > 2 && mintFeePercentage <= 100 && " ⚠️"}
               </span>
             </div>
           </div>
         )}
       </div>
     )}
     {activeTab === "redeem" && (
       <div className="space-y-2">
         <div className="flex justify-between items-center">
           <span className="text-sm font-medium text-[#1E4775]/70">
             You will receive:
           </span>
           <div className="text-right">
             <div className="text-lg font-bold text-[#1E4775] font-mono">
               {expectedRedeemOutput && parsedAmount && parsedAmount > 0n
                 ? `${Number(formatEther(expectedRedeemOutput)).toFixed(6)} ${collateralSymbol}`
                 : "..."}
             </div>
             {(() => {
               if (!expectedRedeemOutput || expectedRedeemOutput === 0n || !parsedAmount || parsedAmount === 0n) return null;
               const collateralAmount = Number(formatEther(expectedRedeemOutput));
               const usdValue = amountToUSD(collateralAmount, collateralSymbol, {
                 ethPrice: ethPrice ?? 0,
                 wstETHPrice: wstETHPrice ?? 0,
                 fxSAVEPrice: fxSAVEPrice ?? 1.08,
               });
               return usdValue > 0 ? (
                 <div className="text-xs text-[#1E4775]/50 font-mono">
                   ${usdValue.toLocaleString(undefined, {
                     minimumFractionDigits: 2,
                     maximumFractionDigits: 2,
                   })}
                 </div>
               ) : null;
             })()}
           </div>
         </div>
         {expectedRedeemOutput && expectedRedeemOutput > 0n && amount && parseFloat(amount) > 0 && (
           <div className="text-xs text-[#1E4775]/50 italic text-right">
             ({parseFloat(amount).toFixed(6)} {leveragedTokenSymbol} ≈ {Number(formatEther(expectedRedeemOutput)).toFixed(6)} {collateralSymbol})
           </div>
         )}
         {redeemFeePercentage !== undefined && parsedAmount && parsedAmount > 0n && (
           <div className="pt-2 border-t border-[#1E4775]/20">
             <div className="flex justify-end items-center gap-2 text-xs text-right">
               <span
                 className={`font-bold font-mono ${
                   redeemFeePercentage > 2 ? "text-red-600" : "text-[#1E4775]"
                 }`}
               >
                 Redemption Fee: {redeemFeePercentage.toFixed(2)}%
                 {redeemFeePercentage > 2 && " ⚠️"}
               </span>
             </div>
           </div>
         )}
       </div>
     )}
   </div>
 </div>

 {/* Error - beneath transaction overview (match Genesis/Anchor) */}
 {error && (
 <div className="p-3 bg-red-50 border border-red-500/30 text-red-600 text-sm text-center flex items-center justify-center gap-2">
 <AlertOctagon className="w-4 h-4 flex-shrink-0" aria-hidden />
 {error}
 </div>
 )}

 {/* Processing Indicator - only show if progress modal is not open */}
 {isProcessing && !progress.isOpen && (
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
 <div className="flex gap-3 mt-4">
 {(step ==="error" || step ==="input") && (
 <button
 onClick={step ==="error" ? handleCancel : handleClose}
 className="flex-1 py-3 px-4 bg-white text-[#1E4775] border-2 border-[#1E4775]/30 font-semibold hover:bg-[#1E4775]/5 transition-colors"
 >
 Cancel
 </button>
 )}
 <button
 onClick={activeTab ==="mint" ? handleMint : handleRedeem}
 disabled={Boolean(
   step ==="error"
     ? false
     : !isConnected ||
       !amount ||
       parseFloat(amount) <= 0 ||
       (activeTab ==="mint" &&
         parsedAmount &&
         parsedAmount > currentBalance) ||
       (activeTab ==="redeem" &&
         parsedAmount &&
         parsedAmount > currentBalance)
 )}
 className="flex-1 py-3 px-4 bg-[#FF8A7A] text-white font-semibold hover:bg-[#FF6B5A] transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
 >
 {step ==="error" ? "Try Again" : activeTab ==="mint" ? "Mint" : "Redeem"}
 </button>
 </div>
 )}
 </div>
 )}
 </DepositModalShell>
 )}
 </>
 );
};
