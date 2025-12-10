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
  genesis: "0xa25b38aa76ae58ec8683ec9a9057afbe34c765e9",
  minter: "0x980d1d2c22fadc8fff8fb3e3261037a75cc7cd3f",
  peggedToken: "0xad91b3c34e4e17b2d22c53c25d9873ff22395ec3",
  leveragedToken: "0xbc63dc67b78925d8d593af8708aceb14125e8d5f",
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
