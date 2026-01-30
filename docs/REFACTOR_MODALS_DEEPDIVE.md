# Modal refactor deep-dive: centralize helpers, config, and shared logic

This document audits **Genesis**, **Anchor**, and **Sail** modals (and related pages) for duplicated logic, inline config, and generic patterns that should live in shared modules. Goal: simplify modals, improve readability, and make future changes central.

---

## For tomorrow – quick checklist

**Original suggestions**
- [x] **Format helpers** → Move `formatNumber`, `formatTokenAmount18`, `formatUsd18`, `scaleChainlinkToUsdWei` from Anchor modal into `utils/formatters` (or `format.ts`).
- [x] **Chainlink + tokens** → Add `CHAINLINK_FEEDS` and `REWARD_TOKEN_ADDRESSES` to config (or `priceFeeds`); remove from Anchor modal, useTokenPrices, etc.
- [x] **TransactionStatus / ModalStep** → Extract shared types (e.g. `TransactionStep`, `TransactionStepStatus`) and use across modals.
- [x] **Network logic** → Extract `useNetworkSwitch` (or `useMainnetGuard`) from Anchor; use in Anchor and optionally other modals/pages.
- [x] **Tab mapping** → Extract `mapInitialTabToDepositWithdraw` (or `useModalTabs`); replace `getInitialTab` in Anchor.
- [x] **getAcceptedDepositAssets** → Single impl in `utils/markets` (with optional `peggedTokenSymbol`); remove inline from Anchor & Sail.

**Broader audit (see §10–§14)**
- [x] **Remove or repurpose unused code** → AnchorWithdrawModal, GenesisClaimStatusModal, SailTokenSelector, AnchorTokenSelector, ComingSoonOverlay, CountUp; utils/fonts, utils/harborMarks, utils/zapCalculations.
- [x] **Use or remove hooks/modal** → useModalState, useProgressModal, usePriceDisplay, useTransactionFlow; either wire into modals or delete.
- [x] **Centralize duplicate modal patterns** → handleClose reset, validate amount, handleMax, amount-input validation, Try Again / retry, progress-modal state.
- [x] **Unify status modals** → MintRedeemStatusModal vs GenesisClaimStatusModal; consider one shared `TxStatusModal` (if GenesisClaim is ever used).

---

## 1. Formatting helpers → `utils/formatters` (or `utils/format.ts`)

### Current state

| Location | Helpers | Notes |
|----------|---------|--------|
| **AnchorDepositWithdrawModal** | `formatNumber`, `formatTokenAmount18`, `formatUsd18`, `scaleChainlinkToUsdWei` | Inline, ~65 lines |
| **utils/formatters** | `formatUSD`, `formatToken`, `formatTokenAmount`, `formatCompact`, `formatPercent`, … | Already shared |
| **GenesisDepositModal**, **GenesisWithdrawModal** | Use `formatTokenAmount`, `formatBalance`, `formatUSD` from formatters | ✅ |
| **SailManageModal** | Uses `formatUnits` from viem directly | Ad-hoc |
| **AnchorMarketExpandedView** | `formatNumberWithDecimals` | Inline, similar to `formatNumber` |
| **CompoundConfirmationModal** | `formatTokenAmount` (local) | Different signature than formatters |
| **anchor/page** | `formatTokenAmount` (local `useCallback`) | Page-specific |

### Recommendation

- **Add to `utils/formatters.ts`** (or a dedicated `utils/format.ts` if you prefer separation):
  - `formatNumber(value, maxDecimals?)` — locale + compact for large numbers (from Anchor).
  - `formatTokenAmount18(value, capDecimals?)` — 18-decimal token amounts, small-balance handling (from Anchor).
  - `formatUsd18(usdWei)` — 18-decimal USD-wei → `"$X"` (from Anchor).
  - `scaleChainlinkToUsdWei(answer, decimals)` — scale Chainlink answer to 18-decimal USD wei.
- **Remove** the inline definitions from `AnchorDepositWithdrawModal` and import from formatters.
- **Replace** `formatNumberWithDecimals` in `AnchorMarketExpandedView` with `formatNumber` (or a small wrapper).
- **Audit** `CompoundConfirmationModal` and anchor page formatters: use shared `formatTokenAmount` / `formatTokenAmount18` where possible.

### Files to touch

- `src/utils/formatters.ts` — add helpers.
- `src/components/AnchorDepositWithdrawModal.tsx` — remove inline, use formatters.
- `src/components/anchor/AnchorMarketExpandedView.tsx` — use `formatNumber`.
- Optionally: `CompoundConfirmationModal`, `anchor/page` formatters.

