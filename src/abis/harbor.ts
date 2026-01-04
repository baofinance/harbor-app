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

// ABI for HarborCustomFeedNormalization_v2
export const customFeedNormalizationV2Abi = [
    {
        inputs: [],
        name: "getCustomFeedCount",
        outputs: [{ type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ name: "index", type: "uint256" }],
        name: "customFeeds",
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
        inputs: [{ name: "feedAddress", type: "address" }],
        name: "feedConstraints",
        outputs: [
            { name: "maxAnswerAge", type: "uint64" },
            { name: "maxPercentageDeviation", type: "uint256" },
            { name: "maxAbsoluteDeviation", type: "uint256" },
            { name: "maxTrendReversalDeviation", type: "uint256" },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "getPrice",
        outputs: [{ type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "latestAnswer",
        outputs: [
            { type: "uint256" },
            { type: "uint256" },
            { type: "uint256" },
            { type: "uint256" },
        ],
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