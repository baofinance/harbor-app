import { feeds as feedsConfig } from "@/config/feeds";
import type { Feed } from "./useFeedPrices";

export function useFeedGroup<
    N extends keyof typeof feedsConfig,
    T extends keyof typeof feedsConfig[N]
>(network: N, token: T): { entries: Feed[] } {
    const entries = feedsConfig[network][token] as Feed[];
    return { entries };
}
