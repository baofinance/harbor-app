"use client";

import React, { useMemo, useState, useEffect } from "react";
import Head from "next/head";
import { usePublicClient } from "wagmi";
import { createPublicClient, http, defineChain } from "viem";
import {
 MapIcon,
 ChartBarIcon,
 CpuChipIcon,
 InformationCircleIcon,
 XMarkIcon,
} from "@heroicons/react/24/outline";
import TokenIcon from "@/components/TokenIcon";
import { NETWORKS, type Network } from "@/config/networks";
import { feeds, type TokenSymbol, type FeedStatus } from "@/config/feeds";
import { proxyAbi } from "@/abis/proxy";
import { aggregatorAbi } from "@/abis/chainlink";
import { customFeedAggregatorAbi } from "@/abis/harbor";
import { getLogoPath } from "@/lib/logos";
import {
 parsePair,
 format18,
 formatUnit,
 deriveFeedName,
 bytes32ToAddress,
 formatPairDisplay,
 pairEstimateLabel,
} from "@/lib/utils";
import {
 MAINNET_RPC_URL,
 ARBITRUM_RPC_URL,
 getMainnetRpcClient,
 getArbitrumRpcClient,
} from "@/config/rpc";

// Create mainnet public client - ensure it's always available
let mainnetClient: ReturnType<typeof createPublicClient>;

try {
 mainnetClient = getMainnetRpcClient();
 console.log(
"[FlowPage] Mainnet client initialized with RPC:",
 MAINNET_RPC_URL
 );
} catch (error) {
 console.error("[FlowPage] Failed to initialize mainnet client:", error);
 mainnetClient = null as any;
}

// Create Arbitrum public client - always available for fetching Arbitrum feeds
let arbitrumClient: ReturnType<typeof createPublicClient>;

try {
 arbitrumClient = getArbitrumRpcClient();
 console.log(
"[FlowPage] Arbitrum client initialized with RPC:",
 ARBITRUM_RPC_URL
 );
} catch (error) {
 console.error("[FlowPage] Failed to initialize Arbitrum client:", error);
 arbitrumClient = null as any;
}

function formatBytes32(b?: `0x${string}`) {
 return b ||"-";
}

function formatFeedIdentifier(b?: `0x${string}`) {
 if (!b) return"-";
 if (b.length === 42) return b;
 return b.replace(/^0x000000000000000000000000/i,"0x");
}

function formatHeartbeat(value?: bigint) {
 if (value === undefined) return"-";
 const seconds = Number(value);
 if (seconds <= 60) return `${seconds}s`;
 if (seconds <= 3600) return `${Math.round(seconds / 60)}m`;
 if (seconds <= 86400) return `${(seconds / 3600).toFixed(1)}h`;
 return `${(seconds / 86400).toFixed(1)}d`;
}

function formatPercent18(value?: bigint, maxFrac = 2) {
 if (value === undefined) return"-";
 const pct = (Number(value) / 1e18) * 100;
 return `${pct.toFixed(maxFrac)}%`;
}

function etherscanAddressUrl(
 address?: `0x${string}` | string
): string | undefined {
 if (!address) return undefined;
 return `https://etherscan.io/address/${address}`;
}

function arbitrumAddressUrl(
 address?: `0x${string}` | string
): string | undefined {
 if (!address) return undefined;
 return `https://arbiscan.io/address/${address}`;
}

function ExternalLinkIcon({
 className ="inline-block w-4 h-4 align-[-2px] ml-1",
}: {
 className?: string;
}) {
 return (
 <svg
 xmlns="http://www.w3.org/2000/svg"
 viewBox="0 0 24 24"
 fill="currentColor"
 className={className}
 >
 <path d="M14 3h7v7h-2V6.414l-9.293 9.293-1.414-1.414L17.586 5H14V3z" />
 <path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7z" />
 </svg>
 );
}

function ChevronIcon({
 className ="w-3 h-3 text-[#1E4775]",
 expanded = false,
}: {
 className?: string;
 expanded?: boolean;
}) {
 return (
 <svg
 xmlns="http://www.w3.org/2000/svg"
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth="2.5"
 strokeLinecap="round"
 strokeLinejoin="round"
 className={`${className} transition-transform ${
 expanded ?"rotate-90" :""
 }`}
 >
 <path d="M9 18l6-6-6-6" />
 </svg>
 );
}

