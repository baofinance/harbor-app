"use client";

import React from "react";
import Head from "next/head";
import { usePublicClient } from "wagmi";
import {
  MapIcon,
  ChartBarIcon,
  CpuChipIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";
import { FeedDetails } from "@/components/flow/FeedDetails";
import { ExpandedFeedHeader } from "@/components/flow/ExpandedFeedHeader";
import { FeatureBox } from "@/components/flow/FeatureBox";
import { ChainDropdown } from "@/components/flow/ChainDropdown";
import { BaseAssetDropdown } from "@/components/flow/BaseAssetDropdown";
import { FeedTable } from "@/components/flow/FeedTable";
import { useFeedFilters } from "@/hooks/useFeedFilters";

export default function FlowPage() {
  const publicClient = usePublicClient();
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
                    price, feed count, normalization, indexation & heartbeat windows
                  </>
                }
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 my-2"></div>

          {/* Filters and Overview Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-4 items-stretch">
            {/* Filters Section - 3/4 width */}
            <div className="md:col-span-2 lg:col-span-3 bg-white py-4 px-4 border border-[#1E4775]/10 flex flex-col justify-end">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Chain Dropdown */}
                <div>
                  <label className="block text-xs text-[#1E4775]/60 mb-2 uppercase tracking-wider">
                    Chain
                  </label>
                  <ChainDropdown
                    selectedNetwork={selectedNetwork}
                    onSelect={setSelectedNetwork}
                  />
                </div>

                {/* Base Asset Dropdown */}
                <div>
                  <label className="block text-xs text-[#1E4775]/60 mb-2 uppercase tracking-wider">
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
                  <label className="block text-xs text-[#1E4775]/60 mb-2 uppercase tracking-wider">
                    Search Quote Asset
                  </label>
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#1E4775]/40" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by quote asset..."
                      className="w-full pl-10 pr-4 py-2 border border-[#1E4775]/20 text-[#1E4775] focus:outline-none focus:ring-2 focus:ring-[#1E4775]/20"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Total Feeds Section - 1/4 width */}
            <div className="md:col-span-2 lg:col-span-1 bg-[#FF8A7A] border border-[#1E4775]/10 py-4 px-4 flex flex-col items-center justify-end">
              <div className="flex items-center gap-2 mb-2">
                <Bars3Icon className="w-5 h-5 text-white flex-shrink-0" />
                <h3 className="font-bold text-white text-lg sm:text-sm md:text-base lg:text-lg text-center">
                  Total Feeds
                </h3>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <span className="text-2xl sm:text-xl md:text-3xl font-bold text-white font-mono text-center">
                  {totalFeedCount}
                </span>
              </div>
            </div>
          </div>

          {/* Feed Table */}
          {/* Show feeds when filters are applied or when showing first 10 feeds */}
          {filteredFeeds.length > 0 && (
            <>
              <FeedTable
                feeds={filteredFeeds}
                publicClient={publicClient}
                expanded={expanded}
                setExpanded={setExpanded}
              />
              {/* Footnote - always show max 10 feeds limit */}
              <div className="text-right mt-2">
                <span className="text-xs text-white/60">max 10 feeds visible</span>
              </div>
            </>
          )}

          {/* Detailed Feed Expansion */}
          {expanded && (
            <>
              <ExpandedFeedHeader
                expanded={expanded}
                onClose={() => setExpanded(null)}
              />
              <FeedDetails
                network={expanded.network}
                token={expanded.token}
                feedIndex={expanded.feedIndex}
                publicClient={publicClient}
                onClose={() => setExpanded(null)}
              />
            </>
          )}
        </main>
      </div>
    </>
  );
}
