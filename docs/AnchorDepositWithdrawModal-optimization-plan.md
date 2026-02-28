# AnchorDepositWithdrawModal.tsx – Optimization Plan

**Current size:** ~13,185 lines

## ✅ Implemented (Phase 1)
- **ErrorBanner** – `src/components/anchor/ErrorBanner.tsx` – Replaces 5 inline error divs
- **FeeDisplayRow** – `src/components/anchor/FeeDisplayRow.tsx` – Replaces 2 fee display blocks
- **getRevertReason** – `src/utils/parseViemRevert.ts` – Centralizes Viem error parsing (2 usages)
- **handleTxError** – Inline helper replacing 15+ `setError`+`setStep("error")` pairs

This document outlines concrete opportunities to reduce duplication, extract components, and improve maintainability.

---

## 1. High-impact extractions (components)

### 1.1 TransactionOverviewBlock
**~150 lines saved | 6+ usages**

The "Transaction Overview" + "You will receive" + fee display pattern repeats 6+ times with slight variations.

**Create:** `src/components/anchor/TransactionOverviewBlock.tsx`

```tsx
interface TransactionOverviewBlockProps {
  variant: "mint" | "direct-deposit" | "withdraw" | "redeem";
  // Shared
  peggedTokenSymbol: string;
  peggedTokenPriceUsdWei?: bigint;
  expectedOutput?: bigint;
  outputAmount?: number;
  outputSymbol?: string;
  // Fee
  feePercentage?: number;
  feeAmount?: number;
  feeSymbol?: string;
  depositTokenPriceUSD?: number;
  // Conversion text
  conversionText?: string;
  // Prices for amountToUSD
  prices: TokenPriceInputs;
}
```

**Usage:** Replace the 6+ inline blocks (lines ~9937, ~10412, ~10749, ~11836, ~12279, ~12498) with `<TransactionOverviewBlock {...props} />`.

---

### 1.2 FeeDisplayRow
**~40 lines saved | 5+ usages**

Mint fee + USD + high-fee warning (red when >2%, with ⚠️) repeats.

**Create:** `src/components/anchor/FeeDisplayRow.tsx`

```tsx
interface FeeDisplayRowProps {
  feePercentage: number;
  feeAmount: number;
  feeSymbol: string;
  feeUSD: number;
  showWarning?: boolean; // default: feePercentage > 2
}
```

---

### 1.3 ErrorBanner
**~8 lines saved | 3+ usages**

The red error box with `AlertOctagon` repeats.

**Create:** `src/components/anchor/ErrorBanner.tsx`

```tsx
export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="p-3 bg-red-50 border border-red-500/30 text-red-600 text-sm text-center flex items-center justify-center gap-2">
      <AlertOctagon className="w-4 h-4 flex-shrink-0" aria-hidden />
      {message}
    </div>
  );
}
```

---

### 1.4 WithdrawPositionCard
**~200 lines saved | 1 usage (but ~200 lines in a `.map`)**

The position card (checkbox, pool type, APR, amount input) in the withdraw flow is a large inline block. Extract to:

**Create:** `src/components/anchor/WithdrawPositionCard.tsx`

---

### 1.5 SwapPreviewCard
**~80 lines saved**

Slippage + swap details block – extract to `SwapPreviewCard.tsx`.

---

## 2. Helpers (reduce logic duplication)

### 2.1 Use `getTokenPriceUSD` consistently

The modal reimplements token→USD logic in multiple IIFEs:

```ts
// Current (repeated 5+ times):
const assetLower = selectedDepositAsset.toLowerCase();
if (assetLower === "eth" || assetLower === "weth") depositTokenPriceUSD = ethPrice || 0;
else if (assetLower === "wsteth" || ...) ...
```

**Fix:** Build a `prices` object once and use `getTokenPriceUSD(symbol, prices)` everywhere. `amountToUSD` already exists in `@/utils/tokenPriceToUSD`.

---

### 2.2 Centralize error handling

**Current:** `setError(msg)` + `setStep("error")` appears 35+ times.

**Create:** `useTransactionError` hook or inline helper:

```ts
const handleTxError = useCallback((msg: string) => {
  setError(msg);
  setStep("error");
}, []);
```

