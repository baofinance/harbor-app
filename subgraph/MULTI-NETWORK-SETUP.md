# Multi-Network Setup: Local & Production

This subgraph is configured to work on both **local test environments** (Anvil) and **production mainnet** deployments.

## Network Configuration

### Current Setup

The `subgraph.yaml` uses `network: anvil` for local development. For production, you'll need to:

1. **Update network name** in `subgraph.yaml`:
   ```yaml
   network: mainnet  # or base, arbitrum-one, etc.
   ```

2. **Update contract addresses** in `subgraph.yaml`:
   ```yaml
   source:
     address: "0x..." # Production contract address
     startBlock: 12345678 # Production deployment block
   ```

### Recommended Approach: Separate Config Files

For easier management, consider using separate config files:

**`subgraph.local.yaml`** (for local development):
```yaml
network: anvil
source:
  address: "0x..." # Local Anvil address
  startBlock: 55
```

**`subgraph.mainnet.yaml`** (for production):
```yaml
network: mainnet
source:
  address: "0x..." # Mainnet address
  startBlock: 12345678
```

Then deploy with:
```bash
# Local
graph deploy --subgraph-name harbor-marks-local < subgraph.local.yaml

# Production
graph deploy --subgraph-name harbor-marks-mainnet < subgraph.mainnet.yaml
```

## ABIs Are Network-Agnostic

✅ **Good news**: The ABIs we created work for both local and production!

- `ERC20.json` - Standard interface (works everywhere)
- `ChainlinkAggregator.json` - Standard Chainlink interface (works everywhere)
- `StabilityPool.json` - Harbor interface (same on all networks)
- `Genesis.json` - Harbor interface (same on all networks)

The contract interfaces don't change between networks - only the addresses do.

## Generated Code

The `graph codegen` command generates TypeScript classes that work on **any network**:

- `generated/templates/HaToken/ERC20.ts` - Works on local & mainnet
- `generated/templates/StabilityPoolCollateral/StabilityPool.ts` - Works on local & mainnet
- `generated/templates/*/ChainlinkAggregator.ts` - Works on local & mainnet

## Deployment Checklist

### For Local Development:
- [x] ABIs created
- [x] Codegen run successfully
- [ ] Update `subgraph.yaml` with local contract addresses
- [ ] Deploy to local Graph Node

### For Production:
- [x] ABIs created (same as local)
- [x] Codegen run successfully (same as local)
- [ ] Update `subgraph.yaml` with production contract addresses
- [ ] Update network name to `mainnet` (or your chain)
- [ ] Deploy to The Graph Network or hosted service

## Key Points

1. **ABIs are universal** - Same interfaces work on all networks
2. **Generated code is universal** - Same TypeScript classes work everywhere
3. **Only addresses change** - Update `subgraph.yaml` with network-specific addresses
4. **Network name matters** - Must match Graph Node configuration

## Testing

After deploying to both networks, verify:

1. **Local**: Query `http://localhost:8000/subgraphs/name/harbor-marks-local`
2. **Production**: Query your production GraphQL endpoint

Both should return the same data structure, just with different contract addresses.



This subgraph is configured to work on both **local test environments** (Anvil) and **production mainnet** deployments.

## Network Configuration

### Current Setup

The `subgraph.yaml` uses `network: anvil` for local development. For production, you'll need to:

1. **Update network name** in `subgraph.yaml`:
   ```yaml
   network: mainnet  # or base, arbitrum-one, etc.
   ```

2. **Update contract addresses** in `subgraph.yaml`:
   ```yaml
   source:
     address: "0x..." # Production contract address
     startBlock: 12345678 # Production deployment block
   ```

### Recommended Approach: Separate Config Files

For easier management, consider using separate config files:

**`subgraph.local.yaml`** (for local development):
```yaml
network: anvil
source:
  address: "0x..." # Local Anvil address
  startBlock: 55
```

**`subgraph.mainnet.yaml`** (for production):
```yaml
network: mainnet
source:
  address: "0x..." # Mainnet address
  startBlock: 12345678
```

Then deploy with:
```bash
# Local
graph deploy --subgraph-name harbor-marks-local < subgraph.local.yaml

# Production
graph deploy --subgraph-name harbor-marks-mainnet < subgraph.mainnet.yaml
```

## ABIs Are Network-Agnostic

✅ **Good news**: The ABIs we created work for both local and production!

- `ERC20.json` - Standard interface (works everywhere)
- `ChainlinkAggregator.json` - Standard Chainlink interface (works everywhere)
- `StabilityPool.json` - Harbor interface (same on all networks)
- `Genesis.json` - Harbor interface (same on all networks)

The contract interfaces don't change between networks - only the addresses do.

## Generated Code

The `graph codegen` command generates TypeScript classes that work on **any network**:

- `generated/templates/HaToken/ERC20.ts` - Works on local & mainnet
- `generated/templates/StabilityPoolCollateral/StabilityPool.ts` - Works on local & mainnet
- `generated/templates/*/ChainlinkAggregator.ts` - Works on local & mainnet

## Deployment Checklist

### For Local Development:
- [x] ABIs created
- [x] Codegen run successfully
- [ ] Update `subgraph.yaml` with local contract addresses
- [ ] Deploy to local Graph Node

### For Production:
- [x] ABIs created (same as local)
- [x] Codegen run successfully (same as local)
- [ ] Update `subgraph.yaml` with production contract addresses
- [ ] Update network name to `mainnet` (or your chain)
- [ ] Deploy to The Graph Network or hosted service

## Key Points

1. **ABIs are universal** - Same interfaces work on all networks
2. **Generated code is universal** - Same TypeScript classes work everywhere
3. **Only addresses change** - Update `subgraph.yaml` with network-specific addresses
4. **Network name matters** - Must match Graph Node configuration

## Testing

After deploying to both networks, verify:

1. **Local**: Query `http://localhost:8000/subgraphs/name/harbor-marks-local`
2. **Production**: Query your production GraphQL endpoint

Both should return the same data structure, just with different contract addresses.














