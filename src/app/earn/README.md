# Earn (`/earn`)

**Stability pool** hub: browse pools by market group, then open a **per-pool** page for deposit, withdraw, chart, and rewards. This is **not** the same as the main nav **“Earn”** link, which goes to [`/anchor`](../anchor/README.md) (full markets / haETH UX).

**Routes:**

| Path | Purpose |
|------|---------|
| `/earn` | Pool directory — grouped list with links to each pool. |
| `/earn/[marketId]/[poolType]` | Pool detail (`collateral` or `leveraged`); static paths from `generateStaticParams`. |

---

## Files

| File | Role |
|------|------|
| [`page.tsx`](page.tsx) | Landing: loads pools via [`usePools`](../../hooks/usePools.ts), groups by `groupName`, renders cards linking to `/earn/[marketId]/[poolType]`. |
| `[marketId]/[poolType]/page.tsx` | Server wrapper: `generateStaticParams` from [`markets`](../../config/contracts.ts); renders `PoolClient`. |
| `[marketId]/[poolType]/PoolClient.tsx` | Client UI: balances, deposit/withdraw, historical chart, APR (base + boost), claimable rewards (TIDE label), etc. |

---

## Config

- Pool definitions and metadata: [`src/config/pools.ts`](../../config/pools.ts) (consumed by `usePools`).
- Static param generation uses contract `markets` keys in [`src/config/contracts.ts`](../../config/contracts.ts) (see `page.tsx` under `[marketId]/[poolType]/`).

---

## See also

- [`src/app/anchor/README.md`](../anchor/README.md) — primary **Earn** nav destination and refactor notes.
- [`docs/INDEX_PAGE_REFACTOR_PLAYBOOK.md`](../../docs/INDEX_PAGE_REFACTOR_PLAYBOOK.md) — if pool UI grows to match index patterns (table/grid, modals).
