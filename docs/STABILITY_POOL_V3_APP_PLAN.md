# Stability pool v3: changes for harbor-app

Checked against:

- `Stability pool v3 what changes for harbor-app.md` (30 Oct 2026)
- `baofinance/harbor` branch `harbor-yield` at `a5b9d834` (2 Nov 2026), especially `doc/frontend/stability-pool.md`, `src/interfaces/IStabilityPool_v3.sol`, and `src/interfaces/IMinter_v3.sol`
- harbor-app `staging` at `d6b1895`

haEUR2 (`steth-eur-pre1`, salt `pre1_3`) is a fresh StabilityPool v3 market, not an upgraded v2 pool. Reads below are from mainnet around block 26,330,224.

The October note is right about behavior and wrong about a few names. On `harbor-yield` the v3 getters dropped `get`, and the fee is a ratio. The haEUR2 pools confirm that: `getEarlyWithdrawalFee` and `getWithdrawalWindow` revert, `earlyWithdrawalFeeRatio` returns 5%, and `withdrawalWindow` returns a 1 hour delay and a 25 hour window.

## Already safe

A direct deposit of haEUR2 into either pool is safe.

| | Collateral pool | Sail pool |
| --- | --- | --- |
| Address | `0x63501E3a00f1eDA929eCaa28EC1A4147c0b565B6` | `0x0D3AF830C0AC64047a69950fd7BE543d89D3b2dd` |
| Share token | `hspEUR(stETH)` | `hspEUR(hsSTETH)` |
| Asset | haEUR2 `0x8415371e36bee02b99059C30049F4bbFE8e55785` | same |
| Supply | 0 | 0 |
| Floor | 1 haEUR | 1 haEUR |

`deposit(uint256,address,uint256)` is unchanged. `previewDeposit` of 2.5594 returns 2.5594. The pool credits one share per haEUR2. Nothing is charged on the way in. The 5% fee applies only when shares leave outside the fee-free amount.

Because both pools are empty, the first deposit must leave the total at or above 1 haEUR. After that, any amount above zero is accepted. `minAmount` of 0 on deposit is safe while the credit equals the amount deposited. A later deposit charge would be picked up by `previewDeposit`; the withdraw path is the one that must stop passing 0.

These calls are unchanged and already match v3:

- `mintPeggedToken(uint256,address,uint256)` and `mintLeveragedToken` in the same shape
- `mintPeggedTokenDryRun(uint256)` and the other three-argument dry runs
- `requestWithdrawal()`
- `claim()` with no arguments (Earn claim and compound)
- `assetBalanceOf` and `totalAssetSupply` (same values as `balanceOf` and `totalSupply`)
- `rewardData`, `activeRewardTokens`, `REWARD_PERIOD_LENGTH`

Minting haEUR2 from wstETH also still works. The minter cuts a large offer. On that block, `mintPeggedTokenDryRun(2.5594 wstETH)` took about 0.00215 wstETH and minted about 5.3609 haEUR2. wstETH was about 2,009 EUR and the wrap rate about 1.248, so that sliver is worth about 5.36 ha. The collateral ratio was about 1.96, above the minimum of about 1.01. That 5.36 is `peggedMinted` on haEUR2, not hsSTETH-EUR2 and not `hspEUR`.

`d6b1895` points the Earn deposit review at `previewDeposit` and the pool’s `symbol()`. A 2.5594 haEUR2 collateral deposit should read **2.5594 hspEUR(stETH)**. That commit is on local `staging` and is not on `origin/staging`.

## What to change

Do these in order. Earn and Leverage share the pool reads. Leverage’s own trade (`SailManageModal` → `mintLeveragedToken`) does not need a new function. The sail stability pool is deposited from the Earn modal.

### 1. Point pool reads at the v3 names

`src/abis/stabilityPool.ts` and `src/abis/shared.ts` (`STABILITY_POOL_ABI`) still describe v2.

| v2 name the app calls | v3 name | Where |
| --- | --- | --- |
| `getWithdrawalRequest(address)` | `withdrawalRequest(address)` | deposit modal, `useRedeemPositionFlow.ts`, `useWithdrawalRequests.ts` |
| `getWithdrawalWindow()` | `withdrawalWindow()` | deposit modal, `useTransparencyData.ts` |
| `getEarlyWithdrawalFee()` | `earlyWithdrawalFeeRatio()` | deposit modal and `useWithdrawalRequests.ts` now prefer the v3 name and fall back to v2. Transparency still calls the v2 name. |
| `getFeeAddress()` | `feeReceiver()` | not called on the pool today |
| none | `withdrawalFeeFreeAmount(address)` | new read |

