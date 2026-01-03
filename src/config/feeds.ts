import type { Network } from "@/config/networks"

export type FeedStatus = "active" | "available";

export type FeedEntry = {
    readonly label: string;
    readonly address: string;
    readonly status: FeedStatus;
    readonly divisor?: number; // Optional divisor for price normalization
};

export const feeds = {
    mainnet: {
        fxUSD: [
            { label: "fxUSD/ETH", address: "0x78D74eA76Fbfd476A06c1678dC89c025595c8536" as const, status: "active" as const },
            { label: "fxUSD/BTC", address: "0x9f62503D61cdA530216ad46c1d239258bd201034" as const, status: "active" as const },
            { label: "fxUSD/EUR", address: "0x8f6F9C8af44f5f15a18d0fa93B5814a623Fa6353" as const, status: "available" as const },
            { label: "fxUSD/GOLD", address: "0x4be4501336130E61e5872cB953e886a3a84D34Cc" as const, status: "available" as const },
            { label: "fxUSD/MCAP", address: "0x63d961913cd855f5f8C8cA7cDC22771abA3326FE" as const, status: "available" as const },
            { label: "fxUSD/SILVER", address: "0xD59a1c8D1fa8f3FAE1E1f835E243A7BFb6173f91" as const, status: "available" as const },
        ],

        stETH: [
            { label: "stETH/BTC", address: "0xC52B9C4eB5139E817e625290874c1CeBD44b2f6A" as const, status: "active" as const },
            { label: "stETH/EUR", address: "0x6Daab5e7999D634ae849c30658B17D0e94f0f965" as const, status: "available" as const },
            { label: "stETH/GOLD", address: "0x863C1185470b3D2d3E9D5FbB82e7837de081F46c" as const, status: "available" as const },
            { label: "stETH/MCAP", address: "0x6B5A6950f7f2b380c33aF81dbbD7DA31caaFEA63" as const, status: "available" as const },
            { label: "stETH/SILVER", address: "0xE0Ba50991B891df0f0F92d06127B43314a5e427d" as const, status: "available" as const },
        ],
        USDE: [],
    },

    arbitrum: {
        fxUSD: [],
        USDE: [
            { label: "USDE/AAPL", address: "0x91F5C981C3676af8eE40003c79E96582Fdb12621" as const, status: "available" as const },
            { label: "USDE/AMZN", address: "0xf5dAfBF1A1abe5eaDC16799e69b7B53C58D193b5" as const, status: "available" as const },
            { label: "USDE/GOOGL", address: "0xc351A54B3ED4a930d8B30958A112a1e6Dcd3eFc0" as const, status: "available" as const },
            { label: "USDE/META", address: "0x9DadfFe3Fd7c14BF1c023fd736510464ea3E8234" as const, status: "available" as const },
            { label: "USDE/MSFT", address: "0x2b63607299E7645D883168906bEfb13cb7F59659" as const, status: "available" as const },
            { label: "USDE/NVDA", address: "0xb772b800982127A3e1489DAacBE214b3C8575dd6" as const, status: "available" as const },
            { label: "USDE/SPY", address: "0x657bE7a2b91F95222D163Bee3B5F4C27bed598C5" as const, status: "available" as const },
            { label: "USDE/TSLA", address: "0x777BD12e1f61B8cac19Cbd30c0233C46B4683C00" as const, status: "available" as const },
            { label: "USDE/MAG7", address: "0xFf37Db6dea33228A5D84546250a5D0D0da942fd7" as const, status: "available" as const },
            { label: "USDE/MAG7.i26", address: "0xF36648F44763eFE7c528140a2f804b2124CC3FE1" as const, status: "available" as const },
        ],
        stETH: [
            { label: "stETH/AAPL", address: "0xA8643E35Ef119F983B09C322039e8AA49A3e3372" as const, status: "available" as const },
            { label: "stETH/AMZN", address: "0x28bBAaf05dEE8A06d4206089bCd17c1129e6Edca" as const, status: "available" as const },
            { label: "stETH/GOOGL", address: "0x52B66aD600DC6051cF056951153355d457068bD2" as const, status: "available" as const },
            { label: "stETH/META", address: "0x677f597D3013dBF76552Ec6c605eeB551d3bBb72" as const, status: "available" as const },
            { label: "stETH/MSFT", address: "0xf1867657Ef7F65b745E47B7F70D15DE50b66884D" as const, status: "available" as const },
            { label: "stETH/NVDA", address: "0x0D0fDBb10B9EAf18A1034e9942F95af0147CC310" as const, status: "available" as const },
            { label: "stETH/SPY", address: "0x969Fb67331d6Fa3E729292FAa5752BBA759f2b7F" as const, status: "available" as const },
            { label: "stETH/TSLA", address: "0xDA6097f2b8805a01FcBE8BA8Fc2c45FCb7D3e206" as const, status: "available" as const },
            { label: "stETH/MAG7", address: "0xA8A130Bbf041962B60e81009F09c41bd930D1294" as const, status: "available" as const },
            { label: "stETH/MAG7.i26", address: "0x436C33222136554192733C6771669c4B51B7fE3D" as const, status: "available" as const },
        ],
    },

    base: {
        fxUSD: [],
        USDE: [],
        stETH: [
            { label: "stETH/BOM5", address: "0x2877330d6fbA9BC0299588BcBaf16bA42d12b05a" as const, status: "available" as const },
        ],
    },

} as const;

export type Feeds = typeof feeds;

export type FeedEntryFor<
    N extends Network,
    T extends keyof Feeds[N]
> = Feeds[N][T];

export type TokenSymbol<N extends Network> = keyof typeof feeds[N];
