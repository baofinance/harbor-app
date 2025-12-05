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
  genesis: "0xA4899D35897033b927acFCf422bc745916139776",
  minter: "0x7a9ec1d04904907de0ed7b6839ccdd59c3716ac9",
  peggedToken: "0x1c85638e118b37167e9298c2268758e058DdfDA0", // haPB (Harbor Anchored PB)
  leveragedToken: "0x367761085BF3C12e5DA2Df99AC6E1a824612b8fb", // hsPB (Harbor Sail)
  collateralToken: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707", // stETH
  wrappedCollateralToken: "0x0165878A594ca255338adfa4d48449f69242Eb8F", // wstETH
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
