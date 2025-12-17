# Contract Addresses Configuration Guide

This document outlines all contract addresses required in the config to make the Harbor app work with a new deployment.

## File Locations

- **Shared contracts**: `src/config/contracts.ts` (in the `contracts` object)
- **Market-specific addresses**: `src/config/markets.ts` (in each market's `addresses` object)

## Required Contract Addresses

### 1. Shared Contracts (`src/config/contracts.ts`)

These are shared across all markets and should be set in the `contracts` object:

```typescript
export const contracts = {
  minter: "0x...", // Minter contract (can be market-specific)
  peggedToken: "0x...", // Pegged token contract (can be market-specific)
  leveragedToken: "0x...", // Leveraged token contract (can be market-specific)
  steam: "0x...", // STEAM token contract
  veSteam: "0x...", // veSTEAM token contract
  reservePool: "0x...", // Reserve pool contract
  stabilityPoolManager: "0x...", // Stability pool manager contract
  genesis: "0x...", // Genesis contract (can be market-specific)
  priceOracle: "0x...", // Price oracle contract (can be market-specific)
  feeReceiver: "0x...", // Fee receiver contract
  gaugeController: "0x...", // Gauge controller contract
  steamMinter: "0x...", // STEAM minter contract
  collateralToken: "0x...", // Collateral token (e.g., stETH)
  wrappedCollateralToken: "0x...", // Wrapped collateral token (e.g., wstETH)
} as const;
```

### 2. Market-Specific Addresses (`src/config/markets.ts`)

Each market in the `markets` object needs an `addresses` object with the following:

#### Required Addresses (Core Functionality)

```typescript
addresses: {
  // Core contracts
  minter: "0x...",                    // Minter contract for this market
  peggedToken: "0x...",               // Pegged token (haETH, haBTC, etc.)
  leveragedToken: "0x...",            // Leveraged token (Sail token)
  collateralToken: "0x...",           // Collateral token (fxSAVE, wstETH, etc.)
  wrappedCollateralToken: "0x...",    // Wrapped collateral token (if applicable)

  // Genesis (if market is in genesis status)
  genesis: "0x...",                   // Genesis contract for this market

  // Price feeds
  priceOracle: "0x...",               // Price oracle for this market
  collateralPrice: "0x...",          // Collateral price oracle (Chainlink or similar)

  // Stability pools
  stabilityPoolCollateral: "0x...",   // Collateral stability pool
  stabilityPoolLeveraged: "0x...",   // Leveraged (Sail) stability pool

  // Fee management
  feeReceiver: "0x...",               // Fee receiver for this market

  // Optional but commonly used
  reservePool: "0x...",               // Reserve pool
  stabilityPoolManager: "0x...",     // Stability pool manager
  steam: "0x...",                     // STEAM token (if used)
  veSteam: "0x...",                   // veSTEAM token (if used)
}
```

## Address Usage by Feature

### Anchor Page (Minting & Stability Pools)

- ✅ `minter` - Required for minting pegged tokens
- ✅ `peggedToken` - Required for displaying ha token balances
- ✅ `collateralToken` - Required for deposit asset selection
- ✅ `stabilityPoolCollateral` - Required for collateral stability pool deposits
- ✅ `stabilityPoolLeveraged` - Required for Sail stability pool deposits
- ✅ `collateralPrice` - Required for price calculations and collateral ratio
- ✅ `priceOracle` - Used for price feeds

### Genesis/Maiden Voyage Page

- ✅ `genesis` - Required for genesis deposits and claims
- ✅ `collateralToken` - Required for deposits
- ✅ `peggedToken` - Required for token distribution
- ✅ `leveragedToken` - Required for token distribution

### Sail Page

- ✅ `leveragedToken` - Required for Sail token operations
- ✅ `minter` - Required for minting Sail tokens
- ✅ `collateralToken` - Required for collateral operations

### Admin Pages

- ✅ `genesis` - Required for admin operations (owner check)
- ✅ `collateralToken` - Required for balance checks

## Important Notes

1. **Market-Specific vs Shared**:

   - Some contracts (like `minter`, `peggedToken`, `genesis`) can be shared across markets or market-specific
   - The current config uses shared contracts from `contracts.ts`, but you can override them per-market

2. **Optional Addresses**:

   - `stabilityPoolCollateral` and `stabilityPoolLeveraged` are optional - the app checks for their existence before using them
   - If a stability pool doesn't exist, that feature won't be available for that market

3. **Address Format**:

   - All addresses must be valid Ethereum addresses (0x followed by 40 hex characters)
   - TypeScript type: `0x${string}`

4. **Collateral Price Oracle**:
   - The `collateralPrice` address is used for fetching collateral prices
   - This is typically a Chainlink price feed contract
   - Required for calculating USD values and collateral ratios

## Example Configuration

```typescript
// In src/config/markets.ts
export const markets = {
  "usd-eth": {
    name: "USD/ETH",
    status: "genesis" as const,
    // ... other config ...
    addresses: {
      minter: "0xE41bBcf8ec773B477735b0b0D8bF6E7Ca6BDe9Ee",
      peggedToken: "0x6c7Df3575f1d69eb3B245A082937794794C2b82E",
      leveragedToken: "0x74ef79CFC735A10436eF9D4808547df0Ce38f788",
      collateralToken: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
      wrappedCollateralToken: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
      genesis: "0x49c58c6BE0680Eb756595c0F59ab3E0b6e1624cd",
      priceOracle: "0x2C834EFcDd2E9D04C1a34367BA9D8aa587F90fBe",
      collateralPrice: "0xCfE54B5cD566aB89272946F602D76Ea879CAb4a8",
      stabilityPoolCollateral: "0xF0F53654c24ae511099D032020975C4baa273d12",
      stabilityPoolLeveraged: "0x59D0e1Cd1b5521E8F21AcA6B8Fd95181297E2784",
      feeReceiver: "0x3A5fBC501c5D515383fADFf5ebD92C393f5eFee9",
      reservePool: "0x289BD64Deb826c134dA670f8B759FB4CA018dF4B",
      stabilityPoolManager: "0xeC67cF0755c0A5aaD6C4A4235fDfA35c1EFEA6A9",
    },
    // ... rest of market config ...
  },
};
```

## Quick Checklist for New Deployment

- [ ] Update `contracts.ts` with shared contract addresses
- [ ] For each market in `markets.ts`:
  - [ ] Set `minter` address
  - [ ] Set `peggedToken` address
  - [ ] Set `leveragedToken` address (if using Sail tokens)
  - [ ] Set `collateralToken` address
  - [ ] Set `genesis` address (if market is in genesis status)
  - [ ] Set `priceOracle` address
  - [ ] Set `collateralPrice` address (Chainlink price feed)
  - [ ] Set `stabilityPoolCollateral` address (if using collateral pools)
  - [ ] Set `stabilityPoolLeveraged` address (if using Sail pools)
  - [ ] Set `feeReceiver` address
  - [ ] Set `reservePool` address (if applicable)
  - [ ] Set `stabilityPoolManager` address (if applicable)










