"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount, usePublicClient } from "wagmi";
import { formatEther } from "viem";
import { getGraphUrl, getGraphHeaders } from "@/config/graph";
import { useState, useEffect, useMemo } from "react";

// GraphQL query for Anchor Ledger Marks (Ha Tokens + Stability Pools + Sail Tokens)
// Also includes userTotalMarks which aggregates all marks sources
const ANCHOR_LEDGER_MARKS_QUERY = `
  query GetAnchorLedgerMarks($userAddress: Bytes!) {
    # Aggregated marks across all sources (includes anchor marks)
    userTotalMarks(id: $userAddress) {
      id
      user
      haTokenMarks
      sailTokenMarks
      stabilityPoolMarks
      totalMarks
      totalMarksPerDay
      lastUpdated
    }
    haTokenBalances(where: { user: $userAddress }) {
      id
      tokenAddress
      balance
      balanceUSD
      accumulatedMarks
      marksPerDay
      lastUpdated
    }
    stabilityPoolDeposits(where: { user: $userAddress }) {
      id
      poolAddress
      poolType
      balance
      balanceUSD
      accumulatedMarks
      marksPerDay
      lastUpdated
    }
    sailTokenBalances(where: { user: $userAddress }) {
      id
      tokenAddress
      balance
      balanceUSD
      accumulatedMarks
      marksPerDay
      lastUpdated
    }
  }
`;

interface MarksEntity {
  accumulatedMarks: string;
  marksPerDay: string;
  lastUpdated: string;
}

interface HaTokenBalance extends MarksEntity {
  id: string;
  tokenAddress: string;
  balance: string;
  balanceUSD: string;
}

interface StabilityPoolDeposit extends MarksEntity {
  id: string;
  poolAddress: string;
  poolType: string;
  balance: string;
  balanceUSD: string;
}

interface SailTokenBalance extends MarksEntity {
  id: string;
  tokenAddress: string;
  balance: string;
  balanceUSD: string;
}

interface UserTotalMarks {
  id: string;
  user: string;
  haTokenMarks: string;
  sailTokenMarks: string;
  stabilityPoolMarks: string;
  totalMarks: string;
  totalMarksPerDay: string;
  lastUpdated: string;
}

interface AnchorLedgerMarksData {
  userTotalMarks: UserTotalMarks | null;
  haTokenBalances: HaTokenBalance[];
  stabilityPoolDeposits: StabilityPoolDeposit[];
  sailTokenBalances: SailTokenBalance[];
}

/**
 * Calculate estimated marks from stored data
 * Zero gas - pure frontend calculation
 *
 * Formula: estimatedMarks = accumulatedMarks + (marksPerDay × daysSinceLastUpdate)
 *
 * - accumulatedMarks: Marks calculated up to the last natural event (transfer/deposit/withdraw)
 * - marksPerDay: Current earning rate (already includes multiplier)
 * - daysSinceLastUpdate: Time elapsed since last event
 *
 * The real-time calculation adds marks earned since the last event to the stored accumulatedMarks.
 * When the next natural event occurs, the subgraph will recalculate and update accumulatedMarks.
 * 
 * @param entity - The marks entity (ha token balance, stability pool deposit, or sail token balance)
 * @param currentTime - Optional current time in seconds (Unix timestamp). If not provided, uses system time.
 *                      Should use blockchain timestamp for accuracy with Anvil chains.
 */
function calculateEstimatedMarks(entity: MarksEntity, currentTime?: number): number {
  const storedMarks = parseFloat(entity.accumulatedMarks || "0");
  const marksPerDay = parseFloat(entity.marksPerDay || "0");
  const lastUpdated = parseInt(entity.lastUpdated || "0");

  // If no data or no earning rate, return stored marks
  if (lastUpdated === 0 || marksPerDay === 0) {
    return storedMarks;
  }

  // Calculate time elapsed since last update
  // Use provided currentTime (chain time) or fallback to system time
  const now = currentTime ?? Math.floor(Date.now() / 1000);
  const secondsSinceUpdate = now - lastUpdated;
  
  // If lastUpdated is in the future or very recent (within 1 second), just return stored marks
  // This handles edge cases where timestamp might be incorrect or the event just happened
  if (secondsSinceUpdate <= 0) {
    return storedMarks;
  }
  
  const daysSinceUpdate = secondsSinceUpdate / 86400;

  // Estimated marks = stored accumulatedMarks + (rate × time since last event)
  // This adds real-time marks to the subgraph's stored value
  const estimated = storedMarks + marksPerDay * daysSinceUpdate;
  
  // Safety check: never return less than stored marks (in case of calculation errors)
  const result = Math.max(estimated, storedMarks);
  
  if (process.env.NODE_ENV === "development" && result < storedMarks) {
    // Estimated marks less than stored, using stored
    // This shouldn't happen, but if it does, we use the stored value
  }
  
  return result;
}

interface UseAnchorLedgerMarksOptions {
  enabled?: boolean;
  graphUrl?: string;
}

