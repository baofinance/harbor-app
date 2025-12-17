import { markets as contractsMarkets } from "./contracts";

export const markets = {
  // ============================================================================
  // ETH/fxUSD Market (test2 deployment) - Mainnet deployment Dec 2025
  // ============================================================================
  "eth-fxusd": {
    name: "ETH/fxUSD",
    status: "genesis" as const,
    chain: {
      name: "Ethereum",
      logo: "icons/eth.png",
    },
    collateral: {
      symbol: "fxUSD",
      name: "f(x) USD",
      underlyingSymbol: "fxSAVE", // The wrapped collateral
    },
    // Accepted deposit assets for this market
    acceptedAssets: [
      { symbol: "fxUSD", name: "f(x) USD" },
      { symbol: "fxSAVE", name: "f(x) USD Saving" },
      { symbol: "USDC", name: "USD Coin" },
    ],
    rewardTokens: {
      default: ["fxSAVE"], // Wrapped collateral token is the primary reward token
      additional: [], // Additional reward tokens (if any)
    },
    addresses: {
      minter: contractsMarkets["eth-fxusd"].addresses.minter,
      peggedToken: contractsMarkets["eth-fxusd"].addresses.peggedToken, // haETH
      leveragedToken: contractsMarkets["eth-fxusd"].addresses.leveragedToken, // hsFXUSD-ETH
      reservePool: contractsMarkets["eth-fxusd"].addresses.reservePool,
      stabilityPoolManager: "0x4f96d6fcf24339633275fd069798fd7fe246a5d5" as `0x${string}`,
      stabilityPoolCollateral: contractsMarkets["eth-fxusd"].addresses.stabilityPoolCollateral,
      stabilityPoolLeveraged: contractsMarkets["eth-fxusd"].addresses.stabilityPoolLeveraged,
      genesis: contractsMarkets["eth-fxusd"].addresses.genesis,
      priceOracle: contractsMarkets["eth-fxusd"].addresses.priceOracle,
      collateralPrice: contractsMarkets["eth-fxusd"].addresses.collateralPrice,
      feeReceiver: contractsMarkets["eth-fxusd"].addresses.feeReceiver,
      collateralToken: contractsMarkets["eth-fxusd"].addresses.collateralToken, // fxUSD
      wrappedCollateralToken: contractsMarkets["eth-fxusd"].addresses.underlyingCollateralToken, // fxSAVE
      genesisZap: contractsMarkets["eth-fxusd"].addresses.genesisZap, // GenesisUSDCZap_v2 for ETH/fxUSD
    },
    peggedToken: {
      name: "Harbor Anchored ETH",
      symbol: "haETH",
      description: "Pegged token (fetched from contract)",
    },
    leveragedToken: {
      name: "Harbor Sail fxUSD-ETH",
      symbol: "hsFXUSD-ETH",
      description: "Leveraged token (fetched from contract)",
    },
    rewardPoints: {
      pointsPerDollar: 100,
      description:
        "100 ledger marks per dollar deposited at the end of genesis",
    },
    coinGeckoId: "fxusd", // CoinGecko ID for fxUSD (if available)
    genesis: {
      startDate: contractsMarkets["eth-fxusd"].genesis.startDate,
      endDate: contractsMarkets["eth-fxusd"].genesis.endDate,
      tokenDistribution: {
        pegged: {
          ratio: 0.5,
          description: "50% of your deposit as pegged tokens",
        },
        leveraged: {
          ratio: 0.5,
          description: "50% of your deposit as leveraged tokens",
        },
      },
    },
  },

  // ============================================================================
  // BTC/fxUSD Market (test2 deployment) - Mainnet deployment Dec 2025
  // ============================================================================
  "btc-fxusd": {
    name: "BTC/fxUSD",
    status: "genesis" as const,
    chain: {
      name: "Ethereum",
      logo: "icons/eth.png",
    },
    collateral: {
      symbol: "fxUSD",
      name: "f(x) USD",
      underlyingSymbol: "fxSAVE", // The wrapped collateral
    },
    // Accepted deposit assets for this market
    acceptedAssets: [
      { symbol: "fxUSD", name: "f(x) USD" },
      { symbol: "fxSAVE", name: "f(x) USD Saving" },
      { symbol: "USDC", name: "USD Coin" },
    ],
    rewardTokens: {
      default: ["fxSAVE"], // Wrapped collateral token is the primary reward token
      additional: [], // Additional reward tokens (if any)
    },
    addresses: {
      minter: contractsMarkets["btc-fxusd"].addresses.minter,
      peggedToken: contractsMarkets["btc-fxusd"].addresses.peggedToken, // haBTC
      leveragedToken: contractsMarkets["btc-fxusd"].addresses.leveragedToken, // hsFXUSD-BTC
      reservePool: contractsMarkets["btc-fxusd"].addresses.reservePool,
      stabilityPoolManager: "0xe583aa00029cb680b4857e07469b37996e026b5d" as `0x${string}`,
      stabilityPoolCollateral: contractsMarkets["btc-fxusd"].addresses.stabilityPoolCollateral,
      stabilityPoolLeveraged: contractsMarkets["btc-fxusd"].addresses.stabilityPoolLeveraged,
      genesis: contractsMarkets["btc-fxusd"].addresses.genesis,
      priceOracle: contractsMarkets["btc-fxusd"].addresses.priceOracle,
      collateralPrice: contractsMarkets["btc-fxusd"].addresses.collateralPrice,
      feeReceiver: contractsMarkets["btc-fxusd"].addresses.feeReceiver,
      collateralToken: contractsMarkets["btc-fxusd"].addresses.collateralToken, // fxUSD
      wrappedCollateralToken: contractsMarkets["btc-fxusd"].addresses.underlyingCollateralToken, // fxSAVE
      genesisZap: contractsMarkets["btc-fxusd"].addresses.genesisZap, // GenesisUSDCZap_v2 for BTC/fxUSD
    },
    peggedToken: {
      name: "Harbor Anchored BTC",
      symbol: "haBTC",
      description: "Pegged token (fetched from contract)",
    },
    leveragedToken: {
      name: "Harbor Sail fxUSD-BTC",
      symbol: "hsFXUSD-BTC",
      description: "Leveraged token (fetched from contract)",
    },
    rewardPoints: {
      pointsPerDollar: 100,
      description:
        "100 ledger marks per dollar deposited at the end of genesis",
    },
    coinGeckoId: "fxusd", // CoinGecko ID for fxUSD (if available)
    genesis: {
      startDate: contractsMarkets["btc-fxusd"].genesis.startDate,
      endDate: contractsMarkets["btc-fxusd"].genesis.endDate,
      tokenDistribution: {
        pegged: {
          ratio: 0.5,
          description: "50% of your deposit as pegged tokens",
        },
        leveraged: {
          ratio: 0.5,
          description: "50% of your deposit as leveraged tokens",
        },
      },
    },
  },

  // ============================================================================
  // BTC/stETH Market (test2 deployment) - Mainnet deployment Dec 2025
  // ============================================================================
  "btc-steth": {
    name: "BTC/stETH",
    status: "genesis" as const,
    chain: {
      name: "Ethereum",
      logo: "icons/eth.png",
    },
    collateral: {
      symbol: "wstETH",
      name: "Wrapped Staked ETH",
      underlyingSymbol: "stETH", // The underlying asset
    },
    // Accepted deposit assets for this market
    acceptedAssets: [
      { symbol: "ETH", name: "Ethereum" },
      { symbol: "stETH", name: "Lido Staked ETH" },
      { symbol: "wstETH", name: "Wrapped Staked ETH" },
    ],
    rewardTokens: {
      default: ["wstETH"], // Wrapped collateral token is the primary reward token
      additional: [], // Additional reward tokens (if any)
    },
    addresses: {
      minter: contractsMarkets["btc-steth"].addresses.minter,
      peggedToken: contractsMarkets["btc-steth"].addresses.peggedToken, // haBTC (shared)
      leveragedToken: contractsMarkets["btc-steth"].addresses.leveragedToken, // hsSTETH-BTC
      reservePool: contractsMarkets["btc-steth"].addresses.reservePool,
      stabilityPoolManager: "0x97803311470d6ce713ad70d720d33876c4a98efb" as `0x${string}`,
      stabilityPoolCollateral: contractsMarkets["btc-steth"].addresses.stabilityPoolCollateral,
      stabilityPoolLeveraged: contractsMarkets["btc-steth"].addresses.stabilityPoolLeveraged,
      genesis: contractsMarkets["btc-steth"].addresses.genesis,
      priceOracle: contractsMarkets["btc-steth"].addresses.priceOracle,
      collateralPrice: contractsMarkets["btc-steth"].addresses.collateralPrice,
      feeReceiver: contractsMarkets["btc-steth"].addresses.feeReceiver,
      collateralToken: contractsMarkets["btc-steth"].addresses.collateralToken, // wstETH (what's deposited in genesis)
      wrappedCollateralToken: contractsMarkets["btc-steth"].addresses.underlyingCollateralToken, // stETH (kept for deposit modal compatibility)
      genesisZap: contractsMarkets["btc-steth"].addresses.genesisZap, // GenesisETHZap_v3 for BTC/stETH
    },
    peggedToken: {
      name: "Harbor Anchored BTC",
      symbol: "haBTC",
      description: "Pegged token (fetched from contract)",
    },
    leveragedToken: {
      name: "Harbor Sail stETH-BTC",
      symbol: "hsSTETH-BTC",
      description: "Leveraged token (fetched from contract)",
    },
    rewardPoints: {
      pointsPerDollar: 100,
      description:
        "100 ledger marks per dollar deposited at the end of genesis",
    },
    coinGeckoId: "wrapped-steth", // CoinGecko ID for wstETH
    genesis: {
      startDate: contractsMarkets["btc-steth"].genesis.startDate,
      endDate: contractsMarkets["btc-steth"].genesis.endDate,
      tokenDistribution: {
        pegged: {
          ratio: 0.5,
          description: "50% of your deposit as pegged tokens",
        },
        leveraged: {
          ratio: 0.5,
          description: "50% of your deposit as leveraged tokens",
        },
      },
    },
  },
} as const;

