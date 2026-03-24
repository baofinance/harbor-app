# Anchor (`/anchor`)

Client index for stability / haETH markets: grouped markets, batched contract reads, stability-pool APR (collateral + boost), rewards, Ledger Marks, and heavy deposit / compound / claim flows. The main implementation lives in a **large** [`page.tsx`](page.tsx); the target shape is the same as Sail: a thin route file plus extracted rows, table chrome, and typed hooks (see **[`docs/INDEX_PAGE_REFACTOR_PLAYBOOK.md`](../../docs/INDEX_PAGE_REFACTOR_PLAYBOOK.md)**).

**Nav “Earn”** in the app points here (`/anchor`). The separate **`/earn`** stability-pool directory is documented in [`src/app/earn/README.md`](../earn/README.md).

**UI− / UI+:** The global toggle persists preference in `localStorage`, but **`/anchor` is not yet** in [`PAGE_LAYOUT_INDEX_EXACT_PATHS`](../../config/pageLayoutToggleRoutes.ts) (only `/genesis` and `/sail` today). Adding a Basic vs Extended split for Anchor should follow **[`docs/INDEX_PAGE_PATTERN.md`](../../docs/INDEX_PAGE_PATTERN.md)** and register `/anchor` when implemented.

---

## Routes

| Path | File | Notes |
|------|------|--------|
| `/anchor` | [`page.tsx`](page.tsx) | Main index (monolithic; refactor target). |
| `/anchor/[symbol]` | `[symbol]/page.tsx` | Per-symbol view. |
| `/anchor/haeth` | [`haeth/page.tsx`](haeth/page.tsx) | haETH-focused route. |

---

## Architecture (entry points)

| Layer | Role |
|-------|------|
| [`page.tsx`](page.tsx) | Layout, filters, modals, market rows / expanded sections; **candidates to extract** into `components/anchor/*` + composed hooks per playbook. |
| [`useAnchorPageData`](../../hooks/anchor/useAnchorPageData.ts) | **Phase 2:** composes core Anchor index reads + derived lists (`anchorMarkets`, prices, marks, rewards, positions, `allMarketsData`, etc.); `page.tsx` still owns stats strip + UI below. |
| [`AnchorMarketExpandedView`](../../components/anchor/AnchorMarketExpandedView.tsx) | Expanded market block (stats, pools, charts). |
| [`AnchorStabilityPools`](../../components/anchor/AnchorStabilityPools.tsx) | Stability pool presentation. |
| [`RewardTokensDisplay`](../../components/anchor/RewardTokensDisplay.tsx), [`FeeDisplayRow`](../../components/anchor/FeeDisplayRow.tsx), [`ErrorBanner`](../../components/anchor/ErrorBanner.tsx), [`AnchorHowToGuide`](../../components/anchor/AnchorHowToGuide.tsx) | Focused UI slices. |

**Hooks (`src/hooks/anchor/`):**

| Area | Files (indicative) |
|------|---------------------|
| Grouping / per-market data | [`useGroupedMarkets`](../../hooks/anchor/useGroupedMarkets.ts), [`useAnchorMarketData`](../../hooks/anchor/useAnchorMarketData.ts) |
| Wagmi batches / reads | [`useAnchorContractReads`](../../hooks/anchor/useAnchorContractReads.ts) |
| Prices & token metadata | [`useAnchorPrices`](../../hooks/anchor/useAnchorPrices.ts), [`useAnchorTokenMetadata`](../../hooks/anchor/useAnchorTokenMetadata.ts) |
| Rewards, marks, txs, deposits | [`useAnchorRewards`](../../hooks/anchor/useAnchorRewards.ts), [`useAnchorMarks`](../../hooks/anchor/useAnchorMarks.ts), [`useAnchorTransactions`](../../hooks/anchor/useAnchorTransactions.ts), [`useAnchorUserDeposits`](../../hooks/anchor/useAnchorUserDeposits.ts) |

The page also composes app-wide hooks (prices, volatility, stability pool rewards, etc.) — grep `useAnchor` and `anchor/` imports in [`page.tsx`](page.tsx) for the full picture.

**Utils:**

- [`src/utils/anchor.ts`](../../utils/anchor.ts) — formatting helpers (`formatRatio`, `formatAPR`, etc.) used by the index.
- [`src/utils/anchor/calculateReadOffset.ts`](../../utils/anchor/calculateReadOffset.ts) — offsets for batched `useContractReads` across markets.

---

## Modals (high level)

- **[`AnchorDepositWithdrawModal`](../../components/AnchorDepositWithdrawModal.tsx)** — primary deposit/withdraw surface (large file; same *conceptual* typing concerns as Sail: `DefinedMarket` / optional `addresses` — see playbook).
- **Satellites:** [`AnchorCompoundModal`](../../components/AnchorCompoundModal.tsx), [`AnchorClaimAllModal`](../../components/AnchorClaimAllModal.tsx), [`AnchorClaimMarketModal`](../../components/AnchorClaimMarketModal.tsx), plus compound target / pool selection / confirmation / progress modals under [`src/components/`](../../components/).

---

## Types / APR

- Market config: [`Market`](../../config/markets.ts), **`DefinedMarket`** where values are always defined for UI rows.
- Collateral + boost APR breakdown objects (`collateral` / `steam` fields) are threaded through hooks and UI; see **[`APR_CALCULATION_DOCUMENTATION.md`](../../../APR_CALCULATION_DOCUMENTATION.md)** for contract-level semantics.

---

## Refactor roadmap (align with Sail / playbook)

Use this as a working checklist, not shipped history:

1. **Thin `page.tsx`** — extract row(s), toolbar/sections, and repeated helpers; mirror [`useSailPageData`](../../hooks/useSailPageData.ts) + [`useSailContractReads`](../../hooks/useSailContractReads.ts) split if it helps.
2. **Typing** — `DefinedMarket`, typed tuples for market lists, narrowed batched-read slots where `useContractReads` is used.
3. **Table UX** — shared `grid-cols-[...]` for header + row when a table is split out; tooltips vs `overflow-hidden` (see playbook QA).
4. **UI− / UI+** — when the index has a Basic vs Extended split, add `/anchor` to [`PAGE_LAYOUT_INDEX_EXACT_PATHS`](../../config/pageLayoutToggleRoutes.ts) and wire [`usePageLayoutPreference`](../../contexts/PageLayoutPreferenceContext.tsx) like Genesis/Sail.
5. **Docs** — keep this README updated as extractions land.

---

## See also

- [`docs/INDEX_PAGE_PATTERN.md`](../../docs/INDEX_PAGE_PATTERN.md) — index layout regions, toggle, port checklist.
- [`docs/INDEX_PAGE_REFACTOR_PLAYBOOK.md`](../../docs/INDEX_PAGE_REFACTOR_PLAYBOOK.md) — phased checklist (Sail → Anchor).
- [`src/app/sail/README.md`](../sail/README.md) — reference implementation for a refactored index.
- [`src/app/genesis/README.md`](../genesis/README.md) — short pointer + pattern link.
- [`src/app/earn/README.md`](../earn/README.md) — `/earn` stability pool routes (separate from Nav “Earn”).
