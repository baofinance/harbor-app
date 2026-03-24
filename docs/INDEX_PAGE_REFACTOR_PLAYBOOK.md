# Index page refactor playbook (Sail → Anchor & future routes)

This document captures **everything we did for `/sail`** so you can apply the **same depth** to **`/anchor`** (or another large index) without re-deriving steps. It complements **[`INDEX_PAGE_PATTERN.md`](./INDEX_PAGE_PATTERN.md)** (layout toggle, regions, port checklist), which stays high-level.

**Reference implementation:** [`src/app/sail/README.md`](../src/app/sail/README.md) (architecture, grid, modal, changelog).

---

## Goals (what “done” looks like)

| Goal | Sail approach | Apply on Anchor |
|------|---------------|-----------------|
| **Readability** | `page.tsx` is wiring only; rows + expanded + heavy helpers live in `components/` + `utils/`. | Same: shrink `page.tsx`, extract row + expanded + domain/format helpers. |
| **Typing** | `DefinedMarket`, route tuples (`SailMarketTuple`), batched reads type (`SailContractReads`), modal props typed. | Use `DefinedMarket` / `Market` from config; add `Anchor*` tuple + read types if needed. |
| **Modal** | `SailManageModal`: `DefinedMarket`, `addressByName` for optional `addresses` keys on union. | `AnchorDepositWithdrawModal` (or equivalent): same **pattern** for `market` + optional address fields — not a copy-paste of Sail. |
| **Table UX** | Shared `grid-cols` in header + row; fee badge width; column rebalance; `min-w-0` / no bad `truncate` on key labels. | Match header + row grids; tune `fr` + gaps; fix overflow/ellipsis per product. |
| **Shared infra** | `marketSideLabels`, `useTransactionProgress.setSteps` typing — already global. | **No extra work** unless Anchor uses different patterns. |
| **Docs** | Route README + this playbook. | Add `src/app/anchor/README.md` + link here when you start. |

---

## Phase checklist (order matters)

Use as a **checkbox list** for Anchor.

### 1. Inventory & hook boundary

- [ ] List everything `page.tsx` does: data hooks, filters, memoized lists, modals, query invalidation.
- [ ] Prefer **one composed hook** (e.g. `useAnchorPageData`) for filters + derived lists + maps, mirroring `useSailPageData` + `useSailContractReads` split if reads are heavy.
- [ ] Remove **unused** destructuring from hooks (e.g. `sailMarkets` if never used).

### 2. Extract presentational slices

- [ ] **Market row** → `React.memo` component with stable callbacks from parent.
- [ ] **Expanded** panel → separate component; `next/dynamic` for charts if needed.
- [ ] **Toolbar + sections** → already often split; keep parity with Genesis `*MarketsSections` pattern.

### 3. Domain/format utilities

- [ ] Move **non-global** formatters (different semantics than `src/utils/formatters.ts`) into a **route-scoped** file, e.g. `anchorDisplayFormat.ts` or reuse shared if identical.
- [ ] Move **domain math** (fees, bands, offsets) into **pure** `utils/*` with unit tests where valuable.

### 4. Types (`src/types/` + config)

- [ ] **`DefinedMarket`** from [`src/config/markets.ts`](../src/config/markets.ts) — `NonNullable<Market>` for list rows when entries are always defined.
- [ ] **Route tuple** — e.g. `[string, DefinedMarket][]` with a typed name (`AnchorMarketTuple` or reuse `SailMarketTuple` shape if identical).
- [ ] **Batched reads** — narrow `reads` from `useContractReads` to a small slot type (see [`src/types/sail.ts`](../src/types/sail.ts) `SailContractReadSlot`).

### 5. Modal

- [ ] Props: `market: DefinedMarket` (or `Market` where undefined is valid).
- [ ] If `addresses` is a **union** that omits some keys on some markets, use a **`Record<string, \`0x${string}\` | undefined>`** (or similar) for optional fields only where TS errors.
- [ ] Do **not** assume Sail’s modal applies to Genesis/Anchor — each flow is separate.

### 6. Table: header + row must match

- [ ] **Same `grid-cols-[...]`** string on **table header** and **row** (Sail: `SailMarketsTableHeader` + `SailMarketRow`).
- [ ] Document the template in the route README (copy/paste one line).

