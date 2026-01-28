"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount, usePublicClient } from "wagmi";
import Image from "next/image";
import {
  WalletIcon,
} from "@heroicons/react/24/outline";
import { markets } from "@/config/markets";
import { getGraphUrl, getGraphHeaders } from "@/config/graph";
import {
 calculateEstimatedMarks,
 useAnchorLedgerMarks,
} from "@/hooks/useAnchorLedgerMarks";
import { useMarketBoostWindows } from "@/hooks/useMarketBoostWindows";
import { CONTRACTS } from "@/config/contracts";

// GraphQL queries for leaderboard
// Note: userHarborMarks requires an ID, so we query deposits first to find all users
const ALL_DEPOSITS_QUERY = `
 query GetAllDeposits {
 deposits(
 first: 1000
 orderBy: timestamp
 orderDirection: desc
 ) {
 id
 user
 contractAddress
 }
 }
`;

// Query to get a specific user's marks by id
const USER_MARKS_QUERY = `
 query GetUserMarks($id: ID!) {
 userHarborMarks(id: $id) {
 id
 user
 contractAddress
 campaignId
 campaignLabel
 currentMarks
 marksPerDay
 bonusMarks
 totalMarksEarned
 totalMarksForfeited
 currentDepositUSD
 genesisEnded
 lastUpdated
 genesisStartDate
 }
 }
`;

const CAMPAIGN_USER_MARKS_QUERY = `
 query GetCampaignUserMarks($userAddress: Bytes!, $campaignId: String!) {
 userHarborMarks_collection(
   first: 1000
   where: { user: $userAddress, campaignId: $campaignId }
 ) {
   id
   user
   contractAddress
   campaignId
   campaignLabel
   currentMarks
   marksPerDay
   bonusMarks
   genesisEnded
   lastUpdated
 }
 }
`;

const CAMPAIGN_LEADERBOARD_QUERY = `
 query GetCampaignLeaderboard($campaignId: String!) {
 userHarborMarks_collection(first: 1000, where: { campaignId: $campaignId }) {
   id
   user
   contractAddress
   campaignId
   campaignLabel
   currentMarks
   marksPerDay
   bonusMarks
   genesisEnded
   lastUpdated
 }
 }
`;

// Query all ha token balances
const ALL_HA_TOKEN_BALANCES_QUERY = `
 query GetAllHaTokenBalances {
 haTokenBalances(first: 1000) {
 id
 user
 tokenAddress
 balance
 balanceUSD
 accumulatedMarks
 marksPerDay
 lastUpdated
 }
 }
`;

// Query all stability pool deposits
const ALL_STABILITY_POOL_DEPOSITS_QUERY = `
 query GetAllStabilityPoolDeposits {
 stabilityPoolDeposits(first: 1000) {
 id
 user
 poolAddress
 poolType
 balance
 balanceUSD
 accumulatedMarks
 marksPerDay
 lastUpdated
 }
 }
`;

// Query all sail token balances
const ALL_SAIL_TOKEN_BALANCES_QUERY = `
 query GetAllSailTokenBalances {
 sailTokenBalances(first: 1000) {
 id
 user
 tokenAddress
 balance
 balanceUSD
 accumulatedMarks
 marksPerDay
 lastUpdated
 }
 }
`;

interface DepositsData {
 deposits: Array<{
 id: string;
 user: string;
 contractAddress: string;
 }>;
}

interface AllUserMarksData {
 userHarborMarks: UserMarksEntry[];
}

interface UserMarksEntry {
 id: string;
 user: string;
 contractAddress: string;
  campaignId?: string;
  campaignLabel?: string;
 currentMarks: string;
 marksPerDay: string;
 bonusMarks: string;
 totalMarksEarned: string;
 totalMarksForfeited: string;
 currentDepositUSD: string;
 genesisEnded: boolean;
 lastUpdated: string;
 genesisStartDate: string;
}

interface UserMarksResponse {
 userHarborMarks: UserMarksEntry | null;
}

interface HaTokenBalance {
 id: string;
 user: string;
 tokenAddress: string;
 balance: string;
 balanceUSD: string;
 accumulatedMarks: string;
 marksPerDay: string;
 lastUpdated: string;
}

interface StabilityPoolDeposit {
 id: string;
 user: string;
 poolAddress: string;
 poolType?: string;
 balance: string;
 balanceUSD: string;
 accumulatedMarks: string;
 marksPerDay: string;
 lastUpdated: string;
}

interface SailTokenBalance {
 id: string;
 user: string;
 tokenAddress: string;
 balance: string;
 balanceUSD: string;
 accumulatedMarks: string;
 marksPerDay: string;
 lastUpdated: string;
}

