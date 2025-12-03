# Subgraph Withdrawal Marks Forfeiture Fix

## Problem

When users withdraw from Genesis, ALL marks are being forfeited instead of a proportional amount. If a user withdraws 50% of their deposit, they should lose 50% of their marks, not 100%.

## Root Cause

The subgraph code in `subgraph/src/genesis.ts` in the `handleWithdraw` function needs to ensure:

1. Marks are accumulated BEFORE calculating forfeiture
2. Forfeiture is calculated proportionally based on withdrawal percentage
3. The deposit amount BEFORE withdrawal is used for both accumulation and percentage calculation

## Current Code Location

File: `subgraph/src/genesis.ts`
Function: `handleWithdraw`
Lines: 149-236

## Required Fix

The code should:

1. Store deposit and marks values BEFORE withdrawal
2. Accumulate marks using the PRE-withdrawal deposit amount
3. Calculate forfeiture proportionally: `marksForfeited = totalMarks * (withdrawalAmount / depositBeforeWithdrawal)`
4. Update marks: `currentMarks = totalMarks - marksForfeited`

## Expected Behavior

- User deposits 100 wstETH → accumulates marks over time
- User has 1000 marks total
- User withdraws 50 wstETH (50% of deposit)
- **Expected**: Forfeit 500 marks (50%), keep 500 marks
- **Current Bug**: Forfeits all 1000 marks (100%)

## Verification

After redeploying, test:

1. Make a deposit
2. Wait for marks to accumulate
3. Withdraw 50% of deposit
4. Verify only 50% of marks are forfeited

## Code Status

The fix has been implemented in the codebase at `subgraph/src/genesis.ts` lines 160-210. The subgraph needs to be redeployed for the fix to take effect.

