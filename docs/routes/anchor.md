# Anchor (`/anchor`)

Client index for stability / haETH markets: grouped markets, batched contract reads, stability-pool APR (collateral + boost), rewards, Ledger Marks, and heavy deposit / compound / claim flows. The main implementation lives in a **large** [`page.tsx`](../../src/app/anchor/page.tsx); the target shape is the same as Sail: a thin route file plus extracted rows, table chrome, and typed hooks (see **[`docs/INDEX_PAGE_REFACTOR_PLAYBOOK.md`](../INDEX_PAGE_REFACTOR_PLAYBOOK.md)**).

**Nav “Earn”** in the app points here (`/anchor`). The separate **`/earn`** stability-pool directory is documented in [`docs/routes/earn.md`](./earn.md).

**UI− / UI+:** `/anchor` is in [`PAGE_LAYOUT_INDEX_EXACT_PATHS`](../../src/config/pageLayoutToggleRoutes.ts) with **`usePageLayoutPreference`** on the page (Basic = title + toolbar + list; Extended = hero cards, stats strip, subgraph banner, rewards bar). See **[`docs/INDEX_PAGE_PATTERN.md`](../INDEX_PAGE_PATTERN.md)**.

---

## Phases 0–3 status (Anchor index refactor)

Full portable checklist lives in **[`docs/INDEX_PAGE_REFACTOR_PLAYBOOK.md`](../INDEX_PAGE_REFACTOR_PLAYBOOK.md)**. Sail’s finished shape is **[`docs/routes/sail.md`](./sail.md)**. Use the table below so Phases 0–3 line up with what is **done**, **partial**, or **open** in this repo.

### Phase 0 — Baseline

| # | Item | Status |
|---|------|--------|
| 1 | Read playbook + Sail README (architecture, grid, modals) | **Reference:** files above; read before large refactors. |
| 2 | Skim this README + extractions vs monolithic `page.tsx` | **Ongoing:** partial extractions under `components/anchor/*`; `page.tsx` still very large. |
| 3 | Run app on `/anchor`, DevTools / network (filters, modals, slow paths) | **Manual** (local); cannot be checked in git. |

### Phase 1 — Inventory (no big moves yet)

| # | Item | Status |
|---|------|--------|
| 1 | List what `page.tsx` does: hooks, state, modals, invalidations, filters | **Partial (summary):** **Composed data:** [`useAnchorPageData`](../../src/hooks/anchor/useAnchorPageData.ts) (filters → `displayedAnchorMarkets`, staggered reads, `reads`, prices, marks, rewards, positions, `allMarketsData`, **`anchorStats`**). **Tx / compound / claim:** [`useAnchorTransactions`](../../src/hooks/anchor/useAnchorTransactions.ts). **Page-local:** `useMultipleCollateralPrices`, `usePoolRewardAPR` / `usePoolRewardTokens` (row-level), `useGenesisMarks` removed from imports (was unused). **Wagmi:** `useAccount`, `useWriteContract`, `usePublicClient`. **State:** many `useState` slices (expand, chain filter, modals, compound/claim preflight, transaction progress, etc.). **Modals:** `AnchorDepositWithdrawModal`, `CompoundPoolSelectionModal`, `CompoundTargetTokenModal`, `TransactionProgressModal`, `CompoundConfirmationModal`, `AnchorClaimAllModal`, `AnchorClaimMarketModal`, early withdraw / withdraw amount, contract addresses. **Filters:** `chainFilterSelected` + [`FilterMultiselectDropdown`](../../src/components/FilterMultiselectDropdown.tsx). **Memo maps:** `marketsDataMap`, `claimAllPositions`, collateral oracle list, etc. Grep `page.tsx` for `invalidateQueries` / `refetch` — refetch wired via hooks (`refetchReads`, `refetchUserDeposits`, `refetchPositions`). |
| 2 | Map data flow: reads vs derived UI vs rewards/marks | **See:** `hooks/anchor/` — `useAnchorContractReads` (batches), `useAnchorMarketData`, `useAnchorRewards`, `useAnchorMarks`, `useAnchorUserDeposits`, composed in `useAnchorPageData`. |
| 3 | Duplicate helpers → `utils/anchor*` or `anchorDisplayFormat.ts` | **Partial:** [`utils/anchor.ts`](../../src/utils/anchor.ts) + [`utils/anchorDisplayFormat.ts`](../../src/utils/anchorDisplayFormat.ts) for shared formatters; table/grid still also import `@/utils/anchor` where historical. |

