// Contract addresses for mainnet deployment (production v1)
// Updated from DeployLog/harbor_v1__*.json files
// Legacy contracts object - kept for backward compatibility but deprecated
// Use markets["eth-fxusd"] or markets["btc-fxusd"] instead
//
// NOTE: To use test2 contracts, set NEXT_PUBLIC_USE_TEST2_CONTRACTS=true
// This file will automatically switch to test2 contracts when that env var is set
// See contracts.test2.ts for test2 addresses

// Import test2 config if needed
import { markets as test2Markets, contracts as test2Contracts } from "./contracts.test2";

// Check if we should use test2 contracts
// NEXT_PUBLIC_ variables are available on both server and client in Next.js
const useTest2 = process.env.NEXT_PUBLIC_USE_TEST2_CONTRACTS === "true";

// Production contracts (default)
const productionContracts = {
  minter: "0xd6E2F8e57b4aFB51C6fA4cbC012e1cE6aEad989F", // ETH/fxUSD minter (default)
  peggedToken: "0x7A53EBc85453DD006824084c4f4bE758FcF8a5B5", // haETH (default)
  leveragedToken: "0x0Cd6BB1a0cfD95e2779EDC6D17b664B481f2EB4C", // hsFXUSD-ETH (default)
  reservePool: "0x7A5c4ca972CE2168d5215d252946dDbd1cAd2015", // ETH/fxUSD reservePool (default)
  stabilityPoolManager: "0xE39165aDE355988EFb24dA4f2403971101134CAB", // ETH/fxUSD (default)
  genesis: "0xC9df4f62474Cf6cdE6c064DB29416a9F4f27EBdC", // ETH/fxUSD genesis (default)
  priceOracle: "0x71437C90F1E0785dd691FD02f7bE0B90cd14c097", // ETH/fxUSD priceOracle (default)
  feeReceiver: "0xdC903fe5ebCE440f22578D701b95424363D20881", // ETH/fxUSD minterFeeReceiver (default)
  collateralToken: "0x085780639CC2cACd35E474e71f4d000e2405d8f6", // fxUSD
  wrappedCollateralToken: "0x7743e50F534a7f9F1791DdE7dCD89F7783Eefc39", // fxSAVE
} as const;

// Legacy CONTRACTS constant for backward compatibility (DEPRECATED - use markets config instead)
export const CONTRACTS = {
  MINTER: "0xd6E2F8e57b4aFB51C6fA4cbC012e1cE6aEad989F",
  PEGGED_TOKEN: "0x7A53EBc85453DD006824084c4f4bE758FcF8a5B5",
  LEVERAGED_TOKEN: "0x0Cd6BB1a0cfD95e2779EDC6D17b664B481f2EB4C",
  GENESIS: "0xC9df4f62474Cf6cdE6c064DB29416a9F4f27EBdC",
  STABILITY_POOL_MANAGER: "0xE39165aDE355988EFb24dA4f2403971101134CAB",
  STABILITY_POOL_COLLATERAL: "0x1F985CF7C10A81DE1940da581208D2855D263D72",
  STABILITY_POOL_PEGGED: "0x438B29EC7a1770dDbA37D792F1A6e76231Ef8E06",
  PRICE_ORACLE: "0x71437C90F1E0785dd691FD02f7bE0B90cd14c097",
  TOKEN_DISTRIBUTOR: "0xdC903fe5ebCE440f22578D701b95424363D20881",
  RESERVE_POOL: "0x7A5c4ca972CE2168d5215d252946dDbd1cAd2015",
  CHAIN_ID: 1, // Mainnet
  RPC_URL:
    "https://eth-mainnet.g.alchemy.com/v2/uGl5kuD60tnGFHRmkevK1iYQuIQKmh1n", // Mainnet RPC
} as const;

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

