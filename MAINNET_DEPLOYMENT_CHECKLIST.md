# Mainnet Deployment Checklist

This document outlines all the changes needed to deploy the Harbor App to Ethereum mainnet.

## ✅ Automatic (No Changes Needed)

The following features automatically work in production:

1. **Anvil-specific hooks** - `useAnvilContractRead` and `useAnvilContractReads` automatically use wagmi in production (when `NODE_ENV !== 'development'`)
2. **Environment detection** - `shouldUseAnvil()` returns `false` in production by default
3. **Fallback price** - Only applies in development mode, won't affect production
4. **Debug logging** - All `process.env.NODE_ENV === 'development'` checks are automatically disabled in production

## 📝 Required Changes

### 1. Update Contract Addresses

**File: `src/config/contracts.ts`**

Replace the Anvil contract addresses with your mainnet deployment addresses:

```typescript
export const contracts = {
  minter: "0x...", // Mainnet minter address
  peggedToken: "0x...", // Mainnet pegged token address
  leveragedToken: "0x...", // Mainnet leveraged token address
  genesis: "0x...", // Mainnet genesis address
  reservePool: "0x...", // Mainnet reserve pool address
  stabilityPoolManager: "0x...", // Mainnet stability pool manager address
  feeReceiver: "0x...", // Mainnet fee receiver address
  priceOracle: "0x...", // Mainnet price oracle address (Chainlink or similar)
  collateralToken: "0x...", // Mainnet stETH address
  wrappedCollateralToken: "0x...", // Mainnet wstETH address
} as const;
```

### 2. Update Market Configuration

**File: `src/config/markets.ts`**

Update the market addresses to reference the new mainnet contract addresses from `contracts.ts`. The file already imports from `contracts.ts`, so updating `contracts.ts` should be sufficient, but verify the stability pool addresses are correct.

### 3. Set GraphQL Endpoint

**Environment Variable: `NEXT_PUBLIC_GRAPH_URL`**

Set this in your production environment (e.g., Vercel, Netlify, etc.):

```bash
NEXT_PUBLIC_GRAPH_URL=https://api.studio.thegraph.com/query/<your-subgraph-id>/harbor-marks/latest
```

Or if using The Graph Network:

```bash
NEXT_PUBLIC_GRAPH_URL=https://gateway.thegraph.com/api/<api-key>/subgraphs/id/<subgraph-id>
```

**File: `src/config/graph.ts`** - Update the default production URL if needed.

### 4. Update Wagmi Configuration (Automatic)

**File: `src/config/wagmi.ts`**

✅ **Already handled automatically!** The wagmi config now:

- Automatically removes Anvil from chains in production
- Puts mainnet first in production
- Uses environment variables for RPC URLs

**Optional:** Set custom RPC URLs in production (recommended for better performance):

```bash
NEXT_PUBLIC_MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your-api-key
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
```

### 5. Update Subgraph Configuration

**File: `subgraph/subgraph.yaml`**

Update the network and contract addresses:

```yaml
dataSources:
  - kind: ethereum
    name: Genesis
    network: mainnet # Change from 'anvil'
    source:
      address: "0x..." # Your mainnet Genesis contract address
      abi: Genesis
      startBlock: 12345678 # Block where Genesis was deployed
```

### 6. Environment Variables for Production

Set these in your production environment:

```bash
# Required
NEXT_PUBLIC_GRAPH_URL=https://api.studio.thegraph.com/query/...
NEXT_PUBLIC_USE_ANVIL=false  # Explicitly disable Anvil mode (optional, defaults to false in production)

# Optional (recommended for better performance)
NEXT_PUBLIC_MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your-api-key
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
```

### 7. Remove/Update Fallback Price (Optional)

**File: `src/app/genesis/page.tsx`**

The fallback price (line ~867) only applies in development mode, so it won't affect production. However, if you want to remove it entirely or change the logic:

```typescript
// Current: Only uses fallback in development
if (collateralPriceUSD === 0 && process.env.NODE_ENV === "development") {
  // fallback logic
}

// For production, you might want to:
// - Remove the fallback entirely (let it fail if oracle is down)
// - Or add a production fallback with a warning
```

## 🔍 Verification Steps

Before deploying to mainnet:

1. **Test with `NEXT_PUBLIC_USE_ANVIL=false`** locally to ensure production mode works
2. **Verify contract addresses** are correct for mainnet
3. **Test GraphQL queries** against your production subgraph
4. **Verify price oracle** is working (no fallback in production)
5. **Check RPC endpoints** are accessible and rate-limited appropriately
6. **Test wallet connections** on mainnet

## 🚀 Deployment

1. Update all contract addresses
2. Set environment variables in your hosting platform
3. Deploy subgraph to The Graph Network
4. Build and deploy the frontend
5. Verify all features work on mainnet

## 📌 Notes

- The code automatically switches to production mode when `NODE_ENV=production`
- Anvil-specific behavior is disabled by default in production
- All debug logging is automatically disabled in production builds
- The fallback price only applies in development, so production will use the actual oracle price
