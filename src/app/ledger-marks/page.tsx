"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrophyIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import { markets } from "@/config/markets";
import { getGraphUrl } from "@/config/graph";

// GraphQL query to get all users' marks
const ALL_USERS_MARKS_QUERY = `
  query GetAllUsersMarks {
    userHarborMarks(
      orderBy: currentMarks
      orderDirection: desc
      first: 1000
    ) {
      id
      user
      contractAddress
      currentMarks
      marksPerDay
      bonusMarks
      totalMarksEarned
      totalMarksForfeited
      currentDepositUSD
      genesisEnded
    }
  }
`;

interface UserMarksData {
  userHarborMarks: Array<{
    id: string;
    user: string;
    contractAddress: string;
    currentMarks: string;
    marksPerDay: string;
    bonusMarks: string;
    totalMarksEarned: string;
    totalMarksForfeited: string;
    currentDepositUSD: string;
    genesisEnded: boolean;
  }>;
}

// Helper to format address
function formatAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Helper to get contract type from address
function getContractType(contractAddress: string): "genesis" | "anchor" | "sail" | "unknown" {
  // Check if it's a genesis contract by looking at markets
  const genesisMarkets = Object.entries(markets).filter(([_, m]) => {
    const genesisAddr = (m as any).addresses?.genesis;
    return genesisAddr && genesisAddr.toLowerCase() === contractAddress.toLowerCase();
  });
  if (genesisMarkets.length > 0) return "genesis";
  
  // Check if it's a stability pool (anchor) - collateral pool
  const anchorMarkets = Object.entries(markets).filter(([_, m]) => {
    const collateralPoolAddr = (m as any).addresses?.stabilityPoolCollateral;
    return collateralPoolAddr && collateralPoolAddr.toLowerCase() === contractAddress.toLowerCase();
  });
  if (anchorMarkets.length > 0) return "anchor";
  
  // Check if it's a sail pool - leveraged pool
  const sailMarkets = Object.entries(markets).filter(([_, m]) => {
    const sailPoolAddr = (m as any).addresses?.stabilityPoolLeveraged;
    return sailPoolAddr && sailPoolAddr.toLowerCase() === contractAddress.toLowerCase();
  });
  if (sailMarkets.length > 0) return "sail";
  
  return "unknown";
}

