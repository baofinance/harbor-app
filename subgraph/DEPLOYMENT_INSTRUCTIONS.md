# Subgraph Deployment Instructions - Real-Time Price Fetching

## ✅ Changes Completed

1. **Real-Time Price Fetching**: Subgraph now fetches prices from `WrappedPriceOracle` contract at each deposit/withdraw event
2. **Correct Contract Address**: Updated to track `0x1454707877cdb966e29cea8a190c2169eeca4b8c` (ETH/fxUSD genesis)
3. **Wrapped Token Price Calculation**: Correctly calculates `underlyingPrice × wrappedRate` for accurate USD values
4. **Market-Specific Oracles**: Configured oracle addresses for all three markets:
   - ETH/fxUSD: `0x56d1a2fc199ba05f84d2eb8eab5858d3d954030c`
   - BTC/fxUSD: `0xf6e28853563db7f7e42f5db0e1f959743ac5b0e6`
   - BTC/stETH: `0xe370289af2145a5b2f0f7a4a900ebfd478a156db`
5. **Fallback Prices**: Uses fallback prices if oracle calls fail (fxSAVE ~$1.07, wstETH ~$4000)

## 📋 Deployment Steps

### 1. Authenticate with The Graph Studio

You'll need your deploy key or access token. Get it from: https://thegraph.com/studio/

### 2. Deploy the Subgraph

```bash
cd subgraph
graph deploy --studio harbor-marks --version-label v0.0.7
```

Or use the npm script:
```bash
cd subgraph
npm run deploy:mainnet
```

**Note**: The `deploy:mainnet` script will copy `subgraph.mainnet.yaml` to `subgraph.yaml`, so make sure `subgraph.mainnet.yaml` is also updated if you use that script.

### 3. Monitor Deployment

After deployment, monitor the sync status at:
https://thegraph.com/studio/subgraph/harbor-marks/

The subgraph will:
- Start syncing from block 23993255
- Process all existing deposits/withdrawals
- Create `UserHarborMarks` entities with correct USD values
- Calculate marks using real-time prices from the oracle

### 4. Update Frontend (if needed)

Once deployed, the frontend should automatically use the new subgraph version. The GraphQL endpoint will be:
```
https://api.studio.thegraph.com/query/1718836/harbor-marks/v0.0.7
```

## 🔍 Verification

After deployment, verify it's working:

```bash
# Check if UserHarborMarks are being created
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"query": "{ userHarborMarks(first: 5) { id user currentMarks marksPerDay currentDepositUSD } }"}' \
  "https://api.studio.thegraph.com/query/1718836/harbor-marks/v0.0.7"
```

## 📝 What Changed

### Files Modified:
- `subgraph/src/genesis.ts`: Added real-time price fetching from WrappedPriceOracle
- `subgraph/subgraph.yaml`: Updated contract address and added WrappedPriceOracle ABI
- `subgraph/subgraph.mainnet.yaml`: Added WrappedPriceOracle ABI

### Key Features:
- ✅ Fetches real-time prices at each event (not hardcoded)
- ✅ Calculates wrapped token prices correctly (underlying × rate)
- ✅ Supports all three markets with market-specific oracles
- ✅ Fallback prices if oracle fails
- ✅ Correct contract address tracking

## ⚠️ Important Notes

1. **Start Block**: The subgraph starts from block 23993255. Existing deposits before this block won't be indexed unless you adjust the start block.

2. **Re-indexing**: After deployment, the subgraph will re-index all events from the start block. This may take some time depending on how many events there are.

3. **Price Accuracy**: Prices are fetched at the time of each event, so historical deposits will have accurate USD values based on prices at that time.

4. **UserHarborMarks Creation**: Once the subgraph syncs, it will create `UserHarborMarks` entities for all users with deposits, and the frontend will start showing marks correctly.