`withdrawalFeeFreeAmount` returns 0 when there is no request. The window comes from `withdrawalRequest`. A reverting read is not “no fee”.

Paused v2 markets revert these reads either way. haEUR2 only answers the v3 names. After each market’s batch, the old names are gone, so the app should call the v3 names.

### 2. Rewards: `claimable` takes a list

v3 is `claimable(address account, address[] tokens) returns (uint256[])`.

The app still calls `claimable(address, address)` in:

- `src/hooks/useStabilityPoolRewards.ts` (drops the token on revert)
- `src/hooks/useAllStabilityPoolRewards.ts` (reports 0)

Both catch the revert, so Earn shows $0 claimable and no error once a v3 pool has rewards. haEUR2 has none yet, so $0 is also the real number today.

Pass the token list from `activeRewardTokens()` in one call and zip the amounts. Update the ABI entries in `src/abis/stabilityPool.ts` and `src/abis/shared.ts`. `claim()` with no arguments stays. `claim(address)` and `claim(address, address)` were removed; the pool calls in the app do not use them. Genesis `claim(address)` is a different contract.

### 3. Withdrawal fee, and pass `minAmount`

`earlyWithdrawalFees` in `useAnchorDepositWithdrawModal.tsx` treats “window open” as “no fee”, and otherwise charges the whole amount. On v3 the open window is fee-free only up to `withdrawalFeeFreeAmount`. The rest pays `earlyWithdrawalFeeRatio` (5% on haEUR2).

Replace that formula with the one in `doc/frontend/stability-pool.md`:

1. Cap the request at `maxAssetLoss()` (headroom above the 1 ha floor).
2. Fee is 0 for `EXEMPT_WITHDRAWAL_FEE_ROLE`, and for the portion up to the fee-free amount while the window is open.
3. Otherwise `fee = (leaving - feeFreeAmount) * earlyWithdrawalFeeRatio / 1e18`.
4. Pass `netAmount`, or a bit less, as `minAmount`.

The modal still passes `0n` at the collateral and sail `withdraw` calls (around lines 9221 and 9283). A withdrawal above the fee-free amount succeeds and pays the fee. Show the fee before the wallet prompt.

Copy to add on the deposit review, from the same doc:

- A request covers the balance as it stands now.
- A deposit during a window does not cancel the request and does not raise the fee-free amount. Covering the new money means a new request, which restarts the delay.
- Any successful withdrawal clears the request.

### 4. Decode the new errors

Add these to the ABIs or they surface as unknown custom errors:

| Contract | Error | When |
| --- | --- | --- |
| Minter | `BelowMinimumCollateralRatio(uint256,uint256)` | Mint refused by the minimum collateral ratio |
| Minter | `RequestedSubsidyNotGiven(uint256,uint256)` | Replaces `RequestedBonusNotGiven` in `src/abis/minter.ts` |
| Minter | `UnrecognisedImpairment(uint256,uint256)` | Recorded collateral is above what the minter holds |
| Minter | `ZeroPeggedTokenPrice()` | Peg price is zero |
| Pool | `DepositAmountExceedsMaximum(uint256,uint256)` | Deposit would pass the pool ceiling |

`InvalidOraclePrice` and `ZeroOraclePrice` are no longer minter errors. The modal’s check for them will not match a v3 minter revert. `DepositZeroAmount` and `NoActiveWithdrawalRequest` are gone. `DepositAmountLessThanMinimum` remains, and on v3 it also means the pool total would sit under the floor.

`LIQUIDATION_TOKEN` was removed. The deposit modal still multicalls it next to `GAUGE_REWARD_TOKEN` (`useAnchorDepositWithdrawModal.tsx` around line 2914) with `allowFailure`, so the deposit is not blocked. Reward tokens should come from `activeRewardTokens()`, which the reward hooks already use.

### 5. Marks subgraph

v3 pool positions are ERC-20s. `transfer` moves shares without a `Deposit` or `Withdraw`. The subgraph handles `Deposit`, `Withdraw`, and `UserDepositChange` only, and it does not index the haEUR2 pools at all.

