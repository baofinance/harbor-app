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
            { label: "fxUSD/ETH", address: "0x71437C90F1E0785dd691FD02f7bE0B90cd14c097" as const, status: "active" as const },
            { label: "fxUSD/BTC", address: "0x8F76a260c5D21586aFfF18f880FFC808D0524A73" as const, status: "active" as const },
            { label: "fxUSD/EUR", address: "0x6bEb1a1189Ac68a2a26b5210e5ccfB9e8a3E408E" as const, status: "available" as const },
            { label: "fxUSD/XAU", address: "0x7DAe17B00DCd5C37D4992a17C3Cf8f5E15d2BbAf" as const, status: "available" as const },
            { label: "fxUSD/MCAP", address: "0xdF21f32c522B2A871D5a6AD303638051b51C378F" as const, status: "available" as const },
        ],

        stETH: [
            { label: "stETH/BTC", address: "0xd8789EB86Dd57f9Fe10D0D8dFa803286b389b1BC" as const, status: "active" as const },
            { label: "stETH/EUR", address: "0x76453e0eaF1a54c0e939b2E66D9825808cBd411b" as const, status: "available" as const },
            { label: "stETH/XAU", address: "0x8919713b1620BCA8bE6e774fFFA735b0051ff6cB" as const, status: "available" as const },
            { label: "stETH/MCAP", address: "0x06CD5701d9FfD9F7AaDFE28C57B481e99D2ba3ad" as const, status: "available" as const },
        ],
        USDE: [],
    },

    arbitrum: {
        fxUSD: [],
        USDE: [
            { label: "USDE/USD", address: "0x3ce5e801A89eA0AC36fC29C12562695d4E6F0fec" as const, status: "available" as const },
            { label: "USDE/AAPL", address: "0x18681BD6a8D12CE5d8ED621cBF643B5958d0eF11" as const, status: "available" as const },
            { label: "USDE/AMZN", address: "0xC19f35B343CcB3b4320B5E64a12B495420e3D90e" as const, status: "available" as const },
            { label: "USDE/GOOGL", address: "0x0DE5cc22f6b4e909a237541aED7e3a43f7d1f424" as const, status: "available" as const },
            { label: "USDE/META", address: "0x0A3DD88Ebc04D5e728DC656e4215dE9BAc0B109E" as const, status: "available" as const },
            { label: "USDE/MSFT", address: "0xE3e68CA829f24d939f5d21B2cA1aC1472C12ec7D" as const, status: "available" as const },
            { label: "USDE/NVDA", address: "0x7AE87CD2064d0a4cd1aCeC88f4e764b607d7e481" as const, status: "available" as const },
            { label: "USDE/SPY", address: "0xDaa15e17D2ce2D3bf6DBc2d07dE122608FD38e9a" as const, status: "available" as const },
            { label: "USDE/TSLA", address: "0xf0ff6D8d707D81d87caf2faa2447253f283f8873" as const, status: "available" as const },
            { label: "USDE/MAG7", address: "0x6e08c7f589f3A4859e18BC56285C150F827f4648" as const, status: "available" as const },
        ],
        stETH: [
            { label: "stETH/USD", address: "0x74c65bAb339F9079521E74bFe1bA3B62Cf4F8866" as const, status: "available" as const },
            { label: "stETH/AAPL", address: "0x22bC085Dd284F79364b6a512C063E1B469ae0A8F" as const, status: "available" as const },
            { label: "stETH/AMZN", address: "0x6e30ffE745aa7058280c44CB5451e1D52F8c93A8" as const, status: "available" as const },
            { label: "stETH/GOOGL", address: "0x335Ce7842ceE543Fc360469B3263842010AE38Ae" as const, status: "available" as const },
            { label: "stETH/META", address: "0x46cFCb10D1FABf157a872f68Aa7f2E61962795e2" as const, status: "available" as const },
            { label: "stETH/MSFT", address: "0x173B98E27dF83DC6fC930c1465F65cd10aA21657" as const, status: "available" as const },
            { label: "stETH/NVDA", address: "0xDdfA1a603c268D46e96173A6FdAC8297a53A2cc1" as const, status: "available" as const },
            { label: "stETH/SPY", address: "0x15F6eAcc86b0bb095DA5A80A1edf93d64A34B891" as const, status: "available" as const },
            { label: "stETH/TSLA", address: "0xE4f3Ce4F27f6bB520668F35101052831C80802ca" as const, status: "available" as const },
            { label: "stETH/MAG7", address: "0xFEf7Ca2b840f43f7eC15B50A7D163c95d0477d37" as const, status: "available" as const },
        ],
    },

    base: {
        fxUSD: [],
        USDE: [],
        stETH: [
            { label: "stETH/BOM5", address: "0x76D5EbFE459643326149B488841A0228bD67d0D7" as const, status: "available" as const },
        ],
    },

} as const;

export type Feeds = typeof feeds;

export type FeedEntryFor<
    N extends Network,
    T extends keyof Feeds[N]
> = Feeds[N][T];

export type TokenSymbol<N extends Network> = keyof typeof feeds[N];
