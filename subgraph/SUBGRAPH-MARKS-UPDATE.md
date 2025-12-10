# Subgraph Marks Tracking Update

## Overview

The subgraph has been updated to track marks from multiple sources:
1. **Genesis Deposits** (existing) - 10 marks/dollar/day + 100 marks bonus at end
2. **ha Tokens in Wallet** (new) - 1 mark/dollar/day (configurable multiplier)
3. **Stability Pool Deposits** (new) - 1 mark/dollar/day (configurable multiplier)

## New Features

### 1. Multiple Markets Support
- Tracks multiple ha tokens (one per market)
- Each market can have its own multiplier
- Market identification via `marketId` field (optional)

### 2. Configurable Multipliers
- Default multiplier: 1.0 (1 mark per dollar per day)
- Can be updated per token/pool via `MarksMultiplier` entity
- Multiplier changes are tracked historically
- Multipliers apply from the time of change onwards

### 3. Balance Tracking
- **ha Tokens**: Tracks ERC20 Transfer events to calculate balances
- **Stability Pools**: Tracks Deposit/Withdraw events to track deposits
- Both accumulate marks continuously based on USD value

## Schema Changes

### New Entities

1. **HaTokenBalance**
   - Tracks ha token balances per user per token
   - Accumulates marks based on balance USD value
   - Supports multiple tokens (markets)

2. **StabilityPoolDeposit**
   - Tracks stability pool deposits per user per pool
   - Accumulates marks based on deposit USD value
   - Supports both collateral and sail pools

3. **MarksMultiplier**
   - Stores multiplier configuration per source
   - Tracks historical changes
   - Supports per-token and per-pool multipliers

4. **PriceFeed**
   - Stores price feed information for USD calculations
   - Can be updated from oracle contracts

5. **UserTotalMarks**
   - Aggregates marks from all sources
   - Provides total marks and marks per day
   - Updated when any source changes

## Implementation Details

### ha Token Tracking (`src/haToken.ts`)

**Handler**: `handleHaTokenTransfer`
- Listens to ERC20 Transfer events
- Tracks balance changes for each user
- Calculates USD value using price feeds
- Accumulates marks based on time held and multiplier

**Key Functions**:
- `getOrCreateHaTokenBalance()` - Get or create balance entity
- `accumulateMarks()` - Calculate marks for time period
- `getHaTokenMultiplier()` - Get current multiplier for token
- `updateHaTokenMultiplier()` - Update multiplier (admin function)

### Stability Pool Tracking (`src/stabilityPool.ts`)

**Handlers**:
- `handleStabilityPoolDeposit` - Track deposits
- `handleStabilityPoolWithdraw` - Track withdrawals
- `handleStabilityPoolDepositChange` - Track balance changes

**Key Functions**:
- `getOrCreateStabilityPoolDeposit()` - Get or create deposit entity
- `accumulateMarks()` - Calculate marks for time period
- `getStabilityPoolMultiplier()` - Get current multiplier for pool
- `updateStabilityPoolMultiplier()` - Update multiplier (admin function)

### Marks Aggregation (`src/marksAggregation.ts`)

**Functions**:
- `aggregateUserMarks()` - Aggregate all marks for a user
- `updateHaTokenMarksInTotal()` - Update ha token marks in UserTotalMarks
- `updateStabilityPoolMarksInTotal()` - Update pool marks in UserTotalMarks

## Configuration

### Adding ha Tokens

To track a new ha token, create a data source from the HaToken template:

```yaml
# In subgraph.yaml, add a data source:
dataSources:
  - kind: ethereum
    name: HaToken_haUSD
    network: anvil
    source:
      address: "0x..." # ha token address
      abi: ERC20
      startBlock: 0
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - HaTokenBalance
        - MarksMultiplier
        - UserTotalMarks
        - PriceFeed
      abis:
        - name: ERC20
          file: ./abis/ERC20.json
      eventHandlers:
        - event: Transfer(indexed address,indexed address,uint256)
          handler: handleHaTokenTransfer
      file: ./src/haToken.ts
```

### Adding Stability Pools

To track a stability pool, create a data source from the StabilityPool template:

