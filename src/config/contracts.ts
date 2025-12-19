// Contract addresses for mainnet deployment (test2)
// Updated from DeployLog/mainnet-test2__*.json files
// Legacy contracts object - kept for backward compatibility but deprecated
// Use markets["eth-fxusd"] or markets["btc-fxusd"] instead
export const contracts = {
  minter: "0x565f90dc7c022e7857734352c7bf645852d8d4e7", // ETH/fxUSD minter (default)
  peggedToken: "0x8e7442020ba7debfd77e67491c51faa097d87478", // haETH (default)
  leveragedToken: "0x8248849b83ae20b21fa561f97ee5835a063c1f9c", // hsFXUSD-ETH (default)
  reservePool: "0xb196bd963474fabb8201658c9257249e55912dda", // ETH/fxUSD reservePool (default)
  stabilityPoolManager: "0x4f96d6fcf24339633275fd069798fd7fe246a5d5", // ETH/fxUSD (default)
  genesis: "0x5f4398e1d3e33f93e3d7ee710d797e2a154cb073", // ETH/fxUSD genesis (default)
  priceOracle: "0x56d1a2fc199ba05f84d2eb8eab5858d3d954030c", // ETH/fxUSD priceOracle (default)
  feeReceiver: "0x33db0dafda15ac936dbea37a2342cd45dfe2d3d2", // ETH/fxUSD minterFeeReceiver (default)
  collateralToken: "0x085780639cc2cacd35e474e71f4d000e2405d8f6", // fxUSD
  wrappedCollateralToken: "0x7743e50f534a7f9f1791dde7dcd89f7783eefc39", // fxSAVE
} as const;

// Legacy CONTRACTS constant for backward compatibility (DEPRECATED - use markets config instead)
export const CONTRACTS = {
  MINTER: "0x565f90dc7c022e7857734352c7bf645852d8d4e7",
  PEGGED_TOKEN: "0x8e7442020ba7debfd77e67491c51faa097d87478",
  LEVERAGED_TOKEN: "0x8248849b83ae20b21fa561f97ee5835a063c1f9c",
  GENESIS: "0x5f4398e1d3e33f93e3d7ee710d797e2a154cb073",
  STABILITY_POOL_MANAGER: "0x4f96d6fcf24339633275fd069798fd7fe246a5d5",
  STABILITY_POOL_COLLATERAL: "0xfb9747b30ee1b1df2434255c7768c1ebfa7e89bb",
  STABILITY_POOL_PEGGED: "0x93d0472443d775e95bf1597c8c66dfe9093bfc48",
  PRICE_ORACLE: "0x56d1a2fc199ba05f84d2eb8eab5858d3d954030c",
  TOKEN_DISTRIBUTOR: "0x33db0dafda15ac936dbea37a2342cd45dfe2d3d2",
  RESERVE_POOL: "0xb196bd963474fabb8201658c9257249e55912dda",
  CHAIN_ID: 1, // Mainnet
  RPC_URL:
    "https://eth-mainnet.g.alchemy.com/v2/uGl5kuD60tnGFHRmkevK1iYQuIQKmh1n", // Mainnet RPC
} as const;

export type MarketConfig = {
  id: string;
  name: string;
  description: string;
  addresses: {
    collateralToken: `0x${string}`;
    underlyingCollateralToken: `0x${string}`;
    feeReceiver: `0x${string}`;
    genesis: `0x${string}`;
    leveragedToken: `0x${string}`;
    minter: `0x${string}`;
    owner: `0x${string}`;
    peggedToken: `0x${string}`;
    priceOracle: `0x${string}`;
    stabilityPoolCollateral: `0x${string}`;
    stabilityPoolLeveraged: `0x${string}`;
    reservePool: `0x${string}`;
    rebalancePoolCollateral: `0x${string}`;
    rebalancePoolLeveraged: `0x${string}`;
    collateralPrice: `0x${string}`;
    genesisZap?: `0x${string}`; // Optional genesis zap contract address
    peggedTokenZap?: `0x${string}`; // Optional pegged token zap contract address
    leveragedTokenZap?: `0x${string}`; // Optional leveraged token zap contract address
  };
  genesis: {
    startDate: string;
    endDate: string;
    rewards: {
      pegged: {
        symbol: string;
        amount: string;
      };
      leveraged: {
        symbol: string;
        amount: string;
      };
    };
    collateralRatio: number;
    leverageRatio: number;
  };
};

