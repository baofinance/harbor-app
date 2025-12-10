// Contract addresses for the new deployment (mainnet fork)
export const contracts = {
  minter: "0x980d1d2c22fadc8fff8fb3e3261037a75cc7cd3f",
  peggedToken: "0xad91b3c34e4e17b2d22c53c25d9873ff22395ec3",
  leveragedToken: "0xbc63dc67b78925d8d593af8708aceb14125e8d5f",
  steam: "0x5f9dD176ea5282d392225ceC5c2E7A24d5d02672",
  veSteam: "0x819F9213cE51Adac4C1c2EF7D4Cba563727C1206",
  reservePool: "0x88d4e7016df0854f9aa6877f83a004039bc3e16d",
  stabilityPoolManager: "0x60bba7266baa7808d774eadfbd408d430af6ac60",
  genesis: "0xa25b38aa76ae58ec8683ec9a9057afbe34c765e9",
  priceOracle: "0x28304c7fff39d0b83fae7c1537cb0e095041a19a",
  feeReceiver: "0x1ca477fbb6dd0300719880486264dcb87473ef4f",
  gaugeController: "0x3860B063928436F548c3A58A40c4d1d171E78838",
  steamMinter: "0x14835B093D320AA5c9806BBC64C17F0F2546D9EE",
  collateralToken: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0", // wstETH (mainnet)
  wrappedCollateralToken: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84", // stETH (mainnet)
} as const;

