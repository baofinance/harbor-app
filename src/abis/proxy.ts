// Minimal ABI for proxy feeds - all feeds use consistent bytes32 for feedIdentifiers
export const proxyAbi = [
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
            { name: "minPrice", type: "uint256" },
            { name: "maxPrice", type: "uint256" },
            { name: "minRate", type: "uint256" },
            { name: "maxRate", type: "uint256" },
        ],
        stateMutability: "view",
        type: "function",
    },
    // getConstraints returns (uint64,uint256)
    {
        inputs: [{ name: "id", type: "uint8" }],
        name: "getConstraints",
        outputs: [{ type: "uint64" }, { type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ name: "id", type: "uint8" }],
        name: "feedIdentifiers",
        outputs: [{ type: "bytes32" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "priceDivisor",
        outputs: [{ type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
] as const;