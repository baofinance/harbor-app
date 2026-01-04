# Stability Pool Minimum Deposit Analysis

## Current On-Chain Minimums (Prod + Test2)

I queried each Stability Pool by simulating a tiny `deposit()` and decoding `DepositAmountLessThanMinimum(amount, minimum)`. **All pools currently have `minimum = 1e18`**, i.e. **1 full pegged token**.

### Test2

**haETH** (min **1 haETH**, raw `1000000000000000000`)

- **Collateral pool**: `0xfb9747b30ee1b1df2434255c7768c1ebfa7e89bb`
- **Sail pool**: `0x93d0472443d775e95bf1597c8c66dfe9093bfc48`

**haBTC** (min **1 haBTC**, raw `1000000000000000000`)

- **Collateral pool**: `0x5378fbf71627e352211779bd4cd09b0a791015ac`
- **Sail pool**: `0x8667592f836a8e2d19ce7879b8ae557297514f48`
- **Collateral pool**: `0x86297bd2de92e91486c7e3b32cb5bc18f0a363bc`
- **Sail pool**: `0x8d6307be018fcc42ad65e91b77c6b09c7ac9f0df`

### Prod

**haETH** (min **1 haETH**, raw `1000000000000000000`)

- **Collateral pool**: `0x1F985CF7C10A81DE1940da581208D2855D263D72`
- **Sail pool**: `0x438B29EC7a1770dDbA37D792F1A6e76231Ef8E06`

**haBTC** (min **1 haBTC**, raw `1000000000000000000`)

- **Collateral pool**: `0x86561cdB34ebe8B9abAbb0DD7bEA299fA8532a49`
- **Sail pool**: `0x9e56F1E1E80EBf165A1dAa99F9787B41cD5bFE40`
- **Collateral pool**: `0x667Ceb303193996697A5938cD6e17255EeAcef51`
- **Sail pool**: `0xCB4F3e21DE158bf858Aa03E63e4cEc7342177013`

## Suggested New Minimums (~$1-ish) in ha-token Units

Because deposits are in **haETH / haBTC (18 decimals)**, you'll want different raw values per pegged token:

- **haETH**
  - **0.0005 haETH** → raw **`500000000000000`**
- **haBTC**
  - **0.00002 haBTC** → raw **`20000000000000`**

These won't be exactly $1 at all times, but they'll be "around $1" and avoid the current "must deposit 1 haBTC" problem.