When marks for this market matter:

1. Add both haEUR2 pool addresses as data sources.
2. Add `Transfer(indexed address,indexed address,uint256)` to `subgraph/abis/StabilityPool.json` and to each pool source.
3. On `Transfer`, settle marks and re-read the balance for both accounts.
4. Skip transfers from or to the zero address. Deposit and withdrawal already emit those, and the existing handlers cover them.

Replaying history is safe: blocks before v3 have no pool `Transfer` events. Keep `assetBalanceOf` in the subgraph. It has to replay blocks where `balanceOf` did not exist.

This does not affect a deposit. It affects marks after someone transfers `hspEUR` shares.

### 6. Tell the user about the floor

`docs/STABILITY_POOL_MIN_DEPOSITS.md` describes a per-deposit minimum. On v3 the floor is `MIN_TOTAL_ASSET_SUPPLY` on the pool total, and it also sets the ceiling (`floor * 1e18`). haEUR2’s floor is 1 haEUR, same number as the old per-deposit minimum, but only the first deposit into an empty pool must meet it.

The simulate path already maps `DepositAmountLessThanMinimum`. The review should say so before the wallet when `totalSupply + amount` is below the floor.

## Leave as they are

- Balance reads can stay on `assetBalanceOf` and `totalAssetSupply`. New code should prefer `balanceOf` and `totalSupply`. The subgraph must keep the old names.
- `useProjectedAPR` reads `harvestBountyRatio` and `harvestCutRatio`. The manager’s ratios changed (harvest bounty 1% → 0.5%, cut 99% → 99.5%, rebalance bounty 1% → 0.5%). The pools’ share of the cut is what is left, which is 0 before and after. No app change.
- Do not rename haEUR2 to hsEUR2. haEUR2 is the pegged token. hsSTETH-EUR2 is the sail token. `hspEUR(stETH)` and `hspEUR(hsSTETH)` are the pool shares.
- No version switch per market is required once the reads use the v3 names. A paused market reverts. A live v3 market, including haEUR2, answers.

## Suggested order

1. ABI and the four renamed reads, plus `withdrawalFeeFreeAmount`.
2. `claimable(address, address[])`.
3. Fee estimate and `minAmount` on withdraw, with the fee-free copy on the review.
4. New errors, and drop `LIQUIDATION_TOKEN` from the modal multicall.
5. Floor copy on an empty pool.
6. Subgraph `Transfer` handler and the haEUR2 pool sources, when marks for this market are in scope.

## Status

Done in the working tree, not committed. Both v2 and v3 reads stay. Only haEUR2 is on v3, so a reverting v3 read falls back to the v2 name. Subgraph work is not included.

1. The pool ABIs include `withdrawalRequest`, `withdrawalWindow`, `earlyWithdrawalFeeRatio`, `withdrawalFeeFreeAmount`, and `maxAssetLoss`, and the old names stay. The modal, withdrawal-request hook, and redeem flow try the v3 name and fall back to v2. Transparency still reads the v2 fee and window, then appends the v3 pair and uses it when that call succeeds. The pool `feeReceiver` is still unused; nothing in the app called `getFeeAddress`.
2. Reward hooks call `claimable(account, tokens[])` and fall back to `claimable(account, token)`.
3. A withdraw quotes the fee with the fee-free amount on v3 and passes that net as `minAmount`. An open v2 window stays fully free. The deposit review says a deposit does not raise the fee-free amount.
4. Mint errors include `BelowMinimumCollateralRatio`, `RequestedSubsidyNotGiven`, `UnrecognisedImpairment`, and `ZeroPeggedTokenPrice`. Deposit simulation maps `DepositAmountExceedsMaximum`. The modal multicall no longer reads `LIQUIDATION_TOKEN`.
5. An empty v3 pool tells the user the first deposit must reach `MIN_TOTAL_ASSET_SUPPLY`.

haEUR2 pool deposits show received shares as `hspEUR2`. The quote and the v2/v3 read pair live in `src/utils/stabilityPoolCompat.ts` and `src/hooks/useStabilityPoolReadPair.ts`, so the modal, rewards, redeem flow, withdrawal requests, and transparency share them.

`d6b1895` (previewDeposit on the deposit review) is local on `staging` and not pushed. This batch is uncommitted.
