"use client";

import { useMemo, useState } from "react";
import { feeds as feedsConfig } from "@/config/feeds";
import { parsePair } from "@/lib/utils";
import { getTokenFullName } from "@/utils/flowUtils";
import { getLogoPath } from "@/lib/logos";
import TokenIcon from "@/components/TokenIcon";
import SimpleTooltip from "@/components/SimpleTooltip";
import { useRpcClient } from "@/hooks/useRpcClient";
import { useFeedPrices } from "@/hooks/useFeedPrices";
import type { FeedWithMetadata, ExpandedState } from "@/hooks/useFeedFilters";
import { FeedDetails } from "@/components/flow/FeedDetails";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { useAccount, useSignTypedData } from "wagmi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { buildFeedId } from "@/lib/votesStore";
import {
  buildVoteTypedData,
  normalizeAllocationsForSigning,
  sumAllocationPoints,
  VOTE_POINTS_MAX,
  type VoteAllocation,
} from "@/lib/votesTypedData";

interface FeedTableProps {
  feeds: FeedWithMetadata[];
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
  onOpen,
}: {
  feedId: string;
  totalPoints: number;
  myPoints: number;
  remainingPoints: number;
  isConnected: boolean;
  onOpen: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="text-[10px] text-[#1E4775]/60 whitespace-nowrap">
        Total:{" "}
        <span className="font-mono font-semibold text-[#1E4775]">
          {totalPoints}
        </span>
      </div>
      <button
        className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
          isConnected
            ? "bg-[#FF8A7A] text-white hover:bg-[#FF6B5A]"
            : "bg-[#FF8A7A]/30 text-white/50 cursor-not-allowed"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          if (!isConnected) return;
          onOpen();
        }}
        title={
          isConnected
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
  onOpenVote,
}: {
  feeds: FeedWithMetadata[];
  publicClient: any;
  expanded: ExpandedState;
  setExpanded: (state: ExpandedState) => void;
  votesTotals: Record<string, number>;
  myAllocations: Record<string, number>;
  remainingPoints: number;
  isConnected: boolean;
  onOpenVote: (feedId: string) => void;
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

  return (
    <>
      {feeds.map((feed, idx) => {
        const pair = parsePair(feed.label);
        const price = prices[idx] ?? "-";
        const status = feed.status || "available";
        const feedId = buildFeedId(network, feed.address);
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
                <div className="grid grid-cols-[1.2fr_0.8fr_0.6fr_1.2fr_0.6fr_0.4fr_0.7fr] gap-3 items-center text-sm">
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
                    {loading ? (
                      "Loading..."
                    ) : price === "-" ? (
                      "-"
                    ) : (
                      <SimpleTooltip
                        label={`1 ${getTokenFullName(
                          pair.base
                        )} = ${price} ${getTokenFullName(pair.quote)}`}
                      >
                        <span>{`1 ${pair.base} = ${price} ${pair.quote}`}</span>
                      </SimpleTooltip>
                    )}
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

                  <div className="text-center">
                    <div className="text-[10px] text-[#1E4775]/60 whitespace-nowrap">
                      <span className="font-mono font-semibold text-[#1E4775]">
                        {totalPoints}
                      </span>
                    </div>
                  </div>

                  <div
                    className="flex justify-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                        isConnected
                          ? "bg-[#FF8A7A] text-white hover:bg-[#FF6B5A]"
                          : "bg-[#FF8A7A]/30 text-white/50 cursor-not-allowed"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isConnected) return;
                        onOpenVote(feedId);
                      }}
                      title={
                        isConnected
                          ? `Allocate vote points (remaining ${remainingPoints})`
                          : "Connect wallet to vote"
                      }
                    >
                      Vote{myPoints > 0 ? ` (${myPoints})` : ""}
                    </button>
                  </div>
                </div>

                {/* Mobile layout */}
                <div className="lg:hidden p-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
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
                      <span className="text-[#1E4775] font-semibold text-sm truncate">
                        {feed.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isFeedExpanded ? (
                        <ChevronUpIcon className="w-5 h-5 text-[#1E4775]/70" />
                      ) : (
                        <ChevronDownIcon className="w-5 h-5 text-[#1E4775]/70" />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-[#1E4775]/5 p-2 text-center">
                      <div className="text-[#1E4775]/60 text-[9px]">Chain</div>
                      <div className="text-[#1E4775] font-mono font-semibold text-[10px]">
                        {network === "mainnet"
                          ? "ETH Mainnet"
                          : network.charAt(0).toUpperCase() + network.slice(1)}
                      </div>
                    </div>
                    <div className="bg-[#1E4775]/5 p-2 text-center">
                      <div className="text-[#1E4775]/60 text-[9px]">Price</div>
                      <div className="text-[#1E4775] font-mono font-semibold text-[10px]">
                        {loading ? "Loading..." : price === "-" ? "-" : price}
                      </div>
                    </div>
                    <div className="bg-[#1E4775]/5 p-2 text-center">
                      <div className="text-[#1E4775]/60 text-[9px]">Status</div>
                      <div className="text-[#1E4775] font-mono font-semibold text-[10px]">
                        {status === "active" ? "Active" : "Available"}
                      </div>
                    </div>
                    <div
                      className="bg-[#1E4775]/5 p-2 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="text-[#1E4775]/60 text-[9px]">Votes</div>
                      <div className="flex justify-center">
                        <VoteCell
                          feedId={feedId}
                          totalPoints={totalPoints}
                          myPoints={myPoints}
                          remainingPoints={remainingPoints}
                          isConnected={isConnected}
                          onOpen={() => onOpenVote(feedId)}
                        />
                      </div>
                    </div>
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

export function FeedTable({
  feeds,
  publicClient,
  expanded,
  setExpanded,
}: FeedTableProps) {
  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const queryClient = useQueryClient();
  const [voteModalFeedId, setVoteModalFeedId] = useState<string | null>(null);
  const [voteModalPoints, setVoteModalPoints] = useState<number>(0);

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

  const totals = votesQuery.data?.totals ?? {};
  const myAllocations = votesQuery.data?.allocations ?? {};
  const usedPoints = useMemo(() => {
    return Object.values(myAllocations).reduce(
      (s, v) => s + (Number.isFinite(v) ? v : 0),
      0
    );
  }, [myAllocations]);
  const remainingPoints = Math.max(0, VOTE_POINTS_MAX - usedPoints);

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
    setVoteModalFeedId(feedId);
    setVoteModalPoints(myAllocations[feedId] ?? 0);
  }

  async function saveVotePoints(feedId: string, points: number) {
    const next = { ...myAllocations, [feedId]: points };
    // remove zeros
    for (const k of Object.keys(next)) {
      if (!next[k] || next[k] <= 0) delete next[k];
    }
    await saveVotesMutation.mutateAsync(next);
  }

  // Sort feeds to prioritize those with votes, then group by network and base asset
  const sortedAndGroupedFeeds = useMemo(() => {
    // Sort feeds: those with votes first, then by feed label
    const sorted = [...feeds].sort((a, b) => {
      const feedIdA = buildFeedId(a.network, a.address);
      const feedIdB = buildFeedId(b.network, b.address);
      const hasVoteA = (myAllocations[feedIdA] ?? 0) > 0;
      const hasVoteB = (myAllocations[feedIdB] ?? 0) > 0;

      // If one has a vote and the other doesn't, prioritize the one with a vote
      if (hasVoteA && !hasVoteB) return -1;
      if (!hasVoteA && hasVoteB) return 1;

      // If both have votes or both don't, sort by label
      return a.label.localeCompare(b.label);
    });

    // Group by network and base asset for price fetching
    const groups: Record<string, FeedWithMetadata[]> = {};
    sorted.forEach((feed) => {
      const key = `${feed.network}-${feed.baseAsset}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(feed);
    });
    return groups;
  }, [feeds, myAllocations]);

  return (
    <div className="space-y-2">
      {/* Header row (desktop) */}
      <div className="hidden lg:block bg-white border border-[#1E4775]/10 py-2 px-3">
        <div className="grid grid-cols-[1.2fr_0.8fr_0.6fr_1.2fr_0.6fr_0.4fr_0.7fr] gap-3 items-center uppercase tracking-wider text-[10px] text-[#1E4775] font-bold">
          <div className="text-center">Feed</div>
          <div className="text-center">Chain</div>
          <div className="text-center">Type</div>
          <div className="text-center">Price</div>
          <div className="text-center">Status</div>
          <div className="text-center">Votes</div>
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
            onOpenVote={openVoteModal}
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
              You have{" "}
              <span className="font-mono font-semibold text-[#1E4775]">
                {remainingPoints + (myAllocations[voteModalFeedId] ?? 0)}
              </span>{" "}
              points available for this change (max {VOTE_POINTS_MAX} total).
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
                      remainingPoints + (myAllocations[voteModalFeedId] ?? 0)
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
