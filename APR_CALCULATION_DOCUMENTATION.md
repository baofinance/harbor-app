# APR Calculation Documentation

## Overview

This document explains how APY/APR is calculated for collateral pools and stability pools in the Harbor DApp. There are three main calculation methods used.

---

## 1. Contract APR (On-chain) — `getAPRBreakdown()`

### Description
- **On-chain call** to stability pool contracts
- Returns: `[collateralTokenAPR, steamTokenAPR]` (both in 16 decimals, e.g., `1e16 = 1%`)
- Used for:
  - **Collateral Pool APR**: `collateralPoolAPR.collateral + collateralPoolAPR.steam`
  - **Sail Pool APR**: `sailPoolAPR.collateral + sailPoolAPR.steam`

### Code Location
- `src/app/anchor/page.tsx` lines 2044-2052 (Collateral Pool)
- `src/app/anchor/page.tsx` lines 2281-2289 (Sail Pool)

### Code Snippet

**Collateral Pool APR:**
```typescript
// Location: src/app/anchor/page.tsx lines 2044-2052
const collateralAPRResult = reads?.[currentOffset + 1]
  ?.result as [bigint, bigint] | undefined;
collateralPoolAPR = collateralAPRResult
  ? {
      collateral:
        (Number(collateralAPRResult[0]) / 1e16) * 100,
      steam: (Number(collateralAPRResult[1]) / 1e16) * 100,
    }
  : undefined;
```

**Sail Pool APR:**
```typescript
// Location: src/app/anchor/page.tsx lines 2281-2289
const sailAPRResult = reads?.[currentOffset + 1]
  ?.result as [bigint, bigint] | undefined;
sailPoolAPR = sailAPRResult
  ? {
      collateral: (Number(sailAPRResult[0]) / 1e16) * 100,
      steam: (Number(sailAPRResult[1]) / 1e16) * 100,
    }
  : undefined;
```

**ABI Definition:**
```typescript
// Location: src/abis/apr.ts
export const aprABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "getAPRBreakdown",
    outputs: [
      { name: "collateralTokenAPR", type: "uint256" },
      { name: "steamTokenAPR", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
```

---

## 2. Reward Rate APR (On-chain + Client-side Calculation)

### Description
- **On-chain call**: `rewardData(tokenAddress)` returns `[lastUpdate, finishAt, rate, queued]`
- **Client-side calculation**: APR is calculated from the reward rate
- **Used as**: Fallback/addition when contract APR is 0 or missing

### Formula
```
APR = (rewardRate * SECONDS_PER_YEAR / poolTVL) * (rewardTokenPrice / depositTokenPrice) * 100

Where:
- rewardRate = collateralRewardData[2] or sailRewardData[2] (the 'rate' field)
- SECONDS_PER_YEAR = 365 * 24 * 60 * 60 = 31,536,000
- poolTVL = collateralPoolTVL or sailPoolTVL
- rewardTokenPrice = peggedTokenPrice / 1e18 (USD)
- depositTokenPrice = peggedTokenPrice / 1e18 (USD)
```

### Code Locations
1. `src/hooks/usePoolRewardAPR.ts` (lines 74-148) - Generic hook for any pool
2. `src/app/anchor/page.tsx` (lines 2072-2132) - Collateral Pool calculation
3. `src/app/anchor/page.tsx` (lines 2241-2302) - Sail Pool calculation
4. `src/hooks/anchor/useAnchorMarketData.ts` (lines 350-412) - Market data processing

---

### Code Snippet 1: usePoolRewardAPR.ts

**On-chain call:**
```typescript
// Location: src/hooks/usePoolRewardAPR.ts lines 74-81
// Get reward data (rate)
const [lastUpdate, finishAt, rate, queued] =
  (await client.readContract({
    address: poolAddress,
    abi: STABILITY_POOL_ABI,
    functionName: "rewardData",
    args: [tokenAddress],
  })) as [bigint, bigint, bigint, bigint];
```