// Legacy CONTRACTS constant for backward compatibility
export const CONTRACTS = {
  MINTER: "0x980d1d2c22fadc8fff8fb3e3261037a75cc7cd3f",
  PEGGED_TOKEN: "0xad91b3c34e4e17b2d22c53c25d9873ff22395ec3",
  LEVERAGED_TOKEN: "0xbc63dc67b78925d8d593af8708aceb14125e8d5f",
  GENESIS: "0xa25b38aa76ae58ec8683ec9a9057afbe34c765e9",
  STABILITY_POOL_MANAGER: "0x60bba7266baa7808d774eadfbd408d430af6ac60",
  STABILITY_POOL_COLLATERAL: "0xa95a6a19d6b693d71f41887e24f6d9652dab89ce",
  STABILITY_POOL_PEGGED: "0x76a1bb7fe2697b23d43f76f66867f35aceaf04c4",
  STABILITY_POOL_COLLATERAL_STAKE: "0xe828215EB5A61a5cB62fB980288B835689af4091",
  STABILITY_POOL_STEAMED_STAKE: "0xd3873FDF150b3fFFb447d3701DFD234DF452f367",
  PRICE_ORACLE: "0x28304c7fff39d0b83fae7c1537cb0e095041a19a",
  TOKEN_DISTRIBUTOR: "0x1ca477fbb6dd0300719880486264dcb87473ef4f",
  RESERVE_POOL: "0x88d4e7016df0854f9aa6877f83a004039bc3e16d",
  CONFIG: "0x1ca477fbb6dd0300719880486264dcb87473ef4f",
  GAUGE_CONTROLLER: "0x3860B063928436F548c3A58A40c4d1d171E78838",
  STEAM_MINTER: "0x14835B093D320AA5c9806BBC64C17F0F2546D9EE",
  WSTETH: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
  STETH: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
  CHAIN_ID: 31337,
  RPC_URL: "http://127.0.0.1:8545",
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
  zheeth: {
    id: "zheeth",
    name: "zheETH",
    description: "zheETH",
    addresses: {
      collateralToken: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
      underlyingCollateralToken: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
      feeReceiver: "0x2639EDb06Fa9aF056AfF91eA0268Bf06Afc7564F",
      genesis: "0x8351c009CF0b3BdE24E0f0977d63194eB3C64ed5",
      leveragedToken: "0x4c09A6e6E74BA8fF416E908Afb0378b0DEe4cFa3",
      minter: "0xf88091C90DCe7203af62DB23DA4549F2B65cA6d9",
      owner: "0xFC69e0a5823E2AfCBEb8a35d33588360F1496a00",
      peggedToken: "0x6dEcF503f2a894929BcB4A20664a7068fAA2Fd6C",
      priceOracle: "0x11d3fA29c537914660402401ec53B48ABe487a35",
      stabilityPoolCollateral: "0x7914a8b73E11432953d9cCda060018EA1d9DCde9",
      stabilityPoolLeveraged: "0xa45583B27beAc8a0091A25588e64a0f49De6D61e",
      reservePool: "0xd2F1AEF959c06f1D247aDcc75aE876F344C09fd4",
      rebalancePoolCollateral: "0x37e2156B0d78098F06F8075a18d7E3a09483048e",
      rebalancePoolLeveraged: "0xfC47d03bd4C8a7E62A62f29000ceBa4D84142343",
      collateralPrice: "0xCfE54B5cD566aB89272946F602D76Ea879CAb4a8",
    },
    genesis: {
      startDate: "2024-03-21T00:00:00Z",
      endDate: "2024-09-01T00:00:00Z",
      rewards: {
        pegged: {
          symbol: "fxSAVE",
          amount: "1000000", // 1 million fxSAVE
        },
        leveraged: {
          symbol: "steamedUSD/ETH",
          amount: "1000000", // 1 million steamedUSD/ETH
        },
      },
      collateralRatio: 1.0,
      leverageRatio: 2 * 1e18,
    },
  },
  "zhebtc-fxsave": {
    id: "zhebtc-fxsave",
    name: "zheBTC (fxSAVE collateral)",
    description: "zheBTC (fxSAVE collateral)",
    addresses: {
      collateralToken: "0x0000000000000000000000000000000000000015",
      underlyingCollateralToken: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
      feeReceiver: "0xE3e7A4B35574Ce4b9Bc661cD93e8804Da548932a",
      genesis: "0x0000000000000000000000000000000000000013",
      leveragedToken: "0x0000000000000000000000000000000000000017",
      minter: "0x0000000000000000000000000000000000000014",
      owner: "0xFC69e0a5823E2AfCBEb8a35d33588360F1496a00",
      peggedToken: "0x0000000000000000000000000000000000000016",
      priceOracle: "0x0000000000000000000000000000000000000018",
      stabilityPoolCollateral: "0x000000000000000000000000000000000000001a",
      stabilityPoolLeveraged: "0x000000000000000000000000000000000000001b",
      reservePool: "0x0000000000000000000000000000000000000019",
      rebalancePoolCollateral: "0x37e2156B0d78098F06F8075a18d7E3a09483048e",
      rebalancePoolLeveraged: "0xfC47d03bd4C8a7E62A62f29000ceBa4D84142343",
      collateralPrice: "0xCfE54B5cD566aB89272946F602D76Ea879CAb4a8",
    },
    genesis: {
      startDate: "2024-03-21T00:00:00Z",
      endDate: "2024-09-01T00:00:00Z",
      rewards: {
        pegged: {
          symbol: "fxSAVE",
          amount: "1000000", // 1 million fxSAVE
        },
        leveraged: {
          symbol: "steamedUSD/BTC",
          amount: "1000000", // 1 million steamedUSD/BTC
        },
      },
      collateralRatio: 1.0,
      leverageRatio: 2 * 1e18,
    },
  },
  "zhebtc-wsteth": {
    id: "zhebtc-wsteth",
    name: "zheBTC (wstETH collateral)",
    description: "zheBTC (wstETH collateral)",
    addresses: {
      collateralToken: "0x0000000000000000000000000000000000000025",
      underlyingCollateralToken: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
      feeReceiver: "0xE3e7A4B35574Ce4b9Bc661cD93e8804Da548932a",
      genesis: "0x0000000000000000000000000000000000000023",
      leveragedToken: "0x0000000000000000000000000000000000000027",
      minter: "0x0000000000000000000000000000000000000024",
      owner: "0xFC69e0a5823E2AfCBEb8a35d33588360F1496a00",
      peggedToken: "0x0000000000000000000000000000000000000026",
      priceOracle: "0x0000000000000000000000000000000000000028",
      stabilityPoolCollateral: "0x000000000000000000000000000000000000002a",
      stabilityPoolLeveraged: "0x000000000000000000000000000000000000002b",
      reservePool: "0x0000000000000000000000000000000000000029",
      rebalancePoolCollateral: "0x37e2156B0d78098F06F8075a18d7E3a09483048e",
      rebalancePoolLeveraged: "0xfC47d03bd4C8a7E62A62f29000ceBa4D84142343",
      collateralPrice: "0xCfE54B5cD566aB89272946F602D76Ea879CAb4a8",
    },
    genesis: {
      startDate: "2024-03-21T00:00:00Z",
      endDate: "2024-09-01T00:00:00Z",
      rewards: {
        pegged: {
          symbol: "wstETH",
          amount: "1000000", // 1 million wstETH
        },
        leveraged: {
          symbol: "steamedETH/BTC",
          amount: "1000000", // 1 million steamedETH/BTC
        },
      },
      collateralRatio: 1.0,
      leverageRatio: 2 * 1e18,
    },
  },
};

// For backward compatibility and convenience
export const marketConfig = markets["zheeth"];
export const contractAddresses = markets["zheeth"].addresses;

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
