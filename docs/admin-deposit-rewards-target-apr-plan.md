# Admin Deposit Rewards: Target APR → Required Deposit (Implementation Plan)

## Goal

On **Admin → Rewards** (deposit rewards page), add the ability to **specify a target APR** for a pool and have the UI **calculate the number of reward tokens to deposit for the current period** (e.g. one week), so the pool displays that APR.

---

## Current Behavior

- **Page:** `src/app/admin/rewards/page.tsx` → renders `RewardDeposits` (`src/components/admin/RewardDeposits.tsx`).
- **Flow:** User picks pools, enters reward token address and **amount** manually, then generates Safe tx(s) to `depositReward(token, amount)`.
- **Contract:** Stability pool exposes:
  - `totalAssetSupply()` → pool TVL (in asset/shares wei).
  - `rewardData(rewardToken)` → `[lastUpdate, finishAt, rate, queued]`; **`rate`** = reward tokens (wei) per second distributed to the whole pool.
  - `REWARD_PERIOD_LENGTH()` → period length in seconds (e.g. 7 days = 604800).
  - `ASSET_TOKEN()` → address of the pool’s deposit token (haToken or sail token).

APR in the app is derived as:

- **APR = 100 × (annual reward value in USD) / (pool TVL value in USD)**
- With `rate` in reward-wei per second:  
  `annualRewards (wei) = rate × SECONDS_PER_YEAR`  
  then converted to USD using reward token price; TVL converted to USD using **deposit (asset) token** price.

---

## Math: From Target APR to Reward Amount for the Period

We want: **for the next period, the pool should show `target_APR`**.

- Reward distributed over the period:  
  **`rewardAmount = rate × REWARD_PERIOD_LENGTH`**
- APR (from existing logic):  
  **APR = 100 × (rate × SECONDS_PER_YEAR × rewardTokenPriceUSD) / (totalAssetSupply × depositTokenPriceUSD)**  
  (with consistent decimals handling, see below.)

Solve for `rate`:

- **rate = (APR/100) × totalAssetSupply × (depositTokenPriceUSD / rewardTokenPriceUSD) / SECONDS_PER_YEAR**

So:

- **rewardAmount = (target_APR/100) × totalAssetSupply × (depositTokenPriceUSD / rewardTokenPriceUSD) × (REWARD_PERIOD_LENGTH / SECONDS_PER_YEAR)**

All in **raw token units** (wei):

- `totalAssetSupply`: already in asset token decimals (e.g. 18).
- `depositTokenPriceUSD` / `rewardTokenPriceUSD`: must be in **same scale as token amounts** when multiplying. E.g. if prices are “USD per 1e18 wei”, then the ratio applies to wei; if prices are “USD per 1 token”, we need to convert totalAssetSupply and result to human and back (see “Decimals” below).

---

## Decimals Handling (recommended)

- **Asset token:** decimals `D_asset` (e.g. 18).  
  **TVL_human = totalAssetSupply / 10^D_asset**
- **Reward token:** decimals `D_reward` (e.g. 18 or 6).  
  Prices in **USD per 1 token** (human):
  - **depositValueUSD = TVL_human × depositTokenPriceUSD**
  - **rewardValueUSD_perPeriod = (target_APR/100) × depositValueUSD × (REWARD_PERIOD_LENGTH / SECONDS_PER_YEAR)**
  - **rewardAmount_human = rewardValueUSD_perPeriod / rewardTokenPriceUSD**
  - **rewardAmount_raw = round(rewardAmount_human × 10^D_reward)** for `depositReward(rewardToken, rewardAmount_raw)`.

This keeps the math clear and avoids mixing wei and human units incorrectly.

---

## Data Required (per pool row when “Target APR” is used)

| Data | Source |
|------|--------|
| `totalAssetSupply` | `pool.readContract({ functionName: "totalAssetSupply" })` |
| `REWARD_PERIOD_LENGTH` | `pool.readContract({ functionName: "REWARD_PERIOD_LENGTH" })` |
| Asset token address | `pool.readContract({ functionName: "ASSET_TOKEN" })` |
| Asset decimals | ERC20 `decimals()` for asset token |
| Reward token decimals | Already in row (reward token ERC20 `decimals`) |
| Deposit token price (USD) | New: price source or manual input (see below) |
| Reward token price (USD) | New: price source or manual input |
| Target APR (%) | User input in the row |

---

## Price Source for Admin

- **Option A (recommended for v1):** **Optional manual override** in the row: “Deposit token price (USD)” and “Reward token price (USD)”. If left empty, we can either hide the “Required amount” result or show a message “Enter prices to calculate”.
- **Option B:** Reuse or add a small hook that fetches USD prices (e.g. from existing anchor/sail price hooks, or a minimal Coingecko/oracle fetch) for the pool’s `ASSET_TOKEN` and the selected reward token. Fallback to manual input if unavailable.
- **Option C:** For reward tokens that are known stables (e.g. USDC, fxUSD), default price = 1; for asset token use market config or oracle where already used in the app.

