import { markets as contractsMarkets } from "./contracts.index";

// Check if we're using test2 contracts
const useTest2 = process.env.NEXT_PUBLIC_USE_TEST2_CONTRACTS === "true";

// Helper to safely get contract market or return undefined
const getContractMarket = (marketId: string) => {
  return contractsMarkets[marketId as keyof typeof contractsMarkets];
};

export const markets = {
  // ============================================================================
  // ETH/fxUSD Market (test2 deployment) - Mainnet deployment Dec 2025
  // ============================================================================
  "eth-fxusd": {
    name: "ETH/fxUSD",
    status: "genesis" as const,
    pegTarget: "ETH", // haETH is pegged to ETH
    chain: {
      name: "Ethereum",
      logo: "icons/eth.png",
    },
    collateral: {
      symbol: "fxSAVE", // The wrapped collateral (what's deposited)
      name: "f(x) USD Saving",
      underlyingSymbol: "fxUSD", // The underlying/base token
    },
    underlyingCoinGeckoId: "fx-protocol-fxusd", // CoinGecko ID for fxUSD price detection
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
      stabilityPoolManager: "0xE39165aDE355988EFb24dA4f2403971101134CAB" as `0x${string}`,
      stabilityPoolCollateral: contractsMarkets["eth-fxusd"].addresses.stabilityPoolCollateral,
      stabilityPoolLeveraged: contractsMarkets["eth-fxusd"].addresses.stabilityPoolLeveraged,
      genesis: contractsMarkets["eth-fxusd"].addresses.genesis,
      priceOracle: contractsMarkets["eth-fxusd"].addresses.priceOracle,
      collateralPrice: contractsMarkets["eth-fxusd"].addresses.collateralPrice,
      feeReceiver: contractsMarkets["eth-fxusd"].addresses.feeReceiver,
      collateralToken: contractsMarkets["eth-fxusd"].addresses.collateralToken, // fxUSD
      wrappedCollateralToken: contractsMarkets["eth-fxusd"].addresses.wrappedCollateralToken, // fxSAVE
      genesisZap: contractsMarkets["eth-fxusd"].addresses.genesisZap, // GenesisUSDCZap_v2 for ETH/fxUSD
      peggedTokenZap: contractsMarkets["eth-fxusd"].addresses.peggedTokenZap, // MinterUSDCZap_v3 for ETH/fxUSD (includes stability pool zaps)
      leveragedTokenZap: contractsMarkets["eth-fxusd"].addresses.leveragedTokenZap, // MinterUSDCZap_v3 for ETH/fxUSD (includes stability pool zaps)
    },
    startBlock: contractsMarkets["eth-fxusd"].startBlock,
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
    marksCampaign: {
      id: "launch-maiden-voyage",
      label: "Launch Maiden Voyage",
    },
    coinGeckoId: "fx-usd-saving", // CoinGecko ID for fxSAVE (the deposited token)
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
    pegTarget: "BTC", // haBTC is pegged to BTC
    chain: {
      name: "Ethereum",
      logo: "icons/eth.png",
    },
    collateral: {
      symbol: "fxSAVE", // The wrapped collateral (what's deposited)
      name: "f(x) USD Saving",
      underlyingSymbol: "fxUSD", // The underlying/base token
    },
    underlyingCoinGeckoId: "fx-protocol-fxusd", // CoinGecko ID for fxUSD price detection
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
      stabilityPoolManager: "0x768E0a386e1972eB5995429Fe21E7aC0f22F516e" as `0x${string}`,
      stabilityPoolCollateral: contractsMarkets["btc-fxusd"].addresses.stabilityPoolCollateral,
      stabilityPoolLeveraged: contractsMarkets["btc-fxusd"].addresses.stabilityPoolLeveraged,
      genesis: contractsMarkets["btc-fxusd"].addresses.genesis,
      priceOracle: contractsMarkets["btc-fxusd"].addresses.priceOracle,
      collateralPrice: contractsMarkets["btc-fxusd"].addresses.collateralPrice,
      feeReceiver: contractsMarkets["btc-fxusd"].addresses.feeReceiver,
      collateralToken: contractsMarkets["btc-fxusd"].addresses.collateralToken, // fxUSD
      wrappedCollateralToken: contractsMarkets["btc-fxusd"].addresses.wrappedCollateralToken, // fxSAVE
      genesisZap: contractsMarkets["btc-fxusd"].addresses.genesisZap, // GenesisUSDCZap_v2 for BTC/fxUSD
      peggedTokenZap: contractsMarkets["btc-fxusd"].addresses.peggedTokenZap, // MinterUSDCZap_v2 for BTC/fxUSD
      leveragedTokenZap: contractsMarkets["btc-fxusd"].addresses.leveragedTokenZap, // MinterUSDCZap_v2 for BTC/fxUSD
    },
    startBlock: contractsMarkets["btc-fxusd"].startBlock,
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
    marksCampaign: {
      id: "launch-maiden-voyage",
      label: "Launch Maiden Voyage",
    },
    coinGeckoId: "fx-usd-saving", // CoinGecko ID for fxSAVE (the deposited token)
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
    pegTarget: "BTC", // haBTC is pegged to BTC
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
      stabilityPoolManager: "0x5e9Bcaa1EDfD665c09a9e6693B447581d61A85A1" as `0x${string}`,
      stabilityPoolCollateral: contractsMarkets["btc-steth"].addresses.stabilityPoolCollateral,
      stabilityPoolLeveraged: contractsMarkets["btc-steth"].addresses.stabilityPoolLeveraged,
      genesis: contractsMarkets["btc-steth"].addresses.genesis,
      priceOracle: contractsMarkets["btc-steth"].addresses.priceOracle,
      collateralPrice: contractsMarkets["btc-steth"].addresses.collateralPrice,
      feeReceiver: contractsMarkets["btc-steth"].addresses.feeReceiver,
      collateralToken: contractsMarkets["btc-steth"].addresses.collateralToken, // wstETH (underlying collateral token)
      wrappedCollateralToken: contractsMarkets["btc-steth"].addresses.wrappedCollateralToken, // wstETH (deposited)
      genesisZap: contractsMarkets["btc-steth"].addresses.genesisZap, // GenesisETHZap_v3 for BTC/stETH
      peggedTokenZap: contractsMarkets["btc-steth"].addresses.peggedTokenZap, // MinterETHZap_v3 for BTC/stETH (includes stability pool zaps)
      leveragedTokenZap: contractsMarkets["btc-steth"].addresses.leveragedTokenZap, // MinterETHZap_v3 for BTC/stETH (includes stability pool zaps)
    },
    startBlock: contractsMarkets["btc-steth"].startBlock,
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
    marksCampaign: {
      id: "launch-maiden-voyage",
      label: "Launch Maiden Voyage",
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
  // ============================================================================
  // Coming Soon Markets
  // These are only available in production, not in test2
  // ============================================================================
  ...(useTest2 ? {} : {
  "fxusd-gold": {
    name: "fxUSD-GOLD",
    status: "coming-soon" as const,
    pegTarget: "GOLD",
    chain: {
      name: "Ethereum",
      logo: "icons/eth.png",
    },
    collateral: {
      symbol: "fxSAVE",
      name: "f(x) USD Saving",
      underlyingSymbol: "fxUSD",
    },
    underlyingCoinGeckoId: "fx-protocol-fxusd",
    acceptedAssets: [
      { symbol: "fxUSD", name: "f(x) USD" },
      { symbol: "fxSAVE", name: "f(x) USD Saving" },
      { symbol: "USDC", name: "USD Coin" },
    ],
    rewardTokens: {
      default: ["fxSAVE"],
      additional: [],
    },
    addresses: {
      minter: contractsMarkets["fxusd-gold"].addresses.minter,
      peggedToken: contractsMarkets["fxusd-gold"].addresses.peggedToken,
      leveragedToken: contractsMarkets["fxusd-gold"].addresses.leveragedToken,
      reservePool: contractsMarkets["fxusd-gold"].addresses.reservePool,
      stabilityPoolManager: "0x5c96077BB55376b66670B937F7bBdDBBc63A8564" as `0x${string}`,
      stabilityPoolCollateral: contractsMarkets["fxusd-gold"].addresses.stabilityPoolCollateral,
      stabilityPoolLeveraged: contractsMarkets["fxusd-gold"].addresses.stabilityPoolLeveraged,
      genesis: contractsMarkets["fxusd-gold"].addresses.genesis,
      priceOracle: contractsMarkets["fxusd-gold"].addresses.priceOracle,
      collateralPrice: contractsMarkets["fxusd-gold"].addresses.collateralPrice,
      feeReceiver: contractsMarkets["fxusd-gold"].addresses.feeReceiver,
      collateralToken: contractsMarkets["fxusd-gold"].addresses.collateralToken,
      wrappedCollateralToken: contractsMarkets["fxusd-gold"].addresses.wrappedCollateralToken,
    },
    peggedToken: {
      name: "Harbor Anchored GOLD",
      symbol: "haGOLD",
      description: "Pegged token (coming soon)",
    },
    leveragedToken: {
      name: "Harbor Sail fxUSD-GOLD",
      symbol: "hsFXUSD-GOLD",
      description: "Leveraged token (coming soon)",
    },
    rewardPoints: {
      pointsPerDollar: 100,
      description: "100 ledger marks per dollar deposited at the end of genesis",
    },
    marksCampaign: {
      id: "metals-maiden-voyage",
      label: "Metals Maiden Voyage",
    },
    coinGeckoId: "fx-protocol-fxusd",
    genesis: {
      startDate: contractsMarkets["fxusd-gold"].genesis.startDate,
      endDate: contractsMarkets["fxusd-gold"].genesis.endDate,
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
  "steth-gold": {
    name: "stETH-GOLD",
    status: "coming-soon" as const,
    pegTarget: "GOLD",
    chain: {
      name: "Ethereum",
      logo: "icons/eth.png",
    },
    collateral: {
      symbol: "wstETH",
      name: "Wrapped stETH",
      underlyingSymbol: "stETH",
    },
    underlyingCoinGeckoId: "wrapped-steth",
    acceptedAssets: [
      { symbol: "stETH", name: "Lido Staked ETH" },
      { symbol: "wstETH", name: "Wrapped stETH" },
      { symbol: "ETH", name: "Ethereum" },
    ],
    rewardTokens: {
      default: ["wstETH"],
      additional: [],
    },
    addresses: {
      minter: contractsMarkets["steth-gold"].addresses.minter,
      peggedToken: contractsMarkets["steth-gold"].addresses.peggedToken,
      leveragedToken: contractsMarkets["steth-gold"].addresses.leveragedToken,
      reservePool: contractsMarkets["steth-gold"].addresses.reservePool,
      stabilityPoolManager: "0x322b19DFBeF5F41d1FA6436886349EEE02408867" as `0x${string}`,
      stabilityPoolCollateral: contractsMarkets["steth-gold"].addresses.stabilityPoolCollateral,
      stabilityPoolLeveraged: contractsMarkets["steth-gold"].addresses.stabilityPoolLeveraged,
      genesis: contractsMarkets["steth-gold"].addresses.genesis,
      priceOracle: contractsMarkets["steth-gold"].addresses.priceOracle,
      collateralPrice: contractsMarkets["steth-gold"].addresses.collateralPrice,
      feeReceiver: contractsMarkets["steth-gold"].addresses.feeReceiver,
      collateralToken: contractsMarkets["steth-gold"].addresses.collateralToken,
      wrappedCollateralToken: contractsMarkets["steth-gold"].addresses.wrappedCollateralToken,
    },
    peggedToken: {
      name: "Harbor Anchored GOLD",
      symbol: "haGOLD",
      description: "Pegged token (coming soon)",
    },
    leveragedToken: {
      name: "Harbor Sail stETH-GOLD",
      symbol: "hsSTETH-GOLD",
      description: "Leveraged token (coming soon)",
    },
    rewardPoints: {
      pointsPerDollar: 100,
      description: "100 ledger marks per dollar deposited at the end of genesis",
    },
    marksCampaign: {
      id: "metals-maiden-voyage",
      label: "Metals Maiden Voyage",
    },
    coinGeckoId: "wrapped-steth",
    genesis: {
      startDate: contractsMarkets["steth-gold"].genesis.startDate,
      endDate: contractsMarkets["steth-gold"].genesis.endDate,
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
  "steth-eur": {
    name: "stETH-EUR",
    status: "genesis" as const,
    pegTarget: "EUR",
    chain: {
      name: "Ethereum",
      logo: "icons/eth.png",
    },
    collateral: {
      symbol: "wstETH",
      name: "Wrapped stETH",
      underlyingSymbol: "stETH",
    },
    underlyingCoinGeckoId: "wrapped-steth",
    acceptedAssets: [
      { symbol: "stETH", name: "Lido Staked ETH" },
      { symbol: "wstETH", name: "Wrapped stETH" },
      { symbol: "ETH", name: "Ethereum" },
    ],
    rewardTokens: {
      default: ["wstETH"],
      additional: [],
    },
    addresses: {
      minter: contractsMarkets["steth-eur"].addresses.minter,
      peggedToken: contractsMarkets["steth-eur"].addresses.peggedToken,
      leveragedToken: contractsMarkets["steth-eur"].addresses.leveragedToken,
      reservePool: contractsMarkets["steth-eur"].addresses.reservePool,
      stabilityPoolManager: "0x29AAEe8b76A5970D7d5041F500512e2b9d70Aa94" as `0x${string}`, // EUR::stETH::stabilityPoolManager from harbor_v1.state
      stabilityPoolCollateral: contractsMarkets["steth-eur"].addresses.stabilityPoolCollateral,
      stabilityPoolLeveraged: contractsMarkets["steth-eur"].addresses.stabilityPoolLeveraged,
      genesis: contractsMarkets["steth-eur"].addresses.genesis,
      priceOracle: contractsMarkets["steth-eur"].addresses.priceOracle,
      collateralPrice: contractsMarkets["steth-eur"].addresses.collateralPrice,
      feeReceiver: contractsMarkets["steth-eur"].addresses.feeReceiver,
      collateralToken: contractsMarkets["steth-eur"].addresses.collateralToken,
      wrappedCollateralToken: contractsMarkets["steth-eur"].addresses.wrappedCollateralToken,
      genesisZap: contractsMarkets["steth-eur"].addresses.genesisZap, // GenesisETHZap_v4 for EUR
    },
    peggedToken: {
      name: "Harbor Anchored EUR",
      symbol: "haEUR",
      description: "Pegged token (fetched from contract)",
    },
    leveragedToken: {
      name: "Harbor Sail stETH-EUR",
      symbol: "hsSTETH-EUR",
      description: "Leveraged token (fetched from contract)",
    },
    rewardPoints: {
      pointsPerDollar: 100,
      description: "100 ledger marks per dollar deposited at the end of genesis",
    },
    marksCampaign: {
      id: "euro-maiden-voyage",
      label: "Euro Maiden Voyage",
    },
    coinGeckoId: "wrapped-steth",
    genesis: {
      startDate: contractsMarkets["steth-eur"].genesis.startDate,
      endDate: contractsMarkets["steth-eur"].genesis.endDate,
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
  "fxusd-eur": {
    name: "fxUSD-EUR",
    status: "genesis" as const,
    pegTarget: "EUR",
    chain: {
      name: "Ethereum",
      logo: "icons/eth.png",
    },
    collateral: {
      symbol: "fxSAVE",
      name: "f(x) USD Saving",
      underlyingSymbol: "fxUSD",
    },
    underlyingCoinGeckoId: "fx-protocol-fxusd",
    acceptedAssets: [
      { symbol: "fxUSD", name: "f(x) USD" },
      { symbol: "fxSAVE", name: "f(x) USD Saving" },
      { symbol: "USDC", name: "USD Coin" },
    ],
    rewardTokens: {
      default: ["fxSAVE"],
      additional: [],
    },
    addresses: {
      minter: contractsMarkets["fxusd-eur"].addresses.minter,
      peggedToken: contractsMarkets["fxusd-eur"].addresses.peggedToken,
      leveragedToken: contractsMarkets["fxusd-eur"].addresses.leveragedToken,
      reservePool: contractsMarkets["fxusd-eur"].addresses.reservePool,
      stabilityPoolManager: "0x756766756880ceA06270Fd507b09Ef32714Ec7C2" as `0x${string}`, // EUR::fxUSD::stabilityPoolManager from harbor_v1.state
      stabilityPoolCollateral: contractsMarkets["fxusd-eur"].addresses.stabilityPoolCollateral,
      stabilityPoolLeveraged: contractsMarkets["fxusd-eur"].addresses.stabilityPoolLeveraged,
      genesis: contractsMarkets["fxusd-eur"].addresses.genesis,
      priceOracle: contractsMarkets["fxusd-eur"].addresses.priceOracle,
      collateralPrice: contractsMarkets["fxusd-eur"].addresses.collateralPrice,
      feeReceiver: contractsMarkets["fxusd-eur"].addresses.feeReceiver,
      collateralToken: contractsMarkets["fxusd-eur"].addresses.collateralToken,
      wrappedCollateralToken: contractsMarkets["fxusd-eur"].addresses.wrappedCollateralToken,
      genesisZap: contractsMarkets["fxusd-eur"].addresses.genesisZap, // GenesisUSDCZap_v4 for EUR
    },
    peggedToken: {
      name: "Harbor Anchored EUR",
      symbol: "haEUR",
      description: "Pegged token (fetched from contract)",
    },
    leveragedToken: {
      name: "Harbor Sail fxUSD-EUR",
      symbol: "hsFXUSD-EUR",
      description: "Leveraged token (fetched from contract)",
    },
    rewardPoints: {
      pointsPerDollar: 100,
      description: "100 ledger marks per dollar deposited at the end of genesis",
    },
    marksCampaign: {
      id: "euro-maiden-voyage",
      label: "Euro Maiden Voyage",
    },
    coinGeckoId: "fx-protocol-fxusd",
    genesis: {
      startDate: contractsMarkets["fxusd-eur"].genesis.startDate,
      endDate: contractsMarkets["fxusd-eur"].genesis.endDate,
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
  "steth-mcap": {
    name: "stETH-MCAP",
    status: "coming-soon" as const,
    pegTarget: "MCAP",
    chain: {
      name: "Ethereum",
      logo: "icons/eth.png",
    },
    collateral: {
      symbol: "wstETH",
      name: "Wrapped stETH",
      underlyingSymbol: "stETH",
    },
    underlyingCoinGeckoId: "wrapped-steth",
    acceptedAssets: [
      { symbol: "stETH", name: "Lido Staked ETH" },
      { symbol: "wstETH", name: "Wrapped stETH" },
      { symbol: "ETH", name: "Ethereum" },
    ],
    rewardTokens: {
      default: ["wstETH"],
      additional: [],
    },
    addresses: {
      minter: contractsMarkets["steth-mcap"].addresses.minter,
      peggedToken: contractsMarkets["steth-mcap"].addresses.peggedToken,
      leveragedToken: contractsMarkets["steth-mcap"].addresses.leveragedToken,
      reservePool: contractsMarkets["steth-mcap"].addresses.reservePool,
      stabilityPoolManager: "0x1298ab1957ee023E228d57bE2db73494b649E52F" as `0x${string}`,
      stabilityPoolCollateral: contractsMarkets["steth-mcap"].addresses.stabilityPoolCollateral,
      stabilityPoolLeveraged: contractsMarkets["steth-mcap"].addresses.stabilityPoolLeveraged,
      genesis: contractsMarkets["steth-mcap"].addresses.genesis,
      priceOracle: contractsMarkets["steth-mcap"].addresses.priceOracle,
      collateralPrice: contractsMarkets["steth-mcap"].addresses.collateralPrice,
      feeReceiver: contractsMarkets["steth-mcap"].addresses.feeReceiver,
      collateralToken: contractsMarkets["steth-mcap"].addresses.collateralToken,
      wrappedCollateralToken: contractsMarkets["steth-mcap"].addresses.wrappedCollateralToken,
    },
    peggedToken: {
      name: "Harbor Anchored MCAP",
      symbol: "haMCAP",
      description: "Pegged token (coming soon)",
    },
    leveragedToken: {
      name: "Harbor Sail stETH-MCAP",
      symbol: "hsSTETH-MCAP",
      description: "Leveraged token (coming soon)",
    },
    rewardPoints: {
      pointsPerDollar: 100,
      description: "100 ledger marks per dollar deposited at the end of genesis",
    },
    marksCampaign: {
      id: "mcap-maiden-voyage",
      label: "MCAP Maiden Voyage",
    },
    coinGeckoId: "wrapped-steth",
    genesis: {
      startDate: contractsMarkets["steth-mcap"].genesis.startDate,
      endDate: contractsMarkets["steth-mcap"].genesis.endDate,
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
  "fxusd-mcap": {
    name: "fxUSD-MCAP",
    status: "coming-soon" as const,
    pegTarget: "MCAP",
    chain: {
      name: "Ethereum",
      logo: "icons/eth.png",
    },
    collateral: {
      symbol: "fxSAVE",
      name: "f(x) USD Saving",
      underlyingSymbol: "fxUSD",
    },
    underlyingCoinGeckoId: "fx-protocol-fxusd",
    acceptedAssets: [
      { symbol: "fxUSD", name: "f(x) USD" },
      { symbol: "fxSAVE", name: "f(x) USD Saving" },
      { symbol: "USDC", name: "USD Coin" },
    ],
    rewardTokens: {
      default: ["fxSAVE"],
      additional: [],
    },
    addresses: {
      minter: contractsMarkets["fxusd-mcap"].addresses.minter,
      peggedToken: contractsMarkets["fxusd-mcap"].addresses.peggedToken,
      leveragedToken: contractsMarkets["fxusd-mcap"].addresses.leveragedToken,
      reservePool: contractsMarkets["fxusd-mcap"].addresses.reservePool,
      stabilityPoolManager: "0x52DC69cbdC6Ef508b7419A456dD36967DAEfD538" as `0x${string}`,
      stabilityPoolCollateral: contractsMarkets["fxusd-mcap"].addresses.stabilityPoolCollateral,
      stabilityPoolLeveraged: contractsMarkets["fxusd-mcap"].addresses.stabilityPoolLeveraged,
      genesis: contractsMarkets["fxusd-mcap"].addresses.genesis,
      priceOracle: contractsMarkets["fxusd-mcap"].addresses.priceOracle,
      collateralPrice: contractsMarkets["fxusd-mcap"].addresses.collateralPrice,
      feeReceiver: contractsMarkets["fxusd-mcap"].addresses.feeReceiver,
      collateralToken: contractsMarkets["fxusd-mcap"].addresses.collateralToken,
      wrappedCollateralToken: contractsMarkets["fxusd-mcap"].addresses.wrappedCollateralToken,
    },
    peggedToken: {
      name: "Harbor Anchored MCAP",
      symbol: "haMCAP",
      description: "Pegged token (coming soon)",
    },
    leveragedToken: {
      name: "Harbor Sail fxUSD-MCAP",
      symbol: "hsFXUSD-MCAP",
      description: "Leveraged token (coming soon)",
    },
    rewardPoints: {
      pointsPerDollar: 100,
      description: "100 ledger marks per dollar deposited at the end of genesis",
    },
    marksCampaign: {
      id: "mcap-maiden-voyage",
      label: "MCAP Maiden Voyage",
    },
    coinGeckoId: "fx-protocol-fxusd",
    genesis: {
      startDate: contractsMarkets["fxusd-mcap"].genesis.startDate,
      endDate: contractsMarkets["fxusd-mcap"].genesis.endDate,
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
  "steth-silver": {
    name: "stETH-SILVER",
    status: "coming-soon" as const,
    pegTarget: "SILVER",
    chain: {
      name: "Ethereum",
      logo: "icons/eth.png",
    },
    collateral: {
      symbol: "wstETH",
      name: "Wrapped stETH",
      underlyingSymbol: "stETH",
    },
    underlyingCoinGeckoId: "wrapped-steth",
    acceptedAssets: [
      { symbol: "stETH", name: "Lido Staked ETH" },
      { symbol: "wstETH", name: "Wrapped stETH" },
      { symbol: "ETH", name: "Ethereum" },
    ],
    rewardTokens: {
      default: ["wstETH"],
      additional: [],
    },
    addresses: {
      minter: contractsMarkets["steth-silver"].addresses.minter,
      peggedToken: contractsMarkets["steth-silver"].addresses.peggedToken,
      leveragedToken: contractsMarkets["steth-silver"].addresses.leveragedToken,
      reservePool: contractsMarkets["steth-silver"].addresses.reservePool,
      stabilityPoolManager: "0xbA6b54ED8D76bD4f6B4efD4f1f2344B2Ec386c3E" as `0x${string}`,
      stabilityPoolCollateral: contractsMarkets["steth-silver"].addresses.stabilityPoolCollateral,
      stabilityPoolLeveraged: contractsMarkets["steth-silver"].addresses.stabilityPoolLeveraged,
      genesis: contractsMarkets["steth-silver"].addresses.genesis,
      priceOracle: contractsMarkets["steth-silver"].addresses.priceOracle,
      collateralPrice: contractsMarkets["steth-silver"].addresses.collateralPrice,
      feeReceiver: contractsMarkets["steth-silver"].addresses.feeReceiver,
      collateralToken: contractsMarkets["steth-silver"].addresses.collateralToken,
      wrappedCollateralToken: contractsMarkets["steth-silver"].addresses.wrappedCollateralToken,
    },
    peggedToken: {
      name: "Harbor Anchored SILVER",
      symbol: "haSILVER",
      description: "Pegged token (coming soon)",
    },
    leveragedToken: {
      name: "Harbor Sail stETH-SILVER",
      symbol: "hsSTETH-SILVER",
      description: "Leveraged token (coming soon)",
    },
    rewardPoints: {
      pointsPerDollar: 100,
      description: "100 ledger marks per dollar deposited at the end of genesis",
    },
    marksCampaign: {
      id: "metals-maiden-voyage",
      label: "Metals Maiden Voyage",
    },
    coinGeckoId: "wrapped-steth",
    genesis: {
      startDate: contractsMarkets["steth-silver"].genesis.startDate,
      endDate: contractsMarkets["steth-silver"].genesis.endDate,
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
  "fxusd-silver": {
    name: "fxUSD-SILVER",
    status: "coming-soon" as const,
    pegTarget: "SILVER",
    chain: {
      name: "Ethereum",
      logo: "icons/eth.png",
    },
    collateral: {
      symbol: "fxSAVE",
      name: "f(x) USD Saving",
      underlyingSymbol: "fxUSD",
    },
    underlyingCoinGeckoId: "fx-protocol-fxusd",
    acceptedAssets: [
      { symbol: "fxUSD", name: "f(x) USD" },
      { symbol: "fxSAVE", name: "f(x) USD Saving" },
      { symbol: "USDC", name: "USD Coin" },
    ],
    rewardTokens: {
      default: ["fxSAVE"],
      additional: [],
    },
    addresses: {
      minter: contractsMarkets["fxusd-silver"].addresses.minter,
      peggedToken: contractsMarkets["fxusd-silver"].addresses.peggedToken,
      leveragedToken: contractsMarkets["fxusd-silver"].addresses.leveragedToken,
      reservePool: contractsMarkets["fxusd-silver"].addresses.reservePool,
      stabilityPoolManager: "0x1EF76C3f4B426dFeC271a8a3904035dE0A6E6d75" as `0x${string}`,
      stabilityPoolCollateral: contractsMarkets["fxusd-silver"].addresses.stabilityPoolCollateral,
      stabilityPoolLeveraged: contractsMarkets["fxusd-silver"].addresses.stabilityPoolLeveraged,
      genesis: contractsMarkets["fxusd-silver"].addresses.genesis,
      priceOracle: contractsMarkets["fxusd-silver"].addresses.priceOracle,
      collateralPrice: contractsMarkets["fxusd-silver"].addresses.collateralPrice,
      feeReceiver: contractsMarkets["fxusd-silver"].addresses.feeReceiver,
      collateralToken: contractsMarkets["fxusd-silver"].addresses.collateralToken,
      wrappedCollateralToken: contractsMarkets["fxusd-silver"].addresses.wrappedCollateralToken,
    },
    peggedToken: {
      name: "Harbor Anchored SILVER",
      symbol: "haSILVER",
      description: "Pegged token (coming soon)",
    },
    leveragedToken: {
      name: "Harbor Sail fxUSD-SILVER",
      symbol: "hsFXUSD-SILVER",
      description: "Leveraged token (coming soon)",
    },
    rewardPoints: {
      pointsPerDollar: 100,
      description: "100 ledger marks per dollar deposited at the end of genesis",
    },
    marksCampaign: {
      id: "metals-maiden-voyage",
      label: "Metals Maiden Voyage",
    },
    coinGeckoId: "fx-protocol-fxusd",
    genesis: {
      startDate: contractsMarkets["fxusd-silver"].genesis.startDate,
      endDate: contractsMarkets["fxusd-silver"].genesis.endDate,
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
  }),
} as const;

export type Market = (typeof markets)[keyof typeof markets];

// Helper functions for genesis status
export function getGenesisStatus(
  market: Market | undefined,
  onChainGenesisEnded: boolean,
  isAdmin: boolean = false
) {
  if (!market) {
    return {
      phase: "unknown" as const,
      onChainStatus: "unknown" as const,
      canClaim: false,
      canDeposit: false,
      canWithdraw: false,
    };
  }
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

export function isGenesisActive(market: Market | undefined) {
  const status = getGenesisStatus(market, false);
  return status.phase === "live";
}

export function getPrimaryRewardToken(market: Market) {
  return (market as any).rewardToken;
}

export function getRewardPoints(market: Market) {
  return (market as any).rewardPoints;
}
