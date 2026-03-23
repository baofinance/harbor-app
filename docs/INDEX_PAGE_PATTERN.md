# Index page pattern (Genesis → Anchor & Sail)

**Single source of truth** for the Maiden Voyage / Genesis index work: layout toggles, shared components, hooks, and how to port the same structure to **Anchor** and **Sail** after their refactors.

Do not duplicate long explanations across READMEs — link here instead.

---

## 1. Concepts

| Term | Meaning |
|------|---------|
| **UI+** | Full layout: optional intro cards + stats/errors + toolbar + tables (default; no `view` query param). |
| **UI−** | Compact layout: **title strip** + toolbar + tables only. URL: `?view=basic`. |
| **Legacy URL** | `?genesisView=basic` still honored on `/genesis` only (see `isBasicPageLayout(..., ["genesisView"])`). New links should use `view`. |
| **Extended vs Basic** | Same as UI+ vs UI− (older naming in code: `isBasicPageLayout`, `PAGE_LAYOUT_BASIC_VALUE`). |

---

## 2. Layout regions (Genesis index)

Order in [`src/app/genesis/page.tsx`](../src/app/genesis/page.tsx):

| Region | Component | UI+ | UI− |
|--------|-----------|-----|-----|
| Title | `GenesisPageTitleSection` | Yes | Yes |
| Divider | — | After title in UI− only | — |
| Intro cards | `GenesisHeroIntroCards` | Yes | No |
| Campaign / marks stats | `GenesisCampaignStats` | Yes | No |
| Toolbar + sections | `GenesisMarketsSections` (+ toolbar props) | Yes | Yes |
| Market rows | Inline in `page.tsx` (large) | Yes | Yes |
| Completed campaigns | Same page | Yes | Yes |

**Full hero** (`GenesisPageHero` / `GenesisHeaderSummary`) = title + intro cards for reuse elsewhere; the index composes title + cards separately for UI−.

---

## 3. Central file map

### 3.1 Route & data

| Concern | File |
|---------|------|
| Genesis index (main) | [`src/app/genesis/page.tsx`](../src/app/genesis/page.tsx) |
| Genesis detail | [`src/app/genesis/[id]/page.tsx`](../src/app/genesis/[id]/page.tsx) |
| Page data (marks, errors, markets) | [`src/hooks/useGenesisPageData.ts`](../src/hooks/useGenesisPageData.ts) |
| Market config typing | [`src/types/genesisMarket.ts`](../src/types/genesisMarket.ts) |

### 3.2 UI− / UI+ (generic, reuse on Anchor/Sail)

| Concern | File |
|---------|------|
| Toggle component (UI− / UI+) | [`src/components/PageLayoutToggle.tsx`](../src/components/PageLayoutToggle.tsx) |
| Query helpers `view=basic` | [`src/utils/pageLayoutView.ts`](../src/utils/pageLayoutView.ts) |
| Which routes show the toggle | [`src/config/pageLayoutToggleRoutes.ts`](../src/config/pageLayoutToggleRoutes.ts) — add `/anchor`, `/sail` when ready |
| Global nav (scroll, link styles, toggle slot) | [`src/components/Navigation.tsx`](../src/components/Navigation.tsx) |

### 3.3 Genesis-specific UI (`src/components/genesis/`)

| Component | Role |
|-----------|------|
| `GenesisPageTitleSection` | Maiden Voyage heading + subtitle (always on index) |
| `GenesisHeroIntroCards` | Three explainer cards (UI+ only) |
| `GenesisPageHero` | Wraps full hero via `GenesisHeaderSummary` |
| `GenesisCampaignStats` | Ledger Marks + error banners (UI+ only) |
| `GenesisMarketsToolbar` | Filters, Ongoing/All, chain filter |
| `GenesisMarketsSections` | Shell around toolbar + children |
| `GenesisMarketTokenStrip` | Underlying = pegged + leveraged logos |
| `GenesisAprMarksColumn` | Marks column + shared APR-derived math (`memo`) |
| `GenesisMarketRowClaimActions` | Claim / manage / maintenance (`memo`) |
| Barrel | [`src/components/genesis/index.ts`](../src/components/genesis/index.ts) |

