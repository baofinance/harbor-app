# Genesis index route (`page.tsx`)

Page body is organized into these **named regions** (site chrome lives in root `layout.tsx`):

| Region | Role |
|--------|------|
| **Site header / footer** | Global `Navigation` + footer — not in this folder |
| **Page hero** (`GenesisPageHero`) | Title “Maiden Voyage”, subtitle, three intro cards (`GenesisHeaderSummary`) |
| **Campaign stats** (`GenesisCampaignStats`) | Ledger Marks summary, subgraph / oracle error banners |
| **Toolbar** (`GenesisMarketsToolbar`) | Active campaign pill, Genesis Ongoing/All, network filter, Ledger Marks badge |
| **Market list** (`GenesisMarketsSections` children) | Active genesis table rows, expanded views |
| **Coming next** | Coming-soon markets section |
| **Completed campaigns** | Completed genesis grouped by campaign |

Refactors live under [`src/components/genesis/`](../../components/genesis/). Subgraph + error helpers: [`useGenesisPageData`](../../hooks/useGenesisPageData.ts). Display helpers: [`formatGenesisMarketDisplayName`](../../utils/genesisDisplay.ts).

**Row USD pricing (active + completed tables)** is centralized in [`computeGenesisRowUsdPricing`](../../utils/genesisRowPricing.ts) so underlying oracle rules (including BTC-peg scaling) and wrapped collateral USD stay aligned.

---

## Planned follow-up: Anchor & Sail (separate pass)

Not implemented here; use this as a checklist when refactoring those routes:

- **Pricing:** Reuse [`wrappedCollateralPriceUSD`](../../utils/wrappedCollateralPriceUSD.ts) batch helpers (`computeGenesisWrappedCollateralPriceUSD` / peg-oracle → USD) anywhere Anchor/Sail still duplicate long `if/else` chains; avoid `useWrappedCollateralPrice` inside `.map()` over many rows (Rules of Hooks).
- **Structure:** Extract presentational slices (toolbar, stats strip, table header) the same way as Genesis; keep Wagmi reads in one container or a dedicated hook per route.
- **Cleanup:** Remove dead code, dev-only `console.log`, and hardcoded Chainlink feeds — prefer [`CHAINLINK_FEEDS`](../../config/chainlink.ts).
- **Files:** [`src/app/anchor/page.tsx`](../../app/anchor/page.tsx), [`src/app/sail/page.tsx`](../../app/sail/page.tsx), hooks under `src/hooks/anchor/`, `useSailPositionPnL`, etc.
