import { useMemo } from "react";
import { proxyAbi } from "@/abis/proxy";
import { blockchain } from "@/lib/blockchain";

export type Feed = {
    label: string;
    address: `0x${string}`;
};

export function useFeedPrices(feeds: Feed[]) {
    const calls = useMemo(
        () =>
            feeds.map((f) => ({
                address: f.address,
                abi: proxyAbi,
                functionName: "latestAnswer",
            })),
        [feeds]
    );

    const { data } = blockchain.readContract({
        contracts: calls,
    });

    const prices = useMemo(
        () =>
            data?.map((d) =>
                d?.result !== undefined ? (d.result as bigint) : undefined
            ) ?? [],
        [data]
    );

    const formatted = prices.map((p) =>
        p !== undefined ? (p / BigInt(1e18)).toString() : "-"
    );

    return { prices: formatted };
}

