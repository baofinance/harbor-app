"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import { getGraphUrl, getGraphHeaders, retryGraphQLQuery } from "@/config/graph";

// GraphQL query for Harbor Marks (v0.0.5 schema)
// Note: UserHarborMarks id format is {genesisAddress}-{userAddress}
// userTotalMarks id format is {userAddress}
const HARBOR_MARKS_QUERY = `
  query GetUserMarks($userAddress: Bytes!, $genesisAddress: Bytes!, $genesisId: ID!) {
    # Genesis marks (from deposits during genesis period)
    userHarborMarks(id: $genesisId) {
      id
      user
      currentMarks
      marksPerDay
      totalMarksEarned
      totalMarksForfeited
      bonusMarks
      totalDeposited
      totalDepositedUSD
      currentDeposit
      currentDepositUSD
      genesisStartDate
      genesisEndDate
      genesisEnded
      qualifiesForEarlyBonus
      earlyBonusMarks
      earlyBonusEligibleDepositUSD
      lastUpdated
    }
    
    # Aggregated marks across all sources (v0.0.5+)
    userTotalMarks(id: $userAddress) {
      id
      user
      genesisMarks
      haTokenMarks
      sailTokenMarks
      stabilityPoolMarks
      totalMarks
      totalMarksPerDay
      lastUpdated
    }
    
    # Anchor token positions (1x multiplier)
    haTokenBalances(where: { user: $userAddress }) {
      tokenAddress
      balance
      balanceUSD
      marksPerDay
      accumulatedMarks
      totalMarksEarned
      lastUpdated
    }
    
    # Sail token positions (5x multiplier)
    sailTokenBalances(where: { user: $userAddress }) {
      tokenAddress
      balance
      balanceUSD
      marksPerDay
      accumulatedMarks
      totalMarksEarned
      lastUpdated
    }
    
    # Individual deposits (for detailed breakdown)
    deposits(
      where: {
        contractAddress: $genesisAddress
        user: $userAddress
        isActive: true
      }
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      amount
      amountUSD
      blockNumber
      timestamp
      marksPerDay
      isActive
    }
    
    withdrawals(
      where: {
        contractAddress: $genesisAddress
        user: $userAddress
      }
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      amount
      amountUSD
      timestamp
      marksForfeited
    }
  }
`;

// Query for market bonus status (early deposit bonus tracking)
const MARKET_BONUS_STATUS_QUERY = `
  query GetMarketBonusStatus($contractAddress: Bytes!) {
    marketBonusStatus(id: $contractAddress) {
      id
      contractAddress
      thresholdReached
      thresholdReachedAt
      cumulativeDeposits
      thresholdAmount
      thresholdToken
      lastUpdated
    }
  }
`;

// Token balance position (for anchor/sail tokens)
interface TokenPosition {
  tokenAddress: string;
  balance: string;
  balanceUSD: string;
  marksPerDay: string;
  accumulatedMarks: string;
  totalMarksEarned: string;
  lastUpdated: string;
}

interface HarborMarksData {
  userHarborMarks: {
    id: string;
    user: string;
    currentMarks: string;
    marksPerDay: string;
    totalMarksEarned: string;
    totalMarksForfeited: string;
    bonusMarks: string;
    totalDeposited: string;
    totalDepositedUSD: string;
    currentDeposit: string;
    currentDepositUSD: string;
    genesisStartDate: string;
    genesisEndDate: string | null;
    genesisEnded: boolean;
    lastUpdated: string;
  } | null;
  userTotalMarks: {
    id: string;
    user: string;
    genesisMarks: string;
    haTokenMarks: string;
    sailTokenMarks: string;
    stabilityPoolMarks: string;
    totalMarks: string;
    totalMarksPerDay: string;
    lastUpdated: string;
  } | null;
  haTokenBalances: TokenPosition[];
  sailTokenBalances: TokenPosition[];
  deposits: Array<{
    id: string;
    amount: string;
    amountUSD: string | null;
    blockNumber: string;
    timestamp: string;
    marksPerDay: string;
    isActive: boolean;
  }>;
  withdrawals: Array<{
    id: string;
    amount: string;
    amountUSD: string | null;
    timestamp: string;
    marksForfeited: string;
  }>;
}

