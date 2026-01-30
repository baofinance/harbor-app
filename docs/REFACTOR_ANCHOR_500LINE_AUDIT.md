# Anchor modal 500-line audit

Systematic pass over `AnchorDepositWithdrawModal.tsx` in ~500-line chunks. For each chunk we identify extractable **types**, **utils**, or **components**, cross-check with **Sail** and **Genesis** modals, and mark **Anchor-specific** vs **unifiable**.

---

## Chunk 1: ~259–759

### Findings

| Item | Location | Anchor-only? | Sail/Genesis | Action |
|------|----------|--------------|--------------|--------|
| `withdrawCollateralFilter` | 259–262 | Yes | No equivalent | ✅ **Done:** `WithdrawCollateralFilter`, `DEFAULT_WITHDRAW_COLLATERAL_FILTER` in `types/anchor` |
| `selectedStabilityPool` | 267–270 | Yes | No | ✅ **Done:** `SelectedStabilityPool` in `types/anchor` |
| `currentStep` (1\|2\|3) | 281 | Yes | No | ✅ **Done:** `SimpleModeStep` in `types/anchor` |
| `groupedPoolPositions` row type | 507–515 | Yes | No | ✅ **Done:** `GroupedPoolPosition` in `types/anchor` |
| Group balance index map `kind` | 577–579 | Yes | No | ✅ **Done:** `GroupBalanceKind` in `types/anchor` |
| `progressSteps` useMemo, `getCurrentIndex` | 285–456 | Yes | Genesis/Sail build steps differently | Keep in modal; could extract `useAnchorProgressSteps` later |
| `handleProgressClose` / `handleProgressRetry` | 469–493 | Anchor resets config + txHashes | Genesis/Sail reset steps only | Keep in modal |

---

## Chunk 2: ~760–1259

### Findings

| Item | Location | Anchor-only? | Sail/Genesis | Action |
|------|----------|--------------|--------------|--------|
| `getAssetMarketPriority` | 891–915, 964–987 (duplicated) | Yes | No | ✅ **Done:** `getAssetMarketPriority` in `utils/anchor`, used in modal |
| `allStabilityPools` entry type | 1145–1151 | Yes | No | ✅ **Done:** `StabilityPoolEntry` in `types/anchor` |
| `isValidMinterAddress` | 1179–1183 | Generic pattern | Similar checks elsewhere | ✅ **Done:** `isValidEthAddress` in `utils/address`, use in modal |
| `isValidStabilityPoolAddress` | 2825–2829 | Same | Same | ✅ **Done:** use `isValidEthAddress(stabilityPoolAddress)` |
| `marketFeeContracts` / `feeRange` | 1091–1137 | Yes | No | Keep in modal |
| `allDepositAssetsWithMarkets` shape | 990–1007 | Yes | No | Type could be added later if needed |

---

## Chunk 3: ~1260–1759

### Findings

| Item | Location | Anchor-only? | Sail/Genesis | Action |
|------|----------|--------------|--------------|--------|
| `getSelectedAssetAddress` | 1310–1423 | Yes (market + genesis dep) | No | Keep in modal; large, tightly coupled |
| Balance read hooks (Anvil vs wagmi) | 1345–1573 | Anchor | Genesis/Sail use wagmi | Keep |
| Debug `useEffect` logs | 1318–1328, 1502–1512, etc. | Dev-only | Same pattern elsewhere | Optional: `useDevLog` hook; low priority |

---

## Chunk 4: ~1760–2269

| Item | Location | Anchor-only? | Sail/Genesis | Action |
|------|----------|--------------|--------------|--------|
| `formatDuration`, `getFeeFreeDisplay`, `getRequestStatusText`, `formatTime`, `getWindowBannerInfo` | 2003–2143 | Yes (withdrawal window) | No | Optional: move to `utils/anchor` or `utils/withdrawalWindow` if reused |
| `earlyWithdrawalFees` entry shape | 2067–2072 | Yes | No | Optional: `EarlyWithdrawalFeeEntry` in `types/anchor` |
| Anvil vs wagmi dual reads (balance, fee, window, request) | 1786–2001 | Yes | No | Keep; could abstract `useStabilityPoolRead` later |