### Phase 2 — Hook boundary

| # | Item | Status |
|---|------|--------|
| 1 | Composed hook split (mirror Sail): `useAnchorPageData` + `useAnchorContractReads` | **Done** for core reads and aggregates; `useAnchorContractReads` remains the wagmi batch layer. |
| 2 | Move logic out of `page.tsx` without UI change | **Partial:** `anchorStats` and most reads live in `useAnchorPageData`; page still holds large `claimAllPositions` + list rendering + modals. |
| 3 | Remove unused destructuring / dead branches | **Partial:** removed unused imports (`useGenesisMarks`, `useStabilityPoolRewards`, `useAllStabilityPoolRewards`, duplicate `useContractReads` / `useContractRead`, unused `AnchorMarketExpandedView` import). |

### Phase 3 — Presentational extraction

| # | Item | Status |
|---|------|--------|
| 1 | Stable `React.memo` market row + stable callbacks | **Partial:** [`AnchorMarketGroupCollapsedRow`](../../src/components/anchor/AnchorMarketGroupCollapsedRow.tsx) wraps the **collapsed** grouped row; `onToggleExpand` / `onOpenManage` are wired from `page.tsx`. |
| 2 | Expanded group panel extraction | **Done:** [`AnchorMarketGroupExpandedSection`](../../src/components/anchor/AnchorMarketGroupExpandedSection.tsx) holds the **group expanded** UI (positions, withdrawal rows, per-market stats). [`AnchorMarketExpandedView`](../../src/components/anchor/AnchorMarketExpandedView.tsx) remains a separate, unused building block — reconcile or remove later if redundant. |
| 3 | Toolbar + `*MarketsSections` parity (Genesis/Sail) | **Partial:** [`AnchorMarketsToolbar`](../../src/components/anchor/AnchorMarketsToolbar.tsx) + [`AnchorMarketsSections`](../../src/components/anchor/AnchorMarketsSections.tsx) wrap the stability-pool toolbar + list. |
| 4 | `next/dynamic` for heavy charts | **N/A today** — Anchor index has no `PriceChart`/`recharts` in `page.tsx`; Sail uses dynamic chart in [`SailMarketExpandedView`](../../src/components/sail/SailMarketExpandedView.tsx). Add when/if charts ship here. |

---

## Routes

| Path | File | Notes |
|------|------|--------|
| `/anchor` | [`page.tsx`](../../src/app/anchor/page.tsx) | Main index (monolithic; refactor target). |
| `/anchor/[symbol]` | `[symbol]/page.tsx` | Per-symbol view. |
| `/anchor/haeth` | [`haeth/page.tsx`](../../src/app/anchor/haeth/page.tsx) | haETH-focused route. |

---

## Architecture (entry points)

| Layer | Role |
|-------|------|
| [`page.tsx`](../../src/app/anchor/page.tsx) | Layout, filters, modals, market rows / expanded sections; **candidates to extract** into `components/anchor/*` + composed hooks per playbook. |
| [`useAnchorPageData`](../../src/hooks/anchor/useAnchorPageData.ts) | **Phase 2 (partial):** composes reads + derived lists (`anchorMarkets`, prices, marks, rewards, positions, `allMarketsData`, **`anchorStats`**, **`claimAllPositions`**, etc.); `page.tsx` still owns expanded rows + modals. |
| [`AnchorMarketGroupExpandedSection`](../../src/components/anchor/AnchorMarketGroupExpandedSection.tsx) | **Group** expanded panel (wired from `page.tsx`). [`AnchorMarketExpandedView`](../../src/components/anchor/AnchorMarketExpandedView.tsx) is a separate file, not wired — optional follow-up. |
| [`AnchorStabilityPools`](../../src/components/anchor/AnchorStabilityPools.tsx) | Stability pool presentation. |
| [`RewardTokensDisplay`](../../src/components/anchor/RewardTokensDisplay.tsx), [`FeeDisplayRow`](../../src/components/anchor/FeeDisplayRow.tsx), [`ErrorBanner`](../../src/components/anchor/ErrorBanner.tsx), [`AnchorHowToGuide`](../../src/components/anchor/AnchorHowToGuide.tsx) | Focused UI slices. |

