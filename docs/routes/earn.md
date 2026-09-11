# Earn (`/earn`)

**Primary Earn UX** lives at [`/anchor`](./anchor.md) (nav label **Earn**). The `/earn` route **re-exports** that page:

```ts
// src/app/earn/page.tsx
export { default } from "@/app/anchor/page";
```

Legacy **per-pool** deep links remain for older links:

| Path | Purpose |
|------|---------|
| `/earn` | Same Sail-style Earn dashboard as `/anchor`. |
| `/earn/[marketId]/[poolType]` | Legacy pool detail (`collateral` or `leveraged`); static paths from `generateStaticParams`. |

---

## Files

| File | Role |
|------|------|
| [`page.tsx`](../../src/app/earn/page.tsx) | Re-exports Anchor Earn dashboard. |
| [`[marketId]/[poolType]/page.tsx`](../../src/app/earn/[marketId]/[poolType]/page.tsx) | Server wrapper → `PoolClient`. |
| [`PoolClient.tsx`](../../src/app/earn/[marketId]/[poolType]/PoolClient.tsx) | Legacy pool UI (balances, deposit/withdraw, mock chart history). |

---

## See also

- [`docs/routes/anchor.md`](./anchor.md) — authoritative Earn / Anchor architecture (single-market layout).
