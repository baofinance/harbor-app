# Harbor Marks Subgraph

This subgraph tracks Harbor Marks earned by users during Maiden Voyage (Genesis period).

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   # or
   yarn install
   ```

2. **Generate types:**

   ```bash
   npm run codegen
   ```

3. **Build the subgraph:**

   ```bash
   npm run build
   ```

4. **Deploy to The Graph Studio:**
   - Go to https://thegraph.com/studio/
   - Create a new subgraph
   - Get your deployment key
   - Update `subgraph.yaml` with your contract address and start block
   - Deploy:
     ```bash
     npm run deploy
     ```

## Configuration

### Update `subgraph.yaml`:

- Set the correct `network` (mainnet, sepolia, etc.)
- Update `address` to your Genesis contract address
- Set `startBlock` to the block where Genesis was deployed
- Add the Genesis ABI to `abis/Genesis.json`

### Update Constants in `src/genesis.ts`:

- `MARKS_PER_DOLLAR_PER_DAY`: Currently 10
- `BONUS_MULTIPLIER`: Currently 100

## Schema

The subgraph tracks:

- **Deposits**: All deposits into Genesis contracts
- **Withdrawals**: All withdrawals from Genesis contracts
- **User Harbor Marks**: Aggregated marks per user per genesis contract
- **Genesis End Events**: When genesis periods end

## Usage in Frontend

See `src/hooks/useHarborMarks.ts` for React hooks to query Harbor Marks data.

## Environment Variables

Add to your `.env.local`:

```
NEXT_PUBLIC_GRAPH_URL=https://api.studio.thegraph.com/query/<your-subgraph-id>/<your-subgraph-name>/latest
```

## Local Development

For local development with a local Graph node:

```bash
# Start local Graph node (requires Docker)
docker-compose up

# Create subgraph
npm run create-local

# Deploy to local node
npm run deploy-local
```