---

## 2. Chainlink feeds & reward token addresses → config

### Current state

| Location | What | Values |
|----------|------|--------|
| **AnchorDepositWithdrawModal** | `CHAINLINK_FEEDS`, `FXSAVE_TOKEN_ADDRESS`, `WSTETH_TOKEN_ADDRESS`, `STETH_TOKEN_ADDRESS` | ETH/USD, BTC/USD + 3 token addrs |
| **useTokenPrices** | `CHAINLINK_FEEDS` | ETH_USD, BTC_USD, **EUR_USD** |
| **useAnchorPrices** | `CHAINLINK_ETH_USD_ORACLE`, `CHAINLINK_BTC_USD_ORACLE` | Same ETH/BTC addresses |
| **api/landing/summary/route** | `CHAINLINK_ETH_USD`, `CHAINLINK_BTC_USD`, `CHAINLINK_EUR_USD` | Same |
| **genesis/page** | `CHAINLINK_BTC_USD_ORACLE` | Same BTC |
| **utils/priceFeeds** | `PRICE_FEED_REGISTRY` | Token addr → feed addr map (wstETH, stETH); different use case |

So **ETH_USD**, **BTC_USD**, **EUR_USD** and the mainnet **fxSAVE / wstETH / stETH** addresses are duplicated across several files.

### Recommendation

- **Add `config/chains` or `config/priceFeeds`** (or extend existing config):
  - `CHAINLINK_FEEDS = { ETH_USD, BTC_USD, EUR_USD }` (mainnet feed addresses).
  - `REWARD_TOKEN_ADDRESSES = { FXSAVE, WSTETH, STETH }` (mainnet).
- **Use this config** in:
  - `AnchorDepositWithdrawModal`
  - `useTokenPrices`
  - `useAnchorPrices`
  - `api/landing/summary/route`
  - `genesis/page` (and any other Consumer of these feeds).
- **Keep** `utils/priceFeeds` for `PRICE_FEED_REGISTRY`, `getPriceFeedAddress`, `queryChainlinkPrice`; have it import feed addresses from config if needed, so config is the single source of truth.

### Files to touch

- New or extended: `src/config/chains.ts` or `src/config/priceFeeds.ts`.
- `AnchorDepositWithdrawModal`, `useTokenPrices`, `useAnchorPrices`, `api/landing/summary/route`, `genesis/page`, and optionally `priceFeeds.ts`.

---

## 3. Generic types: `TransactionStatus`, `ModalStep`, step status

### Current state

| Location | Type | Purpose |
|----------|------|--------|
| **AnchorDepositWithdrawModal** | `TransactionStatus` | `{ id, label, status, hash?, error? }`, status = pending \| processing \| success \| error |
| **TransactionProgressModal** | `TransactionStep`, `TransactionStepStatus` | `TransactionStep`: id, label, status, txHash?, error?, details?, fee?; status = pending \| in_progress \| completed \| error |
| **GenesisWithdrawModal** | `ModalStep` | `"input" \| "withdrawing" \| "success" \| "error"` |
| **GenesisDepositModal** | `ModalStep` | `"input" \| "approving" \| "depositing" \| "success" \| "error"` |
| **SailManageModal** | `ModalStep` | `"input" \| "approving" \| "minting" \| "redeeming" \| "success" \| "error"` |
| **AnchorDepositWithdrawModal** | `ModalStep` | Large union (input, approving, minting, depositing, withdrawing, …) |
| **AnchorWithdrawModal** | `ModalStep` | `"input" \| "withdrawing" \| "success" \| "error"` |

`TransactionStatus` and `TransactionStep` are effectively the same concept; only status literals differ (e.g. `processing` vs `in_progress`).

### Recommendation

- **Centralize** in e.g. `src/types/modal.ts` or `src/components/modal/types.ts`:
  - `TransactionStepStatus = "pending" | "in_progress" | "completed" | "error"` (align with `TransactionProgressModal`).
  - `TransactionStep` = `{ id, label, status: TransactionStepStatus, txHash?, error?, details?, fee? }`.
  - `ModalStepBase = "input" | "success" | "error"`; each modal can extend with its own flow-specific steps.
- **Use** these types in `TransactionProgressModal`, `useProgressModal`, and all modals. **Deprecate** `TransactionStatus` in favor of `TransactionStep` (or a single alias).
- **Reuse** `TransactionStep` / `TransactionStepStatus` in Anchor’s progress UI so Anchor and Sail/Genesis use the same primitives.

