import { useState, useMemo, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useAnvilContractReads } from "./useAnvilContractReads";
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

  // Contract reads for all markets - use Anvil-specific reads to ensure we read from Anvil network
  const {
    data: contractData,
    isLoading,
    refetch,
  } = useAnvilContractReads({
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
      // Collateral balance in Genesis contract
      {
        address: market.addresses.collateralToken as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [market.addresses.genesis as `0x${string}`],
      },
      // Collateral token symbol
      {
        address: market.addresses.collateralToken as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "symbol",
      },
    ]),
    enabled: genesisMarkets.length > 0,
  });

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
    if (!contractData || contractData.length === 0) return [];

    return genesisMarkets.map(([marketId, market], index) => {
      const baseIndex = index * 4;
      const genesisEnded =
        (contractData[baseIndex]?.result as boolean) || false;
      const owner = (contractData[baseIndex + 1]?.result as string) || "";
      const totalCollateral =
        (contractData[baseIndex + 2]?.result as bigint) || 0n;
      const collateralSymbol =
        (contractData[baseIndex + 3]?.result as string) || "TOKEN";

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
  }, [contractData, genesisMarkets, address]);

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