**Client-side APR calculation:**
```typescript
// Location: src/hooks/usePoolRewardAPR.ts lines 132-148
// Calculate APR from reward rate
const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
const ratePerTokenPerSecond = Number(rate) / Number(poolTVL);
const annualRewards =
  ratePerTokenPerSecond * Number(poolTVL) * SECONDS_PER_YEAR;

// Calculate USD values
const depositTokenPrice = peggedTokenPrice
  ? Number(peggedTokenPrice) / 1e18
  : 1; // Default to $1 if price unavailable
const annualRewardsValueUSD = (annualRewards * tokenPrice) / 1e18;
const depositValueUSD = (Number(poolTVL) * depositTokenPrice) / 1e18;

let apr = 0;
if (depositValueUSD > 0) {
  apr = (annualRewardsValueUSD / depositValueUSD) * 100;
}
```

---

### Code Snippet 2: anchor/page.tsx - Collateral Pool

**On-chain call:**
```typescript
// Location: src/app/anchor/page.tsx lines 2072-2084
// Read reward data for APR fallback calculation
const collateralRewardDataRead = currentPeggedTokenAddress
  ? reads?.[currentOffset + 4]
  : undefined;
const collateralRewardData =
  collateralRewardDataRead?.status === "success" &&
  collateralRewardDataRead.result
    ? (collateralRewardDataRead.result as [
        bigint,
        bigint,
        bigint,
        bigint
      ]) // [lastUpdate, finishAt, rate, queued]
    : undefined;
```

**Client-side APR calculation:**
```typescript
// Location: src/app/anchor/page.tsx lines 2086-2132
// Calculate APR from reward rate if contract APR is 0 or undefined
if (
  collateralRewardData &&
  collateralPoolTVL &&
  collateralPoolTVL > 0n &&
  peggedTokenPrice
) {
  const rewardRate = collateralRewardData[2]; // rate
  if (rewardRate > 0n) {
    const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
    const ratePerTokenPerSecond =
      Number(rewardRate) / Number(collateralPoolTVL);
    const annualRewards =
      ratePerTokenPerSecond *
      Number(collateralPoolTVL) *
      SECONDS_PER_YEAR;

    const rewardTokenPrice = Number(peggedTokenPrice) / 1e18; // pegged token price in USD
    const depositTokenPrice = Number(peggedTokenPrice) / 1e18; // same for collateral pool
    const annualRewardsValueUSD =
      (annualRewards * rewardTokenPrice) / 1e18;
    const depositValueUSD =
      (Number(collateralPoolTVL) * depositTokenPrice) / 1e18;

    if (depositValueUSD > 0) {
      const calculatedAPR =
        (annualRewardsValueUSD / depositValueUSD) * 100;

      // Add to existing APR (don't replace, accumulate)
      if (calculatedAPR > 0) {
        if (!collateralPoolAPR) {
          collateralPoolAPR = {
            collateral: calculatedAPR,
            steam: 0,
          };
        } else {
          // Add to existing APR
          collateralPoolAPR = {
            collateral:
              (collateralPoolAPR.collateral || 0) +
              calculatedAPR,
            steam: collateralPoolAPR.steam || 0,
          };
        }
      }
    }
  }
}
```

---

### Code Snippet 3: anchor/page.tsx - Sail Pool

**On-chain call:**
```typescript
// Location: src/app/anchor/page.tsx lines 2241-2254
// Read reward data for APR fallback calculation
const sailRewardDataRead = currentPeggedTokenAddress
  ? reads?.[currentOffset + 4]
  : undefined;
const sailRewardData =
  sailRewardDataRead?.status === "success" &&
  sailRewardDataRead.result
    ? (sailRewardDataRead.result as [
        bigint,
        bigint,
        bigint,
        bigint
      ]) // [lastUpdate, finishAt, rate, queued]
    : undefined;
```

