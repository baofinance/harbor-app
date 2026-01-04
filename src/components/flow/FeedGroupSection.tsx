"use client";

import { useState } from "react";
import TokenIcon from "@/components/TokenIcon";
import SimpleTooltip from "@/components/SimpleTooltip";
import { ChevronIcon } from "./Icons";
import { getLogoPath } from "@/lib/logos";
import { parsePair } from "@/lib/utils";
import { getTokenFullName } from "@/utils/flowUtils";
import { useRpcClient } from "@/hooks/useRpcClient";
import { useFeedPrices } from "@/hooks/useFeedPrices";
import type { Network } from "@/config/networks";
import { feeds } from "@/config/feeds";

type ExpandedState = null | {
  network: Network;
  token: string;
  feedIndex: number;
};

interface FeedGroupSectionProps {
  network: Network;
  token: string;
  publicClient: any;
  expanded: ExpandedState;
  setExpanded: (state: ExpandedState) => void;
}

export function FeedGroupSection({
  network,
  token,
  publicClient,
  expanded,
  setExpanded,
}: FeedGroupSectionProps) {
  const [sectionExpanded, setSectionExpanded] = useState(false);
  const networkFeeds = feeds[network as keyof typeof feeds];
  const feedEntries =
    (networkFeeds?.[token as keyof typeof networkFeeds] as any) || [];

  const rpcClient = useRpcClient(network);
  const { prices, loading } = useFeedPrices(rpcClient, feedEntries);

  const isExpanded = expanded?.network === network && expanded?.token === token;

  return (
    <div
      className={`p-2 sm:p-3 overflow-x-auto overflow-y-visible transition ${
        sectionExpanded
          ? "bg-[rgb(var(--surface-selected-rgb))]"
          : "bg-white hover:bg-[rgb(var(--surface-selected-rgb))]"
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
              const price = prices[idx] ?? "-";
              const isFeedExpanded = isExpanded && expanded?.feedIndex === idx;
              const status = feed.status || "available";

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
          </tbody>
        </table>
      )}
    </div>
  );
}

