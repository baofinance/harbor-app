// GraphQL configuration for Harbor subgraphs

export const GRAPH_CONFIG = {
  // Harbor Marks subgraph (for marks tracking)
  marks: {
    url:
      process.env.NEXT_PUBLIC_GRAPH_URL ||
      "https://api.studio.thegraph.com/query/1718836/harbor-marks/v0.0.6",
    chainId: 1,
    network: "mainnet",
  },
  // Sail Token Price subgraph (for price history and PnL)
  sailPrice: {
    url:
      process.env.NEXT_PUBLIC_SAIL_PRICE_GRAPH_URL ||
      "https://api.studio.thegraph.com/query/1718836/sail-token-price/v0.0.1",
    chainId: 1,
    network: "mainnet",
  },
  // Alias for backward compatibility
  production: {
    url:
      process.env.NEXT_PUBLIC_GRAPH_URL ||
      "https://api.studio.thegraph.com/query/1718836/harbor-marks/v0.0.6",
    chainId: 1,
    network: "mainnet",
  },
};

// stETH Market Contracts
export const CONTRACTS = {
  genesis: "0x1454707877cdb966e29cea8a190c2169eeca4b8c",
  minter: "0x8b17b6e8f9ce3477ddaf372a4140ac6005787901",
  peggedToken: "0x6ff0fe773d4ad4ea923ba9ea9cc1c1b42b70f5fc", // haUSD-stETH
  leveragedToken: "0x469ddfcfa98d0661b7efedc82aceeab84133f7fe", // hsUSD-stETH
  collateralToken: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84", // stETH (mainnet)
  wrappedCollateralToken: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0", // wstETH (mainnet)
  stabilityPoolCollateral: "0xac8113ef28c8ef06064e8d78b69890d670273c73",
  stabilityPoolLeveraged: "0x6738c3ee945218fb80700e2f4c1a5f3022a28c8d",
};

// WBTC Market Contracts
export const CONTRACTS_WBTC = {
  genesis: "0x0569ebf818902e448235592f86e63255bbe64fd3",
  minter: "0xa9434313a4b9a4d624c6d67b1d61091b159f5a77",
  peggedToken: "0x6ff0fe773d4ad4ea923ba9ea9cc1c1b42b70f5fc", // haUSD-stETH (shared)
  leveragedToken: "0x03fd55f80277c13bb17739190b1e086b836c9f20", // hsUSD-WBTC
  collateralToken: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", // WBTC
  wrappedCollateralToken: "0x5ee5bf7ae06d1be5997a1a72006fe6c607ec6de8", // Wrapped WBTC
  stabilityPoolCollateral: "0x39613a4c9582dea56f9ee8ad0351011421c3593a",
  stabilityPoolLeveraged: "0xfc2145de73ec53e34c4e6809b56a61321315e806",
};

// Get the Graph URL for marks (always production/mainnet)
export const getGraphUrl = (): string => {
  return process.env.NEXT_PUBLIC_GRAPH_URL || GRAPH_CONFIG.marks.url;
};

// Get the Sail Price Graph URL (for price history and PnL)
export const getSailPriceGraphUrl = (): string => {
  return process.env.NEXT_PUBLIC_SAIL_PRICE_GRAPH_URL || GRAPH_CONFIG.sailPrice.url;
};