**Client-side APR calculation:**
```typescript
// Location: src/app/anchor/page.tsx lines 2256-2302
// Calculate APR from reward rate if contract APR is 0 or undefined
if (
  sailRewardData &&
  sailPoolTVL &&
  sailPoolTVL > 0n &&
  peggedTokenPrice
) {
  const rewardRate = sailRewardData[2]; // rate
  if (rewardRate > 0n) {
    const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
    const ratePerTokenPerSecond =
      Number(rewardRate) / Number(sailPoolTVL);
    const annualRewards =
      ratePerTokenPerSecond *
      Number(sailPoolTVL) *
      SECONDS_PER_YEAR;

    const rewardTokenPrice = Number(peggedTokenPrice) / 1e18; // pegged token price in USD
    const depositTokenPrice = Number(peggedTokenPrice) / 1e18; // same for sail pool
    const annualRewardsValueUSD =
      (annualRewards * rewardTokenPrice) / 1e18;
    const depositValueUSD =
      (Number(sailPoolTVL) * depositTokenPrice) / 1e18;

    if (depositValueUSD > 0) {
      const calculatedAPR =
        (annualRewardsValueUSD / depositValueUSD) * 100;

      // Add to existing APR (don't replace, accumulate)
      if (calculatedAPR > 0) {
        if (!sailPoolAPR) {
          sailPoolAPR = {
            collateral: calculatedAPR,
            steam: 0,
          };
        } else {
          // Add to existing APR
          sailPoolAPR = {
            collateral:
              (sailPoolAPR.collateral || 0) + calculatedAPR,
            steam: sailPoolAPR.steam || 0,
          };
        }
      }
    }
  }
}
```

---

### Code Snippet 4: useAnchorMarketData.ts

**On-chain call:**
```typescript
// Location: src/hooks/anchor/useAnchorMarketData.ts lines 350-362
const collateralRewardDataRead = currentPeggedTokenAddress
  ? reads?.[currentOffset + 5]
  : undefined;
const collateralRewardData =
  collateralRewardDataRead?.status === "success" &&
  collateralRewardDataRead.result
    ? (collateralRewardDataRead.result as [
        bigint,
        bigint,
        bigint,
        bigint
      ]) // [lastUpdate, finishAt, rate, queued]
    : undefined;
```

**Client-side APR calculation:**
```typescript
// Location: src/hooks/anchor/useAnchorMarketData.ts lines 364-412
// Calculate APR from reward rate if contract APR is 0 or undefined
let peggedTokenAPRForCollateral = 0;
if (
  collateralRewardData &&
  collateralPoolTVL &&
  collateralPoolTVL > 0n &&
  peggedTokenPrice
) {
  const rewardRate = collateralRewardData[2]; // rate
  if (rewardRate > 0n) {
    const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
    const ratePerTokenPerSecond =
      Number(rewardRate) / Number(collateralPoolTVL);
    const annualRewards =
      ratePerTokenPerSecond *
      Number(collateralPoolTVL) *
      SECONDS_PER_YEAR;

    const rewardTokenPrice = Number(peggedTokenPrice) / 1e18; // pegged token price in USD
    const depositTokenPrice = Number(peggedTokenPrice) / 1e18; // same for collateral pool
    const annualRewardsValueUSD =
      (annualRewards * rewardTokenPrice) / 1e18;
    const depositValueUSD =
      (Number(collateralPoolTVL) * depositTokenPrice) / 1e18;

    if (depositValueUSD > 0) {
      peggedTokenAPRForCollateral =
        (annualRewardsValueUSD / depositValueUSD) * 100;

      // Add to existing APR (don't replace, accumulate)
      if (peggedTokenAPRForCollateral > 0) {
        if (!collateralPoolAPR) {
          collateralPoolAPR = {
            collateral: peggedTokenAPRForCollateral,
            steam: 0,
          };
        } else {
          // Add to existing APR
          collateralPoolAPR = {
            collateral:
              (collateralPoolAPR.collateral || 0) +
              peggedTokenAPRForCollateral,
            steam: collateralPoolAPR.steam || 0,
          };
        }
      }
    }
  }
}
```

---

## 3. Projected APR (Client-side Calculation)

### Description
- **Calculated from**:
  - `harvestable()` from minter contract (on-chain)
  - `rewardData()` - queued rewards (on-chain)
  - 7-day projection period
  - Pool TVL (on-chain)

