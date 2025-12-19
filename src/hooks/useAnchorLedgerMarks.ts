"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount, usePublicClient } from "wagmi";
import { formatEther } from "viem";
import { getGraphUrl, getGraphHeaders } from "@/config/graph";
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

      console.log("[useAnchorLedgerMarks] Fetching marks:", {
        address,
        addressLowercase: address.toLowerCase(),
        graphUrl,
        enabled,
        isConnected,
        query: ANCHOR_LEDGER_MARKS_QUERY,
        variables: queryVariables,
      });

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
          haBalances: [],
          poolDeposits: [],
          sailBalances: [],
        };
      }

      const result = await response.json();

      if (result.errors) {
        console.warn("[useAnchorLedgerMarks] GraphQL errors (subgraph may be rate limited or unavailable). Data will be empty.");
        // Don't throw - return empty data to allow page to continue loading
        return {
          haBalances: [],
          poolDeposits: [],
          sailBalances: [],
        };
      }

      // Debug logging
      console.log("[useAnchorLedgerMarks] GraphQL response:", {
        address,
        addressLowercase: address.toLowerCase(),
        graphUrl,
        haTokenBalances: result.data?.haTokenBalances?.length || 0,
        stabilityPoolDeposits: result.data?.stabilityPoolDeposits?.length || 0,
        sailTokenBalances: result.data?.sailTokenBalances?.length || 0,
        haTokenBalancesData: result.data?.haTokenBalances,
        stabilityPoolDepositsData: result.data?.stabilityPoolDeposits,
        sailTokenBalancesData: result.data?.sailTokenBalances,
        fullData: result.data,
      });

      // Test query: Check if subgraph has ANY data at all (first 5 entries)
      if (process.env.NODE_ENV === "development") {
        try {
          const testQuery = `
            query TestSubgraphData {
              haTokenBalances(first: 5) {
                id
                user
                tokenAddress
                balance
                balanceUSD
              }
              stabilityPoolDeposits(first: 5) {
                id
                user
                poolAddress
                poolType
                balance
                balanceUSD
              }
              sailTokenBalances(first: 5) {
                id
                user
                tokenAddress
                balance
                balanceUSD
              }
              _meta {
                block {
                  number
                  hash
                }
                deployment
                hasIndexingErrors
              }
            }
          `;
          
          const testResponse = await fetch(graphUrl, {
            method: "POST",
            headers: getGraphHeaders(),
            body: JSON.stringify({ query: testQuery }),
          });
          
          if (testResponse.ok) {
            const testResult = await testResponse.json();
            console.log("[useAnchorLedgerMarks] Subgraph test query (first 5 entries):", {
              haTokenBalancesCount: testResult.data?.haTokenBalances?.length || 0,
              stabilityPoolDepositsCount: testResult.data?.stabilityPoolDeposits?.length || 0,
              sailTokenBalancesCount: testResult.data?.sailTokenBalances?.length || 0,
              sampleHaTokens: testResult.data?.haTokenBalances,
              sampleDeposits: testResult.data?.stabilityPoolDeposits,
              sampleSailTokens: testResult.data?.sailTokenBalances,
              syncStatus: testResult.data?._meta,
              errors: testResult.errors,
            });
            
            // If we have data, check if any match our address
            if (testResult.data) {
              const allUsers = new Set<string>();
              testResult.data.haTokenBalances?.forEach((b: any) => allUsers.add(b.user?.toLowerCase()));
              testResult.data.stabilityPoolDeposits?.forEach((d: any) => allUsers.add(d.user?.toLowerCase()));
              testResult.data.sailTokenBalances?.forEach((b: any) => allUsers.add(b.user?.toLowerCase()));
              
              console.log("[useAnchorLedgerMarks] Address comparison:", {
                ourAddress: address.toLowerCase(),
                addressesInSubgraph: Array.from(allUsers),
                matchesOurAddress: Array.from(allUsers).includes(address.toLowerCase()),
              });
              
              // Log sync status
              if (testResult.data._meta) {
                console.log("[useAnchorLedgerMarks] Subgraph sync status:", {
                  currentBlock: testResult.data._meta.block?.number,
                  hasIndexingErrors: testResult.data._meta.hasIndexingErrors,
                  deployment: testResult.data._meta.deployment,
                });
                
                // Check if subgraph is synced to a recent block
                const currentBlock = testResult.data._meta.block?.number;
                if (currentBlock) {
                  // Get current block from chain to compare
                  publicClient?.getBlock({ blockTag: "latest" }).then((latestBlock) => {
                    const blocksBehind = latestBlock.number - BigInt(currentBlock);
                    console.log("[useAnchorLedgerMarks] Subgraph sync comparison:", {
                      subgraphBlock: currentBlock,
                      chainBlock: latestBlock.number.toString(),
                      blocksBehind: blocksBehind.toString(),
                      isSynced: blocksBehind < 100n, // Consider synced if within 100 blocks
                    });
                  }).catch((err) => {
                    console.warn("[useAnchorLedgerMarks] Failed to get latest block:", err);
                  });
                }
              }
            }
          } else {
            const errorText = await testResponse.text();
            console.error("[useAnchorLedgerMarks] Test query HTTP error:", {
              status: testResponse.status,
              statusText: testResponse.statusText,
              body: errorText,
            });
          }
        } catch (testError) {
          console.warn("[useAnchorLedgerMarks] Test query failed:", testError);
        }
      }

      return result.data || { haTokenBalances: [], stabilityPoolDeposits: [], sailTokenBalances: [] };
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