### 3.4 Claim flow & pricing

| Concern | File |
|---------|------|
| Claim tx + refetch + marks invalidate | [`src/hooks/useGenesisClaimMarket.ts`](../src/hooks/useGenesisClaimMarket.ts) |
| Marks / Tide math for APR column | [`src/utils/genesisAprDerived.ts`](../src/utils/genesisAprDerived.ts) |
| Row USD / oracle pricing | [`src/utils/genesisRowPricing.ts`](../src/utils/genesisRowPricing.ts) |
| Display names | [`src/utils/genesisDisplay.ts`](../src/utils/genesisDisplay.ts) |

### 3.5 Header chrome (wallet matches nav “selected” style)

| Concern | File |
|---------|------|
| Connected wallet button | [`src/components/Account.tsx`](../src/components/Account.tsx) |
| Connect / disconnected | [`src/components/Wallet.tsx`](../src/components/Wallet.tsx) |

---

## 4. Porting checklist: Anchor & Sail

When each index page is refactored to mirror Genesis structure:

1. **Toggle**
   - Add path to [`pageLayoutToggleRoutes.ts`](../src/config/pageLayoutToggleRoutes.ts): e.g. `"/anchor"`, `"/sail"`.
   - On the page: `const compact = isBasicPageLayout(searchParams)` (add legacy keys only if you shipped old URLs).

2. **Split layout**
   - **Always:** title block (your equivalent of `GenesisPageTitleSection`).
   - **UI+ only:** hero cards, stats/banners, anything “marketing” or dense summary.
   - **Both:** toolbar + main tables/lists.

3. **Components**
   - Prefer `src/components/anchor/` and `src/components/sail/` mirrors of genesis slices (toolbar, sections, row actions) — keep route-specific naming.

4. **Hooks**
   - One data hook per route (like `useGenesisPageData`) — avoid scattering reads in the page file.

5. **Claim / actions**
   - If applicable, reuse the **pattern** of `useGenesisClaimMarket` (single tx → receipt → refetch → `invalidateQueries`) or extract a shared hook if contracts align.

6. **Detail routes**
   - If users claim from `[id]` pages, align invalidation with index (`allHarborMarks` or your query keys).

7. **Docs**
   - Add a one-line link from `src/app/anchor/README.md` / `sail` to this file when you start the port.

---

## 5. Related docs (not duplicated here)

- [`src/app/genesis/README.md`](../src/app/genesis/README.md) — short index-specific pointer (kept minimal).
- **[`GENESIS_UI_RADIUS_PROPOSAL.md`](./GENESIS_UI_RADIUS_PROPOSAL.md)** — straight vs rounded edges by zone + wallet-vs-modal options; open [`genesis-ui-radius-preview.html`](./genesis-ui-radius-preview.html) in a browser for a quick visual.
- [`ANCHOR_LAYOUT_OPTIONS.md`](../ANCHOR_LAYOUT_OPTIONS.md) — historical layout options (may predate this pattern).
- Subgraph / marks setup — see repo root `HARBOR_MARKS_SETUP.md` and subgraph docs.

---

## 6. Changelog (high level)

- Refactor: APR/marks/token strip/claim actions extracted from monolithic `page.tsx`.
- `GenesisMarketConfig` replaces `(mkt as any)` on the index where applied.
- UI− / UI+ toggle + `view=basic`; title strip always visible in UI−.
- Nav: nowrap + horizontal scroll; wallet + toggle styled like active nav tab (`rounded-md`, white fill, `#1E4775` text).

---

*Last consolidated: handoff for Anchor/Sail alignment.*
