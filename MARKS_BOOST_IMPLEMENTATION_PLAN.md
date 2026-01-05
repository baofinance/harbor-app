# Marks Boost Implementation Plan

## Overview
Implement an 8-day temporary boost to marks earning rates:
- **Anchor tokens** (ha tokens + stability pools): 10x boost (1 → 10 marks/day)
- **Sail tokens**: 2x boost (5 → 10 marks/day)

## Boost Configuration

### Timing
- **Per-market window**: First **8 days** of each market after it “starts” (tracked in the subgraph).
- **Start**: Market’s first indexed activity (first transfer/deposit seen for that market).
- **End**: Start + 8 days.

### Multipliers
- **Anchor boost**: 10x (1 mark/$/day → 10 marks/$/day)
- **Sail boost**: 2x (5 marks/$/day → 10 marks/$/day)

## Implementation Strategy

### Subgraph + Frontend Approach
Since the subgraph is the source of truth for airdrop calculations, we need to update both:
1. **Subgraph**: Apply boost multipliers in marks calculations (so airdrops are correct)
2. **Frontend**: Display boost status and match subgraph calculations

### Automatic Boost for New Markets
Boost applies automatically to **all markets in their first 8 days**, tracked by a **market-level** subgraph entity:
- We store a per-market `startTimestamp` once (on the first event seen for that market), plus `endTimestamp`.
- No manual configuration needed per market; new markets automatically get the boost window.

## Files to Modify

### 1. Subgraph Changes

#### A. Boost Helper Functions
**File**: `subgraph/src/marksBoost.ts` (NEW)
- Helper to check if boost is active for a market (first 8 days from deployment)
- Helper to get boost multiplier (10x for anchor, 2x for sail)
- Uses a market-level `MarketBoostWindow` entity (start/end timestamps)

#### B. Update Multiplier Functions
**Files to update**:
- `subgraph/src/haToken.ts` - Apply 10x boost in `getHaTokenMultiplier()` if market is in first 8 days
- `subgraph/src/sailToken.ts` - Apply 2x boost in `getSailTokenMultiplier()` if market is in first 8 days
- `subgraph/src/stabilityPoolCollateral.ts` - Apply 10x boost if pool is in first 8 days
- `subgraph/src/stabilityPoolLeveraged.ts` - Apply 10x boost if pool is in first 8 days

### 2. Frontend Configuration
**File**: `src/config/marksBoost.ts` (NEW)
- Helper functions to check if boost is active (matches subgraph logic)
- Used for UI display only (subgraph is source of truth)

### 3. Marks Calculation Hooks (Frontend Display)
**Files to update**:
- `src/hooks/useAnchorLedgerMarks.ts` - Display boost status (subgraph already applies boost)
- `src/hooks/useAnchorMarks.ts` - Display boost status
- `src/app/sail/page.tsx` - Display boost status

### 3. UI Components

#### A. Boost Badge Component
**File**: `src/components/MarksBoostBadge.tsx` (NEW)
- Similar styling to genesis early deposit bonus tags
- Shows boost multiplier (10x for anchor, 2x for sail)
- Shows countdown timer to boost end
- Green highlight with border (matching genesis bonus style)

#### B. Anchor Page Updates
**File**: `src/app/anchor/page.tsx`
- Add boost badge near marks display
- Update marks per day display to show boosted rate
- Show countdown when boost is active

#### C. Sail Page Updates
**File**: `src/app/sail/page.tsx`
- Add boost badge near marks display
- Update marks per day display to show boosted rate
- Show countdown when boost is active

#### D. Ledger Marks Page Updates
**File**: `src/app/ledger-marks/page.tsx`
- Add boost indicator in header or summary section
- Show boost status for all mark types

## Implementation Details

### 1. Subgraph Boost Helper (`subgraph/src/marksBoost.ts` - NEW)

