import { useState, useMemo, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useContractReads } from "./useContractReads";
import { markets, getGenesisStatus } from "../config/markets";
import { GENESIS_ABI, ERC20_ABI } from "../config/contracts";

export interface MarketAdminData {
  marketId: string;
  market: (typeof markets)[keyof typeof markets];
  genesisEnded: boolean;
  totalCollateral: bigint;
  collateralSymbol: string;
  isOwner: boolean;
  genesisStatus: ReturnType<typeof getGenesisStatus>;
}

export interface GroupedMarkets {
  active: MarketAdminData[];
  ended: MarketAdminData[];
  scheduled: MarketAdminData[];
  closed: MarketAdminData[];
}

export interface OverallAdminStatus {
  hasAnyAdminAccess: boolean;
  totalActiveMarkets: number;
  totalEndedMarkets: number;
  totalScheduledMarkets: number;
  totalClosedMarkets: number;
  totalCollateralAcrossMarkets: bigint;
}

export function useMultiMarketGenesisAdmin() {
  const { address } = useAccount();
  const { writeContract, isPending, data: hash } = useWriteContract();

  // Get all genesis markets
  const genesisMarkets = Object.entries(markets).filter(
    ([_, market]) => market.status === "genesis" || market.status === "live"
  );

  // Step 1: Read genesis contract data and wrapped collateral token addresses
  const {
    data: genesisData,
    isLoading: isLoadingGenesis,
    refetch: refetchGenesis,
  } = useContractReads({
    contracts: genesisMarkets.flatMap(([id, market]) => [
      // Genesis contract data
      {
        address: market.addresses.genesis as `0x${string}`,
        abi: GENESIS_ABI,
        functionName: "genesisIsEnded",
      },
      {
        address: market.addresses.genesis as `0x${string}`,
        abi: GENESIS_ABI,
        functionName: "owner",
      },
      // Get wrapped collateral token address from genesis contract
      {
        address: market.addresses.genesis as `0x${string}`,
        abi: GENESIS_ABI,
        functionName: "WRAPPED_COLLATERAL_TOKEN",
      },
    ]),
    enabled: genesisMarkets.length > 0,
  });

  // Step 2: Read wrapped collateral token balances and symbols
  const collateralContracts = useMemo(() => {
    if (!genesisData) return [];
    return genesisMarkets.map(([id, market], index) => {
      const baseIndex = index * 3;
      const contractWrappedToken = genesisData[baseIndex + 2]?.result as `0x${string}` | undefined;
      
      // Use on-chain WRAPPED_COLLATERAL_TOKEN from genesis contract (primary source)
      // Fallback to collateralToken from config
      // 
      // Contract WRAPPED_COLLATERAL_TOKEN should return:
      //   - fxSAVE (0x7743...eefc39) for fxUSD markets
      //   - wstETH (0x7f39...2ca0) for stETH market
      // 
      // Config collateralToken (fallback, only works for wstETH):
      //   - fxUSD for fxUSD markets (WRONG - would show 0 balance)
      //   - wstETH for stETH market (CORRECT)
      // 
      // The contract read should always succeed. Fallback is just a safety net.
      const tokenAddress = contractWrappedToken || market.addresses.collateralToken;
      
      return [
        // Wrapped collateral balance in Genesis contract
        {
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "balanceOf" as const,
          args: [market.addresses.genesis as `0x${string}`],
        },
        // Wrapped collateral token symbol
        {
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "symbol" as const,
        },
      ];
    }).flat();
  }, [genesisData, genesisMarkets]);

  const {
    data: collateralData,
    isLoading: isLoadingCollateral,
    refetch: refetchCollateral,
  } = useContractReads({
    contracts: collateralContracts,
    enabled: collateralContracts.length > 0,
  });

  const isLoading = isLoadingGenesis || isLoadingCollateral;
  const refetch = () => {
    refetchGenesis();
    refetchCollateral();
  };

  // Wait for transaction receipt to trigger refetch
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  // Refetch data when transaction is confirmed
  useEffect(() => {
    if (isConfirmed) {
      refetch();
    }
  }, [isConfirmed, refetch]);

  // Process market data
  const marketsAdminData: MarketAdminData[] = useMemo(() => {
    if (!genesisData || genesisData.length === 0) return [];

    return genesisMarkets.map(([marketId, market], index) => {
      const genesisBaseIndex = index * 3;
      const collateralBaseIndex = index * 2;
      
      const genesisEnded =
        (genesisData[genesisBaseIndex]?.result as boolean) || false;
      const owner = (genesisData[genesisBaseIndex + 1]?.result as string) || "";
      const totalCollateral =
        (collateralData?.[collateralBaseIndex]?.result as bigint) || 0n;
      const collateralSymbol =
        (collateralData?.[collateralBaseIndex + 1]?.result as string) || "TOKEN";

      const isOwner =
        address && owner && address.toLowerCase() === owner.toLowerCase();

      // For admin, use contract state directly - ignore config end dates
      // Config dates are just informational about when team plans to end genesis
      const genesisStatus = getGenesisStatus(market, genesisEnded, true);

      return {
        marketId,
        market: {
          ...market,
          title: market.name,
          description: "Genesis Token Generation Event",
        },
        genesisEnded,
        totalCollateral,
        collateralSymbol,
        isOwner: !!isOwner,
        genesisStatus,
      };
    });
  }, [genesisData, collateralData, genesisMarkets, address]);

  // Group markets by status
  const groupedMarkets: GroupedMarkets = useMemo(() => {
    return {
      active: marketsAdminData.filter(
        (m) => m.genesisStatus.onChainStatus === "live"
      ),
      ended: marketsAdminData.filter(
        (m) => m.genesisStatus.onChainStatus === "completed"
      ),
      scheduled: marketsAdminData.filter(
        (m) => m.genesisStatus.onChainStatus === "scheduled"
      ),
      closed: marketsAdminData.filter(
        (m) => m.genesisStatus.onChainStatus === "closed"
      ),
    };
  }, [marketsAdminData]);

  // Overall admin status
  const overallAdminStatus: OverallAdminStatus = useMemo(() => {
    // For development: allow access if no markets are configured or if user is connected
    // In production, this should only be true if user is owner of at least one market
    const hasAnyAdminAccess =
      process.env.NODE_ENV === "development" && genesisMarkets.length === 0
        ? true // Allow access in dev if no markets configured
        : marketsAdminData.some((m) => m.isOwner);
    const totalCollateralAcrossMarkets = marketsAdminData.reduce(
      (total, market) => total + market.totalCollateral,
      0n
    );

    return {
      hasAnyAdminAccess,
      totalActiveMarkets: groupedMarkets.active.length,
      totalEndedMarkets: groupedMarkets.ended.length,
      totalScheduledMarkets: groupedMarkets.scheduled.length,
      totalClosedMarkets: groupedMarkets.closed.length,
      totalCollateralAcrossMarkets,
    };
  }, [marketsAdminData, groupedMarkets]);

  // End genesis function
  const endGenesis = async (marketId: string) => {
    const marketData = marketsAdminData.find((m) => m.marketId === marketId);
    if (!marketData || !marketData.isOwner) {
      throw new Error("Not authorized to end genesis for this market");
    }

    if (marketData.genesisEnded) {
      throw new Error("Genesis has already ended for this market");
    }

    if (marketData.totalCollateral === 0n) {
      throw new Error("No collateral deposited yet");
    }

    try {
      await writeContract({
        address: marketData.market.addresses.genesis as `0x${string}`,
        abi: GENESIS_ABI,
        functionName: "endGenesis",
      });
    } catch (error) {
      console.error("Failed to end genesis:", error);
      throw error;
    }
  };

  return {
    marketsAdminData,
    groupedMarkets,
    overallAdminStatus,
    endGenesis,
    isPending: isPending || isConfirming,
    isLoading,
    refetch,
  };
}
