"use client";

import React, { useState, useEffect } from "react";
import { parseEther, formatEther, parseUnits, formatUnits } from "viem";
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
import { ZAP_ABI, STETH_ABI, WSTETH_ABI, USDC_ZAP_ABI } from "@/abis";
import { useCollateralPrice } from "@/hooks/useCollateralPrice";
import {
 TransactionProgressModal,
 TransactionStep,
} from "./TransactionProgressModal";
import { formatTokenAmount, formatBalance, formatUSD } from "@/utils/formatters";
import { useCoinGeckoPrice } from "@/hooks/useCoinGeckoPrice";
import { useDefiLlamaSwap, getDefiLlamaSwapTx } from "@/hooks/useDefiLlamaSwap";
import { useUserTokens, getTokenAddress, getTokenInfo, useTokenDecimals } from "@/hooks/useUserTokens";

interface GenesisDepositModalProps {
 isOpen: boolean;
 onClose: () => void;
 genesisAddress: string;
 collateralAddress: string;
 collateralSymbol: string;
 wrappedCollateralSymbol?: string;
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
 const [slippageTolerance, setSlippageTolerance] = useState<number>(1.0); // Default 1% slippage
 const [showSlippageInput, setShowSlippageInput] = useState(false);
 const [step, setStep] = useState<ModalStep>("input");
 const [error, setError] = useState<string | null>(null);
 const [txHash, setTxHash] = useState<string | null>(null);
 const [progressModalOpen, setProgressModalOpen] = useState(false);
 const [progressSteps, setProgressSteps] = useState<TransactionStep[]>([]);
 const [currentStepIndex, setCurrentStepIndex] = useState(0);
 const [successfulDepositAmount, setSuccessfulDepositAmount] =
 useState<string>("");
 
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

// Fetch CoinGecko price (primary source)
const { price: coinGeckoPrice, isLoading: isCoinGeckoLoading } = useCoinGeckoPrice(
  coinGeckoId || "",
  60000 // Refresh every 60 seconds
);

// Get collateral price from oracle (fallback)
const oraclePriceData = useCollateralPrice(
  marketAddresses?.priceOracle as `0x${string}` | undefined,
  { enabled: isOpen && !!marketAddresses?.priceOracle }
);

// Priority order for underlying price: CoinGecko → fxUSD hardcoded $1 → Oracle
// CoinGecko is the most reliable source for real-time prices
const underlyingPriceUSD = coinGeckoPrice 
  ? coinGeckoPrice 
  : collateralSymbol.toLowerCase() === "fxusd" 
    ? 1.00 
    : oraclePriceData.priceUSD;

const wrappedRate = oraclePriceData.maxRate;
const maxUnderlyingPrice = coinGeckoPrice
  ? BigInt(Math.floor(coinGeckoPrice * 1e18))
  : collateralSymbol.toLowerCase() === "fxusd"
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
 
 // Wrapped collateral token (fxSAVE, stETH, etc.)
 if (normalized === "fxsave" || normalized === "steth") {
   return marketAddresses?.wrappedCollateralToken || null;
 }
 
 // USDC (standard mainnet address)
 if (normalized === "usdc") {
   return "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
 }
 
 // fxUSD - use collateralToken address
 if (normalized === "fxusd") {
   return marketAddresses?.collateralToken || collateralAddress;
 }
 
