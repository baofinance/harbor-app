# Test2 Contracts Setup Guide

This guide explains how to switch between production and test2 contracts for development/testing.

## Quick Start

### To Use Test2 Contracts

1. **Set environment variable:**
   ```bash
   NEXT_PUBLIC_USE_TEST2_CONTRACTS=true
   ```

2. **Restart your dev server:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

3. **Verify it's working:**
   - Check the browser console for: `[Contracts] Using TEST2 contracts`
   - Check that contract addresses match test2 deployment logs

### To Switch Back to Production

1. **Remove or set the environment variable to false:**
   ```bash
   NEXT_PUBLIC_USE_TEST2_CONTRACTS=false
   # or simply remove it
   ```

2. **Restart your dev server**

## Files

- **`src/config/contracts.ts`** - Production contracts (default)
- **`src/config/contracts.test2.ts`** - Test2 contracts
- **`src/config/contracts.index.ts`** - Switcher (not used directly, contracts.ts handles switching)

## Test2 Contract Addresses

Test2 contracts are deployed on mainnet and can be found in:
- `DeployLog/mainnet-test2__ETH__fxUSD.json`
- `DeployLog/mainnet-test2__BTC__fxUSD.json`
- `DeployLog/mainnet-test2__BTC__stETH.json`

### Markets Available in Test2

1. **ETH/fxUSD** (test2)
   - Genesis: `0x5f4398e1d3e33f93e3d7ee710d797e2a154cb073`
   - haETH: `0x8e7442020ba7debfd77e67491c51faa097d87478`
   - hsFXUSD-ETH: `0x8248849b83ae20b21fa561f97ee5835a063c1f9c`

2. **BTC/fxUSD** (test2)
   - Genesis: `0x288c61c3b3684ff21adf38d878c81457b19bd2fe`
   - haBTC: `0x1822bbe8fe313c4b53414f0b3e5ef8147d485530`
   - hsFXUSD-BTC: `0x454f2c12ce62a4fd813e2e06fda5d46e358e7c70`

3. **BTC/stETH** (test2)
   - Genesis: `0x9ae0b57ceada0056dbe21edcd638476fcba3ccc0`
   - hsSTETH-BTC: `0x1df67ebd59db60a13ec783472aaf22e5b2b01f25`
   - haBTC: `0x1822bbe8fe313c4b53414f0b3e5ef8147d485530` (shared with BTC/fxUSD)

## Notes

- **Zap contracts**: Test2 deployment does not include zap contracts. Placeholder addresses (`0x0000...`) are used.
- **Environment variables**: `NEXT_PUBLIC_USE_TEST2_CONTRACTS` must be set at build time. Changes require a server restart.
- **Production safety**: The default is always production contracts. Test2 is opt-in only.

## Development Workflow

1. Start with production contracts (default)
2. When ready to test sail/anchor pages, set `NEXT_PUBLIC_USE_TEST2_CONTRACTS=true`
3. Test your changes with test2 contracts
4. Switch back to production before committing (or ensure env var is not committed)

## Environment Variable Setup

### Local Development (.env.local)

```bash
# .env.local
NEXT_PUBLIC_USE_TEST2_CONTRACTS=true
```

### Vercel/Production

**Do NOT set this in production!** Only use test2 contracts in local development or staging environments.