## Chunk 5: ~2270–2779

| Item | Location | Anchor-only? | Sail/Genesis | Action |
|------|----------|--------------|--------------|--------|
| `isValidMinterAddressForPrice` | 2365–2369 | Same as `isValidEthAddress` | — | **Use** `isValidEthAddress(minterAddressForPrice)` |
| `isValidAddress` in poolContracts / poolsWithData | 2397–2401, 2487–2491 | Same | — | **Use** `isValidEthAddress(pool.address)` |
| `extractAprBreakdown`, chainlink/pegTarget, APR fallback | 2365–2560 | Yes | No | Keep in modal |
| `formatAPR` (modal) vs `utils/anchor` `formatAPR` | 2837–2842 | Different args | — | Keep modal local; possible shared helper later |

## Chunk 6: ~2780–3289

| Item | Location | Anchor-only? | Sail/Genesis | Action |
|------|----------|--------------|--------------|--------|
| `isValidRedeemMinterAddress` | 3081–3085 | Same as `isValidEthAddress` | — | **Use** `isValidEthAddress(redeemMinterAddress)` |
| `depositAmountInWrappedCollateral`, `swappedAmountForDryRun`, dry runs | 2935–3090 | Yes | No | Keep in modal |
| `filteredPools`, `skipRewardStep`, `stabilityStep` | 2807–2812 | Yes | No | Keep |

## Chunk 7: ~3130–3630 (current offsets post–progress refactor)

| Item | Location | Anchor-only? | Sail/Genesis | Action |
|------|----------|--------------|--------------|--------|
| `isValidFeeMinterAddress` | ~3177 | Same as `isValidEthAddress` | — | ✅ **Done:** use `isValidEthAddress(feeMinterAddress)` |
| `isValidStabilityPoolMinter` | ~3333 | Same | — | ✅ **Done:** use `isValidEthAddress(stabilityPoolMinterAddress)` |
| `formatCollateralRatio` | ~3379 | Duplicate of `formatRatio` | — | ✅ **Done:** removed (dead code; use `formatRatio` from utils/anchor if needed) |
| `formatDuration`, `getFeeFreeDisplay`, `getRequestStatusText`, `formatTime`, `getWindowBannerInfo` | ~1816–1954 | Yes (withdrawal window) | No | ✅ **Done:** moved to `utils/anchor`, modal imports them |
| `earlyWithdrawalFees` entry shape | ~1852–1894 | Yes | No | ✅ **Done:** `EarlyWithdrawalFeeEntry` in `types/anchor`, use in useMemo |

## Chunk 8: ~3630–4130

| Item | Location | Anchor-only? | Sail/Genesis | Action |
|------|----------|--------------|--------------|--------|
| `calculateMaxSwapAmount`, `feePercentage`, `parsedAmount`, dry-run logic | ~3515–3600 | Yes | No | Keep in modal |
| `depositLimitWarning`, `tempMaxWarning`, `calculateMaxSwapAmount` | ~3508–3530 | Yes | No | Keep |

## Chunk 9: ~4130–4630

| Item | Location | Anchor-only? | Sail/Genesis | Action |
|------|----------|--------------|--------------|--------|
| Amount input regex `/^\d*\.?\d*$/` | 4357, 4398, 9109 | Shared | Sail/Genesis use `validateAmountInput` | ✅ **Done:** use `validateAmountInput` from `utils/validation` |
| `handlePositionAmountChange` field type | 4393 | Same as `AnchorPositionAmounts` keys | — | ✅ **Done:** `PositionAmountField` in `types/anchor` |
| `positionExceedsBalance` shape | 4426–4430 | Yes | No | ✅ **Done:** `PositionExceedsBalance` in `types/anchor`, use in useMemo |
| `mapInitialTabToDepositWithdraw` | 4170 | Shared | — | Already in `utils/modal` |
| `handleClose`, `handleCancel`, `handleTabChange`, `handleMaxClick`, `validateAmount` | 4243–4564 | Modal-specific | Similar patterns | Keep in modal |

## Chunk 10: ~4630–5130

