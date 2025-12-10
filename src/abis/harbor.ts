// ABI for HarborCustomFeedAndRateAggregator_v1

export const customFeedAggregatorAbi = [
    {
        inputs: [],
        name: "getCustomFeedCount",
        outputs: [{ type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ name: "index", type: "uint256" }],
        name: "getCustomFeed",
        outputs: [{ type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ name: "identifier", type: "uint8" }],
        name: "feedIdentifiers",
        outputs: [{ type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ name: "identifier", type: "uint8" }],
        name: "getConstraints",
        outputs: [{ type: "uint64" }, { type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "usdFeed",
        outputs: [{ type: "address" }],
        stateMutability: "view",
        type: "function",
    },
] as const;