# Quick Start: Multi-Market Marks Tracking

## What Was Added

The subgraph now tracks marks from:
1. ✅ **Genesis Deposits** (existing) - 10 marks/dollar/day + 100 bonus
2. ✅ **ha Tokens in Wallet** (new) - 1 mark/dollar/day (configurable)
3. ✅ **Stability Pool Deposits** (new) - 1 mark/dollar/day (configurable)

## Key Features

- **Multiple Markets**: Supports multiple ha tokens and stability pools
- **Configurable Multipliers**: Default 1x, can be updated per token/pool
- **Continuous Accumulation**: Marks accumulate based on time held and USD value
- **Historical Tracking**: Multiplier changes are tracked historically

## Files Created/Updated

### New Files
- `src/haToken.ts` - Handles ERC20 Transfer events for ha tokens
- `src/stabilityPool.ts` - Handles stability pool deposit/withdraw events
- `src/marksAggregation.ts` - Aggregates marks across all sources

### Updated Files
- `schema.graphql` - Added new entities (already had them)
- `subgraph.yaml` - Templates already configured

## How It Works

### ha Token Tracking
1. Listens to `Transfer` events on ha token contracts
2. Tracks balance changes for each user
3. Calculates USD value using price feeds
4. Accumulates marks: `balanceUSD × multiplier × daysHeld`

### Stability Pool Tracking
1. Listens to `Deposit`, `Withdraw`, and `UserDepositChange` events
2. Tracks deposit balances for each user
3. Calculates USD value using pegged token price
4. Accumulates marks: `depositUSD × multiplier × daysHeld`

### Multiplier System
- Default: 1.0 (1 mark per dollar per day)
- Can be updated per token or pool
- Changes apply from time of update onwards
- Historical changes are tracked

## Next Steps

### 1. Add Data Sources

You need to add data sources for each ha token and stability pool. This can be done:

**Option A: Via Graph Node API** (after deployment)
```bash
# Add ha token data source
curl -X POST http://localhost:8020/subgraphs/name/harbor-marks-local \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "subgraph_create",
    "params": {
      "name": "HaToken_haUSD",
      "address": "0x...",
      "abi": "ERC20",
      "startBlock": 0
    }
  }'
```

**Option B: Add to subgraph.yaml** (before deployment)
Add data sources directly to `subgraph.yaml` for each token/pool.

### 2. Integrate Price Oracles

Update `PriceFeed` entities with real prices. You can:
- Listen to oracle update events
- Periodically query oracle contracts
- Use fixed prices for testing

### 3. Update Multipliers

Multipliers can be updated by calling:
```typescript
// In a handler or admin function
updateHaTokenMultiplier(tokenAddress, newMultiplier, timestamp, adminAddress);
updateStabilityPoolMultiplier(poolAddress, poolType, newMultiplier, timestamp, adminAddress);
```

### 4. Test

Test with:
- Multiple ha tokens
- Multiple stability pools  
- Balance changes
- Multiplier updates
- Multiple users

## GraphQL Queries

### Get Total Marks for User
```graphql
{
  userTotalMarks(id: "0x...") {
    totalMarks
    totalMarksPerDay
    genesisMarks
    haTokenMarks
    stabilityPoolMarks
  }
}
```

### Get ha Token Balances
```graphql
{
  haTokenBalances(where: { user: "0x..." }) {
    tokenAddress
    balance
    balanceUSD
    accumulatedMarks
    marksPerDay
  }
}
```

### Get Stability Pool Deposits
```graphql
{
  stabilityPoolDeposits(where: { user: "0x..." }) {
    poolAddress
    poolType
    balance
    balanceUSD
    accumulatedMarks
    marksPerDay
  }
}
```

## Important Notes

1. **Balance Tracking**: Currently tracks via Transfer events. For accuracy, you may want to periodically query contract balances.

2. **Price Feeds**: Currently uses placeholder prices. Integrate with real oracles for production.

3. **Multi-Market**: The system supports multiple markets, but you need to add data sources for each one.

4. **Multiplier Updates**: Multipliers can be updated, but you'll need to add admin events/contracts to trigger updates.

5. **Aggregation**: `UserTotalMarks` aggregation is simplified. For production, consider more efficient aggregation methods.

## Deployment

```bash
cd subgraph
graph codegen
graph build
graph deploy harbor-marks-local --node http://localhost:8020 --ipfs http://localhost:5001
```

