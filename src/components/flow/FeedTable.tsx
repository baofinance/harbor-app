"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { feeds as feedsConfig } from "@/config/feeds";
import { parsePair } from "@/lib/utils";
import { getTokenFullName } from "@/utils/flowUtils";
import { getLogoPath } from "@/lib/logos";
import TokenIcon from "@/components/TokenIcon";
import SimpleTooltip from "@/components/SimpleTooltip";
import { useRpcClient } from "@/hooks/useRpcClient";
import { useFeedPrices } from "@/hooks/useFeedPrices";
import { useFeedQuotePrices } from "@/hooks/useFeedQuotePrices";
import type { FeedWithMetadata, ExpandedState } from "@/hooks/useFeedFilters";
import { FeedDetails } from "@/components/flow/FeedDetails";
import { ChevronDownIcon, ChevronUpIcon, ArrowsUpDownIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useAccount, useSignTypedData, useContractReads } from "wagmi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { buildFeedId } from "@/lib/votesStore";
import {
  buildVoteTypedData,
  normalizeAllocationsForSigning,
  sumAllocationPoints,
  VOTE_POINTS_MAX,
  type VoteAllocation,
} from "@/lib/votesTypedData";
import { getMarketIdFromFeedLabel } from "@/utils/feedMarketMapping";
import { markets } from "@/config/markets";
import { MINTER_ABI } from "@/abis/shared";
import { useCoinGeckoPrices } from "@/hooks/useCoinGeckoPrice";
import Link from "next/link";

// Map quote assets to CoinGecko IDs
function getCoinGeckoIdForQuoteAsset(quoteAsset: string): string | null {
  const lower = quoteAsset.toLowerCase();
  const mapping: Record<string, string> = {
    eur: "euro",
    gold: "gold",
    xau: "gold",
    silver: "silver",
    xag: "silver",
    btc: "bitcoin",
    eth: "ethereum",
    ethereum: "ethereum",
    // Stocks/indices - these might need special handling
    aapl: "apple",
    amzn: "amazon",
    googl: "google",
    meta: "meta",
    msft: "microsoft",
    nvda: "nvidia",
    spy: "sp500",
    tsla: "tesla",
  };
  return mapping[lower] || null;
}

interface FeedTableProps {
  feeds: FeedWithMetadata[];
  allFeeds: FeedWithMetadata[];
  publicClient: any;
  expanded: ExpandedState;
  setExpanded: (state: ExpandedState) => void;
}

function VoteCell({
  feedId,
  totalPoints,
  myPoints,
  remainingPoints,
  isConnected,
  disabledReason,
  onOpen,
}: {
  feedId: string;
  totalPoints: number;
  myPoints: number;
  remainingPoints: number;
  isConnected: boolean;
  disabledReason?: string;
  onOpen: () => void;
}) {
  const isDisabled = !isConnected || !!disabledReason;
  return (
    <div className="flex items-center gap-1.5">
      <div className="text-xs text-[#1E4775]/60 whitespace-nowrap">
        <span className="font-mono font-semibold text-[#1E4775] text-sm">
          {totalPoints}
        </span>
      </div>
      <button
        className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
          !isDisabled
            ? "bg-[#FF8A7A] text-white hover:bg-[#FF6B5A]"
            : "bg-[#FF8A7A]/30 text-white/50 cursor-not-allowed"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          if (isDisabled) return;
          onOpen();
        }}
        title={
          disabledReason
            ? disabledReason
            : isConnected
            ? `Allocate vote points (remaining ${remainingPoints})`
            : "Connect wallet to vote"
        }
      >
        Vote{myPoints > 0 ? ` (${myPoints})` : ""}
      </button>
    </div>
  );
}