```typescript
import { BigInt, BigDecimal } from "@graphprotocol/graph-ts";

// Boost configuration
const BOOST_DURATION_SECONDS = BigInt.fromI32(8 * 24 * 60 * 60); // 8 days
const ANCHOR_BOOST_MULTIPLIER = BigDecimal.fromString("10.0"); // 10x
const SAIL_BOOST_MULTIPLIER = BigDecimal.fromString("2.0"); // 2x

/**
 * Check if boost is active for a market based on deployment time
 * Boost is active for first 8 days after market deployment
 */
export function isBoostActive(
  marketStartTimestamp: BigInt, // Market start timestamp (from MarketBoostWindow)
  currentTimestamp: BigInt
): boolean {
  if (marketStartTimestamp.equals(BigInt.fromI32(0))) {
    return false; // No start time = no boost
  }
  
  const boostEndTime = marketStartTimestamp.plus(BOOST_DURATION_SECONDS);
  return currentTimestamp.ge(marketStartTimestamp) && currentTimestamp.lt(boostEndTime);
}

/**
 * Get boost multiplier for anchor tokens (ha tokens + stability pools)
 * Returns 10x if boost is active, 1x otherwise
 */
export function getAnchorBoostMultiplier(
  marketStartTimestamp: BigInt,
  currentTimestamp: BigInt
): BigDecimal {
  return isBoostActive(marketStartTimestamp, currentTimestamp)
    ? ANCHOR_BOOST_MULTIPLIER
    : BigDecimal.fromString("1.0");
}

/**
 * Get boost multiplier for sail tokens
 * Returns 2x if boost is active, 1x otherwise
 */
export function getSailBoostMultiplier(
  marketStartTimestamp: BigInt,
  currentTimestamp: BigInt
): BigDecimal {
  return isBoostActive(marketStartTimestamp, currentTimestamp)
    ? SAIL_BOOST_MULTIPLIER
    : BigDecimal.fromString("1.0");
}

// NOTE: We intentionally do NOT use per-user firstSeenAt/firstDepositAt for “market start”.
// Market start is stored once per market (token/pool) in MarketBoostWindow to avoid per-user windows.
```

### 2. Frontend Boost Configuration (`src/config/marksBoost.ts`)

```typescript
/**
 * Frontend boost helpers (for UI display only)
 * Subgraph is the source of truth for actual marks calculations
 */

const BOOST_DURATION_SECONDS = 8 * 24 * 60 * 60; // 8 days

/**
 * Check if boost is active for a market based on its deployment time
 * @param marketStartTimestamp - Market deployment timestamp (from market config startBlock)
 * @param currentTime - Current timestamp (optional, defaults to now)
 */
export function isBoostActiveForMarket(
  marketStartTimestamp: number,
  currentTime?: number
): boolean {
  if (marketStartTimestamp === 0) return false;
  
  const now = currentTime ?? Math.floor(Date.now() / 1000);
  const boostEndTime = marketStartTimestamp + BOOST_DURATION_SECONDS;
  
  return now >= marketStartTimestamp && now < boostEndTime;
}

/**
 * Get boost end timestamp for a market
 */
export function getBoostEndTimestamp(marketStartTimestamp: number): number {
  return marketStartTimestamp + BOOST_DURATION_SECONDS;
}

/**
 * Get time remaining until boost ends (in seconds)
 */
export function getTimeRemaining(
  marketStartTimestamp: number,
  currentTime?: number
): number {
  if (!isBoostActiveForMarket(marketStartTimestamp, currentTime)) return 0;
  const now = currentTime ?? Math.floor(Date.now() / 1000);
  return getBoostEndTimestamp(marketStartTimestamp) - now;
}

/**
 * Get boost multiplier for anchor (for display purposes)
 * Subgraph already applies this, so this is just for UI
 */
export function getAnchorBoostMultiplier(
  marketStartTimestamp: number,
  currentTime?: number
): number {
  return isBoostActiveForMarket(marketStartTimestamp, currentTime) ? 10 : 1;
}

/**
 * Get boost multiplier for sail (for display purposes)
 * Subgraph already applies this, so this is just for UI
 */
export function getSailBoostMultiplier(
  marketStartTimestamp: number,
  currentTime?: number
): number {
  return isBoostActiveForMarket(marketStartTimestamp, currentTime) ? 2 : 1;
}
```

### 2. Boost Badge Component (`src/components/MarksBoostBadge.tsx`)

```typescript
// Styled similar to genesis early deposit bonus
// Shows: "10x Boost Active" or "2x Boost Active" with countdown
// Green background with border, matching genesis bonus style
```

### 3. Subgraph Updates

#### `subgraph/src/haToken.ts`
- Import `getAnchorBoostMultiplier` and `getMarketStartTimestamp` from `marksBoost.ts`
- In `getHaTokenMultiplier()`: Read market start timestamp from `MarketBoostWindow` for this token
- Apply boost multiplier: `baseMultiplier.times(getAnchorBoostMultiplier(marketStart, currentTime))`
- Update `accumulateMarks()` to use boosted multiplier

#### `subgraph/src/sailToken.ts`
- Import `getSailBoostMultiplier` and `getMarketStartTimestamp` from `marksBoost.ts`
- In `getSailTokenMultiplier()`: Get market start timestamp
- Apply boost multiplier: `baseMultiplier.times(getSailBoostMultiplier(marketStart, currentTime))`
- Update `accumulateMarks()` to use boosted multiplier