### 7. Table UX (polish)

- [ ] **Fee / numeric badges:** fixed width tweaks (e.g. `calc(4.5rem - 5px)`) — only if the product has similar pills.
- [ ] **Column rebalance:** shift `fr` from less critical columns (leverage, action) toward labels that truncate (long asset names).
- [ ] **Gaps:** slightly smaller `gap-*` between columns can reclaim space without changing `fr`.
- [ ] **Long labels:** `min-w-0` on flex children; avoid `truncate` on primary names unless unavoidable; smaller chevron if needed.

### 8. QA / regression

- [ ] **UI−** `?view=basic` still shows title + table (if applicable).
- [ ] **Tooltips** (`position: fixed`) — verify not clipped by row `overflow-hidden` (spot-check edges).
- [ ] **Mobile** vs **desktop** (`lg:hidden` / `hidden lg:grid`) — parity of critical info.
- [ ] **Modal** after tx: refetch + `invalidateQueries` for subgraph/PnL if used.

### 9. Documentation

- [ ] Update **route README** (`src/app/sail/README.md` style).
- [ ] Link this playbook + [`INDEX_PAGE_PATTERN.md`](./INDEX_PAGE_PATTERN.md).

---

## Sail: complete file inventory (for parity audits)

| Area | Files |
|------|--------|
| **Route** | `src/app/sail/page.tsx`, `layout.tsx` |
| **Row / expanded** | `src/components/sail/SailMarketRow.tsx`, `SailMarketExpandedView.tsx` |
| **Fee UI** | `SailFeeBandBadge.tsx`, `SailFeeBandsPanel.tsx`, `SailFeeRatioCell.tsx`, `SailMintRedeemFeeColumn.tsx` |
| **Chrome** | `SailPageTitleSection`, `SailExtendedHero`, `SailUserStatsCards`, `SailMarksSubgraphErrorBanner`, `SailLedgerMarksBar`, `SailMarketsToolbar`, `SailMarketsTableHeader`, `SailMarketsSections`, `index.ts` |
| **Utils** | `src/utils/sailFeeBands.ts`, `sailDisplayFormat.ts`, `sailActiveMarkets.ts`, `marketSideLabels.ts` |
| **Types** | `src/types/sail.ts`, `src/components/sail/sailMarketTypes.ts` |
| **Config** | `src/config/markets.ts` (`Market`, `DefinedMarket`) |
| **Hooks** | `useSailPageData.ts`, `useSailContractReads.ts`, `useTransactionProgress.ts` (shared typing) |
| **Modal** | `src/components/SailManageModal.tsx` |
| **Docs** | `src/app/sail/README.md`, this file |

---

## Anchor: likely mapping (starting points)

Anchor is **large** and already has partial extractions (`src/components/anchor/AnchorMarketExpandedView.tsx`, `FeeDisplayRow.tsx`, etc.). Use this as a **map**, not a strict list:

| Concern | Likely starting points |
|---------|-------------------------|
| Main page | `src/app/anchor/page.tsx` |
| Expanded | `src/components/anchor/AnchorMarketExpandedView.tsx` (extend vs replace) |
| Modal | `src/components/AnchorDepositWithdrawModal.tsx` (large) |
| Other anchor UI | `src/components/anchor/*` |
| Hooks | Grep `useAnchor`, `useContractReads` in `src/hooks` |

**Anchor-specific:** stability pools, haETH flows, and deposit modal complexity differ from Sail — the **phases** above apply; **file names** will differ.

---

## Already shared (no Anchor-only work)

- **`DefinedMarket`** / **`Market`** — `config/markets.ts`
- **`marketSideLabels`** — `DefinedMarket` parameters
- **`useTransactionProgress`** — `setSteps` accepts full updater shape

---

## Related

- [`INDEX_PAGE_PATTERN.md`](./INDEX_PAGE_PATTERN.md) — UI+ / UI−, toggle, Genesis/Sail port checklist
- [`src/app/sail/README.md`](../src/app/sail/README.md) — Sail index detail + changelog
- [`pageLayoutToggleRoutes.ts`](../src/config/pageLayoutToggleRoutes.ts) — add `/anchor` when wiring toggle

---

*Use this playbook + Sail README together when refactoring Anchor to the same standard.*
