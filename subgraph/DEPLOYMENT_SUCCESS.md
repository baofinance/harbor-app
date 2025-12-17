# ✅ Harbor Marks Subgraph - Successfully Deployed!

## Deployment Details

- **Subgraph Name**: `ledger-marks`
- **Version**: `v0.0.1`
- **Studio URL**: https://thegraph.com/studio/subgraph/ledger-marks
- **Query Endpoint**: https://api.studio.thegraph.com/query/1715934/ledger-marks/v0.0.1

## Next Steps

### 1. Add Environment Variable

Add to your `.env.local`:

```bash
NEXT_PUBLIC_GRAPH_URL=https://api.studio.thegraph.com/query/1715934/ledger-marks/v0.0.1
```

### 2. Wait for Sync

The subgraph will start syncing from block 0 on Sepolia. You can monitor progress in The Graph Studio.

**Note**: Since your contract is on local Anvil (not Sepolia), the subgraph won't find any events until you:

- Deploy your contract to Sepolia (or another supported network), OR
- Update the network in `subgraph.yaml` to match where your contract is deployed

### 3. Update Network (When Ready)

When you deploy to production, update `subgraph.yaml`:

- Change `network: sepolia` to your production network (mainnet, base, arbitrum-one, etc.)
- Update `startBlock` to the actual deployment block
- Update contract address if different
- Redeploy: `npm run deploy -- --version-label v0.0.2`

### 4. Test the Hook

Once synced, test in your app:

```typescript
import { useHarborMarks } from "@/hooks/useHarborMarks";

const { data, isLoading, error } = useHarborMarks({
  genesisAddress: "0xDeF8a62f50BA3B9f319B473c48928595A333acba",
  enabled: true,
});
```

## Current Features

✅ Tracks deposits
✅ Tracks withdrawals  
✅ Calculates marks per day (10 marks/$/day)
✅ User marks aggregation
✅ Genesis end event tracking

## Future Enhancements

- [ ] Time-based marks accumulation
- [ ] Bonus calculation on genesis end
- [ ] Forfeiture calculation on withdrawal
- [ ] USD price oracle integration
- [ ] Flexible rules system
- [ ] Stability pool tracking
- [ ] Token balance tracking

## GraphQL Query Examples

### Get User Marks

```graphql
{
  userHarborMarks(id: "0x...-0x...") {
    currentMarks
    marksPerDay
    totalDepositedUSD
    currentDepositUSD
    totalMarksEarned
    totalMarksForfeited
  }
}
```

### Get All Deposits

```graphql
{
  deposits(where: { user: "0x..." }, orderBy: timestamp, orderDirection: desc) {
    amount
    amountUSD
    marksPerDay
    timestamp
    isActive
  }
}
```

## Monitoring

Check sync status at: https://thegraph.com/studio/subgraph/ledger-marks

The subgraph will show:

- Current block
- Synced blocks
- Status (Syncing, Pending, Failed, etc.)










