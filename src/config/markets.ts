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
      stabilityPoolCollateral:
        "0xac8113ef28c8ef06064e8d78b69890d670273c73" as `0x${string}`,
      stabilityPoolLeveraged:
        "0x6738c3ee945218fb80700e2f4c1a5f3022a28c8d" as `0x${string}`,
      genesis: contracts.genesis,
      priceOracle: contracts.priceOracle,
      collateralPrice: "0xbb12a263bda971a64f9573ceab4fa689eb93daff", // MockWrappedPriceOracle
      feeReceiver: contracts.feeReceiver,
      collateralToken: contracts.collateralToken, // wstETH - primary collateral for UI (stored and given as rewards)
      wrappedCollateralToken: contracts.wrappedCollateralToken, // stETH - underlying reference token for yield scraping
      // Note: steam and veSteam are not deployed in this setup
      // steam: contracts.steam,
      // veSteam: contracts.veSteam,
    },
    peggedToken: {
      name: "Harbor Anchored Token",
      symbol: "ha",
      description: "Pegged token (fetched from contract)",
    },
    leveragedToken: {
      name: "Harbor Sail Token",
      symbol: "hs",
      description: "Leveraged token (fetched from contract)",
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
