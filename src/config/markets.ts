import { contracts } from "./contracts";

export const markets = {
  // ============================================================================
  // USD-stETH Market (stETH collateral)
  // ============================================================================
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
      collateralPrice: "0xa79191BbB7542805B30326165516a8fEd77ce92c", // HarborSingleFeedAndRateAggregator_v1 (wstETH/USD)
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
    coinGeckoId: "wrapped-steth", // CoinGecko ID for wstETH
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

  // ============================================================================
  // USD-WBTC Market (aWBTC collateral - Aave deposited WBTC)
  // ============================================================================
  "usd-wbtc": {
    name: "USD/WBTC",
    status: "genesis" as const,
    chain: {
      name: "Ethereum",
      logo: "icons/eth.png",
    },
    collateral: {
      symbol: "aEthWBTC", // Aave Ethereum WBTC - what users deposit
      name: "Aave Ethereum WBTC",
      underlyingSymbol: "WBTC", // The underlying asset
    },
    // Accepted deposit assets for this market
    acceptedAssets: [
      { symbol: "aEthWBTC", name: "Aave Ethereum WBTC" },
    ],
    rewardTokens: {
      default: ["aEthWBTC"], // Wrapped collateral token is the primary reward token
      additional: [], // Additional reward tokens (if any)
    },
    addresses: {
      minter: "0xa9434313a4b9a4d624c6d67b1d61091b159f5a77" as `0x${string}`,
      peggedToken: "0x6ff0fe773d4ad4ea923ba9ea9cc1c1b42b70f5fc" as `0x${string}`, // haUSD-stETH (shared)
      leveragedToken: "0x03fd55f80277c13bb17739190b1e086b836c9f20" as `0x${string}`, // hsUSD-WBTC
      reservePool: "0x17cbf88764bd47d6c2105b782bf9b7615f7b2d9e" as `0x${string}`,
      stabilityPoolManager: "0x37a38a1c76d3a3a588aa9f1cb9af4b2055f790d7" as `0x${string}`,
      stabilityPoolCollateral: "0x39613a4c9582dea56f9ee8ad0351011421c3593a" as `0x${string}`,
      stabilityPoolLeveraged: "0xfc2145de73ec53e34c4e6809b56a61321315e806" as `0x${string}`,
      genesis: "0x0569ebf818902e448235592f86e63255bbe64fd3" as `0x${string}`,
      priceOracle: "0x7df29f02e6baf23fbd77940d78b158a66f1bd33c" as `0x${string}`,
      collateralPrice: "0x7df29f02e6baf23fbd77940d78b158a66f1bd33c" as `0x${string}`, // MockWrappedPriceOracle (same as priceOracle)
      feeReceiver: "0x1ca04526fa156fd18a182ab436c3ff2f306af907" as `0x${string}`,
      collateralToken: "0x5ee5bf7ae06d1be5997a1a72006fe6c607ec6de8" as `0x${string}`, // aWBTC (Aave WBTC) - what users deposit
      wrappedCollateralToken: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599" as `0x${string}`, // WBTC - underlying
    },
    peggedToken: {
      name: "Harbor Anchored USD",
      symbol: "haUSD",
      description: "Pegged token (fetched from contract)",
    },
    leveragedToken: {
      name: "Harbor Sail USD for WBTC",
      symbol: "hsUSD-WBTC",
      description: "Leveraged token (fetched from contract)",
    },
    rewardPoints: {
      pointsPerDollar: 100,
      description:
        "100 ledger marks per dollar deposited at the end of genesis",
    },
    genesis: {
      startDate: "2025-12-12T22:35:47Z", // From deployment timestamp
      endDate: "2026-01-12T23:59:59Z", // ~1 month genesis period (adjust as needed)
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
