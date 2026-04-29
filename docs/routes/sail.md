# Sail (`/sail`)

Client index for variable-leverage Sail tokens: batched minter/oracle reads, subgraph PnL, manage modal, and Ledger Marks. **`?view=basic`** (UI−) shows title + leverage list only; full layout adds hero cards, user stats, subgraph banner, and Sail Marks bar — same **`isBasicPageLayout`** / nav toggle pattern as Genesis. **Route data:** [`useSailPageData`](../../src/hooks/useSailPageData.ts) (filters, PnL, marks, aggregates) + [`useSailContractReads`](../../src/hooks/useSailContractReads.ts) (wagmi batches, prices, deposits). **Detail route:** there is no `app/sail/[id]/page.tsx` yet — parity with [`genesis/[id]`](../../src/app/genesis/[id]/page.tsx) (claim/detail flows) is roadmap, not shipped here. See **[`docs/INDEX_PAGE_PATTERN.md`](../INDEX_PAGE_PATTERN.md)** for the full port checklist.

**UI modules:** [`src/components/sail/`](../../src/components/sail/) — `SailPageTitleSection`, `SailExtendedHero` (boost + `SailHeroIntroCards`), `SailUserStatsCards`, `SailMarksSubgraphErrorBanner`, `SailLedgerMarksBar`, **`SailMarketsToolbar`**, **`SailMarketsTableHeader`**, **`SailMarketsSections`** (toolbar + table body; see Genesis `GenesisMarketsSections`). Barrel: [`index.ts`](../../src/components/sail/index.ts).

**Audit extras (performance & polish):** batched `minter.config` + `rebalanceThreshold` reads (vs per-row `useContractRead`), O(1) market id → index map, `React.memo` on rows with stable callbacks, App Router `metadata` in `layout.tsx`, Genesis §7 radius parity (`rounded-md`), modal `onSuccess` refetch + React Query invalidation for subgraph PnL, optional `next/dynamic` for `PriceChart`. Shared long/short parsing lives in [`src/utils/marketSideLabels.ts`](../../src/utils/marketSideLabels.ts).

---

## Architecture (page + table)

| Layer | Role |
|-------|------|
| [`page.tsx`](../../src/app/sail/page.tsx) | Layout, `useSailPageData`, filters, expanded-row state, `SailManageModal`, `SailMarketRow` list only (~250 lines). |
| [`SailMarketRow`](../../src/components/sail/SailMarketRow.tsx) | One leverage row: mobile strip + desktop grid, fee tooltips, PnL hook, expanded panel. |
| [`SailMarketExpandedView`](../../src/components/sail/SailMarketExpandedView.tsx) | Expanded block: copy, TVL, stats, `PriceChart` (dynamic). |
| [`useSailContractReads`](../../src/hooks/useSailContractReads.ts) | `sailMarkets` tuples, batched reads, offsets, minter config maps, deposits. |
| [`useSailPageData`](../../src/hooks/useSailPageData.ts) | Composes reads + filters + `filterSailActiveMarkets` + marks/PnL aggregates. |

**Fee UI (extracted):**

- [`src/utils/sailFeeBands.ts`](../../src/utils/sailFeeBands.ts) — band math from minter config (`bandsFromConfig`, `getCurrentFee`, `getActiveFeeBand`).
- [`src/utils/sailDisplayFormat.ts`](../../src/utils/sailDisplayFormat.ts) — table/expanded display helpers (`formatUSD`, `formatToken`, `formatRatio`, etc.); separate from global `formatters.ts` where semantics differ.
- [`SailFeeBandBadge`](../../src/components/sail/SailFeeBandBadge.tsx), [`SailFeeBandsPanel`](../../src/components/sail/SailFeeBandsPanel.tsx), [`SailFeeRatioCell`](../../src/components/sail/SailFeeRatioCell.tsx), [`SailMintRedeemFeeColumn`](../../src/components/sail/SailMintRedeemFeeColumn.tsx) — mint/redeem column + tooltips.

**Types:**

- [`src/types/sail.ts`](../../src/types/sail.ts) — `SailMarketTuple`, `SailContractReads` / `SailContractReadSlot`.
- [`src/config/markets.ts`](../../src/config/markets.ts) — `Market`, **`DefinedMarket`** (`NonNullable<Market>`) for Sail UI when config values are always defined.
- [`sailMarketTypes.ts`](../../src/components/sail/sailMarketTypes.ts) — `SailMarketPnLData`.

