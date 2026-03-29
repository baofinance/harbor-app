# Internal documentation

Technical and operational notes for this repo. **Route-specific** write-ups live under [`routes/`](routes/); **superseded or unimplemented** material is under [`archive/`](archive/).

## Entry points

| Doc | Purpose |
|-----|---------|
| [`INDEX_PAGE_PATTERN.md`](INDEX_PAGE_PATTERN.md) | Index pages (Genesis, Sail, Anchor): UI−/UI+, shared components, port checklist |
| [`INDEX_PAGE_REFACTOR_PLAYBOOK.md`](INDEX_PAGE_REFACTOR_PLAYBOOK.md) | Deep refactor checklist (Sail → Anchor depth) |
| [`routes-genesis-earn-sail-ledger-transparency.md`](routes-genesis-earn-sail-ledger-transparency.md) | Large-route inventory (line counts, hooks, cross-cutting UI) |

## Route docs (`routes/`)

| File | App route |
|------|-----------|
| [`routes/anchor.md`](routes/anchor.md) | `/anchor` |
| [`routes/sail.md`](routes/sail.md) | `/sail` |
| [`routes/genesis.md`](routes/genesis.md) | `/genesis` |
| [`routes/earn.md`](routes/earn.md) | `/earn` (stability pools; not the same as the nav “Earn” → `/anchor`) |

## Theming / UX proposals

- [`GENESIS_UI_RADIUS_PROPOSAL.md`](GENESIS_UI_RADIUS_PROPOSAL.md) — radius tokens (`genesis-ui-radius-preview.html`)
- Historical Anchor layout exploration: [`archive/ANCHOR_LAYOUT_OPTIONS.md`](archive/ANCHOR_LAYOUT_OPTIONS.md)

## Security / RPC

- [`CLIENT_ERROR_VULNERABILITY_ASSESSMENT.md`](CLIENT_ERROR_VULNERABILITY_ASSESSMENT.md)
- [`ALCHEMY_KEY_ROTATION_AND_SECURITY.md`](ALCHEMY_KEY_ROTATION_AND_SECURITY.md)
- [`SECURITY_VULNERABILITIES_REVIEW.md`](SECURITY_VULNERABILITIES_REVIEW.md)

## Deployment & environments

- [`VERCEL_QUICK_START.md`](VERCEL_QUICK_START.md), [`DEPLOY_TO_PRODUCTION.md`](DEPLOY_TO_PRODUCTION.md)
- [`MAINNET_DEPLOYMENT_CHECKLIST.md`](MAINNET_DEPLOYMENT_CHECKLIST.md)
- [`STAGING_SETUP_GUIDE.md`](STAGING_SETUP_GUIDE.md), [`STAGING_BRANCH_SETUP.md`](STAGING_BRANCH_SETUP.md), [`CREATE_STAGING_REPO.md`](CREATE_STAGING_REPO.md)

## Protocol / product notes

Examples: [`APR_CALCULATION_DOCUMENTATION.md`](APR_CALCULATION_DOCUMENTATION.md), [`CONTRACT_ADDRESSES.md`](CONTRACT_ADDRESSES.md), [`SAIL_MINT_USD_FORMULA.md`](SAIL_MINT_USD_FORMULA.md), [`MINT_REDEEM_FEES.md`](MINT_REDEEM_FEES.md), [`MAP_ROOM_VOTING.md`](MAP_ROOM_VOTING.md), [`HARBOR_MARKS_SETUP.md`](HARBOR_MARKS_SETUP.md), [`EARLY_DEPOSIT_BONUS.md`](EARLY_DEPOSIT_BONUS.md), [`EUR_PRICE_CALCULATION_FLOW.md`](EUR_PRICE_CALCULATION_FLOW.md), [`NUMBER_FORMATTING_GUIDE.md`](NUMBER_FORMATTING_GUIDE.md), [`STABILITY_POOL_MIN_DEPOSITS.md`](STABILITY_POOL_MIN_DEPOSITS.md), [`TEST2_SETUP.md`](TEST2_SETUP.md) / [`TEST2_CONTRACTS.md`](TEST2_CONTRACTS.md), [`AnchorDepositWithdrawModal-optimization-plan.md`](AnchorDepositWithdrawModal-optimization-plan.md), and other `*.md` files in this directory.

## Archive

Superseded implementation plans, one-off fix write-ups, and snapshots that are no longer the source of truth:

| File | Why archived |
|------|----------------|
| [`archive/SIMPLE_VIEW_PROPOSAL.md`](archive/SIMPLE_VIEW_PROPOSAL.md) | Product proposal; not implemented (UI−/UI+ used instead) |
| [`archive/ANCHOR_LAYOUT_OPTIONS.md`](archive/ANCHOR_LAYOUT_OPTIONS.md) | Historical Anchor layout options |
| [`archive/ABI_CONSOLIDATION_PLAN.md`](archive/ABI_CONSOLIDATION_PLAN.md) | Phases completed |
| [`archive/admin-deposit-rewards-target-apr-plan.md`](archive/admin-deposit-rewards-target-apr-plan.md) | Shipped in admin rewards UI |
| [`archive/MARKS_BOOST_IMPLEMENTATION_PLAN.md`](archive/MARKS_BOOST_IMPLEMENTATION_PLAN.md) | Boost logic in subgraph |
| [`archive/UNDERLYING_APR_IMPLEMENTATION_PLAN.md`](archive/UNDERLYING_APR_IMPLEMENTATION_PLAN.md) | `useWstETHAPR` / `useFxSAVEAPR` |
| [`archive/SUBGRAPH_WITHDRAWAL_FIX.md`](archive/SUBGRAPH_WITHDRAWAL_FIX.md) | Point-in-time subgraph note |
| [`archive/SUBGRAPH_GENESIS_END_FIX.md`](archive/SUBGRAPH_GENESIS_END_FIX.md) | Point-in-time subgraph note |
| [`archive/DEBANK_INTEGRATION.md`](archive/DEBANK_INTEGRATION.md) | No app integration; see `CONTRACT_ADDRESSES.md` |
| [`archive/RPC_OPTIMIZATION_RECOMMENDATIONS.md`](archive/RPC_OPTIMIZATION_RECOMMENDATIONS.md) | Historical React Query snapshot |
| [`archive/MOBILE_OPTIMIZATIONS.md`](archive/MOBILE_OPTIMIZATIONS.md) | Completed pass record |
| [`archive/STABILITY_POOL_ZAPS_IMPLEMENTATION.md`](archive/STABILITY_POOL_ZAPS_IMPLEMENTATION.md) | Post-implementation summary |

## Subgraph

The [`subgraph/`](../subgraph/) package contains its own setup and deployment Markdown files for the indexer.