### Files to touch

- New: `src/types/modal.ts` or `src/components/modal/types.ts`.
- `TransactionProgressModal`, `useProgressModal`, Anchor/Sail/Genesis modals, `AnchorWithdrawModal`.

---

## 4. Network switching → `useNetworkSwitch` / `useMainnetGuard`

### Current state

- **AnchorDepositWithdrawModal** has the full logic:
  - `walletChainId` from `connector.getChainId()`
  - `effectiveChainId = walletChainId ?? chainId`
  - `isCorrectNetwork`, `shouldShowNetworkSwitch`
  - `handleSwitchNetwork`, `ensureCorrectNetwork`
- **GenesisWithdrawModal** only passes `chainId: mainnet.id` into `useWriteContract`.
- **WalletButton** uses `chainId !== mainnet.id` and `switchChain({ chainId: mainnet.id })`.
- **Account** uses `useSwitchChain` for network dropdown.

So only Anchor implements “guard + switch” logic; WalletButton does a simpler check.

### Recommendation

- **Add** `useNetworkSwitch` (or `useMainnetGuard`):
  - Reads `connector?.getChainId` and `useChainId()`, computes `effectiveChainId`.
  - Returns `isCorrectNetwork`, `shouldShowNetworkSwitch`, `handleSwitchNetwork`, `ensureCorrectNetwork`, and optionally `isSwitching`.
- **Use** this hook in:
  - `AnchorDepositWithdrawModal` (replace inline logic).
  - Any other modal or page that performs mainnet-only txs (e.g. Genesis modals if you add network guard later).
  - Optionally **WalletButton** (internal logic could delegate to the hook).
- **Keep** `mainnet` in `wagmi/chains`; the hook stays chain-agnostic by taking `targetChainId` (default `mainnet.id`).

### Files to touch

- New: `src/hooks/useNetworkSwitch.ts` (or `useMainnetGuard`).
- `AnchorDepositWithdrawModal` — remove network logic, use hook.
- Optionally: `WalletButton`, Genesis modals.

---

## 5. Tab mapping (`getInitialTab`, `activeTab`) → shared util / hook

### Current state

- **AnchorDepositWithdrawModal**:
  - `getInitialTab()` maps `mint` | `deposit` | `deposit-mint` → `"deposit"`, `withdraw` | `redeem` | `withdraw-redeem` → `"withdraw"`.
  - `activeTab`: `"deposit" | "withdraw"`.
- **GenesisManageModal**: `initialTab`: `"deposit" | "withdraw"`.
- **SailManageModal**: `activeTab`: `"mint" | "redeem"`; `initialTab` default `"mint"`.
- **Genesis [id] page**: `activeTab`: `"deposit" | "withdraw" | "claim"`.
- **Earn PoolClient**: `activeTab`: `"deposit" | "withdraw"`.

Anchor’s `initialTab` prop accepts more variants than the internal `TabType`; the mapping is local.

### Recommendation

- **Add** `mapInitialTabToDepositWithdraw(initialTab: string): "deposit" | "withdraw"` (or similar) in e.g. `utils/modal` or `hooks/modal`:
  - Centralize the same mapping Anchor uses today.
- **Use** it in Anchor (and any other modal that accepts `mint`/`deposit`/`withdraw`/`redeem`-style `initialTab`).
- **Consider** a small `useModalTabs` hook if you want to also own `activeTab` state and `onTabChange` in one place; otherwise a pure util is enough.
- **Sail** uses `mint`/`redeem`; either keep that as-is or add a separate mapping util if you later unify terminology (e.g. mint→deposit, redeem→withdraw).

### Files to touch

- New: `src/utils/modal.ts` or `src/hooks/modal/useModalTabs.ts` with `mapInitialTabToDepositWithdraw`.
- `AnchorDepositWithdrawModal` — replace `getInitialTab` with shared util.

---

## 6. `getAcceptedDepositAssets` → single implementation

### Current state

- **utils/markets**: `getAcceptedDepositAssets(market)` — used by GenesisManageModal, genesis page.
- **utils/anchor**: `getAcceptedDepositAssets(market, peggedTokenSymbol?)` — used by `useAnchorMarketData`; adds pegged token when provided.
- **AnchorDepositWithdrawModal**: inline implementation, same idea as markets.
- **SailManageModal**: inline implementation, same idea as markets.

