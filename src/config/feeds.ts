import type { Network } from "@/config/networks"

export type FeedStatus = "active" | "possible";

export type FeedEntry = {
    readonly label: string;
    readonly address: string;
    readonly status: FeedStatus;
};

export const feeds = {
    mainnet: {
        fxSAVE: [
            { label: "fxSAVE/ETH", address: "0x56d1a2Fc199bA05F84d2eb8eaB5858d3d954030C" as const, status: "active" as const },
            { label: "fxSAVE/BTC", address: "0xF6e28853563Db7F7e42f5DB0e1f959743Ac5B0e6" as const, status: "active" as const },
            { label: "fxSAVE/EUR", address: "0x87CDed6655B33E2C8F870AB9Bc7c8400220a6B40" as const, status: "possible" as const },
            { label: "fxSAVE/XAU", address: "0xD582D94F91c66b34F5Fe7Bb05736148dF80D01ae" as const, status: "possible" as const },
            { label: "fxSAVE/MCAP", address: "0xaEf36749082E243EC27Cccf5e6685AF1598770eD" as const, status: "possible" as const },
        ],

        wstETH: [
            { label: "wstETH/BTC", address: "0xE370289aF2145A5B2F0F7a4a900eBfD478A156dB" as const, status: "active" as const },
            { label: "wstETH/EUR", address: "0x35f5C552125DEb5D6B799DD83c666Af93D98da7d" as const, status: "possible" as const },
            { label: "wstETH/XAU", address: "0x779e83258095464723eD42B2788e87a81d02E4E8" as const, status: "possible" as const },
            { label: "wstETH/MCAP", address: "0xb5dE5f746C8Bb1c633a39bD7b54c115DfC8B474f" as const, status: "possible" as const },
        ],
        sUSDE: [],
    },

    arbitrum: {
        fxSAVE: [],
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
        wstETH: [
            { label: "wstETH/USD", address: "0xcF5392B7d3c81b1BC4aa81DE02DE4A4c265Ed4a9" as const, status: "possible" as const },
            { label: "wstETH/AAPL", address: "0x3df39f74e9538414bccA0ec71abcA3B487B89a86" as const, status: "possible" as const },
            { label: "wstETH/AMZN", address: "0xA70dc2f2a40695669A1f453E3777b10B63Fa400A" as const, status: "possible" as const },
            { label: "wstETH/GOOGL", address: "0x82b8aB2c8b4781f2B3d52e7807d4aFa5704912D0" as const, status: "possible" as const },
            { label: "wstETH/META", address: "0x9f62503D61cdA530216ad46c1d239258bd201034" as const, status: "possible" as const },
            { label: "wstETH/MSFT", address: "0x78D74eA76Fbfd476A06c1678dC89c025595c8536" as const, status: "possible" as const },
            { label: "wstETH/NVDA", address: "0x8f6F9C8af44f5f15a18d0fa93B5814a623Fa6353" as const, status: "possible" as const },
            { label: "wstETH/SPY", address: "0x63d961913cd855f5f8C8cA7cDC22771abA3326FE" as const, status: "possible" as const },
            { label: "wstETH/TSLA", address: "0xD59a1c8D1fa8f3FAE1E1f835E243A7BFb6173f91" as const, status: "possible" as const },
            { label: "wstETH/MAG7", address: "0x4be4501336130E61e5872cB953e886a3a84D34Cc" as const, status: "possible" as const },
        ],
    },

} as const;

export type Feeds = typeof feeds;

export type FeedEntryFor<
    N extends Network,
    T extends keyof Feeds[N]
> = Feeds[N][T];

export type TokenSymbol<N extends Network> = keyof typeof feeds[N];
