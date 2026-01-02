"use client";

import React, { useMemo, useState } from "react";
import Head from "next/head";
import { usePublicClient } from "wagmi";
import {
  MapIcon,
  ChartBarIcon,
  CpuChipIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { NETWORKS, type Network } from "@/config/networks";
import { feeds } from "@/config/feeds";
import { FeedGroupSection } from "@/components/flow/FeedGroupSection";
import { FeedDetails } from "@/components/flow/FeedDetails";

type ExpandedState = null | {
  network: Network;
  token: string;
  feedIndex: number;
};

export default function FlowPage() {
  const publicClient = usePublicClient();
  const [expanded, setExpanded] = useState<ExpandedState>(null);

  // All networks are visible
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