```yaml
dataSources:
  - kind: ethereum
    name: StabilityPool_Collateral
    network: anvil
    source:
      address: "0x..." # Stability pool address
      abi: StabilityPool
      startBlock: 0
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - StabilityPoolDeposit
        - MarksMultiplier
        - UserTotalMarks
        - PriceFeed
      abis:
        - name: StabilityPool
          file: ./abis/StabilityPool.json
        - name: ERC20
          file: ./abis/ERC20.json
      eventHandlers:
        - event: Deposit(indexed address,indexed address,uint256)
          handler: handleStabilityPoolDeposit
        - event: Withdraw(indexed address,indexed address,uint256)
          handler: handleStabilityPoolWithdraw
        - event: UserDepositChange(indexed address,uint256,uint256)
          handler: handleStabilityPoolDepositChange
      file: ./src/stabilityPool.ts
```

## Updating Multipliers

Multipliers can be updated by calling the update functions. In the future, you may want to add admin events to contracts that trigger multiplier updates.

### Example: Update ha Token Multiplier

```typescript
// In a handler or admin function
updateHaTokenMultiplier(
  tokenAddress,
  BigDecimal.fromString("2.0"), // New multiplier (2x)
  event.block.timestamp,
  event.transaction.from // Admin address
);
```

### Example: Update Stability Pool Multiplier

```typescript
updateStabilityPoolMultiplier(
  poolAddress,
  "collateral", // or "sail"
  BigDecimal.fromString("1.5"), // New multiplier (1.5x)
  event.block.timestamp,
  event.transaction.from
);
```

## GraphQL Queries

### Get User's Total Marks

```graphql
query GetUserTotalMarks($userAddress: Bytes!) {
  userTotalMarks(id: $userAddress) {
    id
    user
    genesisMarks
    haTokenMarks
    stabilityPoolMarks
    totalMarks
    totalMarksPerDay
    lastUpdated
  }
}
```

### Get User's ha Token Balances

```graphql
query GetUserHaTokenBalances($userAddress: Bytes!) {
  haTokenBalances(where: { user: $userAddress }) {
    id
    tokenAddress
    balance
    balanceUSD
    marksPerDay
    accumulatedMarks
    totalMarksEarned
    marketId
  }
}
```

### Get User's Stability Pool Deposits

```graphql
query GetUserStabilityPoolDeposits($userAddress: Bytes!) {
  stabilityPoolDeposits(where: { user: $userAddress }) {
    id
    poolAddress
    poolType
    balance
    balanceUSD
    marksPerDay
    accumulatedMarks
    totalMarksEarned
    marketId
  }
}
```

### Get Current Multipliers

```graphql
query GetMultipliers {
  marksMultipliers(where: { sourceType_in: ["haToken", "stabilityPoolCollateral", "stabilityPoolSail"] }) {
    id
    sourceType
    sourceAddress
    multiplier
    effectiveFrom
    updatedAt
  }
}
```

## Important Notes

### Balance Tracking Limitations

1. **ERC20 Transfers**: The current implementation tracks transfers but doesn't query contract balances directly. For accurate balance tracking, you may want to:
   - Periodically query contract balances
   - Use a more sophisticated balance tracking system
   - Track balances by summing transfers (current approach)

2. **USD Price Calculation**: Currently uses placeholder price feeds. You'll need to:
   - Integrate with actual price oracles
   - Update `PriceFeed` entities with real prices
   - Handle price updates from oracle events

3. **Multi-Market Aggregation**: The `UserTotalMarks` aggregation is simplified. For production, consider:
   - Maintaining a list of all balances/deposits per user
   - Using GraphQL queries to aggregate (more efficient)
   - Implementing a more sophisticated aggregation system

### Next Steps

1. **Add Price Oracle Integration**: Update `PriceFeed` entities from oracle events
2. **Add Balance Queries**: Periodically query contract balances for accuracy
3. **Add Admin Events**: Create events/contracts for updating multipliers
4. **Test Multi-Market**: Test with multiple ha tokens and pools
5. **Optimize Aggregation**: Improve UserTotalMarks aggregation efficiency

## Deployment

1. **Build the subgraph**:
   ```bash
   cd subgraph
   graph codegen
   graph build
   ```

2. **Deploy to local Graph Node**:
   ```bash
   graph deploy harbor-marks-local --node http://localhost:8020 --ipfs http://localhost:5001
   ```

3. **Add Data Sources**: After deployment, you'll need to add data sources for each ha token and stability pool using the Graph Node API or a script.

## Testing

Test the subgraph with:
- Multiple ha tokens
- Multiple stability pools
- Multiplier updates
- Balance changes over time
- Multiple users

Verify that:
- Marks accumulate correctly
- Multipliers apply correctly
- UserTotalMarks aggregates correctly
- Historical data is preserved