| Item | Location | Anchor-only? | Sail/Genesis | Action |
|------|----------|--------------|--------------|--------|
| `handleMint`, direct ha vs collateral, swap, zap flows | 4566–5130+ | Yes | No | Keep in modal |
| `debugTx` | 112, many | Dev-only | — | Optional: extract to `utils/debug`; low priority |
| `setProgressConfig` partial updates | 4807, etc. | Type gaps | — | Pre-existing; full config required |

## Chunk 11: ~5130–5630

| Item | Location | Anchor-only? | Sail/Genesis | Action |
|------|----------|--------------|--------------|--------|
| Post-tx settle `setTimeout(2000)` | 5619, 5954, 6961, 7164 | Shared | Genesis, anchor page, etc. use same | ✅ **Done:** `POST_TX_SETTLE_MS`, `delay()` in `utils/modal`; Anchor uses `await delay(POST_TX_SETTLE_MS)` |
| ETH/stETH zap flow, minPeggedOut, dry run | 5175–5340 | Yes | No | Keep in modal |
| stETH fallback `0xae7…E84`, USDC `0xA0b8…eB48` | 5466, 5677 | Duplicated | Sail, Genesis, hooks | Optional: centralize in config; many call sites |

## Chunk 12: ~5630–6130

| Item | Location | Anchor-only? | Sail/Genesis | Action |
|------|----------|--------------|--------------|--------|
| USDC/fxUSD zap, minFxSaveOut, permit flows | 5675–5960 | Yes | No | Keep in modal |
| `resolveStETHAddress` helper | 6126–6154 | Yes | Similar in Sail | Keep in modal (modal deps) |
| Balance-delta `minted = after - before` | 5579–5585, 5962–5966 | Shared pattern | — | Optional: `computeDepositAmountFromBalances(before, after)` util |

## Chunk 13: ~6130–6630

| Item | Location | Anchor-only? | Sail/Genesis | Action |
|------|----------|--------------|--------------|--------|
| Post-approve `setTimeout(1000)` | 6322, 6373, 6421, 6444, 6955, etc. | Shared pattern | — | ✅ **Done:** `POST_APPROVE_SETTLE_MS`, use `delay(POST_APPROVE_SETTLE_MS)` (10 sites) |
| Permit + zap flows (stETH, USDC/fxUSD, wrapped) | 6163–6276 | Yes | No | Keep in modal |
| USDC hardcode `0xA0b8…eB48` | 6179, 6334 | Duplicated | — | Optional: centralize |
| `resolveStETHAddress`, approve → mint → deposit | 6130–6384 | Yes | No | Keep in modal |

## Chunk 14: ~6630–7130

| Item | Location | Anchor-only? | Sail/Genesis | Action |
|------|----------|--------------|--------------|--------|
| ETH/stETH/USDC/fxUSD zap mint, permit vs approve | 6534–6916 | Yes | No | Keep in modal |
| `stabilityPoolSlip` 98n/99n, `minFxSaveOut` | ~6532, ~6517 | Yes | No | Keep in modal |
| Balance-delta `actualMintedAmount`, deposit amount resolution | 6958–6974, 7029–7073 | Yes | No | Keep; optional `computeDepositAmountFromBalances` |
| Direct mint `mintPeggedToken`, approve pegged → deposit | 6917–7164 | Yes | No | Keep in modal |

## Chunk 15: ~7130–7630

| Item | Location | Anchor-only? | Sail/Genesis | Action |
|------|----------|--------------|--------------|--------|
| Allowance verification retry loop, pool ASSET_TOKEN check, simulate deposit | 7165–7325 | Yes | No | Keep in modal |
| handleMint catch: user rejection + BaseError contract errors | 7465–7530 | Shared pattern | Genesis, Sail similar | ✅ **Done:** `isUserRejection` in `utils/tx`; use in Anchor catch blocks |
| handleDeposit: approve → deposit, error handling | 7533–7633 | Shared | Similar | ✅ **Done:** use `isUserRejection` |

## Chunk 16: ~7630–8130

