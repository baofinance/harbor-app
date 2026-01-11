import { useMemo } from "react";
import { useAccount, useContractReads } from "wagmi";
import { POLLING_INTERVALS } from "@/config/polling";
import { aprABI } from "@/abis/apr";
import { rewardsABI } from "@/abis/rewards";
import { 
  STABILITY_POOL_ABI, 
  MINTER_ABI,
  STABILITY_POOL_MANAGER_ABI,
  WRAPPED_PRICE_ORACLE_ABI,
} from "@/abis/shared";

// Use shared ABIs
const stabilityPoolManagerABI = STABILITY_POOL_MANAGER_ABI;
const wrappedPriceOracleABI = WRAPPED_PRICE_ORACLE_ABI;
const minterABI = MINTER_ABI;

const stabilityPoolABI = [
  {
    inputs: [],
    name: "totalAssets",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalAssetSupply",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "token", type: "address" }],
    name: "rewardData",
    outputs: [
      { name: "lastUpdate", type: "uint256" },
      { name: "finishAt", type: "uint256" },
      { name: "rate", type: "uint256" },
      { name: "queued", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Hook to build and execute all contract reads for anchor markets
 * 
 * @param anchorMarkets - Array of [marketId, market] tuples
 * @param useAnvil - Whether to use anvil-specific polling
 * @returns Contract read results and refetch function
 */
export function useAnchorContractReads(
  anchorMarkets: Array<[string, any]>,
  useAnvil: boolean = false
) {
  const { address } = useAccount();

  // Build all contract reads for all markets
  const allMarketContracts = useMemo(() => {
    return anchorMarkets.flatMap(([_, m]) => {
      const minter = (m as any).addresses?.minter as `0x${string}` | undefined;
      const collateralStabilityPool = (m as any).addresses
        ?.stabilityPoolCollateral as `0x${string}` | undefined;
      const sailStabilityPool = (m as any).addresses?.stabilityPoolLeveraged as
        | `0x${string}`
        | undefined;

      if (
        !minter ||
        typeof minter !== "string" ||
        !minter.startsWith("0x") ||
        minter.length !== 42
      )
        return [];

      const stabilityPoolManager = (m as any).addresses
        ?.stabilityPoolManager as `0x${string}` | undefined;

      const contracts = [
        {
          address: minter,
          abi: minterABI,
          functionName: "collateralRatio" as const,
        },
        {
          address: minter,
          abi: minterABI,
          functionName: "collateralTokenBalance" as const,
        },
        {
          address: minter,
          abi: minterABI,
          functionName: "peggedTokenBalance" as const,
        },
        {
          address: minter,
          abi: minterABI,
          functionName: "peggedTokenPrice" as const,
        },
        {
          address: minter,
          abi: minterABI,
          functionName: "leveragedTokenBalance" as const,
        },
        {
          address: minter,
          abi: minterABI,
          functionName: "leveragedTokenPrice" as const,
        },
        {
          address: minter,
          abi: minterABI,
          functionName: "config" as const,
        },
      ];

      // Add rebalanceThreshold from StabilityPoolManager
      if (
        stabilityPoolManager &&
        typeof stabilityPoolManager === "string" &&
        stabilityPoolManager.startsWith("0x") &&
        stabilityPoolManager.length === 42
      ) {
        contracts.push({
          address: stabilityPoolManager,
          abi: stabilityPoolManagerABI as any,
          functionName: "rebalanceThreshold" as any,
        } as any);
      }

      // Add collateral stability pool data
      const peggedTokenAddress = (m as any).addresses?.peggedToken as
        | `0x${string}`
        | undefined;
      if (
        collateralStabilityPool &&
        typeof collateralStabilityPool === "string" &&
        collateralStabilityPool.startsWith("0x") &&
        collateralStabilityPool.length === 42
      ) {
        contracts.push(
          {
            address: collateralStabilityPool,
            abi: stabilityPoolABI as any,
            functionName: "totalAssets" as any,
          } as any,
          {
            address: collateralStabilityPool,
            abi: stabilityPoolABI as any,
            functionName: "totalAssetSupply" as any,
          } as any,
          {
            address: collateralStabilityPool,
            abi: aprABI as any,
            functionName: "getAPRBreakdown" as any,
            args: address
              ? [address as `0x${string}`]
              : ["0x0000000000000000000000000000000000000000"],
          } as any,
          {
            address: collateralStabilityPool,
            abi: rewardsABI as any,
            functionName: "getClaimableRewards" as any,
            args: address
              ? [address as `0x${string}`]
              : ["0x0000000000000000000000000000000000000000"],
          } as any,
          {
            address: collateralStabilityPool,
            abi: STABILITY_POOL_ABI as any,
            functionName: "assetBalanceOf" as any,
            args: address
              ? [address as `0x${string}`]
              : ["0x0000000000000000000000000000000000000000"],
          } as any
        );
        // Add reward data read for pegged token (fallback APR calculation)
        if (peggedTokenAddress) {
          contracts.push({
            address: collateralStabilityPool,
            abi: STABILITY_POOL_ABI as any,
            functionName: "rewardData" as any,
            args: [peggedTokenAddress],
          } as any);
        }
      }

      // Add Sail (leveraged) stability pool data
      if (
        sailStabilityPool &&
        typeof sailStabilityPool === "string" &&
        sailStabilityPool.startsWith("0x") &&
        sailStabilityPool.length === 42
      ) {
        contracts.push(
          {
            address: sailStabilityPool,
            abi: stabilityPoolABI as any,
            functionName: "totalAssets" as any,
          } as any,
          {
            address: sailStabilityPool,
            abi: stabilityPoolABI as any,
            functionName: "totalAssetSupply" as any,
          } as any,
          {
            address: sailStabilityPool,
            abi: aprABI as any,
            functionName: "getAPRBreakdown" as any,
            args: address
              ? [address as `0x${string}`]
              : ["0x0000000000000000000000000000000000000000"],
          } as any,
          {
            address: sailStabilityPool,
            abi: rewardsABI as any,
            functionName: "getClaimableRewards" as any,
            args: address
              ? [address as `0x${string}`]
              : ["0x0000000000000000000000000000000000000000"],
          } as any,
          {
            address: sailStabilityPool,
            abi: STABILITY_POOL_ABI as any,
            functionName: "assetBalanceOf" as any,
            args: address
              ? [address as `0x${string}`]
              : ["0x0000000000000000000000000000000000000000"],
          } as any
        );
        // Add reward data read for pegged token (fallback APR calculation)
        if (peggedTokenAddress) {
          contracts.push({
            address: sailStabilityPool,
            abi: STABILITY_POOL_ABI as any,
            functionName: "rewardData" as any,
            args: [peggedTokenAddress],
          } as any);
        }
      }

      // Add collateral price oracle data for USD calculations
      const collateralPriceOracle = (m as any).addresses?.collateralPrice as
        | `0x${string}`
        | undefined;
      const collateralSymbol = m.collateral?.symbol?.toLowerCase() || "";
      const isFxUSDMarket = collateralSymbol === "fxusd" || collateralSymbol === "fxsave";
      
      if (
        collateralPriceOracle &&
        typeof collateralPriceOracle === "string" &&
        collateralPriceOracle.startsWith("0x") &&
        collateralPriceOracle.length === 42
      ) {
        contracts.push({
          address: collateralPriceOracle,
          abi: wrappedPriceOracleABI as any,
          functionName: "latestAnswer" as any,
        } as any);
        
        // For fxUSD markets, also call getPrice() to get fxSAVE price in ETH
        if (isFxUSDMarket) {
          contracts.push({
            address: collateralPriceOracle,
            abi: wrappedPriceOracleABI as any,
            functionName: "getPrice" as any,
          } as any);
        }
      }

      return contracts;
    });
  }, [anchorMarkets, address]);

  const wagmiMarketReads = useContractReads({
    contracts: allMarketContracts as any,
    query: {
      enabled: anchorMarkets.length > 0 && !useAnvil,
      retry: 1,
      retryOnMount: false,
      staleTime: 30_000, // 30 seconds - consider data fresh for 30s to prevent unnecessary refetches
      gcTime: 300_000, // 5 minutes - keep in cache for 5 minutes
      structuralSharing: true, // Only update if values actually changed
    } as any,
  });

  const anvilMarketReads = useContractReads({
    contracts: allMarketContracts as any,
    query: {
      enabled: anchorMarkets.length > 0 && useAnvil,
      refetchInterval: POLLING_INTERVALS.FAST,
      staleTime: 10_000, // 10 seconds for anvil (shorter since we're polling)
      gcTime: 300_000, // 5 minutes - keep in cache
      structuralSharing: true, // Only update if values actually changed
    } as any,
  });

  const reads = useAnvil ? anvilMarketReads.data : wagmiMarketReads.data;
  const refetchReads = useAnvil
    ? anvilMarketReads.refetch
    : wagmiMarketReads.refetch;

  return {
    reads,
    refetchReads,
    isLoading: useAnvil ? anvilMarketReads.isLoading : wagmiMarketReads.isLoading,
    isError: useAnvil ? anvilMarketReads.isError : wagmiMarketReads.isError,
    error: useAnvil ? anvilMarketReads.error : wagmiMarketReads.error,
  };
}