Then replace the 35+ catch blocks with `handleTxError("...")`.

---

### 2.3 Extract Viem error parsing

Repeated pattern:

```ts
if (err instanceof BaseError) {
  const revertError = err.walk((e) => e instanceof ContractFunctionRevertedError);
  if (revertError instanceof ContractFunctionRevertedError) {
    // use revertError.data
  }
}
```

**Create:** `src/utils/parseViemRevert.ts`:

```ts
export function getRevertReason(err: unknown): string | null {
  if (!(err instanceof BaseError)) return null;
  const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
  return revert instanceof ContractFunctionRevertedError ? revert.data?.errorName ?? null : null;
}
```

---

## 3. Custom hooks (extract state + logic)

### 3.1 useAnvilAwareContractRead

**Current:** 6 groups of "use Anvil data vs wagmi data" with `useAnvil ? anvilData : regularData`.

**Create:** `useAnvilAwareContractRead(options)` that encapsulates the branching. Reduces ~100 lines of repeated structure.

---

### 3.2 useDepositFormState / useWithdrawFormState

**Current:** ~40 `useState` calls, many related (deposit vs withdraw).

**Consider:** Group into objects, e.g.:

```ts
const [depositState, setDepositState] = useState({
  amount: "", mintOnly: false, depositInStabilityPool: true, ...
});
const [withdrawState, setWithdrawState] = useState({ ... });
```

Or extract to `useDepositFormState()` and `useWithdrawFormState()` hooks that return state + setters. This is a larger refactor but would significantly reduce the top-of-file noise.

---

## 4. Handler decomposition

### 4.1 Split handleMint (~1,500 lines)

`handleMint` has distinct paths:
- Collateral deposit (approve → mint → deposit)
- Direct pegged deposit
- Zap paths (USDC/ETH zap)
- Mint-only

**Extract:**
- `executeCollateralMint(...)`
- `executeDirectPeggedDeposit(...)`
- `executeZapMint(...)`
- `executeMintOnly(...)`

Then `handleMint` becomes a small dispatcher that calls the right function based on `isDirectPeggedDeposit`, `useZap`, etc.

---

### 4.2 Split handleWithdraw (~1,100 lines)

Similar extraction:
- `executeImmediateWithdraw(...)`
- `executeRequestWithdraw(...)`

---

## 5. UI patterns to unify

### 5.1 Toggle switch

The same toggle markup (`inline-flex h-5 w-9 rounded-full`) appears 4+ times. Extract `<TogglerSwitch checked={...} onChange={...} label="..." />`.

---

### 5.2 Step labels with arrows

Step 2 and Step 3 labels use nearly identical SVG arrows. Extract `<DepositStepLabels currentStep={1|2|3} />`.

---

### 5.3 Pool type selector (Collateral / Sail)

Same button group appears twice. Extract `<PoolTypeSelector value={...} onChange={...} />`.

---

## 6. Suggested order of implementation

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| 1 | `ErrorBanner` component | Low | Low (but quick win) |
| 2 | `FeeDisplayRow` component | Low | Medium |
| 3 | `handleTxError` / centralize setError+setStep | Low | Medium |
| 4 | Use `getTokenPriceUSD` consistently, remove inline price logic | Medium | Medium |
| 5 | `TransactionOverviewBlock` component | Medium | High |
| 6 | `WithdrawPositionCard` component | Medium | High |
| 7 | `getRevertReason` utility | Low | Low |
| 8 | Split `handleMint` into smaller functions | High | High |
| 9 | `useAnvilAwareContractRead` hook | Medium | Medium |
| 10 | `useDepositFormState` / state grouping | High | Medium |

---

## 7. Quick wins (minimal refactor)

1. **Remove IIFEs where a simple variable suffices** – Many `{(() => { ... return (...) })()}` blocks could be `useMemo` or precomputed variables.
2. **Extract magic numbers** – e.g. `feePercentage > 2` → `const HIGH_FEE_THRESHOLD = 2;`
3. **Consolidate `process.env.NODE_ENV === "development"` checks** – Wrap in `isDev` constant or use `debugTx` more consistently.