// Get the appropriate RPC client based on network
function getRpcClient(network: Network, publicClient?: any) {
 // Always use mainnet client for mainnet feeds
 if (network ==="mainnet") {
 if (!mainnetClient) {
 mainnetClient = getMainnetRpcClient();
 }
 console.log("[getRpcClient] Returning mainnet client for", network);
 return mainnetClient;
 }
 // Always use dedicated Arbitrum client for Arbitrum feeds (regardless of connected chain)
 if (network ==="arbitrum") {
 if (!arbitrumClient) {
 arbitrumClient = getArbitrumRpcClient();
 }
 console.log("[getRpcClient] Returning Arbitrum client for", network);
 return arbitrumClient;
 }
 // Default to mainnet client as fallback
 console.log(
"[getRpcClient] Returning mainnet client as fallback for",
 network
 );
 return mainnetClient || getMainnetRpcClient();
}

type ExpandedState = null | {
 network: Network;
 token: string;
 feedIndex: number;
};

export default function FlowPage() {
 const publicClient = usePublicClient();
 const [expanded, setExpanded] = useState<ExpandedState>(null);

 // All networks are visible (no anvil)
 const visibleNetworks = useMemo(() => NETWORKS, []);

 return (
 <>
 <Head>
 <title>Map Room | Harbor</title>
 </Head>
 <div className="min-h-screen bg-[#1E4775] max-w-[1300px] mx-auto font-sans relative">
 <main className="container mx-auto px-3 sm:px-4 lg:px-10 pb-6">
 {/* Header */}
 <div className="mb-2 relative py-2">
 <div className="p-2 flex items-center justify-center mb-0">
 <h1 className="font-bold font-mono text-white text-7xl text-center">
 Map Room
 </h1>
 </div>
 <div className="flex items-center justify-center mb-2 -mt-2">
 <p className="text-white/80 text-lg text-center">
 Oracle feeds and price data for Harbor markets
 </p>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
 <FeatureBox
 icon={MapIcon}
 title="Oracle Feeds"
 description="View all available price feeds and oracle data"
 />
 <FeatureBox
 icon={ChartBarIcon}
 title="Price Data"
 description="Real-time prices and market data from Chainlink oracles"
 />
 <FeatureBox
 icon={CpuChipIcon}
 title="Contract Rates"
 description="Contract rates used for haTokens and stability pools"
 />
 <FeatureBox
 icon={InformationCircleIcon}
 title="Feed Details"
 description="Detailed info about heartbeat windows & deviation thresholds"
 />
 </div>
 </div>

 {/* Divider */}
 <div className="border-t border-white/20 my-2"></div>

 {/* Feed Sections */}
 <section className="space-y-2 overflow-visible">
 {visibleNetworks.map((network) => (
 <NetworkFeedGroups
 key={network}
 network={network}
 publicClient={publicClient}
 expanded={expanded}
 setExpanded={setExpanded}
 />
 ))}
 </section>

 {/* Detailed Feed Expansion */}
 {expanded && (
 <FeedDetails
 network={expanded.network}
 token={expanded.token}
 feedIndex={expanded.feedIndex}
 publicClient={publicClient}
 onClose={() => setExpanded(null)}
 />
 )}
 </main>
 </div>
 </>
 );
}

function FeatureBox({
 icon: Icon,
 title,
 description,
}: {
 icon: any;
 title: string;
 description: string;
}) {
 return (
 <div className="bg-[#17395F] p-4">
 <div className="flex items-center justify-center mb-2">
 <Icon className="w-6 h-6 text-white mr-2" />
 <h2 className="font-bold text-white text-lg text-center">{title}</h2>
 </div>
 <p className="text-sm text-white/80 text-center">{description}</p>
 </div>
 );
}

function NetworkFeedGroups({
 network,
 publicClient,
 expanded,
 setExpanded,
}: {
 network: Network;
 publicClient: any;
 expanded: ExpandedState;
 setExpanded: (state: ExpandedState) => void;
}) {
 const networkFeeds = feeds[network as keyof typeof feeds];
 if (!networkFeeds) return null;

 const tokenGroups = Object.entries(networkFeeds)
 .filter(
 ([, tokens]) => Array.isArray(tokens) && (tokens as any[]).length > 0
 )
 .map(([key]) => key);

 return (
 <>
 {tokenGroups.map((token) => (
 <FeedGroupSection
 key={`${network}-${token}`}
 network={network}
 token={token}
 publicClient={publicClient}
 expanded={expanded}
 setExpanded={setExpanded}
 />
 ))}
 </>
 );
}