| Item | Location | Anchor-only? | Sail/Genesis | Action |
|------|----------|--------------|--------------|--------|
| handleWithdrawExecution, setProgressConfig partial, wallet/collateral/sail withdraw | 7635–7935 | Yes | No | Keep in modal |
| Redeem flow: approve → redeem, dry run, minCollateralOut | 8035–8165 | Yes | No | Keep in modal |
| Post-approve `setTimeout(500)` before redeem | 8119 | Shared | Genesis, anchor page | ✅ **Done:** `POST_APPROVE_SHORT_MS`, `delay(POST_APPROVE_SHORT_MS)` |
| handleWithdraw / handleRedeem catch: user rejection | 8168–8195, 8368–8395 | Shared | — | ✅ **Done:** use `isUserRejection` |

## Chunk 17: ~8130–8630

| Item | Location | Anchor-only? | Sail/Genesis | Action |
|------|----------|--------------|--------------|--------|
| handleRedeem: approve → redeem, minCollateralOut, retry with 0 | 8186–8336 | Yes | No | Keep in modal |
| handleAction, getButtonText, isButtonDisabled, isProcessing | 8379–8517 | Modal-specific | Similar | Keep |
| `hasRequestSelected` vs `hasRequestWithdrawals` | 8476–8494, 8553–8557 | Duplicate logic | — | ✅ **Done:** hoist `hasRequestWithdrawals`, use in `isButtonDisabled`; remove duplicate def |
| `balance` ternary dead branch | 8519–8528 | Bug | — | ✅ **Done:** remove impossible `activeTab === "deposit"` branch |

## Chunk 18: ~8630–9130

| Item | Location | Anchor-only? | Sail/Genesis | Action |
|------|----------|--------------|--------------|--------|
| TransactionProgressModal, BaseManageModal, simple-mode steps | 8558–8680 | Anchor | Genesis/Sail similar | Keep |
| TokenSelectorDropdown, token groups, AmountInputBlock | 8690–8984 | Shared components | — | Keep |
| Fee display, mint-only toggle, PermitToggle, swap preview | 8854–9126 | Yes | No | Keep |

## Chunk 19: ~9130–9630

| Item | Location | Anchor-only? | Sail/Genesis | Action |
|------|----------|--------------|--------------|--------|
| "You will receive" + mint fee + conversion (step 1 tx overview) | 9125–9217 | Shared pattern | Genesis similar | Keep |
| Step 3 tx overview: depositTokenSymbol → price, mint-only vs deposit | 9604–9724 | Yes | No | Keep |
| **`depositTokenPriceUSD` from symbol** (eth/weth/wsteth/steth/fxsave/usdc/fxusd/ha) | 9193–9202, 9608–9637, 9961–9974, 11441–11451, 11556–11573, withdraw usd 11501–11511 | Duplicated 6+ blocks | Genesis has own variant | ✅ **Done:** `getDepositTokenPriceUSD` in `utils/prices.ts`; Anchor uses in all fee + withdraw USD blocks |

## Chunk 20: ~9630–10130

| Item | Location | Anchor-only? | Sail/Genesis | Action |
|------|----------|--------------|--------------|--------|
| Fee warning (>2% / >50%), deposit limit warning | 9826–9855, 10022–10051 | Shared UI | Similar | Optional: `<FeeWarning>`, `<DepositLimitWarning>` later |
| Cancel / Try Again / Back + primary buttons | 9761–9921, 10050–10109 | Modal-specific | Similar | Keep |
| No-reward tx overview + Confirm & Mint | 9925–10118 | Yes | No | Keep |
| Advanced mode intro, withdraw NotificationsSection | 10114–10154 | Yes | No | Keep |

## Chunk 21: ~10130–10630

| Item | Location | Anchor-only? | Sail/Genesis | Action |
|------|----------|--------------|--------------|--------|
| Transaction Status (pending/processing/success/error) | 10120–10193 | Modal-specific | Similar | Keep |
| Positions list, pool rows, Reward filter, withdraw method toggle | 10196–10710 | Yes | No | Keep |
| **Dead "Old Redeem Tab" block** | 10832–11323 | Dead code | — | ✅ **Done:** removed `{false && ... && false && (` block (~492 lines) |

## Chunk 22: ~10630–11130

