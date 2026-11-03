# Single sources

Check this before adding a helper, an ABI, or a market field. [`archive/ABI_CONSOLIDATION_PLAN.md`](archive/ABI_CONSOLIDATION_PLAN.md) is a finished plan from March 2026 and still names ABI slices that have been deleted. Do not follow it.

The types in the files below are the field lists. This note does not copy them.

## ABIs

| Concern | File | Export |
|---|---|---|
| Minter, including dry runs | `src/abis/minter.ts` | `minterABI` |
| Stability pool, v2 and v3 names together | `src/abis/stabilityPool.ts` | `stabilityPoolABI` |
| Chainlink aggregator reads | `src/abis/chainlink.ts` | `CHAINLINK_AGGREGATOR_ABI` |
| Wrapped price oracle, ERC20, Genesis, stability pool manager | `src/abis/shared.ts` | `WRAPPED_PRICE_ORACLE_ABI`, `ERC20_ABI`, `GENESIS_ABI`, `STABILITY_POOL_MANAGER_ABI` |
| Admin minter surface | `src/abis/admin.ts` | `ADMIN_MINTER_ABI` |

Do not add a second slice of the minter, stability pool, Chainlink aggregator, or pool manager. `ADMIN_MINTER_ABI` stays separate because it is the admin surface.

## Config

| Concern | File |
|---|---|
| Address record shape and production markets | `src/config/contracts.ts` (`MarketConfig`) |
| Test2 and MegaETH address sets | `src/config/contracts.test2.ts`, `src/config/contracts.megaeth.ts` |
| Which address set is live | `src/config/contracts.index.ts` |
| Genesis, Earn, and Sail UI for one market | `src/config/markets.ts` |
| Harbor Yield rows | `src/config/harborYieldMarkets.ts` (`HarborYieldMarket`) |
| Wagmi | `src/config/index.tsx` |

Genesis, Earn, and Sail do not have their own market arrays. `genesisActive`, `anchorActive`, and `sailActive` are flags on the one object in `markets.ts`. Harbor Yield is a different product and keeps its own type.

`MarketConfig` is the address shape. Test2 and MegaETH should satisfy that type rather than declare another one. The test-versus-production switch lives only in `contracts.index.ts`.

## Helpers

| Helper | File |
|---|---|
| `getAcceptedDepositAssets`, `formatRatio` | `src/utils/anchor.ts` (`formatRatio` is re-exported by `src/utils/sailDisplayFormat.ts`) |
| `ZapApiVersion` | Declared in `src/config/markets.ts`, re-exported from `src/utils/zapApiVersion.ts` |

## When adding a market

Fill every key on the address bag and on the UI market. Use a zero address, `false`, or `""` when a value does not apply. Leaving a key off is how the catalogs drift.