 // wstETH - use collateralToken address if it's wstETH
 if (normalized === "wsteth") {
   return marketAddresses?.collateralToken || collateralAddress;
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
const { decimals: tokenDecimals } = useTokenDecimals(tokenAddressForDecimals);

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

const stETHAddress = isETHStETHMarket 
  ? (marketAddresses?.wrappedCollateralToken || contracts.wrappedCollateralToken) as `0x${string}` | undefined
  : undefined; // stETH
const wstETHAddress = isETHStETHMarket
  ? (marketAddresses?.collateralToken || contracts.collateralToken) as `0x${string}` | undefined
  : undefined; // wstETH

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
  (coinGeckoId.toLowerCase() === "fxsave" && collateralSymbol.toLowerCase() === "fxsave")
);

// For wstETH: CoinGecko returns wstETH price directly (~$3,607), so use it as-is
// For fxSAVE: CoinGecko returns fxUSD price ($1.00), so multiply by wrapped rate to get fxSAVE price
// Only use oracle calculation if CoinGecko is not available
// Priority: CoinGecko (if wrapped token) > CoinGecko (if underlying) > Oracle (with wrapped rate) > Oracle (underlying only)
const wrappedTokenPriceUSD = (() => {
  // If CoinGecko returns the wrapped token price directly (e.g., "wrapped-steth" for wstETH)
  if (coinGeckoIsWrappedToken && coinGeckoPrice != null) {
    return coinGeckoPrice; // Use CoinGecko price directly, no wrapped rate multiplication
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

  // Use the balance from the asset balance map or custom token balance
  const balance = selectedAssetBalance;

const allowance = isNativeETH ? 0n : (typeof allowanceData === 'bigint' ? allowanceData : 0n);
 // Use token decimals dynamically, fallback to 18 (or 6 for USDC)
 // For user tokens, use their known decimals
const selectedTokenDecimals = isUSDC 
  ? 6 
  : (selectedUserToken?.decimals || tokenDecimals || 18);
const amountBigInt = amount 
  ? parseUnits(amount, selectedTokenDecimals)
  : 0n;
 const needsApproval =
 !isNativeETH && amountBigInt > 0 && amountBigInt > allowance;
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
// Note: previewZapUsdc expects USDC amount in 18 decimals (scaled from 6)
// amountBigInt is in 6 decimals for USDC (e.g., 1 USDC = 1000000n)
// The contract returns fxSAVE amount in 18 decimals
const usdcAmountForPreview = isUSDC && amountBigInt > 0n 
  ? amountBigInt * 10n ** 12n // Scale from 6 to 18 decimals
  : amountBigInt;
const { data: expectedFxSaveFromUSDC } = useContractRead({
  address: genesisZapAddress,
  abi: USDC_ZAP_ABI,
  functionName: "previewZapUsdc",
  args: usdcAmountForPreview > 0n && isUSDC ? [usdcAmountForPreview] : undefined,
  query: {
    enabled: !!address && isOpen && mounted && isUSDC && amountBigInt > 0n && !!genesisZapAddress && useUSDCZap,
  },
});

// Calculate expected fxSAVE output for FXUSD deposits (for preview)
const { data: expectedFxSaveFromFXUSD } = useContractRead({
  address: genesisZapAddress,
  abi: USDC_ZAP_ABI,
  functionName: "previewZapFxUsd",
  args: amountBigInt > 0n && isFXUSD ? [amountBigInt] : undefined,
  query: {
    enabled: !!address && isOpen && mounted && isFXUSD && amountBigInt > 0n && !!genesisZapAddress && useUSDCZap,
  },
});

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

console.log("[wstETH Preview] Swap quote data:", {
  needsSwap,
  isETHStETHMarket,
  hasSwapQuote: !!swapQuote,
  swapQuote: swapQuote ? {
    fromAmount: swapQuote.fromAmount.toString(),
    toAmount: swapQuote.toAmount.toString(),
    toAmountFormatted: formatUnits(swapQuote.toAmount, 18),
  } : null,
  ethFromSwap: ethFromSwap.toString(),
  ethFromSwapFormatted: ethFromSwap > 0n ? formatUnits(ethFromSwap, 18) : "0",
});

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

console.log("[wstETH Preview] Contract query result:", {
  expectedWstETHFromSwap: expectedWstETHFromSwap ? expectedWstETHFromSwap.toString() : "undefined",
  formatted: expectedWstETHFromSwap ? formatUnits(expectedWstETHFromSwap as bigint, 18) : "N/A",
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
  ? toBigInt(expectedFxSaveFromUSDC)
  : isFXUSD && useUSDCZap
  ? toBigInt(expectedFxSaveFromFXUSD)
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
 if (step ==="approving" || step ==="depositing") return; // Prevent closing during transactions
 setAmount("");
 setSelectedAsset(collateralSymbol);
 setCustomTokenAddress("");
 setShowCustomTokenInput(false);
 setSlippageTolerance(1.0);
 setShowSlippageInput(false);
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
 if (amountBigInt > balance) {
 setError("Insufficient balance");
 return false;
 }
 if (genesisEnded) {
 setError("Genesis period has ended");
 return false;
 }
 return true;
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

 // Initialize progress modal steps
 const steps: TransactionStep[] = [];
 const includeApproval = !isNativeETH && needsApproval && !needsSwap; // For direct deposits only
 const includeSwap = needsSwap && swapQuote;
 const needsSwapApproval = includeSwap && !isNativeETH; // Approve source token for swap (unless it's ETH)
 
 // For swaps: first approve source token for ParaSwap, then swap
 if (needsSwapApproval) {
 steps.push({
 id:"approveSwap",
 label: `Approve ${selectedAsset} for swap`,
 status:"pending",
 });
 }
 if (includeSwap) {
 const swapTarget = isFxSAVEMarket ? "USDC" : "ETH";
 steps.push({
 id:"swap",
 label: `Swap ${selectedAsset} → ${swapTarget}`,
 status:"pending",
 });
 }
 // For direct deposits: approve after swap (if needed)
 if (includeApproval) {
 steps.push({
 id:"approve",
 label: `Approve ${selectedAsset}`,
 status:"pending",
 });
 }
 // For fxSAVE market swaps: approve USDC after swap
 if (includeSwap && isFxSAVEMarket) {
 steps.push({
 id:"approveUSDC",
 label: `Approve USDC for deposit`,
 status:"pending",
 });
 }
 steps.push({
 id:"deposit",
 label:"Deposit to Genesis",
 status:"pending",
 });
 setProgressSteps(steps);
 setCurrentStepIndex(0);
 setProgressModalOpen(true);

 // Execute swap if needed
 if (includeSwap && swapQuote && address) {
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
       
       console.log(`[Swap Approval] Checking ${selectedAsset} allowance for ParaSwap:`, {
         token: selectedAssetAddress,
         spender: PARASWAP_TOKEN_TRANSFER_PROXY,
         amount: formatUnits(amountBigInt, selectedTokenDecimals),
       });
       
       // Check current allowance
       const currentAllowance = await publicClient.readContract({
         address: selectedAssetAddress as `0x${string}`,
         abi: ERC20_ABI,
         functionName: "allowance",
         args: [address, PARASWAP_TOKEN_TRANSFER_PROXY],
       }) as bigint;
       
       console.log(`[Swap Approval] Current allowance:`, {
         raw: currentAllowance.toString(),
         formatted: formatUnits(currentAllowance, selectedTokenDecimals),
         required: formatUnits(amountBigInt, selectedTokenDecimals),
       });
       
       // Approve if needed
       if (currentAllowance < amountBigInt) {
         console.log(`[Swap Approval] Insufficient allowance, approving ${selectedAsset}...`);
         
         const approveHash = await writeContractAsync({
           address: selectedAssetAddress as `0x${string}`,
           abi: ERC20_ABI,
           functionName: "approve",
           args: [PARASWAP_TOKEN_TRANSFER_PROXY, amountBigInt],
         });
         
         setTxHash(approveHash);
         console.log("[Swap Approval] Approval transaction sent:", approveHash);
         
         await publicClient?.waitForTransactionReceipt({ hash: approveHash });
         console.log("[Swap Approval] Approval confirmed");
         
         // Wait for state update
         await new Promise((resolve) => setTimeout(resolve, 1000));
         
         setProgressSteps((prev) =>
           prev.map((s) =>
             s.id === "approveSwap" ? { ...s, status: "completed", txHash: approveHash } : s
           )
         );
       } else {
         console.log(`[Swap Approval] Sufficient allowance already exists, skipping approval`);
         setProgressSteps((prev) =>
           prev.map((s) =>
             s.id === "approveSwap" ? { ...s, status: "completed" } : s
           )
         );
       }
     }
     
     // Step 2: Now get swap transaction data from ParaSwap (allowance is now sufficient)
     const swapTx = await getDefiLlamaSwapTx(
       fromTokenForSwap,
       swapTargetToken as any,
       amountBigInt,
       address,
       slippageTolerance, // User's selected slippage tolerance
       selectedTokenDecimals,
       targetTokenDecimals
     );
     
     // Step 3: Execute the swap
     setStep("depositing"); // Use depositing step for swap
     setProgressSteps((prev) =>
       prev.map((s) =>
         s.id === "swap" ? { ...s, status: "in_progress" } : s
       )
     );
     setCurrentStepIndex(steps.findIndex((s) => s.id === "swap"));
     setError(null);
     setTxHash(null);
     
     // Get balance BEFORE swap to calculate the difference after
     let balanceBefore: bigint;
     if (isFxSAVEMarket) {
       // For fxSAVE markets: track USDC balance
       balanceBefore = await publicClient.readContract({
         address: USDC_ADDRESS,
         abi: ERC20_ABI,
         functionName: "balanceOf",
         args: [address],
       }) as bigint;
       console.log(`[Swap] ${targetTokenSymbol} balance before swap:`, {
         balance: balanceBefore.toString(),
         formatted: formatUnits(balanceBefore, targetTokenDecimals),
       });
     } else {
       // For wstETH markets: track ETH balance
       balanceBefore = (await publicClient.getBalance({ address })) as bigint;
       console.log(`[Swap] ${targetTokenSymbol} balance before swap:`, {
         balance: balanceBefore.toString(),
         formatted: formatUnits(balanceBefore, targetTokenDecimals),
       });
     }
     
     // Execute swap using sendTransaction (ParaSwap gives raw tx data, not contract call)
     const swapHash = await sendTransactionAsync({
       to: swapTx.to,
       data: swapTx.data,
       value: swapTx.value, // Use value from ParaSwap
       gas: swapTx.gas,
     });
     
     setTxHash(swapHash);
     console.log("[Swap] Transaction sent, waiting for confirmation:", swapHash);
     
     // Wait for transaction confirmation
     await publicClient?.waitForTransactionReceipt({ hash: swapHash });
     console.log("[Swap] Transaction confirmed, waiting for balance update...");
     
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
     
     console.log(`[Swap] ${targetTokenSymbol} balance after swap:`, {
       balanceBefore: balanceBefore.toString(),
       balanceAfter: balanceAfter.toString(),
       difference: (balanceAfter - balanceBefore).toString(),
       formattedBefore: formatUnits(balanceBefore, targetTokenDecimals),
       formattedAfter: formatUnits(balanceAfter, targetTokenDecimals),
       formattedDifference: formatUnits(balanceAfter - balanceBefore, targetTokenDecimals),
     });
     
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
      console.log("[Swap] Swap complete, now approving USDC for zapper...");
      
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
      console.log("[USDC Approval] Approval transaction sent:", approveHash);
      
      await publicClient?.waitForTransactionReceipt({ hash: approveHash });
      console.log("[USDC Approval] Approval confirmed");
      
      // Give a moment for the blockchain state to update
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Verify the approval was successful
      const allowanceAfterApproval = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, genesisZapAddress as `0x${string}`],
      });
      
      console.log("[USDC Approval] Allowance after approval:", {
        raw: allowanceAfterApproval.toString(),
        formatted: formatUnits(allowanceAfterApproval as bigint, 6),
        required: formatUnits(received, 6),
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
      console.log("[Swap] Swap complete (ETH received, no approval needed)");
    }
    
    setCurrentStepIndex(steps.findIndex((s) => s.id === "deposit"));
  } catch (err: any) {
    console.error("Swap error:", err);
    setError(err.message || "Swap failed. Please try again.");
    setStep("error");
    setProgressSteps((prev) =>
      prev.map((s) =>
        s.id === "swap" ? { ...s, status: "error", error: err.message } : s
      )
    );
    return;
  }
}

// For non-native tokens, check and approve if needed (only for direct deposits, not swaps)
if (!isNativeETH && needsApproval && !needsSwap) {
 setStep("approving");
 setProgressSteps((prev) =>
 prev.map((s) =>
 s.id ==="approve" ? { ...s, status:"in_progress" } : s
 )
 );
 setError(null);
 setTxHash(null);
 const approveHash = await writeContractAsync({
 address: selectedAssetAddress as `0x${string}`,
 abi: ERC20_ABI,
 functionName:"approve",
        args: [allowanceTarget as `0x${string}`, amountBigInt],
 // chainId intentionally omitted to let wallet infer the network
 });
 setTxHash(approveHash);
 await publicClient?.waitForTransactionReceipt({ hash: approveHash });
 await refetchAllowance();

 // Give a moment for the blockchain state to update
 await new Promise((resolve) => setTimeout(resolve, 1000));

 // Force another refetch to ensure we have the latest allowance
 await refetchAllowance();

 setProgressSteps((prev) =>
 prev.map((s, idx) =>
 s.id ==="approve"
 ? { ...s, status:"completed", txHash: approveHash }
 : s
 )
 );
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

    console.log("[Deposit] Starting deposit, checking conditions:", {
      isNativeETH,
      isStETH,
      isUSDC,
      isFXUSD,
      needsSwap,
      useETHZap,
      useUSDCZap,
      needsETHZapAfterSwap,
      genesisZapAddress,
      wstETHAddress,
      swapUsdcAmount: (window as any).__swapUsdcAmount?.toString(),
      swapEthAmount: (window as any).__swapEthAmount?.toString(),
    });

    // Use genesis zap contract for ETH, stETH, USDC, and FXUSD deposits
    let depositHash: `0x${string}`;
    
    // ETH zap: direct ETH deposits OR swapped tokens to ETH (for wstETH markets)
    if ((isNativeETH || needsETHZapAfterSwap) && genesisZapAddress && wstETHAddress) {
      console.log("[Deposit] Taking ETH zap branch");
      
      // Determine ETH amount: direct deposit or from swap
      const ethAmount = needsETHZapAfterSwap 
        ? ((window as any).__swapEthAmount as bigint)
        : amountBigInt;
      
      if (!ethAmount || ethAmount <= 0n) {
        throw new Error("Invalid ETH amount for deposit");
      }
      
      console.log("[Deposit] ETH amount for zap:", {
        raw: ethAmount.toString(),
        formatted: formatUnits(ethAmount, 18),
        source: needsETHZapAfterSwap ? "swap" : "direct",
      });
      
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
      
      console.log("[Deposit] Expected wstETH output:", {
        raw: expectedWstETH.toString(),
        formatted: formatUnits(expectedWstETH as bigint, 18),
      });
      
      // Apply 1% slippage buffer (99% of expected)
      const minWstETHOut = (expectedWstETH * 99n) / 100n;
      
      console.log("[Deposit] Minimum wstETH output (99%):", {
        raw: minWstETHOut.toString(),
        formatted: formatUnits(minWstETHOut, 18),
      });
      
      depositHash = await writeContractAsync({
        address: genesisZapAddress,
        abi: ZAP_ABI,
        functionName:"zapEth",
        args: [address as `0x${string}`, minWstETHOut],
        value: ethAmount,
      });
      
      // Clean up swap amount if used
      if (needsETHZapAfterSwap) {
        delete (window as any).__swapEthAmount;
      }
    } else if (isStETH && useETHZap && genesisZapAddress && wstETHAddress) {
      console.log("[Deposit] Taking stETH zap branch");
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
      
      depositHash = await writeContractAsync({
        address: genesisZapAddress,
        abi: ZAP_ABI,
        functionName:"zapStEth",
        args: [amountBigInt, address as `0x${string}`, minWstETHOut],
      });
    } else if ((isUSDC || needsSwap) && useUSDCZap && genesisZapAddress) {
      console.log("[Deposit] Taking USDC zap branch");
      // Use zapUsdcToGenesis for USDC deposits with slippage protection
      // If this is after a swap, use the USDC amount from swap
      const usdcAmount = needsSwap ? ((window as any).__swapUsdcAmount as bigint) : amountBigInt;
      
      if (!usdcAmount || usdcAmount <= 0n) {
        throw new Error("Invalid USDC amount for deposit");
      }
      
      console.log("[Deposit] USDC amount for zap:", {
        raw: usdcAmount.toString(),
        formatted: formatUnits(usdcAmount, 6),
      });
      
      // Get expected fxSAVE output from USDC amount
      // Contract expects USDC in 18 decimals, so scale from 6 to 18
      const usdcAmountScaled = usdcAmount * 10n ** 12n;
      
      console.log("[Deposit] USDC amount scaled to 18 decimals:", {
        raw: usdcAmountScaled.toString(),
        formatted: formatUnits(usdcAmountScaled, 18),
      });
      
      const expectedFxSaveOut = await publicClient.readContract({
        address: genesisZapAddress,
        abi: USDC_ZAP_ABI,
        functionName: "previewZapUsdc",
        args: [usdcAmountScaled],
      });
      
      console.log("[Deposit] Expected fxSAVE output:", {
        raw: expectedFxSaveOut.toString(),
        formatted: formatUnits(expectedFxSaveOut as bigint, 18),
      });
      
      // Apply 1% slippage buffer (99% of expected)
      const minFxSaveOut = (expectedFxSaveOut * 99n) / 100n;
      
      console.log("[Deposit] Minimum fxSAVE output (99%):", {
        raw: minFxSaveOut.toString(),
        formatted: formatUnits(minFxSaveOut, 18),
      });
      
      // IMPORTANT: Pass USDC in native 6 decimals (usdcAmount), not scaled
      // The preview function uses 18 decimals for calculation, but the actual
      // zap function expects native USDC decimals and does internal scaling
      depositHash = await writeContractAsync({
        address: genesisZapAddress,
        abi: USDC_ZAP_ABI,
        functionName: "zapUsdcToGenesis",
        args: [usdcAmount, minFxSaveOut, address as `0x${string}`],
      });
      
      // Clean up swap amount
      if (needsSwap) {
        delete (window as any).__swapUsdcAmount;
      }
    } else if (isFXUSD && useUSDCZap && genesisZapAddress) {
      console.log("[Deposit] Taking FXUSD zap branch");
      // Use zapFxUsdToGenesis for FXUSD deposits with slippage protection
      // Get expected fxSAVE output from FXUSD amount
      const expectedFxSaveOut = await publicClient.readContract({
        address: genesisZapAddress,
        abi: USDC_ZAP_ABI,
        functionName: "previewZapFxUsd",
        args: [amountBigInt],
      });
      
      // Apply 1% slippage buffer (99% of expected)
      const minFxSaveOut = (expectedFxSaveOut * 99n) / 100n;
      
      depositHash = await writeContractAsync({
        address: genesisZapAddress,
        abi: USDC_ZAP_ABI,
        functionName: "zapFxUsdToGenesis",
        args: [amountBigInt, minFxSaveOut, address as `0x${string}`],
      });
    } else {
      console.log("[Deposit] Taking standard genesis deposit branch");
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
    console.error("Failed to read actual deposit amount:", err);
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
 console.error("Full transaction error object:", err);
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
 console.error("RPC Error details:", {
 code: rpcCode,
 message: errObj.message,
 shortMessage: errObj.shortMessage,
 name: errObj.name,
 data: errObj.data,
 });

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

 // Log detailed error information for debugging
 if (process.env.NODE_ENV ==="development") {
 console.error("Error details:", {
 error: err,
 errorMessage,
 type: err?.constructor?.name,
 stack: err instanceof Error ? err.stack : undefined,
 });
 }

 setError(errorMessage);
 setStep("error");
 setProgressSteps((prev) =>
 prev.map((s, idx) =>
 idx === currentStepIndex
 ? { ...s, status:"error", error: errorMessage }
 : s
 )
 );
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
 return needsApproval ?"Approve & Deposit" :"Deposit";
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
 <select
 value={selectedAsset}
 onChange={(e) => {
   const newValue = e.target.value;
   if (newValue === "custom") {
     setShowCustomTokenInput(true);
     setSelectedAsset("custom");
   } else {
     setShowCustomTokenInput(false);
     setSelectedAsset(newValue);
     setCustomTokenAddress("");
   }
 }}
 className="w-full h-12 px-4 bg-white text-[#1E4775] border border-[#1E4775]/30 focus:border-[#1E4775] focus:ring-2 focus:ring-[#1E4775]/20 focus:outline-none transition-all text-lg font-mono"
 disabled={
   step ==="approving" ||
   step ==="depositing" ||
   genesisEnded
 }
 >
   {/* Accepted assets */}
   {acceptedAssets.map((asset) => (
     <option key={asset.symbol} value={asset.symbol}>
       {asset.name} ({asset.symbol})
     </option>
   ))}
   
   {/* User tokens (if any) */}
   {userTokens.length > 0 && (
     <>
       <option disabled>--- Your Tokens ---</option>
       {userTokens
         .filter(token => !acceptedAssets.some(a => a.symbol.toUpperCase() === token.symbol.toUpperCase()))
         .map((token) => (
           <option key={token.symbol} value={token.symbol}>
             {token.name} ({token.symbol}) - {token.balanceFormatted}
           </option>
         ))}
     </>
   )}
   
   {/* Custom token option */}
   <option value="custom">+ Add Custom Token Address</option>
 </select>
 
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
 className={`w-full h-12 px-4 pr-20 bg-white text-[#1E4775] border ${
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
       <span className="text-blue-700">Swap via ParaSwap:</span>
       <span className="font-mono text-blue-900">{formatUnits(swapQuote.toAmount, targetDecimals)} {targetToken}</span>
     </div>
     <div className="flex items-center justify-between">
       <span className="text-blue-700">Slippage Tolerance:</span>
       {showSlippageInput ? (
         <div className="flex items-center gap-1">
           <input
             type="number"
             step="0.1"
             min="0.1"
             max="50"
             value={slippageTolerance}
             onChange={(e) => {
               const val = parseFloat(e.target.value);
               if (!isNaN(val) && val >= 0.1 && val <= 50) {
                 setSlippageTolerance(val);
               }
             }}
             onBlur={() => setShowSlippageInput(false)}
             onKeyDown={(e) => {
               if (e.key === 'Enter' || e.key === 'Escape') {
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
           onClick={() => setShowSlippageInput(true)}
           className="font-mono text-blue-900 hover:text-blue-600 underline decoration-dotted cursor-pointer"
         >
           {slippageTolerance.toFixed(1)}%
         </button>
       )}
     </div>
     <div className="flex items-center justify-between">
       <span className="text-blue-700">ParaSwap Fee:</span>
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
  // For tokens that need conversion (ETH, stETH, USDC, FXUSD) or swapping, use actualCollateralDeposit
  // For direct deposits (wstETH, fxSAVE), use amountBigInt
  const depositAmt = (isNativeETH || isStETH || isUSDC || isFXUSD || needsSwap) ? actualCollateralDeposit : amountBigInt;
  // For deposit display, show the amount being deposited
  // Display in wrapped collateral symbol since that's what gets stored
  // Use wrapped token price (collateralPriceUSD) since depositAmt is in wrapped collateral tokens
  const displaySymbol = wrappedCollateralSymbol || collateralSymbol;
  const depositFmt = formatTokenAmount(depositAmt, displaySymbol, collateralPriceUSD);
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-[#1E4775]/70">+ Deposit Amount:</span>
 <span className="text-[#1E4775]">
        {depositAmt > 0n ? (
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
  const depositAmt = (isNativeETH || isStETH || isUSDC || isFXUSD || needsSwap) ? actualCollateralDeposit : amountBigInt;
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
 {needsApproval &&
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
              <h2 className="text-lg sm:text-2xl font-bold text-[#1E4775]">
                Deposit in Maiden Voyage
              </h2>
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