## Overview

The subgraph has been updated to track marks from multiple sources:
1. **Genesis Deposits** (existing) - 10 marks/dollar/day + 100 marks bonus at end
2. **ha Tokens in Wallet** (new) - 1 mark/dollar/day (configurable multiplier)
3. **Stability Pool Deposits** (new) - 1 mark/dollar/day (configurable multiplier)

## New Features

### 1. Multiple Markets Support
- Tracks multiple ha tokens (one per market)
- Each market can have its own multiplier
- Market identification via `marketId` field (optional)

### 2. Configurable Multipliers
- Default multiplier: 1.0 (1 mark per dollar per day)
- Can be updated per token/pool via `MarksMultiplier` entity
- Multiplier changes are tracked historically
- Multipliers apply from the time of change onwards

### 3. Balance Tracking
- **ha Tokens**: Tracks ERC20 Transfer events to calculate balances
- **Stability Pools**: Tracks Deposit/Withdraw events to track deposits
- Both accumulate marks continuously based on USD value

## Schema Changes

### New Entities

1. **HaTokenBalance**
   - Tracks ha token balances per user per token
   - Accumulates marks based on balance USD value
   - Supports multiple tokens (markets)

2. **StabilityPoolDeposit**
   - Tracks stability pool deposits per user per pool
   - Accumulates marks based on deposit USD value
   - Supports both collateral and sail pools

3. **MarksMultiplier**
   - Stores multiplier configuration per source
   - Tracks historical changes
   - Supports per-token and per-pool multipliers

4. **PriceFeed**
   - Stores price feed information for USD calculations
   - Can be updated from oracle contracts

5. **UserTotalMarks**
   - Aggregates marks from all sources
   - Provides total marks and marks per day
   - Updated when any source changes

## Implementation Details

### ha Token Tracking (`src/haToken.ts`)

**Handler**: `handleHaTokenTransfer`
- Listens to ERC20 Transfer events
- Tracks balance changes for each user
- Calculates USD value using price feeds
- Accumulates marks based on time held and multiplier

**Key Functions**:
- `getOrCreateHaTokenBalance()` - Get or create balance entity
- `accumulateMarks()` - Calculate marks for time period
- `getHaTokenMultiplier()` - Get current multiplier for token
- `updateHaTokenMultiplier()` - Update multiplier (admin function)

### Stability Pool Tracking (`src/stabilityPool.ts`)

**Handlers**:
- `handleStabilityPoolDeposit` - Track deposits
- `handleStabilityPoolWithdraw` - Track withdrawals
- `handleStabilityPoolDepositChange` - Track balance changes

**Key Functions**:
- `getOrCreateStabilityPoolDeposit()` - Get or create deposit entity
- `accumulateMarks()` - Calculate marks for time period
- `getStabilityPoolMultiplier()` - Get current multiplier for pool
- `updateStabilityPoolMultiplier()` - Update multiplier (admin function)

### Marks Aggregation (`src/marksAggregation.ts`)

**Functions**:
- `aggregateUserMarks()` - Aggregate all marks for a user
- `updateHaTokenMarksInTotal()` - Update ha token marks in UserTotalMarks
- `updateStabilityPoolMarksInTotal()` - Update pool marks in UserTotalMarks

## Configuration

### Adding ha Tokens

To track a new ha token, create a data source from the HaToken template:

```yaml
# In subgraph.yaml, add a data source:
dataSources:
  - kind: ethereum
    name: HaToken_haUSD
    network: anvil
    source:
      address: "0x..." # ha token address
      abi: ERC20
      startBlock: 0
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - HaTokenBalance
        - MarksMultiplier
        - UserTotalMarks
        - PriceFeed
      abis:
        - name: ERC20
          file: ./abis/ERC20.json
      eventHandlers:
        - event: Transfer(indexed address,indexed address,uint256)
          handler: handleHaTokenTransfer
      file: ./src/haToken.ts
```

### Adding Stability Pools

To track a stability pool, create a data source from the StabilityPool template:

