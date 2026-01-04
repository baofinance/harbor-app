import { useState, useMemo } from "react";
import { useAccount, usePublicClient, useWriteContract, useContractRead } from "wagmi";
import { parseEther, parseUnits, formatUnits, formatEther } from "viem";
import { useUserTokens } from "./useUserTokens";
import { useTokenDecimals } from "./useUserTokens";
import { useDefiLlamaSwap, getDefiLlamaSwapTx } from "./useDefiLlamaSwap";
import { ERC20_ABI } from "@/config/contracts";
import { ZAP_ABI, USDC_ZAP_ABI, WSTETH_ABI } from "@/abis";

/**
 * Hook for handling "any token" deposits with automatic swapping and zapping
 * Supports deposits from any token in user's wallet
 * 
 * Flow:
 * 1. User selects any token from their wallet
 * 2. If token is not directly accepted by market:
 *    - Swap to intermediate token (ETH for wstETH markets, USDC for fxSAVE markets)
 * 3. Use zap contracts for efficient conversion to collateral
 * 4. Execute deposit to target contract (Genesis, Minter, or Stability Pool)
 */

interface UseAnyTokenDepositOptions {
  // Market configuration
  collateralSymbol: string; // e.g., "wstETH", "fxSAVE"
  marketAddresses?: {
    collateralToken?: string;
    wrappedCollateralToken?: string;
    genesisZap?: string; // Zap contract for this market
    priceOracle?: string;
  };
  
  // Accepted assets (tokens that can be deposited directly without swap)
  acceptedAssets: Array<{ symbol: string; name: string }>;
  
  // Deposit target
  depositTarget: {
    type: "genesis" | "minter" | "stability-pool";
    address: string;
    // Additional params based on type
    minterParams?: {
      minPeggedOut: bigint;
      receiver: `0x${string}`;
    };
    stabilityPoolParams?: {
      receiver: `0x${string}`;
      frontEndTag: bigint;
    };
  };
  
  // Control when hook is active
  enabled?: boolean;
}

interface TokenInfo {
  symbol: string;
  name: string;
  address: string | null;
  isNative: boolean; // true for ETH
  isUserToken: boolean; // true if from user's wallet
  balance?: bigint;
}

