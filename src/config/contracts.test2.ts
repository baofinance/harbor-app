// Contract addresses for test2 deployment (mainnet)
// Updated from DeployLog/mainnet-test2__*.json files
// Use this config for development/testing of sail and anchor pages

export type MarketConfig = {
  id: string;
  name: string;
  description: string;
  /**
   * First block where the market contracts are deployed.
   * Used for log queries (PnL, history) to avoid scanning from genesis.
   */
  startBlock: number;
  addresses: {
    // The token users actually deposit (wrapped collateral, e.g. fxSAVE, wstETH)
    wrappedCollateralToken: `0x${string}`;
    // The underlying/base collateral token (e.g. fxUSD, stETH)
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
    genesisZap?: `0x${string}`;
    peggedTokenZap?: `0x${string}`;
    leveragedTokenZap?: `0x${string}`;
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
// Test2 Market Configurations
// Deployment: mainnet-test2__*.json files
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
    startBlock: 24025347,
    addresses: {
      wrappedCollateralToken: "0x7743e50f534a7f9f1791dde7dcd89f7783eefc39", // fxSAVE (deposited)
      collateralToken: "0x085780639cc2cacd35e474e71f4d000e2405d8f6", // fxUSD
      underlyingCollateralToken: "0x085780639cc2cacd35e474e71f4d000e2405d8f6", // fxUSD (underlying)
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
      // Note: Zap contracts not deployed for test2, using placeholder
      genesisZap: "0x0000000000000000000000000000000000000000",
      peggedTokenZap: "0x0000000000000000000000000000000000000000" as `0x${string}`,
      leveragedTokenZap: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    },
    genesis: {
      startDate: "2025-12-16T13:04:35Z", // From deployment timestamp
      endDate: "2026-01-04T20:00:00Z", // January 4th at 8pm GMT
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
    startBlock: 24025557,
    addresses: {
      wrappedCollateralToken: "0x7743e50f534a7f9f1791dde7dcd89f7783eefc39", // fxSAVE (deposited)
      collateralToken: "0x085780639cc2cacd35e474e71f4d000e2405d8f6", // fxUSD
      underlyingCollateralToken: "0x085780639cc2cacd35e474e71f4d000e2405d8f6", // fxUSD (underlying)
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
      // Note: Zap contracts not deployed for test2, using placeholder
      genesisZap: "0x0000000000000000000000000000000000000000",
      peggedTokenZap: "0x0000000000000000000000000000000000000000" as `0x${string}`,
      leveragedTokenZap: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    },
    genesis: {
      startDate: "2025-12-16T13:46:35Z", // From deployment timestamp
      endDate: "2026-01-04T20:00:00Z", // January 4th at 8pm GMT
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
    startBlock: 24025785,
    addresses: {
      wrappedCollateralToken: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0", // wstETH (deposited)
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
      // Note: Zap contracts not deployed for test2, using placeholder
      genesisZap: "0x0000000000000000000000000000000000000000",
      peggedTokenZap: "0x0000000000000000000000000000000000000000" as `0x${string}`,
      leveragedTokenZap: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    },
    genesis: {
      startDate: "2025-12-16T14:32:11Z", // From deployment timestamp
      endDate: "2026-01-04T20:00:00Z", // January 4th at 8pm GMT
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
// Default to ETH/fxUSD market (primary test2 deployment)
export const marketConfig = markets["eth-fxusd"];
export const contractAddresses = markets["eth-fxusd"].addresses;

// Legacy contracts object - kept for backward compatibility
export const contracts = {
  minter: markets["eth-fxusd"].addresses.minter,
  peggedToken: markets["eth-fxusd"].addresses.peggedToken,
  leveragedToken: markets["eth-fxusd"].addresses.leveragedToken,
  reservePool: markets["eth-fxusd"].addresses.reservePool,
  stabilityPoolManager: "0x4f96d6fcf24339633275fd069798fd7fe246a5d5" as `0x${string}`, // ETH/fxUSD test2
  genesis: markets["eth-fxusd"].addresses.genesis,
  priceOracle: markets["eth-fxusd"].addresses.priceOracle,
  feeReceiver: markets["eth-fxusd"].addresses.feeReceiver,
  collateralToken: markets["eth-fxusd"].addresses.collateralToken,
  wrappedCollateralToken: markets["eth-fxusd"].addresses.wrappedCollateralToken,
} as const;