### Formula
```
Projected APR = (harvestable + queued) / 7 days * 365 days / poolTVL * 100

Or more specifically:
- rewardsPer7Days = (harvestable + queued) / periodLength * periodLength
- rewardsValueUSD = (rewardsPer7Days / 1e18) * collateralPriceUSD
- depositValueUSD = (poolTVL / 1e18) * collateralPriceUSD
- Projected APR = (rewardsValueUSD / depositValueUSD) * (365 / 7) * 100
```

### Code Location
- `src/hooks/useProjectedAPR.ts` (lines 452-465 for collateral pool, 472-494 for leveraged pool)

### Code Snippet

**On-chain calls:**
```typescript
// Location: src/hooks/useProjectedAPR.ts lines 64-126
// Batch read: Basic contract data
const { data: basicReads, isLoading: isLoadingBasic } = useContractReads({
  contracts: [
    // Minter reads
    {
      address: minterAddress as `0x${string}`,
      abi: MINTER_ABI,
      functionName: "harvestable",
    },
    // Collateral pool reads
    {
      address: collateralPoolAddress as `0x${string}`,
      abi: STABILITY_POOL_ABI,
      functionName: "totalAssetSupply",
    },
    // Leveraged pool reads
    {
      address: leveragedPoolAddress as `0x${string}`,
      abi: STABILITY_POOL_ABI,
      functionName: "totalAssetSupply",
    },
    // ... more reads
  ],
  // ...
});

// Get reward data from pools (for finishAt and queued)
const { data: rewardDataReads, isLoading: isLoadingRewardData } =
  useContractReads({
    contracts: [
      {
        address: collateralPoolAddress as `0x${string}`,
        abi: STABILITY_POOL_ABI,
        functionName: "rewardData",
        args: wrappedCollateralToken ? [wrappedCollateralToken] : undefined,
      },
      {
        address: leveragedPoolAddress as `0x${string}`,
        abi: STABILITY_POOL_ABI,
        functionName: "rewardData",
        args: wrappedCollateralToken ? [wrappedCollateralToken] : undefined,
      },
      {
        address: collateralPoolAddress as `0x${string}`,
        abi: STABILITY_POOL_ABI,
        functionName: "REWARD_PERIOD_LENGTH",
      },
    ],
    // ...
  });
```

**Client-side calculation:**
```typescript
// Location: src/hooks/useProjectedAPR.ts lines 452-465 (Collateral Pool)
// Calculate APR for collateral pool
// APR = (rewardsValue / depositValue) * (365/7) * 100
let collateralPoolAPR: number | null = null;
if (safeCollateralPoolSupply > 0n && collateralPriceUSD > 0) {
  const rewardsPer7Days = Number(projectedCollateralRate) * periodLength;
  const rewardsValueUSD = (rewardsPer7Days / 1e18) * collateralPriceUSD;
  const depositValueUSD =
    (Number(safeCollateralPoolSupply) / 1e18) * collateralPriceUSD;

  if (depositValueUSD > 0) {
    collateralPoolAPR =
      (rewardsValueUSD / depositValueUSD) * (DAYS_PER_YEAR / 7) * 100;
  }
} else if (collateralHasRewardsNoTVL) {
  // No TVL but rewards waiting - signal "10k%+"
  collateralPoolAPR = 10000;
}

// Location: src/hooks/useProjectedAPR.ts lines 472-494 (Leveraged Pool)
// Calculate APR for leveraged pool
let leveragedPoolAPR: number | null = null;
if (safeLeveragedPoolSupply > 0n && collateralPriceUSD > 0) {
  const rewardsPer7Days = Number(projectedLeveragedRate) * periodLength;
  const rewardsValueUSD = (rewardsPer7Days / 1e18) * collateralPriceUSD;
  const depositValueUSD =
    (Number(safeLeveragedPoolSupply) / 1e18) * collateralPriceUSD;

  if (depositValueUSD > 0) {
    leveragedPoolAPR =
      (rewardsValueUSD / depositValueUSD) * (DAYS_PER_YEAR / 7) * 100;
  }
} else if (leveragedHasRewardsNoTVL) {
  // No TVL but rewards waiting - signal "10k%+"
  leveragedPoolAPR = 10000;
}
```

