// GraphQL configuration for Harbor Marks subgraph

export const GRAPH_CONFIG = {
  // Local development
  local: {
    url: "http://localhost:8000/subgraphs/name/harbor-marks-local",
    chainId: 31337,
    network: "anvil",
  },
  // Production (when deployed to The Graph Network)
  production: {
    url:
      process.env.NEXT_PUBLIC_GRAPH_URL ||
      "https://api.studio.thegraph.com/query/<your-subgraph-id>/<your-subgraph-name>/latest",
    chainId: 1, // or your production chain ID
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

// Get the appropriate Graph URL based on environment
export const getGraphUrl = (): string => {
  // Check if we're in development (localhost) or production
  const isLocal =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  if (isLocal) {
    return process.env.NEXT_PUBLIC_GRAPH_URL || GRAPH_CONFIG.local.url;
  }

  return process.env.NEXT_PUBLIC_GRAPH_URL || GRAPH_CONFIG.production.url;
};
