# Deployment Network Note

## Current Status

The subgraph is configured for **Sepolia testnet** as a placeholder.

## Important: Update Before Deploying

You need to update `subgraph.yaml` with the **actual network** where your Genesis contract is deployed:

### Supported Networks in The Graph Studio:

- `mainnet` - Ethereum mainnet
- `sepolia` - Sepolia testnet
- `goerli` - Goerli testnet (deprecated)
- `base` - Base mainnet
- `base-sepolia` - Base Sepolia testnet
- `arbitrum-one` - Arbitrum mainnet
- `arbitrum-sepolia` - Arbitrum Sepolia testnet
- And others...

### For Local Development:

If you want to test locally with Anvil, you'll need to:

1. Set up a local Graph node (see `docker-compose.yml`)
2. Use `npm run deploy-local` instead
3. The Graph Studio only supports public networks

### To Update:

1. Edit `subgraph.yaml`
2. Change `network: sepolia` to your actual network
3. Update `startBlock` to the block where your contract was deployed
4. Redeploy: `npm run deploy`

## Your Current Setup

Based on your config, you have:

- Local Anvil (chain ID 31337) - for local dev
- Mainnet, Base, Arbitrum configured in wagmi

**Which network will your Genesis contract be deployed on?**

- If testnet: Use `sepolia` or `base-sepolia`
- If mainnet: Use `mainnet`, `base`, or `arbitrum-one`











