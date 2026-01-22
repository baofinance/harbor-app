"use client";

import React, { useState, useEffect } from "react";
import { parseEther, formatEther, parseUnits, formatUnits } from "viem";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import {
 useAccount,
  useBalance,
 useContractRead,
 useContractReads,
 useWriteContract,
 usePublicClient,
 useSendTransaction,
} from "wagmi";
import { BaseError, ContractFunctionRevertedError } from "viem";
import { GENESIS_ABI, ERC20_ABI, contracts } from "../config/contracts";
import {
  ZAP_ABI,
  STETH_ABI,
  WSTETH_ABI,
  USDC_ZAP_ABI,
  GENESIS_STETH_ZAP_PERMIT_ABI,
  GENESIS_USDC_ZAP_PERMIT_ABI,
} from "@/abis";
import { useCollateralPrice } from "@/hooks/useCollateralPrice";
import {
 TransactionProgressModal,
 TransactionStep,
} from "./TransactionProgressModal";
import { formatTokenAmount, formatBalance, formatUSD } from "@/utils/formatters";
import { useCoinGeckoPrice } from "@/hooks/useCoinGeckoPrice";
import { useDefiLlamaSwap, getDefiLlamaSwapTx } from "@/hooks/useDefiLlamaSwap";
import { useUserTokens, getTokenAddress, getTokenInfo, useTokenDecimals } from "@/hooks/useUserTokens";
import { useAnyTokenDeposit } from "@/hooks/useAnyTokenDeposit";
import { TokenSelectorDropdown } from "@/components/TokenSelectorDropdown";
import { usePermitOrApproval } from "@/hooks/usePermitOrApproval";
import { InfoCallout } from "@/components/InfoCallout";
import { Info, RefreshCw } from "lucide-react";

interface GenesisDepositModalProps {
 isOpen: boolean;
 onClose: () => void;
 genesisAddress: string;
 collateralAddress: string;
 collateralSymbol: string;
 wrappedCollateralSymbol?: string;
  underlyingSymbol?: string; // e.g., "fxUSD" for fxSAVE markets, "stETH" for wstETH markets
 acceptedAssets: Array<{ symbol: string; name: string }>;
 marketAddresses?: {
 collateralToken?: string;
 wrappedCollateralToken?: string;
priceOracle?: string;
    genesisZap?: string; // Genesis zap contract address for this market
    peggedTokenZap?: string; // Pegged token zap contract address (future)
    leveragedTokenZap?: string; // Leveraged token zap contract address (future)
 };
 coinGeckoId?: string;
 onSuccess?: () => void;
 embedded?: boolean;
}

// formatTokenAmount is now imported from utils/formatters

type ModalStep ="input" |"approving" |"depositing" |"success" |"error";

