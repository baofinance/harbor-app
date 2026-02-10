# ABI Consolidation Plan

## Goal
Consolidate all ABIs into `/src/abis` and remove inline/duplicate definitions across the codebase.

## Current State

### Already in `/src/abis`
- **shared.ts**: ERC20_ABI, CHAINLINK_ORACLE_ABI, GENESIS_ABI, STABILITY_POOL_ABI, STABILITY_POOL_MANAGER_ABI, WSTETH_ABI, STETH_ABI, MINTER_ABI, MINTER_ABI_EXTENDED, WRAPPED_PRICE_ORACLE_ABI
- **minterUsdcZapV3.ts**: MINTER_USDC_ZAP_V3_ABI
- **zap.ts**, **usdcZap.ts**: ZAP_ABI, USDC_ZAP_ABI
- **genesisZapPermit.ts**: GENESIS_STETH_ZAP_PERMIT_ABI, GENESIS_USDC_ZAP_PERMIT_ABI
- **stabilityPool.ts**: stabilityPoolABI
- **chainlink.ts**, **oracleFeeds.ts**, **priceFeeds.ts**: Chainlink-related

### Inline / Duplicate Locations

| ABI | Location(s) | Action |
|-----|-------------|--------|
| ERC20_PERMIT_ABI | AnchorDepositWithdrawModal | → abis/permit.ts |
| CHAINLINK_AGGREGATOR_ABI | AnchorDepositWithdrawModal, priceFeeds.ts | → abis/chainlink.ts |
| ERC20_ABI_WITH_SYMBOL | AnchorDepositWithdrawModal | → shared (ERC20_ABI has symbol) |
| minterABI (dry-run) | AnchorDepositWithdrawModal | → shared MINTER_ABI_EXTENDED or new |
| STETH_ZAP_PERMIT_ABI, USDC_ZAP_PERMIT_ABI | utils/permit.ts | → abis/permitZaps.ts |
| STABILITY_POOL_ZAP_ABI, STABILITY_POOL_ZAP_PERMIT_ABI | utils/permit.ts | → abis/permitZaps.ts |
| genesisABI | MintRedeemForm, GenesisWithdrawModal, GenesisManageModal, genesis/page, useGenesisClaim | → shared GENESIS_ABI |
| erc20SymbolABI, chainlinkOracleABI | genesis/page, genesis/[id] | → shared |
| MINTER_ABI, STABILITY_POOL_ABI | useVolatilityProtection, useAnchorMarks | → shared |
| votingEscrowABI, erc20ABI | stake/page, staking/page | → shared + new votingEscrow |
| Various | admin, sail, hooks | → consolidate to abis |

## Implementation Phases

### Phase 1: Move permit/zap ABIs from utils to abis ✅ DONE
- Create `abis/permitZaps.ts` (or extend existing)
- Move STETH_ZAP_PERMIT_ABI, USDC_ZAP_PERMIT_ABI, STABILITY_POOL_ZAP_ABI, STABILITY_POOL_ZAP_PERMIT_ABI
- Create `abis/permit.ts` for ERC20_PERMIT_ABI
- Update permit.ts and AnchorDepositWithdrawModal imports

### Phase 2: Consolidate AnchorDepositWithdrawModal inline ABIs ✅ DONE
- ERC20_PERMIT_ABI → abis/permit.ts
- CHAINLINK_AGGREGATOR_ABI → abis/chainlink.ts
- ERC20_ABI_WITH_SYMBOL → use ERC20_ABI from shared (has symbol)
- minterABI → MINTER_ABI_EXTENDED from shared or minter dry-run export

### Phase 3: Replace genesisABI duplicates ✅ DONE
- All genesisABI → GENESIS_ABI from @/abis/shared

### Phase 4: Hooks and pages ✅ DONE (partial - main hooks updated)
- useVolatilityProtection, useAnchorMarks, useErc20, useCollateralPrice, etc.
- sail/page, admin/page, stake/page, staking/page