export type Market = (typeof markets)[keyof typeof markets];

// Helper functions for genesis status
export function getGenesisStatus(
  market: Market,
  onChainGenesisEnded: boolean,
  isAdmin: boolean = false
) {
  const now = new Date();
  const startDate = new Date(market.genesis.startDate);
  const endDate = new Date(market.genesis.endDate);

  // Contract's genesisIsEnded() is the authoritative source
  if (onChainGenesisEnded) {
    return {
      phase: "completed" as const,
      onChainStatus: "completed" as const,
      canClaim: true,
      canDeposit: false,
      canWithdraw: false,
    };
  }

  // For admin: if contract says genesis hasn't ended, it's live (regardless of config dates)
  // Config dates are just informational for users about when team plans to end genesis
  if (isAdmin) {
    if (now < startDate) {
      return {
        phase: "scheduled" as const,
        onChainStatus: "scheduled" as const,
        canClaim: false,
        canDeposit: false,
        canWithdraw: false,
      };
    }
    // If contract hasn't ended, it's live (even if config end date has passed)
    return {
      phase: "live" as const,
      onChainStatus: "live" as const,
      canClaim: false,
      canDeposit: true,
      canWithdraw: true,
    };
  }

  // For users: use config dates for display purposes
  if (now < startDate) {
    return {
      phase: "scheduled" as const,
      onChainStatus: "scheduled" as const,
      canClaim: false,
      canDeposit: false,
      canWithdraw: false,
    };
  }

  if (now >= startDate && now <= endDate) {
    return {
      phase: "live" as const,
      onChainStatus: "live" as const,
      canClaim: false,
      canDeposit: true,
      canWithdraw: true,
    };
  }

  // Time has passed but contract hasn't ended - this is "processing" for users
  // But for admin, we treat it as "live" since contract hasn't ended
  return {
    phase: "closed" as const,
    onChainStatus: "closed" as const,
    canClaim: true,
    canDeposit: false,
    canWithdraw: true,
  };
}

export function getGenesisPhaseInfo(phase: string) {
  switch (phase) {
    case "scheduled":
      return { title: "SCHEDULED", description: "Genesis period not started" };
    case "live":
      return { title: "LIVE", description: "Genesis period is active" };
    case "closed":
      return { title: "CLOSED", description: "Genesis period ended" };
    case "completed":
      return { title: "COMPLETED", description: "Genesis period completed" };
    default:
      return { title: "UNKNOWN", description: "Unknown status" };
  }
}

export function isGenesisActive(market: Market) {
  const status = getGenesisStatus(market, false);
  return status.phase === "live";
}

export function getPrimaryRewardToken(market: Market) {
  return (market as any).rewardToken;
}

export function getRewardPoints(market: Market) {
  return (market as any).rewardPoints;
}