export const GenesisDepositModal = ({
 isOpen,
 onClose,
 genesisAddress,
 collateralAddress,
 collateralSymbol,
 wrappedCollateralSymbol,
  underlyingSymbol,
 acceptedAssets,
 marketAddresses,
 coinGeckoId,
 onSuccess,
 embedded = false,
}: GenesisDepositModalProps) => {
 const { address } = useAccount();
 const wagmiPublicClient = usePublicClient();
  // Use wagmi public client
  const publicClient = wagmiPublicClient;
 const [amount, setAmount] = useState("");
 const [selectedAsset, setSelectedAsset] = useState<string>(collateralSymbol);
 const [customTokenAddress, setCustomTokenAddress] = useState<string>("");
 const [showCustomTokenInput, setShowCustomTokenInput] = useState(false);
 const [slippageTolerance, setSlippageTolerance] = useState<number>(0.5); // Default 0.5% slippage
 const [slippageInputValue, setSlippageInputValue] = useState<string>("0.5"); // String for input to allow typing "0"
 const [showSlippageInput, setShowSlippageInput] = useState(false);
const [permitEnabled, setPermitEnabled] = useState(true);
 const [step, setStep] = useState<ModalStep>("input");
 const [error, setError] = useState<string | null>(null);
 const [txHash, setTxHash] = useState<string | null>(null);
 const [progressModalOpen, setProgressModalOpen] = useState(false);
 const [progressSteps, setProgressSteps] = useState<TransactionStep[]>([]);
 const [currentStepIndex, setCurrentStepIndex] = useState(0);
 const [successfulDepositAmount, setSuccessfulDepositAmount] =
 useState<string>("");
 const progressStorageKey =
  address && genesisAddress
    ? `genesisDepositProgress:${address.toLowerCase()}:${genesisAddress.toLowerCase()}`
    : null;

 // Delay contract reads until modal is fully mounted to avoid fetch errors
 const [mounted, setMounted] = useState(false);
 
 React.useEffect(() => {
   if (isOpen) {
     // Small delay to ensure modal is fully mounted
     const timer = setTimeout(() => setMounted(true), 100);
     return () => clearTimeout(timer);
   } else {
     setMounted(false);
   }
 }, [isOpen]);

// Reset state when modal opens - assume user wants to start fresh
useEffect(() => {
  if (!isOpen) return;
  
  // Reset all state to start fresh
  setAmount("");
  setSelectedAsset(collateralSymbol);
  setCustomTokenAddress("");
  setShowCustomTokenInput(false);
  setSlippageTolerance(0.5);
  setSlippageInputValue("0.5");
  setShowSlippageInput(false);
  setStep("input");
  setError(null);
  setTxHash(null);
  setSuccessfulDepositAmount("");
  setProgressModalOpen(false);
  setProgressSteps([]);
  setCurrentStepIndex(0);
  
  // Clear any stored progress
  if (progressStorageKey && typeof window !== "undefined") {
    window.localStorage.removeItem(progressStorageKey);
  }
}, [isOpen, collateralSymbol, progressStorageKey]);

useEffect(() => {
  if (!progressStorageKey || typeof window === "undefined") return;
  const isProcessing = step === "approving" || step === "depositing";
  if (!isProcessing) {
    window.localStorage.removeItem(progressStorageKey);
    return;
  }
  const payload = {
    step,
    progressSteps,
    currentStepIndex,
    txHash,
    successfulDepositAmount,
  };
  window.localStorage.setItem(progressStorageKey, JSON.stringify(payload));
}, [
  progressStorageKey,
  step,
  progressSteps,
  currentStepIndex,
  txHash,
  successfulDepositAmount,
]);

// Fetch CoinGecko price (primary source)
const { price: coinGeckoPrice, isLoading: isCoinGeckoLoading } = useCoinGeckoPrice(
  coinGeckoId || "",
  60000 // Refresh every 60 seconds
);
// Fallback for wstETH markets if wrapped-steth price is missing
const shouldFetchStEthPrice = collateralSymbol.toLowerCase() === "wsteth";
const { price: stEthCoinGeckoPrice } = useCoinGeckoPrice(
  shouldFetchStEthPrice ? "lido-staked-ethereum-steth" : "",
  60000
);

// Get collateral price from oracle (fallback)
const oraclePriceData = useCollateralPrice(
  marketAddresses?.priceOracle as `0x${string}` | undefined,
  { enabled: isOpen && !!marketAddresses?.priceOracle }
);

// Priority order for underlying price: CoinGecko → fxUSD hardcoded $1 → Oracle
// CoinGecko is the most reliable source for real-time prices
// For fxSAVE markets: underlyingSymbol is "fxUSD", so check that
const underlyingPriceUSD = coinGeckoPrice 
  ? coinGeckoPrice 
  : (underlyingSymbol?.toLowerCase() === "fxusd" || collateralSymbol.toLowerCase() === "fxusd")
    ? 1.00 
    : oraclePriceData.priceUSD;

const wrappedRate = oraclePriceData.maxRate;
const maxUnderlyingPrice = coinGeckoPrice
  ? BigInt(Math.floor(coinGeckoPrice * 1e18))
  : (underlyingSymbol?.toLowerCase() === "fxusd" || collateralSymbol.toLowerCase() === "fxusd")
    ? 1000000000000000000n // 1.0 in 18 decimals
    : oraclePriceData.maxPrice;

// Get user's tokens early (before getAssetAddress uses it)
const { tokens: userTokens, isLoading: isLoadingUserTokens } = useUserTokens();

 // Map asset symbol to its token address
 const getAssetAddress = (assetSymbol: string): string | null => {
 const normalized = assetSymbol.toLowerCase();
 
 // Native ETH
 if (normalized === "eth") {
   return "0x0000000000000000000000000000000000000000";
 }
 
 // Custom token address (if user pasted one)
 if (normalized === "custom" && customTokenAddress) {
   return customTokenAddress;
 }
 
 // Check user tokens first
 const userToken = userTokens.find(t => t.symbol.toUpperCase() === assetSymbol.toUpperCase());
 if (userToken && userToken.address !== "ETH") {
   return userToken.address;
 }
 
 // Collateral token (fxUSD, wstETH, etc.)
 if (normalized === collateralSymbol.toLowerCase()) {
 return collateralAddress;
 }
 
// fxSAVE - wrapped collateral for fxUSD markets
if (normalized === "fxsave") {
   return marketAddresses?.wrappedCollateralToken || null;
 }

// stETH - underlying token for wstETH markets (from contracts.ts underlyingCollateralToken)
if (normalized === "steth") {
  return "0xae7ab96520de3a18e5e111b5eaab095312d7fe84"; // stETH mainnet address
}
 
 // USDC (standard mainnet address)
 if (normalized === "usdc") {
   return "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
 }
 
 // fxUSD - use collateralToken address
 if (normalized === "fxusd") {
   return marketAddresses?.collateralToken || collateralAddress;
 }
 
// wstETH - use wrappedCollateralToken (now correctly points to wstETH)
 if (normalized === "wsteth") {
  return marketAddresses?.wrappedCollateralToken || marketAddresses?.collateralToken || collateralAddress;
 }
 
 return null;
 };

 const selectedAssetAddress = getAssetAddress(selectedAsset);
 const isNativeETH = selectedAsset.toLowerCase() ==="eth";
const isStETH = selectedAsset.toLowerCase() ==="steth";
const isUSDC = selectedAsset.toLowerCase() ==="usdc";
const isFXUSD = selectedAsset.toLowerCase() ==="fxusd";
const isFXSAVE = selectedAsset.toLowerCase() ==="fxsave";

// Get genesis zap address from marketAddresses prop
// Note: Legacy contracts object doesn't have genesisZap, use market config instead
const genesisZapAddress = marketAddresses?.genesisZap as `0x${string}` | undefined;

// Determine which zap contract type to use based on collateral and selected asset
// ETH/STETH markets use GenesisETHZap_v3, USDC/FXUSD markets use GenesisUSDCZap_v2
const isETHStETHMarket = collateralSymbol.toLowerCase() === "wsteth";
const useETHZap = isETHStETHMarket && (isNativeETH || isStETH);

// Determine if selected asset needs to be swapped
// fxSAVE markets: Directly accept USDC, fxUSD, fxSAVE → swap everything else to USDC
// wstETH markets: Directly accept ETH, stETH, wstETH → swap everything else to ETH
const isFxSAVEMarket = !isETHStETHMarket; // fxSAVE backed markets (ETH/fxUSD, BTC/fxUSD)
const isDirectlyAccepted = 
  (isFxSAVEMarket && (isUSDC || isFXUSD || isFXSAVE)) || // fxSAVE markets: USDC, fxUSD, fxSAVE accepted
  (isETHStETHMarket && (isNativeETH || isStETH || selectedAsset.toLowerCase() === "wsteth")); // wstETH markets: ETH, stETH, wstETH accepted

// Check if we need to swap: token is not directly accepted AND has a valid address
// For ETH, check isNativeETH; for other tokens, check selectedAssetAddress exists
const hasValidTokenAddress = isNativeETH || (selectedAssetAddress && selectedAssetAddress !== "0x0000000000000000000000000000000000000000");
const needsSwap = !isDirectlyAccepted && hasValidTokenAddress;

// Determine swap target token
// fxSAVE markets: swap to USDC, wstETH markets: swap to ETH
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as `0x${string}`;
const ETH_ADDRESS = "ETH" as const;
const swapTargetToken = isFxSAVEMarket ? USDC_ADDRESS : ETH_ADDRESS;
// ParaSwap TokenTransferProxy address (needs approval for ERC20 swaps)
const PARASWAP_TOKEN_TRANSFER_PROXY = "0x216b4b4ba9f3e719726886d34a177484278bfcae" as `0x${string}`;

// Now that needsSwap is defined, determine if we should use USDC zap or ETH zap
// USDC zap: direct USDC/FXUSD deposits OR swaps in fxSAVE markets
// ETH zap: direct ETH/stETH deposits OR swaps in wstETH markets  
const useUSDCZap = !isETHStETHMarket && (isUSDC || isFXUSD || needsSwap);
const needsETHZapAfterSwap = isETHStETHMarket && needsSwap;

// Determine if custom token is selected (needed for hooks below)
const isCustomToken = selectedAsset === "custom" && customTokenAddress && 
  customTokenAddress.startsWith("0x") && customTokenAddress.length === 42;

// Get token decimals for swap quote
const tokenAddressForDecimals = isNativeETH 
  ? undefined 
  : (isCustomToken ? (customTokenAddress as `0x${string}` | undefined) : (selectedAssetAddress as `0x${string}` | undefined));
const { decimals: tokenDecimals, isLoading: isLoadingTokenDecimals } = useTokenDecimals(tokenAddressForDecimals);

// Determine selected token decimals (handle special cases)
// For USDC and ETH, we know the decimals, so no loading needed
// For other tokens, wait for decimals to load to avoid incorrect calculations
const selectedTokenDecimals = isUSDC ? 6 : (isNativeETH ? 18 : tokenDecimals);
const hasValidDecimals = isUSDC || isNativeETH || !isLoadingTokenDecimals;

// Fetch token metadata (symbol, name) for custom tokens
const { data: customTokenSymbol } = useContractRead({
  address: isCustomToken ? (customTokenAddress as `0x${string}`) : undefined,
  abi: ERC20_ABI,
  functionName: "symbol",
  query: {
    enabled: isCustomToken && !!customTokenAddress,
    retry: 1,
    allowFailure: true,
  },
});

const { data: customTokenName } = useContractRead({
  address: isCustomToken ? (customTokenAddress as `0x${string}`) : undefined,
  abi: ERC20_ABI,
  functionName: "name",
  query: {
    enabled: isCustomToken && !!customTokenAddress,
    retry: 1,
    allowFailure: true,
  },
});

// Get swap quote if token needs swapping
const fromTokenForSwap = isNativeETH ? "ETH" : (selectedAssetAddress as `0x${string}`);
const toTokenForSwap = swapTargetToken;
const toTokenDecimals = swapTargetToken === "ETH" ? 18 : 6; // ETH=18, USDC=6
const { data: swapQuote, isLoading: isLoadingSwapQuote, error: swapQuoteError } = useDefiLlamaSwap(
  fromTokenForSwap,
  toTokenForSwap as any, // Type assertion needed due to const type
  amount,
  needsSwap && !!amount && parseFloat(amount) > 0 && !!fromTokenForSwap,
  tokenDecimals,
  toTokenDecimals
);

// Merge accepted assets with user tokens (avoid duplicates)
const allAvailableAssets = React.useMemo(() => {
  const assetMap = new Map<string, { symbol: string; name: string; isUserToken?: boolean }>();
  
  // Add accepted assets first
  acceptedAssets.forEach(asset => {
    assetMap.set(asset.symbol.toUpperCase(), { ...asset, isUserToken: false });
  });
  
  // Add user tokens (only if they have balance > 0)
  userTokens.forEach(token => {
    const symbol = token.symbol.toUpperCase();
    if (!assetMap.has(symbol) && token.balance > 0n) {
      assetMap.set(symbol, {
        symbol: token.symbol,
        name: token.name,
        isUserToken: true,
      });
    }
  });
  
  return Array.from(assetMap.values()).sort((a, b) => {
    // Accepted assets first, then user tokens
    if (a.isUserToken !== b.isUserToken) {
      return a.isUserToken ? 1 : -1;
    }
    return a.symbol.localeCompare(b.symbol);
  });
}, [acceptedAssets, userTokens]);

// For stETH markets: stETH is the underlying rebasing token, wstETH is the wrapped version
const stETHAddress = isETHStETHMarket 
  ? "0xae7ab96520de3a18e5e111b5eaab095312d7fe84" as `0x${string}` // stETH mainnet address
  : undefined;
const wstETHAddress = isETHStETHMarket
  ? (marketAddresses?.wrappedCollateralToken || marketAddresses?.collateralToken) as `0x${string}` | undefined
  : undefined; // wstETH (0x7f39...)

// Check if selected asset is a wrapped token (fxSAVE, wstETH)
const isWrappedToken = selectedAsset.toLowerCase() === "fxsave" || 
                       selectedAsset.toLowerCase() === "wsteth" ||
                       (wrappedCollateralSymbol && selectedAsset.toLowerCase() === wrappedCollateralSymbol.toLowerCase());

// Calculate the correct price for the selected asset
// For wrapped tokens: multiply underlying price by wrapped rate
// For other tokens: use underlying price directly
const selectedAssetPriceUSD = isWrappedToken && wrappedRate && maxUnderlyingPrice
  ? (Number(maxUnderlyingPrice) / 1e18) * (Number(wrappedRate) / 1e18)
  : underlyingPriceUSD;

// Deposits are stored in wrapped collateral tokens (fxSAVE, wstETH), not base collateral (fxUSD, stETH)
// So we need to use the wrapped token price for displaying current deposits
// Calculate wrapped token price: underlying price * wrapped rate
// BUT: If CoinGecko ID is for the wrapped token itself (e.g., "wrapped-steth" for wstETH),
// then CoinGecko already returns the wrapped token price, so don't multiply by wrapped rate
const coinGeckoIsWrappedToken = coinGeckoId && (
  (coinGeckoId.toLowerCase() === "wrapped-steth" && collateralSymbol.toLowerCase() === "wsteth") ||
  ((coinGeckoId.toLowerCase() === "fxsave" || coinGeckoId.toLowerCase() === "fx-usd-saving") && collateralSymbol.toLowerCase() === "fxsave")
);

const isWstETH = collateralSymbol.toLowerCase() === "wsteth";
// For wstETH: CoinGecko returns wstETH price directly (~$3,607), so use it as-is
// For fxSAVE: CoinGecko returns fxUSD price ($1.00), so multiply by wrapped rate to get fxSAVE price
// Only use oracle calculation if CoinGecko is not available
// Priority: CoinGecko (if wrapped token) > CoinGecko (if underlying) > Oracle (with wrapped rate) > Oracle (underlying only)
const wrappedTokenPriceUSD = (() => {
  // If CoinGecko returns the wrapped token price directly (e.g., "wrapped-steth" for wstETH)
  if (coinGeckoIsWrappedToken && coinGeckoPrice != null) {
    return coinGeckoPrice; // Use CoinGecko price directly, no wrapped rate multiplication
  }

  // Fallback for wstETH: use stETH price * wrapped rate if wrapped-steth is missing
  if (
    isWstETH &&
    stEthCoinGeckoPrice != null &&
    wrappedRate &&
    wrappedRate > 0n
  ) {
    return stEthCoinGeckoPrice * (Number(wrappedRate) / 1e18);
  }
  
  // If CoinGecko returns underlying price (e.g., "fxusd" for fxSAVE)
  // For fxSAVE markets: CoinGecko returns fxUSD ($1.00), multiply by wrapped rate to get fxSAVE price
  if (coinGeckoPrice != null && !coinGeckoIsWrappedToken && wrappedRate) {
    return coinGeckoPrice * (Number(wrappedRate) / 1e18);
  }
  
  // If CoinGecko returns underlying price but no wrapped rate available
  if (coinGeckoPrice != null && !coinGeckoIsWrappedToken) {
    return coinGeckoPrice; // Use CoinGecko price as-is
  }
  
  // Fallback to oracle: underlying price * wrapped rate
  if (wrappedRate && underlyingPriceUSD > 0) {
    return underlyingPriceUSD * (Number(wrappedRate) / 1e18);
  }
  
  // Final fallback: underlying price only
  return underlyingPriceUSD;
})();

const collateralPriceUSD = wrappedTokenPriceUSD;

// Validate selected asset address
const isValidSelectedAssetAddress = 
  selectedAssetAddress && 
  selectedAssetAddress !== "0x0000000000000000000000000000000000000000" &&
  selectedAssetAddress.startsWith("0x") &&
  selectedAssetAddress.length === 42;

// Get ETH balance for native ETH deposits
const { data: ethBalance, isLoading: isEthBalanceLoading, isError: isEthBalanceError } = useBalance({
  address: address,
  query: {
    enabled: !!address && isOpen && mounted && isNativeETH,
  },
});

// Fetch balances for all accepted assets individually
// Create contracts array with asset symbol tracking
const assetBalanceContracts = acceptedAssets
  .filter(asset => {
    const assetAddress = getAssetAddress(asset.symbol);
    return assetAddress && 
           assetAddress !== "0x0000000000000000000000000000000000000000" &&
           assetAddress.startsWith("0x") &&
           assetAddress.length === 42;
  })
  .map(asset => {
    const assetAddress = getAssetAddress(asset.symbol);
    if (!assetAddress || assetAddress === "0x0000000000000000000000000000000000000000") {
      return null;
    }
    return {
      symbol: asset.symbol,
      address: assetAddress as `0x${string}`,
 abi: ERC20_ABI,
      functionName: "balanceOf" as const,
 args: address ? [address] : undefined,
    };
  })
  .filter((c): c is NonNullable<typeof c> => c !== null);

// Only fetch balances if we have valid contracts and the modal is open and mounted
const shouldFetchBalances = !!address && isOpen && mounted && assetBalanceContracts.length > 0;

// Create the contracts array, ensuring it's never empty when the hook is enabled
const balanceContractsForHook = shouldFetchBalances 
  ? assetBalanceContracts.map(c => ({
      address: c.address,
      abi: c.abi,
      functionName: c.functionName,
      args: c.args,
    }))
  : []; // Empty array when disabled

const { data: allAssetBalances, error: balancesError } = useContractReads({
  contracts: balanceContractsForHook,
  query: {
    enabled: shouldFetchBalances && balanceContractsForHook.length > 0,
    refetchInterval: isOpen && shouldFetchBalances ? 15000 : false, // Only poll when modal is open, reduced from 5s to 15s
    retry: 1,
    retryDelay: 1000,
    allowFailure: true, // Don't fail all reads if one fails
  },
 });

// Create a map of asset symbol to balance
const assetBalanceMap = new Map<string, bigint>();
acceptedAssets.forEach((asset) => {
  if (asset.symbol.toLowerCase() === "eth") {
    // Native ETH balance
    assetBalanceMap.set(asset.symbol, ethBalance?.value || 0n);
  } else {
    const contractIndex = assetBalanceContracts.findIndex(
      c => c.symbol.toLowerCase() === asset.symbol.toLowerCase()
    );
    if (contractIndex >= 0 && allAssetBalances?.[contractIndex]?.result) {
      assetBalanceMap.set(asset.symbol, allAssetBalances[contractIndex].result as bigint);
    } else {
      assetBalanceMap.set(asset.symbol, 0n);
    }
  }
});

// Also add user token balances to the map
userTokens.forEach((token) => {
  if (!assetBalanceMap.has(token.symbol)) {
    assetBalanceMap.set(token.symbol, token.balance);
  }
});

// Get balance for selected asset
// For user tokens not in acceptedAssets, fetch balance separately
const selectedUserToken = userTokens.find(t => t.symbol.toUpperCase() === selectedAsset.toUpperCase());
const isUserTokenNotInAccepted = selectedUserToken && 
  !acceptedAssets.some(a => a.symbol.toUpperCase() === selectedAsset.toUpperCase());

// Fetch balance for custom token or user token not in accepted assets
const { data: customTokenBalance } = useContractRead({
  address: (isCustomToken ? customTokenAddress : (isUserTokenNotInAccepted ? selectedUserToken.address : undefined)) as `0x${string}` | undefined,
  abi: ERC20_ABI,
  functionName: "balanceOf",
  args: address ? [address] : undefined,
  query: {
    enabled: (isCustomToken || isUserTokenNotInAccepted) && !!address && isOpen && mounted && 
            ((isCustomToken && customTokenAddress) || (isUserTokenNotInAccepted && selectedUserToken?.address !== "ETH")),
    refetchInterval: isOpen ? 15000 : false,
    retry: 1,
    allowFailure: true,
  },
 });

// Get balance for selected asset (including custom tokens and user tokens)
const selectedAssetBalance = isCustomToken || isUserTokenNotInAccepted
  ? (typeof customTokenBalance === 'bigint' ? customTokenBalance : (selectedUserToken?.balance || 0n))
  : (assetBalanceMap.get(selectedAsset) || 0n);

// For assets that use genesis zap contracts (ETH, stETH, USDC, FXUSD), check allowance for genesis zap contract
// For other tokens (wstETH, fxSAVE), check allowance for genesis
const allowanceTarget = (useETHZap || useUSDCZap) && genesisZapAddress ? genesisZapAddress : genesisAddress;
 const { data: allowanceData, refetch: refetchAllowance, error: allowanceError } = useContractRead({
 address: isValidSelectedAssetAddress ? (selectedAssetAddress as `0x${string}`) : undefined,
 abi: ERC20_ABI,
 functionName:"allowance",
    args: address && isValidSelectedAssetAddress ? [address, allowanceTarget as `0x${string}`] : undefined,
 query: {
 enabled:
 !!address &&
 isOpen &&
     mounted &&
 !isNativeETH &&
     isValidSelectedAssetAddress,
   refetchInterval: isOpen ? 15000 : false, // Only poll when modal is open, reduced from 5s to 15s
   retry: 1,
   allowFailure: true,
 },
 });

 // Check if genesis has ended
 const isValidGenesisAddress = 
   genesisAddress && 
   typeof genesisAddress === 'string' &&
   genesisAddress.startsWith("0x") && 
   genesisAddress.length === 42;

 const { data: genesisEnded, error: genesisEndedError } = useContractRead({
 address: isValidGenesisAddress ? (genesisAddress as `0x${string}`) : undefined,
 abi: GENESIS_ABI,
 functionName:"genesisIsEnded",
 query: {
   enabled: isValidGenesisAddress && isOpen && mounted,
   retry: 1,
   allowFailure: true,
 },
 });

 // Get current user deposit in Genesis
 const { data: currentDeposit, error: currentDepositError } = useContractRead({
 address: isValidGenesisAddress ? (genesisAddress as `0x${string}`) : undefined,
 abi: GENESIS_ABI,
 functionName:"balanceOf",
 args: address ? [address] : undefined,
 query: {
   enabled: !!address && isValidGenesisAddress && isOpen && mounted,
   refetchInterval: isOpen ? 15000 : false, // Only poll when modal is open, reduced from 5s to 15s
   retry: 1,
   allowFailure: true,
 },
 });

 // Contract write hooks
 const { writeContractAsync, isPending: isWritePending } = useWriteContract();
 const { sendTransactionAsync } = useSendTransaction();
 const { handlePermitOrApproval } = usePermitOrApproval();

  // Use the balance from the asset balance map or custom token balance
  const balance = selectedAssetBalance;

const allowance = isNativeETH ? 0n : (typeof allowanceData === 'bigint' ? allowanceData : 0n);
// Parse amount with correct decimals (selectedTokenDecimals is defined above)
// Only parse if we have valid decimals to avoid incorrect calculations during loading
const amountBigInt = amount && hasValidDecimals
  ? parseUnits(amount, selectedTokenDecimals)
  : 0n;
 const needsApproval =
 !isNativeETH && amountBigInt > 0 && amountBigInt > allowance;
const canAttemptPermit =
  !needsSwap &&
  !isNativeETH &&
  !!genesisZapAddress &&
  ((isStETH && useETHZap) || ((isUSDC || isFXUSD) && useUSDCZap));
const shouldUsePermit = permitEnabled && canAttemptPermit;
const showPermitToggle = canAttemptPermit;
const userCurrentDeposit: bigint = typeof currentDeposit === 'bigint' ? currentDeposit : 0n;

// Calculate expected wstETH output for ETH deposits (for preview)
// Contract flow: ETH → stETH (via submit, 1:1) → wstETH (via wrap)
// For preview: ETH amount = stETH amount (1:1), then convert to wstETH
const { data: expectedWstETHFromETH } = useContractRead({
  address: wstETHAddress,
  abi: WSTETH_ABI,
  functionName: "getWstETHByStETH",
  args: amountBigInt > 0n && isNativeETH ? [amountBigInt] : undefined, // stETH.submit() gives 1:1 ETH→stETH
  query: {
    enabled: !!address && isOpen && mounted && isNativeETH && amountBigInt > 0n,
  },
});

// Calculate expected wstETH output for stETH deposits (for preview)
const { data: expectedWstETHFromStETH } = useContractRead({
  address: wstETHAddress,
  abi: WSTETH_ABI,
  functionName: "getWstETHByStETH",
  args: amountBigInt > 0n && isStETH ? [amountBigInt] : undefined,
  query: {
    enabled: !!address && isOpen && mounted && isStETH && amountBigInt > 0n && !!wstETHAddress,
  },
});

// Calculate expected fxSAVE output for USDC deposits (for preview)
// Note: previewZapUsdc doesn't exist on contract, so we calculate using wrappedRate
// USDC is in 6 decimals, fxSAVE is in 18 decimals
// First scale USDC to 18 decimals, then divide by wrappedRate
const expectedFxSaveFromUSDC = (() => {
  if (!isUSDC || amountBigInt === 0n || !wrappedRate || wrappedRate === 0n) {
    return 0n;
  }
  // Scale USDC from 6 to 18 decimals, then divide by wrappedRate
  const usdcIn18Decimals = amountBigInt * 10n ** 12n;
  return (usdcIn18Decimals * 1000000000000000000n) / wrappedRate;
})();

// Calculate expected fxSAVE output for FXUSD deposits (for preview)
// fxSAVE = FXUSD / wrappedRate (when both are in 18 decimals)
const expectedFxSaveFromFXUSD = (() => {
  if (!isFXUSD || amountBigInt === 0n || !wrappedRate || wrappedRate === 0n) {
    return 0n;
  }
  // Both FXUSD and wrappedRate are in 18 decimals, so: (amount * 1e18) / wrappedRate
  return (amountBigInt * 1000000000000000000n) / wrappedRate;
})();

// For tokens that need swapping to USDC (fxSAVE markets): calculate expected fxSAVE from USDC
const usdcFromSwap = needsSwap && isFxSAVEMarket && swapQuote ? swapQuote.toAmount : 0n;

const expectedFxSaveFromSwap = (() => {
  if (!needsSwap || !isFxSAVEMarket || usdcFromSwap === 0n) {
    return 0n;
  }
  
  // USDC is in 6 decimals, fxSAVE is in 18 decimals
  // Scale USDC to 18 decimals first
  const usdcIn18Decimals = usdcFromSwap * 10n ** 12n;
  
  // If we have wrapped rate, use it: fxSAVE = USDC / wrappedRate
  // When both numbers are in 18 decimals, to divide: (a * 1e18) / b
  if (wrappedRate && wrappedRate > 0n) {
    const result = (usdcIn18Decimals * 1000000000000000000n) / wrappedRate;
    return result;
  }
  
  // Fallback: Estimate 1 USDC ≈ 0.935 fxSAVE (if wrappedRate = 1.07)
  // fxSAVE = USDC * 0.935
  const fallbackResult = (usdcIn18Decimals * 935n) / 1000n;
  return fallbackResult;
})();

// For tokens that need swapping to ETH (wstETH markets): calculate expected wstETH from ETH swap output
const ethFromSwap = needsSwap && isETHStETHMarket && swapQuote ? swapQuote.toAmount : 0n;

// Query wstETH contract to get expected output from swapped ETH
const { data: expectedWstETHFromSwap } = useContractRead({
  address: wstETHAddress,
  abi: WSTETH_ABI,
  functionName: "getWstETHByStETH",
  args: ethFromSwap > 0n ? [ethFromSwap] : undefined, // ETH → stETH is 1:1, so use ethFromSwap as stETH amount
  query: {
    enabled: !!address && isOpen && mounted && needsSwap && isETHStETHMarket && ethFromSwap > 0n && !!wstETHAddress,
  },
});

// Helper to safely extract bigint from hook result
const toBigInt = (value: unknown): bigint => {
  if (typeof value === 'bigint') return value;
  return 0n;
};

// Calculate the actual collateral amount that will be deposited
// For ETH/stETH markets: convert to wstETH
// For USDC/FXUSD markets: convert to fxSAVE
// For tokens that need swapping: calculate based on swap output
const actualCollateralDeposit: bigint = isNativeETH && isETHStETHMarket && !needsSwap
  ? toBigInt(expectedWstETHFromETH)
  : isStETH && isETHStETHMarket
  ? toBigInt(expectedWstETHFromStETH)
  : isUSDC && useUSDCZap && !needsSwap
  ? expectedFxSaveFromUSDC // Already calculated as bigint
  : isFXUSD && useUSDCZap
  ? expectedFxSaveFromFXUSD // Already calculated as bigint
  : needsSwap && isFxSAVEMarket
  ? expectedFxSaveFromSwap // For swapped tokens in fxSAVE markets, use calculated fxSAVE
  : needsSwap && isETHStETHMarket
  ? toBigInt(expectedWstETHFromSwap) // For swapped tokens in wstETH markets, use wstETH from contract
  : amountBigInt; // For wstETH, fxSAVE, or direct deposits, use the amount directly

// Calculate new total deposit using actual collateral amount
const newTotalDepositActual: bigint = userCurrentDeposit + actualCollateralDeposit;


 const isNonCollateralAsset =
 selectedAsset.toLowerCase() !== collateralSymbol.toLowerCase();

 const handleClose = () => {
 const isProcessing = step === "approving" || step === "depositing";
 if (isProcessing) {
   setProgressModalOpen(false);
   onClose();
   return;
 }
 setAmount("");
 setSelectedAsset(collateralSymbol);
 setCustomTokenAddress("");
 setShowCustomTokenInput(false);
 setSlippageTolerance(0.5);
 setSlippageInputValue("0.5");
 setShowSlippageInput(false);
 setPermitEnabled(true);
 setStep("input");
 setError(null);
 setTxHash(null);
 setSuccessfulDepositAmount("");
 setProgressModalOpen(false);
 setProgressSteps([]);
 setCurrentStepIndex(0);
 onClose();
 };

 const handleShareOnX = () => {
 const shareMessage = `Just secured my @0xharborfi airdrop with their maiden voyage. ⚓️

Predeposits are still open for a limited time - don't miss out!

https://www.harborfinance.io/`;
 const encodedMessage = encodeURIComponent(shareMessage);
 const xUrl = `https://x.com/intent/tweet?text=${encodedMessage}`;
 window.open(xUrl,"_blank","noopener,noreferrer");
 };

 const handleMaxClick = () => {
 if (balance) {
   // Use token decimals dynamically
   setAmount(formatUnits(balance, selectedTokenDecimals));
 }
 };

 const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const value = e.target.value;
 if (value ==="" || /^\d*\.?\d*$/.test(value)) {
 // Cap at balance if value exceeds it
 if (value && balance) {
 try {
       // Use token decimals dynamically
       const parsed = parseUnits(value, selectedTokenDecimals);
 if (parsed > balance) {
         setAmount(formatUnits(balance, selectedTokenDecimals));
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

 const validateAmount = (): boolean => {
 if (!amount || parseFloat(amount) <= 0) {
 setError("Please enter a valid amount");
 return false;
 }
 // Compare amounts with correct decimals - both should be in same decimal format
 // amountBigInt is already correctly parsed (6 decimals for USDC, 18 for others)
 // selectedAssetBalance is the raw balance from contract (6 decimals for USDC, 18 for others)
 // Both are already in the same decimal format, so we can compare directly
 if (amountBigInt > selectedAssetBalance) {
 setError("Insufficient balance");
 return false;
 }
 if (genesisEnded) {
 setError("Genesis period has ended");
 return false;
 }
 return true;
 };

const buildProgressSteps = (params: {
  includeApproval: boolean;
  includeSwap: boolean;
  needsSwapApproval: boolean;
}) => {
  const steps: TransactionStep[] = [];

  if (params.needsSwapApproval) {
    steps.push({
      id: "approveSwap",
      label: `Approve ${selectedAsset} for swap`,
      status: "pending",
    });
  }
  if (params.includeSwap) {
    const swapTarget = isFxSAVEMarket ? "USDC" : "ETH";
    steps.push({
      id: "swap",
      label: `Swap ${selectedAsset} → ${swapTarget}`,
      status: "pending",
    });
  }
  if (params.includeApproval) {
    steps.push({
      id: "approve",
      label: `Approve ${selectedAsset}`,
      status: "pending",
    });
  }
  if (params.includeSwap && isFxSAVEMarket) {
    steps.push({
      id: "approveUSDC",
      label: `Approve USDC for deposit`,
      status: "pending",
    });
  }
  steps.push({
    id: "deposit",
    label: "Deposit to Genesis",
    status: "pending",
  });

  return steps;
};

const ensureFallbackApprovalSteps = (shouldIncludeApproval: boolean) => {
  if (!shouldIncludeApproval) {
    const fallbackSteps: TransactionStep[] = [
      {
        id: "approve",
        label: `Approve ${selectedAsset}`,
        status: "pending",
      },
      {
        id: "deposit",
        label: "Deposit to Genesis",
        status: "pending",
      },
    ];
    setProgressSteps(fallbackSteps);
    setCurrentStepIndex(0);
  }
};

const runApprovalStep = async (params: {
  tokenAddress: `0x${string}`;
  spender: `0x${string}`;
  amount: bigint;
  stepId?: string;
}) => {
  const stepId = params.stepId ?? "approve";

  setStep("approving");
  setProgressSteps((prev) =>
    prev.map((s) =>
      s.id === stepId ? { ...s, status: "in_progress" } : s
    )
  );
  setError(null);
  setTxHash(null);

  const approveHash = await writeContractAsync({
    address: params.tokenAddress,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [params.spender, params.amount],
  });
  setTxHash(approveHash);
  await publicClient?.waitForTransactionReceipt({ hash: approveHash });
  await refetchAllowance();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await refetchAllowance();

  setProgressSteps((prev) =>
    prev.map((s) =>
      s.id === stepId
        ? { ...s, status: "completed", txHash: approveHash }
        : s
    )
  );

  return approveHash;
};

 const handleDeposit = async () => {
 if (!validateAmount()) return;
 
 // Prevent double-clicks and concurrent transactions
 if (step === "approving" || step === "depositing" || isWritePending) {
   setError("Transaction already in progress. Please wait.");
   return;
 }
 
 try {
// Capture the current deposit balance BEFORE any transactions
// This prevents race conditions with the refetching hook
const preDepositBalance = userCurrentDeposit;

// Prefer permit for direct USDC/FXUSD/stETH deposits, fallback to approval if needed
let permitResult: { usePermit: boolean; permitSig?: { v: number; r: `0x${string}`; s: `0x${string}` }; deadline?: bigint } | null = null;
let usePermit = false;
let approvalCompleted = false;
if (shouldUsePermit && isValidSelectedAssetAddress && amountBigInt > 0n) {
  try {
    permitResult = await handlePermitOrApproval(
      selectedAssetAddress as `0x${string}`,
      genesisZapAddress as `0x${string}`,
      amountBigInt
    );
    usePermit = !!permitResult?.usePermit && !!permitResult?.permitSig && !!permitResult?.deadline;
  } catch (permitError) {
    console.warn("Permit precheck failed, falling back to approval:", permitError);
    usePermit = false;
  }
}

 // Initialize progress modal steps
 const includeApproval = !isNativeETH && needsApproval && !needsSwap && !usePermit; // For direct deposits only
 const includeSwap = needsSwap && swapQuote;
 const needsSwapApproval = includeSwap && !isNativeETH; // Approve source token for swap (unless it's ETH)
 const steps = buildProgressSteps({
   includeApproval,
   includeSwap: !!includeSwap,
   needsSwapApproval,
 });
 setProgressSteps(steps);
 setCurrentStepIndex(0);
 setProgressModalOpen(true);

 const tryPermitZap = async (params: {
   type: "steth" | "usdc" | "fxusd";
   amount: bigint;
   minOut: bigint;
 }) => {
   if (!usePermit || !permitResult?.permitSig || !permitResult.deadline) {
     return null;
   }

   try {
     if (params.type === "steth") {
       return await writeContractAsync({
         address: genesisZapAddress as `0x${string}`,
         abi: [...ZAP_ABI, ...GENESIS_STETH_ZAP_PERMIT_ABI] as const,
         functionName: "zapStEthWithPermit",
         args: [
           params.amount,
           address as `0x${string}`,
           params.minOut,
           permitResult.deadline,
           permitResult.permitSig.v,
           permitResult.permitSig.r,
           permitResult.permitSig.s,
         ],
       });
     }

     return await writeContractAsync({
       address: genesisZapAddress as `0x${string}`,
       abi: [...USDC_ZAP_ABI, ...GENESIS_USDC_ZAP_PERMIT_ABI] as const,
       functionName:
         params.type === "fxusd"
           ? "zapFxUsdToGenesisWithPermit"
           : "zapUsdcToGenesisWithPermit",
       args: [
         params.amount,
         params.minOut,
         address as `0x${string}`,
         permitResult.deadline,
         permitResult.permitSig.v,
         permitResult.permitSig.r,
         permitResult.permitSig.s,
       ],
     });
   } catch (permitError) {
     console.error("Permit zap failed, falling back to approval:", permitError);
     usePermit = false;
     return null;
   }
 };

 const executeSwapFlow = async () => {
   if (!includeSwap || !swapQuote || !address) {
     return true;
   }

   try {
     const targetTokenSymbol = isFxSAVEMarket ? "USDC" : "ETH";
     const targetTokenDecimals = isFxSAVEMarket ? 6 : 18;

     // Step 1: For ERC20 tokens, approve ParaSwap TokenTransferProxy BEFORE getting swap tx
     // (ParaSwap API checks allowance when building transaction and will fail if insufficient)
     if (!isNativeETH) {
       setStep("approving");
       setProgressSteps((prev) =>
         prev.map((s) =>
           s.id === "approveSwap" ? { ...s, status: "in_progress" } : s
         )
       );
      setCurrentStepIndex(steps.findIndex((s) => s.id === "approveSwap"));
      setError(null);
      setTxHash(null);
      
      // Check current allowance
       const currentAllowance = await publicClient.readContract({
         address: selectedAssetAddress as `0x${string}`,
         abi: ERC20_ABI,
         functionName: "allowance",
         args: [address, PARASWAP_TOKEN_TRANSFER_PROXY],
       }) as bigint;
       
       // Approve if needed
       if (currentAllowance < amountBigInt) {
         const approveHash = await writeContractAsync({
           address: selectedAssetAddress as `0x${string}`,
           abi: ERC20_ABI,
           functionName: "approve",
           args: [PARASWAP_TOKEN_TRANSFER_PROXY, amountBigInt],
         });
         
         setTxHash(approveHash);
         
         await publicClient?.waitForTransactionReceipt({ hash: approveHash });
         
         // Wait for state update and ensure nonce is updated
         await publicClient?.getTransactionCount({ address });
         await new Promise((resolve) => setTimeout(resolve, 2000));
         
         setProgressSteps((prev) =>
           prev.map((s) =>
             s.id === "approveSwap" ? { ...s, status: "completed", txHash: approveHash } : s
           )
         );
       } else {
         setProgressSteps((prev) =>
           prev.map((s) =>
             s.id === "approveSwap" ? { ...s, status: "completed" } : s
           )
         );
       }
     }
     
     // Step 2: Get balance BEFORE swap to calculate the difference after
     let balanceBefore: bigint;
     if (isFxSAVEMarket) {
       // For fxSAVE markets: track USDC balance
       balanceBefore = await publicClient.readContract({
         address: USDC_ADDRESS,
         abi: ERC20_ABI,
         functionName: "balanceOf",
         args: [address],
       }) as bigint;
     } else {
       // For wstETH markets: track ETH balance
       balanceBefore = (await publicClient.getBalance({ address })) as bigint;
     }
     
     // Step 3: Get fresh swap transaction data from ParaSwap RIGHT BEFORE sending
     // This ensures the transaction data is current and nonce will be handled correctly
     // Important: Get this AFTER approval is confirmed to ensure nonce is updated
     const swapTx = await getDefiLlamaSwapTx(
       fromTokenForSwap,
       swapTargetToken as any,
       amountBigInt,
       address,
       slippageTolerance, // User's selected slippage tolerance
       selectedTokenDecimals,
       targetTokenDecimals
     );
     
     // Verify nonce hasn't changed (shouldn't, but good to check)
     await publicClient?.getTransactionCount({ address });
     
     // Step 4: Execute the swap
     setStep("depositing"); // Use depositing step for swap
     setProgressSteps((prev) =>
       prev.map((s) =>
         s.id === "swap" ? { ...s, status: "in_progress" } : s
       )
     );
     setCurrentStepIndex(steps.findIndex((s) => s.id === "swap"));
     setError(null);
     setTxHash(null);
     
     // Execute swap using sendTransaction (ParaSwap gives raw tx data, not contract call)
     // Let wagmi handle nonce automatically - don't pass gas explicitly to avoid nonce conflicts
     // Wagmi will automatically get the current nonce and estimate gas
     // Add a small delay before sending to ensure wallet/provider has updated nonce
     await new Promise((resolve) => setTimeout(resolve, 500));
     
     const swapHash = await sendTransactionAsync({
       to: swapTx.to,
       data: swapTx.data,
       value: swapTx.value, // Use value from ParaSwap
       account: address, // Explicitly pass account to ensure wagmi uses correct nonce
       // Don't pass gas explicitly - let wagmi estimate it to ensure proper nonce handling
       // This prevents nonce conflicts when multiple transactions are sent in sequence
     });
     
     setTxHash(swapHash);
     
     // Wait for transaction confirmation
     await publicClient?.waitForTransactionReceipt({ hash: swapHash });
     
     // Wait for balance to update (3 seconds should be enough)
     await new Promise((resolve) => setTimeout(resolve, 3000));
     
     // Get balance AFTER swap
     let balanceAfter: bigint;
     if (isFxSAVEMarket) {
       balanceAfter = await publicClient.readContract({
         address: USDC_ADDRESS,
         abi: ERC20_ABI,
         functionName: "balanceOf",
         args: [address],
         blockTag: 'latest',
       }) as bigint;
     } else {
       balanceAfter = (await publicClient.getBalance({ address })) as bigint;
     }
     
     const received = balanceAfter - balanceBefore;
     
     if (received <= 0n) {
       throw new Error(`No ${targetTokenSymbol} received from swap. Balance may still be updating.`);
     }
     
    // Store received amount for deposit step
    if (isFxSAVEMarket) {
      (window as any).__swapUsdcAmount = received;
    } else {
      (window as any).__swapEthAmount = received;
    }
    
    setProgressSteps((prev) =>
      prev.map((s) =>
        s.id === "swap" ? { ...s, status: "completed", txHash: swapHash } : s
      )
    );
    
    // For fxSAVE markets (USDC swap), we need to approve USDC for the zapper
    // For wstETH markets (ETH swap), no approval needed - ETH is native
    if (isFxSAVEMarket) {
      setCurrentStepIndex(steps.findIndex((s) => s.id === "approveUSDC"));
      setStep("approving");
      setProgressSteps((prev) =>
        prev.map((s) =>
          s.id === "approveUSDC" ? { ...s, status: "in_progress" } : s
        )
      );
      setError(null);
      setTxHash(null);
      
      // Approve USDC for zapper contract
      const approveHash = await writeContractAsync({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [genesisZapAddress as `0x${string}`, received],
      });
      
      setTxHash(approveHash);
      await publicClient?.waitForTransactionReceipt({ hash: approveHash });
      
      // Give a moment for the blockchain state to update
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Verify the approval was successful
      const allowanceAfterApproval = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, genesisZapAddress as `0x${string}`],
      });
      
      if ((allowanceAfterApproval as bigint) < received) {
        throw new Error(`Approval failed: allowance ${formatUnits(allowanceAfterApproval as bigint, 6)} < required ${formatUnits(received, 6)}`);
      }
      
      setProgressSteps((prev) =>
        prev.map((s) =>
          s.id === "approveUSDC"
            ? { ...s, status: "completed", txHash: approveHash }
            : s
        )
      );
    } else {
      // For ETH swaps, no approval needed - go straight to deposit
    }
    
    setCurrentStepIndex(steps.findIndex((s) => s.id === "deposit"));
    return true;
  } catch (err: any) {
    setError(err.message || "Swap failed. Please try again.");
    setStep("error");
    setProgressModalOpen(false);
    setProgressSteps((prev) =>
      prev.map((s) =>
        s.id === "swap" ? { ...s, status: "error", error: err.message } : s
      )
    );
    return false;
  }
 };

 // Execute swap if needed
 const swapSucceeded = await executeSwapFlow();
 if (!swapSucceeded) {
   return;
 }

// For non-native tokens, check and approve if needed (only for direct deposits, not swaps)
if (!isNativeETH && needsApproval && !needsSwap && !usePermit) {
 await runApprovalStep({
   tokenAddress: selectedAssetAddress as `0x${string}`,
   spender: allowanceTarget as `0x${string}`,
   amount: amountBigInt,
 });
 approvalCompleted = true;
 setCurrentStepIndex(steps.findIndex((s) => s.id ==="deposit"));
 }

 setStep("depositing");
 setProgressSteps((prev) =>
 prev.map((s) =>
 s.id ==="deposit" ? { ...s, status:"in_progress" } : s
 )
 );
setCurrentStepIndex(steps.findIndex((s) => s.id ==="deposit"));
setError(null);
setTxHash(null);

// Use genesis zap contract for ETH, stETH, USDC, and FXUSD deposits
    let depositHash: `0x${string}`;
    
    // ETH zap: direct ETH deposits OR swapped tokens to ETH (for wstETH markets)
    if ((isNativeETH || needsETHZapAfterSwap) && genesisZapAddress && wstETHAddress) {
      // Determine ETH amount: direct deposit or from swap
      const ethAmount = needsETHZapAfterSwap 
        ? ((window as any).__swapEthAmount as bigint)
        : amountBigInt;
      
      if (!ethAmount || ethAmount <= 0n) {
        throw new Error("Invalid ETH amount for deposit");
      }
      
      // Use zapEth for ETH deposits with slippage protection
      // Contract flow: ETH → stETH (via submit, 1:1) → wstETH (via wrap) → Genesis
      // stETH.submit() returns stETH tokens 1:1 with ETH (not shares)
      const stETHAmount = ethAmount; // ETH amount = stETH amount (1:1 from submit)
      
      // Get expected wstETH from stETH amount
      const expectedWstETH = await publicClient.readContract({
        address: wstETHAddress,
        abi: WSTETH_ABI,
        functionName: "getWstETHByStETH",
        args: [stETHAmount],
      });
      
      // Apply 1% slippage buffer (99% of expected)
      const minWstETHOut = (expectedWstETH * 99n) / 100n;
      const minEthEquivalentOut = (ethAmount * 99n) / 100n;
      
      depositHash = await writeContractAsync({
        address: genesisZapAddress,
        abi: ZAP_ABI,
        functionName:"zapEth",
        args: [address as `0x${string}`, minWstETHOut, minEthEquivalentOut],
        value: ethAmount,
      });
      
      // Clean up swap amount if used
      if (needsETHZapAfterSwap) {
        delete (window as any).__swapEthAmount;
      }
    } else if (isStETH && useETHZap && genesisZapAddress && wstETHAddress) {
      // Use zapStEth for stETH deposits with slippage protection
      // Get expected wstETH from stETH amount
      const expectedWstETH = await publicClient.readContract({
        address: wstETHAddress,
        abi: WSTETH_ABI,
        functionName: "getWstETHByStETH",
        args: [amountBigInt],
      });
      
      // Apply 1% slippage buffer (99% of expected)
      const minWstETHOut = (expectedWstETH * 99n) / 100n;

      const permitHash = await tryPermitZap({
        type: "steth",
        amount: amountBigInt,
        minOut: minWstETHOut,
      });

      if (permitHash) {
        depositHash = permitHash;
      } else {
        if (!approvalCompleted && needsApproval) {
          ensureFallbackApprovalSteps(includeApproval);
          await runApprovalStep({
            tokenAddress: selectedAssetAddress as `0x${string}`,
            spender: allowanceTarget as `0x${string}`,
            amount: amountBigInt,
          });
          approvalCompleted = true;
          setCurrentStepIndex(1);
        }

        depositHash = await writeContractAsync({
          address: genesisZapAddress,
          abi: ZAP_ABI,
          functionName:"zapStEth",
          args: [amountBigInt, address as `0x${string}`, minWstETHOut],
        });
      }
    } else if ((isUSDC || needsSwap) && useUSDCZap && genesisZapAddress) {
      // Use zapUsdcToGenesis for USDC deposits with slippage protection
      // If this is after a swap, use the USDC amount from swap
      const usdcAmount = needsSwap ? ((window as any).__swapUsdcAmount as bigint) : amountBigInt;
      
      if (!usdcAmount || usdcAmount <= 0n) {
        throw new Error("Invalid USDC amount for deposit");
      }
      
      // Calculate expected fxSAVE output from USDC amount
      // Note: previewZapUsdc doesn't exist on contract, so we calculate using wrappedRate
      // USDC is in 6 decimals, fxSAVE is in 18 decimals
      const canCalculateMinOut = wrappedRate && wrappedRate > 0n;
      let minFxSaveOut = 0n;
      if (canCalculateMinOut) {
        // Scale USDC from 6 to 18 decimals, then divide by wrappedRate
        const usdcIn18Decimals = usdcAmount * 10n ** 12n;
        const expectedFxSaveOut = (usdcIn18Decimals * 1000000000000000000n) / wrappedRate;
        // Apply 1% slippage buffer (99% of expected)
        minFxSaveOut = (expectedFxSaveOut * 99n) / 100n;
      }

      const permitHash = !needsSwap && isUSDC
        ? await tryPermitZap({
            type: "usdc",
            amount: usdcAmount,
            minOut: minFxSaveOut,
          })
        : null;

      if (permitHash) {
        depositHash = permitHash;
      } else {
        if (!needsSwap && !approvalCompleted && needsApproval) {
          ensureFallbackApprovalSteps(includeApproval);
          await runApprovalStep({
            tokenAddress: selectedAssetAddress as `0x${string}`,
            spender: allowanceTarget as `0x${string}`,
            amount: amountBigInt,
          });
          approvalCompleted = true;
          setCurrentStepIndex(1);
        }

        // IMPORTANT: Pass USDC in native 6 decimals (usdcAmount), not scaled
        // The preview function uses 18 decimals for calculation, but the actual
        // zap function expects native USDC decimals and does internal scaling
        depositHash = await writeContractAsync({
          address: genesisZapAddress,
          abi: USDC_ZAP_ABI,
          functionName: "zapUsdcToGenesis",
          args: [usdcAmount, minFxSaveOut, address as `0x${string}`],
        });
      }
      
      // Clean up swap amount
      if (needsSwap) {
        delete (window as any).__swapUsdcAmount;
      }
    } else if (isFXUSD && useUSDCZap && genesisZapAddress) {
      // Use zapFxUsdToGenesis for FXUSD deposits with slippage protection
      // Calculate expected fxSAVE output: fxSAVE = FXUSD / wrappedRate
      // Both FXUSD and wrappedRate are in 18 decimals
      const canCalculateMinOut = wrappedRate && wrappedRate > 0n;
      let minFxSaveOut = 0n;
      if (canCalculateMinOut) {
        const expectedFxSaveOut = (amountBigInt * 1000000000000000000n) / wrappedRate;
        // Apply 1% slippage buffer (99% of expected)
        minFxSaveOut = (expectedFxSaveOut * 99n) / 100n;
      }

      const permitHash = await tryPermitZap({
        type: "fxusd",
        amount: amountBigInt,
        minOut: minFxSaveOut,
      });

      if (permitHash) {
        depositHash = permitHash;
      } else {
        if (!approvalCompleted && needsApproval) {
          ensureFallbackApprovalSteps(includeApproval);
          await runApprovalStep({
            tokenAddress: selectedAssetAddress as `0x${string}`,
            spender: allowanceTarget as `0x${string}`,
            amount: amountBigInt,
          });
          approvalCompleted = true;
          setCurrentStepIndex(1);
        }

        depositHash = await writeContractAsync({
          address: genesisZapAddress,
          abi: USDC_ZAP_ABI,
          functionName: "zapFxUsdToGenesis",
          args: [amountBigInt, minFxSaveOut, address as `0x${string}`],
        });
      }
    } else {
      // For other tokens (wstETH, fxSAVE), use standard genesis deposit
      depositHash = await writeContractAsync({
 address: genesisAddress as `0x${string}`,
 abi: GENESIS_ABI,
 functionName:"deposit",
 args: [amountBigInt, address as `0x${string}`],
 });
    }
 setTxHash(depositHash);
const receipt = await publicClient?.waitForTransactionReceipt({ hash: depositHash });

// For zap transactions (ETH, stETH, USDC, FXUSD), get the actual amount deposited from transaction
// by reading the user's new balance in the Genesis contract
let actualDepositedAmount = amount;
if (isNativeETH || isStETH || isUSDC || isFXUSD) {
  try {
    // Read the user's new deposit balance from Genesis
    const newBalance = await publicClient.readContract({
      address: genesisAddress as `0x${string}`,
      abi: GENESIS_ABI,
      functionName: "balanceOf",
      args: [address as `0x${string}`],
    });
    // Calculate the difference (new balance - old balance = amount deposited)
    // Use preDepositBalance captured at start of transaction to avoid race conditions
    const depositedAmount = (newBalance as bigint) - preDepositBalance;
    if (depositedAmount > 0n) {
      actualDepositedAmount = formatEther(depositedAmount);
    }
  } catch (err) {
    // Fall back to the expected amount
    // Use actualCollateralDeposit if available, otherwise use amountBigInt
    const fallbackAmount = actualCollateralDeposit > 0n 
      ? actualCollateralDeposit 
      : amountBigInt;
    if (fallbackAmount > 0n) {
      actualDepositedAmount = formatEther(fallbackAmount);
    }
  }
}

 setStep("success");
setSuccessfulDepositAmount(actualDepositedAmount);
 setProgressSteps((prev) =>
 prev.map((s) =>
 s.id ==="deposit"
 ? { ...s, status:"completed", txHash: depositHash }
 : s
 )
 );
 setCurrentStepIndex(steps.findIndex((s) => s.id ==="deposit"));
 if (onSuccess) {
 await onSuccess();
 }
 } catch (err) {
   let errorMessage ="Transaction failed";

 // Helper to check if error is user rejection
 const isUserRejection = (error: any): boolean => {
 if (!error) return false;
 const errorMessage = error.message?.toLowerCase() ||"";
 const errorCode = error.code;
 const errorName = error.name?.toLowerCase() ||"";

 // Check for common rejection messages
 if (
 errorMessage.includes("user rejected") ||
 errorMessage.includes("user denied") ||
 errorMessage.includes("rejected") ||
 errorMessage.includes("denied") ||
 errorMessage.includes("action rejected") ||
 errorMessage.includes("user cancelled") ||
 errorMessage.includes("user canceled") ||
 errorName.includes("userrejected") ||
 errorName.includes("rejected")
 ) {
 return true;
 }

 // Check for common rejection error codes
 // 4001 = MetaMask user rejection, 4900 = Uniswap user rejection, etc.
 if (errorCode === 4001 || errorCode === 4900) {
 return true;
 }

 return false;
 };

 // Handle user rejection first
 if (isUserRejection(err)) {
   errorMessage ="Transaction was rejected. Please try again.";
   setError(errorMessage);
   setStep("error");
   setProgressModalOpen(false);
   setProgressSteps([]);
   setCurrentStepIndex(0);
   // Clear stored progress on rejection
   if (progressStorageKey && typeof window !== "undefined") {
     window.localStorage.removeItem(progressStorageKey);
   }
   return;
 }

 // Check for RPC errors by examining error properties
 const errObj = err as any;
 if (
 errObj &&
 (errObj.code !== undefined ||
 errObj.name?.includes("Rpc") ||
 errObj.name?.includes("RPC"))
 ) {
 const rpcCode = errObj.code;

 // Map common RPC error codes to user-friendly messages
 if (rpcCode !== undefined) {
 switch (rpcCode) {
 case -32000:
 errorMessage =
"Transaction execution failed. Please check your balance and try again.";
 break;
 case -32002:
 errorMessage =
"Transaction already pending. Please wait for the previous transaction to complete.";
 break;
 case -32003:
 errorMessage ="Transaction was rejected by the network.";
 break;
 case -32602:
 errorMessage ="Invalid transaction parameters.";
 break;
 case -32603:
 errorMessage ="Internal RPC error. Please try again later.";
 break;
 default:
 // Try to extract meaningful error message
 if (errObj.shortMessage) {
 errorMessage = errObj.shortMessage;
 } else if (errObj.message) {
 errorMessage = errObj.message;
 } else {
 errorMessage = `RPC error (code: ${rpcCode}). Please try again.`;
 }
 }
 } else if (errObj.shortMessage) {
 errorMessage = errObj.shortMessage;
 } else if (errObj.message) {
 errorMessage = errObj.message;
 } else {
 errorMessage ="RPC error occurred. Please try again.";
 }
 setError(errorMessage);
 setStep("error");
 setProgressModalOpen(false);
 setProgressSteps([]);
 setCurrentStepIndex(0);
 // Clear stored progress on error
 if (progressStorageKey && typeof window !== "undefined") {
   window.localStorage.removeItem(progressStorageKey);
 }
 return;
 }

 // Handle BaseError (viem errors)
 if (err instanceof BaseError) {
 const revertError = err.walk(
 (err) => err instanceof ContractFunctionRevertedError
 );
 if (revertError instanceof ContractFunctionRevertedError) {
 const errorName = revertError.data?.errorName;
 switch (errorName) {
 case"GenesisAlreadyEnded":
 errorMessage ="Genesis period has already ended";
 break;
 case"GenesisNotActive":
 errorMessage ="Genesis is not currently active";
 break;
 case"ZeroAmount":
 errorMessage ="Amount cannot be zero";
 break;
 case"InvalidAmount":
 errorMessage ="Invalid amount specified";
 break;
 case"InsufficientBalance":
 errorMessage ="Insufficient token balance";
 break;
 case"TransferFailed":
 errorMessage ="Token transfer failed";
 break;
 case"Unauthorized":
 errorMessage ="Unauthorized operation";
 break;
 default:
 errorMessage = `Contract error: ${errorName ||"Unknown error"}`;
 }
 } else {
 // Check for common error patterns in the message
 const errorMsg = err.shortMessage || err.message ||"";
 const lowerMsg = errorMsg.toLowerCase();

 if (
 lowerMsg.includes("insufficient funds") ||
 lowerMsg.includes("insufficient balance")
 ) {
 errorMessage ="Insufficient balance for this transaction";
 } else if (lowerMsg.includes("gas") || lowerMsg.includes("fee")) {
 errorMessage =
"Transaction failed due to gas estimation. Please try again.";
 } else if (lowerMsg.includes("network") || lowerMsg.includes("rpc")) {
 errorMessage =
"Network error. Please check your connection and try again.";
 } else if (lowerMsg.includes("nonce")) {
 errorMessage ="Transaction nonce error. Please try again.";
 } else {
 errorMessage = errorMsg ||"Transaction failed";
 }
 }
 } else if (err && typeof err ==="object" &&"message" in err) {
 const errObj = err as { message: string; code?: number };
 const msg = errObj.message ||"";
 const lowerMsg = msg.toLowerCase();

 // Check for user rejection patterns
 if (
 lowerMsg.includes("user rejected") ||
 lowerMsg.includes("user denied") ||
 lowerMsg.includes("rejected") ||
 errObj.code === 4001 ||
 errObj.code === 4900
 ) {
 errorMessage ="Transaction was rejected. Please try again.";
 } else if (lowerMsg.includes("rpc") || lowerMsg.includes("network")) {
 errorMessage =
"Network error. Please check your connection and try again.";
 } else {
 errorMessage = msg;
 }
 } else {
 errorMessage ="An unknown error occurred. Please try again.";
 }


 setError(errorMessage);
 setStep("error");
 setProgressModalOpen(false);
 setProgressSteps((prev) =>
 prev.map((s, idx) =>
 idx === currentStepIndex
 ? { ...s, status:"error", error: errorMessage }
 : s
 )
 );
 // Clear stored progress on error
 if (progressStorageKey && typeof window !== "undefined") {
   window.localStorage.removeItem(progressStorageKey);
 }
 }
 };

 const getButtonText = () => {
 switch (step) {
 case"approving":
 return"Approving...";
 case"depositing":
 return needsSwap ? "Swapping..." : "Depositing...";
 case"success":
 return"Deposit";
 case"error":
 return"Try Again";
 default:
 if (needsSwap) {
   return needsApproval ? "Approve, Swap & Deposit" : "Swap & Deposit";
 }
 return needsApproval && !canAttemptPermit ? "Approve & Deposit" : "Deposit";
 }
 };

 const handleMainButtonClick = () => {
 if (step ==="error") {
 setStep("input");
 setError(null);
 } else if (step ==="success") {
 // Reset to input step for a new deposit
 setStep("input");
 setAmount("");
 setError(null);
 setTxHash(null);
 } else {
 handleDeposit();
 }
 };

 const isButtonDisabled = () => {
 if (step ==="success") return false; // Always enable the button when successful
 return (
 step ==="approving" ||
 step ==="depositing" ||
 !amount ||
 parseFloat(amount) <= 0 ||
 genesisEnded
 );
 };

 const renderSuccessContent = () => {
// Format the success amount with USD
const successAmountNum = parseFloat(successfulDepositAmount || "0");
const successAmountBigInt = successAmountNum > 0 ? parseEther(successfulDepositAmount) : 0n;
const successFmt = formatTokenAmount(successAmountBigInt, collateralSymbol, collateralPriceUSD);

 return (
 <div className="space-y-4">
 <div className="p-4 bg-[rgb(var(--surface-selected-rgb))]/20 border border-[rgb(var(--surface-selected-border-rgb))]/30 text-center">
 <p className="text-sm text-[#1E4775]/80">
 Thank you for joining the Maiden Voyage!
 </p>
 {successfulDepositAmount && (
<>
 <p className="text-lg font-bold text-[#1E4775] font-mono mt-2">
{successFmt.display}
 </p>
{successFmt.usd && (
<p className="text-sm text-[#1E4775]/60">
({successFmt.usd})
</p>
)}
</>
 )}
 </div>
 <div className="space-y-2 bg-[#17395F]/5 border border-[#1E4775]/15 p-4">
 <div className="text-base font-semibold text-[#1E4775]">
 Boost your airdrop
 </div>
 <p className="text-sm text-[#1E4775]/80">
 Share your deposit on X to spread the word about Harbor Protocol.
 </p>
 <button
 onClick={handleShareOnX}
                className="w-full py-2.5 sm:py-3 px-3 sm:px-4 bg-black hover:bg-gray-800 text-white font-medium rounded-full transition-colors flex items-center justify-center gap-2 text-sm sm:text-base touch-target"
 >
 <svg
 viewBox="0 0 24 24"
 className="w-5 h-5 fill-current"
 aria-hidden="true"
 >
 <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
 </svg>
 <span>Share on X</span>
 </button>
 <p className="text-xs text-[#1E4775]/60 mt-2">
 Share your post in the <span className="font-semibold">#boosters</span> channel on
 Discord to be included in the community marketing airdrop.
 </p>
 </div>
 </div>
 );
 };

 if (!isOpen && !progressModalOpen) return null;

  // Deposit form content
  const formContent = (
    <div className="space-y-4 sm:space-y-6">
 {/* Genesis Status Warning */}
 {genesisEnded && (
 <div className="p-3 bg-red-50 border border-red-500/30 text-red-600 text-sm">
 ⚠️ Genesis period has ended. Deposits are no longer accepted.
 </div>
 )}

 {/* Deposit Asset Selection */}
 <div className="space-y-2">
 <label className="text-sm text-[#1E4775]/70">
 Deposit Asset
 </label>
 {(() => {
   const filteredUserTokens = userTokens.filter(token => 
     !acceptedAssets.some(a => a.symbol.toUpperCase() === token.symbol.toUpperCase())
   );
   
   const tokenGroups = [
     ...(acceptedAssets.length > 0 ? [{
       label: "Supported Assets",
       tokens: acceptedAssets.map((asset) => ({
         symbol: asset.symbol,
         name: asset.name,
       })),
     }] : []),
     ...(filteredUserTokens.length > 0 ? [{
       label: "Other Tokens (via Swap)",
       tokens: filteredUserTokens.map((token) => ({
         symbol: token.symbol,
         name: token.name,
         isUserToken: true,
       })),
     }] : []),
   ];
   
   return (
     <TokenSelectorDropdown
       value={selectedAsset === "custom" ? "" : selectedAsset}
       onChange={(newValue) => {
         setShowCustomTokenInput(false);
         setSelectedAsset(newValue);
         setCustomTokenAddress("");
       }}
       options={tokenGroups}
       disabled={
         step === "approving" ||
         step === "depositing" ||
         genesisEnded
       }
       placeholder="Select Deposit Asset"
       showCustomOption={true}
       onCustomOptionClick={() => {
         setShowCustomTokenInput(true);
         setSelectedAsset("custom");
       }}
     />
   );
 })()}
 
 {/* Custom token address input */}
 {showCustomTokenInput && (
   <div className="space-y-2">
     <input
       type="text"
       value={customTokenAddress}
       onChange={(e) => {
         const addr = e.target.value.trim();
         setCustomTokenAddress(addr);
         if (addr && addr.startsWith("0x") && addr.length === 42) {
           // Valid address, update selectedAssetAddress will be handled by getAssetAddress
         }
       }}
       placeholder="0x..."
       className="w-full h-10 px-3 bg-white text-[#1E4775] border border-[#1E4775]/30 focus:border-[#1E4775] focus:ring-2 focus:ring-[#1E4775]/20 focus:outline-none transition-all text-sm font-mono"
       disabled={
         step ==="approving" ||
         step ==="depositing" ||
         genesisEnded
       }
     />
     {customTokenAddress && (!customTokenAddress.startsWith("0x") || customTokenAddress.length !== 42) && (
       <div className="text-xs text-red-600">
         Invalid address format. Must start with 0x and be 42 characters.
       </div>
     )}
     {isCustomToken && customTokenSymbol && (
       <div className="text-xs text-green-600">
         ✓ Token found: {customTokenName || customTokenSymbol} ({customTokenSymbol})
       </div>
     )}
   </div>
 )}
 
 {/* Multi-token support notice */}
 {!needsSwap && (
   <InfoCallout
     tone="success"
     title="Tip:"
      icon={<RefreshCw className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-600" />}
   >
     You can deposit any ERC20 token! Non-collateral tokens will be automatically swapped via Velora.
   </InfoCallout>
 )}

 {/* Large deposit recommendation */}
 <InfoCallout
   title="Info:"
   icon={<Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />}
 >
   For large deposits, Harbor recommends using wstETH or fxSAVE instead of the built-in swap and zaps.
 </InfoCallout>
 
 {isNonCollateralAsset && (
 <div className="p-3 bg-[rgb(var(--surface-selected-rgb))]/20 border border-[rgb(var(--surface-selected-border-rgb))]/30 text-[#1E4775] text-sm">
 ℹ️ Your deposit will be converted to {wrappedCollateralSymbol || collateralSymbol} on
 deposit. Withdrawals will be in {wrappedCollateralSymbol || collateralSymbol} only.
 </div>
 )}
 </div>

 {/* Amount Input */}
 <div className="space-y-2">
 {/* Available Balance - AMM Style */}
 <div className="flex justify-between items-center text-xs">
 <span className="text-[#1E4775]/70">Amount</span>
 <span className="text-[#1E4775]/70">
 Balance:{" "}
{isNativeETH ? (
  // ETH balance display
  isEthBalanceError ? (
    <span className="text-red-500">Error loading balance</span>
  ) : isEthBalanceLoading ? (
    <span className="text-[#1E4775]/50">Loading...</span>
  ) : (
     formatBalance(balance, selectedAsset, 4, selectedTokenDecimals)
  )
) : (
  // ERC20 balance display
  balancesError ? (
 <span
 className="text-red-500"
 title={balancesError.message}
 >
 Error loading balance
 </span>
 ) : !mounted ? (
 <span className="text-[#1E4775]/50">Loading...</span>
 ) : (
     formatBalance(balance, selectedAsset, 4, selectedTokenDecimals)
  )
)}
 </span>
 </div>
 <div className="relative">
 <input
 type="text"
 value={amount}
 onChange={handleAmountChange}
 placeholder="0.0"
 className={`w-full px-3 pr-20 py-2 bg-white text-[#1E4775] border ${
 error ?"border-red-500" :"border-[#1E4775]/30"
 } focus:border-[#1E4775] focus:ring-2 focus:ring-[#1E4775]/20 focus:outline-none transition-all text-lg font-mono`}
 disabled={
 step ==="approving" ||
 step ==="depositing" ||
 genesisEnded
 }
 />
 <button
 onClick={handleMaxClick}
 className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-[#FF8A7A] hover:bg-[#FF6B5A] text-white transition-colors disabled:bg-gray-300 disabled:text-gray-500 rounded-full"
 disabled={
 step ==="approving" ||
 step ==="depositing" ||
 genesisEnded
 }
 >
 MAX
 </button>
 </div>
 </div>

 {/* Permit toggle (direct USDC/FXUSD/stETH only) */}
 {showPermitToggle && (
   <div className="flex items-center justify-between rounded-md border border-[#1E4775]/20 bg-[#17395F]/5 px-3 py-2 text-xs">
     <div className="text-[#1E4775]/80">
       Use permit (gasless approval) for this deposit
     </div>
     <label className="flex items-center gap-2 text-[#1E4775]/80">
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
       >
         <span
           className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
             permitEnabled ? "translate-x-4" : "translate-x-1"
           }`}
         />
       </button>
     </label>
   </div>
 )}

 {/* Transaction Preview - Always visible */}
 <div className="p-3 bg-[#17395F]/10 border border-[#1E4775]/20 space-y-2 text-sm">
 <div className="font-medium text-[#1E4775]">
 Transaction Preview:
 </div>
 
 {/* Swap details - show when swapping */}
 {needsSwap && swapQuote && swapQuote.toAmount > 0n && (() => {
   const targetToken = isFxSAVEMarket ? "USDC" : "ETH";
   const targetDecimals = isFxSAVEMarket ? 6 : 18;
   return (
   <div className="p-2 bg-blue-50 border border-blue-200 space-y-1 text-xs">
     <div className="flex items-center justify-between">
       <span className="text-blue-700">Swap via Velora:</span>
       <span className="font-mono text-blue-900">{formatUnits(swapQuote.toAmount, targetDecimals)} {targetToken}</span>
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
       <span className="text-blue-700">Velora Fee:</span>
       <span className="font-mono text-blue-700">
         {swapQuote.fee.toFixed(2)}%
       </span>
     </div>
   </div>
   );
 })()}
 
{(() => {
  const displaySymbol = wrappedCollateralSymbol || collateralSymbol;
  const currentFmt = formatTokenAmount(userCurrentDeposit, displaySymbol, collateralPriceUSD);
  return (
    <div className="flex justify-between items-baseline">
 <span className="text-[#1E4775]/70">Current Deposit:</span>
 <span className="text-[#1E4775]">
        {currentFmt.display}
        {currentFmt.usd && <span className="text-[#1E4775]/50 ml-1">({currentFmt.usd})</span>}
 </span>
 </div>
  );
})()}
 {amount && parseFloat(amount) > 0 ? (
 <>
{(() => {
  // Always use actualCollateralDeposit - this is the canonical value that represents what will actually be deposited
  // For direct deposits (wstETH, fxSAVE), actualCollateralDeposit = amountBigInt
  // For converted deposits (ETH→wstETH, USDC→fxSAVE), actualCollateralDeposit = converted amount
  // For swapped deposits, actualCollateralDeposit = amount after swap and conversion
  const depositAmt = actualCollateralDeposit;
  // For deposit display, show the amount being deposited
  // Display in wrapped collateral symbol since that's what gets stored
  // Use wrapped token price (collateralPriceUSD) since depositAmt is in wrapped collateral tokens
  const displaySymbol = wrappedCollateralSymbol || collateralSymbol;
  
  // Don't show deposit amount if we're still loading token decimals (to avoid showing incorrect values)
  // For USDC and ETH, we know the decimals, so no loading check needed
  const isCalculating = !hasValidDecimals && amount && parseFloat(amount) > 0;
  
  const depositFmt = formatTokenAmount(depositAmt, displaySymbol, collateralPriceUSD);
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-[#1E4775]/70">+ Deposit Amount:</span>
 <span className="text-[#1E4775]">
        {isCalculating ? (
          "Calculating..."
        ) : depositAmt > 0n ? (
          <>
            +{depositFmt.display}
            {depositFmt.usd && <span className="text-[#1E4775]/50 ml-1">(+{depositFmt.usd})</span>}
          </>
        ) : (
          "Calculating..."
        )}
 </span>
 </div>
  );
})()}
{((isNativeETH || isStETH || isUSDC || isFXUSD || needsSwap) && actualCollateralDeposit > 0n) && (
<div className="text-xs text-[#1E4775]/50 italic">
{needsSwap && swapQuote && swapQuote.toAmount > 0n ? (
  <>
    {parseFloat(amount).toFixed(6)} {selectedAsset} → {formatUnits(swapQuote.toAmount, 6)} USDC → {formatTokenAmount(actualCollateralDeposit, wrappedCollateralSymbol || collateralSymbol, undefined, 6, 18).display}
  </>
) : needsSwap && isLoadingSwapQuote ? (
  <>
    {parseFloat(amount).toFixed(6)} {selectedAsset} → Calculating swap... → {formatTokenAmount(actualCollateralDeposit, wrappedCollateralSymbol || collateralSymbol, undefined, 6, 18).display}
  </>
) : (
  <>
    ({isUSDC ? parseFloat(amount).toFixed(2) : parseFloat(amount).toFixed(6)} {selectedAsset} ≈ {formatTokenAmount(actualCollateralDeposit, wrappedCollateralSymbol || collateralSymbol, undefined, 6, 18).display})
  </>
)}
</div>
)}
 <div className="border-t border-[#1E4775]/30 pt-2">
{(() => {
  // For total deposit, we need to calculate the USD value correctly
  // Both current deposit and new deposit are in wrapped collateral tokens (fxSAVE, wstETH)
  // So we use wrapped token price (collateralPriceUSD) for both
  const currentDepositUSD = userCurrentDeposit > 0n 
    ? (Number(userCurrentDeposit) / 1e18) * collateralPriceUSD 
    : 0;
  // Always use actualCollateralDeposit for consistency
  const depositAmt = actualCollateralDeposit;
  // depositAmt is in wrapped collateral tokens, so use wrapped token price
  const newDepositUSD = depositAmt > 0n 
    ? (Number(depositAmt) / 1e18) * collateralPriceUSD 
    : 0;
  const totalUSD = currentDepositUSD + newDepositUSD;
  
  const displaySymbol = wrappedCollateralSymbol || collateralSymbol;
  const totalFmt = formatTokenAmount(newTotalDepositActual, displaySymbol);
  const totalUSDFormatted = totalUSD > 0 ? formatUSD(totalUSD) : null;
  
  return (
    <div className="flex justify-between items-baseline font-medium">
      <span className="text-[#1E4775]">New Total Deposit:</span>
 <span className="text-[#1E4775]">
        {totalFmt.display}
        {totalUSDFormatted && <span className="text-[#1E4775]/50 font-normal ml-1">({totalUSDFormatted})</span>}
 </span>
 </div>
  );
})()}
 </div>
 </>
 ) : (
 <div className="text-xs text-[#1E4775]/50 italic">
 Enter an amount to see deposit preview
 </div>
 )}
 </div>

 {/* Error */}
 {error && (
 <div className="p-3 bg-red-50 border border-red-500/30 text-red-600 text-sm">
 {error}
 </div>
 )}

 {/* Step Indicator */}
 {needsApproval && !canAttemptPermit &&
 (step ==="approving" || step ==="depositing") && (
 <div className="space-y-2">
 <div className="flex items-center gap-4 text-sm">
 <div
 className={`w-2 h-2 rounded-full ${
 step ==="approving"
 ?"bg-[#1E4775] animate-pulse"
 :"bg-[#1E4775]"
 }`}
 />
 <span
 className={
 step ==="approving"
 ?"text-[#1E4775]"
 :"text-[#1E4775]/70"
 }
 >
 Step 1: Approve {collateralSymbol}
 </span>
 </div>
 <div className="flex items-center gap-4 text-sm">
 <div
 className={`w-2 h-2 rounded-full ${
 step ==="depositing"
 ?"bg-[#1E4775] animate-pulse"
 : step ==="approving"
 ?"bg-gray-300"
 :"bg-[#1E4775]"
 }`}
 />
 <span
 className={
 step ==="depositing"
 ?"text-[#1E4775]"
 :"text-[#1E4775]/70"
 }
 >
 Step 2: Deposit to Genesis
 </span>
 </div>
 </div>
 )}

 {/* Transaction Hash */}
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

      {/* Submit Button */}
      <div>
 <button
 onClick={handleMainButtonClick}
 disabled={isButtonDisabled()}
          className={`w-full py-3 px-4 font-medium transition-colors rounded-full ${
            step === "success"
              ? "bg-[#1E4775] hover:bg-[#17395F] text-white"
              : "bg-[#1E4775] hover:bg-[#17395F] text-white disabled:bg-gray-300 disabled:text-gray-500"
 }`}
 >
 {getButtonText()}
 </button>
      </div>
    </div>
  );

  // If embedded, return just the content + progress modal
  if (embedded) {
    return (
      <>
        {progressModalOpen && (
          <TransactionProgressModal
            isOpen={progressModalOpen}
            onClose={handleClose}
            title="Processing Deposit"
            steps={progressSteps}
            currentStepIndex={currentStepIndex}
            canCancel={false}
            errorMessage={error || undefined}
            renderSuccessContent={renderSuccessContent}
          />
        )}
        {!progressModalOpen && formContent}
      </>
    );
  }

  // Full standalone modal
  return (
    <>
      {progressModalOpen && (
        <TransactionProgressModal
          isOpen={progressModalOpen}
          onClose={handleClose}
          title="Processing Deposit"
          steps={progressSteps}
          currentStepIndex={currentStepIndex}
          canCancel={false}
          errorMessage={error || undefined}
          renderSuccessContent={renderSuccessContent}
        />
      )}

      {!progressModalOpen && isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          />

          <div
            className="relative bg-white shadow-2xl w-full max-w-md mx-2 sm:mx-4 animate-in fade-in-0 scale-in-95 duration-200 rounded-none max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
            style={{ borderRadius: 0 }}
          >
            <div className="flex items-center justify-between p-3 sm:p-4 lg:p-6 border-b border-[#1E4775]/20">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg sm:text-2xl font-bold text-[#1E4775]">
                    Deposit in Maiden Voyage
                  </h2>
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold uppercase tracking-wide">
                    <ArrowPathIcon className="w-3 h-3" />
                    <span>Any Token</span>
                  </div>
                </div>
                <p className="text-xs text-[#1E4775]/70">
                  Deposit any ERC20 token via Velora integration
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-[#1E4775]/50 hover:text-[#1E4775] transition-colors"
                disabled={step === "approving" || step === "depositing" || isWritePending}
              >
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6"
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

            <div className="p-3 sm:p-4 lg:p-6">
              {formContent}
 </div>
 </div>
 </div>
 )}
 </>
 );
};
