import type { Network } from "@/config/networks"

export const feeds = {
    mainnet: {
        fxSAVE: [
            { label: "fxSAVE/ETH", address: "0xd4aa396CBEC88F1b2D76137eEBF4ef80e309169D" as const },
            { label: "fxSAVE/BTC", address: "0x129b639a28aBAe0693C13FaCE56873d25f6Cb0AD" as const },
            { label: "fxSAVE/EUR", address: "0x5256c0d14cFEcEDBaF7D8D44e6D88Bea5344c5a9" as const },
            { label: "fxSAVE/XAU", address: "0x2bc0484B5b0FAfFf0a14B858D85E8830621fE0CA" as const },
            { label: "fxSAVE/MCAP", address: "0x4c07ce6454D5340591f62fD7d3978B6f42Ef953e" as const },
        ],

        wstETH: [
            { label: "wstETH/ETH", address: "0x1687d4BDE380019748605231C956335a473Fd3dc" as const },
            { label: "wstETH/BTC", address: "0x9f3F78951bBf68fc3cBA976f1370a87B0Fc13cd4" as const },
            { label: "wstETH/EUR", address: "0xdb9Bc1Cdc816B727d924C9ebEba73F04F26a318a" as const },
            { label: "wstETH/XAU", address: "0xF1a7a5060f22edA40b1A94a858995fa2bcf5E75A" as const },
            { label: "wstETH/MCAP", address: "0x18903fF6E49c98615Ab741aE33b5CD202Ccc0158" as const },
        ],
        sUSDE: [],
    },

    arbitrum: {
        fxSAVE: [],
        sUSDE: [
            { label: "sUSDE/USD", address: "0xFA94648016f96a900Fa3038144d644Df9B445588" as const },
            { label: "sUSDE/AAPL", address: "0x755752E1a403A7eb89e775353e4f0520de5726fB" as const },
            { label: "sUSDE/AMZN", address: "0xAdf53c523d140fa25b7bbaD9d6e2314964BF72f0" as const },
            { label: "sUSDE/GOOGL", address: "0x17803CB7B18781EE6752C1b42A63f265f8fd38f0" as const },
            { label: "sUSDE/META", address: "0x03d69eB9bA1cE92d16E4E0cEf94F3DE34225C89f" as const },
            { label: "sUSDE/MSFT", address: "0x4749D226754f0f022724D7f9458DEC776659FFd2" as const },
            { label: "sUSDE/NVDA", address: "0x7B204dCcF87ea084302F262366f42849f33E133C" as const },
            { label: "sUSDE/SPY", address: "0xA482A371768fd9880d9fC07F0999C1d6d6DE6b05" as const },
            { label: "sUSDE/TSLA", address: "0x15Eb42775751b3d39296558Cc3BE97507FC2B9a4" as const },
        ],
        wstETH: [
            { label: "wstETH/USD", address: "0xf087d6f5b5cE424c61C03Da57ABCD2B03C34DA96" as const },
            { label: "wstETH/AAPL", address: "0x14e7810c0a800962705ab8156187Ce2B79319e4e" as const },
            { label: "wstETH/AMZN", address: "0xB4172617FF8a780d190bC542C6db77d6D2ACb542" as const },
            { label: "wstETH/GOOGL", address: "0x1f5b3fE04e97C57642030f2757A376b1cF052850" as const },
            { label: "wstETH/META", address: "0x63B8B8fE0F19D4Ed52E1d9319097321b5aaE0b05" as const },
            { label: "wstETH/MSFT", address: "0x1736B25b35051f124f70EEAb5FCac989e410f6Bc" as const },
            { label: "wstETH/NVDA", address: "0x0912645321683005b1a3D85fa4eb52268ceBB36e" as const },
            { label: "wstETH/SPY", address: "0x9720a8101A706307866bd9849F9F14E823dE1F6e" as const },
            { label: "wstETH/TSLA", address: "0x52986F8cb7F9900d7B39dbD8EB4238d67C62d42e" as const },
            { label: "wstETH/T6CH", address: "0x5595d232581C021Dc748629f3f6A4EDF0EEee5eF" as const },
        ],
    },

} as const;

export type Feeds = typeof feeds;

export type FeedEntryFor<
    N extends Network,
    T extends keyof Feeds[N]
> = Feeds[N][T];

// Generic FeedEntry type for flattened functions
export type FeedEntry = {
    readonly label: string;
    readonly address: string;
};

export type TokenSymbol<N extends Network> = keyof typeof feeds[N];