**Filter helper:** [`filterSailActiveMarkets`](../../src/utils/sailActiveMarkets.ts) — pure; mirrors `activeMarkets` in `useSailPageData` for tests/reuse.

---

## Desktop table grid

Header ([`SailMarketsTableHeader`](../../src/components/sail/SailMarketsTableHeader.tsx)) and rows ([`SailMarketRow`](../../src/components/sail/SailMarketRow.tsx)) share the same template:

`grid-cols-[32px_2.2fr_0.92fr_0.82fr_0.92fr_0.92fr_0.96fr_0.72fr]`

Columns: Network · Long/Short · Token · Leverage · Your position · Current value · Mint / Redeem fee · Action. Gaps: `gap-2 md:gap-3 lg:gap-3.5` on rows; similar on header.

**Fee badges (table):** [`SailFeeBandBadge`](../../src/components/sail/SailFeeBandBadge.tsx) uses fixed width `w-[calc(4.5rem-5px)]` for the mint/redeem pills (5px narrower than `4.5rem`); tooltip content uses full labels.

**Long/Short strip:** Short side uses `min-w-0` + flex so long names (e.g. SILVER) fit; chevron `w-4 h-4`, no `truncate` on the short label when space allows.

---

## `SailManageModal` ([`src/components/SailManageModal.tsx`](../../src/components/SailManageModal.tsx))

- Props use **`DefinedMarket`** from config (same objects as the table).
- Optional address fields that are not on every market’s `addresses` union (e.g. `leveragedTokenZap`, `underlyingCollateralToken`) are read via a small **`addressByName`** `Record` cast so TypeScript stays sound.

This modal is **only** used from the Sail page. It is **not** shared with Genesis.

---

## Genesis vs Sail — do we need the same modal changes?

**No.** Genesis uses **[`GenesisManageModal`](../../src/components/GenesisManageModal.tsx)** + **`GenesisDepositModal`**, not `SailManageModal`. Deposit/mint flows differ (genesis phases, different tabs).

**Shared pieces that already apply app-wide:**

| Piece | Notes |
|-------|--------|
| [`marketSideLabels.ts`](../../src/utils/marketSideLabels.ts) | Long/short helpers take **`DefinedMarket`** — used by Sail **and** Genesis index UIs. |
| [`DefinedMarket`](../../src/config/markets.ts) | Exported from config; Sail re-exports from [`components/sail/index.ts`](../../src/components/sail/index.ts) for convenience. |
| [`useTransactionProgress`](../../src/hooks/useTransactionProgress.ts) | **`setSteps`** typing was widened so updaters can return `{ steps, currentStepIndex }` (matches implementation). Any modal using that pattern benefits; not Sail-only. |

So there is **nothing to copy from `SailManageModal` into Genesis** unless you deliberately unify deposit UIs later.

---

## Changelog (Sail-focused)

Rough chronological order of the work bundled into this documentation:

1. **Refactor for readability** — Split monolithic `page.tsx` into `SailMarketRow`, `SailMarketExpandedView`, fee helpers, and shared utils; slim `page.tsx` to wiring only.
2. **Typing** — `DefinedMarket`, `SailMarketTuple`, `SailContractReads`, modal + row props; `useSailContractReads` / `useSailPageData` typed tuples; removed unused `sailMarkets` destructure where applicable.
3. **SailManageModal** — `DefinedMarket`, `addressByName` for optional address keys.
4. **Table UX** — Fee badge width −5px (`calc(4.5rem-5px)`), grid rebalance for Long/Short vs other columns, tighter gaps, short-side layout for long asset names (e.g. SILVER).
5. **Hooks** — `useTransactionProgress` `setSteps` public type aligned with implementation.

---

## See also

- [`layout.tsx`](../../src/app/sail/layout.tsx) — metadata.
- [`docs/INDEX_PAGE_PATTERN.md`](../INDEX_PAGE_PATTERN.md) — index page checklist (Genesis/Sail).
- [`docs/INDEX_PAGE_REFACTOR_PLAYBOOK.md`](../INDEX_PAGE_REFACTOR_PLAYBOOK.md) — portable checklist for refactoring other index routes (e.g. Anchor) to the same depth as Sail.