**Hooks (`src/hooks/anchor/`):**

| Area | Files (indicative) |
|------|---------------------|
| Grouping / per-market data | [`useGroupedMarkets`](../../src/hooks/anchor/useGroupedMarkets.ts), [`useAnchorMarketData`](../../src/hooks/anchor/useAnchorMarketData.ts) |
| Wagmi batches / reads | [`useAnchorContractReads`](../../src/hooks/anchor/useAnchorContractReads.ts) |
| Prices & token metadata | [`useAnchorPrices`](../../src/hooks/anchor/useAnchorPrices.ts), [`useAnchorTokenMetadata`](../../src/hooks/anchor/useAnchorTokenMetadata.ts) |
| Rewards, marks, txs, deposits | [`useAnchorRewards`](../../src/hooks/anchor/useAnchorRewards.ts), [`useAnchorMarks`](../../src/hooks/anchor/useAnchorMarks.ts), [`useAnchorTransactions`](../../src/hooks/anchor/useAnchorTransactions.ts), [`useAnchorUserDeposits`](../../src/hooks/anchor/useAnchorUserDeposits.ts) |

The page also composes app-wide hooks (prices, volatility, stability pool rewards, etc.) — grep `useAnchor` and `anchor/` imports in [`page.tsx`](../../src/app/anchor/page.tsx) for the full picture.

**Utils:**

- [`src/utils/anchor.ts`](../../src/utils/anchor.ts) — formatting helpers (`formatRatio`, `formatAPR`, etc.) used by the index.
- [`src/utils/anchorDisplayFormat.ts`](../../src/utils/anchorDisplayFormat.ts) — display helpers where split from core `anchor.ts`.
- [`src/utils/anchor/calculateReadOffset.ts`](../../src/utils/anchor/calculateReadOffset.ts) — offsets for batched `useContractReads` across markets.

---

## Desktop table grid

Header ([`AnchorMarketsTableHeader`](../../src/components/anchor/AnchorMarketsTableHeader.tsx)), collapsed group rows ([`AnchorMarketGroupCollapsedRow`](../../src/components/anchor/AnchorMarketGroupCollapsedRow.tsx)), and wallet-summary rows share templates from [`anchorMarketsTableGrid.ts`](../../src/components/anchor/anchorMarketsTableGrid.ts): e.g. **`ANCHOR_MARKETS_TABLE_ROW_LG_CLASSNAME`**, **`ANCHOR_MARKETS_TABLE_ROW_MD_CLASSNAME`**, **`ANCHOR_MARKETS_WALLET_ROW_*`**. Keep header + body class strings in sync when changing column counts.

---

## Modals (high level)

- **[`AnchorDepositWithdrawModal`](../../src/components/AnchorDepositWithdrawModal.tsx)** — primary deposit/withdraw surface: **`DefinedMarket`** on `market` / `allMarkets`; optional contract keys (e.g. `peggedTokenZap`, `collateralPrice`) via **`anchorAddressByName()`** from [`types/anchor.ts`](../../src/types/anchor.ts) (same idea as Sail’s `addressByName` on `SailManageModal`). `initialTab` accepts legacy names (`mint`, `redeem`, `deposit-mint`, `withdraw-redeem`) mapped internally to `deposit` / `withdraw`.
- **Satellites:** [`AnchorCompoundModal`](../../src/components/AnchorCompoundModal.tsx), [`AnchorClaimAllModal`](../../src/components/AnchorClaimAllModal.tsx), [`AnchorClaimMarketModal`](../../src/components/AnchorClaimMarketModal.tsx), plus compound target / pool selection / confirmation / progress modals under [`src/components/`](../../src/components/).

---

## Types / APR

- Market config: [`Market`](../../src/config/markets.ts), **`DefinedMarket`** where values are always defined for UI rows.
- Index tuples + batched reads: [`src/types/anchor.ts`](../../src/types/anchor.ts) — `AnchorMarketTuple`, `AnchorContractReads`; used by [`useAnchorContractReads`](../../src/hooks/anchor/useAnchorContractReads.ts), [`useAnchorMarketData`](../../src/hooks/anchor/useAnchorMarketData.ts) (`MarketData.market`), [`useGroupedMarkets`](../../src/hooks/anchor/useGroupedMarkets.ts), etc.
- Collateral + boost APR breakdown objects (`collateral` / `steam` fields) are threaded through hooks and UI; see **[`APR_CALCULATION_DOCUMENTATION.md`](../APR_CALCULATION_DOCUMENTATION.md)** for contract-level semantics.

