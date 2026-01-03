"use client";

import { useMemo } from "react";
import { feeds as feedsConfig } from "@/config/feeds";
import { parsePair } from "@/lib/utils";
import { getTokenFullName } from "@/utils/flowUtils";
import { getLogoPath } from "@/lib/logos";
import TokenIcon from "@/components/TokenIcon";
import SimpleTooltip from "@/components/SimpleTooltip";
import { useRpcClient } from "@/hooks/useRpcClient";
import { useFeedPrices } from "@/hooks/useFeedPrices";
import type { FeedWithMetadata, ExpandedState } from "@/hooks/useFeedFilters";

interface FeedTableProps {
  feeds: FeedWithMetadata[];
  publicClient: any;
  expanded: ExpandedState;
  setExpanded: (state: ExpandedState) => void;
}

function FeedGroupRows({
  feeds,
  publicClient,
  expanded,
  setExpanded,
}: {
  feeds: FeedWithMetadata[];
  publicClient: any;
  expanded: ExpandedState;
  setExpanded: (state: ExpandedState) => void;
}) {
  const network = feeds[0].network;
  const baseAsset = feeds[0].baseAsset;
  const rpcClient = useRpcClient(network);
  const feedEntries = feeds.map((f) => ({ 
    address: f.address as `0x${string}`, 
    label: f.label 
  }));
  // Type assertion needed due to wagmi/viem type compatibility
  const { prices, loading } = useFeedPrices(rpcClient as any, feedEntries);

  return (
    <>
      {feeds.map((feed, idx) => {
        const pair = parsePair(feed.label);
        const price = prices[idx] ?? "-";
        const status = feed.status || "available";

        // Find the index in the original feeds array for this network and base asset
        const networkFeeds = feedsConfig[network as keyof typeof feedsConfig];
        const baseAssetFeeds = networkFeeds?.[baseAsset as keyof typeof networkFeeds];
        const feedIndex = baseAssetFeeds 
          ? baseAssetFeeds.findIndex(
              (f: any) => f.address === feed.address
            )
          : -1;

        const isFeedExpanded =
          expanded?.network === network &&
          expanded?.token === baseAsset &&
          expanded?.feedIndex === feedIndex;

        return (
          <tr
            key={feed.address}
            className="border-t border-[#1E4775]/10 hover:bg-white/50 transition cursor-pointer"
            onClick={() =>
              setExpanded(
                isFeedExpanded
                  ? null
                  : { network, token: baseAsset, feedIndex }
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
                <SimpleTooltip
                  label={`${getTokenFullName(pair.base)} / ${getTokenFullName(pair.quote)}`}
                >
                  <span className="text-[#1E4775] font-medium">
                    {feed.label}
                    {feed.divisor && feed.divisor > 1 && (
                      <span className="ml-2 text-xs text-[#1E4775]/60 italic">
                        (price normalized)
                      </span>
                    )}
                  </span>
                </SimpleTooltip>
              </div>
            </td>
            <td className="py-2 px-4 text-[#1E4775] whitespace-nowrap text-sm">
              {network === "mainnet" ? "ETH Mainnet" : network.charAt(0).toUpperCase() + network.slice(1)}
            </td>
            <td className="py-2 px-4 text-[#1E4775] whitespace-nowrap">
              Chainlink
              {feed.divisor && feed.divisor > 1 && (
                <span className="block text-xs text-[#1E4775]/60">
                  divisor: {feed.divisor}
                </span>
              )}
            </td>
            <td className="py-2 px-4 font-mono text-[#1E4775]">
              {loading ? (
                "Loading..."
              ) : price === "-" ? (
                "-"
              ) : (
                <SimpleTooltip
                  label={`1 ${getTokenFullName(pair.base)} = ${price} ${getTokenFullName(pair.quote)}`}
                >
                  <span>{`1 ${pair.base} = ${price} ${pair.quote}`}</span>
                </SimpleTooltip>
              )}
            </td>
            <td className="py-2 px-4 w-24">
              <span
                className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                  status === "active"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {status === "active" ? "Active" : "Available"}
              </span>
            </td>
          </tr>
        );
      })}
    </>
  );
}

export function FeedTable({
  feeds,
  publicClient,
  expanded,
  setExpanded,
}: FeedTableProps) {
  // Group feeds by network and base asset for price fetching
  const feedsByGroup = useMemo(() => {
    const groups: Record<string, FeedWithMetadata[]> = {};
    feeds.forEach((feed) => {
      const key = `${feed.network}-${feed.baseAsset}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(feed);
    });
    return groups;
  }, [feeds]);

  return (
    <div className="bg-white border border-[#1E4775]/10 overflow-hidden">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[#1E4775]/20 uppercase tracking-wider text-[10px] text-[#1E4775]/60">
            <th className="py-3 px-4 font-normal text-left w-1/3">Feed</th>
            <th className="py-3 px-4 font-normal text-left w-32">Chain</th>
            <th className="py-3 px-4 font-normal text-left w-24">Type</th>
            <th className="py-3 px-4 font-normal text-left">Price</th>
            <th className="py-3 px-4 font-normal text-left w-24">Status</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(feedsByGroup).map(([key, groupFeeds]) => (
            <FeedGroupRows
              key={key}
              feeds={groupFeeds}
              publicClient={publicClient}
              expanded={expanded}
              setExpanded={setExpanded}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
