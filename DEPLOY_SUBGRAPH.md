# Deploy Subgraph v0.0.15 to The Graph Network

## Current Status
- ✅ Subgraph built successfully
- ✅ IPFS hash: `QmUd3sGVnz1yemZ6mx8ASmJ8jnmSN4ZPtZxTFZKXMQFjqC`
- ✅ All early deposit bonus features implemented

## Deployment Options

### Option 1: Deploy via The Graph Studio UI (Recommended)

1. Go to [The Graph Studio](https://thegraph.com/studio/)
2. Select your subgraph (ledger-marks or harbor-marks)
3. Click "Deploy new version"
4. Either:
   - Upload the build directory: `subgraph/build/`
   - Or use the IPFS hash: `QmUd3sGVnz1yemZ6mx8ASmJ8jnmSN4ZPtZxTFZKXMQFjqC`
5. Set version label: `v0.0.15`
6. Deploy

### Option 2: Deploy via CLI

If you have your deploy key or access token configured:

```bash
cd subgraph
graph deploy ledger-marks \
  --version-label v0.0.15 \
  --ipfs-hash QmUd3sGVnz1yemZ6mx8ASmJ8jnmSN4ZPtZxTFZKXMQFjqC
```

Or deploy from build directory:

```bash
cd subgraph
graph deploy ledger-marks \
  --version-label v0.0.15 \
  --output-dir build/
```

### Option 3: Deploy with Authentication

If you need to authenticate first:

```bash
cd subgraph
graph auth --studio <YOUR_DEPLOY_KEY>
# Then deploy
graph deploy ledger-marks --version-label v0.0.15
```

## After Deployment

1. Wait for the subgraph to sync (check status in The Graph Studio)
2. Once synced, get the new subgraph URL from The Graph Studio
3. Update `.env.local` with the new `NEXT_PUBLIC_GRAPH_URL`
4. The frontend will automatically use the new subgraph data

## What's New in v0.0.15

- ✅ Early deposit bonus tracking (250k fxUSD or 70 wstETH threshold)
- ✅ Market bonus status entity
- ✅ User early bonus eligibility tracking
- ✅ Token amount tracking (not USD)
- ✅ Withdrawal handling for early bonus