export function useAnyTokenDeposit(options: UseAnyTokenDepositOptions) {
  const {
    collateralSymbol,
    marketAddresses,
    acceptedAssets,
    depositTarget,
    enabled = true,
  } = options;

  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  // State
  const [selectedAsset, setSelectedAsset] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [customTokenAddress, setCustomTokenAddress] = useState<string>("");

  // Get user's tokens with balances
  const { tokens: userTokens, isLoading: isLoadingUserTokens } = useUserTokens();

  // Determine market type
  const isWstETHMarket = collateralSymbol.toLowerCase() === "wsteth";
  const isFxSAVEMarket = !isWstETHMarket;

  // Get zap address
  const zapAddress = marketAddresses?.genesisZap as `0x${string}` | undefined;

  // Map asset symbol to address
  const getAssetAddress = (assetSymbol: string): string | null => {
    const normalized = assetSymbol.toLowerCase();

    // Native ETH
    if (normalized === "eth") {
      return "0x0000000000000000000000000000000000000000";
    }

    // Custom token
    if (normalized === "custom" && customTokenAddress) {
      return customTokenAddress;
    }

    // Check user tokens first
    const userToken = userTokens.find(
      (t) => t.symbol.toUpperCase() === assetSymbol.toUpperCase()
    );
    if (userToken && userToken.address !== "ETH") {
      return userToken.address;
    }

    // Collateral token
    if (normalized === collateralSymbol.toLowerCase()) {
      return marketAddresses?.wrappedCollateralToken || marketAddresses?.collateralToken || null;
    }

    // Common tokens - use hardcoded mainnet addresses
    if (normalized === "usdc") {
      return "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    }
    if (normalized === "steth") {
      return "0xae7ab96520de3a18e5e111b5eaab095312d7fe84";
    }
    if (normalized === "wsteth") {
      return "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0"; // Mainnet wstETH
    }
    if (normalized === "fxusd") {
      return "0x085780639CC2cACd35E474e71f4d000e2405d8f6"; // Mainnet fxUSD
    }
    if (normalized === "fxsave") {
      return "0x7743e50F534a7f9F1791DdE7dCD89F7783Eefc39"; // Mainnet fxSAVE
    }

    return null;
  };

  const selectedAssetAddress = getAssetAddress(selectedAsset);
  const isNativeETH = selectedAsset.toLowerCase() === "eth";
  const isStETH = selectedAsset.toLowerCase() === "steth";
  const isUSDC = selectedAsset.toLowerCase() === "usdc";
  const isFXUSD = selectedAsset.toLowerCase() === "fxusd";
  const isFXSAVE = selectedAsset.toLowerCase() === "fxsave";

  // Determine if token is directly accepted by market
  const isDirectlyAccepted =
    (isFxSAVEMarket && (isUSDC || isFXUSD || isFXSAVE)) ||
    (isWstETHMarket &&
      (isNativeETH || isStETH || selectedAsset.toLowerCase() === "wsteth"));

  // Check if swap is needed
  const hasValidTokenAddress =
    isNativeETH ||
    (selectedAssetAddress && selectedAssetAddress !== "0x0000000000000000000000000000000000000000");
  const needsSwap = !isDirectlyAccepted && hasValidTokenAddress && selectedAsset !== "";

  // Determine swap target
  const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as `0x${string}`;
  const ETH_ADDRESS = "ETH" as const;
  const swapTargetToken = isFxSAVEMarket ? USDC_ADDRESS : ETH_ADDRESS;
  const PARASWAP_TOKEN_TRANSFER_PROXY = "0x216b4b4ba9f3e719726886d34a177484278bfcae" as `0x${string}`;

  // Determine zap type
  const useETHZap = isWstETHMarket && (isNativeETH || isStETH || needsSwap);
  const useUSDCZap = isFxSAVEMarket && (isUSDC || isFXUSD || needsSwap);

  // Get token decimals for swap quote
  const isCustomToken =
    selectedAsset === "custom" &&
    customTokenAddress &&
    customTokenAddress.startsWith("0x") &&
    customTokenAddress.length === 42;
  const tokenAddressForDecimals = isNativeETH
    ? undefined
    : isCustomToken
    ? (customTokenAddress as `0x${string}` | undefined)
    : (selectedAssetAddress as `0x${string}` | undefined);
  const { decimals: tokenDecimals } = useTokenDecimals(tokenAddressForDecimals);

  // Fetch swap quote if needed
  // Use a reasonable amount for quote (1 unit of token, or actual amount if entered)
  const amountForSwapQuote = amount && parseFloat(amount) > 0 ? amount : "1";
  const fromTokenForSwap = isNativeETH ? "ETH" : (selectedAssetAddress as `0x${string}`);
  const toTokenForSwap = swapTargetToken;
  const toTokenDecimals = swapTargetToken === "ETH" ? 18 : 6; // ETH=18, USDC=6
  const {
    data: swapQuote,
    isLoading: isLoadingSwapQuote,
    error: swapQuoteError,
  } = useDefiLlamaSwap(
    fromTokenForSwap,
    toTokenForSwap as any,
    amountForSwapQuote,
    needsSwap && enabled && !!fromTokenForSwap,
    tokenDecimals,
    toTokenDecimals
  );

  // Merge accepted assets with user tokens
  const allAvailableAssets = useMemo(() => {
    const assetMap = new Map<string, TokenInfo>();

    // Add accepted assets first
    acceptedAssets.forEach((asset) => {
      const address = getAssetAddress(asset.symbol);
      assetMap.set(asset.symbol.toUpperCase(), {
        symbol: asset.symbol,
        name: asset.name,
        address,
        isNative: asset.symbol.toLowerCase() === "eth",
        isUserToken: false,
      });
    });

    // Add user tokens (only if they have balance > 0)
    userTokens.forEach((token) => {
      const symbol = token.symbol.toUpperCase();
      if (!assetMap.has(symbol) && token.balance > 0n) {
        assetMap.set(symbol, {
          symbol: token.symbol,
          name: token.name,
          address: token.address === "ETH" ? "0x0000000000000000000000000000000000000000" : token.address,
          isNative: token.address === "ETH",
          isUserToken: true,
          balance: token.balance,
        });
      }
    });

    return Array.from(assetMap.values());
  }, [acceptedAssets, userTokens]);

  // Find user token by symbol or address (case-insensitive)
  const userToken = userTokens.find(
    (t) => {
      const tokenSymbolMatch = t.symbol.toUpperCase() === selectedAsset.toUpperCase();
      const tokenAddressMatch = selectedAssetAddress && 
        t.address !== "ETH" && 
        t.address.toLowerCase() === selectedAssetAddress.toLowerCase();
      return tokenSymbolMatch || tokenAddressMatch;
    }
  );

  // Get balance for selected asset
  // For ETH, use userToken balance. For other tokens, prefer userToken balance but also fetch via contract read as fallback
  // Normalize address to ensure it's valid
  const normalizedAssetAddress = selectedAssetAddress && selectedAssetAddress !== "0x0000000000000000000000000000000000000000"
    ? (selectedAssetAddress.toLowerCase() as `0x${string}`)
    : undefined;
  
  const { data: erc20Balance } = useContractRead({
    address: normalizedAssetAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: enabled && !!address && !!normalizedAssetAddress && !isNativeETH,
      refetchInterval: 5000,
    },
  });

  // Prefer userToken balance (already fetched from useUserTokens) over erc20Balance for better performance
  // For ETH, always use userToken balance. For other tokens, use userToken balance if available, otherwise use erc20Balance
  const balance = isNativeETH 
    ? (userToken?.balance || 0n)
    : (userToken && userToken.balance !== undefined ? userToken.balance : (erc20Balance || 0n));

  // Get allowances (if ERC20 token needs approval)
  const { data: swapAllowance, refetch: refetchSwapAllowance } = useContractRead({
    address: selectedAssetAddress as `0x${string}` | undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, PARASWAP_TOKEN_TRANSFER_PROXY] : undefined,
    query: {
      enabled: enabled && !!address && !!selectedAssetAddress && !isNativeETH && needsSwap,
      refetchInterval: 5000,
    },
  });

  const { data: zapAllowance, refetch: refetchZapAllowance } = useContractRead({
    address: selectedAssetAddress as `0x${string}` | undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && zapAddress ? [address, zapAddress] : undefined,
    query: {
      enabled:
        enabled &&
        !!address &&
        !!selectedAssetAddress &&
        !!zapAddress &&
        !isNativeETH &&
        !needsSwap &&
        (isUSDC || isFXUSD),
      refetchInterval: 5000,
    },
  });

  // Parse amount
  const amountBigInt = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0) return 0n;
    try {
      return tokenDecimals ? parseUnits(amount, tokenDecimals) : parseEther(amount);
    } catch {
      return 0n;
    }
  }, [amount, tokenDecimals]);

  // Check if approvals are needed
  const needsSwapApproval = !isNativeETH && needsSwap && (swapAllowance || 0n) < amountBigInt;
  const needsZapApproval =
    !isNativeETH &&
    !needsSwap &&
    (isUSDC || isFXUSD) &&
    (zapAllowance || 0n) < amountBigInt;

  return {
    // State
    selectedAsset,
    setSelectedAsset,
    amount,
    setAmount,
    customTokenAddress,
    setCustomTokenAddress,

    // Token info
    allAvailableAssets,
    selectedAssetAddress,
    isNativeETH,
    balance,
    tokenDecimals: tokenDecimals || 18,

    // Swap info
    needsSwap,
    swapQuote,
    isLoadingSwapQuote,
    swapQuoteError,
    swapTargetToken,

    // Zap info
    useETHZap,
    useUSDCZap,
    zapAddress,

    // Approvals
    needsSwapApproval,
    needsZapApproval,
    refetchSwapAllowance,
    refetchZapAllowance,

    // Parsed values
    amountBigInt,

    // Loading states
    isLoadingUserTokens,
  };
}