export function useAnchorLedgerMarks({
  enabled = false, // Disabled by default - subgraph ran out of funds
  graphUrl = getGraphUrl(),
}: UseAnchorLedgerMarksOptions = {}) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [estimatedMarks, setEstimatedMarks] = useState(0);
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));

  // Update current time every second using blockchain timestamp
  // This ensures we use the chain's time, not system time (important for Anvil)
  useEffect(() => {
    const updateTime = async () => {
      if (publicClient) {
        try {
          const block = await publicClient.getBlock({ blockTag: "latest" });
          if (block.timestamp) {
            const chainTime = Number(block.timestamp);
            const systemTime = Math.floor(Date.now() / 1000);
            setCurrentTime(chainTime);
            if (process.env.NODE_ENV === "development") {
            }
          }
        } catch (error) {
          // Fallback to system time if block read fails
          const systemTime = Math.floor(Date.now() / 1000);
          setCurrentTime(systemTime);
          if (process.env.NODE_ENV === "development") {
          }
        }
      } else {
        // Fallback to system time if no public client
        const systemTime = Math.floor(Date.now() / 1000);
        setCurrentTime(systemTime);
        if (process.env.NODE_ENV === "development") {
        }
      }
    };

    // Initial update
    updateTime();

    // Update every second
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [publicClient]);

  // Fetch from subgraph (poll every 60s for new events)
  // Disabled by default - subgraph ran out of funds
  const { data, isLoading, error } = useQuery<AnchorLedgerMarksData>({
    queryKey: ["anchorLedgerMarks", address],
    enabled: enabled && !!address && isConnected,
    queryFn: async () => {
      if (!address) {
        throw new Error("Address required");
      }

      const queryVariables = {
        userAddress: address.toLowerCase(),
      };
      
      const requestBody = {
        query: ANCHOR_LEDGER_MARKS_QUERY,
        variables: queryVariables,
      };

      const response = await fetch(graphUrl, {
        method: "POST",
        headers: getGraphHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn("[useAnchorLedgerMarks] HTTP error (subgraph may be rate limited or unavailable):", {
          status: response.status,
          statusText: response.statusText,
        });
        // Don't throw - return empty data to allow page to continue loading
        return {
          userTotalMarks: null,
          haTokenBalances: [],
          stabilityPoolDeposits: [],
          sailTokenBalances: [],
        };
      }

      const result = await response.json();

      if (result.errors) {
        console.warn("[useAnchorLedgerMarks] GraphQL errors (subgraph may be rate limited or unavailable):", result.errors);
        // Don't throw - return empty data to allow page to continue loading
        return {
          userTotalMarks: null,
          haTokenBalances: [],
          stabilityPoolDeposits: [],
          sailTokenBalances: [],
        };
      }

      return result.data || { 
        userTotalMarks: null,
        haTokenBalances: [], 
        stabilityPoolDeposits: [], 
        sailTokenBalances: [] 
      };
    },
    enabled: enabled && isConnected && !!address,
    refetchInterval: 60000, // Poll every 60 seconds for new events
    staleTime: 10000,
    retry: false, // Don't retry on failure to avoid hammering rate-limited API
    throwOnError: false, // Don't throw errors - allow page to load with empty data
    onError: (error) => {
      console.warn("[useAnchorLedgerMarks] Query error (page will continue with empty data)");
    },
  });

  // Calculate marks per day
  const marksPerDay = useMemo(() => {
    if (!data) return 0;
    const haRate = (data.haTokenBalances || []).reduce(
      (sum, b) => sum + parseFloat(b.marksPerDay || "0"),
      0
    );
    const poolRate = (data.stabilityPoolDeposits || []).reduce(
      (sum, d) => sum + parseFloat(d.marksPerDay || "0"),
      0
    );
    const sailRate = (data.sailTokenBalances || []).reduce(
      (sum, b) => sum + parseFloat(b.marksPerDay || "0"),
      0
    );
    return haRate + poolRate + sailRate;
  }, [data]);

  // Format ha token balances (recalculates every second via currentTime)
  const haBalances = useMemo(() => {
    if (!data) return [];
    return (data.haTokenBalances || []).map((balance) => {
      // Recalculate estimatedMarks with current time
      const storedMarks = parseFloat(balance.accumulatedMarks || "0");
      const marksPerDay = parseFloat(balance.marksPerDay || "0");
      const lastUpdated = parseInt(balance.lastUpdated || "0");
      
      let estimatedMarks = storedMarks;
      if (lastUpdated > 0 && marksPerDay > 0) {
        const secondsSinceUpdate = currentTime - lastUpdated;
        if (secondsSinceUpdate > 0) {
          const daysSinceUpdate = secondsSinceUpdate / 86400;
          estimatedMarks = storedMarks + marksPerDay * daysSinceUpdate;
          estimatedMarks = Math.max(estimatedMarks, storedMarks);
        }
      }
      
      return {
        id: balance.id,
        tokenAddress: balance.tokenAddress,
        balance: formatEther(BigInt(balance.balance || "0")),
        balanceUSD: parseFloat(balance.balanceUSD || "0"),
        accumulatedMarks: storedMarks,
        estimatedMarks,
        marksPerDay,
        lastUpdated,
      };
    });
  }, [data, currentTime]);

  // Format stability pool deposits (recalculates every second via currentTime)
  const poolDeposits = useMemo(() => {
    if (!data) return [];
    return (data.stabilityPoolDeposits || []).map((deposit) => {
      // Recalculate estimatedMarks with current time
      const storedMarks = parseFloat(deposit.accumulatedMarks || "0");
      const marksPerDay = parseFloat(deposit.marksPerDay || "0");
      const lastUpdated = parseInt(deposit.lastUpdated || "0");
      
      let estimatedMarks = storedMarks;
      if (lastUpdated > 0 && marksPerDay > 0) {
        const secondsSinceUpdate = currentTime - lastUpdated;
        if (secondsSinceUpdate > 0) {
          const daysSinceUpdate = secondsSinceUpdate / 86400;
          estimatedMarks = storedMarks + marksPerDay * daysSinceUpdate;
          estimatedMarks = Math.max(estimatedMarks, storedMarks);
        }
      }
      
      
      return {
        id: deposit.id,
        poolAddress: deposit.poolAddress,
        poolType: deposit.poolType,
        balance: formatEther(BigInt(deposit.balance || "0")),
        balanceUSD: parseFloat(deposit.balanceUSD || "0"),
        accumulatedMarks: storedMarks,
        estimatedMarks,
        marksPerDay,
        lastUpdated,
      };
    });
  }, [data, currentTime]);

  // Format sail token balances (recalculates every second via currentTime)
  const sailBalances = useMemo(() => {
    if (!data) return [];
    return (data.sailTokenBalances || []).map((balance) => {
      // Recalculate estimatedMarks with current time
      const storedMarks = parseFloat(balance.accumulatedMarks || "0");
      const marksPerDay = parseFloat(balance.marksPerDay || "0");
      const lastUpdated = parseInt(balance.lastUpdated || "0");
      
      let estimatedMarks = storedMarks;
      if (lastUpdated > 0 && marksPerDay > 0) {
        const secondsSinceUpdate = currentTime - lastUpdated;
        if (secondsSinceUpdate > 0) {
          const daysSinceUpdate = secondsSinceUpdate / 86400;
          estimatedMarks = storedMarks + marksPerDay * daysSinceUpdate;
          estimatedMarks = Math.max(estimatedMarks, storedMarks);
        }
      }
      
      
      return {
        id: balance.id,
        tokenAddress: balance.tokenAddress,
        balance: formatEther(BigInt(balance.balance || "0")),
        balanceUSD: parseFloat(balance.balanceUSD || "0"),
        accumulatedMarks: storedMarks,
        estimatedMarks,
        marksPerDay,
        lastUpdated,
      };
    });
  }, [data, currentTime]);

  // Calculate estimated marks every second (zero gas!)
  // This now uses haBalances, poolDeposits, and sailBalances which update
  // every second via currentTime state, ensuring real-time mark accumulation
  useEffect(() => {
    const calculateTotal = () => {
      let total = 0;
      let haTotal = 0;
      let poolTotal = 0;
      let sailTotal = 0;

      // Ha token marks (using estimatedMarks from haBalances)
      for (const balance of haBalances) {
        haTotal += balance.estimatedMarks;
      }

      // Stability pool marks (using estimatedMarks from poolDeposits)
      for (const deposit of poolDeposits) {
        poolTotal += deposit.estimatedMarks;
      }

      // Sail token marks (using estimatedMarks from sailBalances)
      for (const balance of sailBalances) {
        sailTotal += balance.estimatedMarks;
      }

      total = haTotal + poolTotal + sailTotal;


      return total;
    };

    // Calculate total from formatted arrays (which update every second)
    setEstimatedMarks(calculateTotal());
  }, [haBalances, poolDeposits, sailBalances, currentTime]);

  // Extract userTotalMarks from data
  const userTotalMarks = data?.userTotalMarks || null;

  return {
    haBalances,
    poolDeposits,
    sailBalances,
    estimatedMarks, // Live counter - updates every second
    marksPerDay, // Current earning rate
    loading: isLoading,
    error,
    userTotalMarks, // Aggregated marks from subgraph (fallback when individual entities are empty)
  };
}

// Export the calculation function for use in leaderboard
export { calculateEstimatedMarks };



      return total;
    };

    // Calculate total from formatted arrays (which update every second)
    setEstimatedMarks(calculateTotal());
  }, [haBalances, poolDeposits, sailBalances, currentTime]);

  // Extract userTotalMarks from data
  const userTotalMarks = data?.userTotalMarks || null;

  return {
    haBalances,
    poolDeposits,
    sailBalances,
    estimatedMarks, // Live counter - updates every second
    marksPerDay, // Current earning rate
    loading: isLoading,
    error,
    userTotalMarks, // Aggregated marks from subgraph (fallback when individual entities are empty)
  };
}

// Export the calculation function for use in leaderboard
export { calculateEstimatedMarks };