export default function LedgerMarksLeaderboard() {
  const graphUrl = getGraphUrl();
  const [sortBy, setSortBy] = useState<"total" | "genesis" | "anchor" | "sail" | "perDay">("total");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const { data, isLoading, error } = useQuery<UserMarksData>({
    queryKey: ["allUsersMarks"],
    queryFn: async () => {
      const response = await fetch(graphUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: ALL_USERS_MARKS_QUERY,
        }),
      });

      if (!response.ok) {
        throw new Error(`GraphQL query failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      return result.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000,
  });

  // Process and aggregate user marks by wallet address
  const leaderboardData = useMemo(() => {
    if (!data?.userHarborMarks) return [];

    // Group by user address
    const userMap = new Map<string, {
      address: string;
      totalMarks: number;
      genesisMarks: number;
      anchorMarks: number;
      sailMarks: number;
      marksPerDay: number;
    }>();

    data.userHarborMarks.forEach((entry) => {
      const userAddress = entry.user.toLowerCase();
      const contractType = getContractType(entry.contractAddress);
      const currentMarks = parseFloat(entry.currentMarks || "0");
      const marksPerDay = parseFloat(entry.marksPerDay || "0");

      if (!userMap.has(userAddress)) {
        userMap.set(userAddress, {
          address: entry.user,
          totalMarks: 0,
          genesisMarks: 0,
          anchorMarks: 0,
          sailMarks: 0,
          marksPerDay: 0,
        });
      }

      const user = userMap.get(userAddress)!;
      user.totalMarks += currentMarks;
      user.marksPerDay += marksPerDay;

      // Categorize marks by contract type
      // Note: Currently only genesis contracts are tracked in the subgraph
      // Anchor and Sail marks will be added when we extend the subgraph
      if (contractType === "genesis") {
        user.genesisMarks += currentMarks;
      } else if (contractType === "anchor") {
        user.anchorMarks += currentMarks;
      } else if (contractType === "sail") {
        user.sailMarks += currentMarks;
      } else {
        // If unknown, assume it's genesis for now (since that's what we're tracking)
        user.genesisMarks += currentMarks;
      }
    });

    // Convert to array and sort
    const sorted = Array.from(userMap.values()).sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortBy) {
        case "genesis":
          aValue = a.genesisMarks;
          bValue = b.genesisMarks;
          break;
        case "anchor":
          aValue = a.anchorMarks;
          bValue = b.anchorMarks;
          break;
        case "sail":
          aValue = a.sailMarks;
          bValue = b.sailMarks;
          break;
        case "perDay":
          aValue = a.marksPerDay;
          bValue = b.marksPerDay;
          break;
        default:
          aValue = a.totalMarks;
          bValue = b.totalMarks;
      }

      return sortDirection === "desc" ? bValue - aValue : aValue - bValue;
    });

    return sorted;
  }, [data, sortBy, sortDirection]);

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc");
    } else {
      setSortBy(column);
      setSortDirection("desc");
    }
  };

  return (
    <div className="min-h-screen bg-[#1E4775]">
      <main className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="mb-4">
            <h1 className="font-bold font-mono text-white text-7xl text-center mb-1">
              Ledger Marks
            </h1>
            <p className="text-xl text-white/80 text-center mb-2">
              Leaderboard
            </p>
          </div>

          {/* Explainer Section */}
          <div className="bg-[#17395F] p-4 mb-4">
            <div className="flex items-start gap-3">
              <QuestionMarkCircleIcon className="w-6 h-6 text-white flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-lg text-white mb-2">What are Ledger Marks?</h3>
                <div className="space-y-3 text-white/90 leading-relaxed text-sm">
                  <p>
                    A ledger is both a record of truth and a core DeFi symbol — and a mark is what every sailor leaves behind on a voyage.
                  </p>
                  <p>
                    Each Ledger Mark is proof that you were here early, helping stabilize the first Harbor markets and guide them through calm launch conditions.
                  </p>
                  <div className="space-y-2 mt-3">
                    <div className="flex items-start gap-2">
                      <span className="text-white/70 mt-0.5">•</span>
                      <p>
                        The more you contribute, the deeper your mark on the ledger.
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-white/70 mt-0.5">•</span>
                      <p>
                        When $TIDE surfaces, these marks will convert into your share of rewards and governance power.
                      </p>
                    </div>
                  </div>
                  <p className="text-white/80 italic mt-3 pt-3 border-t border-white/20">
                    Think of them as a record of your journey — every mark, a line in Harbor's logbook.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 my-2 mb-4"></div>

          {/* Leaderboard Table */}
          <div className="bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#1E4775] text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Rank</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Wallet Address</th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-[#17395F] transition-colors"
                      onClick={() => handleSort("total")}
                    >
                      Total Marks
                      {sortBy === "total" && (
                        <span className="ml-1">{sortDirection === "desc" ? "↓" : "↑"}</span>
                      )}
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-[#17395F] transition-colors"
                      onClick={() => handleSort("genesis")}
                    >
                      Genesis Marks
                      {sortBy === "genesis" && (
                        <span className="ml-1">{sortDirection === "desc" ? "↓" : "↑"}</span>
                      )}
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-[#17395F] transition-colors"
                      onClick={() => handleSort("anchor")}
                    >
                      Anchor Marks
                      {sortBy === "anchor" && (
                        <span className="ml-1">{sortDirection === "desc" ? "↓" : "↑"}</span>
                      )}
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-[#17395F] transition-colors"
                      onClick={() => handleSort("sail")}
                    >
                      Sail Marks
                      {sortBy === "sail" && (
                        <span className="ml-1">{sortDirection === "desc" ? "↓" : "↑"}</span>
                      )}
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-[#17395F] transition-colors"
                      onClick={() => handleSort("perDay")}
                    >
                      Marks Per Day
                      {sortBy === "perDay" && (
                        <span className="ml-1">{sortDirection === "desc" ? "↓" : "↑"}</span>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        Loading leaderboard...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-red-500">
                        Error loading leaderboard: {error instanceof Error ? error.message : "Unknown error"}
                      </td>
                    </tr>
                  ) : leaderboardData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        No marks data available yet
                      </td>
                    </tr>
                  ) : (
                    leaderboardData.map((user, index) => (
                      <tr key={user.address} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-[#1E4775]">
                          <div className="flex items-center gap-2">
                            {index === 0 && <TrophyIcon className="w-5 h-5 text-yellow-500" />}
                            <span>{index + 1}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-[#1E4775]">
                          <a 
                            href={`https://etherscan.io/address/${user.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-[#17395F] hover:underline"
                          >
                            {formatAddress(user.address)}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-[#1E4775] font-mono">
                          {user.totalMarks.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#1E4775] font-mono">
                          {user.genesisMarks.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#1E4775] font-mono">
                          {user.anchorMarks.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#1E4775] font-mono">
                          {user.sailMarks.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#1E4775] font-mono">
                          {user.marksPerDay.toLocaleString(undefined, { maximumFractionDigits: 2 })}/day
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
      </main>
    </div>
  );
}

