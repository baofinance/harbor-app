"use client";

import React, { useEffect, useMemo } from "react";
import Head from "next/head";
import { usePublicClient, useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import {
  MapIcon,
  ChartBarIcon,
  CpuChipIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";
import { FeatureBox } from "@/components/flow/FeatureBox";
import { ChainDropdown } from "@/components/flow/ChainDropdown";
import { BaseAssetDropdown } from "@/components/flow/BaseAssetDropdown";
import { FeedTable } from "@/components/flow/FeedTable";
import { useFeedFilters } from "@/hooks/useFeedFilters";
import { feeds as feedsConfig } from "@/config/feeds";
import type { Network } from "@/config/networks";
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
      if (!res.ok) throw new Error(json?.error || "Failed to load votes");
      return json as {
        totals: Record<string, number>;
        allocations?: Record<string, number>;
      };
    },
    enabled: allFeedIds.length > 0,
    staleTime: 15_000,
  });

  const myAllocations = votesQuery.data?.allocations ?? {};
  const usedPoints = useMemo(() => {
    return Object.values(myAllocations).reduce(
      (s, v) => s + (Number.isFinite(v) ? v : 0),
      0
    );
  }, [myAllocations]);

  const firstVisibleExpanded = useMemo(() => {
    if (!filteredFeeds || filteredFeeds.length === 0) return null;
    const first = filteredFeeds[0];
    const network = first.network as Network;
    const token = first.baseAsset;
    const baseAssetFeeds =
      feedsConfig[network as keyof typeof feedsConfig]?.[
        token as keyof (typeof feedsConfig)[typeof network]
      ];
    const feedIndex = Array.isArray(baseAssetFeeds)
      ? baseAssetFeeds.findIndex((f: any) => f.address === first.address)
      : -1;
    if (feedIndex < 0) return null;
    return { network, token, feedIndex };
  }, [filteredFeeds]);

  // Default select the top visible feed (on initial load and when filters change).
  useEffect(() => {
    if (!firstVisibleExpanded) return;
    setExpanded(firstVisibleExpanded);
    // Intentionally exclude `expanded` so a user collapse doesn't immediately re-expand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstVisibleExpanded, selectedNetwork, selectedBaseAsset, searchQuery]);

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
            <div className="bg-white py-1.5 px-2.5 border border-[#1E4775]/10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
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
              </div>
            </div>
            {/* Total Feeds Section */}
            <div className="bg-[#FF8A7A] border border-[#1E4775]/10 py-3 px-3 flex flex-col items-center justify-center">
              <div className="flex items-center gap-2 mb-1">
                <Bars3Icon className="w-4 h-4 text-white flex-shrink-0" />
                <h3 className="font-medium text-white text-xs uppercase tracking-wider text-center">
                  Total Feeds
                </h3>
              </div>
              <div className="flex items-center justify-center">
                <span className="text-base font-semibold text-white font-mono text-center">
                  {totalFeedCount}
                </span>
              </div>
            </div>

            {/* Votes Box */}
            <div className="bg-white border border-[#1E4775]/10 py-3 px-3 flex flex-col items-center justify-center">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-[#1E4775] text-xs uppercase tracking-wider text-center">
                  Your Votes
                </h3>
              </div>
              <div className="flex items-center justify-center">
                <span className="font-mono font-semibold text-[#1E4775] text-base text-center">
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
                  Failed to load votes
                </div>
              )}
            </div>
          </div>

          {/* Feed Table */}
          {filteredFeeds.length > 0 && (
            <FeedTable
              feeds={filteredFeeds}
              publicClient={publicClient}
              expanded={expanded}
              setExpanded={setExpanded}
            />
          )}

          {/* Details render inline within the feed list when a row is expanded */}
        </main>
      </div>
    </>
  );
}
