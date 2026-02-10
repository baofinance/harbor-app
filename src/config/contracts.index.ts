// Contract configuration switcher
// Use NEXT_PUBLIC_USE_TEST2_CONTRACTS=true to switch to test2 contracts
// Default: production contracts
//
// To switch to test2 contracts:
//   1. Set environment variable: NEXT_PUBLIC_USE_TEST2_CONTRACTS=true
//   2. Restart your dev server
//
// To switch back to production:
//   1. Remove or set: NEXT_PUBLIC_USE_TEST2_CONTRACTS=false
//   2. Restart your dev server

import * as productionContracts from "./contracts";
import { markets as test2Markets, contracts as test2Contracts } from "./contracts.test2";

// Check if we should use test2 contracts
const useTest2 = process.env.NEXT_PUBLIC_USE_TEST2_CONTRACTS === "true";

// Export the appropriate config based on environment variable
export const markets = useTest2 ? test2Markets : productionContracts.markets;
export const contracts = useTest2 ? test2Contracts : productionContracts.contracts;

// Re-export everything else from production contracts (ABIs, types, etc.)
// These are the same for both production and test2
export const {
  CONTRACTS,
  STABILITY_POOL_MANAGER_ABI,
  GENESIS_ABI,
  ERC20_ABI,
  minterABI,
} = productionContracts;

// Re-export types
export type { MarketConfig, Markets, PriceDataPoint, TokenPriceHistory } from "./contracts";

// Log which config is being used (only in development)
if (process.env.NODE_ENV === "development") {
  console.log(`[Contracts] Using ${useTest2 ? "TEST2" : "PRODUCTION"} contracts`);
  if (useTest2) {
    console.log(`[Contracts] Test2 markets: ${Object.keys(test2Markets).join(", ")}`);
  }
}