Suggestion: implement **Option A** first (two optional number inputs), then optionally add **Option B** so that when the app already has prices (e.g. from anchor page context), the fields can be pre-filled or used automatically.

---

## UI Changes (in `RewardDeposits.tsx`)

### 1. Per-row: “Target APR” mode

- Add an **optional “Target APR (%)”** input (e.g. number, step 0.1) in each enabled row.
- When Target APR is filled:
  - Add optional **“Deposit token price (USD)”** and **“Reward token price (USD)”** (or a single “Use prices from app” if we add Option B).
  - Add contract reads for this pool:
    - `totalAssetSupply`
    - `REWARD_PERIOD_LENGTH`
    - `ASSET_TOKEN`
  - Read **asset token decimals** (ERC20 on `ASSET_TOKEN`).
  - Compute **required reward amount** using the formula above (in reward token decimals).
  - Display: **“Required for this period: X.XXXX [symbol]”** and a button **“Use this amount”** that sets the row’s **Amount** field to that value (so existing “Copy Safe JSON” / “Deposit” flow is unchanged).

### 2. Validation / edge cases

- If **totalAssetSupply** is 0: show “Pool has no TVL; cannot compute required amount” (or “Infinite APR” warning if you prefer).
- If **REWARD_PERIOD_LENGTH** is 0 or missing: show “Unknown period length” and do not compute.
- If either price is missing and we’re not using a fallback: show “Enter deposit and reward token prices to calculate.”
- If target APR is 0: required amount = 0 (optional: still show “Use this amount” or disable it).

### 3. Where to add the inputs

- In **`RewardDepositRow`**, inside the `enabled ? (...) : null` block, add a second row/section:
  - **“Target APR (%)”** input.
  - Optional price inputs (or “Fetch prices” if we add Option B).
  - Result: “Required for this period: …” + “Use this amount” button.
- Keep the existing **Amount** input; “Use this amount” simply sets it so the rest of the flow (approve, depositReward, Safe JSON) stays the same.

---

## File / Code Touchpoints

| File | Change |
|------|--------|
| `src/components/admin/RewardDeposits.tsx` | Add state and UI for target APR, optional prices, new contract reads (`totalAssetSupply`, `REWARD_PERIOD_LENGTH`, `ASSET_TOKEN`), asset decimals read, calculation function, “Required for period” display and “Use this amount” button. |
| `src/abis/stabilityPool.ts` | Already has `totalAssetSupply`, `REWARD_PERIOD_LENGTH`, `ASSET_TOKEN`; no change needed. |
| Optional later | Small helper or hook to fetch USD prices for given token addresses (or reuse from anchor/sail) to pre-fill deposit/reward token prices. |

---

## Formula Summary (for implementation)

```ts
const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;

// All in human units for clarity; convert to raw for contract at the end.
const tvlHuman = Number(totalAssetSupply) / 10 ** assetDecimals;
const depositValueUSD = tvlHuman * depositTokenPriceUSD;
const periodSec = Number(rewardPeriodLength);
const rewardValueUSD = (targetAPR / 100) * depositValueUSD * (periodSec / SECONDS_PER_YEAR);
const rewardAmountHuman = rewardValueUSD / rewardTokenPriceUSD;
const rewardAmountRaw = BigInt(Math.round(rewardAmountHuman * 10 ** rewardDecimals));
```

Then format `rewardAmountHuman` for display and use `rewardAmountRaw` for “Use this amount” (set amount input to the formatted string so parsing with `parseUnits(amountRaw, rewardDecimals)` reproduces `rewardAmountRaw`).

---

## Checklist Before Coding

- [ ] Confirm `REWARD_PERIOD_LENGTH` is in seconds (and same for all pools / markets you care about).
- [ ] Confirm deposit token for each pool is exactly `ASSET_TOKEN()` (so we use the right decimals and price).
- [ ] Decide v1: manual prices only, or also wire a price source for deposit/reward tokens.
- [ ] If multiple reward tokens per pool: calculation is per selected reward token (current row already has one reward token); no change.

---

## Optional Enhancements (later)

- Show “current implied APR” next to “target APR” when we have existing `rewardData(rate)` and TVL/prices.
- Pre-fill deposit token price from existing app oracles/Coingecko when available.
- Support “reward for 2 weeks” or custom period if the contract supports variable period (otherwise period = `REWARD_PERIOD_LENGTH` only).

If you want, next step can be a concrete patch (diff) for `RewardDeposits.tsx` only (target APR + manual prices + “Use this amount”) so you can review and adjust wording/UX before we add any price fetching.