#### `subgraph/src/stabilityPoolCollateral.ts`
- Import `getAnchorBoostMultiplier` and `getMarketStartTimestamp` from `marksBoost.ts`
- In `accumulateMarks()`: Apply boost multiplier to `marksPerDollarPerDay`
- Use market start timestamp from `MarketBoostWindow` for this pool

#### `subgraph/src/stabilityPoolLeveraged.ts`
- Import `getAnchorBoostMultiplier` and `getMarketStartTimestamp` from `marksBoost.ts`
- In `accumulateMarks()`: Apply boost multiplier to `marksPerDollarPerDay`
- Use market start timestamp from `MarketBoostWindow` for this pool

### 4. Frontend Hook Updates (Display Only)

#### `useAnchorLedgerMarks.ts`
- Check if boost is active for each market using `isBoostActiveForMarket()`
- Display boost status in UI (subgraph already applies boost to `marksPerDay`)

#### `useAnchorMarks.ts`
- Check boost status for display purposes
- Show boost badge when active

#### `src/app/sail/page.tsx`
- Check boost status for each sail token market
- Display boost badge when active
- Subgraph already applies boost to `marksPerDay` values

### 5. UI Display Updates

#### Anchor Page
- Add boost badge above/below marks display
- Update "Marks per Day" to show: "X marks/day (10x boost active)"
- Show countdown: "Boost ends in X days, Y hours"

#### Sail Page
- Add boost badge above/below marks display
- Update "Sail Marks per Day" to show: "X marks/day (2x boost active)"
- Show countdown: "Boost ends in X days, Y hours"

#### Ledger Marks Page
- Add boost indicator in header
- Show boost status for each mark type

## Styling Reference

Based on genesis page bonus tags:
- Background: `bg-green-900/30` or `bg-[#1E4775]/10`
- Border: `border border-green-500/30` or `border-[#1E4775]/20`
- Text: `text-green-300` or `text-[#1E4775]`
- Small text size: `text-xs`
- Padding: `px-2 py-0.5` or `px-3 py-1`

## Testing Checklist

- [ ] Boost activates at correct start time
- [ ] Boost deactivates after 8 days
- [ ] Anchor marks show 10x multiplier when active
- [ ] Sail marks show 2x multiplier when active
- [ ] Countdown timer updates correctly
- [ ] Badge appears/disappears at correct times
- [ ] Marks calculations are accurate during boost
- [ ] Marks calculations return to normal after boost
- [ ] UI displays boost status clearly
- [ ] Works correctly with blockchain time (Anvil compatibility)

## Deployment Steps

### Subgraph Deployment
1. Create `subgraph/src/marksBoost.ts` with boost helper functions
2. Update `subgraph/src/haToken.ts` to apply anchor boost
3. Update `subgraph/src/sailToken.ts` to apply sail boost
4. Update `subgraph/src/stabilityPoolCollateral.ts` to apply anchor boost
5. Update `subgraph/src/stabilityPoolLeveraged.ts` to apply anchor boost
6. Run `graph codegen && graph build` in subgraph directory
7. Deploy subgraph to The Graph Network
8. Wait for subgraph to sync

### Frontend Deployment
9. Create `src/config/marksBoost.ts` with frontend helpers (for UI display)
10. Create `src/components/MarksBoostBadge.tsx` component
11. Update `useAnchorLedgerMarks.ts` to display boost status
12. Update `useAnchorMarks.ts` to display boost status
13. Update `src/app/sail/page.tsx` to display boost status
14. Add boost badges to Anchor page
15. Add boost badges to Sail page
16. Add boost indicator to Ledger Marks page
17. Test on staging (verify subgraph returns boosted `marksPerDay` values)
18. Deploy to production

## Configuration Management

### Automatic Per-Market Boost
- Boost automatically applies to **all markets in their first 8 days**
- Uses subgraph-stored `MarketBoostWindow.startTimestamp` / `endTimestamp`
- No manual configuration needed per market
- New markets automatically get boost when deployed

### Market Start Timestamp Sources
1. **Primary**: MarketBoostWindow `startTimestamp` (set once at first indexed activity)
2. **If missing**: No boost (safety fallback)

## Notes

- **Subgraph is source of truth**: Boost multipliers are applied in subgraph marks calculations
- **Frontend displays boost status**: UI shows boost badges and countdown, but doesn't modify marks
- **Automatic per-market**: Each market gets boost for its first 8 days from deployment
- **Historical marks unaffected**: Only new marks earned during boost period get multiplier
- **Blockchain timestamp**: Uses block timestamps for accuracy (Anvil compatibility)
- **No manual config**: Boost automatically applies/expires based on market deployment time
- **Airdrop consistency**: Since subgraph calculates boosted marks, airdrops will match UI display

