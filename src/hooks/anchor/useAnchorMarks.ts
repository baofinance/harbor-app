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
    userTotalMarks,
  } = useAnchorLedgerMarks({ enabled: true }); // Enable subgraph queries

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
    let marksFromHa = 0;
    let marksFromPools = 0;
    let marksFromUserTotal = 0;
    
    // If we have individual entity data, use it (more accurate, real-time)
    if (haBalances && haBalances.length > 0) {
      haBalances.forEach((balance) => {
        marksFromHa += balance.estimatedMarks;
      });
      totalMarks += marksFromHa;
    }
    if (poolDeposits && poolDeposits.length > 0) {
      poolDeposits.forEach((deposit) => {
        marksFromPools += deposit.estimatedMarks;
      });
      totalMarks += marksFromPools;
    }
    
    // Use userTotalMarks if available (it's the aggregated value from subgraph)
    // Prefer it over individual entities if it has a higher value, or if individual entities are empty
    if (userTotalMarks) {
      const haTokenMarks = parseFloat(userTotalMarks.haTokenMarks || "0");
      const stabilityPoolMarks = parseFloat(userTotalMarks.stabilityPoolMarks || "0");
      marksFromUserTotal = haTokenMarks + stabilityPoolMarks;
      
      // If we have a lastUpdated timestamp, estimate additional marks since then
      const lastUpdated = parseInt(userTotalMarks.lastUpdated || "0");
      if (lastUpdated > 0) {
        const totalMarksPerDay = parseFloat(userTotalMarks.totalMarksPerDay || "0");
        const currentTime = Math.floor(Date.now() / 1000);
        const secondsSinceUpdate = currentTime - lastUpdated;
        if (secondsSinceUpdate > 0) {
          const daysSinceUpdate = secondsSinceUpdate / 86400;
          marksFromUserTotal += totalMarksPerDay * daysSinceUpdate;
        }
      }
      
      // Use userTotalMarks if individual entities are empty OR if userTotalMarks is significantly higher
      // (This handles cases where individual entities might have stale/incorrect data)
      if (totalMarks === 0 || marksFromUserTotal > totalMarks * 1.1) {
        totalMarks = marksFromUserTotal;
      }
    }

    // Debug logging to track why marks are 0
    const userTotalMarksDebug = userTotalMarks ? {
      haTokenMarks: userTotalMarks.haTokenMarks,
      haTokenMarksNum: parseFloat(userTotalMarks.haTokenMarks || "0"),
      stabilityPoolMarks: userTotalMarks.stabilityPoolMarks,
      stabilityPoolMarksNum: parseFloat(userTotalMarks.stabilityPoolMarks || "0"),
      totalMarks: userTotalMarks.totalMarks,
      totalMarksNum: parseFloat(userTotalMarks.totalMarks || "0"),
      totalMarksPerDay: userTotalMarks.totalMarksPerDay,
      totalMarksPerDayNum: parseFloat(userTotalMarks.totalMarksPerDay || "0"),
      lastUpdated: userTotalMarks.lastUpdated,
      lastUpdatedNum: parseInt(userTotalMarks.lastUpdated || "0"),
    } : null;
    
    console.log("[useAnchorMarks] Total marks calculation:", {
      haBalancesLength: haBalances?.length || 0,
      poolDepositsLength: poolDeposits?.length || 0,
      marksFromHa,
      marksFromPools,
      marksFromUserTotal,
      userTotalMarks: userTotalMarksDebug,
      finalTotalMarks: totalMarks,
      haBalances: haBalances?.map(b => ({
        tokenAddress: b.tokenAddress,
        balance: b.balance,
        estimatedMarks: b.estimatedMarks,
        marksPerDay: b.marksPerDay,
        accumulatedMarks: b.accumulatedMarks,
      })),
      poolDeposits: poolDeposits?.map(d => ({
        poolAddress: d.poolAddress,
        balance: d.balance,
        estimatedMarks: d.estimatedMarks,
        marksPerDay: d.marksPerDay,
        accumulatedMarks: d.accumulatedMarks,
      })),
      totalMarks,
    });

    setTotalAnchorMarksState(totalMarks);
  }, [haBalances, poolDeposits, userTotalMarks]);

    const { totalAnchorMarks, totalAnchorMarksPerDay } = useMemo(() => {
    const totalMarks = totalAnchorMarksState;
    let totalPerDay = 0;
    let perDayFromHaBalances = 0;
    let perDayFromPoolDeposits = 0;

    // Add ha token marks - use balanceUSD from subgraph (1 mark per dollar per day)
    // If balanceUSD is suspiciously low but user has positions, this indicates a subgraph issue
    if (haBalances && haBalances.length > 0) {
      haBalances.forEach((balance) => {
        const balanceUSD = parseFloat(balance.balanceUSD || "0");
        const balanceNum = parseFloat(balance.balance || "0");
        
        // Check if user has a position but subgraph balanceUSD is suspiciously low
        // This indicates the subgraph doesn't have proper prices for this token
        if (balanceNum > 0 && balanceUSD < 0.01) {
          console.warn(`[useAnchorMarks] Subgraph data issue: User has ${balanceNum} tokens but balanceUSD is only $${balanceUSD}. Subgraph may not have proper prices for token ${balance.tokenAddress}`);
        }
        
        // Debug: Log subgraph balanceUSD for comparison with frontend
        if (balanceUSD > 0) {
          console.log(`[useAnchorMarks] Subgraph balanceUSD for token ${balance.tokenAddress}: $${balanceUSD.toFixed(4)} (balance: ${balanceNum})`);
          perDayFromHaBalances += balanceUSD;
        }
      });
      totalPerDay += perDayFromHaBalances;
    }

    // Add stability pool marks - use balanceUSD from subgraph (1 mark per dollar per day)
    if (poolDeposits && poolDeposits.length > 0) {
      poolDeposits.forEach((deposit) => {
        const balanceUSD = parseFloat(deposit.balanceUSD || "0");
        const balanceNum = parseFloat(deposit.balance || "0");
        
        // Check if user has a deposit but subgraph balanceUSD is suspiciously low
        if (balanceNum > 0 && balanceUSD < 0.01) {
          console.warn(`[useAnchorMarks] Subgraph data issue: User has ${balanceNum} deposit but balanceUSD is only $${balanceUSD}. Subgraph may not have proper prices for pool ${deposit.poolAddress}`);
        }
        
        // Marks per day = 1 mark per dollar per day, so balanceUSD = marks per day
        if (balanceUSD > 0) {
          perDayFromPoolDeposits += balanceUSD;
        }
      });
      totalPerDay += perDayFromPoolDeposits;
    }

    // Debug logging for marks per day calculation
    console.log("[useAnchorMarks] Marks per day calculation:", {
      totalMarks,
      totalPerDay,
      haBalancesLength: haBalances?.length || 0,
      poolDepositsLength: poolDeposits?.length || 0,
      perDayFromHaBalances,
      perDayFromPoolDeposits,
      userTotalMarks: userTotalMarks ? {
        totalMarksPerDay: userTotalMarks.totalMarksPerDay,
        haTokenMarks: userTotalMarks.haTokenMarks,
        stabilityPoolMarks: userTotalMarks.stabilityPoolMarks,
      } : null,
      haBalances: haBalances?.map(b => ({
        tokenAddress: b.tokenAddress,
        balanceUSD: b.balanceUSD,
        marksPerDay: b.marksPerDay,
      })),
      poolDeposits: poolDeposits?.map(d => ({
        poolAddress: d.poolAddress,
        balanceUSD: d.balanceUSD,
        marksPerDay: d.marksPerDay,
      })),
    });

    return {
      totalAnchorMarks: totalMarks,
      totalAnchorMarksPerDay: totalPerDay,
    };
  }, [
    totalAnchorMarksState,
    haBalances,
    poolDeposits,
    userTotalMarks,
  ]);

  // Calculate total marks per day (after totalAnchorMarksPerDay is defined)
  const totalMarksPerDay = useMemo(() => {
    return totalAnchorMarksPerDay + sailMarksPerDay + maidenVoyageMarksPerDay;
  }, [totalAnchorMarksPerDay, sailMarksPerDay, maidenVoyageMarksPerDay]);

  // Detect if user has positions but subgraph data is incorrect
  const subgraphDataError = useMemo(() => {
    // Check if user has ha token positions but balanceUSD is suspiciously low
    const hasHaTokenPositions = haBalances && haBalances.some(b => {
      const balanceNum = parseFloat(b.balance || "0");
      return balanceNum > 0;
    });
    
    const hasLowHaTokenUSD = haBalances && haBalances.some(b => {
      const balanceNum = parseFloat(b.balance || "0");
      const balanceUSD = parseFloat(b.balanceUSD || "0");
      return balanceNum > 0 && balanceUSD < 0.01;
    });
    
    // Check if user has pool deposits but balanceUSD is suspiciously low
    const hasPoolDeposits = poolDeposits && poolDeposits.some(d => {
      const balanceNum = parseFloat(d.balance || "0");
      return balanceNum > 0;
    });
    
    const hasLowPoolUSD = poolDeposits && poolDeposits.some(d => {
      const balanceNum = parseFloat(d.balance || "0");
      const balanceUSD = parseFloat(d.balanceUSD || "0");
      return balanceNum > 0 && balanceUSD < 0.01;
    });
    
    // If user has positions but subgraph balanceUSD is suspiciously low, there's a data issue
    if ((hasHaTokenPositions && hasLowHaTokenUSD) || (hasPoolDeposits && hasLowPoolUSD)) {
      return new Error("Subgraph is returning incorrect price data. Your positions are detected but USD values are missing or incorrect. Please try refreshing the page.");
    }
    
    return null;
  }, [haBalances, poolDeposits]);

  // Combine subgraph data error with any existing errors
  const combinedError = anchorLedgerMarksError || subgraphDataError;

  return {
    totalAnchorMarks,
    totalAnchorMarksPerDay,
    totalMarksPerDay,
    sailMarksPerDay,
    maidenVoyageMarksPerDay,
    isLoading: isLoadingAnchorMarks || isLoadingGenesisMarks,
    error: combinedError,
    haBalances,
    poolDeposits,
    sailBalances,
  };
}

