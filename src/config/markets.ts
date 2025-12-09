import { contracts, anvilContracts } from "./contracts";
import { shouldUseAnvil } from "./environment";

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
        (shouldUseAnvil() ? "0xAccA4DabdD245aB5AE373434Aa1AB4164ab01290" : "0x3aAde2dCD2Df6a8cAc689EE797591b2913658659") as `0x${string}`,
      stabilityPoolLeveraged:
        (shouldUseAnvil() ? "0x5e8bC075e088666F6D3CF6539A32B4c280Cdf4D8" : "0x525C7063E7C20997BaaE9bDa922159152D0e8417") as `0x${string}`,
      genesis: contracts.genesis,
      priceOracle: contracts.priceOracle,
      collateralPrice: contracts.priceOracle, // Using the same price oracle for collateral price
      feeReceiver: contracts.feeReceiver,
      collateralToken: contracts.wrappedCollateralToken, // wstETH - primary collateral for UI (stored and given as rewards)
      wrappedCollateralToken: contracts.collateralToken, // stETH - underlying reference token for yield scraping
      genesisZap: shouldUseAnvil() ? anvilContracts.genesisZap : undefined, // Zap contract for ETH/stETH deposits
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
    coinGeckoId: "wrapped-steth", // CoinGecko ID for wstETH
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