---

## Summary Table

| APR Type | Source | Calculation Method | Code Location |
|----------|--------|-------------------|---------------|
| **Contract APR** | On-chain `getAPRBreakdown()` | Direct contract return (16 decimals) | `src/app/anchor/page.tsx` lines 2044-2052, 2281-2289 |
| **Reward Rate APR** | On-chain `rewardData()` + client calc | `(rate * seconds_per_year / TVL) * price_ratio * 100` | `src/hooks/usePoolRewardAPR.ts` lines 132-148<br>`src/app/anchor/page.tsx` lines 2086-2132, 2256-2302<br>`src/hooks/anchor/useAnchorMarketData.ts` lines 364-412 |
| **Projected APR** | On-chain `harvestable()` + `rewardData()` + client calc | `(harvestable + queued) / 7 days * 365 / TVL * 100` | `src/hooks/useProjectedAPR.ts` lines 452-494 |

---

## Important Notes

1. **All three methods use on-chain data** - Some calculations are done client-side, but all data originates from on-chain contract calls.

2. **Priority order in UI**:
   - **Projected APR** is used when available (most accurate for future rewards)
   - Falls back to **Contract APR + Reward Rate APR** when Projected APR is unavailable

3. **APR accumulation**:
   - Contract APR and Reward Rate APR are **accumulated** (added together), not replaced
   - Multiple reward tokens can contribute to the total APR

4. **Decimal handling**:
   - Contract APR: 16 decimals (`1e16 = 1%`)
   - Reward rates: 18 decimals (standard ERC20)
   - All calculations convert to percentage (multiply by 100)

5. **Price sources**:
   - `peggedTokenPrice`: From minter contract (18 decimals)
   - `collateralPrice`: From price oracle (varies by decimals)
   - Token prices are used to calculate USD values for APR calculations

---

## Contract Addresses

Contract addresses are stored in `src/config/contracts.ts` and can be accessed via the `markets` configuration. The addresses vary by market (ETH/fxUSD, BTC/fxUSD, BTC/stETH, etc.).

### Example: ETH/fxUSD Market (Production v1)

**Location**: `src/config/contracts.ts` lines 118-160

```typescript
"eth-fxusd": {
  addresses: {
    minter: "0xd6E2F8e57b4aFB51C6fA4cbC012e1cE6aEad989F",
    peggedToken: "0x7A53EBc85453DD006824084c4f4bE758FcF8a5B5", // haETH
    leveragedToken: "0x0Cd6BB1a0cfD95e2779EDC6D17b664B481f2EB4C", // hsFXUSD-ETH
    stabilityPoolCollateral: "0x1F985CF7C10A81DE1940da581208D2855D263D72",
    stabilityPoolLeveraged: "0x438B29EC7a1770dDbA37D792F1A6e76231Ef8E06",
    stabilityPoolManager: "0xE39165aDE355988EFb24dA4f2403971101134CAB",
    priceOracle: "0x71437C90F1E0785dd691FD02f7bE0B90cd14c097",
    collateralPrice: "0x71437C90F1E0785dd691FD02f7bE0B90cd14c097",
    wrappedCollateralToken: "0x7743e50F534a7f9F1791DdE7dCD89F7783Eefc39", // fxSAVE
    collateralToken: "0x085780639CC2cACd35E474e71f4d000e2405d8f6", // fxUSD
    genesis: "0xC9df4f62474Cf6cdE6c064DB29416a9F4f27EBdC",
    reservePool: "0x7A5c4ca972CE2168d5215d252946dDbd1cAd2015",
    feeReceiver: "0xdC903fe5ebCE440f22578D701b95424363D20881",
  }
}
```

### Example: BTC/fxUSD Market (Production v1)

**Location**: `src/config/contracts.ts` lines 166-208