### Recommendation

- **Single implementation**: extend `utils/markets.getAcceptedDepositAssets` with an optional `peggedTokenSymbol` (mirror `utils/anchor` behavior).
- **Remove** inline versions from Anchor and Sail modals; **use** `getAcceptedDepositAssets` from `@/utils/markets`.
- **Replace** `utils/anchor.getAcceptedDepositAssets` usage with `utils/markets`; then remove the duplicate from anchor utils (or re-export from markets).

### Files to touch

- `src/utils/markets.ts` — add optional `peggedTokenSymbol`.
- `src/utils/anchor.ts` — remove `getAcceptedDepositAssets` or re-export from markets.
- `AnchorDepositWithdrawModal`, `SailManageModal` — remove inline, import from `@/utils/markets`.
- `useAnchorMarketData` — switch to `@/utils/markets` (or keep using anchor re-export).

---

## 7. Summary: proposed new/updated modules

| Module | Purpose |
|--------|---------|
| **utils/formatters** | Add `formatNumber`, `formatTokenAmount18`, `formatUsd18`, `scaleChainlinkToUsdWei`; use across modals/pages |
| **config/chains** or **config/priceFeeds** | `CHAINLINK_FEEDS`, `REWARD_TOKEN_ADDRESSES`; single source for mainnet feeds & tokens |
| **types/modal** or **components/modal/types** | `TransactionStep`, `TransactionStepStatus`, `ModalStepBase`; align Anchor with TransactionProgressModal |
| **hooks/useNetworkSwitch** | `effectiveChainId`, `isCorrectNetwork`, `handleSwitchNetwork`, `ensureCorrectNetwork` |
| **utils/modal** or **hooks/modal** | `mapInitialTabToDepositWithdraw` (and optionally `useModalTabs`) |
| **utils/markets** | Extend `getAcceptedDepositAssets(market, peggedTokenSymbol?)`; remove duplicates elsewhere |

---

## 8. Suggested order of work

1. **Config**: Add Chainlink + reward-token config, switch consumers (including Anchor modal).
2. **Formatters**: Add format helpers, refactor Anchor (and optionally AnchorMarketExpandedView, etc.).
3. **getAcceptedDepositAssets**: Unify in `utils/markets`, remove inline and anchor duplicate.
4. **Types**: Introduce shared modal/transaction step types; use in TransactionProgressModal and modals.
5. **useNetworkSwitch**: Extract from Anchor, use in Anchor (and optionally elsewhere).
6. **Tab mapping**: Extract `mapInitialTabToDepositWithdraw`, use in Anchor.

This order avoids big behavioral changes early (config + formatters + getAcceptedDepositAssets first), then types and hooks to simplify the modal implementations.

---

## 9. Quick reference: where things live today

| Item | Anchor | Genesis | Sail | Others |
|------|--------|---------|------|--------|
| Format helpers | Inline (formatNumber, formatTokenAmount18, formatUsd18, scaleChainlinkToUsdWei) | formatters | viem formatUnits | formatters, AnchorMarketExpandedView, CompoundConfirmationModal, anchor page |
| Chainlink / token addrs | Inline FEEDS + FXSAVE/WSTETH/STETH | — | — | useTokenPrices, useAnchorPrices, landing API, genesis page |
| TransactionStatus / Step | Own `TransactionStatus` | — | Local progress state + TransactionProgressModal | TransactionProgressModal |
| ModalStep | Large union | Smaller unions | Smaller union | AnchorWithdrawModal |
| Network switch | Full logic | chainId in useWriteContract | — | WalletButton, Account |
| Tab mapping | `getInitialTab` | initialTab only | initialTab only | Genesis [id], Earn PoolClient |
| getAcceptedDepositAssets | Inline | utils/markets | Inline | utils/markets, utils/anchor, genesis page, useAnchorMarketData |

---

## 10. Unused code – remove or repurpose

Audit of components, utils, and hooks that are **never imported** or only self-referenced.

### Components

| Item | Status | Notes |
|------|--------|-------|
| **AnchorWithdrawModal** | Unused | Anchor page uses `AnchorDepositWithdrawModal` (deposit + withdraw). This withdraw-only modal is dead. **Remove** or fold into DepositWithdraw if you ever need a withdraw-only variant. |
| **GenesisClaimStatusModal** | Unused | No imports. Similar to `MintRedeemStatusModal` (status pending/completed/error, `useWaitForTransactionReceipt`, Try Again/Close). **Remove** unless you plan to use it; otherwise consider merging with MintRedeemStatusModal into a shared `TxStatusModal`. |
| **SailTokenSelector** | Unused | Modals use `TokenSelectorDropdown`. **Remove** unless needed elsewhere. |
| **AnchorTokenSelector** | Unused | Same. **Remove** unless needed. |
| **ComingSoonOverlay** | Unused | No imports. **Remove** or use where “coming soon” UI is needed. |
| **CountUp** | Unused | No imports. **Remove** or use for numeric animations. |