export type Markets = {
  [key: string]: MarketConfig;
};

// ============================================================================
// Market Configurations
// When adding new markets, add them to this object following the same structure
// Make sure to:
// 1. Use a descriptive key that reflects the market pair (e.g. "steth-usd")
// 2. Include all required contract addresses
// 3. Set appropriate genesis parameters
// 4. Update any dependent configurations
// ============================================================================

export const markets: Markets = {
  // ============================================================================
  // ETH/fxUSD Market (test2 deployment) - Mainnet deployment Dec 2025
  // Backing: haETH (anchor) and hsFXUSD-ETH (sail)
  // Deployment: mainnet-test2__ETH__fxUSD.json, startBlock: 24025347
  // ============================================================================
  "eth-fxusd": {
    id: "eth-fxusd",
    name: "ETH/fxUSD",
    description: "ETH pegged to fxUSD collateral",
    addresses: {
      collateralToken: "0x085780639cc2cacd35e474e71f4d000e2405d8f6", // fxUSD
      underlyingCollateralToken: "0x7743e50f534a7f9f1791dde7dcd89f7783eefc39", // fxSAVE
      feeReceiver: "0x33db0dafda15ac936dbea37a2342cd45dfe2d3d2", // minterFeeReceiver
      genesis: "0x5f4398e1d3e33f93e3d7ee710d797e2a154cb073",
      leveragedToken: "0x8248849b83ae20b21fa561f97ee5835a063c1f9c", // hsFXUSD-ETH
      minter: "0x565f90dc7c022e7857734352c7bf645852d8d4e7",
      owner: "0x9babfc1a1952a6ed2cac1922bffe80c0506364a2",
      peggedToken: "0x8e7442020ba7debfd77e67491c51faa097d87478", // haETH
      priceOracle: "0x56d1a2fc199ba05f84d2eb8eab5858d3d954030c",
      stabilityPoolCollateral: "0xfb9747b30ee1b1df2434255c7768c1ebfa7e89bb",
      stabilityPoolLeveraged: "0x93d0472443d775e95bf1597c8c66dfe9093bfc48",
      reservePool: "0xb196bd963474fabb8201658c9257249e55912dda",
      rebalancePoolCollateral: "0x0000000000000000000000000000000000000000", // Not deployed yet
      rebalancePoolLeveraged: "0x0000000000000000000000000000000000000000", // Not deployed yet
      collateralPrice: "0x56d1a2fc199ba05f84d2eb8eab5858d3d954030c", // Using priceOracle
      genesisZap: "0xE34bf6Cbd0a1a6588328ba059392a75974bEc23B", // GenesisUSDCZap_v2 for ETH/fxUSD
      peggedTokenZap: "0x4e3BbBCd346AEb88927AA87aC345D46cbb3160Da" as `0x${string}`, // MinterUSDCZap_v2 for ETH/fxUSD
      leveragedTokenZap: "0x4e3BbBCd346AEb88927AA87aC345D46cbb3160Da" as `0x${string}`, // MinterUSDCZap_v2 for ETH/fxUSD (same contract)
    },
    genesis: {
      startDate: "2025-12-16T13:04:35Z", // From deployment timestamp
      endDate: "2026-01-16T23:59:59Z", // ~1 month genesis period
      rewards: {
        pegged: {
          symbol: "haETH",
          amount: "1000000",
        },
        leveraged: {
          symbol: "hsFXUSD-ETH",
          amount: "1000000",
        },
      },
      collateralRatio: 1.0,
      leverageRatio: 2 * 1e18,
    },
  },
  // ============================================================================
  // BTC/fxUSD Market (test2 deployment) - Mainnet deployment Dec 2025
  // Backing: haBTC (anchor) and hsFXUSD-BTC (sail)
  // Deployment: mainnet-test2__BTC__fxUSD.json, startBlock: 24025557
  // ============================================================================
  "btc-fxusd": {
    id: "btc-fxusd",
    name: "BTC/fxUSD",
    description: "BTC pegged to fxUSD collateral",
    addresses: {
      collateralToken: "0x085780639cc2cacd35e474e71f4d000e2405d8f6", // fxUSD
      underlyingCollateralToken: "0x7743e50f534a7f9f1791dde7dcd89f7783eefc39", // fxSAVE
      feeReceiver: "0x0a35acb0e0f70ecea717f8ad6e3c7d90bcc92efd", // minterFeeReceiver
      genesis: "0x288c61c3b3684ff21adf38d878c81457b19bd2fe",
      leveragedToken: "0x454f2c12ce62a4fd813e2e06fda5d46e358e7c70", // hsFXUSD-BTC
      minter: "0x7ffe3acb524fb40207709ba597d39c085d258f15",
      owner: "0x9babfc1a1952a6ed2cac1922bffe80c0506364a2",
      peggedToken: "0x1822bbe8fe313c4b53414f0b3e5ef8147d485530", // haBTC
      priceOracle: "0xf6e28853563db7f7e42f5db0e1f959743ac5b0e6",
      stabilityPoolCollateral: "0x5378fbf71627e352211779bd4cd09b0a791015ac",
      stabilityPoolLeveraged: "0x8667592f836a8e2d19ce7879b8ae557297514f48",
      reservePool: "0xf9b5fb7de24971bc7e3006691e6272c77ee2b3e7",
      rebalancePoolCollateral: "0x0000000000000000000000000000000000000000", // Not deployed yet
      rebalancePoolLeveraged: "0x0000000000000000000000000000000000000000", // Not deployed yet
      collateralPrice: "0xf6e28853563db7f7e42f5db0e1f959743ac5b0e6", // Using priceOracle
      genesisZap: "0x1166110B541200E5A07A41AC55Eaf6676a9E9A2E", // GenesisUSDCZap_v2 for BTC/fxUSD
      peggedTokenZap: "0x7548764F9dA92bF094C0E9Eb16D610b8bb1FB5c7" as `0x${string}`, // MinterUSDCZap_v2 for BTC/fxUSD
      leveragedTokenZap: "0x7548764F9dA92bF094C0E9Eb16D610b8bb1FB5c7" as `0x${string}`, // MinterUSDCZap_v2 for BTC/fxUSD (same contract)
    },
    genesis: {
      startDate: "2025-12-16T13:46:35Z", // From deployment timestamp
      endDate: "2026-01-16T23:59:59Z", // ~1 month genesis period
      rewards: {
        pegged: {
          symbol: "haBTC",
          amount: "1000000",
        },
        leveraged: {
          symbol: "hsFXUSD-BTC",
          amount: "1000000",
        },
      },
      collateralRatio: 1.0,
      leverageRatio: 2 * 1e18,
    },
  },
  // ============================================================================
  // BTC/stETH Market (test2 deployment) - Mainnet deployment Dec 2025
  // Backing: haBTC (shared anchor) and hsSTETH-BTC (sail)
  // Deployment: mainnet-test2__BTC__stETH.json, startBlock: 24025785
  // ============================================================================
  "btc-steth": {
    id: "btc-steth",
    name: "BTC/stETH",
    description: "BTC pegged to stETH collateral",
    addresses: {
      collateralToken: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0", // wstETH
      underlyingCollateralToken: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84", // stETH
      feeReceiver: "0xc780d822fc50fdf802c813422bac5aa7aca8c84c", // minterFeeReceiver
      genesis: "0x9ae0b57ceada0056dbe21edcd638476fcba3ccc0",
      leveragedToken: "0x1df67ebd59db60a13ec783472aaf22e5b2b01f25", // hsSTETH-BTC
      minter: "0x042e7cb5b993312490ea07fb89f360a65b8a9056",
      owner: "0x9babfc1a1952a6ed2cac1922bffe80c0506364a2",
      peggedToken: "0x1822bbe8fe313c4b53414f0b3e5ef8147d485530", // haBTC (shared with BTC/fxUSD)
      priceOracle: "0xe370289af2145a5b2f0f7a4a900ebfd478a156db",
      stabilityPoolCollateral: "0x86297bd2de92e91486c7e3b32cb5bc18f0a363bc",
      stabilityPoolLeveraged: "0x8d6307be018fcc42ad65e91b77c6b09c7ac9f0df",
      reservePool: "0x18aef82111b673d99b4fbbcf7a4bd1e06734cc3d",
      rebalancePoolCollateral: "0x0000000000000000000000000000000000000000", // Not deployed yet
      rebalancePoolLeveraged: "0x0000000000000000000000000000000000000000", // Not deployed yet
      collateralPrice: "0xe370289af2145a5b2f0f7a4a900ebfd478a156db", // Using priceOracle
      genesisZap: "0xF0E4Aa35B33c0847e3bAe3C2F4E49846B46F685e", // GenesisETHZap_v3 for BTC/stETH
      peggedTokenZap: "0xd599676C4Ada44201741C992bF94b4522691b610" as `0x${string}`, // MinterETHZap_v2 for BTC/stETH
      leveragedTokenZap: "0xd599676C4Ada44201741C992bF94b4522691b610" as `0x${string}`, // MinterETHZap_v2 for BTC/stETH (same contract)
    },
    genesis: {
      startDate: "2025-12-16T14:32:11Z", // From deployment timestamp
      endDate: "2026-01-16T23:59:59Z", // ~1 month genesis period
      rewards: {
        pegged: {
          symbol: "haBTC",
          amount: "1000000",
        },
        leveraged: {
          symbol: "hsSTETH-BTC",
          amount: "1000000",
        },
      },
      collateralRatio: 1.0,
      leverageRatio: 2 * 1e18,
    },
  },
};