```typescript
"btc-fxusd": {
  addresses: {
    minter: "0x33e32ff4d0677862fa31582CC654a25b9b1e4888",
    peggedToken: "0x25bA4A826E1A1346dcA2Ab530831dbFF9C08bEA7", // haBTC
    leveragedToken: "0x9567c243F647f9Ac37efb7Fc26BD9551Dce0BE1B", // hsFXUSD-BTC
    stabilityPoolCollateral: "0x86561cdB34ebe8B9abAbb0DD7bEA299fA8532a49",
    stabilityPoolLeveraged: "0x9e56F1E1E80EBf165A1dAa99F9787B41cD5bFE40",
    stabilityPoolManager: "0x768E0a386e1972eB5995429Fe21E7aC0f22F516e",
    priceOracle: "0x8F76a260c5D21586aFfF18f880FFC808D0524A73",
    collateralPrice: "0x8F76a260c5D21586aFfF18f880FFC808D0524A73",
    wrappedCollateralToken: "0x7743e50F534a7f9F1791DdE7dCD89F7783Eefc39", // fxSAVE
    collateralToken: "0x085780639CC2cACd35E474e71f4d000e2405d8f6", // fxUSD
    genesis: "0x42cc9a19b358a2A918f891D8a6199d8b05F0BC1C",
    reservePool: "0xfDE46D4425138aA01319bB8587Cb935a0393DfE3",
    feeReceiver: "0x70DdA12032335656b63435840Cd55ff7A19dDAb7",
  }
}
```

### Example: BTC/stETH Market (Production v1)

**Location**: `src/config/contracts.ts` lines 210-252

```typescript
"btc-steth": {
  addresses: {
    minter: "0x[MINTER_ADDRESS]", // Check contracts.ts for actual address
    peggedToken: "0x25bA4A826E1A1346dcA2Ab530831dbFF9C08bEA7", // haBTC (shared with BTC/fxUSD)
    leveragedToken: "0x[LEVERAGED_TOKEN_ADDRESS]", // hsSTETH-BTC
    stabilityPoolCollateral: "0x[COLLATERAL_POOL_ADDRESS]",
    stabilityPoolLeveraged: "0x[LEVERAGED_POOL_ADDRESS]",
    stabilityPoolManager: "0x5e9Bcaa1EDfD665c09a9e6693B447581d61A85A1",
    priceOracle: "0x[PRICE_ORACLE_ADDRESS]",
    collateralPrice: "0x[COLLATERAL_PRICE_ADDRESS]",
    wrappedCollateralToken: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0", // wstETH (Lido)
    collateralToken: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0", // wstETH
    // ... other addresses
  }
}
```

**Note**: Contract addresses are retrieved from the market configuration:
```typescript
const market = markets[marketId];
const stabilityPoolAddress = market.addresses.stabilityPoolCollateral;
const minterAddress = market.addresses.minter;
```

---

## Contract ABIs

### APR ABI (`getAPRBreakdown`)

**Location**: `src/abis/apr.ts`

```typescript
export const aprABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "getAPRBreakdown",
    outputs: [
      { name: "collateralTokenAPR", type: "uint256" }, // 16 decimals (1e16 = 1%)
      { name: "steamTokenAPR", type: "uint256" },      // 16 decimals (1e16 = 1%)
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
```

**Usage**: Called on stability pool contracts (both collateral and leveraged pools).

---

### Stability Pool ABI (Relevant Functions)

**Location**: `src/abis/shared.ts` lines 195-377

