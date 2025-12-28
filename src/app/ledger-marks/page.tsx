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
import { useAnchorMarks } from "@/hooks/useAnchorMarks";
import {
 calculateEstimatedMarks,
 useAnchorLedgerMarks,
} from "@/hooks/useAnchorLedgerMarks";
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
 const [sortBy, setSortBy] = useState<
"total" |"genesis" |"anchor" |"sail" |"perDay"
 >("total");
 const [sortDirection, setSortDirection] = useState<"asc" |"desc">("desc");

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

 // Get marks from ha tokens and stability pools for connected user
 const { data: anchorMarksData, isLoading: isLoadingAnchorMarks } =
 useAnchorMarks();

 // Get anchor ledger marks (includes sail token balances)
  const {
    haBalances,
    poolDeposits,
    sailBalances,
    loading: isLoadingAnchorLedgerMarks,
    error: anchorLedgerMarksError,
  } = useAnchorLedgerMarks({ enabled: true }); // Enable subgraph queries

 // Calculate anchor marks per day (ha tokens + collateral stability pools)
 const anchorMarksPerDay = useMemo(() => {
 if (!anchorMarksData) return 0;
 return (
 anchorMarksData.haTokenMarksPerDay +
 anchorMarksData.collateralPoolMarksPerDay
 );
 }, [anchorMarksData]);

 // Calculate sail marks per day (sail stability pools + sail token holdings)
 const sailMarksPerDay = useMemo(() => {
 let total = 0;
 // Add sail stability pool marks
 if (anchorMarksData) {
 total += anchorMarksData.sailPoolMarksPerDay;
 }
 // Add sail token holdings marks
 if (sailBalances) {
 total += sailBalances.reduce(
 (sum, balance) => sum + balance.marksPerDay,
 0
 );
 }
 return total;
 }, [anchorMarksData, sailBalances]);

 // Fetch genesis/maiden voyage marks per day for connected user
 const { data: genesisMarksData, isLoading: isLoadingGenesisMarks } =
 useQuery<{
 userHarborMarks: Array<{
 marksPerDay: string;
 }>;
 }>({
 queryKey: ["genesisMarksPerDay", address],
 queryFn: async () => {
 if (!address) return { userHarborMarks: [] };

 // First, get all deposits to find unique user-contract pairs
 const depositsResponse = await fetch(graphUrl, {
 method:"POST",
 headers: getGraphHeaders(),
 body: JSON.stringify({
 query: `
 query GetUserDeposits($userAddress: Bytes!) {
 deposits(
 where: { user: $userAddress }
 first: 1000
 ) {
 id
 user
 contractAddress
 }
 }
 `,
 variables: { userAddress: address.toLowerCase() },
 }),
 });

 if (!depositsResponse.ok) {
 return { userHarborMarks: [] };
 }

 const depositsResult = await depositsResponse.json();
 if (depositsResult.errors || !depositsResult.data?.deposits) {
 return { userHarborMarks: [] };
 }

 // Get unique contract addresses for this user
 const contractAddresses = new Set<string>();
 depositsResult.data.deposits.forEach((deposit: any) => {
 contractAddresses.add(deposit.contractAddress.toLowerCase());
 });

 // Fetch marks for each contract
 const marksPromises = Array.from(contractAddresses).map(
 async (contractAddr) => {
 const id = `${contractAddr}-${address.toLowerCase()}`;
 const marksResponse = await fetch(graphUrl, {
 method:"POST",
 headers: getGraphHeaders(),
 body: JSON.stringify({
 query: `
 query GetUserMarks($id: ID!) {
 userHarborMarks(id: $id) {
 marksPerDay
 }
 }
 `,
 variables: { id },
 }),
 });

 if (!marksResponse.ok) return null;
 const marksResult = await marksResponse.json();
 return marksResult.data?.userHarborMarks || null;
 }
 );

 const marks = await Promise.all(marksPromises);
 return {
 userHarborMarks: marks.filter(
 (m): m is { marksPerDay: string } => m !== null
 ),
 };
 },
 enabled: !!address && isConnected,
 refetchInterval: 60000,
 });

 // Calculate maiden voyage marks per day
 const maidenVoyageMarksPerDay = useMemo(() => {
 if (!genesisMarksData?.userHarborMarks) return 0;
 return genesisMarksData.userHarborMarks.reduce(
 (sum, entry) => sum + parseFloat(entry.marksPerDay ||"0"),
 0
 );
 }, [genesisMarksData]);

 // Calculate total marks per day
 const totalMarksPerDay = useMemo(() => {
 return maidenVoyageMarksPerDay + anchorMarksPerDay + sailMarksPerDay;
 }, [maidenVoyageMarksPerDay, anchorMarksPerDay, sailMarksPerDay]);

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

 const isLoading =
 isLoadingMarks ||
 isLoadingHaTokenBalances ||
 isLoadingStabilityPoolDeposits ||
 isLoadingSailTokenBalances;
 const error = marksError;

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

 // Extract marks array from query result
 const marksArray = marksData?.userHarborMarks || [];

 // Process and aggregate user marks by wallet address
 const leaderboardData = useMemo(() => {
 const haTokenBalances = haTokenBalancesData?.haTokenBalances || [];
 const stabilityPoolDeposits =
 stabilityPoolDepositsData?.stabilityPoolDeposits || [];
 const sailTokenBalances = sailTokenBalancesData?.sailTokenBalances || [];

 // If no data at all, return empty
 if (
 (!marksArray || marksArray.length === 0) &&
 haTokenBalances.length === 0 &&
 stabilityPoolDeposits.length === 0 &&
 sailTokenBalances.length === 0
 ) {
   return [];
 }

 // Group by user address
 const userMap = new Map<
 string,
 {
 address: string;
 totalMarks: number;
 genesisMarks: number;
 anchorMarks: number;
 sailMarks: number;
 marksPerDay: number;
 }
 >();

 marksArray.forEach((entry) => {
   const userAddress = entry.user?.toLowerCase();
   if (!userAddress) {
     return;
   }

   // Filter out known contract addresses (they shouldn't be in the leaderboard)
   if (isContractAddress(userAddress)) {
     return;
   }

 const contractType = getContractType(entry.contractAddress);
 const currentMarksRaw = entry.currentMarks ||"0";
 let currentMarks = parseFloat(currentMarksRaw);
 const marksPerDay = parseFloat(entry.marksPerDay ||"0");
 const currentDepositUSD = parseFloat(entry.currentDepositUSD ||"0");
 const genesisEnded = entry.genesisEnded || false;
 const lastUpdated = parseInt(entry.lastUpdated ||"0");
 const genesisStartDate = parseInt(entry.genesisStartDate ||"0");

 // Accumulate marks since last update (same logic as Genesis page)
 if (!genesisEnded && currentDepositUSD > 0 && genesisStartDate > 0 && lastUpdated > 0) {
 const currentTime = currentChainTime || Math.floor(Date.now() / 1000);
 const timeElapsed = currentTime - lastUpdated;
 const daysElapsed = Math.max(0, timeElapsed / 86400); // Convert seconds to days
 const marksAccumulated = currentDepositUSD * 10 * daysElapsed;
 currentMarks = currentMarks + marksAccumulated;
 }

   // Skip entries with zero or invalid marks, but allow if marksPerDay > 0 (user is earning marks)
   if (isNaN(currentMarks) || (currentMarks === 0 && marksPerDay === 0)) {
     return;
   }

 if (!userMap.has(userAddress)) {
 userMap.set(userAddress, {
 address: entry.user?.toLowerCase() || userAddress, // Normalize to lowercase for consistency
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
 if (contractType ==="genesis") {
 user.genesisMarks += currentMarks;
 } else if (contractType ==="anchor") {
 user.anchorMarks += currentMarks;
 } else if (contractType ==="sail") {
 user.sailMarks += currentMarks;
 } else {
 // If unknown, assume it's genesis for now (since that's what we're tracking)
 user.genesisMarks += currentMarks;
 }
 });

 // Add ha token marks (using estimated marks for real-time display)
 haTokenBalances.forEach((balance) => {
 const userAddress = balance.user?.toLowerCase();
 if (!userAddress) return;

 // Filter out known contract addresses
 if (isContractAddress(userAddress)) {
   return;
 }

 const estimatedMarks = calculateEstimatedMarks(balance, currentChainTime);
 const marksPerDay = parseFloat(balance.marksPerDay ||"0");

 // Don't skip if marksPerDay > 0 even if estimatedMarks is 0 (might be just starting)
 if (estimatedMarks === 0 && marksPerDay === 0) return;

 if (!userMap.has(userAddress)) {
 userMap.set(userAddress, {
 address: balance.user?.toLowerCase() || userAddress, // Normalize to lowercase for consistency
 totalMarks: 0,
 genesisMarks: 0,
 anchorMarks: 0,
 sailMarks: 0,
 marksPerDay: 0,
 });
 }

 const user = userMap.get(userAddress)!;
 user.totalMarks += estimatedMarks;
 user.anchorMarks += estimatedMarks; // ha tokens count as anchor marks
 user.marksPerDay += marksPerDay;
 });

 // Add stability pool marks (using estimated marks for real-time display)
 stabilityPoolDeposits.forEach((deposit) => {
 const userAddress = deposit.user?.toLowerCase();
 if (!userAddress) return;

 // Filter out known contract addresses
 if (isContractAddress(userAddress)) {
 return;
 }

 const estimatedMarks = calculateEstimatedMarks(deposit, currentChainTime);
 const marksPerDay = parseFloat(deposit.marksPerDay ||"0");

 // Don't skip if marksPerDay > 0 even if estimatedMarks is 0 (might be just starting)
 if (estimatedMarks === 0 && marksPerDay === 0) return;

 if (!userMap.has(userAddress)) {
 userMap.set(userAddress, {
 address: deposit.user?.toLowerCase() || userAddress, // Normalize to lowercase for consistency
 totalMarks: 0,
 genesisMarks: 0,
 anchorMarks: 0,
 sailMarks: 0,
 marksPerDay: 0,
 });
 }

 const user = userMap.get(userAddress)!;
 user.totalMarks += estimatedMarks;

 // Categorize by pool type: collateral pools → anchor marks, sail pools → sail marks
 const poolType = deposit.poolType?.toLowerCase();
 if (poolType ==="collateral" || poolType ==="anchor") {
 user.anchorMarks += estimatedMarks;
 // Only add marksPerDay to anchor marks for collateral pools
 // (marksPerDay will be added to total marksPerDay below)
 } else if (poolType ==="sail" || poolType ==="leveraged") {
 user.sailMarks += estimatedMarks;
 // Only add marksPerDay to sail marks for sail pools
 // (marksPerDay will be added to total marksPerDay below)
 } else {
 // Default to anchor marks if pool type is unknown
 user.anchorMarks += estimatedMarks;
 }

 // Always add marksPerDay to total marksPerDay
 user.marksPerDay += marksPerDay;
 });

 // Add sail token marks (using estimated marks for real-time display)
 sailTokenBalances.forEach((balance) => {
 const userAddress = balance.user?.toLowerCase();
 if (!userAddress) return;

 // Filter out known contract addresses
 if (isContractAddress(userAddress)) {
   return;
 }

 const estimatedMarks = calculateEstimatedMarks(balance, currentChainTime);
 const marksPerDay = parseFloat(balance.marksPerDay ||"0");

 // Don't skip if marksPerDay > 0 even if estimatedMarks is 0 (might be just starting)
 if (estimatedMarks === 0 && marksPerDay === 0) return;

 if (!userMap.has(userAddress)) {
 userMap.set(userAddress, {
 address: balance.user?.toLowerCase() || userAddress, // Normalize to lowercase for consistency
 totalMarks: 0,
 genesisMarks: 0,
 anchorMarks: 0,
 sailMarks: 0,
 marksPerDay: 0,
 });
 }

 const user = userMap.get(userAddress)!;
 user.totalMarks += estimatedMarks;
 user.sailMarks += estimatedMarks; // sail tokens count as sail marks
 user.marksPerDay += marksPerDay;
 });

 // Convert to array, deduplicate by address (case-insensitive), and sort
 const userArray = Array.from(userMap.values());

 // Deduplicate by address (case-insensitive) - in case there are any edge cases
 const deduplicated = new Map<string, (typeof userArray)[0]>();
 userArray.forEach((user) => {
 const key = user.address.toLowerCase();
 if (!deduplicated.has(key)) {
 deduplicated.set(key, user);
 } else {
 // If duplicate found, merge the marks (shouldn't happen, but just in case)
 const existing = deduplicated.get(key)!;
 existing.totalMarks += user.totalMarks;
 existing.genesisMarks += user.genesisMarks;
 existing.anchorMarks += user.anchorMarks;
 existing.sailMarks += user.sailMarks;
 existing.marksPerDay += user.marksPerDay;
 }
 });

 const sorted = Array.from(deduplicated.values()).sort((a, b) => {
 let aValue: number;
 let bValue: number;

 switch (sortBy) {
 case"genesis":
 aValue = a.genesisMarks;
 bValue = b.genesisMarks;
 break;
 case"anchor":
 aValue = a.anchorMarks;
 bValue = b.anchorMarks;
 break;
 case"sail":
 aValue = a.sailMarks;
 bValue = b.sailMarks;
 break;
 case"perDay":
 aValue = a.marksPerDay;
 bValue = b.marksPerDay;
 break;
 default:
 aValue = a.totalMarks;
 bValue = b.totalMarks;
 }

 return sortDirection ==="desc" ? bValue - aValue : aValue - bValue;
 });

 return sorted;
 }, [
 marksArray,
 haTokenBalancesData,
 stabilityPoolDepositsData,
 sailTokenBalancesData,
 sortBy,
 sortDirection,
 currentChainTime, // Recalculate when chain time updates
 ]);

 const handleSort = (column: typeof sortBy) => {
 if (sortBy === column) {
 setSortDirection(sortDirection ==="desc" ?"asc" :"desc");
 } else {
 setSortBy(column);
 setSortDirection("desc");
 }
 };

 return (
 <div className="min-h-screen bg-[#1E4775] overflow-x-hidden">
 <main className="container mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-2">
          {/* Title Row with Social Buttons */}
          <div className="p-4 flex items-center justify-between mb-0">
            <div className="hidden md:block w-[120px]" /> {/* Spacer for centering */}
            <h1 className="font-bold font-mono text-white text-7xl text-center">
              Ledger Marks
            </h1>
            {/* Compact Social Buttons */}
            <div className="hidden md:flex flex-col items-end gap-2 border border-white/30  px-3 py-2">
              <div className="text-white text-xs font-medium whitespace-nowrap">
                follow to stay up to date
              </div>
              <div className="flex items-center justify-center gap-2 w-full">
                <a
                  href="https://x.com/0xharborfi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-black hover:bg-gray-800 text-white  transition-colors"
                  title="Follow @0xharborfi on X"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a
                  href="https://discord.gg/harborfin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-[#5865F2] hover:bg-[#4752C4] text-white  transition-colors"
                  title="Join Discord"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Subheader */}
          <div className="flex items-center justify-center mb-2 -mt-2">
            <p className="text-white/80 text-lg text-center">
              Leaderboard
            </p>
          </div>
        </div>

          {/* Explainer Section */}
          <div className="bg-[#17395F] p-4 mb-2">
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
 <strong>Genesis Deposits:</strong> Earn 10 marks per
 dollar per day during genesis, plus 100 marks per dollar
 bonus at genesis end.
 </p>
 </div>
                <div className="flex items-start gap-2">
                  <span className="text-white/70 mt-0.5">•</span>
                  <p>
                    <strong>Holding Anchor Tokens:</strong> Earn 1 mark per dollar
                    per day.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-white/70 mt-0.5">•</span>
                  <p>
                    <strong>Holding Sail Tokens:</strong> Earn 5 marks per dollar
                    per day.
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

        {/* Ledger Marks Summary */}
        {isConnected && (
 <div className="bg-[rgb(var(--surface-selected-rgb))] p-3 mb-2">
 <div className="flex items-start gap-2">
 <WalletIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0 mt-0.5" />
 <div className="flex-1">
 <h3 className="font-bold text-base text-[#1E4775] mb-2">
 Ledger Marks Summary
 </h3>
 {isLoadingAnchorMarks ||
 isLoadingAnchorLedgerMarks ||
 isLoadingGenesisMarks ? (
 <p className="text-[#1E4775]/70 text-sm">Loading your marks...</p>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
 <div className="bg-white p-2">
 <div className="text-xs text-[#1E4775]/70 mb-0.5 text-center">
 Maiden Voyage Marks per Day
 </div>
 <div className="flex items-baseline gap-1 justify-center">
 <div className="text-base font-bold text-[#1E4775]">
 {maidenVoyageMarksPerDay.toLocaleString(undefined, {
 maximumFractionDigits: 2,
 })}
 </div>
 <div className="text-[10px] text-[#1E4775]/60">marks/day</div>
 </div>
 </div>
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
 <div className="text-[10px] text-[#1E4775]/60">marks/day</div>
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
 <div className="text-[10px] text-[#1E4775]/60">marks/day</div>
 </div>
 </div>
 <div className="bg-[#1E4775] p-2">
 <div className="text-xs text-white/70 mb-0.5 text-center">
 Total Marks per Day
 </div>
 <div className="flex items-baseline gap-1 justify-center">
 <div className="text-base font-bold text-white">
 {totalMarksPerDay.toLocaleString(undefined, {
 maximumFractionDigits: 2,
 })}
 </div>
 <div className="text-[10px] text-white/60">marks/day</div>
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
        )}

 {/* Divider */}
 <div className="border-t border-white/10 my-2"></div>

 {/* Leaderboard */}
 <section className="space-y-2 overflow-visible">
        {/* Mobile Header Row */}
        <div className="md:hidden bg-white py-1.5 px-2 overflow-x-auto mb-0">
          <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-2 sm:gap-4 items-center uppercase tracking-wider text-[10px] text-[#1E4775] font-semibold">
            <div className="min-w-0 text-center pl-2">Rank</div>
            <div className="min-w-0 text-center">Wallet</div>
            <div
              className="min-w-0 text-center cursor-pointer hover:opacity-70 transition-opacity"
              onClick={() => handleSort("total")}
            >
              Total Marks
              {sortBy ==="total" && (
                <span className="ml-1">
                  {sortDirection ==="desc" ?"↓" :"↑"}
                </span>
              )}
            </div>
            <div
              className="min-w-0 text-center cursor-pointer hover:opacity-70 transition-opacity"
              onClick={() => handleSort("perDay")}
            >
              Marks/Day
              {sortBy ==="perDay" && (
                <span className="ml-1">
                  {sortDirection ==="desc" ?"↓" :"↑"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Header Row */}
        <div className="hidden md:block bg-white py-1.5 px-2 overflow-x-auto mb-0">
          <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 items-center uppercase tracking-wider text-[10px] lg:text-[11px] text-[#1E4775] font-semibold">
            <div className="min-w-0 text-center pl-6">Rank</div>
            <div className="min-w-0 text-center">Wallet Address</div>
            <div
 className="min-w-0 text-center cursor-pointer hover:opacity-70 transition-opacity"
 onClick={() => handleSort("total")}
 >
 Total Marks
 {sortBy ==="total" && (
 <span className="ml-1">
 {sortDirection ==="desc" ?"↓" :"↑"}
 </span>
 )}
 </div>
 <div
 className="min-w-0 text-center cursor-pointer hover:opacity-70 transition-opacity"
 onClick={() => handleSort("genesis")}
 >
 Genesis Marks
 {sortBy ==="genesis" && (
 <span className="ml-1">
 {sortDirection ==="desc" ?"↓" :"↑"}
 </span>
 )}
 </div>
 <div
 className="min-w-0 text-center cursor-pointer hover:opacity-70 transition-opacity"
 onClick={() => handleSort("anchor")}
 >
 Anchor Ledger Marks
 {sortBy ==="anchor" && (
 <span className="ml-1">
 {sortDirection ==="desc" ?"↓" :"↑"}
 </span>
 )}
 </div>
 <div
 className="min-w-0 text-center cursor-pointer hover:opacity-70 transition-opacity"
 onClick={() => handleSort("sail")}
 >
 Sail Marks
 {sortBy ==="sail" && (
 <span className="ml-1">
 {sortDirection ==="desc" ?"↓" :"↑"}
 </span>
 )}
 </div>
 <div
 className="min-w-0 text-center cursor-pointer hover:opacity-70 transition-opacity"
 onClick={() => handleSort("perDay")}
 >
 Marks Per Day
 {sortBy ==="perDay" && (
 <span className="ml-1">
 {sortDirection ==="desc" ?"↓" :"↑"}
 </span>
 )}
 </div>
 </div>
 </div>

 {/* Leaderboard Rows */}
 {isLoading ? (
 <div className="bg-white p-8 text-center text-gray-500">
 Loading leaderboard...
 </div>
 ) : error ? (
 <div className="bg-white p-8 text-center text-red-500">
 Error loading leaderboard:{""}
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

 {/* Desktop Row */}
 <div className="hidden md:grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 items-center text-sm text-[#1E4775]">
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
 {user.genesisMarks.toLocaleString(undefined, {
 minimumFractionDigits: user.genesisMarks < 100 ? 2 : 0,
 maximumFractionDigits: user.genesisMarks < 100 ? 2 : 0,
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
 </div>
 ))
 )}
 </section>
 </main>
 </div>
 );
}
