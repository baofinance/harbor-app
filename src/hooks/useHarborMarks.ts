"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import { getGraphUrl } from "@/config/graph";

// GraphQL query for Harbor Marks
const HARBOR_MARKS_QUERY = `
  query GetUserHarborMarks($contractAddress: Bytes!, $userAddress: Bytes!) {
    userHarborMarks(
      where: {
        contractAddress: $contractAddress
        user: $userAddress
      }
      first: 1
    ) {
      id
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
      lastUpdated
    }
    deposits(
      where: {
        contractAddress: $contractAddress
        user: $userAddress
        isActive: true
      }
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      amount
      amountUSD
      timestamp
      marksPerDay
      isActive
    }
    withdrawals(
      where: {
        contractAddress: $contractAddress
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

interface HarborMarksData {
  userHarborMarks: Array<{
    id: string;
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
  }>;
  deposits: Array<{
    id: string;
    amount: string;
    amountUSD: string | null;
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

      const response = await fetch(graphUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: HARBOR_MARKS_QUERY,
          variables: {
            contractAddress: genesisAddress.toLowerCase(),
            userAddress: address.toLowerCase(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`GraphQL query failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      return data.data;
    },
    enabled: enabled && isConnected && !!address && !!genesisAddress,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
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
        return fetch(graphUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
            body: JSON.stringify({
              query: HARBOR_MARKS_QUERY,
              variables: {
                contractAddress: genesisAddress.toLowerCase(),
                userAddress: address.toLowerCase(),
              },
            }),
        }).then((res) => res.json());
      });

      const results = await Promise.all(queries);
      
      return results.map((result, index) => ({
        genesisAddress: genesisAddresses[index],
        data: result.data,
        errors: result.errors,
      }));
    },
    enabled: isConnected && !!address && genesisAddresses.length > 0,
    refetchInterval: 30000,
    staleTime: 10000,
  });
}

// Helper function to format Harbor Marks data
export function formatHarborMarks(data: HarborMarksData | null | undefined) {
  if (!data?.userHarborMarks || data.userHarborMarks.length === 0) {
    return {
      currentMarks: 0,
      marksPerDay: 0,
      totalMarksEarned: 0,
      totalMarksForfeited: 0,
      bonusMarks: 0,
      currentDeposit: "0",
      currentDepositUSD: 0,
      totalDeposited: "0",
      totalDepositedUSD: 0,
      genesisEnded: false,
      deposits: [],
      withdrawals: [],
    };
  }

  const marks = data.userHarborMarks[0];

  return {
    currentMarks: parseFloat(marks.currentMarks),
    marksPerDay: parseFloat(marks.marksPerDay),
    totalMarksEarned: parseFloat(marks.totalMarksEarned),
    totalMarksForfeited: parseFloat(marks.totalMarksForfeited),
    bonusMarks: parseFloat(marks.bonusMarks),
    currentDeposit: formatEther(BigInt(marks.currentDeposit)),
    currentDepositUSD: parseFloat(marks.currentDepositUSD),
    totalDeposited: formatEther(BigInt(marks.totalDeposited)),
    totalDepositedUSD: parseFloat(marks.totalDepositedUSD),
    genesisEnded: marks.genesisEnded,
    deposits: data.deposits.map((d) => ({
      id: d.id,
      amount: formatEther(BigInt(d.amount)),
      amountUSD: d.amountUSD ? parseFloat(d.amountUSD) : null,
      timestamp: parseInt(d.timestamp),
      marksPerDay: parseFloat(d.marksPerDay),
      isActive: d.isActive,
    })),
    withdrawals: data.withdrawals.map((w) => ({
      id: w.id,
      amount: formatEther(BigInt(w.amount)),
      amountUSD: w.amountUSD ? parseFloat(w.amountUSD) : null,
      timestamp: parseInt(w.timestamp),
      marksForfeited: parseFloat(w.marksForfeited),
    })),
  };
}

