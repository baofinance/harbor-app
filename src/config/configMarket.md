# Harbor market config (`markets`)

Each **market** is a key in the `markets` object in [`markets.ts`](./markets.ts). The key string (for example `"btc-steth"`) is the **market id** used across routing, hooks, and `contractsMarkets[marketId]`.

The exported type **`Market`** is the union of all row shapes (`(typeof markets)[keyof typeof markets]`). Not every row defines every optional field; TypeScript reflects that. For UI that assumes a full live row, **`DefinedMarket`** is `NonNullable<Market>`.

Some rows are **spread in at build time** (for example MegaETH when `NEXT_PUBLIC_USE_MEGAETH === "true"` and the contract entry exists).

---

## Top-level fields

| Field | Type / values | Required | Notes |
|--------|-----------------|----------|--------|
| `name` | `string` | Yes | Display name (e.g. `"stETH - BTC"`). |
| `maintenance` | `boolean` | Yes | `true` shows maintenance treatment (`isMarketInMaintenance`). |
| `anchorActive` | `boolean` | Yes | Anchor basic card grid: only `true` rows are listed in that layout (`isAnchorActiveForBasicUi`). |
| `sailActive` | `boolean \| "soon"` | Yes | Sail listing: `false` hides; `"soon"` shows a coming-soon style (`SailBasicMarketCardsGrid`). |
| `status` | `"genesis" \| "coming-soon"` (const) | Yes | **Lifecycle:** `"coming-soon"` excludes the market from many aggregates and genesis index paths (`status !== "coming-soon"`). `"genesis"` means the product treats it as a genesis-phase market (mint/redeem, transparency, badges). Distinct from **`genesisActive`** (Maiden Voyage mode). |
| `genesisActive` | `GenesisActiveSetting` | No* | Maiden Voyage visibility and CTAs. Type: `true \| false \| "soon" \| "completed"`. **Default when omitted:** `true` (`getGenesisActiveSetting`). Use `true as GenesisActiveSetting` (or `"soon" as …`) so the row narrows correctly in the `Market` union. |
| `pegTarget` | `string` | Yes | Peg asset label (e.g. `"BTC"`, `"USD"`). |
| `chain` | `{ name: string; logo: string }` | Yes | `logo` is typically under `public/` (e.g. `"icons/eth.png"`). |
| `collateral` | `{ symbol, name, underlyingSymbol }` | Yes | Wrapped collateral + underlying symbols for copy and pricing. |
| `acceptedAssets` | `{ symbol: string; name: string }[]` | Yes | Tokens users can pick for deposits where the UI supports them. |
| `rewardTokens` | `{ default: string[]; additional: string[] }` | Yes | Reward token symbols for this market. |
| `addresses` | See **Addresses** below | Yes | Contract addresses; many are `0x${string}` from `contractsMarkets`. |
| `peggedToken` | `{ name, symbol, description }` | Yes | Anchored token metadata. |
| `leveragedToken` | `{ name, symbol, description }` | Yes | Sail token metadata. |
| `rewardPoints` | `{ pointsPerDollar: number; description: string }` | Yes | Ledger marks copy and rate. |
| `coinGeckoId` | `string` | Yes | CoinGecko id for the **primary collateral / deposit** pricing path used in the app. |
| `genesis` | See **Genesis** below | Yes | Schedule and distribution copy; dates often come from `contractsMarkets[id].genesis`. |

\*Omitting `genesisActive` behaves like full participation; explicit `false` hides from genesis index; `"soon"` is preview (no deposit/withdraw in MV UI); `"completed"` is ended MV mode.

### Optional top-level fields (present on some markets)

| Field | Type | Notes |
|--------|------|--------|
| `underlyingCoinGeckoId` | `string` | When the **underlying** (e.g. fxUSD) needs its own CoinGecko id separate from `coinGeckoId` (often the wrapped token id). |
| `zapper` | `boolean` | Feature flags for zap flows (e.g. ETH/fxUSD markets). |
| `anyswap` | `boolean` | Feature flag for swap-related paths. |
| `startBlock` | `number` (from contracts) | Only on some rows; used where indexing starts from deployment block. |
| `marksCampaign` | `{ id: string; label: string }` | Groups markets in Maiden Voyage / ledger UI (e.g. `"launch-maiden-voyage"`). Omit on placeholder / coming-soon rows when there is no campaign yet. |
| `displayTransparency` | `boolean` | When set to `false`, the market can be hidden from transparency surfaces (default is show). |
| `chainId` | `number` | Non–mainnet markets (e.g. MegaETH `4326`); genesis and Sail code use this for chain-scoped reads. |
| `test` | `boolean` | Genesis UI: show a **TEST** label in the status column when `true`. |
| `genesisTokenCapAmount` | `number` | If `>0`, early-depositor genesis cap UI uses this many **collateral token** units (with indexer progress), instead of USD cap alone. See `GenesisMarketConfig` in [`types/genesisMarket.ts`](../types/genesisMarket.ts). |

