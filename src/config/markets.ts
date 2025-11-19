import { contracts } from "./contracts";

export const markets = {
  "pb-steth": {
    name: "PB/stETH",
    status: "genesis" as const,
    chain: {
      name: "Ethereum",
      logo: "icons/eth.png",
    },
    collateral: {
      symbol: "wstETH",
      name: "Wrapped Staked ETH",
    },
    rewardTokens: {
      default: ["wstETH"], // Wrapped collateral token is the primary reward token
      additional: [], // Additional reward tokens (if any)
    },
    addresses: {
      minter: contracts.minter,
      peggedToken: contracts.peggedToken,
      leveragedToken: contracts.leveragedToken,
      reservePool: contracts.reservePool,
      stabilityPoolManager: contracts.stabilityPoolManager,
      stabilityPoolCollateral: "0x82e01223d51Eb87e16A03E24687EDF0F294da6f1" as `0x${string}`,
      stabilityPoolLeveraged: null as `0x${string}` | null, // No leveraged stability pool in this deployment
      genesis: contracts.genesis,
      priceOracle: contracts.priceOracle,
      collateralPrice: contracts.priceOracle, // Using the same price oracle for collateral price
      feeReceiver: contracts.feeReceiver,
      collateralToken: contracts.wrappedCollateralToken, // wstETH - primary collateral for UI (stored and given as rewards)
      wrappedCollateralToken: contracts.collateralToken, // stETH - underlying reference token for yield scraping
      // Note: steam and veSteam are not deployed in this setup
      // steam: contracts.steam,
      // veSteam: contracts.veSteam,
    },
    peggedToken: {
      name: "Harbor Anchored PB",
      symbol: "haPB",
      description: "Pegged to PB (Pork Bellies)",
    },
    leveragedToken: {
      name: "Harbor Sail hsPBxstETH",
      symbol: "hshsPBxstETH",
      description: "Leveraged PB/stETH token",
    },
    rewardPoints: {
      pointsPerDollar: 100,
      description:
        "100 ledger marks per dollar deposited at the end of genesis",
    },
    genesis: {
      startDate: "2025-11-03T00:00:00Z",
      endDate: "2025-11-25T23:59:59Z",
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
