# Test2 Contract Addresses

This document contains the test2 contract addresses found in `subgraph/subgraph.test.yaml` for development/testing of the sail and anchor pages.

## ETH/fxUSD Market (test2)

| Contract | Address | Block |
|----------|---------|-------|
| Genesis | `0x5f4398e1d3e33f93e3d7ee710d797e2a154cb073` | 24025347 |
| haETH (Pegged Token) | `0x8e7442020ba7debfd77e67491c51faa097d87478` | 24025347 |
| hsFXUSD-ETH (Leveraged/Sail Token) | `0x8248849b83ae20b21fa561f97ee5835a063c1f9c` | 24025347 |
| Stability Pool Collateral | `0xfb9747b30ee1b1df2434255c7768c1ebfa7e89bb` | 24025347 |
| Stability Pool Leveraged | `0x93d0472443d775e95bf1597c8c66dfe9093bfc48` | 24025347 |

**Missing addresses needed for sail/anchor pages:**
- Minter
- Price Oracle
- Collateral Price
- Fee Receiver
- Reserve Pool
- Stability Pool Manager
- Collateral Token (fxUSD)
- Wrapped Collateral Token (fxSAVE)

## BTC/fxUSD Market (test2)

| Contract | Address | Block |
|----------|---------|-------|
| Genesis | `0x288c61c3b3684ff21adf38d878c81457b19bd2fe` | 24025557 |
| haBTC (Pegged Token) | `0x1822bbe8fe313c4b53414f0b3e5ef8147d485530` | 24025557 |
| hsFXUSD-BTC (Leveraged/Sail Token) | `0x454f2c12ce62a4fd813e2e06fda5d46e358e7c70` | 24025557 |
| Stability Pool Collateral | `0x5378fbf71627e352211779bd4cd09b0a791015ac` | 24025557 |
| Stability Pool Leveraged | `0x8667592f836a8e2d19ce7879b8ae557297514f48` | 24025557 |

**Missing addresses needed for sail/anchor pages:**
- Minter
- Price Oracle
- Collateral Price
- Fee Receiver
- Reserve Pool
- Stability Pool Manager
- Collateral Token (fxUSD)
- Wrapped Collateral Token (fxSAVE)

## BTC/stETH Market (test2)

| Contract | Address | Block |
|----------|---------|-------|
| Genesis | `0x9ae0b57ceada0056dbe21edcd638476fcba3ccc0` | 24025785 |
| hsSTETH-BTC (Leveraged/Sail Token) | `0x1df67ebd59db60a13ec783472aaf22e5b2b01f25` | 24025785 |
| Stability Pool Collateral | `0x86297bd2de92e91486c7e3b32cb5bc18f0a363bc` | 24025785 |
| Stability Pool Leveraged | `0x8d6307be018fcc42ad65e91b77c6b09c7ac9f0df` | 24025785 |

**Note:** haBTC is shared with BTC/fxUSD market (`0x1822bbe8fe313c4b53414f0b3e5ef8147d485530`)

**Missing addresses needed for sail/anchor pages:**
- Minter
- Price Oracle
- Collateral Price
- Fee Receiver
- Reserve Pool
- Stability Pool Manager
- Collateral Token (wstETH)
- Underlying Collateral Token (stETH)

## Next Steps

To use these test2 contracts for sail/anchor page development, we need to:

1. **Find the missing contract addresses** - These might be in:
   - Deployment logs (check `DeployLog/` directory)
   - Staging environment configs
   - On-chain contract queries (some addresses can be derived from contract calls)

2. **Create a test2 config file** - Similar to `src/config/contracts.ts` but with test2 addresses

3. **Add environment variable support** - Allow switching between production and test2 contracts via `NEXT_PUBLIC_APP_ENV` or similar

4. **Update markets config** - Add test2 market configurations that reference the test2 contracts

## How to Find Missing Addresses

You can query the contracts on-chain to get some missing addresses:

- **Minter**: Can be queried from the pegged token or leveraged token contracts
- **Price Oracle**: Can be queried from the minter contract
- **Collateral Token**: Can be queried from the genesis contract
- **Reserve Pool**: Can be queried from the minter contract
- **Stability Pool Manager**: Can be queried from stability pool contracts

Would you like me to:
1. Create a script to query these addresses from the contracts?
2. Create a test2 config file structure?
3. Check the DeployLog files for any test2 deployment information?



