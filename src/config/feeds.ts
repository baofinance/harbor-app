import type { Network } from "@/config/networks"

export type FeedStatus = "active" | "possible";

export type FeedEntry = {
    readonly label: string;
    readonly address: string;
    readonly status: FeedStatus;
    readonly divisor?: number; // Optional divisor for price normalization
};

export const feeds = {
    mainnet: {
        fxUSD: [
            { label: "fxUSD/ETH", address: "0x71437C90F1E0785dd691FD02f7bE0B90cd14c097" as const, status: "active" as const },
            { label: "fxUSD/BTC", address: "0x8F76a260c5D21586aFfF18f880FFC808D0524A73" as const, status: "active" as const },
            { label: "fxUSD/EUR", address: "0x6bEb1a1189Ac68a2a26b5210e5ccfB9e8a3E408E" as const, status: "possible" as const },
            { label: "fxUSD/XAU", address: "0x7DAe17B00DCd5C37D4992a17C3Cf8f5E15d2BbAf" as const, status: "possible" as const },
            { label: "fxUSD/MCAP", address: "0xdF21f32c522B2A871D5a6AD303638051b51C378F" as const, status: "possible" as const },
        ],

        stETH: [
            { label: "stETH/BTC", address: "0xd8789EB86Dd57f9Fe10D0D8dFa803286b389b1BC" as const, status: "active" as const },
            { label: "stETH/EUR", address: "0x76453e0eaF1a54c0e939b2E66D9825808cBd411b" as const, status: "possible" as const },
            { label: "stETH/XAU", address: "0x8919713b1620BCA8bE6e774fFFA735b0051ff6cB" as const, status: "possible" as const },
            { label: "stETH/MCAP", address: "0x06CD5701d9FfD9F7AaDFE28C57B481e99D2ba3ad" as const, status: "possible" as const },
        ],
        sUSDE: [],
    },

    arbitrum: {
        fxUSD: [],
        sUSDE: [
            { label: "sUSDE/USD", address: "0xd8789EB86Dd57f9Fe10D0D8dFa803286b389b1BC" as const, status: "possible" as const },
            { label: "sUSDE/AAPL", address: "0x76453e0eaF1a54c0e939b2E66D9825808cBd411b" as const, status: "possible" as const },
            { label: "sUSDE/AMZN", address: "0x8919713b1620BCA8bE6e774fFFA735b0051ff6cB" as const, status: "possible" as const },
            { label: "sUSDE/GOOGL", address: "0x06CD5701d9FfD9F7AaDFE28C57B481e99D2ba3ad" as const, status: "possible" as const },
            { label: "sUSDE/META", address: "0xF012a1BA66a411404FEae0a2AeD68dEB18D7de32" as const, status: "possible" as const },
            { label: "sUSDE/MSFT", address: "0x8Ee0D6AD1d15b3515Ba81CCE16Bba344Deea6781" as const, status: "possible" as const },
            { label: "sUSDE/NVDA", address: "0x424D373141a845eB2822B2a8e5ED0f529Ece4F7a" as const, status: "possible" as const },
            { label: "sUSDE/SPY", address: "0x8391Ea5daa500ef69D76544172EC666B77bA711E" as const, status: "possible" as const },
            { label: "sUSDE/TSLA", address: "0x8E02c828635D9519bed050FE1CBEbC646FEb3b88" as const, status: "possible" as const },
            { label: "sUSDE/MAG7", address: "0x9243Ed7d94bb59b27A6FE31B76010Dbef796Fc5C" as const, status: "possible" as const },
        ],
        stETH: [
            { label: "stETH/USD", address: "0xcF5392B7d3c81b1BC4aa81DE02DE4A4c265Ed4a9" as const, status: "possible" as const },
            { label: "stETH/AAPL", address: "0x3df39f74e9538414bccA0ec71abcA3B487B89a86" as const, status: "possible" as const },
            { label: "stETH/AMZN", address: "0xA70dc2f2a40695669A1f453E3777b10B63Fa400A" as const, status: "possible" as const },
            { label: "stETH/GOOGL", address: "0x82b8aB2c8b4781f2B3d52e7807d4aFa5704912D0" as const, status: "possible" as const },
            { label: "stETH/META", address: "0x9f62503D61cdA530216ad46c1d239258bd201034" as const, status: "possible" as const },
            { label: "stETH/MSFT", address: "0x78D74eA76Fbfd476A06c1678dC89c025595c8536" as const, status: "possible" as const },
            { label: "stETH/NVDA", address: "0x8f6F9C8af44f5f15a18d0fa93B5814a623Fa6353" as const, status: "possible" as const },
            { label: "stETH/SPY", address: "0x63d961913cd855f5f8C8cA7cDC22771abA3326FE" as const, status: "possible" as const },
            { label: "stETH/TSLA", address: "0xD59a1c8D1fa8f3FAE1E1f835E243A7BFb6173f91" as const, status: "possible" as const },
            { label: "stETH/MAG7", address: "0x4be4501336130E61e5872cB953e886a3a84D34Cc" as const, status: "possible" as const },
        ],
    },

} as const;

export type Feeds = typeof feeds;

export type FeedEntryFor<
    N extends Network,
    T extends keyof Feeds[N]
> = Feeds[N][T];

export type TokenSymbol<N extends Network> = keyof typeof feeds[N];
