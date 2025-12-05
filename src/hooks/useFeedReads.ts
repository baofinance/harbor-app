import { blockchain } from "@/lib/blockchain";
import type { Feed } from "./useFeedPrices";
import { proxyAbi } from "@/abis/proxy";

export function useFeedReads(feeds: Feed[]) {
    const calls = feeds.map((f) => ({
        address: f.address,
        abi: proxyAbi,
        functionName: "getPrice",
    }));

    const { data } = blockchain.readContract({
        contracts: calls,
    });

    return { reads: data ?? [] };
}