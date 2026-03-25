import { useMemo } from "react";
import { useAccount, useContractReads } from "wagmi";
import type { AnchorContractReads, AnchorMarketTuple } from "@/types/anchor";
import type { DefinedMarket } from "@/config/markets";
import { POLLING_INTERVALS } from "@/config/polling";
import { aprABI } from "@/abis/apr";
import { rewardsABI } from "@/abis/rewards";
import { 
  STABILITY_POOL_ABI, 
  MINTER_ABI,
  STABILITY_POOL_MANAGER_ABI,
  WRAPPED_PRICE_ORACLE_ABI,
} from "@/abis/shared";


/**
 * Hook to build and execute all contract reads for anchor markets
 * 
 * @param anchorMarkets - Array of [marketId, market] tuples
 * @param useAnvil - Whether to use anvil-specific polling
 * @returns Contract read results and refetch function
 */
export function useAnchorContractReads(
  anchorMarkets: AnchorMarketTuple[],
  useAnvil: boolean = false,
  options?: { enabled?: boolean }
) {
  const enabledOverride = options?.enabled ?? true;
  const { address } = useAccount();

  // Build all contract reads for all markets
  const allMarketContracts = useMemo(() => {
    return anchorMarkets.flatMap(([_, m]) => {
      const mktChainId = (m as DefinedMarket & { chainId?: number }).chainId ?? 1;
      const minter = m.addresses?.minter as `0x${string}` | undefined;
      const collateralStabilityPool = m.addresses
        ?.stabilityPoolCollateral as `0x${string}` | undefined;
      const sailStabilityPool = m.addresses?.stabilityPoolLeveraged as
        | `0x${string}`
        | undefined;

      if (
        !minter ||
        typeof minter !== "string" ||
        !minter.startsWith("0x") ||
        minter.length !== 42
      )
        return [];

      const stabilityPoolManager = m.addresses
        ?.stabilityPoolManager as `0x${string}` | undefined;

      const contracts = [
        {
          address: minter,
          abi: MINTER_ABI,
          functionName: "collateralRatio" as const,
          chainId: mktChainId,
        },
        {
          address: minter,
          abi: MINTER_ABI,
          functionName: "collateralTokenBalance" as const,
          chainId: mktChainId,
        },
        {
          address: minter,
          abi: MINTER_ABI,
          functionName: "peggedTokenBalance" as const,
          chainId: mktChainId,
        },
        {
          address: minter,
          abi: MINTER_ABI,
          functionName: "peggedTokenPrice" as const,
          chainId: mktChainId,
        },
        {
          address: minter,
          abi: MINTER_ABI,
          functionName: "leveragedTokenBalance" as const,
          chainId: mktChainId,
        },
        {
          address: minter,
          abi: MINTER_ABI,
          functionName: "leveragedTokenPrice" as const,
          chainId: mktChainId,
        },
        {
          address: minter,
          abi: MINTER_ABI,
          functionName: "config" as const,
          chainId: mktChainId,
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
          abi: STABILITY_POOL_MANAGER_ABI as any,
          functionName: "rebalanceThreshold" as any,
          chainId: mktChainId,
        } as any);
      }

      // Add collateral stability pool data
      const peggedTokenAddress = m.addresses?.peggedToken as
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
            abi: STABILITY_POOL_ABI as any,
            functionName: "totalAssets" as any,
            chainId: mktChainId,
          } as any,
          {
            address: collateralStabilityPool,
            abi: STABILITY_POOL_ABI as any,
            functionName: "totalAssetSupply" as any,
            chainId: mktChainId,
          } as any,
          {
            address: collateralStabilityPool,
            abi: aprABI as any,
            functionName: "getAPRBreakdown" as any,
            args: address
              ? [address as `0x${string}`]
              : ["0x0000000000000000000000000000000000000000"],
            chainId: mktChainId,
          } as any,
          {
            address: collateralStabilityPool,
            abi: rewardsABI as any,
            functionName: "getClaimableRewards" as any,
            args: address
              ? [address as `0x${string}`]
              : ["0x0000000000000000000000000000000000000000"],
            chainId: mktChainId,
          } as any,
          {
            address: collateralStabilityPool,
            abi: STABILITY_POOL_ABI as any,
            functionName: "assetBalanceOf" as any,
            args: address
              ? [address as `0x${string}`]
              : ["0x0000000000000000000000000000000000000000"],
            chainId: mktChainId,
          } as any
        );
        // Add reward data read for pegged token (fallback APR calculation)
        if (peggedTokenAddress) {
          contracts.push({
            address: collateralStabilityPool,
            abi: STABILITY_POOL_ABI as any,
            functionName: "rewardData" as any,
            args: [peggedTokenAddress],
            chainId: mktChainId,
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
            abi: STABILITY_POOL_ABI as any,
            functionName: "totalAssets" as any,
            chainId: mktChainId,
          } as any,
          {
            address: sailStabilityPool,
            abi: STABILITY_POOL_ABI as any,
            functionName: "totalAssetSupply" as any,
            chainId: mktChainId,
          } as any,
          {
            address: sailStabilityPool,
            abi: aprABI as any,
            functionName: "getAPRBreakdown" as any,
            args: address
              ? [address as `0x${string}`]
              : ["0x0000000000000000000000000000000000000000"],
            chainId: mktChainId,
          } as any,
          {
            address: sailStabilityPool,
            abi: rewardsABI as any,
            functionName: "getClaimableRewards" as any,
            args: address
              ? [address as `0x${string}`]
              : ["0x0000000000000000000000000000000000000000"],
            chainId: mktChainId,
          } as any,
          {
            address: sailStabilityPool,
            abi: STABILITY_POOL_ABI as any,
            functionName: "assetBalanceOf" as any,
            args: address
              ? [address as `0x${string}`]
              : ["0x0000000000000000000000000000000000000000"],
            chainId: mktChainId,
          } as any
        );
        // Add reward data read for pegged token (fallback APR calculation)
        if (peggedTokenAddress) {
          contracts.push({
            address: sailStabilityPool,
            abi: STABILITY_POOL_ABI as any,
            functionName: "rewardData" as any,
            args: [peggedTokenAddress],
            chainId: mktChainId,
          } as any);
        }
      }

      // Add collateral price oracle data for USD calculations
      const collateralPriceOracle = m.addresses?.collateralPrice as
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
          abi: WRAPPED_PRICE_ORACLE_ABI as any,
          functionName: "latestAnswer" as any,
          chainId: mktChainId,
        } as any);

        // For fxUSD markets, also call getPrice() to get fxSAVE price in ETH
        if (isFxUSDMarket) {
          contracts.push({
            address: collateralPriceOracle,
            abi: WRAPPED_PRICE_ORACLE_ABI as any,
            functionName: "getPrice" as any,
            chainId: mktChainId,
          } as any);
        }
      }

      return contracts;
    });
  }, [anchorMarkets, address]);

  const wagmiMarketReads = useContractReads({
    contracts: allMarketContracts as any,
    query: {
      enabled: enabledOverride && anchorMarkets.length > 0 && !useAnvil,
      retry: 1,
      retryOnMount: false,
      allowFailure: true, // Multi-chain: some reads may fail (e.g. wrong chain); still return partial results
      staleTime: 30_000, // 30 seconds - consider data fresh for 30s to prevent unnecessary refetches
      gcTime: 300_000, // 5 minutes - keep in cache for 5 minutes
      structuralSharing: true, // Only update if values actually changed
    } as any,
  });

  const anvilMarketReads = useContractReads({
    contracts: allMarketContracts as any,
    query: {
      enabled: enabledOverride && anchorMarkets.length > 0 && useAnvil,
      refetchInterval: POLLING_INTERVALS.FAST,
      allowFailure: true,
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