function FeedGroupSection({
 network,
 token,
 publicClient,
 expanded,
 setExpanded,
}: {
 network: Network;
 token: string;
 publicClient: any;
 expanded: ExpandedState;
 setExpanded: (state: ExpandedState) => void;
}) {
 const [sectionExpanded, setSectionExpanded] = useState(false);
 const networkFeeds = feeds[network as keyof typeof feeds];
 const feedEntries =
 (networkFeeds?.[token as keyof typeof networkFeeds] as any) || [];
 const [prices, setPrices] = useState<string[]>([]);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const rpcClient = getRpcClient(network, publicClient);

 // Fetch prices for all feeds in this group
 useEffect(() => {
 if (!rpcClient || feedEntries.length === 0) {
 setPrices([]);
 return;
 }

 let cancelled = false;
 setLoading(true);
 setError(null);

 console.log(`[FeedGroupSection] Using RPC client for ${network}:`, {
 network,
 rpcUrl: network ==="mainnet" ? MAINNET_RPC_URL :"wagmi publicClient",
 feedCount: feedEntries.length,
 });

 (async () => {
 const priceResults: string[] = [];
 for (const feed of feedEntries) {
 if (cancelled) break;
 try {
 console.log(
 `[FeedGroupSection] Fetching price for ${feed.label} at ${feed.address} on ${network}`
 );
 const price = await rpcClient
 .readContract({
 address: feed.address,
 abi: proxyAbi,
 functionName:"getPrice",
 })
 .catch((err: any) => {
 console.error(
 `[FeedGroupSection] Error fetching price for ${feed.label}:`,
 err
 );
 return null;
 });

 console.log(
 `[FeedGroupSection] Price result for ${feed.label}:`,
 price
 );

 if (price !== null && price !== undefined) {
 const formatted = format18(price as bigint);
 console.log(
 `[FeedGroupSection] Formatted price for ${feed.label}:`,
 formatted
 );
 priceResults.push(formatted);
 } else {
 priceResults.push("-");
 }
 } catch (err: any) {
 console.error(
 `[FeedGroupSection] Exception fetching price for ${feed.label}:`,
 err
 );
 priceResults.push("-");
 }
 }
 if (!cancelled) {
 console.log(
 `[FeedGroupSection] Final prices for ${network} ${token}:`,
 priceResults
 );
 setPrices(priceResults);
 setLoading(false);
 if (priceResults.every((p) => p ==="-")) {
 setError("Failed to load prices. Check console for details.");
 }
 }
 })();

 return () => {
 cancelled = true;
 };
 }, [rpcClient, feedEntries, network, token]);

 const isExpanded = expanded?.network === network && expanded?.token === token;

 return (
 <div
 className={`p-2 sm:p-3 overflow-x-auto overflow-y-visible transition ${
 sectionExpanded ?"bg-[rgb(var(--surface-selected-rgb))]" :"bg-white hover:bg-[rgb(var(--surface-selected-rgb))]"
 }`}
 >
 <div
 className="flex items-center justify-between cursor-pointer hover:bg-white/10 transition py-2 px-1"
 onClick={() => setSectionExpanded(!sectionExpanded)}
 >
 <div className="flex items-center gap-2">
 <ChevronIcon
 expanded={sectionExpanded}
 className="w-4 h-4 text-[#1E4775]"
 />
 <h2 className="text-sm font-semibold text-[#1E4775]">
 {network} {token} Feeds
 </h2>
 </div>
 <div className="text-xs text-[#1E4775]/50 whitespace-nowrap">
 {feedEntries.length} feeds
 </div>
 </div>

 {sectionExpanded && (
 <table className="min-w-full text-left text-sm">
 <thead>
 <tr className="border-b border-[#1E4775]/20 uppercase tracking-wider text-[10px] text-[#1E4775]/60">
 <th className="py-3 px-4 font-normal text-left w-1/3">Feed</th>
 <th className="py-3 px-4 font-normal text-left w-24">Type</th>
 <th className="py-3 px-4 font-normal text-left">Price</th>
 <th className="py-3 px-4 font-normal text-left w-24">Status</th>
 </tr>
 </thead>
 <tbody>
 {feedEntries.map((feed: any, idx: number) => {
 const pair = parsePair(feed.label);
 const price = prices[idx] ??"-";
 const isFeedExpanded = isExpanded && expanded?.feedIndex === idx;
 const status = feed.status ||"possible";

 return (
 <tr
 key={feed.address}
 className="border-t border-[#1E4775]/10 hover:bg-white/50 transition cursor-pointer"
 onClick={() =>
 setExpanded(
 isFeedExpanded ? null : { network, token, feedIndex: idx }
 )
 }
 >
 <td className="py-2 px-4">
 <div className="flex items-center gap-2 min-w-0">
 <TokenIcon
 src={getLogoPath(pair.base)}
 alt={pair.base}
 width={20}
 height={20}
 className="rounded-full flex-shrink-0"
 />
 <TokenIcon
 src={getLogoPath(pair.quote)}
 alt={pair.quote}
 width={20}
 height={20}
 className="rounded-full flex-shrink-0 -ml-2"
 />
 <span className="text-[#1E4775] font-medium">
 {feed.label}
 </span>
 </div>
 </td>
 <td className="py-2 px-4 text-[#1E4775] whitespace-nowrap">
 Chainlink
 </td>
 <td className="py-2 px-4 font-mono text-[#1E4775]">
 {loading
 ?"Loading..."
 : price ==="-"
 ?"-"
 : `1 ${pair.base} = ${price} ${pair.quote}`}
 </td>
 <td className="py-2 px-4 w-24">
 <span
 className={`inline-block px-2 py-1 text-xs font-medium rounded ${
 status ==="active"
 ?"bg-green-100 text-green-800"
 :"bg-gray-100 text-gray-600"
 }`}
 >
 {status ==="active" ?"Active" :"Possible"}
 </span>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 )}
 </div>
 );
}

function FeedDetails({
 network,
 token,
 feedIndex,
 publicClient,
 onClose,
}: {
 network: Network;
 token: string;
 feedIndex: number;
 publicClient: any;
 onClose: () => void;
}) {
 const networkFeeds = feeds[network as keyof typeof feeds];
 const feedEntries =
 (networkFeeds?.[token as keyof typeof networkFeeds] as any) || [];
 const feed = feedEntries[feedIndex];
 const rpcClient = getRpcClient(network, publicClient);

 const [price, setPrice] = useState<bigint | undefined>(undefined);
 const [latestAnswer, setLatestAnswer] = useState<
 [bigint, bigint, bigint, bigint] | undefined
 >(undefined);
 const [feedTable, setFeedTable] = useState<
 Array<{
 id: number;
 name: string;
 feed?: `0x${string}`;
 constraintA?: bigint;
 constraintB?: bigint;
 price?: string;
 }>
 >([]);
 const [loading, setLoading] = useState(true);

 const ZERO_BYTES32 =
"0x0000000000000000000000000000000000000000000000000000000000000000" as const;
 const ZERO_ADDRESS ="0x0000000000000000000000000000000000000000" as const;

 useEffect(() => {
 if (!feed || !rpcClient) {
 console.log("FeedDetails: Missing feed or rpcClient", {
 feed,
 rpcClient,
 });
 return;
 }

 let cancelled = false;
 setLoading(true);

 (async () => {
 try {
 console.log(
 `FeedDetails: Fetching data for ${feed.label} at ${feed.address} on ${network}`
 );

 // Fetch price and latestAnswer
 const [priceResult, latestResult] = await Promise.all([
 rpcClient
 .readContract({
 address: feed.address,
 abi: proxyAbi,
 functionName:"getPrice",
 })
 .catch((err: any) => {
 console.error(`Error fetching getPrice for ${feed.label}:`, err);
 return null;
 }),
 rpcClient
 .readContract({
 address: feed.address,
 abi: proxyAbi,
 functionName:"latestAnswer",
 })
 .catch((err: any) => {
 console.error(
 `Error fetching latestAnswer for ${feed.label}:`,
 err
 );
 return null;
 }),
 ]);

 if (cancelled) return;

 setPrice(priceResult as bigint | undefined);
 setLatestAnswer(
 latestResult as [bigint, bigint, bigint, bigint] | undefined
 );

 // Check if this is a HarborCustomFeedAndRateAggregator_v1 contract
 let isCustomFeedAggregator = false;
 let customFeedCount = 0;
 let feedIdsToCheck: number[] = [];

 try {
 const count = await rpcClient
 .readContract({
 address: feed.address,
 abi: customFeedAggregatorAbi,
 functionName:"getCustomFeedCount",
 })
 .catch(() => null);

 if (
 count !== null &&
 typeof count ==="bigint" &&
 Number(count) > 0
 ) {
 isCustomFeedAggregator = true;
 customFeedCount = Number(count);
 // Custom feeds are at IDs 1, 2, 3, ..., customFeedCount
 feedIdsToCheck = [...Array(customFeedCount).keys()].map(
 (i) => i + 1
 );
 }
 } catch {}

 // If not a custom feed aggregator, use the default IDs (1, 2)
 if (!isCustomFeedAggregator) {
 feedIdsToCheck = [1, 2];
 }

 // Fetch feed identifiers and constraints
 const rows: Array<{
 id: number;
 name: string;
 feed?: `0x${string}`;
 constraintA?: bigint;
 constraintB?: bigint;
 price?: string;
 }> = [];

 for (const id of feedIdsToCheck) {
 try {
 let aggAddr: `0x${string}` | undefined;
 let cons: [bigint, bigint] | null = null;

 if (isCustomFeedAggregator) {
 // For custom feed aggregator, feedIdentifiers returns address directly
 const [constraints, feedAddr] = await Promise.all([
 rpcClient
 .readContract({
 address: feed.address,
 abi: customFeedAggregatorAbi,
 functionName:"getConstraints",
 args: [id as number],
 })
 .catch(() => null),
 rpcClient
 .readContract({
 address: feed.address,
 abi: customFeedAggregatorAbi,
 functionName:"feedIdentifiers",
 args: [id as number],
 })
 .catch(() => null),
 ]);

 if (!constraints || !feedAddr) continue;
 cons = constraints as [bigint, bigint];
 aggAddr = feedAddr as `0x${string}`;
 if (!aggAddr || aggAddr === ZERO_ADDRESS) continue;
 } else {
 // For regular proxy feeds, feedIdentifiers returns bytes32
 const [constraints, feedIdentifier] = await Promise.all([
 rpcClient
 .readContract({
 address: feed.address,
 abi: proxyAbi,
 functionName:"getConstraints",
 args: [id],
 })
 .catch(() => null),
 rpcClient
 .readContract({
 address: feed.address,
 abi: proxyAbi,
 functionName:"feedIdentifiers",
 args: [id],
 })
 .catch(() => null),
 ]);

 if (!constraints || !feedIdentifier) continue;
 cons = constraints as [bigint, bigint];
 const f = feedIdentifier as `0x${string}`;
 aggAddr = bytes32ToAddress(f);
 if (!f || f === ZERO_BYTES32 || f === ZERO_ADDRESS || !aggAddr)
 continue;
 }

 let name ="-";
 let price: string | undefined;

 try {
 if (aggAddr) {
 const [desc, dec, ans] = await Promise.all([
 rpcClient
 .readContract({
 address: aggAddr,
 abi: aggregatorAbi,
 functionName:"description",
 })
 .catch(() => null),
 rpcClient
 .readContract({
 address: aggAddr,
 abi: aggregatorAbi,
 functionName:"decimals",
 })
 .catch(() => null),
 rpcClient
 .readContract({
 address: aggAddr,
 abi: aggregatorAbi,
 functionName:"latestAnswer",
 })
 .catch(() => null),
 ]);

 if (
 desc &&
 typeof desc ==="string" &&
 desc.trim().length > 0
 ) {
 name = desc.trim();
 } else if (!isCustomFeedAggregator) {
 // Try to derive name from bytes32 if it's a regular proxy feed
 const feedIdentifier = await rpcClient
 .readContract({
 address: feed.address,
 abi: proxyAbi,
 functionName:"feedIdentifiers",
 args: [id],
 })
 .catch(() => null);
 if (feedIdentifier) {
 const derived = deriveFeedName(
 feedIdentifier as `0x${string}`
 );
 if (derived && derived !=="-") {
 name = derived;
 }
 }
 }

 if (dec !== null && ans !== null) {
 price = formatUnit(ans as bigint, Number(dec as number));
 }
 }
 } catch {}

 rows.push({
 id,
 name,
 feed: aggAddr,
 constraintA: cons?.[0],
 constraintB: cons?.[1],
 price,
 });
 } catch (err) {
 console.warn(`Failed to load feed ID ${id}:`, err);
 }
 }

 if (!cancelled) {
 setFeedTable(rows);
 setLoading(false);
 }
 } catch (err) {
 console.error("Failed to fetch feed data:", err);
 if (!cancelled) setLoading(false);
 }
 })();

 return () => {
 cancelled = true;
 };
 }, [feed, rpcClient, network]);

 if (!feed) return null;

 const getExplorerUrl = (address: string) => {
 if (network ==="arbitrum") {
 return arbitrumAddressUrl(address);
 }
 return etherscanAddressUrl(address);
 };

 return (
 <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 mt-4 relative">
 {/* Close Button */}
 <button
 onClick={onClose}
 className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white border border-[#1E4775]/20 hover:bg-[#1E4775]/5 transition-colors"
 aria-label="Close details"
 >
 <XMarkIcon className="w-5 h-5 text-[#1E4775]" />
 </button>

 {/* Price Display */}
 <div className="md:col-span-2 bg-white p-4 border border-[#1E4775]/10">
 <div className="text-[#1E4775]/60 text-xs mb-1">
 {feed.label} - Price
 </div>
 <div className="text-2xl font-mono text-[#1E4775]">
 {format18(price)}
 </div>
 <div className="text-[#1E4775]/40 text-xs">18 decimals</div>
 </div>

 {/* Latest Answer Display */}
 <div className="bg-white p-4 border border-[#1E4775]/10">
 <div className="text-[#1E4775]/60 text-xs mb-1">
 Latest oracle feed data
 </div>
 <div className="space-y-1 font-mono text-[#1E4775]">
 <div>
 {feed.label} min price: {format18(latestAnswer?.[0])}
 </div>
 <div>
 {feed.label} max price: {format18(latestAnswer?.[1])}
 </div>
 <div>
 {parsePair(feed.label).base} min rate: {format18(latestAnswer?.[2])}
 </div>
 <div>
 {parsePair(feed.label).base} max rate: {format18(latestAnswer?.[3])}
 </div>
 </div>
 </div>

 {/* Contract Address */}
 <div className="md:col-span-3 bg-white p-3 sm:p-4 border border-[#1E4775]/10">
 <div className="text-[#1E4775]/60 text-xs mb-1">Contract</div>
 <a
 href={getExplorerUrl(feed.address)}
 target="_blank"
 rel="noreferrer"
 className="hover:underline text-[#1E4775] font-mono"
 >
 {feed.address}
 <ExternalLinkIcon />
 </a>
 </div>

 {/* Feed Details Table */}
 <div className="md:col-span-3 bg-white p-2 sm:p-3 lg:p-4 overflow-x-auto border border-[#1E4775]/10">
 <table className="min-w-full text-left text-sm table-fixed">
 <thead>
 <tr className="border-b border-[#1E4775]/20 uppercase tracking-wider text-[10px] text-[#1E4775]/60">
 <th className="py-3 px-4 font-normal">ID</th>
 <th className="py-3 px-4 font-normal">Feed Name / Description</th>
 <th className="py-3 px-4 font-normal">Feed Identifier</th>
 <th className="py-3 px-4 font-normal">Price</th>
 <th className="py-3 px-4 font-normal">Heartbeat Window</th>
 <th className="py-3 px-4 font-normal">Deviation Threshold</th>
 </tr>
 </thead>
 <tbody>
 {loading ? (
 <tr className="border-t border-[#1E4775]/10">
 <td
 colSpan={6}
 className="py-4 px-4 text-center text-[#1E4775]/50"
 >
 Loading feed data...
 </td>
 </tr>
 ) : feedTable.length === 0 ? (
 <tr className="border-t border-[#1E4775]/10">
 <td
 colSpan={6}
 className="py-4 px-4 text-center text-[#1E4775]/50"
 >
 No feed data available
 </td>
 </tr>
 ) : (
 feedTable.map((r) => (
 <tr key={r.id} className="border-t border-[#1E4775]/10">
 <td className="py-2 px-4 font-mono text-[#1E4775]">{r.id}</td>
 <td className="py-2 px-4 font-mono text-[#1E4775]">
 {r.name ||"-"}
 </td>
 <td className="py-2 px-4 font-mono">
 {r.feed ? (
 <a
 href={getExplorerUrl(r.feed)}
 target="_blank"
 rel="noreferrer"
 className="hover:underline text-[#1E4775]"
 >
 {r.feed}
 <ExternalLinkIcon className="inline-block w-3 h-3 align-[-2px] ml-1" />
 </a>
 ) : (
"-"
 )}
 </td>
 <td className="py-2 px-4 font-mono text-[#1E4775]">
 {r.price ||"-"}
 </td>
 <td className="py-2 px-4 font-mono text-[#1E4775]">
 {formatHeartbeat(r.constraintA)}
 </td>
 <td className="py-2 px-4 font-mono text-[#1E4775]">
 {formatPercent18(r.constraintB)}
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </section>
 );
}
