"use client";

import React, { useMemo, useState } from "react";
import Head from "next/head";
import { usePublicClient, useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import {
  MapIcon,
  ChartBarIcon,
  HandRaisedIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
  PlusIcon,
  MinusIcon,
} from "@heroicons/react/24/outline";
import { FeatureBox } from "@/components/flow/FeatureBox";
import { ChainDropdown } from "@/components/flow/ChainDropdown";
import { BaseAssetDropdown } from "@/components/flow/BaseAssetDropdown";
import { FeedTable } from "@/components/flow/FeedTable";
import { useFeedFilters } from "@/hooks/useFeedFilters";
import { buildFeedId } from "@/lib/votesStore";
import { VOTE_POINTS_MAX } from "@/lib/votesTypedData";

export default function FlowPage() {
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const {
    expanded,
    setExpanded,
    selectedNetwork,
    setSelectedNetwork,
    selectedBaseAsset,
    setSelectedBaseAsset,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    allFeeds,
    filteredFeeds,
    availableBaseAssets,
    totalFeedCount,
  } = useFeedFilters();

  // Votes query for the votes used display
  const allFeedIds = useMemo(() => {
    return filteredFeeds.map((f) => buildFeedId(f.network, f.address));
  }, [filteredFeeds]);

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
      if (!res.ok) {
        // Staging/preview may not have persistent votes storage configured. Treat as "voting unavailable".
        const msg = String(json?.error || "Failed to load votes");
        throw new Error(msg);
      }
      return json as {
        totals: Record<string, number>;
        allocations?: Record<string, number>;
      };
    },
    enabled: allFeedIds.length > 0,
    staleTime: 15_000,
  });

  const myAllocations = votesQuery.data?.allocations ?? {};
  const canonicalizeFeedId = (feedId: string): string | null => {
    const raw = String(feedId || "").trim();
    const idx = raw.indexOf(":");
    if (idx <= 0) return null;
    const net = raw.slice(0, idx).trim().toLowerCase();
    const addr = raw.slice(idx + 1).trim().toLowerCase();
    if (!net || !addr) return null;
    return `${net}:${addr}`;
  };

  const myAllocationsCanonical = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(myAllocations)) {
      const canon = canonicalizeFeedId(k);
      if (!canon) continue;
      const n = Number(v);
      if (!Number.isFinite(n)) continue;
      out[canon] = Math.max(out[canon] ?? 0, n);
    }
    return out;
  }, [myAllocations]);
  const activeFeedIdSet = useMemo(() => {
    const set = new Set<string>();
    for (const f of allFeeds) {
      const status = f.status || "available";
      if (status === "active") {
        set.add(buildFeedId(f.network, f.address));
      }
    }
    return set;
  }, [allFeeds]);

  const usedPoints = useMemo(() => {
    // Only count votes for non-active feeds (active markets are not votable).
    let sum = 0;
    for (const [feedId, v] of Object.entries(myAllocationsCanonical)) {
      if (activeFeedIdSet.has(feedId)) continue;
      sum += Number.isFinite(v) ? v : 0;
    }
    return sum;
  }, [myAllocationsCanonical, activeFeedIdSet]);

  // Toggle state for Feed Price / Quote Asset Price
  const [showQuoteAssetPrice, setShowQuoteAssetPrice] = useState(false);

  // No default expansion - users must manually expand feeds

  return (
    <>
      <Head>
        <title>Map Room | Harbor</title>
      </Head>
      <div className="min-h-screen text-white max-w-[1300px] mx-auto font-sans relative">
        <main className="container mx-auto px-4 sm:px-10 pb-6">
          {/* Header */}
          <div className="mb-2">
            <div className="p-2 flex items-center justify-center mb-0">
              <h1 className="font-bold font-mono text-white text-5xl sm:text-6xl md:text-7xl text-center">
                Map Room
              </h1>
            </div>
            <div className="flex items-center justify-center mb-2 -mt-2">
              <p className="text-white/80 text-lg text-center">
                Oracle feeds and price data for Harbor markets
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
              <div className="bg-[#FF8A7A] p-4 sm:p-3 md:p-4 flex flex-col border border-[#1E4775]/10">
                <div className="flex items-center justify-center mb-2">
                  <HandRaisedIcon className="w-5 h-5 sm:w-4 sm:h-4 md:w-6 md:h-6 text-white mr-1.5 sm:mr-1 md:mr-2 flex-shrink-0" />
                  <h2 className="font-bold text-white text-lg sm:text-sm md:text-base lg:text-lg text-center">
                    Vote
                  </h2>
                </div>
                <div className="flex-1 flex items-center">
                  <p className="text-sm sm:text-xs md:text-sm text-white/90 text-center w-full">
                    Vote for the markets you want to see go live next
                  </p>
                </div>
              </div>
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
                icon={InformationCircleIcon}
                title="Feed Details"
                description={
                  <>
                    Detailed info about the feed:
                    <br />
                    price, feed count, normalization, indexation & heartbeat
                    windows
                  </>
                }
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 my-2"></div>

          {/* Filters, Total Feeds, and Votes Box - All on one line */}
          <div className="grid grid-cols-1 md:grid-cols-[4fr_1fr_1fr] gap-2 mb-2">
            {/* Filters Section */}
            <div className="bg-white py-2.5 px-2.5 border border-[#1E4775]/10">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-1.5 mb-2">
                {/* Chain Dropdown */}
                <div>
                  <label className="block text-xs text-[#1E4775]/60 mb-1 uppercase tracking-wider font-medium text-center">
                    Chain
                  </label>
                  <ChainDropdown
                    selectedNetwork={selectedNetwork}
                    onSelect={setSelectedNetwork}
                  />
                </div>

                {/* Base Asset Dropdown */}
                <div>
                  <label className="block text-xs text-[#1E4775]/60 mb-1 uppercase tracking-wider font-medium text-center">
                    Base Asset
                  </label>
                  <BaseAssetDropdown
                    selectedBaseAsset={selectedBaseAsset}
                    availableAssets={availableBaseAssets}
                    onSelect={setSelectedBaseAsset}
                  />
                </div>

                {/* Search */}
                <div>
                  <label className="block text-xs text-[#1E4775]/60 mb-1 uppercase tracking-wider font-medium text-center">
                    Search Quote Asset
                  </label>
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-[#1E4775]/40" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by quote asset..."
                      className="w-full pl-7 pr-2.5 py-1 text-xs border border-[#1E4775]/20 text-[#1E4775] focus:outline-none focus:ring-1 focus:ring-[#1E4775]/20"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div className="flex flex-col">
                  <label className="block text-xs text-[#1E4775]/60 mb-1 uppercase tracking-wider font-medium text-center">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "available")}
                    className="w-full px-2.5 py-1 text-xs border border-[#1E4775]/20 text-[#1E4775] bg-white focus:outline-none focus:ring-1 focus:ring-[#1E4775]/20"
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="available">Available</option>
                  </select>
                  {/* Toggle Switch under Status */}
                  <div className="flex items-center justify-end gap-2 mt-2">
                    <span className="text-[10px] text-[#1E4775]/60 uppercase tracking-wider">
                      Feed Price
                    </span>
                    <button
                      onClick={() => setShowQuoteAssetPrice(!showQuoteAssetPrice)}
                      className="relative inline-flex h-5 w-9 items-center rounded-md transition-colors focus:outline-none"
                      type="button"
                      title="Toggle between Feed Price and Quote Asset Price"
                      role="switch"
                      aria-checked={showQuoteAssetPrice}
                    >
                      {/* Background track */}
                      <span
                        className={`inline-block h-5 w-9 transform rounded-md shadow-sm transition-colors ${
                          showQuoteAssetPrice ? "bg-[#FF8A7A]" : "bg-harbor-mint"
                        }`}
                      />
                      {/* Switch thumb */}
                      <span
                        className={`absolute top-0.5 left-0.5 inline-block h-4 w-4 transform rounded-md bg-white shadow-md transition-transform ${
                          showQuoteAssetPrice ? "translate-x-4" : "translate-x-0"
                        }`}
                      >
                        {/* Icon inside thumb - use + and - instead of checkmark/X */}
                        <span className="flex h-full w-full items-center justify-center">
                          {showQuoteAssetPrice ? (
                            <MinusIcon className="h-2.5 w-2.5 text-[#FF8A7A]" />
                          ) : (
                            <PlusIcon className="h-2.5 w-2.5 text-harbor-mint" />
                          )}
                        </span>
                      </span>
                    </button>
                    <span className="text-[10px] text-[#1E4775]/60 uppercase tracking-wider">
                      Quote Asset Price
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {/* Total Feeds Section */}
            <div className="bg-[#FF8A7A] border border-[#1E4775]/10 py-3 px-3 flex flex-col items-center justify-center">
              <div className="flex items-center gap-2 mb-1">
                <Bars3Icon className="w-4 h-4 text-white flex-shrink-0" />
                <h3 className="font-medium text-white text-sm uppercase tracking-wider text-center">
                  Total Feeds
                </h3>
              </div>
              <div className="flex items-center justify-center">
                <span className="text-lg font-semibold text-white font-mono text-center">
                  {totalFeedCount}
                </span>
              </div>
            </div>

            {/* Votes Box */}
            <div className="bg-white border border-[#1E4775]/10 py-3 px-3 flex flex-col items-center justify-center">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-[#1E4775] text-sm uppercase tracking-wider text-center">
                  Your Votes
                </h3>
              </div>
              <div className="flex items-center justify-center">
                <span className="font-mono font-semibold text-[#1E4775] text-lg text-center">
                  {usedPoints}/{VOTE_POINTS_MAX}
                </span>
              </div>
              {votesQuery.isLoading && (
                <div className="text-[10px] text-[#1E4775]/50 mt-1">
                  Loading votes…
                </div>
              )}
              {votesQuery.isError && (
                <div className="text-[10px] text-red-600 mt-1">
                  {String(
                    (votesQuery.error as any)?.message || "Failed to load votes"
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Feed Table */}
          {filteredFeeds.length > 0 && (
            <FeedTable
              feeds={filteredFeeds}
              allFeeds={allFeeds}
              publicClient={publicClient}
              expanded={expanded}
              setExpanded={setExpanded}
              showQuoteAssetPrice={showQuoteAssetPrice}
            />
          )}

          {/* Details render inline within the feed list when a row is expanded */}
        </main>
      </div>
    </>
  );
}
