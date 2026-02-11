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
      wrappedCollateralToken: "0x7743e50F534a7f9F1791DdE7dCD89F7783Eefc39", // fxSAVE (deposited)
      collateralToken: "0x085780639CC2cACd35E474e71f4d000e2405d8f6", // fxUSD
      underlyingCollateralToken: "0x085780639CC2cACd35E474e71f4d000e2405d8f6", // fxUSD (underlying)
      feeReceiver: "0x8C5EF0342543A509e5548c71A66dE7D8A69c6B70", // minterFeeReceiver
      genesis: "0x2cbF457112Ef5A16cfcA10Fb173d56a5cc9DAa66",
      leveragedToken: "0x85730Af3A7d7A872Ee1D84306E0575f1E00C0980", // hsFXUSD-GOLD
      minter: "0x880600E0c803d836E305B7c242FC095Eed234A8f" as `0x${string}`, // GOLD/fxUSD minter
      owner: "0x0000000000000000000000000000000000000000", // placeholder
      peggedToken: "0x5b66D86932aE5D9751da588d91D494950554061d", // haGOLD
      priceOracle: "0x1f7F62889E599E51b9e21B27d589Fa521516D147", // fxUSD/GOLD
      stabilityPoolCollateral: "0xC1EF32d4B959F2200efDeDdedadA226461d14DaC",
      stabilityPoolLeveraged: "0x5bDED171f1c08B903b466593B0E022F9FdE8399c",
      reservePool: "0xc033e81ED555D6db63A3E0Af9795454C7BdF094a",
      rebalancePoolCollateral: "0x0000000000000000000000000000000000000000", // placeholder
      rebalancePoolLeveraged: "0x0000000000000000000000000000000000000000", // placeholder
      collateralPrice: "0x0000000000000000000000000000000000000000", // placeholder
      genesisZap: "0x1048a287DDefF38E9A5c1e564A83f6978a2DC1eF", // GenesisUSDCZap_v4 for GOLD
      peggedTokenZap: "0xf0ff6D8d707D81d87caf2faa2447253f283f8873" as `0x${string}`, // MinterUSDCZap_v3 for GOLD/fxUSD
      leveragedTokenZap: "0xf0ff6D8d707D81d87caf2faa2447253f283f8873" as `0x${string}`, // MinterUSDCZap_v3 for GOLD/fxUSD (same contract)
    },
    genesis: {
      startDate: "2026-01-21T00:00:00Z",
      endDate: "2026-02-23T17:00:00Z", // Sunday, February 23rd at 5pm UK (GMT)
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
      wrappedCollateralToken: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0", // wstETH (deposited)
      collateralToken: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0", // wstETH
      underlyingCollateralToken: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84", // stETH
      feeReceiver: "0x0000000000000000000000000000000000000000", // placeholder
      genesis: "0x8Ad6b177137A6c33070c27d98355717849Ce526c",
      leveragedToken: "0x94460C6477cdA339DA0e7E39f6Aa66EF047e2F6a", // hsSTETH-GOLD
      minter: "0xB315DC4698DF45A477d8bb4B0Bc694C4D1Be91b5",
      owner: "0x0000000000000000000000000000000000000000", // placeholder
      peggedToken: "0x5b66D86932aE5D9751da588d91D494950554061d", // haGOLD
      priceOracle: "0x4ebde6143C5E366264ba7416FdEa18BC27C04A31", // stETH/GOLD
      stabilityPoolCollateral: "0x215C28DcCe0041eF9a17277CA271F100d9F345CF",
      stabilityPoolLeveraged: "0x2af96e906D568c92E53e96bB2878ce35E05dE69a",
      reservePool: "0x8224E5264FdD99547a21fFf34bDB60e78faB1609",
      rebalancePoolCollateral: "0x0000000000000000000000000000000000000000", // placeholder
      rebalancePoolLeveraged: "0x0000000000000000000000000000000000000000", // placeholder
      collateralPrice: "0x0000000000000000000000000000000000000000", // placeholder
      genesisZap: "0xCDf5BdcD7A035C2F20782e607D4f9F8f26280f93", // GenesisETHZap_v4 for GOLD
      peggedTokenZap: "0x3ce5e801A89eA0AC36fC29C12562695d4E6F0fec" as `0x${string}`, // MinterETHZap_v3 for GOLD/stETH
      leveragedTokenZap: "0x3ce5e801A89eA0AC36fC29C12562695d4E6F0fec" as `0x${string}`, // MinterETHZap_v3 for GOLD/stETH (same contract)
    },
    genesis: {
      startDate: "2026-01-21T00:00:00Z",
      endDate: "2026-02-23T17:00:00Z", // Sunday, February 23rd at 5pm UK (GMT)
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
    startBlock: 24271147, // Current block when markets added
    addresses: {
      wrappedCollateralToken: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0", // wstETH (deposited)
      collateralToken: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0", // wstETH
      underlyingCollateralToken: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84", // stETH (underlying)
      feeReceiver: "0x0000000000000000000000000000000000000000", // TODO: update from deploy log
      genesis: "0xf4F97218a00213a57A32E4606aAecC99e1805A89", // EUR::stETH::genesis from harbor_v1.state
      leveragedToken: "0xEA23FaAf5e464488ECc29883760238B68410D92b", // EUR::stETH::leveraged from harbor_v1.state
      minter: "0x68911ea33E11bc77e07f6dA4db6cd23d723641cE", // EUR::stETH::minter from harbor_v1.state
      owner: "0x9bABfC1A1952a6ed2caC1922BFfE80c0506364a2",
      peggedToken: "0x83Fd69E0FF5767972b46E61C6833408361bF7346", // EUR::pegged from harbor_v1.state
      priceOracle: "0xE370289aF2145A5B2F0F7a4a900eBfD478A156dB", // stETH price oracle
      stabilityPoolCollateral: "0x000564B33FFde65E6c3b718166856654e039D69B", // EUR::stETH::stabilityPoolCollateral from harbor_v1.state
      stabilityPoolLeveraged: "0x7553fb328ef35aF1c2ac4E91e53d6a6B62DFDdEa", // EUR::stETH::stabilityPoolLeveraged from harbor_v1.state
      reservePool: "0xdfE995CdAa4D956C0673428cA999782239b0C03D", // EUR::stETH::reservePool from harbor_v1.state
      rebalancePoolCollateral: "0x0000000000000000000000000000000000000000", // placeholder
      rebalancePoolLeveraged: "0x0000000000000000000000000000000000000000", // placeholder
      collateralPrice: "0xE370289aF2145A5B2F0F7a4a900eBfD478A156dB", // stETH price oracle
      genesisZap: "0x173B98E27dF83DC6fC930c1465F65cd10aA21657" as `0x${string}`, // GenesisETHZap_v4 for EUR
      peggedTokenZap: "0x31bd3B75672bAfbBa1b2F27789DCBF6ee7429D74" as `0x${string}`, // MinterETHZap_v3 for EUR/stETH
      leveragedTokenZap: "0x31bd3B75672bAfbBa1b2F27789DCBF6ee7429D74" as `0x${string}`, // MinterETHZap_v3 for EUR/stETH (same contract)
    },
    genesis: {
      startDate: "2026-01-19T15:21:11Z", // From deployment timestamp
      endDate: "2026-02-02T17:00:00Z", // Monday, February 2nd at 5pm UTC
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
    startBlock: 24271147, // Current block when markets added
    addresses: {
      wrappedCollateralToken: "0x7743e50F534a7f9F1791DdE7dCD89F7783Eefc39", // fxSAVE (deposited)
      collateralToken: "0x085780639CC2cACd35E474e71f4d000e2405d8f6", // fxUSD
      underlyingCollateralToken: "0x085780639CC2cACd35E474e71f4d000e2405d8f6", // fxUSD (underlying)
      feeReceiver: "0x43dfDB5059777A8B8819d8D8ff2c9ACCFEb766CB", // EUR::fxUSD::minterFeeReceiver from harbor_v1.state
      genesis: "0xa9EB43Ed6Ba3B953a82741F3e226C1d6B029699b", // EUR::fxUSD::genesis from harbor_v1.state
      leveragedToken: "0x7A7C1f2502c19193C44662A2Aff51c2B76fDDAEA", // EUR::fxUSD::leveraged from harbor_v1.state
      minter: "0xDEFB2C04062350678965CBF38A216Cc50723B246", // EUR::fxUSD::minter from harbor_v1.state
      owner: "0x9bABfC1A1952a6ed2caC1922BFfE80c0506364a2",
      peggedToken: "0x83Fd69E0FF5767972b46E61C6833408361bF7346", // EUR::pegged from harbor_v1.state
      priceOracle: "0x71437C90F1E0785dd691FD02f7bE0B90cd14c097", // fxUSD price oracle
      stabilityPoolCollateral: "0xe60054E6b518f67411834282cE1557381f050B13", // EUR::fxUSD::stabilityPoolCollateral from harbor_v1.state
      stabilityPoolLeveraged: "0xc5e0dA7e0a178850438E5E97ed59b6eb2562e88E", // EUR::fxUSD::stabilityPoolLeveraged from harbor_v1.state
      reservePool: "0x27cA37538358F90d45cAA886fB58CC08ffe2dD2f", // EUR::fxUSD::reservePool from harbor_v1.state
      rebalancePoolCollateral: "0x0000000000000000000000000000000000000000", // placeholder
      rebalancePoolLeveraged: "0x0000000000000000000000000000000000000000", // placeholder
      collateralPrice: "0x71437C90F1E0785dd691FD02f7bE0B90cd14c097", // fxUSD price oracle
      genesisZap: "0xE4f3Ce4F27f6bB520668F35101052831C80802ca" as `0x${string}`, // GenesisUSDCZap_v4 for EUR
      peggedTokenZap: "0x64118b5B2794088CA93D41C9f2264212dc92512f" as `0x${string}`, // MinterUSDCZap_v3 for EUR/fxUSD
      leveragedTokenZap: "0x64118b5B2794088CA93D41C9f2264212dc92512f" as `0x${string}`, // MinterUSDCZap_v3 for EUR/fxUSD (same contract)

    },
    genesis: {
      startDate: "2026-01-19T15:21:11Z", // From deployment timestamp
      endDate: "2026-02-02T17:00:00Z", // Monday, February 2nd at 5pm UTC
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
      wrappedCollateralToken: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0", // wstETH (deposited)
      collateralToken: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0", // wstETH
      underlyingCollateralToken: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84", // stETH
      feeReceiver: "0x0000000000000000000000000000000000000000", // placeholder
      genesis: "0xa6c02dE8E3150C6ffA9C80F98185d42653CB438d",
      leveragedToken: "0x4dc51cAa3551a9D01eebaA801c63b59A64028745", // hsSTETH-MCAP
      minter: "0xe37e34Ab0AaaabAc0e20c911349c1dEfAD0691B6",
      owner: "0x0000000000000000000000000000000000000000", // placeholder
      peggedToken: "0x0C5CC55959DBDE5d9fa05064da754D6A298E9833", // haMCAP
      priceOracle: "0x4fe6fa14db0D3C8a4709A4F3e37C1c862381859F", // stETH/MCAP
      stabilityPoolCollateral: "0x4cFf4948A0EA73Ee109327b56da0bead8c323189",
      stabilityPoolLeveraged: "0x505bfC99D2FB1A1424b2A4AA81303346df4f27E9",
      reservePool: "0x9B7fFA713d504F4DdC4f54c6dF6b1a9971d8B728",
      rebalancePoolCollateral: "0x0000000000000000000000000000000000000000", // placeholder
      rebalancePoolLeveraged: "0x0000000000000000000000000000000000000000", // placeholder
      collateralPrice: "0x0000000000000000000000000000000000000000", // placeholder
    },
    genesis: {
      startDate: "2026-02-01T00:00:00Z", // Placeholder - Coming Soon
      endDate: "2026-02-23T17:00:00Z", // Sunday, February 23rd at 5pm UK (GMT)
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
      wrappedCollateralToken: "0x7743e50F534a7f9F1791DdE7dCD89F7783Eefc39", // fxSAVE (deposited)
      collateralToken: "0x085780639CC2cACd35E474e71f4d000e2405d8f6", // fxUSD
      underlyingCollateralToken: "0x085780639CC2cACd35E474e71f4d000e2405d8f6", // fxUSD (underlying)
      feeReceiver: "0x0000000000000000000000000000000000000000", // placeholder
      genesis: "0x7Bfb831E6360D4600C7b9b200F8AcA6f89CecdA4",
      leveragedToken: "0x410cA79c92665E7f502Cbc59e4f6edfCb97F5ddd", // hsFXUSD-MCAP
      minter: "0x3d3EAe3a4Ee52ef703216c62EFEC3157694606dE",
      owner: "0x0000000000000000000000000000000000000000", // placeholder
      peggedToken: "0x0C5CC55959DBDE5d9fa05064da754D6A298E9833", // haMCAP
      priceOracle: "0x88430c0F09A6D603c43E2816F2EA9Ab45dB7e1a8", // fxUSD/MCAP
      stabilityPoolCollateral: "0x7928a145Eed1374f5594c799290419B80fCd03f0",
      stabilityPoolLeveraged: "0x8CF0C5F1394E137389D6dbfE91c56D00dEcdDAD8",
      reservePool: "0xBC645796937B0883dAE66CE3f8211891Cbc0324C",
      rebalancePoolCollateral: "0x0000000000000000000000000000000000000000", // placeholder
      rebalancePoolLeveraged: "0x0000000000000000000000000000000000000000", // placeholder
      collateralPrice: "0x0000000000000000000000000000000000000000", // placeholder
    },
    genesis: {
      startDate: "2026-02-01T00:00:00Z", // Placeholder - Coming Soon
      endDate: "2026-02-23T17:00:00Z", // Sunday, February 23rd at 5pm UK (GMT)
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
  "fxusd-silver": {
    id: "fxusd-silver",
    name: "fxUSD/SILVER",
    description: "fxUSD pegged to SILVER collateral",
    startBlock: 0, // Placeholder - will be updated when deployed
    addresses: {
      wrappedCollateralToken: "0x7743e50F534a7f9F1791DdE7dCD89F7783Eefc39", // fxSAVE (deposited)
      collateralToken: "0x085780639CC2cACd35E474e71f4d000e2405d8f6", // fxUSD
      underlyingCollateralToken: "0x085780639CC2cACd35E474e71f4d000e2405d8f6", // fxUSD (underlying)
      feeReceiver: "0x0000000000000000000000000000000000000000", // placeholder
      genesis: "0x66d18B9Dd5d1cd51957DFea0e0373b54E06118C8",
      leveragedToken: "0x74692d22a0CB924e4299785cc299291e560dF9cf", // hsFXUSD-SILVER
      minter: "0x177bb50574CDA129BDd0B0F50d4E061d38AA75Ef",
      owner: "0x0000000000000000000000000000000000000000", // placeholder
      peggedToken: "0x7dE413B0Abee6f685a8ff7fB53330E3C56523e74", // haSILVER
      priceOracle: "0x14816ff286f2eA46AB48c3275401Fd4b1ef817B5", // fxUSD/SILVER
      stabilityPoolCollateral: "0x7619664fe05c9cbDA5B622455856D7CA11Cb8800",
      stabilityPoolLeveraged: "0x24AEf2d27146497B18df180791424b1010bf1889",
      reservePool: "0xDBF9F31795DAEa636e3e1305f897BFa8D2aA017d",
      rebalancePoolCollateral: "0x0000000000000000000000000000000000000000", // placeholder
      rebalancePoolLeveraged: "0x0000000000000000000000000000000000000000", // placeholder
      collateralPrice: "0x0000000000000000000000000000000000000000", // placeholder
      genesisZap: "0xd19d801a0427Dd91bcbAfB0FcA783a3231a749c8", // GenesisUSDCZap_v4 for SILVER (deployed 2026-02-11)
      peggedTokenZap: "0xf0ff6D8d707D81d87caf2faa2447253f283f8873" as `0x${string}`, // MinterUSDCZap_v3 for SILVER/fxUSD (same as GOLD)
      leveragedTokenZap: "0xf0ff6D8d707D81d87caf2faa2447253f283f8873" as `0x${string}`, // MinterUSDCZap_v3 for SILVER/fxUSD (same as GOLD)
    },
    genesis: {
      startDate: "2026-02-01T00:00:00Z", // Placeholder - Coming Soon
      endDate: "2026-02-23T17:00:00Z", // Sunday, February 23rd at 5pm UK (GMT)
      rewards: {
        pegged: {
          symbol: "haSILVER",
          amount: "1000000",
        },
        leveraged: {
          symbol: "hsFXUSD-SILVER",
          amount: "1000000",
        },
      },
      collateralRatio: 1.0,
      leverageRatio: 2 * 1e18,
    },
  },
  "steth-silver": {
    id: "steth-silver",
    name: "stETH/SILVER",
    description: "stETH pegged to SILVER collateral",
    startBlock: 0, // Placeholder - will be updated when deployed
    addresses: {
      wrappedCollateralToken: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0", // wstETH (deposited)
      collateralToken: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0", // wstETH
      underlyingCollateralToken: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84", // stETH
      feeReceiver: "0x0000000000000000000000000000000000000000", // placeholder
      genesis: "0x8f655Ca32A1Fa8032955989c19e91886F26439dc",
      leveragedToken: "0x5BB5672be4553E648c1D20F093826faf77386d34", // hsSTETH-SILVER
      minter: "0x1c0067BEe039A293804b8BE951B368D2Ec65b3e9",
      owner: "0x0000000000000000000000000000000000000000", // placeholder
      peggedToken: "0x7dE413B0Abee6f685a8ff7fB53330E3C56523e74", // haSILVER
      priceOracle: "0x7223E17bD4527AcbE44644300eA0F09A4AeBC995", // stETH/SILVER
      stabilityPoolCollateral: "0x1C9c1cF9aa9fc86dF980086CbC5a5607522cFc3E",
      stabilityPoolLeveraged: "0x4C0F988b3c0C58F5ea323238E9d62B79582738e6",
      reservePool: "0x77AC9343621402B938d5A39727Da76891aFFA419",
      rebalancePoolCollateral: "0x0000000000000000000000000000000000000000", // placeholder
      rebalancePoolLeveraged: "0x0000000000000000000000000000000000000000", // placeholder
      collateralPrice: "0x0000000000000000000000000000000000000000", // placeholder
      genesisZap: "0xC128Cbf15920455569e1926C982567d2bE21AC50", // GenesisETHZap_v4 for SILVER (deployed 2026-02-11)
      peggedTokenZap: "0x3ce5e801A89eA0AC36fC29C12562695d4E6F0fec" as `0x${string}`, // MinterETHZap_v3 for SILVER/stETH (same as GOLD)
      leveragedTokenZap: "0x3ce5e801A89eA0AC36fC29C12562695d4E6F0fec" as `0x${string}`, // MinterETHZap_v3 for SILVER/stETH (same as GOLD)
    },
    genesis: {
      startDate: "2026-02-01T00:00:00Z", // Placeholder - Coming Soon
      endDate: "2026-02-23T17:00:00Z", // Sunday, February 23rd at 5pm UK (GMT)
      rewards: {
        pegged: {
          symbol: "haSILVER",
          amount: "1000000",
        },
        leveraged: {
          symbol: "hsSTETH-SILVER",
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
// ABIs re-exported from @/abis for backwards compatibility
export {
  STABILITY_POOL_MANAGER_ABI,
  GENESIS_ABI,
  ERC20_ABI,
} from "@/abis/shared";
export { minterABI } from "@/abis/minter";

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
