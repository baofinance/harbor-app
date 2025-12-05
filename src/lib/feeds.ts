import type { Network } from "@/config/networks";
import { feeds, Feeds, FeedEntryFor, FeedEntry } from "@/config/feeds";

export type FeedGroup = {
    network: Network;
    token: string;
    feeds: readonly FeedEntry[];
};

export type FeedStateRow = {
    id: number;
    name: string;
    feed?: `0x${string}`;
    constraintA?: bigint;
    constraintB?: bigint;
    price?: string;
};

export type FeedState = {
    prices: string[];
    latestData: Array<[bigint, bigint, bigint, bigint] | undefined>;
    fallback: Array<{ price: string; decimals?: number; updatedAt: string }>;
    tables: Record<number, FeedStateRow[]>;
};

/**
 * Strongly typed token retrieval
 */
export function getFeedsByToken<
    N extends Network,
    T extends keyof Feeds[N]
>(network: N, token: T): FeedEntryFor<N, T> {
    return feeds[network][token];
}

export function getFeedsByNetwork<N extends Network>(
    network: N
): readonly FeedEntry[] {
    return Object.values(feeds[network]).flat();
}

export function getAllFeeds(): readonly FeedEntry[] {
    return Object.values(feeds)
        .flatMap(networkFeeds => Object.values(networkFeeds).flat());
}

export function getBaseAsset(feed: FeedEntry): string {
    return feed.label.split("/")[0];
}

export function getQuoteAsset(feed: FeedEntry): string {
    return feed.label.split("/")[1];
}

