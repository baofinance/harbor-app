#!/bin/bash
# Deploy Harbor Marks Subgraph to Mainnet (The Graph Studio)
#
# Prerequisites:
#   1. Graph CLI installed: npm install -g @graphprotocol/graph-cli
#   2. Authenticated with The Graph Studio: graph auth --studio <deploy-key>
#   3. Subgraph created in The Graph Studio dashboard
#
# Usage:
#   ./deploy-mainnet.sh [version-label]
#
# Examples:
#   ./deploy-mainnet.sh              # Uses v0.0.1 as default
#   ./deploy-mainnet.sh v0.1.0       # Deploy with specific version
#   ./deploy-mainnet.sh test-1       # Deploy test version

set -e

# Configuration
SUBGRAPH_NAME="harbor-marks"  # Change this to your subgraph name in The Graph Studio
VERSION_LABEL="${1:-v0.0.1}"

echo "=============================================="
echo "Harbor Marks Subgraph - Mainnet Deployment"
echo "=============================================="
echo ""
echo "Subgraph: $SUBGRAPH_NAME"
echo "Version:  $VERSION_LABEL"
echo "Network:  mainnet"
echo ""

# Check if we're in the right directory
if [ ! -f "subgraph.mainnet.yaml" ]; then
    echo "❌ Error: subgraph.mainnet.yaml not found"
    echo "   Please run this script from the subgraph directory"
    exit 1
fi

# Step 1: Copy mainnet config to subgraph.yaml
echo "1. Setting up mainnet configuration..."
cp subgraph.mainnet.yaml subgraph.yaml
echo "   ✅ Copied subgraph.mainnet.yaml to subgraph.yaml"

# Step 2: Generate code
echo ""
echo "2. Generating TypeScript types..."
graph codegen
echo "   ✅ Code generation complete"

# Step 3: Build
echo ""
echo "3. Building subgraph..."
graph build
echo "   ✅ Build complete"

# Step 4: Deploy to The Graph Studio
echo ""
echo "4. Deploying to The Graph Studio..."
echo "   (Make sure you've run: graph auth --studio <deploy-key>)"
echo ""

graph deploy --studio $SUBGRAPH_NAME --version-label $VERSION_LABEL

echo ""
echo "=============================================="
echo "✅ Deployment Complete!"
echo "=============================================="
echo ""
echo "Your subgraph is now deploying. Check status at:"
echo "  https://thegraph.com/studio/subgraph/$SUBGRAPH_NAME/"
echo ""
echo "Once synced, query endpoint will be:"
echo "  https://api.studio.thegraph.com/query/<your-id>/$SUBGRAPH_NAME/$VERSION_LABEL"
echo ""
echo "Contracts being indexed:"
echo "  Genesis:                  0x1454707877cdb966e29cea8a190c2169eeca4b8c"
echo "  Pegged Token (haUSD):     0x6ff0fe773d4ad4ea923ba9ea9cc1c1b42b70f5fc"
echo "  Stability Pool Collateral: 0xac8113ef28c8ef06064e8d78b69890d670273c73"
echo "  Stability Pool Leveraged:  0x6738c3ee945218fb80700e2f4c1a5f3022a28c8d"
echo "  Start Block:              23993255"
echo ""



