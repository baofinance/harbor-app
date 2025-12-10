# Harbor Marks Subgraph - Setup Guide

This guide will walk you through setting up the Harbor Marks tracking system step by step.

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A wallet with some ETH (for The Graph Studio deployment)
- Your Genesis contract address and ABI

## Step 1: Install The Graph CLI

```bash
npm install -g @graphprotocol/graph-cli
```

Verify installation:

```bash
graph --version
```

## Step 2: Create Subgraph in The Graph Studio

1. Go to https://thegraph.com/studio/
2. Connect your wallet
3. Click "Create a Subgraph"
4. Fill in:
   - **Subgraph Name**: `harbor-marks` (or your preferred name)
   - **Subtitle**: "Harbor Marks tracking for Maiden Voyage"
   - **Description**: "Tracks Harbor Marks earned across Genesis, stability pools, and token holdings"
5. Click "Create Subgraph"
6. **Copy your deployment key** - you'll need this later

## Step 3: Install Dependencies

```bash
cd subgraph
npm install
```

## Step 4: Get Your Genesis Contract ABI

You need the full ABI for your Genesis contract. If you have it locally:

```bash
# If you have the ABI file
cp path/to/Genesis.json subgraph/abis/Genesis.json
```

Or if you need to fetch it from Etherscan/your deployment:

- Go to your contract on Etherscan
- Copy the ABI JSON
- Save it to `subgraph/abis/Genesis.json`

**Important**: The ABI must include these events:

- `Deposit(address indexed caller, address indexed receiver, uint256 collateralIn)`
- `Withdraw(address indexed caller, address indexed receiver, uint256 amount)`
- `GenesisEnds()`

## Step 5: Update Configuration

### 5.1 Update `subgraph.yaml`

Edit `subgraph/subgraph.yaml`:

```yaml
dataSources:
  - kind: ethereum
    name: Genesis
    network: anvil # Change to: mainnet, sepolia, etc. for production
    source:
      address: "0xDeF8a62f50BA3B9f319B473c48928595A333acba" # Your Genesis contract address
      abi: Genesis
      startBlock: 0 # Change to the block where Genesis was deployed
```

**For production**, change:

- `network: mainnet` (or your chain)
- `startBlock: <deployment-block-number>`

### 5.2 Update Genesis Contract Address

Make sure the address in `subgraph.yaml` matches your actual Genesis contract.

## Step 6: Generate Types

```bash
cd subgraph
npm run codegen
```

This will:

- Read your schema
- Generate TypeScript types
- Create the `generated/` folder

**If you get errors**, check:

- Your ABI file exists and is valid JSON
- The event signatures match your contract

## Step 7: Build the Subgraph

```bash
npm run build
```

This compiles your AssemblyScript code. Fix any TypeScript errors if they appear.

## Step 8: Authenticate with The Graph

```bash
graph auth --studio <YOUR_DEPLOYMENT_KEY>
```

Replace `<YOUR_DEPLOYMENT_KEY>` with the key you copied from The Graph Studio.

## Step 9: Deploy to The Graph Studio

First, update the deploy script in `package.json`:

```json
"deploy": "graph deploy --node https://api.studio.thegraph.com/deploy/ harbor-marks"
```

Replace `harbor-marks` with your actual subgraph name from Step 2.

Then deploy:

```bash
npm run deploy
```

This will:

- Upload your subgraph to IPFS
- Deploy to The Graph Studio
- Start syncing with your blockchain

## Step 10: Wait for Sync

1. Go back to The Graph Studio
2. Click on your subgraph
3. Wait for it to sync (this can take a few minutes to hours depending on start block)
4. Check the "Playground" tab to test queries

## Step 11: Get Your GraphQL Endpoint

Once synced, you'll see a GraphQL endpoint like:

```
https://api.studio.thegraph.com/query/<subgraph-id>/harbor-marks/<version>
```

Copy this URL - you'll need it for the frontend.

## Step 12: Configure Frontend

### 12.1 Add Environment Variable

Create or update `.env.local` in your project root:

```bash
NEXT_PUBLIC_GRAPH_URL=https://api.studio.thegraph.com/query/<subgraph-id>/harbor-marks/<version>
```

### 12.2 Test the Hook

The hook is already created at `src/hooks/useHarborMarks.ts`. You can test it:

```typescript
import { useHarborMarks } from '@/hooks/useHarborMarks';

function TestComponent() {
  const genesisAddress = "0xDeF8a62f50BA3B9f319B473c48928595A333acba";
  const { data, isLoading, error } = useHarborMarks({
    genesisAddress,
    enabled: true
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>Marks: {data?.userHarborMarks?.currentMarks}</div>;
}
```

## Step 13: Verify It's Working

1. Make a test deposit to your Genesis contract
2. Wait for the subgraph to index (check in The Graph Studio)
3. Query your marks using the hook
4. Verify the marks calculation matches your rules

## Troubleshooting

### "Failed to fetch" errors

- Check your `NEXT_PUBLIC_GRAPH_URL` is correct
- Verify the subgraph is synced in The Graph Studio
- Check browser console for CORS errors

### Subgraph not syncing

- Verify the contract address is correct
- Check the start block is before any events
- Verify the network matches (anvil vs mainnet)
- Check The Graph Studio logs for errors

### Type errors in codegen

- Ensure ABI file is valid JSON
- Check event signatures match exactly
- Try deleting `generated/` folder and running `codegen` again

### Marks not calculating correctly

- Check `marksRules.ts` has correct default rates
- Verify USD price calculation (currently simplified)
- Check event handlers are firing correctly

## Next Steps

Once basic setup is working:

1. **Add Stability Pool tracking** - See `CONFIGURATION.md`
2. **Add Token Balance tracking** - See `CONFIGURATION.md`
3. **Update rules** - Edit `marksRules.ts` as needed
4. **Add more contract types** - Follow the pattern in existing handlers

## Local Development (Optional)

If you want to test locally before deploying:

1. Start local Graph node:

```bash
docker-compose up
```

2. Create local subgraph:

```bash
npm run create-local
```

3. Deploy locally:

```bash
npm run deploy-local
```

4. Access at: http://localhost:8000/subgraphs/name/harbor-marks

## Production Deployment

When ready for production:

1. Change `network` in `subgraph.yaml` to `mainnet` (or your chain)
2. Update `startBlock` to actual deployment block
3. Update contract addresses
4. Redeploy to The Graph Studio
5. Update `NEXT_PUBLIC_GRAPH_URL` in production environment