```typescript
export const STABILITY_POOL_ABI = [
  // Reward data function (returns [lastUpdate, finishAt, rate, queued])
  {
    inputs: [{ name: "rewardToken", type: "address" }],
    name: "rewardData",
    outputs: [
      { name: "lastUpdate", type: "uint256" },
      { name: "finishAt", type: "uint256" },
      { name: "rate", type: "uint256" },      // Reward rate per second (18 decimals)
      { name: "queued", type: "uint256" },    // Queued rewards (18 decimals)
    ],
    stateMutability: "view",
    type: "function",
  },
  
  // Get all active reward tokens
  {
    inputs: [],
    name: "activeRewardTokens",
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  
  // Pool TVL functions
  {
    inputs: [],
    name: "totalAssetSupply",
    outputs: [{ name: "amount", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  
  {
    inputs: [],
    name: "totalAssets",
    outputs: [{ name: "assets", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  
  // User balance
  {
    inputs: [{ name: "account", type: "address" }],
    name: "assetBalanceOf",
    outputs: [{ name: "amount", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  
  // Reward period length (for projected APR)
  {
    inputs: [],
    name: "REWARD_PERIOD_LENGTH",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  
  // Claimable rewards for a user
  {
    inputs: [
      { name: "account", type: "address" },
      { name: "rewardToken", type: "address" },
    ],
    name: "claimable",
    outputs: [{ name: "amount", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  
  // Additional functions (deposit, withdraw, claim, etc.)
  // ... see src/abis/shared.ts for full ABI
] as const;
```

---

### Minter ABI (Relevant Functions)

**Location**: `src/abis/shared.ts` lines 456-588

```typescript
export const MINTER_ABI = [
  // Harvestable amount (for projected APR)
  {
    inputs: [],
    name: "harvestable",
    outputs: [{ name: "wrappedAmount", type: "uint256" }], // 18 decimals
    stateMutability: "view",
    type: "function",
  },
  
  // Token addresses
  {
    inputs: [],
    name: "PEGGED_TOKEN",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  
  {
    inputs: [],
    name: "LEVERAGED_TOKEN",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  
  {
    inputs: [],
    name: "WRAPPED_COLLATERAL_TOKEN",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  
  // Price functions
  {
    inputs: [],
    name: "peggedTokenPrice",
    outputs: [{ type: "uint256" }], // 18 decimals
    stateMutability: "view",
    type: "function",
  },
  
  // Balance functions
  {
    inputs: [],
    name: "collateralTokenBalance",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  
  {
    inputs: [],
    name: "totalCollateralValue",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  
  // Ratio functions
  {
    inputs: [],
    name: "collateralRatio",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  
  // Additional functions (mint, redeem, etc.)
  // ... see src/abis/shared.ts for full ABI
] as const;
```

---

### Stability Pool Manager ABI

**Location**: `src/abis/shared.ts` lines 382-404

```typescript
export const STABILITY_POOL_MANAGER_ABI = [
  {
    inputs: [],
    name: "harvestBountyRatio",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "harvestCutRatio",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "rebalanceThreshold",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
```

**Usage**: Used to determine how rewards are distributed from harvested amounts.

---

### ERC20 ABI (Standard Token Functions)

**Location**: `src/abis/shared.ts` lines 9-65

```typescript
export const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // ... additional ERC20 functions
] as const;
```

**Usage**: Used to fetch token metadata (symbol, decimals) and balances for reward tokens.

---

## Related Files

- `src/app/anchor/page.tsx` - Main anchor page with APR display
- `src/hooks/useProjectedAPR.ts` - Projected APR calculation hook
- `src/hooks/usePoolRewardAPR.ts` - Generic pool reward APR hook
- `src/hooks/anchor/useAnchorMarketData.ts` - Market data processing with APR
- `src/hooks/anchor/useAnchorContractReads.ts` - Contract reads setup
- `src/abis/apr.ts` - APR contract ABI
- `src/abis/shared.ts` - Shared ABIs including STABILITY_POOL_ABI, MINTER_ABI, ERC20_ABI
- `src/config/contracts.ts` - Contract addresses configuration
- `src/config/markets.ts` - Market configurations (references contracts.ts)
- `src/config/contracts.index.ts` - Contract configuration switcher (production/test2)

---

## How to Access Contract Addresses in Code

```typescript
import { markets } from "@/config/markets";

// Get market configuration
const market = markets["eth-fxusd"];

// Access contract addresses
const stabilityPoolCollateral = market.addresses.stabilityPoolCollateral;
const stabilityPoolLeveraged = market.addresses.stabilityPoolLeveraged;
const minterAddress = market.addresses.minter;
const priceOracle = market.addresses.priceOracle;
```

---

*Last updated: [Current Date]*