interface UseHarborMarksOptions {
  genesisAddress: string; // Contract address (keeping name for backward compatibility)
  enabled?: boolean;
  graphUrl?: string; // The Graph API URL
}

export function useHarborMarks({
  genesisAddress,
  enabled = true,
  graphUrl = getGraphUrl(),
}: UseHarborMarksOptions) {
  const { address, isConnected } = useAccount();

  return useQuery<HarborMarksData>({
    queryKey: ["harborMarks", genesisAddress, address],
    queryFn: async () => {
      if (!address || !genesisAddress) {
        throw new Error("Address and genesis address required");
      }

      // Construct the genesisId: {genesisAddress}-{userAddress}
      const genesisId = `${genesisAddress.toLowerCase()}-${address.toLowerCase()}`;
      const userAddress = address.toLowerCase();
      const genesisAddressLower = genesisAddress.toLowerCase();

      try {
        const data = await retryGraphQLQuery(async () => {
      const response = await fetch(graphUrl, {
        method: "POST",
        headers: getGraphHeaders(),
        body: JSON.stringify({
          query: HARBOR_MARKS_QUERY,
          variables: {
            userAddress: userAddress,
            genesisAddress: genesisAddressLower,
            genesisId: genesisId,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
            const error = new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
            (error as any).status = response.status;
            throw error;
          }

          const result = await response.json();

          if (result.errors) {
            const errorMessages = result.errors.map((err: any) => err.message || String(err)).join('; ');
            const error = new Error(`GraphQL errors: ${errorMessages}`);
            (error as any).errors = result.errors;
            throw error;
      }

          return result.data;
        }, {
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 5000,
        });

        return data;
      } catch (error: any) {
        console.warn(`[useHarborMarks] Query failed for ${genesisAddress} after retries:`, {
          message: error?.message,
          status: error?.status,
        });
        // Check for indexer errors
        const errorMessage = error?.message || String(error);
        if (errorMessage.includes('bad indexers') || errorMessage.includes('indexer')) {
          console.warn(`[useHarborMarks] The Graph Network indexers are having issues. This is a temporary infrastructure problem on The Graph's side, not an API key issue.`);
        }
        // Return empty data instead of throwing
        return { userHarborMarks: null };
      }
    },
    enabled: enabled && isConnected && !!address && !!genesisAddress,
    refetchInterval: 180000, // Refetch every 3 minutes
    staleTime: 170000, // Consider data stale after ~3 minutes
    refetchOnWindowFocus: false, // Don't refetch when user returns to tab
    retry: (failureCount, error: any) => {
      // Retry on indexer errors up to 2 times
      const errorMessage = error?.message || String(error);
      const isIndexerError = 
        errorMessage.includes('bad indexers') ||
        errorMessage.includes('indexer') ||
        errorMessage.includes('auth error') ||
        errorMessage.includes('missing authorization');
      return isIndexerError && failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
    throwOnError: false, // Don't throw errors - allow page to load with empty data
  });
}

// Hook to get all Harbor Marks across all genesis markets
export function useAllHarborMarks(genesisAddresses: string[]) {
  const { address, isConnected } = useAccount();
  const graphUrl = getGraphUrl();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["allHarborMarks", genesisAddresses, address],
    queryFn: async () => {
      // Get previous valid data to merge with new results
      const previousData = queryClient.getQueryData<{
        results: Array<{ genesisAddress: string; data: any; errors?: any[] }>;
        hasIndexerErrors: boolean;
        hasAnyErrors: boolean;
        marketsWithIndexerErrors: string[];
        marketsWithOtherErrors: string[];
      }>(["allHarborMarks", genesisAddresses, address]);
      
      // Create a map of previous valid results (markets with no errors)
      const previousValidResults = new Map<string, { genesisAddress: string; data: any }>();
      if (previousData?.results) {
        previousData.results.forEach((result) => {
          // Keep previous data if it was valid (no errors)
          if (!result.errors || result.errors.length === 0) {
            previousValidResults.set(result.genesisAddress.toLowerCase(), {
              genesisAddress: result.genesisAddress,
              data: result.data,
            });
          }
        });
      }
      if (!address || genesisAddresses.length === 0) {
        return [];
      }

      // Log configuration for debugging production issues
      console.log(`[useAllHarborMarks] Using GraphQL URL: ${graphUrl}`);
      console.log(`[useAllHarborMarks] Querying ${genesisAddresses.length} markets for address: ${address}`);
      
      // Query all markets in parallel with retry logic
      const queries = genesisAddresses.map(async (genesisAddress) => {
        // UserHarborMarks id format is {genesisAddress}-{userAddress}
        const genesisId = `${genesisAddress.toLowerCase()}-${address.toLowerCase()}`;
        const userAddress = address.toLowerCase();
        const genesisAddressLower = genesisAddress.toLowerCase();
        
        try {
          const json = await retryGraphQLQuery(async () => {
            const res = await fetch(graphUrl, {
          method: "POST",
          headers: getGraphHeaders(),
          body: JSON.stringify({
            query: HARBOR_MARKS_QUERY,
            variables: {
              userAddress: userAddress,
              genesisAddress: genesisAddressLower,
              genesisId: genesisId,
            },
          }),
            });

          if (!res.ok) {
            const errorText = await res.text().catch(() => res.statusText);
            const isAuthError = res.status === 401 || res.status === 403;
              const error = new Error(`HTTP ${res.status}: ${errorText || res.statusText}`);
              (error as any).status = res.status;
              (error as any).isAuthError = isAuthError;
              throw error;
            }

            const result = await res.json();
            if (result.errors) {
              const errorMessages = result.errors.map((err: any) => err.message || String(err)).join('; ');
              const error = new Error(`GraphQL errors: ${errorMessages}`);
              (error as any).errors = result.errors;
              throw error;
            }

            return result;
          }, {
            maxRetries: 2, // Fewer retries for parallel queries
            initialDelay: 500,
            maxDelay: 2000,
          });

          return json;
        } catch (error: any) {
          const isAuthError = error?.isAuthError || error?.status === 401 || error?.status === 403;
          console.warn(`[useAllHarborMarks] Query failed for ${genesisAddress} after retries:`, {
            status: error?.status,
            message: error?.message,
              url: graphUrl,
              isAuthError: isAuthError,
              suggestion: isAuthError ? "Check if NEXT_PUBLIC_GRAPH_API_KEY is set correctly in production environment" : undefined
            });
          
          // Check for indexer errors
          const errorMessage = error?.message || String(error);
          if (errorMessage.includes('bad indexers') || errorMessage.includes('indexer')) {
            console.warn(`[useAllHarborMarks] The Graph Network indexers are having issues. This is a temporary infrastructure problem on The Graph's side.`);
            }
          
          return { data: null, errors: [{ message: error?.message || 'Query failed' }] };
        }
      });

      const results = await Promise.all(queries);

      // Map results with error details and merge with previous valid data
      const mappedResults = results.map((result, index) => {
        const genesisAddress = genesisAddresses[index];
        const hasErrors = result.errors && result.errors.length > 0;
        const hasValidData = result.data !== null && result.data !== undefined;
        const hasPreviousValidData = previousValidResults.has(genesisAddress.toLowerCase()) &&
          previousValidResults.get(genesisAddress.toLowerCase())!.data !== null &&
          previousValidResults.get(genesisAddress.toLowerCase())!.data !== undefined;
        
        let isIndexerError = false;
        let errorMessages: string[] = [];
        
        if (hasErrors) {
          errorMessages = result.errors.map((err: any) => err.message || String(err));
          const combinedMessages = errorMessages.join('; ');
          isIndexerError = combinedMessages.includes('bad indexers') || combinedMessages.includes('indexer');
        }
        
        // CRITICAL: If current query failed (errors or no data) AND we have previous valid data,
        // ALWAYS use the previous valid data to prevent data loss
        if ((hasErrors || !hasValidData) && hasPreviousValidData) {
          const previousValid = previousValidResults.get(genesisAddress.toLowerCase())!;
          console.log(`[useAllHarborMarks] Preserving previous valid data for ${genesisAddress}`, {
            reason: hasErrors ? 'query errors' : 'invalid/null data',
            hasCurrentData: hasValidData,
            hasCurrentErrors: hasErrors,
            previousDataExists: true,
          });
          return {
            genesisAddress,
            data: previousValid.data, // ALWAYS use previous valid data when current query fails
            errors: [], // Clear errors since we have valid data
            hasErrors: false, // Mark as no errors since we have valid data
            isIndexerError: false,
            errorMessages: [],
          };
        }
        
        // If current query succeeded with valid data, use it
        // Otherwise, return the result as-is (which may have null data and errors)
        return {
          genesisAddress,
          data: hasValidData ? result.data : null,
          errors: result.errors || [],
          hasErrors: hasErrors || !hasValidData,
          isIndexerError,
          errorMessages,
        };
      });

      // Check if any errors indicate indexer issues
      const hasIndexerErrors = mappedResults.some((r) => r.isIndexerError);
      const hasAnyErrors = mappedResults.some((r) => r.hasErrors);
      
      // Get list of markets with errors
      const marketsWithIndexerErrors = mappedResults
        .filter((r) => r.isIndexerError)
        .map((r) => r.genesisAddress);
      const marketsWithOtherErrors = mappedResults
        .filter((r) => r.hasErrors && !r.isIndexerError)
        .map((r) => r.genesisAddress);

      return {
        results: mappedResults.map(({ hasErrors, isIndexerError, errorMessages, ...rest }) => rest),
        hasIndexerErrors,
        hasAnyErrors,
        marketsWithIndexerErrors,
        marketsWithOtherErrors,
      };
    },
    enabled: isConnected && !!address && genesisAddresses.length > 0,
    refetchInterval: (query) => {
      const data = query.state.data;
      const error = query.state.error;
      
      // Check if we have indexer errors
      const hasIndexerErrors = data?.hasIndexerErrors || 
        (error && (String(error).includes('bad indexers') || String(error).includes('indexer')));
      
      // Check if we have any valid data
      const hasValidData = data && data.results && data.results.some((r: any) => !r.errors || r.errors.length === 0);
      
      // If indexer errors detected, back off significantly (5 minutes)
      // This prevents hammering the API when indexers are down
      if (hasIndexerErrors) {
        return 300000; // 5 minutes when indexers are having issues
      }
      
      // If we have valid data, only refetch every 2 minutes
      // If no data yet, refetch more frequently to get initial data
      return hasValidData ? 120000 : 30000; // 2 minutes if valid data exists, 30 seconds otherwise
    },
    staleTime: 110000, // Consider data stale after ~2 minutes (slightly less than refetch interval)
    refetchOnWindowFocus: false, // Don't refetch when user returns to tab
    placeholderData: (previousData) => previousData, // Keep previous data while refetching - CRITICAL for data preservation
    retry: (failureCount, error: any) => {
      // Retry on indexer errors up to 2 times
      const errorMessage = error?.message || String(error);
      const isIndexerError = 
        errorMessage.includes('bad indexers') ||
        errorMessage.includes('indexer') ||
        errorMessage.includes('auth error') ||
        errorMessage.includes('missing authorization');
      return isIndexerError && failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
    throwOnError: false, // Don't throw errors - allow page to load with empty data
  });
}

// Hook to get all market bonus statuses (early deposit bonus tracking)
export function useAllMarketBonusStatus(genesisAddresses: string[]) {
  const graphUrl = getGraphUrl();

  return useQuery({
    queryKey: ["allMarketBonusStatus", genesisAddresses],
    queryFn: async () => {
      if (genesisAddresses.length === 0) {
        return [];
      }

      // Query all markets in parallel
      const queries = genesisAddresses.map((genesisAddress) => {
        return fetch(graphUrl, {
          method: "POST",
          headers: getGraphHeaders(),
          body: JSON.stringify({
            query: MARKET_BONUS_STATUS_QUERY,
            variables: {
              contractAddress: genesisAddress.toLowerCase(),
            },
          }),
        }).then(async (res) => {
          if (!res.ok) {
            const errorText = await res.text().catch(() => res.statusText);
            return { data: null, errors: [{ message: res.statusText }] };
          }
          const json = await res.json();
          return json;
        }).catch((error) => {
          return { data: null, errors: [{ message: error.message }] };
        });
      });

      const results = await Promise.all(queries);

      // Map results with error details
      const mappedResults = results.map((result, index) => {
        const genesisAddress = genesisAddresses[index];
        const hasErrors = result.errors && result.errors.length > 0;
        let isIndexerError = false;
        
        if (hasErrors) {
          const errorMessages = result.errors.map((err: any) => err.message || String(err)).join('; ');
          isIndexerError = errorMessages.includes('bad indexers') || errorMessages.includes('indexer');
        }
        
        return {
          genesisAddress,
          data: result.data?.marketBonusStatus || null,
          errors: result.errors,
          hasErrors,
          isIndexerError,
        };
      });

      // Check if any errors indicate indexer issues
      const hasIndexerErrors = mappedResults.some((r) => r.isIndexerError);
      const hasAnyErrors = mappedResults.some((r) => r.hasErrors);
      
      // Get list of markets with errors
      const marketsWithIndexerErrors = mappedResults
        .filter((r) => r.isIndexerError)
        .map((r) => r.genesisAddress);
      const marketsWithOtherErrors = mappedResults
        .filter((r) => r.hasErrors && !r.isIndexerError)
        .map((r) => r.genesisAddress);

      return {
        results: mappedResults.map(({ hasErrors, isIndexerError, ...rest }) => rest),
        hasIndexerErrors,
        hasAnyErrors,
        marketsWithIndexerErrors,
        marketsWithOtherErrors,
      };
    },
    enabled: genesisAddresses.length > 0,
    refetchInterval: 30000, // Refetch every 30 seconds to show real-time progress
    staleTime: 20000,
    refetchOnWindowFocus: false,
    retry: false,
    throwOnError: false,
  });
}

// Helper function to format Harbor Marks data
export function formatHarborMarks(data: HarborMarksData | null | undefined) {
  const userMarks = data?.userHarborMarks;
  const totalMarks = data?.userTotalMarks;

  // Use userTotalMarks if available (aggregates all sources), otherwise fall back to genesis marks
  const totalMarksValue = totalMarks?.totalMarks
    ? parseFloat(totalMarks.totalMarks)
    : userMarks?.currentMarks
    ? parseFloat(userMarks.currentMarks)
    : 0;

  const totalMarksPerDayValue = totalMarks?.totalMarksPerDay
    ? parseFloat(totalMarks.totalMarksPerDay)
    : userMarks?.marksPerDay
    ? parseFloat(userMarks.marksPerDay)
    : 0;

  if (!userMarks && !totalMarks) {
    return {
      totalMarks: 0,
      currentMarks: 0,
      marksPerDay: 0,
      totalMarksPerDay: 0,
      totalMarksEarned: 0,
      totalMarksForfeited: 0,
      bonusMarks: 0,
      genesisMarks: 0,
      haTokenMarks: 0,
      sailTokenMarks: 0,
      stabilityPoolMarks: 0,
      currentDeposit: "0",
      currentDepositUSD: 0,
      totalDeposited: "0",
      totalDepositedUSD: 0,
      genesisEnded: false,
      deposits: [],
      withdrawals: [],
      anchorPositions: [],
      sailPositions: [],
    };
  }

  return {
    // Total marks across all sources (preferred)
    totalMarks: totalMarksValue,
    // Genesis-specific marks
    currentMarks: userMarks ? parseFloat(userMarks.currentMarks) : 0,
    marksPerDay: userMarks ? parseFloat(userMarks.marksPerDay) : 0,
    // Total marks per day across all sources
    totalMarksPerDay: totalMarksPerDayValue,
    // Breakdown by source
    genesisMarks: totalMarks
      ? parseFloat(totalMarks.genesisMarks)
      : userMarks
      ? parseFloat(userMarks.currentMarks)
      : 0,
    haTokenMarks: totalMarks ? parseFloat(totalMarks.haTokenMarks) : 0,
    sailTokenMarks: totalMarks ? parseFloat(totalMarks.sailTokenMarks) : 0,
    stabilityPoolMarks: totalMarks
      ? parseFloat(totalMarks.stabilityPoolMarks)
      : 0,
    // Historical data
    totalMarksEarned: userMarks ? parseFloat(userMarks.totalMarksEarned) : 0,
    totalMarksForfeited: userMarks
      ? parseFloat(userMarks.totalMarksForfeited)
      : 0,
    bonusMarks: userMarks ? parseFloat(userMarks.bonusMarks) : 0,
    // Deposit information
    currentDeposit: userMarks
      ? formatEther(BigInt(userMarks.currentDeposit))
      : "0",
    currentDepositUSD: userMarks ? parseFloat(userMarks.currentDepositUSD) : 0,
    totalDeposited: userMarks
      ? formatEther(BigInt(userMarks.totalDeposited))
      : "0",
    totalDepositedUSD: userMarks ? parseFloat(userMarks.totalDepositedUSD) : 0,
    genesisEnded: userMarks ? userMarks.genesisEnded : false,
    deposits: (data?.deposits || []).map((d) => ({
      id: d.id,
      amount: formatEther(BigInt(d.amount)),
      amountUSD: d.amountUSD ? parseFloat(d.amountUSD) : null,
      timestamp: parseInt(d.timestamp),
      marksPerDay: parseFloat(d.marksPerDay),
      isActive: d.isActive,
    })),
    withdrawals: (data?.withdrawals || []).map((w) => ({
      id: w.id,
      amount: formatEther(BigInt(w.amount)),
      amountUSD: w.amountUSD ? parseFloat(w.amountUSD) : null,
      timestamp: parseInt(w.timestamp),
      marksForfeited: parseFloat(w.marksForfeited),
    })),
    // Token positions
    anchorPositions: (data?.haTokenBalances || []).map((p) => ({
      tokenAddress: p.tokenAddress,
      balance: p.balance,
      balanceUSD: parseFloat(p.balanceUSD),
      marksPerDay: parseFloat(p.marksPerDay),
      accumulatedMarks: parseFloat(p.accumulatedMarks),
      totalMarksEarned: parseFloat(p.totalMarksEarned),
      lastUpdated: parseInt(p.lastUpdated),
    })),
    sailPositions: (data?.sailTokenBalances || []).map((p) => ({
      tokenAddress: p.tokenAddress,
      balance: p.balance,
      balanceUSD: parseFloat(p.balanceUSD),
      marksPerDay: parseFloat(p.marksPerDay),
      accumulatedMarks: parseFloat(p.accumulatedMarks),
      totalMarksEarned: parseFloat(p.totalMarksEarned),
      lastUpdated: parseInt(p.lastUpdated),
    })),
  };
}