---

## Phase 4 — Types & reads (status)

| # | Item | Status |
|---|------|--------|
| 1 | **`DefinedMarket`** + **`AnchorMarketTuple`** on rows, `MarketData`, grouped markets, manage modal props | **Done** in this repo pass — see types table above. |
| 2 | **`AnchorContractReads`** / **`AnchorContractReadSlot`** for wagmi batch results | **Done** — aligned with Sail slot typing. |
| 3 | **`anchorAddressByName`** on `AnchorDepositWithdrawModal` for optional `addresses` keys | **Done** — used where zap/oracle fields are read (extend as needed). |

---

## Phase 7 — QA & docs (status)

| # | Item | Status |
|---|------|--------|
| 1 | Regression: mobile/desktop, modals after tx, query refetch, filters, haETH/symbol sub-routes | **Manual** — run locally; not asserted in CI here. |
| 2 | This README: architecture, grid line, changelog | **Updated** with Phase 4/7 tables + grid + changelog entry. |

---

## Refactor roadmap (align with Sail / playbook)

Use this as a working checklist, not shipped history:

1. **Thin `page.tsx`** — extract row(s), toolbar/sections, and repeated helpers; mirror [`useSailPageData`](../../src/hooks/useSailPageData.ts) + [`useSailContractReads`](../../src/hooks/useSailContractReads.ts) split if it helps.
2. **Typing** — `DefinedMarket`, typed tuples for market lists, narrowed batched-read slots where `useContractReads` is used.
3. **Table UX** — shared `grid-cols-[...]` for header + row when a table is split out; tooltips vs `overflow-hidden` (see playbook QA).
4. **UI− / UI+** — **Done:** `/anchor` in [`PAGE_LAYOUT_INDEX_EXACT_PATHS`](../../src/config/pageLayoutToggleRoutes.ts); [`page.tsx`](../../src/app/anchor/page.tsx) uses [`usePageLayoutPreference`](../../src/contexts/PageLayoutPreferenceContext.tsx) like Genesis/Sail.
5. **Docs** — keep this README updated as extractions land.

---

## Changelog (Anchor-focused)

1. **Phase 4 typing** — [`src/types/anchor.ts`](../../src/types/anchor.ts): `AnchorMarketTuple`, `AnchorContractReads`, `anchorAddressByName`; hook signatures (`useAnchorContractReads`, `useAnchorMarketData`, `useGroupedMarkets`, rewards/marks/prices/deposits/token metadata, transactions) and [`calculateReadOffset`](../../src/utils/anchor/calculateReadOffset.ts) updated; **`MarketData.market`** and **`GroupedMarket`** use **`DefinedMarket`**.
2. **`AnchorDepositWithdrawModal`** — `DefinedMarket` props, `InitialTabInput` for legacy tab names, `anchorAddressByName` for `peggedTokenZap` / `collateralPrice` on deposit-asset market.
3. **Table / row props** — [`AnchorMarketGroupCollapsedRow`](../../src/components/anchor/AnchorMarketGroupCollapsedRow.tsx) + [`page.tsx`](../../src/app/anchor/page.tsx) manage modal state aligned with **`DefinedMarket`**.
4. **Docs** — Architecture types table, desktop grid section, Phase 4 / Phase 7 tables, this changelog.

---

## See also

- [`docs/INDEX_PAGE_PATTERN.md`](../INDEX_PAGE_PATTERN.md) — index layout regions, toggle, port checklist.
- [`docs/INDEX_PAGE_REFACTOR_PLAYBOOK.md`](../INDEX_PAGE_REFACTOR_PLAYBOOK.md) — phased checklist (Sail → Anchor).
- [`docs/routes/sail.md`](./sail.md) — reference implementation for a refactored index.
- [`docs/routes/genesis.md`](./genesis.md) — short pointer + pattern link.
- [`docs/routes/earn.md`](./earn.md) — `/earn` stability pool routes (separate from Nav “Earn”).
