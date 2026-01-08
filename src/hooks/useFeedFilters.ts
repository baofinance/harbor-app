import { useMemo, useState, useEffect } from "react";
import { NETWORKS, type Network } from "@/config/networks";
import { feeds as feedsConfig } from "@/config/feeds";
import { parsePair } from "@/lib/utils";
import type { FeedEntry } from "@/config/feeds";

type ExpandedState = null | {
  network: Network;
  token: string;
  feedIndex: number;
};

type FeedWithMetadata = FeedEntry & {
  network: Network;
  baseAsset: string;
};

export function useFeedFilters() {
  const [expanded, setExpanded] = useState<ExpandedState>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);
  const [selectedBaseAsset, setSelectedBaseAsset] = useState<string | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Clear expanded view when filters change
  useEffect(() => {
    setExpanded(null);
  }, [selectedNetwork, selectedBaseAsset, searchQuery]);

  // Get all feeds with metadata
  const allFeeds = useMemo(() => {
    const feedsList: FeedWithMetadata[] = [];
    NETWORKS.forEach((network) => {
      const networkFeeds = feedsConfig[network];
      if (!networkFeeds) return;

      Object.entries(networkFeeds).forEach(([baseAsset, feedEntries]) => {
        if (Array.isArray(feedEntries) && feedEntries.length > 0) {
          feedEntries.forEach((feed) => {
            feedsList.push({
              ...feed,
              network,
              baseAsset,
            });
          });
        }
      });
    });
    return feedsList;
  }, []);

  // Filter feeds based on selections
  const filteredFeeds = useMemo(() => {
    let filtered = allFeeds;

    // Filter by network
    if (selectedNetwork) {
      filtered = filtered.filter((feed) => feed.network === selectedNetwork);
    }

    // Filter by base asset
    if (selectedBaseAsset) {
      filtered = filtered.filter(
        (feed) => feed.baseAsset === selectedBaseAsset
      );
    }

    // Filter by search query (quote asset)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((feed) => {
        const pair = parsePair(feed.label);
        return pair.quote.toLowerCase().includes(query);
      });
    }

    return filtered;
  }, [allFeeds, selectedNetwork, selectedBaseAsset, searchQuery]);

  // Get available base assets based on selected network
  const availableBaseAssets = useMemo(() => {
    const assets = new Set<string>();
    const networksToCheck = selectedNetwork ? [selectedNetwork] : NETWORKS;

    networksToCheck.forEach((network) => {
      const networkFeeds = feedsConfig[network];
      if (!networkFeeds) return;

      Object.keys(networkFeeds).forEach((baseAsset) => {
        const feedEntries =
          networkFeeds[baseAsset as keyof typeof networkFeeds];
        if (Array.isArray(feedEntries) && feedEntries.length > 0) {
          assets.add(baseAsset);
        }
      });
    });

    return Array.from(assets).sort();
  }, [selectedNetwork]);

  // Get total feed count
  const totalFeedCount = useMemo(() => {
    if (!selectedNetwork && !selectedBaseAsset) {
      return allFeeds.length;
    }
    return filteredFeeds.length;
  }, [
    allFeeds.length,
    selectedNetwork,
    selectedBaseAsset,
    filteredFeeds.length,
  ]);

  return {
    expanded,
    setExpanded,
    selectedNetwork,
    setSelectedNetwork,
    selectedBaseAsset,
    setSelectedBaseAsset,
    searchQuery,
    setSearchQuery,
    allFeeds,
    filteredFeeds,
    availableBaseAssets,
    totalFeedCount,
  };
}

export type { ExpandedState, FeedWithMetadata };