| Item | Location | Anchor-only? | Sail/Genesis | Action |
|------|----------|--------------|--------------|--------|
| Withdraw-only toggle, wallet position, no positions | 10712–10830 | Yes | No | Keep |
| Live withdraw Transaction Overview | Advanced-mode withdraw | Yes | No | Keep |
| **`priceUSD` from collateral symbol** in overview | Redemption Fee, Request Fee, "You will receive" | Duplicated | — | ✅ **Done:** use `getDepositTokenPriceUSD` in live overview (4 blocks) |

## Chunk 23: ~10720–11220

| Item | Location | Anchor-only? | Sail/Genesis | Action |
|------|----------|--------------|--------------|--------|
| Advanced deposit: Amount input, tx overview, fee display | 10832–11066 | Yes | Similar | Keep |
| Simple-mode "You will receive", deposit/withdraw USD | 10968–11020 | Yes | No | Keep |
| Live withdraw overview (dry-run, fees, bonus) | 11070–11320 | Yes | No | Keep |
| **Pool type + APR + Explainer** (Collateral/Sail) | 11450–11535, 11537–11623 | Duplicated | No | ✅ **Done:** `StabilityPoolTypeBlock` in `components/anchor/`; used in Mint-only/deposit options + Stability Pool Type Selector |

## Chunk 24: ~11220–11720

| Item | Location | Anchor-only? | Sail/Genesis | Action |
|------|----------|--------------|--------------|--------|
| Error banner, tx hash link, success message | 11324–11357 | Shared patterns | Similar | Keep |
| Cancel / Try Again / Back + primary buttons | 11359–11408, 11710–11760 | Modal-specific | Similar | Keep |
| Mint only / Deposit options, Pool type block | 11410–11472 | Yes | No | Keep |
| Stability Pool Type Selector, Current Deposit, Ledger marks | 11474–11526 | Yes | No | Keep |

## Chunk 25: ~11220–11650 (tail)

| Item | Location | Anchor-only? | Sail/Genesis | Action |
|------|----------|--------------|--------------|--------|
| **Etherscan tx link** (hash truncate + url) | 10178, 11534–11545 | Duplicated | Sail, Genesis, TxProgress, admin | ✅ **Done:** `TxLink` + `formatTxHashShort` in `shared/TxLink`; Anchor uses for tx hash + Transaction Status "View" |
| **Cancel / Processing / Retry / Back + primary** | 11347–11404, 11564–11617 | Duplicated 2× | Similar | ✅ **Done:** `ModalStepActions` in `modal/`; Anchor uses for Simple Mode Withdraw + Advanced Mode |
| BaseManageModal config, tabs, renderAnchorContent | 11621–11655 | Yes | Genesis/Sail use same pattern | Keep |

## End of file

- Audit complete through ~11.56k lines.

## 1000-line verification pass

- Re-scanned Anchor modal in ~1k-line chunks for missed extractions.
- **Confirmed:** Amount validation → `validateAmountInput`; post-tx/post-approve delays → `delay` + constants; Etherscan tx → `TxLink`; step actions → `ModalStepActions`; deposit-token USD → `getDepositTokenPriceUSD`; pool type UI → `StabilityPoolTypeBlock`.
- **Added:** `getPeggedTokenPriceUSD(peggedTokenPriceWei, peggedTokenSymbol, ethPrice)` in `utils/prices.ts` (haETH → ethPrice fallback). Replaced Early Withdrawal Fee block + "You will receive" (2×) + mint-only overview + deposit-tab overview + 1% Withdraw Fee (6 sites). One remaining inline use at ~9921 has custom `expectedDepositUSD / parseFloat(amount)` fallback; left as-is.
- **Timers:** `setTimeout` in modal used only for temp warning clear (5s) and debounce; no post-tx delays left inline.

---

## Implemented changes (this session)

1. **`types/anchor.ts`**
   - `WithdrawCollateralFilter`, `DEFAULT_WITHDRAW_COLLATERAL_FILTER`
   - `SelectedStabilityPool`
   - `GroupedPoolPosition`
   - `GroupBalanceKind`
   - `StabilityPoolEntry`
   - `SimpleModeStep`
   - `EarlyWithdrawalFeeEntry`
   - `PositionAmountField`, `PositionExceedsBalance`

2. **`utils/anchor.ts`**
   - `getAssetMarketPriority(assetSymbol, market)`
   - **Withdrawal window:** `formatDuration`, `formatTime`, `getFeeFreeDisplay`, `getRequestStatusText`, `getWindowBannerInfo`, `WithdrawWindowBanner` type.