function FeedGroupRows({
  feeds,
  publicClient,
  expanded,
  setExpanded,
  votesTotals,
  myAllocations,
  remainingPoints,
  isConnected,
  voteDisabledReason,
  onOpenVote,
  canonicalizeFeedId,
  showQuoteAssetPrice,
}: {
  feeds: FeedWithMetadata[];
  publicClient: any;
  expanded: ExpandedState;
  setExpanded: (state: ExpandedState) => void;
  votesTotals: Record<string, number>;
  myAllocations: Record<string, number>;
  remainingPoints: number;
  isConnected: boolean;
  voteDisabledReason?: string;
  onOpenVote: (feedId: string) => void;
  canonicalizeFeedId: (feedId: string) => string | null;
  showQuoteAssetPrice: boolean;
}) {
  const network = feeds[0].network;
  const baseAsset = feeds[0].baseAsset;
  const rpcClient = useRpcClient(network);
  const feedEntries = feeds.map((f) => ({
    address: f.address as `0x${string}`,
    label: f.label,
  }));
  // Type assertion needed due to wagmi/viem type compatibility
  const { prices, loading } = useFeedPrices(rpcClient as any, feedEntries);

  // Get markets for feeds that have active markets
  const feedMarkets = useMemo(() => {
    const marketMap = new Map<string, { marketId: string; market: any; minterAddress: `0x${string}`; pegTarget: string }>();
    feeds.forEach((feed) => {
      const marketId = getMarketIdFromFeedLabel(feed.label);
      if (marketId) {
        const market = markets[marketId as keyof typeof markets];
        if (market?.addresses?.minter && network === "mainnet") {
          marketMap.set(feed.address, {
            marketId,
            market,
            minterAddress: market.addresses.minter as `0x${string}`,
            pegTarget: market.pegTarget?.toLowerCase() || "",
          });
        }
      }
    });
    return marketMap;
  }, [feeds, network]);

  // Extract quote assets from all feeds for fetching USD prices
  const uniqueQuoteAssets = useMemo(() => {
    const quoteAssets = new Set<string>();
    feeds.forEach((feed) => {
      const pair = parsePair(feed.label);
      if (pair.quote) {
        quoteAssets.add(pair.quote);
      }
    });
    return Array.from(quoteAssets);
  }, [feeds]);

  // Get CoinGecko IDs for all quote assets
  const coinGeckoIds = useMemo(() => {
    const ids: string[] = [];
    uniqueQuoteAssets.forEach((quote) => {
      const cgId = getCoinGeckoIdForQuoteAsset(quote);
      if (cgId) {
        ids.push(cgId);
      }
    });
    // Always fetch ETH and BTC for active markets
    if (!ids.includes("ethereum")) ids.push("ethereum");
    if (!ids.includes("bitcoin")) ids.push("bitcoin");
    return ids;
  }, [uniqueQuoteAssets]);

  // Fetch USD prices for all quote assets
  const { prices: quoteAssetPrices } = useCoinGeckoPrices(coinGeckoIds, 60000);

  // Map quote asset -> USD price
  const quoteAssetPriceMap = useMemo(() => {
    const map = new Map<string, number>();
    uniqueQuoteAssets.forEach((quote) => {
      const cgId = getCoinGeckoIdForQuoteAsset(quote);
      if (cgId && quoteAssetPrices[cgId]) {
        map.set(quote.toLowerCase(), quoteAssetPrices[cgId]!);
      }
    });
    // Add ETH and BTC prices
    if (quoteAssetPrices["ethereum"]) map.set("eth", quoteAssetPrices["ethereum"]!);
    if (quoteAssetPrices["bitcoin"]) map.set("btc", quoteAssetPrices["bitcoin"]!);
    return map;
  }, [uniqueQuoteAssets, quoteAssetPrices]);

  // Get unique minter addresses for batch reading
  const uniqueMinterAddresses = useMemo(() => {
    return Array.from(new Set(Array.from(feedMarkets.values()).map((m) => m.minterAddress)));
  }, [feedMarkets]);

  // Fetch peggedTokenPrice from all minter contracts
  const minterPriceReads = useContractReads({
    contracts: uniqueMinterAddresses.map((minterAddress) => ({
      address: minterAddress,
      abi: MINTER_ABI,
      functionName: "peggedTokenPrice",
    })),
    query: {
      enabled: showQuoteAssetPrice && uniqueMinterAddresses.length > 0 && network === "mainnet",
    },
  });


  // Create a map of minter address -> peggedTokenPrice
  const minterPriceMap = useMemo(() => {
    const map = new Map<`0x${string}`, bigint>();
    if (minterPriceReads.data) {
      uniqueMinterAddresses.forEach((minterAddress, idx) => {
        const price = minterPriceReads.data?.[idx]?.result as bigint | undefined;
        if (price !== undefined && price !== null) {
          map.set(minterAddress, price);
        }
      });
    }
    return map;
  }, [minterPriceReads.data, uniqueMinterAddresses]);

  // Fetch quote asset prices using the custom hook with 60-second caching
  const { prices: quotePrices, loading: loadingContractData } = useFeedQuotePrices(
    rpcClient,
    feeds,
    network || "mainnet",
    showQuoteAssetPrice
  );

  // Create a map of feed address -> USD price to display (now using the hook's cached prices)
  const feedHaTokenPriceMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!showQuoteAssetPrice) {
      return map;
    }

    feeds.forEach((feed) => {
      const quotePrice = quotePrices.get(feed.address);
      // Only add valid prices (> 0) to the display map
      // null/undefined/0 means no price available, but we check quotePrices.has() to know if it's been attempted
      if (quotePrice !== undefined && quotePrice !== null && quotePrice > 0) {
        map.set(feed.address, quotePrice);
      }
    });

    return map;
  }, [showQuoteAssetPrice, feeds, quotePrices]);
  
  // Check if a feed has been attempted (even if it returned null/0)
  // This helps us distinguish between "never loaded" vs "loaded but failed"
  const hasAttemptedPrice = useMemo(() => {
    const attempted = new Set<string>();
    feeds.forEach((feed) => {
      // If the price exists in quotePrices Map (even if null), it means we've attempted to load it
      if (quotePrices.has(feed.address)) {
        attempted.add(feed.address);
      }
    });
    return attempted;
  }, [feeds, quotePrices]);

  return (
    <>
      {feeds.map((feed, idx) => {
        const pair = parsePair(feed.label);
        const price = prices[idx] ?? "-";
        const status = feed.status || "available";
        const feedId = canonicalizeFeedId(buildFeedId(network, feed.address)) ?? buildFeedId(network, feed.address);
        const totalPoints = votesTotals[feedId] ?? 0;
        const myPoints = myAllocations[feedId] ?? 0;

        // Find the index in the original feeds array for this network and base asset
        const networkFeeds = feedsConfig[network as keyof typeof feedsConfig];
        const baseAssetFeeds =
          networkFeeds?.[baseAsset as keyof typeof networkFeeds];
        const feedIndex = baseAssetFeeds
          ? baseAssetFeeds.findIndex((f: any) => f.address === feed.address)
          : -1;

        const isFeedExpanded =
          expanded?.network === network &&
          expanded?.token === baseAsset &&
          expanded?.feedIndex === feedIndex;

        const marketId = getMarketIdFromFeedLabel(feed.label);
        const isActive = status === "active" && marketId !== null;

        return (
          <div key={feed.address} className="space-y-2">
            {/* Feed card (like Anchor/Sail market bars) */}
            <div
              className={`border border-[#1E4775]/10 transition-colors cursor-pointer ${
                isFeedExpanded
                  ? "bg-[rgb(var(--surface-selected-rgb))]"
                  : "bg-white hover:bg-[rgb(var(--surface-selected-rgb))]"
              }`}
              onClick={() =>
                setExpanded(
                  isFeedExpanded
                    ? null
                    : { network, token: baseAsset, feedIndex }
                )
              }
            >
              <div className="hidden lg:block py-2 px-3">
                {/* Desktop layout */}
                <div className={`grid gap-3 items-center text-sm ${
                  isActive 
                    ? "grid-cols-[1.2fr_0.8fr_0.6fr_1.2fr_0.6fr_1.2fr]"
                    : "grid-cols-[1.2fr_0.8fr_0.6fr_1.2fr_0.6fr_0.4fr_0.7fr]"
                }`}>
                  <div className="min-w-0 flex justify-center">
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
                      <SimpleTooltip
                        label={`${getTokenFullName(
                          pair.base
                        )} / ${getTokenFullName(pair.quote)}`}
                      >
                        <span className="text-[#1E4775] font-medium min-w-0 truncate">
                          {feed.label}
                          {feed.divisor && feed.divisor > 1 && (
                            <span className="ml-2 text-xs text-[#1E4775]/60 italic">
                              (price normalized)
                            </span>
                          )}
                        </span>
                      </SimpleTooltip>
                      {isFeedExpanded ? (
                        <ChevronUpIcon className="w-4 h-4 text-[#1E4775]/70 flex-shrink-0" />
                      ) : (
                        <ChevronDownIcon className="w-4 h-4 text-[#1E4775]/70 flex-shrink-0" />
                      )}
                    </div>
                  </div>

                  <div className="text-center text-[#1E4775] whitespace-nowrap text-sm">
                    {network === "mainnet"
                      ? "ETH Mainnet"
                      : network.charAt(0).toUpperCase() + network.slice(1)}
                  </div>

                  <div className="text-center text-[#1E4775] whitespace-nowrap">
                    <div>Chainlink</div>
                    {feed.divisor && feed.divisor > 1 && (
                      <div className="text-xs text-[#1E4775]/60">
                        divisor: {feed.divisor}
                      </div>
                    )}
                  </div>

                  <div className="text-center font-mono text-[#1E4775]">
                    {(() => {
                      // If toggle is on, show quote asset price as "XXX USD"
                      if (showQuoteAssetPrice) {
                        const haTokenPriceUSD = feedHaTokenPriceMap.get(feed.address);
                        const hasCachedPrice = haTokenPriceUSD !== undefined && haTokenPriceUSD > 0;
                        const hasBeenAttempted = hasAttemptedPrice.has(feed.address);
                        
                        // Only show "Loading..." if we're loading AND this feed hasn't been attempted yet
                        // If it's been attempted (even if it returned null), show "-" instead of "Loading..."
                        if (loadingContractData && !hasBeenAttempted) {
                          return "Loading...";
                        }
                        
                        if (hasCachedPrice) {
                          return (
                            <SimpleTooltip
                              label={`${haTokenPriceUSD.toLocaleString(undefined, { maximumFractionDigits: 6 })} USD`}
                            >
                              <span>{`${haTokenPriceUSD.toLocaleString(undefined, { maximumFractionDigits: 6 })} USD`}</span>
                            </SimpleTooltip>
                          );
                        }
                        // If price not available (attempted but failed, or not attempted and not loading), show "-"
                        return "-";
                      }
                      
                      // For regular feed price: only show "Loading..." if loading AND no price yet
                      if (loading && price === "-") {
                        return "Loading...";
                      }
                      
                      // Otherwise show feed price as is: "1 [BASE] = X [QUOTE]"
                      if (price === "-") {
                        return "-";
                      }
                      return (
                        <SimpleTooltip
                          label={`1 ${getTokenFullName(
                            pair.base
                          )} = ${price} ${getTokenFullName(pair.quote)}`}
                        >
                          <span>{`1 ${pair.base} = ${price} ${pair.quote}`}</span>
                        </SimpleTooltip>
                      );
                    })()}
                  </div>

                  <div className="text-center">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                        status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {status === "active" ? "Active" : "Available"}
                    </span>
                  </div>

                  {!isActive && (
                    <div className="text-center">
                      <div className="font-mono font-semibold text-[#1E4775] text-sm">
                        {totalPoints}
                      </div>
                    </div>
                  )}

                  <div
                    className="flex justify-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isActive ? (
                      <>
                        <Link
                          href={`/anchor?market=${marketId}`}
                          className="px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors bg-[#1E4775] text-white hover:bg-[#17395F]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Anchor
                        </Link>
                        <Link
                          href={`/sail?market=${marketId}`}
                          className="px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors bg-[#1E4775] text-white hover:bg-[#17395F]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Sail
                        </Link>
                      </>
                    ) : (
                      <button
                        className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                          isConnected && !voteDisabledReason
                            ? "bg-[#FF8A7A] text-white hover:bg-[#FF6B5A]"
                            : "bg-[#FF8A7A]/30 text-white/50 cursor-not-allowed"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isConnected || voteDisabledReason) return;
                          onOpenVote(feedId);
                        }}
                        title={
                          voteDisabledReason
                            ? voteDisabledReason
                            : isConnected
                            ? `Allocate vote points (remaining ${remainingPoints})`
                            : "Connect wallet to vote"
                        }
                      >
                        Vote{myPoints > 0 ? ` (${myPoints})` : ""}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Mobile layout (< lg): 2-line bar */}
              <div className="lg:hidden p-3 space-y-2">
                {/* Line 1: market name + chevron, then status tag + chain */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
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
                    <SimpleTooltip
                      label={`${getTokenFullName(pair.base)} / ${getTokenFullName(
                        pair.quote
                      )}`}
                    >
                      <span className="text-[#1E4775] font-semibold text-sm truncate">
                        {feed.label}
                      </span>
                    </SimpleTooltip>
                    {isFeedExpanded ? (
                      <ChevronUpIcon className="w-5 h-5 text-[#1E4775]/70 flex-shrink-0" />
                    ) : (
                      <ChevronDownIcon className="w-5 h-5 text-[#1E4775]/70 flex-shrink-0" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`inline-block px-2 py-1 text-[10px] font-medium rounded whitespace-nowrap ${
                        status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {status === "active" ? "Active" : "Available"}
                    </span>
                    <div className="text-[10px] text-[#1E4775]/70 whitespace-nowrap">
                      {network === "mainnet"
                        ? "ETH Mainnet"
                        : network.charAt(0).toUpperCase() + network.slice(1)}
                    </div>
                  </div>
                </div>

                {/* Line 2: price, total votes (with header), vote button */}
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[#1E4775]/60 text-[9px] uppercase tracking-wider">
                      Price
                    </div>
                    <div className="text-[#1E4775] font-mono font-semibold text-[11px] truncate">
                      {showQuoteAssetPrice ? (
                        (() => {
                          const haTokenPriceUSD = feedHaTokenPriceMap.get(feed.address);
                          const hasCachedPrice = haTokenPriceUSD !== undefined && haTokenPriceUSD > 0;
                          const hasBeenAttempted = hasAttemptedPrice.has(feed.address);
                          
                          // Only show "Loading…" if we're loading AND this feed hasn't been attempted yet
                          // If it's been attempted (even if it returned null), show "-" instead of "Loading…"
                          if (loadingContractData && !hasBeenAttempted) {
                            return "Loading…";
                          }
                          
                          if (hasCachedPrice) {
                            return `${haTokenPriceUSD.toLocaleString(undefined, { maximumFractionDigits: 6 })} USD`;
                          }
                          return price === "-" ? "-" : price;
                        })()
                      ) : (
                        (() => {
                          // For regular feed price: only show "Loading…" if loading AND no price yet
                          if (loading && price === "-") {
                            return "Loading…";
                          }
                          return price === "-" ? "-" : `1 ${pair.base} = ${price} ${pair.quote}`;
                        })()
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0 text-right">
                    <div className="text-[#1E4775]/60 text-[9px] uppercase tracking-wider">
                      Total votes
                    </div>
                    <div className="font-mono font-semibold text-[#1E4775] text-base leading-none">
                      {totalPoints}
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-2 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isActive ? (
                      <>
                        <Link
                          href={`/anchor?market=${marketId}`}
                          className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors bg-[#1E4775] text-white hover:bg-[#17395F]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Anchor
                        </Link>
                        <Link
                          href={`/sail?market=${marketId}`}
                          className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors bg-[#1E4775] text-white hover:bg-[#17395F]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Sail
                        </Link>
                      </>
                    ) : (
                      <button
                        className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                          isConnected && !voteDisabledReason
                            ? "bg-[#FF8A7A] text-white hover:bg-[#FF6B5A]"
                            : "bg-[#FF8A7A]/30 text-white/50 cursor-not-allowed"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isConnected || voteDisabledReason) return;
                          onOpenVote(feedId);
                        }}
                        title={
                          voteDisabledReason
                            ? voteDisabledReason
                            : isConnected
                              ? `Allocate vote points (remaining ${remainingPoints})`
                              : "Connect wallet to vote"
                        }
                      >
                        Vote{myPoints > 0 ? ` (${myPoints})` : ""}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Expanded details box */}
            {isFeedExpanded && (
              <div className="bg-white border border-[#1E4775]/10">
                <div className="bg-[rgb(var(--surface-selected-rgb))] p-3">
                  <FeedDetails
                    network={network as any}
                    token={baseAsset}
                    feedIndex={feedIndex}
                    publicClient={publicClient}
                    embedded
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

type SortColumn = "feed" | "chain" | "type" | "price" | "status" | "votes";
type SortDirection = "asc" | "desc";

export function FeedTable({
  feeds,
  allFeeds,
  publicClient,
  expanded,
  setExpanded,
  showQuoteAssetPrice,
}: FeedTableProps & { showQuoteAssetPrice: boolean }) {
  // Use stable per-network RPC clients so we can fetch prices without breaking hook rules.
  const mainnetRpcClient = useRpcClient("mainnet" as any);
  const arbitrumRpcClient = useRpcClient("arbitrum" as any);
  const baseRpcClient = useRpcClient("base" as any);
  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const queryClient = useQueryClient();
  const [voteModalFeedId, setVoteModalFeedId] = useState<string | null>(null);
  const [voteModalPoints, setVoteModalPoints] = useState<number>(0);
  const [sortBy, setSortBy] = useState<SortColumn>("votes");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const allFeedIds = useMemo(() => {
    return feeds.map((f) => buildFeedId(f.network, f.address));
  }, [feeds]);

  const votesQuery = useQuery({
    queryKey: ["maproomVotes", allFeedIds.join(","), address ?? ""],
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set("feedIds", allFeedIds.join(","));
      if (address) qs.set("address", address);
      const res = await fetch(`/api/votes?${qs.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load votes");

      return json as {
        totals: Record<string, number>;
        allocations?: Record<string, number>;
      };
    },
    enabled: allFeedIds.length > 0,
    staleTime: 15_000,
  });

  const votesErrorMessage = votesQuery.isError
    ? String((votesQuery.error as any)?.message || "Failed to load votes")
    : "";
  const voteDisabledReason = votesErrorMessage
    ? `Voting unavailable: ${votesErrorMessage}`
    : undefined;

  const canonicalizeFeedId = (feedId: string): string | null => {
    const raw = String(feedId || "").trim();
    const idx = raw.indexOf(":");
    if (idx <= 0) return null;
    const net = raw.slice(0, idx).trim().toLowerCase();
    const addr = raw.slice(idx + 1).trim().toLowerCase();
    if (!net || !addr) return null;
    return `${net}:${addr}`;
  };

  const totals = useMemo(() => {
    const raw = votesQuery.data?.totals ?? {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw)) {
      const canon = canonicalizeFeedId(k);
      if (!canon) continue;
      const n = Number(v);
      if (!Number.isFinite(n)) continue;
      // totals can safely accumulate if the same feedId appears with different casing
      out[canon] = (out[canon] ?? 0) + n;
    }
    return out;
  }, [votesQuery.data?.totals]);

  const myAllocations = useMemo(() => {
    const raw = votesQuery.data?.allocations ?? {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw)) {
      const canon = canonicalizeFeedId(k);
      if (!canon) continue;
      const n = Number(v);
      if (!Number.isFinite(n)) continue;
      // If the same feedId appears multiple ways, keep the max allocation.
      out[canon] = Math.max(out[canon] ?? 0, n);
    }
    return out;
  }, [votesQuery.data?.allocations, address]);

  const activeFeedIdSet = useMemo(() => {
    const set = new Set<string>();
    for (const f of allFeeds) {
      const status = f.status || "available";
      if (status === "active") {
        const feedId = buildFeedId(f.network, f.address);
        const canonical = canonicalizeFeedId(feedId);
        if (canonical) set.add(canonical);
      }
    }
    return set;
  }, [allFeeds]);

  const myAllocationsVotable = useMemo(() => {
    // Strip allocations for active feeds so they don't count against the max
    // and can be cleared on the next save without requiring special UI.
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(myAllocations)) {
      if (activeFeedIdSet.has(k)) continue;
      out[k] = v;
    }
    return out;
  }, [myAllocations, activeFeedIdSet]);

  const usedPoints = useMemo(() => {
    return Object.values(myAllocationsVotable).reduce(
      (s, v) => s + (Number.isFinite(v) ? v : 0),
      0
    );
  }, [myAllocationsVotable]);
  const remainingPoints = Math.max(0, VOTE_POINTS_MAX - usedPoints);

  // Price fetching (stable 3-hook approach: mainnet + arbitrum + base)
  const mainnetFeedEntries = useMemo(() => {
    return feeds
      .filter((f) => f.network === "mainnet")
      .map((f) => ({ address: f.address as `0x${string}`, label: f.label }))
      .sort((a, b) => a.address.localeCompare(b.address));
  }, [feeds]);

  const arbitrumFeedEntries = useMemo(() => {
    return feeds
      .filter((f) => f.network === "arbitrum")
      .map((f) => ({ address: f.address as `0x${string}`, label: f.label }))
      .sort((a, b) => a.address.localeCompare(b.address));
  }, [feeds]);

  const baseFeedEntries = useMemo(() => {
    return feeds
      .filter((f) => f.network === "base")
      .map((f) => ({ address: f.address as `0x${string}`, label: f.label }))
      .sort((a, b) => a.address.localeCompare(b.address));
  }, [feeds]);

  const {
    prices: mainnetPrices,
    loading: mainnetPricesLoading,
  } = useFeedPrices(mainnetRpcClient as any, mainnetFeedEntries);
  const {
    prices: arbitrumPrices,
    loading: arbitrumPricesLoading,
  } = useFeedPrices(arbitrumRpcClient as any, arbitrumFeedEntries);
  const { prices: basePrices, loading: basePricesLoading } = useFeedPrices(
    baseRpcClient as any,
    baseFeedEntries
  );

  const mainnetPriceByAddr = useMemo(() => {
    const m = new Map<string, string>();
    for (let i = 0; i < mainnetFeedEntries.length; i++) {
      m.set(
        mainnetFeedEntries[i].address.toLowerCase(),
        mainnetPrices[i] ?? "-"
      );
    }
    return m;
  }, [mainnetFeedEntries, mainnetPrices]);

  const arbitrumPriceByAddr = useMemo(() => {
    const m = new Map<string, string>();
    for (let i = 0; i < arbitrumFeedEntries.length; i++) {
      m.set(
        arbitrumFeedEntries[i].address.toLowerCase(),
        arbitrumPrices[i] ?? "-"
      );
    }
    return m;
  }, [arbitrumFeedEntries, arbitrumPrices]);

  const basePriceByAddr = useMemo(() => {
    const m = new Map<string, string>();
    for (let i = 0; i < baseFeedEntries.length; i++) {
      m.set(baseFeedEntries[i].address.toLowerCase(), basePrices[i] ?? "-");
    }
    return m;
  }, [baseFeedEntries, basePrices]);

  const getPriceForFeed = (network: string, address: string) => {
    const addr = String(address || "").toLowerCase();
    if (network === "mainnet") return mainnetPriceByAddr.get(addr) ?? "-";
    if (network === "arbitrum") return arbitrumPriceByAddr.get(addr) ?? "-";
    if (network === "base") return basePriceByAddr.get(addr) ?? "-";
    return "-";
  };

  const isPriceLoadingForNetwork = (network: string) => {
    if (network === "mainnet") return mainnetPricesLoading;
    if (network === "arbitrum") return arbitrumPricesLoading;
    if (network === "base") return basePricesLoading;
    return false;
  };

  const formatNetworkLabel = (network: string) => {
    return network === "mainnet"
      ? "ETH Mainnet"
      : network.charAt(0).toUpperCase() + network.slice(1);
  };

  const saveVotesMutation = useMutation({
    mutationFn: async (nextAllocations: Record<string, number>) => {
      if (!address) throw new Error("Connect wallet to vote");

      // nonce
      const nonceRes = await fetch(`/api/votes/nonce?address=${address}`, {
        cache: "no-store",
      });
      const nonceJson = await nonceRes.json();
      if (!nonceRes.ok)
        throw new Error(nonceJson?.error || "Failed to get nonce");
      const nonce = String(nonceJson?.nonce || "");
      if (!nonce) throw new Error("Failed to get nonce");

      const allocationsForSigning: VoteAllocation[] = Object.entries(
        nextAllocations
      ).map(([feedId, points]) => ({ feedId, points }));
      const normalized = normalizeAllocationsForSigning(allocationsForSigning);
      if (sumAllocationPoints(normalized) > VOTE_POINTS_MAX) {
        throw new Error(`Total vote points cannot exceed ${VOTE_POINTS_MAX}`);
      }

      const typed = buildVoteTypedData({
        voter: address,
        nonce,
        allocations: normalized,
      });

      const signature = await signTypedDataAsync(typed as any);

      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voter: address,
          nonce,
          signature,
          allocations: normalized,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to save votes");
      return json as {
        totals: Record<string, number>;
        allocations: Record<string, number>;
      };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(
        ["maproomVotes", allFeedIds.join(","), address ?? ""],
        (prev: any) => ({
          ...(prev || {}),
          totals: { ...(prev?.totals || {}), ...(data.totals || {}) },
          allocations: data.allocations || {},
        })
      );
    },
  });

  function openVoteModal(feedId: string) {
    if (voteDisabledReason) return;
    const canonicalFeedId = canonicalizeFeedId(feedId) ?? feedId;
    setVoteModalFeedId(canonicalFeedId);
    setVoteModalPoints(myAllocationsVotable[canonicalFeedId] ?? 0);
  }

  async function saveVotePoints(feedId: string, points: number) {
    // Only save votable allocations (non-active feeds). This clears any
    // legacy allocations on active feeds on the next user action.
    const next = { ...myAllocationsVotable, [feedId]: points };
    // remove zeros
    for (const k of Object.keys(next)) {
      if (!next[k] || next[k] <= 0) delete next[k];
    }
    await saveVotesMutation.mutateAsync(next);
  }

  const handleSort = (column: SortColumn) => {
    if (sortBy === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new column and default to descending
      setSortBy(column);
      setSortDirection("desc");
    }
  };

  // Sort feeds globally (not grouped) so sorting by votes actually works.
  const sortedFeeds = useMemo(() => {
    return [...feeds].sort((a, b) => {
      const feedIdA = canonicalizeFeedId(buildFeedId(a.network, a.address)) ?? buildFeedId(a.network, a.address);
      const feedIdB = canonicalizeFeedId(buildFeedId(b.network, b.address)) ?? buildFeedId(b.network, b.address);
      const totalPointsA = totals[feedIdA] ?? 0;
      const totalPointsB = totals[feedIdB] ?? 0;
      const statusA = a.status || "available";
      const statusB = b.status || "available";

      let comparison = 0;

      switch (sortBy) {
        case "feed":
          comparison = a.label.localeCompare(b.label);
          break;
        case "chain":
          comparison = a.network.localeCompare(b.network);
          break;
        case "status":
          // Active comes before available
          if (statusA === "active" && statusB === "available") comparison = -1;
          else if (statusA === "available" && statusB === "active") comparison = 1;
          else comparison = statusA.localeCompare(statusB);
          break;
        case "votes":
          comparison = totalPointsA - totalPointsB;
          break;
        case "type":
          // Type is always "Chainlink" for now, so sort by label as fallback
          comparison = a.label.localeCompare(b.label);
          break;
        case "price":
          // Price sorting would require fetching prices first, so fallback to label
          comparison = a.label.localeCompare(b.label);
          break;
        default:
          comparison = 0;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [feeds, totals, sortBy, sortDirection]);

  // Group sorted feeds by network and baseAsset for FeedGroupRows
  const sortedAndGroupedFeeds = useMemo(() => {
    const grouped: Record<string, FeedWithMetadata[]> = {};
    for (const feed of sortedFeeds) {
      const key = `${feed.network}:${feed.baseAsset}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(feed);
    }
    return grouped;
  }, [sortedFeeds]);

  return (
    <div className="space-y-2">
      {/* Sort menu (mobile) */}
      <div className="lg:hidden bg-white border border-[#1E4775]/10 py-2 px-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-[#1E4775]/70 whitespace-nowrap">
              Sort
            </div>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as SortColumn);
                setSortDirection("desc");
              }}
              className="min-w-0 flex-1 px-2 py-1 text-xs border border-[#1E4775]/20 text-[#1E4775] bg-white focus:outline-none focus:ring-1 focus:ring-[#1E4775]/20"
            >
              <option value="votes">Votes</option>
              <option value="feed">Feed</option>
              <option value="chain">Chain</option>
              <option value="type">Type</option>
              <option value="price">Price</option>
              <option value="status">Status</option>
            </select>
          </div>
          <button
            className="px-2 py-1 text-xs bg-[#1E4775]/10 text-[#1E4775] font-semibold flex items-center gap-1"
            onClick={() =>
              setSortDirection(sortDirection === "asc" ? "desc" : "asc")
            }
            title={`Sort ${sortDirection === "asc" ? "descending" : "ascending"}`}
          >
            {sortDirection === "asc" ? "↑" : "↓"}
            <span className="text-[#1E4775]/70">Order</span>
          </button>
        </div>
      </div>

      {/* Header row (desktop) */}
      <div className="hidden lg:block bg-white border border-[#1E4775]/10 py-2 px-3">
        <div className="grid grid-cols-[1.2fr_0.8fr_0.6fr_1.2fr_0.6fr_0.4fr_0.7fr] gap-3 items-center uppercase tracking-wider text-[10px] text-[#1E4775] font-bold">
          <div
            className="text-center cursor-pointer hover:opacity-70 transition-opacity flex items-center justify-center gap-1"
            onClick={() => handleSort("feed")}
          >
            Feed
            {sortBy === "feed" && (
              <span className="text-xs">
                {sortDirection === "asc" ? "↑" : "↓"}
              </span>
            )}
            {sortBy !== "feed" && (
              <ArrowsUpDownIcon className="w-3 h-3 opacity-40" />
            )}
          </div>
          <div
            className="text-center cursor-pointer hover:opacity-70 transition-opacity flex items-center justify-center gap-1"
            onClick={() => handleSort("chain")}
          >
            Chain
            {sortBy === "chain" && (
              <span className="text-xs">
                {sortDirection === "asc" ? "↑" : "↓"}
              </span>
            )}
            {sortBy !== "chain" && (
              <ArrowsUpDownIcon className="w-3 h-3 opacity-40" />
            )}
          </div>
          <div
            className="text-center cursor-pointer hover:opacity-70 transition-opacity flex items-center justify-center gap-1"
            onClick={() => handleSort("type")}
          >
            Type
            {sortBy === "type" && (
              <span className="text-xs">
                {sortDirection === "asc" ? "↑" : "↓"}
              </span>
            )}
            {sortBy !== "type" && (
              <ArrowsUpDownIcon className="w-3 h-3 opacity-40" />
            )}
          </div>
          <div
            className="text-center cursor-pointer hover:opacity-70 transition-opacity flex items-center justify-center gap-1"
            onClick={() => handleSort("price")}
          >
            Price
            {sortBy === "price" && (
              <span className="text-xs">
                {sortDirection === "asc" ? "↑" : "↓"}
              </span>
            )}
            {sortBy !== "price" && (
              <ArrowsUpDownIcon className="w-3 h-3 opacity-40" />
            )}
          </div>
          <div
            className="text-center cursor-pointer hover:opacity-70 transition-opacity flex items-center justify-center gap-1"
            onClick={() => handleSort("status")}
          >
            Status
            {sortBy === "status" && (
              <span className="text-xs">
                {sortDirection === "asc" ? "↑" : "↓"}
              </span>
            )}
            {sortBy !== "status" && (
              <ArrowsUpDownIcon className="w-3 h-3 opacity-40" />
            )}
          </div>
          <div
            className="text-center cursor-pointer hover:opacity-70 transition-opacity flex items-center justify-center gap-1"
            onClick={() => handleSort("votes")}
          >
            Votes
            {sortBy === "votes" && (
              <span className="text-xs">
                {sortDirection === "asc" ? "↑" : "↓"}
              </span>
            )}
            {sortBy !== "votes" && (
              <ArrowsUpDownIcon className="w-3 h-3 opacity-40" />
            )}
          </div>
          <div className="text-center">Vote</div>
        </div>
      </div>

      <div className="space-y-2">
        {Object.entries(sortedAndGroupedFeeds).map(([key, groupFeeds]) => (
          <FeedGroupRows
            key={key}
            feeds={groupFeeds}
            publicClient={publicClient}
            expanded={expanded}
            setExpanded={setExpanded}
            votesTotals={totals}
            myAllocations={myAllocations}
            remainingPoints={remainingPoints}
            isConnected={isConnected}
            voteDisabledReason={voteDisabledReason}
            onOpenVote={openVoteModal}
            canonicalizeFeedId={canonicalizeFeedId}
            showQuoteAssetPrice={showQuoteAssetPrice}
          />
        ))}
      </div>

      {/* Simple vote modal */}
      {voteModalFeedId && (
        <div
          className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
          onClick={() => setVoteModalFeedId(null)}
        >
          <div
            className="bg-white w-full max-w-sm border border-[#1E4775]/20 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-[#1E4775] font-semibold text-sm">
                Vote allocation
              </div>
              <button
                className="text-[#1E4775]/60 hover:text-[#1E4775] text-sm"
                onClick={() => setVoteModalFeedId(null)}
              >
                ✕
              </button>
            </div>
            <div className="text-xs text-[#1E4775]/70 mb-3">
              Currently allocated to this feed:{" "}
              <span className="font-mono font-semibold text-[#1E4775]">
                {myAllocationsVotable[voteModalFeedId] ?? 0}
              </span>
              {" • "}
              Unallocated points:{" "}
              <span className="font-mono font-semibold text-[#1E4775]">
                {remainingPoints}
              </span>
              {" • "}
              Total:{" "}
              <span className="font-mono font-semibold text-[#1E4775]">
                {VOTE_POINTS_MAX - remainingPoints}/{VOTE_POINTS_MAX}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-[#1E4775]/60">Points</div>
              <div className="flex items-center gap-2">
                <button
                  className="px-2 py-1 bg-[#1E4775]/10 text-[#1E4775] font-semibold"
                  onClick={() => setVoteModalPoints((v) => Math.max(0, v - 1))}
                >
                  –
                </button>
                <div className="w-10 text-center font-mono font-semibold text-[#1E4775]">
                  {voteModalPoints}
                </div>
                <button
                  className="px-2 py-1 bg-[#1E4775]/10 text-[#1E4775] font-semibold disabled:opacity-50"
                  disabled={
                    voteModalPoints >= VOTE_POINTS_MAX ||
                    voteModalPoints >=
                      remainingPoints + (myAllocationsVotable[voteModalFeedId] ?? 0)
                  }
                  onClick={() =>
                    setVoteModalPoints((v) => Math.min(VOTE_POINTS_MAX, v + 1))
                  }
                >
                  +
                </button>
              </div>
            </div>

            {saveVotesMutation.isError && (
              <div className="mt-3 text-xs text-red-600">
                {(saveVotesMutation.error as any)?.message ||
                  "Failed to save votes"}
              </div>
            )}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                className="px-3 py-1.5 text-xs bg-[#1E4775]/10 text-[#1E4775] font-semibold"
                onClick={() => setVoteModalFeedId(null)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1.5 text-xs bg-[#1E4775] text-white font-semibold disabled:opacity-50"
                disabled={saveVotesMutation.isPending}
                onClick={async () => {
                  const feedId = voteModalFeedId;
                  await saveVotePoints(feedId, voteModalPoints);
                  setVoteModalFeedId(null);
                }}
              >
                {saveVotesMutation.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
