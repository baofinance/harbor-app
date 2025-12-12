# Local Graph Node Setup Guide for Harbor Marks Subgraph

## Information to Provide to AI Setting Up Graph Node

### 1. **Network Configuration**

- **Network Name**: `anvil` (or `localhost` - check what your Anvil network is called)
- **RPC Endpoint**: `http://localhost:8545` (default Anvil endpoint)
- **Chain ID**: Usually `31337` for Anvil (verify this)

### 2. **Graph Node Endpoints**

- **Graph Node**: `http://localhost:8020/`
- **IPFS Node**: `http://localhost:5001/`
- **GraphQL Endpoint**: `http://localhost:8000/subgraphs/name/<subgraph-name>/graphql`

### 3. **Subgraph Configuration Changes Needed**

Before deploying locally, you'll need to update `subgraph.yaml`:

```yaml
network: anvil # Change from "sepolia" to "anvil"
source:
  address: "<YOUR_GENESIS_CONTRACT_ADDRESS_ON_ANVIL>" # Get this from your Anvil deployment
  startBlock: <DEPLOYMENT_BLOCK_NUMBER> # Block number when Genesis contract was deployed
```

### 4. **Contract Information Needed**

You'll need to provide:

- **Genesis Contract Address**: The address of your Genesis contract on Anvil (format: `0x...`)
- **Deployment Block Number**: The block number when the Genesis contract was deployed on Anvil
- **Contract ABI**: Already exists at `./abis/Genesis.json` ✅

### 5. **Subgraph Name**

- Use: `harbor-marks-local` or `ledger-marks-local` (to distinguish from production)
- Or reuse: `ledger-marks` if you want to replace the local version

### 6. **Events Being Tracked**

The subgraph tracks these events from the Genesis contract:

- `Deposit(address indexed receiver, address indexed collateralIn, uint256 collateralIn)`
- `Withdraw(address indexed receiver, address indexed amount, uint256 amount)`
- `GenesisEnds()`

### 7. **Deployment Commands**

After Graph node is set up, you'll run:

```bash
# 1. Create the subgraph on local node
npm run create-local -- harbor-marks-local

# 2. Build the subgraph
npm run build

# 3. Deploy to local node
npm run deploy-local -- harbor-marks-local
```

Or manually:

```bash
graph create --node http://localhost:8020/ harbor-marks-local
graph build
graph deploy --node http://localhost:8020/ --ipfs http://localhost:5001 harbor-marks-local
```

### 8. **Testing the Subgraph**

After deployment, query the local GraphQL endpoint:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"query":"{ userHarborMarks { id currentMarks marksPerDay } }"}' \
  http://localhost:8000/subgraphs/name/harbor-marks-local/graphql
```

### 9. **Frontend Configuration**

Update your frontend to use the local Graph endpoint:

In `src/hooks/useHarborMarks.ts`, change:

```typescript
graphUrl =
  process.env.NEXT_PUBLIC_GRAPH_URL ||
  "http://localhost:8000/subgraphs/name/harbor-marks-local/graphql";
```

Or set environment variable:

```bash
NEXT_PUBLIC_GRAPH_URL=http://localhost:8000/subgraphs/name/harbor-marks-local/graphql
```

### 10. **Important Notes for AI**

Tell the AI:

- You're using **Anvil** (local Ethereum node) for development
- The Graph node should connect to Anvil at `http://localhost:8545`
- You need **IPFS** running locally (usually on port 5001)
- The subgraph uses **AssemblyScript** (not TypeScript) - handlers are in `src/genesis.ts`
- The schema is already defined in `schema.graphql`
- You want to test the marks tracking logic (deposits, withdrawals, genesis end bonus)

### 11. **Quick Checklist for AI**

- [ ] Set up Graph Node (port 8020)
- [ ] Set up IPFS (port 5001)
- [ ] Configure Graph Node to connect to Anvil at `http://localhost:8545`
- [ ] Verify Graph Node is accessible at `http://localhost:8020/`
- [ ] Verify GraphQL endpoint will be at `http://localhost:8000/subgraphs/name/<name>/graphql`
- [ ] Ensure Graph Node can sync blocks from Anvil
- [ ] Test that Graph Node can read events from your Genesis contract

### 12. **Troubleshooting**

If events aren't being indexed:

- Check that the Genesis contract address in `subgraph.yaml` matches Anvil
- Verify `startBlock` is correct (should be ≤ deployment block)
- Check Graph Node logs for errors
- Ensure Anvil is running and accessible
- Verify the contract has emitted events after the `startBlock`

### 13. **Environment Variables**

You might need to set:

```bash
GRAPH_NODE_URL=http://localhost:8020/
IPFS_URL=http://localhost:5001/
ETHEREUM_RPC_URL=http://localhost:8545
```

---

## After Graph Node is Set Up

1. **Get your Genesis contract address from Anvil**:

   ```bash
   # Check your deployment logs or use cast/anvil commands
   ```

2. **Update `subgraph.yaml`** with the Anvil contract address and deployment block

3. **Deploy the subgraph** using the commands above

4. **Test by making deposits/withdrawals** on Anvil and querying the subgraph

5. **Update frontend** to point to local Graph endpoint for testing