3. **`utils/address.ts`** (new)
   - `isValidEthAddress(value): value is \`0x${string}\``

3b. **`utils/tx.ts`** (new)
   - `isUserRejection(err: unknown): boolean` — detect wallet "Cancel" / "Reject"; Anchor uses in handleMint, handleDeposit, handleWithdraw, handleRedeem + direct-ha deposit catch. Genesis/Sail can adopt.

3c. **`utils/prices.ts`** (new)
   - `getDepositTokenPriceUSD(symbol, { ethPrice, wstETHPrice, fxSAVEPrice, peggedTokenPrice }): number` — map deposit token symbol to USD price; Anchor uses in all fee display and withdraw "You will receive" USD blocks (6+ sites). Genesis can adopt.
   - `getPeggedTokenPriceUSD(peggedTokenPriceWei, peggedTokenSymbol, ethPrice): number` — pegged-token USD price with haETH → ethPrice fallback; used for Early Withdrawal Fee, "You will receive", mint-only overview, deposit overview, 1% Withdraw Fee (6 sites).

3d. **`components/anchor/StabilityPoolTypeBlock.tsx`** (new)
   - Pool type toggle (Collateral / Sail), APR display, explainer. Anchor uses in Mint-only/deposit options and Stability Pool Type Selector (2 sites).

3e. **`components/shared/TxLink.tsx`** (new)
   - `formatTxHashShort(hash)`, `TxLink({ hash, className?, children? })` — Etherscan tx link + truncated hash. Anchor uses for tx hash display and Transaction Status "View"; Sail/Genesis/TransactionProgressModal can adopt.

3f. **`components/modal/ModalStepActions.tsx`** (new)
   - Cancel / Processing / Retry / Back + primary. Anchor uses for Simple Mode Withdraw and Advanced Mode (2 sites). Genesis/Sail can adopt.

4. **`utils/modal.ts`**
   - `POST_TX_SETTLE_MS`, `POST_APPROVE_SETTLE_MS`, `POST_APPROVE_SHORT_MS`, `delay(ms)`; Anchor uses for post-tx / post-approve settle (4 + 10 + 1 sites); Genesis etc. can adopt.

5. **`AnchorDepositWithdrawModal.tsx`**
   - Use new types for state and memos.
   - Use `getAssetMarketPriority` from `utils/anchor` (removed duplicate inline).
   - Use `isValidEthAddress` for: `isValidMinterAddress`, `isValidStabilityPoolAddress`, `isValidMinterAddressForPrice`, `isValidRedeemMinterAddress`, `isValidFeeMinterAddress`, `isValidStabilityPoolMinter`; pool loops in `poolContracts`, `poolsWithData`, `rewardDataMeta` (pool address and wrapped token).
   - Use `WithdrawCollateralFilter` in dropdown `onChange`.
   - **Progress refactor:** `useAnchorProgressSteps`, `createProgressModalHandlers`; remove inline progress useMemos and close/retry handlers.
   - **Withdrawal window:** Import `formatDuration`, `formatTime`, `getFeeFreeDisplay`, `getRequestStatusText`, `getWindowBannerInfo` from `utils/anchor`; remove local definitions (~140 lines).
   - Remove dead `formatCollateralRatio`; use `EarlyWithdrawalFeeEntry` for `earlyWithdrawalFees` useMemo.
   - Drop unused `useCallback` import.
   - **Chunk 9–10:** Use `validateAmountInput` from `utils/validation` for amount/slippage inputs (3 sites); use `PositionAmountField` and `PositionExceedsBalance` for withdraw position handlers.
   - **Chunk 11–12:** Use `delay(POST_TX_SETTLE_MS)` from `utils/modal` for post-tx settle (4 sites); replace inline `setTimeout(2000)`.
   - **Chunk 13–14:** Use `delay(POST_APPROVE_SETTLE_MS)` for post-approve settle (10 sites); replace inline `setTimeout(1000)`.
   - **Chunk 15–16:** Use `isUserRejection` from `utils/tx` in handleMint, handleDeposit, handleWithdraw, handleRedeem + direct-ha deposit catch; use `POST_APPROVE_SHORT_MS` + `delay` for 500ms settle (1 site).
   - **Chunk 17–18:** Hoist `hasRequestWithdrawals`, use in `isButtonDisabled` (remove duplicate `hasRequestSelected`); fix `balance` ternary dead branch.
   - **Chunk 19–20:** Use `getDepositTokenPriceUSD` from `utils/prices` for all fee and withdraw USD calculations; remove ~60 lines of duplicated symbol→price blocks.
   - **Chunk 21–22:** Remove dead "Old Redeem Tab" block (`{false && ... && false && (` … `)}`, ~492 lines). Use `getDepositTokenPriceUSD` in live withdraw Transaction Overview (You will receive, Redemption Fee, Request Fee; 4 blocks).
   - **Chunk 23–24:** Extract `StabilityPoolTypeBlock` (Pool type toggle, APR, Explainer); use in Mint-only/deposit options and Stability Pool Type Selector (2 sites). Removed ~90 lines of duplicated JSX.
   - **Chunk 25:** Add `TxLink` + `formatTxHashShort` in `shared/`; use for tx hash block and Transaction Status "View". Add `ModalStepActions` in `modal/`; use for Simple Mode Withdraw and Advanced Mode button groups (2 sites). Removed ~90 lines of duplicated JSX.
   - **Pegged-token price:** Add `getPeggedTokenPriceUSD` in `utils/prices`; use in Early Withdrawal Fee, "You will receive" (2×), mint-only overview, deposit-tab overview, 1% Withdraw Fee (6 sites). Replaced inline `Number(peggedTokenPrice)/1e18` + haETH fallback.

