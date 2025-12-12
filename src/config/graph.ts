// GraphQL configuration for Harbor Marks subgraph

export const GRAPH_CONFIG = {
  // Production (mainnet)
  production: {
    url:
      process.env.NEXT_PUBLIC_GRAPH_URL ||
      "https://api.studio.thegraph.com/query/<your-subgraph-id>/<your-subgraph-name>/latest",
    chainId: 1,
    network: "mainnet",
  },
};

export const CONTRACTS = {
  genesis: "0x1454707877cdb966e29cea8a190c2169eeca4b8c",
  minter: "0x8b17b6e8f9ce3477ddaf372a4140ac6005787901",
  peggedToken: "0x6ff0fe773d4ad4ea923ba9ea9cc1c1b42b70f5fc",
  leveragedToken: "0x469ddfcfa98d0661b7efedc82aceeab84133f7fe",
  collateralToken: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0", // wstETH (mainnet)
  wrappedCollateralToken: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84", // stETH (mainnet)
};

// Get the Graph URL (always production/mainnet)
export const getGraphUrl = (): string => {
  return process.env.NEXT_PUBLIC_GRAPH_URL || GRAPH_CONFIG.production.url;
};
