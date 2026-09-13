# Anchor (`/anchor`)

**Nav “Earn”** destination. Single-market Sail-style dashboard for haToken / stability-pool deposits: market picker, wallet + this-market stats, USD chart placeholder, embedded deposit/withdraw panel, collapsible metrics, haToken explainer cards, and archived pegged markets.

**Also:** `/earn` re-exports this page. Legacy per-pool routes remain under [`/earn/[marketId]/[poolType]`](./earn.md).

---

## Current IA (Sail-style)

```
HarborPageShell
  ├─ AnchorRewardsStrip (claim / compound entry)
  ├─ AnchorAdvancedLayout
  │    ├─ Market dropdown + Earn tagline
  │    ├─ Your wallet | This market
  │    ├─ Chart placeholder | embedded AnchorDepositWithdrawModal
  │    ├─ Market metrics (collapsible)
  │    ├─ Mobile Deposit/Withdraw bar
  │    └─ Three-box haToken explanation
  └─ ArchivedMarketsListSection
```

| Piece | Location |
|-------|----------|
| Page entry | [`src/app/anchor/page.tsx`](../../src/app/anchor/page.tsx) |
| Layout kit | [`src/components/anchor/advanced/`](../../src/components/anchor/advanced/) |
| Market selection (`?market=`) | [`useAnchorSelectedMarket`](../../src/hooks/anchor/useAnchorSelectedMarket.ts) |
| Data | [`useAnchorPageData`](../../src/hooks/anchor/useAnchorPageData.ts) |
| Embedded manage | [`AnchorDepositWithdrawModal`](../../src/components/AnchorDepositWithdrawModal.tsx) (`embedded` → `DepositModalShell` inline) |

Mirror reference: Sail UI+ on [`/sail`](./sail.md) (`SailAdvancedLayout`).

---

## Routes

| Path | File | Notes |
|------|------|--------|
| `/anchor` | [`page.tsx`](../../src/app/anchor/page.tsx) | Earn single-market dashboard. |
| `/anchor/[symbol]` | `[symbol]/page.tsx` | Per-symbol landing. |
| `/earn` | re-exports `/anchor` | Same UI as Earn nav. |

---

## Data / claim flows

| Layer | Role |
|-------|------|
| [`useAnchorPageData`](../../src/hooks/anchor/useAnchorPageData.ts) | Markets, prices, marks, rewards, positions, `allMarketsData`, `anchorStats`, `claimAllPositions`. |
| [`useAnchorClaimCompound`](../../src/hooks/anchor/useAnchorClaimCompound.ts) | Claim / compound modals still owned by `page.tsx`. |
| Table-era components | Still under `components/anchor/*` (group rows, etc.) for landings / reuse; not the main `/anchor` chrome. |

**Hooks (`src/hooks/anchor/`):** `useAnchorContractReads`, `useAnchorMarketData`, `useAnchorRewards`, `useAnchorMarks`, `useAnchorUserDeposits`, `useAnchorSelectedMarket`, composed in `useAnchorPageData`.

---

## See also

- [`docs/routes/sail.md`](./sail.md) — Leverage advanced layout pattern.
- [`docs/routes/earn.md`](./earn.md) — `/earn` alias + legacy pool detail routes.
- [`docs/INDEX_PAGE_REFACTOR_PLAYBOOK.md`](../INDEX_PAGE_REFACTOR_PLAYBOOK.md) — historical table refactor notes.