// Helper to format address
function formatAddress(address: string): string {
 if (!address) return"";
 return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Helper to check if an address is a known contract (should be filtered out)
function isContractAddress(address: string): boolean {
 const normalized = address.toLowerCase();
 const knownContracts: string[] = [
 CONTRACTS.GENESIS?.toLowerCase(),
 CONTRACTS.MINTER?.toLowerCase(),
 CONTRACTS.PEGGED_TOKEN?.toLowerCase(),
 CONTRACTS.LEVERAGED_TOKEN?.toLowerCase(),
 CONTRACTS.STABILITY_POOL_MANAGER?.toLowerCase(),
 CONTRACTS.WSTETH?.toLowerCase(),
 CONTRACTS.STETH?.toLowerCase(),
 CONTRACTS.STABILITY_POOL_COLLATERAL?.toLowerCase(),
 CONTRACTS.STABILITY_POOL_PEGGED?.toLowerCase(),
 ].filter((addr): addr is string => !!addr);

 // Also check all market contract addresses
 Object.values(markets).forEach((market) => {
 const addresses = (market as any).addresses;
 if (addresses) {
 Object.values(addresses).forEach((addr) => {
 if (typeof addr ==="string" && addr.startsWith("0x")) {
 knownContracts.push(addr.toLowerCase());
 }
 });
 }
 });

 return knownContracts.includes(normalized);
}

// Helper to get contract type from address
function getContractType(
 contractAddress: string
):"genesis" |"anchor" |"sail" |"unknown" {
 // Check if it's a genesis contract by looking at markets
 const genesisMarkets = Object.entries(markets).filter(([_, m]) => {
 const genesisAddr = (m as any).addresses?.genesis;
 return (
 genesisAddr && genesisAddr.toLowerCase() === contractAddress.toLowerCase()
 );
 });
 if (genesisMarkets.length > 0) return"genesis";
 
 // Check if it's a stability pool (anchor) - collateral pool
 const anchorMarkets = Object.entries(markets).filter(([_, m]) => {
 const collateralPoolAddr = (m as any).addresses?.stabilityPoolCollateral;
 return (
 collateralPoolAddr &&
 collateralPoolAddr.toLowerCase() === contractAddress.toLowerCase()
 );
 });
 if (anchorMarkets.length > 0) return"anchor";
 
 // Check if it's a sail pool - leveraged pool
 const sailMarkets = Object.entries(markets).filter(([_, m]) => {
 const sailPoolAddr = (m as any).addresses?.stabilityPoolLeveraged;
 return (
 sailPoolAddr &&
 sailPoolAddr.toLowerCase() === contractAddress.toLowerCase()
 );
 });
 if (sailMarkets.length > 0) return"sail";
 
 return"unknown";
}

export default function LedgerMarksLeaderboard() {
 const graphUrl = getGraphUrl();
 const { address, isConnected } = useAccount();
 const publicClient = usePublicClient();
 
 // Helper to check if errors contain indexer issues
 const hasIndexerError = (errors: any[] | undefined): boolean => {
   if (!errors || errors.length === 0) return false;
   const errorMessages = errors.map((err: any) => err.message || String(err)).join('; ');
   return errorMessages.includes('bad indexers') || errorMessages.includes('indexer');
 };
 
 // Helper to get market name from contract address
 const getMarketNameFromAddress = (contractAddress: string): string => {
   const market = Object.entries(markets).find(([_, mkt]) => {
     const genesisAddr = (mkt as any).addresses?.genesis;
     return genesisAddr && genesisAddr.toLowerCase() === contractAddress.toLowerCase();
   });
   if (!market) return contractAddress.slice(0, 6) + '...' + contractAddress.slice(-4);
   const [id, mkt] = market;
   const rowLeveragedSymbol = (mkt as any).rowLeveragedSymbol;
   if (rowLeveragedSymbol && rowLeveragedSymbol.toLowerCase().startsWith("hs")) {
     return rowLeveragedSymbol.slice(2);
   }
   return rowLeveragedSymbol || (mkt as any).name || id;
 };
 
 // Track errors from all queries
 const [hasIndexerErrors, setHasIndexerErrors] = useState(false);
 const [hasAnyErrors, setHasAnyErrors] = useState(false);
 const [marketsWithErrors, setMarketsWithErrors] = useState<Set<string>>(new Set());
 const [currentChainTime, setCurrentChainTime] = useState<number | undefined>(
 undefined
 );
 const [leaderboardTab, setLeaderboardTab] = useState<
  "campaigns" | "anchor-sail"
 >("campaigns");
 const [campaignTab, setCampaignTab] = useState<
  "launch-maiden-voyage" | "euro-maiden-voyage"
 >("launch-maiden-voyage");
 const [campaignSortBy, setCampaignSortBy] = useState<
  "total" | "perDay" | "bonus"
 >("total");
 const [campaignSortDirection, setCampaignSortDirection] = useState<
  "asc" | "desc"
 >("desc");
 const [anchorSailSortBy, setAnchorSailSortBy] = useState<
  "total" | "anchor" | "sail" | "perDay"
 >("total");
 const [anchorSailSortDirection, setAnchorSailSortDirection] = useState<
  "asc" | "desc"
 >("desc");

 const campaignTabs = [
  {
   id: "launch-maiden-voyage",
   label: "Launch",
   subtitle: "1% of $TIDE",
  },
  { id: "euro-maiden-voyage", label: "Euro" },
 ] as const;
 const activeCampaign =
  campaignTabs.find((tab) => tab.id === campaignTab) ?? campaignTabs[0];

 // Get current blockchain timestamp (updates every second)
 useEffect(() => {
 const updateTime = async () => {
 if (publicClient) {
 try {
 const block = await publicClient.getBlock({ blockTag:"latest" });
 if (block.timestamp) {
 setCurrentChainTime(Number(block.timestamp));
 }
 } catch (error) {
 // Fallback to undefined, which will use system time
 setCurrentChainTime(undefined);
 }
 }
 };

 // Initial update
 updateTime();

 // Update every second
 const interval = setInterval(updateTime, 1000);
 return () => clearInterval(interval);
 }, [publicClient]);

// Get anchor ledger marks (includes sail token balances)
// Use same data source as Anchor page for consistency
 const {
   haBalances,
   poolDeposits,
   sailBalances,
   loading: isLoadingAnchorLedgerMarks,
   error: anchorLedgerMarksError,
 } = useAnchorLedgerMarks({ enabled: true }); // Enable subgraph queries

// Calculate anchor marks per day (ha tokens + ALL stability pools)
// Note: Both collateral and "sail" stability pools accept ha token deposits.
// Use same calculation as Anchor page
const anchorMarksPerDay = useMemo(() => {
return (
(haBalances ?? []).reduce((sum, b) => sum + (b.marksPerDay ?? 0), 0) +
(poolDeposits ?? []).reduce((sum, d) => sum + (d.marksPerDay ?? 0), 0)
);
}, [haBalances, poolDeposits]);

// Calculate total anchor marks (ha tokens + ALL stability pools)
const totalAnchorLedgerMarks = useMemo(() => {
let total = 0;
// Add ha token marks
if (haBalances) {
total += haBalances.reduce((sum, balance) => sum + (balance.estimatedMarks || 0), 0);
}
// Add stability pool marks (both collateral and sail pools)
if (poolDeposits) {
total += poolDeposits.reduce((sum, deposit) => sum + (deposit.estimatedMarks || 0), 0);
}
return total;
}, [haBalances, poolDeposits]);

 const totalSailLedgerMarks = useMemo(() => {
 let total = 0;
 if (sailBalances) {
 total += sailBalances.reduce(
 (sum, balance) => sum + calculateEstimatedMarks(balance, currentChainTime),
 0
 );
 }
 return total;
 }, [sailBalances, currentChainTime]);

 // Calculate sail marks per day (sail token holdings only)
 const sailMarksPerDay = useMemo(() => {
 let total = 0;
 // Add sail token holdings marks
 if (sailBalances) {
 total += sailBalances.reduce(
 (sum, balance) => sum + balance.marksPerDay,
 0
 );
 }
 return total;
 }, [sailBalances]);

const { data: campaignUserMarksData, isLoading: isLoadingCampaignMarks } =
useQuery<{ userHarborMarks_collection: UserMarksEntry[] }>({
 queryKey: ["campaignUserMarks", address, campaignTab],
 queryFn: async () => {
 if (!address) return { userHarborMarks_collection: [] };
 const response = await fetch(graphUrl, {
 method:"POST",
 headers: getGraphHeaders(),
 body: JSON.stringify({
 query: CAMPAIGN_USER_MARKS_QUERY,
 variables: {
 userAddress: address.toLowerCase(),
 campaignId: campaignTab,
 },
 }),
 });
 if (!response.ok) return { userHarborMarks_collection: [] };
 const result = await response.json();
 if (result.errors || !result.data?.userHarborMarks_collection) {
 return { userHarborMarks_collection: [] };
 }
 return result.data;
 },
 enabled: !!address && isConnected,
 refetchInterval: 60000,
});

const {
 data: campaignLeaderboardMarksData,
 isLoading: isLoadingCampaignLeaderboard,
 error: campaignLeaderboardError,
} =
useQuery<{ userHarborMarks_collection: UserMarksEntry[] }>({
 queryKey: ["campaignLeaderboard", campaignTab],
 queryFn: async () => {
 const response = await fetch(graphUrl, {
 method:"POST",
 headers: getGraphHeaders(),
 body: JSON.stringify({
 query: CAMPAIGN_LEADERBOARD_QUERY,
 variables: { campaignId: campaignTab },
 }),
 });
 if (!response.ok) {
 throw new Error(`GraphQL query failed: ${response.statusText}`);
 }
 const result = await response.json();
 if (result.errors) {
 const isIndexerErr = hasIndexerError(result.errors);
 setHasIndexerErrors((prev) => prev || isIndexerErr);
 setHasAnyErrors((prev) => prev || true);
 return { userHarborMarks_collection: [] };
 }
 return result.data || { userHarborMarks_collection: [] };
 },
 refetchInterval: 30000,
 staleTime: 10000,
});

const getLiveMarks = (entry: UserMarksEntry) => {
 let currentMarks = parseFloat(entry.currentMarks ||"0");
 const marksPerDay = parseFloat(entry.marksPerDay ||"0");
 const bonusMarks = parseFloat(entry.bonusMarks ||"0");
 const lastUpdated = parseInt(entry.lastUpdated ||"0");
 const genesisEnded = entry.genesisEnded || false;
 if (!genesisEnded && marksPerDay > 0 && lastUpdated > 0) {
 const now = currentChainTime || Math.floor(Date.now() / 1000);
 const timeElapsed = now - lastUpdated;
 const daysElapsed = Math.max(0, timeElapsed / 86400);
 currentMarks = currentMarks + marksPerDay * daysElapsed;
 }
 return {
 currentMarks,
 marksPerDay,
 bonusMarks,
 };
};

const campaignUserTotals = useMemo(() => {
 const entries = campaignUserMarksData?.userHarborMarks_collection || [];
 return entries.reduce(
 (acc, entry) => {
 const live = getLiveMarks(entry);
 acc.totalMarks += live.currentMarks;
 acc.marksPerDay += live.marksPerDay;
 acc.bonusMarks += live.bonusMarks;
 return acc;
 },
 { totalMarks: 0, marksPerDay: 0, bonusMarks: 0 }
 );
}, [campaignUserMarksData, currentChainTime]);

const anchorSailMarksPerDay = useMemo(() => {
 return anchorMarksPerDay + sailMarksPerDay;
}, [anchorMarksPerDay, sailMarksPerDay]);

 // Query genesis marks via deposits (userHarborMarks requires an ID, so we query deposits first)
 const {
 data: marksData,
 isLoading: isLoadingMarks,
 error: marksError,
 } = useQuery<AllUserMarksData>({
 queryKey: ["allUsersMarks"],
 queryFn: async () => {
 // Step 1: Query all deposits to find unique user-contract pairs
 const depositsResponse = await fetch(graphUrl, {
 method:"POST",
 headers: getGraphHeaders(),
 body: JSON.stringify({
 query: ALL_DEPOSITS_QUERY,
 }),
 });

 if (!depositsResponse.ok) {
 throw new Error(`GraphQL query failed: ${depositsResponse.statusText}`);
 }

 const depositsResult = await depositsResponse.json();

 if (depositsResult.errors) {
   const isIndexerErr = hasIndexerError(depositsResult.errors);
   setHasIndexerErrors((prev) => prev || isIndexerErr);
   setHasAnyErrors((prev) => prev || true);
   // Note: deposits query doesn't have per-market errors, so we can't track specific markets here
   return { userHarborMarks: [] };
 }

 if (
   !depositsResult.data?.deposits ||
   depositsResult.data.deposits.length === 0
 ) {
   return { userHarborMarks: [] };
 }

 // Step 2: Get unique user-contract pairs
 const uniquePairs = new Map<
 string,
 { user: string; contractAddress: string }
 >();
 depositsResult.data.deposits.forEach((deposit: any) => {
 const key = `${deposit.contractAddress.toLowerCase()}-${deposit.user.toLowerCase()}`;
 if (!uniquePairs.has(key)) {
 uniquePairs.set(key, {
 user: deposit.user.toLowerCase(),
 contractAddress: deposit.contractAddress.toLowerCase(),
 });
 }
 });

 // Step 3: Fetch marks for each unique pair
 const marksPromises = Array.from(uniquePairs.values()).map(
 async (pair) => {
 const id = `${pair.contractAddress}-${pair.user}`;
 const marksResponse = await fetch(graphUrl, {
 method:"POST",
 headers: getGraphHeaders(),
 body: JSON.stringify({
 query: USER_MARKS_QUERY,
 variables: { id },
 }),
 });

 if (!marksResponse.ok) {
   return null;
 }

 const marksResult = await marksResponse.json();

 if (marksResult.errors || !marksResult.data?.userHarborMarks) {
   if (marksResult.errors) {
     const isIndexerErr = hasIndexerError(marksResult.errors);
     setHasIndexerErrors((prev) => prev || isIndexerErr);
     setHasAnyErrors((prev) => prev || true);
     setMarketsWithErrors((prev) => {
       const newSet = new Set(prev);
       newSet.add(pair.contractAddress);
       return newSet;
     });
   }
   return null;
 }

 // Successfully got data for this market - remove it from error set if it was there
 setMarketsWithErrors((prev) => {
   if (prev.has(pair.contractAddress)) {
     const newSet = new Set(prev);
     newSet.delete(pair.contractAddress);
     return newSet;
   }
   return prev;
 });

 return marksResult.data.userHarborMarks as UserMarksEntry;
 }
 );

 const marks = await Promise.all(marksPromises);
 const validMarks = marks.filter((m): m is UserMarksEntry => m !== null);

 return { userHarborMarks: validMarks };
 },
 refetchInterval: 30000,
 staleTime: 10000,
 });

 // Query all ha token balances
 const { data: haTokenBalancesData, isLoading: isLoadingHaTokenBalances } =
 useQuery<{ haTokenBalances: HaTokenBalance[] }>({
 queryKey: ["allHaTokenBalances"],
 queryFn: async () => {
 const response = await fetch(graphUrl, {
 method:"POST",
 headers: getGraphHeaders(),
 body: JSON.stringify({
 query: ALL_HA_TOKEN_BALANCES_QUERY,
 }),
 });

 if (!response.ok) {
 throw new Error(`GraphQL query failed: ${response.statusText}`);
 }

 const result = await response.json();

 if (result.errors) {
   const isIndexerErr = hasIndexerError(result.errors);
   setHasIndexerErrors((prev) => prev || isIndexerErr);
   setHasAnyErrors((prev) => prev || true);
   return { haTokenBalances: [] };
 }

 return result.data || { haTokenBalances: [] };
 },
 refetchInterval: 30000,
 staleTime: 10000,
 });

 // Query all stability pool deposits
 const {
 data: stabilityPoolDepositsData,
 isLoading: isLoadingStabilityPoolDeposits,
 } = useQuery<{ stabilityPoolDeposits: StabilityPoolDeposit[] }>({
 queryKey: ["allStabilityPoolDeposits"],
 queryFn: async () => {
 const response = await fetch(graphUrl, {
 method:"POST",
 headers: getGraphHeaders(),
 body: JSON.stringify({
 query: ALL_STABILITY_POOL_DEPOSITS_QUERY,
 }),
 });

 if (!response.ok) {
 throw new Error(`GraphQL query failed: ${response.statusText}`);
 }

 const result = await response.json();
 
 if (result.errors) {
   const isIndexerErr = hasIndexerError(result.errors);
   setHasIndexerErrors((prev) => prev || isIndexerErr);
   setHasAnyErrors((prev) => prev || true);
   return { stabilityPoolDeposits: [] };
 }

 return result.data || { stabilityPoolDeposits: [] };
 },
 refetchInterval: 30000,
 staleTime: 10000,
 });

 // Query all sail token balances
 const { data: sailTokenBalancesData, isLoading: isLoadingSailTokenBalances } =
 useQuery<{ sailTokenBalances: SailTokenBalance[] }>({
 queryKey: ["allSailTokenBalances"],
 queryFn: async () => {
 const response = await fetch(graphUrl, {
 method:"POST",
 headers: getGraphHeaders(),
 body: JSON.stringify({
 query: ALL_SAIL_TOKEN_BALANCES_QUERY,
 }),
 });

 if (!response.ok) {
 throw new Error(`GraphQL query failed: ${response.statusText}`);
 }

 const result = await response.json();

 if (result.errors) {
   const isIndexerErr = hasIndexerError(result.errors);
   setHasIndexerErrors((prev) => prev || isIndexerErr);
   setHasAnyErrors((prev) => prev || true);
   return { sailTokenBalances: [] };
 }

 return result.data || { sailTokenBalances: [] };
 },
 refetchInterval: 30000,
 staleTime: 10000,
 });

  // Query boost windows for all markets (not just leaderboard data) so boost banners show when no wallet is connected
  const boostIds = useMemo(() => {
    const ids: string[] = [];
    // Include all anchor markets
    const anchorMarkets = Object.entries(markets).filter(([_, m]) => m.peggedToken);
    for (const [_, market] of anchorMarkets) {
      const peggedTokenAddress = (market as any)?.addresses?.peggedToken as string | undefined;
      if (peggedTokenAddress) {
        ids.push(`haToken-${peggedTokenAddress.toLowerCase()}`);
      }
      const collateralPoolAddress = (market as any)?.addresses?.stabilityPoolCollateral as string | undefined;
      if (collateralPoolAddress) {
        ids.push(`stabilityPoolCollateral-${collateralPoolAddress.toLowerCase()}`);
      }
      const leveragedPoolAddress = (market as any)?.addresses?.stabilityPoolLeveraged as string | undefined;
      if (leveragedPoolAddress) {
        ids.push(`stabilityPoolLeveraged-${leveragedPoolAddress.toLowerCase()}`);
      }
    }
    // Include all sail markets
    const sailMarkets = Object.entries(markets).filter(([_, m]) => m.leveragedToken);
    for (const [_, market] of sailMarkets) {
      const leveragedTokenAddress = (market as any)?.addresses?.leveragedToken as string | undefined;
      if (leveragedTokenAddress) {
        ids.push(`sailToken-${leveragedTokenAddress.toLowerCase()}`);
      }
    }
    return Array.from(new Set(ids)).filter((id) => id.includes("0x"));
  }, []);

  const { data: boostWindowsData } = useMarketBoostWindows({
    enabled: boostIds.length > 0,
    ids: boostIds,
    first: 250,
  });

  const { activeAnchorBoostEndTimestamp, activeSailBoostEndTimestamp } = useMemo(() => {
    const nowSec = Math.floor(Date.now() / 1000);
    const windows = boostWindowsData?.marketBoostWindows ?? [];

    const activeAnchorEnds = windows
      .filter((w) => Number(w.boostMultiplier) >= 10)
      .filter((w) => nowSec >= Number(w.startTimestamp) && nowSec < Number(w.endTimestamp))
      .map((w) => Number(w.endTimestamp));

    const activeSailEnds = windows
      .filter((w) => Number(w.boostMultiplier) >= 2 && Number(w.boostMultiplier) < 10)
      .filter((w) => nowSec >= Number(w.startTimestamp) && nowSec < Number(w.endTimestamp))
      .map((w) => Number(w.endTimestamp));

    return {
      activeAnchorBoostEndTimestamp: activeAnchorEnds.length
        ? Math.min(...activeAnchorEnds)
        : null,
      activeSailBoostEndTimestamp: activeSailEnds.length ? Math.min(...activeSailEnds) : null,
    };
  }, [boostWindowsData]);

 const isCampaignLoading = isLoadingCampaignLeaderboard;
 const isAnchorSailLoading =
  isLoadingHaTokenBalances ||
  isLoadingStabilityPoolDeposits ||
  isLoadingSailTokenBalances;
 const isLoading = leaderboardTab === "campaigns"
  ? isCampaignLoading
  : isAnchorSailLoading;
 const error =
  leaderboardTab === "campaigns" ? campaignLeaderboardError : marksError;

 // Reset errors when all queries succeed
 // Reset errors only when queries succeed without errors AND no markets have errors
 useEffect(() => {
   // Only reset errors if:
   // 1. All queries have completed (not loading)
   // 2. No query-level errors
   // 3. No markets have errors (marketsWithErrors is empty)
   if (!isLoading && !error && !marksError && marketsWithErrors.size === 0) {
     // Check if all queries have data (or empty arrays, which is fine)
     const allQueriesHaveData = 
       marksData !== undefined &&
       haTokenBalancesData !== undefined &&
       stabilityPoolDepositsData !== undefined &&
       sailTokenBalancesData !== undefined;
     
     if (allQueriesHaveData) {
       // Only clear errors if we're sure there are no errors
       // This means all queries succeeded and no markets have errors
       setHasIndexerErrors(false);
       setHasAnyErrors(false);
     }
   }
 }, [isLoading, error, marksError, marksData, haTokenBalancesData, stabilityPoolDepositsData, sailTokenBalancesData, marketsWithErrors.size]);

const campaignLeaderboardData = useMemo(() => {
 const entries = campaignLeaderboardMarksData?.userHarborMarks_collection || [];
 if (entries.length === 0) return [];
 const userMap = new Map<
  string,
  { address: string; totalMarks: number; marksPerDay: number; bonusMarks: number }
 >();

 entries.forEach((entry) => {
  const userAddress = entry.user?.toLowerCase();
  if (!userAddress) return;
  if (isContractAddress(userAddress)) return;

  const live = getLiveMarks(entry);
  if (isNaN(live.currentMarks) || (live.currentMarks === 0 && live.marksPerDay === 0)) {
    return;
  }

  if (!userMap.has(userAddress)) {
    userMap.set(userAddress, {
      address: entry.user?.toLowerCase() || userAddress,
      totalMarks: 0,
      marksPerDay: 0,
      bonusMarks: 0,
    });
  }

  const user = userMap.get(userAddress)!;
  user.totalMarks += live.currentMarks;
  user.marksPerDay += live.marksPerDay;
  user.bonusMarks += live.bonusMarks;
 });

 const sorted = Array.from(userMap.values()).sort((a, b) => {
  let aValue = 0;
  let bValue = 0;
  if (campaignSortBy === "perDay") {
    aValue = a.marksPerDay;
    bValue = b.marksPerDay;
  } else if (campaignSortBy === "bonus") {
    aValue = a.bonusMarks;
    bValue = b.bonusMarks;
  } else {
    aValue = a.totalMarks;
    bValue = b.totalMarks;
  }
  return campaignSortDirection === "desc" ? bValue - aValue : aValue - bValue;
 });

 return sorted;
}, [campaignLeaderboardMarksData, campaignSortBy, campaignSortDirection, currentChainTime]);

const anchorSailLeaderboardData = useMemo(() => {
 const haTokenBalances = haTokenBalancesData?.haTokenBalances || [];
 const stabilityPoolDeposits =
  stabilityPoolDepositsData?.stabilityPoolDeposits || [];
 const sailTokenBalances = sailTokenBalancesData?.sailTokenBalances || [];

 if (
  haTokenBalances.length === 0 &&
  stabilityPoolDeposits.length === 0 &&
  sailTokenBalances.length === 0
 ) {
  return [];
 }

 const userMap = new Map<
  string,
  { address: string; totalMarks: number; anchorMarks: number; sailMarks: number; marksPerDay: number }
 >();

 const ensureUser = (userAddress: string, rawAddress: string) => {
  if (!userMap.has(userAddress)) {
    userMap.set(userAddress, {
      address: rawAddress,
      totalMarks: 0,
      anchorMarks: 0,
      sailMarks: 0,
      marksPerDay: 0,
    });
  }
  return userMap.get(userAddress)!;
 };

 haTokenBalances.forEach((balance) => {
  const userAddress = balance.user?.toLowerCase();
  if (!userAddress) return;
  if (isContractAddress(userAddress)) return;
  const estimatedMarks = calculateEstimatedMarks(balance, currentChainTime);
  const marksPerDay = parseFloat(balance.marksPerDay || "0");
  if (estimatedMarks === 0 && marksPerDay === 0) return;
  const user = ensureUser(userAddress, balance.user?.toLowerCase() || userAddress);
  user.totalMarks += estimatedMarks;
  user.anchorMarks += estimatedMarks;
  user.marksPerDay += marksPerDay;
 });

 stabilityPoolDeposits.forEach((deposit) => {
  const userAddress = deposit.user?.toLowerCase();
  if (!userAddress) return;
  if (isContractAddress(userAddress)) return;
  const estimatedMarks = calculateEstimatedMarks(deposit, currentChainTime);
  const marksPerDay = parseFloat(deposit.marksPerDay || "0");
  if (estimatedMarks === 0 && marksPerDay === 0) return;
  const user = ensureUser(userAddress, deposit.user?.toLowerCase() || userAddress);
  user.totalMarks += estimatedMarks;
  user.anchorMarks += estimatedMarks;
  user.marksPerDay += marksPerDay;
 });

 sailTokenBalances.forEach((balance) => {
  const userAddress = balance.user?.toLowerCase();
  if (!userAddress) return;
  if (isContractAddress(userAddress)) return;
  const estimatedMarks = calculateEstimatedMarks(balance, currentChainTime);
  const marksPerDay = parseFloat(balance.marksPerDay || "0");
  if (estimatedMarks === 0 && marksPerDay === 0) return;
  const user = ensureUser(userAddress, balance.user?.toLowerCase() || userAddress);
  user.totalMarks += estimatedMarks;
  user.sailMarks += estimatedMarks;
  user.marksPerDay += marksPerDay;
 });

 const sorted = Array.from(userMap.values()).sort((a, b) => {
  let aValue = 0;
  let bValue = 0;
  if (anchorSailSortBy === "anchor") {
    aValue = a.anchorMarks;
    bValue = b.anchorMarks;
  } else if (anchorSailSortBy === "sail") {
    aValue = a.sailMarks;
    bValue = b.sailMarks;
  } else if (anchorSailSortBy === "perDay") {
    aValue = a.marksPerDay;
    bValue = b.marksPerDay;
  } else {
    aValue = a.totalMarks;
    bValue = b.totalMarks;
  }
  return anchorSailSortDirection === "desc" ? bValue - aValue : aValue - bValue;
 });

 return sorted;
}, [
 haTokenBalancesData,
 stabilityPoolDepositsData,
 sailTokenBalancesData,
 anchorSailSortBy,
 anchorSailSortDirection,
 currentChainTime,
]);

const handleCampaignSort = (column: typeof campaignSortBy) => {
 if (campaignSortBy === column) {
  setCampaignSortDirection(
    campaignSortDirection === "desc" ? "asc" : "desc"
  );
 } else {
  setCampaignSortBy(column);
  setCampaignSortDirection("desc");
 }
};

const handleAnchorSailSort = (column: typeof anchorSailSortBy) => {
 if (anchorSailSortBy === column) {
  setAnchorSailSortDirection(
    anchorSailSortDirection === "desc" ? "asc" : "desc"
  );
 } else {
  setAnchorSailSortBy(column);
  setAnchorSailSortDirection("desc");
 }
};

 const leaderboardRows =
  leaderboardTab === "campaigns" ? campaignLeaderboardData : anchorSailLeaderboardData;
 const leaderboardData = leaderboardRows;

 return (
 <div className="min-h-screen bg-[#1E4775] overflow-x-hidden">
 <main className="container mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-2">
          {/* Title Row */}
          <div className="p-4 flex items-center justify-center mb-0">
            <h1 className="font-bold font-mono text-white text-5xl sm:text-6xl md:text-7xl text-center">
              Ledger Marks
            </h1>
          </div>

          {/* Subheader */}
          <div className="flex items-center justify-center mb-2 -mt-2">
            <p className="text-white/80 text-lg text-center">
              Leaderboard
            </p>
          </div>

          {/** Boost bar removed */}
        </div>

          {/* Explainer Section */}
          <div className="bg-black/[0.10] border border-white/10 backdrop-blur-sm rounded-none overflow-hidden p-4 mb-4">
            <div className="flex items-start gap-3">
              <Image
                src="/icons/marks.png"
                alt="Ledger Marks"
                width={24}
                height={24}
                className="flex-shrink-0 mt-0.5"
              />
              <div className="flex-1">
                <h3 className="font-bold text-lg text-white mb-2">
                  What are Ledger Marks?
                </h3>
                <div className="space-y-3 text-white/90 leading-relaxed text-sm">
                  <p>
                    A ledger is both a record of truth and a core DeFi symbol —
                    and a mark is what every sailor leaves behind on a voyage.
                  </p>
                  <p>
                    Each Ledger Mark is proof that you were here early, helping
                    stabilize the first Harbor markets and guide them through calm
                    launch conditions.
                  </p>
 <div className="space-y-2 mt-3">
 <div className="flex items-start gap-2">
 <span className="text-white/70 mt-0.5">•</span>
 <p>
 <strong>Maiden Voyage Deposits:</strong> Earn 10{" "}
 <Image
   src="/icons/marks.png"
   alt="Marks"
   width={14}
   height={14}
   className="inline-block align-middle mx-0.5"
 />{" "}
 per dollar per day during maiden voyage, plus 100{" "}
 <Image
   src="/icons/marks.png"
   alt="Marks"
   width={14}
   height={14}
   className="inline-block align-middle mx-0.5"
 />{" "}
 per dollar bonus at maiden voyage end.
 </p>
 </div>
                <div className="flex items-start gap-2">
                  <span className="text-white/70 mt-0.5">•</span>
                  <p>
                    <strong>Holding Anchor Tokens:</strong> Earn 1{" "}
                    <Image
                      src="/icons/marks.png"
                      alt="Marks"
                      width={14}
                      height={14}
                      className="inline-block align-middle mx-0.5"
                    />{" "}
                    per dollar per day.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-white/70 mt-0.5">•</span>
                  <p>
                    <strong>Holding Sail Tokens:</strong> Earn 10{" "}
                    <Image
                      src="/icons/marks.png"
                      alt="Marks"
                      width={14}
                      height={14}
                      className="inline-block align-middle mx-0.5"
                    />{" "}
                    per dollar per day.
                  </p>
                </div>
 <div className="flex items-start gap-2">
 <span className="text-white/70 mt-0.5">•</span>
 <p>
 When $TIDE surfaces, these marks will convert into your
 share of rewards and governance power.
 </p>
 </div>
 </div>
 <p className="text-white/80 italic mt-3 pt-3 border-t border-white/20">
 Think of them as a record of your journey — every mark, a line
 in Harbor's logbook.
 </p>
 </div>
 </div>
        </div>
        </div>

        {/* Subgraph Error Banners */}
        {hasIndexerErrors && (
          <div className="bg-[#FF8A7A]/10 border border-[#FF8A7A]/30 rounded-none p-3 mb-4">
            <div className="flex items-start gap-3">
              <div className="text-[#FF8A7A] text-xl mt-0.5">⚠️</div>
              <div className="flex-1">
                <p className="text-[#FF8A7A] font-semibold text-sm mb-1">
                  Temporary Service Issue
                </p>
                <p className="text-white/70 text-xs mb-2">
                  The Graph Network indexers are temporarily unavailable for some markets. Your Harbor Marks are safe and will display correctly once the service is restored. This is a temporary infrastructure issue, not a problem with your account.
                </p>
                {marketsWithErrors.size > 0 && (
                  <div className="mt-2 pt-2 border-t border-[#FF8A7A]/20">
                    <p className="text-[#FF8A7A]/90 text-xs font-medium mb-1">
                      Markets affected: {Array.from(marketsWithErrors).map(getMarketNameFromAddress).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {hasAnyErrors && !hasIndexerErrors && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-none p-3 mb-4">
            <div className="flex items-start gap-3">
              <div className="text-yellow-500 text-xl mt-0.5">⚠️</div>
              <div className="flex-1">
                <p className="text-yellow-500 font-semibold text-sm mb-1">
                  Harbor Marks Data Unavailable
                </p>
                <p className="text-white/70 text-xs mb-2">
                  Unable to load Harbor Marks data for some markets. Your positions and core functionality remain unaffected. Please try refreshing the page.
                </p>
                {marketsWithErrors.size > 0 && (
                  <div className="mt-2 pt-2 border-t border-yellow-500/20">
                    <p className="text-yellow-500/90 text-xs font-medium mb-1">
                      Markets affected: {Array.from(marketsWithErrors).map(getMarketNameFromAddress).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {anchorLedgerMarksError && !hasIndexerErrors && !hasAnyErrors && (
          <div className="bg-[#FF8A7A]/10 border border-[#FF8A7A]/30 rounded-none p-3 mb-4">
            <div className="flex items-start gap-3">
              <div className="text-[#FF8A7A] text-xl mt-0.5">⚠️</div>
              <div className="flex-1">
                <p className="text-[#FF8A7A] font-semibold text-sm mb-1">
                  Temporary Service Issue
                </p>
                <p className="text-white/70 text-xs">
                  The Graph Network indexers are temporarily unavailable. Your Harbor Marks are safe and will display correctly once the service is restored. This is a temporary infrastructure issue, not a problem with your account.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-black/[0.10] border border-white/10 backdrop-blur-sm rounded-none overflow-hidden p-4 mb-2">
        {/* Leaderboard Tabs */}
        <div className="flex flex-col gap-2 mb-2">
          <div className="flex items-center gap-4 border-b border-white/15">
            <button
              onClick={() => setLeaderboardTab("campaigns")}
              className={`px-1 pb-2 pt-1 text-xs font-semibold border-b-2 -mb-px transition-colors ${
                leaderboardTab === "campaigns"
                  ? "text-white border-white"
                  : "text-white/70 border-transparent hover:text-white hover:border-white/50"
              }`}
            >
              Maiden Voyage Campaigns
            </button>
            <button
              onClick={() => setLeaderboardTab("anchor-sail")}
              className={`px-1 pb-2 pt-1 text-xs font-semibold border-b-2 -mb-px transition-colors ${
                leaderboardTab === "anchor-sail"
                  ? "text-white border-white"
                  : "text-white/70 border-transparent hover:text-white hover:border-white/50"
              }`}
            >
              Anchor &amp; Sail Marks
            </button>
          </div>
          <div
            className={`flex items-center gap-4 border-b border-white/10 min-h-[30px] overflow-x-auto ${
              leaderboardTab === "campaigns"
                ? "opacity-100"
                : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="flex items-center gap-4 whitespace-nowrap">
              {campaignTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCampaignTab(tab.id)}
                  className={`px-1 pb-2 pt-1 text-xs font-semibold border-b-2 -mb-px transition-colors ${
                    campaignTab === tab.id
                      ? "text-white border-white"
                      : "text-white/70 border-transparent hover:text-white hover:border-white/50"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.subtitle && (
                    <span className="ml-2 text-[10px] text-white/60">
                      {tab.subtitle}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Ledger Marks Summary */}
        {isConnected && (
          <div className="bg-[rgb(var(--surface-selected-rgb))] p-3 mb-2">
            <div className="flex items-start gap-2">
              <WalletIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-base text-[#1E4775] mb-2">
                  {leaderboardTab === "campaigns"
                    ? `${activeCampaign.label} Maiden Voyage Summary`
                    : "Anchor & Sail Marks Summary"}
                </h3>
                {leaderboardTab === "campaigns" ? (
                  isLoadingCampaignMarks ? (
                    <p className="text-[#1E4775]/70 text-sm">
                      Loading your marks...
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                      <div className="bg-white p-2">
                        <div className="text-xs text-[#1E4775]/70 mb-0.5 text-center">
                          {activeCampaign.label} Maiden Voyage Marks
                        </div>
                        <div className="flex items-baseline gap-1 justify-center">
                          <div className="text-base font-bold text-[#1E4775]">
                            {campaignUserTotals.totalMarks.toLocaleString(
                              undefined,
                              {
                                minimumFractionDigits:
                                  campaignUserTotals.totalMarks < 100 ? 2 : 0,
                                maximumFractionDigits:
                                  campaignUserTotals.totalMarks < 100 ? 2 : 0,
                              }
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="bg-white p-2">
                        <div className="text-xs text-[#1E4775]/70 mb-0.5 text-center">
                          Marks per Day
                        </div>
                        <div className="flex items-baseline gap-1 justify-center">
                          <div className="text-base font-bold text-[#1E4775]">
                            {campaignUserTotals.marksPerDay.toLocaleString(
                              undefined,
                              {
                                maximumFractionDigits: 2,
                              }
                            )}
                          </div>
                          <div className="text-[10px] text-[#1E4775]/60">
                            marks/day
                          </div>
                        </div>
                      </div>
                      <div className="bg-white p-2">
                        <div className="text-xs text-[#1E4775]/70 mb-0.5 text-center">
                          Bonus at End
                        </div>
                        <div className="flex items-baseline gap-1 justify-center">
                          <div className="text-base font-bold text-[#1E4775]">
                            {campaignUserTotals.bonusMarks.toLocaleString(
                              undefined,
                              {
                                minimumFractionDigits:
                                  campaignUserTotals.bonusMarks < 100 ? 2 : 0,
                                maximumFractionDigits:
                                  campaignUserTotals.bonusMarks < 100 ? 2 : 0,
                              }
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                ) : isLoadingAnchorLedgerMarks ? (
                  <p className="text-[#1E4775]/70 text-sm">
                    Loading your marks...
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                    <div className="bg-white p-2">
                      <div className="text-xs text-[#1E4775]/70 mb-0.5 text-center">
                        Anchor Marks per Day
                      </div>
                      <div className="flex items-baseline gap-1 justify-center">
                        <div className="text-base font-bold text-[#1E4775]">
                          {anchorMarksPerDay.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div className="text-[10px] text-[#1E4775]/60">
                          marks/day
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-2">
                      <div className="text-xs text-[#1E4775]/70 mb-0.5 text-center">
                        Anchor Ledger Marks
                      </div>
                      <div className="flex items-baseline gap-1 justify-center">
                        <div className="text-base font-bold text-[#1E4775]">
                          {totalAnchorLedgerMarks.toLocaleString(undefined, {
                            minimumFractionDigits:
                              totalAnchorLedgerMarks < 100 ? 2 : 0,
                            maximumFractionDigits:
                              totalAnchorLedgerMarks < 100 ? 2 : 0,
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-2">
                      <div className="text-xs text-[#1E4775]/70 mb-0.5 text-center">
                        Sail Marks per Day
                      </div>
                      <div className="flex items-baseline gap-1 justify-center">
                        <div className="text-base font-bold text-[#1E4775]">
                          {sailMarksPerDay.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div className="text-[10px] text-[#1E4775]/60">
                          marks/day
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#1E4775] p-2">
                      <div className="text-xs text-white/70 mb-0.5 text-center">
                        Total Marks per Day
                      </div>
                      <div className="flex items-baseline gap-1 justify-center">
                        <div className="text-base font-bold text-white">
                          {anchorSailMarksPerDay.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div className="text-[10px] text-white/60">
                          marks/day
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </div>

 {/* Divider */}
 <div className="border-t border-white/10 my-2"></div>

 {/* Leaderboard */}
 <section className="space-y-2 overflow-visible">
        {/* Mobile Header Row */}
        {leaderboardTab === "campaigns" ? (
          <div className="md:hidden bg-white py-1.5 px-2 overflow-x-auto mb-0">
            <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr] gap-2 sm:gap-4 items-center uppercase tracking-wider text-[10px] text-[#1E4775] font-semibold">
              <div className="min-w-0 text-center pl-2">Rank</div>
              <div className="min-w-0 text-center">Wallet</div>
              <div
                className="min-w-0 text-center cursor-pointer hover:opacity-70 transition-opacity"
                onClick={() => handleCampaignSort("total")}
              >
                Total Marks
                {campaignSortBy === "total" && (
                  <span className="ml-1">
                    {campaignSortDirection === "desc" ? "↓" : "↑"}
                  </span>
                )}
              </div>
              <div
                className="min-w-0 text-center cursor-pointer hover:opacity-70 transition-opacity"
                onClick={() => handleCampaignSort("perDay")}
              >
                Marks/Day
                {campaignSortBy === "perDay" && (
                  <span className="ml-1">
                    {campaignSortDirection === "desc" ? "↓" : "↑"}
                  </span>
                )}
              </div>
              <div
                className="min-w-0 text-center cursor-pointer hover:opacity-70 transition-opacity"
                onClick={() => handleCampaignSort("bonus")}
              >
                Bonus
                {campaignSortBy === "bonus" && (
                  <span className="ml-1">
                    {campaignSortDirection === "desc" ? "↓" : "↑"}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="md:hidden bg-white py-1.5 px-2 overflow-x-auto mb-0">
            <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-2 sm:gap-4 items-center uppercase tracking-wider text-[10px] text-[#1E4775] font-semibold">
              <div className="min-w-0 text-center pl-2">Rank</div>
              <div className="min-w-0 text-center">Wallet</div>
              <div
                className="min-w-0 text-center cursor-pointer hover:opacity-70 transition-opacity"
                onClick={() => handleAnchorSailSort("total")}
              >
                Total Marks
                {anchorSailSortBy === "total" && (
                  <span className="ml-1">
                    {anchorSailSortDirection === "desc" ? "↓" : "↑"}
                  </span>
                )}
              </div>
              <div
                className="min-w-0 text-center cursor-pointer hover:opacity-70 transition-opacity"
                onClick={() => handleAnchorSailSort("perDay")}
              >
                Marks/Day
                {anchorSailSortBy === "perDay" && (
                  <span className="ml-1">
                    {anchorSailSortDirection === "desc" ? "↓" : "↑"}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Desktop Header Row */}
        {leaderboardTab === "campaigns" ? (
          <div className="hidden md:block bg-white py-1.5 px-2 overflow-x-auto mb-0">
            <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr] gap-4 items-center uppercase tracking-wider text-[10px] lg:text-[11px] text-[#1E4775] font-semibold">
              <div className="min-w-0 text-center pl-6">Rank</div>
              <div className="min-w-0 text-center">Wallet Address</div>
              <div
                className="min-w-0 text-center cursor-pointer hover:opacity-70 transition-opacity"
                onClick={() => handleCampaignSort("total")}
              >
                Total Marks
                {campaignSortBy === "total" && (
                  <span className="ml-1">
                    {campaignSortDirection === "desc" ? "↓" : "↑"}
                  </span>
                )}
              </div>
              <div
                className="min-w-0 text-center cursor-pointer hover:opacity-70 transition-opacity"
                onClick={() => handleCampaignSort("perDay")}
              >
                Marks Per Day
                {campaignSortBy === "perDay" && (
                  <span className="ml-1">
                    {campaignSortDirection === "desc" ? "↓" : "↑"}
                  </span>
                )}
              </div>
              <div
                className="min-w-0 text-center cursor-pointer hover:opacity-70 transition-opacity"
                onClick={() => handleCampaignSort("bonus")}
              >
                Bonus at End
                {campaignSortBy === "bonus" && (
                  <span className="ml-1">
                    {campaignSortDirection === "desc" ? "↓" : "↑"}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden md:block bg-white py-1.5 px-2 overflow-x-auto mb-0">
            <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr] gap-4 items-center uppercase tracking-wider text-[10px] lg:text-[11px] text-[#1E4775] font-semibold">
              <div className="min-w-0 text-center pl-6">Rank</div>
              <div className="min-w-0 text-center">Wallet Address</div>
              <div
                className="min-w-0 text-center cursor-pointer hover:opacity-70 transition-opacity"
                onClick={() => handleAnchorSailSort("total")}
              >
                Total Marks
                {anchorSailSortBy === "total" && (
                  <span className="ml-1">
                    {anchorSailSortDirection === "desc" ? "↓" : "↑"}
                  </span>
                )}
              </div>
              <div
                className="min-w-0 text-center cursor-pointer hover:opacity-70 transition-opacity"
                onClick={() => handleAnchorSailSort("anchor")}
              >
                Anchor Marks
                {anchorSailSortBy === "anchor" && (
                  <span className="ml-1">
                    {anchorSailSortDirection === "desc" ? "↓" : "↑"}
                  </span>
                )}
              </div>
              <div
                className="min-w-0 text-center cursor-pointer hover:opacity-70 transition-opacity"
                onClick={() => handleAnchorSailSort("sail")}
              >
                Sail Marks
                {anchorSailSortBy === "sail" && (
                  <span className="ml-1">
                    {anchorSailSortDirection === "desc" ? "↓" : "↑"}
                  </span>
                )}
              </div>
              <div
                className="min-w-0 text-center cursor-pointer hover:opacity-70 transition-opacity"
                onClick={() => handleAnchorSailSort("perDay")}
              >
                Marks Per Day
                {anchorSailSortBy === "perDay" && (
                  <span className="ml-1">
                    {anchorSailSortDirection === "desc" ? "↓" : "↑"}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

 {/* Leaderboard Rows */}
 {isLoading ? (
 <div className="bg-white p-8 text-center text-gray-500">
 Loading leaderboard...
 </div>
 ) : error ? (
 <div className="bg-white p-8 text-center text-red-500">
 Error loading leaderboard:{" "}
 {error instanceof Error ? error.message :"Unknown error"}
 </div>
 ) : leaderboardData.length === 0 ? (
 <div className="bg-white p-8 text-center">
 {hasAnyErrors || hasIndexerErrors ? (
   <div className="space-y-3">
     <div className="text-[#FF8A7A] font-semibold text-sm">
       Unable to Load Leaderboard Data
     </div>
     <div className="text-gray-500 text-xs">
       {hasIndexerErrors 
         ? "The Graph Network indexers are temporarily unavailable. Your Harbor Marks are safe and will display correctly once the service is restored."
         : "Unable to load Harbor Marks data. Please try refreshing the page."}
     </div>
     {marketsWithErrors.size > 0 && (
       <div className="text-gray-400 text-xs mt-2">
         Markets affected: {Array.from(marketsWithErrors).map(getMarketNameFromAddress).join(', ')}
       </div>
     )}
   </div>
 ) : (
   <div className="text-gray-500">No marks data available yet</div>
 )}
 </div>
 ) : (
 leaderboardData.map((user, index) => (
 <div
 key={`${user.address.toLowerCase()}-${index}`}
 className="bg-white p-2 sm:p-3 overflow-x-auto"
 >
 {/* Mobile Row */}
 {leaderboardTab === "campaigns" ? (
   <div className="md:hidden grid grid-cols-[auto_1fr_1fr_1fr_1fr] gap-2 sm:gap-4 items-center text-sm text-[#1E4775]">
     <div className="min-w-0 text-center font-medium pl-2">
       <div className="flex items-center justify-center gap-1">
         <span>{index + 1}</span>
       </div>
     </div>
     <div className="min-w-0 text-center font-mono text-xs">
       <a
         href={`https://etherscan.io/address/${user.address}`}
         target="_blank"
         rel="noopener noreferrer"
         className="hover:text-[#17395F] hover:underline"
       >
         {formatAddress(user.address)}
       </a>
     </div>
     <div className="min-w-0 text-center font-bold font-mono text-xs">
       {user.totalMarks.toLocaleString(undefined, {
         minimumFractionDigits: user.totalMarks < 100 ? 2 : 0,
         maximumFractionDigits: user.totalMarks < 100 ? 2 : 0,
       })}
     </div>
     <div className="min-w-0 text-center font-mono text-xs">
       {user.marksPerDay.toLocaleString(undefined, {
         maximumFractionDigits: 2,
       })}
       /day
     </div>
     <div className="min-w-0 text-center font-mono text-xs">
       {user.bonusMarks.toLocaleString(undefined, {
         minimumFractionDigits: user.bonusMarks < 100 ? 2 : 0,
         maximumFractionDigits: user.bonusMarks < 100 ? 2 : 0,
       })}
     </div>
   </div>
 ) : (
 <div className="md:hidden grid grid-cols-[auto_1fr_1fr_1fr] gap-2 sm:gap-4 items-center text-sm text-[#1E4775]">
   <div className="min-w-0 text-center font-medium pl-2">
     <div className="flex items-center justify-center gap-1">
       <span>{index + 1}</span>
     </div>
   </div>
   <div className="min-w-0 text-center font-mono text-xs">
     <a 
       href={`https://etherscan.io/address/${user.address}`}
       target="_blank"
       rel="noopener noreferrer"
       className="hover:text-[#17395F] hover:underline"
     >
       {formatAddress(user.address)}
     </a>
   </div>
   <div className="min-w-0 text-center font-bold font-mono text-xs">
     {user.totalMarks.toLocaleString(undefined, {
       minimumFractionDigits: user.totalMarks < 100 ? 2 : 0,
       maximumFractionDigits: user.totalMarks < 100 ? 2 : 0,
     })}
   </div>
   <div className="min-w-0 text-center font-mono text-xs">
     {user.marksPerDay.toLocaleString(undefined, {
       maximumFractionDigits: 2,
     })}
     /day
   </div>
 </div>
 )}

 {/* Desktop Row */}
 {leaderboardTab === "campaigns" ? (
 <div className="hidden md:grid grid-cols-[auto_1fr_1fr_1fr_1fr] gap-4 items-center text-sm text-[#1E4775]">
 <div className="min-w-0 text-center font-medium pl-6">
 <div className="flex items-center justify-center gap-2">
 <span>{index + 1}</span>
 </div>
 </div>
 <div className="min-w-0 text-center font-mono">
 <a 
 href={`https://etherscan.io/address/${user.address}`}
 target="_blank"
 rel="noopener noreferrer"
 className="hover:text-[#17395F] hover:underline"
 >
 {formatAddress(user.address)}
 </a>
 </div>
 <div className="min-w-0 text-center font-bold font-mono">
 {user.totalMarks.toLocaleString(undefined, {
 minimumFractionDigits: user.totalMarks < 100 ? 2 : 0,
 maximumFractionDigits: user.totalMarks < 100 ? 2 : 0,
 })}
 </div>
 <div className="min-w-0 text-center font-mono">
 {user.marksPerDay.toLocaleString(undefined, {
 maximumFractionDigits: 2,
 })}
 /day
 </div>
 <div className="min-w-0 text-center font-mono">
 {user.bonusMarks.toLocaleString(undefined, {
 minimumFractionDigits: user.bonusMarks < 100 ? 2 : 0,
 maximumFractionDigits: user.bonusMarks < 100 ? 2 : 0,
 })}
 </div>
 </div>
 ) : (
 <div className="hidden md:grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr] gap-4 items-center text-sm text-[#1E4775]">
 <div className="min-w-0 text-center font-medium pl-6">
 <div className="flex items-center justify-center gap-2">
 <span>{index + 1}</span>
 </div>
 </div>
 <div className="min-w-0 text-center font-mono">
 <a 
 href={`https://etherscan.io/address/${user.address}`}
 target="_blank"
 rel="noopener noreferrer"
 className="hover:text-[#17395F] hover:underline"
 >
 {formatAddress(user.address)}
 </a>
 </div>
 <div className="min-w-0 text-center font-bold font-mono">
 {user.totalMarks.toLocaleString(undefined, {
 minimumFractionDigits: user.totalMarks < 100 ? 2 : 0,
 maximumFractionDigits: user.totalMarks < 100 ? 2 : 0,
 })}
 </div>
 <div className="min-w-0 text-center font-mono">
 {user.anchorMarks.toLocaleString(undefined, {
 minimumFractionDigits: user.anchorMarks < 100 ? 2 : 0,
 maximumFractionDigits: user.anchorMarks < 100 ? 2 : 0,
 })}
 </div>
 <div className="min-w-0 text-center font-mono">
 {user.sailMarks.toLocaleString(undefined, {
 minimumFractionDigits: user.sailMarks < 100 ? 2 : 0,
 maximumFractionDigits: user.sailMarks < 100 ? 2 : 0,
 })}
 </div>
 <div className="min-w-0 text-center font-mono">
 {user.marksPerDay.toLocaleString(undefined, {
 maximumFractionDigits: 2,
 })}
 /day
 </div>
 </div>
 )}
 </div>
 ))
 )}
 </section>
 </main>
 </div>
 );
}
