"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import { getGraphUrl, getGraphHeaders } from "@/config/graph";

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
        console.warn(`[useHarborMarks] GraphQL query failed (subgraph may be rate limited). Data will be empty.`);
        // Return empty data instead of throwing
        return { userHarborMarks: null };
      }

      const data = await response.json();

      if (data.errors) {
        console.warn(`[useHarborMarks] GraphQL errors (subgraph may be rate limited). Data will be empty.`);
        // Return empty data instead of throwing
        return { userHarborMarks: null };
      }

      return data.data;
    },
    enabled: enabled && isConnected && !!address && !!genesisAddress,
    refetchInterval: 180000, // Refetch every 3 minutes
    staleTime: 170000, // Consider data stale after ~3 minutes
    refetchOnWindowFocus: false, // Don't refetch when user returns to tab
    retry: false, // Don't retry on failure to avoid hammering rate-limited API
    throwOnError: false, // Don't throw errors - allow page to load with empty data
  });
}

// Hook to get all Harbor Marks across all genesis markets
export function useAllHarborMarks(genesisAddresses: string[]) {
  const { address, isConnected } = useAccount();
  const graphUrl = getGraphUrl();

  return useQuery({
    queryKey: ["allHarborMarks", genesisAddresses, address],
    queryFn: async () => {
      if (!address || genesisAddresses.length === 0) {
        return [];
      }

      // Query all markets in parallel
      const queries = genesisAddresses.map((genesisAddress) => {
        // UserHarborMarks id format is {genesisAddress}-{userAddress}
        const genesisId = `${genesisAddress.toLowerCase()}-${address.toLowerCase()}`;
        const userAddress = address.toLowerCase();
        const genesisAddressLower = genesisAddress.toLowerCase();
        
        return fetch(graphUrl, {
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
        }).then(async (res) => {
          if (!res.ok) {
            console.warn(`[useAllHarborMarks] Query failed for ${genesisAddress} (subgraph may be rate limited). Data will be empty.`);
            return { data: null, errors: [{ message: res.statusText }] };
          }
          const json = await res.json();
          if (json.errors) {
            console.warn(`[useAllHarborMarks] GraphQL errors for ${genesisAddress}. Data will be empty.`);
          }
          return json;
        }).catch((error) => {
          console.warn(`[useAllHarborMarks] Fetch error for ${genesisAddress}. Data will be empty.`);
          return { data: null, errors: [{ message: error.message }] };
        });
      });

      const results = await Promise.all(queries);

      return results.map((result, index) => ({
        genesisAddress: genesisAddresses[index],
        data: result.data,
        errors: result.errors,
      }));
    },
    enabled: isConnected && !!address && genesisAddresses.length > 0,
    refetchInterval: 180000, // Refetch every 3 minutes
    staleTime: 170000, // Consider data stale after ~3 minutes
    refetchOnWindowFocus: false, // Don't refetch when user returns to tab
    retry: false, // Don't retry on failure to avoid hammering rate-limited API
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
            console.warn(`[useAllMarketBonusStatus] Query failed for ${genesisAddress}`);
            return { data: null, errors: [{ message: res.statusText }] };
          }
          const json = await res.json();
          if (json.errors) {
            console.warn(`[useAllMarketBonusStatus] GraphQL errors for ${genesisAddress}`);
          }
          return json;
        }).catch((error) => {
          console.warn(`[useAllMarketBonusStatus] Fetch error for ${genesisAddress}`);
          return { data: null, errors: [{ message: error.message }] };
        });
      });

      const results = await Promise.all(queries);

      return results.map((result, index) => ({
        genesisAddress: genesisAddresses[index],
        data: result.data?.marketBonusStatus || null,
        errors: result.errors,
      }));
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
