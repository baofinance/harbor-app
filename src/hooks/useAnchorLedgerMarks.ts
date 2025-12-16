"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount, usePublicClient } from "wagmi";
import { formatEther } from "viem";
import { getGraphUrl } from "@/config/graph";
import { useState, useEffect, useMemo } from "react";

// GraphQL query for Anchor Ledger Marks (Ha Tokens + Stability Pools + Sail Tokens)
const ANCHOR_LEDGER_MARKS_QUERY = `
  query GetAnchorLedgerMarks($userAddress: Bytes!) {
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

interface AnchorLedgerMarksData {
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
    console.warn("[calculateEstimatedMarks] Estimated marks less than stored, using stored", {
      storedMarks,
      estimated,
      result,
      daysSinceUpdate,
      secondsSinceUpdate,
    });
  }
  
  return result;
}

interface UseAnchorLedgerMarksOptions {
  enabled?: boolean;
  graphUrl?: string;
}

export function useAnchorLedgerMarks({
  enabled = true,
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
            console.error("[useAnchorLedgerMarks] Failed to get block, using system time", error);
          }
        }
      } else {
        // Fallback to system time if no public client
        const systemTime = Math.floor(Date.now() / 1000);
        setCurrentTime(systemTime);
        if (process.env.NODE_ENV === "development") {
          console.warn("[useAnchorLedgerMarks] No publicClient, using system time");
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
  const { data, isLoading, error } = useQuery<AnchorLedgerMarksData>({
    queryKey: ["anchorLedgerMarks", address],
    queryFn: async () => {
      if (!address) {
        throw new Error("Address required");
      }

      console.log("[useAnchorLedgerMarks] Fetching marks:", {
        address,
        graphUrl,
        enabled,
        isConnected,
      });

      const response = await fetch(graphUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: ANCHOR_LEDGER_MARKS_QUERY,
          variables: {
            userAddress: address.toLowerCase(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`GraphQL query failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.errors) {
        console.error("[useAnchorLedgerMarks] GraphQL errors:", result.errors);
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      // Debug logging
      console.log("[useAnchorLedgerMarks] GraphQL response:", {
        address,
        graphUrl,
        haTokenBalances: result.data?.haTokenBalances?.length || 0,
        stabilityPoolDeposits: result.data?.stabilityPoolDeposits?.length || 0,
        sailTokenBalances: result.data?.sailTokenBalances?.length || 0,
        data: result.data,
      });

      return result.data || { haTokenBalances: [], stabilityPoolDeposits: [], sailTokenBalances: [] };
    },
    enabled: enabled && isConnected && !!address,
    refetchInterval: 60000, // Poll every 60 seconds for new events
    staleTime: 10000,
    onError: (error) => {
      console.error("[useAnchorLedgerMarks] Query error:", error);
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

  return {
    haBalances,
    poolDeposits,
    sailBalances,
    estimatedMarks, // Live counter - updates every second
    marksPerDay, // Current earning rate
    loading: isLoading,
    error,
  };
}

// Export the calculation function for use in leaderboard
export { calculateEstimatedMarks };

