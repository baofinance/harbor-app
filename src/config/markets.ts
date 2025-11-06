import { contracts } from "./contracts";

export const markets = {
  "usd-eth": {
    name: "USD/ETH",
    status: "genesis" as const,
    chain: {
      name: "Ethereum",
      logo: "icons/eth.png",
    },
    collateral: {
      symbol: "ETH",
      name: "Ethereum",
    },
    addresses: {
      minter: contracts.minter,
      peggedToken: contracts.peggedToken,
      leveragedToken: contracts.leveragedToken,
      steam: contracts.steam,
      veSteam: contracts.veSteam,
      reservePool: contracts.reservePool,
      stabilityPoolManager: contracts.stabilityPoolManager,
      genesis: contracts.genesis,
      priceOracle: contracts.priceOracle,
      feeReceiver: contracts.feeReceiver,
      collateralToken: contracts.wrappedCollateralToken,
      wrappedCollateralToken: contracts.collateralToken,
    },
    peggedToken: {
      name: "haETH",
      symbol: "haETH",
      description: "Pegged to ETH",
    },
    leveragedToken: {
      name: "hsUSD-ETH",
      symbol: "hsUSD-ETH",
      description: "Long USD vs ETH (short ETH)",
    },
    rewardPoints: {
      pointsPerDollar: 100,
      description: "100 points per dollar deposited at the end of genesis",
    },
    genesis: {
      startDate: "2025-11-03T00:00:00Z",
      endDate: "2025-11-18T23:59:59Z",
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
  "usd-btc": {
    name: "USD/BTC",
    status: "genesis" as const,
    chain: {
      name: "Ethereum",
      logo: "icons/eth.png",
    },
    collateral: {
      symbol: "BTC",
      name: "Bitcoin",
    },
    addresses: {
      minter: contracts.minter,
      peggedToken: contracts.peggedToken,
      leveragedToken: contracts.leveragedToken,
      steam: contracts.steam,
      veSteam: contracts.veSteam,
      reservePool: contracts.reservePool,
      stabilityPoolManager: contracts.stabilityPoolManager,
      genesis: contracts.genesis,
      priceOracle: contracts.priceOracle,
      feeReceiver: contracts.feeReceiver,
      collateralToken: contracts.wrappedCollateralToken,
      wrappedCollateralToken: contracts.collateralToken,
    },
    peggedToken: {
      name: "haBTC",
      symbol: "haBTC",
      description: "Pegged to BTC",
    },
    leveragedToken: {
      name: "hsUSD-BTC",
      symbol: "hsUSD-BTC",
      description: "Long USD vs BTC (short BTC)",
    },
    rewardPoints: {
      pointsPerDollar: 100,
      description: "100 points per dollar deposited at the end of genesis",
    },
    genesis: {
      startDate: "2025-11-03T00:00:00Z",
      endDate: "2025-11-18T23:59:59Z",
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
  "eth-btc": {
    name: "ETH/BTC",
    status: "genesis" as const,
    chain: {
      name: "Ethereum",
      logo: "icons/eth.png",
    },
    collateral: {
      symbol: "BTC",
      name: "Bitcoin",
    },
    addresses: {
      minter: contracts.minter,
      peggedToken: contracts.peggedToken,
      leveragedToken: contracts.leveragedToken,
      steam: contracts.steam,
      veSteam: contracts.veSteam,
      reservePool: contracts.reservePool,
      stabilityPoolManager: contracts.stabilityPoolManager,
      genesis: contracts.genesis,
      priceOracle: contracts.priceOracle,
      feeReceiver: contracts.feeReceiver,
      collateralToken: contracts.wrappedCollateralToken,
      wrappedCollateralToken: contracts.collateralToken,
    },
    peggedToken: {
      name: "haBTC",
      symbol: "haBTC",
      description: "Pegged to BTC",
    },
    leveragedToken: {
      name: "hsETH-BTC",
      symbol: "hsETH-BTC",
      description: "Long ETH vs BTC",
    },
    rewardPoints: {
      pointsPerDollar: 100,
      description: "100 points per dollar deposited at the end of genesis",
    },
    genesis: {
      startDate: "2025-11-03T00:00:00Z",
      endDate: "2025-11-18T23:59:59Z",
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
export function getGenesisStatus(market: Market, onChainGenesisEnded: boolean) {
  const now = new Date();
  const startDate = new Date(market.genesis.startDate);
  const endDate = new Date(market.genesis.endDate);

  if (onChainGenesisEnded) {
    return {
      phase: "completed" as const,
      onChainStatus: "completed" as const,
      canClaim: true,
      canDeposit: false,
      canWithdraw: false,
    };
  }

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