### Utils

| Item | Status | Notes |
|------|--------|-------|
| **utils/fonts** | Unused | `Geo`, `Space_Grotesk`. No imports. MintRedeemStatusModal / GenesisClaimStatusModal use `Geo` locally. **Remove** or switch those to `@/utils/fonts` and use. |
| **utils/harborMarks** | Unused | `calculateHarborMarks`, etc. Only used inside the same file. No other consumer. **Remove** or wire into `useHarborMarks` / genesis UI if you want client-side marks fallback. |
| **utils/zapCalculations** | Unused | `calculateMinFxSaveOut`. Referenced in STABILITY_POOL_ZAPS_IMPLEMENTATION.md but **never imported** in src. **Use** in Anchor modal for minFxSaveOut, or **remove** if that logic lives elsewhere. |

### Files to touch

- Delete or repurpose: `AnchorWithdrawModal`, `GenesisClaimStatusModal`, `SailTokenSelector`, `AnchorTokenSelector`, `ComingSoonOverlay`, `CountUp`.
- Delete or wire up: `utils/fonts`, `utils/harborMarks`, `utils/zapCalculations` (use in Anchor vs remove).

---

## 11. `hooks/modal` – use or remove

`hooks/modal` exports `useModalState`, `useProgressModal`, `usePriceDisplay`, `useTransactionFlow` (alias for `usePermitOrApproval`). **Nothing imports from `@/hooks/modal`.** Modals use `usePermitOrApproval` from `@/hooks/usePermitOrApproval` directly.

| Hook | Purpose | Used? |
|------|---------|--------|
| **useModalState** | amount, error, step, txHash, notifications, permit; `reset` | No. Modals manage state locally. |
| **useProgressModal** | progress modal open/title/steps/currentStep, open/close/setStepStatus/advance | No. Genesis/Anchor/Sail use raw `useState` for progress. |
| **usePriceDisplay** | CoinGecko prices (ETH, BTC, wstETH, stETH, fxSAVE) + `formatUSD` | No. Could replace ad-hoc price logic in modals. |
| **useTransactionFlow** | Re-export of `usePermitOrApproval` | No. Callers use `usePermitOrApproval` directly. |

### Recommendation

- **Either** wire these into modals:
  - Use `useModalState` for amount/error/step/txHash/notifications/permit and `reset`; use `useProgressModal` for progress UI instead of ad-hoc state.
  - Use `usePriceDisplay` where modals need USD prices for overviews.
- **Or** remove the unused hooks and the `useTransactionFlow` re-export. Keep `usePermitOrApproval` as the single source.

---

## 12. Duplicate modal patterns – centralize

These patterns repeat across Genesis, Anchor, and Sail modals. Centralizing them will shrink modal code and keep behavior consistent.

### handleClose reset

Every modal resets state on close: `setAmount("")`, `setStep("input")`, `setError(null)`, sometimes `setTxHash(null)`, then `onClose()`. Some also guard with `if (step === "withdrawing") return;`.

- **Recommendation:** Introduce `useModalCloseHandler({ onClose, setAmount, setStep, setError, setTxHash, busySteps? })` that returns `handleClose`. Or extend `useModalState` with `handleClose` that resets + `onClose`, and use it everywhere.

### Validate amount / canSubmit

Repeated checks: `!amount || parseFloat(amount) <= 0` → “Please enter a valid amount”; `amountBigInt > balance` → “Insufficient balance”. Messaging varies slightly.

- **Recommendation:** Add `validateAmount(amount, balance, options?)` (and optionally `validateAmountForWithdraw`) in `utils/validation` or `utils/modal`. Return `{ valid: boolean; error?: string }`. Use in all modals.

### handleMaxClick

Set amount to balance (or derived max), clear error. Logic differs per context (simple balance vs total withdrawable vs deposit asset balance).