### Optional overrides used by genesis / ledger UI (not in every static row)

| Field | Notes |
|--------|--------|
| `rowLeveragedSymbol` | Optional string override for table/ledger display; if absent, UI falls back to `leveragedToken.symbol` or `name`. |

`wrappedRate` is **not** set in static `markets` config; it is supplied at runtime from oracle / anchor market data and merged into UI market objects.

---

## `addresses`

Typical keys (subset may be omitted on minimal or coming-soon rows):

| Key | Purpose |
|-----|--------|
| `minter` | Core minter contract. |
| `peggedToken` | ha* token. |
| `leveragedToken` | hs* token. |
| `reservePool` | Reserve pool. |
| `stabilityPoolManager` | Often resolved via `resolveStabilityPoolManager(marketId, fallback)` for mainnet vs test2. |
| `stabilityPoolCollateral` | Collateral-side stability pool. |
| `stabilityPoolLeveraged` | Leveraged-side stability pool. |
| `genesis` | Genesis contract. |
| `priceOracle` | Price oracle. |
| `collateralPrice` | Collateral / wrapped price feed (also used for wrapped-rate style reads in Anchor). |
| `feeReceiver` | Fee receiver. |
| `collateralToken` | Underlying collateral token. |
| `wrappedCollateralToken` | Wrapped collateral token users deposit. |
| `genesisZap` | Genesis zap (optional on some rows). |
| `peggedTokenZap` | Minter zap for pegged side (optional). |
| `leveragedTokenZap` | Minter zap for leveraged side (optional). |

All are expected to be valid addresses for the market’s chain when that flow is enabled.

---

## `genesis`

| Field | Type | Notes |
|--------|------|--------|
| `startDate` | ISO date string | Informational / user-facing schedule (combined with on-chain `genesisIsEnded` in `getGenesisStatus`). |
| `endDate` | ISO date string | Same. |
| `tokenDistribution` | `{ pegged: { ratio, description }, leveraged: { ratio, description } }` | UI copy for split (often 0.5 / 0.5). |

---

## Related exports in `markets.ts`

- **`GenesisActiveSetting`** — type for `genesisActive`.
- **`getGenesisActiveSetting`**, **`isGenesisHiddenFromIndex`**, **`isGenesisSoonUi`**, **`isGenesisCompletedUi`**, **`genesisParticipatesInMaidenVoyageTotals`**, **`isGenesisDepositWithdrawBlockedByConfig`**, **`genesisEligibleForHomeRedirect`** — centralize Maiden Voyage behavior from config.
- **`isMarketInMaintenance`**, **`isAnchorActiveForBasicUi`** — UI gating.
- **`getGenesisStatus`**, **`getGenesisPhaseInfo`**, **`isGenesisActive`** — combine config dates with on-chain genesis end.
- **`getPrimaryRewardToken`**, **`getRewardPoints`** — read optional `rewardToken` / `rewardPoints` (legacy singular `rewardToken` may exist on some objects).

---

## `GenesisMarketConfig` (narrow type)

[`src/types/genesisMarket.ts`](../types/genesisMarket.ts) documents a smaller shape used for genesis pages and components. It is a **subset** of the full market row plus a few optional fields (`genesisTokenCapAmount`, `test`, `chainId`, etc.). Prefer that type when typing genesis-only props.

---

## Environment and contract index

- **`NEXT_PUBLIC_USE_TEST2_CONTRACTS`** — affects `resolveStabilityPoolManager` fallback behavior.
- **`NEXT_PUBLIC_USE_MEGAETH`** — when true and `contractsMarkets["wsteth-usd-megaeth"]` exists, the **MegaETH** market object is merged into `markets`.

Contract-backed fields (`addresses`, `startBlock`, `genesis.startDate` / `endDate`, etc.) should stay aligned with [`contracts.index.ts`](./contracts.index.ts) (or the generated contracts package that feeds it).
