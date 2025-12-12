// GraphQL configuration for Harbor Marks subgraph

export const GRAPH_CONFIG = {
  // Production (mainnet)
  production: {
    url:
      process.env.NEXT_PUBLIC_GRAPH_URL ||
      "https://api.studio.thegraph.com/query/1718836/harbor-marks/v0.0.1",
    chainId: 1,
    network: "mainnet",
  },
};

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

// Get the Graph URL (always production/mainnet)
export const getGraphUrl = (): string => {
  return process.env.NEXT_PUBLIC_GRAPH_URL || GRAPH_CONFIG.production.url;
};