---

## Follow-ups (Sail / Genesis — tackle tomorrow)

- **Use `TxLink`** in Sail, Genesis, `TransactionProgressModal`, and admin pages (replace inline `etherscan.io/tx` + truncated hash).
- **Use `ModalStepActions`** (or a variant) in Genesis and Sail where the same step-action pattern exists (Cancel / Processing / Retry / Back + primary).
- **Sail + Genesis refactors** (shared hooks, components, `BaseManageModal` alignment, etc.) — **tackle Sail and Genesis tomorrow**; in general, unify patterns across all three modals.

---

## Progress modal extraction (unify with Genesis / Sail)

Anchor’s progress logic (steps + index + close/retry) is now split into shared and Anchor-specific pieces.

### Shared (`utils/progress.ts`)

- **`computeCurrentStepIndex(steps)`** — first `in_progress` → first `pending` → last. Genesis/Sail can use this when deriving index from step statuses.
- **`applyStepStatuses(steps, currentIndex, isError)`** — set pending/in_progress/completed/error in place.
- **`applyStepStatusesWithSuccess(steps, currentIndex, isError, isSuccess)`** — same, but when `isSuccess` mark all completed.
- **`createProgressModalHandlers({ onClose, resetProgress, resetForm })`** — returns `handleClose` (reset + onClose) and `handleRetry` (reset + resetForm). Anchor uses it; Genesis/Sail can adopt for consistent close/retry.

### Anchor-specific

- **`useAnchorProgressSteps`** (`hooks/anchor/useAnchorProgressSteps`) — builds `TransactionStep[]` from `progressConfig` + `txHashes`, maps `AnchorFlowStep` → index, applies statuses, returns `{ steps, currentIndex }`.
- **`AnchorFlowStep`** (`types/anchor`) — flow steps used for step → index mapping.

### Genesis / Sail

- Both use **`TransactionProgressModal`** with `steps` and `currentStepIndex`.
- Genesis: `progressSteps` / `currentStepIndex` state, updated imperatively during the flow.
- Sail: `progressModal: ProgressModalState | null` with `{ isOpen, title, steps, currentStepIndex }`.
- They can optionally use **`computeCurrentStepIndex`** when inferring index from statuses, and **`createProgressModalHandlers`** for close/retry if they add a retry path.

---

## Next steps

- Continue auditing remaining 500-line chunks.
- Extract further types/utils only where clear duplication or reuse exists.
- Optionally migrate Genesis/Sail to `createProgressModalHandlers` and/or `computeCurrentStepIndex` where it fits.
