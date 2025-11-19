// GraphQL configuration for Harbor Marks subgraph

export const GRAPH_CONFIG = {
  // Local development
  local: {
    url: 'http://localhost:8000/subgraphs/name/harbor-marks-local',
    chainId: 31337,
    network: 'anvil',
  },
  // Production (when deployed to The Graph Network)
  production: {
    url: process.env.NEXT_PUBLIC_GRAPH_URL || 'https://api.studio.thegraph.com/query/<your-subgraph-id>/<your-subgraph-name>/latest',
    chainId: 1, // or your production chain ID
    network: 'mainnet',
  },
};

export const CONTRACTS = {
  genesis: '0x67d269191c92Caf3cD7723F116c85e6E9bf55933',
  minter: '0x4A679253410272dd5232B3Ff7cF5dbB88f295319',
  peggedToken: '0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1',
  leveragedToken: '0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44',
  collateralToken: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
  wrappedCollateralToken: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
};

// Get the appropriate Graph URL based on environment
export const getGraphUrl = (): string => {
  // Check if we're in development (localhost) or production
  const isLocal = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  
  if (isLocal) {
    return process.env.NEXT_PUBLIC_GRAPH_URL || GRAPH_CONFIG.local.url;
  }
  
  return process.env.NEXT_PUBLIC_GRAPH_URL || GRAPH_CONFIG.production.url;
};

