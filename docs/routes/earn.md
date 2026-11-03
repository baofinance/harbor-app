# Earn (`/earn`)

**Primary Earn UX** lives at [`/anchor`](./anchor.md) (nav label **Earn**). `/earn` redirects there from `next.config.js`. There is no `src/app/earn/page.tsx`.

| Path | Purpose |
|------|---------|
| `/earn` | Redirects to `/anchor`. |
| `/earn/[marketId]/[poolType]` | Pool detail (`collateral` or `leveraged`); static paths from `generateStaticParams`. |

---

## Files

| File | Role |
|------|------|
| [`layout.tsx`](../../src/app/earn/layout.tsx) | Metadata for the pool routes. |
| [`[marketId]/[poolType]/page.tsx`](../../src/app/earn/[marketId]/[poolType]/page.tsx) | Server wrapper → `PoolClient`. |
| [`PoolClient.tsx`](../../src/app/earn/[marketId]/[poolType]/PoolClient.tsx) | Legacy pool UI (balances, deposit/withdraw, mock chart history). |

---

## See also

- [`docs/routes/anchor.md`](./anchor.md) — authoritative Earn / Anchor architecture (single-market layout).