- **Recommendation:** Keep `handleMaxClick` local but extract a small `getMaxAmount(tab, balances, …)` (or similar) where the **rules** are shared. Use it inside each modal’s `handleMaxClick`. Alternatively, pass `maxAmount` into `AmountInputBlock` and have a shared “MAX” handler that sets to `formatUnits(maxAmount, decimals)`.

### Amount-input validation (regex)

Several modals allow only digits and one decimal: `value === "" || /^\d*\.?\d*$/.test(value)`, sometimes with “cap at balance” logic.

- **Recommendation:** Extract `parseAmountInput(value, decimals?, balance?)` or `validateAmountInput(value)` (and optionally cap) in `utils/validation`. Use in `onChange` handlers across modals.

### Try Again / retry

Progress modals show “Try Again” on error; it usually means “reset to input (or last safe step) and allow retry”. Each modal implements this slightly differently.

- **Recommendation:** Standardize on `TransactionProgressModal`’s `onRetry` + `retryButtonLabel`. Have a shared “retry” handler that clears error, sets step back to `input` (or appropriate step), and optionally resets amount. Use it in all modals that use `TransactionProgressModal`.

### Progress modal state

Genesis and Anchor use `progressModalOpen` + local steps state; Sail uses a `progressModal` object (`isOpen`, `title`, `steps`, `currentStepIndex`, etc.). `useProgressModal` already encapsulates the Sail-style shape.

- **Recommendation:** Use `useProgressModal` in **all** modals that use `TransactionProgressModal`. Remove ad-hoc `progressModalOpen` / `progressModal` state.

### Error messages

Strings like “Please enter a valid amount”, “Insufficient balance”, “Please enter a valid amount to redeem” are duplicated.

- **Recommendation:** Add `MODAL_ERROR_MESSAGES` (or similar) in `constants/modal` or `utils/modal`, and use these keys everywhere. Reduces duplication and keeps copy consistent.

---

## 13. Status modals – MintRedeemStatusModal vs GenesisClaimStatusModal

- **MintRedeemStatusModal:** Used by `MintRedeemForm`. Shows pending/completed/error; `useWaitForTransactionReceipt`; Try Again / Close.
- **GenesisClaimStatusModal:** Unused. Same structure, plus “Add to Wallet” and `GenesisTransactionProgressSteps`.

Both share: status state, `useWaitForTransactionReceipt`, `getStatusIcon`, Try Again/Close.

- **Recommendation:** If you keep GenesisClaimStatusModal, extract a shared `TxStatusModal` (or similar) that handles status + receipt + retry/close. MintRedeem and GenesisClaim can render different content (e.g. custom body, Add to Wallet) via props or slots. If you never use GenesisClaimStatusModal, remove it.

---

## 14. Quick reference – duplicate vs shared

| Pattern | Anchor | Genesis | Sail | Centralize? |
|---------|--------|---------|------|-------------|
| handleClose reset | Yes | Yes | Yes | `useModalCloseHandler` or `useModalState.handleClose` |
| validate amount | Yes | Yes | Yes | `validateAmount` in utils |
| handleMaxClick | Yes | Yes | Yes | Shared `getMaxAmount` or pass `maxAmount` into `AmountInputBlock` |
| Amount-input regex / cap | Yes | Yes | Yes | `parseAmountInput` / `validateAmountInput` in utils |
| Try Again / retry | Yes | Yes | Yes | Shared retry handler + `TransactionProgressModal` `onRetry` |
| Progress modal state | Local state | Local state | Local state | `useProgressModal` everywhere |
| Error copy | Inline | Inline | Inline | `MODAL_ERROR_MESSAGES` |
| useModalState | No | No | No | Use or remove |
| useProgressModal | No | No | No | Use or remove |
| usePriceDisplay | No | No | No | Use or remove |

---

## 15. Further opportunities

- **Balance / allowance reads:** `useErc20` exposes `useErc20Balance`, `useErc20Allowance`, `useErc20BalanceAndAllowance`. Modals often use `useContractRead` / `useContractReads` directly for balance and allowance. Consider using `useErc20*` where it fits to reduce duplication and keep reads consistent.
- **Debounced amount:** Only Anchor uses debounced amount for dry-run / quote calls. If more modals need it, extract `useDebouncedAmount(amount, ms)` and use it where appropriate.
- **GenesisTransactionProgressSteps:** Used by `TransactionProgressModal` (and `GenesisClaimStatusModal`, which is unused). If you remove GenesisClaimStatusModal, no extra change needed; steps stay in TransactionProgressModal.

---

*Generated as part of the modal refactor deep-dive. Implement incrementally and run tests after each step.*
