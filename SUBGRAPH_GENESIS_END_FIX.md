# Subgraph Genesis End User Marks Update Fix

## Issue

When genesis ends, user marks are not being updated:

- `genesisEnded: false` (should be `true`)
- `genesisEndDate: null` (should be set)
- `bonusMarks: 0` (should be 40,000,000 for $400,000 deposit)

## Root Cause

The `handleGenesisEnd` function processes users from the `UserList` entity. If the `UserList` wasn't populated (e.g., deposits happened before UserList tracking was added, or subgraph wasn't redeployed), users won't be updated when genesis ends.

## Current Behavior

1. `handleGenesisEnd` processes users from `UserList`
2. If `UserList` is empty or doesn't include a user, that user's marks won't be updated
3. Users ARE updated when they next interact (deposit/withdraw) because those handlers check if genesis has ended (lines 123-129 and 200-206)

## Solution

The subgraph code has been improved to better handle the UserList, but the immediate fix is:

### Option 1: Redeploy Subgraph (Recommended)

1. Redeploy the subgraph to process the `GenesisEnd` event
2. The `UserList` should be populated if deposits were made after the UserList tracking was added
3. All users in the `UserList` will be updated when the event is processed

### Option 2: Trigger Update via Interaction

If a user's marks weren't updated, they will be automatically updated when they:

- Make a deposit (even $0 or minimal amount)
- Make a withdrawal
- The handlers check if genesis has ended and update marks accordingly

### Option 3: Manual Fix (If Needed)

If the UserList is empty, you can manually trigger updates by having users interact with the contract (deposit/withdraw), which will update their marks.

## Code Changes Made

- Improved `handleGenesisEnd` to better handle UserList processing
- Added comments explaining the fallback behavior

## Verification

After redeploying, check:

1. `GenesisEnd` entity exists for the contract
2. `UserHarborMarks` entities have:
   - `genesisEnded: true`
   - `genesisEndDate: <timestamp>`
   - `bonusMarks: <calculated value>` (100 marks per dollar)
   - `currentMarks: <includes bonus>`
   - `marksPerDay: 0`

## Next Steps

1. Redeploy the subgraph
2. Verify users are updated
3. If users still aren't updated, they will be updated on their next interaction