const productionMarkets: Markets = {
  // ============================================================================
  // ETH/fxUSD Market (production v1 deployment) - Mainnet deployment Dec 2025
  // Backing: haETH (anchor) and hsFXUSD-ETH (sail)
  // Deployment: harbor_v1__ETH__fxUSD.json, startBlock: 24049488
  // ============================================================================
  "eth-fxusd": {
    id: "eth-fxusd",
    name: "ETH/fxUSD",
    description: "ETH pegged to fxUSD collateral",
    startBlock: 24049488,
    addresses: {
      wrappedCollateralToken: "0x7743e50F534a7f9F1791DdE7dCD89F7783Eefc39", // fxSAVE (deposited)
      collateralToken: "0x085780639CC2cACd35E474e71f4d000e2405d8f6", // fxUSD
      underlyingCollateralToken: "0x085780639CC2cACd35E474e71f4d000e2405d8f6", // fxUSD (underlying)
      feeReceiver: "0xdC903fe5ebCE440f22578D701b95424363D20881", // minterFeeReceiver
      genesis: "0xC9df4f62474Cf6cdE6c064DB29416a9F4f27EBdC",
      leveragedToken: "0x0Cd6BB1a0cfD95e2779EDC6D17b664B481f2EB4C", // hsFXUSD-ETH
      minter: "0xd6E2F8e57b4aFB51C6fA4cbC012e1cE6aEad989F",
      owner: "0x9bABfC1A1952a6ed2caC1922BFfE80c0506364a2",
      peggedToken: "0x7A53EBc85453DD006824084c4f4bE758FcF8a5B5", // haETH
      priceOracle: "0x71437C90F1E0785dd691FD02f7bE0B90cd14c097",
      stabilityPoolCollateral: "0x1F985CF7C10A81DE1940da581208D2855D263D72",
      stabilityPoolLeveraged: "0x438B29EC7a1770dDbA37D792F1A6e76231Ef8E06",
      reservePool: "0x7A5c4ca972CE2168d5215d252946dDbd1cAd2015",
      rebalancePoolCollateral: "0x0000000000000000000000000000000000000000", // Not deployed yet
      rebalancePoolLeveraged: "0x0000000000000000000000000000000000000000", // Not deployed yet
      collateralPrice: "0x71437C90F1E0785dd691FD02f7bE0B90cd14c097", // Using priceOracle
      genesisZap: "0x424D373141a845eB2822B2a8e5ED0f529Ece4F7a", // GenesisUSDCZap_v2 for ETH/fxUSD
      peggedTokenZap: "0x81253f3Fc43D5e399610beE4D7a235826A7663b8" as `0x${string}`, // MinterUSDCZap_v3 for ETH/fxUSD (includes stability pool zaps)
      leveragedTokenZap: "0x81253f3Fc43D5e399610beE4D7a235826A7663b8" as `0x${string}`, // MinterUSDCZap_v3 for ETH/fxUSD (same contract, includes stability pool zaps)
    },
    genesis: {
      startDate: "2025-12-19T22:00:59Z", // From deployment timestamp
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
  // BTC/fxUSD Market (production v1 deployment) - Mainnet deployment Dec 2025
  // Backing: haBTC (anchor) and hsFXUSD-BTC (sail)
  // Deployment: harbor_v1__BTC__fxUSD.json, startBlock: 24049375
  // ============================================================================
  "btc-fxusd": {
    id: "btc-fxusd",
    name: "BTC/fxUSD",
    description: "BTC pegged to fxUSD collateral",
    startBlock: 24049375,
    addresses: {
      wrappedCollateralToken: "0x7743e50F534a7f9F1791DdE7dCD89F7783Eefc39", // fxSAVE (deposited)
      collateralToken: "0x085780639CC2cACd35E474e71f4d000e2405d8f6", // fxUSD
      underlyingCollateralToken: "0x085780639CC2cACd35E474e71f4d000e2405d8f6", // fxUSD (underlying)
      feeReceiver: "0x70DdA12032335656b63435840Cd55ff7A19dDAb7", // minterFeeReceiver
      genesis: "0x42cc9a19b358a2A918f891D8a6199d8b05F0BC1C",
      leveragedToken: "0x9567c243F647f9Ac37efb7Fc26BD9551Dce0BE1B", // hsFXUSD-BTC
      minter: "0x33e32ff4d0677862fa31582CC654a25b9b1e4888",
      owner: "0x9bABfC1A1952a6ed2caC1922BFfE80c0506364a2",
      peggedToken: "0x25bA4A826E1A1346dcA2Ab530831dbFF9C08bEA7", // haBTC
      priceOracle: "0x8F76a260c5D21586aFfF18f880FFC808D0524A73",
      stabilityPoolCollateral: "0x86561cdB34ebe8B9abAbb0DD7bEA299fA8532a49",
      stabilityPoolLeveraged: "0x9e56F1E1E80EBf165A1dAa99F9787B41cD5bFE40",
      reservePool: "0xfDE46D4425138aA01319bB8587Cb935a0393DfE3",
      rebalancePoolCollateral: "0x0000000000000000000000000000000000000000", // Not deployed yet
      rebalancePoolLeveraged: "0x0000000000000000000000000000000000000000", // Not deployed yet
      collateralPrice: "0x8F76a260c5D21586aFfF18f880FFC808D0524A73", // Using priceOracle
      genesisZap: "0xF012a1BA66a411404FEae0a2AeD68dEB18D7de32", // GenesisUSDCZap_v2 for BTC/fxUSD
      peggedTokenZap: "0x7e4f98217A085F1a06332EDff805513b6Ea79357" as `0x${string}`, // MinterUSDCZap_v3 for BTC/fxUSD
      leveragedTokenZap: "0x7e4f98217A085F1a06332EDff805513b6Ea79357" as `0x${string}`, // MinterUSDCZap_v3 for BTC/fxUSD (same contract)
    },
    genesis: {
      startDate: "2025-12-19T21:38:23Z", // From deployment timestamp
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
  // BTC/stETH Market (production v1 deployment) - Mainnet deployment Dec 2025
  // Backing: haBTC (shared anchor) and hsSTETH-BTC (sail)
  // Deployment: harbor_v1__BTC__stETH.json, startBlock: 24049273
  // ============================================================================
  "btc-steth": {
    id: "btc-steth",
    name: "BTC/stETH",
    description: "BTC pegged to stETH collateral",
    startBlock: 24049273,
    addresses: {
      wrappedCollateralToken: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0", // wstETH (deposited)
      collateralToken: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0", // wstETH
      underlyingCollateralToken: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84", // stETH
      feeReceiver: "0xc3a97138a5aDCC7d28A1375E28EC3440aeaeDF3e", // minterFeeReceiver
      genesis: "0xc64Fc46eED431e92C1b5e24DC296b5985CE6Cc00",
      leveragedToken: "0x817ADaE288eD46B8618AAEffE75ACD26A0a1b0FD", // hsSTETH-BTC
      minter: "0xF42516EB885E737780EB864dd07cEc8628000919",
      owner: "0x9bABfC1A1952a6ed2caC1922BFfE80c0506364a2",
      peggedToken: "0x25bA4A826E1A1346dcA2Ab530831dbFF9C08bEA7", // haBTC (shared with BTC/fxUSD)
      priceOracle: "0xE370289aF2145A5B2F0F7a4a900eBfD478A156dB",
      stabilityPoolCollateral: "0x667Ceb303193996697A5938cD6e17255EeAcef51",
      stabilityPoolLeveraged: "0xCB4F3e21DE158bf858Aa03E63e4cEc7342177013",
      reservePool: "0x515ECa19Ac381b0f37D616F99628136906fC5355",
      rebalancePoolCollateral: "0x0000000000000000000000000000000000000000", // Not deployed yet
      rebalancePoolLeveraged: "0x0000000000000000000000000000000000000000", // Not deployed yet
      collateralPrice: "0xE370289aF2145A5B2F0F7a4a900eBfD478A156dB", // Using priceOracle
      genesisZap: "0x8Ee0D6AD1d15b3515Ba81CCE16Bba344Deea6781", // GenesisETHZap_v3 for BTC/stETH
      peggedTokenZap: "0x9Af8FBF66Bf3645f505D58614D7a13D411b99907" as `0x${string}`, // MinterETHZap_v3 for BTC/stETH (includes stability pool zaps)
      leveragedTokenZap: "0x9Af8FBF66Bf3645f505D58614D7a13D411b99907" as `0x${string}`, // MinterETHZap_v3 for BTC/stETH (same contract, includes stability pool zaps)
    },
    genesis: {
      startDate: "2025-12-19T21:17:47Z", // From deployment timestamp
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
  // ============================================================================
  // Coming Soon Markets
  // ============================================================================
  "fxusd-gold": {
    id: "fxusd-gold",
    name: "fxUSD/GOLD",
    description: "fxUSD pegged to GOLD collateral",
    startBlock: 0, // Placeholder - will be updated when deployed
    addresses: {
      wrappedCollateralToken: "0x0000000000000000000000000000000000000000", // placeholder
      collateralToken: "0x0000000000000000000000000000000000000000", // GOLD (placeholder)
      underlyingCollateralToken: "0x0000000000000000000000000000000000000000", // GOLD (placeholder)
      feeReceiver: "0x0000000000000000000000000000000000000000", // placeholder
      genesis: "0x0000000000000000000000000000000000000000", // placeholder
      leveragedToken: "0x0000000000000000000000000000000000000000", // placeholder
      minter: "0x880600E0c803d836E305B7c242FC095Eed234A8f" as `0x${string}`, // GOLD/fxUSD minter
      owner: "0x0000000000000000000000000000000000000000", // placeholder
      peggedToken: "0x0000000000000000000000000000000000000000", // placeholder
      priceOracle: "0x0000000000000000000000000000000000000000", // placeholder
      stabilityPoolCollateral: "0x0000000000000000000000000000000000000000", // placeholder
      stabilityPoolLeveraged: "0x0000000000000000000000000000000000000000", // placeholder
      reservePool: "0x0000000000000000000000000000000000000000", // placeholder
      rebalancePoolCollateral: "0x0000000000000000000000000000000000000000", // placeholder
      rebalancePoolLeveraged: "0x0000000000000000000000000000000000000000", // placeholder
      collateralPrice: "0x0000000000000000000000000000000000000000", // placeholder
      genesisZap: "0x1048a287DDefF38E9A5c1e564A83f6978a2DC1eF", // GenesisUSDCZap_v4 for GOLD
      peggedTokenZap: "0xf0ff6D8d707D81d87caf2faa2447253f283f8873" as `0x${string}`, // MinterUSDCZap_v3 for GOLD/fxUSD
      leveragedTokenZap: "0xf0ff6D8d707D81d87caf2faa2447253f283f8873" as `0x${string}`, // MinterUSDCZap_v3 for GOLD/fxUSD (same contract)
    },
    genesis: {
      startDate: "2026-02-01T00:00:00Z", // Placeholder - Coming Soon
      endDate: "2026-02-08T20:00:00Z", // Placeholder - Coming Soon
      rewards: {
        pegged: {
          symbol: "haGOLD",
          amount: "1000000",
        },
        leveraged: {
          symbol: "hsFXUSD-GOLD",
          amount: "1000000",
        },
      },
      collateralRatio: 1.0,
      leverageRatio: 2 * 1e18,
    },
  },
  "steth-gold": {
    id: "steth-gold",
    name: "stETH/GOLD",
    description: "stETH pegged to GOLD collateral",
    startBlock: 0, // Placeholder - will be updated when deployed
    addresses: {
      wrappedCollateralToken: "0x0000000000000000000000000000000000000000", // placeholder
      collateralToken: "0x0000000000000000000000000000000000000000", // wstETH (placeholder)
      underlyingCollateralToken: "0x0000000000000000000000000000000000000000", // stETH (placeholder)
      feeReceiver: "0x0000000000000000000000000000000000000000", // placeholder
      genesis: "0x0000000000000000000000000000000000000000", // placeholder
      leveragedToken: "0x0000000000000000000000000000000000000000", // placeholder
      minter: "0x0000000000000000000000000000000000000000", // placeholder
      owner: "0x0000000000000000000000000000000000000000", // placeholder
      peggedToken: "0x0000000000000000000000000000000000000000", // placeholder
      priceOracle: "0x0000000000000000000000000000000000000000", // placeholder
      stabilityPoolCollateral: "0x0000000000000000000000000000000000000000", // placeholder
      stabilityPoolLeveraged: "0x0000000000000000000000000000000000000000", // placeholder
      reservePool: "0x0000000000000000000000000000000000000000", // placeholder
      rebalancePoolCollateral: "0x0000000000000000000000000000000000000000", // placeholder
      rebalancePoolLeveraged: "0x0000000000000000000000000000000000000000", // placeholder
      collateralPrice: "0x0000000000000000000000000000000000000000", // placeholder
      genesisZap: "0xCDf5BdcD7A035C2F20782e607D4f9F8f26280f93", // GenesisETHZap_v4 for GOLD
      peggedTokenZap: "0x3ce5e801A89eA0AC36fC29C12562695d4E6F0fec" as `0x${string}`, // MinterETHZap_v3 for GOLD/stETH
      leveragedTokenZap: "0x3ce5e801A89eA0AC36fC29C12562695d4E6F0fec" as `0x${string}`, // MinterETHZap_v3 for GOLD/stETH (same contract)
    },
    genesis: {
      startDate: "2026-02-01T00:00:00Z", // Placeholder - Coming Soon
      endDate: "2026-02-08T20:00:00Z", // Placeholder - Coming Soon
      rewards: {
        pegged: {
          symbol: "haGOLD",
          amount: "1000000",
        },
        leveraged: {
          symbol: "hsSTETH-GOLD",
          amount: "1000000",
        },
      },
      collateralRatio: 1.0,
      leverageRatio: 2 * 1e18,
    },
  },
  "steth-eur": {
    id: "steth-eur",
    name: "stETH/EUR",
    description: "stETH pegged to EUR collateral",
    startBlock: 0, // Placeholder - will be updated when deployed
    addresses: {
      wrappedCollateralToken: "0x0000000000000000000000000000000000000000", // placeholder
      collateralToken: "0x0000000000000000000000000000000000000000", // wstETH (placeholder)
      underlyingCollateralToken: "0x0000000000000000000000000000000000000000", // stETH (placeholder)
      feeReceiver: "0x0000000000000000000000000000000000000000", // placeholder
      genesis: "0x0000000000000000000000000000000000000000", // placeholder
      leveragedToken: "0x0000000000000000000000000000000000000000", // placeholder
      minter: "0x0000000000000000000000000000000000000000", // placeholder
      owner: "0x0000000000000000000000000000000000000000", // placeholder
      peggedToken: "0x0000000000000000000000000000000000000000", // placeholder
      priceOracle: "0x0000000000000000000000000000000000000000", // placeholder
      stabilityPoolCollateral: "0x0000000000000000000000000000000000000000", // placeholder
      stabilityPoolLeveraged: "0x0000000000000000000000000000000000000000", // placeholder
      reservePool: "0x0000000000000000000000000000000000000000", // placeholder
      rebalancePoolCollateral: "0x0000000000000000000000000000000000000000", // placeholder
      rebalancePoolLeveraged: "0x0000000000000000000000000000000000000000", // placeholder
      collateralPrice: "0x0000000000000000000000000000000000000000", // placeholder
      genesisZap: "0x173B98E27dF83DC6fC930c1465F65cd10aA21657", // GenesisETHZap_v4 for EUR
      peggedTokenZap: "0x31bd3B75672bAfbBa1b2F27789DCBF6ee7429D74" as `0x${string}`, // MinterETHZap_v3 for EUR/stETH
      leveragedTokenZap: "0x31bd3B75672bAfbBa1b2F27789DCBF6ee7429D74" as `0x${string}`, // MinterETHZap_v3 for EUR/stETH (same contract)
    },
    genesis: {
      startDate: "2026-02-01T00:00:00Z", // Placeholder - Coming Soon
      endDate: "2026-02-08T20:00:00Z", // Placeholder - Coming Soon
      rewards: {
        pegged: {
          symbol: "haEUR",
          amount: "1000000",
        },
        leveraged: {
          symbol: "hsSTETH-EUR",
          amount: "1000000",
        },
      },
      collateralRatio: 1.0,
      leverageRatio: 2 * 1e18,
    },
  },
  "fxusd-eur": {
    id: "fxusd-eur",
    name: "fxUSD/EUR",
    description: "fxUSD pegged to EUR collateral",
    startBlock: 0, // Placeholder - will be updated when deployed
    addresses: {
      wrappedCollateralToken: "0x0000000000000000000000000000000000000000", // placeholder
      collateralToken: "0x0000000000000000000000000000000000000000", // fxUSD (placeholder)
      underlyingCollateralToken: "0x0000000000000000000000000000000000000000", // fxSAVE (placeholder)
      feeReceiver: "0x0000000000000000000000000000000000000000", // placeholder
      genesis: "0x0000000000000000000000000000000000000000", // placeholder
      leveragedToken: "0x0000000000000000000000000000000000000000", // placeholder
      minter: "0xDEFB2C04062350678965CBF38A216Cc50723B246" as `0x${string}`, // EUR/fxUSD minter
      owner: "0x0000000000000000000000000000000000000000", // placeholder
      peggedToken: "0x0000000000000000000000000000000000000000", // placeholder
      priceOracle: "0x0000000000000000000000000000000000000000", // placeholder
      stabilityPoolCollateral: "0x0000000000000000000000000000000000000000", // placeholder
      stabilityPoolLeveraged: "0x0000000000000000000000000000000000000000", // placeholder
      reservePool: "0x0000000000000000000000000000000000000000", // placeholder
      rebalancePoolCollateral: "0x0000000000000000000000000000000000000000", // placeholder
      rebalancePoolLeveraged: "0x0000000000000000000000000000000000000000", // placeholder
      collateralPrice: "0x0000000000000000000000000000000000000000", // placeholder
      genesisZap: "0xE4f3Ce4F27f6bB520668F35101052831C80802ca", // GenesisUSDCZap_v4 for EUR
      peggedTokenZap: "0x64118b5B2794088CA93D41C9f2264212dc92512f" as `0x${string}`, // MinterUSDCZap_v3 for EUR/fxUSD
      leveragedTokenZap: "0x64118b5B2794088CA93D41C9f2264212dc92512f" as `0x${string}`, // MinterUSDCZap_v3 for EUR/fxUSD (same contract)
    },
    genesis: {
      startDate: "2026-02-01T00:00:00Z", // Placeholder - Coming Soon
      endDate: "2026-02-08T20:00:00Z", // Placeholder - Coming Soon
      rewards: {
        pegged: {
          symbol: "haEUR",
          amount: "1000000",
        },
        leveraged: {
          symbol: "hsFXUSD-EUR",
          amount: "1000000",
        },
      },
      collateralRatio: 1.0,
      leverageRatio: 2 * 1e18,
    },
  },
  "steth-mcap": {
    id: "steth-mcap",
    name: "stETH/MCAP",
    description: "stETH pegged to MCAP collateral",
    startBlock: 0, // Placeholder - will be updated when deployed
    addresses: {
      wrappedCollateralToken: "0x0000000000000000000000000000000000000000", // placeholder
      collateralToken: "0x0000000000000000000000000000000000000000", // wstETH (placeholder)
      underlyingCollateralToken: "0x0000000000000000000000000000000000000000", // stETH (placeholder)
      feeReceiver: "0x0000000000000000000000000000000000000000", // placeholder
      genesis: "0x0000000000000000000000000000000000000000", // placeholder
      leveragedToken: "0x0000000000000000000000000000000000000000", // placeholder
      minter: "0x0000000000000000000000000000000000000000", // placeholder
      owner: "0x0000000000000000000000000000000000000000", // placeholder
      peggedToken: "0x0000000000000000000000000000000000000000", // placeholder
      priceOracle: "0x0000000000000000000000000000000000000000", // placeholder
      stabilityPoolCollateral: "0x0000000000000000000000000000000000000000", // placeholder
      stabilityPoolLeveraged: "0x0000000000000000000000000000000000000000", // placeholder
      reservePool: "0x0000000000000000000000000000000000000000", // placeholder
      rebalancePoolCollateral: "0x0000000000000000000000000000000000000000", // placeholder
      rebalancePoolLeveraged: "0x0000000000000000000000000000000000000000", // placeholder
      collateralPrice: "0x0000000000000000000000000000000000000000", // placeholder
    },
    genesis: {
      startDate: "2026-02-01T00:00:00Z", // Placeholder - Coming Soon
      endDate: "2026-02-08T20:00:00Z", // Placeholder - Coming Soon
      rewards: {
        pegged: {
          symbol: "haMCAP",
          amount: "1000000",
        },
        leveraged: {
          symbol: "hsSTETH-MCAP",
          amount: "1000000",
        },
      },
      collateralRatio: 1.0,
      leverageRatio: 2 * 1e18,
    },
  },
  "fxusd-mcap": {
    id: "fxusd-mcap",
    name: "fxUSD/MCAP",
    description: "fxUSD pegged to MCAP collateral",
    startBlock: 0, // Placeholder - will be updated when deployed
    addresses: {
      wrappedCollateralToken: "0x0000000000000000000000000000000000000000", // placeholder
      collateralToken: "0x0000000000000000000000000000000000000000", // fxUSD (placeholder)
      underlyingCollateralToken: "0x0000000000000000000000000000000000000000", // fxSAVE (placeholder)
      feeReceiver: "0x0000000000000000000000000000000000000000", // placeholder
      genesis: "0x0000000000000000000000000000000000000000", // placeholder
      leveragedToken: "0x0000000000000000000000000000000000000000", // placeholder
      minter: "0x0000000000000000000000000000000000000000", // placeholder
      owner: "0x0000000000000000000000000000000000000000", // placeholder
      peggedToken: "0x0000000000000000000000000000000000000000", // placeholder
      priceOracle: "0x0000000000000000000000000000000000000000", // placeholder
      stabilityPoolCollateral: "0x0000000000000000000000000000000000000000", // placeholder
      stabilityPoolLeveraged: "0x0000000000000000000000000000000000000000", // placeholder
      reservePool: "0x0000000000000000000000000000000000000000", // placeholder
      rebalancePoolCollateral: "0x0000000000000000000000000000000000000000", // placeholder
      rebalancePoolLeveraged: "0x0000000000000000000000000000000000000000", // placeholder
      collateralPrice: "0x0000000000000000000000000000000000000000", // placeholder
    },
    genesis: {
      startDate: "2026-02-01T00:00:00Z", // Placeholder - Coming Soon
      endDate: "2026-02-08T20:00:00Z", // Placeholder - Coming Soon
      rewards: {
        pegged: {
          symbol: "haMCAP",
          amount: "1000000",
        },
        leveraged: {
          symbol: "hsFXUSD-MCAP",
          amount: "1000000",
        },
      },
      collateralRatio: 1.0,
      leverageRatio: 2 * 1e18,
    },
  },
};

// Export markets and contracts based on environment variable
export const markets: Markets = useTest2 ? test2Markets : productionMarkets;
export const contracts = useTest2 ? test2Contracts : productionContracts;

// For backward compatibility and convenience
// Default to ETH/fxUSD market (primary new deployment)
export const marketConfig = markets["eth-fxusd"];
export const contractAddresses = markets["eth-fxusd"].addresses;

// Log which config is being used (only in development)
if (process.env.NODE_ENV === "development") {
  console.log(`[Contracts] Using ${useTest2 ? "TEST2" : "PRODUCTION"} contracts`);
  if (useTest2) {
    console.log(`[Contracts] Test2 markets: ${Object.keys(test2Markets).join(", ")}`);
  }
}

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
    inputs: [
      { internalType: "address", name: "minter_", type: "address" },
      { internalType: "address", name: "referral_", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  { inputs: [{ internalType: "address", name: "target", type: "address" }], name: "AddressEmptyCode", type: "error" },
  { inputs: [], name: "AlreadyInitialized", type: "error" },
  { inputs: [], name: "CannotCompleteTransfer", type: "error" },
  { inputs: [{ internalType: "address", name: "token", type: "address" }], name: "CannotRescueProtectedToken", type: "error" },
  { inputs: [{ internalType: "address", name: "expected", type: "address" }, { internalType: "address", name: "actual", type: "address" }], name: "CollateralMismatch", type: "error" },
  { inputs: [], name: "DepositFailed", type: "error" },
  { inputs: [{ internalType: "address", name: "implementation", type: "address" }], name: "ERC1967InvalidImplementation", type: "error" },
  { inputs: [], name: "ERC1967NonPayable", type: "error" },
  { inputs: [], name: "FailedCall", type: "error" },
  { inputs: [], name: "FunctionNotFound", type: "error" },
  { inputs: [{ internalType: "uint256", name: "have", type: "uint256" }, { internalType: "uint256", name: "wanted", type: "uint256" }], name: "InsufficientBalance", type: "error" },
  { inputs: [], name: "InvalidInitialization", type: "error" },
  { inputs: [], name: "MintFailed", type: "error" },
  { inputs: [], name: "NoStETHReceived", type: "error" },
  { inputs: [], name: "NotInitializing", type: "error" },
  { inputs: [], name: "ReentrancyGuardReentrantCall", type: "error" },
  { inputs: [{ internalType: "address", name: "token", type: "address" }], name: "SafeERC20FailedOperation", type: "error" },
  { inputs: [], name: "StabilityPoolNotAllowed", type: "error" },
  { inputs: [], name: "UUPSUnauthorizedCallContext", type: "error" },
  { inputs: [{ internalType: "bytes32", name: "slot", type: "bytes32" }], name: "UUPSUnsupportedProxiableUUID", type: "error" },
  { inputs: [], name: "Unauthorized", type: "error" },
  { inputs: [{ internalType: "address", name: "expected", type: "address" }, { internalType: "address", name: "provided", type: "address" }], name: "WstETHMismatch", type: "error" },
  { inputs: [], name: "ZeroAddress", type: "error" },
  { inputs: [], name: "ZeroAmount", type: "error" },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: true, internalType: "address", name: "minter", type: "address" },
      { indexed: true, internalType: "address", name: "receiver", type: "address" },
      { indexed: false, internalType: "uint256", name: "ethAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "wstEthAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "leveragedOut", type: "uint256" },
    ],
    name: "ETHZappedToLeveraged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: true, internalType: "address", name: "minter", type: "address" },
      { indexed: true, internalType: "address", name: "receiver", type: "address" },
      { indexed: false, internalType: "uint256", name: "ethAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "wstEthAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "peggedOut", type: "uint256" },
    ],
    name: "ETHZappedToPegged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: true, internalType: "address", name: "minter", type: "address" },
      { indexed: true, internalType: "address", name: "receiver", type: "address" },
      { indexed: false, internalType: "uint256", name: "ethAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "wstEthAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "peggedOut", type: "uint256" },
      { indexed: false, internalType: "address", name: "stabilityPool", type: "address" },
      { indexed: false, internalType: "uint256", name: "deposited", type: "uint256" },
    ],
    name: "ETHZappedToStabilityPool",
    type: "event",
  },
  { anonymous: false, inputs: [{ indexed: false, internalType: "uint64", name: "version", type: "uint64" }], name: "Initialized", type: "event" },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "previousOwner", type: "address" },
      { indexed: true, internalType: "address", name: "newOwner", type: "address" },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "oldReferral", type: "address" },
      { indexed: true, internalType: "address", name: "newReferral", type: "address" },
    ],
    name: "ReferralUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: true, internalType: "address", name: "minter", type: "address" },
      { indexed: true, internalType: "address", name: "receiver", type: "address" },
      { indexed: false, internalType: "uint256", name: "stEthAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "wstEthAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "leveragedOut", type: "uint256" },
    ],
    name: "STETHZappedToLeveraged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: true, internalType: "address", name: "minter", type: "address" },
      { indexed: true, internalType: "address", name: "receiver", type: "address" },
      { indexed: false, internalType: "uint256", name: "stEthAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "wstEthAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "peggedOut", type: "uint256" },
    ],
    name: "STETHZappedToPegged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: true, internalType: "address", name: "minter", type: "address" },
      { indexed: true, internalType: "address", name: "receiver", type: "address" },
      { indexed: false, internalType: "uint256", name: "stEthAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "wstEthAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "peggedOut", type: "uint256" },
      { indexed: false, internalType: "address", name: "stabilityPool", type: "address" },
      { indexed: false, internalType: "uint256", name: "deposited", type: "uint256" },
    ],
    name: "STETHZappedToStabilityPool",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "stabilityPool", type: "address" },
      { indexed: false, internalType: "bool", name: "allowed", type: "bool" },
    ],
    name: "StabilityPoolAllowlistUpdated",
    type: "event",
  },
  { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "implementation", type: "address" }], name: "Upgraded", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "implementation", type: "address" }], name: "Upgraded", type: "event" },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: true, internalType: "address", name: "minter", type: "address" },
      { indexed: true, internalType: "address", name: "receiver", type: "address" },
      { indexed: false, internalType: "uint256", name: "wstEthAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "peggedOut", type: "uint256" },
      { indexed: false, internalType: "address", name: "stabilityPool", type: "address" },
      { indexed: false, internalType: "uint256", name: "deposited", type: "uint256" },
    ],
    name: "WSTETHZappedToStabilityPool",
    type: "event",
  },
  { stateMutability: "payable", type: "fallback" },
  { inputs: [], name: "DEFAULT_REFERRAL", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "MINTER", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "STETH", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "UPGRADE_INTERFACE_VERSION", outputs: [{ internalType: "string", name: "", type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "WSTETH", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "", type: "address" }], name: "allowedStabilityPools", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "view", type: "function" },
  {
    inputs: [
      { internalType: "address", name: "deployerOwner", type: "address" },
      { internalType: "address", name: "pendingOwner", type: "address" },
      { internalType: "address", name: "referral_", type: "address" },
    ],
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  { inputs: [], name: "owner", outputs: [{ internalType: "address", name: "owner_", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "ethAmount", type: "uint256" }], name: "previewLeveragedFromEth", outputs: [{ internalType: "uint256", name: "leveragedOut", type: "uint256" }, { internalType: "uint256", name: "wstEthAmount", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "stEthAmount", type: "uint256" }], name: "previewLeveragedFromStEth", outputs: [{ internalType: "uint256", name: "leveragedOut", type: "uint256" }, { internalType: "uint256", name: "wstEthAmount", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "ethAmount", type: "uint256" }], name: "previewPeggedFromEth", outputs: [{ internalType: "uint256", name: "peggedOut", type: "uint256" }, { internalType: "uint256", name: "wstEthAmount", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "stEthAmount", type: "uint256" }], name: "previewPeggedFromStEth", outputs: [{ internalType: "uint256", name: "peggedOut", type: "uint256" }, { internalType: "uint256", name: "wstEthAmount", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "ethAmount", type: "uint256" }], name: "previewStabilityPoolFromEth", outputs: [{ internalType: "uint256", name: "peggedOut", type: "uint256" }, { internalType: "uint256", name: "wstEthAmount", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "stEthAmount", type: "uint256" }], name: "previewStabilityPoolFromStEth", outputs: [{ internalType: "uint256", name: "peggedOut", type: "uint256" }, { internalType: "uint256", name: "wstEthAmount", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "wstEthAmount", type: "uint256" }], name: "previewStabilityPoolFromWstEth", outputs: [{ internalType: "uint256", name: "peggedOut", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "ethAmount", type: "uint256" }], name: "previewWstEthFromEth", outputs: [{ internalType: "uint256", name: "wstEthAmount", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "stEthAmount", type: "uint256" }], name: "previewWstEthFromStEth", outputs: [{ internalType: "uint256", name: "wstEthAmount", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "proxiableUUID", outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "referral", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "rescueEth", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "token", type: "address" }], name: "rescueToken", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "newReferral", type: "address" }], name: "setReferral", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "stabilityPool", type: "address" }, { internalType: "bool", name: "allowed", type: "bool" }], name: "setStabilityPoolAllowed", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "bytes4", name: "interfaceId", type: "bytes4" }], name: "supportsInterface", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "confirmOwner", type: "address" }], name: "transferOwnership", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "newImplementation", type: "address" }, { internalType: "bytes", name: "data", type: "bytes" }], name: "upgradeToAndCall", outputs: [], stateMutability: "payable", type: "function" },
  { inputs: [{ internalType: "address", name: "receiver", type: "address" }, { internalType: "uint256", name: "minLeveragedOut", type: "uint256" }], name: "zapEthToLeveraged", outputs: [{ internalType: "uint256", name: "leveragedOut", type: "uint256" }], stateMutability: "payable", type: "function" },
  { inputs: [{ internalType: "address", name: "receiver", type: "address" }, { internalType: "uint256", name: "minPeggedOut", type: "uint256" }], name: "zapEthToPegged", outputs: [{ internalType: "uint256", name: "peggedOut", type: "uint256" }], stateMutability: "payable", type: "function" },
  {
    inputs: [
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "uint256", name: "minPeggedOut", type: "uint256" },
      { internalType: "address", name: "stabilityPool", type: "address" },
      { internalType: "uint256", name: "minStabilityPoolOut", type: "uint256" },
    ],
    name: "zapEthToStabilityPool",
    outputs: [
      { internalType: "uint256", name: "peggedOut", type: "uint256" },
      { internalType: "uint256", name: "deposited", type: "uint256" },
    ],
    stateMutability: "payable",
    type: "function",
  },
  { inputs: [], name: "zapName", outputs: [{ internalType: "string", name: "", type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "stEthAmount", type: "uint256" }, { internalType: "address", name: "receiver", type: "address" }, { internalType: "uint256", name: "minLeveragedOut", type: "uint256" }], name: "zapStEthToLeveraged", outputs: [{ internalType: "uint256", name: "leveragedOut", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  {
    inputs: [
      { internalType: "uint256", name: "stEthAmount", type: "uint256" },
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "uint256", name: "minLeveragedOut", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "zapStEthToLeveragedWithPermit",
    outputs: [{ internalType: "uint256", name: "leveragedOut", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  { inputs: [{ internalType: "uint256", name: "stEthAmount", type: "uint256" }, { internalType: "address", name: "receiver", type: "address" }, { internalType: "uint256", name: "minPeggedOut", type: "uint256" }], name: "zapStEthToPegged", outputs: [{ internalType: "uint256", name: "peggedOut", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  {
    inputs: [
      { internalType: "uint256", name: "stEthAmount", type: "uint256" },
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "uint256", name: "minPeggedOut", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "zapStEthToPeggedWithPermit",
    outputs: [{ internalType: "uint256", name: "peggedOut", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "stEthAmount", type: "uint256" },
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "uint256", name: "minPeggedOut", type: "uint256" },
      { internalType: "address", name: "stabilityPool", type: "address" },
      { internalType: "uint256", name: "minStabilityPoolOut", type: "uint256" },
    ],
    name: "zapStEthToStabilityPool",
    outputs: [
      { internalType: "uint256", name: "peggedOut", type: "uint256" },
      { internalType: "uint256", name: "deposited", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "stEthAmount", type: "uint256" },
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "uint256", name: "minPeggedOut", type: "uint256" },
      { internalType: "address", name: "stabilityPool", type: "address" },
      { internalType: "uint256", name: "minStabilityPoolOut", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "zapStEthToStabilityPoolWithPermit",
    outputs: [
      { internalType: "uint256", name: "peggedOut", type: "uint256" },
      { internalType: "uint256", name: "deposited", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "wstEthAmount", type: "uint256" },
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "uint256", name: "minPeggedOut", type: "uint256" },
      { internalType: "address", name: "stabilityPool", type: "address" },
      { internalType: "uint256", name: "minStabilityPoolOut", type: "uint256" },
    ],
    name: "zapWstEthToStabilityPool",
    outputs: [
      { internalType: "uint256", name: "peggedOut", type: "uint256" },
      { internalType: "uint256", name: "deposited", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "wstEthAmount", type: "uint256" },
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "uint256", name: "minPeggedOut", type: "uint256" },
      { internalType: "address", name: "stabilityPool", type: "address" },
      { internalType: "uint256", name: "minStabilityPoolOut", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "zapWstEthToStabilityPoolWithPermit",
    outputs: [
      { internalType: "uint256", name: "peggedOut", type: "uint256" },
      { internalType: "uint256", name: "deposited", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
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
  { inputs: [], name: "MintFailed", type: "error" },
  { inputs: [], name: "ReentrancyGuardReentrantCall", type: "error" },
  { inputs: [{ internalType: "address", name: "token", type: "address" }], name: "SafeERC20FailedOperation", type: "error" },
  { inputs: [], name: "Unauthorized", type: "error" },
  { inputs: [], name: "ZeroAmount", type: "error" },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: true, internalType: "address", name: "minter", type: "address" },
      { indexed: true, internalType: "address", name: "receiver", type: "address" },
      { indexed: false, internalType: "uint256", name: "fxUsdAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "fxSaveAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "leveragedOut", type: "uint256" },
    ],
    name: "FXUSDZappedToLeveraged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: true, internalType: "address", name: "minter", type: "address" },
      { indexed: true, internalType: "address", name: "receiver", type: "address" },
      { indexed: false, internalType: "uint256", name: "fxUsdAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "fxSaveAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "peggedOut", type: "uint256" },
    ],
    name: "FXUSDZappedToPegged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "previousOwner", type: "address" },
      { indexed: true, internalType: "address", name: "newOwner", type: "address" },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: true, internalType: "address", name: "minter", type: "address" },
      { indexed: true, internalType: "address", name: "receiver", type: "address" },
      { indexed: false, internalType: "uint256", name: "usdcAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "fxSaveAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "leveragedOut", type: "uint256" },
    ],
    name: "USDCZappedToLeveraged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: true, internalType: "address", name: "minter", type: "address" },
      { indexed: true, internalType: "address", name: "receiver", type: "address" },
      { indexed: false, internalType: "uint256", name: "usdcAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "fxSaveAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "peggedOut", type: "uint256" },
    ],
    name: "USDCZappedToPegged",
    type: "event",
  },
  { stateMutability: "payable", type: "fallback" },
  { inputs: [], name: "FXSAVE", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "FXUSD", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "FXUSD_DIAMOND", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "FXUSD_SWAP_ROUTER", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "MINTER", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "USDC", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "owner", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "rescueEth", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "token", type: "address" }], name: "rescueToken", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "newOwner", type: "address" }], name: "transferOwnership", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "fxUsdAmount", type: "uint256" }, { internalType: "uint256", name: "minFxSaveOut", type: "uint256" }, { internalType: "address", name: "receiver", type: "address" }, { internalType: "uint256", name: "minLeveragedOut", type: "uint256" }], name: "zapFxUsdToLeveraged", outputs: [{ internalType: "uint256", name: "leveragedOut", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "fxUsdAmount", type: "uint256" }, { internalType: "uint256", name: "minFxSaveOut", type: "uint256" }, { internalType: "address", name: "receiver", type: "address" }, { internalType: "uint256", name: "minPeggedOut", type: "uint256" }], name: "zapFxUsdToPegged", outputs: [{ internalType: "uint256", name: "peggedOut", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "usdcAmount", type: "uint256" }, { internalType: "uint256", name: "minFxSaveOut", type: "uint256" }, { internalType: "address", name: "receiver", type: "address" }, { internalType: "uint256", name: "minLeveragedOut", type: "uint256" }], name: "zapUsdcToLeveraged", outputs: [{ internalType: "uint256", name: "leveragedOut", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "usdcAmount", type: "uint256" }, { internalType: "uint256", name: "minFxSaveOut", type: "uint256" }, { internalType: "address", name: "receiver", type: "address" }, { internalType: "uint256", name: "minPeggedOut", type: "uint256" }], name: "zapUsdcToPegged", outputs: [{ internalType: "uint256", name: "peggedOut", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
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