After deployment, add data sources for each ha token and stability pool.



## What Was Added

The subgraph now tracks marks from:
1. ✅ **Genesis Deposits** (existing) - 10 marks/dollar/day + 100 bonus
2. ✅ **ha Tokens in Wallet** (new) - 1 mark/dollar/day (configurable)
3. ✅ **Stability Pool Deposits** (new) - 1 mark/dollar/day (configurable)

## Key Features

- **Multiple Markets**: Supports multiple ha tokens and stability pools
- **Configurable Multipliers**: Default 1x, can be updated per token/pool
- **Continuous Accumulation**: Marks accumulate based on time held and USD value
- **Historical Tracking**: Multiplier changes are tracked historically

## Files Created/Updated

### New Files
- `src/haToken.ts` - Handles ERC20 Transfer events for ha tokens
- `src/stabilityPool.ts` - Handles stability pool deposit/withdraw events
- `src/marksAggregation.ts` - Aggregates marks across all sources

### Updated Files
- `schema.graphql` - Added new entities (already had them)
- `subgraph.yaml` - Templates already configured

## How It Works

### ha Token Tracking
1. Listens to `Transfer` events on ha token contracts
2. Tracks balance changes for each user
3. Calculates USD value using price feeds
4. Accumulates marks: `balanceUSD × multiplier × daysHeld`

### Stability Pool Tracking
1. Listens to `Deposit`, `Withdraw`, and `UserDepositChange` events
2. Tracks deposit balances for each user
3. Calculates USD value using pegged token price
4. Accumulates marks: `depositUSD × multiplier × daysHeld`

### Multiplier System
- Default: 1.0 (1 mark per dollar per day)
- Can be updated per token or pool
- Changes apply from time of update onwards
- Historical changes are tracked

## Next Steps

### 1. Add Data Sources

You need to add data sources for each ha token and stability pool. This can be done:

**Option A: Via Graph Node API** (after deployment)
```bash
# Add ha token data source
curl -X POST http://localhost:8020/subgraphs/name/harbor-marks-local \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "subgraph_create",
    "params": {
      "name": "HaToken_haUSD",
      "address": "0x...",
      "abi": "ERC20",
      "startBlock": 0
    }
  }'
```

**Option B: Add to subgraph.yaml** (before deployment)
Add data sources directly to `subgraph.yaml` for each token/pool.

### 2. Integrate Price Oracles

Update `PriceFeed` entities with real prices. You can:
- Listen to oracle update events
- Periodically query oracle contracts
- Use fixed prices for testing

### 3. Update Multipliers

Multipliers can be updated by calling:
```typescript
// In a handler or admin function
updateHaTokenMultiplier(tokenAddress, newMultiplier, timestamp, adminAddress);
updateStabilityPoolMultiplier(poolAddress, poolType, newMultiplier, timestamp, adminAddress);
```

### 4. Test

Test with:
- Multiple ha tokens
- Multiple stability pools  
- Balance changes
- Multiplier updates
- Multiple users

## GraphQL Queries

### Get Total Marks for User
```graphql
{
  userTotalMarks(id: "0x...") {
    totalMarks
    totalMarksPerDay
    genesisMarks
    haTokenMarks
    stabilityPoolMarks
  }
}
```

### Get ha Token Balances
```graphql
{
  haTokenBalances(where: { user: "0x..." }) {
    tokenAddress
    balance
    balanceUSD
    accumulatedMarks
    marksPerDay
  }
}
```

### Get Stability Pool Deposits
```graphql
{
  stabilityPoolDeposits(where: { user: "0x..." }) {
    poolAddress
    poolType
    balance
    balanceUSD
    accumulatedMarks
    marksPerDay
  }
}
```

## Important Notes

1. **Balance Tracking**: Currently tracks via Transfer events. For accuracy, you may want to periodically query contract balances.

2. **Price Feeds**: Currently uses placeholder prices. Integrate with real oracles for production.

3. **Multi-Market**: The system supports multiple markets, but you need to add data sources for each one.

4. **Multiplier Updates**: Multipliers can be updated, but you'll need to add admin events/contracts to trigger updates.

5. **Aggregation**: `UserTotalMarks` aggregation is simplified. For production, consider more efficient aggregation methods.

## Deployment

```bash
cd subgraph
graph codegen
graph build
graph deploy harbor-marks-local --node http://localhost:8020 --ipfs http://localhost:5001
```

After deployment, add data sources for each ha token and stability pool.











