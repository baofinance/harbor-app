# Harbor Marks Tracking Setup Guide

This guide will help you set up Harbor Marks tracking using The Graph.

## Overview

Harbor Marks are earned by users during Maiden Voyage (Genesis period):

- **10 marks per dollar per day** during the genesis period
- **100x bonus** at the end of genesis (only for assets still deposited)
- **Forfeited** when users withdraw before genesis ends

## Step 1: Set Up The Graph Subgraph

### 1.1 Install The Graph CLI

```bash
npm install -g @graphprotocol/graph-cli
```

### 1.2 Create Subgraph in The Graph Studio

1. Go to https://thegraph.com/studio/
2. Connect your wallet
3. Create a new subgraph
4. Note your subgraph name and deployment key

### 1.3 Update Configuration

1. Update `subgraph/subgraph.yaml`:

   - Set `network` to your chain (mainnet, sepolia, etc.)
   - Update `address` to your Genesis contract address
   - Set `startBlock` to the deployment block

2. Add Genesis ABI:

   - Copy your Genesis contract ABI to `subgraph/abis/Genesis.json`

3. Update constants in `subgraph/src/genesis.ts`:
   ```typescript
   const MARKS_PER_DOLLAR_PER_DAY = BigDecimal.fromString("10");
   const BONUS_MULTIPLIER = BigDecimal.fromString("100");
   ```

### 1.4 Deploy Subgraph

```bash
cd subgraph
npm install
npm run codegen
npm run build
graph auth --studio <your-deployment-key>
npm run deploy
```

## Step 2: Configure Frontend

### 2.1 Add Environment Variable

Add to `.env.local`:

```
NEXT_PUBLIC_GRAPH_URL=https://api.studio.thegraph.com/query/<your-subgraph-id>/<your-subgraph-name>/latest
```

### 2.2 Use the Hook

```typescript
import { useHarborMarks, formatHarborMarks } from "@/hooks/useHarborMarks";

function MyComponent() {
  const genesisAddress = "0x..."; // Your genesis contract address
  const { data, isLoading, error } = useHarborMarks({
    genesisAddress,
    enabled: true,
  });

  const marks = formatHarborMarks(data);

  return (
    <div>
      <p>Current Marks: {marks.currentMarks.toLocaleString()}</p>
      <p>Marks per Day: {marks.marksPerDay.toFixed(2)}</p>
      <p>Total Earned: {marks.totalMarksEarned.toLocaleString()}</p>
      <p>Total Forfeited: {marks.totalMarksForfeited.toLocaleString()}</p>
    </div>
  );
}
```

## Step 3: Track Multiple Markets

For multiple genesis markets:

```typescript
import { useAllHarborMarks } from "@/hooks/useHarborMarks";

const genesisAddresses = [
  "0x...", // Market 1
  "0x...", // Market 2
];

const { data: allMarks } = useAllHarborMarks(genesisAddresses);

// Aggregate totals
const totalMarks =
  allMarks?.reduce((sum, market) => {
    return sum + parseFloat(market.data?.userHarborMarks?.currentMarks || "0");
  }, 0) || 0;
```

## Step 4: Update Genesis Page

Replace the current client-side calculation with The Graph data:

```typescript
// In src/app/genesis/page.tsx
import { useHarborMarks, formatHarborMarks } from "@/hooks/useHarborMarks";

// Replace the ledger marks calculation with:
const { data: marksData } = useHarborMarks({
  genesisAddress: genesisAddress,
  enabled: !!genesisAddress && isConnected,
});

const marks = formatHarborMarks(marksData);
```

## Important Notes

1. **USD Price Tracking**: The subgraph currently uses a simplified USD calculation. You may want to:

   - Add a price oracle data source to track USD prices at deposit/withdrawal time
   - Or calculate USD values in the frontend using current prices

2. **Withdrawal Tracking**: The current implementation tracks withdrawals but doesn't map them to specific deposits. You may want to enhance this to:

   - Track which deposits were partially/fully withdrawn
   - Calculate forfeited marks more precisely

3. **Genesis End Bonus**: The 100x bonus is calculated when genesis ends. Make sure the `handleGenesisEnd` event handler is working correctly.

4. **Testing**: Test the subgraph locally before deploying:

   ```bash
   # Start local Graph node
   docker-compose up

   # Deploy locally
   npm run deploy-local
   ```

## Troubleshooting

- **No data returned**: Check that your subgraph is synced and the contract address is correct
- **Marks not updating**: Ensure the subgraph is indexing new blocks
- **GraphQL errors**: Verify your query variables match the schema

## Next Steps

1. Deploy the subgraph to The Graph Studio
2. Update the frontend to use the hook
3. Replace client-side calculations with subgraph data
4. Add Harbor Marks display to other parts of the app (profile, leaderboard, etc.)



