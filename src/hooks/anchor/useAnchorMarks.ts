import { useMemo, useState, useEffect } from "react";
import { useAnchorLedgerMarks } from "@/hooks/useAnchorLedgerMarks";
import { useGenesisMarks } from "@/hooks/useGenesisMarks";
import { useAccount } from "wagmi";

/**
 * Hook to calculate anchor marks (total marks and marks per day)
 * 
 * @param anchorMarkets - Array of [marketId, market] tuples
 * @param allMarketContracts - All contract read configurations
 * @param reads - Contract read results
 * @returns Total anchor marks, marks per day, and loading state
 */
export function useAnchorMarks(
  anchorMarkets: Array<[string, any]>,
  allMarketContracts: any[] | undefined,
  reads: any
) {
  const { address } = useAccount();

  // Fetch anchor ledger marks with real-time estimation (ha tokens + stability pools only, excluding sail tokens)
  const {
    haBalances,
    poolDeposits,
    sailBalances,
    loading: isLoadingAnchorMarks,
    error: anchorLedgerMarksError,
  } = useAnchorLedgerMarks();

  // Calculate sail marks per day
  const sailMarksPerDay = useMemo(() => {
    if (!sailBalances) return 0;
    return sailBalances.reduce((sum, balance) => sum + balance.marksPerDay, 0);
  }, [sailBalances]);

  // Genesis/maiden voyage marks per day via hook
  const {
    marksPerDay: maidenVoyageMarksPerDay,
    isLoading: isLoadingGenesisMarks,
  } = useGenesisMarks(address);

  // Recalculate anchor marks per day using actual peggedTokenPrice from minter contract
  // Also recalculate totalAnchorMarks directly from haBalances and poolDeposits for real-time updates
  // Use useState + useEffect to ensure component re-renders when marks change every second
  const [totalAnchorMarksState, setTotalAnchorMarksState] = useState(0);

  // Update marks state whenever arrays change (they update every second via currentTime in the hook)
  useEffect(() => {
    // Recalculate total marks directly from arrays (which update every second)
    let totalMarks = 0;
    if (haBalances) {
      haBalances.forEach((balance) => {
        totalMarks += balance.estimatedMarks;
      });
    }
    if (poolDeposits) {
      poolDeposits.forEach((deposit) => {
        totalMarks += deposit.estimatedMarks;
      });
    }

    setTotalAnchorMarksState(totalMarks);
  }, [haBalances, poolDeposits]);

  const { totalAnchorMarks, totalAnchorMarksPerDay } = useMemo(() => {
    const totalMarks = totalAnchorMarksState;
    let totalPerDay = 0;

    // Create a map of pegged token address to peggedTokenPrice
    // Find peggedTokenPrice by matching contract address and functionName in allMarketContracts
    const tokenToPriceMap = new Map<string, bigint | undefined>();
    if (allMarketContracts && reads) {
      anchorMarkets.forEach(([_, m]) => {
        const peggedTokenAddress = (m as any).addresses?.peggedToken as
          | string
          | undefined;
        const minterAddress = (m as any).addresses?.minter as
          | string
          | undefined;
        if (peggedTokenAddress && minterAddress) {
          // Find the peggedTokenPrice read by matching minter address and functionName
          const peggedTokenPriceIndex = allMarketContracts.findIndex(
            (contract, index) =>
              contract.address?.toLowerCase() === minterAddress.toLowerCase() &&
              contract.functionName === "peggedTokenPrice" &&
              reads[index]?.status === "success"
          );
          const peggedTokenPrice =
            peggedTokenPriceIndex >= 0 &&
            reads[peggedTokenPriceIndex]?.status === "success"
              ? (reads[peggedTokenPriceIndex].result as bigint)
              : undefined;
          tokenToPriceMap.set(
            peggedTokenAddress.toLowerCase(),
            peggedTokenPrice
          );
        }
      });
    }

    // Add ha token marks - recalculate marksPerDay using actual peggedTokenPrice
    if (haBalances) {
      haBalances.forEach((balance) => {
        // Recalculate marksPerDay using actual peggedTokenPrice
        const peggedTokenPrice = tokenToPriceMap.get(
          balance.tokenAddress.toLowerCase()
        );
        if (peggedTokenPrice) {
          // peggedTokenPrice is in 18 decimals, where 1e18 = $1.00 normally
          // But for tokens pegged to ETH/BTC, it will be different
          const peggedPriceUSD = Number(peggedTokenPrice) / 1e18;
          const balanceNum = parseFloat(balance.balance);
          const balanceUSD = balanceNum * peggedPriceUSD;
          // 1 mark per dollar per day
          totalPerDay += balanceUSD;
        } else {
          // Fallback to subgraph value if we can't find the price
          totalPerDay += balance.marksPerDay;
        }
      });
    }

    // Add stability pool marks - recalculate marksPerDay using actual peggedTokenPrice
    if (poolDeposits) {
      poolDeposits.forEach((deposit) => {
        // For stability pools, we need to find which market this pool belongs to
        // and get the peggedTokenPrice for that market
        let poolPeggedTokenPrice: bigint | undefined;
        anchorMarkets.forEach(([_, m]) => {
          const collateralPool = (
            m as any
          ).addresses?.stabilityPoolCollateral?.toLowerCase();
          const sailPool = (
            m as any
          ).addresses?.stabilityPoolLeveraged?.toLowerCase();
          if (
            deposit.poolAddress.toLowerCase() === collateralPool ||
            deposit.poolAddress.toLowerCase() === sailPool
          ) {
            const peggedTokenAddress = (m as any).addresses?.peggedToken as
              | string
              | undefined;
            if (peggedTokenAddress) {
              poolPeggedTokenPrice = tokenToPriceMap.get(
                peggedTokenAddress.toLowerCase()
              );
            }
          }
        });

        if (poolPeggedTokenPrice) {
          // Stability pool deposits are in ha tokens, so use peggedTokenPrice
          const peggedPriceUSD = Number(poolPeggedTokenPrice) / 1e18;
          const balanceNum = parseFloat(deposit.balance);
          const balanceUSD = balanceNum * peggedPriceUSD;
          // 1 mark per dollar per day
          totalPerDay += balanceUSD;
        } else {
          // Fallback to subgraph value if we can't find the price
          totalPerDay += deposit.marksPerDay;
        }
      });
    }

    return {
      totalAnchorMarks: totalMarks,
      totalAnchorMarksPerDay: totalPerDay,
    };
  }, [
    totalAnchorMarksState,
    haBalances,
    poolDeposits,
    anchorMarkets,
    allMarketContracts,
    reads,
  ]);

  // Calculate total marks per day (after totalAnchorMarksPerDay is defined)
  const totalMarksPerDay = useMemo(() => {
    return totalAnchorMarksPerDay + sailMarksPerDay + maidenVoyageMarksPerDay;
  }, [totalAnchorMarksPerDay, sailMarksPerDay, maidenVoyageMarksPerDay]);

  return {
    totalAnchorMarks,
    totalAnchorMarksPerDay,
    totalMarksPerDay,
    sailMarksPerDay,
    maidenVoyageMarksPerDay,
    isLoading: isLoadingAnchorMarks || isLoadingGenesisMarks,
    error: anchorLedgerMarksError,
    haBalances,
    poolDeposits,
    sailBalances,
  };
}