```yaml
dataSources:
  - kind: ethereum
    name: StabilityPool_Collateral
    network: anvil
    source:
      address: "0x..." # Stability pool address
      abi: StabilityPool
      startBlock: 0
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - StabilityPoolDeposit
        - MarksMultiplier
        - UserTotalMarks
        - PriceFeed
      abis:
        - name: StabilityPool
          file: ./abis/StabilityPool.json
        - name: ERC20
          file: ./abis/ERC20.json
      eventHandlers:
        - event: Deposit(indexed address,indexed address,uint256)
          handler: handleStabilityPoolDeposit
        - event: Withdraw(indexed address,indexed address,uint256)
          handler: handleStabilityPoolWithdraw
        - event: UserDepositChange(indexed address,uint256,uint256)
          handler: handleStabilityPoolDepositChange
      file: ./src/stabilityPool.ts
```

## Updating Multipliers

Multipliers can be updated by calling the update functions. In the future, you may want to add admin events to contracts that trigger multiplier updates.

### Example: Update ha Token Multiplier

```typescript
// In a handler or admin function
updateHaTokenMultiplier(
  tokenAddress,
  BigDecimal.fromString("2.0"), // New multiplier (2x)
  event.block.timestamp,
  event.transaction.from // Admin address
);
```

### Example: Update Stability Pool Multiplier

```typescript
updateStabilityPoolMultiplier(
  poolAddress,
  "collateral", // or "sail"
  BigDecimal.fromString("1.5"), // New multiplier (1.5x)
  event.block.timestamp,
  event.transaction.from
);
```

## GraphQL Queries

### Get User's Total Marks

```graphql
query GetUserTotalMarks($userAddress: Bytes!) {
  userTotalMarks(id: $userAddress) {
    id
    user
    genesisMarks
    haTokenMarks
    stabilityPoolMarks
    totalMarks
    totalMarksPerDay
    lastUpdated
  }
}
```

### Get User's ha Token Balances

```graphql
query GetUserHaTokenBalances($userAddress: Bytes!) {
  haTokenBalances(where: { user: $userAddress }) {
    id
    tokenAddress
    balance
    balanceUSD
    marksPerDay
    accumulatedMarks
    totalMarksEarned
    marketId
  }
}
```

### Get User's Stability Pool Deposits

```graphql
query GetUserStabilityPoolDeposits($userAddress: Bytes!) {
  stabilityPoolDeposits(where: { user: $userAddress }) {
    id
    poolAddress
    poolType
    balance
    balanceUSD
    marksPerDay
    accumulatedMarks
    totalMarksEarned
    marketId
  }
}
```

### Get Current Multipliers

```graphql
query GetMultipliers {
  marksMultipliers(where: { sourceType_in: ["haToken", "stabilityPoolCollateral", "stabilityPoolSail"] }) {
    id
    sourceType
    sourceAddress
    multiplier
    effectiveFrom
    updatedAt
  }
}
```

## Important Notes

### Balance Tracking Limitations

1. **ERC20 Transfers**: The current implementation tracks transfers but doesn't query contract balances directly. For accurate balance tracking, you may want to:
   - Periodically query contract balances
   - Use a more sophisticated balance tracking system
   - Track balances by summing transfers (current approach)

2. **USD Price Calculation**: Currently uses placeholder price feeds. You'll need to:
   - Integrate with actual price oracles
   - Update `PriceFeed` entities with real prices
   - Handle price updates from oracle events

3. **Multi-Market Aggregation**: The `UserTotalMarks` aggregation is simplified. For production, consider:
   - Maintaining a list of all balances/deposits per user
   - Using GraphQL queries to aggregate (more efficient)
   - Implementing a more sophisticated aggregation system

### Next Steps

1. **Add Price Oracle Integration**: Update `PriceFeed` entities from oracle events
2. **Add Balance Queries**: Periodically query contract balances for accuracy
3. **Add Admin Events**: Create events/contracts for updating multipliers
4. **Test Multi-Market**: Test with multiple ha tokens and pools
5. **Optimize Aggregation**: Improve UserTotalMarks aggregation efficiency

## Deployment

1. **Build the subgraph**:
   ```bash
   cd subgraph
   graph codegen
   graph build
   ```

2. **Deploy to local Graph Node**:
   ```bash
   graph deploy harbor-marks-local --node http://localhost:8020 --ipfs http://localhost:5001
   ```

3. **Add Data Sources**: After deployment, you'll need to add data sources for each ha token and stability pool using the Graph Node API or a script.

## Testing

Test the subgraph with:
- Multiple ha tokens
- Multiple stability pools
- Multiplier updates
- Balance changes over time
- Multiple users

Verify that:
- Marks accumulate correctly
- Multipliers apply correctly
- UserTotalMarks aggregates correctly
- Historical data is preserved





