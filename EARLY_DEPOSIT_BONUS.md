# Early Deposit Bonus Implementation

## Overview

Early depositors receive an additional **100 marks per dollar** bonus at the end of genesis, on top of the standard 100 marks/dollar bonus that all depositors receive.

## Thresholds

- **fxSAVE markets** (ETH/fxUSD, BTC/fxUSD): First **$250,000 USD** in deposits qualify
- **wstETH markets** (BTC/stETH): First **$308,000 USD** in deposits qualify (≈70 wstETH @ $4,400)

## Rules

1. **Qualification**: Deposits made before the threshold is reached qualify for the early bonus
2. **Withdrawal Impact**: If a user withdraws before genesis ends, they lose the early bonus proportionally for the withdrawn amount
3. **Final Calculation**: Early bonus is calculated at genesis end based on remaining eligible deposits

## Example Scenarios

### Scenario 1: Early Depositor, No Withdrawals
- User deposits $10,000 when cumulative deposits are at $50,000
- Threshold not reached yet → **Qualifies for early bonus**
- At genesis end with $10,000 still deposited:
  - Standard bonus: $10,000 × 100 = **1,000,000 marks**
  - Early bonus: $10,000 × 100 = **1,000,000 marks**
  - **Total bonus: 2,000,000 marks**

### Scenario 2: Early Depositor with Partial Withdrawal
- User deposits $10,000 when cumulative is at $50,000 → **Qualifies**
- User withdraws $4,000 before genesis ends
- At genesis end with $6,000 remaining:
  - Standard bonus: $6,000 × 100 = **600,000 marks**
  - Early bonus: $6,000 × 100 = **600,000 marks** (reduced from $10,000)
  - **Total bonus: 1,200,000 marks**

### Scenario 3: Late Depositor
- User deposits $10,000 when cumulative is at $260,000
- Threshold already reached → **Does NOT qualify for early bonus**
- At genesis end:
  - Standard bonus: $10,000 × 100 = **1,000,000 marks**
  - Early bonus: **0 marks**
  - **Total bonus: 1,000,000 marks**

## UI Display

### Progress Bar (All Markets)
- Shows cumulative deposits vs threshold
- Green bar when bonus available
- Gray bar when threshold reached
- Updates in real-time (every 30 seconds)

### User Qualification Badge
- Shows "✓ You qualify for Early Deposit Bonus" if user has qualifying deposits
- Shows estimated bonus: "+X marks" if genesis hasn't ended
- Only shown if user has eligible deposits

### Bonus Marks Display
- In "Bonus at End of Genesis" box
- Small highlighted text in green: "Early deposit bonus: +X marks"
- Shown under the main bonus number
- Only appears if user earned early bonus marks

## Technical Implementation

### Subgraph (v0.0.15)

**New Entities:**
- `MarketBonusStatus`: Tracks threshold progress per market
- Added fields to `Deposit`: `qualifiesForEarlyBonus`, `earlyBonusAmount`
- Added fields to `UserHarborMarks`: `qualifiesForEarlyBonus`, `earlyBonusMarks`, `earlyBonusEligibleDepositUSD`

**Logic:**
- `handleDeposit`: Checks threshold, marks qualifying deposits, updates cumulative
- `handleWithdraw`: Reduces eligible deposit amount proportionally
- `updateUserMarksForGenesisEnd`: Calculates early bonus based on remaining eligible deposits

### Frontend

**New Hook:**
- `useMarketBonusStatus(genesisAddress)`: Fetches market bonus status from subgraph

**Updated Components:**
- Genesis page: Progress bar for each market, user qualification badge, early bonus display
- Marks calculation: Includes early bonus in totals

## Deployment Steps

1. ✅ Update subgraph schema
2. ✅ Update subgraph handlers
3. ✅ Build subgraph
4. ⏳ Deploy to The Graph Network (v0.0.15)
5. ⏳ Wait for sync
6. ✅ Update frontend queries
7. ✅ Add UI components
8. ✅ Push to staging

## Next Steps

1. Deploy subgraph v0.0.15 to The Graph Network
2. Update `NEXT_PUBLIC_GRAPH_URL` to point to v0.0.15 endpoint
3. Test on staging
4. Monitor threshold progress in real-time

## Notes

- Thresholds are in USD to account for price fluctuations
- Early bonus is separate from standard genesis end bonus (both can be earned)
- Progress bar updates every 30 seconds to show real-time threshold progress
- Withdrawals proportionally reduce early bonus eligibility