// For backward compatibility and convenience
// Default to ETH/fxUSD market (primary new deployment)
export const marketConfig = markets["eth-fxusd"];
export const contractAddresses = markets["eth-fxusd"].addresses;

// ============================================================================
// Contract ABIs and Types
// ============================================================================

// Contract ABIs
export const STABILITY_POOL_MANAGER_ABI = [
  {
    inputs: [],
    name: "rebalanceThreshold",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const GENESIS_ABI = [
  // Custom Errors
  {
    type: "error",
    name: "GenesisAlreadyEnded",
    inputs: [],
  },
  {
    type: "error",
    name: "OnlyOwner",
    inputs: [],
  },
  {
    type: "error",
    name: "NoCollateralDeposited",
    inputs: [],
  },
  {
    type: "error",
    name: "GenesisNotActive",
    inputs: [],
  },
  {
    type: "error",
    name: "InsufficientBalance",
    inputs: [],
  },
  // Additional potential custom errors
  {
    type: "error",
    name: "Unauthorized",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidState",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidOperation",
    inputs: [],
  },
  {
    type: "error",
    name: "ContractPaused",
    inputs: [],
  },
  {
    type: "error",
    name: "ZeroAmount",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidAmount",
    inputs: [],
  },
  {
    type: "error",
    name: "TransferFailed",
    inputs: [],
  },
  {
    type: "error",
    name: "InsufficientCollateral",
    inputs: [],
  },
  {
    type: "error",
    name: "NotOwner",
    inputs: [],
  },
  {
    type: "error",
    name: "AlreadyInitialized",
    inputs: [],
  },
  // Functions
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "endGenesis",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "genesisIsEnded",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalPeggedAtGenesisEnd",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalLeveragedAtGenesisEnd",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  // Core Genesis functions
  {
    inputs: [],
    name: "collateralToken",
    outputs: [{ type: "address", name: "token" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "peggedToken",
    outputs: [{ type: "address", name: "token" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "leveragedToken",
    outputs: [{ type: "address", name: "token" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalDeposits",
    outputs: [{ type: "uint256", name: "total" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalRewards",
    outputs: [
      { type: "uint256", name: "peggedAmount" },
      { type: "uint256", name: "leveragedAmount" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "depositor", type: "address" }],
    name: "balanceOf",
    outputs: [{ type: "uint256", name: "share" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "depositor", type: "address" }],
    name: "claimable",
    outputs: [
      { type: "uint256", name: "peggedAmount" },
      { type: "uint256", name: "leveragedAmount" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "collateralIn", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    name: "withdraw",
    outputs: [{ type: "uint256", name: "collateralOut" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "receiver", type: "address" }],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// MinterETHZap_v2 ABI - For zapping ETH/stETH to mint pegged/leveraged tokens
export const MINTER_ETH_ZAP_V2_ABI = [
  {
    inputs: [{ internalType: "address", name: "minter_", type: "address" }, { internalType: "address", name: "referral_", type: "address" }],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  { inputs: [], name: "FunctionNotFound", type: "error" },
  { inputs: [], name: "InvalidAddress", type: "error" },
  { inputs: [], name: "NoStETHReceived", type: "error" },
  { inputs: [], name: "ReentrancyGuardReentrantCall", type: "error" },
  { inputs: [{ internalType: "address", name: "token", type: "address" }], name: "SafeERC20FailedOperation", type: "error" },
  { inputs: [], name: "SlippageTooHigh", type: "error" },
  { inputs: [], name: "Unauthorized", type: "error" },
  { inputs: [{ internalType: "address", name: "expected", type: "address" }, { internalType: "address", name: "provided", type: "address" }], name: "WstETHMismatch", type: "error" },
  { inputs: [], name: "ZeroAmount", type: "error" },
  { stateMutability: "payable", type: "fallback" },
  { inputs: [], name: "DEFAULT_REFERRAL", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "MINTER", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "STETH", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "WSTETH", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "owner", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "wstEthAmount", type: "uint256" }], name: "previewMintLeveraged", outputs: [{ internalType: "uint256", name: "expectedLeveragedOut", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "wstEthAmount", type: "uint256" }], name: "previewMintPegged", outputs: [{ internalType: "uint256", name: "expectedPeggedOut", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "ethIn", type: "uint256" }], name: "previewZapEth", outputs: [{ internalType: "uint256", name: "expectedWstEthOut", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "stEthIn", type: "uint256" }], name: "previewZapStEth", outputs: [{ internalType: "uint256", name: "expectedWstEthOut", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "referral", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "rescueEth", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "token", type: "address" }], name: "rescueToken", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "newReferral", type: "address" }], name: "setReferral", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "newOwner", type: "address" }], name: "transferOwnership", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "receiver", type: "address" }, { internalType: "uint256", name: "minLeveragedOut", type: "uint256" }, { internalType: "uint256", name: "minWstEthOut", type: "uint256" }], name: "zapEthToLeveraged", outputs: [{ internalType: "uint256", name: "leveragedOut", type: "uint256" }], stateMutability: "payable", type: "function" },
  { inputs: [{ internalType: "address", name: "receiver", type: "address" }, { internalType: "uint256", name: "minPeggedOut", type: "uint256" }, { internalType: "uint256", name: "minWstEthOut", type: "uint256" }], name: "zapEthToPegged", outputs: [{ internalType: "uint256", name: "peggedOut", type: "uint256" }], stateMutability: "payable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "stEthAmount", type: "uint256" }, { internalType: "address", name: "receiver", type: "address" }, { internalType: "uint256", name: "minLeveragedOut", type: "uint256" }, { internalType: "uint256", name: "minWstEthOut", type: "uint256" }], name: "zapStEthToLeveraged", outputs: [{ internalType: "uint256", name: "leveragedOut", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "stEthAmount", type: "uint256" }, { internalType: "address", name: "receiver", type: "address" }, { internalType: "uint256", name: "minPeggedOut", type: "uint256" }, { internalType: "uint256", name: "minWstEthOut", type: "uint256" }], name: "zapStEthToPegged", outputs: [{ internalType: "uint256", name: "peggedOut", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { stateMutability: "payable", type: "receive" },
] as const;

// MinterUSDCZap_v2 ABI - For zapping USDC/fxUSD to mint pegged/leveraged tokens
export const MINTER_USDC_ZAP_V2_ABI = [
  {
    inputs: [{ internalType: "address", name: "minter_", type: "address" }],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  { inputs: [{ internalType: "address", name: "expected", type: "address" }, { internalType: "address", name: "provided", type: "address" }], name: "CollateralMismatch", type: "error" },
  { inputs: [], name: "FunctionNotFound", type: "error" },
  { inputs: [], name: "InvalidAddress", type: "error" },
  { inputs: [], name: "ReentrancyGuardReentrantCall", type: "error" },
  { inputs: [{ internalType: "address", name: "token", type: "address" }], name: "SafeERC20FailedOperation", type: "error" },
  { inputs: [], name: "Unauthorized", type: "error" },
  { inputs: [], name: "ZeroAmount", type: "error" },
  { stateMutability: "payable", type: "fallback" },
  { inputs: [], name: "FXSAVE", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "FXUSD", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "FXUSD_DIAMOND", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "FXUSD_SWAP_ROUTER", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "MINTER", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "USDC", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "owner", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "fxSaveAmount", type: "uint256" }], name: "previewMintLeveraged", outputs: [{ internalType: "uint256", name: "expectedLeveragedOut", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "fxSaveAmount", type: "uint256" }], name: "previewMintPegged", outputs: [{ internalType: "uint256", name: "expectedPeggedOut", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "fxUsdAmount", type: "uint256" }], name: "previewZapFxUsd", outputs: [{ internalType: "uint256", name: "expectedFxSaveOut", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "usdcAmount", type: "uint256" }], name: "previewZapUsdc", outputs: [{ internalType: "uint256", name: "expectedFxSaveOut", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "rescueEth", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "token", type: "address" }], name: "rescueToken", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "newOwner", type: "address" }], name: "transferOwnership", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "fxUsdAmount", type: "uint256" }, { internalType: "address", name: "receiver", type: "address" }, { internalType: "uint256", name: "minLeveragedOut", type: "uint256" }], name: "zapFxUsdToLeveraged", outputs: [{ internalType: "uint256", name: "leveragedOut", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "fxUsdAmount", type: "uint256" }, { internalType: "address", name: "receiver", type: "address" }, { internalType: "uint256", name: "minPeggedOut", type: "uint256" }], name: "zapFxUsdToPegged", outputs: [{ internalType: "uint256", name: "peggedOut", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "usdcAmount", type: "uint256" }, { internalType: "address", name: "receiver", type: "address" }, { internalType: "uint256", name: "minLeveragedOut", type: "uint256" }], name: "zapUsdcToLeveraged", outputs: [{ internalType: "uint256", name: "leveragedOut", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "usdcAmount", type: "uint256" }, { internalType: "address", name: "receiver", type: "address" }, { internalType: "uint256", name: "minPeggedOut", type: "uint256" }], name: "zapUsdcToPegged", outputs: [{ internalType: "uint256", name: "peggedOut", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { stateMutability: "payable", type: "receive" },
] as const;

export const ERC20_ABI = [
  {
    inputs: [],
    name: "name",
    outputs: [{ type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const minterABI = [
  {
    inputs: [],
    name: "collateralTokenBalance",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalCollateralValue",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalPeggedValue",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalLeveragedValue",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "collateralRatio",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "collateralAmount", type: "uint256" },
      { indexed: false, name: "tokenAmount", type: "uint256" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
    name: "LeveragedTokenMinted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "tokenAmount", type: "uint256" },
      { indexed: false, name: "collateralAmount", type: "uint256" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
    name: "LeveragedTokenRedeemed",
    type: "event",
  },
] as const;

// Price history types
export interface PriceDataPoint {
  timestamp: number;
  price: number;
  type: "mint" | "redeem" | "oracle";
  tokenAmount: bigint;
  collateralAmount: bigint;
}

export interface TokenPriceHistory {
  [tokenSymbol: string]: PriceDataPoint[];
}
